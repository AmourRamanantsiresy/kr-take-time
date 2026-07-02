import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DbService } from '../db/db.service';
import { AuditService } from '../db/audit.service';
import { AuthUser } from '../common/types';

/* Cash-to-admin flow: the client asks for time (a predefined plan OR a
   custom minute count), pays at the counter, the admin approves.
   Approval credits the minutes to the shared balance inside one
   transaction with the request row locked, so a double-click can't
   credit twice. A client has at most one pending request — submitting
   again replaces it (people change their mind at the counter). */
@Injectable()
export class RequestsService {
  constructor(
    private readonly db: DbService,
    private readonly audit: AuditService,
  ) {}

  create = async (user: AuthUser, planId?: number, minutes?: number) => {
    if (!planId && !minutes) {
      throw new BadRequestException('Pick a plan or enter the minutes you want');
    }
    if (planId) {
      const plan = await this.db.one('SELECT id FROM plans WHERE id = $1 AND active', [planId]);
      if (!plan) throw new NotFoundException('Plan not found or inactive');
    }

    const pending = await this.db.one<{ id: number }>(
      `SELECT id FROM plan_requests WHERE user_id = $1 AND status = 'pending'`,
      [user.id],
    );
    const requestedMinutes = planId ? null : minutes;

    let request;
    if (pending) {
      request = await this.db.one(
        `UPDATE plan_requests
         SET plan_id = $2, requested_minutes = $3, created_at = now()
         WHERE id = $1 RETURNING *`,
        [pending.id, planId ?? null, requestedMinutes],
      );
    } else {
      request = await this.db.one(
        `INSERT INTO plan_requests (user_id, plan_id, requested_minutes)
         VALUES ($1, $2, $3) RETURNING *`,
        [user.id, planId ?? null, requestedMinutes],
      );
    }
    await this.audit.log(user.id, 'request.create', `request:${request!.id}`, {
      planId: planId ?? null,
      minutes: requestedMinutes,
    });
    return request;
  };

  listMine = async (user: AuthUser) =>
    this.db.query(
      `SELECT r.*, p.name AS plan_name, p.duration_minutes, p.price, p.device_limit
       FROM plan_requests r LEFT JOIN plans p ON p.id = r.plan_id
       WHERE r.user_id = $1 ORDER BY r.created_at DESC LIMIT 50`,
      [user.id],
    );

  listPending = async () =>
    this.db.query(
      `SELECT r.*, u.username, p.name AS plan_name, p.duration_minutes, p.price, p.device_limit
       FROM plan_requests r
       JOIN users u ON u.id = r.user_id
       LEFT JOIN plans p ON p.id = r.plan_id
       WHERE r.status = 'pending' ORDER BY r.created_at`,
    );

  decide = async (actor: AuthUser, requestId: number, approve: boolean) => {
    const result = await this.db.tx(async (tx) => {
      const { rows } = await tx.query(
        `SELECT r.*, p.duration_minutes AS plan_minutes, p.device_limit AS plan_device_limit
         FROM plan_requests r LEFT JOIN plans p ON p.id = r.plan_id
         WHERE r.id = $1 FOR UPDATE OF r`,
        [requestId],
      );
      const request = rows[0];
      if (!request) throw new NotFoundException('Request not found');
      if (request.status !== 'pending') {
        throw new BadRequestException(`Request already ${request.status}`);
      }

      await tx.query(
        `UPDATE plan_requests
         SET status = $2, decided_by = $3, decided_at = now() WHERE id = $1`,
        [requestId, approve ? 'approved' : 'rejected', actor.id],
      );

      if (approve) {
        const creditedMinutes = request.plan_minutes ?? request.requested_minutes;
        await tx.query(
          `UPDATE users SET
             remaining_seconds = remaining_seconds + $2,
             device_limit = GREATEST(device_limit, $3)
           WHERE id = $1`,
          [request.user_id, creditedMinutes * 60, request.plan_device_limit ?? 1],
        );
      }
      return request;
    });

    await this.audit.log(
      actor.id,
      approve ? 'request.approve' : 'request.reject',
      `request:${requestId}`,
      {
        userId: result.user_id,
        planId: result.plan_id,
        minutes: result.plan_minutes ?? result.requested_minutes,
      },
    );
    return { ok: true };
  };
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { AuditService } from '../db/audit.service';
import { CreatePlanDto, UpdatePlanDto } from './plans.dto';
import { AuthUser } from '../common/types';

@Injectable()
export class PlansService {
  constructor(
    private readonly db: DbService,
    private readonly audit: AuditService,
  ) {}

  listActive = async () =>
    this.db.query(
      `SELECT id, name, duration_minutes, price, device_limit
       FROM plans WHERE active ORDER BY duration_minutes`,
    );

  listAll = async () =>
    this.db.query('SELECT * FROM plans ORDER BY duration_minutes');

  create = async (actor: AuthUser, dto: CreatePlanDto) => {
    const plan = await this.db.one(
      `INSERT INTO plans (name, duration_minutes, price, device_limit, active)
       VALUES ($1, $2, $3, $4, COALESCE($5, TRUE)) RETURNING *`,
      [dto.name, dto.duration_minutes, dto.price, dto.device_limit, dto.active],
    );
    await this.audit.log(actor.id, 'plan.create', `plan:${plan!.id}`, { ...dto });
    return plan;
  };

  update = async (actor: AuthUser, id: number, dto: UpdatePlanDto) => {
    const plan = await this.db.one(
      `UPDATE plans SET
         name = COALESCE($2, name),
         duration_minutes = COALESCE($3, duration_minutes),
         price = COALESCE($4, price),
         device_limit = COALESCE($5, device_limit),
         active = COALESCE($6, active)
       WHERE id = $1 RETURNING *`,
      [id, dto.name, dto.duration_minutes, dto.price, dto.device_limit, dto.active],
    );
    if (!plan) throw new NotFoundException('Plan not found');
    await this.audit.log(actor.id, 'plan.update', `plan:${id}`, { ...dto });
    return plan;
  };

  /* Plans referenced by requests can't be hard-deleted (FK); those are
     deactivated instead so history stays intact. */
  remove = async (actor: AuthUser, id: number) => {
    const referenced = await this.db.one(
      'SELECT 1 AS x FROM plan_requests WHERE plan_id = $1 LIMIT 1',
      [id],
    );
    if (referenced) {
      await this.db.query('UPDATE plans SET active = FALSE WHERE id = $1', [id]);
      await this.audit.log(actor.id, 'plan.deactivate', `plan:${id}`, {});
      return { ok: true, deactivated: true };
    }
    await this.db.query('DELETE FROM plans WHERE id = $1', [id]);
    await this.audit.log(actor.id, 'plan.delete', `plan:${id}`, {});
    return { ok: true, deactivated: false };
  };
}

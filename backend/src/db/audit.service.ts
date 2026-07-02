import { Injectable } from '@nestjs/common';
import { DbService } from './db.service';

/* Append-only audit trail. Every admin mutation and every
   auth/kick/cutoff event lands here. Failures are swallowed on purpose:
   auditing must never take down the request that triggered it. */
@Injectable()
export class AuditService {
  constructor(private readonly db: DbService) {}

  log = async (
    actorUserId: number | null,
    action: string,
    target: string | null,
    meta: Record<string, unknown> = {},
  ) => {
    try {
      await this.db.query(
        `INSERT INTO audit_log (actor_user_id, action, target, meta)
         VALUES ($1, $2, $3, $4)`,
        [actorUserId, action, target, JSON.stringify(meta)],
      );
    } catch (err) {
      console.error('audit_log insert failed', err);
    }
  };
}

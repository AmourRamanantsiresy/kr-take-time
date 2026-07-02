import { ForbiddenException, Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { AuditService } from '../db/audit.service';
import { NdsctlService } from '../nds/ndsctl.service';
import { FasService } from '../fas/fas.service';
import { ConnectDto } from './sessions.dto';
import { AuthUser, UserRow } from '../common/types';
import { env } from '../config/env';

/* Grants internet to a device:
   1. verifies the HMAC-signed FAS context,
   2. inside one transaction (user row locked): checks balance > 0 and
      the concurrent-device count against users.device_limit, upserts
      the device, opens/refreshes the session row,
   3. calls `ndsctl auth <mac> <timeout>` with
      timeout = min(remaining_seconds, MAX_SESSION_SECONDS) so OpenNDS
      auto-deauths at expiry even if the reconciler were down. */
@Injectable()
export class SessionsService {
  constructor(
    private readonly db: DbService,
    private readonly audit: AuditService,
    private readonly ndsctl: NdsctlService,
    private readonly fas: FasService,
  ) {}

  connect = async (user: AuthUser, dto: ConnectDto) => {
    const mac = dto.clientmac.toLowerCase();
    if (!this.fas.verify({ clientip: dto.clientip, clientmac: mac, hid: dto.hid }, dto.sig)) {
      throw new ForbiddenException('Invalid portal context — reconnect to the Wi-Fi and try again');
    }

    const { timeoutSeconds } = await this.db.tx(async (tx) => {
      const { rows: userRows } = await tx.query<UserRow>(
        'SELECT * FROM users WHERE id = $1 FOR UPDATE',
        [user.id],
      );
      const account = userRows[0];
      if (!account) throw new ForbiddenException('Account not found');

      const remaining = Number(account.remaining_seconds);
      if (remaining <= 0) {
        throw new ForbiddenException('No time left — redeem a voucher or request a plan');
      }

      const { rows: activeRows } = await tx.query<{ id: number; device_mac: string }>(
        `SELECT id, device_mac FROM sessions
         WHERE user_id = $1 AND status = 'active' FOR UPDATE`,
        [user.id],
      );
      const alreadyActive = activeRows.find((s) => s.device_mac === mac);
      if (!alreadyActive && activeRows.length >= account.device_limit) {
        throw new ForbiddenException(
          `Device limit reached (${account.device_limit}) — disconnect another device first`,
        );
      }

      await tx.query(
        `INSERT INTO devices (user_id, mac, label)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, mac)
         DO UPDATE SET last_seen = now(), label = COALESCE(EXCLUDED.label, devices.label)`,
        [user.id, mac, dto.label ?? null],
      );

      if (alreadyActive) {
        await tx.query(
          `UPDATE sessions SET ip = $2, opennds_token = $3, last_tick = now()
           WHERE id = $1`,
          [alreadyActive.id, dto.clientip, dto.hid],
        );
      } else {
        await tx.query(
          `UPDATE sessions SET status = 'ended', ended_at = now()
           WHERE device_mac = $1 AND status = 'active'`,
          [mac],
        );
        await tx.query(
          `INSERT INTO sessions (user_id, device_mac, ip, opennds_token)
           VALUES ($1, $2, $3, $4)`,
          [user.id, mac, dto.clientip, dto.hid],
        );
      }

      return { timeoutSeconds: Math.min(remaining, env.maxSessionSeconds()) };
    });

    await this.ndsctl.auth(mac, timeoutSeconds);
    await this.audit.log(user.id, 'session.connect', `mac:${mac}`, {
      ip: dto.clientip,
      timeoutSeconds,
    });
    return { ok: true, mac, timeoutSeconds };
  };

  kick = async (actor: AuthUser, mac: string) => {
    const normalized = mac.toLowerCase();
    await this.ndsctl.deauth(normalized);
    await this.db.query(
      `UPDATE sessions SET status = 'kicked', ended_at = now()
       WHERE device_mac = $1 AND status = 'active'`,
      [normalized],
    );
    await this.audit.log(actor.id, 'session.kick', `mac:${normalized}`, {});
    return { ok: true };
  };

  activeSessions = async () =>
    this.db.query(
      `SELECT s.id, s.device_mac, s.ip, s.started_at, s.seconds_consumed,
              u.id AS user_id, u.username, u.remaining_seconds, u.device_limit
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.status = 'active'
       ORDER BY s.started_at DESC`,
    );
}

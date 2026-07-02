import { Controller, Get, UseGuards } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { AuthUser } from '../common/types';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(private readonly db: DbService) {}

  @Get('balance')
  async balance(@CurrentUser() user: AuthUser) {
    const row = await this.db.one<{ remaining_seconds: string; device_limit: number }>(
      'SELECT remaining_seconds, device_limit FROM users WHERE id = $1',
      [user.id],
    );
    const active = await this.db.one<{ count: string }>(
      `SELECT COUNT(*) AS count FROM sessions WHERE user_id = $1 AND status = 'active'`,
      [user.id],
    );
    return {
      remaining_seconds: Number(row?.remaining_seconds ?? 0),
      device_limit: row?.device_limit ?? 1,
      active_devices: Number(active?.count ?? 0),
    };
  }

  @Get('sessions')
  sessions(@CurrentUser() user: AuthUser) {
    return this.db.query(
      `SELECT id, device_mac, ip, started_at, ended_at, seconds_consumed, status
       FROM sessions WHERE user_id = $1 ORDER BY started_at DESC LIMIT 50`,
      [user.id],
    );
  }

  @Get('devices')
  devices(@CurrentUser() user: AuthUser) {
    return this.db.query(
      `SELECT d.id, d.mac, d.label, d.first_seen, d.last_seen,
              EXISTS (
                SELECT 1 FROM sessions s
                WHERE s.device_mac = d.mac AND s.user_id = d.user_id AND s.status = 'active'
              ) AS online
       FROM devices d WHERE d.user_id = $1 ORDER BY d.last_seen DESC`,
      [user.id],
    );
  }
}

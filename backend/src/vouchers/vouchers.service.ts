import { BadRequestException, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { DbService } from '../db/db.service';
import { AuditService } from '../db/audit.service';
import { GenerateVouchersDto } from './vouchers.dto';
import { AuthUser } from '../common/types';

/* Codes use an unambiguous alphabet (no 0/O/1/I) in XXXX-XXXX-XXXX
   groups so they survive being read over a counter or printed. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const generateCode = (): string => {
  const bytes = randomBytes(12);
  const chars = [...bytes].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]);
  return [
    chars.slice(0, 4).join(''),
    chars.slice(4, 8).join(''),
    chars.slice(8, 12).join(''),
  ].join('-');
};

@Injectable()
export class VouchersService {
  constructor(
    private readonly db: DbService,
    private readonly audit: AuditService,
  ) {}

  /* Redemption is transactional with the voucher row locked: two
     devices racing on the same code can never both credit. Expired
     codes are flipped to 'expired' on touch. */
  redeem = async (user: AuthUser, code: string) => {
    const normalized = code.trim().toUpperCase();
    const voucher = await this.db.tx(async (tx) => {
      const { rows } = await tx.query(
        'SELECT * FROM vouchers WHERE code = $1 FOR UPDATE',
        [normalized],
      );
      const v = rows[0];
      if (!v) throw new BadRequestException('Unknown voucher code');
      if (v.status === 'redeemed') throw new BadRequestException('Voucher already redeemed');
      if (v.status === 'expired') throw new BadRequestException('Voucher expired');
      if (v.expires_at && new Date(v.expires_at) < new Date()) {
        await tx.query(`UPDATE vouchers SET status = 'expired' WHERE id = $1`, [v.id]);
        throw new BadRequestException('Voucher expired');
      }

      await tx.query(
        `UPDATE vouchers SET status = 'redeemed', redeemed_by = $2, redeemed_at = now()
         WHERE id = $1`,
        [v.id, user.id],
      );
      await tx.query(
        `UPDATE users SET
           remaining_seconds = remaining_seconds + $2,
           device_limit = GREATEST(device_limit, $3)
         WHERE id = $1`,
        [user.id, v.duration_minutes * 60, v.device_limit],
      );
      return v;
    });

    await this.audit.log(user.id, 'voucher.redeem', `voucher:${voucher.id}`, {
      code: normalized,
      minutes: voucher.duration_minutes,
      deviceLimit: voucher.device_limit,
    });
    return {
      ok: true,
      credited_minutes: voucher.duration_minutes,
      device_limit: voucher.device_limit,
    };
  };

  generate = async (actor: AuthUser, dto: GenerateVouchersDto) => {
    const codes: string[] = [];
    while (codes.length < dto.count) {
      const batch = Array.from({ length: dto.count - codes.length }, generateCode);
      const inserted = await this.db.query<{ code: string }>(
        `INSERT INTO vouchers (code, duration_minutes, device_limit, created_by, expires_at)
         SELECT unnest($1::text[]), $2, $3, $4, $5
         ON CONFLICT (code) DO NOTHING
         RETURNING code`,
        [batch, dto.duration_minutes, dto.device_limit, actor.id, dto.expires_at ?? null],
      );
      codes.push(...inserted.map((r) => r.code));
    }
    await this.audit.log(actor.id, 'voucher.generate', null, { ...dto, codes });
    return this.db.query(
      `SELECT * FROM vouchers WHERE code = ANY($1::text[]) ORDER BY code`,
      [codes],
    );
  };

  list = async () =>
    this.db.query(
      `SELECT v.*, u.username AS redeemed_by_username
       FROM vouchers v LEFT JOIN users u ON u.id = v.redeemed_by
       ORDER BY v.created_at DESC LIMIT 1000`,
    );
}

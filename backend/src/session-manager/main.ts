import { execFile } from 'child_process';
import { promisify } from 'util';
import { Pool } from 'pg';
import { env } from '../config/env';

const execFileAsync = promisify(execFile);

interface ActiveSessionRow {
  id: number;
  user_id: number;
  device_mac: string;
  last_tick: Date;
  remaining_seconds: string;
  username: string;
}

const pool = new Pool({
  host: env.dbHost(),
  port: env.dbPort(),
  database: env.dbName(),
  user: env.dbUser(),
  password: env.dbPass(),
  max: 3,
});

const ndsctl = async (...args: string[]): Promise<string> => {
  const { stdout } = await execFileAsync('sudo', [env.ndsctlPath(), ...args], {
    timeout: 10_000,
  });
  return stdout.trim();
};

const authedMacs = async (): Promise<Set<string>> => {
  const raw = await ndsctl('json');
  const parsed = JSON.parse(raw);
  const macs = new Set<string>();
  const list = parsed.clients ?? {};
  for (const key of Object.keys(list)) {
    const c = list[key];
    const state = String(c.state ?? '').toLowerCase();
    if (state.includes('auth') && !state.includes('preauth')) {
      macs.add(String(c.mac ?? key).toLowerCase());
    }
  }
  return macs;
};

const deauth = async (mac: string) => {
  try {
    await ndsctl('deauth', mac);
  } catch (err) {
    console.warn(`deauth ${mac} failed (already gone?)`);
  }
};

const auditCutoff = async (userId: number, mac: string, reason: string) => {
  await pool.query(
    `INSERT INTO audit_log (actor_user_id, action, target, meta)
     VALUES (NULL, 'session.cutoff', $1, $2)`,
    [`mac:${mac}`, JSON.stringify({ userId, reason })],
  );
};

/* One reconciliation pass:
   1. read authenticated clients from OpenNDS,
   2. for every DB-active session whose MAC is still online: settle the
      wall-clock seconds since its last_tick against the owner's shared
      balance (each concurrent device burns the balance independently),
   3. close DB sessions whose client is gone (OpenNDS session timeout
      already fired, or the device left),
   4. deauth every device of any account whose balance reached zero,
   5. deauth authenticated clients with no active DB session (orphans).
   All settlement happens in one transaction so a crash mid-pass can
   never double-charge: last_tick only advances together with the
   balance decrement. */
const tick = async () => {
  const online = await authedMacs();

  const usersToCut = new Set<number>();
  await (async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: sessions } = await client.query<ActiveSessionRow>(
        `SELECT s.id, s.user_id, s.device_mac, s.last_tick,
                u.remaining_seconds, u.username
         FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.status = 'active'
         ORDER BY s.user_id
         FOR UPDATE OF s, u`,
      );

      const now = Date.now();
      for (const session of sessions) {
        const mac = session.device_mac.toLowerCase();
        if (!online.has(mac)) {
          await client.query(
            `UPDATE sessions SET status = 'ended', ended_at = now() WHERE id = $1`,
            [session.id],
          );
          continue;
        }

        const elapsed = Math.max(
          0,
          Math.round((now - new Date(session.last_tick).getTime()) / 1000),
        );
        if (elapsed > 0) {
          await client.query(
            `UPDATE sessions SET seconds_consumed = seconds_consumed + $2, last_tick = now()
             WHERE id = $1`,
            [session.id, elapsed],
          );
          await client.query(
            `UPDATE users SET remaining_seconds = GREATEST(0, remaining_seconds - $2)
             WHERE id = $1`,
            [session.user_id, elapsed],
          );
          await client.query(
            `UPDATE devices SET last_seen = now() WHERE user_id = $1 AND mac = $2`,
            [session.user_id, mac],
          );
        }
      }

      const { rows: exhausted } = await client.query<{ id: number; device_mac: string; user_id: number }>(
        `SELECT s.id, s.device_mac, s.user_id
         FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.status = 'active' AND u.remaining_seconds <= 0`,
      );
      for (const session of exhausted) {
        await client.query(
          `UPDATE sessions SET status = 'ended', ended_at = now() WHERE id = $1`,
          [session.id],
        );
        usersToCut.add(session.user_id);
      }

      await client.query('COMMIT');

      for (const session of exhausted) {
        const mac = session.device_mac.toLowerCase();
        console.log(`balance exhausted: cutting off ${mac} (user ${session.user_id})`);
        await deauth(mac);
        await auditCutoff(session.user_id, mac, 'balance_exhausted');
      }
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  })();

  const { rows: stillActive } = await pool.query<{ device_mac: string }>(
    `SELECT device_mac FROM sessions WHERE status = 'active'`,
  );
  const known = new Set(stillActive.map((r) => r.device_mac.toLowerCase()));
  for (const mac of online) {
    if (!known.has(mac)) {
      console.log(`orphan authenticated client ${mac} — deauthing`);
      await deauth(mac);
    }
  }
};

const loop = async () => {
  const interval = env.sessionTickSeconds() * 1000;
  console.log(`cybera-session-manager: tick every ${env.sessionTickSeconds()}s`);
  for (;;) {
    try {
      await tick();
    } catch (err) {
      console.error('tick failed:', err);
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
};

loop();

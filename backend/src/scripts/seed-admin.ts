import { Client } from 'pg';
import { randomBytes } from 'crypto';
import * as argon2 from 'argon2';
import { env } from '../config/env';

/* Seeds (idempotent, safe on every install run):
   - the admin account from ADMIN_USER / ADMIN_PASS (password re-synced)
   - customer accounts "1".."CLIENT_COUNT" for the numbered walk-in
     flow. They get one shared random (unusable) password hash — client
     login is by number via POST /auth/client, never by password. */
const run = async () => {
  const client = new Client({
    host: env.dbHost(),
    port: env.dbPort(),
    database: env.dbName(),
    user: env.dbUser(),
    password: env.dbPass(),
  });
  await client.connect();

  const adminHash = await argon2.hash(env.adminPass());
  await client.query(
    `INSERT INTO users (username, password_hash, role)
     VALUES ($1, $2, 'admin')
     ON CONFLICT (username)
     DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'admin'`,
    [env.adminUser(), adminHash],
  );

  const clientHash = await argon2.hash(randomBytes(32).toString('hex'));
  const inserted = await client.query(
    `INSERT INTO users (username, password_hash, role)
     SELECT gs::text, $1, 'customer' FROM generate_series(1, $2::int) gs
     ON CONFLICT (username) DO NOTHING`,
    [clientHash, env.clientCount()],
  );

  await client.end();
  console.log(
    `admin user '${env.adminUser()}' ready; client accounts 1..${env.clientCount()} ready (${inserted.rowCount} new)`,
  );
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

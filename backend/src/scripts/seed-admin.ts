import { Client } from 'pg';
import * as argon2 from 'argon2';
import { env } from '../config/env';

/* Creates (or updates the password of) the admin account from
   ADMIN_USER / ADMIN_PASS. Idempotent — safe on every install run. */
const run = async () => {
  const client = new Client({
    host: env.dbHost(),
    port: env.dbPort(),
    database: env.dbName(),
    user: env.dbUser(),
    password: env.dbPass(),
  });
  await client.connect();
  const hash = await argon2.hash(env.adminPass());
  await client.query(
    `INSERT INTO users (username, password_hash, role)
     VALUES ($1, $2, 'admin')
     ON CONFLICT (username)
     DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'admin'`,
    [env.adminUser(), hash],
  );
  await client.end();
  console.log(`admin user '${env.adminUser()}' ready`);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

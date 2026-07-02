import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';
import { env } from '../config/env';

/* Minimal forward-only SQL migration runner. Files in backend/migrations
   run in lexical order; each applied file is recorded in _migrations and
   never re-run. Each migration runs in its own transaction. */
const run = async () => {
  const client = new Client({
    host: env.dbHost(),
    port: env.dbPort(),
    database: env.dbName(),
    user: env.dbUser(),
    password: env.dbPass(),
  });
  await client.connect();
  await client.query(
    `CREATE TABLE IF NOT EXISTS _migrations (
       name TEXT PRIMARY KEY,
       applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
     )`,
  );

  const dir = join(__dirname, '..', '..', 'migrations');
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    const { rows } = await client.query('SELECT 1 FROM _migrations WHERE name = $1', [file]);
    if (rows.length > 0) {
      console.log(`skip  ${file}`);
      continue;
    }
    const sql = readFileSync(join(dir, file), 'utf8');
    console.log(`apply ${file}`);
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  }

  await client.end();
  console.log('migrations complete');
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

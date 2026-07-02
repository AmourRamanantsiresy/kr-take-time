import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient, QueryResultRow } from 'pg';
import { env } from '../config/env';

/* Thin wrapper around a pg Pool. `tx` runs a callback inside a
   BEGIN/COMMIT block and rolls back on any throw — all balance
   mutations go through it. */
@Injectable()
export class DbService implements OnModuleDestroy {
  readonly pool = new Pool({
    host: env.dbHost(),
    port: env.dbPort(),
    database: env.dbName(),
    user: env.dbUser(),
    password: env.dbPass(),
    max: 10,
  });

  query = async <T extends QueryResultRow = QueryResultRow>(
    sql: string,
    params: unknown[] = [],
  ): Promise<T[]> => {
    const result = await this.pool.query<T>(sql, params);
    return result.rows;
  };

  one = async <T extends QueryResultRow = QueryResultRow>(
    sql: string,
    params: unknown[] = [],
  ): Promise<T | undefined> => {
    const rows = await this.query<T>(sql, params);
    return rows[0];
  };

  tx = async <T>(fn: (client: PoolClient) => Promise<T>): Promise<T> => {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  };

  onModuleDestroy = async () => {
    await this.pool.end();
  };
}

import pg from 'pg';

/**
 * PostgreSQL client.
 *
 * Stage 1: minimal access layer. Uses a pooled connection via DATABASE_URL.
 * The full schema (15 spec tables) arrives in Stage 2; here we keep the
 * migration pattern and four core tables to exercise the flow.
 */

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgres://sinkroo:sinkroo@localhost:5432/sinkroo',
  max: 10,
});

/** Basic typed query helper. */
export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const r = await pool.query(text, params);
  return r.rows as T[];
}

/** Runs a command with no return (DDL/DML). */
export async function execute(text: string, params: unknown[] = []): Promise<void> {
  await pool.query(text, params);
}

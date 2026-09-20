/**
 * Applies the basic Stage 1 schema to PostgreSQL.
 * Requires DATABASE_URL in the environment. Idempotent (CREATE TABLE IF NOT EXISTS).
 */
import { SCHEMA_SQL } from '../apps/api/dist/lib/schema.sql.js';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgres://sinkroo:sinkroo@localhost:5432/sinkroo',
});

try {
  await pool.query(SCHEMA_SQL);
  console.log('OK: schema applied (users, products, creatives, swarm_results)');
} catch (e) {
  console.error('Error applying schema:', e.message);
  process.exit(1);
} finally {
  await pool.end();
}

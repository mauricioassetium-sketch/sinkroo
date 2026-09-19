/**
 * Aplica el esquema básico de Etapa 1 a PostgreSQL.
 * Requiere DATABASE_URL en el entorno. Idempotente (CREATE TABLE IF NOT EXISTS).
 */
import { SCHEMA_SQL } from '../apps/api/dist/lib/schema.sql.js';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgres://sinkroo:sinkroo@localhost:5432/sinkroo',
});

try {
  await pool.query(SCHEMA_SQL);
  console.log('OK: esquema aplicado (users, products, creatives, swarm_results)');
} catch (e) {
  console.error('Error aplicando esquema:', e.message);
  process.exit(1);
} finally {
  await pool.end();
}

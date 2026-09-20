/**
 * Applies the Sinkroo schema to PostgreSQL.
 *
 * Single source of truth: apps/api/src/lib/schema.ts (migrate()). This file
 * only wires a pg Pool to that migration — no SQL lives here.
 *
 * Requires DATABASE_URL in the environment. Idempotent (CREATE TABLE IF NOT EXISTS).
 *
 * Tables: businesses, products, conversations, conversation_messages
 *         (+ indexes idx_products_business, idx_conversations_lead, idx_messages_conversation).
 */
import { migrate } from '../apps/api/dist/lib/schema.js';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgres://sinkroo:sinkroo@localhost:5432/sinkroo',
});

try {
  await migrate(pool);
  console.log('OK: schema applied (businesses, products, conversations, conversation_messages)');
} catch (e) {
  console.error('Error applying schema:', e.message);
  process.exit(1);
} finally {
  await pool.end();
}

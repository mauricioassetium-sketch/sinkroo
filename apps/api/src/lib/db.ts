import pg from 'pg';

/**
 * Cliente PostgreSQL.
 *
 * Etapa 1: capa mínima de acceso. Usa una conexión por pool con DATABASE_URL.
 * El esquema completo (15 tablas del spec) llega en Etapa 2; aquí dejamos el
 * patrón de migración y cuatro tablas núcleo para probar el flujo.
 */

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? 'postgres://sinkroo:sinkroo@localhost:5432/sinkroo',
  max: 10,
});

/** Query helper tipado básico. */
export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const r = await pool.query(text, params);
  return r.rows as T[];
}

/** Ejecuta un comando sin retorno (DDL/DML). */
export async function execute(text: string, params: unknown[] = []): Promise<void> {
  await pool.query(text, params);
}

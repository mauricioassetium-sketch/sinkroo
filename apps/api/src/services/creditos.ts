// =============================================================================================
// LA TARIFA Y EL LIBRO
//
// Los precios son los que el panel muestra antes de gastar (vista Créditos: «16 por pieza»), y la
// evaluación de MiroFish cuesta 8. El público —los 500— no se cobra nunca. Una ronda completa son
// 5 piezas: 5×16 al crearlas y 5×8 al probarlas = 120 créditos.
//
// Un solo lugar para el número: si la tarifa cambia, cambia acá y el panel lee lo que el back cobra.
// =============================================================================================

import type { Pool } from 'pg';

export const TARIFA = {
  /** Lo que cuesta crear una pieza. */
  crearPieza: 16,
  /** Lo que cuesta probarla en MiroFish (los 5 jueces y los 500 del público). */
  evaluarPieza: 8,
  /** El público nunca se cobra. */
  publico: 0,
};

/** El saldo de un negocio, tal como quedó en el último movimiento del libro. */
export async function saldoDe(db: Pool, businessId: string): Promise<number> {
  const r = await db.query(
    `SELECT COALESCE((SELECT saldo FROM movimientos_creditos WHERE business_id = $1 ORDER BY created_at DESC LIMIT 1), 0) AS saldo`,
    [businessId],
  );
  return Number(r.rows[0]?.saldo ?? 0);
}

/** Lo que cuesta una ronda de `cuantas` piezas: crearlas y probarlas. */
export const costoDeRonda = (cuantas: number, crear = true) => ({
  piezas: cuantas,
  crear: crear ? cuantas * TARIFA.crearPieza : 0,
  evaluar: cuantas * TARIFA.evaluarPieza,
  total: (crear ? cuantas * TARIFA.crearPieza : 0) + cuantas * TARIFA.evaluarPieza,
});

/**
 * Cobra en el libro la creación de las piezas: queda escrito con su motivo, como cualquier otro gasto.
 * Se cobra solo lo que se creó de verdad, y la fila dice cuántas.
 */
export async function cobrarCreacion(db: Pool, businessId: string, cuantas: number, detalle: string): Promise<number> {
  if (cuantas <= 0) return 0;
  const delta = -(cuantas * TARIFA.crearPieza);
  await db.query(
    `INSERT INTO movimientos_creditos (business_id, delta, motivo, detalle, saldo)
     VALUES ($1, $2, 'creacion', $3, COALESCE((SELECT saldo FROM movimientos_creditos WHERE business_id = $1 ORDER BY created_at DESC LIMIT 1), 0) + $2)`,
    [businessId, delta, detalle],
  );
  return delta;
}

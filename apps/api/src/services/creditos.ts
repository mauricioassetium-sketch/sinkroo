// =============================================================================================
// LA TARIFA Y EL LIBRO
//
// EL ÚNICO DUEÑO DEL PRECIO. Los precios viven acá y en ningún otro lado: el panel no escribe un número
// suelto —lee lo que esta tabla dice— y el cobro del libro usa exactamente estos valores.
//
// LA TABLA POR TIPO (la fijó el dueño):
//   · video .................. 48   (30 segundos como máximo)
//   · reel con animación ..... 24   (animación + imagen + sonido)
//   · reel de imágenes ....... 20   (varias imágenes en secuencia con sonido)
//   · imagen con texto ....... 12   (una imagen con el texto encima)
//   · título animado ........... 8   (una animación corta de título)
//   · evaluación MiroFish ...... 8   (los 5 jueces y los 500 del público; sin cambios)
//
// Cada ronda produce 5 contenidos: COMO MÁXIMO 2 son video y los otros 3 se reparten entre los cuatro tipos
// que no son video. Una ronda con 2 videos cuesta 140 al crear (48+48+24+12+8) y 40 al evaluar = 180.
//
// El público —los 500— no se cobra nunca, y TAMPOCO se cobra una ronda vacía: se cobra lo que se creó de
// verdad, por tipo, y la fila del libro dice cuántas.
// =============================================================================================

import type { Pool } from 'pg';
import type { TipoDeContenido } from './formatos.js';

/** Lo que cuesta crear un contenido de cada tipo. */
export const PRECIOS_POR_TIPO: Record<TipoDeContenido, number> = {
  video: 48,
  'reel con animación': 24,
  'reel de imágenes': 20,
  'imagen con texto': 12,
  'título animado': 8,
};

export const TARIFA = {
  /** Lo que cuesta probar una pieza en MiroFish (los 5 jueces y los 500 del público). */
  evaluarPieza: 8,
  /** El público nunca se cobra. */
  publico: 0,
  /** La tabla por tipo, tal como la lee el panel. */
  porTipo: PRECIOS_POR_TIPO,
};

/** El precio de un tipo de contenido. Un tipo desconocido no cuesta 0 por descuido: se dice y se cobra 0. */
export function precioDeTipo(tipo: TipoDeContenido | null | undefined): number {
  if (!tipo) return 0;
  return PRECIOS_POR_TIPO[tipo] ?? 0;
}

export type CostoDeRonda = {
  piezas: number;
  /** Qué tipo es cada contenido y cuánto cuesta crearlo: la suma, por tipo. */
  por_tipo: { tipo: TipoDeContenido; creditos: number }[];
  crear: number;
  evaluar: number;
  total: number;
};

/**
 * LO QUE CUESTA UNA RONDA: se suma POR TIPO, no por un precio único de pieza. Cinco contenidos con dos
 * videos no cuestan lo mismo que cinco imágenes, y mezclarlos en un solo número era cobrar de más o de menos.
 */
export function costoDeRonda(tipos: TipoDeContenido[], crear = true): CostoDeRonda {
  const porTipo = tipos.map(tipo => ({ tipo, creditos: precioDeTipo(tipo) }));
  const crearTotal = crear ? porTipo.reduce((s, p) => s + p.creditos, 0) : 0;
  const evaluar = tipos.length * TARIFA.evaluarPieza;
  return { piezas: tipos.length, por_tipo: porTipo, crear: crearTotal, evaluar, total: crearTotal + evaluar };
}

/** El saldo de un negocio, tal como quedó en el último movimiento del libro. */
export async function saldoDe(db: Pool, businessId: string): Promise<number> {
  const r = await db.query(
    `SELECT COALESCE((SELECT saldo FROM movimientos_creditos WHERE business_id = $1 ORDER BY created_at DESC LIMIT 1), 0) AS saldo`,
    [businessId],
  );
  return Number(r.rows[0]?.saldo ?? 0);
}

/**
 * Cobra en el libro la creación de lo que se creó de verdad: cada contenido con el precio de SU tipo, y la
 * fila dice cuántos y de qué tipo. Nunca un precio único por pieza.
 */
export async function cobrarCreacion(
  db: Pool, businessId: string, tipos: TipoDeContenido[], detalle: string,
): Promise<number> {
  const conPrecio = tipos.filter(Boolean);
  if (!conPrecio.length) return 0;
  const delta = -conPrecio.reduce((s, t) => s + precioDeTipo(t), 0);
  await db.query(
    `INSERT INTO movimientos_creditos (business_id, delta, motivo, detalle, saldo)
     VALUES ($1, $2, 'creacion', $3, COALESCE((SELECT saldo FROM movimientos_creditos WHERE business_id = $1 ORDER BY created_at DESC LIMIT 1), 0) + $2)`,
    [businessId, delta, detalle],
  );
  return delta;
}

/** El detalle del libro para una ronda: cuántos de cada tipo y qué costó cada uno. */
export function detalleDeTipos(tipos: TipoDeContenido[]): string {
  const cuenta = new Map<TipoDeContenido, number>();
  for (const t of tipos) cuenta.set(t, (cuenta.get(t) ?? 0) + 1);
  return [...cuenta.entries()]
    .map(([tipo, n]) => `${n} ${tipo} (${precioDeTipo(tipo)} c/u)`)
    .join(' · ');
}

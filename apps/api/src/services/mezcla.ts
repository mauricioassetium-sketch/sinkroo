// =============================================================================================
// LA MEZCLA DE CADA RONDA — la regla del dueño, en un solo lugar
//
// Cada ronda produce 5 contenidos. DE ESOS 5, COMO MÁXIMO 2 PUEDEN SER VIDEO (de 30 segundos como máximo)
// y los otros 3 se reparten entre los cuatro tipos que no son video:
//
//   «imagen con texto» · «reel de imágenes» · «reel con animación» · «título animado»
//
// Con 3 puestos y 4 tipos, cada ronda deja uno afuera: se eligen los TRES MENOS USADOS por este negocio
// (y a igualdad, se rota el orden ronda a ronda), así que las rondas se diferencian entre sí y los cuatro
// tipos terminan saliendo. La primera ronda sale con los tres del ejemplo del dueño
// (reel con animación + imagen con texto + título animado = 44 créditos de 140) — no por casualidad: es el
// orden fijo de preferencia cuando todavía no hay uso.
//
// Esto no decide precios (viven en `creditos.ts`) ni formatos (viven en `formatos.ts`): decide CUÁNTOS DE
// CADA COSA lleva la ronda.
// =============================================================================================

import type { Pool } from 'pg';
import type { TipoDeContenido } from './formatos.js';

/** Cuántos videos puede tener una ronda, como máximo. */
export const VIDEOS_POR_RONDA = 2;
/** Cuántos contenidos produce una ronda. */
export const CONTENIDOS_POR_RONDA = 5;

/**
 * Los cuatro tipos que no son video, en orden de preferencia cuando todavía no hay uso.
 * El primero de la lista es el que entra a la primera ronda junto con los otros dos de arriba.
 */
export const NO_VIDEO_POR_PREFERENCIA: TipoDeContenido[] = [
  'reel con animación',
  'imagen con texto',
  'título animado',
  'reel de imágenes',
];

/** Rota una lista `n` posiciones (sin mutar la original). */
function rotada<T>(lista: T[], n: number): T[] {
  if (!lista.length) return [];
  const k = ((n % lista.length) + lista.length) % lista.length;
  return [...lista.slice(k), ...lista.slice(0, k)];
}

/**
 * La mezcla de una ronda: 2 videos + los 3 tipos que no son video menos usados por este negocio.
 * `usos` cuenta cuántos contenidos de cada tipo ya produjo (para no repetir siempre los mismos tres) y
 * `ronda` desempata la rotación. Es determinística: la misma ronda y los mismos usos dan la misma mezcla.
 */
export function mezclaDeRonda(usos: Record<string, number> = {}, ronda = 1): TipoDeContenido[] {
  const orden = rotada(NO_VIDEO_POR_PREFERENCIA, Math.max(0, Math.floor(ronda) - 1));
  const tres = orden
    .map((tipo, i) => ({ tipo, i, usos: Number(usos[tipo] ?? 0) }))
    .sort((a, b) => (a.usos - b.usos) || (a.i - b.i))
    .slice(0, CONTENIDOS_POR_RONDA - VIDEOS_POR_RONDA)
    .map(x => x.tipo);
  return [...Array(VIDEOS_POR_RONDA).fill('video' as TipoDeContenido), ...tres];
}

/** Cuántos contenidos de cada tipo ya salieron en las rondas de este negocio. */
export async function usosPorTipo(db: Pool, businessId: string): Promise<Record<string, number>> {
  const usos: Record<string, number> = {};
  try {
    const r = await db.query(
      `SELECT generacion->>'tipo_de_contenido' AS tipo, count(*)::int AS n
         FROM piezas
        WHERE business_id = $1 AND ronda > 0
        GROUP BY 1`, [businessId]);
    for (const f of r.rows as { tipo: string | null; n: number }[]) {
      if (f.tipo) usos[f.tipo] = Number(f.n);
    }
  } catch { /* primera ronda o tabla sin la columna: no hay uso que contar */ }
  return usos;
}

/** El número de la ronda que le toca a este negocio (el mismo que usa el motor al escribir las piezas). */
export async function proximaRonda(db: Pool, businessId: string): Promise<number> {
  try {
    const r = await db.query(
      'SELECT COALESCE(MAX(ronda), 0) + 1 AS n FROM piezas WHERE business_id = $1', [businessId]);
    return Number(r.rows[0]?.n ?? 1);
  } catch { return 1; }
}

/** La mezcla que va a tener la PRÓXIMA ronda de este negocio, con lo que ya produjo. */
export async function mezclaProximaRonda(db: Pool, businessId: string): Promise<TipoDeContenido[]> {
  return mezclaDeRonda(await usosPorTipo(db, businessId), await proximaRonda(db, businessId));
}

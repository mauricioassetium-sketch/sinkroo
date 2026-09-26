import { useEffect, useState } from 'react';
import { baseApi, token } from '../api/cliente';

// =============================================================================================
// EL DETALLE REAL DE UNA EVALUACIÓN DE MIROFISH — lo que el back ya tiene guardado.
//
// `GET /api/mirofish/:id` devuelve cuatro cosas, y ninguna se inventa aquí:
//   · votos      → los 5 jueces, con su criterio, su voto y su opinión
//   · reacciones → cuántos de los del público compraron, guardaron, quedaron indiferentes o pasaron
//   · opiniones  → hasta 40 reacciones una por una, con el número del agente y su comentario
//   · prediccion → lo que el modelo predijo, lo que el público hizo y el desvío entre los dos
//
// Sin back, o si el back no responde, esto devuelve null: la pantalla decide qué decir, pero NUNCA
// rellena el hueco con datos de ejemplo. Mezclar las dos cosas sería mentir sobre lo que hay.
//
// Este archivo no pinta nada: es sólo la puerta de lectura que comparten las pantallas del flujo de
// Campañas (el motor en vivo y el veredicto del paso 5).
// =============================================================================================

export type VotoJuez = { juez: string; criterio: string; voto: number; opinion: string };
export type ReaccionPublico = { reaccion: string; n: number };
export type OpinionPublico = { agente_numero: number; voto: number; reaccion: string; comentario: string };
export type Prediccion = { predicho: number; observado: number; desvio_pct: number | null };

export type EvaluacionDetalle = {
  evaluacion: {
    id: string; titulo: string; puntaje: number | null; orden: number | null;
    total_publico: number | null; created_at: string;
  };
  votos: VotoJuez[];
  reacciones: ReaccionPublico[];
  opiniones: OpinionPublico[];
  prediccion: Prediccion | null;
};

/** El número de un dato del back, venga como número o como texto (los decimales llegan en texto). */
export const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
/** El número, o null si el back no lo mandó: la pantalla muestra «—», no un cero que nadie produjo. */
export const numONulo = (v: unknown): number | null =>
  v === null || v === undefined || v === '' ? null : num(v);

/** Cómo se lee cada reacción del público, sin jerga y sin «sentimiento» inventado. */
export const ETIQUETA_REACCION: Record<string, string> = {
  compra: 'Lo quiere comprar',
  guarda: 'Lo guarda para después',
  indiferente: 'Indiferente',
  pasa: 'Pasa de largo',
};
export const COLOR_REACCION: Record<string, string> = {
  compra: '#34d399', guarda: '#a855f7', indiferente: '#9ca3af', pasa: '#f87171',
};
export const etiquetaReaccion = (r: string) => ETIQUETA_REACCION[r] ?? r;
export const colorReaccion = (r: string) => COLOR_REACCION[r] ?? '#9ca3af';

/** La fecha del back, en corto y en español de Colombia: «12 de septiembre». */
export function fechaCorta(iso: string): string {
  const f = new Date(iso);
  return isNaN(f.getTime()) ? 'sin fecha' : f.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' });
}

/**
 * Una evaluación con su detalle, tal como está en el back. Devuelve null cuando el back no responde:
 * quien llama lo dice en pantalla y no sigue con datos de ejemplo.
 */
export async function traerEvaluacion(id: string): Promise<EvaluacionDetalle | null> {
  try {
    const r = await fetch(baseApi() + '/api/mirofish/' + encodeURIComponent(id), {
      headers: token() ? { Authorization: `Bearer ${token()}` } : {},
    });
    if (!r.ok) return null;
    const d = (await r.json()) as any;
    const ev = d?.evaluacion ?? {};
    return {
      evaluacion: {
        id: String(ev.id ?? id),
        titulo: String(ev.titulo ?? ''),
        puntaje: numONulo(ev.puntaje),
        orden: numONulo(ev.orden),
        total_publico: numONulo(ev.total_publico),
        created_at: String(ev.created_at ?? ''),
      },
      votos: Array.isArray(d?.votos) ? d.votos.map((v: any) => ({
        juez: String(v?.juez ?? ''),
        criterio: String(v?.criterio ?? ''),
        voto: num(v?.voto),
        opinion: String(v?.opinion ?? ''),
      })) : [],
      reacciones: Array.isArray(d?.reacciones) ? d.reacciones.map((x: any) => ({
        reaccion: String(x?.reaccion ?? ''),
        n: num(x?.n),
      })) : [],
      opiniones: Array.isArray(d?.opiniones) ? d.opiniones.map((o: any) => ({
        agente_numero: num(o?.agente_numero),
        voto: num(o?.voto),
        reaccion: String(o?.reaccion ?? ''),
        comentario: String(o?.comentario ?? ''),
      })) : [],
      prediccion: d?.prediccion ? {
        predicho: num(d.prediccion.predicho),
        observado: num(d.prediccion.observado),
        desvio_pct: numONulo(d.prediccion.desvio_pct),
      } : null,
    };
  } catch { return null; }
}

/**
 * El detalle de una evaluación, listo para pintar. `cargando` es true mientras va, y no se entrega el
 * dato de una pieza distinta a la que se pidió: si el negocio cambia de pieza, nunca ve la anterior.
 */
export function useEvaluacion(id: string | null): { dato: EvaluacionDetalle | null; cargando: boolean } {
  const [estado, setEstado] = useState<{ id: string | null; dato: EvaluacionDetalle | null; cargando: boolean }>(
    { id: null, dato: null, cargando: false },
  );

  useEffect(() => {
    if (!id) { setEstado({ id: null, dato: null, cargando: false }); return; }
    let vivo = true;
    setEstado({ id, dato: null, cargando: true });
    void traerEvaluacion(id).then(dato => { if (vivo) setEstado({ id, dato, cargando: false }); });
    return () => { vivo = false; };
  }, [id]);

  const alDia = estado.id === id;
  return { dato: alDia ? estado.dato : null, cargando: id ? (!alDia || estado.cargando) : false };
}

// =====================================================================================================
// EL AGENTE EN VIVO — quién está trabajando ahora, con qué avance y por qué.
//
// POR QUÉ VIVE ACÁ Y NO DENTRO DE LA TARJETA
//
// La tarjeta del equipo necesitaba cinco cosas para pintar el trabajo en vivo (si hay corrida, quién la tiene,
// quiénes ya terminaron, qué está haciendo y cuánto falta), y cada una se fue agregando por separado hasta
// quedar mezclada con el dibujo. Acá está todo junto y con una sola entrada: el latido del motor y las
// corridas que devolvió el back.
//
// DE DÓNDE SALE CADA COSA
//
//   · SI HAY TRABAJO: del latido del motor (`/api/sistema/trabajando`, cada 2 segundos), no de la lista de
//     corridas —esa se refresca cada 30 segundos y una corrida corta empieza y termina entre dos refrescos—.
//   · QUIÉN LO TIENE: primero el agente que nombra el paso en curso; si el paso no nombra a nadie (o ya cerró y
//     lo que sigue es la lectura del mercado), el primero del equipo que todavía no dejó su tarea, porque el
//     motor los hace en orden. La lectura del mercado es el trabajo de Lux.
//   · QUÉ ESTÁ HACIENDO: el nombre y el detalle de la tarea en curso.
//   · CUÁNTO FALTA: el tiempo que lleva contra el promedio real de las corridas anteriores del negocio. Sin
//     historial no se inventa un número: `faltaSeg` queda en null y el panel lo dice.
// =====================================================================================================
import { useMemo } from 'react';
import { AGENTES, type Agente } from '../data/demo';
import type { Corrida } from '../api/datos';
import { useMotorVivo, type MotorVivo, type Trabajo } from '../components/MotorTrabajando';

export type AgenteEnVivo = {
  /** Hay algo del motor en marcha (una corrida, una lectura o un montaje). */
  enMarcha: boolean;
  /** El agente que tiene la tarea en la mano, o '' si ninguno. */
  activo: string;
  /** Los agentes que ya dejaron su tarea en la corrida en curso. */
  hechos: Set<string>;
  /** El nombre del paso en curso («Vera lee su negocio», «Leyendo el mercado: AE»). */
  paso: string;
  /** El detalle de ese paso, en una línea. */
  detalle: string;
  /** El avance del motor: paso actual, total de pasos y porcentaje. */
  pasoDe: number;
  pasos: number;
  porcentaje: number;
  /** Lo que lleva y lo que falta, en segundos. `faltaSeg` es null cuando todavía no hay estimado. */
  segundos: number;
  faltaSeg: number | null;
};

/** ¿Esa corrida sigue en curso? Lo dice el estado que devolvió el back, no el panel. */
export const enCurso = (estado?: string) => /corriendo|en_curso|en curso|pendiente|abierta/i.test(estado || '');

const reloj = (seg: number) => `${Math.floor(seg / 60)}:${String(Math.round(seg % 60)).padStart(2, '0')}`;

/** El tiempo en reloj, para el panel: 2:14. */
export const enReloj = reloj;

/** El agente, por id. */
export const agentePorId = (id: string): Agente | undefined => AGENTES.find(a => a.id === id);

/**
 * El estado en vivo del equipo: quién trabaja, en qué y cuánto falta. Una sola lectura para toda la tarjeta.
 */
export function useAgenteEnVivo(corridas: Corrida[]): { vivo: MotorVivo | null } & AgenteEnVivo {
  const vivo = useMotorVivo();

  return useMemo(() => {
    const enMarcha = !!vivo?.corriendo;
    const tareas = vivo?.trabajos ?? [];
    const corrida = tareas.find(t => t.clase === 'corrida') as Trabajo | undefined;
    const lectura = tareas.find(t => t.clase === 'lectura') as Trabajo | undefined;

    // La corrida en curso, si el back ya la publicó (puede tardar: la lista se refresca cada 30 segundos).
    const corridaViva = corridas.find(c => enCurso(c.estado)) ?? null;
    // Los que YA trabajaron: llegan con el latido cada 2 segundos, y son la señal que avanza de verdad.
    const hechos = new Set([
      ...(corrida?.agentes_hechos ?? []),
      ...((corridaViva?.tareas ?? []).map(t => t.agente)),
    ]);

    // QUIÉN LO TIENE. Sin trabajo en marcha, nadie.
    let activo = '';
    if (enMarcha) {
      const pasoEnCurso = String(vivo?.paso || corrida?.que || '');
      const nombrado = pasoEnCurso
        ? AGENTES.find(a => new RegExp(`(^|\\W)${a.nombre}(\\W|$)`, 'i').test(pasoEnCurso))
        : undefined;
      if (lectura) {
        // La lectura del mercado es el trabajo de Lux: cuando lo que corre es eso, es él quien lo tiene.
        activo = 'lux';
      } else if (hechos.size > 0) {
        // Con tareas ya entregadas, el que sigue es el primero del equipo que todavía no aparece.
        activo = AGENTES.find(a => !hechos.has(a.id))?.id ?? '';
      } else if (nombrado) {
        activo = nombrado.id;
      }
    }

    // QUÉ ESTÁ HACIENDO Y CUÁNTO FALTA.
    const tareaDeTurno = lectura ?? corrida;
    const paso = String(lectura ? lectura.que : (vivo?.paso || corrida?.que || ''));
    const detalle = String(tareaDeTurno?.detalle || '');
    const pasos = Number(tareaDeTurno?.pasos ?? corrida?.pasos ?? 0) || 0;
    const pasoDe = Number(tareaDeTurno?.paso_de ?? corrida?.paso_de ?? 0) || 0;
    const segundos = Number(tareaDeTurno?.segundos ?? corrida?.segundos ?? 0) || 0;
    const estimado = Number(tareaDeTurno?.estimado_seg ?? corrida?.estimado_seg ?? 0) || 0;
    const porcentaje = pasos ? Math.min(100, Math.max(0, Math.round((pasoDe / pasos) * 100))) : 0;
    const faltaSeg = estimado > 0 ? estimado - segundos : null;

    return {
      vivo, enMarcha, activo, hechos, paso, detalle,
      pasoDe, pasos, porcentaje, segundos, faltaSeg,
    };
  }, [vivo, corridas]);
}

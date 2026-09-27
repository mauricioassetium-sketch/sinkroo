import type { Pool } from 'pg';
import { correrInvestigacion } from './agentes.js';

// =============================================================================================
// LA INVESTIGACIÓN DIARIA — lo que la pantalla de entrada promete: «investiga el mercado cada mañana».
//
// Corre UNA VEZ AL DÍA por negocio, con la misma corrida que dispara el botón de Mercado y las mismas
// reglas: 0 créditos (investigar no gasta), fuentes reales o `sin_fuente`, y ningún número inventado.
//
// A quién le corre: solo a los negocios que ya dijeron A QUÉ SE DEDICAN y DÓNDE VENDEN (rubro + zona),
// que son los dos datos del onboarding. Sin esos dos, no hay mercado que leer y no se corre: se espera.
//
// Cómo se evita repetir: cada corrida diaria se registra con motivo 'investigacion diaria' y el
// programador mira si ya hay una de hoy antes de lanzar. Si el servidor estuvo apagado a la hora
// prevista, la primera revisión que pase después la corre igual (no se pierde el día).
//
// Reintentos: si una fuente externa falla, el agente lo dice en su tarea y la corrida queda registrada
// igual. El programador no vuelve a correr ese negocio el mismo día: una corrida diaria es una.
// =============================================================================================

const HORA_OBJETIVO = Number(process.env.INVESTIGAR_HORA || 6);   // 6 de la mañana, hora del servidor
const CADA_MS = Number(process.env.INVESTIGAR_REVISA_MIN || 30) * 60 * 1000;

/** Un negocio al que se le puede leer el mercado hoy. */
type Negocio = { id: string; nombre: string; descripcion: string; rubro: string; zona: string };

/** Corre la investigación de un negocio y deja constancia en el log. Nunca tumba el programador. */
async function investigar(db: Pool, n: Negocio, log: (m: string) => void) {
  try {
    const r = await correrInvestigacion(db, {
      businessId: n.id, nombre: n.nombre, descripcion: n.descripcion, rubro: n.rubro, zona: n.zona,
    }, 'investigacion diaria');
    const sinFuente = (r.tareas || []).filter((t: any) => t.resultado?.sin_fuente).map((t: any) => t.agente);
    log(`investigación diaria de «${n.nombre}»: ${r.tareas.length} tareas, ${r.hallazgos.length} hallazgos` +
      (sinFuente.length ? ` · sin fuente todavía: ${sinFuente.join(', ')}` : ''));
  } catch (e) {
    log(`investigación diaria de «${n.nombre}» falló: ${String((e as Error).message || e).slice(0, 160)}`);
  }
}

/** Pasa la revisión: ¿a quién le toca hoy y todavía no se le corrió? */
export async function revisarInvestigacionDiaria(db: Pool, log: (m: string) => void) {
  const hora = new Date().getHours();
  if (hora < HORA_OBJETIVO) return { corridos: 0, motivo: `todavía no son las ${HORA_OBJETIVO}` };

  // Los negocios que ya dijeron qué hacen y dónde venden, y a los que hoy no se les ha corrido.
  const r = await db.query(
    `SELECT b.id, b.name AS nombre, coalesce(b.description,'') AS descripcion,
            coalesce(b.rubro,'') AS rubro, coalesce(b.zona,'') AS zona
       FROM businesses b
      WHERE (coalesce(b.rubro,'') <> '' OR length(coalesce(b.description,'')) >= 20)
        AND coalesce(b.zona,'') <> ''
        AND NOT EXISTS (
          SELECT 1 FROM corridas c
           WHERE c.business_id = b.id
             AND c.motivo = 'investigacion diaria'
             AND c.empezada_at >= date_trunc('day', now())
        )
      ORDER BY b.created_at
      LIMIT 12`);
  const negocios = r.rows as Negocio[];
  for (const n of negocios) await investigar(db, n, log);
  return { corridos: negocios.length };
}

/**
 * Enciende el programador. Se llama al arrancar el servidor: revisa cada media hora y corre lo que
 * falte del día. Es idempotente: si ya se corrió, no hace nada.
 */
export function programarInvestigacionDiaria(db: Pool, log: (m: string) => void) {
  if (process.env.INVESTIGAR_DIARIA === '0') { log('investigación diaria apagada por INVESTIGAR_DIARIA=0'); return; }
  // La primera revisión espera un minuto: el servidor termina de levantar y la migración ya corrió.
  setTimeout(() => { void revisarInvestigacionDiaria(db, log).catch(() => {}); }, 60_000);
  setInterval(() => { void revisarInvestigacionDiaria(db, log).catch(() => {}); }, CADA_MS);
  log(`investigación diaria programada: corre después de las ${HORA_OBJETIVO}:00 y revisa cada ${CADA_MS / 60000} min`);
}

// =============================================================================================
// LOS PLANOS — el desglose del guion para el generador de video (PenShot)
//
// El guion de nuestra pieza dice «3-10 s · SE VE: el trabajo en marcha»: eso no es un prompt de video.
// PenShot —un motor libre, instalado en este servidor, que corre sobre DeepSeek— convierte el guion en
// planos de 5 segundos o menos, y para cada uno escribe el prompt, el negativo, la duración y el audio,
// cuidando que el estilo y los personajes no cambien entre planos.
//
// Acá se lo llama por su API REST (el comando que entrega archivos viene roto; la API devuelve el
// resultado completo). Si el motor no está corriendo, la pieza se queda sin planos y lo dice: el guion
// de siempre sigue estando, y el sistema no se rompe por una herramienta de afuera.
// =============================================================================================

export type Plano = {
  n: number;
  duracion_s: number;
  prompt: string;
  prompt_negativo: string;
  audio?: string;
};

export type PlanosDelGuion = {
  planos: Plano[];
  duracion_total_s: number;
  motor: string;
  estilo_unificado: string;
  modelos_declarados: { video: string; audio: string };
  fuente: string;
  /** El contexto que se le mandó al motor además del guion (formato, idioma, tono, duración). */
  contexto?: string;
};

import { entradaDePlanos } from './prompts-por-motor.js';

const API = process.env.PENSHOT_API || 'http://127.0.0.1:8077';

/**
 * El motor devuelve cada prompt en inglés y en chino (su idioma de origen). El generador de video solo
 * lee el inglés: se corta la parte china y el prompt queda limpio.
 */
const soloIngles = (t: string): string => {
  const cortes = String(t || '').split(/\n\s*\n/);
  const enIngles = cortes.filter(p => !/[\u4e00-\u9fff]/.test(p));
  return (enIngles.length ? enIngles.join(' ') : String(t || '')).replace(/\s+/g, ' ').trim();
};

/** ¿Está el motor levantado? Si no, no se pierde tiempo esperándolo. */
async function estaArriba(): Promise<boolean> {
  try {
    const r = await fetch(`${API}/openapi.json`, { signal: AbortSignal.timeout(3_000) });
    return r.ok;
  } catch { return false; }
}

/**
 * Desglosa un guion en planos. Devuelve null si el motor no está, tarda demasiado o falla: quien llame
 * decide qué hacer (en nuestro caso: la pieza se queda con su guion y lo dice).
 */
export async function planosDelGuion(d: {
  guion: string; formato?: string; segundos?: number; tono?: string; pais?: string; queHace?: string; timeoutMs?: number;
}): Promise<PlanosDelGuion | null> {
  const timeoutMs = d.timeoutMs ?? 240_000;
  const texto = String(d.guion || '').trim();
  if (texto.length < 40) return null;
  // EL GUION CON CONTEXTO: PenShot necesita el formato, la duración, el idioma y el tono, o inventa planos
  // cuadrados o en otro idioma. El guion va literal adentro.
  const entrada = entradaDePlanos({
    guion: texto, formato: d.formato ?? '', segundos: d.segundos, tono: d.tono, pais: d.pais, queHace: d.queHace,
  });
  if (!(await estaArriba())) return null;
  try {
    const r = await fetch(`${API}/api/v1/storyboard/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ script: entrada.script }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!r.ok) return null;
    const j = await r.json() as {
      success?: boolean;
      data?: {
        instructions?: {
          metadata?: { video_model?: string; audio_model?: string; repair_history?: { actions?: string[] }[] };
          fragments?: { fragment_id?: string; duration?: number; prompt?: string; negative_prompt?: string; audio_prompt?: string }[];
        };
      };
    };
    const frags = j?.data?.instructions?.fragments ?? [];
    if (!frags.length) return null;
    const planos: Plano[] = frags.map((f, i) => ({
      n: i + 1,
      duracion_s: Math.round((Number(f.duration) || 0) * 100) / 100,
      prompt: soloIngles(String(f.prompt || '')),
      prompt_negativo: soloIngles(String(f.negative_prompt || '')),
      ...(f.audio_prompt ? { audio: String(f.audio_prompt).trim() } : {}),
    })).filter(p => p.prompt);
    if (!planos.length) return null;
    const meta = j?.data?.instructions?.metadata;
    // El estilo unificado: la última acción del registro de reparación, que es donde el motor dice a qué
    // estilo llevó todos los planos para que no cambien entre sí.
    const acciones = meta?.repair_history?.[meta.repair_history.length - 1]?.actions ?? [];
    return {
      planos,
      duracion_total_s: Math.round(planos.reduce((s, p) => s + p.duracion_s, 0) * 100) / 100,
      motor: `PenShot (${API}) sobre DeepSeek`,
      estilo_unificado: acciones.find(a => /estilo|style/i.test(a)) || 'el motor lo unifica entre planos',
      modelos_declarados: { video: String(meta?.video_model || 'sin declarar'), audio: String(meta?.audio_model || 'sin declarar') },
      fuente: 'el desglose del guion en planos del motor PenShot, con su prompt, su negativo y su duración por plano',
      ...(entrada.porque ? { contexto: entrada.porque } : {}),
    };
  } catch { return null; }
}

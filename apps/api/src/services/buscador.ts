// =====================================================================================================
// LA DEMANDA, RASTREADA — de dónde viene de verdad el cliente de este negocio.
//
// POR QUÉ EXISTE
// El estudio se armaba con lo que el cliente contaba de sí mismo y con los anuncios de su categoría. Con un
// negocio global eso deja el mapa en dos países: los que alguien nombró. Pero un negocio de conserjería de lujo
// en Dubái no le vende a Dubái: le vende a quien llega de Rusia, Estados Unidos, Brasil, China o Europa, y eso
// no está en su web —está en los informes de turismo, en las noticias y en las estadísticas de quién compra—.
//
// CÓMO FUNCIONA (dos pasos, los dos con el modelo y con fuente)
//   1. El modelo escribe las consultas a partir del negocio: qué preguntarle al mundo para saber de dónde sale
//      el dinero que le paga.
//   2. El buscador de la flota las corre en internet y trae los resultados; con ellos el modelo deduce los
//      países, del más importante al menos, cada uno con la fuente que lo sostiene.
//
// REGLA: si un país no está en los resultados, no se escribe. Es preferible un dato con fuente que cuatro sin
// ella, y el dueño ya pidió que no se estime lo que no se pudo medir.
// =====================================================================================================

import { execFile } from 'node:child_process';
import { readFileSync, existsSync, unlinkSync } from 'node:fs';
import { pedirJson } from './escritor.js';

type Fuente = { pais: string; porque: string; fuente: string };
export type RastreoDeDemanda = {
  consultas: string[];
  paises: Fuente[];
  resumen: string;
  resultados: number;
  segundos: number;
};

const SISTEMA_CONSULTAS = [
  'Eres el investigador de mercado de un sistema de mercadeo. Tu trabajo es averiguar DE DÓNDE VIENEN los',
  'clientes de un negocio: qué mercados emisores, qué nacionalidades, de qué países sale el dinero que paga.',
  'Trabajas con lo que está publicado: informes de turismo, estadísticas, noticias de la industria.',
  'Escribes consultas de búsqueda cortas y en inglés (ahí están las fuentes buenas).',
  'Devuelves SOLO un objeto JSON: {"consultas": ["...", "...", "...", "..."]} — cuatro consultas, sin explicarlas.',
].join(' ');

const SISTEMA_LECTURA = [
  'Eres el investigador de mercado de un sistema de mercadeo. Con los resultados de búsqueda que te dan, dices de',
  'qué países o regiones viene la demanda de un negocio, del más importante al menos.',
  'REGLA QUE NO SE ROMPE: si un país no aparece en los resultados, no lo escribes. Para cada país das la fuente',
  'con el título del resultado del que lo sacaste. No inventas cifras ni países.',
  'Devuelves SOLO un objeto JSON: {"paises": [{"pais": "Rusia", "porque": "una línea", "fuente": "título del resultado"}],',
  '"resumen": "una frase de qué muestra el conjunto"}.',
].join(' ');

/** El negocio y lo que se sabe de él, en una sola línea, para que el modelo sepa de qué está hablando. */
function retrato(negocio: {
  nombre?: string | null; rubro?: string | null; categoria?: string | null; zona?: string | null;
  ciudad?: string | null; ofrece?: string | null; le_vende_a?: string | null;
}): string {
  return [
    `Negocio: ${negocio.nombre || 'sin nombre'}`,
    `De qué es: ${negocio.rubro || ''} ${negocio.categoria ? `(${negocio.categoria})` : ''}`.trim(),
    `Dónde: ${[negocio.ciudad, negocio.zona].filter(Boolean).join(', ') || 'sin declarar'}`,
    `Qué vende: ${negocio.ofrece || 'por saber'}`,
    `A quién le vende: ${negocio.le_vende_a || 'por saber'}`,
  ].join('\n');
}

/**
 * Rastrea la demanda de un negocio: escribe las consultas, sale a buscar y deduce los países con su fuente.
 * Devuelve null si no hay modelo o si la búsqueda no dejó nada (nunca lanza: la corrida sigue sin esto).
 */
export async function rastrearLaDemanda(
  businessId: string,
  negocio: Parameters<typeof retrato>[0],
): Promise<RastreoDeDemanda | null> {
  const t0 = Date.now();
  const escrito = await pedirJson(SISTEMA_CONSULTAS, retrato(negocio), 45_000);
  const consultas = Array.isArray(escrito?.consultas)
    ? (escrito!.consultas as unknown[]).map(c => String(c)).filter(c => c.length > 8 && c.length < 220).slice(0, 4)
    : [];
  if (consultas.length < 2) return null;

  // El buscador corre en un navegador de la flota, como el lector de anuncios: la búsqueda directa por HTTP
  // recibe un muro anti-robot (202), el navegador de verdad no.
  const salida = `/tmp/busqueda-${businessId.slice(0, 8)}.json`;
  try { if (existsSync(salida)) unlinkSync(salida); } catch { /* da igual */ }
  const archivo = new URL('../../workers/buscador.mjs', import.meta.url).pathname;
  await new Promise<void>(res => {
    execFile(process.execPath, [archivo, '--negocio', businessId, '--salida', salida, ...consultas],
      { timeout: 300_000, maxBuffer: 4 * 1024 * 1024 }, () => res());
  });
  if (!existsSync(salida)) return null;

  let crudo: { consultas: { consulta: string; resultados: { titulo: string; extracto: string; enlace: string }[] }[] };
  try { crudo = JSON.parse(readFileSync(salida, 'utf8')); } catch { return null; }
  const resultados = (crudo.consultas ?? []).flatMap(c => c.resultados ?? []);
  if (resultados.length < 3) return null;

  // Lo que se le da al modelo: el título y el extracto de cada resultado, sin el enlace (no lo necesita para
  // deducir el país y el extracto ya trae el dato). Se acota para que la llamada no crezca sin control.
  const paraLeer = resultados.slice(0, 24)
    .map((r, i) => `${i + 1}. ${r.titulo}\n   ${r.extracto.slice(0, 220)}`).join('\n');
  const leido = await pedirJson(SISTEMA_LECTURA,
    `${retrato(negocio)}\n\nResultados de búsqueda:\n${paraLeer}`, 60_000);
  const paises = Array.isArray(leido?.paises)
    ? (leido!.paises as unknown[]).map(p => p as Fuente)
        .filter(p => p && typeof p.pais === 'string' && p.pais.length > 1 && p.pais.length < 60)
        .slice(0, 8)
    : [];
  if (!paises.length) return null;

  return {
    consultas, paises, resumen: String(leido?.resumen || '').slice(0, 400),
    resultados: resultados.length, segundos: Math.round((Date.now() - t0) / 1000),
  };
}

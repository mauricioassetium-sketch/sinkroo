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
import { codigoDePais } from '../lib/paises.js';

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
  'Escribes cuatro consultas de búsqueda cortas: TRES en inglés (ahí están las fuentes de la industria) y UNA en',
  'español. La consulta en español importa: los mercados hispanohablantes no salen en las fuentes de la industria',
  '—medido: el informe nombraba a los compradores de India, China, Rusia y el Reino Unido, y ningún país de',
  'América Latina, aunque entre las fuentes leídas había una nota en español sobre los compradores colombianos—.',
  'Devuelves SOLO un objeto JSON: {"consultas": ["...", "...", "...", "..."]} — cuatro consultas, sin explicarlas,',
  'tres en inglés y la última en español.',
].join(' ');

const SISTEMA_LECTURA = [
  'Eres el investigador de mercado de un sistema de mercadeo. Con los resultados de búsqueda que te dan, dices de',
  'qué países o regiones viene la demanda de un negocio, del más importante al menos.',
  'REGLA QUE NO SE ROMPE: si un país no aparece en los resultados, no lo escribes. Para cada país das la fuente',
  'con el título del resultado del que lo sacaste. No inventas cifras ni países.',
  'Devuelves SOLO un objeto JSON: {"paises": [{"pais": "Rusia", "porque": "una línea", "fuente": "título del resultado"}],',
  '"resumen": "una frase de qué muestra el conjunto"}.',
  'NOMBRA TODOS los mercados que las fuentes mencionen, no sólo los tres primeros: si aparece Europa, Rusia, los',
  'Estados Unidos o América Latina, van en la lista —aunque sean mercados chicos—. Es peor dejar afuera un mercado',
  'que existe que incluir uno secundario.',
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
const SISTEMA_PAISES_DEL_INFORME = [
  'Eres el investigador de mercado de un sistema de mercadeo. Te dan un informe ya escrito y sacas de él DE QUÉ',
  'PAÍSES vienen los clientes que pagan: los mercados emisores, las nacionalidades que compran, de dónde sale el',
  'dinero. Trabajas sólo con lo que el informe dice: si un país no está en el informe, no lo pones.',
  'Devuelves SOLO un objeto JSON: {"paises": [{"pais": "Rusia", "porque": "la frase del informe que lo sostiene"}]}.',
  'Si el informe no nombra ningún país, devuelves {"paises": []}.',
].join(' ');

/**
 * LOS PAÍSES QUE NOMBRA UN INFORME PROFUNDO. El rastreo liviano lee titulares y de ahí saca los mercados; el
 * informe, en cambio, nombra nacionalidades con datos y fuentes, y hasta ahora se quedaba guardado sin alimentar
 * el mapa —medido: el informe decía «los países de la CEI, que incluyen a Rusia» y Rusia no quedaba cargada—.
 * Esto lee el informe y devuelve sus países para que cuenten como mercados declarados.
 */
export async function paisesDelInforme(informe: string): Promise<Fuente[]> {
  if (!informe || informe.length < 300) return [];
  const leido = await pedirJson(SISTEMA_PAISES_DEL_INFORME, informe.slice(0, 18_000), 60_000);
  if (!Array.isArray(leido?.paises)) return [];
  const vistos = new Set<string>();
  return (leido!.paises as unknown[]).map(p => p as Fuente)
    .filter(p => p && typeof p.pais === 'string' && p.pais.length > 1 && p.pais.length < 60)
    .filter(p => { const k = codigoDePais(p.pais) || p.pais.toLowerCase().trim(); if (vistos.has(k)) return false; vistos.add(k); return true; })
    .map(p => ({ pais: p.pais, porque: String(p.porque || '').slice(0, 300), fuente: 'el informe profundo' }))
    .slice(0, 12);
}

/**
 * EL ESTUDIO PROFUNDO — el investigador que lee las páginas enteras.
 *
 * Por qué es otro camino y no el mismo: el rastreo de arriba es liviano (cuatro consultas, los extractos, 40
 * segundos) y alcanza para saber de dónde viene la demanda. Esto es un investigador hecho y derecho
 * (gpt-researcher, corriendo aparte en /opt/gpt-researcher): arma sus propias sub-preguntas, lee las páginas
 * completas y devuelve un informe largo CON CITAS. MEDIDO con World Key: 30 s, 14 fuentes, 16.000 caracteres.
 *
 * Si el servicio no está instalado o no responde, devuelve null y la corrida sigue: el estudio profundo es un
 * lujo, no un requisito.
 */
export type InformeProfundo = { pregunta: string; informe: string; fuentes: { titulo?: string; enlace: string }[]; segundos: number };

export async function investigarProfundo(
  businessId: string,
  negocio: Parameters<typeof retrato>[0],
): Promise<InformeProfundo | null> {
  const casa = '/opt/gpt-researcher';
  const piton = `${casa}/.venv/bin/python`;
  const trabajador = new URL('../../workers/buscador-profundo.py', import.meta.url).pathname;
  if (!existsSync(piton)) return null;                 // no está instalado: la corrida sigue sin esto
  const salida = `/tmp/profundo-${businessId.slice(0, 8)}.json`;
  try { if (existsSync(salida)) unlinkSync(salida); } catch { /* da igual */ }
  const pregunta = [
    `¿De dónde vienen los clientes que pagan por ${negocio.rubro || negocio.categoria || 'este negocio'}`,
    `en ${[negocio.ciudad, negocio.zona].filter(Boolean).join(', ') || 'su ciudad'}?`,
    'Quiero los mercados emisores y las nacionalidades que compran, con datos publicados',
    '(informes, estadísticas y noticias de la industria) y de dónde sale el dinero. Sin estimaciones.',
  ].join(' ');
  await new Promise<void>(res => {
    execFile(piton, [trabajador, '--pregunta', pregunta, '--salida', salida],
      { timeout: 600_000, maxBuffer: 8 * 1024 * 1024, cwd: casa }, () => res());
  });
  if (!existsSync(salida)) return null;
  try {
    const d = JSON.parse(readFileSync(salida, 'utf8')) as InformeProfundo;
    if (!d?.informe || d.informe.length < 300) return null;
    return d;
  } catch { return null; }
}

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
  // Sin repetidos: el modelo devuelve el mismo país más de una vez (medido: «Emiratos Árabes Unidos» tres veces
  // en la misma respuesta) y así salía tres veces en la tarjeta y en el conteo del mapa. La clave es el código.
  const vistos = new Set<string>();
  const paises = Array.isArray(leido?.paises)
    ? (leido!.paises as unknown[]).map(p => p as Fuente)
        .filter(p => p && typeof p.pais === 'string' && p.pais.length > 1 && p.pais.length < 60)
        .filter(p => { const k = codigoDePais(p.pais) || p.pais.toLowerCase().trim(); if (vistos.has(k)) return false; vistos.add(k); return true; })
        .slice(0, 12)
    : [];
  if (!paises.length) return null;

  return {
    consultas, paises, resumen: String(leido?.resumen || '').slice(0, 400),
    resultados: resultados.length, segundos: Math.round((Date.now() - t0) / 1000),
  };
}

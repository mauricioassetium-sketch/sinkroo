import { spawn } from 'node:child_process';
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

/**
 * LOS CONTINENTES Y SUS PAÍSES. El negocio no tiene por qué saber códigos ISO: elige un continente y el
 * sistema lee en los mercados principales de ese continente. Es una lista declarada —se ve qué países
 * cubre cada uno— y no se inventa por negocio.
 */
const PAISES_DEL_CONTINENTE: Record<string, string[]> = {
  latinoamerica: ['CO', 'MX', 'AR', 'CL', 'PE', 'BR', 'EC', 'PA'],
  'america del norte': ['US', 'CA', 'MX'],
  europa: ['ES', 'GB', 'DE', 'FR', 'IT', 'NL'],
  'medio oriente': ['AE', 'SA', 'QA', 'KW'],
  asia: ['SG', 'JP', 'IN', 'ID'],
  africa: ['ZA', 'NG', 'KE'],
  oceania: ['AU', 'NZ'],
};

/** Los lugares que nombra el negocio, en código de país: así el trabajador sabe dónde leer. */
const PAIS_DE: Record<string, string> = {
  medellin: 'CO', bogota: 'CO', cali: 'CO', barranquilla: 'CO', colombia: 'CO',
  mexico: 'MX', chile: 'CL', peru: 'PE', argentina: 'AR', brasil: 'BR', ecuador: 'EC',
  panama: 'PA', espana: 'ES', 'estados unidos': 'US', usa: 'US', uae: 'AE', dubai: 'AE',
  'emiratos arabes': 'AE', 'arabia saudi': 'SA', 'reino unido': 'GB', alemania: 'DE', singapur: 'SG',
};

/**
 * LO QUE VERA DEJÓ ESCRITO sobre este negocio: sus PALABRAS CLAVE (rwa, tokenización, gemelos
 * digitales…) y los LUGARES que nombra el material. Con eso el trabajador sabe qué buscar y dónde,
 * en vez de leer siempre las mismas palabras en el mismo país.
 */
export async function loQueDedujoVera(db: Pool, businessId: string): Promise<{ palabras: string[]; paises: string[] }> {
  try {
    const r = await db.query(
      `SELECT t.resultado FROM tareas_corrida t JOIN corridas c ON c.id = t.corrida_id
        WHERE c.business_id = $1 AND t.agente = 'vera' AND t.resultado ? 'palabras_clave'
        ORDER BY c.empezada_at DESC LIMIT 1`, [businessId]);
    const res = (r.rows[0]?.resultado ?? {}) as { palabras_clave?: { palabra: string; de: string }[]; lugares_que_nombra?: string[] };
    // Primero el vocabulario del rubro (es el que nombra la categoría); si no hay, las palabras propias.
    const delVocabulario = (res.palabras_clave ?? []).filter(p => p.de === 'el vocabulario del rubro').map(p => p.palabra);
    const propias = (res.palabras_clave ?? []).map(p => p.palabra);
    // LA CATEGORÍA DEL NEGOCIO VA PRIMERO. Es el término que dice a qué se dedica (lo nombra el modelo en
    // `categoriaDelNegocio`), así que la lectura de anuncios sale con él y no con una palabra del copy: un
    // servicio de lujo se lee como «luxury concierge», no como «defi».
    const deLaCategoria = (res.palabras_clave ?? []).filter(p => p.de === 'la categoría del negocio').map(p => p.palabra);
    // EL ORDEN ES LA BÚSQUEDA. El lector toma las primeras cuatro: primero la categoría —que es lo que dice a
    // qué se dedica—, después las palabras PROPIAS del material y sólo al final las genéricas del vocabulario.
    // Con el vocabulario antes, un servicio de lujo salía a leer con «defi» y «aml» y traía 370 anuncios que
    // no compiten (medido: 1 comparable de verdad sobre 400).
    // LA CATEGORÍA Y SUS PALABRAS PRIMERO. El lector toma las cuatro primeras, así que el orden ES la
    // búsqueda: «luxury concierge» y «concierge» son las que traen a los que compiten; después el vocabulario
    // del rubro y al final las palabras del copy («exclusive», «redefine»), que son las más ruidosas. Medido
    // con el vocabulario primero: 400 anuncios leídos y 1 comparable de verdad.
    const deLaCategoriaSuelta = deLaCategoria.flatMap(t => String(t).split(/\s+/)).filter(w => w.length >= 4);
    const palabras = [...new Set([...deLaCategoria, ...deLaCategoriaSuelta, ...delVocabulario, ...propias])]
      .filter(p => p.length >= 3).slice(0, 4);
    const paises = [...new Set((res.lugares_que_nombra ?? []).map(l => PAIS_DE[String(l).toLowerCase().trim()]).filter(Boolean))].slice(0, 3);
    return { palabras, paises };
  } catch { return { palabras: [], paises: [] }; }
}

/**
 * LOS PAÍSES QUE DECLARÓ EL NEGOCIO en Primeros pasos: los que marcó uno por uno y los continentes que
 * eligió, expandidos a sus mercados principales. Si no declaró nada, se devuelve vacío: el sistema es
 * global y no da por sentado ningún país.
 */
export async function paisesDeclarados(db: Pool, businessId: string): Promise<string[]> {
  try {
    const r = await db.query('SELECT datos FROM onboarding WHERE business_id = $1', [businessId]);
    const datos = (r.rows[0]?.datos ?? {}) as Record<string, unknown>;
    const sueltos = Array.isArray(datos.paises) ? (datos.paises as string[]).map(p => String(p).toUpperCase().trim()) : [];
    const delContinente = Array.isArray(datos.continentes)
      ? (datos.continentes as string[]).flatMap(c => PAISES_DEL_CONTINENTE[String(c).toLowerCase().trim()] || [])
      : [];
    return [...new Set([...sueltos, ...delContinente])].filter(p => /^[A-Z]{2}$/.test(p)).slice(0, 6);
  } catch { return []; }
}

/**
 * LA LECTURA DE ANUNCIOS, encadenada a la investigación: después de que los agentes investigan, el
 * trabajador sale a la Biblioteca de Anuncios de Meta con las palabras del rubro del negocio y los
 * países donde opera (LECTURA_PAISES, por defecto Colombia). Es el mismo trabajador que se probó a
 * mano, solo que ahora lo lanza el programador en vez de una persona. No se espera su respuesta: si
 * tarda, no frena la investigación del día; lo que lea queda en la tabla de anuncios leídos.
 */
export function lanzarLecturaDeAnuncios(
  n: Negocio, dedujo: { palabras: string[]; paises: string[] },
  declarados: string[], log: (m: string) => void,
) {
  // Las palabras y los países salen de lo que dedujo Vera; si todavía no hay nada, se cae al rubro del
  // perfil y a Colombia. Nunca se leen palabras inventadas ni un mercado que el negocio no nombró.
  const palabras = dedujo.palabras.length
    ? dedujo.palabras
    : String(n.rubro || '').toLowerCase().split(/[^a-záéíóúñ0-9]+/).filter(w => w.length >= 4 && w.length <= 24).slice(0, 4);
  if (!palabras.length) return;
  // Los países: primero los que Vera encontró en el material, más los que el negocio declaró (países
  // sueltos y continentes). SIN NADA POR DEFECTO: si no hay ni uno, no se lee — porque el sistema es
  // global y no puede dar por sentado que un negocio opera en Colombia, ni en ningún país.
  const paises = dedujo.paises.length ? dedujo.paises : declarados;
  const args = [new URL('../../workers/lector-anuncios.mjs', import.meta.url).pathname,
    '--negocio', n.id, '--salida', `/tmp/anuncios-${n.id}.json`];
  for (const palabra of palabras) for (const pais of paises) args.push(`${palabra}:${pais}`);
  try {
    const hijo = spawn(process.execPath, args, { env: process.env, detached: true, stdio: 'ignore' });
    hijo.unref();
    log(`lectura de anuncios lanzada para «${n.nombre}»: ${palabras.join(', ')} en ${paises.join(', ')}`);
  } catch (e) {
    log(`no se pudo lanzar la lectura de anuncios de «${n.nombre}»: ${String((e as Error).message).slice(0, 120)}`);
  }
}

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
  for (const n of negocios) {
    await investigar(db, n, log);
    // Y de una, la lectura de anuncios con las palabras del rubro que quedó en el perfil (lo que dedujo Vera).
    lanzarLecturaDeAnuncios(n, await loQueDedujoVera(db, n.id), await paisesDeclarados(db, n.id), log);
  }
  // Y de paso: los créditos de bienvenida del primer mes que ya vencieron.
  try { await vencerBienvenidas(db, log); } catch (e) { log(`no se pudieron vencer los créditos: ${String((e as Error).message).slice(0, 120)}`); }
  return { corridos: negocios.length };
}

/**
 * LOS CRÉDITOS DE BIENVENIDA VENCEN A LOS 30 DÍAS. Al vencer, lo que no se usó se retira con un
 * movimiento propio (motivo 'vencimiento'): el saldo sigue cuadrando con su historia y el negocio ve
 * por qué bajó. Se retira, como mucho, lo que regaló la bienvenida: si además cargó créditos pagados,
 * esos no se tocan (van sin fecha de vencimiento).
 */
export async function vencerBienvenidas(db: Pool, log: (m: string) => void) {
  const r = await db.query(
    `SELECT b.id, b.name,
            (SELECT saldo FROM movimientos_creditos m WHERE m.business_id = b.id ORDER BY created_at DESC LIMIT 1) AS saldo,
            (SELECT delta FROM movimientos_creditos m WHERE m.business_id = b.id AND m.motivo = 'bienvenida' ORDER BY created_at ASC LIMIT 1) AS regalo
       FROM businesses b
      WHERE EXISTS (SELECT 1 FROM movimientos_creditos m
                     WHERE m.business_id = b.id AND m.motivo = 'bienvenida' AND m.vence_at IS NOT NULL AND m.vence_at <= now())
        AND NOT EXISTS (SELECT 1 FROM movimientos_creditos m WHERE m.business_id = b.id AND m.motivo = 'vencimiento')`);
  let n = 0;
  for (const f of r.rows) {
    const saldo = Number(f.saldo) || 0;
    const regalo = Number(f.regalo) || 0;
    const vencido = Math.min(saldo, regalo);
    if (vencido <= 0) continue;
    await db.query(
      `INSERT INTO movimientos_creditos (business_id, delta, motivo, detalle, saldo)
       VALUES ($1, $2, 'vencimiento', $3, $4)`,
      [f.id, -vencido, `Vencieron los créditos de bienvenida del primer mes (${vencido} sin usar)`, saldo - vencido]);
    log(`créditos de bienvenida vencidos en «${f.name}»: ${vencido} sin usar`);
    n++;
  }
  return n;
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

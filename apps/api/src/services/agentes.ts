import type { Pool } from 'pg';
import { promptDelNegocio, promptsDelInforme, guardarPrompts } from './prompts.js';
import { buscarSimilares, categoriaPertinente, deducirNegocio, leerArchivos, leerPagina, leerWikipedia, palabrasClave, similarPertinente, type NegocioLeido } from './vera.js';
import { detectarLengua, lenguaDePais, nombreDeLengua, terminoEnOtrasLenguas, VOCABULARIO_POR_LENGUA } from './lenguas.js';
import { leerIdentidadDeLaPagina } from './identidad.js';
import { armarInformeDelMercadoLeido, type InformeDelMercado } from './mercado.js';
import { armarLaPieza } from './pieza.js';
import { vocabularioDe } from './corrector.js';
import { crearPublico, evaluar as evaluarConMiroFish } from './mirofish.js';
import { TARIFA, saldoDe, cobrarCreacion } from './creditos.js';
import { capaDeOficio } from './oficio.js';
import { planosDelGuion } from './planos.js';
import { generarImagen, promptVisual } from './imagenes.js';
import { generarVideo } from './video.js';
import { aJson } from '../lib/json-seguro.js';

// =============================================================================================
// LOS SEIS AGENTES DEL EQUIPO — la investigación del mercado, con trabajo REAL.
//
// REGLA QUE NO SE ROMPE: ningún agente devuelve un número que no haya medido. Si su fuente no está
// conectada, lo dice con todas las letras (`sin_fuente`) y no entrega cifra ni fuente inventada.
//
// Antes este archivo simulaba: daba «leyó 47 anuncios» con un número de fórmula y una fuente
// («Biblioteca de anuncios de Meta, leída hoy») que nadie había leído. Eso se acabó.
//
// QUÉ HACE CADA UNO Y DE DÓNDE SACA EL DATO (todo verificable):
//   · Lux  (mercado)        → OpenStreetMap de verdad: ubica la ciudad (Nominatim) y pide los negocios
//                             del rubro a Overpass. Más el informe de piezas vivas ya corrido (la Ad
//                             Library pública), si existe para el negocio o para su rubro y ciudad.
//   · Rex  (demanda)        → los precios publicados en el informe del mercado. La demanda (búsquedas)
//                             necesita fuente conectada: si no está, lo dice.
//   · Nia  (escritura)      → el molde de escritura con las palabras REALES del negocio y el patrón que
//                             gana en su rubro (formato, botón, prueba social).
//   · Kai  (pauta y costos) → cuenta cómo está pautando el rubro pieza por pieza (botón, formato,
//                             prueba) y el costo real de la cuenta del negocio si sus métricas están.
//   · Sol  (medición)       → el desvío real del modelo contra las predicciones guardadas.
//   · Rumi (conversaciones) → las conversaciones REALES del negocio en su base, con lo que preguntan.
//
// INVESTIGAR NO CUESTA CRÉDITOS: es la regla del producto (lo único que gasta es publicar).
// =============================================================================================

export const AGENTES = [
  { id: 'lux', nombre: 'Lux', oficio: 'Mercado' },
  { id: 'rex', nombre: 'Rex', oficio: 'Demanda y presupuesto' },
  { id: 'nia', nombre: 'Nia', oficio: 'Escritura' },
  { id: 'kai', nombre: 'Kai', oficio: 'Publicidad y costos' },
  { id: 'sol', nombre: 'Sol', oficio: 'Medición y modelo' },
  { id: 'rumi', nombre: 'Rumi', oficio: 'Conversaciones' },
  { id: 'iris', nombre: 'Iris', oficio: 'Arte y prompts' },
  { id: 'nova', nombre: 'Nova', oficio: 'Formatos y tendencias' },
  { id: 'tino', nombre: 'Tino', oficio: 'Decisión' },
  // Vera va PRIMERO: sin entender el negocio, los demás salen a investigar a ciegas.
  { id: 'vera', nombre: 'Vera', oficio: 'Entender el negocio' },
];

/** Cómo se identifica el motor ante OpenStreetMap: Overpass y Nominatim lo exigen y limitan por IP. */
const UA = 'Sinkroo/1.0 (+https://sinkroo.com; info@sinkroo.com)';

// ---------------------------------------------------------------------------------------------
// LO QUE QUEDA DE LA SIMULACIÓN, y es a propósito: el público de 500 agentes (MiroFish) y la
// calibración reparten sus criterios con azar reproducible. Eso NO es un dato del mercado: es el
// simulacro del público del negocio, y por eso vive acá y no adentro de un agente. Los seis agentes
// de mercado ya no lo usan: trabajan con fuentes reales.
// ---------------------------------------------------------------------------------------------
/** Semilla estable a partir de un texto: mismo negocio, mismo simulacro. */
export function semillaDe(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) { h ^= texto.charCodeAt(i); h = Math.imul(h, 16777619); }
  return Math.abs(h) % 2147483647;
}

/** Azar reproducible: una serie de números entre 0 y 1 a partir de la semilla (para el simulacro). */
export function azar(semilla: number) {
  let s = semilla || 1;
  return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
}

export type Contexto = { businessId: string; nombre: string; descripcion: string; rubro: string; zona: string };

/** El texto con el que el negocio dice a qué se dedica: rubro, nombre y descripción, en minúsculas. */
const queHace = (ctx: Contexto) => `${ctx.rubro} ${ctx.nombre} ${ctx.descripcion}`.toLowerCase();

// ---------------------------------------------------------------------------------------------
// Del rubro a los filtros de OpenStreetMap. Lo que no se sabe, no se inventa: si el rubro no está en
// este mapa de oficios, se busca su propia palabra en el nombre del negocio (y se declara así).
// ---------------------------------------------------------------------------------------------
const FILTROS: { claves: string[]; filtros: string[]; oficio: string }[] = [
  { claves: ['keratina', 'alisado', 'peluqueria', 'salon de belleza', 'estetica', 'cabello', 'belleza', 'barberia'],
    filtros: ['node["shop"="hairdresser"]', 'node["shop"="beauty"]', 'node["shop"="hairdresser_supply"]'], oficio: 'peluquerías y salones de belleza' },
  { claves: ['flor', 'flores', 'floristeria', 'ramos'],
    filtros: ['node["shop"="florist"]', 'node["shop"="flowers"]'], oficio: 'floristerías' },
  { claves: ['gimnasio', 'entrenamiento', 'fitness', 'crossfit', 'pesas'],
    filtros: ['node["leisure"="fitness_centre"]', 'node["amenity"="gym"]'], oficio: 'gimnasios y centros de entrenamiento' },
  { claves: ['restaurante', 'comida', 'cocina', 'cafeteria', 'panaderia'],
    filtros: ['node["amenity"="restaurant"]', 'node["amenity"="cafe"]', 'node["shop"="bakery"]'], oficio: 'restaurantes, cafés y panaderías' },
  { claves: ['ropa', 'moda', 'boutique', 'calzado'],
    filtros: ['node["shop"="clothes"]', 'node["shop"="shoes"]'], oficio: 'tiendas de ropa y calzado' },
  { claves: ['dentista', 'odontolog', 'clinica', 'medicina', 'salud'],
    filtros: ['node["amenity"="dentist"]', 'node["amenity"="doctors"]', 'node["amenity"="clinic"]'], oficio: 'consultorios y clínicas' },
  { claves: ['inmobiliaria', 'arriendo', 'finca raiz', 'vivienda'],
    filtros: ['node["office"="estate_agent"]'], oficio: 'inmobiliarias' },
  { claves: ['joyeria', 'bisuteria', 'accesorios', 'reloj'],
    filtros: ['node["shop"="jewelry"]'], oficio: 'joyerías y bisuterías' },
  { claves: ['mascota', 'veterinaria', 'perro', 'gato'],
    filtros: ['node["shop"="pet"]', 'node["amenity"="veterinary"]'], oficio: 'tiendas de mascotas y veterinarias' },
  { claves: ['tecnologia', 'computador', 'celular', 'electronica', 'software'],
    filtros: ['node["shop"="computer"]', 'node["shop"="mobile_phone"]', 'node["shop"="electronics"]'], oficio: 'tiendas de tecnología' },
];

/** A qué oficio del mapa corresponde este rubro, y con qué filtros se busca (vacío si no se sabe). */
export function filtrosDeRubro(texto: string) {
  const t = String(texto || '').toLowerCase();
  const hit = FILTROS.find(f => f.claves.some(k => t.includes(k)));
  return hit ?? { claves: [], filtros: [], oficio: '' };
}

/** Pide datos con tope de tiempo: una fuente que no responde no puede colgar la corrida entera. */
async function pedirJson(url: string, ms = 25000): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: ctrl.signal });
    if (!r.ok) throw new Error(`la fuente respondió ${r.status}`);
    return await r.json();
  } finally { clearTimeout(t); }
}

// ---------------------------------------------------------------------------------------------
// LAS TENDENCIAS POR PAÍS (Nova). Se leen del RSS público de tendencias de búsqueda, por país, sin
// llave ni cuenta. Devuelve los temas del día y en qué países aparecen: eso es lo que permite
// distinguir lo LOCAL (un solo país) de lo REGIONAL (varios del mismo idioma/mercado) y lo GLOBAL
// (aparece también fuera de la región). Y como cada corrida se guarda, se ve al día siguiente qué
// temas eran noticia de un día y cuáles siguen: sin histórico no se distingue tendencia de ruido.
// ---------------------------------------------------------------------------------------------

/** Los países que se miran para poder comparar: la región del negocio y dos fuera de ella. */
export const GEOS_TENDENCIA = ['CO', 'MX', 'AR', 'BR', 'ES', 'US'];

export type TemaTendencia = { tema: string; paises: string[]; alcance: string; toca_el_rubro: boolean };

export async function leerTendencias(geos: string[] = GEOS_TENDENCIA, palabrasRubro: string[] = []) {
  const porTema = new Map<string, Set<string>>();
  const fallos: string[] = [];
  await Promise.all(geos.map(async (g) => {
    try {
      const xml = await fetch(`https://trends.google.com/trending/rss?geo=${g}`, {
        headers: { 'User-Agent': UA, Accept: 'application/rss+xml, text/xml' },
      }).then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.text(); });
      for (const m of xml.matchAll(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/g)) {
        const tema = m[1].trim();
        if (!tema || /daily search trends/i.test(tema)) continue;
        if (!porTema.has(tema)) porTema.set(tema, new Set());
        porTema.get(tema)!.add(g);
      }
    } catch (e) { fallos.push(`${g}: ${String((e as Error).message).slice(0, 24)}`); }
  }));

  const america = new Set(['CO', 'MX', 'AR', 'BR']);
  const fuera = new Set(['ES', 'US']);
  const temas: TemaTendencia[] = [...porTema.entries()].map(([tema, set]) => {
    const paises = [...set];
    const enRegion = paises.some(p => america.has(p));
    const enFuera = paises.some(p => fuera.has(p));
    const alcance = paises.length >= 3 && enFuera && enRegion ? 'global o de varios mercados'
      : paises.length >= 2 && enRegion ? 'regional (varios países de la región)'
        : 'local (un solo país)';
    const t = tema.toLowerCase();
    return { tema, paises, alcance, toca_el_rubro: palabrasRubro.some(p => p.length > 3 && t.includes(p)) };
  }).sort((a, b) => b.paises.length - a.paises.length || a.tema.localeCompare(b.tema));

  return { temas, geos, fallos };
}

/**
 * EL FORMATO RECOMENDADO POR PLAZA (Nova). No es gusto: es el molde que más se repite entre las piezas
 * que el mercado sostiene, con sus días sumados de estar activo y los anunciantes que lo usan. Iris
 * construye el prompt sobre esto, y lo cita en su traza: así el prompt no sale con "un formato", sale
 * con el formato que el mercado ya premió en esa plaza.
 */
export function recomendarFormatos(piezas: any[], plazas: any[]) {
  return (plazas ?? []).map((pl: any) => {
    const esVideo = /video/i.test(String(pl.formato || ''));
    const candidatas = (piezas ?? []).filter(p => (esVideo ? /video/i.test(String(p.tipo || '')) : /imagen/i.test(String(p.tipo || ''))));
    const porMolde = new Map<string, { n: number; dias: number; anunciantes: Set<string> }>();
    for (const p of candidatas) {
      const k = [p.tipo, p.formato, p.estilo].filter(Boolean).join(' · ');
      if (!k) continue;
      const cur = porMolde.get(k) || { n: 0, dias: 0, anunciantes: new Set<string>() };
      cur.n++; cur.dias += Number(p.dias) || 0; cur.anunciantes.add(String(p.anunciante || ''));
      porMolde.set(k, cur);
    }
    const [molde, d] = [...porMolde.entries()].sort((a, b) => b[1].n - a[1].n || b[1].dias - a[1].dias)[0]
      || ['', { n: 0, dias: 0, anunciantes: new Set<string>() }];
    return {
      plaza: pl.plaza,
      tipo: esVideo ? 'video' : 'imagen',
      formato_recomendado: molde || String(pl.formato || ''),
      piezas_que_lo_sostienen: d.n,
      anunciantes_que_lo_repiten: [...d.anunciantes],
      dias_sostenidos: d.dias,
      por_que: molde
        ? `es el molde que el mercado sostiene en esta plaza: ${d.n} ${d.n === 1 ? 'pieza' : 'piezas'} de ${[...d.anunciantes].join(', ')} y ${d.dias} días sumados de estar activas`
        : 'no hay piezas medidas en esta plaza: se usa el formato que el informe describe para ella',
    };
  });
}

export type MapaReal =
  | { ok: true; ciudad: string; pais: string; lugares: number; conNombre: number; nombres: string[]; zonas: { z: string; n: number }[]; oficio: string; url: string; caja: string; porNombre: boolean }
  // Cuando lo que falla es el listado de negocios, la ciudad y el PAÍS igual se devuelven: son dos
  // lecturas distintas y el país es lo que deja priorizar lo que le sirve al negocio.
  | { ok: false; falta: string; pais?: string; ciudad?: string };

/**
 * EL MAPA REAL DEL MERCADO (Lux). Ubica la ciudad con Nominatim y le pide a Overpass todos los negocios
 * del rubro dentro de su caja. Devuelve el conteo, los nombres y las zonas donde se concentra. Nada de
 * esto es estimado: es lo que OpenStreetMap tiene cargado hoy, y se guarda la consulta exacta.
 */
export async function leerMapaReal(rubro: string, zona: string): Promise<MapaReal> {
  if (!String(zona || '').trim()) return { ok: false, falta: 'falta la ciudad o zona del negocio (se carga en Primeros pasos)' };

  let caja = '';
  let ciudad = zona;
  let pais = '';
  try {
    let geo: any = null;
    for (let intento = 0; intento < 2 && !geo; intento++) {
      if (intento) await new Promise(r => setTimeout(r, 2500));
      try {
        geo = await pedirJson(`https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&q=${encodeURIComponent(zona)}`, 8000);
      } catch { geo = null; }
    }
    const bb = Array.isArray(geo) && geo[0]?.boundingbox;
    if (bb && bb.length === 4) {
      // Nominatim devuelve [sur, norte, oeste, este]; Overpass quiere (sur,oeste,norte,este).
      caja = `${bb[0]},${bb[2]},${bb[1]},${bb[3]}`;
      ciudad = String(geo[0].display_name || zona).split(',')[0].trim() || zona;
      // El país del negocio, en código de dos letras: es lo que después deja priorizar lo que le sirve.
      pais = String(geo[0]?.address?.country_code || '').toUpperCase();
    }
  } catch { /* si no ubica la ciudad, se dice abajo: no se estima un mercado sin caja */ }

  if (!caja) return { ok: false, falta: `no se pudo ubicar «${zona}» en el mapa: sin ciudad no se cuenta el mercado`, pais };

  const mapa = filtrosDeRubro(rubro || '');
  const porNombre = mapa.filtros.length === 0;
  const palabra = (String(rubro || '').split(' ')[0] || '').replace(/[^a-záéíóúñ]/gi, '').toLowerCase();
  if (porNombre && palabra.length < 3) {
    return { ok: false, falta: 'no se sabe qué buscar en el mapa: falta el rubro del negocio y su descripción (Primeros pasos)', pais, ciudad };
  }
  const clausulas = (porNombre ? [`node["name"~"${palabra}",i]`, `way["name"~"${palabra}",i]`] : mapa.filtros)
    .map(f => `${f}(${caja});`).join('\n  ');
  const q = `[out:json][timeout:25];\n(\n  ${clausulas}\n);\nout center tags;`;
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`;

  // Overpass se satura en las horas pico y devuelve 504: un segundo intento con pausa resuelve casi
  // siempre. Si tampoco, el agente lo dice con la causa exacta y la corrida sigue con los demás.
  let ultimoError = '';
  for (let intento = 0; intento < 2; intento++) {
    try {
      if (intento) await new Promise(r => setTimeout(r, 1500));
      const datos = await pedirJson(url, 20000);
      const els = (datos?.elements ?? []) as any[];
      const conNombre = els.filter(e => (e.tags || {}).name);
      const nombres = [...new Set(conNombre.map(e => String(e.tags.name).trim()))];
      const cuenta = new Map<string, number>();
      for (const e of conNombre) {
        const z = String(e.tags['addr:suburb'] || e.tags['addr:city'] || e.tags['addr:neighbourhood'] || '(sin zona)');
        cuenta.set(z, (cuenta.get(z) || 0) + 1);
      }
      return {
        ok: true, ciudad, pais, lugares: els.length, conNombre: nombres.length, nombres,
        zonas: [...cuenta.entries()].map(([z, n]) => ({ z, n })).sort((a, b) => b.n - a.n).slice(0, 6),
        oficio: mapa.oficio || `negocios que se llaman «${rubro}»`,
        url, caja: `(${caja})`, porNombre,
      };
    } catch (e) {
      ultimoError = String((e as Error).message || e).slice(0, 90);
    }
  }
  return { ok: false, falta: `OpenStreetMap no respondió en dos intentos (${ultimoError}): se reintenta en la próxima corrida`, pais, ciudad };
}

export type Informe = {
  rubro: string; ciudad: string; origen: string; generado_at: string; fuente: string;
  porque_aplica: string; informe: Record<string, any>;
} | null;

/**
 * EL INFORME DE PIEZAS VIVAS ya corrido para este negocio, o el de su rubro y ciudad. Es la lectura real
 * de la Ad Library pública de Meta (los días que lleva activo cada anuncio, su copy, su botón y su
 * paleta). Si no existe, los agentes NO simulan esa lectura: dicen que falta la corrida.
 */
export async function informeDe(db: Pool, ctx: Contexto): Promise<Informe> {
  const campos = 'rubro, ciudad, origen, generado_at, fuente, payload';
  const propio = await db.query(
    `SELECT ${campos} FROM mercado_informes WHERE business_id = $1 ORDER BY generado_at DESC LIMIT 1`, [ctx.businessId]);
  if (propio.rows[0]) return { ...propio.rows[0], informe: propio.rows[0].payload, porque_aplica: 'informe medido para este negocio' };

  const delRubro = await db.query(
    `SELECT ${campos}, (SELECT k FROM unnest(claves) AS k WHERE $2 LIKE '%' || k || '%' ORDER BY length(k) DESC LIMIT 1) AS clave
       FROM mercado_informes
      WHERE business_id IS NULL AND $1 <> '' AND $1 ILIKE '%' || ciudad || '%'
        AND EXISTS (SELECT 1 FROM unnest(claves) AS k WHERE $2 LIKE '%' || k || '%')
      ORDER BY generado_at DESC LIMIT 1`,
    [String(ctx.zona || ''), queHace(ctx)]);
  const f = delRubro.rows[0];
  return f ? { ...f, informe: f.payload, porque_aplica: `su negocio coincide con el rubro «${f.clave}» y su zona con ${f.ciudad}` } : null;
}

/** Los precios que aparecen ESCRITOS en el informe del mercado, del más alto al más bajo. */
function preciosDelInforme(inf: Informe): string[] {
  if (!inf) return [];
  const hallados = [...JSON.stringify(inf?.informe ?? {}).matchAll(/\$[0-9][0-9.,]{2,}/g)]
    .map(m => m[0].replace(/[.,;:]+$/, ''));
  const unicos = [...new Set(hallados)].sort((a, b) => Number(b.replace(/[^0-9]/g, '')) - Number(a.replace(/[^0-9]/g, '')));
  return unicos.slice(0, 6);
}

/** Las piezas vivas del informe, ordenadas por lo que más aguanta (los días son el filtro de calidad). */
function piezasVivas(inf: Informe): any[] {
  const p = (inf?.informe?.piezas ?? []) as any[];
  return [...p].sort((a, b) => (Number(b.dias) || 0) - (Number(a.dias) || 0));
}

/** Corre la investigación completa: cada agente trabaja con su fuente real y devuelve lo que midió. */
/**
 * Una corrida del motor. Con `ronda` en true escribe una RONDA: cinco piezas distintas —cada una con su
 * ángulo y su formato— y las prueba todas, en vez de una sola pieza.
 */
export async function correrInvestigacion(db: Pool, ctx: Contexto, motivo = 'investigacion', ronda = false) {
  const mapa = await leerMapaReal(ctx.rubro, ctx.zona);
  const inf = await informeDe(db, ctx);
  const piezas = piezasVivas(inf);
  const patron = (inf?.informe?.patron ?? []) as { k: string; v: string; s?: string }[];
  const huecos = (inf?.informe?.huecos ?? []) as any[];
  const creadoras = (inf?.informe?.creadoras ?? []) as any[];
  const saturacion = (inf?.informe?.saturacion ?? []) as string[];
  /** La analítica visual del mercado: colores, tipografía, encuadre y qué pega en cada plaza. */
  const av = (inf?.informe?.analitica_visual ?? null) as any;
  /** EL FORMATO QUE NOVA RECOMIENDA POR PLAZA: lo que Iris usa para armar el prompt. */
  const formatosRecomendados = recomendarFormatos(piezas, av?.por_plaza ?? []);

  const corrida = await db.query(
    `INSERT INTO corridas (business_id, motivo, estado, creditos) VALUES ($1, $2, 'terminada', 0)
     RETURNING id, empezada_at`,
    [ctx.businessId, motivo],
  );
  const corridaId = corrida.rows[0].id;
  const tareas: { agente: string; que: string; resultado: Record<string, unknown>; orden: number }[] = [];

  // ---------------- VERA · ENTENDER EL NEGOCIO (y va primero) ----------------
  // Lee lo que el negocio entregó —su descripción, sus enlaces y sus archivos— y deduce qué es: el rubro,
  // si vende en una ciudad, en un país o en varias jurisdicciones, qué ofrece y por qué canales. Lo que
  // deduce se usa en el resto de la corrida: si el perfil no tenía el rubro, queda cargado acá.
  const links: string[] = await (async () => {
    try {
      const o = await db.query('SELECT datos FROM onboarding WHERE business_id = $1', [ctx.businessId]);
      const v = (o.rows[0]?.datos as Record<string, unknown>)?.['negocio_links'];
      const normalizar = (u: string) => (/^https?:\/\//i.test(u) ? u : (/^[\w.-]+\.[a-z]{2,}/i.test(u) ? `https://${u}` : ''));
      if (Array.isArray(v)) return v.map(String).map(normalizar).filter(Boolean).slice(0, 6);
      return String(v || '').split(/[\s,;]+/).map(normalizar).filter(Boolean).slice(0, 6);
    } catch { return []; }
  })();

  const paginas: { url: string; titulo: string; descripcion: string; texto: string; ok: boolean; nota: string }[] = [];
  const fuentesWeb: { tipo: string; nombre: string; leido: boolean; nota: string }[] = [];
  const leidas = await Promise.all(links.map(async url => ({ url, ...(await leerPagina(url)) })));
  for (const p of leidas) {
    paginas.push(p);
    fuentesWeb.push({ tipo: 'página', nombre: p.url.replace(/^https?:\/\//, '').slice(0, 60), leido: p.ok, nota: p.nota });
  }
  const archivosLeidos = await leerArchivos(db, ctx.businessId);
  const leido: NegocioLeido = deducirNegocio({
    nombre: ctx.nombre, descripcion: ctx.descripcion, rubroDeclarado: ctx.rubro, zona: ctx.zona,
    material: archivosLeidos.texto, paginas,
  });
  leido.fuentes = [...fuentesWeb, ...archivosLeidos.fuentes];

  // LAS PALABRAS CLAVE Y LA CATEGORÍA, BUSCADAS AFUERA. No alcanza con lo que el negocio sube: hay que
  // salir al mercado. Con las palabras del material (tokenización, rwa, web3…) se busca qué es esa
  // categoría y quiénes son parecidos, en fuentes abiertas —la enciclopedia y Wikidata—, que no piden
  // clave ni permiso. Con eso, buscar el rubro y la competencia deja de ser adivinanza.
  const claves = palabrasClave([ctx.nombre, ctx.descripcion, leido.queHace, leido.rubro,
    archivosLeidos.texto.slice(0, 4000), ...paginas.map(p => `${p.titulo} ${p.descripcion} ${p.texto}`)].join(' '), 12);
  // Se prueban los términos del MÁS específico al más corto, y se acepta el primero que dé una categoría
  // QUE TENGA QUE VER con el negocio. Un término corto y ambiguo («rwa») devuelve cualquier cosa.
  const candidatos = claves.filter(c => c.de === 'el vocabulario del rubro').map(c => c.palabra)
    .sort((a, b) => b.split(' ').length - a.split(' ').length || b.length - a.length).slice(0, 8);
  let categoria: Awaited<ReturnType<typeof leerWikipedia>> | null = null;
  let termino = '';
  let similares: { nombre: string; que: string; url: string }[] = [];
  for (const t of candidatos) {
    const cat = await leerWikipedia(t);
    if (!cat.ok || !categoriaPertinente(cat.resumen, t)) continue;
    const sims = (await buscarSimilares(t, 8)).filter(s => similarPertinente(s.que)).slice(0, 6);
    categoria = cat; termino = t; similares = sims;
    if (sims.length) break;   // con categoría clara y quiénes son similares, ya está
  }

  // Lo que descubrió se usa YA en esta corrida: los demás agentes leen de ctx.
  if (!ctx.rubro.trim() && leido.rubro) ctx.rubro = leido.rubro;
  if (leido.alcance !== 'sin_determinar') {
    ctx.zona = leido.alcance === 'global' ? 'negocio global (varias jurisdicciones)' : (leido.lugares[0] || ctx.zona);
  }

  // Y si el perfil no tenía el rubro, queda cargado: la próxima corrida ya arranca sabiéndolo.
  let perfilActualizado = false;
  try {
    const actual = await db.query('SELECT rubro FROM businesses WHERE id = $1', [ctx.businessId]);
    if (leido.rubro && !String(actual.rows[0]?.rubro || '').trim()) {
      await db.query('UPDATE businesses SET rubro = $2 WHERE id = $1', [ctx.businessId, leido.rubro]);
      perfilActualizado = true;
    }
  } catch { /* si no se puede escribir, la corrida sigue con lo leído */ }

  tareas.push({
    agente: 'vera', orden: 0,
    que: leido.rubro
      ? `Entendió el negocio: «${leido.rubro}» — ${leido.alcance === 'sin_determinar' ? 'todavía sin saber dónde vende' : `alcance ${leido.alcance}`}`
      : 'No pudo determinar el rubro con el material entregado y lo dice',
    resultado: {
      fuente_tipo: 'la descripción del negocio, sus enlaces (se piden y se leen) y sus archivos (los PDF de texto se descomprimen y se leen)',
      rubro_deducido: leido.rubro || 'sin determinar',
      alcance: leido.alcance,
      lugares_que_nombra: leido.lugares,
      que_hace: leido.queHace,
      que_ofrece: leido.queVende,
      a_quien: leido.aQuien,
      canales: leido.canales,
      senales: leido.senales,
      fuentes_leidas: leido.fuentes,
      perfil_actualizado: perfilActualizado
        ? 'el rubro quedó cargado en su negocio con lo que se dedujo del material'
        : 'el negocio ya tenía su rubro cargado: no se tocó',
      palabras_clave: claves,
      categoria_del_negocio: categoria?.ok
        ? { termino, titulo: categoria.titulo, resumen: categoria.resumen, fuente: `${categoria.idioma}.wikipedia.org`, url: categoria.url }
        : { termino, nota: categoria?.nota || 'sin término para buscar la categoría' },
      quienes_son_similares: similares.length
        ? similares
        : 'no se encontraron organizaciones con ese nombre en Wikidata: la competencia se busca por palabra clave, país por país',
      como_lo_entendio: 'las palabras clave del material → la categoría en la enciclopedia abierta → las organizaciones con ese nombre en Wikidata → y con esas palabras se busca el mercado de cada país',
      falta: leido.falta,
      porque: 'Es el paso uno: sin entender qué es el negocio, el equipo sale a investigar sin saber qué buscar y vuelve con las manos vacías.',
      fuente: `material del negocio: ${links.length} ${links.length === 1 ? 'enlace' : 'enlaces'} y ${archivosLeidos.fuentes.length} ${archivosLeidos.fuentes.length === 1 ? 'archivo' : 'archivos'}`,
    },
  });

  // ---------------- LEX · LAS LENGUAS: en qué lengua se busca su mercado ----------------
  // El mismo negocio no se busca igual en cada plaza: el texto que se busca tiene que estar en la lengua del
  // que compra ahí. Y hay una segunda lengua que NO es la del dueño: la de la CATEGORÍA. En activos digitales
  // la categoría está escrita en inglés —el artículo de «tokenización» en español habla del análisis léxico de
  // un texto, no de tokenizar activos—, así que buscar solo con las palabras del dueño busca otra cosa.
  // De acá sale con qué palabras se busca el mercado y en qué lenguas, en qué lengua va la pieza, y qué se
  // perdió por buscar en una sola lengua. Lo que no se puede verificar, no se inventa: se dice.
  // La lengua se mide aparte: la de SUS palabras (lo que el dueño escribió y subió) y la de sus páginas. Un
  // negocio de Dubái puede tener la web en inglés y hablarle al equipo en español, y las dos cosas cuentan.
  const textoDelDueno = [ctx.nombre, ctx.descripcion, leido.queHace, (leido.queVende || []).join(' '), archivosLeidos.texto.slice(0, 4000)].join(' ');
  const textoDeSusPaginas = paginas.map(p => `${p.titulo} ${p.descripcion} ${p.texto.slice(0, 3000)}`).join(' ');
  const lenguasDelDueno = detectarLengua(textoDelDueno);
  const lenguasDeSusPaginas = detectarLengua(textoDeSusPaginas);
  const lenguaDelNegocio = lenguasDelDueno[0] ?? lenguasDeSusPaginas[0]
    ?? { codigo: 'es', nombre: 'español', marcas: 0, delata: 'por descarte: el material no traía texto suficiente para medirlo' };
  const terminosDelMaterial = claves.map((c: any) => String(c.palabra));
  // En qué lenguas está escrito el vocabulario de su categoría. Si el material nombra términos ingleses del
  // rubro, la categoría se busca así en el mundo, aunque el dueño escriba en español.
  const lenguasDeLaCategoria = Object.keys(VOCABULARIO_POR_LENGUA)
    .filter(l => VOCABULARIO_POR_LENGUA[l].some(t => terminosDelMaterial.includes(t)));

  // Las plazas donde ya se buscó, y en qué lengua están los avisos que volvieron. Se cuenta con marcas de
  // cada lengua sobre el copy leído: no es adivinanza, es lo que hay en la tabla de avisos.
  let plazas: { pais: string; avisos: number; en_espanol: number; en_ingles: number; palabras: string }[] = [];
  try {
    const r = await db.query(
      `SELECT pais, count(*)::int AS avisos,
              count(*) FILTER (WHERE lower(copy) ~ '(^|[^a-z])(el|la|los|las|para|usted|nuestro|con|desde|entre)([^a-z]|$)')::int AS en_espanol,
              count(*) FILTER (WHERE lower(copy) ~ '(^|[^a-z])(the|you|your|with|for|and|get|our|more)([^a-z]|$)')::int AS en_ingles,
              string_agg(DISTINCT palabra, ' · ') AS palabras
         FROM anuncios_leidos WHERE business_id = $1 GROUP BY pais ORDER BY count(*) DESC LIMIT 12`, [ctx.businessId]);
    plazas = r.rows as any[];
  } catch { /* primera corrida: todavía no hay ninguna lectura de avisos */ }
  const avisosTotales = plazas.reduce((s, p) => s + Number(p.avisos || 0), 0);
  const avisosEnIngles = plazas.reduce((s, p) => s + Number(p.en_ingles || 0), 0);
  const avisosEnEspanol = plazas.reduce((s, p) => s + Number(p.en_espanol || 0), 0);

  // Las lenguas con las que se busca: la del negocio, la de su categoría, y la de cada plaza donde no se habla
  // ninguna de las dos. La de la plaza se suma solo si hay con qué NOMBRAR la categoría en esa lengua: la
  // enciclopedia abierta da el término y su artículo; cuando no lo tiene, se dice que se busca en la lengua de
  // la categoría en vez de inventar una traducción.
  const lenguasDeBusqueda: { codigo: string; nombre: string; para_que: string }[] = [];
  const sumarLengua = (codigo: string, para_que: string) => {
    if (!codigo || lenguasDeBusqueda.some(l => l.codigo === codigo)) return;
    lenguasDeBusqueda.push({ codigo, nombre: nombreDeLengua(codigo), para_que });
  };
  sumarLengua(lenguaDelNegocio.codigo, 'es la lengua de su material y de su primer mercado');
  if (lenguasDeSusPaginas[0]) {
    sumarLengua(lenguasDeSusPaginas[0].codigo, 'sus propias páginas están escritas en esa lengua: es la carta de presentación que ya usa con sus clientes');
  }
  for (const l of lenguasDeLaCategoria) {
    sumarLengua(l, l === 'en'
      ? 'su categoría está escrita en inglés: así la busca el mercado en el mundo'
      : 'aparece en el vocabulario de su categoría');
  }
  const plazasACubrir = plazas
    .map(p => ({ pais: String(p.pais), lengua: lenguaDePais(String(p.pais)) }))
    .filter(p => p.lengua && !lenguasDeBusqueda.some(l => l.codigo === p.lengua));

  // Las palabras de búsqueda por lengua: el vocabulario de la categoría en esa lengua, más los términos que el
  // propio material del negocio trae en ella. El vocabulario viene del catálogo del sistema, no de un traductor.
  const palabrasPorLengua: Record<string, string[]> = {};
  for (const l of lenguasDeBusqueda) {
    const delCatalogo = VOCABULARIO_POR_LENGUA[l.codigo] ?? [];
    const delMaterial = l.codigo === lenguaDelNegocio.codigo ? terminosDelMaterial : [];
    palabrasPorLengua[l.codigo] = [...new Set([...delCatalogo, ...delMaterial])].slice(0, 10);
  }
  // Y la lengua de la plaza, con el término de la categoría en esa lengua si la enciclopedia lo tiene.
  const equivalencias: { pais: string; lengua: string; termino: string; titulo: string; url: string }[] = [];
  const plazasSinTermino: { pais: string; lengua: string }[] = [];
  if (plazasACubrir.length) {
    const anclas = (palabrasPorLengua.en ?? []).slice(0, 3);
    await Promise.race([
      Promise.all(plazasACubrir.slice(0, 2).map(async (p) => {
        const hallados: { idioma: string; titulo: string; url: string }[] = [];
        for (const ancla of anclas) {
          const eq = await terminoEnOtrasLenguas(ancla, [p.lengua]);
          for (const e of eq) hallados.push({ idioma: e.idioma, titulo: e.titulo, url: e.url });
        }
        if (hallados.length) {
          sumarLengua(p.lengua, `en ${p.pais} el idioma de la plaza es el ${nombreDeLengua(p.lengua)}: no se buscó ninguna palabra en esa lengua y el término de la categoría lo da la enciclopedia abierta`);
          palabrasPorLengua[p.lengua] = [...new Set([...hallados.map(h => h.titulo), ...anclas.slice(0, 2)])];
          for (const h of hallados) equivalencias.push({ pais: p.pais, lengua: p.lengua, termino: anclas[0], titulo: h.titulo, url: h.url });
        } else {
          plazasSinTermino.push(p);
        }
      })),
      new Promise(res => setTimeout(res, 8000)),
    ]);
  }

  // La lengua de la pieza: la del que compra, no la del dueño. Se mide con los avisos ya leídos en sus plazas.
  const lenguaDeLaPieza = (leido.alcance === 'global' && avisosEnIngles > avisosEnEspanol)
    ? { codigo: 'en', nombre: 'inglés', tambien: lenguaDelNegocio.nombre,
      por_que: `en su mercado el aviso se escribe en inglés: ${avisosEnIngles} de ${avisosTotales} avisos leídos están en inglés contra ${avisosEnEspanol} en español, y su categoría está escrita en inglés` }
    : { codigo: lenguaDelNegocio.codigo, nombre: lenguaDelNegocio.nombre, tambien: '',
      por_que: `su material y los avisos de su mercado están en ${lenguaDelNegocio.nombre}` };

  tareas.push({
    agente: 'lex', orden: 1,
    que: lenguasDeBusqueda.length > 1
      ? `Reconoció las lenguas de su mercado: se busca en ${lenguasDeBusqueda.map(l => l.nombre).join(', ')}`
      : `Reconoció la lengua de su mercado: se busca en ${lenguasDeBusqueda[0]?.nombre || lenguaDelNegocio.nombre}`,
    resultado: {
      fuente_tipo: 'la lengua del material del negocio (medida con las palabras de cada lengua), el vocabulario de su categoría en cada lengua, la enciclopedia abierta (con el artículo) y los avisos que el trabajador ya leyó',
      lengua_del_negocio: {
        lengua: lenguaDelNegocio.nombre, codigo: lenguaDelNegocio.codigo,
        como_se_leyo: lenguaDelNegocio.delata,
        otras_que_aparecen: lenguasDelDueno.slice(1).map(l => `${l.nombre} (${l.delata})`),
        de_donde: 'lo que el dueño escribió y subió: su descripción, lo que vende y sus archivos',
      },
      lengua_de_sus_paginas: lenguasDeSusPaginas.length
        ? `sus páginas están en ${lenguasDeSusPaginas.map(l => `${l.nombre} (${l.delata})`).join(' y ')}`
        : 'no se pudo medir la lengua de sus páginas: no se leyó ninguna',
      lengua_de_la_categoria: lenguasDeLaCategoria.length
        ? `se busca en ${lenguasDeLaCategoria.map(l => nombreDeLengua(l)).join(' y ')}: son las lenguas en las que su material nombra la categoría (${terminosDelMaterial.filter(t => lenguasDeLaCategoria.some(l => VOCABULARIO_POR_LENGUA[l].includes(t))).join(', ')})`
        : 'todavía no se reconoció el vocabulario de su categoría en el material',
      lenguas_de_busqueda: lenguasDeBusqueda,
      palabras_por_lengua: palabrasPorLengua,
      termino_de_la_categoria_en_la_lengua_de_la_plaza: equivalencias.length
        ? equivalencias.map(e => `${e.pais}: «${e.titulo}» por «${e.termino}» — ${e.url}`)
        : 'la categoría no está escrita en la lengua de sus plazas: se busca con el término inglés, que es el del mercado',
      plan_por_plaza: plazas.map(p => ({
        plaza: p.pais,
        avisos_leidos: p.avisos,
        con_que_palabras_se_busco: p.palabras,
        // El idioma del PAÍS, no una medición de cada comprador: en Emiratos el idioma del país es el árabe
        // y los avisos vuelven en inglés, y las dos cosas se dicen juntas para que nadie lea de más.
        lengua_de_la_plaza: lenguaDePais(String(p.pais)) ? nombreDeLengua(lenguaDePais(String(p.pais))) : 'no se pudo determinar y no se supone',
        en_que_lengua_estan_los_avisos: Number(p.en_ingles) > Number(p.en_espanol)
          ? `inglés (${p.en_ingles} de ${p.avisos})`
          : Number(p.en_espanol) > Number(p.en_ingles)
            ? `español (${p.en_espanol} de ${p.avisos})`
            : 'no se distingue: no hay marcas suficientes en los avisos',
      })),
      la_pieza_en_que_lengua: lenguaDeLaPieza,
      lo_que_se_pierde: [
        plazasSinTermino.length
          ? `en ${plazasSinTermino.map(p => p.pais).join(' y ')} el idioma de la plaza es el ${plazasSinTermino.map(p => nombreDeLengua(p.lengua)).join(' y ')} y no hay término de la categoría en esa lengua: se busca en inglés`
          : '',
        lenguasDeBusqueda.some(l => l.codigo === 'en') && !lenguasDeBusqueda.some(l => l.codigo === 'es')
          ? '' : 'la categoría del negocio, en su lengua, trae otro sentido: en la enciclopedia en español «tokenización» es el análisis léxico de un texto, no la tokenización de activos',
        avisosTotales
          ? `de ${avisosTotales} avisos leídos, ${avisosEnIngles} están en inglés y ${avisosEnEspanol} en español: buscar en una sola lengua deja afuera al resto del mercado`
          : '',
      ].filter(Boolean),
      falta: plazas.length ? [] : ['la primera lectura de avisos: sin avisos no se puede medir en qué lengua está escribiendo su mercado'],
      porque: 'El texto que se busca tiene que estar en la lengua del que compra. Buscar la categoría en la lengua del dueño trae otro mercado, y buscar en una sola lengua deja afuera plazas enteras: por eso la lengua se decide antes de leer, no después.',
      fuente: 'el material del negocio + la enciclopedia abierta + los avisos leídos por el trabajador',
    },
  });

  // ---------------- LUX · el mercado (OpenStreetMap de verdad + el informe de piezas vivas) ----------------
  if (leido.alcance === 'global') {
    tareas.push({
      agente: 'lux', orden: 1,
      que: 'No contó locales en el mapa: su negocio no tiene una plaza fija',
      resultado: {
        fuente_tipo: 'la lectura del negocio (Vera)',
        porque: 'Es un negocio de varias jurisdicciones: contar cuántos locales hay en una ciudad no dice nada de su mercado. Su mercado se lee por país, con los anuncios que corren en cada uno.',
        sin_fuente: 'el conteo de locales del mapa no aplica a un negocio global',
        fuente: 'Vera · lectura del negocio',
      },
    });
  } else if (mapa.ok) {
    tareas.push({
      agente: 'lux', orden: 1,
      que: `Contó el mercado en el mapa: ${mapa.conNombre} ${mapa.oficio} con nombre en ${mapa.ciudad}`,
      resultado: {
        fuente_tipo: 'OpenStreetMap (Overpass + Nominatim), consultado ahora mismo',
        ciudad: mapa.ciudad, caja: mapa.caja,
        lugares_mapeados: mapa.lugares, con_nombre: mapa.conNombre, nombres_unicos: mapa.nombres.length,
        busqueda: mapa.porNombre ? 'por la palabra del rubro en el nombre del negocio (el rubro no tiene filtro de oficio conocido)' : 'por el oficio en el mapa',
        ejemplos: mapa.nombres.slice(0, 12),
        zonas: mapa.zonas,
        url_consulta: mapa.url,
        fuente: `OpenStreetMap · Overpass · ${mapa.url}`,
      },
    });
  } else {
    tareas.push({
      agente: 'lux', orden: 1, que: 'No pudo leer el mapa del mercado y lo dice',
      resultado: { sin_fuente: mapa.falta, fuente: 'sin fuente: el mapa no respondió' },
    });
  }

  const pauta = piezas.length
    ? [...new Set(piezas.map(p => String(p.anunciante)))].map(a => ({
      anunciante: a, dias: Math.max(...piezas.filter(p => p.anunciante === a).map(p => Number(p.dias) || 0)),
    })).sort((a, b) => b.dias - a.dias)
    : [];
  tareas.push({
    agente: 'lux', orden: 2,
    que: piezas.length
      ? `Leyó ${piezas.length} piezas vivas de su rubro: el más sostenido lleva ${pauta[0]?.dias ?? 0} días activo`
      : 'No hay lectura de piezas vivas de su rubro todavía y lo dice',
    resultado: piezas.length ? {
      fuente_tipo: 'Ad Library pública de Meta (informe de mercado guardado)',
      piezas_leidas: piezas.length,
      anunciantes: pauta,
      el_mas_sostenido_dias: pauta[0]?.dias ?? 0,
      el_mas_sostenido: pauta[0]?.anunciante ?? '',
      porque: 'Un anuncio activo desde hace meses es un anuncio que rinde: nadie mantiene un perdedor. El tiempo es la única señal pública de calidad.',
      informe_generado: inf?.generado_at || '',
      fuente: inf?.fuente || '',
    } : {
      sin_fuente: 'falta la corrida de piezas vivas de este rubro y esta ciudad (la que lee los anuncios activos y cuánto llevan)',
      fuente: 'sin fuente: la corrida no se ha hecho',
    },
  });

  // ---------------- LUX 2 · LAS PIEZAS VIVAS LEÍDAS POR EL TRABAJADOR ----------------
  // La tabla de anuncios leídos tiene lo que la Biblioteca de Anuncios entregó para ESTE negocio: sus
  // palabras clave, sus países, los anunciantes y desde cuándo corre cada anuncio. Hasta ahora nadie la
  // leía: el trabajador escribía y ningún agente pasaba por ahí.
  let lectura: { fichas: number; distintos: number; paises: number; anunciantes: number; ejemplos: string[]; mas_viejo: string; dias: number } | null = null;
  try {
    const r = await db.query(
      `SELECT count(*)::int AS fichas, count(DISTINCT pais)::int AS paises,
              count(DISTINCT id_anuncio)::int AS distintos,
              count(DISTINCT anunciante)::int AS anunciantes,
              (array_agg(DISTINCT anunciante))[1:8] AS ejemplos,
              -- La fecha más vieja, saltando las fichas que no traen fecha: el min() de un texto con
              -- vacíos devolvía «» y los días salían en -1. Se ordena por la fecha de verdad, no por el
              -- alfabeto (los meses en texto no están en orden alfabético).
              min(fecha_inicio) FILTER (WHERE fecha_inicio <> '') AS mas_viejo
         FROM anuncios_leidos WHERE business_id = $1`, [ctx.businessId]);
    const f = r.rows[0] as Record<string, unknown> | undefined;
    if (Number(f?.fichas) > 0) {
      const meses: Record<string, number> = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
      const m = String(f?.mas_viejo || '').match(/([A-Za-z]+) (\d+), (\d{4})/);
      const dias = m ? Math.round((Date.now() - new Date(Number(m[3]), meses[m[1]] - 1, Number(m[2])).getTime()) / 86400000) : -1;
      lectura = {
        fichas: Number(f?.fichas), distintos: Number(f?.distintos), paises: Number(f?.paises), anunciantes: Number(f?.anunciantes),
        ejemplos: (f?.ejemplos as string[]) ?? [], mas_viejo: String(f?.mas_viejo || ''), dias,
      };
    }
  } catch { /* sin tabla o sin filas: se dice abajo, no se inventa */ }

  tareas.push({
    agente: 'lux', orden: 2,
    que: lectura
      ? `Leyó su mercado: ${lectura.fichas.toLocaleString('es-CO')} fichas de ${lectura.distintos.toLocaleString('es-CO')} anuncios distintos en ${lectura.paises} ${lectura.paises === 1 ? 'país' : 'países'}: el más viejo lleva ${lectura.dias} días corriendo`
      : 'No hay anuncios leídos de su mercado todavía',
    resultado: lectura ? {
      fuente_tipo: 'la Biblioteca de Anuncios de Meta, leída por el trabajador del sistema',
      fichas_leidas: lectura.fichas,
      anuncios_activos: lectura.distintos,
      paises_leidos: lectura.paises,
      anunciantes_distintos: lectura.anunciantes,
      ejemplos_de_anunciantes: lectura.ejemplos,
      el_mas_viejo: `${lectura.mas_viejo} (${lectura.dias} días corriendo)`,
      porque: 'Son anuncios activos hoy en su categoría, con su fecha de inicio: los que llevan meses corriendo son los que rinden.',
      fuente: 'Biblioteca de Anuncios de Meta · lectura del trabajador',
    } : {
      sin_fuente: 'falta que el trabajador lea la Biblioteca de Anuncios para este negocio (la corrida lo lanza sola)',
      fuente: 'sin fuente',
    },
  });

  // ---------------- EL CEREBRO DEL MERCADO · LO COMPARABLE, EL RUIDO, Y SI LA CATEGORÍA ES NUEVA ----------------
  // Buscar por palabra clave trae al mundo entero (Alibaba, iHerb): de todos los anuncios leídos, no todos
  // son del mercado del negocio. Acá se cruzan con las palabras del propio negocio y se separan: lo
  // COMPARABLE de un lado, el RUIDO del otro. Y si después de separar no queda nadie comparable, quiere
  // decir que esa categoría todavía no existe en ese mercado: hay que entenderlo y decirlo así, porque no
  // es falta de datos — es un negocio que va primero, y eso se ataca derecho desde el creativo.
  let mercado: { comparables: any[]; ruido: number; total: number; categoria_nueva: boolean; palabras: string[]; terminos: string[] } | null = null;
  let anunciosDeFormacion = 0;
  // El informe armado con la lectura del mercado: de acá sale el hueco que ataca la pieza.
  let armadoDelInforme: InformeDelMercado | null = null;
  try {
    const palabras = [...new Set(`${ctx.rubro} ${ctx.descripcion} ${leido.rubro}`.toLowerCase()
      .split(/[^a-záéíóúñ0-9]+/).filter(w => w.length >= 5))].slice(0, 12);
    // Y LOS TÉRMINOS DE LA CATEGORÍA, EN SU LENGUA (Lex). Un competidor que se anuncia en inglés con «asset
    // tokenization» ES comparable, y con las palabras del dueño —en español— quedaba contado como ruido: la
    // lista de palabras decidía quién es del mercado, y estaba en una sola lengua. Los términos van con
    // límites de palabra, porque «rwa» tiene tres letras y suelto coincide con cualquier cosa.
    const escapar = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const terminos = [...new Set(Object.values(palabrasPorLengua).flat()
      .map(t => String(t).toLowerCase().replace(/\s+/g, ' ').trim()).filter(t => t.length >= 3))];
    const reTerminos = terminos.map(t => new RegExp(`(^|[^a-z0-9áéíóúñ])${escapar(t)}([^a-z0-9áéíóúñ]|$)`));
    // UN ANUNCIO, UNA VEZ, CON SU MEJOR TEXTO. La Biblioteca devuelve la misma pieza muchas veces —una por
    // palabra buscada y por país— y de una fila a otra cambia lo que trae. Elegir «la primera» o «la más
    // larga» traía el texto de sistema o una coletilla, no el anuncio: se probó y el mercado salía con
    // escuelas, gestores de contraseñas y fábricas que no compiten. Acá se agrupa por anuncio y, de todas
    // sus filas, se queda el texto que de verdad habla de la categoría (el que más señales nombra).
    const r = await db.query(
      `SELECT id_anuncio, anunciante, copy, cta, pais, fecha_inicio
         FROM anuncios_leidos
        WHERE business_id = $1 AND id_anuncio <> ''
          -- Solo las fechas que se pueden leer: una fecha rara rompía el ordenamiento y toda la lectura.
          AND fecha_inicio ~ '^[A-Z][a-z]{2} [0-9]{1,2}, [0-9]{4}$'`, [ctx.businessId]);
    // LA PALABRA SE BUSCA ENTERA, también las del propio negocio. Con `includes`, «rwa» hacía comparable a
    // «Raffles World Academy» y «token» a cualquiera que dijera «tokens»: con eso, medio mercado era falso.
    const entera = (w: string) => new RegExp(`(?<![\\p{L}\\p{N}])${escapar(w)}(?![\\p{L}\\p{N}])`, 'iu');
    const rePalabras = palabras.map(entera);
    // QUIÉN COMPITE LO DECIDE LA CATEGORÍA, NO UNA PALABRA SUELTA DEL DUEÑO. Las palabras del negocio salen de
    // su descripción y del rótulo de su industria, y ahí entran «servicios», «digitales», «security», «token»:
    // buscando con eso entraban como competidores un gestor de contraseñas (por «security»), un medidor de luz
    // prepago (por «token») y una escuela (por «tokenización»). Un anuncio compite si su texto nombra un
    // TÉRMINO DE LA CATEGORÍA (el vocabulario de Lex, en todas las lenguas); las palabras del dueño solo ordenan.
    const señales = (texto: string) => {
      const t = reTerminos.filter(re => re.test(texto)).length;
      const p2 = rePalabras.filter(re => re.test(texto)).length;
      return t * 2 + p2;
    };
    const esDeCategoria = (texto: string) => reTerminos.some(re => re.test(texto));
    // Un curso o una maestría sobre el tema no compite con el servicio: vende formación. Se aparta, y se dice.
    // Un curso, una escuela o una maestría sobre el tema no compite con el servicio: vende formación.
    const ES_FORMACION = /maestr[ií]a|posgrado|diplomatura|bootcamp|curso de|cursos de|aprend[eé] a|certificaci[oó]n|academia|clases de|school|escuela|colegio|universidad|instituto|educaci[oó]n/i;
    // La Biblioteca trae basura además de anuncios: textos del sistema y avisos sin texto.
    const ES_SISTEMA = /ads use this creative|EU transparency/i;
    const limpiaTexto = (t: any) => String(t ?? '').replace(/[\u200b-\u200d\ufeff]/g, ' ').replace(/\s+/g, ' ').trim();

    type Anuncio = { id: string; anunciante: string; copy: string; cta: string; pais: string; paises: string[]; fecha_inicio: string; señales: number };
    const porAnuncio = new Map<string, Anuncio>();
    for (const f of r.rows as any[]) {
      const id = String(f.id_anuncio);
      const texto = limpiaTexto(f.copy);
      const valido = texto.length >= 60 && !ES_SISTEMA.test(texto);
      const anun = limpiaTexto(f.anunciante);
      const pais = limpiaTexto(f.pais);
      const ya = porAnuncio.get(id);
      if (!ya) {
        porAnuncio.set(id, {
          id, anunciante: anun, copy: valido ? texto : '', cta: limpiaTexto(f.cta), pais, paises: pais ? [pais] : [],
          fecha_inicio: limpiaTexto(f.fecha_inicio), señales: valido ? señales(`${anun} ${texto}`) : -1,
        });
        continue;
      }
      if (pais && !ya.paises.includes(pais)) ya.paises.push(pais);
      if (anun && !ya.anunciante) ya.anunciante = anun;
      if (!ya.cta && f.cta) ya.cta = limpiaTexto(f.cta);
      // La fecha más vieja de sus filas: es desde cuándo corre la pieza.
      if (ya.fecha_inicio && f.fecha_inicio) {
        const aDias = (x: string) => { const m = x.match(/([A-Za-z]{3})\w*\s+(\d{1,2}),\s*(\d{4})/); return m ? Number(m[3]) * 10000 + (['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(m[1]) + 1) * 100 + Number(m[2]) : 0; };
        if (aDias(ya.fecha_inicio) && aDias(f.fecha_inicio) && aDias(f.fecha_inicio) < aDias(ya.fecha_inicio)) ya.fecha_inicio = limpiaTexto(f.fecha_inicio);
      }
      // El texto que se queda es el que más habla de la categoría; si empatan, el más largo.
      if (valido) {
        const s2 = señales(`${anun} ${texto}`);
        if (s2 > ya.señales || (s2 === ya.señales && texto.length > ya.copy.length)) { ya.copy = texto; ya.señales = s2; }
      }
    }
    const anuncios = [...porAnuncio.values()].filter(a => a.copy && a.señales > 0 && esDeCategoria(`${a.anunciante} ${a.copy}`));
    anunciosDeFormacion = anuncios.filter(a => ES_FORMACION.test(`${a.anunciante} ${a.copy}`)).length;
    const filas = anuncios;
    const comparables = anuncios.filter(a => !ES_FORMACION.test(`${a.anunciante} ${a.copy}`)).sort((a, b) => b.señales - a.señales);
    const total = porAnuncio.size;
    const ruido = total - comparables.length;
    mercado = { comparables, ruido, total, categoria_nueva: total > 0 && comparables.length === 0, palabras, terminos };
  } catch { mercado = null; }

  tareas.push({
    agente: 'lux', orden: 3,
    que: mercado
      ? (mercado.categoria_nueva
        ? `Separó el mercado: de ${mercado.total} anuncios leídos, ninguno es de su categoría — es un negocio nuevo en ese mercado`
        : `Separó el mercado: ${mercado.comparables.length} anuncios comparables y ${mercado.ruido} que no compiten, sobre ${mercado.total} anuncios distintos leídos${anunciosDeFormacion ? ` (${anunciosDeFormacion} de esos son cursos o escuelas sobre el tema: se apartan, venden formación, no el servicio)` : ''}`)
      : 'No pudo separar el mercado y lo dice',
    resultado: mercado ? {
      fuente_tipo: 'los anuncios leídos, cruzados con las palabras del propio negocio',
      comparables: mercado.comparables.slice(0, 12).map((f: any) => ({
        anunciante: f.anunciante, copy: String(f.copy || '').slice(0, 130), cta: f.cta, pais: (f.paises ?? [f.pais]).join(' · '), desde: f.fecha_inicio,
      })),
      cuantos_comparables: mercado.comparables.length,
      cuantos_son_ruido: mercado.ruido,
      categoria_nueva: mercado.categoria_nueva,
      terminos_de_la_categoria_usados: mercado.terminos,
      como_se_separo: `un anuncio compite si su texto nombra la categoría con una palabra entera —alguno de los términos de su categoría en sus lenguas (${mercado.terminos.slice(0, 10).join(', ')})— y no es un curso ni una maestría sobre el tema (eso vende formación, no el servicio). Las palabras del negocio (${mercado.palabras.join(', ')}) solo ordenan: con «security» o «token» sueltos entraban un gestor de contraseñas y un medidor prepago`,
      anuncios_de_formacion_apartados: anunciosDeFormacion,
      comparables_de_verdad: mercado.comparables.length,
      // Las palabras y los términos con los que se separó el mercado, guardados para poder auditar el umbral
      palabras_del_negocio: mercado.palabras,
      terminos_de_la_categoria: mercado.terminos,
      porque: mercado.categoria_nueva
        ? 'Nadie comparable en su mercado: la categoría todavía no existe ahí. No es falta de datos — es que este negocio va primero, y se ataca derecho desde el creativo con lo que ya identificamos.'
        : 'De la lista completa solo una parte compite con este negocio; el resto entra por la palabra clave y no sirve para comparar. Cada anuncio cuenta una vez (la Biblioteca lo devuelve repetido por palabra y por país) y la palabra se busca entera: un anuncio cuyo texto no nombra la categoría no compite.',
      fuente: 'Biblioteca de Anuncios de Meta · lectura del trabajador',
    } : { sin_fuente: 'no se pudieron cruzar los anuncios con las palabras del negocio', fuente: 'sin fuente' },
  });

  // ---------------- EL INFORME DEL MERCADO · ARMADO CON LO QUE SE LEYÓ ----------------
  // Hasta acá el motor leía el mercado de verdad —miles de anuncios activos— y NADIE escribía el informe:
  // la tabla del informe quedaba vacía y el panel decía «falta» para siempre, con el mercado ya leído. Por
  // eso el negocio veía investigación y ningún resultado. El informe se arma con esa misma lectura —quiénes
  // juegan, las piezas que aguantan, el patrón, lo saturado y el hueco— y queda guardado con su fecha.
  // Lo que no se puede saber con estas fichas (las creatividades, el precio, la demanda) se dice que falta.
  let informeDelMercado: { resumen: string; comparables: number; huecos: number } | null = null;
  if (mercado && mercado.comparables.length) {
    try {
      const paisesLeidos = (await db.query(
        `SELECT DISTINCT pais FROM anuncios_leidos WHERE business_id = $1 AND pais <> '' ORDER BY pais`,
        [ctx.businessId],
      )).rows.map((r: any) => String(r.pais));
      const armado = armarInformeDelMercadoLeido({
        comparables: mercado.comparables, total: mercado.total, ruido: mercado.ruido, paises: paisesLeidos,
        fichasLeidas: lectura?.fichas, anunciosDistintos: lectura?.distintos,
      });
      await db.query(
        `INSERT INTO mercado_informes (business_id, rubro, ciudad, claves, origen, fuente, payload)
         VALUES ($1, $2, $3, $4, 'motor', $5, $6)`,
        [ctx.businessId, leido.rubro || ctx.rubro, paisesLeidos.join(' · '), mercado.palabras,
          `Biblioteca de Anuncios de Meta, leída por el trabajador del sistema: ${mercado.total} anuncios activos en ${paisesLeidos.length} ${paisesLeidos.length === 1 ? 'país' : 'países'}`,
          aJson(armado)],
      );
      armadoDelInforme = armado;
      informeDelMercado = { resumen: armado.resumen, comparables: mercado.comparables.length, huecos: armado.huecos.length };
      tareas.push({
        agente: 'lux', orden: 4,
        que: `Armó el informe de su mercado con lo que se leyó: ${mercado.comparables.length} comparables, ${armado.jugadores.length} anunciantes, ${armado.huecos.length} huecos`,
        resultado: {
          fuente_tipo: 'los anuncios activos de su mercado, ya leídos, contados uno por uno',
          resumen: armado.resumen,
          jugadores: armado.jugadores.slice(0, 8),
          piezas_vivas: armado.piezas.length,
          el_mas_sostenido_dias: armado.piezas[0]?.dias ?? 0,
          boton_que_repiten: armado.patron.find(x => /bot[oó]n/i.test(x.k))?.v || '',
          saturacion: armado.saturacion,
          huecos: armado.huecos,
          guardado: 'el informe queda guardado en su negocio, con la fecha de esta lectura: la pantalla de Mercado lo muestra entero',
          porque: 'El informe ES el resultado del mercado. Se arma con lo que ya se leyó y dice lo que le falta, en vez de no existir hasta tener todo.',
          falta: armado.falta,
          fuente: 'Biblioteca de Anuncios de Meta · lectura del trabajador',
        },
      });
    } catch (e) {
      // Si la escritura falla, queda dicho acá Y en el registro: un fallo silencioso dejaría al negocio sin
      // informe y sin saber por qué.
      const err = e as any;
      console.error('[informe del mercado] no se pudo guardar:', err?.message, '·', err?.detail ?? '', '·', err?.where ?? '', '· posición', err?.position ?? '');
      tareas.push({
        agente: 'lux', orden: 4, que: 'No pudo guardar el informe de su mercado y lo dice',
        resultado: {
          sin_fuente: `el informe no se pudo guardar: ${String(err?.message).slice(0, 160)}`,
          detalle_tecnico: [err?.detail, err?.where, err?.position ? `posición ${err.position}` : '', err?.code].filter(Boolean).join(' · ').slice(0, 300),
          fuente: 'sin fuente: la escritura del informe falló',
        },
      });
    }
  }

  // ---------------- REX · la demanda y el precio ----------------
  const precios = preciosDelInforme(inf);
  tareas.push({
    agente: 'rex', orden: 3,
    que: precios.length
      ? `Sacó los precios que el mercado publica (${precios.length} referencias escritas en el informe)`
      : 'No pudo medir la demanda ni los precios y lo dice',
    resultado: precios.length ? {
      fuente_tipo: 'precios publicados por el propio mercado, citados del informe',
      precios_observados: precios,
      precio_mas_alto: precios[0], precio_mas_bajo: precios[precios.length - 1],
      porque: 'El precio se lee de lo que el mercado publica, no de un promedio estimado.',
      falta: 'la demanda (cuánta gente busca) necesita una fuente conectada: sus búsquedas o su cuenta publicitaria',
      fuente: inf?.fuente || '',
    } : {
      sin_fuente: 'la demanda (búsquedas) y los precios del mercado necesitan una fuente conectada o la corrida del informe',
      fuente: 'sin fuente',
    },
  });

  // ---------------- NIA · el molde de escritura con lo real del negocio ----------------
  const descripcion = (ctx.descripcion || '').trim();
  const palabrasNegocio = [...new Set(descripcion.toLowerCase().split(/[^a-záéíóúñ0-9]+/).filter(p => p.length > 4))].slice(0, 12);
  tareas.push({
    agente: 'nia', orden: 4,
    que: [av
        ? `Armó el brief creativo del rubro (${(av.por_plaza ?? []).length} plazas, con tipografía, encuadre y colores medidos)`
        : 'No hay analítica visual del rubro que usar todavía',
      descripcion.length >= 20
        ? 'y el molde con las palabras del negocio'
        : 'y pide las palabras del negocio para escribir con ellas'].join(' '),
    resultado: {
      // ---------- EL BRIEF CREATIVO: sale del MERCADO, no de las palabras del negocio ----------
      // No es inspiración: es lo que se midió en las piezas sostenidas (colores hex, tipografía,
      // encuadre, botón, hashtags) y el formato que corresponde a cada plaza. Lo que no se midió, no
      // aparece: si no hay analítica visual del rubro, se dice y no se inventa un brief.
      ...(av ? {
        fuente_tipo: 'la lectura visual de cada creatividad del informe + el texto de los anuncios (copy, botón, destino, hashtags, duración)',
        forma_de_trabajar: 'se conserva lo que el mercado ya premió con tiempo y se cambia una sola cosa: el hueco que nadie ocupa',
        formato_que_gana: patron.find(p => /formato/i.test(p.k))?.v || '',
        boton_que_gana: patron.find(p => /bot[oó]n/i.test(p.k))?.v || '',
        prueba_que_gana: patron.find(p => /prueba/i.test(p.k))?.v || '',
        tipografia_medida: av.tipografia ?? [],
        encuadre_medido: av.composicion ?? [],
        paletas_medidas: av.paletas ?? [],
        hashtags_del_rubro: av.hashtags_usados ?? [],
        brief_por_plaza: av.por_plaza ?? [],
        lo_que_no_hay_que_copiar: av.lo_que_no_hay_que_copiar ?? [],
        limite_declarado: av.nota_plazas || '',
        hueco_a_atacar: huecos[0]?.titulo || '',
      } : {
        brief_por_plaza: 'todavía no hay analítica visual del rubro: falta la lectura de las creatividades (colores, tipografía, encuadre, plazas)',
      }),
      // Y con las palabras del negocio, que es lo que hace que la pieza suene a él y no a la industria.
      ...(descripcion.length >= 20 ? {
        palabras_del_negocio: palabrasNegocio,
        palabras_de_la_industria: 'se evitan a propósito',
        gancho: 'El problema concreto del cliente, en la primera línea, sin nombrar el producto.',
        cuerpo: 'Qué cambia para el cliente, no qué tiene el producto.',
        cierre: 'La acción concreta, en un toque.',
      } : {
        falta: 'las palabras del negocio: falta su descripción (mínimo 20 caracteres, en Primeros pasos). El brief creativo de arriba no depende de eso: sale del mercado.',
      }),
      porque: 'Escribe con el formato y la analítica que su mercado ya premió, y con las palabras que usa el negocio.',
      fuente: (inf ? 'el informe de su rubro' : 'sin informe del rubro') + (descripcion.length >= 20 ? ' + su descripción (Primeros pasos)' : ''),
    },
  });

  // ---------------- KAI · cómo está pautando el rubro, pieza por pieza ----------------
  const conBoton = piezas.filter(p => String(p.cta || '').length > 0);
  const botones = [...new Set(conBoton.map(p => String(p.cta)))];
  const videos = piezas.filter(p => /video/i.test(String(p.tipo || ''))).length;
  const imagenes = piezas.length - videos;
  let metricas: { metrica: string; total: string }[] = [];
  try {
    const m = await db.query(
      `SELECT metrica, SUM(valor)::text AS total FROM metricas_reales
        WHERE business_id = $1 GROUP BY metrica ORDER BY SUM(valor) DESC LIMIT 8`, [ctx.businessId]);
    metricas = m.rows as any[];
  } catch { /* sin métricas cargadas: se dice abajo */ }
  tareas.push({
    agente: 'kai', orden: 5,
    que: piezas.length
      ? `Contó cómo pauta el rubro: ${conBoton.length} de ${piezas.length} piezas cierran por botón`
      : 'No pudo contar la pauta del rubro y lo dice',
    resultado: piezas.length ? {
      fuente_tipo: 'las piezas vivas del informe, contadas una por una',
      piezas_con_boton: conBoton.length, piezas_leidas: piezas.length,
      botones_usados: botones, boton_mas_usado: botones[0] || '',
      piezas_en_video: videos, piezas_en_imagen: imagenes,
      porque: 'El botón y el formato no se eligen por gusto: se eligen mirando lo que el mercado sostiene.',
      ...(metricas.length
        ? { metricas_reales_de_su_cuenta: metricas }
        : { falta: 'el costo por venta de su cuenta necesita que sus métricas estén cargadas (conectar la cuenta o subir resultados)' }),
      fuente: inf?.fuente || '',
    } : {
      sin_fuente: 'no hay informe del rubro: sin piezas leídas no se puede decir cómo está pautando el mercado',
      fuente: 'sin fuente',
    },
  });

  // ---------------- SOL · la medición: el desvío real del modelo ----------------
  const desvio = await desvioActual(db, ctx.businessId);
  let casos = 0;
  try {
    const c = await db.query('SELECT count(*)::int AS n FROM predicciones WHERE business_id = $1 AND desvio_pct IS NOT NULL', [ctx.businessId]);
    casos = c.rows[0]?.n ?? 0;
  } catch { /* sin predicciones: casos queda en 0 y se dice */ }
  tareas.push({
    agente: 'sol', orden: 6,
    que: casos
      ? `Revisó el modelo con ${casos} ${casos === 1 ? 'predicción medida' : 'predicciones medidas'}`
      : 'El modelo todavía no se ha medido contra la realidad y lo dice',
    resultado: {
      fuente_tipo: 'las predicciones guardadas del negocio contra lo que pasó',
      casos_medidos: casos, desvio_actual_pct: desvio,
      correccion: casos
        ? 'El modelo se ajusta con cada campaña medida: la próxima estima más cerca.'
        : 'Sin casos medidos no hay corrección: se corrige cuando una pieza publicada tenga su resultado real.',
      porque: 'Una predicción que no se corrige con la realidad es una opinión.',
      fuente: 'predicciones y resultados reales del negocio',
    },
  });

  // ---------------- RUMI · las conversaciones reales ----------------
  let nConv = 0, nMes = 0;
  let ultimos: string[] = [];
  try {
    const r = await db.query(
      `SELECT count(*)::int AS n,
              count(*) FILTER (WHERE last_message_at > now() - interval '30 days')::int AS mes,
              (array_agg(ultimo ORDER BY last_message_at DESC) FILTER (WHERE ultimo IS NOT NULL))[1:40] AS ultimos
         FROM conversations WHERE business_id = $1`, [ctx.businessId]);
    nConv = Number(r.rows[0]?.n || 0);
    nMes = Number(r.rows[0]?.mes || 0);
    ultimos = ((r.rows[0]?.ultimos || []) as (string | null)[]).filter(Boolean) as string[];
  } catch { /* sin conversaciones: se dice abajo */ }

  // Lo que la gente escribe de verdad: se cuenta sobre los mensajes guardados, no se supone.
  const cuentaFrases = new Map<string, number>();
  for (const m of ultimos) {
    for (const f of String(m).toLowerCase().split(/[?¿\n.!]+/)) {
      const t = f.trim();
      if (t.length >= 12 && t.length <= 90) cuentaFrases.set(t, (cuentaFrases.get(t) || 0) + 1);
    }
  }
  const frases = [...cuentaFrases.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([frase, veces]) => ({ frase, veces }));

  tareas.push({
    agente: 'rumi', orden: 7,
    que: nConv
      ? `Leyó ${nConv} conversaciones del negocio (${nMes} de los últimos 30 días)`
      : 'No hay conversaciones que leer todavía y lo dice',
    resultado: nConv ? {
      fuente_tipo: 'las conversaciones del negocio en su base',
      conversaciones: nConv, ultimos_30_dias: nMes,
      lo_que_mas_escriben: frases.length ? frases : 'los mensajes guardados no traen texto suficiente para sacar frases',
      porque: 'Lo que la gente pregunta en el chat es lo que la pieza tiene que contestar sola, con esas mismas palabras.',
      fuente: 'conversaciones del negocio (WhatsApp/Messenger conectados)',
    } : {
      sin_fuente: 'no hay conversaciones conectadas: se llena cuando la cuenta de WhatsApp esté conectada y la gente escriba',
      fuente: 'sin fuente',
    },
  });

  // ---------------- NOVA · formatos y tendencias (lo cultural) ----------------
  // (a) LOS FORMATOS QUE EL MERCADO YA PREMIÓ. No la opinión de nadie: lo que está corriendo y aguanta.
  const formatos = new Map<string, number>();
  for (const p of piezas) {
    const k = `${p.tipo || 'sin tipo'} · ${p.formato || 'sin formato'} · ${p.estilo || 'sin estilo'}`;
    formatos.set(k, (formatos.get(k) || 0) + 1);
  }
  // Repetir molde es la señal del que encontró su formato: se cuenta por anunciante.
  const moldes = new Map<string, Map<string, number>>();
  for (const p of piezas) {
    const a = String(p.anunciante || ''); if (!a) continue;
    if (!moldes.has(a)) moldes.set(a, new Map());
    const m = moldes.get(a)!;
    const k = [p.tipo, p.formato, p.estilo].filter(Boolean).join(' · ') || 'sin molde';
    m.set(k, (m.get(k) || 0) + 1);
  }
  const repiteMolde = [...moldes.entries()].map(([anunciante, m]) => {
    const [molde, veces] = [...m.entries()].sort((x, y) => y[1] - x[1])[0];
    return { anunciante, piezas: [...m.values()].reduce((s, v) => s + v, 0), molde_que_repite: molde, veces };
  }).filter(r => r.veces >= 2).sort((a, b) => b.veces - a.veces);

  // (b) LAS SERIES: cuando la misma palabra se repite en dos piezas del mismo anunciante, hay capítulo.
  const veto = new Set(['http', 'https', 'whatsapp', 'alisado', 'keratina', 'cabello', 'flores', 'ramos', 'este', 'esta', 'para', 'como', 'sobre', 'desde', 'nuestro', 'nuestra', 'siempre', 'todos']);
  const series: { anunciante: string; palabra: string; en_piezas: number; tipo: string; molde: string }[] = [];
  for (const [anunciante, m] of moldes) {
    const suyas = piezas.filter(p => p.anunciante === anunciante);
    if (suyas.length < 2) continue;
    const textos = suyas.map(p => `${p.gancho || ''} ${p.texto_sobre_imagen || ''} ${(p.hashtags || []).join(' ')}`.toLowerCase());
    const cuenta = new Map<string, number>();
    for (const w of new Set(textos.join(' ').split(/[^a-záéíóúñ]+/).filter(x => x.length >= 4))) {
      if (veto.has(w)) continue;
      const n = textos.filter(c => c.includes(w)).length;
      if (n >= 2) cuenta.set(w, n);
    }
    const top = [...cuenta.entries()].sort((x, y) => y[1] - x[1])[0];
    if (top) series.push({ anunciante, palabra: top[0], en_piezas: top[1], tipo: 'misma palabra en varias piezas', molde: [...m.keys()][0] || '' });
    // Y la serie que casi nadie ve: la MISMA historia contada con otra clienta cada vez. No comparten
    // palabras, comparten el molde y el nombre propio de una persona distinta en cada pieza.
    const nombres = suyas.map(p => {
      const t = `${p.gancho || ''} ${p.texto_sobre_imagen || ''} ${p.nota || ''}`;
      const mayus = (t.match(/\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]{3,})\b/g) || []);
      return mayus.filter(n => !veto.has(n.toLowerCase()));
    }).filter(l => l.length);
    if (nombres.length >= 2 && new Set(nombres.map(l => l[0].toLowerCase())).size >= 2) {
      series.push({
        anunciante, palabra: nombres.map(l => l[0]).join(' / '), en_piezas: nombres.length,
        tipo: 'serie de testimonios: una clienta distinta por pieza, el mismo molde',
        molde: [...m.keys()][0] || '',
      });
    }
  }

  // (c) LO QUE EL PAÍS ESTÁ HABLANDO HOY, y si toca el rubro. El alcance sale de en qué países aparece:
  // un solo país es local; varios de la región, regional; y si además sale fuera de la región, no es cosa nuestra.
  const palabras = [...new Set(`${ctx.rubro} ${ctx.nombre} ${ctx.descripcion}`.toLowerCase().split(/[^a-záéíóúñ]+/).filter(w => w.length > 4))];
  // Y LOS TÉRMINOS DE LA CATEGORÍA EN TODAS LAS LENGUAS (Lex): lo que se habla de este rubro se nombra en la
  // lengua de cada plaza, y con una sola lista de palabras el tema nunca «toca el rubro» en las otras lenguas
  // (en Brasil se habla en portugués y en Estados Unidos en inglés).
  for (const t of Object.values(palabrasPorLengua).flat()) palabras.push(String(t).toLowerCase());
  // Las tendencias se piden con tope corto: son seis fuentes de afuera y ninguna puede colgar la corrida.
  const tend = await Promise.race([
    leerTendencias(GEOS_TENDENCIA, palabras),
    new Promise<{ temas: TemaTendencia[]; geos: string[]; fallos: string[] }>(res => setTimeout(() => res({ temas: [], geos: GEOS_TENDENCIA, fallos: ['las tendencias tardaron más de 20 segundos: se dejan para la próxima corrida'] }), 20_000)),
  ]);
  const tocan = tend.temas.filter(t => t.toca_el_rubro);
  let recurrentes: { tema: string; dias: number }[] = [];
  try {
    const rr = await db.query(
      `SELECT tema, count(DISTINCT fecha)::int AS dias FROM tendencias
        WHERE tema = ANY($1::text[]) GROUP BY tema HAVING count(DISTINCT fecha) > 1 ORDER BY dias DESC, tema LIMIT 6`,
      [tend.temas.map(t => t.tema)]);
    recurrentes = rr.rows as any[];
  } catch { /* primera corrida: todavía no hay histórico de tendencias */ }
  const paisNegocio = mapa.pais || '';
  // Solo se guardan las que le sirven a este negocio: las que se hablan en su país, las regionales y
  // las que tocan su rubro. Lo que pasa en mercados que no son el suyo no se guarda: no es ruido útil.
  const utiles = tend.temas.filter(t => !paisNegocio || t.paises.includes(paisNegocio) || t.alcance.startsWith('regional') || t.toca_el_rubro);
  try {
    for (const t of utiles) {
      await db.query(
        `INSERT INTO tendencias (business_id, geo, pais, tema, alcance, toca_el_rubro, paises, fecha)
         VALUES ($1, $2, $3, $4, $5, $6, $7, current_date)
         ON CONFLICT (business_id, tema, fecha) DO UPDATE SET pais = EXCLUDED.pais
          WHERE EXCLUDED.pais <> ''`,
        [ctx.businessId, ctx.zona || '', paisNegocio, t.tema, t.alcance, t.toca_el_rubro, t.paises]);
    }
  } catch { /* si el guardado falla, la tarea igual se entrega */ }

  tareas.push({
    agente: 'nova', orden: 8,
    que: piezas.length || tend.temas.length
      ? `Leyó ${piezas.length} formatos del mercado y ${tend.temas.length} temas de los que se está hablando hoy`
      : 'No pudo leer formatos ni tendencias y lo dice',
    resultado: {
      fuente_tipo: 'los formatos de las piezas vivas del informe + el RSS público de tendencias por país (CO, MX, AR, BR, ES, US)',
      formatos_del_mercado: [...formatos.entries()].map(([formato, n]) => ({ formato, piezas: n })).sort((a, b) => b.piezas - a.piezas),
      // LO QUE ENTREGA: el formato recomendado de cada plaza, que es lo que Iris usa para armar el prompt.
      formatos_recomendados: formatosRecomendados,
      el_que_iris_usa: 'el prompt de cada plaza se arma sobre este formato, y lo cita en su traza',
      quien_repite_molde: repiteMolde,
      series_detectadas: series,
      pais_del_negocio: paisNegocio || 'no se pudo leer del mapa',
      temas_de_hoy: tend.temas.slice(0, 20).map(t => ({ tema: t.tema, paises: t.paises, alcance: t.alcance })),
      temas_que_le_sirven: utiles.length,
      temas_descartados: tend.temas.length - utiles.length,
      porque_se_descartan: 'lo que se habla en mercados que no son el suyo no se guarda ni se muestra',
      tocan_el_rubro: tocan.length ? tocan : 'ninguno de los temas de hoy toca su rubro (lo normal: las tendencias del día son noticia y deporte)',
      recurrentes_de_otros_dias: recurrentes.length ? recurrentes : 'primera corrida: el histórico empieza hoy (mañana ya se ve qué tema es de un día y qué tema sigue)',
      alcance_cultural: {
        local: tend.temas.filter(t => t.alcance.startsWith('local')).length,
        regional: tend.temas.filter(t => t.alcance.startsWith('regional')).length,
        global: tend.temas.filter(t => t.alcance.startsWith('global')).length,
        como_se_lee: 'sale de en qué países aparece el mismo tema: uno solo = local; varios de la región = regional; y si aparece también en España o Estados Unidos, no es cosa nuestra.',
      },
      // (d) EL CALENDARIO: de todo el histórico de tendencias, lo que toca el rubro y se repite varios
      // días. Un tema de un solo día es noticia; uno que se repite es una ocasión que vale la pena usar.
      calendario_sugerido: await (async () => {
        try {
          const c = await db.query(
            `SELECT tema, count(DISTINCT fecha)::int AS dias, max(fecha) AS ultima, min(paises) AS ejemplo
               FROM tendencias
              WHERE business_id = $1 AND toca_el_rubro AND fecha >= current_date - interval '14 days'
              GROUP BY tema ORDER BY dias DESC, ultima DESC LIMIT 6`, [ctx.businessId]);
          return c.rows.length ? c.rows : 'ningún tema de los últimos 14 días toca su rubro (lo normal: las tendencias del día son noticia y deporte)';
        } catch { return 'sin histórico de tendencias todavía'; }
      })(),
      // LO IMPORTANTE: cómo se aplica, no el dato suelto.
      como_aplicarlo: [
        'Lo que su mercado YA sostiene manda: un formato nuevo se monta encima de eso (celular en el lugar real, texto sobre la imagen, cierre por WhatsApp), no lo reemplaza.',
        'Un formato que aguanta en otro país no se copia por moda: se propone, se juzga en MiroFish con los 5 jueces y los 500 del público, y solo entonces se gasta.',
        'Lo cultural se usa como contexto y como calendario (de qué está hablando la gente estos días), no como el mensaje central del negocio.',
        'Repetir molde es la señal del que encontró su formato: el que aguanta meses repite; el que cambia todo el tiempo no encontró el suyo.',
        'Las series nacen solas cuando el mismo nombre se repite: si la clienta vuelve, hay capítulo (eso ya pasa en su rubro).',
      ],
      falta: tend.fallos.length ? `países que no respondieron: ${tend.fallos.join(' · ')}` : '',
      porque: 'Estar al día no es acumular titulares: es saber qué formato aguanta en su mercado, qué se repite, y qué de lo que se habla afuera aplica acá y qué no.',
      fuente: `${inf?.fuente || 'sin informe del rubro'} + tendencias por país (RSS público)`,
    },
  });

  // ---------------- TINO · la decisión: qué se publica y qué campaña, con lo medido ----------------
  // Lee las decisiones del negocio (lo que contestó en Primeros pasos) y el mercado medido, y decide.
  // En Automático decide y el cliente aprueba; en Compartido deja todo preparado y se frena esperando el OK
  // para publicar o gastar; en Manual no decide por él: le prueba las piezas y le muestra el mercado.
  let decisiones: Record<string, any> = {};
  try {
    const o = await db.query('SELECT datos FROM onboarding WHERE business_id = $1', [ctx.businessId]);
    decisiones = (o.rows[0]?.datos ?? {}) as Record<string, any>;
  } catch { /* sin decisiones cargadas: el motor trabaja en Automático y decide él */ }
  const modo = String(decisiones.modo || 'Automático');
  const presupuesto = String(decisiones.presupuesto || '');
  const canales = Array.isArray(decisiones.canales) ? (decisiones.canales as string[]) : [];
  const ritmo = String(decisiones.publicaciones_semana || '');
  const contenido = String(decisiones.contenido_diario || '');
  const plazaVideo = formatosRecomendados.find((f: any) => f.tipo === 'video') ?? null;
  const plazaImagen = formatosRecomendados.find((f: any) => f.tipo === 'imagen') ?? null;
  const masVieja = [...piezas].sort((a, b) => (Number(b.dias) || 0) - (Number(a.dias) || 0))[0];
  const cierraPorWhats = piezas.some(p => /whatsapp|mensaje/i.test(String(p.cta || '')));

  // EL SALTO DIRECTO AL CREATIVO. Sin mercado no se espera: se decide igual con lo que el negocio ya dijo
  // —el rubro deducido de su material, sus palabras clave y su categoría— y cada campo dice de dónde sale.
  // Son dos casos distintos y se distinguen: la CATEGORÍA NUEVA (se leyeron anuncios y ninguno compite: no
  // hay a quién copiar) y la corrida SIN INFORME del rubro (todavía no hay piezas vivas que leer).
  const hayMercado = piezas.length > 0;
  const categoriaNueva = Boolean(mercado?.categoria_nueva);
  const porElNegocio = !hayMercado || categoriaNueva;
  // Quién decide, en los tres modos que el panel ofrece. Compartido NO es «decide el motor»: prepara y frena.
  const quienDecide = modo === 'Manual'
    ? 'el cliente: el motor no decide por él, solo le prueba las piezas y le muestra el mercado'
    : modo === 'Compartido'
      ? 'los dos: el motor deja la pieza armada y se frena esperando su OK para publicar o gastar'
      : 'el motor: elige, crea y prueba; el cliente aprueba o no';
  const palabrasDeLaPieza = claves.map((c: any) => c.palabra).filter(Boolean);
  // A quién le habla y qué se publica: primero lo que el negocio DECLARÓ en Primeros pasos (su público),
  // después lo que se dedujo del material. Y de «qué vende» se descarta el término genérico (servicios,
  // productos): si lo único que hay es genérico, la pieza se anuncia con lo que el negocio dice que HACE.
  const publicoDeclarado = Array.isArray(decisiones.negocio_publico) ? (decisiones.negocio_publico as string[]).join(', ') : '';
  const aQuienLeHabla = publicoDeclarado || leido.aQuien || 'su cliente';
  const genericos = /^(plan(es)?|servicio(s)?|producto(s)?|sistema(s)?|plataforma(s)?|software(s)?|paquete(s)?|curso(s)?|membresia(s)?|suscripcion(es)?|certificacion(es)?|tratamiento(s)?|arreglo(s)?)$/;
  const ofertaConcreta = (leido.queVende || []).find(v => !genericos.test(String(v).trim()));
  const queSePublica = String(ofertaConcreta || leido.queHace || leido.rubro || ctx.rubro)
    .replace(/\s+/g, ' ').trim().replace(/\s*\.\s*$/, '');
  const materialQueYaTiene = `su material: ${links.length} ${links.length === 1 ? 'enlace' : 'enlaces'} y ${archivosLeidos.fuentes.length} ${archivosLeidos.fuentes.length === 1 ? 'archivo' : 'archivos'} leídos`;
  const contenidoBloque = {
    publicacion_diaria: contenido || 'sin definir: el motor propone mantener las redes activas',
    cadencia: ritmo || 'sin definir: el motor la propone según lo que su mercado sostiene',
    // SIEMPRE una lista. Antes, sin formatos medidos, este campo venía como TEXTO y el panel hacía
    // .join sobre un texto: eso tira abajo la pantalla entera (Campañas quedó en blanco). Lo que falta
    // se dice aparte, en su propia nota, para que nadie tenga que leer un texto donde espera una lista.
    formato_por_red: formatosRecomendados.length
      ? formatosRecomendados.map((f: any) => `${f.plaza} → ${f.formato_recomendado}`)
      : [],
    formato_por_red_nota: formatosRecomendados.length
      ? ''
      : 'todavía no hay formatos medidos de su rubro: el formato de la pieza es una elección nuestra, no una medición',
    costo: 'publicar en sus redes no gasta pauta: consume créditos del plan (producir, probar y medir)',
  };
  const cuandoCambiar = {
    regla: hayMercado
      ? 'cuando el molde que gana en su rubro cambie, o cuando la pieza pierda rendimiento'
      : 'cuando aparezca el primer comparable en su mercado, o cuando lo que publique empiece a traer conversaciones',
    con_las_cuentas_conectadas: 'se mira la fatiga y el costo por conversación de lo publicado, y con eso se decide si se genera una pieza nueva y cada cuánto',
    sin_las_cuentas: 'sin las cuentas conectadas NO se puede saber la fatiga real ni el costo por venta: se decide por el mercado (el molde y sus días) y se dice, no se inventa',
    base_medida: masVieja
      ? `hoy manda ${masVieja.anunciante}, activo hace ${masVieja.dias} días`
      : 'sin mercado medido todavía: no hay un molde de referencia al que volver',
  };

  // LA PIEZA ARMADA SIN MERCADO: el rubro, las palabras clave y el material. No es un molde copiado de
  // nadie —no hay de quién—: es lo que el negocio es, dicho en el idioma de su cliente. Cada campo dice si
  // salió de un dato suyo o de una elección nuestra, porque elegir no es medir.
  const piezaDelNegocio: Record<string, unknown> | null = (leido.rubro || ctx.rubro) ? {
    fuente_tipo: 'el negocio mismo: el rubro deducido de su material, sus palabras clave y su categoría — todavía sin mercado con qué compararlo',
    modo,
    quien_decide: quienDecide,
    por_que_sin_mercado: categoriaNueva
      ? 'Su categoría todavía no existe en ese mercado: no hay a quién copiar ni contra quién compararse. La primera pieza no compite por precio ni por formato: explica la categoría y se queda con las palabras con las que el cliente la va a buscar.'
      : 'Todavía no hay informe del mercado de su rubro. No se espera a tenerlo: la pieza se arma con lo que el negocio ya dijo y se corrige cuando haya mercado que leer.',
    lo_que_entendimos_del_negocio: {
      rubro: leido.rubro || ctx.rubro,
      que_hace: leido.queHace,
      que_ofrece: (leido.queVende || []).join(' · '),
      a_quien: aQuienLeHabla,
      categoria_en_la_enciclopedia: categoria?.ok
        ? `${categoria.titulo} (${categoria.idioma}.wikipedia.org)`
        : 'sin categoría encontrada para sus palabras clave',
      quienes_son_similares: similares.length
        ? similares.slice(0, 5).map(s => s.nombre).join(', ')
        : 'no se encontraron organizaciones con ese nombre afuera',
    },
    palabras_clave_de_la_pieza: palabrasDeLaPieza.length
      ? palabrasDeLaPieza
      : 'sin palabras clave del material: se usan las del rubro',
    material_que_ya_tiene: materialQueYaTiene,
    la_pieza: {
      idioma: `${lenguaDeLaPieza.nombre}${lenguaDeLaPieza.tambien ? ` (y también ${lenguaDeLaPieza.tambien})` : ''}`,
      por_que_ese_idioma: lenguaDeLaPieza.por_que,
      que_se_publica: `${queSePublica}: explicado para ${aQuienLeHabla}, con las palabras con las que ese cliente lo buscaría`,
      gancho: 'El problema concreto del cliente, en la primera línea, sin nombrar el producto.',
      cuerpo: 'Qué cambia para el cliente, no qué tiene el producto.',
      cierre: decisiones.negocio_objetivo
        ? `la acción que el negocio pidió («${decisiones.negocio_objetivo}»), en un toque`
        : 'la acción concreta, en un toque',
      boton: canales.some(c => /whatsapp|mensaje/i.test(c))
        ? 'WhatsApp: la gente escribe y usted cierra'
        : (canales.length
          ? `el botón de ${canales[0]} (elegido por nosotros: todavía no hay mercado medido que diga con qué botón cierra su rubro)`
          : 'sin definir: falta que el negocio diga dónde quiere trabajar'),
      formato: plazaVideo
        ? `${plazaVideo.formato_recomendado} — ${plazaVideo.por_que}`
        : 'video vertical 9:16 (elegido por nosotros: sin formatos medidos de su rubro, es el que se rueda con celular)',
      donde_va: canales.length ? canales.join(', ') : 'sin definir: el motor propone y el cliente confirma',
      elegido_por_nosotros: [
        canales.length ? '' : 'el canal: todavía no dijo dónde quiere trabajar',
        plazaVideo ? '' : 'el formato: sin mercado medido, video vertical 9:16 y no un molde ajeno',
      ].filter(Boolean),
    },
    propuesta_campana: {
      objetivo: decisiones.negocio_objetivo
        ? `${decisiones.negocio_objetivo} — lo que el negocio pidió en Primeros pasos`
        : 'sin definir: el motor propone y el cliente confirma',
      red: canales.length ? canales.join(', ') : 'sin definir',
      presupuesto_diario: presupuesto || 'sin definir: el motor propone y el cliente confirma (nunca gasta sin su OK)',
      cierre: canales.some(c => /whatsapp/i.test(c))
        ? 'por WhatsApp, que es el canal que el negocio declaró'
        : 'el botón que permite el canal declarado',
      por_que: 'sale de lo que el negocio declaró (objetivo, canal y techo), no del mercado: todavía no hay con qué compararlo',
    },
    contenido: contenidoBloque,
    cuando_cambiar: cuandoCambiar,
    falta: [
      'el generador de imagen y video, para que el prompt se vuelva archivo',
      'la lectura del mercado de su rubro (el informe), para corregir el rumbo con lo que el mercado ya premió con tiempo',
      canales.length ? '' : 'que el negocio diga dónde quiere trabajar (Primeros pasos o Campañas)',
      presupuesto ? '' : 'que el negocio fije su techo por día (o el motor propone y él confirma)',
      'las cuentas conectadas, para medir lo publicado y decidir los cambios con datos propios',
    ].filter(Boolean),
    porque: 'Era el hueco: sin mercado, la decisión no salía. Tino ya no espera el informe — con el rubro, las palabras clave y el material arma la pieza, y dice qué falta. Cuando haya mercado que leer, la corrige con eso.',
    fuente: `${materialQueYaTiene} + sus decisiones en Primeros pasos`,
  } : null;

  tareas.push({
    agente: 'tino', orden: 10,
    que: porElNegocio
      ? (categoriaNueva
        ? 'Decidió sin esperar mercado: en su categoría no hay con quién compararse, así que armó la pieza con el rubro, las palabras clave y su material'
        : 'Decidió sin el informe del mercado: armó la pieza con el rubro, las palabras clave y el material del negocio')
      : `Decidió qué publicar y qué campaña para este negocio, en modo ${modo}${presupuesto ? `, con ${presupuesto} de techo` : ''}`,
    resultado: porElNegocio
      ? (piezaDelNegocio ?? {
        sin_fuente: 'no se puede armar la pieza: falta el rubro y el material del negocio (descripción, enlaces o archivos en Primeros pasos)',
        fuente: 'sin fuente',
      })
      : {
        fuente_tipo: 'las decisiones del negocio (Primeros pasos) + el informe del mercado + el formato que aguanta por plaza',
        modo,
        quien_decide: quienDecide,
        propuesta_publicacion: {
          idioma: `${lenguaDeLaPieza.nombre}${lenguaDeLaPieza.tambien ? ` (y también ${lenguaDeLaPieza.tambien})` : ''}`,
          por_que_ese_idioma: lenguaDeLaPieza.por_que,
          tipo: plazaVideo ? `video (${plazaVideo.formato_recomendado})` : 'video vertical 9:16',
          estilo: plazaVideo?.formato_recomendado || '',
          red: canales.length ? canales.join(', ') : 'sin definir: el motor elige la red donde el mercado sostiene ese formato',
          por_que: plazaVideo?.por_que || 'es el formato que el mercado ya premió con tiempo',
          referencia: masVieja ? `${masVieja.anunciante}, ${masVieja.dias} días activo` : '',
          imagen_para_feed: plazaImagen ? `${plazaImagen.formato_recomendado} — ${plazaImagen.por_que}` : '',
        },
        propuesta_campana: {
          objetivo: canales.length
            ? (canales.some(c => /whatsapp/i.test(c)) ? 'conversaciones por WhatsApp: la gente escribe y usted cierra' : 'tráfico a su página, con la red que eligió')
            : 'sin definir: el motor propone conversaciones por WhatsApp y el cliente confirma',
          red: canales.length ? canales.join(', ') : 'sin definir',
          presupuesto_diario: presupuesto || 'sin definir: el motor propone y el cliente confirma (nunca gasta sin su OK)',
          cierre: cierraPorWhats ? 'por WhatsApp, que es el botón de las piezas que aguantan en su rubro' : 'el botón que usa su mercado',
          por_que: 'sale del botón que el mercado ya usa, del canal que el negocio declaró y del techo que él puso',
        },
        contenido: contenidoBloque,
        cuando_cambiar: cuandoCambiar,
        falta: [
          'el generador de imagen y video, para que el prompt se vuelva archivo',
          canales.length ? '' : 'que el negocio diga dónde quiere trabajar (Primeros pasos o Campañas)',
          presupuesto ? '' : 'que el negocio fije su techo por día (o el motor propone y él confirma)',
          'las cuentas conectadas, para medir lo publicado y decidir los cambios con datos propios',
        ].filter(Boolean),
        porque: 'Es la decisión que el dueño pidió: con lo que el negocio ya dijo y el mercado ya medido, qué publicar y qué campaña armar. En Automático la toma y la explica; en Compartido la deja pronta esperando el OK; en Manual se la deja entera en la mano.',
        fuente: `${inf?.fuente || 'sin informe del rubro'} + las decisiones del negocio`,
      },
  });

  // ---------------- IRIS · el arte: el prompt de generación de cada plaza ----------------
  // El sistema todavía no genera imagen ni video. Lo que sí hace, y es lo que el dueño pidió, es
  // entregar el PROMPT COMPLETO —colores, tipografía, formato, escenas, UGC o toma de producto— con la
  // traza de cómo se armó cada campo con lo que se midió en el mercado. Queda guardado como contrato:
  // el día que haya generador conectado, genera con esto.
  // SIN MERCADO MEDIDO NO SE INVENTA NADA: si todavía no hay analítica visual del rubro, el prompt se arma
  // con lo que el negocio ya tiene —lo que vende, a quién le habla, las palabras de su categoría y la pieza
  // que decidió Tino— y los campos que nadie midió (colores, tipografía, formato del mercado) quedan vacíos
  // y DICHOS. Cuando haya mercado que leer, el del informe reemplaza a este.
  // LA IDENTIDAD, MEDIDA EN SU PROPIA PÁGINA. Es lo primero que mira un creador y el negocio ya lo tiene
  // publicado: sus colores, su tipografía y las imágenes que ya usa. No se pregunta ni se inventa: se lee de
  // su CSS. Si no hay página legible, se dice el motivo y los campos quedan vacíos y dichos.
  const identidad = links.length
    ? await leerIdentidadDeLaPagina(String(links[0])).catch(() => null)
    : null;
  // ---------------------------------------------------------------------------------------------
  // LA PIEZA SE ARMA ACÁ, ANTES DE LOS PROMPTS. No es un capricho de orden: el prompt de generación
  // necesita el GUION de la pieza —sus planos y sus frases exactas— para no ser «una idea de video».
  // Se arma una sola vez y la corrida la guarda más abajo, con el mismo objeto.
  // ---------------------------------------------------------------------------------------------
    const botonDeLaPieza = canales.some(c => /whatsapp|mensaje/i.test(c))
    ? 'Escriba por WhatsApp'
    : (canales.length ? `Escriba por ${canales[0]}` : '');
    const datosDeLaPieza = {
    negocio: {
      nombre: ctx.nombre, queHace: leido.queHace, descripcion: ctx.descripcion,
      ofrece: Array.isArray(leido.queVende) ? leido.queVende : [], aQuien: aQuienLeHabla,
    },
    canales, boton: botonDeLaPieza,
    formato: plazaVideo ? String(plazaVideo.formato_recomendado) : 'video vertical 9:16',
    lengua: lenguaDeLaPieza.nombre,
    objetivo: String(decisiones.negocio_objetivo || ''),
    hueco: armadoDelInforme?.huecos?.[0] ?? null,
    saturado: armadoDelInforme?.saturacion ?? [],
    comparables: mercado?.comparables ?? [],
    identidad: identidad ?? null,
    // El vocabulario medido: lo que el negocio dice que ofrece y vende, lo que dice de sí mismo, y los
    // términos de su categoría y de su mercado en todas sus lenguas. Contra eso se corrigen los tipeos.
    vocabulario: vocabularioDe([
      // OJO: la descripción del negocio NO entra acá. Es el texto que se corrige: si entra, sus propios
      // errores quedan «conocidos» y no se corrigen nunca (pasó con «geelos»).
      leido.queVende, leido.queHace, leido.rubro, ctx.rubro, ctx.nombre,
      String(decisiones.prod_1 || ''), String(decisiones.prod_2 || ''),
      String(decisiones.negocio_que || ''),
      mercado?.palabras, mercado?.terminos, armadoDelInforme?.saturacion,
    ]),
  };
  const piezaEscrita = armarLaPieza(datosDeLaPieza);

  // LAS CINCO VARIANTES DE UNA RONDA. No son la misma pieza cinco veces: cada una entra por donde el
  // material del negocio tiene algo que decir, en un formato distinto, y todas se votan por separado.
  // Y una ronda no repite lo que ya se probó: se mira qué ángulos usó este negocio y se eligen los que
  // todavía no, que es lo que hace un creador cuando le piden opciones nuevas. Con 10 ángulos y 5
  // formatos, las rondas se diferencian entre sí muchas veces antes de volver a un combo.
  const ANGULOS = [
    { nombre: 'el problema', angulo: 'el problema concreto del cliente', formato: 'video vertical 9:16', apertura: '' },
    { nombre: 'cómo funciona', angulo: 'cómo funciona, paso a paso', formato: 'reel con texto sobre imagen, 9:16', apertura: 'Así funciona, paso a paso' },
    { nombre: 'la confianza', angulo: 'la seguridad y la verificación, que es lo que frena la decisión', formato: 'video cuadrado 1:1', apertura: '¿Es seguro? Así se verifica' },
    { nombre: 'la prueba', angulo: 'una prueba de que funciona, con números si el negocio los tiene', formato: 'imagen cuadrada 1:1 con texto', apertura: '¿Cómo sabe que funciona?' },
    { nombre: 'la objeción', angulo: 'la objeción de quien todavía no compra', formato: 'imagen vertical 9:16 con texto', apertura: '¿Y por qué nadie más lo ofrece?' },
    { nombre: 'el costo de no hacerlo', angulo: 'lo que le cuesta seguir como está', formato: 'video vertical 9:16', apertura: '¿Cuánto le cuesta dejarlo así?' },
    { nombre: 'el paso corto', angulo: 'empezar por lo más chico, sin comprometerse', formato: 'reel con texto sobre imagen, 9:16', apertura: 'Empezar es más simple de lo que parece' },
    { nombre: 'el que ya lo usa', angulo: 'quién lo usa hoy y para qué', formato: 'video cuadrado 1:1', apertura: '¿Quiénes ya lo están haciendo?' },
    { nombre: 'la pregunta frecuente', angulo: 'la pregunta que le hacen siempre', formato: 'imagen cuadrada 1:1 con texto', apertura: 'La pregunta que nos hacen siempre' },
    { nombre: 'el antes y el después', angulo: 'cómo se hacía antes y cómo se hace ahora', formato: 'imagen vertical 9:16 con texto', apertura: 'Antes y después' },
  ];
  const usosDelAngulo = new Map<string, number>(
    ((await db.query(
      `SELECT coalesce(angulo, '') AS a, count(*)::int AS n FROM piezas
        WHERE business_id = $1 AND ronda > 0 GROUP BY 1`, [ctx.businessId])).rows as { a: string; n: number }[])
      .map(x => [x.a, Number(x.n)] as [string, number]));
  const VARIANTES = [...ANGULOS]
    .sort((a, b) => (usosDelAngulo.get(a.angulo) ?? 0) - (usosDelAngulo.get(b.angulo) ?? 0))
    .slice(0, 5)
    .map((v, i) => ({ ...v, n: i + 1 }));
  const paqueteDelMercado = promptsDelInforme(inf ?? {}, formatosRecomendados);
  // LOS CAMPOS DEL PROMPT, SIN LA PIEZA. El prompt de cada pieza se arma DESPUÉS de escribirla —más abajo—
  // porque necesita su formato y su título: una pieza de imagen no puede llevar un prompt de video, y el
  // prompt tiene que guardarse con el título de ESA pieza para que su ficha abra el suyo y no el de otra.
  const camposDelPrompt = {
    negocio: ctx.nombre,
    queSePublica,
    aQuien: aQuienLeHabla,
    gancho: 'la persona dice el problema concreto de su cliente en la primera frase, sin nombrar el producto',
    cuerpo: 'se ve el trabajo real haciéndose: qué cambia para el cliente, no qué tiene el producto',
    cierre: decisiones.negocio_objetivo
      ? `la acción que el negocio pidió («${decisiones.negocio_objetivo}»), en un toque`
      : 'la acción concreta, en un toque',
    idioma: { nombre: lenguaDeLaPieza.nombre, por_que: lenguaDeLaPieza.por_que },
    palabrasDeLaPieza,
    rubro: leido.rubro || ctx.rubro,
    canal: canales.join(', '),
    // El mismo botón que lleva la pieza («Escriba por Facebook»): el cierre tiene que decir qué hacer.
    boton: botonDeLaPieza || (canales.length ? `escriba por ${canales[0]}` : 'sin definir: falta que el negocio diga dónde quiere trabajar'),
    material: materialQueYaTiene,
    queHace: leido.queHace,
    tono: Array.isArray(decisiones.tono) ? (decisiones.tono as string[]) : [],
    objetivo: String(decisiones.negocio_objetivo || ''),
    identidad,
    // Su enlace, para que el cierre diga a dónde escribe (no «escríbanos»).
    enlace: String(links[0] || ''),
    // Los términos con los que el mercado nombra esto: los que se quedan sin traducir.
    terminosDelMercado: mercado?.terminos ?? [],
    fuente: `${materialQueYaTiene} + la pieza que decidió Tino (todavía sin la analítica visual de su rubro)`,
  };
  // El del mercado medido sí se guarda acá: no depende de la pieza (trae una plaza por formato del informe).
  let promptsGuardados = 0;
  if (paqueteDelMercado) {
    try { promptsGuardados = await guardarPrompts(db, ctx.businessId, paqueteDelMercado, corridaId); } catch { promptsGuardados = 0; }
  }

  // ---------------- REX 2 · LOS PRECIOS QUE EL MERCADO PUBLICA EN SUS ANUNCIOS ----------------
  // Los precios no se estiman: se leen de los copies de los anuncios comparables, que es donde el mercado
  // los publica. Se buscan las marcas de precio y se corta el numero a mano, sin expresiones complicadas:
  // menos joyas que se rompan cuando el texto viene de una pagina ajena.
  const preciosDelMercado: string[] = [];
  for (const f of mercado?.comparables ?? []) {
    const tx = String(f.copy || '');
    for (const marca of ['US$', 'USD', '$']) {
      let i = tx.indexOf(marca);
      while (i >= 0) {
        const resto = tx.slice(i + marca.length).replace(/^[ \t]+/, '');
        const num = resto.match(/^[0-9][0-9.,]*/);
        if (num) {
          const p = (marca + ' ' + num[0]).trim();
          if (!preciosDelMercado.includes(p)) preciosDelMercado.push(p);
        }
        i = tx.indexOf(marca, i + marca.length);
      }
    }
  }
  if (mercado && mercado.comparables.length) {
    tareas.push({
      agente: 'rex', orden: 11,
      que: preciosDelMercado.length
        ? ('Saco ' + preciosDelMercado.length + (preciosDelMercado.length === 1 ? ' precio' : ' precios') + ' que su mercado publica en los anuncios')
        : 'Leyo los anuncios comparables: ninguno publica precio en la ficha (en su categoria no se compite por precio visible)',
      resultado: {
        fuente_tipo: 'los copies de los anuncios comparables, leidos por el trabajador',
        comparables_leidos: mercado.comparables.length,
        precios_encontrados: preciosDelMercado.slice(0, 12),
        porque: 'Son precios que el propio mercado publica en su publicidad, no promedios estimados: con eso la pieza sabe donde ponerse.',
        fuente: 'Biblioteca de Anuncios de Meta · lectura del trabajador',
      },
    });
  }

  // ---------------- KAI 2 · LOS BOTONES CON LOS QUE CIERRA SU MERCADO ----------------
  // De los comparables se cuenta con que boton cierra cada uno: ese es el cierre que el mercado ya eligio.
  const botonesDelMercado = new Map<string, number>();
  for (const f of mercado?.comparables ?? []) {
    const b = String(f.cta || '').trim();
    if (b) botonesDelMercado.set(b, (botonesDelMercado.get(b) || 0) + 1);
  }
  if (mercado && mercado.comparables.length) {
    tareas.push({
      agente: 'kai', orden: 12,
      que: botonesDelMercado.size
        ? ('Conto como cierra su mercado: ' + Array.from(botonesDelMercado.keys()).slice(0, 3).join(', '))
        : 'Leyo los anuncios comparables: las fichas no traen el boton (hay que abrirlos uno por uno para verlo)',
      resultado: {
        fuente_tipo: 'los botones de los anuncios comparables, leidos por el trabajador',
        comparables_leidos: mercado.comparables.length,
        botones_del_mercado: Array.from(botonesDelMercado.entries()).map(([boton, cuantos]) => ({ boton, cuantos })),
        porque: 'El boton no se elige por gusto: se elige el que ya esta cerrando en ese mercado.',
        fuente: 'Biblioteca de Anuncios de Meta · lectura del trabajador',
      },
    });
  }

  // ---------------- LA PIEZA, ESCRITA Y LISTA PARA PUBLICAR ----------------
  // El motor decidía qué publicar y lo explicaba, pero la PIEZA no existía como texto: no había nada que
  // aprobar, nada que publicar y nada que medir («0 piezas produjo el motor»), y el modelo no tenía ni un
  // caso. Acá se escribe con el material del negocio, con el ángulo que ningún comparable usa, y con el
  // arte medido en su propia web. Queda guardada, y no se duplica si es la misma de la corrida anterior.
  try {
    // LAS PIEZAS DE ESTA CORRIDA. En una corrida normal es una; en una RONDA son cinco, cada una con su
    // ángulo y su formato: la misma pieza cinco veces no da nada que votar. Se guardan todas, se dice de
    // qué ronda salió cada una y con qué ángulo entró.
    const numeroDeRonda = ronda
      ? Number((await db.query('SELECT COALESCE(MAX(ronda), 0) + 1 AS n FROM piezas WHERE business_id = $1', [ctx.businessId])).rows[0].n)
      : 0;
    const aEscribir = ronda
      ? VARIANTES.map(v => armarLaPieza({ ...datosDeLaPieza, formato: v.formato, variante: v }))
      : [piezaEscrita];
    let escritasAhora = 0;
    for (const pz of aEscribir) {
      // Se evita el duplicado exacto: misma pieza, mismo texto Y MISMO ÁNGULO. Dos variantes de una ronda
      // son distintas por definición, así que el ángulo entra en la comparación.
      const yaEsta = await db.query(
        `SELECT id FROM piezas WHERE business_id = $1 AND titulo = $2 AND texto = $3 AND coalesce(angulo, '') = $4 LIMIT 1`,
        [ctx.businessId, pz.titulo, pz.texto, String((pz.detalle as any)?.variante?.angulo || '')],
      );
      if (yaEsta.rows.length) continue;
      const insertada = await db.query(
        `INSERT INTO piezas (business_id, titulo, formato, texto, guion, estado, generacion, ronda, angulo)
         VALUES ($1, $2, $3, $4, $5, 'lista para publicar', $6::jsonb, $7, $8) RETURNING id`,
        [ctx.businessId, pz.titulo, pz.formato, pz.texto, pz.guion, aJson(pz.detalle), numeroDeRonda,
          String((pz.detalle as any)?.variante?.angulo || '')],
      );
      const piezaId = String(insertada.rows[0].id);
      // LA IMAGEN DE LA PIEZA (y el material del video). Una pieza de imagen se pinta con un prompt visual
      // armado con lo medido del negocio; una de VIDEO también necesita material, porque el montaje se
      // arma con NUESTRAS imágenes —no hace falta banco de imágenes ni llave de Pexels—. Si algo no
      // responde, la pieza queda con su prompt y lo dice: pintar es un extra, no un requisito.
      const esPiezaDeImagen = /imagen/i.test(String(pz.formato || ''));
      const esPiezaDeVideo = /video/i.test(String(pz.formato || '')) && !/texto/i.test(String(pz.formato || ''));
      const materiales: string[] = [];
      if (esPiezaDeImagen || esPiezaDeVideo) {
        try {
          const visual = promptVisual({
            queHace: leido.queHace || ctx.descripcion,
            textoSobreLaImagen: String((pz.detalle as any)?.texto_sobre_la_imagen || ''),
            formato: pz.formato,
            colores: (identidad?.colores ?? []).map((c: { hex: string }) => c.hex),
            lugar: ctx.zona,
            tono: Array.isArray(decisiones.tono) ? decisiones.tono.join(' y ') : '',
          });
          const imagenes: unknown[] = [];
          // Un video necesita más de un cuadro para no quedarse en una foto quieta.
          const cuantas = esPiezaDeVideo ? 2 : 1;
          for (let n = 0; n < cuantas; n++) {
            const prompt = n === 0 ? visual : `${visual}, same scene from a closer detail, different angle`;
            const img = await generarImagen({ businessId: ctx.businessId, piezaId, formato: pz.formato, prompt });
            if (!img) continue;
            imagenes.push(img);
            materiales.push(img.archivo);
          }
          if (imagenes.length) {
            await db.query(
              `UPDATE piezas SET generacion = jsonb_set(jsonb_set(generacion, '{imagen_generada}', $2::jsonb),
                                                         '{imagenes_generadas}', $3::jsonb) WHERE id = $1`,
              [piezaId, aJson(imagenes[0]), aJson(imagenes)],
            );
          }
        } catch (e) { console.error('[imagen] no se pudo generar:', (e as Error)?.message); }
      }
      // EL VIDEO DE LA PIEZA: se monta con nuestro material, la voz que corresponde a su tono y subtítulos
      // nativos (gratis, sin GPU, sin llaves nuevas). Si el montaje falla, la pieza se queda con su guion,
      // sus planos y sus imágenes, y lo dice.
      //
      // NO SE ESPERA: montar tarda minutos y la corrida no puede quedarse colgada por eso (el panel, a
      // través de nginx, corta antes). El pedido sale y la pieza se actualiza cuando el video está listo;
      // la ficha lo muestra en cuanto aparece. Es el mismo criterio que la lectura de anuncios.
      if (esPiezaDeVideo && materiales.length) {
        const tonoDeLaPieza = Array.isArray(decisiones.tono) ? decisiones.tono.join(' y ') : '';
        void (async () => {
          try {
            const vid = await generarVideo({
              businessId: ctx.businessId, piezaId, formato: pz.formato, titulo: pz.titulo,
              copy: String(pz.texto || ''), materiales, tono: tonoDeLaPieza,
            });
            if (vid) {
              await db.query(
                `UPDATE piezas SET generacion = jsonb_set(generacion, '{video_generado}', $2::jsonb) WHERE id = $1`,
                [piezaId, aJson(vid)],
              );
              console.log('[video] montado:', vid.archivo, vid.peso, 'bytes,', vid.segundos, 's,', vid.voz);
            }
          } catch (e) { console.error('[video] no se pudo montar:', (e as Error)?.message); }
        })();
      }
      escritasAhora++;
      // LOS PLANOS: solo las piezas de video tienen guion que desglosar. Se guardan dentro de la pieza
      // (`generacion.planos`), en su propia fila, para que la ficha del panel los muestre junto al prompt.
      // Solo VIDEO: un reel de texto lleva tarjetas, no planos filmados; una imagen no tiene planos.
      if (/^video/i.test(String(pz.formato || '').trim()) && String(pz.guion || '').trim().length >= 40) {
        try {
          const planos = await planosDelGuion(String(pz.guion));
          if (planos) {
            await db.query(
              `UPDATE piezas SET generacion = jsonb_set(generacion, '{planos}', $2::jsonb)
                WHERE business_id = $1 AND titulo = $3 AND texto = $4`,
              [ctx.businessId, aJson(planos), pz.titulo, pz.texto],
            );
          }
        } catch (e) { console.error('[planos] no se pudo desglosar el guion:', (e as Error)?.message); }
      }
    }
    // EL PROMPT DE CADA PIEZA, EN SU FORMATO. Una pieza de imagen pide UNA imagen (sin planos, sin voz, sin
    // segundos) y su texto sobre la imagen; una de video pide el paquete completo. Antes se guardaba un solo
    // prompt de video para todas, así que una pieza cuadrada salía pidiendo un video de 30 segundos.
    const formatosEscritos: string[] = [];
    if (!paqueteDelMercado && piezaDelNegocio) {
      for (const pz of aEscribir) {
        try {
          // LA CAPA DE OFICIO: el motor de prompts instalado aporta su vocabulario técnico (luz, lente,
          // encuadre). Se pide con la semilla del título, así cada pieza recibe siempre la misma capa.
          const oficio = await capaDeOficio(pz.titulo).catch(() => null);
          const pq = promptDelNegocio({
            ...camposDelPrompt,
            oficio,
            formato: pz.formato,
            piezaTitulo: pz.titulo,
            guion: String(pz.guion || '').split('\n').map(l => l.trim()).filter(Boolean),
          });
          promptsGuardados += await guardarPrompts(db, ctx.businessId, pq, corridaId);
          formatosEscritos.push(`${pz.formato} → prompt de ${pq.prompts[0]?.tipo || 'sin tipo'}`);
        } catch (e) {
          console.error('[iris] no se pudo armar el prompt de la pieza:', (e as Error)?.message);
        }
      }
    }
    const piezaParaLosPrompts = aEscribir[0];
    if (!paqueteDelMercado && piezaDelNegocio) {
      tareas.push({
        agente: 'iris', orden: 9,
        que: [
          `Armó el entregable de ${aEscribir.length === 1 ? 'la pieza' : `las ${aEscribir.length} piezas`}, cada una en su formato:`,
          formatosEscritos.length ? formatosEscritos.join(' · ') : 'no se pudo armar ninguno',
          identidad?.leida
            ? `con la identidad medida en su propia web (${identidad.colores.length} colores, ${identidad.tipografias.length} tipografías, ${identidad.imagenes.length} imágenes)`
            : 'sin identidad que medir: no hay página legible y lo dice',
          `y ${String((promptDelNegocio({ ...camposDelPrompt, formato: piezaParaLosPrompts?.formato, piezaTitulo: piezaParaLosPrompts?.titulo, guion: [] }).prompts[0] as any)?.lo_que_falta?.length || 0)} cosas marcadas como «falta» en vez de inventadas`,
        ].join(' '),
        resultado: {
          fuente_tipo: 'el material del negocio (lo que vende, a quién le habla, su identidad medida en su web) + la pieza escrita',
          guardados_en: 'la tabla de prompts del negocio, uno por pieza y en su formato',
          guardados: promptsGuardados,
          piezas_con_prompt: aEscribir.map(pz => ({ pieza: pz.titulo.slice(0, 70), formato: pz.formato })),
          que_lleva: 'el entregable (qué producir y en qué formato devuelve), el guion literal o el texto sobre la imagen, los colores con su papel y su contraste calculado, dónde entra cada recurso suyo, las prohibiciones, las reglas de su sector y lo que falta',
          porque: 'un prompt que no dice qué producir no se puede ejecutar, y el de una imagen no puede pedir un video',
          donde_lo_ve_el_dueno: 'Campañas → La galería → Ver ficha → «El prompt de generación», con «Copiar el prompt»',
          fuente: `identidad medida en su web + material del negocio (${materialQueYaTiene})`,
        },
      });
    } else if (!paqueteDelMercado) {
      tareas.push({
        agente: 'iris', orden: 9,
        que: 'No pudo armar los prompts y lo dice',
        resultado: { sin_fuente: 'no hay pieza con la que armar el prompt', fuente: 'sin fuente' },
      });
    }
    // Lo que se creó se cobra, y queda en el libro: es lo que cuesta escribir una pieza.
    if (escritasAhora > 0) {
      await cobrarCreacion(db, ctx.businessId, escritasAhora,
        ronda ? `ronda ${numeroDeRonda}: ${escritasAhora} piezas` : `pieza: ${piezaEscrita.titulo.slice(0, 60)}`);
    }
    const yaEsta = { rows: escritasAhora ? [] : [{}] } as { rows: unknown[] };
    const angulo = armadoDelInforme?.huecos?.[0];
    tareas.push({
      agente: 'nia', orden: 11,
      que: [
        ronda
          ? `Dejó ${aEscribir.length} piezas distintas —una por ángulo— en la ronda ${numeroDeRonda}`
          : (yaEsta.rows.length
            ? 'La pieza escrita es la misma que la de la corrida anterior: no se duplicó'
            : 'Dejó la pieza escrita y lista para publicar'),
        `${piezaEscrita.texto.split('\n').filter(Boolean).length} líneas, escritas en ${String((piezaEscrita.detalle as any).lengua_del_texto || '')}`,
        angulo ? `con el ángulo que ningún comparable usa (${angulo.que.replace(/^de /, '')})` : 'sin ángulo medido: falta la lectura del mercado',
      ].join(' · '),
      resultado: {
        fuente_tipo: 'el material del propio negocio, ordenado como un anuncio, y el hueco medido en su mercado',
        es_la_misma_que_antes: yaEsta.rows.length > 0,
        ronda: ronda ? numeroDeRonda : 0,
        piezas_de_la_ronda: ronda ? aEscribir.map(pz => ({ formato: pz.formato, angulo: String((pz.detalle as any)?.variante?.angulo || ''), de_donde_sale: String((pz.detalle as any)?.variante?.de_donde_sale || '') })) : undefined,
        titulo: piezaEscrita.titulo,
        como_empieza: piezaEscrita.texto.split('\n')[0],
        lineas: piezaEscrita.texto.split('\n').filter(Boolean).length,
        lengua_del_texto: (piezaEscrita.detalle as any).lengua_del_texto,
        lengua_del_mercado: lenguaDeLaPieza.nombre,
        aviso_de_material: (piezaEscrita.detalle as any).aviso_de_material,
        formato: piezaEscrita.formato,
        angulo_que_ninguno_usa: angulo ? { que: angulo.que, como: angulo.como } : 'sin hueco medido todavía',
        arte: piezaEscrita.detalle.arte,
        referencia_del_mercado: piezaEscrita.detalle.referencia_del_mercado,
        lo_que_falta: piezaEscrita.detalle.lo_que_falta,
        donde_la_ve_el_dueno: 'Campañas → «La pieza, lista para publicar»: ahí está el texto entero, con su formato, su botón y el arte medido de su web',
        porque: 'Sin la pieza escrita no hay nada que aprobar ni nada que medir: es el paso que convierte la investigación en algo que se publica.',
        fuente: 'material del negocio + informe del mercado + su propia web',
      },
    });
  } catch (e) {
    console.error('[la pieza] no se pudo escribir:', (e as Error)?.message);
    tareas.push({
      agente: 'nia', orden: 11, que: 'No pudo dejar la pieza escrita y lo dice',
      resultado: { sin_fuente: `la pieza no se pudo escribir: ${String((e as Error)?.message).slice(0, 160)}`, fuente: 'sin fuente: la escritura de la pieza falló' },
    });
  }

  // ---------------- MIROFISH · LAS PIEZAS PROBADAS, CON SU NÚMERO ----------------
  // El número es lo que faltaba: cada pieza pasa por los 5 jueces y los 500 del público ANTES de que gaste un
  // peso. En una corrida normal se prueba la pieza nueva; en una RONDA se prueban las cinco, cada una con su
  // propia votación, y gana la que saca el puntaje más alto — no la elige nadie a mano. En Automático el motor
  // prueba él («probar» es lo que promete el modo); en Compartido y en Manual se frena y espera el OK del
  // dueño, porque cada prueba cuesta créditos. Nunca se prueba dos veces la misma pieza: cobrar dos veces por
  // el mismo número sería quitarlo dos veces.
  try {
    const aProbar = (await db.query(
      `SELECT p.id, p.titulo, p.texto, p.formato, p.ronda, p.angulo, p.generacion
         FROM piezas p
        WHERE p.business_id = $1
          AND NOT EXISTS (SELECT 1 FROM evaluaciones e WHERE e.pieza_id = p.id)
        ORDER BY p.created_at DESC LIMIT $2`,
      [ctx.businessId, ronda ? VARIANTES.length : 1])).rows as
      { id: string; titulo: string; texto: string; formato: string; ronda: number; angulo: string; generacion: Record<string, unknown> }[];
    const saldo = await saldoDe(db, ctx.businessId);
    const cuesta = aProbar.length * TARIFA.evaluarPieza;

    if (!aProbar.length) {
      tareas.push({
        agente: 'sol', orden: 13, que: 'No hay ninguna pieza sin probar y lo dice',
        resultado: {
          sin_fuente: 'todas las piezas escritas ya tienen su evaluación guardada: no se vuelve a cobrar lo mismo',
          fuente: 'sin fuente: no hay pieza sin probar',
        },
      });
    } else if (modo !== 'Automático') {
      tareas.push({
        agente: 'sol', orden: 13,
        que: `Quedaron ${aProbar.length} ${aProbar.length === 1 ? 'pieza' : 'piezas'} listas, esperando su OK para pasar por MiroFish (cuestan ${cuesta} créditos)`,
        resultado: {
          fuente_tipo: 'el modo en el que el negocio pidió trabajar',
          piezas_en_espera: aProbar.map(p => ({ pieza: p.titulo, angulo: p.angulo || 'sin ángulo declarado' })),
          en_espera: `está en modo ${modo}: el motor no gasta créditos sin su OK, y probar cada pieza cuesta ${TARIFA.evaluarPieza}`,
          como_se_prueba: 'desde la tarjeta de la pieza, en Campañas: «Pasar por MiroFish»',
          fuente: 'MiroFish',
        },
      });
    } else if (saldo < cuesta) {
      tareas.push({
        agente: 'sol', orden: 13,
        que: `No alcanzan los créditos para probar ${aProbar.length === 1 ? 'la pieza' : `las ${aProbar.length} piezas`}: quedan ${saldo} y cuestan ${cuesta}`,
        resultado: {
          sin_fuente: 'sin créditos: la prueba no se hizo y las piezas quedan escritas igual',
          saldo, cuesta, piezas: aProbar.length,
          que_hacer: 'cargar créditos o cambiarse de plan: las piezas están listas y se prueban en cuanto haya saldo',
          fuente: 'MiroFish',
        },
      });
    } else {
      // El público tiene que existir para que la prueba sea de 500 y no de menos.
      const cuantos = await db.query('SELECT count(*)::int AS n FROM publico_agentes WHERE business_id = $1', [ctx.businessId]);
      if (cuantos.rows[0].n < 500) await crearPublico(db, ctx.businessId, ctx.zona);

      const probadas: {
        id: string; titulo: string; formato: string; angulo: string; puntaje: number; puesto: number;
        jueces: { juez: string; criterio: string; voto: number; opinion: string }[];
        reacciones: Record<string, number>; publico: unknown; prediccion: unknown;
      }[] = [];
      for (const pz of aProbar) {
        // Se le pasa la pieza CON lo que trae armado de su formato (sus tarjetas, su texto sobre la imagen):
        // los jueces juzgan lo que la pieza es, no una idea genérica.
        const r = await evaluarConMiroFish(db, ctx.businessId, {
          id: pz.id, titulo: pz.titulo, texto: pz.texto, formato: pz.formato, generacion: pz.generacion,
        }) as any;
        probadas.push({
          id: pz.id, titulo: pz.titulo, formato: pz.formato, angulo: pz.angulo,
          puntaje: Number(r.puntaje), puesto: Number(r.orden),
          jueces: (r.jueces ?? []) as { juez: string; criterio: string; voto: number; opinion: string }[],
          reacciones: (r.reacciones ?? {}) as Record<string, number>,
          publico: r.publico, prediccion: r.prediccion,
        });
      }
      // LA GANADORA: la del puntaje más alto. La eligen los votos, no una mano.
      const ranking = [...probadas].sort((a, b) => b.puntaje - a.puntaje);
      const gana = ranking[0];

      if (ronda) {
        const numero = Number((await db.query(
          'SELECT COALESCE(MAX(numero), 0) + 1 AS n FROM rondas WHERE business_id = $1', [ctx.businessId])).rows[0].n);
        await db.query(
          `INSERT INTO rondas (business_id, corrida_id, numero, piezas, evaluadas, ganadora_id, ganadora_puntaje, creditos, detalle)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
          [ctx.businessId, corridaId, numero, VARIANTES.length, probadas.length, gana.id, gana.puntaje,
            VARIANTES.length * TARIFA.crearPieza + cuesta,
            aJson({
              candidatas: ranking.map((pz, i) => ({
                puesto: i + 1, pieza: pz.titulo, angulo: pz.angulo, formato: pz.formato, puntaje: pz.puntaje,
              })),
            })],
        );
      }

      tareas.push({
        agente: 'sol', orden: 13,
        que: ronda
          ? `Votó la ronda: ${probadas.length} piezas distintas, cada una con su votación. Ganó «${gana.titulo.slice(0, 60)}» con ${gana.puntaje} de 100 (la ronda costó ${VARIANTES.length * TARIFA.crearPieza + cuesta} créditos)`
          : `Probó la pieza con los 5 jueces y los 500 del público: ${gana.puntaje} de 100, puesto ${gana.puesto} de su lote (costó ${cuesta} créditos)`,
        resultado: {
          fuente_tipo: 'los 5 jueces y los 500 agentes del público de este negocio, votando las piezas escritas',
          ...(ronda
            ? {
              es_una_ronda: true,
              candidatas: ranking.map((pz, i) => ({
                puesto: i + 1, pieza: pz.titulo, angulo: pz.angulo || 'sin ángulo declarado', formato: pz.formato,
                puntaje: pz.puntaje, puesto_en_el_lote: pz.puesto,
                lo_que_hizo_el_publico: pz.reacciones,
                los_cinco_jueces: pz.jueces.map(j => ({ juez: j.juez, criterio: j.criterio, voto: j.voto, opinion: j.opinion })),
                es_la_que_gana: pz.id === gana.id,
              })),
              gana: {
                pieza: gana.titulo, puntaje: gana.puntaje,
                porque: 'sacó el puntaje más alto de la ronda: la mezcla de los jueces (60%) y de lo que haría el público (40%)',
              },
            }
            : {
              pieza: gana.titulo, puntaje: gana.puntaje, puesto: gana.puesto,
              los_cinco_jueces: gana.jueces.map(j => ({ juez: j.juez, criterio: j.criterio, voto: j.voto, opinion: j.opinion })),
              lo_que_hizo_el_publico: gana.reacciones, publico: gana.publico, prediccion: gana.prediccion,
            }),
          creditos_gastados: cuesta,
          que_significa: 'El puntaje es la mezcla de los jueces (60%) y de lo que haría el público (40%). El puesto es su lugar entre las piezas ya probadas de este negocio.',
          donde_lo_ve_el_dueno: 'Campañas → la tarjeta de la pieza: el puntaje, los cinco jueces, lo que hizo el público y el desvío de la predicción',
          fuente: 'MiroFish · 5 jueces + 500 agentes del público',
        },
      });
    }
  } catch (e) {
    console.error('[mirofish] no se pudo probar la pieza:', (e as Error)?.message);
    tareas.push({
      agente: 'sol', orden: 13, que: 'No pudo probar la pieza con MiroFish y lo dice',
      resultado: { sin_fuente: `la prueba no se hizo: ${String((e as Error)?.message).slice(0, 160)}`, fuente: 'sin fuente: la prueba falló' },
    });
  }

  for (const t of tareas) {
    await db.query(
      `INSERT INTO tareas_corrida (corrida_id, agente, que, resultado, creditos, orden)
       VALUES ($1, $2, $3, $4::jsonb, 0, $5)`,
      [corridaId, t.agente, t.que, aJson(t.resultado), t.orden],
    );
  }

  // ---------------- LOS HALLAZGOS: solo de lo medido, cada uno con su fuente real ----------------
  const hallazgos: { tipo: string; titulo: string; dato: string; porque: string; fuente: string }[] = [];

  if (mapa.ok && mapa.conNombre > 0) {
    hallazgos.push({
      tipo: 'mercado',
      titulo: `Su mercado tiene ${mapa.conNombre} ${mapa.oficio} con nombre`,
      dato: `${mapa.conNombre} en ${mapa.ciudad}, sobre ${mapa.lugares} lugares mapeados`,
      porque: mapa.zonas.length
        ? `Se concentra en ${mapa.zonas.slice(0, 3).map(z => `${z.z} (${z.n})`).join(', ')}.`
        : 'Está repartido por toda la ciudad.',
      fuente: `OpenStreetMap · Overpass · ${mapa.url}`,
    });
  }
  if (mapa.ok && mapa.conNombre === 0) {
    hallazgos.push({
      tipo: 'mercado',
      titulo: 'El mapa no tiene cargado ningún negocio de su rubro en su ciudad',
      dato: `0 con nombre, ${mapa.lugares} lugares mapeados en ${mapa.ciudad}${mapa.porNombre ? ` (buscado por «${ctx.rubro}»)` : ''}`,
      porque: 'No es que el mercado no exista: es que OpenStreetMap no lo tiene cargado. La lista real se completa con la búsqueda web y la lectura de anuncios.',
      fuente: `OpenStreetMap · Overpass · ${mapa.url}`,
    });
  }
  if (lectura && lectura.fichas > 0) {
    hallazgos.push({
      tipo: 'mercado',
      titulo: `Su mercado tiene ${lectura.fichas} anuncios activos${lectura.dias >= 0 ? `: el más viejo lleva ${lectura.dias} días` : ''}`,
      dato: `${lectura.fichas} anuncios en ${lectura.paises} ${lectura.paises === 1 ? 'país' : 'países'} · ${lectura.anunciantes} anunciantes distintos${lectura.ejemplos.length ? ` · ${lectura.ejemplos.slice(0, 4).join(', ')}` : ''}`,
      porque: 'Es su categoría leída en la Biblioteca de Anuncios: quién está pautando y desde cuándo. Los que llevan meses son los que rinden.',
      fuente: 'Biblioteca de Anuncios de Meta · lectura del trabajador',
    });
  }
  if (mercado?.categoria_nueva) {
    hallazgos.push({
      tipo: 'categoria nueva',
      titulo: 'Su categoría todavía no existe en ese mercado: no hay con quién compararse',
      dato: `${mercado.total} anuncios leídos y ninguno de su categoría: nadie está pautando esto en ese mercado`,
      porque: 'No es falta de datos: es un negocio que va primero. Lo que sigue no es copiar una pieza — es crearla desde cero con lo que ya identificamos: su rubro, sus palabras clave y su material.',
      fuente: 'Biblioteca de Anuncios de Meta · lectura del trabajador',
    });
  } else if (mercado && mercado.comparables.length > 0) {
    hallazgos.push({
      tipo: 'mercado',
      titulo: `De todo su mercado, ${mercado.comparables.length} son comparables de verdad`,
      dato: `Los otros ${mercado.ruido} anuncios entraron por la palabra clave y no compiten con usted`,
      porque: 'Separar el ruido es lo que convierte una lista larga en una lista útil: contra esos sí vale compararse.',
      fuente: 'Biblioteca de Anuncios de Meta · lectura del trabajador',
    });
  }
  if (piezas.length) {
    const top = pauta[0];
    hallazgos.push({
      tipo: 'pauta',
      titulo: `El anuncio que más aguanta en su rubro lleva ${top?.dias} días activo`,
      dato: `${top?.anunciante} · ${top?.dias} días · sobre ${piezas.length} piezas leídas`,
      porque: 'Lo que se sostiene meses es lo que rinde: es el espejo contra el que se mide su pieza.',
      fuente: inf?.fuente || '',
    });
    hallazgos.push({
      tipo: 'pauta',
      titulo: `${conBoton.length} de ${piezas.length} piezas de su rubro cierran por botón`,
      dato: `botones: ${botones.join(', ') || 'ninguno'} · ${videos} en video, ${imagenes} en imagen`,
      porque: 'El cierre no se inventa: se elige el que el mercado ya usa y sostiene.',
      fuente: inf?.fuente || '',
    });
  }
  if (huecos.length) {
    hallazgos.push({
      tipo: 'hueco',
      titulo: `El hueco que nadie ocupa: ${huecos[0]?.titulo}`,
      dato: String(huecos[0]?.detalle || '').slice(0, 240),
      porque: String(huecos[0]?.como || 'Es lo que el cliente necesita y nadie le está respondiendo.').slice(0, 240),
      fuente: inf?.fuente || '',
    });
  }
  if (saturacion.length) {
    hallazgos.push({
      tipo: 'saturado',
      titulo: 'Lo que ya dicen todos en su rubro',
      dato: saturacion.slice(0, 3).join(' · '),
      porque: 'Competir por lo que ya dicen todos es perderse entre todos: sirve para no repetirlo.',
      fuente: inf?.fuente || '',
    });
  }
  if (creadoras.length) {
    hallazgos.push({
      tipo: 'creador',
      titulo: `Capa de creador de su rubro: ${creadoras[0]?.nivel}`,
      dato: String(creadoras[0]?.evidencia || creadoras[0]?.detalle || '').slice(0, 240),
      porque: 'Dice quién firma la prueba social en su rubro y en qué nivel está: clienta real, creadora contratada o marca con audiencia.',
      fuente: inf?.fuente || '',
    });
  }
  if (precios.length) {
    hallazgos.push({
      tipo: 'precio',
      titulo: `Precios que se ven en su mercado: ${precios[precios.length - 1]} a ${precios[0]}`,
      dato: `${precios.length} referencias publicadas: ${precios.slice(0, 5).join(' · ')}`,
      porque: 'Son precios que el propio mercado publica, no un promedio estimado.',
      fuente: inf?.fuente || '',
    });
  }
  if (nConv > 0) {
    hallazgos.push({
      tipo: 'conversacion',
      titulo: `${nConv} conversaciones del negocio, ${nMes} en los últimos 30 días`,
      dato: frases.length ? frases.slice(0, 3).map(f => `«${f.frase}» (${f.veces})`).join(' · ') : 'sin texto suficiente para sacar frases',
      porque: 'La pieza tiene que contestar sola lo que más se pregunta en el chat.',
      fuente: 'conversaciones del negocio',
    });
  }

  for (const h of hallazgos) {
    await db.query(
      `INSERT INTO hallazgos (business_id, tipo, titulo, dato, porque, fuente, corrida_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [ctx.businessId, h.tipo, h.titulo, h.dato, h.porque, h.fuente, corridaId],
    );
  }

  return {
    corrida_id: corridaId, tareas, hallazgos, creditos: 0,
    fuentes: {
      mapa: mapa.ok ? 'OpenStreetMap (Overpass + Nominatim)' : `sin mapa: ${mapa.falta}`,
      informe: inf ? `informe del mercado (${inf.origen === 'negocio' ? 'de este negocio' : inf.porque_aplica})` : 'sin informe del rubro todavía',
    },
  };
}

/** El desvío promedio de las últimas predicciones: es lo que corrige la próxima estimación. */
export async function desvioActual(db: Pool, businessId: string): Promise<number> {
  const r = await db.query(
    `SELECT COALESCE(AVG(desvio_pct), 0) AS d FROM (
       SELECT desvio_pct FROM predicciones
        WHERE business_id = $1 AND desvio_pct IS NOT NULL
        ORDER BY created_at DESC LIMIT 10) x`,
    [businessId],
  );
  return Math.round(Number(r.rows[0]?.d || 0) * 10) / 10;
}

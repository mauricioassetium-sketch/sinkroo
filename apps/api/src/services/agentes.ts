import type { Pool } from 'pg';
import { promptsDelInforme, guardarPrompts } from './prompts.js';

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

export type MapaReal =
  | { ok: true; ciudad: string; lugares: number; conNombre: number; nombres: string[]; zonas: { z: string; n: number }[]; oficio: string; url: string; caja: string; porNombre: boolean }
  | { ok: false; falta: string };

/**
 * EL MAPA REAL DEL MERCADO (Lux). Ubica la ciudad con Nominatim y le pide a Overpass todos los negocios
 * del rubro dentro de su caja. Devuelve el conteo, los nombres y las zonas donde se concentra. Nada de
 * esto es estimado: es lo que OpenStreetMap tiene cargado hoy, y se guarda la consulta exacta.
 */
export async function leerMapaReal(rubro: string, zona: string): Promise<MapaReal> {
  if (!String(zona || '').trim()) return { ok: false, falta: 'falta la ciudad o zona del negocio (se carga en Primeros pasos)' };

  let caja = '';
  let ciudad = zona;
  try {
    const geo = await pedirJson(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(zona)}`, 15000);
    const bb = Array.isArray(geo) && geo[0]?.boundingbox;
    if (bb && bb.length === 4) {
      // Nominatim devuelve [sur, norte, oeste, este]; Overpass quiere (sur,oeste,norte,este).
      caja = `${bb[0]},${bb[2]},${bb[1]},${bb[3]}`;
      ciudad = String(geo[0].display_name || zona).split(',')[0].trim() || zona;
    }
  } catch { /* si no ubica la ciudad, se dice abajo: no se estima un mercado sin caja */ }

  if (!caja) return { ok: false, falta: `no se pudo ubicar «${zona}» en el mapa: sin ciudad no se cuenta el mercado` };

  const mapa = filtrosDeRubro(rubro || '');
  const porNombre = mapa.filtros.length === 0;
  const palabra = (String(rubro || '').split(' ')[0] || '').replace(/[^a-záéíóúñ]/gi, '').toLowerCase();
  if (porNombre && palabra.length < 3) {
    return { ok: false, falta: 'no se sabe qué buscar en el mapa: falta el rubro del negocio y su descripción (Primeros pasos)' };
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
      if (intento) await new Promise(r => setTimeout(r, 3000));
      const datos = await pedirJson(url, 35000);
      const els = (datos?.elements ?? []) as any[];
      const conNombre = els.filter(e => (e.tags || {}).name);
      const nombres = [...new Set(conNombre.map(e => String(e.tags.name).trim()))];
      const cuenta = new Map<string, number>();
      for (const e of conNombre) {
        const z = String(e.tags['addr:suburb'] || e.tags['addr:city'] || e.tags['addr:neighbourhood'] || '(sin zona)');
        cuenta.set(z, (cuenta.get(z) || 0) + 1);
      }
      return {
        ok: true, ciudad, lugares: els.length, conNombre: nombres.length, nombres,
        zonas: [...cuenta.entries()].map(([z, n]) => ({ z, n })).sort((a, b) => b.n - a.n).slice(0, 6),
        oficio: mapa.oficio || `negocios que se llaman «${rubro}»`,
        url, caja: `(${caja})`, porNombre,
      };
    } catch (e) {
      ultimoError = String((e as Error).message || e).slice(0, 90);
    }
  }
  return { ok: false, falta: `OpenStreetMap no respondió en dos intentos (${ultimoError}): se reintenta en la próxima corrida` };
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
export async function correrInvestigacion(db: Pool, ctx: Contexto, motivo = 'investigacion') {
  const mapa = await leerMapaReal(ctx.rubro, ctx.zona);
  const inf = await informeDe(db, ctx);
  const piezas = piezasVivas(inf);
  const patron = (inf?.informe?.patron ?? []) as { k: string; v: string; s?: string }[];
  const huecos = (inf?.informe?.huecos ?? []) as any[];
  const creadoras = (inf?.informe?.creadoras ?? []) as any[];
  const saturacion = (inf?.informe?.saturacion ?? []) as string[];
  /** La analítica visual del mercado: colores, tipografía, encuadre y qué pega en cada plaza. */
  const av = (inf?.informe?.analitica_visual ?? null) as any;

  const corrida = await db.query(
    `INSERT INTO corridas (business_id, motivo, estado, creditos) VALUES ($1, $2, 'terminada', 0)
     RETURNING id, empezada_at`,
    [ctx.businessId, motivo],
  );
  const corridaId = corrida.rows[0].id;
  const tareas: { agente: string; que: string; resultado: Record<string, unknown>; orden: number }[] = [];

  // ---------------- LUX · el mercado (OpenStreetMap de verdad + el informe de piezas vivas) ----------------
  if (mapa.ok) {
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

  // ---------------- REX · la demanda y los precios ----------------
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

  // ---------------- IRIS · el arte: el prompt de generación de cada plaza ----------------
  // El sistema todavía no genera imagen ni video. Lo que sí hace, y es lo que el dueño pidió, es
  // entregar el PROMPT COMPLETO —colores, tipografía, formato, escenas, UGC o toma de producto— con la
  // traza de cómo se armó cada campo con lo que se midió en el mercado. Queda guardado como contrato:
  // el día que haya generador conectado, genera con esto.
  const paquete = promptsDelInforme(inf ?? {});
  let promptsGuardados = 0;
  if (paquete) {
    try { promptsGuardados = await guardarPrompts(db, ctx.businessId, paquete, corridaId); } catch { promptsGuardados = 0; }
  }
  const tipos = paquete ? [...new Set(paquete.prompts.map(p => p.tipo))].join(' y ') : '';
  tareas.push({
    agente: 'iris', orden: 8,
    que: paquete
      ? `Armó ${paquete.prompts.length} prompts de generación (${tipos}) con los colores, la tipografía, el formato y el estilo medidos en su mercado`
      : 'No pudo armar los prompts y lo dice: falta la analítica visual del rubro',
    resultado: paquete ? {
      fuente_tipo: 'la analítica visual del informe del mercado + la pieza propuesta (el hueco que se ataca)',
      pieza: paquete.pieza,
      guardados_en: 'la tabla de prompts del negocio (el contrato que leerá el generador)',
      guardados: promptsGuardados,
      prompts: paquete.prompts.map(p => ({
        plaza: p.plaza, tipo: p.tipo, estilo: p.estilo, proporcion: p.proporcion, duracion_s: p.duracion_s,
        colores: p.colores.paleta,
        tipografia: `${p.tipografia.familia} · ${p.tipografia.tratamiento} · ${p.tipografia.ubicacion}`,
        escenas: p.escenas.length,
        prompt: p.prompt,
        prompt_negativo: p.prompt_negativo,
        como_se_arma: p.como_se_arma,
        elegido_por_nosotros: p.elegido_por_nosotros,
        verificaciones: p.verificaciones,
      })),
      porque: 'Todavía no hay generador de imagen ni de video conectado: lo que sí se puede hacer hoy, y se hizo, es dejar el prompt completo y su traza. Cuando el generador exista, se genera con esto y no con una idea suelta.',
      falta: 'conectar el servicio de generación (hoy no hay ninguno escuchando)',
      fuente: inf?.fuente || '',
    } : {
      sin_fuente: 'falta la analítica visual del rubro (colores, tipografía, encuadre y plazas) para poder armar el prompt',
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
  const series: { anunciante: string; palabra: string; en_piezas: number; molde: string }[] = [];
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
  const tend = await leerTendencias(GEOS_TENDENCIA, palabras);
  const tocan = tend.temas.filter(t => t.toca_el_rubro);
  let recurrentes: { tema: string; dias: number }[] = [];
  try {
    const rr = await db.query(
      `SELECT tema, count(DISTINCT fecha)::int AS dias FROM tendencias
        WHERE tema = ANY($1::text[]) GROUP BY tema HAVING count(DISTINCT fecha) > 1 ORDER BY dias DESC, tema LIMIT 6`,
      [tend.temas.map(t => t.tema)]);
    recurrentes = rr.rows as any[];
  } catch { /* primera corrida: todavía no hay histórico de tendencias */ }
  try {
    for (const t of tend.temas) {
      await db.query(
        `INSERT INTO tendencias (business_id, geo, tema, alcance, toca_el_rubro, paises, fecha)
         VALUES ($1, $2, $3, $4, $5, $6, current_date)
         ON CONFLICT (business_id, tema, fecha) DO NOTHING`,
        [ctx.businessId, ctx.zona || '', t.tema, t.alcance, t.toca_el_rubro, t.paises]);
    }
  } catch { /* si el guardado falla, la tarea igual se entrega */ }

  tareas.push({
    agente: 'nova', orden: 9,
    que: piezas.length || tend.temas.length
      ? `Leyó ${piezas.length} formatos del mercado y ${tend.temas.length} temas que ${ctx.zona || 'el país'} está hablando hoy`
      : 'No pudo leer formatos ni tendencias y lo dice',
    resultado: {
      fuente_tipo: 'los formatos de las piezas vivas del informe + el RSS público de tendencias por país (CO, MX, AR, BR, ES, US)',
      formatos_del_mercado: [...formatos.entries()].map(([formato, n]) => ({ formato, piezas: n })).sort((a, b) => b.piezas - a.piezas),
      quien_repite_molde: repiteMolde,
      series_detectadas: series,
      temas_de_hoy: tend.temas.slice(0, 20).map(t => ({ tema: t.tema, paises: t.paises, alcance: t.alcance })),
      tocan_el_rubro: tocan.length ? tocan : 'ninguno de los temas de hoy toca su rubro (lo normal: las tendencias del día son noticia y deporte)',
      recurrentes_de_otros_dias: recurrentes.length ? recurrentes : 'primera corrida: el histórico empieza hoy (mañana ya se ve qué tema es de un día y qué tema sigue)',
      alcance_cultural: {
        local: tend.temas.filter(t => t.alcance.startsWith('local')).length,
        regional: tend.temas.filter(t => t.alcance.startsWith('regional')).length,
        global: tend.temas.filter(t => t.alcance.startsWith('global')).length,
        como_se_lee: 'sale de en qué países aparece el mismo tema: uno solo = local; varios de la región = regional; y si aparece también en España o Estados Unidos, no es cosa nuestra.',
      },
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

  for (const t of tareas) {
    await db.query(
      `INSERT INTO tareas_corrida (corrida_id, agente, que, resultado, creditos, orden)
       VALUES ($1, $2, $3, $4::jsonb, 0, $5)`,
      [corridaId, t.agente, t.que, JSON.stringify(t.resultado), t.orden],
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

import type { Pool } from 'pg';

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
export async function correrInvestigacion(db: Pool, ctx: Contexto) {
  const mapa = await leerMapaReal(ctx.rubro, ctx.zona);
  const inf = await informeDe(db, ctx);
  const piezas = piezasVivas(inf);
  const patron = (inf?.informe?.patron ?? []) as { k: string; v: string; s?: string }[];
  const huecos = (inf?.informe?.huecos ?? []) as any[];
  const creadoras = (inf?.informe?.creadoras ?? []) as any[];
  const saturacion = (inf?.informe?.saturacion ?? []) as string[];

  const corrida = await db.query(
    `INSERT INTO corridas (business_id, motivo, estado, creditos) VALUES ($1, 'investigacion', 'terminada', 0)
     RETURNING id, empezada_at`,
    [ctx.businessId],
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
    que: descripcion.length >= 20
      ? 'Armó el molde de escritura con las palabras del negocio y el patrón que gana en su rubro'
      : 'No pudo armar el molde y lo dice: falta que el negocio cuente qué hace',
    resultado: descripcion.length >= 20 ? {
      fuente_tipo: 'la descripción real del negocio + el patrón medido en su rubro',
      palabras_del_negocio: palabrasNegocio,
      palabras_de_la_industria: 'se evitan a propósito',
      formato_que_gana: patron.find(p => /formato/i.test(p.k))?.v || '',
      boton_que_gana: patron.find(p => /bot[oó]n/i.test(p.k))?.v || '',
      prueba_que_gana: patron.find(p => /prueba/i.test(p.k))?.v || '',
      gancho: 'El problema concreto del cliente, en la primera línea, sin nombrar el producto.',
      cuerpo: 'Qué cambia para el cliente, no qué tiene el producto.',
      cierre: 'La acción concreta, en un toque.',
      porque: 'Escribe con las palabras que el negocio ya usa y con el formato que su mercado ya premió, no con los de la industria.',
      fuente: 'su descripción (Primeros pasos)' + (inf ? ' + el informe de su rubro' : ''),
    } : {
      sin_fuente: 'falta la descripción del negocio (mínimo 20 caracteres, en Primeros pasos)',
      fuente: 'sin fuente',
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

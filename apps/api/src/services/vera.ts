import { existsSync, readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import type { Pool } from 'pg';

// =============================================================================================
// VERA · LA QUE ENTIENDE EL NEGOCIO
//
// Es el PRIMER paso de todo: antes de que el equipo salga a mirar el mercado, alguien tiene que
// entender QUÉ es el negocio. Hasta ahora eso se daba por sabido —se leía la descripción de Primeros
// pasos— y con eso no alcanza: el negocio entrega un PDF, su página, sus redes, y el rubro hay que
// deducirlo de ahí.
//
// QUÉ LEE (y con qué verdad):
//   · La descripción que el negocio escribió.
//   · Los enlaces que declaró (su página, sus redes): se pide la página y se lee su texto visible,
//     su título y su descripción. Sin navegador: una página que se arma con JavaScript se lee mal, y
//     eso se dice en la nota en vez de inventar contenido.
//   · Los archivos que subió: los de texto se leen tal cual; los PDF DE TEXTO se descomprimen y se
//     les sacan las cadenas (los escaneados son imágenes: no se pueden leer y se dice).
//
// QUÉ DEDUCE: el rubro en palabras que el mercado pueda buscar, el alcance (local, nacional, global),
// los lugares, qué hace, qué vende, a quién le vende y por qué canales. Cada deducción va con la
// SEÑAL que la sostiene, para que se pueda revisar de dónde salió.
//
// LO QUE NO HACE: no inventa. Si el material no alcanza para decir el rubro, lo dice y pide lo que
// falta. Y no pisa lo que el negocio ya escribió: solo rellena lo que está vacío.
// =============================================================================================

export type FuenteLeida = { tipo: string; nombre: string; leido: boolean; nota: string };

export type NegocioLeido = {
  /** El rubro, en las palabras con las que el mercado se busca. */
  rubro: string;
  /** Dónde vende: local (una ciudad), nacional (un país) o global (varias jurisdicciones). */
  alcance: 'local' | 'nacional' | 'global' | 'sin_determinar';
  /** Los lugares que nombra: ciudades, países, o «múltiples jurisdicciones». */
  lugares: string[];
  queHace: string;
  queVende: string[];
  aQuien: string;
  canales: string[];
  /** La prueba de cada deducción: la frase textual que la sostiene. */
  senales: string[];
  fuentes: FuenteLeida[];
  /** Lo que falta para poder investigar el mercado. */
  falta: string[];
};

/** Recorta un texto sin partir palabras: corta en el último espacio y avisa con puntos suspensivos. */
const recortar = (t: string, n = 90) => {
  const limpio = String(t || '').replace(/\s+/g, ' ').trim();
  if (limpio.length <= n) return limpio;
  const corte = limpio.lastIndexOf(' ', n);
  return `${limpio.slice(0, corte > 40 ? corte : n)}…`;
};

/** Parte el texto en pedazos de palabras, para buscar señales sin depender de mayúsculas ni tildes. */
const normal = (t: string) => String(t || '')
  .toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** Las señales de ALCANCE, de la más ancha a la más chica. Se busca en todo el material leído. */
const SENALES_ALCANCE: { alcance: NegocioLeido['alcance']; patrones: RegExp[]; porque: string }[] = [
  {
    alcance: 'global', porque: 'habla de varios países o de varias jurisdicciones',
    patrones: [/\bglobal(es)?\b/, /worldwide/, /internacional(es)?\b/, /multi-?jurisdiccion/, /varias jurisdicciones/,
      /latinoamerica/, /latam\b/, /europa/, /asia/, /estados unidos|\busa\b|\buae\b|\bdubai\b|\bdifc\b/,
      /en \d+ paises/, /operamos en/, /presencia en/],
  },
  {
    alcance: 'nacional', porque: 'habla del país entero',
    patrones: [/\bnacional(es)?\b/, /todo el pais/, /a nivel pais/, /envios? a todo/, /colombia/],
  },
  {
    alcance: 'local', porque: 'nombra una ciudad o una zona',
    patrones: [/\bmedellin\b/, /\bbogota\b/, /\bcali\b/, /\bbarranquilla\b/, /area metropolitana/, /mi barrio/, /la ciudad de/],
  },
];

/**
 * Lee una página web: su título, su descripción y su texto visible. Sin navegador — así se lee rápido
 * y sin depender de nada instalado—, con la contra de que una página armada con JavaScript sale pobre:
 * eso se dice en la nota, no se rellena.
 */
export async function leerPagina(url: string, ms = 15000): Promise<{ ok: boolean; titulo: string; descripcion: string; texto: string; nota: string }> {
  const limpia = String(url || '').trim();
  if (!/^https?:\/\//i.test(limpia)) return { ok: false, titulo: '', descripcion: '', texto: '', nota: 'el enlace no empieza con http' };
  try {
    const r = await fetch(limpia, {
      headers: { 'User-Agent': 'Sinkroo/1.0 (+https://sinkroo.com; info@sinkroo.com)', Accept: 'text/html' },
      signal: AbortSignal.timeout(Math.min(ms, 10000)),
    });
    if (!r.ok) return { ok: false, titulo: '', descripcion: '', texto: '', nota: `la página respondió ${r.status}` };
    const html = (await r.text()).slice(0, 400_000);
    const titulo = (html.match(/<title[^>]*>([\s\S]{0,300}?)<\/title>/i) || [])[1] || '';
    const descripcion = (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]{0,400}?)["']/i) || [])[1] || '';
    const texto = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&aacute;/g, 'á').replace(/&eacute;/g, 'é')
      .replace(/\s+/g, ' ').trim().slice(0, 6000);
    const nota = texto.length < 300 ? 'la página trae muy poco texto: puede armárse con JavaScript' : '';
    return { ok: true, titulo: titulo.trim(), descripcion: descripcion.trim(), texto, nota };
  } catch (e) {
    return { ok: false, titulo: '', descripcion: '', texto: '', nota: `no se pudo leer: ${String((e as Error).message).slice(0, 80)}` };
  }
}

/**
 * Lee un PDF DE TEXTO sin depender de nada instalado: se descomprimen sus flujos (zlib, que viene con
 * Node) y se sacan las cadenas de texto que el PDF dibuja. Los escaneados no tienen texto —son fotos
 * de papel— y ahí se dice que no se pudo leer, en vez de devolver vacío como si el archivo no dijera nada.
 */
export function leerPdf(ruta: string): { ok: boolean; texto: string; nota: string } {
  try {
    if (!existsSync(ruta)) return { ok: false, texto: '', nota: 'el archivo no está en el servidor' };
    const crudo = readFileSync(ruta);
    if (crudo.length > 12 * 1024 * 1024) {
      return { ok: false, texto: '', nota: `el PDF pesa ${Math.round(crudo.length / 1048576)} MB: el lector tiene tope de 12 MB, páselo a texto o súbalo más liviano` };
    }
    const partes: string[] = [];
    const arranque = Date.now();
    let i = 0, bloques = 0;
    // El lector NO puede colgar una corrida: se corta por cantidad de bloques y por tiempo.
    while (i < crudo.length && bloques < 80 && Date.now() - arranque < 4000) {
      const ini = crudo.indexOf('stream', i);
      if (ini < 0) break;
      let desde = ini + 'stream'.length;
      if (crudo[desde] === 0x0d) desde++;
      if (crudo[desde] === 0x0a) desde++;
      const fin = crudo.indexOf('endstream', desde);
      if (fin < 0) break;
      bloques++;
      const trozo = crudo.subarray(desde, fin);
      // Un flujo enorme no es texto: no se infla. Y nunca se lee un flujo de más de 600 KB.
      if (trozo.length <= 600_000) {
        let texto = '';
        try { texto = inflateSync(trozo).toString('latin1').slice(0, 300_000); }
        catch { texto = ''; }
        if (texto.includes('Tj') || texto.includes('TJ')) textoDibujado(texto, partes);
      }
      i = fin + 'endstream'.length;
    }
    const salida = partes.join(' ').replace(/\s+/g, ' ').trim();
    if (salida.length < 40) {
      return { ok: false, texto: '', nota: 'el PDF no trae texto legible: puede ser un escaneo (imágenes) y habría que pegar el texto a mano' };
    }
    return { ok: true, texto: salida.slice(0, 8000), nota: '' };
  } catch (e) {
    return { ok: false, texto: '', nota: `no se pudo leer el PDF: ${String((e as Error).message).slice(0, 80)}` };
  }
}

/** Lee los archivos del negocio que se puedan leer de verdad, y dice qué pasó con cada uno. */
export async function leerArchivos(db: Pool, businessId: string): Promise<{ texto: string; fuentes: FuenteLeida[] }> {
  const fuentes: FuenteLeida[] = [];
  let texto = '';
  try {
    const r = await db.query(
      `SELECT nombre, tipo, ruta FROM archivos WHERE business_id = $1 ORDER BY created_at DESC LIMIT 12`, [businessId]);
    for (const f of r.rows as { nombre: string; tipo: string; ruta: string }[]) {
      const nombre = String(f.nombre || 'archivo');
      const tipo = String(f.tipo || '').toLowerCase();
      const ruta = String(f.ruta || '');
      if (tipo.includes('pdf') || nombre.toLowerCase().endsWith('.pdf')) {
        const leido = leerPdf(ruta);
        if (leido.ok) { texto += `\n[${nombre}]\n${leido.texto}`; fuentes.push({ tipo: 'pdf', nombre, leido: true, nota: '' }); }
        else fuentes.push({ tipo: 'pdf', nombre, leido: false, nota: leido.nota });
      } else if (tipo.startsWith('text/') || /\.(txt|md|csv|json)$/i.test(nombre)) {
        try {
          texto += `\n[${nombre}]\n${readFileSync(ruta, 'utf8').slice(0, 8000)}`;
          fuentes.push({ tipo: 'texto', nombre, leido: true, nota: '' });
        } catch { fuentes.push({ tipo: 'texto', nombre, leido: false, nota: 'no se pudo abrir en el servidor' }); }
      } else {
        fuentes.push({
          tipo: tipo || 'archivo', nombre, leido: false,
          nota: tipo.includes('image') ? 'es una imagen: se puede evaluar cuando el material se mire con visión, pero de él no sale texto'
            : tipo.includes('video') ? 'es un video: no se lee texto de él'
              : 'por ahora solo se leen los PDF de texto y los archivos de texto (Word y Excel vienen comprimidos: hay que subirlos en PDF o pegar el texto)',
        });
      }
    }
  } catch (e) {
    fuentes.push({ tipo: 'archivos', nombre: '(los del negocio)', leido: false, nota: `no se pudieron listar: ${String((e as Error).message).slice(0, 60)}` });
  }
  return { texto, fuentes };
}

/**
 * EL VOCABULARIO DEL NEGOCIO. Además de las palabras que más se repiten en el material entregado, se
 * busca el vocabulario de los negocios que no son de barrio: tecnología, activos digitales, regulación.
 * Un negocio de tokenización no se entiende con un catálogo de oficios locales: se entiende por sus
 * PALABRAS CLAVE, y con esas palabras se busca su categoría y quiénes hacen lo mismo en el mundo.
 */
const VOCABULARIO: string[] = [
  'tokenizacion', 'tokenizar', 'rwa', 'real world assets', 'activos del mundo real', 'web3', 'web 3',
  'blockchain', 'gemelos digitales', 'digital twin', 'security token', 'stablecoin', 'defi', 'nft',
  'depin', 'custodia', 'kyc', 'aml', 'compliance', 'regulacion', 'mica', 'vara', 'difc', 'tokens',
  'infraestructura', 'verificacion', 'trazabilidad', 'oraculos', 'smart contracts', 'contratos inteligentes',
  'inteligencia artificial', 'machine learning', 'saas', 'api', 'marketplace', 'logistica', 'energia',
  'carbono', 'inmobiliario', 'commodities', 'oro', 'mineria', 'seguros', 'banca', 'pagos', 'remesas',
];

/** Las palabras cortas que no dicen nada: se descartan al buscar los términos propios del negocio. */
const VACIAS = new Set(['para', 'como', 'con', 'los', 'las', 'del', 'que', 'una', 'unos', 'unas', 'por',
  'sus', 'este', 'esta', 'estos', 'estas', 'desde', 'entre', 'sobre', 'hacia', 'todo', 'toda', 'todos',
  'todas', 'mas', 'menos', 'muy', 'sin', 'son', 'ser', 'esta', 'estan', 'hace', 'hacen', 'puede', 'pueden',
  'nuestro', 'nuestra', 'clientes', 'empresa', 'negocio', 'servicio', 'servicios', 'producto', 'productos',
  // Los nombres de las entidades HTML no son palabras: cuando la página trae «&middot;», el lector se queda
  // con «middot» y eso no puede salir como palabra clave del negocio.
  'middot', 'nbsp', 'quot', 'amp', 'apos', 'rsquo', 'lsquo', 'ldquo', 'rdquo', 'hellip', 'ndash', 'mdash',
  'aacute', 'eacute', 'iacute', 'oacute', 'uacute', 'ntilde', 'laquo', 'raquo', 'bull', 'thinsp', 'shy']);

/** Las palabras clave del negocio: las del vocabulario que aparecen, más las que más se repiten. */
export function palabrasClave(texto: string, cuantas = 12): { palabra: string; de: string }[] {
  const t = normal(texto);
  const encontradas: { palabra: string; de: string }[] = VOCABULARIO
    .filter(v => t.includes(v))
    .map(v => ({ palabra: v, de: 'el vocabulario del rubro' }));
  const cuenta = new Map<string, number>();
  for (const w of t.split(/[^a-z0-9áéíóúñ]+/)) {
    if (w.length < 6 || VACIAS.has(w)) continue;
    cuenta.set(w, (cuenta.get(w) || 0) + 1);
  }
  const propias = [...cuenta.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([palabra]) => ({ palabra, de: 'el material del negocio' }));
  const vistas = new Set<string>();
  return [...encontradas, ...propias].filter(p => !vistas.has(p.palabra) && (vistas.add(p.palabra), true)).slice(0, cuantas);
}

/**
 * LA CATEGORÍA DEL NEGOCIO, en la enciclopedia abierta. Se prueba el término en español primero y, si
 * no hay nada, en inglés: un negocio de tokenización se explica igual en los dos idiomas.
 */
export async function leerWikipedia(termino: string): Promise<{ ok: boolean; titulo: string; resumen: string; url: string; idioma: string; nota: string }> {
  const limpio = String(termino || '').trim().replace(/\s+/g, '_');
  if (!limpio) return { ok: false, titulo: '', resumen: '', url: '', idioma: '', nota: 'sin término que buscar' };
  for (const idioma of ['es', 'en']) {
    try {
      const r = await fetch(`https://${idioma}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(limpio)}`, {
        headers: { 'User-Agent': 'Sinkroo/1.0 (+https://sinkroo.com; info@sinkroo.com)', Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) continue;
      const j = await r.json() as { title?: string; extract?: string; content_urls?: { desktop?: { page?: string } } };
      if (j?.extract) {
        return { ok: true, titulo: String(j.title || ''), resumen: String(j.extract).slice(0, 700),
          url: j.content_urls?.desktop?.page || `https://${idioma}.wikipedia.org/wiki/${limpio}`, idioma, nota: '' };
      }
    } catch { /* se prueba el otro idioma */ }
  }
  return { ok: false, titulo: '', resumen: '', url: '', idioma: '', nota: `no hay artículo para «${termino}»` };
}

/**
 * QUIÉNES SON SIMILARES. Se buscan entidades abiertas —organizaciones, proyectos, estándares— con el
 * nombre del concepto y de las palabras clave. Sale de Wikidata, que es abierta y no pide clave: lo que
 * devuelve son organizaciones con nombre, y cada una se puede mirar.
 */
export async function buscarSimilares(termino: string, cuantas = 6): Promise<{ nombre: string; que: string; url: string }[]> {
  try {
    const r = await fetch(`https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(termino)}&language=es&uselang=es&limit=${cuantas}&format=json&origin=*`, {
      headers: { 'User-Agent': 'Sinkroo/1.0 (+https://sinkroo.com; info@sinkroo.com)', Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return [];
    const j = await r.json() as { search?: { id: string; label?: string; description?: string }[] };
    return (j.search || []).filter(x => x.label).map(x => ({
      nombre: String(x.label), que: String(x.description || '').slice(0, 120),
      url: `https://www.wikidata.org/wiki/${x.id}`,
    }));
  } catch { return []; }
}

/**
 * ¿EL ARTÍCULO HABLA DE ESTA FAMILIA DE NEGOCIOS? Sin esta comprobación, «rwa» devuelve el artículo de un
 * pueblo de Tanzania y eso se muestra como si fuera la categoría del negocio. Se exige que el resumen
 * tenga palabras del rubro y que no sea de otra cosa (etnias, días, películas, plantas…).
 */
export function categoriaPertinente(resumen: string, termino: string): boolean {
  const t = normal(resumen);
  const propio = normal(termino).split(' ')[0];
  const acepta = ['activo', 'token', 'blockchain', 'digital', 'financ', 'tecnolog', 'invers', 'mercado',
    'propiedad', 'energ', 'carbono', 'verific', 'infraestructura', 'regulacion', 'contrato inteligente'];
  const rechaza = ['etnia', 'grupo etnico', 'bantu', 'dia de la semana', 'pelicula', 'cancion', 'album',
    'lengua', 'idioma', 'pueblo indigena', 'planta', 'animal', 'deporte', 'futbol', 'vehiculo'];
  return propio.length > 1 && t.includes(propio) && acepta.some(a => t.includes(a)) && !rechaza.some(r => t.includes(r));
}

/** ¿Esa entidad de Wikidata es del rubro? Se exige que su propia descripción lo diga. */
export function similarPertinente(que: string): boolean {
  const t = normal(que);
  return ['empresa', 'organizacion', 'protocolo', 'plataforma', 'tecnolog', 'blockchain', 'estandar',
    'proyecto', 'compania', 'sociedad', 'startup', 'fundacion', 'servicio', 'sistema'].some(a => t.includes(a));
}

/** Los rubros del mapa de oficios: se busca cuál aparece en el material, con la frase que lo delató. */
const OFICIOS: { rubro: string; palabras: string[] }[] = [
  { rubro: 'belleza · keratina y alisados', palabras: ['keratina', 'alisado', 'peluqueria', 'salon de belleza', 'estilista', 'cabello', 'barberia'] },
  { rubro: 'florería y flores a domicilio', palabras: ['floristeria', 'flores', 'ramos', 'arreglos florales'] },
  { rubro: 'gimnasios y entrenamiento', palabras: ['gimnasio', 'entrenamiento', 'fitness', 'crossfit', 'pesas'] },
  { rubro: 'restaurantes y comidas', palabras: ['restaurante', 'menu', 'cocina', 'domicilio de comida', 'cafeteria'] },
  { rubro: 'ropa y calzado', palabras: ['ropa', 'moda', 'boutique', 'calzado', 'prendas'] },
  { rubro: 'tecnología y software', palabras: ['software', 'tecnologia', 'plataforma', 'sistema', 'app', 'inteligencia artificial', 'saas'] },
  { rubro: 'salud y clínicas', palabras: ['clinica', 'consultorio', 'odontolog', 'medicina', 'pacientes', 'tratamiento medico'] },
  { rubro: 'inmobiliaria y finca raíz', palabras: ['inmobiliaria', 'apartamento', 'arriendo', 'finca raiz', 'propiedades'] },
  { rubro: 'servicios profesionales y consultoría', palabras: ['consultoria', 'asesoria', 'servicios profesionales', 'auditoria', 'legal', 'contab'] },
  { rubro: 'marketing y publicidad', palabras: ['marketing', 'publicidad', 'campañas', 'anuncios', 'agencia'] },
];

/**
 * Saca las cadenas que el PDF dibuja, con un recorrido LINEAL. La versión anterior usaba expresiones
 * regulares con cuantificadores anidados: con un PDF grande se quedaba pegada y colgaba la corrida
 * entera (medido: más de 5 minutos sin terminar). Esta versión recorre el texto una sola vez.
 */
function textoDibujado(s: string, partes: string[]) {
  const fin = Math.min(s.length, 300_000);
  let i = 0;
  while (i < fin) {
    if (s[i] !== '(') { i++; continue; }
    let k = i + 1;
    let out = '';
    let cerrado = false;
    while (k < fin && out.length < 3000) {
      const c = s[k];
      if (c === '\\') { k++; if (k < fin && (s[k] === '(' || s[k] === ')' || s[k] === '\\')) out += s[k]; else out += ' '; k++; continue; }
      if (c === ')') { cerrado = true; break; }
      out += c; k++;
    }
    if (cerrado && out.trim()) partes.push(out.trim());
    i = k + 1;
    if (partes.length > 4000) return;
  }
}

/**
 * Deduce el negocio con todo lo leído. Cada cosa que afirma va con la señal textual que la sostiene:
 * sin señal, no se afirma.
 */
export function deducirNegocio(d: {
  nombre: string; descripcion: string; rubroDeclarado: string; zona: string; material: string;
  paginas: { url: string; titulo: string; descripcion: string; texto: string; ok: boolean; nota: string }[];
}): NegocioLeido {
  const todo = normal([d.nombre, d.descripcion, d.rubroDeclarado, d.zona, d.material,
    ...d.paginas.map(p => `${p.titulo} ${p.descripcion} ${p.texto}`)].join(' \n '));
  // Los PDF traen el texto con las letras separadas por espacios («G l ob a l»), así que se busca en el
  // texto tal cual y también sin ningún espacio: sin esto, una palabra clave del PDF no se encuentra.
  const sinEspacios = todo.replace(/\s+/g, '');
  const hay = (p: RegExp) => { p.lastIndex = 0; return p.test(todo) || (p.lastIndex = 0, p.test(sinEspacios)); };
  const senales: string[] = [];

  // 1) El rubro: primero lo que el negocio declaró; si no, el oficio que más aparece en el material.
  let rubro = String(d.rubroDeclarado || '').trim();
  if (!rubro) {
    const puntajes = OFICIOS.map(o => ({ ...o, n: o.palabras.filter(p => todo.includes(normal(p)) || sinEspacios.includes(normal(p).replace(/\s+/g, ''))).length }))
      .filter(o => o.n > 0).sort((a, b) => b.n - a.n);
    if (puntajes.length) {
      const delator = puntajes[0].palabras.find(p => todo.includes(normal(p)) || sinEspacios.includes(normal(p).replace(/\s+/g, ''))) || puntajes[0].palabras[0];
      // Con DOS o más señales del mismo oficio, el catálogo es confiable. Con UNA sola, no: cualquier
      // texto que mencione «legal» no convierte al negocio en una consultoría. En ese caso manda la
      // descripción propia, que es lo que el negocio dice de sí mismo.
      const propia = String(d.descripcion || '').trim() || d.paginas.find(p => p.ok)?.titulo || '';
      if (puntajes[0].n >= 2 || !propia) {
        rubro = puntajes[0].rubro;
        senales.push(`el rubro sale del material: aparece «${delator}» (${puntajes[0].n} ${puntajes[0].n === 1 ? 'señal' : 'señales'} de ese oficio)`);
        if (puntajes.length > 1) senales.push(`también aparecen señales de «${puntajes[1].rubro}» (${puntajes[1].n})`);
      } else {
        rubro = recortar(propia, 90);
        senales.push(`el catálogo solo acertó con una palabra («${delator}»), así que gana lo que el negocio declara: «${rubro.slice(0, 60)}»`);
      }
    }
  } else {
    senales.push(`el rubro lo declaró el negocio: «${rubro}»`);
  }

  // 1 bis) Si no está en el catálogo, el rubro se dice con las palabras del negocio: sirve igual para
  // buscar en el mercado y es lo único honesto que se puede afirmar cuando el oficio no es de la lista.
  if (!rubro) {
    const propio = String(d.descripcion || '').trim() || d.paginas.find(p => p.ok)?.titulo || '';
    if (propio) {
      rubro = recortar(propio, 90);
      senales.push(`el oficio no está en el catálogo conocido: el rubro se toma de lo que el negocio declara («${rubro.slice(0, 60)}…»)`);
    }
  }

  // 2) El alcance: la señal más ancha que aparezca, con su frase.
  let alcance: NegocioLeido['alcance'] = 'sin_determinar';
  for (const s of SENALES_ALCANCE) {
    const golpe = s.patrones.find(p => hay(p));
    if (golpe) { alcance = s.alcance; senales.push(`el alcance es ${s.alcance} porque ${s.porque} (aparece «${String(golpe).replace(/[\\^$]/g, '')}»)`); break; }
  }
  if (alcance === 'sin_determinar' && String(d.zona || '').trim()) {
    alcance = 'local';
    senales.push(`el alcance se toma como local por la zona declarada: «${d.zona}»`);
  }

  // 3) Los lugares que nombra.
  const lugares = [...new Set((todo.match(/\b(medellin|bogota|cali|barranquilla|colombia|mexico|chile|peru|argentina|espana|estados unidos|usa|uae|dubai|panama|ecuador)\b/g) || [])
    .map(x => x[0].toUpperCase() + x.slice(1)))];

  // 4) Los canales que se ven en el material.
  const canales = [
    /whatsapp|wha\.me|api\.whatsapp/.test(todo) ? 'WhatsApp' : '',
    /instagram/.test(todo) ? 'Instagram' : '',
    /facebook/.test(todo) ? 'Facebook' : '',
    /tiktok/.test(todo) ? 'TikTok' : '',
    /youtube/.test(todo) ? 'YouTube' : '',
    /linkedin/.test(todo) ? 'LinkedIn' : '',
    /pagina web|sitio web|www\.|\.com|\.co\b/.test(todo) ? 'página propia' : '',
  ].filter(Boolean);
  if (canales.length) senales.push(`los canales salen del material: ${canales.join(', ')}`);

  // 5) Qué vende: las palabras de producto que aparecen, ENTERAS. No se acepta cualquier continuación (plan
  //    + etario = «planetary», plan + ts = «plants»): la palabra tiene que estar escrita así, o en plural.
  //    OJO con el plural: «planes?» quiere decir «plane» + s opcional, no «plan»/«planes» — va «plan(es)?».
  const queVende = [...new Set((todo.match(/\b(plan(es)?|servicio(s)?|producto(s)?|curso(s)?|membresia(s)?|suscripcion(es)?|certificacion(es)?|paquete(s)?|tratamiento(s)?|arreglo(s)?|sistema(s)?|plataforma(s)?|software(s)?)\b/g) || []).slice(0, 6))];

  const falta: string[] = [];
  if (!rubro) falta.push('el rubro: no aparece con claridad en el material entregado');
  if (alcance === 'sin_determinar') falta.push('dónde vende: no dice si es una ciudad, un país o varias jurisdicciones');
  if (!d.descripcion) falta.push('la descripción del negocio en Primeros pasos (una o dos frases de qué hace)');

  return {
    rubro,
    alcance,
    lugares,
    queHace: d.descripcion ? d.descripcion.slice(0, 400) : (d.paginas.find(p => p.ok)?.descripcion || '').slice(0, 400),
    queVende,
    aQuien: (todo.match(/\b(clientes|pacientes|empresas|profesionales|estudiantes|hombres|mujeres|familias|negocios|emprendedores)\b/g) || [])[0] || '',
    canales,
    senales,
    fuentes: [],
    falta,
  };
}

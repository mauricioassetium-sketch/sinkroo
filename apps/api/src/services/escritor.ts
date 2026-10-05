import { lineasInfilmables, esElBoton, sePuedeFilmar } from './tangibilidad.js';
// =============================================================================================
// EL ESCRITOR — el copy lo escribe un modelo, no una plantilla.
//
// POR QUÉ EXISTE ESTE ARCHIVO
// Hasta acá, el texto de una pieza se ARMABA: se cortaban frases del material del negocio y se pegaban en
// orden (gancho, cuerpo, cierre). El resultado se veía en el panel: renglones corridos sin puntos, con el
// mismo pedazo repetido dos veces y todas las piezas diciendo lo mismo. Eso no es escribir: es recortar.
//
// El dueño lo dijo sin vueltas: «el texto de las piezas sigue siendo flaco». Así que ahora hay un paso que
// ESCRIBE, con las reglas del producto metidas en el encargo:
//
//   · Frases cortas, con punto. Una idea por línea: es lo que se dice en voz alta y lo que se lee en pantalla.
//   · Se escribe desde el ÁNGULO medido del mercado (el hueco que nadie más está llenando), no desde el
//     catálogo del negocio. Dos piezas con ángulos distintos tienen que decir cosas distintas.
//   · Los términos que el mercado usa se quedan como están (no se traducen ni se «mejoran»).
//   · NADA que no esté en el material: ni cifras, ni promesas, ni resultados, ni clientes que no nombró.
//   · El idioma es el del mercado, no el nuestro.
//
// SI EL MODELO NO RESPONDE, la pieza queda con el texto armado de siempre y lo DICE (`fuente_del_texto`).
// Una pieza sin copy no existe; una pieza con el copy flojo pero declarado, sí.
// =============================================================================================

import { readFileSync } from 'node:fs';

const BASE = process.env.MODELO_URL || 'https://api.deepseek.com/v1/chat/completions';
const MODELO = process.env.MODELO_TEXTO || 'deepseek-chat';
const ARCHIVO_LLAVES = process.env.LLAVES_GENERACION || '/etc/sinkroo/claves-generacion.env';

/** La llave del modelo: primero el entorno del back, después el archivo de llaves (solo root). */
let cache: string | null | undefined;
function llaveDelModelo(): string | undefined {
  if (process.env.DEEPSEEK_API_KEY) return process.env.DEEPSEEK_API_KEY;
  if (cache === undefined) {
    cache = null;
    try {
      for (const linea of readFileSync(ARCHIVO_LLAVES, 'utf8').split('\n')) {
        const i = linea.indexOf('=');
        if (i > 0 && linea.slice(0, i).trim() === 'DEEPSEEK_API_KEY') cache = linea.slice(i + 1).trim().replace(/^"|"$/g, '');
      }
    } catch { /* sin archivo de llaves: no hay modelo */ }
  }
  return cache ?? undefined;
}

export const hayEscritor = () => Boolean(llaveDelModelo());

export type CopyEscrito = {
  /** Las líneas que hubo que reparar por no poder filmarse, ya reescritas (queda para el registro). */
  reparadas?: string[];
  titulo: string;
  gancho: string;
  /** Las líneas del guion, EN ORDEN: cada una es un renglón que se dice. Es la base de los planos. */
  lineas: string[];
  cierre: string;
  /** Por qué esta pieza dice lo que dice: el ángulo del mercado que se usó. Se guarda con la pieza. */
  por_que: string;
  /** Lo que el modelo declara que NO pudo usar por falta de material. Sin vergüenza: es un dato. */
  falta_material: string[];
};

/** El encargo. Las reglas del producto van acá adentro, no como adorno: son la diferencia con lo anterior. */
function elEncargo(d: {
  negocio: { nombre: string; queHace: string; ofrece: string[]; zona: string };
  angulo: string; huecoDelMercado: string; formato: string; esVideo: boolean;
  aQuien: string; objetivo: string; boton: string; tono: string; idioma: string;
  terminosDelMercado: string[]; referencia: string; material: string;
}): string {
  return [
    'Escriba el copy de UNA pieza publicitaria. Devuelva SOLO un JSON, sin texto alrededor.',
    '',
    'EL NEGOCIO (lo único que se sabe de él; nada de esto se inventa ni se completa):',
    `· Nombre: ${d.negocio.nombre}`,
    `· Qué hace: ${d.negocio.queHace}`,
    `· Lo que ofrece: ${d.negocio.ofrece.slice(0, 6).join(' | ') || 'no lo declaró'}`,
    `· Dónde: ${d.negocio.zona}`,
    `· Material que el dueño subió: ${d.material || 'sin material cargado'}`,
    '',
    'LA PIEZA:',
    `· Formato: ${d.formato}${d.esVideo ? ' — es un video que se dice en voz alta, escena por escena' : ''}`,
    `· A quién le habla: ${d.aQuien}`,
    `· Qué quiere lograr: ${d.objetivo}`,
    `· El botón (así termina): ${d.boton}`,
    `· Tono declarado por el dueño: ${d.tono || 'sin declarar'}`,
    `· Idioma: ${d.idioma}. No traduzca del idioma del mercado.`,
    d.terminosDelMercado.length
      ? `· Estas palabras son del mercado y se usan TAL CUAL, sin traducir: ${d.terminosDelMercado.slice(0, 8).join(', ')}`
      : '',
    '',
    'EL ÁNGULO — de acá sale de qué habla esta pieza, y es lo que la hace distinta de las otras:',
    d.angulo || 'el hueco medido del mercado',
    d.huecoDelMercado ? `Lo que NADIE de su mercado está diciendo en sus anuncios: ${d.huecoDelMercado}` : '',
    d.referencia ? `Como referencia, un anuncio real de su mercado (NO se copia, sólo para saber el nivel): ${d.referencia}` : '',
    '',
    'CÓMO SE ESCRIBE (esto se revisa; si no se cumple, la pieza no sirve):',
    '1. Frases CORTAS y con punto. Una idea por frase. Nada de renglones corridos.',
    '2. Las líneas van en el orden en que se dicen: la primera frena (es el problema del cliente, en sus palabras), las del medio muestran qué cambia con esto, y la última es el botón.',
    d.esVideo
      ? '3. Devuelva entre 4 y 6 líneas. Cada línea es una escena del video: tiene que poder verse algo distinto en cada una. TODO el guion se dice en voz alta en 30 segundos: no pase de unos 330 caracteres contando la primera línea y el cierre (si se pasa, la voz no entra en la pieza).'
      : '3. Devuelva entre 2 y 4 líneas.',
    // LA REGLA DE TANGIBILIDAD (manual, capa 1): sin esto la pieza habla de «trazabilidad» y «soberanía» y no
    // hay NADA que filmar. Medido: el guion salía con «el problema es que no hay una forma común de verificar
    // el grado de soberanía de cada activo» y el motor de imagen terminaba pintando una mesa con frascos.
    '4. TANGIBILIDAD: cada línea tiene que poder FILMARSE, la primera y la última incluidas. Escriba la acción o el lugar concreto que se ve —quien mide, revisa, carga, camina, inspecciona; una torre, un muelle, una mina, un campo, una bodega—, no el concepto. Si la línea habla de una idea (soberanía, trazabilidad, eficiencia, confianza), no sirve: cámbiela por lo que se ve cuando esa idea funciona. Medido: «toda esa evidencia queda escrita en una historia que ya no se puede reescribir» no se puede filmar; «un satélite pasa sobre su torre cada hora» sí.',
    '5. NADA de cifras, porcentajes, precios, plazos, clientes ni resultados: no están en el material y no se inventan.',
    '6. NADA de promesas de rendimiento ni de dinero. Nada de «el mejor», «líder», «único».',
    '7. Ninguna frase repite a otra. Si dos líneas dicen lo mismo, sobra una.',
    '8. Se le habla al cliente de usted, no al negocio. Y no se nombra a Sinkroo.',
    '',
    'DEVUELVA ESTE JSON EXACTO:',
    '{"titulo": "el gancho, recortado a 60 caracteres, sin dos puntos al final",',
    ' "gancho": "la primera línea, la que frena",',
    ' "lineas": ["línea 1", "línea 2", "..."],',
    ' "cierre": "la última línea, con la acción concreta",',
    ' "por_que": "en una frase, el ángulo del mercado que usó esta pieza",',
    ' "falta_material": ["qué le habría hecho falta para escribir mejor, si le faltó algo"]}',
  ].filter(Boolean).join('\n');
}

/**
 * LA ESCENA EN INGLÉS — el prompt visual que estos motores SÍ leen.
 *
 * La escena sale del material del negocio, en español («una peluquera baña a un perro pequeño en una tina»).
 * El codificador de texto de los generadores de imagen lee inglés: medido con la misma semilla, la muestra
 * con la acción en español **no traía a la persona** (salía un perro solo en una tina) y la que la llevaba en
 * inglés sí. Acá se traduce la ESCENA, no el negocio: se pide una línea descriptiva, sin adjetivos de venta,
 * sin texto en la imagen y sin inventar lo que no está.
 *
 * Devuelve null si no hay llave o el modelo no responde: quien llama se queda con la escena en español y lo
 * declara (la pieza no puede fingir que el motor recibió inglés).
 */
const cacheEscenas = new Map<string, string>();
/** Los vectores de movimiento, por escena y cámara: la misma pieza no los pide dos veces. */
const cacheMovimientos = new Map<string, string>();
export async function escenaEnIngles(escena: string, timeoutMs = 25_000): Promise<string | null> {
  const texto = String(escena || '').replace(/\s+/g, ' ').trim().slice(0, 400);
  if (texto.length < 8) return null;
  const enCache = cacheEscenas.get(texto);
  if (enCache) return enCache;
  const llave = llaveDelModelo();
  if (!llave) return null;
  try {
    const r = await fetch(BASE, {
      method: 'POST',
      headers: { Authorization: `Bearer ${llave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODELO,
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content: 'You translate a Spanish description of a photo/film scene into English for an image '
              + 'generator. Describe only what is visible: who does what, where, with which objects. '
              // LA CÁMARA ES PARTE DE LA ESCENA. Antes esta orden decía «no camera talk» y borraba justamente lo
              // que hace cinematográfica a la toma: medido, un plano de 412 caracteres con «medium shot, golden
              // hour side light, fine grain, Kodak 2383 grade» llegaba al motor como 298 caracteres SIN una
              // sola palabra de cámara. La especificación se perdía en la traducción.
              + 'KEEP, translated as-is, every camera, lens, framing, lighting, time-of-day and film-grading term '
              + '(shot size, focal length, camera movement, light direction, grain, colour grade). They are part '
              + 'of the scene, not decoration. '
              + 'Do not add selling words, quality words, text in the image, brands or logos. '
              + 'Do not invent people, places or objects that are not in the description. Answer with the line only.',
          },
          { role: 'user', content: texto },
        ],
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { choices?: { message?: { content?: string } }[] };
    // 900 y no 300: la traducción de un plano de cine mide 400-700 caracteres (tamaño, óptica, movimiento,
    // luz, lugar, quién hace qué, etalonaje) y con 300 se perdía el final, que es donde van luz y etalonaje.
    const en = String(j.choices?.[0]?.message?.content || '').replace(/["'`\n]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 900);
    if (en.length < 10) return null;
    cacheEscenas.set(texto, en);
    return en;
  } catch { return null; }
}

/**
 * Escribe el copy de una pieza. Devuelve null si no hay llave, si el modelo no responde o si lo que devolvió
 * no pasa la revisión (JSON roto, líneas de más, cifras inventadas). Nunca lanza.
 */
/**
 * Una llamada corta al modelo, para las reparaciones y para las tareas que no llevan el encargo largo (el
 * rastreo de la demanda). Devuelve el JSON ya leído, o null si no hay llave o el modelo no respondió.
 */
export async function pedirJson(sistema: string, usuario: string, timeoutMs: number): Promise<Record<string, unknown> | null> {
  const llave = llaveDelModelo();
  if (!llave) return null;
  try {
    const r = await fetch(BASE, {
      method: 'POST',
      headers: { Authorization: `Bearer ${llave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODELO, temperature: 0.6, response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: sistema }, { role: 'user', content: usuario }],
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { choices?: { message?: { content?: string } }[] };
    return JSON.parse(j.choices?.[0]?.message?.content || '{}') as Record<string, unknown>;
  } catch { return null; }
}

/**
 * EL VECTOR DE MOVIMIENTO — qué hace el cuerpo en los cinco segundos del clip.
 *
 * Por qué existe: la escena del plano describe un ESTADO («de pie en el muelle, sosteniendo una carpeta»), y el
 * motor de video, con eso solo, deja el clip congelado: medido en la prueba real, el clip salió como una foto
 * con zoom —justo lo que el dueño rechazó—. El manual (capa 5) pide un vector de animación explícito, así que
 * acá se le pide al modelo, en una línea, la acción física concreta de esos segundos.
 *
 * Reglas: sólo lo que se ve moverse (cuerpo, manos, lo que lo rodea); sin diálogo, sin gente nueva, sin objetos
 * nuevos; y en presente. Si el modelo no responde, la pieza igual se anima con lo que hay (nunca se cae).
 */
export async function movimientoDeLaEscena(escena: string, camara: string, timeoutMs = 25_000): Promise<string | null> {
  const texto = String(escena || '').replace(/\s+/g, ' ').trim().slice(0, 400);
  if (texto.length < 8) return null;
  const clave = `${texto}|${camara}`;
  const enCache = cacheMovimientos.get(clave);
  if (enCache) return enCache;
  const llave = llaveDelModelo();
  if (!llave) return null;
  try {
    const r = await fetch(BASE, {
      method: 'POST',
      headers: { Authorization: `Bearer ${llave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODELO,
        temperature: 0.4,
        messages: [
          {
            role: 'system',
            content: 'You write ONE line of visible movement for a video generator, in English, present tense. '
              + 'Given a photo, say what the person DOES with their body during the next five seconds (walking, '
              + 'turning, lifting, reaching, crouching, pointing, loading, closing, pressing) and what moves around '
              + 'them (dust, papers, cloth, machines, water, smoke). '
              + 'Only physical movement. No dialogue, no new people, no new objects, no camera talk (the camera is '
              + 'given separately), no quality words. Answer with the line only, under 25 words.',
          },
          { role: 'user', content: `${texto}\nThe camera: ${String(camara || 'slow push in')}` },
        ],
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { choices?: { message?: { content?: string } }[] };
    const linea = String(j.choices?.[0]?.message?.content || '').replace(/["'`\n]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 220);
    if (linea.length < 10) return null;
    cacheMovimientos.set(clave, linea);
    return linea;
  } catch { return null; }
}

/**
 * LA CATEGORÍA DEL NEGOCIO, EN DOS PALABRAS Y DOS IDIOMAS.
 *
 * POR QUÉ NO SE DEDUCE PICANDO PALABRAS DEL MATERIAL
 *
 * El motor sacaba el término de la categoría eligiendo palabras del texto del negocio —las de su vocabulario
 * y las más largas— y eso falla justo en los negocios que no son del montón. Medido con un servicio de lujo
 * en Dubái: la categoría salió «defi» (una palabra suelta de su web), Wikipedia devolvió una página de
 * desambiguación, y el informe del mercado terminó diciendo que su categoría no existía en su ciudad —con la
 * ciudad llena de competidores—. Un negocio de lujo no se busca por una palabra de su copy.
 *
 * Lo que hace falta es lo que haría una persona: leer qué hace el negocio y decir a qué se dedica, corto y
 * buscable. Se piden los dos idiomas porque las fuentes no hablan el mismo: el español para la enciclopedia
 * y para leerlo, el inglés para la biblioteca de anuncios del Golfo. Si el modelo no responde, se devuelve
 * null y la corrida sigue con el camino de siempre (nunca se cae por esto).
 */
export async function categoriaDelNegocio(
  entrada: { nombre: string; descripcion: string; queHace?: string; lugares?: string[]; material?: string },
  timeoutMs = 25_000,
): Promise<{ es: string; en: string; porque: string } | null> {
  // LA CATEGORÍA SALE DE LO QUE EL CLIENTE SUBIÓ, no de una suposición: se le pasa el texto de su página web
  // y de sus documentos, que es lo que el motor leyó, y el modelo nombra la categoría a partir de eso. La
  // descripción y lo que dedujo Vera van primero (son el resumen más limpio) y el material va detrás, con más
  // espacio, porque ahí están los servicios concretos con los que se lo puede buscar en el mercado.
  const resumen = [entrada.nombre, entrada.descripcion, entrada.queHace]
    .filter(Boolean).join(' — ').replace(/\s+/g, ' ').trim().slice(0, 900);
  const material = String(entrada.material || '').replace(/\s+/g, ' ').trim().slice(0, 6000);
  const texto = material.length > 200 ? `${resumen}\n\nMaterial del cliente (su web y sus documentos):\n${material}` : resumen;
  if (texto.length < 20) return null;
  const llave = llaveDelModelo();
  if (!llave) return null;
  try {
    const r = await fetch(BASE, {
      method: 'POST',
      headers: { Authorization: `Bearer ${llave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODELO,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'From the client MATERIAL below (their own website and documents), name the CATEGORY '
              + 'of the business the way a person would when looking for its competition: two or three '
              + 'words, the kind of thing that appears in a directory, never a slogan and never a word '
              + 'taken from the marketing copy. Base it on what the material says the business DOES. '
              + 'Example: a company that manages luxury homes and travel for rich clients is "luxury '
              + 'concierge" (Spanish: "conserjería de lujo"). Answer ONLY this JSON: {"es": '
              + '"<categoría en español>", "en": "<category in English>", "porque": "<una línea, en '
              + 'español, diciendo en qué parte del material te basaste>"}',
          },
          { role: 'user', content: texto },
        ],
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { choices?: { message?: { content?: string } }[] };
    const crudo = String(j.choices?.[0]?.message?.content || '').trim();
    if (!crudo) return null;
    const d = JSON.parse(crudo) as { es?: string; en?: string; porque?: string };
    const limpio = (t: unknown) => String(t ?? '').replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);
    const es = limpio(d.es);
    const en = limpio(d.en);
    if (es.length < 3 && en.length < 3) return null;
    return { es: es || en, en: en || es, porque: String(d.porque ?? '').replace(/\s+/g, ' ').trim().slice(0, 160) };
  } catch { return null; }
}

export async function escribirLaPieza(d: Parameters<typeof elEncargo>[0], timeoutMs = 90_000): Promise<CopyEscrito | null> {
  const llave = llaveDelModelo();
  if (!llave) return null;
  try {
    const r = await fetch(BASE, {
      method: 'POST',
      headers: { Authorization: `Bearer ${llave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODELO,
        temperature: 0.9,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'Es un redactor publicitario que escribe anuncios cortos y concretos para negocios reales. Devuelve sólo JSON.' },
          { role: 'user', content: elEncargo(d) },
        ],
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { choices?: { message?: { content?: string } }[] };
    const texto = j.choices?.[0]?.message?.content || '';
    const datos = JSON.parse(texto) as Partial<CopyEscrito>;
    const lineas = (Array.isArray(datos.lineas) ? datos.lineas : []).map(l => String(l || '').trim()).filter(Boolean);
    const gancho = String(datos.gancho || lineas[0] || '').trim();
    if (!gancho || lineas.length < 2) return null;
    // La revisión que se puede hacer sin otro modelo: que no haya cifras que el negocio no dijo y que las
    // líneas no se repitan entre sí. Lo que no se puede comprobar, se declara (el copy se muestra al dueño).
    const conCifras = /\d+\s*(%|por ciento|veces)/i.test(lineas.join(' '));
    if (conCifras) return null;
    const vistas = new Set<string>();
    for (const l of lineas) {
      const clave = l.toLowerCase().replace(/[^a-záéíóúñ0-9 ]/g, '');
      if (clave.length > 12) {
        if (vistas.has(clave)) return null;
        vistas.add(clave);
      }
    }
    const maxLineas = d.esVideo ? 6 : 4;
    // ---------------------------------------------------------------------------------------------
    // LA REPARACIÓN DE TANGIBILIDAD (manual, capa 1). Se pide UNA sola vez y sólo por las líneas que no
    // nombran ninguna acción ni ningún lugar: pedirlo en el encargo no alcanza —medido: el cierre seguía
    // siendo «toda esa evidencia queda escrita en una historia verificable», que no se puede filmar—.
    // ---------------------------------------------------------------------------------------------
    const cierre0 = String(datos.cierre || lineas[lineas.length - 1] || '').trim();
    const candidatas = [...new Set([gancho, ...lineas.slice(0, maxLineas), cierre0].map(x => String(x || '').trim()))]
      .filter(l => l && !esElBoton(l) && !sePuedeFilmar(l));
    const reparadas: string[] = [];
    const cambiadas = new Map<string, string>();
    if (candidatas.length) {
      const pedido = [
        'Estas líneas de un anuncio NO se pueden filmar: no nombran ninguna acción ni ningún lugar real.',
        ...candidatas.map((l, i) => `${i + 1}. ${l}`),
        '',
        'Reescriba cada una con la MISMA idea, pero nombrando lo que SE VE: quién hace qué, o el lugar y la cosa',
        'concreta. Ejemplos de cómo se arregla:',
        '   ✗ «toda esa evidencia queda escrita en una historia que no se puede reescribir»',
        '   ✓ «un auditor firma el acta en el muelle y la carga queda sellada»',
        '   ✗ «su activo queda cubierto por la verificación»',
        '   ✓ «el satélite vuelve a pasar sobre la torre mañana a la misma hora»',
        'Si la línea es una conclusión, conviértala en la última cosa que se ve, no en la idea que resume.',
        'No invente cifras ni marcas.',
        'Devuelva este JSON exacto: {"lineas": ["la primera reescrita", "la segunda reescrita"]} — una por cada',
        'una, en el mismo orden.',
      ].join('\n');
      const r2 = await pedirJson('Es un guionista de anuncios para video. Reescribe sólo las líneas que se le piden, para que se puedan filmar. Devuelve sólo JSON.', pedido, 45_000);
      const nuevas = Array.isArray(r2?.lineas) ? (r2!.lineas as unknown[]).map(x => String(x || '').trim()).filter(Boolean) : [];
      if (nuevas.length === candidatas.length) {
        candidatas.forEach((vieja, k) => { cambiadas.set(vieja, nuevas[k]!); reparadas.push(nuevas[k]!); });
      }
    }
    const arreglar = (t: string) => cambiadas.get(String(t || '').trim()) ?? String(t || '').trim();
    return {
      gancho: arreglar(gancho),
      lineas: lineas.slice(0, maxLineas).map(arreglar),
      cierre: arreglar(cierre0),
      titulo: String(datos.titulo || gancho).slice(0, 70).trim(),
      por_que: String(datos.por_que || '').trim().slice(0, 240),
      falta_material: (Array.isArray(datos.falta_material) ? datos.falta_material : []).map(x => String(x || '').trim()).filter(Boolean).slice(0, 4),
      reparadas: reparadas.length ? reparadas : undefined,
    };
  } catch {
    return null;
  }
}

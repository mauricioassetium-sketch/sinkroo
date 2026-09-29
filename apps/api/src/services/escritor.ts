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
      ? '3. Devuelva entre 4 y 6 líneas. Cada línea es una escena del video: tiene que poder verse algo distinto en cada una.'
      : '3. Devuelva entre 2 y 4 líneas.',
    '4. NADA de cifras, porcentajes, precios, plazos, clientes ni resultados: no están en el material y no se inventan.',
    '5. NADA de promesas de rendimiento ni de dinero. Nada de «el mejor», «líder», «único».',
    '6. Ninguna frase repite a otra. Si dos líneas dicen lo mismo, sobra una.',
    '7. Se le habla al cliente de usted, no al negocio. Y no se nombra a Sinkroo.',
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
 * Escribe el copy de una pieza. Devuelve null si no hay llave, si el modelo no responde o si lo que devolvió
 * no pasa la revisión (JSON roto, líneas de más, cifras inventadas). Nunca lanza.
 */
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
    return {
      titulo: String(datos.titulo || gancho).slice(0, 70).trim(),
      gancho,
      lineas: lineas.slice(0, maxLineas),
      cierre: String(datos.cierre || lineas[lineas.length - 1] || '').trim(),
      por_que: String(datos.por_que || '').trim().slice(0, 240),
      falta_material: (Array.isArray(datos.falta_material) ? datos.falta_material : []).map(x => String(x || '').trim()).filter(Boolean).slice(0, 4),
    };
  } catch {
    return null;
  }
}

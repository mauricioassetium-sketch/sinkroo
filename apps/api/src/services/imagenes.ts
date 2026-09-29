// =============================================================================================
// LA IMAGEN DE LA PIEZA — con un modelo de verdad (FLUX) y respaldo gratis (Pollinations)
//
// Antes esto pintaba con Pollinations, que sirve el modelo `sana` — chico y rápido — y el dueño lo
// dijo con todas las letras: «las imágenes que generó son feísimas». No era el prompt: era el modelo.
//
// AHORA SE PIDE ASÍ, en este orden:
//   1) FLUX.1-schnell por el router de Hugging Face (proveedor `nscale`), con la llave del dueño.
//      Las direcciones viejas de Hugging Face ya no existen: responden `410 The requested model is
//      deprecated`. La que sirve —y no está en la documentación que uno encuentra— es:
//      POST https://router.huggingface.co/nscale/v1/images/generations
//   2) Si no hay llave, o el servicio rechaza (cuota, corte), se cae a Pollinations: peor imagen,
//      pero la pieza nunca se queda sin nada. El campo `fuente` dice con cuál se pintó: no se disimula.
//
// QUÉ SE LE PIDE: un prompt visual con OFICIO FOTOGRÁFICO —luz, lente, profundidad de campo, encuadre,
// estilo— armado con lo que está MEDIDO del negocio. Lo que no se midió no se inventa: si no hay
// paleta, no se le dictan colores; si no hay lugar, no se le inventa un lugar.
//
// Si nada responde, la pieza se queda con su prompt y lo dice: la generación es un extra, no un
// requisito para que la pieza exista.
// =============================================================================================

import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const POLLINATIONS = process.env.POLLINATIONS_URL || 'https://image.pollinations.ai/prompt';
const ROUTER_HF = process.env.HF_IMAGENES_URL || 'https://router.huggingface.co/nscale/v1/images/generations';
const MODELO_FLUX = process.env.HF_MODELO_IMAGENES || 'black-forest-labs/FLUX.1-schnell';
/** Las llaves viven fuera del repositorio, en un archivo que sólo root puede leer. */
const ARCHIVO_LLAVES = process.env.LLAVES_GENERACION || '/etc/sinkroo/claves-generacion.env';
/** Dónde quedan las imágenes generadas. Fuera del repo de la landing: son datos, no código. */
const RAIZ = process.env.IMAGENES_DIR || '/root/work/sinkroo-a/datos/imagenes';

/** Por qué falló la última imagen (el proveedor y lo que contestó). Sin esto, un fallo no deja rastro. */
let ultimoMotivo = '';
export const motivoDelUltimoFalloDeImagen = () => ultimoMotivo;

export type ImagenGenerada = {
  archivo: string;
  /** A qué plano del guion pertenece, cuando la pieza lleva varias imágenes. */
  plano?: string;
  url: string;
  ancho: number;
  alto: number;
  peso: number;
  prompt_visual: string;
  fuente: string;
  semilla: number;
};

/** Lee una llave del archivo de llaves (o de la variable de entorno). Nunca se imprime ni se registra. */
let cacheLlavves: Record<string, string> | null = null;
function llave(nombre: string): string | undefined {
  if (process.env[nombre]) return process.env[nombre];
  if (!cacheLlavves) {
    cacheLlavves = {};
    try {
      const texto = readFileSync(ARCHIVO_LLAVES, 'utf8');
      for (const linea of texto.split('\n')) {
        const i = linea.indexOf('=');
        if (i > 0) cacheLlavves[linea.slice(0, i).trim()] = linea.slice(i + 1).trim().replace(/^"|"$/g, '');
      }
    } catch { /* sin archivo de llaves: no hay llave */ }
  }
  return cacheLlavves[nombre];
}

/** La medida de salida según el formato de la pieza. */
function medidaDe(formato: string): { ancho: number; alto: number } {
  const f = String(formato || '').toLowerCase();
  if (/1:1|cuadrad/.test(f)) return { ancho: 1024, alto: 1024 };
  if (/9:16|vertical|reel|historia/.test(f)) return { ancho: 768, alto: 1344 };
  return { ancho: 1024, alto: 1024 };
}

/** El tipo real de lo que llegó, por sus primeros bytes. No se confía en lo que diga el servicio. */
function tipoDeImagen(bytes: Buffer): { ext: string; mime: string } | null {
  if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { ext: 'png', mime: 'image/png' };
  }
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { ext: 'jpg', mime: 'image/jpeg' };
  }
  return null;
}

/**
 * La medida REAL de la imagen, leída de sus propios bytes.
 * Se pide una medida, pero el proveedor puede devolver otra: FLUX entrega 1024×1024 aunque se le pida
 * vertical. Se reporta la que llegó, no la que se pidió — un dato que no se midió no se rellena.
 */
function medidaReal(bytes: Buffer): { ancho: number; alto: number } | null {
  // PNG: el ancho y el alto van en la cabecera IHDR, en los bytes 16 y 20
  if (bytes.length > 24 && bytes.toString('latin1', 1, 4) === 'PNG') {
    return { ancho: bytes.readUInt32BE(16), alto: bytes.readUInt32BE(20) };
  }
  // JPEG: se recorren los marcadores hasta el que declara el tamaño (SOF0..SOF15)
  if (bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let i = 2;
    while (i + 9 < bytes.length) {
      if (bytes[i] !== 0xff) { i++; continue; }
      const marca = bytes[i + 1];
      const largo = bytes.readUInt16BE(i + 2);
      if (marca >= 0xc0 && marca <= 0xcf && marca !== 0xc4 && marca !== 0xc8 && marca !== 0xcc) {
        return { ancho: bytes.readUInt16BE(i + 7), alto: bytes.readUInt16BE(i + 5) };
      }
      i += 2 + largo;
    }
  }
  return null;
}

/**
 * El prompt visual: en inglés (el idioma que entienden estos modelos), con oficio fotográfico y
 * armado con lo que se midió del negocio. Los colores van como hex porque es lo que la marca ya usa.
 */
export function promptVisual(d: {
  queHace: string; textoSobreLaImagen?: string; formato: string;
  colores?: string[]; lugar?: string; tono?: string;
}): string {
  const colores = (d.colores ?? []).filter(c => /^#[0-9a-f]{6}$/i.test(c)).slice(0, 3);
  const vertical = /9:16|vertical|reel|historia/i.test(String(d.formato || ''));
  const tono = String(d.tono || '').toLowerCase();
  const calido = /cercan|cálid|calid|amable|familiar/.test(tono);
  const formal = /formal|profesional|institucional|corporativ/.test(tono);
  return [
    // el encuadre manda: es lo primero que decide si parece publicidad o una foto de banco
    vertical
      ? 'Editorial commercial photograph, vertical 9:16 framing, subject slightly off-centre'
      : 'Editorial commercial photograph, square framing, subject slightly off-centre',
    d.queHace ? `showing ${d.queHace.slice(0, 300)}` : '',
    d.lugar ? `in a real ${d.lugar.slice(0, 60)}, in use, with everyday objects around` : 'in a real workplace, in use, with everyday objects around',
    // la luz es lo que más separa una foto buena de una mala
    calido
      ? 'warm soft natural window light from the side, golden tone, gentle shadows'
      : formal
        ? 'clean soft daylight, even and calm, gentle shadows, no harsh contrast'
        : 'soft natural window light from the side, gentle shadows, no flash',
    // lente y profundidad: dan aspecto fotográfico, no de dibujo
    'shot on a full-frame camera with a 50mm lens at f/2.0, shallow depth of field, background softly out of focus',
    'natural skin tones, realistic textures, slight film grain, documentary style, photorealistic, high detail',
    colores.length ? `muted neutral palette with the brand colours as accents: ${colores.join(', ')}` : 'muted neutral palette',
    // los negativos que arruinan una pieza publicitaria
    'no text, no letters, no watermark, no logo, no illustration, no 3d render, no cartoon, no stock-photo look, no smiling models posing, no plastic skin',
  ].filter(Boolean).join(', ');
}

/** FLUX por el router de Hugging Face. Devuelve los bytes o null (nunca lanza). */
async function conFlux(prompt: string, medida: { ancho: number; alto: number }, timeoutMs: number): Promise<Buffer | null> {
  const token = llave('HF_TOKEN');
  if (!token) return null;
  try {
    const r = await fetch(ROUTER_HF, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODELO_FLUX, prompt, response_format: 'b64_json',
        width: medida.ancho, height: medida.alto,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!r.ok) { ultimoMotivo = `FLUX contestó ${r.status}: ${(await r.text()).slice(0, 140)}`; return null; }
    const j = (await r.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
    const dato = j.data?.[0];
    if (dato?.b64_json) {
      const bytes = Buffer.from(dato.b64_json, 'base64');
      return bytes.length > 5_000 ? bytes : null;
    }
    if (dato?.url) {
      const img = await fetch(dato.url, { signal: AbortSignal.timeout(timeoutMs) });
      if (!img.ok) return null;
      const bytes = Buffer.from(await img.arrayBuffer());
      return bytes.length > 5_000 ? bytes : null;
    }
    ultimoMotivo = 'FLUX respondió sin imagen';
    return null;
  } catch (e) {
    ultimoMotivo = `FLUX no respondió: ${String((e as Error)?.message || e).slice(0, 120)}`;
    return null;
  }
}

/** Pollinations: el respaldo gratis, sin llave. Peor imagen, pero nunca deja la pieza vacía. */
async function conPollinations(prompt: string, medida: { ancho: number; alto: number }, semilla: number, timeoutMs: number): Promise<Buffer | null> {
  const url = `${POLLINATIONS}/${encodeURIComponent(prompt)}?width=${medida.ancho}&height=${medida.alto}&nologo=true&seed=${semilla}`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!r.ok) {
      ultimoMotivo = `${ultimoMotivo ? ultimoMotivo + ' · ' : ''}Pollinations contestó ${r.status}${r.status === 402 ? ' (pide pago: la cuota gratis anónima está agotada)' : ''}`;
      return null;
    }
    const bytes = Buffer.from(await r.arrayBuffer());
    if (bytes.length <= 5_000) { ultimoMotivo = `${ultimoMotivo ? ultimoMotivo + ' · ' : ''}Pollinations devolvió algo que no es imagen`; return null; }
    return bytes;
  } catch (e) {
    ultimoMotivo = `${ultimoMotivo ? ultimoMotivo + ' · ' : ''}Pollinations no respondió: ${String((e as Error)?.message || e).slice(0, 100)}`;
    return null;
  }
}

/** Genera la imagen de una pieza. Devuelve null si no se pudo (y nunca lanza). */
export async function generarImagen(d: {
  businessId: string; piezaId: string; formato: string; prompt: string; semilla?: number; timeoutMs?: number;
  /** Para las piezas que llevan varias imágenes (una por plano): así no se pisan entre ellas. */
  sufijo?: string;
}): Promise<ImagenGenerada | null> {
  const medida = medidaDe(d.formato);
  const semilla = d.semilla ?? Math.floor(Math.random() * 1_000_000);
  const tiempo = d.timeoutMs ?? 120_000;

  ultimoMotivo = '';
  let bytes = await conFlux(d.prompt, medida, tiempo);
  let fuente = `FLUX.1-schnell (Hugging Face · ${MODELO_FLUX})`;
  if (!bytes) {
    bytes = await conPollinations(d.prompt, medida, semilla, tiempo);
    fuente = 'Pollinations (respaldo sin llave y sin costo)';
  }
  if (!bytes) return null;

  const tipo = tipoDeImagen(bytes);
  if (!tipo) return null; // llegó texto donde se esperaba una imagen: no se guarda basura
  const medidaLlegada = medidaReal(bytes) ?? medida; // la que llegó de verdad, no la que se pidió

  const carpeta = path.join(RAIZ, d.businessId);
  await mkdir(carpeta, { recursive: true });
  const nombre = d.sufijo ? `${d.piezaId}-${d.sufijo}.${tipo.ext}` : `${d.piezaId}.${tipo.ext}`;
  const archivo = path.join(carpeta, nombre);
  await writeFile(archivo, bytes);
  return {
    archivo, url: `/api/piezas/${d.piezaId}/imagen`, ancho: medidaLlegada.ancho, alto: medidaLlegada.alto,
    plano: d.sufijo || undefined,
    peso: bytes.length, prompt_visual: d.prompt, fuente, semilla,
  };
}

export const carpetaDeImagenes = () => RAIZ;
export const hayLlaveDeImagenes = () => Boolean(llave('HF_TOKEN'));

// =============================================================================================
// LA IMAGEN DE LA PIEZA — generación gratis, sin llave (Pollinations)
//
// Hasta acá, una pieza de imagen se quedaba en su prompt: el dueño tenía que copiarlo y pegarlo en otro
// lado. Pollinations genera imágenes por una dirección web, **sin llave y sin costo**, así que la pieza
// puede salir pintada de una vez.
//
// QUÉ SE LE PIDE: no su prompt entero —que es una instrucción larga para un modelo de video— sino un
// prompt visual corto y con lo medido: qué se ve, el lugar, la luz, y LOS COLORES DE SU MARCA. Lo que no
// está medido no se inventa: si no hay paleta, no se le dictan colores.
//
// Si Pollinations no responde, la pieza se queda con su prompt y lo dice: la generación es un extra, no
// un requisito para que la pieza exista.
// =============================================================================================

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.env.POLLINATIONS_URL || 'https://image.pollinations.ai/prompt';
/** Dónde quedan las imágenes generadas. Fuera del repo de la landing: son datos, no código. */
const RAIZ = process.env.IMAGENES_DIR || '/root/work/sinkroo-a/datos/imagenes';

export type ImagenGenerada = {
  archivo: string;
  url: string;
  ancho: number;
  alto: number;
  peso: number;
  prompt_visual: string;
  fuente: string;
  semilla: number;
};

/** La medida de salida según el formato de la pieza. */
function medidaDe(formato: string): { ancho: number; alto: number } {
  const f = String(formato || '').toLowerCase();
  if (/1:1|cuadrad/.test(f)) return { ancho: 1024, alto: 1024 };
  if (/9:16|vertical|reel|historia/.test(f)) return { ancho: 768, alto: 1344 };
  return { ancho: 1024, alto: 1024 };
}

/**
 * El prompt visual: corto, en inglés (el idioma que entienden estos modelos) y armado con lo que se
 * midió del negocio. Los colores van como hex porque es lo que la marca ya usa, no una elección nuestra.
 */
export function promptVisual(d: {
  queHace: string; textoSobreLaImagen?: string; formato: string;
  colores?: string[]; lugar?: string;
}): string {
  const colores = (d.colores ?? []).filter(c => /^#[0-9a-f]{6}$/i.test(c)).slice(0, 3);
  return [
    'photorealistic photograph, real workplace, not a studio, not an illustration, no text in the image',
    d.queHace ? `showing ${d.queHace.slice(0, 120)}` : '',
    d.lugar ? `in ${d.lugar.slice(0, 60)}` : '',
    'natural window light, honest and unpolished look, shot on a phone, real skin tones',
    colores.length ? `brand colours present as accents: ${colores.join(', ')}` : '',
    'no people posing, no stock-photo look, no smiling models',
  ].filter(Boolean).join(', ');
}

/** Genera la imagen de una pieza. Devuelve null si no se pudo (y nunca lanza). */
export async function generarImagen(d: {
  businessId: string; piezaId: string; formato: string; prompt: string; semilla?: number; timeoutMs?: number;
}): Promise<ImagenGenerada | null> {
  const { ancho, alto } = medidaDe(d.formato);
  const semilla = d.semilla ?? Math.floor(Math.random() * 1_000_000);
  const url = `${BASE}/${encodeURIComponent(d.prompt)}?width=${ancho}&height=${alto}&nologo=true&seed=${semilla}`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(d.timeoutMs ?? 90_000) });
    if (!r.ok) return null;
    const bytes = Buffer.from(await r.arrayBuffer());
    // Una imagen de verdad pesa miles de bytes; si llega un texto de error, no se guarda.
    if (bytes.length < 5_000) return null;
    const carpeta = path.join(RAIZ, d.businessId);
    await mkdir(carpeta, { recursive: true });
    const archivo = path.join(carpeta, `${d.piezaId}.jpg`);
    await writeFile(archivo, bytes);
    return {
      archivo, url: `/api/piezas/${d.piezaId}/imagen`, ancho, alto, peso: bytes.length,
      prompt_visual: d.prompt, fuente: 'Pollinations (generación de imágenes sin llave y sin costo)', semilla,
    };
  } catch { return null; }
}

export const carpetaDeImagenes = () => RAIZ;

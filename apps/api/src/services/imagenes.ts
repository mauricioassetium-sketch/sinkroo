// =============================================================================================
// LA IMAGEN DE LA PIEZA — con un modelo de verdad (FLUX) y respaldo gratis (Pollinations)
//
// Antes esto pintaba con Pollinations, que sirve el modelo `sana` — chico y rápido — y el dueño lo
// dijo con todas las letras: «las imágenes que generó son feísimas». No era el prompt: era el modelo.
//
// AHORA SE PIDE ASÍ, en este orden, y SIEMPRE por un camino PAGO (decisión del dueño: «no uses el modelo
// gratis para las imágenes, usa el modelo pago así no hay errores ni detenciones, siempre a la segura»):
//   1) FLUX.1-schnell por el router de Hugging Face (proveedor `nscale`), con la llave del dueño.
//      Las direcciones viejas de Hugging Face ya no existen: responden `410 The requested model is
//      deprecated`. La que sirve —y no está en la documentación que uno encuentra— es:
//      POST https://router.huggingface.co/nscale/v1/images/generations
//   2) La GPU ALQUILADA por hora (Vast.ai) con SDXL, por la API de ComfyUI: es el camino pago que ya
//      existe en la cuenta (la A100 con `sinkroo-a100`), ~12 s por imagen y centavos cada una. Se
//      enciende, se pinta el lote y se apaga. Se configura con IMAGENES_API_URL (la dirección de
//      ComfyUI, normalmente por un túnel SSH: http://127.0.0.1:8188).
//   3) Pollinations (gratis) NO se usa: quedó APAGADO por defecto. El dueño lo prohibió porque estrangula
//      (`402`) a las pocas peticiones y detiene la corrida entera. Si alguna vez se quiere como último
//      recurso —para que una pieza tenga ALGO sin gastar máquina— hay que pedirlo a propósito con
//      PERMITIR_IMAGEN_GRATIS=1, y el campo `fuente` dice con cuál se pintó: no se disimula.
//
// El precio de esto: con la GPU apagada, el motor NO pinta, y la pieza lo dice con el motivo
// (`imagen_error`) en vez de caer en silencio al modelo gratis.
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
import { motorDeImagen, promptDeImagen } from './prompts-por-motor.js';

const POLLINATIONS = process.env.POLLINATIONS_URL || 'https://image.pollinations.ai/prompt';
/** La GPU alquilada (ComfyUI). Vacío = no hay camino pago por GPU configurado. */
const GPU_IMAGENES = (process.env.IMAGENES_API_URL || '').replace(/\/+$/, '');
const MODELO_GPU = process.env.IMAGENES_MODELO || 'sd_xl_base_1.0.safetensors';
/** El modelo gratis queda apagado salvo que el dueño lo pida a propósito. */
const PERMITIR_GRATIS = process.env.PERMITIR_IMAGEN_GRATIS === '1';
/**
 * LAS IMÁGENES, DESCONECTADAS A PEDIDO DEL DUEÑO.
 *
 * Decisión suya: «deja las imágenes desconectadas hasta tener el motor funcional 100% como queremos». Es un
 * interruptor explícito y no el borrado de la dirección de la GPU, porque el comando de la GPU vuelve a
 * escribirla en cada encendido: sin esta marca, la desconexión se caería sola en el primer encendido.
 */
const IMAGENES_DESCONECTADAS = /^(1|si|sí|true)$/i.test(String(process.env.IMAGENES_DESCONECTADAS || ''));
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

/**
 * La medida de salida según el formato de la pieza.
 * EL MODELO BUENO PIDE MÁS PÍXELES: medido con FLUX.1-dev a 768×1344, las manos salen fundidas con el
 * instrumento y las letras de un casco salen garabateadas; a 1024×1824 el mismo prompt las resuelve. El
 * destilado se queda en 768×1344 porque son sus 4 pasos los que lo hacen rápido, no la medida.
 * El dueño puede fijar la medida desde el entorno (IMAGENES_ANCHO / IMAGENES_ALTO).
 */
function medidaDe(formato: string): { ancho: number; alto: number } {
  const f = String(formato || '').toLowerCase();
  const anchoFijo = Number(process.env.IMAGENES_ANCHO || 0);
  const altoFijo = Number(process.env.IMAGENES_ALTO || 0);
  if (anchoFijo > 0 && altoFijo > 0) return { ancho: anchoFijo, alto: altoFijo };
  const esDev = /flux/i.test(MODELO_GPU) && /dev/i.test(MODELO_GPU);
  if (/1:1|cuadrad/.test(f)) return { ancho: 1024, alto: 1024 };
  if (/9:16|vertical|reel|historia/.test(f)) return esDev ? { ancho: 1024, alto: 1824 } : { ancho: 768, alto: 1344 };
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
 * EL PROMPT VIEJO (apagado). Era UNO para todos los motores, y eso es lo que estaba mal: a FLUX se le
 * mandaba el negativo de SDXL —y con cfg 1 el negativo no se usa—, y palabras como «no text» le hacen
 * DIBUJAR texto. Queda como referencia de dónde venimos; el que manda es `services/prompts-por-motor.ts`.
 */
function promptVisualViejo(d: {
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

/**
 * EL PROMPT VISUAL, YA POR MOTOR. Es el puente al único dueño del prompt
 * (`services/prompts-por-motor.ts`): devuelve la forma que pide el modelo que está pintando.
 */
export function promptVisual(d: {
  queHace: string; textoSobreLaImagen?: string; formato: string;
  colores?: string[]; lugar?: string; tono?: string;
}): string {
  return promptDeImagen(motorDeImagen(MODELO_GPU), d).prompt;
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

/**
 * Los ajustes que pide cada familia de modelo. No se le puede pedir a un modelo lo que pide el otro:
 * FLUX.1-schnell es destilado —4 pasos y cfg 1— y con los 30 pasos y cfg 5,5 de SDXL la imagen se quema.
 */
/** Cómo se llama el modelo en la ficha de la pieza: la pieza no puede mentir sobre con qué se pintó. */
function familiaDelModelo(nombre: string): string {
  if (/flux/i.test(nombre)) return /dev/i.test(nombre) ? 'FLUX.1-dev' : 'FLUX.1-schnell';
  if (/turbo|lightning/i.test(nombre)) return 'SDXL-Turbo';
  if (/sd_?xl/i.test(nombre)) return 'SDXL';
  return nombre;
}

function ajustesDelModelo(nombre: string): { pasos: number; cfg: number; sampler: string; scheduler: string } {
  // FLUX.1-dev: mismo cfg 1 que el schnell (los dos son de guía destilada) pero 22 pasos en vez de 4, y su
  // guía va en el nodo `FluxGuidance` (ver `conLaGpuAlquilada`). Medido: con cfg 3,5 el motor devuelve un
  // degradado naranja sin sujeto — así no se usa el negativo «de verdad», aunque el modelo sea el bueno.
  if (/flux/i.test(nombre) && /dev/i.test(nombre)) return { pasos: 22, cfg: 1.0, sampler: 'euler', scheduler: 'simple' };
  if (/flux/i.test(nombre)) return { pasos: 4, cfg: 1.0, sampler: 'euler', scheduler: 'simple' };
  if (/turbo|lightning/i.test(nombre)) return { pasos: 6, cfg: 1.5, sampler: 'dpmpp_sde', scheduler: 'karras' };
  return { pasos: 30, cfg: 5.5, sampler: 'dpmpp_2m', scheduler: 'karras' };
}

/**
 * La GPU ALQUILADA (el camino pago de verdad): SDXL o FLUX en la máquina de por hora, por la API de ComfyUI.
 * Se enciende la máquina, se pinta el lote y se apaga; cada imagen sale ~12 s y centavos.
 * Devuelve los bytes o null (nunca lanza): si no contesta, queda el motivo.
 */
async function conLaGpuAlquilada(prompt: string, negativo: string, medida: { ancho: number; alto: number }, semilla: number, timeoutMs: number): Promise<Buffer | null> {
  if (!GPU_IMAGENES) return null;
  const a = ajustesDelModelo(MODELO_GPU);
  // FLUX.1-dev ES DE GUÍA DESTILADA: la guía (3,5) no va en el cfg del muestreador —eso quema la imagen y
  // devuelve un degradado, medido— sino en su propio nodo `FluxGuidance`, y el muestreador va con cfg 1.
  // Por lo mismo el negativo NO SE USA en FLUX (ni en el bueno): lo que cambia entre dev y schnell es el
  // modelo y lo que se pide en positivo, no el negativo.
  const esFluxDev = /flux/i.test(MODELO_GPU) && /dev/i.test(MODELO_GPU);
  const guia = esFluxDev ? { '10': { class_type: 'FluxGuidance', inputs: { conditioning: ['6', 0], guidance: 3.5 } } } : {};
  // El grafo de ComfyUI es el mismo que se probó a mano en la máquina; los números de nodo importan.
  const flujo = {
    ...guia,
    '3': { class_type: 'KSampler', inputs: { seed: semilla, steps: a.pasos, cfg: a.cfg, sampler_name: a.sampler, scheduler: a.scheduler, denoise: 1, model: ['4', 0], positive: esFluxDev ? ['10', 0] : ['6', 0], negative: ['7', 0], latent_image: ['5', 0] } },
    '4': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: MODELO_GPU } },
    '5': { class_type: 'EmptyLatentImage', inputs: { width: medida.ancho, height: medida.alto, batch_size: 1 } },
    '6': { class_type: 'CLIPTextEncode', inputs: { text: prompt, clip: ['4', 1] } },
    // El negativo es el que pide ESE modelo (FLUX: vacío, porque muestrea sin guía).
    '7': { class_type: 'CLIPTextEncode', inputs: { text: negativo, clip: ['4', 1] } },
    '8': { class_type: 'VAEDecode', inputs: { samples: ['3', 0], vae: ['4', 2] } },
    '9': { class_type: 'SaveImage', inputs: { filename_prefix: 'sinkroo', images: ['8', 0] } },
  };
  try {
    const envio = await fetch(`${GPU_IMAGENES}/prompt`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: flujo, client_id: 'sinkroo' }),
      signal: AbortSignal.timeout(Math.min(timeoutMs, 60_000)),
    });
    if (!envio.ok) { ultimoMotivo = `la GPU alquilada contestó ${envio.status}: ${(await envio.text()).slice(0, 120)}`; return null; }
    const { prompt_id } = (await envio.json()) as { prompt_id?: string };
    if (!prompt_id) { ultimoMotivo = 'la GPU alquilada no devolvió el identificario del trabajo'; return null; }

    const limite = Date.now() + timeoutMs;
    while (Date.now() < limite) {
      const h = await fetch(`${GPU_IMAGENES}/history/${prompt_id}`, { signal: AbortSignal.timeout(20_000) });
      if (h.ok) {
        const j = (await h.json()) as Record<string, { outputs?: Record<string, { images?: Array<{ filename: string; subfolder?: string; type?: string }> }> }>;
        const salida = j?.[prompt_id]?.outputs?.['9']?.images?.[0];
        if (salida) {
          const q = `filename=${encodeURIComponent(salida.filename)}&subfolder=${encodeURIComponent(salida.subfolder || '')}&type=${encodeURIComponent(salida.type || 'output')}`;
          const img = await fetch(`${GPU_IMAGENES}/view?${q}`, { signal: AbortSignal.timeout(timeoutMs) });
          if (!img.ok) { ultimoMotivo = `la GPU alquilada no entregó el archivo (${img.status})`; return null; }
          const bytes = Buffer.from(await img.arrayBuffer());
          return bytes.length > 5_000 ? bytes : null;
        }
      }
      await new Promise(r => setTimeout(r, 2_500));
    }
    ultimoMotivo = `la GPU alquilada no terminó la imagen en ${Math.round(timeoutMs / 1000)} s`;
    return null;
  } catch (e) {
    ultimoMotivo = `la GPU alquilada no respondió: ${String((e as Error)?.message || e).slice(0, 120)}`;
    return null;
  }
}

/** Pollinations: el respaldo GRATIS, apagado por defecto. Se usa solo si el dueño lo pide con PERMITIR_IMAGEN_GRATIS=1. */
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
  /** El negativo que pide ESE motor. FLUX lo ignora (cfg 1) y va vacío; SDXL lo usa. */
  negativo?: string;
}): Promise<ImagenGenerada | null> {
  const medida = medidaDe(d.formato);
  const semilla = d.semilla ?? Math.floor(Math.random() * 1_000_000);
  const tiempo = d.timeoutMs ?? 120_000;

  ultimoMotivo = '';
  // DESCONECTADAS: no se intenta ningún proveedor y se dice por qué. Sin este corte se iba igual contra la GPU
  // y se esperaban hasta cinco minutos por un fallo anunciado.
  if (IMAGENES_DESCONECTADAS) {
    ultimoMotivo = 'las imágenes están desconectadas a pedido del dueño (IMAGENES_DESCONECTADAS=1): el motor no pinta hasta que se vuelvan a conectar';
    return null;
  }
  // 1º el pago por API (FLUX con la llave del dueño), 2º la GPU alquilada (ComfyUI·SDXL),
  // 3º el gratis SOLO si el dueño lo pidió a propósito. Sin ninguno, no hay imagen y queda el motivo.
  let bytes = await conFlux(d.prompt, medida, tiempo);
  let fuente = `FLUX.1-schnell (Hugging Face · ${MODELO_FLUX})`;
  if (!bytes) {
    const delPago = ultimoMotivo;
    bytes = await conLaGpuAlquilada(d.prompt, d.negativo ?? '', medida, semilla, d.timeoutMs ?? 300_000);
    if (bytes) {
      fuente = `${familiaDelModelo(MODELO_GPU)} en la GPU alquilada (ComfyUI · ${MODELO_GPU})`;
    } else {
      const deLaGpu = ultimoMotivo;
      if (PERMITIR_GRATIS) {
        bytes = await conPollinations(d.prompt, medida, semilla, tiempo);
        fuente = 'Pollinations (respaldo gratis, pedido a propósito)';
      } else {
        // El gratis está apagado: no se cae a él en silencio. El motivo queda dicho.
        ultimoMotivo = `${deLaGpu || delPago || 'no hay proveedor de imágenes configurado'} · el modelo gratis está apagado (PERMITIR_IMAGEN_GRATIS=1 lo habilita)`;
      }
    }
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
/** Hay camino pago configurado: la llave de FLUX o la GPU alquilada. El gratis no cuenta. */
export const hayProveedorDeImagenes = () => !IMAGENES_DESCONECTADAS && Boolean(llave('HF_TOKEN') || GPU_IMAGENES);
/** QUÉ MOTOR está pintando ahora mismo: manda el prompt (lo pide el que llama) y se guarda con la pieza. */
export const motorDeImagenEnUso = () => ({
  motor: motorDeImagen(MODELO_GPU),
  modelo: MODELO_GPU,
  proveedor: IMAGENES_DESCONECTADAS
    ? 'desconectadas a pedido del dueño (hasta que el motor esté como quiere)'
    : (GPU_IMAGENES ? 'la GPU alquilada (ComfyUI)' : (llave('HF_TOKEN') ? 'Hugging Face · FLUX' : 'sin proveedor de imágenes')),
});
export const proveedoresDeImagenes = () => ({
  flux_con_llave: Boolean(llave('HF_TOKEN')),
  gpu_alquilada: GPU_IMAGENES || null,
  modelo_de_la_gpu: MODELO_GPU,
  gratis_permitido: PERMITIR_GRATIS,
  desconectadas: IMAGENES_DESCONECTADAS,
});
/** El respaldo gratis: apagado salvo pedido explícito (decisión del dueño). */
export const hayLlaveDeImagenes = () => hayProveedorDeImagenes();

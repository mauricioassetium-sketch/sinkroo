// =====================================================================================================
// EL MOTOR DE VIDEO: la foto de cada plano se ANIMA (imagen → video) y la pieza se arma con esa animación,
// la voz del motor y subtítulos.
//
// POR QUÉ EXISTE. Antes la pieza "video" salía de poner las fotos quietas con un zoom (Ken Burns) encima, y
// el dueño lo dijo con esas palabras: «el video es una mierda… no imágenes con zoom que ni siquiera
// representan lo que dice el texto». Tenía razón en las dos partes: los planos no hablaban del sujeto de la
// frase (eso se arregló en `prompts-por-motor.entradaDePlanos`) y el movimiento no existía.
//
// CÓMO SE GENERA. ComfyUI aparte en la GPU alquilada, con Wan 2.1 I2V. La configuración no es la del
// talking-head: con el LoRA destilado y 6 pasos (cfg 1) el clip queda PEGADO a la foto —medido: los cinco
// fotogramas son la misma imagen—, así que va sin ese LoRA, con 20 pasos, cfg 5, shift 5 y un poco de ruido
// de arranque (0,05). Así el clip se mueve de verdad. Cuesta 9-10 minutos por cada 5 segundos de video.
//
// LO QUE NO HACE: no inventa el texto (la voz y los subtítulos salen de las funciones del motor), no sube
// nada de la pieza al servidor, y si algo falla deja el motivo escrito en vez de entregar un video vacío.
// =====================================================================================================
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { guionParaLaVoz, ritmoParaEdge, vozSegunCaso } from './video.js';
import { textoParaLaVoz } from './prompts-por-motor.js';

const URL_VIDEO = () => String(process.env.VIDEO_API_URL || '').replace(/\/+$/, '');

/** El motor de video en uso: la máquina de por hora por su túnel, o nada. */
export const motorDeVideo = () => ({
  url: URL_VIDEO(),
  modelo: process.env.VIDEO_MODELO || 'Wan2_1-I2V-14B-480P_fp8_e4m3fn.safetensors',
  proveedor: VIDEOS_DESCONECTADOS ? 'desconectados a pedido del dueño (no se gasta en cada corrida)' : (URL_VIDEO() ? 'la GPU alquilada (Wan 2.1 I2V)' : 'sin motor de video'),
});
/**
 * LOS VIDEOS, DESCONECTADOS A PEDIDO DEL DUEÑO.
 *
 * Junto con las imágenes: «para no gastar plata en cada corrida». Animar es lo más caro del motor (~9-10
 * minutos de A100 por clip, medido), así que mientras el motor no esté como se quiere, la corrida no lo pide.
 */
const VIDEOS_DESCONECTADOS = /^(1|si|sí|true)$/i.test(String(process.env.VIDEOS_DESCONECTADOS || ''));

export const hayMotorDeVideo = () => !VIDEOS_DESCONECTADOS && Boolean(URL_VIDEO());

/**
 * LIBERA LA MEMORIA DEL MOTOR DE IMÁGENES ANTES DE ANIMAR.
 *
 * Los dos motores viven en la MISMA tarjeta. El de imágenes —FLUX— se carga el modelo entero y se queda con
 * ~28 de los 40 GB; el de video necesita ~28 GB para el suyo y no entra. Medido en la prueba real: sin esto
 * el clip falla con «Got an OOM, unloading all loaded models» en 11 segundos y la pieza queda sin video, sin
 * que nada lo diga. Se le pide al motor de imágenes que suelte el modelo (no se apaga: se descarga en ~30 s
 * la próxima vez que se le pida una foto).
 */
export async function liberarElMotorDeImagen(): Promise<void> {
  const url = (process.env.IMAGENES_API_URL || '').replace(/\/+$/, '');
  if (!url) return;
  try {
    await fetch(`${url}/free`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unload_models: true, free_memory: true }),
      signal: AbortSignal.timeout(20_000),
    });
    console.log('[video] se le pidió al motor de imágenes que suelte la memoria de la GPU');
  } catch (e) {
    console.error('[video] no se pudo liberar el motor de imágenes (se intenta animar igual):', (e as Error)?.message);
  }
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * El grafo de ComfyUI, con los números de nodo de la máquina. Es el mismo que se probó a mano: los números
 * importan y el `num_frames` de Wan tiene que ser 4n+1.
 */
function grafo(d: { imagen: string; prompt: string; negativo: string; segundos: number; modelo: string; semilla: number }) {
  const fps = 16;
  const numFrames = Math.max(17, ((Math.round(d.segundos * fps) - 1) >> 2 << 2) + 1);
  return {
    '1': { class_type: 'LoadImage', inputs: { image: d.imagen } },
    '2': { class_type: 'ImageScale', inputs: { image: ['1', 0], upscale_method: 'lanczos', width: 480, height: 832, crop: 'center' } },
    '3': { class_type: 'WanVideoVAELoader', inputs: { model_name: 'Wan2_1_VAE_bf16.safetensors', precision: 'bf16' } },
    '4': { class_type: 'LoadWanVideoT5TextEncoder', inputs: { model_name: 'umt5-xxl-enc-bf16.safetensors', precision: 'bf16', load_device: 'offload_device', quantization: 'disabled' } },
    '5': { class_type: 'WanVideoTextEncode', inputs: { positive_prompt: d.prompt, negative_prompt: d.negativo, t5: ['4', 0], force_offload: true, device: 'gpu' } },
    // El LoRA destilado va con fuerza 0: se conserva el nodo (el cargador lo pide) pero NO se aplica, que es
    // lo que deja el clip quieto.
    '6': { class_type: 'WanVideoLoraSelect', inputs: { lora: 'Lightx2v/lightx2v_I2V_14B_480p_cfg_step_distill_rank64_bf16.safetensors', strength: 0.0, merge_loras: false, prev_lora: null } },
    '7': { class_type: 'WanVideoBlockSwap', inputs: { blocks_to_swap: 20, offload_img_emb: true, offload_txt_emb: true, prefetch_blocks: 1 } },
    '8': { class_type: 'WanVideoModelLoader', inputs: { model: d.modelo, base_precision: 'bf16', quantization: 'disabled', load_device: 'offload_device', attention_mode: 'sdpa', lora: ['6', 0], block_swap_args: ['7', 0] } },
    '9': { class_type: 'CLIPVisionLoader', inputs: { clip_name: 'split_files/clip_vision/clip_vision_h.safetensors' } },
    '10': { class_type: 'WanVideoClipVisionEncode', inputs: { clip_vision: ['9', 0], image_1: ['2', 0], strength_1: 1.0, strength_2: 1.0, crop: 'center', combine_embeds: 'average', force_offload: true } },
    '11': { class_type: 'WanVideoImageToVideoEncode', inputs: { width: 480, height: 832, num_frames: numFrames, noise_aug_strength: 0.05, start_latent_strength: 1.0, end_latent_strength: 1.0, force_offload: true, vae: ['3', 0], clip_embeds: ['10', 0], start_image: ['2', 0], fun_or_fl2v_model: true } },
    '12': { class_type: 'WanVideoSampler', inputs: { model: ['8', 0], image_embeds: ['11', 0], text_embeds: ['5', 0], steps: 20, cfg: 5.0, shift: 5.0, seed: d.semilla, force_offload: true, scheduler: 'unipc', riflex_freq_index: 0 } },
    '13': { class_type: 'WanVideoDecode', inputs: { vae: ['3', 0], samples: ['12', 0], enable_vae_tiling: false, tile_x: 272, tile_y: 272, tile_stride_x: 144, tile_stride_y: 128 } },
    '14': { class_type: 'CreateVideo', inputs: { images: ['13', 0], fps } },
    '15': { class_type: 'SaveVideo', inputs: { video: ['14', 0], filename_prefix: 'video/sinkroo', format: 'mp4', codec: 'h264' } },
  };
}

/**
 * ANIMA UNA FOTO: sube la imagen al motor de video, manda el grafo, espera y trae el mp4.
 * Devuelve los bytes del clip o el motivo por el que no salió (nunca lanza).
 */
export async function animarFoto(d: {
  foto: Buffer; nombre: string; prompt: string; negativo?: string; segundos?: number; timeoutMs?: number;
}): Promise<{ ok: true; clip: Buffer; segundos: number } | { ok: false; motivo: string }> {
  const url = URL_VIDEO();
  if (!url) return { ok: false, motivo: 'no hay motor de video configurado (VIDEO_API_URL)' };
  const segundos = d.segundos && d.segundos > 0 ? Math.min(5, d.segundos) : 5;
  const t0 = Date.now();
  try {
    // 1) la foto entra al motor por su API de archivos (no hace falta tocar el disco de la máquina a mano)
    const forma = new FormData();
    forma.append('image', new Blob([new Uint8Array(d.foto)], { type: 'image/png' }), `${d.nombre}.png`);
    forma.append('overwrite', 'true');
    const subida = await fetch(`${url}/upload/image`, { method: 'POST', body: forma, signal: AbortSignal.timeout(120_000) });
    if (!subida.ok) return { ok: false, motivo: `el motor de video no aceptó la foto (${subida.status})` };

    // 2) el trabajo
    const envio = await fetch(`${url}/prompt`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: grafo({ imagen: `${d.nombre}.png`, prompt: d.prompt, negativo: d.negativo ?? '', segundos, modelo: motorDeVideo().modelo, semilla: 12345 }), client_id: 'sinkroo-video' }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!envio.ok) return { ok: false, motivo: `el motor de video contestó ${envio.status}: ${(await envio.text()).slice(0, 140)}` };
    const { prompt_id: pid, node_errors: errores } = (await envio.json()) as { prompt_id?: string; node_errors?: unknown };
    if (!pid) return { ok: false, motivo: `el motor de video rechazó el trabajo: ${JSON.stringify(errores).slice(0, 200)}` };

    // 3) la espera: cada 5 s se pregunta por el historial del trabajo
    const limite = Date.now() + (d.timeoutMs ?? 25 * 60_000);
    while (Date.now() < limite) {
      await esperar(5_000);
      const h = await fetch(`${url}/history/${pid}`, { signal: AbortSignal.timeout(30_000) });
      if (!h.ok) continue;
      const historial = (await h.json()) as Record<string, { status?: { status_str?: string }; outputs?: Record<string, { images?: { filename: string; subfolder?: string; type?: string }[] }> }>;
      const mio = historial[pid];
      if (!mio) continue;
      if (mio.status?.status_str === 'error') return { ok: false, motivo: 'el motor de video falló al animar (memoria o modelo): mirá su registro' };
      if (mio.status?.status_str !== 'success') continue;
      const video = Object.values(mio.outputs ?? {}).flatMap((o) => o.images ?? []).find((i) => /\.mp4$/i.test(i.filename));
      if (!video) return { ok: false, motivo: 'el motor de video terminó pero no dejó el archivo' };
      const baja = await fetch(`${url}/view?filename=${encodeURIComponent(video.filename)}&subfolder=${encodeURIComponent(video.subfolder ?? '')}&type=${video.type ?? 'output'}`, { signal: AbortSignal.timeout(180_000) });
      if (!baja.ok) return { ok: false, motivo: `el clip no se pudo bajar (${baja.status})` };
      const clip = Buffer.from(await baja.arrayBuffer());
      if (clip.length < 20_000) return { ok: false, motivo: `el clip salió vacío (${clip.length} bytes)` };
      return { ok: true, clip, segundos: Math.round((Date.now() - t0) / 1000) };
    }
    return { ok: false, motivo: 'la animación se pasó del tiempo de espera' };
  } catch (e) {
    return { ok: false, motivo: `el motor de video no respondió: ${String((e as Error)?.message || e).slice(0, 140)}` };
  }
}

/**
 * ARMA LA PIEZA con los clips animados: los pone en fila al tamaño que pide el formato, les pone la VOZ del
 * motor (en la lengua de la pieza) y los subtítulos, tomados del mismo texto que lee la voz.
 */
export function armarPieza(d: {
  /**
   * Los tramos de la pieza, EN ORDEN. `clip` es un plano animado; `foto` es un plano que se quedó quieto
   * —una toma fija, que se sostiene con un movimiento mínimo— porque NO se anima todo: animar cada plano
   * cuesta ~9-10 minutos de GPU, y el dueño pidió que no sea para todo.
   */
  segmentos: { tipo: 'clip' | 'foto'; archivo: string }[];
  carpeta: string; titulo: string; copy: string;
  tono?: string; pais?: string; lengua?: string; formato?: string;
}): { archivo: string; segundos: number; voz: string; animados: number } | null {
  if (!d.segmentos.length) return null;
  const dir = d.carpeta;
  fs.mkdirSync(dir, { recursive: true });
  const vertical = !/1:1|cuadrad/i.test(String(d.formato || '')) && !/16:9|horizontal/i.test(String(d.formato || ''));
  const ancho = vertical ? 1080 : (/1:1|cuadrad/i.test(String(d.formato || '')) ? 1080 : 1920);
  const alto = vertical ? 1920 : (/1:1|cuadrad/i.test(String(d.formato || '')) ? 1080 : 1080);

  // 1) la voz, con las funciones del motor (el texto y la voz no se inventan acá)
  const paraVoz = textoParaLaVoz(guionParaLaVoz(String(d.copy || ''), String(d.titulo || ''))).texto;
  const { voz, ritmo } = vozSegunCaso(d.tono, d.pais, d.lengua);
  const mp3 = path.join(dir, 'voz.mp3');
  execFileSync('edge-tts', ['--voice', voz, `--rate=${ritmoParaEdge(ritmo)}`, '--text', paraVoz, '--write-media', mp3], { stdio: 'pipe' });
  const dur = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp3]).toString().trim());

  // 2) los subtítulos: la voz repartida en renglones cortos, con tiempo según lo que ocupa cada uno
  const renglones: string[] = [];
  for (const frase of paraVoz.split(/(?<=[.!?…])\s+/)) {
    let resto = frase.trim();
    while (resto.length > 64) {
      const corte = resto.lastIndexOf(',', 64) > 20 ? resto.lastIndexOf(',', 64) + 1 : resto.lastIndexOf(' ', 64);
      renglones.push(resto.slice(0, corte).trim());
      resto = resto.slice(corte).trim();
    }
    if (resto) renglones.push(resto);
  }
  const esHora = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), seg = s % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${seg.toFixed(3).padStart(6, '0').replace('.', ',')}`;
  };
  const total = renglones.reduce((n, r) => n + r.length, 0) || 1;
  let t = 0;
  const srt = renglones.map((r, i) => {
    const desde = t, hasta = Math.min(dur, t + (r.length / total) * dur);
    t = hasta;
    return `${i + 1}\n${esHora(desde)} --> ${esHora(hasta)}\n${r}\n`;
  }).join('\n');
  fs.writeFileSync(path.join(dir, 'subs.srt'), srt, 'utf8');

  // ---------------------------------------------------------------------------------------------
  // LA NORMALIZACIÓN DE TIEMPOS (manual, módulo 3): LA FILA DE PLANOS TIENE QUE DURAR LO MISMO QUE LA VOZ.
  // Los clips animados duran lo suyo (5 s cada uno, no se estiran); las tomas fijas sostienen la diferencia.
  // Antes las fijas duraban 3 s fijos y al final se cortaba con `-shortest`, o sea la pieza quedaba del largo
  // del tramo MÁS CORTO: con una voz de 26,5 s y 17 s de imagen, se perdía el final de la voz y los últimos
  // planos no se veían. Ahora el largo de cada toma fija se calcula para que la suma dé exactamente la voz.
  // ---------------------------------------------------------------------------------------------
  const DURACION_DE_UN_CLIP = 5;
  const clips = d.segmentos.filter((s) => s.tipo === 'clip').length;
  const fijas = d.segmentos.length - clips;
  const porFija = fijas
    ? Math.max(2.2, Math.min(12, (dur - clips * DURACION_DE_UN_CLIP) / fijas))
    : 0;
  const largoDeLaFila = clips * DURACION_DE_UN_CLIP + Math.round(porFija * fijas * 10) / 10;
  console.log(`[video] la voz dura ${Math.round(dur * 10) / 10}s · ${clips} clips (${clips * DURACION_DE_UN_CLIP}s) + ${fijas} tomas fijas de ${Math.round(porFija * 10) / 10}s = ${largoDeLaFila}s`);

  // 3) la fila: los planos animados y, en su lugar, las tomas fijas; todas al mismo tamaño y ritmo
  const tramos: string[] = [];
  d.segmentos.forEach((s, i) => {
    if (s.tipo === 'clip') { tramos.push(s.archivo); return; }
    // La toma fija se sostiene con un acercamiento mínimo (no es un zoom sobre la foto: es una cámara que
    // respira), y dura lo que pide la normalización. Si el filtro falla, queda la toma quieta: nunca se
    // pierde el plano.
    const destino = path.join(dir, `fijo-${i + 1}.mp4`);
    const cuadros = Math.round(porFija * 24);
    try {
      execFileSync('ffmpeg', ['-v', 'error', '-y', '-loop', '1', '-i', s.archivo, '-t', String(porFija),
        '-vf', `fps=24,scale=${ancho * 2}:${alto * 2}:force_original_aspect_ratio=increase,crop=${ancho * 2}:${alto * 2},zoompan=z='min(zoom+0.0004,1.08)':d=${cuadros}:s=${ancho}x${alto},fps=24`,
        '-c:v', 'libx264', '-crf', '20', '-preset', 'medium', '-pix_fmt', 'yuv420p', destino], { stdio: 'pipe' });
      tramos.push(destino);
    } catch {
      execFileSync('ffmpeg', ['-v', 'error', '-y', '-loop', '1', '-i', s.archivo, '-t', String(porFija),
        '-vf', `fps=24,scale=${ancho}:${alto}:force_original_aspect_ratio=increase,crop=${ancho}:${alto}`,
        '-c:v', 'libx264', '-crf', '20', '-preset', 'medium', '-pix_fmt', 'yuv420p', destino], { stdio: 'pipe' });
      tramos.push(destino);
    }
  });
  const lista = path.join(dir, 'lista.txt');
  fs.writeFileSync(lista, tramos.map((c) => `file '${c}'`).join('\n'), 'utf8');
  const mudo = path.join(dir, 'mudo.mp4');
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lista,
    '-vf', `fps=24,scale=${ancho}:${alto}:force_original_aspect_ratio=increase,crop=${ancho}:${alto}`,
    '-c:v', 'libx264', '-crf', '20', '-preset', 'medium', '-pix_fmt', 'yuv420p', mudo], { stdio: 'pipe' });

  // 4) el clip mudo + la voz, cortado a lo que dura la voz, con los subtítulos quemados
  const salida = path.join(dir, 'pieza-animada.mp4');
  const margen = Math.round(alto * 0.06);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', mudo, '-i', mp3,
    '-vf', `subtitles=${path.join(dir, 'subs.srt')}:force_style='FontName=DejaVu Sans,FontSize=${Math.round(alto / 64)},Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H80000000,BorderStyle=3,Outline=2,Shadow=0,MarginV=${margen}'`,
    '-map', '0:v', '-map', '1:a', '-shortest', '-c:v', 'libx264', '-crf', '20', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', salida], { stdio: 'pipe' });

  const info = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', salida]).toString().trim());
  return { archivo: salida, segundos: info, voz, animados: d.segmentos.filter((s) => s.tipo === 'clip').length };
}

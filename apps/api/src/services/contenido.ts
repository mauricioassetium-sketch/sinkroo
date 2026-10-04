// =============================================================================================
// LOS CONTENIDOS QUE NO SON VIDEO — ffmpeg, sin GPU, en el servidor
//
// Los tipos que no son video se arman acá: «imagen con texto», «reel de imágenes»,
// «reel con animación» y «título animado». NO se filma nada ni se manda nada a una máquina con GPU:
// son cuadros con movimiento leve y texto encima, más un fondo sonoro sintetizado por ffmpeg.
// Sale un MP4 de verdad, y queda guardado donde el panel ya sabe reproducirlo
// (`generacion.video_generado` + `GET /api/piezas/:id/video`), así que el panel los muestra sin inventar
// ninguna pantalla nueva.
//
// EL MATERIAL DE IMAGEN es el mismo de siempre: las imágenes que pinta `imagenes.ts` (FLUX / su respaldo).
// Si el proveedor no devuelve ninguna, el contenido SALE IGUAL con un fondo liso hecho con ffmpeg y se dice
// con qué se armó y por qué no hay imagen del proveedor: un fondo liso declarado no es una imagen inventada.
//
// EL SONIDO: es un tono sintetizado por ffmpeg (dos senos suaves con entrada y salida). NO es música con
// licencia y no se dice que lo sea. Los reels llevan audio (lo pide su tipo); la imagen y el título no.
// =============================================================================================

import { execFile } from 'node:child_process';
import { mkdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { claseDelTipo, type ClaseDePieza, type TipoDeContenido, SEGUNDOS_MAXIMOS_VIDEO } from './formatos.js';

const correr = promisify(execFile);

/** Dónde quedan los MP4 armados: el mismo sitio de los videos, que es lo que el panel ya sirve. */
const RAIZ = process.env.VIDEOS_DIR || '/root/work/sinkroo-a/datos/videos';
/** Dónde se arma el contenido (segmentos y archivos de texto temporales). Se borra al terminar. */
const TRABAJO = process.env.CONTENIDOS_TRABAJO || '/root/work/sinkroo-a/datos/trabajo';
/** La tipografía: una que está en el servidor y tiene los acentos del español. */
const FUENTE = process.env.FUENTE_TEXTO || '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
const FPS = 30;
/** Cuántos segundos dura cada cuadro de un reel: alcanza para leer el texto que lleva encima. */
const SEGUNDOS_POR_CUADRO = 3;

export type ContenidoGenerado = {
  archivo: string;
  url: string;
  peso: number;
  segundos: number;
  tipo_de_contenido: TipoDeContenido;
  clase: ClaseDePieza;
  /** Cuántas imágenes del proveedor entraron. 0 = se armó con fondo liso y se dice. */
  imagenes: number;
  /** Cómo lleva el sonido (o que no lleva). */
  audio: string;
  fuente: string;
  /** El panel muestra esto igual que en el video montado: la pieza dice con qué se hizo. */
  voz: string;
  voz_porque: string;
  /** La medida real del archivo, leída de sus bytes. */
  ancho: number;
  alto: number;
  materiales: number;
  aviso?: string;
};

/** La medida de salida según el formato de la pieza. */
function medidaDe(formato: string): { ancho: number; alto: number } {
  return /1:1|cuadrad/i.test(String(formato || '')) ? { ancho: 1080, alto: 1080 } : { ancho: 1080, alto: 1920 };
}

/** El color de marca si hay uno medido; si no, un azul oscuro neutro (no se le inventa una paleta). */
function colorDe(colores: string[] | undefined): { hex: string; medido: boolean } {
  const valido = (colores ?? []).find(c => /^#[0-9a-f]{6}$/i.test(String(c)));
  return valido ? { hex: String(valido).toLowerCase().replace('#', '0x'), medido: true } : { hex: '0x16202e', medido: false };
}

/** El color con el que el texto se lee mejor encima de ese fondo: se calcula la luminancia, no se adivina. */
function mejorTexto(hex: string, medido: boolean): string {
  if (!medido) return 'white';
  const n = Number.parseInt(hex.replace('0x', ''), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return l > 0.55 ? '0x111827' : 'white';
}

/** Parte un texto en renglones que quepan, sin cortar palabras. */
function envolver(texto: string, porLinea = 24, maxLineas = 3): string[] {
  const palabras = String(texto || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const lineas: string[] = [];
  for (const p of palabras) {
    const ultima = lineas[lineas.length - 1];
    if (ultima && (ultima + ' ' + p).length <= porLinea) lineas[lineas.length - 1] = `${ultima} ${p}`;
    else lineas.push(p);
    if (lineas.length > maxLineas) break;
  }
  return lineas.slice(0, maxLineas);
}

/** Un archivo de texto por renglón: drawtext lee de ahí, así ningún carácter del negocio rompe el filtro. */
async function renglonesEnDisco(dir: string, marca: string, lineas: string[]): Promise<string[]> {
  const rutas: string[] = [];
  for (let i = 0; i < lineas.length; i++) {
    const ruta = path.join(dir, `${marca}-l${i + 1}.txt`);
    // El `%` es lo único que drawtext expandiría: se cambia por su forma escrita.
    await writeFile(ruta, lineas[i].replace(/%/g, ' por ciento'), 'utf8');
    rutas.push(ruta);
  }
  return rutas;
}

/**
 * Los filtros de drawtext de un texto, renglón por renglón, con su caja para que se lea al sol.
 * ANIMADO: el texto entra deslizándose hacia arriba y aparece en medio segundo — es el movimiento que frena
 * el scroll en el reel con animación y en el título animado; en los demás entra quieto.
 */
function drawtexts(d: {
  ancho: number; alto: number; lineas: string[]; archivos: string[];
  color: string; tamano?: number; animado?: boolean; desde?: number;
}): string[] {
  const tamano = d.tamano ?? Math.round(d.ancho / 17);
  const interlinea = Math.round(tamano * 1.25);
  const y0 = Math.round(d.alto * 0.58 - (d.lineas.length * interlinea) / 2);
  const desde = d.desde ?? 0.4;
  return d.archivos.map((ruta, i) => {
    const y = y0 + i * interlinea;
    const anim = d.animado
      ? `:alpha='min(1,(t-${desde})/0.6)':y='${y}+if(lt(t,${desde}),40,40*max(0,1-(t-${desde})/0.6))'`
      : '';
    return [
      `drawtext=fontfile=${FUENTE}`,
      `textfile=${ruta}`,
      `fontsize=${tamano}`,
      `fontcolor=${d.color}`,
      `box=1:boxcolor=black@0.45:boxborderw=${Math.round(tamano * 0.35)}`,
      'x=(w-text_w)/2',
      `y=${y}`,
    ].join(':') + anim;
  });
}

/** El motivo del último ffmpeg que falló (el final de su salida). Sin esto solo queda «falló». */
let ultimoMotivo = '';
export const motivoDelUltimoFalloDeContenido = () => ultimoMotivo;
async function ffmpeg(args: string[], timeoutMs: number): Promise<boolean> {
  try {
    await correr('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], {
      timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024,
    });
    return true;
  } catch (e) {
    const err = e as { stderr?: string; stdout?: string; message?: string; killed?: boolean };
    const salida = String(err.stderr || err.stdout || err.message || '');
    ultimoMotivo = err.killed
      ? 'ffmpeg se pasó del tiempo de espera'
      : (salida.split('\n').filter(Boolean).slice(-4).join(' | ').slice(0, 400) || 'ffmpeg no dijo por qué');
    return false;
  }
}

/** La duración REAL del archivo, leída de sus bytes (no de lo que diga la herramienta). */
async function duracion(archivo: string): Promise<number> {
  try {
    const { stdout } = await correr('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', archivo], { timeout: 30_000 });
    const n = Number(String(stdout).trim());
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
  } catch { return 0; }
}

/** Lo que dice ffprobe del archivo: su medida real y si tiene audio. Es lo que se reporta. */
async function ficha(archivo: string): Promise<{ ancho: number; alto: number; audio: boolean }> {
  try {
    const { stdout } = await correr('ffprobe', [
      '-v', 'error', '-show_entries', 'stream=codec_type,width,height', '-of', 'json', archivo,
    ], { timeout: 30_000 });
    const j = JSON.parse(String(stdout)) as { streams?: { codec_type?: string; width?: number; height?: number }[] };
    const v = (j.streams ?? []).find(s => s.codec_type === 'video');
    return {
      ancho: Number(v?.width ?? 0), alto: Number(v?.height ?? 0),
      audio: (j.streams ?? []).some(s => s.codec_type === 'audio'),
    };
  } catch { return { ancho: 0, alto: 0, audio: false }; }
}

/** El fondo liso: cuando el proveedor de imágenes no devolvió nada, el contenido sale igual y se dice. */
function fondoLiso(color: string, medida: { ancho: number; alto: number }, segundos: number): string[] {
  return ['-f', 'lavfi', '-i', `color=c=${color}:s=${medida.ancho}x${medida.alto}:d=${segundos}:r=${FPS}`];
}

/**
 * El fondo sonoro de los reels: dos senos suaves, con entrada y salida. Sintetizado por ffmpeg: no es música
 * con licencia y así se declara.
 */
function fondoSonoro(segundos: number): { args: string[]; filtro: string } {
  const salida = Math.max(0, segundos - 0.9);
  return {
    args: [
      '-f', 'lavfi', '-i', `sine=frequency=196:duration=${segundos}:sample_rate=44100`,
      '-f', 'lavfi', '-i', `sine=frequency=294:duration=${segundos}:sample_rate=44100`,
    ],
    filtro: '[1:a]volume=0.05[a1];[2:a]volume=0.03[a2];[a1][a2]amix=inputs=2:duration=longest,'
      + `afade=t=in:st=0:d=0.6,afade=t=out:st=${salida}:d=0.9[a]`,
  };
}

/** Un cuadro: una imagen (o el fondo liso) con su texto encima y movimiento leve. Devuelve el MP4 o null. */
async function cuadro(d: {
  dir: string; nombre: string; imagen: string | null; color: string; colorDelTexto: string;
  medida: { ancho: number; alto: number }; segundos: number; lineas: string[];
  animado: boolean; desenfoque?: boolean; timeoutMs: number;
}): Promise<string | null> {
  const salida = path.join(d.dir, `${d.nombre}.mp4`);
  const frames = Math.round(d.segundos * FPS);
  const entradas: string[] = [];
  const filtros: string[] = [];
  if (d.imagen) {
    entradas.push('-loop', '1', '-i', d.imagen);
    filtros.push(
      `scale=${d.medida.ancho}:${d.medida.alto}:force_original_aspect_ratio=increase`,
      `crop=${d.medida.ancho}:${d.medida.alto}`, 'setsar=1',
    );
    if (d.desenfoque) filtros.push('gblur=sigma=6');
    // El movimiento leve: un acercamiento lento, para que el cuadro no se vea muerto.
    filtros.push(`zoompan=z='min(1+0.0012*on,1.12)':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${d.medida.ancho}x${d.medida.alto}:fps=${FPS}`);
  } else {
    entradas.push(...fondoLiso(d.color, d.medida, d.segundos));
  }
  const archivos = await renglonesEnDisco(d.dir, d.nombre, d.lineas);
  filtros.push(...drawtexts({
    ancho: d.medida.ancho, alto: d.medida.alto, lineas: d.lineas, archivos,
    color: d.colorDelTexto, animado: d.animado, desde: 0.3,
  }));
  filtros.push('format=yuv420p');
  const ok = await ffmpeg([
    ...entradas, '-vf', filtros.join(','),
    '-frames:v', String(frames), '-r', String(FPS),
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart', salida,
  ], d.timeoutMs);
  return ok ? salida : null;
}

/**
 * Arma el contenido de una pieza que NO es video. Devuelve null si no se pudo (y nunca lanza): la pieza
 * se queda con su texto y se dice por qué.
 */
export async function generarContenido(d: {
  businessId: string; piezaId: string; tipoDeContenido: TipoDeContenido; formato: string;
  /** La frase corta del título (para el título animado). */
  titulo: string;
  /** Lo que va escrito en pantalla, en orden: una entrada por cuadro del reel. */
  textos: string[];
  /** Las imágenes que pintó `imagenes.ts` (puede venir vacío: entonces se arma con fondo liso y se dice). */
  materiales: string[];
  colores?: string[];
  /** Por qué no hay imágenes del proveedor, cuando no las hay (el motivo que dio el proveedor). */
  motivoSinImagen?: string;
  timeoutMs?: number;
}): Promise<ContenidoGenerado | null> {
  const clase = claseDelTipo(d.tipoDeContenido);
  if (clase === 'video' || clase === 'reel_texto') return null; // el video lo monta MoneyPrinterTurbo
  const medida = medidaDe(d.formato);
  const color = colorDe(d.colores);
  const colorDelTexto = mejorTexto(color.hex, color.medido);
  const dir = path.join(TRABAJO, d.piezaId);
  const carpetaFinal = path.join(RAIZ, d.businessId);
  const final = path.join(carpetaFinal, `${d.piezaId}.mp4`);
  const timeoutMs = d.timeoutMs ?? 120_000;
  const imagenes = (d.materiales ?? []).filter(Boolean);
  const textos = (d.textos ?? []).map(t => String(t || '').trim()).filter(Boolean);

  try {
    await mkdir(dir, { recursive: true });
    await mkdir(carpetaFinal, { recursive: true });

    if (clase === 'titulo_animado') {
      // 3 segundos para enganchar: el texto entra animado sobre su imagen (desenfocada) o el color de marca.
      const segundos = 3;
      const salio = await cuadro({
        dir, nombre: 'titulo', imagen: imagenes[0] ?? null, color: color.hex, colorDelTexto,
        medida, segundos, lineas: envolver(textos[0] || d.titulo, 18, 2), animado: true,
        desenfoque: true, timeoutMs,
      });
      if (!salio) return null;
      await rename(salio, final);

    } else if (clase === 'imagen') {
      // Un solo cuadro con el texto encima, quieto 5 segundos. Sin sonido.
      const salio = await cuadro({
        dir, nombre: 'imagen', imagen: imagenes[0] ?? null, color: color.hex, colorDelTexto,
        medida, segundos: 5, lineas: envolver(textos[0] || d.titulo, 22, 3), animado: false, timeoutMs,
      });
      if (!salio) return null;
      await rename(salio, final);

    } else {
      // LOS REELS: una imagen por cuadro, en orden, y encima el fondo sonoro. El de animación mueve el texto.
      const animado = clase === 'reel_animacion';
      const cuantos = Math.min(4, Math.max(2, imagenes.length || textos.length || 2));
      const segmentos: string[] = [];
      for (let i = 0; i < cuantos; i++) {
        const texto = textos[i] ?? textos[textos.length - 1] ?? d.titulo;
        const seg = await cuadro({
          dir, nombre: `seg-${i}`, imagen: imagenes[i] ?? imagenes[imagenes.length - 1] ?? null,
          color: color.hex, colorDelTexto, medida, segundos: SEGUNDOS_POR_CUADRO,
          lineas: envolver(texto, 20, 3), animado, timeoutMs,
        });
        if (!seg) return null;
        segmentos.push(seg);
      }
      const total = Math.min(SEGUNDOS_MAXIMOS_VIDEO, cuantos * SEGUNDOS_POR_CUADRO);
      // Se pegan los cuadros (mismo códec y misma medida: se copian sin recomprimir)…
      const lista = path.join(dir, 'segmentos.txt');
      await writeFile(lista, segmentos.map(s => `file '${s}'`).join('\n'), 'utf8');
      const pegado = path.join(dir, 'pegado.mp4');
      if (!await ffmpeg(['-f', 'concat', '-safe', '0', '-i', lista, '-c', 'copy', '-movflags', '+faststart', pegado], timeoutMs)) return null;
      // …y encima el sonido: el reel se oye, y se dice con qué.
      const audio = fondoSonoro(total);
      const ok = await ffmpeg([
        '-i', pegado, ...audio.args,
        '-filter_complex', audio.filtro,
        '-map', '0:v', '-map', '[a]', '-shortest',
        '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart',
        '-t', String(total), final,
      ], timeoutMs);
      if (!ok) return null;
    }

    const info = await stat(final);
    // EL ARCHIVO SE JUZGA POR LO QUE ES, NO POR CUÁNTO PESA. Acá había un piso de 20.000 bytes y un cuadro
    // con FONDO LISO —color plano y texto, sin imagen del proveedor— pesa menos que eso con todo derecho: se
    // descartaba un archivo que reproducía perfecto y la pieza quedaba con «ffmpeg no dijo por qué», sin nada
    // que buscar. Ahora manda la medida: si ffprobe lee un video con su tamaño, el archivo sirve.
    const f = await ficha(final);
    if (!f.ancho || !f.alto) {
      ultimoMotivo = `el archivo salió sin video legible (${info.size} bytes): ffmpeg no dejó un MP4 que se pueda abrir`;
      return null;
    }
    if (info.size < 2_000) {
      ultimoMotivo = `el archivo quedó vacío (${info.size} bytes) aunque ffprobe lea ${f.ancho}x${f.alto}: no se guarda`;
      return null;
    }
    const llevaAudio = clase === 'reel_imagenes' || clase === 'reel_animacion';
    return {
      archivo: final, url: `/api/piezas/${d.piezaId}/video`, peso: info.size,
      segundos: await duracion(final),
      tipo_de_contenido: d.tipoDeContenido, clase,
      imagenes: Math.min(imagenes.length, clase === 'imagen' || clase === 'titulo_animado' ? 1 : 4),
      audio: llevaAudio
        ? `sí: tono suave sintetizado con ffmpeg (no es música con licencia) · ${f.audio ? 'el archivo trae su pista de audio' : 'OJO: el archivo salió sin pista de audio'}`
        : 'no lleva',
      fuente: 'ffmpeg en el servidor (sin GPU): cuadros con movimiento leve y texto encima'
        + (imagenes.length ? ' sobre las imágenes del mismo proveedor de `imagenes.ts`' : ' sobre un fondo liso'),
      voz: 'sin voz',
      voz_porque: 'este tipo no lleva voz: lo que dice va escrito en pantalla',
      ancho: f.ancho, alto: f.alto, materiales: imagenes.length,
      aviso: imagenes.length ? undefined
        : `el proveedor de imágenes no devolvió ninguna imagen${d.motivoSinImagen ? ` (${d.motivoSinImagen})` : ''}: el contenido se armó con un fondo liso ${color.medido ? 'con el color de marca medido' : 'gris azulado, porque no hay paleta medida de la marca'}`,
    };
  } catch (e) {
    // UN FALLO TIENE QUE DECIR POR QUÉ. Antes esto leía solo `message`, y una excepción sin mensaje dejaba
    // «no se pudo armar: » —vacío— en el registro y «ffmpeg no dijo por qué» en la pieza: la pantalla no podía
    // explicar nada y no había por dónde buscar. Ahora se guarda el mensaje, el código, la salida del proceso
    // si la trae, y el tipo de error; y si de verdad no hay nada, se dice que no hubo mensaje.
    const err = e as { message?: string; code?: string; stderr?: string; name?: string; stack?: string };
    const salida = String(err?.stderr || '').split('\n').filter(Boolean).slice(-3).join(' | ').slice(0, 240);
    const partes = [err?.message, err?.code, salida, err?.name === 'Error' ? '' : err?.name]
      .map(x => String(x || '').trim()).filter(Boolean);
    ultimoMotivo = (partes.length ? partes.join(' · ') : 'el motor de cuadros falló sin dejar mensaje')
      + (err?.stack ? ` · ${String(err.stack).split('\n')[1]?.trim().slice(0, 140) || ''}` : '');
    ultimoMotivo = ultimoMotivo.slice(0, 400);
    console.error('[contenido] no se pudo armar:', ultimoMotivo);
    return null;
  } finally {
    void rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export const carpetaDeContenidos = () => RAIZ;
export const herramientaDeContenido = () => 'ffmpeg';

// =============================================================================================
// EL VIDEO DE LA PIEZA — el último eslabón: la pieza de video sale montada, con voz y subtítulos
//
// Hasta acá, una pieza de video terminaba en su guion, sus planos y sus imágenes: el dueño tenía que
// armar el video en otro lado. MoneyPrinterTurbo (MIT, sin GPU) monta el video completo a partir del
// audio, las imágenes y el copy — y es lo que se usa acá.
//
// DOS COSAS QUE SE DESCUBRIERON PROBÁNDOLO, y que quedan escritas para no volver a tropezar:
//
// 1) `--video-source local` con `--video-materials`: NO hace falta ninguna llave de banco de imágenes.
//    El video se arma con NUESTRAS imágenes (las que pinta FLUX para la pieza). La documentación hace
//    creer que hace falta Pexels; no hace falta.
// 2) La voz propia se elige con `--voice-name`. Con la voz nativa (Edge TTS, gratis) MoneyPrinterTurbo
//    calcula los SUBTÍTULOS SOLO; si se le pasa un audio de afuera (`--custom-audio-file`) los pierde
//    —su registro queda con `subtitle: ""`—. Por eso acá se usa la voz nativa: subtítulos y voz, los dos.
//
// LA VOZ VA SEGÚN EL CASO, no por gusto: sale del tono que el negocio declaró en «Primeros pasos».
// Un negocio que dijo «Profesional y formal» no habla como uno que dijo «Cercano y cálido». Son voces
// colombianas (es-CO) porque es el mercado, no una voz de doblaje.
//
// Si el montaje falla, la pieza se queda con su guion, sus planos y sus imágenes —y lo dice—: el video
// es un extra, no un requisito para que la pieza exista.
// =============================================================================================

import { execFile } from 'node:child_process';
import { mkdir, copyFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const correr = promisify(execFile);

/**
 * LOS MONTAJES VAN DE A UNO. Dos a la vez se pelean los 4 corazones del servidor y los dos fallan —y no
 * con un error claro, sino con «Command failed»—. Se ve en la prueba: los dos que corrieron juntos no
 * salieron; los mismos dos, de a uno, salieron. La cola conserva el orden en que se pidieron.
 */
let cola: Promise<unknown> = Promise.resolve();
function enFila<T>(tarea: () => Promise<T>): Promise<T> {
  const siguiente = cola.then(tarea, tarea);
  cola = siguiente.then(() => undefined, () => undefined);
  return siguiente;
}

/** Dónde vive MoneyPrinterTurbo en el servidor y dónde quedan los videos montados (son datos, no código). */
const MPT = process.env.MPT_DIR || '/root/agentes/MoneyPrinterTurbo';
const RAIZ = process.env.VIDEOS_DIR || '/root/work/sinkroo-a/datos/videos';

/**
 * El ritmo de la voz. `--voice-rate` espera un NÚMERO (multiplicador), no un porcentaje: pasarle
 * «-8%» hace fallar el montaje entero —y el error que devuelve no lo dice—. 0,92 es hablar un poco
 * más despacio, que es la mitad del arreglo del «tono robótico».
 */
const RITMO = '0.92';

/** El motivo del último montaje que falló. Sin esto sólo queda «Command failed», que no dice nada. */
let ultimoMotivo = '';
export const motivoDelUltimoFallo = () => ultimoMotivo;

export type VideoGenerado = {
  archivo: string;
  url: string;
  peso: number;
  segundos: number;
  voz: string;
  voz_porque: string;
  fuente: string;
  materiales: number;
};

/**
 * La voz según el caso. Se lee el tono que el negocio declaró y se elige de ahí — no al azar.
 * Todas son voces colombianas de Edge TTS (gratis, sin llave) y el ritmo baja al 92%: hablar más
 * despacio es la mitad del arreglo del «tono robótico».
 */
export function vozSegunCaso(tono: string | undefined, pais?: string): { voz: string; porque: string; ritmo: string } {
  const t = String(tono || '').toLowerCase();
  const p = String(pais || '').toLowerCase();
  const esColombia = !p || /colombia|co\b/.test(p);
  const base = esColombia ? 'es-CO' : (/mexic/.test(p) ? 'es-MX' : (/argentin|rioplat/.test(p) ? 'es-AR' : 'es-CO'));
  if (/cercan|cálid|calid|amable|familiar|comercio/.test(t)) {
    return { voz: `${base}-SalomeNeural`, porque: 'el negocio se presentó «Cercano y cálido»: voz conversacional', ritmo: RITMO };

  }
  if (/formal|profesional|institucional|corporativ|serio/.test(t)) {
    return { voz: `${base}-GonzaloNeural`, porque: 'el negocio se presentó «Profesional y formal»: voz medida y pausada', ritmo: RITMO };

  }
  return { voz: `${base}-GonzaloNeural`, porque: 'sin tono declarado: se usa la voz neutra del mercado', ritmo: RITMO };
}

/** Los segundos que dura el video, leídos del propio archivo (no de lo que diga la herramienta). */
async function duracion(archivo: string): Promise<number> {
  try {
    const { stdout } = await correr('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', archivo], { timeout: 30_000 });
    const n = Number(String(stdout).trim());
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
  } catch { return 0; }
}

/**
 * Monta el video de una pieza de video. Devuelve null si no se pudo (y nunca lanza).
 * `materiales` son rutas de imágenes NUESTRAS: el video se arma con lo que la pieza ya generó.
 */
export async function generarVideo(d: {
  businessId: string; piezaId: string; formato: string; titulo: string; copy: string;
  materiales: string[]; tono?: string; pais?: string; timeoutMs?: number;
}): Promise<VideoGenerado | null> {
  const materiales = (d.materiales ?? []).filter(Boolean);
  if (!materiales.length) return null;
  // Solo las piezas de VIDEO filmado se montan así. Una «reel con texto sobre imagen» lleva tarjetas,
  // no planos filmados; una imagen no tiene voz. El formato manda.
  const f = String(d.formato || '').toLowerCase();
  if (!/video/.test(f) || /texto/.test(f)) return null;
  const voz = vozSegunCaso(d.tono, d.pais);
  const segundosEspera = d.timeoutMs ?? 15 * 60_000;
  // El aspecto es el de la PIEZA: una pieza cuadrada no puede salir vertical, o el resultado no es el
  // que se pidió. El formato manda (es el mismo dato con el que se pintó su imagen).
  const aspecto = /1:1|cuadrad/i.test(f) ? '1:1' : (/16:9|horizontal|apaisad/i.test(f) ? '16:9' : '9:16');

  const args = [
    'cli.py',
    '--video-subject', String(d.titulo || 'la pieza').slice(0, 180),
    '--video-script', String(d.copy || '').slice(0, 2400),
    '--video-language', 'es',
    '--video-source', 'local',
    '--video-materials', materiales.join(','),
    '--video-aspect', aspecto,
    '--video-clip-duration', '5',
    '--voice-name', voz.voz,
    '--voice-rate', voz.ritmo,
    '--paragraph-number', '1',
  ];

  try {
    const { stdout } = await enFila(() => correr(path.join(MPT, '.venv', 'bin', 'python'), args, {
      cwd: MPT, timeout: segundosEspera, maxBuffer: 24 * 1024 * 1024,
    }));
    // La última línea es el resumen en JSON; de ahí sale la ruta del video montado.
    const lineas = String(stdout).trim().split('\n').filter(Boolean);
    let resumen: { result?: { videos?: string[] } } | null = null;
    for (let i = lineas.length - 1; i >= 0 && !resumen; i--) {
      if (lineas[i].trim().startsWith('{')) {
        try { resumen = JSON.parse(lineas[i]); } catch { /* sigue siendo texto de registro */ }
      }
    }
    const origen = resumen?.result?.videos?.[0];
    if (!origen) return null;
    const info = await stat(origen);
    if (info.size < 50_000) return null; // un video de verdad pesa megas; un archivo así está vacío

    const carpeta = path.join(RAIZ, d.businessId);
    await mkdir(carpeta, { recursive: true });
    const archivo = path.join(carpeta, `${d.piezaId}.mp4`);
    await copyFile(origen, archivo);
    return {
      archivo, url: `/api/piezas/${d.piezaId}/video`, peso: info.size,
      segundos: await duracion(archivo), voz: voz.voz, voz_porque: voz.porque,
      fuente: 'MoneyPrinterTurbo (MIT, sin GPU) · voz Edge TTS y subtítulos nativos',
      materiales: materiales.length,
    };
  } catch (e) {
    // El error de un comando fallido no está en `message` («Command failed»): el motivo real viene en la
    // salida del proceso. Se guarda el final de la salida, que es donde está la causa.
    const err = e as { message?: string; stdout?: string; stderr?: string; killed?: boolean };
    const salida = String(err.stderr || err.stdout || err.message || '');
    const final = salida.split('\n').filter(Boolean).slice(-6).join(' | ').slice(0, 400);
    ultimoMotivo = err.killed ? 'se pasó del tiempo de espera' : (final || 'el montaje no devolvió motivo');
    console.error('[video] no se pudo montar:', ultimoMotivo);
    return null;
  }
}

export const carpetaDeVideos = () => RAIZ;
export const herramientaDeVideo = () => MPT;

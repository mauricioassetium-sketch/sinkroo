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
import { textoParaLaVoz } from './prompts-por-motor.js';
import { mkdir, copyFile, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { SEGUNDOS_MAXIMOS_VIDEO } from './formatos.js';

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

/**
 * El ritmo para Edge TTS. El motor guarda el ritmo como multiplicador («0.92») y Edge TTS lo pide como
 * porcentaje con signo («-8%»): son el mismo ajuste en dos formatos, y con el de acá la voz no se genera
 * (falla en silencio y la pieza queda sin locución). Se convierte en un solo lugar.
 */
export const ritmoParaEdge = (ritmo: string): string => {
  const n = Number(ritmo);
  if (!Number.isFinite(n) || n === 1) return '+0%';
  return `${n > 1 ? '+' : ''}${Math.round((n - 1) * 100)}%`;
};

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
  /** Qué se le quitó al texto antes de que la voz lo leyera (la forma, nunca el contenido). */
  texto_de_la_voz?: { quitado: string[]; porque: string };
  /** Si hubo que cortarlo para que no pasara de 30 s (el techo que fijó el dueño). */
  recortado_a_30s?: boolean;
  /** Lo que duraba antes de cortarlo: se dice, no se borra. */
  segundos_antes_de_recortar?: number;
};

/**
 * EL TECHO DE 30 SEGUNDOS. El dueño lo fijó: un video dura 30 segundos como máximo. El montaje se arma con
 * 6 escenas de 5 s, pero la voz puede estirarlo —y un video de 41 segundos no es lo que se pidió—. Cuando se
 * pasa, se corta acá y se dice cuánto duraba: el archivo queda con lo que se pidió, y el número real queda
 * guardado en vez de desaparecer.
 */
async function recortarA30(archivo: string, limite: number): Promise<boolean> {
  const temporal = `${archivo}.cortando.mp4`;
  try {
    await correr('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y', '-i', archivo, '-t', String(limite),
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', temporal,
    ], { timeout: 240_000 });
    const info = await stat(temporal);
    if (info.size < 50_000) { await rm(temporal, { force: true }); return false; }
    await rm(archivo, { force: true });
    await rename(temporal, archivo);
    return true;
  } catch (e) {
    await rm(temporal, { force: true }).catch(() => undefined);
    console.error('[video] no se pudo recortar a', limite, 's:', (e as Error)?.message);
    return false;
  }
}

/**
 * EL GUION QUE SE DICE EN VOZ ALTA. El dueño lo señaló: «todos hablando lo mismo, se repite el texto».
 * Venían dos cosas mezcladas: el TÍTULO de la pieza pegado adelante del copy (y el título repite el gancho)
 * y frases que el copy trae dos veces. Acá se limpia: se quita el título si abre el texto y se dejan las
 * frases una sola vez, en su orden. Lo que NO se toca es el contenido: no se inventa ni se reescribe nada.
 */
export function guionParaLaVoz(texto: string, titulo?: string): string {
  const normal = (s: string) => s.replace(/\s+/g, ' ').trim();
  let t = normal(String(texto || ''));

  // 1) EL TÍTULO PEGADO ADELANTE: el título de la pieza ya repite el gancho, y leer los dos es decir lo
  //    mismo dos veces. Si el texto arranca con él (con o sin dos puntos), se saca.
  const tit = normal(String(titulo || ''));
  if (tit.length > 8) {
    for (const p of [tit, tit.split(':')[0]]) {
      const pp = normal(p);
      if (pp.length > 8 && t.toLowerCase().startsWith(pp.toLowerCase())) {
        t = normal(t.slice(pp.length).replace(/^[\s:·—–-]+/, ''));
        break;
      }
    }
  }

  // 2) BLOQUES REPETIDOS: el copy de estas piezas trae el mismo renglón dos veces (el gancho y el cuerpo
  //    dicen lo mismo). Se busca el trozo largo que aparece dos veces y se deja uno: es lo que hacía que el
  //    video «se repitiera solo». Se mide por texto, no por frases, porque viene sin puntos.
  let cortado = true;
  let vueltas = 0;
  while (cortado && vueltas < 8) {
    cortado = false;
    vueltas++;
    for (let largo = Math.min(180, Math.floor(t.length / 2)); largo >= 40 && !cortado; largo -= 5) {
      for (let i = 0; i + largo <= t.length; i++) {
        const trozo = t.slice(i, i + largo);
        const j = t.indexOf(trozo, i + largo);
        if (j > -1) {
          t = normal(t.slice(0, j) + ' ' + t.slice(j + largo));
          cortado = true;
          break;
        }
      }
    }
  }

  // 3) Y por si queda alguna frase corta suelta repetida, se quita la segunda.
  const frases = t.split(/(?<=[.!?])\s+|\s*[;,]\s*/).map(f => f.trim()).filter(Boolean);
  const vistas = new Set<string>();
  const limpias: string[] = [];
  for (const f of frases) {
    const clave = f.toLowerCase().replace(/[^a-záéíóúñ0-9 ]/g, '');
    if (clave.length > 20 && vistas.has(clave)) continue;
    if (clave.length > 20) vistas.add(clave);
    limpias.push(f);
  }
  return normal(limpias.join(' ')) || t;
}

/**
 * La voz según el caso. Se lee el tono que el negocio declaró y se elige de ahí — no al azar.
 * Todas son voces colombianas de Edge TTS (gratis, sin llave) y el ritmo baja al 92%: hablar más
 * despacio es la mitad del arreglo del «tono robótico».
 */
export function vozSegunCaso(tono: string | undefined, pais?: string, idioma?: string): { voz: string; porque: string; ritmo: string } {
  const t = String(tono || '').toLowerCase();
  const p = String(pais || '').toLowerCase();
  // LA VOZ VA EN LA LENGUA DE LA PIEZA. Un negocio que vende en inglés y se locuta con voz colombiana suena
  // a doblaje, y el que escucha lo nota antes que nada. La lengua la decide el motor (la del mercado, medida
  // en los avisos que encuentra), no el país del domicilio: por eso entra por parámetro.
  if (/ingl|english/.test(String(idioma || '').toLowerCase())) {
    if (/cercan|cálid|calid|amable|familiar|comercio/.test(t)) {
      return { voz: 'en-US-JennyNeural', porque: 'la pieza va en inglés y el negocio se presentó «Cercano y cálido»: voz conversacional', ritmo: RITMO };
    }
    if (/formal|profesional|institucional|corporativ|serio/.test(t)) {
      return { voz: 'en-GB-RyanNeural', porque: 'la pieza va en inglés con tono institucional: voz sobria de registro británico', ritmo: RITMO };
    }
    return { voz: 'en-US-GuyNeural', porque: 'la pieza va en inglés y no hay tono declarado: voz neutra', ritmo: RITMO };
  }
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
  materiales: string[]; tono?: string; pais?: string; lengua?: string; timeoutMs?: number;
}): Promise<VideoGenerado | null> {
  const materiales = (d.materiales ?? []).filter(Boolean);
  if (!materiales.length) return null;
  // Solo las piezas de VIDEO filmado se montan así. Una «reel con texto sobre imagen» lleva tarjetas,
  // no planos filmados; una imagen no tiene voz. El formato manda.
  const f = String(d.formato || '').toLowerCase();
  if (!/video/.test(f) || /texto/.test(f)) return null;
  const voz = vozSegunCaso(d.tono, d.pais, d.lengua);
  // El texto que va a leer la voz, pasado por los DOS filtros: el de contenido (repetidos y título) y el de
  // forma (lo que un lector de voz no puede leer). Se guarda qué se quitó, para que se pueda revisar.
  const textoDeLaVoz = textoParaLaVoz(guionParaLaVoz(String(d.copy || ''), String(d.titulo || '')));
  const segundosEspera = d.timeoutMs ?? 15 * 60_000;
  // El aspecto es el de la PIEZA: una pieza cuadrada no puede salir vertical, o el resultado no es el
  // que se pidió. El formato manda (es el mismo dato con el que se pintó su imagen).
  const aspecto = /1:1|cuadrad/i.test(f) ? '1:1' : (/16:9|horizontal|apaisad/i.test(f) ? '16:9' : '9:16');

  const args = [
    'cli.py',
    '--video-subject', String(d.titulo || 'la pieza').slice(0, 180),
    // Lo que se dice: primero el copy sin el título pegado y sin frases repetidas (guionParaLaVoz), y después
    // la forma que el motor de VOZ sí puede leer (textoParaLaVoz): sin emojis, numerales, enlaces ni markdown.
    '--video-script', textoDeLaVoz.texto.slice(0, 2400),
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
    // EL TECHO DE 30 SEGUNDOS: si el montaje se pasó, se corta y se dice lo que duraba.
    const segundosMontados = await duracion(archivo);
    const sePaso = segundosMontados > SEGUNDOS_MAXIMOS_VIDEO + 0.05;
    const recortado = sePaso ? await recortarA30(archivo, SEGUNDOS_MAXIMOS_VIDEO) : false;
    return {
      archivo, url: `/api/piezas/${d.piezaId}/video`, peso: (await stat(archivo)).size,
      segundos: await duracion(archivo), voz: voz.voz, voz_porque: voz.porque,
 // Con qué se armó el texto que se lee: sin esto, «el video habla distinto al copy» no se puede explicar.
 texto_de_la_voz: { quitado: textoDeLaVoz.quitado, porque: textoDeLaVoz.porque },
      fuente: 'MoneyPrinterTurbo (MIT, sin GPU) · voz Edge TTS y subtítulos nativos',
      materiales: materiales.length,
      ...(sePaso ? { recortado_a_30s: recortado, segundos_antes_de_recortar: segundosMontados } : {}),
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

/**
 * VOLVER A ARMAR LOS MONTAJES QUE SE CORTARON.
 *
 * Un montaje vive DENTRO del proceso: si el back se reinicia (un despliegue, un apagón, una edición con el
 * servidor de desarrollo), esa promesa muere y la pieza se queda con sus imágenes pintadas —pagadas— y sin
 * video. Antes eso se declaraba cortado y ahí quedaba: el dueño veía «el video no salió» en una pieza que
 * tenía TODO para armarse, y la única salida era volver a pagar una ronda entera.
 *
 * Ahora esas piezas se vuelven a montar SOLAS al arrancar el back, una por una, con el mismo material que ya
 * está en disco. No se espera: montar tarda minutos y el arranque no se puede quedar colgado por eso.
 */
export async function recuperarMontajes(
  db: { query: (sql: string, valores?: unknown[]) => Promise<{ rows: Record<string, any>[] }> },
  log: (m: string) => void = () => {},
): Promise<number> {
  let hechos = 0;
  const candidatas = await db.query(
    `SELECT id, business_id, formato, titulo, texto, generacion FROM piezas
      WHERE coalesce(generacion->>'tipo_de_contenido', '') = 'video'
        AND generacion ? 'imagen_generada'
        AND NOT (generacion ? 'video_generado')
      ORDER BY id
      LIMIT 10`,
  ).catch(() => ({ rows: [] as Record<string, any>[] }));

  for (const p of candidatas.rows) {
    const materiales = ((p.generacion?.imagenes_generadas ?? []) as { archivo?: string }[])
      .map(i => String(i?.archivo || '')).filter(Boolean);
    if (!materiales.length) continue;
    // El tono con el que se elige la voz: el del negocio (es el mismo que usó la corrida).
    const tono = ((await db.query('SELECT tone FROM businesses WHERE id = $1', [p.business_id])
      .catch(() => ({ rows: [] as Record<string, any>[] }))).rows[0]?.tone ?? '') as string;
    log(`volviendo a armar el video de ${p.id} (${materiales.length} imágenes ya pintadas)`);
    const vid = await generarVideo({
      businessId: String(p.business_id), piezaId: String(p.id), formato: String(p.formato),
      titulo: String(p.titulo || ''), copy: String(p.texto || ''), materiales, tono, timeoutMs: 900_000,
    });
    if (vid) {
      // Se guarda el video Y SE BORRA EL MOTIVO de corte: la pieza ya no está cortada, está hecha.
      await db.query(
        `UPDATE piezas SET generacion = jsonb_set(generacion - 'video_error', '{video_generado}', $2::jsonb) WHERE id = $1`,
        [p.id, JSON.stringify(vid)],
      ).catch(() => {});
      hechos += 1;
      log(`video recuperado: ${vid.archivo} · ${vid.segundos}s · ${vid.peso} bytes`);
    } else {
      await db.query(
        `UPDATE piezas SET generacion = jsonb_set(generacion, '{video_error}', $2::jsonb) WHERE id = $1`,
        [p.id, JSON.stringify({ motivo: `no se pudo armar otra vez: ${motivoDelUltimoFallo()}`, cuando: new Date().toISOString() })],
      ).catch(() => {});
      log(`no se pudo recuperar el video de ${p.id}: ${motivoDelUltimoFallo()}`);
    }
  }
  return hechos;
}

import type { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import { createWriteStream } from 'node:fs';
import { mkdir, stat, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { execute, query } from '../lib/db.js';
import { exigirSesion } from '../lib/auth.js';

// =============================================================================================
// ARCHIVOS DEL NEGOCIO — subir, listar y borrar.
//
// Cada negocio ve lo suyo y nada más: todas las consultas van con su `business_id`, y el archivo se
// guarda dentro de SU carpeta. Un archivo de otro negocio responde igual que uno que no existe (404),
// para no contar qué hay del otro lado.
//
// POR QUÉ ASÍ
//   · El archivo va al disco y la fila a `archivos`: el disco guarda el contenido, la base guarda qué es
//     y de quién. La ruta del servidor NUNCA sale en una respuesta: es información de la máquina.
//   · El nombre se limpia antes de tocar el disco. Un nombre con «../» escribiría fuera de la carpeta del
//     negocio, y ahí sí que se puede hacer daño.
//   · El límite de peso y la lista de tipos se revisan ANTES de escribir: lo que no sirve no llega al
//     disco ni deja fila.
// =============================================================================================

/** Dónde viven los archivos. Se puede mover con ARCHIVOS_DIR, pero por defecto es la carpeta del servidor. */
const RAIZ = process.env.ARCHIVOS_DIR || '/root/work/sinkroo-a/datos/archivos';

/** 25 MB por archivo. Es lo que se puede subir desde el panel sin cortar el trabajo de nadie. */
const PESO_MAXIMO = 25 * 1024 * 1024;

/**
 * Lo que se puede subir, por familia. La extensión es la que decide, y se compara en minúsculas.
 * `svg` va en imágenes aunque sea texto: el navegador lo muestra como imagen. Ojo: un SVG puede traer
 * scripts, así que los archivos no se sirven nunca desde este dominio (no hay ruta que los devuelva),
 * sólo se guardan para el negocio.
 */
const FAMILIAS: Record<string, string[]> = {
  documento: ['pdf', 'doc', 'docx', 'rtf', 'txt', 'md', 'xls', 'xlsx', 'csv', 'ppt', 'pptx', 'odt', 'ods'],
  imagen: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'heic', 'svg'],
  video: ['mp4', 'mov', 'webm', 'avi'],
  audio: ['mp3', 'wav', 'm4a', 'ogg'],
};

const FAMILIA_DE = new Map<string, string>(
  Object.entries(FAMILIAS).flatMap(([familia, extensiones]) => extensiones.map(e => [e, familia] as [string, string])),
);

/** Todo lo que se puede subir, en un solo texto, para decirlo en el error. */
const TIPOS_ESCRITOS = Object.entries(FAMILIAS)
  .map(([familia, extensiones]) => `${familia}s (${extensiones.join(', ')})`)
  .join('; ');

/**
 * El nombre con el que se guarda el archivo.
 *
 * Se le quita la ruta (los navegadores de Windows mandan la ruta completa), los caracteres de control y
 * todo lo que no sea letra, número, punto, guion o guion bajo; los «..» se vuelven «.» y los puntos del
 * principio se quitan, para que nadie escriba fuera de su carpeta ni deje archivos escondidos. Si de tanta
 * limpieza no queda nada, se guarda como «archivo».
 */
function nombreLimpio(original: unknown): string {
  const base = path.basename(String(original ?? '').replace(/\\/g, '/'));
  const limpio = base
    .normalize('NFC')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[^\p{L}\p{N}._-]+/gu, '_')
    .replace(/\.{2,}/g, '.')
    .slice(0, 100);
  // El nombre no puede empezar con punto (sería un archivo escondido) ni terminar en punto o guion bajo.
  // Lo que se recorta es el TALLO, no la extensión: quitándole el punto a «informe.pdf» el archivo se
  // queda sin tipo y se rechaza. Sólo cuenta como extensión lo que sigue a un punto y es corto y de
  // letras o números («.pdf» sí, «.» no).
  const posible = path.extname(limpio);
  const extension = /^\.[\p{L}\p{N}]{1,8}$/u.test(posible) ? posible : '';
  const tallo = (extension ? limpio.slice(0, -extension.length) : limpio)
    .replace(/^[._]+/, '')
    .replace(/[._]+$/, '');
  return (tallo || 'archivo') + extension;
}

const extensionDe = (nombre: string) => path.extname(nombre).replace(/^\./, '').toLowerCase();

/** La carpeta del negocio: cada uno en la suya, y creada si no está. */
async function carpetaDe(businessId: string): Promise<string> {
  const carpeta = path.join(RAIZ, businessId);
  await mkdir(carpeta, { recursive: true });
  return carpeta;
}

/** Deja que el resto del archivo se vaya por el desagüe: sin esto la conexión queda abierta esperando. */
async function drenar(flujo: NodeJS.ReadableStream): Promise<void> {
  try { for await (const _ of flujo as AsyncIterable<unknown>) { /* se bota */ } } catch { /* ya no importa */ }
}

/** El error del plugin cuando el archivo pasa del límite. */
const pasóDePeso = (e: unknown) => (e as { code?: string })?.code === 'FST_REQ_FILE_TOO_LARGE';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function archivosRoutes(app: FastifyInstance) {
  // El lector de multipart/form-data. Se registra acá, junto a las rutas que lo usan, para que el límite
  // de peso viva en un solo lugar. `fileSize` se pasa explícito: si no, el plugin toma el límite general
  // del cuerpo (2 MB) y ningún archivo pasaría.
  await app.register(multipart, {
    limits: { fileSize: PESO_MAXIMO, files: 1, fields: 10, parts: 20 },
  });

  /** Lo que el negocio tiene guardado. Nunca sale la ruta del servidor. */
  app.get('/api/archivos', async (req, reply) => {
    const u = await exigirSesion(req, reply);
    if (!u) return;
    // Una cuenta sin negocio no tiene archivos. Se dice, en vez de responder con el cuerpo vacío: vacío se
    // lee como «no hay nada», y lo que pasa es otra cosa.
    if (!u.business_id) {
      return reply.status(409).send({
        error: 'su cuenta todavía no tiene un negocio: complete el primer paso y vuelva a intentarlo',
        codigo: 'sin_negocio',
      });
    }
    const filas = await query<{ id: string; nombre: string; tipo: string; peso: string; created_at: Date }>(
      `SELECT id, nombre, tipo, peso, created_at
         FROM archivos
        WHERE business_id = $1
        ORDER BY created_at DESC`,
      [u.business_id],
    );
    return {
      archivos: filas.map(f => ({
        id: f.id, nombre: f.nombre, tipo: f.tipo,
        // El peso es BIGINT: llega como texto para no perder precisión. Va como número porque son bytes.
        peso: Number(f.peso),
        created_at: new Date(f.created_at).toISOString(),
      })),
    };
  });

  /** Subir un archivo (multipart/form-data, campo «archivo»). */
  app.post('/api/archivos', async (req, reply) => {
    const u = await exigirSesion(req, reply);
    if (!u) return;
    // Una cuenta sin negocio no tiene archivos. Se dice, en vez de responder con el cuerpo vacío: vacío se
    // lee como «no hay nada», y lo que pasa es otra cosa.
    if (!u.business_id) {
      return reply.status(409).send({
        error: 'su cuenta todavía no tiene un negocio: complete el primer paso y vuelva a intentarlo',
        codigo: 'sin_negocio',
      });
    }

    let parte: Awaited<ReturnType<typeof req.file>>;
    try {
      parte = await req.file();
    } catch (e) {
      if (pasóDePeso(e)) {
        return reply.status(400).send({
          error: 'el archivo pasa de 25 MB. Mande uno más liviano o córtelo en partes.',
          codigo: 'archivo_muy_grande', maximo_bytes: PESO_MAXIMO,
        });
      }
      throw e;
    }
    if (!parte) {
      return reply.status(400).send({
        error: 'no llegó ningún archivo. Mándelo en el campo «archivo» del formulario.',
        codigo: 'archivo_falta',
      });
    }

    // El nombre se limpia ANTES de escribir nada, y el tipo se revisa antes también: lo que no sirve no
    // toca el disco.
    const nombre = nombreLimpio(parte.filename);
    const extension = extensionDe(nombre);
    const familia = FAMILIA_DE.get(extension);
    if (!familia) {
      await drenar(parte.file);
      return reply.status(400).send({
        error: extension
          ? `no se puede subir un archivo «.${extension}». Se pueden subir ${TIPOS_ESCRITOS}.`
          : 'ese archivo no dice de qué tipo es. Póngale la extensión (por ejemplo .pdf o .jpg) y vuelva a mandarlo.',
        codigo: 'tipo_no_permitido',
      });
    }

    // La fila se identifica ANTES de escribir: el nombre en el disco lleva el id, así dos archivos con el
    // mismo nombre no se pisan y siempre se puede volver de la fila al archivo.
    const id = randomUUID();
    const carpeta = await carpetaDe(u.business_id);
    const destino = path.join(carpeta, `${id}__${nombre}`);

    let peso: number;
    try {
      await pipeline(parte.file, createWriteStream(destino));
      peso = (await stat(destino)).size;
    } catch (e) {
      // Si se cortó por peso, queda un pedazo de archivo en el disco: se borra, no sirve.
      await unlink(destino).catch(() => { /* no estaba: nada que borrar */ });
      if (pasóDePeso(e)) {
        return reply.status(400).send({
          error: 'el archivo pasa de 25 MB. Mande uno más liviano o córtelo en partes.',
          codigo: 'archivo_muy_grande', maximo_bytes: PESO_MAXIMO,
        });
      }
      req.log.error(e);
      return reply.status(500).send({ error: 'no se pudo guardar el archivo', codigo: 'no_se_guardó' });
    }

    // El lector corta el archivo al llegar al límite pero NO lo avisa por la cañería: deja el pedazo
    // marcado en `truncated`. Sin esta revisión, un archivo de 100 MB se guardaba cortado a 25 MB como si
    // estuviera completo, y el negocio se quedaba con un archivo roto sin saberlo.
    if (parte.file.truncated) {
      await unlink(destino).catch(() => { /* no estaba: nada que borrar */ });
      return reply.status(400).send({
        error: 'el archivo pasa de 25 MB. Mande uno más liviano o córtelo en partes.',
        codigo: 'archivo_muy_grande', maximo_bytes: PESO_MAXIMO,
      });
    }

    // Un archivo sin bytes no es un archivo: si se guarda, queda una fila fantasma que después nadie
    // puede abrir.
    if (!peso) {
      await unlink(destino).catch(() => { /* no estaba: nada que borrar */ });
      return reply.status(400).send({
        error: 'el archivo llegó vacío: no trae nada. Vuelva a mandarlo.',
        codigo: 'archivo_vacio',
      });
    }

    const filas = await query<{ id: string; nombre: string; tipo: string; peso: string; created_at: Date }>(
      `INSERT INTO archivos (id, business_id, nombre, tipo, peso, ruta)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, nombre, tipo, peso, created_at`,
      [id, u.business_id, nombre, extension, peso, destino],
    );
    const f = filas[0];
    return reply.status(201).send({
      ok: true,
      archivo: { id: f.id, nombre: f.nombre, tipo: f.tipo, peso: Number(f.peso), created_at: new Date(f.created_at).toISOString() },
    });
  });

  /** Borrar un archivo del negocio: la fila y el archivo del disco. */
  app.delete('/api/archivos/:id', async (req, reply) => {
    const u = await exigirSesion(req, reply);
    if (!u) return;
    // Una cuenta sin negocio no tiene archivos. Se dice, en vez de responder con el cuerpo vacío: vacío se
    // lee como «no hay nada», y lo que pasa es otra cosa.
    if (!u.business_id) {
      return reply.status(409).send({
        error: 'su cuenta todavía no tiene un negocio: complete el primer paso y vuelva a intentarlo',
        codigo: 'sin_negocio',
      });
    }

    const id = String((req.params as { id?: string } | undefined)?.id || '');
    // Un id que no es un UUID no se le pasa a Postgres: reventaría la consulta y delataría la tabla.
    // Se responde lo mismo que si no existiera.
    if (!UUID.test(id)) {
      return reply.status(404).send({ error: 'ese archivo no existe o no es suyo', codigo: 'no_existe' });
    }

    // El `business_id` va en el WHERE: si el archivo es de otro negocio, no aparece y no se borra nada.
    const filas = await query<{ ruta: string | null }>(
      'SELECT ruta FROM archivos WHERE id = $1 AND business_id = $2', [id, u.business_id],
    );
    if (!filas.length) {
      return reply.status(404).send({ error: 'ese archivo no existe o no es suyo', codigo: 'no_existe' });
    }

    const ruta = filas[0].ruta;
    if (ruta) {
      // Antes de borrar se comprueba que la ruta esté DENTRO de la carpeta del negocio: la ruta la
      // escribimos nosotros, pero si alguien la cambiara en la base, esto evita que se borre otra cosa.
      const carpeta = path.resolve(RAIZ, u.business_id);
      const objetivo = path.resolve(ruta);
      if (objetivo.startsWith(carpeta + path.sep)) {
        await unlink(objetivo).catch((e: NodeJS.ErrnoException) => {
          // `ENOENT` es que ya no estaba: la fila se borra igual, es lo que el negocio pidió.
          if (e.code !== 'ENOENT') req.log.error(e);
        });
      } else {
        req.log.warn({ seguridad: true, detalle: 'la ruta del archivo quedó fuera de la carpeta del negocio: no se borró del disco' });
      }
    }

    await execute('DELETE FROM archivos WHERE id = $1 AND business_id = $2', [id, u.business_id]);
    return { ok: true };
  });
}

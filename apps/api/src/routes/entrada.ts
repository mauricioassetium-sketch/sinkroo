import type { FastifyInstance } from 'fastify';
import { query } from '../lib/db.js';
import { exigirSesion } from '../lib/auth.js';
import { pasarElFreno } from '../lib/seguridad.js';

// =============================================================================================
// CÓDIGOS DE ENTRADA — la puerta por la que el dueño deja pasar a un negocio.
//
// El dueño crea el código con `scripts/codigos-de-entrada.sh` (nota + usos), se lo pasa al negocio por
// fuera del producto, y el negocio lo escribe acá. Al aceptarlo, el negocio queda registrado y ve la
// nota: es lo que le confirma que entró donde debía («Skincare Natural · Ana»).
//
// LO QUE NO SE HACE, Y POR QUÉ
//   · El código NUNCA se escribe en los registros ni se devuelve dentro de un error: si viaja en el
//     mensaje, queda en los logs y en la pantalla de quien esté probando. En las respuestas sólo va si el
//     código existe, y cuando no, el texto es el mismo para «no existe» y «no es suyo».
//   · Un código se compara en MAYÚSCULAS y sin espacios: el negocio lo copia de un WhatsApp y llega con
//     espacios de más, y eso no puede ser motivo de que no entre.
//   · No se gasta un uso dos veces por el mismo negocio: la segunda vez responde que ya entró.
// =============================================================================================

/**
 * El código como se guarda y como se compara: MAYÚSCULAS y sin ningún espacio.
 * No se le quitan otros caracteres a propósito: lo que no exista con ese texto responde «no sirve», y así
 * no se convierte «SINK-4F7A» en algo distinto de lo que el negocio escribió.
 */
export function codigoNormal(valor: unknown): string {
  return String(valor ?? '').replace(/\s+/g, '').toUpperCase().slice(0, 64);
}

export async function entradaRoutes(app: FastifyInstance) {
  /** Si este negocio ya entró con un código, y con cuál. El panel lo pregunta al abrir. */
  app.get('/api/entrada/codigo', async (req, reply) => {
    const u = await exigirSesion(req, reply);
    if (!u) return;
    if (!u.business_id) return { ok: true, registrado: false, nota: null, usado_at: null };
    // Se pregunta por el negocio, no por el código: un código puede servir para varios negocios
    // (usos_max > 1), y lo que importa es si ESTE negocio ya entró.
    const filas = await query<{ nota: string; usado_at: Date | null }>(
      `SELECT c.nota, x.usado_at
         FROM codigos_entrada_usos x
         JOIN codigos_entrada c ON c.codigo = x.codigo
        WHERE x.business_id = $1
        ORDER BY x.usado_at DESC
        LIMIT 1`,
      [u.business_id],
    );
    const f = filas[0];
    return {
      ok: true,
      registrado: !!f,
      nota: f?.nota ?? null,
      usado_at: f?.usado_at ? new Date(f.usado_at).toISOString() : null,
    };
  });

  /** Canjear un código. */
  app.post('/api/entrada/codigo', async (req, reply) => {
    const u = await exigirSesion(req, reply);
    if (!u || !u.business_id) return;

    const codigo = codigoNormal((req.body as { codigo?: string } | undefined)?.codigo);
    // El cuerpo vacío no es un intento contra ningún código: se responde antes de tocar el freno.
    if (!codigo) {
      return reply.status(400).send({
        error: 'escriba el código de entrada y vuelva a intentarlo', codigo: 'codigo_vacio',
      });
    }

    // Si el negocio ya entró, se responde con la nota y NO se gasta otro uso. Va antes del freno para que
    // un negocio que ya está adentro no quede frenado por preguntar de nuevo.
    const mio = await query<{ nota: string }>(
      `SELECT c.nota
         FROM codigos_entrada_usos x
         JOIN codigos_entrada c ON c.codigo = x.codigo
        WHERE x.business_id = $1
        ORDER BY x.usado_at DESC
        LIMIT 1`,
      [u.business_id],
    );
    if (mio.length) return { ok: true, ya: true, nota: mio[0].nota };

    // 10 intentos cada 10 minutos por IP, el mismo freno de las rutas de entrada: sin esto, los códigos
    // se pueden probar a la loca (son cortos y legibles, justamente para que se puedan dictar).
    const freno = pasarElFreno(`entrada:${req.ip || 'sin-ip'}`, 10, 10 * 60_000);
    reply.header('X-Freno-Restante', String(freno.restantes));
    if (!freno.pasa) {
      return reply.status(429).send({
        error: 'demasiados intentos seguidos', codigo: 'frenado',
        detalle: 'espere unos minutos y vuelva a probar',
      });
    }

    // El canje y su registro entran en UNA SOLA SENTENCIA: si se leyera el código, se comparara y después
    // se escribiera, entre la lectura y la escritura caben peticiones simultáneas y un código de un uso
    // podría gastarse dos veces. El UPDATE lleva la condición `usos < usos_max` y Postgres lo resuelve
    // con el renglón bloqueado, así que el segundo se queda sin renglón que devolver.
    // El renglón del negocio sólo se escribe si el UPDATE tomó el código.
    const filas = await query<{ nota: string }>(
      `WITH toma AS (
         UPDATE codigos_entrada
            SET usos = usos + 1, business_id = $2, usado_at = now()
          WHERE codigo = $1 AND usos < usos_max
         RETURNING nota
       )
       INSERT INTO codigos_entrada_usos (codigo, business_id)
       SELECT $1, $2 WHERE EXISTS (SELECT 1 FROM toma)
       ON CONFLICT (codigo, business_id) DO NOTHING
       RETURNING (SELECT nota FROM toma) AS nota`,
      [codigo, u.business_id],
    );

    if (filas.length) return { ok: true, ya: false, nota: filas[0].nota };

    // No se pudo canjear. Se mira por qué, sin devolver nunca el código escrito.
    // 1) Otro proceso de la misma petición pudo dejar el renglón del negocio: entonces ya entró.
    const ahora = await query<{ nota: string }>(
      `SELECT c.nota FROM codigos_entrada_usos x JOIN codigos_entrada c ON c.codigo = x.codigo
        WHERE x.business_id = $1 LIMIT 1`,
      [u.business_id],
    );
    if (ahora.length) return { ok: true, ya: true, nota: ahora[0].nota };

    // 2) El código no existe.
    const existe = await query<{ usos: number; usos_max: number }>(
      'SELECT usos, usos_max FROM codigos_entrada WHERE codigo = $1', [codigo],
    );
    if (!existe.length) {
      return reply.status(400).send({
        error: 'ese código no sirve. Revise que lo haya escrito igual al que le dieron.',
        codigo: 'codigo_invalido',
      });
    }

    // 3) Existe, pero ya se usó todas las veces que servía.
    return reply.status(400).send({
      error: 'ese código ya se usó. Pida uno nuevo a quien se lo entregó.',
      codigo: 'codigo_ya_usado',
    });
  });
}

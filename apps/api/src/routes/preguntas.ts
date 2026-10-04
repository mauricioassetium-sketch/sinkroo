// =====================================================================================================
// LAS PREGUNTAS DEL MOTOR — la ruta con la que el cliente responde lo que el motor necesita.
//
// El motor anota lo que le falta (`services/preguntas.ts`), el panel lo muestra como un pop up y esto guarda
// la respuesta DONDE EL MOTOR LA LEE. Responder tiene que servir: si la ciudad contada no termina en la
// columna que el estudio del mercado geocodifica, la próxima corrida vuelve a no encontrarla.
// =====================================================================================================
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { exigirSesion } from '../lib/auth.js';
import { preguntasAbiertas, guardarRespuesta } from '../services/preguntas.js';

export async function preguntaRoutes(app: FastifyInstance, db: Pool) {
  /** Lo que el motor necesita saber, sin responder. El panel lo muestra al abrir. */
  app.get('/api/preguntas', async (req, reply) => {
    const u = await exigirSesion(req, reply);
    if (!u || !u.business_id) return;
    const abiertas = await preguntasAbiertas(db, u.business_id);
    return {
      abiertas,
      // Cuántas lleva respondidas: sirve para decir «2 de 3» sin inventar nada.
      respondidas: Number((await db.query(
        `SELECT count(*)::int AS n FROM preguntas_del_motor WHERE business_id = $1 AND respondida_at IS NOT NULL`,
        [u.business_id])).rows[0]?.n || 0),
    };
  });

  /**
   * Responder. La respuesta se guarda en el lugar del que el motor la lee, y se devuelve qué quedó escrito
   * para que el panel lo diga tal cual (nada de «listo» sin decir qué cambió).
   */
  app.post('/api/preguntas/:id/responder', async (req, reply) => {
    const u = await exigirSesion(req, reply);
    if (!u || !u.business_id) return;
    const { id } = req.params as { id: string };
    const respuesta = String((req.body as { respuesta?: unknown } | undefined)?.respuesta ?? '').trim();
    if (!respuesta) return reply.status(400).send({ error: 'escriba la respuesta antes de enviarla' });
    if (respuesta.length > 300) return reply.status(400).send({ error: 'la respuesta es muy larga: resúmala' });

    const p = (await db.query<{ clave: string; pregunta: string }>(
      `SELECT clave, pregunta FROM preguntas_del_motor
        WHERE id = $1 AND business_id = $2 AND respondida_at IS NULL`, [id, u.business_id])).rows[0];
    if (!p) return reply.status(404).send({ error: 'esa pregunta no existe o ya estaba respondida' });

    // Primero queda escrito donde el motor lo lee; recién después se marca como respondida. Si fallara el
    // guardado, la pregunta sigue abierta y el cliente la puede volver a contestar.
    const queQuedo = await guardarRespuesta(db, u.business_id, p.clave, respuesta);
    await db.query(
      `UPDATE preguntas_del_motor SET respuesta = $3, respondida_at = now()
        WHERE id = $1 AND business_id = $2`, [id, u.business_id, respuesta]);

    req.log.info(`pregunta respondida (${p.clave}) por el negocio ${u.business_id}: ${queQuedo}`);
    return { ok: true, que_quedo: queQuedo, clave: p.clave };
  });
}

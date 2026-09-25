import type { FastifyInstance } from 'fastify';
import { exigirSesion } from '../lib/auth.js';
import { evaluateCreative } from '../services/swarm.js';

// SEGURIDAD (esto faltaba)
//   `/swarm/evaluate` no pedía sesión: cualquiera usaba el broker del servidor. Ahora sí, y el motivo
//   real del fallo queda en el registro del servidor en vez de salir en la respuesta.

interface EvaluateBody {
  id: string;
  copy: string;
  imageUrl?: string;
  channel?: string;
  audience?: string;
}

export async function swarmRoutes(app: FastifyInstance) {
  /**
   * POST /swarm/evaluate
   * Recibe una pieza y devuelve el veredicto del enjambre.
   */
  app.post<{ Body: EvaluateBody }>('/swarm/evaluate', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
    const { id, copy, imageUrl, channel, audience } = req.body || ({} as EvaluateBody);
    if (!copy || typeof copy !== 'string' || copy.length < 10) {
      return reply.code(400).send({ error: 'copy required (min 10 characters)' });
    }
    try {
      const result = await evaluateCreative({
        id: id ?? `cre-${Date.now()}`,
        copy: copy.slice(0, 4000),
        imageUrl,
        channel,
        audience,
      });
      return result;
    } catch (e) {
      req.log.error(e);
      return reply.code(502).send({ error: 'no se pudo evaluar: el servicio de evaluación no respondió', codigo: 'sin_evaluacion' });
    }
  });
}

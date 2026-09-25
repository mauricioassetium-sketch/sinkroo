import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { exigirSesion } from '../lib/auth.js';
import { predictPreSpend } from '../services/predict.js';

// M3 — Pre-spend validation: judges and predicts performance before spending
//
// SEGURIDAD (esto faltaba)
//   Sin sesión, cualquiera usaba el broker del servidor para predicciones. Ahora pide sesión y el
//   motivo real del fallo queda en el registro del servidor, no en la respuesta.

export async function predictRoutes(app: FastifyInstance, _db: Pool) {
  app.post<{ Body: { copy: string; channel?: string; audience?: string } }>('/api/predict', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
    const { copy, channel, audience } = req.body || ({} as { copy?: string });
    if (!copy || copy.length < 10) {
      return reply.code(400).send({ error: 'copy required (min 10 characters)' });
    }
    try {
      const result = await predictPreSpend({ copy: String(copy).slice(0, 4000), channel, audience });
      return result;
    } catch (e) {
      req.log.error(e);
      return reply.code(502).send({ error: 'no se pudo predecir: el servicio de predicción no respondió', codigo: 'sin_prediccion' });
    }
  });
}

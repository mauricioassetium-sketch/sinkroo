import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { predictPreSpend } from '../services/predict.js';

// M3 — Pre-spend validation: judges and predicts performance before spending
export async function predictRoutes(app: FastifyInstance, _db: Pool) {
  app.post<{ Body: { copy: string; channel?: string; audience?: string } }>('/api/predict', async (req, reply) => {
    const { copy, channel, audience } = req.body;
    if (!copy || copy.length < 10) {
      return reply.code(400).send({ error: 'copy required (min 10 characters)' });
    }
    try {
      const result = await predictPreSpend({ copy, channel, audience });
      return result;
    } catch (e: any) {
      return reply.code(502).send({ error: e.message });
    }
  });
}

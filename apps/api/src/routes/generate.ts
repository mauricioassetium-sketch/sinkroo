import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { generateForProduct } from '../services/generate.js';

// M4 — Creative generation: given a productId, generates N copies via broker
export async function generateRoutes(app: FastifyInstance, db: Pool) {
  app.post<{ Body: { productId: string; count?: number } }>('/api/generate', async (req, reply) => {
    const { productId, count } = req.body;
    if (!productId) {
      return reply.code(400).send({ error: 'productId is required' });
    }
    try {
      const result = await generateForProduct(db, { productId, count });
      return result;
    } catch (e: any) {
      return reply.code(502).send({ error: e.message });
    }
  });
}

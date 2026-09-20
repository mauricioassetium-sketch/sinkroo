import type { FastifyInstance } from 'fastify';
import { evaluateCreative } from '../services/swarm.js';

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
   * Receives a creative and returns the swarm verdict.
   */
  app.post<{ Body: EvaluateBody }>('/swarm/evaluate', async (req, reply) => {
    const { id, copy, imageUrl, channel, audience } = req.body;
    if (!copy || typeof copy !== 'string' || copy.length < 10) {
      return reply.code(400).send({ error: 'copy required (min 10 characters)' });
    }
    const result = await evaluateCreative({
      id: id ?? `cre-${Date.now()}`,
      copy,
      imageUrl,
      channel,
      audience,
    });
    return result;
  });
}

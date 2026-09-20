import Fastify from 'fastify';
import { GaiaBroker } from './broker.js';
import type { CreativeBrief } from './providers.js';

/**
 * GAIA broker HTTP service.
 * - POST /evaluate  { copy, id?, imageUrl?, channel?, audience? }  → swarm verdict
 * - POST /generate  { productName, usp, offer?, audience?, tone?, channel?, cta?, count? }  → copy variants
 */

const broker = new GaiaBroker();

async function build() {
  const app = Fastify({ logger: true });

  app.get('/healthz', async () => ({
    status: 'ok',
    service: 'gaia-broker',
    brain: broker.brain,
  }));

  app.post<{ Body: { copy: string; id?: string; imageUrl?: string; channel?: string; audience?: string } }>(
    '/evaluate',
    async (req, reply) => {
      if (!req.body?.copy || req.body.copy.length < 10) {
        return reply.code(400).send({ error: 'copy required (min 10 characters)' });
      }
      const result = await broker.evaluate({
        id: req.body.id ?? `cre-${Date.now()}`,
        copy: req.body.copy,
        imageUrl: req.body.imageUrl,
        channel: req.body.channel ?? 'meta',
        audience: req.body.audience,
      });
      return { ...result, brain: broker.brain };
    },
  );

  // M3 — Pre-spend validation: judges AND predicts performance in one step
  app.post<{ Body: { copy: string; channel?: string; audience?: string } }>('/predict', async (req, reply) => {
    if (!req.body?.copy || req.body.copy.length < 10) {
      return reply.code(400).send({ error: 'copy required (min 10 characters)' });
    }
    const result = await broker.predict({
      id: `pre-${Date.now()}`,
      copy: req.body.copy,
      channel: req.body.channel ?? 'meta',
      audience: req.body.audience,
    });
    return result;
  });

  // M4 — Creative generation from a product brief
  app.post<{ Body: CreativeBrief & { count?: number } }>('/generate', async (req, reply) => {
    const b = req.body;
    if (!b?.productName || !b?.usp) {
      return reply.code(400).send({ error: 'productName and usp are required' });
    }
    const count = Number(b.count ?? 5);
    const variants = await broker.generateCreatives(b, count);
    return { variants, brain: broker.brain, count: variants.length };
  });

  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = await build();
  const port = Number(process.env.PORT ?? 3100);
  await app.listen({ port, host: '0.0.0.0' });
}

export { GaiaBroker, build };

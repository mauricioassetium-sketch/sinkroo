import Fastify from 'fastify';
import { GaiaBroker } from './broker.js';

/**
 * Servicio HTTP del broker de GAIA.
 * El motor (u otros servicios) llama aquí para obtener juicio de IA.
 * Endpoint: POST /evaluate  { copy, id?, imageUrl?, channel?, audience? }
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
        return reply.code(400).send({ error: 'copy requerido (mín 10 caracteres)' });
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

  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = await build();
  const port = Number(process.env.PORT ?? 3100);
  await app.listen({ port, host: '0.0.0.0' });
}

export { GaiaBroker, build };

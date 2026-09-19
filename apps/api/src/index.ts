import Fastify from 'fastify';
import { healthRoutes } from './routes/health.js';
import { swarmRoutes } from './routes/swarm.js';

/**
 * API Sinkroo — punto de entrada Fastify.
 * Etapa 1: /health + /swarm/evaluate. Se monta en VPS vía Docker Compose.
 */

export async function buildApp() {
  const app = Fastify({ logger: true });

  app.register(healthRoutes);
  app.register(swarmRoutes, { prefix: '/api' });

  return app;
}

// Arranque directo (node dist/index.js)
if (import.meta.url === `file://${process.argv[1]}`) {
  const app = await buildApp();
  const port = Number(process.env.PORT ?? 3000);
  await app.listen({ port, host: '0.0.0.0' });
}

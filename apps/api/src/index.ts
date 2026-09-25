import Fastify from 'fastify';
import { Pool } from 'pg';
import { migrate } from './lib/schema.js';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { onboardingRoutes } from './routes/onboarding.js';
import { swarmRoutes } from './routes/swarm.js';
import { businessRoutes } from './routes/businesses.js';
import { productRoutes } from './routes/products.js';
import { generateRoutes } from './routes/generate.js';
import { predictRoutes } from './routes/predict.js';
import { webhookRoutes } from './routes/webhook.js';

const PORT = Number(process.env.PORT ?? 3000);
const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://sinkroo:sinkroo@localhost:5432/sinkroo';

export async function buildApp() {
  const app = Fastify({ logger: true });
  const db = new Pool({ connectionString: DATABASE_URL });

  // El panel vive en otro puerto, así que el back tiene que decirle al navegador que está permitido.
  // Los orígenes se limitan con CORS_ORIGENES (separados por coma); en desarrollo viene abierto.
  app.addHook('onRequest', async (req, reply) => {
    const permitidos = (process.env.CORS_ORIGENES || '*').split(',').map(s => s.trim());
    const origen = String(req.headers.origin || '');
    if (permitidos.includes('*') || permitidos.includes(origen)) {
      reply.header('Access-Control-Allow-Origin', permitidos.includes('*') ? '*' : origen);
    }
    reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') return reply.status(204).send();
  });

  healthRoutes(app);
  authRoutes(app);
  onboardingRoutes(app);
  swarmRoutes(app);
  businessRoutes(app, db);
  productRoutes(app, db);
  generateRoutes(app, db);
  predictRoutes(app, db);
  webhookRoutes(app, db);

  try { await migrate(db); } catch (e: any) { app.log.warn(`migration pending: ${e.message}`); }

  return app;
}

// Always start the server when this module is the entrypoint (ESM).
buildApp().then((app) => app.listen({ port: PORT, host: '0.0.0.0' }));

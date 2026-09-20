import Fastify from 'fastify';
import { Pool } from 'pg';
import { migrate } from './lib/schema.js';
import { healthRoutes } from './routes/health.js';
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

  healthRoutes(app);
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

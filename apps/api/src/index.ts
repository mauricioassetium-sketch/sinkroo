import Fastify from 'fastify';
import { Pool } from 'pg';
import { migrate } from './lib/schema';
import { healthRoutes } from './routes/health';
import { swarmRoutes } from './routes/swarm';
import { businessRoutes } from './routes/businesses';
import { productRoutes } from './routes/products';
import { generateRoutes } from './routes/generate';
import { predictRoutes } from './routes/predict';
import { webhookRoutes } from './routes/webhook';

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

if (require.main === module) {
  buildApp().then((app) => app.listen({ port: PORT, host: '0.0.0.0' }));
}

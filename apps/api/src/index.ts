import Fastify from 'fastify';
import { Pool } from 'pg';
import { migrate } from './lib/schema.js';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { onboardingRoutes } from './routes/onboarding.js';
import { motorRoutes } from './routes/motor.js';
import { piezaRoutes } from './routes/piezas.js';
import { negocioRoutes } from './routes/negocio.js';
import { campanaRoutes } from './routes/campanas.js';
import { calibracionRoutes } from './routes/calibracion.js';
import { integracionRoutes } from './routes/integraciones.js';
import { seguridadRoutes } from './routes/seguridad.js';
import { hooksSeguridad } from './lib/seguridad.js';
import { avisarSiNoHayClave } from './lib/cifrado.js';
import { swarmRoutes } from './routes/swarm.js';
import { businessRoutes } from './routes/businesses.js';
import { productRoutes } from './routes/products.js';
import { generateRoutes } from './routes/generate.js';
import { predictRoutes } from './routes/predict.js';
import { webhookRoutes } from './routes/webhook.js';

const PORT = Number(process.env.PORT ?? 3000);
// Dónde escucha. En el servidor propio se ata a 127.0.0.1 y nginx es la única puerta: si escucha en
// 0.0.0.0, todo el back queda expuesto en un puerto propio, sin TLS y sin pasar por el proxy (y con
// eso, sin nada que filtre las cabeceras de las que dependen los frenos). En Docker se deja 0.0.0.0
// porque los contenedores tienen que verse entre sí.
const HOST = process.env.HOST ?? '0.0.0.0';
// El único proxy en el que se cree para resolver la IP: el de la propia máquina. Cualquier otra cosa
// la escribe el cliente (ver lib/seguridad.ts).
const PROXY_CONFIABLE = process.env.PROXY_CONFIABLE ?? '127.0.0.1';
const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://sinkroo:***@localhost:5432/sinkroo';

export async function buildApp() {
  // El cuerpo de una petición no puede pasar de 2 MB: el material pesado va por la ruta de archivos, no
  // por JSON. Sin este tope, un cuerpo enorme puede tumbar el proceso.
  const app = Fastify({ logger: true, bodyLimit: 2 * 1024 * 1024, trustProxy: PROXY_CONFIABLE });
  const db = new Pool({ connectionString: DATABASE_URL });

  // Si falta DATOS_CLAVE, los tokens de las cuentas conectadas quedan sin cifrar en la base: se avisa en
  // el arranque para que no pase inadvertido (ver lib/cifrado.ts).
  avisarSiNoHayClave(app.log);
  // Y si los orígenes quedaron abiertos, también: el CORS abierto permite que cualquier página lea las
  // respuestas del back con las credenciales de quien esté adentro.
  if ((process.env.CORS_ORIGENES || '*') === '*' && process.env.NODE_ENV === 'production') {
    app.log.warn({
      seguridad: true,
      detalle: 'CORS_ORIGENES está abierto (*): cualquier página web puede hablarle al back con las credenciales de quien esté adentro. Configure CORS_ORIGENES con los orígenes del panel.',
    });
  }

  // El panel vive en otro puerto, así que el back tiene que decirle al navegador que está permitido.
  // Los orígenes se limitan con CORS_ORIGENES (separados por coma); en desarrollo viene abierto.
  // Seguridad primero: cabeceras y frenos antes de cualquier ruta.
  hooksSeguridad(app);

  // Los errores de adentro no salen para afuera. Sin esto, un fallo de base devuelve el nombre de la
  // tabla y el código de Postgres: información gratis para quien está buscando por dónde entrar. El
  // detalle queda en el registro del servidor, que es donde sirve.
  app.setErrorHandler((error, req, reply) => {
    req.log.error(error);
    const codigo = (error as { statusCode?: number }).statusCode;
    const estado = codigo && codigo >= 400 && codigo < 500 ? codigo : 500;
    if (estado >= 500) return reply.status(500).send({ error: 'algo falló de este lado', codigo: 'error_interno' });
    return reply.status(estado).send({ error: error.message, codigo: 'pedido_invalido' });
  });

  // 404 sin pistas: no se dice qué rutas existen ni cuáles no.
  app.setNotFoundHandler((_req, reply) => reply.status(404).send({ error: 'no existe', codigo: 'sin_ruta' }));

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
  onboardingRoutes(app, db);
  motorRoutes(app, db);
  piezaRoutes(app, db);
  negocioRoutes(app, db);
  campanaRoutes(app, db);
  calibracionRoutes(app, db);
  integracionRoutes(app, db);
  // La seguridad de la cuenta: el PIN de 6 dígitos y su estado. Es lo que protege las acciones sensibles.
  seguridadRoutes(app);
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
buildApp().then((app) => app.listen({ port: PORT, host: HOST }));

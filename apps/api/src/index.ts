// Esta primera línea no es un adorno: carga las claves del servidor (correo, redes, cifrado) ANTES de
// que ningún otro módulo lea el entorno. Va primero por eso.
import { entorno } from './lib/entorno.js';
import Fastify from 'fastify';
import { Pool } from 'pg';
import { migrate } from './lib/schema.js';
import { healthRoutes } from './routes/health.js';
import { recuperarMontajes } from './services/video.js';
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
import { entradaRoutes } from './routes/entrada.js';
import { ubicacionRoutes } from './routes/ubicacion.js';
import { programarInvestigacionDiaria } from './services/programador.js';
import { archivosRoutes } from './routes/archivos.js';

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
  // Los códigos de entrada: la puerta por la que el negocio entra al producto.
  entradaRoutes(app);
  ubicacionRoutes(app);
  // Los archivos del negocio. Se espera a que termine porque adentro registra el lector de
  // multipart/form-data y las rutas tienen que quedar puestas después de eso.
  await archivosRoutes(app);

  try { await migrate(db); } catch (e: any) { app.log.warn(`migration pending: ${e.message}`); }

  // LO QUE QUEDÓ A MEDIAS SE DECLARA CORTADO, NO SE DEJA GIRANDO.
  // El montaje del video vive EN EL PROCESO (una promesa encadenada): si el back se reinicia, esa promesa
  // muere y la pieza queda sin archivo y sin motivo — el panel muestra «armando el video…» para siempre,
  // porque un aro que gira no tiene tope. Al arrancar no puede haber ningún montaje en curso (el proceso es
  // nuevo), así que cualquier pieza de video con material, sin arte y sin motivo ES un resto: se le escribe
  // la causa. Es el mismo criterio de todo el motor: sin artefacto tiene que quedar la razón.
  try {
    const restos = await db.query(
      `UPDATE piezas SET generacion = jsonb_set(generacion, '{video_error}', $1::jsonb)
        WHERE generacion->>'tipo_de_contenido' = 'video'
          AND generacion ? 'imagen_generada'
          AND NOT (generacion ? 'video_generado')
          AND NOT (generacion ? 'video_error')
        RETURNING id`,
      [JSON.stringify({ motivo: 'el montaje se cortó: el servidor se reinició antes de terminarlo', cuando: new Date().toISOString() })],
    );
    if (restos.rowCount) app.log.warn(`montajes que quedaron cortados por un reinicio: ${restos.rowCount}`);
  } catch (e: any) { app.log.warn(`no se pudieron declarar los montajes cortados: ${e.message}`); }

  // LO MISMO CON UNA CORRIDA: la ronda que estaba trabajando cuando el back se reinició YA NO ESTÁ
  // CORRIENDO (la promesa murió con el proceso). Si se deja en 'corriendo', el panel muestra una línea de
  // carga que avanza para siempre. Se declara cortada con su motivo, y el panel lo dice tal cual.
  try {
    const corridasCortadas = await db.query(
      `UPDATE corridas SET estado = 'cortada', terminada_at = now(),
              detalle = 'el motor se reinició mientras esta corrida trabajaba: no terminó',
              avance = avance || $1::jsonb
        WHERE estado = 'corriendo' RETURNING id`,
      [JSON.stringify([{ paso: 'Se cortó', detalle: 'el servidor se reinició antes de terminarla', cuando: new Date().toISOString() }])],
    );
    if (corridasCortadas.rowCount) app.log.warn(`corridas que quedaron cortadas por un reinicio: ${corridasCortadas.rowCount}`);
  } catch (e: any) { app.log.warn(`no se pudieron declarar las corridas cortadas: ${e.message}`); }

  // Y LOS MONTAJES CORTADOS SE VUELVEN A ARMAR SOLOS. Ese corte se le muestra al dueño como «el video no
  // salió» en una pieza que tiene sus imágenes pintadas y pagadas: antes había que volver a pagar una ronda
  // entera para verlo. No se espera (montar tarda minutos): arranca de fondo y la pieza se actualiza cuando
  // el video está listo.
  void recuperarMontajes(db, (m) => app.log.info(`[montajes] ${m}`))
    .then((n) => { if (n) app.log.info(`montajes recuperados al arrancar: ${n}`); })
    .catch((e: any) => app.log.warn(`no se pudieron recuperar los montajes: ${e.message}`));

  // Qué se cargó del archivo de claves del servidor: se dicen los NOMBRES, nunca los valores.
  app.log.info(`entorno: ${entorno.puestas.length} ${entorno.puestas.length === 1 ? 'variable cargada' : 'variables cargadas'} de ${entorno.archivo}`
    + (entorno.problema ? ` (${entorno.problema})` : '')
    + (entorno.vacias.length ? ` · sin valor: ${entorno.vacias.join(', ')}` : ''));

  // LA INVESTIGACIÓN DIARIA: lo que la pantalla de entrada promete («investiga el mercado cada mañana»).
  // Corre la misma corrida del botón de Mercado, una vez al día por negocio, sin gastar créditos.
  programarInvestigacionDiaria(db, (m) => app.log.info(m));

  return app;
}

// Always start the server when this module is the entrypoint (ESM).
buildApp().then((app) => app.listen({ port: PORT, host: HOST }));

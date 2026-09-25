import { createHmac, randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { exigirSesion } from '../lib/auth.js';
import { exigirCuerpo, limpiar } from '../lib/seguridad.js';
import { calibrar } from '../services/calibracion.js';
import { canjearCodigo, configurado, falta, leerInsightsInstagram, tokenDe, urlDeAutorizacion } from '../integrations/meta.js';

// =============================================================================================
// LAS INTEGRACIONES — conectar la cuenta del negocio y traer sus datos reales.
//
// Cómo queda la Fase B cuando el dueño cargue las claves:
//   1. El negocio entra a «Conectar Instagram» y autoriza  →  POST /api/integraciones/meta/empezar
//      devuelve la dirección de Meta; al volver, POST /api/integraciones/meta/volver canjea el código y
//      guarda el token del lado del servidor.
//   2. POST /api/integraciones/meta/sincronizar lee los insights y CALIBRA los 500 solo, sin que nadie
//      cargue proporciones a mano.
//   3. GET /api/integraciones/meta/estado dice si está configurado, si hay cuenta conectada y cuándo se
//      sincronizó por última vez.
//
// Sin las claves cargadas, estas rutas responden 501 diciendo exactamente qué falta. El día que estén,
// funcionan sin tocar el panel.
// =============================================================================================

const RED = 'instagram';

export async function integracionRoutes(app: FastifyInstance, db: Pool) {
  /** ¿Está configurada la app de Meta? ¿Hay cuenta conectada? ¿Cuándo se sincronizó? */
  app.get('/api/integraciones/meta/estado', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
    const cuenta = await db.query(
      `SELECT red, external_id, nombre, estado, token_expira, created_at FROM cuentas_conectadas
        WHERE business_id = $1 AND red = $2`, [u.business_id, RED]);
    const ult = await db.query(
      `SELECT que, ok, detalle, created_at FROM sincronizaciones
        WHERE business_id = $1 ORDER BY created_at DESC LIMIT 1`, [u.business_id]);
    return {
      configurado: configurado(),
      falta: configurado() ? [] : falta(),
      // El token NO se devuelve: sólo se dice si hay uno guardado.
      cuenta: cuenta.rows[0] ? { ...cuenta.rows[0], tiene_token: true } : null,
      ultima_sincronizacion: ult.rows[0] ?? null,
      como_funciona: 'Los datos vienen agregados y con mínimos (100 seguidores, 100 interacciones): nunca hay identidades, sólo proporciones del público.',
    };
  });

  /** Paso 1: la dirección de Meta a la que hay que mandar al negocio para que autorice. */
  app.post('/api/integraciones/meta/empezar', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
    if (!configurado()) {
      return reply.status(501).send({ error: 'todavía no está configurada la app de Meta', codigo: 'sin_configurar', falta: falta() });
    }
    // El `state` va firmado con el secreto de la app: así una respuesta ajena no puede conectar una cuenta
    // que no es de este negocio.
    const nonce = randomBytes(12).toString('hex');
    const firma = createHmac('sha256', process.env.META_APP_SECRET || '').update(`${u.business_id}.${nonce}`).digest('hex').slice(0, 24);
    return { url: urlDeAutorizacion(`${u.business_id}.${nonce}.${firma}`) };
  });

  /** Paso 2: vuelve de Meta con el código; se canjea por el token y se guarda. */
  app.post('/api/integraciones/meta/volver', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
    const c = exigirCuerpo<{ codigo?: string; state?: string; external_id?: string; nombre?: string }>(req.body, ['codigo'], reply);
    if (!c) return;
    const estado = limpiar(c.state, 200);
    if (estado) {
      const [businessId, nonce, firma] = estado.split('.');
      const esperada = createHmac('sha256', process.env.META_APP_SECRET || '').update(`${businessId}.${nonce}`).digest('hex').slice(0, 24);
      if (businessId !== u.business_id || firma !== esperada) {
        return reply.status(400).send({ error: 'la respuesta no corresponde a este negocio', codigo: 'state_invalido' });
      }
    }
    const r = await canjearCodigo(String(c.codigo));
    if (!r.token) return reply.status(502).send({ error: r.error || 'Meta no devolvió el token', codigo: 'sin_token' });
    await db.query(
      `INSERT INTO cuentas_conectadas (business_id, red, external_id, nombre, token, token_expira, permisos)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (business_id, red) DO UPDATE
         SET token = $5, token_expira = $6, external_id = $3, nombre = $4, estado = 'conectada'`,
      [u.business_id, RED, limpiar(c.external_id, 60), limpiar(c.nombre, 120), r.token, r.expira ?? null, ['instagram_basic', 'instagram_manage_insights']],
    );
    await db.query(`INSERT INTO sincronizaciones (business_id, red, que, ok, detalle) VALUES ($1, $2, 'conexion', true, 'cuenta conectada')`, [u.business_id, RED]);
    // La respuesta confirma sin mostrar el token nunca.
    return reply.status(201).send({ ok: true, conectada: true });
  });

  /**
   * Paso 3: leer los insights y calibrar el público solo.
   * Es la Fase B completa: no hay que cargar proporciones a mano.
   */
  app.post('/api/integraciones/meta/sincronizar', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
    if (!configurado()) {
      return reply.status(501).send({ error: 'todavía no está configurada la app de Meta', codigo: 'sin_configurar', falta: falta() });
    }
    const cuenta = await tokenDe(db, u.business_id, RED);
    if (!cuenta?.token) {
      return reply.status(409).send({ error: 'este negocio todavía no conectó su Instagram', codigo: 'sin_cuenta' });
    }
    const igUserId = cuenta.external_id || 'me';
    const r = await leerInsightsInstagram(cuenta.token, igUserId);
    if (r.error || !r.segmentos.length) {
      await db.query(
        `INSERT INTO sincronizaciones (business_id, red, que, ok, detalle, datos) VALUES ($1, $2, 'insights', false, $3, $4::jsonb)`,
        [u.business_id, RED, limpiar(r.error || 'Meta no devolvió audiencia suficiente', 200), JSON.stringify({ bruto: r.bruto || {} })],
      );
      return reply.status(409).send({
        error: r.error || 'Meta no devolvió audiencia suficiente para calibrar',
        codigo: 'sin_audiencia',
        detalle: 'los insights necesitan 100 seguidores o 100 interacciones y devuelven las 45 primeras entradas',
      });
    }

    const cal = await calibrar(db, u.business_id, r.segmentos, `Instagram · ${r.base}`, 'propia');
    await db.query(
      `INSERT INTO sincronizaciones (business_id, red, que, ok, detalle, datos) VALUES ($1, $2, 'insights', true, $3, $4::jsonb)`,
      [u.business_id, RED, `calibrado con ${r.segmentos.length} segmentos`, JSON.stringify({ bruto: r.bruto, segmentos: r.segmentos })],
    );
    return reply.status(201).send({ ok: true, base: r.base, calibracion: cal });
  });

  /** Desconectar: se borra el token guardado. Reversible conectando de nuevo. */
  app.post('/api/integraciones/meta/desconectar', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
    await db.query('DELETE FROM cuentas_conectadas WHERE business_id = $1 AND red = $2', [u.business_id, RED]);
    await db.query(`INSERT INTO sincronizaciones (business_id, red, que, ok, detalle) VALUES ($1, $2, 'desconexion', true, 'cuenta desconectada')`, [u.business_id, RED]);
    return { ok: true, conectada: false };
  });
}

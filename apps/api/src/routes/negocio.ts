import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { exigirSesion } from '../lib/auth.js';
import { exigirCuerpo, limpiar } from '../lib/seguridad.js';

// =============================================================================================
// EL NEGOCIO Y SUS CRÉDITOS — lo que el panel necesita saber al abrir.
//
// Un negocio nuevo arranca SIN DATOS: sin campañas, sin piezas, sin hallazgos, con 0 créditos. El panel
// muestra eso tal cual (los estados vacíos), no un ejemplo. Es lo que pidió el dueño para testear desde
// cero: nada de data de nadie.
//
// El saldo de créditos siempre sale del libro de movimientos, nunca de un número suelto: así el saldo y
// su historia no pueden contradecirse.
// =============================================================================================

export async function negocioRoutes(app: FastifyInstance, db: Pool) {
  /** El resumen del negocio: lo que el panel muestra en el menú y en la cabecera. */
  app.get('/api/negocio', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
    const b = await db.query(
      'SELECT id, name, description, industry, plan, creditos, zona, created_at FROM businesses WHERE id = $1',
      [u.business_id],
    );
    if (!b.rows.length) return reply.status(404).send({ error: 'ese negocio no existe' });
    const o = await db.query('SELECT hechos, arrancado, arrancado_at FROM onboarding WHERE business_id = $1', [u.business_id]);
    const cuenta = await db.query(
      `SELECT
         (SELECT count(*)::int FROM piezas WHERE business_id = $1) AS piezas,
         (SELECT count(*)::int FROM evaluaciones WHERE business_id = $1) AS evaluaciones,
         (SELECT count(*)::int FROM hallazgos WHERE business_id = $1) AS hallazgos,
         (SELECT count(*)::int FROM conversations WHERE business_id = $1) AS conversaciones,
         (SELECT count(*)::int FROM publico_agentes WHERE business_id = $1) AS publico,
         (SELECT count(*)::int FROM corridas WHERE business_id = $1) AS corridas`,
      [u.business_id],
    );
    const saldo = await db.query(
      `SELECT COALESCE((SELECT saldo FROM movimientos_creditos WHERE business_id = $1 ORDER BY created_at DESC LIMIT 1), 0) AS saldo`,
      [u.business_id],
    );
    return {
      negocio: { ...b.rows[0], creditos: saldo.rows[0].saldo },
      onboarding: { hechos: o.rows[0]?.hechos ?? [], arrancado: o.rows[0]?.arrancado ?? false, arrancado_at: o.rows[0]?.arrancado_at ?? null },
      resumen: cuenta.rows[0],
      usuario: { email: u.email, nombre: u.nombre },
    };
  });

  /** El libro de créditos: el saldo y los últimos movimientos, cada uno con su motivo. */
  app.get('/api/creditos', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
    const m = await db.query(
      `SELECT delta, motivo, detalle, saldo, created_at FROM movimientos_creditos
        WHERE business_id = $1 ORDER BY created_at DESC LIMIT 100`, [u.business_id]);
    const saldo = await db.query(
      `SELECT COALESCE((SELECT saldo FROM movimientos_creditos WHERE business_id = $1 ORDER BY created_at DESC LIMIT 1), 0) AS saldo`,
      [u.business_id]);
    return { saldo: saldo.rows[0].saldo, movimientos: m.rows };
  });

  /**
   * Cargar créditos. En producción esto lo dispara la pasarela de pagos cuando el cobro se confirma; acá
   * queda para probar el libro (y para cargar los créditos del plan al crear la cuenta).
   */
  app.post('/api/creditos/cargar', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
    const c = exigirCuerpo<{ monto?: number; motivo?: string }>(req.body, ['monto'], reply); if (!c) return;
    const monto = Math.max(0, Math.min(1_000_000, Math.round(Number(c.monto))));
    if (!monto) return reply.status(400).send({ error: 'el monto tiene que ser mayor que cero' });
    const r = await db.query(
      `INSERT INTO movimientos_creditos (business_id, delta, motivo, detalle, saldo)
       VALUES ($1, $2, $3, $4, COALESCE((SELECT saldo FROM movimientos_creditos WHERE business_id = $1 ORDER BY created_at DESC LIMIT 1), 0) + $2)
       RETURNING saldo`,
      [u.business_id, monto, limpiar(c.motivo, 60) || 'carga', 'Carga de créditos'],
    );
    return reply.status(201).send({ ok: true, saldo: r.rows[0].saldo });
  });
}

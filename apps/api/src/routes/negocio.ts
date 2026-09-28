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
      `SELECT delta, motivo, detalle, saldo, created_at, vence_at FROM movimientos_creditos
        WHERE business_id = $1 ORDER BY created_at DESC LIMIT 100`, [u.business_id]);
    const saldo = await db.query(
      `SELECT COALESCE((SELECT saldo FROM movimientos_creditos WHERE business_id = $1 ORDER BY created_at DESC LIMIT 1), 0) AS saldo`,
      [u.business_id]);
    return { saldo: saldo.rows[0].saldo, movimientos: m.rows };
  });

  /**

   // ---------------- EL FLUJO DE COMPRA: pedir un plan, y activarlo cuando el cobro se confirma ----------------

   /**
    * EL CATÁLOGO DE PLANES, en el back: es el que manda para cobrar y para acreditar. El panel y la landing
    * lo copian para mostrarlo, pero el precio y los créditos que se acreditan salen de acá.
    */
   const PLANES: { key: string; nombre: string; precio: number; creditos: number; paraQuien: string }[] = [
     { key: 'base', nombre: 'Base', precio: 39, creditos: 2000, paraQuien: 'Una marca y una campaña a la vez.' },
     { key: 'pro', nombre: 'Pro', precio: 79, creditos: 5000, paraQuien: 'Varias campañas a la vez.' },
     { key: 'estudio', nombre: 'Estudio', precio: 149, creditos: 12000, paraQuien: 'Varias marcas o un catálogo grande.' },
   ];

   /** El catálogo, para que el panel muestre lo mismo que se cobra. */
   app.get('/api/planes', async (req, reply) => {
     const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
     const s = await db.query(
       `SELECT id, plan, precio, creditos, estado, nota, created_at, activada_at FROM suscripciones
         WHERE business_id = $1 ORDER BY created_at DESC LIMIT 5`, [u.business_id]);
     const b = await db.query('SELECT plan FROM businesses WHERE id = $1', [u.business_id]);
     return {
       planes: PLANES,
       plan_actual: b.rows[0]?.plan ?? '',
       solicitud: s.rows[0] ?? null,
       historial: s.rows,
       como_se_paga: 'Al pedir el plan, el equipo le manda el medio de pago. Cuando el cobro se confirma, el plan queda activo y los créditos entran en su cuenta.',
       sin_pasarela: 'Todavía no hay pasarela de pago conectada: por eso el paso final lo confirma una persona del equipo. El día que se conecte, este mismo pedido se activa solo.',
     };
   });

   /** Pedir un plan. Queda registrado como solicitud: todavía no cobra ni acredita nada. */
   app.post('/api/planes/solicitar', async (req, reply) => {
     const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
     const c = exigirCuerpo<{ plan?: string; nota?: string }>(req.body, ['plan'], reply); if (!c) return;
     const plan = PLANES.find(p => p.key === String(c.plan).toLowerCase());
     if (!plan) return reply.status(400).send({ error: 'ese plan no existe', codigo: 'sin_plan' });
     const abierta = await db.query(
       `SELECT id, plan FROM suscripciones WHERE business_id = $1 AND estado = 'solicitada' LIMIT 1`, [u.business_id]);
     if (abierta.rows[0]) {
       return reply.status(409).send({
         error: 'ya tiene una solicitud sin confirmar', codigo: 'solicitud_abierta',
         detalle: `pidió el plan ${abierta.rows[0].plan}: el equipo le manda el medio de pago`,
       });
     }
     const r = await db.query(
       `INSERT INTO suscripciones (business_id, plan, precio, creditos, estado, nota)
        VALUES ($1, $2, $3, $4, 'solicitada', $5) RETURNING id, plan, precio, creditos, estado, created_at`,
       [u.business_id, plan.key, plan.precio, plan.creditos, limpiar(c.nota || '', 400)]);
     return reply.status(201).send({
       suscripcion: r.rows[0],
       detalle: `quedó pedido el plan ${plan.nombre} ($${plan.precio} al mes, ${plan.creditos} créditos): el equipo le manda el medio de pago`,
     });
   });

   /**
    * Confirmar el cobro y activar el plan. Es del equipo, no del cliente: si lo pudiera hacer cualquiera,
    * cualquiera se activaría un plan sin pagar. Los correos autorizados van en ADMIN_CORREOS.
    */
   app.post('/api/planes/confirmar', async (req, reply) => {
     const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
     const admins = (process.env.ADMIN_CORREOS || 'mauricio@assetium.org').split(',').map(s => s.trim().toLowerCase());
     if (!admins.includes(String(u.email || '').toLowerCase())) {
       return reply.status(403).send({ error: 'esta acción la confirma el equipo de Sinkroo', codigo: 'solo_equipo' });
     }
     const c = exigirCuerpo<{ suscripcion_id?: string; nota?: string }>(req.body, ['suscripcion_id'], reply); if (!c) return;
     const s = await db.query(
       `SELECT id, business_id, plan, creditos, estado FROM suscripciones WHERE id = $1 AND estado = 'solicitada'`,
       [c.suscripcion_id]);
     const fila = s.rows[0];
     if (!fila) return reply.status(404).send({ error: 'esa solicitud no existe o ya está resuelta', codigo: 'sin_solicitud' });
     const plan = PLANES.find(p => p.key === fila.plan);
     if (!plan) return reply.status(400).send({ error: 'el plan de esa solicitud ya no existe', codigo: 'sin_plan' });

     // Los créditos del plan NO vencen (van sin fecha): el que paga conserva lo que paga.
     const saldo = await db.query(
       `SELECT COALESCE((SELECT saldo FROM movimientos_creditos WHERE business_id = $1 ORDER BY created_at DESC LIMIT 1), 0) AS s`,
       [fila.business_id]);
     const nuevo = Number(saldo.rows[0]?.s || 0) + plan.creditos;
     await db.query(
       `INSERT INTO movimientos_creditos (business_id, delta, motivo, detalle, saldo)
        VALUES ($1, $2, 'plan', $3, $4)`,
       [fila.business_id, plan.creditos, `Créditos del plan ${plan.nombre} del mes`, nuevo]);
     await db.query(`UPDATE businesses SET plan = $2 WHERE id = $1`, [fila.business_id, plan.key]);
     await db.query(
       `UPDATE suscripciones SET estado = 'activa', activada_at = now(), nota = COALESCE(NULLIF($2,''), nota) WHERE id = $1`,
       [fila.id, limpiar(c.nota || '', 400)]);
     return reply.send({
       ok: true, plan: plan.key, creditos_acreditados: plan.creditos, saldo: nuevo,
       detalle: `plan ${plan.nombre} activo: ${plan.creditos} créditos acreditados (no vencen)`,
     });
   });

   /** Cargar créditos. En producción esto lo dispara la pasarela de pagos cuando el cobro se confirma; acá
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

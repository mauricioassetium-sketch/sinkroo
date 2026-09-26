import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { exigirSesion } from '../lib/auth.js';
import { exigirCuerpo, limpiar, limpiarLista } from '../lib/seguridad.js';

// =============================================================================================
// CAMPAÑAS Y CONVERSACIONES — lo que el panel lee y escribe.
//
// Todas las consultas filtran por `business_id`, que sale de la sesión y nunca del cuerpo de la petición.
// Es la regla que impide que un negocio vea los datos de otro, y es la razón por la que acá no hay
// ninguna consulta "por id" sin el business_id al lado.
// =============================================================================================

export async function campanaRoutes(app: FastifyInstance, db: Pool) {
  app.get('/api/campanas', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
    const r = await db.query(
      `SELECT id, nombre, forma, estado, presupuesto, destinos, objetivo, piezas, roas, gasto, created_at
         FROM campanas WHERE business_id = $1 ORDER BY created_at DESC LIMIT 50`, [u.business_id]);
    const credito = await db.query(
      `SELECT COALESCE((SELECT saldo FROM movimientos_creditos WHERE business_id = $1 ORDER BY created_at DESC LIMIT 1), 0) AS saldo`,
      [u.business_id]);
    return { campanas: r.rows, creditos: credito.rows[0].saldo };
  });

  // LAS MÉTRICAS REALES DEL NEGOCIO. Lo que de verdad pasó en las plataformas (alcance, clics, ventas,
  // gasto), agrupado por métrica, por red y por pieza. El panel de resultados en vivo lee de acá: antes
  // mostraba cifras escritas a mano y el negocio creía que eran suyas. Sin filas, `hay` va en false y la
  // pantalla dice que todavía no llegó ninguna medición — que es la verdad, no un cero fingido.
  app.get('/api/metricas', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
    const totales = await db.query(
      `SELECT metrica, sum(valor)::numeric AS total FROM metricas_reales
        WHERE business_id = $1 GROUP BY metrica ORDER BY metrica`, [u.business_id]);
    const porRed = await db.query(
      `SELECT red, metrica, sum(valor)::numeric AS total FROM metricas_reales
        WHERE business_id = $1 GROUP BY 1, 2 ORDER BY 1, 2`, [u.business_id]);
    const porPieza = await db.query(
      `SELECT pieza, metrica, sum(valor)::numeric AS total FROM metricas_reales
        WHERE business_id = $1 AND pieza <> '' GROUP BY 1, 2 ORDER BY 1, 2`, [u.business_id]);
    const resumen = await db.query(
      `SELECT count(*)::int AS filas, max(created_at) AS ultima FROM metricas_reales WHERE business_id = $1`,
      [u.business_id]);
    const filas = Number(resumen.rows[0].filas) || 0;
    return {
      hay: filas > 0,
      filas,
      ultima: resumen.rows[0].ultima ?? null,
      totales: totales.rows,
      por_red: porRed.rows,
      por_pieza: porPieza.rows,
    };
  });

  app.post('/api/campanas', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
    const c = exigirCuerpo<{ nombre?: string }>(req.body, ['nombre'], reply); if (!c) return;
    const cuerpo = (req.body || {}) as Record<string, unknown>;
    const r = await db.query(
      `INSERT INTO campanas (business_id, nombre, forma, estado, presupuesto, destinos, objetivo)
       VALUES ($1, $2, $3, 'borrador', $4, $5::text[], $6)
       RETURNING id, nombre, forma, estado, presupuesto, destinos, objetivo, piezas, created_at`,
      [u.business_id, limpiar(c.nombre, 160), limpiar(cuerpo.forma, 40) || 'ventas',
       Math.max(0, Math.min(100000, Number(cuerpo.presupuesto) || 0)),
       limpiarLista(cuerpo.destinos, 20), limpiar(cuerpo.objetivo, 200)],
    );
    return reply.status(201).send(r.rows[0]);
  });

  /** La bandeja: las conversaciones del negocio con su último mensaje. */
  app.get('/api/conversaciones', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
    const r = await db.query(
      `SELECT c.id, c.lead_phone, c.stage, c.status, c.lead_score, c.last_message_at,
              (SELECT text FROM conversation_messages m WHERE m.conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS ultimo
         FROM conversations c WHERE c.business_id = $1 ORDER BY c.last_message_at DESC LIMIT 100`,
      [u.business_id]);
    return { conversaciones: r.rows };
  });
}

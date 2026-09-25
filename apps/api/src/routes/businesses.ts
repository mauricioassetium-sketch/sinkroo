import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { exigirSesion } from '../lib/auth.js';
import { limpiar, limpiarLista } from '../lib/seguridad.js';

// M1 — Business ingestion: create and read businesses
//
// SEGURIDAD (esto faltaba, y era lo más grave del back)
//   Estas rutas son de la primera etapa y quedaron SIN SESIÓN: `GET /api/businesses` devolvía TODOS los
//   negocios de la plataforma —nombre, plan, créditos, zona, rubro— y `GET /api/businesses/:id`
//   cualquiera de ellos con sus productos. Ahora piden sesión y cada cuenta sólo ve y toca SU negocio:
//   el negocio sale de la sesión, nunca de la dirección ni del cuerpo. Es la misma regla que ya cumplía
//   el resto del back.
//
//   El negocio ajeno responde 404, igual que uno que no existe: no se confirma ni que exista.

export async function businessRoutes(app: FastifyInstance, db: Pool) {
  /** Crea el negocio de una cuenta que todavía no tiene (business_id nulo) y se lo ata. */
  app.post('/api/businesses', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u) return;
    const b = (req.body || {}) as Record<string, unknown>;
    if (!b?.name || !b?.description) {
      return reply.status(400).send({ error: 'name and description are required' });
    }
    // Una cuenta, un negocio: el negocio nace con la cuenta (registro) y no se crean sueltos.
    if (u.business_id) {
      return reply.status(409).send({
        error: 'esta cuenta ya tiene un negocio', codigo: 'ya_tiene_negocio',
        detalle: 'el negocio de la cuenta se edita desde el onboarding; no se crea otro',
      });
    }
    const { rows } = await db.query(
      `INSERT INTO businesses (name, industry, description, audience, tone, channels, logo)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [limpiar(b.name, 160), limpiar(b.industry, 40) || 'other', limpiar(b.description, 4000),
       limpiar(b.audience, 500), limpiar(b.tone, 40) || 'premium',
       limpiarLista(b.channels, 20, 60), limpiar(b.logo, 500) || null]
    );
    // Queda atado a la cuenta: es suyo y sólo lo ve ella.
    await db.query('UPDATE users SET business_id = $2 WHERE id = $1', [u.id, rows[0].id]);
    await db.query('INSERT INTO onboarding (business_id) VALUES ($1) ON CONFLICT (business_id) DO NOTHING', [rows[0].id]);
    return reply.status(201).send(rows[0]);
  });

  /** El negocio de la cuenta. Se conserva la forma de lista de antes, pero acotada a lo propio. */
  app.get('/api/businesses', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u) return;
    if (!u.business_id) return [];
    const { rows } = await db.query('SELECT * FROM businesses WHERE id = $1', [u.business_id]);
    return rows;
  });

  app.get('/api/businesses/:id', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u) return;
    const { id } = req.params as { id: string };
    // Sólo el negocio de la sesión. El ajeno responde igual que uno que no existe: ni una pista.
    if (!u.business_id || id !== u.business_id) return reply.status(404).send({ error: 'business not found' });
    const b = await db.query('SELECT * FROM businesses WHERE id = $1', [id]);
    if (b.rows.length === 0) return reply.status(404).send({ error: 'business not found' });
    const p = await db.query(
      'SELECT * FROM products WHERE business_id = $1 ORDER BY is_primary DESC, created_at ASC', [id]
    );
    return { ...b.rows[0], products: p.rows };
  });
}

import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';

// M1 — Business ingestion: create and read businesses

export async function businessRoutes(app: FastifyInstance, db: Pool) {
  app.post('/api/businesses', async (req, reply) => {
    const b = req.body as Record<string, any>;
    if (!b?.name || !b?.description) {
      return reply.status(400).send({ error: 'name and description are required' });
    }
    const { rows } = await db.query(
      `INSERT INTO businesses (name, industry, description, audience, tone, channels, logo)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [b.name, b.industry ?? 'other', b.description, b.audience ?? '', b.tone ?? 'premium',
       b.channels ?? [], b.logo ?? null]
    );
    return reply.status(201).send(rows[0]);
  });

  app.get('/api/businesses', async () => {
    const { rows } = await db.query('SELECT * FROM businesses ORDER BY created_at DESC');
    return rows;
  });

  app.get('/api/businesses/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const b = await db.query('SELECT * FROM businesses WHERE id = $1', [id]);
    if (b.rows.length === 0) return reply.status(404).send({ error: 'business not found' });
    const p = await db.query(
      'SELECT * FROM products WHERE business_id = $1 ORDER BY is_primary DESC, created_at ASC', [id]
    );
    return { ...b.rows[0], products: p.rows };
  });
}

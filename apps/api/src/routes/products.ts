import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';

// M1 — Products: create and read (price optional, isPrimary highlights)

export async function productRoutes(app: FastifyInstance, db: Pool) {
  app.post('/api/products', async (req, reply) => {
    const p = req.body as Record<string, any>;
    if (!p?.businessId || !p?.name) {
      return reply.status(400).send({ error: 'businessId and name are required' });
    }
    const { rows } = await db.query(
      `INSERT INTO products (business_id, name, category, price, price_unit, offer, usp, cta, image_url, is_primary)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [p.businessId, p.name, p.category ?? 'other', p.price ?? null, p.priceUnit ?? null,
       p.offer ?? '', p.usp ?? '', p.cta ?? '', p.imageUrl ?? null, p.isPrimary ?? false]
    );
    return reply.status(201).send(rows[0]);
  });

  app.get('/api/products', async (req) => {
    const q = req.query as { businessId?: string };
    const rows = q.businessId
      ? (await db.query('SELECT * FROM products WHERE business_id = $1 ORDER BY is_primary DESC', [q.businessId])).rows
      : (await db.query('SELECT * FROM products ORDER BY created_at DESC')).rows;
    return rows;
  });
}

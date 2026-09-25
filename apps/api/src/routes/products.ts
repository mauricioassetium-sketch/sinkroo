import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { exigirSesion } from '../lib/auth.js';
import { limpiar } from '../lib/seguridad.js';

// M1 — Products: create and read (price optional, isPrimary highlights)
//
// SEGURIDAD (esto faltaba)
//   Estas dos rutas también quedaron sin sesión, y encima tomaban el negocio del cuerpo o del query:
//   `GET /api/products` sin `businessId` devolvía el catálogo de TODOS los negocios, y el POST dejaba
//   escribir un producto dentro del negocio que dijera el cliente. Ahora las dos piden sesión y el
//   negocio es SIEMPRE el de la sesión; el `businessId` del cuerpo y del query se ignora a propósito
//   (una petición vieja del panel sigue funcionando, pero ya no puede apuntar a otro negocio).

export async function productRoutes(app: FastifyInstance, db: Pool) {
  app.post('/api/products', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
    const p = (req.body || {}) as Record<string, unknown>;
    if (!p?.name || !String(p.name).trim()) {
      return reply.status(400).send({ error: 'name is required' });
    }
    // El precio es opcional; si viene, tiene que ser un número. Si no lo es, se responde 400 en vez de
    // dejar que reviente contra la base.
    const precio = p.price === undefined || p.price === null || p.price === '' ? null : Number(p.price);
    if (precio !== null && !Number.isFinite(precio)) {
      return reply.status(400).send({ error: 'price tiene que ser un número' });
    }
    const { rows } = await db.query(
      `INSERT INTO products (business_id, name, category, price, price_unit, offer, usp, cta, image_url, is_primary)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [u.business_id, limpiar(p.name, 200), limpiar(p.category, 40) || 'other', precio,
       limpiar(p.priceUnit, 20) || null, limpiar(p.offer, 500), limpiar(p.usp, 1000),
       limpiar(p.cta, 200), limpiar(p.imageUrl, 500) || null, p.isPrimary === true]
    );
    return reply.status(201).send(rows[0]);
  });

  app.get('/api/products', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
    const rows = (await db.query(
      'SELECT * FROM products WHERE business_id = $1 ORDER BY is_primary DESC, created_at DESC', [u.business_id],
    )).rows;
    return rows;
  });
}

import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { exigirSesion } from '../lib/auth.js';
import { generateForProduct } from '../services/generate.js';

// M4 — Creative generation: given a productId, generates N copies via broker
//
// SEGURIDAD (esto faltaba)
//   La ruta quedó sin sesión: cualquiera en internet la llamaba y el servidor gastaba una llamada al
//   broker por su cuenta. Ahora pide sesión y, además, el producto tiene que ser DEL NEGOCIO de la
//   sesión (antes bastaba con conocer un `productId` ajeno para generar con los datos de otro negocio).
//   El motivo real del fallo queda en el registro del servidor; al cliente se le da el estado, no el
//   texto crudo del broker.

export async function generateRoutes(app: FastifyInstance, db: Pool) {
  app.post<{ Body: { productId: string; count?: number } }>('/api/generate', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
    const { productId, count } = req.body || ({} as { productId?: string; count?: number });
    if (!productId) {
      return reply.code(400).send({ error: 'productId is required' });
    }
    // El tope se acota acá: es un número que decide el que pide y multiplica el trabajo del broker.
    const cuantas = Math.min(Math.max(Math.round(Number(count) || 5), 1), 10);
    try {
      const result = await generateForProduct(db, { productId, count: cuantas, businessId: u.business_id });
      return result;
    } catch (e) {
      req.log.error(e);
      // El producto de otro negocio responde igual que uno que no existe.
      if (String((e as Error).message) === 'product not found') {
        return reply.code(404).send({ error: 'ese producto no existe en este negocio', codigo: 'sin_producto' });
      }
      return reply.code(502).send({ error: 'no se pudo generar: el servicio de generación no respondió', codigo: 'sin_generacion' });
    }
  });
}

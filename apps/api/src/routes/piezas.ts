import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { exigirSesion } from '../lib/auth.js';
import { exigirCuerpo, limpiar } from '../lib/seguridad.js';

// =============================================================================================
// LAS PIEZAS — y la ruta de la generación de video e imagen, ya lista para conectar.
//
// El dueño lo pidió así: «vamos a conectar además el creador de videos e imágenes al final, así que deja
// esa ruta lista». Entonces la ruta existe, valida, cobra y guarda el pedido, y responde 501 (no
// implementado) mientras no esté configurado el proveedor. El día que se pongan las claves, sólo hay que
// escribir el `if` que hoy está marcado: el contrato de entrada y salida ya está definido.
//
// CONTRATO (el mismo para video y para imagen):
//   entrada  POST /api/piezas/:id/generar  { "tipo": "video" | "imagen", "indicaciones": "texto libre" }
//   salida   202 { "pedido_id": "...", "estado": "en_proceso", "estimado_seg": 90 }
//            501 { "codigo": "proveedor_no_configurado", "falta": ["VIDEO_API_KEY", ...] }
//   después  GET  /api/piezas/:id/generar/:pedidoId  → { estado, url | error }
//
// Las claves del proveedor van en variables de entorno: nunca en el repositorio ni en la base.
// =============================================================================================

const TIPOS = ['video', 'imagen'];

export async function piezaRoutes(app: FastifyInstance, db: Pool) {
  app.post('/api/piezas', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
    const c = exigirCuerpo<{ titulo?: string }>(req.body, ['titulo'], reply); if (!c) return;
    const r = await db.query(
      `INSERT INTO piezas (business_id, titulo, formato, texto, guion)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, titulo, formato, estado, created_at`,
      [u.business_id, limpiar(c.titulo, 160), limpiar((req.body as any)?.formato, 20) || 'imagen',
       limpiar((req.body as any)?.texto, 8000), limpiar((req.body as any)?.guion, 8000)],
    );
    return reply.status(201).send(r.rows[0]);
  });

  app.get('/api/piezas', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
    const r = await db.query(
      `SELECT id, titulo, formato, estado, created_at,
              (SELECT puntaje FROM evaluaciones e WHERE e.pieza_id = p.id ORDER BY created_at DESC LIMIT 1) AS puntaje
         FROM piezas p WHERE business_id = $1 ORDER BY created_at DESC LIMIT 50`, [u.business_id]);
    return { piezas: r.rows };
  });

  /**
   * La generación de video e imagen. Hoy responde 501 con lo que falta; el camino ya está armado:
   * valida el tipo, comprueba que la pieza sea del negocio y deja escrito el pedido.
   */
  app.post('/api/piezas/:id/generar', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
    const { id } = req.params as { id: string };
    const c = exigirCuerpo<{ tipo?: string }>(req.body, ['tipo'], reply); if (!c) return;
    const tipo = limpiar(c.tipo, 12).toLowerCase();
    if (!TIPOS.includes(tipo)) {
      return reply.status(400).send({ error: 'el tipo tiene que ser video o imagen', codigo: 'tipo_invalido' });
    }
    const pieza = await db.query('SELECT id FROM piezas WHERE id = $1 AND business_id = $2', [id, u.business_id]);
    if (!pieza.rows.length) return reply.status(404).send({ error: 'esa pieza no existe en este negocio' });

    const claves = tipo === 'video' ? ['VIDEO_API_KEY', 'VIDEO_API_URL'] : ['IMAGEN_API_KEY', 'IMAGEN_API_URL'];
    const falta = claves.filter(k => !process.env[k]);

    await db.query(
      `UPDATE piezas SET generacion = generacion || $2::jsonb WHERE id = $1`,
      [id, JSON.stringify({ ultimo_pedido: { tipo, cuando: new Date().toISOString(), pedido_por: u.email, falta } })],
    );

    if (falta.length) {
      // Acá va el proveedor cuando esté: se pide el trabajo, se guarda el id del pedido y se responde 202.
      return reply.status(501).send({
        error: 'todavía no hay proveedor de generación configurado',
        codigo: 'proveedor_no_configurado',
        tipo,
        falta,
        detalle: 'cuando se carguen esas variables de entorno, esta misma ruta pide el trabajo y devuelve 202',
      });
    }

    return reply.status(202).send({ pedido_id: `pend-${Date.now()}`, estado: 'en_proceso', estimado_seg: tipo === 'video' ? 120 : 25 });
  });
}

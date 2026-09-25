import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { execute, query } from '../lib/db.js';
import { exigirSesion } from '../lib/auth.js';
import { crearPublico } from '../services/mirofish.js';

// =============================================================================================
// ONBOARDING — los cinco pasos guardados de verdad.
//
// Se guarda en una sola fila por negocio: `datos` (JSONB) con los campos abiertos y `hechos` con los pasos
// que el negocio dio por completos. Así, una pregunta nueva no cuesta una migración.
//
// Todo lo que se guarda acá sobrevive al navegador: si alguien cierra la pestaña, vuelve y sigue donde
// estaba. Eso es lo que hace que el asistente de entrada sirva de verdad.
// =============================================================================================

export async function onboardingRoutes(app: FastifyInstance, db: Pool) {
  /** Lo que hay guardado. Si el negocio no tiene fila todavía, se le crea vacía. */
  app.get('/api/onboarding', async (req, reply) => {
    const u = await exigirSesion(req, reply);
    if (!u) return;
    if (!u.business_id) return { datos: {}, hechos: [], arrancado: false };
    await execute('INSERT INTO onboarding (business_id) VALUES ($1) ON CONFLICT (business_id) DO NOTHING', [u.business_id]);
    const filas = await query<any>(
      'SELECT datos, hechos, arrancado, arrancado_at FROM onboarding WHERE business_id = $1', [u.business_id],
    );
    const f = filas[0];
    return { datos: f?.datos ?? {}, hechos: f?.hechos ?? [], arrancado: f?.arrancado ?? false, arrancado_at: f?.arrancado_at ?? null };
  });

  /**
   * Guardar. Se puede guardar por campo (mientras el negocio escribe) o el paso entero.
   * Los campos se mezclan con lo que ya había: nunca se pisa lo que no se mandó.
   */
  app.put('/api/onboarding', async (req, reply) => {
    const u = await exigirSesion(req, reply);
    if (!u || !u.business_id) return;
    const b = (req.body || {}) as { datos?: Record<string, unknown>; hechos?: number[]; arrancado?: boolean };

    await execute('INSERT INTO onboarding (business_id) VALUES ($1) ON CONFLICT (business_id) DO NOTHING', [u.business_id]);

    if (b.datos && typeof b.datos === 'object') {
      await execute(
        `UPDATE onboarding SET datos = datos || $2::jsonb, actualizado = now() WHERE business_id = $1`,
        [u.business_id, JSON.stringify(b.datos)],
      );
      // El nombre y la descripción del negocio son también las columnas de `businesses`: se mantienen
      // sincronizados para que las piezas y las campañas los lean sin buscar en el JSON.
      const nombre = typeof b.datos.negocio_nombre === 'string' ? b.datos.negocio_nombre.trim() : '';
      const desc = typeof b.datos.descripcion === 'string' ? b.datos.descripcion.trim() : '';
      if (nombre) await execute('UPDATE businesses SET name = $2 WHERE id = $1', [u.business_id, nombre]);
      if (desc) await execute('UPDATE businesses SET description = $2 WHERE id = $1', [u.business_id, desc]);
    }

    if (Array.isArray(b.hechos)) {
      await execute('UPDATE onboarding SET hechos = $2::int[], actualizado = now() WHERE business_id = $1', [u.business_id, b.hechos]);
    }

    if (typeof b.arrancado === 'boolean' && b.arrancado) {
      await execute('UPDATE onboarding SET arrancado = true, arrancado_at = now(), actualizado = now() WHERE business_id = $1', [u.business_id]);
    }

    const filas = await query<any>('SELECT datos, hechos, arrancado, arrancado_at FROM onboarding WHERE business_id = $1', [u.business_id]);
    return { ok: true, ...filas[0] };
  });

  /**
   * Arrancar el motor: es el resultado del último paso, no un botón decorativo.
   *
   * Y arrancar el motor es TODO el motor: acá se crean los 500 agentes del público del negocio, que es
   * lo que el paso 5 promete («los 500 del público reaccionan»). Sin esto, un negocio nuevo quedaba con
   * el público en 0 y la primera evaluación se caía con «el público todavía no está creado» (409): el
   * único camino que los creaba era `POST /api/publico/crear`, al que no llama ninguna pantalla.
   * `crearPublico` es idempotente —si ya están los 500, no toca nada— y no cuesta créditos: es una
   * muestra estadística, no 500 llamadas al modelo.
   */
  app.post('/api/onboarding/arrancar', async (req, reply) => {
    const u = await exigirSesion(req, reply);
    if (!u || !u.business_id) return;
    await execute(
      `INSERT INTO onboarding (business_id, arrancado, arrancado_at) VALUES ($1, true, now())
       ON CONFLICT (business_id) DO UPDATE SET arrancado = true, arrancado_at = now(), actualizado = now()`,
      [u.business_id],
    );
    // El público del negocio, con la zona que tenga cargada: la misma que usa el resto del motor.
    const zona = await query<{ zona: string }>('SELECT zona FROM businesses WHERE id = $1', [u.business_id]);
    const publico = await crearPublico(db, u.business_id, zona[0]?.zona || 'Medellín');
    return { ok: true, arrancado: true, publico };
  });
}

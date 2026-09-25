import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { exigirSesion } from '../lib/auth.js';
import { exigirCuerpo, limpiar, limpiarLista } from '../lib/seguridad.js';
import { backtest, calibrar, leerCalibracion } from '../services/calibracion.js';

// =============================================================================================
// EL PÚBLICO CALIBRADO Y EL BACKTEST — las dos rutas de la Fase A.
//
// Todo privado y filtrado por el negocio de la sesión. La calibración no borra el histórico de
// reacciones: sólo reasigna el segmento y el peso de cada agente.
// =============================================================================================

export async function calibracionRoutes(app: FastifyInstance, db: Pool) {
  /**
   * Calibrar el panel con proporciones reales del público.
   * Cuerpo: { segmentos: [{ segmento, peso, ciudad?, genero? }], fuente?: string, origen?: string }
   * Ejemplo de la API de Instagram: 62 % mujeres, 38 % hombres → un agente mujer pesa como 62 de cada 100.
   */
  app.post('/api/publico/calibrar', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
    const c = exigirCuerpo<{ segmentos?: unknown }>(req.body, ['segmentos'], reply); if (!c) return;
    if (!Array.isArray(c.segmentos) || !c.segmentos.length || c.segmentos.length > 60) {
      return reply.status(400).send({ error: 'mande entre 1 y 60 segmentos con su peso', codigo: 'segmentos_invalidos' });
    }
    const cuerpo = (req.body || {}) as Record<string, unknown>;
    const segmentos = (c.segmentos as Record<string, unknown>[]).map(s => ({
      segmento: limpiar(s.segmento, 80),
      peso: Math.max(0, Math.min(1_000_000, Number(s.peso) || 0)),
      ciudad: limpiar(s.ciudad, 60),
      genero: limpiar(s.genero, 20),
    }));
    const r = await calibrar(db, u.business_id, segmentos, limpiar(cuerpo.fuente, 160), limpiar(cuerpo.origen, 20) || 'propia');
    if ('error' in r) return reply.status(409).send({ error: r.error, codigo: 'no_calibrable' });
    return reply.status(201).send(r);
  });

  /** Cómo está el panel ahora: cuántos por segmento, con qué peso y de dónde salió el dato. */
  app.get('/api/publico/calibracion', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
    return leerCalibracion(db, u.business_id);
  });

  /** El backtest: el error del modelo medido contra la historia real del negocio. */
  app.get('/api/mirofish/backtest', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
    return backtest(db, u.business_id);
  });

  /**
   * Cargar la métrica real de una pieza publicada (alcance, guardados, clics o ventas).
   * Es lo que convierte la predicción en algo medible: sin esto, el modelo se compara consigo mismo.
   */
  app.post('/api/mirofish/:id/real', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
    const { id } = req.params as { id: string };
    const c = exigirCuerpo<{ metrica?: number; nombre?: string }>(req.body, ['metrica'], reply); if (!c) return;
    const ev = await db.query('SELECT id FROM evaluaciones WHERE id = $1 AND business_id = $2', [id, u.business_id]);
    if (!ev.rows.length) return reply.status(404).send({ error: 'esa evaluación no existe en este negocio' });
    const metrica = Math.max(0, Number(c.metrica));
    const nombre = limpiar(c.nombre, 40) || 'resultado';
    const r = await db.query(
      `UPDATE predicciones SET metrica_real = $2, metrica_nombre = $3
        WHERE evaluacion_id = $1
        RETURNING predicho, observado, metrica_real`,
      [id, metrica, nombre]);
    if (!r.rows.length) return reply.status(409).send({ error: 'esa evaluación no tiene predicción guardada' });
    const p = r.rows[0];
    const error = Math.abs(metrica - Number(p.predicho));
    return { ok: true, predicho: Number(p.predicho), real: metrica, nombre_metrica: nombre,
             error: Math.round(error * 100) / 100,
             lectura: `predijo ${p.predicho} y pasó ${metrica}: ${error < 5 ? 'el modelo quedó cerca' : 'el modelo se corrió ' + Math.round(error)}` };
  });
}

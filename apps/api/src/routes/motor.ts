import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { exigirSesion } from '../lib/auth.js';
import { exigirCuerpo, limpiar } from '../lib/seguridad.js';
import { conAvisoDePin, exigirPin } from '../lib/pin.js';
import { correrInvestigacion, desvioActual } from '../services/agentes.js';
import { crearPublico, evaluar } from '../services/mirofish.js';

// =============================================================================================
// EL MOTOR — los agentes, el público y MiroFish.
//
// Todas las rutas son privadas: cada negocio sólo ve y toca lo suyo (se filtra siempre por business_id,
// que sale de la sesión, nunca del cuerpo de la petición). Esa es la regla que evita que un negocio vea
// los datos de otro.
// =============================================================================================

/** De dónde saca el motor el contexto: lo que el negocio escribió en el onboarding. */
async function contexto(db: Pool, businessId: string) {
  const b = await db.query('SELECT name, description, zona, rubro FROM businesses WHERE id = $1', [businessId]);
  const o = await db.query('SELECT datos FROM onboarding WHERE business_id = $1', [businessId]);
  const datos = (o.rows[0]?.datos || {}) as Record<string, unknown>;
  return {
    businessId,
    nombre: String(b.rows[0]?.name || ''),
    descripcion: String(b.rows[0]?.description || datos.descripcion || ''),
    rubro: String(b.rows[0]?.rubro || ''),
    zona: String(b.rows[0]?.zona || 'Medellín'),
  };
}

export async function motorRoutes(app: FastifyInstance, db: Pool) {
  // ---------------- Los agentes ----------------

  /** Corre la investigación del mercado. No cuesta créditos: investigar nunca cuesta. */
  app.post('/api/agentes/correr', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
    const ctx = await contexto(db, u.business_id);
    if (!ctx.descripcion || ctx.descripcion.length < 20) {
      return reply.status(400).send({
        error: 'el motor necesita saber qué hace el negocio antes de investigar',
        codigo: 'falta_descripcion', detalle: 'complete la descripción en Primeros pasos',
      });
    }
    const r = await correrInvestigacion(db, ctx);
    return reply.status(201).send(r);
  });

  /** Las corridas con lo que hizo cada agente: es la bitácora que se ve en el panel. */
  app.get('/api/agentes/corridas', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
    const corridas = await db.query(
      `SELECT id, motivo, estado, creditos, empezada_at, terminada_at FROM corridas
        WHERE business_id = $1 ORDER BY empezada_at DESC LIMIT 20`, [u.business_id]);
    if (!corridas.rows.length) return { corridas: [] };
    const tareas = await db.query(
      `SELECT corrida_id, agente, que, resultado, creditos, orden FROM tareas_corrida
        WHERE corrida_id = ANY($1::uuid[]) ORDER BY orden`, [corridas.rows.map(c => c.id)]);
    return {
      corridas: corridas.rows.map(c => ({ ...c, tareas: tareas.rows.filter(t => t.corrida_id === c.id) })),
    };
  });

  /** Los hallazgos del mercado, con su fuente. */
  app.get('/api/hallazgos', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
    const r = await db.query(
      `SELECT id, tipo, titulo, dato, porque, fuente, created_at FROM hallazgos
        WHERE business_id = $1 ORDER BY created_at DESC LIMIT 50`, [u.business_id]);
    return { hallazgos: r.rows, desvio_actual_pct: await desvioActual(db, u.business_id) };
  });

  // ---------------- El público: 500 agentes ----------------

  /** Crea los 500 agentes del público para este negocio. Si ya están, devuelve el total. */
  app.post('/api/publico/crear', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
    const ctx = await contexto(db, u.business_id);
    const r = await crearPublico(db, u.business_id, ctx.zona);
    return reply.status(201).send(r);
  });

  /** Cuántos son y quiénes: el panel muestra el público con el que trabaja. */
  app.get('/api/publico', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
    // El saldo se mira ANTES de gastar: evaluar cuesta 48 créditos y nadie puede quedar en rojo.
    const saldo = await db.query(
      `SELECT COALESCE((SELECT saldo FROM movimientos_creditos WHERE business_id = $1 ORDER BY created_at DESC LIMIT 1), 0) AS s`,
      [u.business_id]);
    if (Number(saldo.rows[0].s) < 48) {
      return reply.status(402).send({
        error: 'no alcanzan los créditos para evaluar', codigo: 'sin_creditos',
        detalle: `evaluar cuesta 48 y el saldo es ${saldo.rows[0].s}: cargue créditos o cambie de plan`,
      });
    }

    const total = await db.query('SELECT count(*)::int AS n FROM publico_agentes WHERE business_id = $1', [u.business_id]);
    const perfiles = await db.query(
      `SELECT estilo, count(*)::int AS n FROM publico_agentes WHERE business_id = $1 GROUP BY estilo ORDER BY n DESC`,
      [u.business_id]);
    const edades = await db.query(
      `SELECT CASE WHEN edad < 25 THEN '18 a 24' WHEN edad < 35 THEN '25 a 34' WHEN edad < 45 THEN '35 a 44'
                   WHEN edad < 55 THEN '45 a 54' ELSE '55 y más' END AS rango, count(*)::int AS n
         FROM publico_agentes WHERE business_id = $1 GROUP BY 1 ORDER BY 1`, [u.business_id]);
    const muestra = await db.query(
      `SELECT numero, nombre, edad, zona, interes, sensibilidad, estilo FROM publico_agentes
        WHERE business_id = $1 ORDER BY numero LIMIT 12`, [u.business_id]);
    return { total: total.rows[0].n, por_estilo: perfiles.rows, por_edad: edades.rows, muestra: muestra.rows };
  });

  // ---------------- MiroFish ----------------

  /** Evalúa una pieza: 5 jueces, 500 del público y la predicción con su desvío. Cuesta 48 créditos. */
  app.post('/api/mirofish/evaluar', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
    const c = exigirCuerpo<{ titulo?: string; texto?: string; formato?: string; pieza_id?: string; pin?: string }>(req.body, [], reply);
    if (!c) return;

    // ACCIÓN SENSIBLE: esto gasta 48 créditos y no se devuelve. Por eso pide el PIN de seguridad —y antes
    // de tocar el saldo, para no dejar el cobro a medias—. Si el negocio todavía no tiene PIN, la
    // evaluación sigue y la respuesta lo dice (no se le rompe el uso a quien nunca creó un PIN).
    const pin = await exigirPin(req, reply, u.business_id, c.pin);
    if (!pin.permite) return;

    let pieza = { id: undefined as string | undefined, titulo: limpiar(c.titulo, 160), texto: limpiar(c.texto, 4000), formato: limpiar(c.formato, 20) || 'imagen' };
    if (c.pieza_id) {
      const p = await db.query('SELECT id, titulo, texto, formato FROM piezas WHERE id = $1 AND business_id = $2', [c.pieza_id, u.business_id]);
      if (!p.rows.length) return reply.status(404).send({ error: 'esa pieza no existe en este negocio' });
      pieza = { id: p.rows[0].id, titulo: p.rows[0].titulo, texto: p.rows[0].texto, formato: p.rows[0].formato };
    }
    if (!pieza.titulo && !pieza.texto) {
      return reply.status(400).send({ error: 'hay que mandar la pieza o el texto a evaluar', codigo: 'falta_pieza' });
    }

    // El saldo se mira ANTES de gastar: evaluar cuesta 48 créditos y nadie puede quedar en rojo.
    const saldo = await db.query(
      `SELECT COALESCE((SELECT saldo FROM movimientos_creditos WHERE business_id = $1 ORDER BY created_at DESC LIMIT 1), 0) AS s`,
      [u.business_id]);
    if (Number(saldo.rows[0].s) < 48) {
      return reply.status(402).send({
        error: 'no alcanzan los créditos para evaluar', codigo: 'sin_creditos',
        detalle: `evaluar cuesta 48 y el saldo es ${saldo.rows[0].s}: cargue créditos o cambie de plan`,
      });
    }

    const total = await db.query('SELECT count(*)::int AS n FROM publico_agentes WHERE business_id = $1', [u.business_id]);
    if (total.rows[0].n < 500) {
      return reply.status(409).send({
        error: 'el público todavía no está creado', codigo: 'sin_publico',
        detalle: 'cree los 500 agentes del público antes de evaluar',
      });
    }

    const r = await evaluar(db, u.business_id, pieza);
    // La evaluación ya quedó hecha y los 48 créditos cobrados: la respuesta dice si se pidió PIN o si
    // todavía no hay uno creado (y en ese caso, invita a crearlo).
    return reply.status(201).send(conAvisoDePin(r as unknown as Record<string, unknown>, pin));
  });

  /** El ranking del negocio: las evaluaciones ordenadas del 1 al 5 (o más, si hay más piezas). */
  app.get('/api/mirofish', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
    const r = await db.query(
      `SELECT id, titulo, puntaje, orden, total_publico, created_at FROM evaluaciones
        WHERE business_id = $1 ORDER BY puntaje DESC`, [u.business_id]);
    return { evaluaciones: r.rows };
  });

  /** El detalle de una evaluación: los 5 votos, las reacciones del público y la predicción. */
  app.get('/api/mirofish/:id', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
    const { id } = req.params as { id: string };
    const ev = await db.query('SELECT * FROM evaluaciones WHERE id = $1 AND business_id = $2', [id, u.business_id]);
    if (!ev.rows.length) return reply.status(404).send({ error: 'esa evaluación no existe en este negocio' });
    const votos = await db.query('SELECT juez, criterio, voto, opinion FROM votos_jueces WHERE evaluacion_id = $1 ORDER BY voto DESC', [id]);
    const reacciones = await db.query(
      'SELECT reaccion, count(*)::int AS n FROM opiniones_publico WHERE evaluacion_id = $1 GROUP BY reaccion ORDER BY n DESC', [id]);
    const opiniones = await db.query(
      'SELECT agente_numero, voto, reaccion, comentario FROM opiniones_publico WHERE evaluacion_id = $1 ORDER BY voto DESC LIMIT 40', [id]);
    const pred = await db.query(
      'SELECT predicho, observado, desvio_pct FROM predicciones WHERE evaluacion_id = $1 ORDER BY created_at DESC LIMIT 1', [id]);
    return { evaluacion: ev.rows[0], votos: votos.rows, reacciones: reacciones.rows, opiniones: opiniones.rows, prediccion: pred.rows[0] ?? null };
  });
}

import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { exigirSesion } from '../lib/auth.js';
import { exigirCuerpo, limpiar, limpiarLista } from '../lib/seguridad.js';
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
    // Para investigar alcanza con saber A QUÉ SE DEDICA el negocio y DÓNDE vende: el rubro y la zona
    // (los dos datos del onboarding). La descripción ayuda —Nia escribe con sus palabras— pero si falta,
    // Nia lo dice en su tarea en vez de frenar la corrida entera: los demás ya tienen con qué trabajar.
    const sabeQueHace = (ctx.rubro && ctx.rubro.trim().length >= 3) || (ctx.descripcion && ctx.descripcion.length >= 20);
    if (!sabeQueHace) {
      return reply.status(400).send({
        error: 'el motor necesita saber qué hace el negocio antes de investigar',
        codigo: 'falta_descripcion',
        detalle: 'complete el rubro o la descripción en Primeros pasos',
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
    // LEER NO CUESTA: acá no se mira el saldo. El guardia de créditos vive donde se cobra (evaluar), no
    // en la consulta que muestra el público: con el saldo bajo, esta lectura contestaba 402 y el panel
    // se quedaba sin poder mostrar los 500 que ya existen.
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

    // El público del negocio: si todavía no está, se crea AHORA y la evaluación sigue. Antes acá se
    // cortaba con 409 «el público todavía no está creado» y el negocio quedaba sin salida desde el
    // panel (ninguna pantalla llama a `POST /api/publico/crear`). Crearlos es gratis e idempotente, así
    // que no hay nada que ganar frenando: la única razón para no tenerlos es que el motor nunca arrancó.
    let total = await db.query('SELECT count(*)::int AS n FROM publico_agentes WHERE business_id = $1', [u.business_id]);
    if (total.rows[0].n < 500) {
      const ctx = await contexto(db, u.business_id);
      await crearPublico(db, u.business_id, ctx.zona);
      total = await db.query('SELECT count(*)::int AS n FROM publico_agentes WHERE business_id = $1', [u.business_id]);
    }
    if (total.rows[0].n < 500) {
      return reply.status(409).send({
        error: 'el público todavía no está creado', codigo: 'sin_publico',
        detalle: 'no se pudieron crear los 500 agentes del público: vuelva a intentarlo',
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

  // ---------------- El informe completo del mercado (el patrón-modelo) ----------------

  /**
   * El informe que se abre desde el botón «Ver el informe completo» de Mercado: los jugadores del
   * mercado, las piezas vivas que el mercado ya premió con tiempo, el patrón del rubro, los huecos y
   * las propuestas. Sale del informe guardado para ESTE negocio; si no hay, del que ya se midió para su
   * rubro y su ciudad (y se dice que es del rubro, no suyo). Si no hay ninguno, se dice exactamente qué
   * falta: un mercado no se arma con datos de ejemplo.
   */
  app.get('/api/mercado/informe', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
    const ctx = await contexto(db, u.business_id);
    const campos = 'rubro, ciudad, origen, generado_at, fuente, payload';
    const propio = await db.query(
      `SELECT ${campos} FROM mercado_informes WHERE business_id = $1 ORDER BY generado_at DESC LIMIT 1`,
      [u.business_id]);
    let fila = propio.rows[0];
    let porque = '';
    if (!fila) {
      // El del rubro: aplica cuando la ciudad del negocio contiene la del informe y alguna clave del
      // rubro aparece en lo que el negocio YA declara (su rubro, su nombre o su descripción). No se pide
      // ningún campo nuevo: se lee lo que el onboarding ya guardó.
      const texto = `${ctx.rubro} ${ctx.nombre} ${ctx.descripcion}`.toLowerCase();
      const delRubro = await db.query(
        `SELECT ${campos}, (
            SELECT k FROM unnest(claves) AS k WHERE $2 LIKE '%' || k || '%' ORDER BY length(k) DESC LIMIT 1
          ) AS clave
           FROM mercado_informes
          WHERE business_id IS NULL
            AND $1 <> '' AND $1 ILIKE '%' || ciudad || '%'
            AND EXISTS (SELECT 1 FROM unnest(claves) AS k WHERE $2 LIKE '%' || k || '%')
          ORDER BY generado_at DESC LIMIT 1`,
        [String(ctx.zona || ''), texto]);
      fila = delRubro.rows[0];
      if (fila) porque = `su negocio coincide con el rubro «${fila.clave}», y su zona con ${fila.ciudad}`;
    }
    if (!fila) {
      return reply.send({
        hay: false, rubro: ctx.rubro, ciudad: ctx.zona, origen: '', generado_at: null, fuente: '',
        informe: null,
        falta: [
          !ctx.zona
            ? 'falta la ciudad o zona del negocio: sin ella no se sabe qué mercado leer (se pone en Primeros pasos)'
            : (ctx.rubro || ctx.descripcion)
              ? `la ciudad sí está («${ctx.zona}») y el negocio dice a qué se dedica: lo que falta es la corrida de su rubro`
              : 'falta saber a qué se dedica el negocio: con la descripción de Primeros pasos ya se puede leer su mercado',
          'falta que el equipo corra la lectura de piezas vivas de ese rubro y esa ciudad: de ahí salen los jugadores, las piezas sostenidas, el patrón y los huecos',
        ],
      });
    }
    return reply.send({
      hay: true, rubro: fila.rubro, ciudad: fila.ciudad, origen: fila.origen,
      generado_at: fila.generado_at, fuente: fila.fuente, informe: fila.payload, falta: [],
      porque_aplica: porque || 'informe medido para este negocio',
    });
  });

  /**
   * LAS TENDENCIAS que leyó Nova: temas del día por país, con su alcance (local, regional o de varios
   * mercados), si tocan el rubro del negocio y en qué países aparecen. Con el histórico acumulado se ve
   * qué tema era noticia de un día y cuál sigue.
   */
  app.get('/api/tendencias', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
    const r = await db.query(
      `SELECT tema, alcance, toca_el_rubro, paises, fecha, count(DISTINCT fecha) OVER (PARTITION BY tema)::int AS dias
         FROM tendencias WHERE business_id = $1 AND fecha >= current_date - interval '30 days'
        ORDER BY fecha DESC, array_length(paises, 1) DESC, tema LIMIT 80`, [u.business_id]);
    return {
      tendencias: r.rows,
      como_se_lee: 'alcance: un solo país es local; varios de la región es regional; si aparece también en España o Estados Unidos, no es cosa nuestra.',
    };
  });

  /**
   * LOS PROMPTS DE GENERACIÓN del negocio: el contrato que va a leer el generador cuando exista, con la
   * traza de cómo se armó cada campo (qué dato del mercado entró en qué parte del prompt).
   */
  app.get('/api/prompts', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
    const r = await db.query(
      `SELECT id, pieza, plaza, tipo, estilo, proporcion, prompt, prompt_negativo, parametros, detalle, created_at
         FROM prompts_generacion WHERE business_id = $1
        ORDER BY created_at DESC, plaza LIMIT 40`, [u.business_id]);
    return { prompts: r.rows, generador: 'todavía no hay ninguno conectado: estos prompts quedan listos para el que se conecte' };
  });

  /**
   * Guarda un informe de mercado: lo escribe la investigación cuando termina una corrida. La fuente se
   * declara siempre (un informe sin fuente no se muestra) y `del_rubro` decide si el informe queda para
   * este negocio o para todos los negocios del mismo rubro y la misma ciudad.
   */
  app.post('/api/mercado/informe', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
    const c = exigirCuerpo<{ informe?: unknown; fuente?: string; rubro?: string; ciudad?: string; claves?: unknown; del_rubro?: boolean }>(
      req.body, ['informe', 'fuente'], reply);
    if (!c) return;
    if (!c.informe || typeof c.informe !== 'object' || Array.isArray(c.informe)) {
      return reply.status(400).send({ error: 'el informe va en el campo informe, como objeto', codigo: 'informe_invalido' });
    }
    const paraElRubro = !!c.del_rubro;
    const r = await db.query(
      `INSERT INTO mercado_informes (business_id, rubro, ciudad, claves, origen, fuente, payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, generado_at`,
      [paraElRubro ? null : u.business_id, limpiar(c.rubro || ''), limpiar(c.ciudad || ''),
        limpiarLista(c.claves, 12, 40).map(k => k.toLowerCase()),
        paraElRubro ? 'rubro' : 'negocio', limpiar(c.fuente || '', 600), c.informe]);
    return reply.status(201).send({ ok: true, id: r.rows[0].id, generado_at: r.rows[0].generado_at, origen: paraElRubro ? 'rubro' : 'negocio' });
  });
}

import type { FastifyInstance, FastifyReply } from 'fastify';
import type { Pool } from 'pg';
import { exigirSesion } from '../lib/auth.js';
import { exigirCuerpo, limpiar } from '../lib/seguridad.js';
import { calibrar, guardarMetricas } from '../services/calibracion.js';
import {
  configurado as metaConfigurado, falta as metaFalta, tokenDe, urlDeAutorizacion as metaUrlDeAutorizacion,
} from '../integrations/meta.js';
import {
  REDES, configurada, faltaDe, firmarEstado, nonceNuevo, sinSecretos, verificarEstado,
  type CuentaConectada, type DefinicionRed, type ResultadoLectura,
} from '../integrations/redes.js';

// =============================================================================================
// LAS INTEGRACIONES — las nueve redes, atendidas por una sola ruta.
//
// CÓMO SE USA (igual para cualquiera de las nueve)
//   1. POST /api/integraciones/:red/empezar   → devuelve la dirección de la plataforma para autorizar.
//   2. POST /api/integraciones/:red/volver    → canjea el código y guarda el token del lado del servidor.
//   3. POST /api/integraciones/:red/sincronizar → lee datos reales: calibra los 500 agentes y/o guarda
//      las métricas del backtest. Queda una fila en `sincronizaciones` con lo que se hizo.
//   4. POST /api/integraciones/:red/desconectar → borra el token guardado. Es reversible.
//   Y GET /api/integraciones  → el estado de las nueve, para que la pantalla las pinte sin llamarlas una
//   por una.
//
// LAS RUTAS VIEJAS `/api/integraciones/meta/*` SIGUEN RESPONDIENDO IGUAL
//   Son las que hoy usa la pantalla de Instagram. Quedan como alias de la red `instagram`: mismo cuerpo
//   de respuesta, mismos códigos. Están escritas sobre el registro (leen y canjean con la definición de
//   `instagram`), así que Instagram se comporta igual por las dos puertas.
//
// SEGURIDAD (regla del dueño: «la mayor seguridad posible»)
//   · El token NUNCA sale en una respuesta ni en un registro: las consultas de estado piden columnas
//     explícitas y se calcula `tiene_token` sin traer el valor.
//   · El `state` va firmado con HMAC y con el secreto de la red: una respuesta ajena no puede conectar
//     una cuenta que no es de este negocio.
//   · El negocio sale SIEMPRE de la sesión, nunca del cuerpo: un negocio no puede leer ni conectar nada
//     de otro.
//   · Todo texto que se guarda o se responde pasa por `sinSecretos`, por si una plataforma devuelve el
//     token dentro de un error.
// =============================================================================================

/** La definición de la red pedida, o 404 si esa red no existe en el registro. */
function redDe(red: string, reply: FastifyReply): DefinicionRed | null {
  const def = REDES[red];
  if (!def) {
    reply.status(404).send({ error: 'esa red no existe', codigo: 'red_desconocida' });
    return null;
  }
  return def;
}

/**
 * La cuenta conectada SIN el token: sólo lo que la pantalla puede ver. El `tiene_token` se calcula en la
 * misma consulta para no traer nunca el valor a memoria innecesariamente.
 */
async function cuentaPublica(db: Pool, businessId: string, red: string) {
  const r = await db.query(
    `SELECT red, external_id, nombre, estado, token_expira, permisos, created_at, (token <> '') AS tiene_token
       FROM cuentas_conectadas WHERE business_id = $1 AND red = $2`, [businessId, red]);
  return r.rows[0] ?? null;
}

/**
 * Guarda (o actualiza) la cuenta conectada del negocio.
 * Un token vacío NO borra el que ya estaba: pasa cuando la plataforma no devuelve refresh_token en la
 * segunda autorización, y perderlo obligaría a conectar de nuevo.
 */
async function guardarCuenta(db: Pool, businessId: string, def: DefinicionRed, datos: {
  token: string; refresh_token?: string; expira?: string; external_id?: string; nombre?: string;
}) {
  await db.query(
    `INSERT INTO cuentas_conectadas (business_id, red, external_id, nombre, token, refresh_token, token_expira, permisos, estado, actualizado)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::text[], 'conectada', now())
     ON CONFLICT (business_id, red) DO UPDATE SET
       external_id   = EXCLUDED.external_id,
       nombre        = EXCLUDED.nombre,
       token         = CASE WHEN EXCLUDED.token <> '' THEN EXCLUDED.token ELSE cuentas_conectadas.token END,
       refresh_token = CASE WHEN EXCLUDED.refresh_token <> '' THEN EXCLUDED.refresh_token ELSE cuentas_conectadas.refresh_token END,
       token_expira  = EXCLUDED.token_expira,
       permisos      = EXCLUDED.permisos,
       estado        = 'conectada',
       actualizado   = now()`,
    [businessId, def.red, limpiar(datos.external_id, 120), limpiar(datos.nombre, 160),
     datos.token, datos.refresh_token ?? '', datos.expira ?? null, def.permisos],
  );
}

/** Una lectura nunca tumba la sincronización: si la red falla, se reporta el fallo con su causa. */
async function leerSeguro(def: DefinicionRed, token: string, cuenta: CuentaConectada): Promise<ResultadoLectura> {
  try {
    const r = await def.leer(token, cuenta);
    if (!r || typeof r !== 'object') return { ok: false, detalle: 'la plataforma no devolvió nada legible', error: 'la plataforma no devolvió nada legible' };
    return r;
  } catch (e) {
    const m = sinSecretos((e as Error).message || 'la lectura falló', token) || 'la lectura falló';
    return { ok: false, detalle: m, error: m };
  }
}

/** Deja la fila de trazabilidad: qué se pidió, si salió bien y qué se hizo con eso. */
async function registrar(db: Pool, businessId: string, red: string, que: string, ok: boolean, detalle: string, datos: Record<string, unknown> = {}) {
  await db.query(
    `INSERT INTO sincronizaciones (business_id, red, que, ok, detalle, datos) VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
    [businessId, red, que, ok, limpiar(detalle, 300), JSON.stringify(datos)],
  );
}

export async function integracionRoutes(app: FastifyInstance, db: Pool) {
  // ===========================================================================================
  // LAS NUEVE REDES — el registro único.
  // ===========================================================================================

  /** El estado de todas las redes: qué está configurado, qué falta, qué cuenta hay y qué se sincronizó. */
  app.get('/api/integraciones', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;

    // Una sola consulta por tabla para las nueve redes (no nueve consultas por red).
    const cuentas = await db.query(
      `SELECT red, external_id, nombre, estado, token_expira, permisos, created_at, (token <> '') AS tiene_token
         FROM cuentas_conectadas WHERE business_id = $1`, [u.business_id]);
    const porRed = new Map<string, Record<string, unknown>>(cuentas.rows.map((r: any) => [String(r.red), r]));

    const ultimas = await db.query(
      `SELECT DISTINCT ON (red) red, que, ok, detalle, created_at FROM sincronizaciones
        WHERE business_id = $1 ORDER BY red, created_at DESC`, [u.business_id]);
    const ultimaPorRed = new Map<string, Record<string, unknown>>(
      ultimas.rows.map((r: any) => [String(r.red), { que: r.que, ok: r.ok, detalle: r.detalle, created_at: r.created_at }]));

    const redes = Object.values(REDES).map(def => ({
      red: def.red,
      nombre: def.nombre,
      rol: def.rol,
      categoria: def.categoria,
      // 'oauth' → el negocio autoriza en la plataforma; 'token' → la clave se carga por variables de
      // entorno y no hay permiso que pedir. La pantalla usa esto para no ofrecer un «Conectar» que no existe.
      tipo: def.tipo,
      // El estado es honesto: si falta una variable, la red no se puede usar y acá se dice cuál falta.
      configurado: configurada(def),
      falta: faltaDe(def),
      cuenta: porRed.get(def.red) ?? null,
      ultima_sincronizacion: ultimaPorRed.get(def.red) ?? null,
      que_aporta: def.que_aporta,
      como_funciona: def.como_funciona,
    }));

    return { redes, resumen: { conectadas: redes.filter(r => !!r.cuenta).length, total: redes.length } };
  });

  /** Paso 1: la dirección de la plataforma a la que hay que mandar al negocio para que autorice. */
  app.post('/api/integraciones/:red/empezar', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
    const def = redDe((req.params as { red: string }).red, reply); if (!def) return;
    if (!configurada(def)) {
      return reply.status(501).send({
        error: `todavía no está configurada la integración con ${def.nombre}`,
        codigo: 'sin_configurar',
        falta: faltaDe(def),
      });
    }
    // El `state` va firmado con el secreto de la red: así una respuesta ajena no puede conectar una
    // cuenta que no es de este negocio.
    const estado = firmarEstado(def.red, u.business_id, nonceNuevo());
    return { url: def.urlDeAutorizacion(estado) };
  });

  /** Paso 2: vuelve la plataforma con el código; se canjea por el token y se guarda del lado del servidor. */
  app.post('/api/integraciones/:red/volver', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
    const def = redDe((req.params as { red: string }).red, reply); if (!def) return;
    if (!configurada(def)) {
      return reply.status(501).send({ error: `todavía no está configurada la integración con ${def.nombre}`, codigo: 'sin_configurar', falta: faltaDe(def) });
    }
    // Las redes por token (correo, tienda, píxel, WhatsApp) no traen código: su token ya está en el
    // servidor y acá sólo se comprueba que sirva.
    const obligatorios = def.tipo === 'oauth' ? ['codigo'] : [];
    const c = exigirCuerpo<{ codigo?: string; state?: string; external_id?: string; nombre?: string }>(req.body || {}, obligatorios, reply);
    if (!c) return;

    const estado = limpiar(c.state, 300);
    if (!verificarEstado(def.red, estado, u.business_id)) {
      return reply.status(400).send({ error: 'la respuesta no corresponde a este negocio', codigo: 'state_invalido' });
    }

    let token = '';
    let refresh = '';
    let expira: string | undefined;
    let externalId = limpiar(c.external_id, 120);
    let nombre = limpiar(c.nombre, 160);

    if (def.tipo === 'oauth') {
      const canje = await def.canjearCodigo(String(c.codigo));
      if (!canje.token) return reply.status(502).send({ error: sinSecretos(canje.error) || `${def.nombre} no devolvió el token`, codigo: 'sin_token' });
      token = canje.token;
      refresh = canje.refresh_token ?? '';
      expira = canje.expira;
      externalId = limpiar(canje.external_id || externalId, 120);
      nombre = limpiar(canje.nombre || nombre, 160);
    } else {
      // La comprobación de verdad: se lee la plataforma con el token del servidor antes de decir
      // «conectada». Nunca se marca una conexión que no funciona.
      const delEntorno = def.tokenDeEntorno?.() || '';
      const prueba = await leerSeguro(def, delEntorno, { token: delEntorno, external_id: externalId });
      if (!prueba.ok) return reply.status(502).send({ error: sinSecretos(prueba.error) || `${def.nombre} no aceptó las credenciales del servidor`, codigo: 'sin_token' });
      const quien = def.identidadDelEntorno?.();
      externalId = limpiar(externalId || quien?.external_id || '', 120);
      nombre = limpiar(nombre || quien?.nombre || '', 160);
    }

    // El token de las redes por entorno NO se guarda en la base: ya vive en el servidor y guardarlo
    // sería duplicar un secreto sin necesidad.
    await guardarCuenta(db, u.business_id, def, { token, refresh_token: refresh, expira, external_id: externalId, nombre });
    await registrar(db, u.business_id, def.red, 'conexion', true, 'cuenta conectada');
    // La respuesta confirma sin mostrar el token nunca.
    return reply.status(201).send({ ok: true, red: def.red, nombre });
  });

  /**
   * Paso 3: leer datos reales.
   * Si la red entrega demografía → recalibra los 500 agentes sin que nadie cargue proporciones a mano.
   * Si entrega métricas (ventas, vistas, gasto, clics, conversiones) → quedan guardadas para el backtest.
   */
  app.post('/api/integraciones/:red/sincronizar', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
    const def = redDe((req.params as { red: string }).red, reply); if (!def) return;
    if (!configurada(def)) {
      return reply.status(501).send({ error: `todavía no está configurada la integración con ${def.nombre}`, codigo: 'sin_configurar', falta: faltaDe(def) });
    }

    const fila = await tokenDe(db, u.business_id, def.red);
    const delEntorno = def.tipo === 'token' ? (def.tokenDeEntorno?.() || '') : '';
    let token = String(fila?.token || '') || delEntorno;
    if (!token) {
      return reply.status(409).send({ error: `este negocio todavía no conectó su ${def.nombre}`, codigo: 'sin_cuenta' });
    }

    let cuenta: CuentaConectada = {
      red: def.red, token,
      refresh_token: fila?.refresh_token ?? '',
      external_id: fila?.external_id ?? '', nombre: fila?.nombre ?? '',
      permisos: fila?.permisos ?? [], extra: fila?.extra ?? null,
    };

    let r = await leerSeguro(def, token, cuenta);

    // Token vencido: si la red puede renovarlo con el refresh_token guardado, se renueva y se reintenta
    // una sola vez. Si no, se responde `token_vencido` y el negocio tiene que volver a autorizar.
    if (r.tokenVencido && def.renovarToken && cuenta.refresh_token) {
      const nuevo = await def.renovarToken(cuenta);
      if (nuevo.token) {
        await db.query(
          `UPDATE cuentas_conectadas SET token = $3, token_expira = $4, actualizado = now() WHERE business_id = $1 AND red = $2`,
          [u.business_id, def.red, nuevo.token, nuevo.expira ?? null]);
        token = nuevo.token;
        cuenta = { ...cuenta, token };
        r = await leerSeguro(def, token, cuenta);
      }
    }
    if (r.tokenVencido) {
      const detalle = sinSecretos(r.error || r.detalle || 'el token venció y no se pudo renovar', token);
      await registrar(db, u.business_id, def.red, 'sincronizacion', false, detalle);
      return reply.status(409).send({ error: detalle, codigo: 'token_vencido', detalle: 'hay que volver a autorizar la cuenta para seguir leyendo' });
    }

    // Las métricas se guardan aunque la calibración no haya salido: lo que la plataforma entregó es
    // real y sirve para el backtest igual.
    let guardadas = 0;
    if (r.metricas?.length) guardadas = await guardarMetricas(db, u.business_id, def.red, r.metricas);

    if (!r.ok) {
      const detalle = sinSecretos(r.detalle || r.error || 'la plataforma no devolvió datos', token);
      await registrar(db, u.business_id, def.red, 'sincronizacion', false, detalle, { metricas_guardadas: guardadas, ...(r.datos || {}) });
      return reply.status(409).send({
        error: sinSecretos(r.error || r.detalle || 'la plataforma no devolvió datos', token),
        // `sin_audiencia` sólo tiene sentido en las redes que calibran (Instagram y YouTube): ahí el
        // problema es que faltan datos de público, no que la cuenta no exista.
        codigo: def.calibra ? 'sin_audiencia' : 'sin_datos',
        detalle: detalle + (guardadas ? ` · ${guardadas} métricas reales quedaron guardadas para el backtest` : ''),
      });
    }

    // Las redes que se conectan por token (correo, tienda, píxel, WhatsApp) no tienen pantalla de
    // autorización: la primera lectura que sale bien las deja marcadas como conectadas. El token del
    // servidor NO se guarda en la base (ya vive en el entorno): la fila guarda el estado, no el secreto.
    if (def.tipo === 'token' && !fila) {
      const quien = def.identidadDelEntorno?.();
      await guardarCuenta(db, u.business_id, def, { token: '', external_id: quien?.external_id || '', nombre: quien?.nombre || '' });
    }

    let cal: Record<string, unknown> | null = null;
    if (def.calibra) {
      if (!r.calibracion?.length) {
        const detalle = 'la plataforma no devolvió demografía suficiente para calibrar';
        await registrar(db, u.business_id, def.red, 'sincronizacion', false, detalle, { metricas_guardadas: guardadas, ...(r.datos || {}) });
        return reply.status(409).send({ error: detalle, codigo: 'sin_audiencia', detalle: 'los insights necesitan un mínimo de seguidores o de vistas y devuelven las primeras entradas' });
      }
      const calibrado = await calibrar(db, u.business_id, r.calibracion, r.fuente || def.nombre, 'propia');
      if (!('error' in calibrado)) cal = calibrado as unknown as Record<string, unknown>;
    }

    const queHizo = cal ? 'calibracion' : guardadas ? 'metricas' : 'revision';
    const etiqueta = cal ? 'calibración del público' : guardadas ? 'métricas del backtest' : 'revisión de la cuenta';
    const detalle = (r.detalle || 'la cuenta respondió') + (guardadas && !cal ? ` · ${guardadas} métricas reales guardadas para el backtest` : '');
    await registrar(db, u.business_id, def.red, queHizo, true, detalle, { metricas_guardadas: guardadas, calibracion: cal ? true : false, ...(r.datos || {}) });

    return reply.status(201).send({
      ok: true,
      red: def.red,
      que_hizo: queHizo === 'revision' ? `revisó la ${etiqueta}` : queHizo === 'metricas' ? 'guardó las métricas del backtest' : 'calibró el público',
      detalle: limpiar(detalle, 400),
      metricas_guardadas: guardadas,
      ...(cal ? { calibracion: cal } : {}),
    });
  });

  /** Paso 4: desconectar. Se borra el token guardado; se puede volver a conectar cuando quieran. */
  app.post('/api/integraciones/:red/desconectar', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
    const def = redDe((req.params as { red: string }).red, reply); if (!def) return;
    await db.query('DELETE FROM cuentas_conectadas WHERE business_id = $1 AND red = $2', [u.business_id, def.red]);
    await registrar(db, u.business_id, def.red, 'desconexion', true,
      def.tipo === 'token' ? 'cuenta desconectada (las credenciales del servidor siguen cargadas)' : 'cuenta desconectada');
    return { ok: true, red: def.red };
  });

  // ===========================================================================================
  // LOS ALIAS VIEJOS DE META (`/api/integraciones/meta/*`) — la pantalla de Instagram de hoy.
  //
  // Responden EXACTAMENTE como antes: mismos cuerpos, mismos códigos, mismos textos. Van contra la
  // definición de `instagram` del registro, así que Instagram funciona igual por las dos puertas.
  // ===========================================================================================

  /** ¿Está configurada la app de Meta? ¿Hay cuenta conectada? ¿Cuándo se sincronizó? */
  app.get('/api/integraciones/meta/estado', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
    const cuenta = await db.query(
      `SELECT red, external_id, nombre, estado, token_expira, permisos, created_at FROM cuentas_conectadas
        WHERE business_id = $1 AND red = $2`, [u.business_id, 'instagram']);
    const ult = await db.query(
      `SELECT que, ok, detalle, created_at FROM sincronizaciones
        WHERE business_id = $1 ORDER BY created_at DESC LIMIT 1`, [u.business_id]);
    return {
      configurado: metaConfigurado(),
      falta: metaConfigurado() ? [] : metaFalta(),
      // El token NO se devuelve: sólo se dice si hay uno guardado.
      cuenta: cuenta.rows[0] ? { ...cuenta.rows[0], tiene_token: true } : null,
      ultima_sincronizacion: ult.rows[0] ?? null,
      como_funciona: 'Los datos vienen agregados y con mínimos (100 seguidores, 100 interacciones): nunca hay identidades, sólo proporciones del público.',
    };
  });

  /** Paso 1: la dirección de Meta a la que hay que mandar al negocio para que autorice. */
  app.post('/api/integraciones/meta/empezar', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
    if (!metaConfigurado()) {
      return reply.status(501).send({ error: 'todavía no está configurada la app de Meta', codigo: 'sin_configurar', falta: metaFalta() });
    }
    // El `state` va firmado con el secreto de la app: así una respuesta ajena no puede conectar una cuenta
    // que no es de este negocio.
    const estado = firmarEstado('instagram', u.business_id, nonceNuevo());
    return { url: metaUrlDeAutorizacion(estado) };
  });

  /** Paso 2: vuelve de Meta con el código; se canjea por el token y se guarda. */
  app.post('/api/integraciones/meta/volver', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
    const c = exigirCuerpo<{ codigo?: string; state?: string; external_id?: string; nombre?: string }>(req.body, ['codigo'], reply);
    if (!c) return;
    const estado = limpiar(c.state, 300);
    if (estado && !verificarEstado('instagram', estado, u.business_id)) {
      return reply.status(400).send({ error: 'la respuesta no corresponde a este negocio', codigo: 'state_invalido' });
    }
    const r = await REDES.instagram.canjearCodigo(String(c.codigo));
    if (!r.token) return reply.status(502).send({ error: sinSecretos(r.error) || 'Meta no devolvió el token', codigo: 'sin_token' });
    await db.query(
      `INSERT INTO cuentas_conectadas (business_id, red, external_id, nombre, token, token_expira, permisos)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (business_id, red) DO UPDATE
         SET token = $5, token_expira = $6, external_id = $3, nombre = $4, estado = 'conectada'`,
      [u.business_id, 'instagram', limpiar(c.external_id, 60), limpiar(c.nombre, 120), r.token, r.expira ?? null, ['instagram_basic', 'instagram_manage_insights']],
    );
    await db.query(`INSERT INTO sincronizaciones (business_id, red, que, ok, detalle) VALUES ($1, $2, 'conexion', true, 'cuenta conectada')`, [u.business_id, 'instagram']);
    // La respuesta confirma sin mostrar el token nunca.
    return reply.status(201).send({ ok: true, conectada: true });
  });

  /**
   * Paso 3: leer los insights y calibrar el público solo.
   * Es la Fase B completa: no hay que cargar proporciones a mano.
   */
  app.post('/api/integraciones/meta/sincronizar', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
    if (!metaConfigurado()) {
      return reply.status(501).send({ error: 'todavía no está configurada la app de Meta', codigo: 'sin_configurar', falta: metaFalta() });
    }
    const cuenta = await tokenDe(db, u.business_id, 'instagram');
    if (!cuenta?.token) {
      return reply.status(409).send({ error: 'este negocio todavía no conectó su Instagram', codigo: 'sin_cuenta' });
    }
    const r = await leerSeguro(REDES.instagram, cuenta.token, cuenta as CuentaConectada);
    if (!r.ok || !r.calibracion?.length) {
      await db.query(
        `INSERT INTO sincronizaciones (business_id, red, que, ok, detalle, datos) VALUES ($1, $2, 'insights', false, $3, $4::jsonb)`,
        [u.business_id, 'instagram', limpiar(r.error || 'Meta no devolvió audiencia suficiente', 200), JSON.stringify({ bruto: r.datos?.bruto || {} })],
      );
      return reply.status(409).send({
        error: r.error || 'Meta no devolvió audiencia suficiente para calibrar',
        codigo: 'sin_audiencia',
        detalle: 'los insights necesitan 100 seguidores o 100 interacciones y devuelven las 45 primeras entradas',
      });
    }

    const cal = await calibrar(db, u.business_id, r.calibracion, `Instagram · ${String(r.datos?.base || 'engaged_audience_demographics')}`, 'propia');
    await db.query(
      `INSERT INTO sincronizaciones (business_id, red, que, ok, detalle, datos) VALUES ($1, $2, 'insights', true, $3, $4::jsonb)`,
      [u.business_id, 'instagram', `calibrado con ${r.calibracion.length} segmentos`, JSON.stringify({ bruto: r.datos?.bruto || {}, segmentos: r.calibracion })],
    );
    return reply.status(201).send({ ok: true, base: r.datos?.base || '', calibracion: cal });
  });

  /** Desconectar: se borra el token guardado. Reversible conectando de nuevo. */
  app.post('/api/integraciones/meta/desconectar', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
    await db.query('DELETE FROM cuentas_conectadas WHERE business_id = $1 AND red = $2', [u.business_id, 'instagram']);
    await db.query(`INSERT INTO sincronizaciones (business_id, red, que, ok, detalle) VALUES ($1, $2, 'desconexion', true, 'cuenta desconectada')`, [u.business_id, 'instagram']);
    return { ok: true, conectada: false };
  });
}

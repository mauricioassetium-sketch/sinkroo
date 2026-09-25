import type { FastifyInstance, FastifyReply } from 'fastify';
import type { Pool } from 'pg';
import { exigirSesion } from '../lib/auth.js';
import { exigirCuerpo, limpiar } from '../lib/seguridad.js';
import { conAvisoDePin, exigirPin } from '../lib/pin.js';
import { avisoConexion, enviar, faltaCorreo, fechaEnLetras } from '../services/correo.js';
import { negocioYCorreo } from '../services/verificaciones.js';
import { calibrar, guardarMetricas } from '../services/calibracion.js';
import {
  configurado as metaConfigurado, falta as metaFalta, tokenDe, urlDeAutorizacion as metaUrlDeAutorizacion,
} from '../integrations/meta.js';
import {
  REDES, configurada, faltaDe, firmarEstado, nonceNuevo, sinSecretos, verificarEstado,
  anotarEquipoDeBundle, bundleConfigurado, cubiertaPorBundle, enlaceDeBundle, equipoAnotado, equipoDelNegocio,
  plataformasDeBundle,
  type CuentaConectada, type DefinicionRed, type ResultadoLectura,
} from '../integrations/redes.js';

// =============================================================================================
// LAS INTEGRACIONES — las once redes, atendidas por una sola ruta.
//
// CÓMO SE USA (igual para cualquiera de las once)
//   1. POST /api/integraciones/:red/empezar   → devuelve la dirección de la plataforma para autorizar.
//   2. POST /api/integraciones/:red/volver    → canjea el código y guarda el token del lado del servidor.
//   3. POST /api/integraciones/:red/sincronizar → lee datos reales: calibra los 500 agentes y/o guarda
//      las métricas del backtest. Queda una fila en `sincronizaciones` con lo que se hizo.
//   4. POST /api/integraciones/:red/desconectar → borra el token guardado. Es reversible.
//   Y GET /api/integraciones  → el estado de las once, para que la pantalla las pinte sin llamarlas una
//   por una.
//
// EL CAMINO POR BUNDLE.SOCIAL (para las redes que ya cubre)
//   Cuando la app propia de la plataforma todavía no está configurada (Instagram, TikTok y YouTube hoy),
//   la conexión NO se queda en un «falta configurar»: si bundle.social está contratado y cubre esa red,
//   el enlace se pide a bundle, en el EQUIPO DEL NEGOCIO (`equipoDelNegocio`), y el negocio autoriza ahí
//   sus propias cuentas. Al volver, `POST /api/integraciones/:red/confirmar` deja la constancia en
//   `cuentas_conectadas`. Es la única forma de que la fila diga «conectada», porque la API de bundle no
//   tiene una ruta que devuelva la lista de cuentas conectadas: esa lista vive en su pantalla.
//   El orden siempre es el mismo: app propia si existe → bundle si existe → 501 honesto con lo que falta.
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
 * El nombre del negocio tal como está cargado. Es con ese nombre que se crea su equipo en bundle.social:
 * así, en la pantalla de bundle, se reconoce de qué negocio son las cuentas.
 */
async function nombreDelNegocio(db: Pool, businessId: string): Promise<string> {
  const r = await db.query('SELECT name FROM businesses WHERE id = $1', [businessId]);
  return String(r.rows[0]?.name || '').trim();
}

/**
 * Abre la pantalla de conexión de bundle.social para ESTE negocio: busca (o crea) su equipo, acota la
 * pantalla a las plataformas que cubren la red pedida y anota el equipo elegido para no volver a buscarlo.
 * Devuelve la dirección real de bundle (lleva un token de un solo uso) o el motivo por el que no se pudo.
 */
async function conexionPorBundle(db: Pool, def: DefinicionRed, businessId: string): Promise<{ url?: string; error?: string }> {
  const clave = process.env.BUNDLE_API_KEY || '';
  if (!clave) return { error: 'falta la clave de bundle.social (BUNDLE_API_KEY)' };
  const equipo = await equipoDelNegocio(clave, businessId, await nombreDelNegocio(db, businessId), db);
  if (equipo.error || !equipo.id) return { error: equipo.error || 'bundle.social no devolvió ningún equipo' };
  await anotarEquipoDeBundle(db, businessId, equipo);
  const enlace = await enlaceDeBundle(clave, equipo.id, plataformasDeBundle(def));
  if (!enlace.url) return { error: enlace.error || `no se pudo abrir la pantalla de conexión de ${def.nombre}` };
  return { url: enlace.url };
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

    // Una sola consulta por tabla para las once redes (no once consultas por red).
    const cuentas = await db.query(
      `SELECT red, external_id, nombre, estado, token_expira, permisos, created_at, (token <> '') AS tiene_token
         FROM cuentas_conectadas WHERE business_id = $1`, [u.business_id]);
    // Sólo cuenta como cuenta conectada la fila que de verdad lo está: una conexión a medias (el negocio
    // abrió la pantalla de bundle y todavía no autorizó) queda anotada pero NO se muestra conectada.
    const porRed = new Map<string, Record<string, unknown>>(
      cuentas.rows.filter((r: any) => String(r.estado || '') === 'conectada').map((r: any) => [String(r.red), r]));

    const ultimas = await db.query(
      `SELECT DISTINCT ON (red) red, que, ok, detalle, created_at FROM sincronizaciones
        WHERE business_id = $1 ORDER BY red, created_at DESC`, [u.business_id]);
    const ultimaPorRed = new Map<string, Record<string, unknown>>(
      ultimas.rows.map((r: any) => [String(r.red), { que: r.que, ok: r.ok, detalle: r.detalle, created_at: r.created_at }]));

    const redes = Object.values(REDES).map(def => {
      const appPropia = configurada(def);
      // La conexión tiene dos caminos: la app propia de la plataforma o, cuando esa app todavía no existe,
      // bundle.social (que ya la cubre). `configurado` sigue diciendo lo de siempre —si la app propia está
      // cargada en el servidor— y `viaBundle` dice que además está el camino del agregador: una red con
      // `viaBundle` SE PUEDE CONECTAR aunque `configurado` siga en false, y por eso su fila no puede decir
      // «falta configurar» ni quedarse sin botón.
      return {
        red: def.red,
        nombre: def.nombre,
        rol: def.rol,
        categoria: def.categoria,
        // 'oauth' → el negocio autoriza en la plataforma; 'token' → la clave se carga por variables de
        // entorno y no hay permiso que pedir. La pantalla usa esto para no ofrecer un «Conectar» que no existe.
        tipo: def.tipo,
        configurado: appPropia,
        // La plataforma de bundle.social que cubre esta red (ej. 'INSTAGRAM'), cuando la cubre.
        ...(def.viaBundle ? { viaBundle: def.viaBundle } : {}),
        // Por dónde pasa la conexión hoy, en una palabra: la app propia, bundle.social, o ninguna.
        via: appPropia ? 'propia' : cubiertaPorBundle(def) && bundleConfigurado() ? 'bundle.social' : null,
        // El estado es honesto: si falta una variable, la red no se puede usar POR SU CUENTA y acá se dice
        // cuál falta (aunque bundle.social la cubra y la fila igual ofrezca conectar).
        falta: faltaDe(def),
        cuenta: porRed.get(def.red) ?? null,
        ultima_sincronizacion: ultimaPorRed.get(def.red) ?? null,
        que_aporta: def.que_aporta,
        como_funciona: def.como_funciona,
      };
    });

    return { redes, resumen: { conectadas: redes.filter(r => !!r.cuenta).length, total: redes.length } };
  });

  /**
   * Paso 1: la dirección de la plataforma a la que hay que mandar al negocio para que autorice.
   * El orden de los caminos es fijo: la app propia de la plataforma si existe → bundle.social si existe
   * (y cubre esa red) → 501 honesto con lo que falta. Nunca se inventa un enlace.
   */
  app.post('/api/integraciones/:red/empezar', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
    const def = redDe((req.params as { red: string }).red, reply); if (!def) return;

    // El `state` va firmado con el secreto de la red: así una respuesta ajena no puede conectar una
    // cuenta que no es de este negocio.
    const estado = firmarEstado(def.red, u.business_id, nonceNuevo());

    if (!configurada(def)) {
      // La app propia no está configurada. Si bundle.social cubre esta red, la fila SÍ ofrece conectar:
      // el enlace se pide a bundle y el negocio autoriza sus cuentas en SU equipo.
      if (cubiertaPorBundle(def) && bundleConfigurado()) {
        const porBundle = await conexionPorBundle(db, def, u.business_id);
        if (!porBundle.url) return reply.status(502).send({ error: porBundle.error || `no se pudo abrir la pantalla de conexión de ${def.nombre}`, codigo: 'sin_enlace' });
        // `via` le dice a la pantalla por dónde va la conexión: no es la app propia de la plataforma, es
        // bundle.social, y por eso al volver se confirma con /confirmar y no con /volver.
        return { url: porBundle.url, via: 'bundle.social' };
      }
      return reply.status(501).send({
        error: `todavía no está configurada la integración con ${def.nombre}`,
        codigo: 'sin_configurar',
        falta: faltaDe(def),
      });
    }

    // Casi todas las redes arman la dirección de una vez. bundle.social no: la pide a su API en el
    // momento (`prepararConexion`) y devuelve la pantalla de conexión con un token propio y temporal.
    // Si esa llamada falla, se responde 502 con el motivo: nunca se inventa un enlace.
    let url = '';
    if (def.prepararConexion) {
      try {
        url = await def.prepararConexion(estado, { businessId: u.business_id, nombreNegocio: await nombreDelNegocio(db, u.business_id), base: db });
      } catch (e) {
        const m = sinSecretos((e as Error).message || '') || `no se pudo abrir la pantalla de conexión de ${def.nombre}`;
        return reply.status(502).send({ error: m, codigo: 'sin_enlace' });
      }
    } else {
      url = def.urlDeAutorizacion(estado);
    }
    if (!url) return reply.status(502).send({ error: `no se pudo abrir la pantalla de conexión de ${def.nombre}`, codigo: 'sin_enlace' });
    return { url };
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
   * Paso 2 bis (sólo para las redes que van por bundle.social): la vuelta de su pantalla.
   *
   * POR QUÉ EXISTE ESTA RUTA
   *   bundle.social no expone una sola ruta que devuelva qué cuentas quedaron conectadas (13 variantes
   *   probadas, todas 404): esa lista se ve en su pantalla. Entonces, cuando el negocio vuelve de conectar,
   *   la constancia la escribe el panel acá: es la ÚNICA forma de que la fila muestre «conectada». Sin
   *   esta llamada, la cuenta funciona en bundle pero el panel seguiría diciendo «por conectar».
   *
   * QUÉ SE GUARDA
   *   token = '' (el permiso lo guarda bundle: nosotros no tenemos ni queremos su token), permisos = la
   *   plataforma autorizada, estado = 'conectada', nombre = el de la plataforma, y el equipo del negocio
   *   queda en `extra` para que `/sincronizar` lea en el equipo correcto. Todo con el negocio de la sesión.
   */
  app.post('/api/integraciones/:red/confirmar', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
    const def = redDe((req.params as { red: string }).red, reply); if (!def) return;
    if (!cubiertaPorBundle(def)) {
      return reply.status(400).send({
        error: `la conexión de ${def.nombre} no pasa por bundle.social: esta vuelta no aplica`,
        codigo: 'no_aplica_bundle',
      });
    }
    if (!bundleConfigurado()) {
      return reply.status(501).send({ error: 'todavía no está configurada la integración con bundle.social', codigo: 'sin_configurar', falta: ['BUNDLE_API_KEY'] });
    }

    const c = exigirCuerpo<{ ok?: boolean; plataformas?: string[] }>(req.body || {}, [], reply);
    if (!c) return;

    // La pantalla avisa con `ok:false` cuando el negocio cerró sin autorizar: ahí no se escribe nada
    // conectado, sólo queda la constancia de que no se completó.
    const salioBien = c.ok !== false;
    const plataformas = Array.isArray(c.plataformas)
      ? c.plataformas.map(p => String(p).trim().toUpperCase()).filter(Boolean).slice(0, 20)
      : [];
    const propias = plataformasDeBundle(def);

    if (!salioBien) {
      await registrar(db, u.business_id, def.red, 'conexion', false, 'la conexión no se completó en la pantalla de bundle.social');
      return { ok: false, red: def.red, conectada: false, detalle: 'la conexión no se completó en bundle.social: no se escribe ninguna cuenta conectada' };
    }

    // Si la vuelta dice qué plataformas quedaron autorizadas y la nuestra no está entre ellas, no se
    // afirma una conexión que no ocurrió.
    if (plataformas.length && !propias.some(p => plataformas.includes(p))) {
      const detalle = `bundle.social volvió sin la cuenta de ${def.nombre}`;
      await registrar(db, u.business_id, def.red, 'conexion', false, detalle, { plataformas });
      return reply.status(409).send({ error: detalle, codigo: 'plataforma_ausente' });
    }

    // El equipo del negocio: se busca (o se crea, si es la primera vez) para que quede anotado junto a la
    // cuenta. Si esto falla, la conexión igual se anota: lo que falló fue dejar el equipo por escrito.
    const equipo = await equipoDelNegocio(process.env.BUNDLE_API_KEY || '', u.business_id, await nombreDelNegocio(db, u.business_id), db);
    const extra: Record<string, unknown> = { via: 'bundle.social', plataforma: def.viaBundle || 'TODAS', conectada_el: new Date().toISOString() };
    if (equipo.id) { extra.team_id = equipo.id; extra.equipo_nombre = equipo.nombre || ''; }
    if (plataformas.length) extra.plataformas = plataformas;

    // La fila de la red pedida. El token NO se toca (bundle guarda el permiso; acá va vacío a propósito) y
    // el `external_id` tampoco: bundle no devuelve un identificador de la cuenta que podamos guardar.
    await db.query(
      `INSERT INTO cuentas_conectadas (business_id, red, external_id, nombre, token, permisos, estado, extra, actualizado)
       VALUES ($1, $2, '', $3, '', $4::text[], 'conectada', $5::jsonb, now())
       ON CONFLICT (business_id, red) DO UPDATE SET
         nombre      = EXCLUDED.nombre,
         permisos    = EXCLUDED.permisos,
         estado      = 'conectada',
         extra       = cuentas_conectadas.extra || EXCLUDED.extra,
         actualizado = now()`,
      [u.business_id, def.red, limpiar(def.nombre, 160), propias, JSON.stringify(extra)],
    );

    // Y la fila de bundle.social del negocio queda 'conectada': es verdad (conectó una cuenta por ahí) y es
    // donde vive su equipo. No se toca si el negocio está confirmando la fila de bundle mismo.
    if (def.red !== 'bundle') {
      await db.query(
        `UPDATE cuentas_conectadas SET estado = 'conectada', actualizado = now()
          WHERE business_id = $1 AND red = 'bundle'`, [u.business_id]);
    }

    const detalle = `${def.nombre} quedó conectada por bundle.social en el equipo ${equipo.nombre || 'del negocio'}`;
    await registrar(db, u.business_id, def.red, 'conexion', true, detalle, { equipos: equipo.id ? [extra.team_id] : [], plataformas: propias });

    // El aviso por correo de que se conectó una cuenta. Misma regla que todo el correo: si el envío no
    // está configurado NO se manda y queda anotado el intento con su motivo; y si el negocio no tiene
    // correo de cuenta, no hay a quién avisarle. La conexión ya quedó hecha: el aviso no puede tumbarla.
    const { negocio, correo } = await negocioYCorreo(u.business_id);
    const carta = avisoConexion({ negocio, red: def.nombre, cuando: fechaEnLetras() });
    const salio = correo
      ? await enviar({
        businessId: u.business_id, para: correo, asunto: carta.asunto, texto: carta.texto,
        html: carta.html, plantilla: 'avisoConexion',
      })
      : { ok: false, motivo: 'la cuenta no tiene un correo al cual avisar' };

    return reply.status(201).send({
      ok: true,
      red: def.red,
      conectada: true,
      nombre: def.nombre,
      via: 'bundle.social',
      detalle,
      aviso_correo: {
        enviado: salio.ok, para: correo, motivo: salio.motivo ?? null,
        falta: salio.ok ? [] : faltaCorreo(),
      },
    });
  });

  /**
   * Paso 3: leer datos reales.
   * Si la red entrega demografía → recalibra los 500 agentes sin que nadie cargue proporciones a mano.
   * Si entrega métricas (ventas, vistas, gasto, clics, conversiones) → quedan guardadas para el backtest.
   */
  app.post('/api/integraciones/:red/sincronizar', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
    const def = redDe((req.params as { red: string }).red, reply); if (!def) return;

    const fila = await tokenDe(db, u.business_id, def.red);
    const delEntorno = def.tipo === 'token' ? (def.tokenDeEntorno?.() || '') : '';
    let token = String(fila?.token || '') || delEntorno;

    // Las redes que van por bundle.social NO tienen un token nuestro: el permiso de la cuenta lo guarda
    // bundle de su lado, y acá sólo queda la constancia que dejó `/confirmar` (fila en 'conectada'). Con
    // esa constancia la sincronización sigue adelante; antes cortaba con 409 `sin_cuenta` para siempre.
    const porBundle = !token && cubiertaPorBundle(def) && bundleConfigurado()
      && String(fila?.estado || '') === 'conectada';

    // Si la red está cubierta por bundle, la fila SÍ se puede usar hoy: lo que falta no es configurar
    // nada, es que el negocio conecte su cuenta. Eso se dice con `sin_cuenta` (409), no con un 501.
    const cubierta = cubiertaPorBundle(def) && bundleConfigurado();
    if (!configurada(def) && !cubierta) {
      return reply.status(501).send({ error: `todavía no está configurada la integración con ${def.nombre}`, codigo: 'sin_configurar', falta: faltaDe(def) });
    }
    if (!token && !porBundle) {
      return reply.status(409).send({ error: `este negocio todavía no conectó su ${def.nombre}`, codigo: 'sin_cuenta' });
    }

    let cuenta: CuentaConectada = {
      red: def.red, token,
      refresh_token: fila?.refresh_token ?? '',
      external_id: fila?.external_id ?? '', nombre: fila?.nombre ?? '',
      permisos: fila?.permisos ?? [], extra: fila?.extra ?? null,
    };

    // Por bundle la lectura la hace su conector, contra el EQUIPO DEL NEGOCIO (el que quedó anotado al
    // confirmar): no hay token que usar y su plan no trae demografía, así que no hay nada que calibrar.
    let r: ResultadoLectura;
    if (porBundle) {
      const equipo = await equipoAnotado(db, u.business_id);
      const cuentaBundle: CuentaConectada = {
        red: def.red, token: '',
        extra: { ...(fila?.extra ?? {}), ...(equipo ? { team_id: equipo } : {}) },
      };
      r = await leerSeguro(REDES.bundle, '', cuentaBundle);
    } else {
      r = await leerSeguro(def, token, cuenta);
    }

    // Token vencido: si la red puede renovarlo con el refresh_token guardado, se renueva y se reintenta
    // una sola vez. Si no, se responde `token_vencido` y el negocio tiene que volver a autorizar.
    // Por bundle no aplica: ahí no hay token nuestro que vencer.
    if (!porBundle && r.tokenVencido && def.renovarToken && cuenta.refresh_token) {
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
    // Las redes que van por bundle no calibran por acá: su plan no entrega demografía (la API responde
    // 403), así que no se le pide lo que no puede dar. El público se sigue calibrando con la app propia de
    // Instagram o YouTube el día que exista.
    if (def.calibra && !porBundle) {
      if (!r.calibracion?.length) {
        const detalle = 'la plataforma no devolvió demografía suficiente para calibrar';
        await registrar(db, u.business_id, def.red, 'sincronizacion', false, detalle, { metricas_guardadas: guardadas, ...(r.datos || {}) });
        return reply.status(409).send({ error: detalle, codigo: 'sin_audiencia', detalle: 'los insights necesitan un mínimo de seguidores o de vistas y devuelven las primeras entradas' });
      }
      const calibrado = await calibrar(db, u.business_id, r.calibracion, r.fuente || def.nombre, 'propia');
      if (!('error' in calibrado)) cal = calibrado as unknown as Record<string, unknown>;
    }

    const queHizo = cal ? 'calibracion' : guardadas ? 'metricas' : 'revision';
    const etiqueta = cal ? 'calibración del público' : guardadas ? 'métricas del backtest' : 'cuenta';
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

  /**
   * Paso 4: desconectar. Se borra el token guardado; se puede volver a conectar cuando quieran.
   * En las redes que van por bundle.social no hay token nuestro que borrar (la cuenta la desconecta el
   * negocio en la pantalla de bundle). Ahí la fila NO se borra: se marca 'desconectada'. El porqué es
   * concreto: en esa misma fila vive el equipo del negocio, y si se borrara, la próxima conexión crearía
   * otro equipo y las cuentas que ese negocio ya tiene conectadas en bundle dejarían de verse.
   */
  app.post('/api/integraciones/:red/desconectar', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
    const def = redDe((req.params as { red: string }).red, reply); if (!def) return;

    // ACCIÓN SENSIBLE: desconectar una cuenta es de las que no se deshacen solas (hay que volver a
    // autorizar, y en bundle.social el permiso se revoca desde su pantalla). Por eso pide el PIN de
    // seguridad. Si el negocio todavía no creó su PIN, la desconexión no se bloquea y la respuesta lo dice.
    const pidePin = (req.body || {}) as { pin?: string };
    const pin = await exigirPin(req, reply, u.business_id, pidePin.pin);
    if (!pin.permite) return;

    const fila = await tokenDe(db, u.business_id, def.red);
    const porBundle = cubiertaPorBundle(def) && bundleConfigurado() && !!fila && !String(fila.token || '');
    if (porBundle) {
      await db.query(
        `UPDATE cuentas_conectadas SET estado = 'desconectada', actualizado = now()
          WHERE business_id = $1 AND red = $2`, [u.business_id, def.red]);
      await registrar(db, u.business_id, def.red, 'desconexion', true,
        'cuenta desconectada en el panel (la autorización sigue dentro de bundle.social: se revoca desde su pantalla)');
      return conAvisoDePin({ ok: true, red: def.red, via: 'bundle.social' }, pin);
    }

    await db.query('DELETE FROM cuentas_conectadas WHERE business_id = $1 AND red = $2', [u.business_id, def.red]);
    await registrar(db, u.business_id, def.red, 'desconexion', true,
      def.tipo === 'token' ? 'cuenta desconectada (las credenciales del servidor siguen cargadas)' : 'cuenta desconectada');
    return conAvisoDePin({ ok: true, red: def.red }, pin);
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

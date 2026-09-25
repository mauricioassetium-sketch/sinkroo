import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { SegmentoPeso } from '../services/calibracion.js';
import { canjearCodigo as canjearMeta, leerInsightsInstagram, urlDeAutorizacion as urlAutorizacionMeta } from './meta.js';

// =============================================================================================
// EL REGISTRO DE REDES — un solo lugar donde vive cada integración.
//
// POR QUÉ UN REGISTRO Y NO CONECTORES SUELTOS
//   Las once redes hacen lo mismo por dentro (autorizar, leer, devolver datos con fuente) y sólo
//   cambian en tres cosas: las variables de entorno, la dirección de autorización y cómo se leen los
//   datos. Con el registro, las rutas son UNA (`/api/integraciones/:red/...`) y las once redes se
//   atienden solas: agregar una red nueva es agregar una entrada acá, sin tocar las rutas ni el panel.
//
// LAS TRES REGLAS QUE CUMPLE CADA CONECTOR (pedido del dueño)
//   1. NUNCA INVENTAR. Si falta una variable, la red dice `configurado: false` y `falta` lista
//      exactamente cuál falta. Si la plataforma no entrega demografía (TikTok, WhatsApp, Meta Ads,
//      Google, tienda, píxel), el texto del conector lo dice; no se rellena con datos supuestos.
//   2. NUNCA DEVOLVER UN TOKEN. El token vive en `cuentas_conectadas` (o en variables de entorno) y
//      sólo se usa del lado del servidor. El tipo `CuentaConectada` que circula acá es una lectura de
//      base de datos, no una respuesta HTTP.
//   3. NO DEJAR RASTRO EN LOS MENSAJES. Todo texto que se guarda en `sincronizaciones` o que vuelve al
//      cliente pasa por `sinSecretos()`: si un proveedor devolviera el token dentro de un error, sale
//      tachado. Y las llamadas nuevas mandan el token por cabecera `Authorization`, no en la URL.
//
// QUÉ ENTREGA CADA `leer()`
//   { ok, detalle, calibracion?, metricas?, datos?, error?, fuente?, tokenVencido? }
//   · `calibracion` → segmentos con peso para recalibrar los 500 agentes (Instagram y YouTube).
//   · `metricas`    → números reales de la plataforma para el backtest (Meta Ads, TikTok, tienda,
//                     Google, píxel y YouTube).
//   · Ambos son opcionales: una red puede servir sólo para enviar (email) y lo dice con `ok: true`.
// =============================================================================================

// ---------------------------------- TIPOS ----------------------------------

/** Una métrica real, tal como la devuelve una plataforma. Es la materia prima del backtest. */
export type MetricaReal = {
  /** Qué pieza o campaña midió (título del video, nombre de la campaña, producto). */
  pieza?: string;
  /** Qué se midió: ventas, vistas, clics, gasto, ctr, cpm, conversiones... */
  metrica: string;
  valor: number;
  /** De dónde salió el número. Sin fuente, una métrica es un adorno. */
  fuente: string;
  /** Cuándo pasó (fecha ISO), si la plataforma la da. */
  cuando?: string;
};

/** Lo que devuelve cada lectura. Nunca revienta: si algo falla, vuelve con `ok: false` y su motivo. */
export type ResultadoLectura = {
  ok: boolean;
  detalle: string;
  calibracion?: SegmentoPeso[];
  metricas?: MetricaReal[];
  datos?: Record<string, unknown>;
  error?: string;
  /** Etiqueta que se guarda como fuente de la calibración (ej. «Instagram · engaged_audience_demographics»). */
  fuente?: string;
  /** La plataforma rechazó el token: la ruta responde 409 `token_vencido` (y antes intenta renovarlo). */
  tokenVencido?: boolean;
};

/** Lo que devuelve un canje de código: el token y, si la plataforma lo da, el de renovación. */
export type ResultadoCanje = {
  token: string;
  refresh_token?: string;
  expira?: string;
  external_id?: string;
  nombre?: string;
  error?: string;
};

/** La cuenta guardada del negocio para una red. Es una lectura de base, no una respuesta al navegador. */
export type CuentaConectada = {
  red?: string;
  token: string;
  refresh_token?: string;
  external_id?: string;
  nombre?: string;
  permisos?: string[];
  extra?: Record<string, unknown> | null;
};

/**
 * Lo mínimo que el registro necesita de la base para recordar, por negocio, dónde quedaron sus cuentas
 * (el equipo de bundle.social). Es sólo `query`: así el conector no arrastra el pool entero.
 */
export type BaseDeDatos = { query: (texto: string, valores?: unknown[]) => Promise<{ rows: any[] }> };

/** Lo que el registro necesita saber del negocio que está conectando, además del `state` firmado. */
export type ContextoConexion = {
  businessId: string;
  nombreNegocio: string;
  base: BaseDeDatos;
};

/**
 * La definición de una red. Todo lo que cambia entre plataformas está acá adentro.
 * `tipo`:
 *   · 'oauth' → el negocio autoriza en la plataforma y volvemos con un código; el token queda guardado.
 *   · 'token' → el token se carga por variables de entorno (correo, tienda, píxel, WhatsApp): no hay
 *               pantalla de autorización y el token NUNCA se guarda en la base ni viaja al navegador.
 */
export type DefinicionRed = {
  red: string;
  nombre: string;
  /** Para qué sirve dentro del producto: público, pauta, conversaciones, informes... */
  rol: string;
  categoria: string;
  /** Variables de entorno que hacen falta para que esta red exista. */
  env: string[];
  /** Permisos que se le piden a la plataforma. */
  permisos: string[];
  que_aporta: string;
  como_funciona: string;
  tipo: 'oauth' | 'token';
  /**
   * La plataforma de bundle.social que cubre esta red (INSTAGRAM, FACEBOOK, TIKTOK, YOUTUBE, LINKEDIN,
   * THREADS, PINTEREST). Se pone SÓLO en las redes que bundle conecta por nosotros: con esta marca, el
   * panel ofrece «Conectar» aunque la app propia de la plataforma todavía no exista en el servidor, y la
   * conexión pasa por bundle en el equipo del negocio. Sin la marca, la red sigue siendo 501 honesto.
   */
  viaBundle?: string;
  /** ¿Esta red recalibra a los 500 agentes? Si sí, cuando no hay datos se responde `sin_audiencia`. */
  calibra?: boolean;
  /** Si el token sale del entorno (tipo 'token'), acá se lee. Nunca se guarda en la base. */
  tokenDeEntorno?: () => string;
  /** Cómo se identifica una red por token en la pantalla (número, píxel, dominio, remitente). */
  identidadDelEntorno?: () => { external_id: string; nombre: string };
  /** Cuando la regla de «qué falta» no es una lista plana (correo y YouTube tienen alternativas). */
  faltan?: () => string[];
  urlDeAutorizacion(state: string): string;
  /**
   * El enlace de conexión para las redes que NO pueden armarlo de una vez: hay plataformas (bundle.social)
   * donde la dirección se pide a su API en el momento y viene con un token de un solo uso. Si está, la ruta
   * `/empezar` la espera y usa lo que devuelva; si no está, sigue con `urlDeAutorizacion` como las once.
   * El contexto trae el negocio (para el equipo de bundle) y la base (para recordar dónde quedó su equipo).
   */
  prepararConexion?: (state: string, ctx: ContextoConexion) => Promise<string>;
  canjearCodigo(codigo: string): Promise<ResultadoCanje>;
  leer(token: string, cuenta: CuentaConectada): Promise<ResultadoLectura>;
  /** Renovación del token de acceso (Google y TikTok vencen; el resto son de larga duración). */
  renovarToken?(cuenta: CuentaConectada): Promise<ResultadoCanje>;
};

// ---------------------------------- AYUDAS ----------------------------------

const VERSION_META = 'v21.0';
const GRAPH = `https://graph.facebook.com/${VERSION_META}`;

/** El secreto con el que se firma el `state` de cada red: así una respuesta ajena no conecta una cuenta. */
export function secretoDe(red: string): string {
  switch (red) {
    case 'tiktok': return process.env.TIKTOK_CLIENT_SECRET || '';
    case 'google':
    case 'youtube': return process.env.GOOGLE_CLIENT_SECRET || '';
    case 'email': return process.env.RESEND_API_KEY || process.env.SMTP_PASS || '';
    case 'tienda': return process.env.TIENDA_TOKEN || '';
    // bundle.social firma el `state` con la clave de su API: sin esto saldría firmado con un secreto
    // vacío, o sea con una firma que cualquiera podría armar.
    case 'bundle': return process.env.BUNDLE_API_KEY || '';
    case 'instagram':
    case 'facebook':
    case 'meta_ads':
    case 'pixel':
    case 'whatsapp': return process.env.META_APP_SECRET || process.env.PIXEL_TOKEN || '';
    default: return '';
  }
}

/** Firma el `state` del negocio. Va con el secreto de la red y un nonce de un solo uso. */
export function firmarEstado(red: string, businessId: string, nonce: string): string {
  const firma = createHmac('sha256', secretoDe(red)).update(`${businessId}.${nonce}`).digest('hex').slice(0, 24);
  return `${businessId}.${nonce}.${firma}`;
}

/**
 * Comprueba que el `state` lo haya firmado este servidor para ESTE negocio.
 * Sin `state` no hay nada que comprobar (las redes por token no lo usan y la ruta ya exige sesión); con
 * `state` y sin secreto en la red, no pasa: mejor cortar que confiar en una firma que no se puede verificar.
 */
export function verificarEstado(red: string, estado: string | undefined, businessId: string): boolean {
  const texto = String(estado || '').trim();
  if (!texto) return true;
  const secreto = secretoDe(red);
  if (!secreto) return false;
  const partes = texto.split('.');
  if (partes.length !== 3) return false;
  const [dueño, nonce, firma] = partes;
  if (dueño !== businessId) return false;
  const esperada = createHmac('sha256', secreto).update(`${dueño}.${nonce}`).digest('hex').slice(0, 24);
  if (firma.length !== esperada.length) return false;
  return timingSafeEqual(Buffer.from(firma), Buffer.from(esperada));
}

/** Secreto nuevo para el `state`: se genera en cada intento de conexión. */
export const nonceNuevo = (bytes = 12): string => randomBytes(bytes).toString('hex');

/**
 * Saca de un texto cualquier secreto que se haya colado (token de la cuenta, claves de la app) y
 * tacha las claves que aparezcan dentro de una URL. Es la última barrera antes de guardar o responder.
 */
export function sinSecretos(texto: unknown, ...secretos: (string | undefined)[]): string {
  let t = String(texto ?? '');
  for (const s of secretos) if (s && s.length >= 8) t = t.split(s).join('***');
  return t
    .replace(/(access_token|refresh_token|client_secret|client_key|code|token)=[^&\s"']+/gi, '$1=***')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);
}

/** Las variables que le faltan a una red, en el orden declarado. */
export function faltaDe(def: DefinicionRed): string[] {
  if (def.faltan) return def.faltan();
  return def.env.filter(k => !process.env[k]);
}

/** ¿Se puede usar esta red hoy? Si falta algo, no: y `faltaDe` dice qué. */
export function configurada(def: DefinicionRed): boolean {
  return faltaDe(def).length === 0;
}

/**
 * Pide JSON con tope de tiempo. Ninguna plataforma puede colgar el proceso: si no contesta en 15
 * segundos, se corta y la red devuelve `ok: false` con un motivo legible.
 */
async function pedirJson(url: string, init: RequestInit = {}, ms = 15_000): Promise<{ status: number; dato: any; error?: string }> {
  try {
    const r = await fetch(url, { ...init, signal: AbortSignal.timeout(ms) });
    const texto = await r.text();
    let dato: any = {};
    try { dato = texto ? JSON.parse(texto) : {}; } catch { dato = {}; }
    return { status: r.status, dato };
  } catch (e) {
    return { status: 0, dato: {}, error: sinSecretos((e as Error).message || 'la plataforma no respondió') };
  }
}

/** Un fallo legible. Se arma con `fallo('...')` y nunca deja el error crudo de la plataforma sin limpiar. */
function fallo(mensaje: string, opciones: Partial<ResultadoLectura> = {}): ResultadoLectura {
  const texto = sinSecretos(mensaje) || 'la plataforma no devolvió datos';
  return { ok: false, detalle: texto, error: texto, ...opciones };
}

/** El peso como proporción: 31.2 % se guarda 0,312. La calibración normaliza después. */
const aPeso = (v: unknown) => Math.round(Math.max(0, Number(v) || 0) * 10000) / 10000;

/** La fecha de hoy en el formato que piden las APIs de Google (YYYY-MM-DD). */
const hoy = () => new Date().toISOString().slice(0, 10);
const haceDias = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString().slice(0, 10);

/** Cabecera Bearer: el token viaja en la cabecera y no en la URL, así no queda en ningún registro. */
const bearer = (token: string) => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });

// ---------------------------------- LAS DIEZ REDES ----------------------------------

// 1 · INSTAGRAM — la que ya funciona. Entrega demografía real y calibra los 500.
const instagram: DefinicionRed = {
  red: 'instagram',
  nombre: 'Instagram',
  rol: 'Público y contenido',
  categoria: 'red social',
  env: ['META_APP_ID', 'META_APP_SECRET', 'META_REDIRECT_URI'],
  permisos: ['instagram_basic', 'instagram_manage_insights', 'pages_show_list', 'pages_read_engagement', 'read_insights'],
  tipo: 'oauth',
  // bundle.social ofrece INSTAGRAM en su pantalla de conexión, así que esta fila se puede conectar hoy
  // aunque la app propia de Meta todavía no exista en el servidor. La app propia, cuando exista, manda.
  viaBundle: 'INSTAGRAM',
  calibra: true,
  que_aporta: 'Quiénes son sus seguidores de verdad —edad, género y las ciudades donde están— y cómo rinde cada publicación.',
  como_funciona: 'Es la API oficial de Instagram sobre su propia cuenta: los datos vienen agregados y con mínimos (100 seguidores o 100 interacciones) y nunca con identidades, sólo proporciones del público. Es una de las dos redes del registro que sí entrega demografía real.',
  urlDeAutorizacion: (state) => urlAutorizacionMeta(state),
  canjearCodigo: (codigo) => canjearMeta(codigo),
  leer: async (token, cuenta) => {
    const r = await leerInsightsInstagram(token, cuenta.external_id || 'me');
    if (r.error || !r.segmentos.length) {
      // El motivo de Meta, limpio. Cuando Meta respondió bien pero sin datos suficientes, `error` queda
      // vacío y el detalle explica qué pasó: así el alias viejo conserva su texto de siempre.
      const motivo = sinSecretos(r.error, token);
      return {
        ok: false,
        error: motivo,
        detalle: motivo || 'la cuenta no devolvió demografía suficiente (hacen falta 100 seguidores o 100 interacciones)',
        datos: { bruto: r.bruto || {} },
      };
    }
    return {
      ok: true,
      detalle: `calibró el público con ${r.segmentos.length} segmentos de ${r.base}`,
      calibracion: r.segmentos,
      fuente: `Instagram · ${r.base}`,
      datos: { bruto: r.bruto, segmentos: r.segmentos, base: r.base },
    };
  },
};

// 2 · FACEBOOK — la Página del negocio: publicar y saber cuánta gente la sigue.
const facebook: DefinicionRed = {
  red: 'facebook',
  nombre: 'Facebook',
  rol: 'Página y contenido',
  categoria: 'red social',
  env: ['META_APP_ID', 'META_APP_SECRET', 'META_REDIRECT_URI'],
  permisos: ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'read_insights'],
  tipo: 'oauth',
  // bundle.social conecta la cuenta de Facebook como plataforma propia (FACEBOOK), aparte de la de
  // Instagram: es el camino que hace que esta fila ofrezca «Conectar» hoy, sin la app de Meta cargada.
  // (La app propia de Meta sirve para las dos: por eso el `env` es el mismo que el de Instagram.)
  viaBundle: 'FACEBOOK',
  que_aporta: 'La Página del negocio por la que se publica en Facebook y cuánta gente la sigue.',
  como_funciona: 'Se conecta la cuenta de Facebook del negocio y se lee SÓLO su propia Página: su nombre, sus seguidores y sus publicaciones con comentarios, reacciones y veces compartido. NO entrega demografía —la de Meta se pide por Instagram—, así que no calibra a los 500: entra al backtest como métrica real. Con el plan de bundle.social, además, sirve para publicar.',
  urlDeAutorizacion: (state) => urlMeta(state, facebook.permisos),
  canjearCodigo: (codigo) => canjearMeta(codigo),
  leer: async (token) => {
    const paginas = await pedirJson(`${GRAPH}/me/accounts?fields=id,name,fan_count&limit=25`, { headers: bearer(token) });
    const errPaginas = paginas.dato?.error?.message;
    if (errPaginas) return fallo(errPaginas, { tokenVencido: paginas.status === 401 });
    const lista = (paginas.dato?.data || []) as { id?: string; name?: string; fan_count?: number }[];
    if (!lista.length) return fallo('la cuenta de Facebook no tiene ninguna Página administrada');

    const pagina = lista[0];
    const id = String(pagina.id || '');
    const publicaciones = await pedirJson(
      `${GRAPH}/${id}/posts?fields=message,created_time,shares,comments.summary(true),reactions.summary(true)&limit=25`,
      { headers: bearer(token) });
    const errPosts = publicaciones.dato?.error?.message;
    if (errPosts) return fallo(errPosts, { tokenVencido: publicaciones.status === 401 });
    const filas = (publicaciones.dato?.data || []) as Record<string, any>[];

    const metricas: MetricaReal[] = [];
    for (const p of filas.slice(0, 25)) {
      const cuando = String(p.created_time || '').slice(0, 10);
      const pieza = String(p.message || '').slice(0, 120) || `publicación del ${cuando || 'día sin fecha'}`;
      metricas.push(
        { pieza, metrica: 'comentarios', valor: Number(p.comments?.summary?.total_count || 0), fuente: 'facebook', cuando },
        { pieza, metrica: 'reacciones', valor: Number(p.reactions?.summary?.total_count || 0), fuente: 'facebook', cuando },
        { pieza, metrica: 'compartidos', valor: Number(p.shares?.count || 0), fuente: 'facebook', cuando },
      );
    }
    return {
      ok: true,
      detalle: `leyó la Página ${String(pagina.name || id)} (${Number(pagina.fan_count || 0)} seguidores) y ${filas.length} publicaciones`,
      metricas,
      datos: {
        pagina: { external_id: id, nombre: pagina.name ?? '', seguidores: Number(pagina.fan_count || 0) },
        publicaciones: filas.length,
        demografia: 'Facebook no entrega demografía: el público se calibra con Instagram o YouTube',
      },
    };
  },
};

// 3 · META ADS — la métrica real de la pauta: la que mide el backtest.
const metaAds: DefinicionRed = {
  red: 'meta_ads',
  nombre: 'Meta Ads',
  rol: 'Pauta y resultados',
  categoria: 'publicidad',
  env: ['META_APP_ID', 'META_APP_SECRET', 'META_REDIRECT_URI'],
  permisos: ['ads_read', 'ads_management'],
  tipo: 'oauth',
  que_aporta: 'Lo que de verdad costó y rindió la pauta: gasto, resultados, CTR y CPM por campaña.',
  como_funciona: 'Es la Marketing API de Meta con la misma app que Instagram. Lee únicamente la cuenta publicitaria del negocio y sus campañas de los últimos 30 días. No entrega demografía del público, pero sí es la métrica real contra la que se mide el backtest.',
  urlDeAutorizacion: (state) => urlMeta(state, metaAds.permisos),
  canjearCodigo: (codigo) => canjearMeta(codigo),
  leer: async (token, cuenta) => {
    const tokenCuenta = cuenta.token || token;
    const cuentas = await pedirJson(`${GRAPH}/me/adaccounts?fields=account_id,name,account_status&limit=25`, { headers: bearer(tokenCuenta) });
    const errCuentas = cuentas.dato?.error?.message;
    if (errCuentas) return fallo(errCuentas, { tokenVencido: cuentas.status === 401 });
    const disponibles = (cuentas.dato?.data || []) as { account_id?: string; name?: string }[];
    if (!disponibles.length) return fallo('la cuenta de Meta no tiene ninguna cuenta publicitaria disponible');
    const primera = disponibles[0];
    const id = `act_${String(primera.account_id || '')}`;

    const campos = 'campaign_name,spend,impressions,clicks,ctr,cpm,actions,date_stop';
    const ins = await pedirJson(`${GRAPH}/${id}/insights?level=campaign&date_preset=last_30d&fields=${campos}&limit=25`, { headers: bearer(tokenCuenta) });
    const errIns = ins.dato?.error?.message;
    if (errIns) return fallo(errIns, { tokenVencido: ins.status === 401 });
    const filas = (ins.dato?.data || []) as Record<string, any>[];
    if (!filas.length) return fallo('la cuenta publicitaria no tuvo campañas con actividad en los últimos 30 días');

    // Los «resultados» son la suma de las acciones que significan algo para el negocio (un lead, una
    // compra, una conversación), no todos los clics: Meta entrega decenas de tipos y contarlos todos
    // inflaría el número.
    const esResultado = (t: unknown) => /lead|purchase|conversion|messaging_conversation|complete_registration/i.test(String(t || ''));
    const metricas: MetricaReal[] = [];
    let gastoTotal = 0, resultadosTotal = 0, ctrSuma = 0, cpmSuma = 0, conGasto = 0;
    for (const f of filas) {
      const nombre = String(f.campaign_name || 'campaña sin nombre').slice(0, 120);
      const gasto = Number(f.spend || 0);
      const ctr = Number(f.ctr || 0);
      const cpm = Number(f.cpm || 0);
      const acciones = Array.isArray(f.actions) ? f.actions : [];
      const resultados = acciones.filter((a: any) => esResultado(a?.action_type)).reduce((s: number, a: any) => s + Number(a?.value || 0), 0);
      const cuando = String(f.date_stop || '').slice(0, 10);
      gastoTotal += gasto; resultadosTotal += resultados; ctrSuma += ctr; cpmSuma += cpm; conGasto++;
      metricas.push(
        { pieza: nombre, metrica: 'gasto', valor: Math.round(gasto * 100) / 100, fuente: 'meta_ads', cuando },
        { pieza: nombre, metrica: 'resultados', valor: Math.round(resultados * 100) / 100, fuente: 'meta_ads', cuando },
        { pieza: nombre, metrica: 'ctr', valor: Math.round(ctr * 10000) / 10000, fuente: 'meta_ads', cuando },
        { pieza: nombre, metrica: 'cpm', valor: Math.round(cpm * 100) / 100, fuente: 'meta_ads', cuando },
      );
    }
    const promedio = (n: number) => (conGasto ? Math.round((n / conGasto) * 10000) / 10000 : 0);
    return {
      ok: true,
      detalle: `leyó ${filas.length} campañas de ${String(primera.name || id).slice(0, 80)}: $${Math.round(gastoTotal * 100) / 100} de gasto, ${Math.round(resultadosTotal * 100) / 100} resultados, CTR ${promedio(ctrSuma)} % y CPM $${promedio(cpmSuma)}`,
      metricas,
      datos: {
        cuenta_publicitaria: { external_id: id, nombre: primera.name ?? '' },
        totales: { gasto: Math.round(gastoTotal * 100) / 100, resultados: Math.round(resultadosTotal * 100) / 100, ctr: promedio(ctrSuma), cpm: promedio(cpmSuma) },
        campanas: filas.length,
      },
    };
  },
};

// 4 · WHATSAPP — el canal de las conversaciones del negocio.
const whatsapp: DefinicionRed = {
  red: 'whatsapp',
  nombre: 'WhatsApp',
  rol: 'Conversaciones y ventas por chat',
  categoria: 'mensajería',
  env: ['WHATSAPP_TOKEN', 'WHATSAPP_PHONE_ID', 'WHATSAPP_VERIFY_TOKEN'],
  permisos: ['whatsapp_business_management', 'whatsapp_business_messaging'],
  tipo: 'token',
  tokenDeEntorno: () => process.env.WHATSAPP_TOKEN || '',
  identidadDelEntorno: () => ({ external_id: process.env.WHATSAPP_PHONE_ID || '', nombre: 'WhatsApp Cloud API' }),
  que_aporta: 'El número por el que entran los clientes y el estado del canal que atiende esas conversaciones.',
  como_funciona: 'Es la Cloud API de WhatsApp, sobre el número del propio negocio y con un token de servidor: no hay pantalla de autorización. Los estados de entrega y lectura (entregado, leído) llegan por webhook a /webhooks/whatsapp y alimentan Conversaciones; la API no tiene una lista de mensajes enviados para leer, así que acá se revisa el número y su perfil, y no se inventa un historial. Nunca entrega datos de quién escribe.',
  urlDeAutorizacion: (state) => {
    // El enlace que sí existe para WhatsApp es el de la app de Meta (Embedded Signup): ahí se elige el
    // número que se va a atender. Si hay config_id cargado, se usa el flujo completo.
    const q = new URLSearchParams({
      client_id: process.env.META_APP_ID || '',
      redirect_uri: process.env.META_REDIRECT_URI || '',
      state,
      response_type: 'code',
      scope: whatsapp.permisos.join(','),
    });
    if (process.env.WHATSAPP_CONFIG_ID) { q.set('config_id', process.env.WHATSAPP_CONFIG_ID); q.set('override_default_response_type', 'true'); }
    return `https://www.facebook.com/${VERSION_META}/dialog/oauth?${q.toString()}`;
  },
  canjearCodigo: async () => ({ token: '', error: 'WhatsApp se conecta con el token del servidor (WHATSAPP_TOKEN), no por código: no hay nada que canjear' }),
  leer: async (token, cuenta) => {
    const id = process.env.WHATSAPP_PHONE_ID || cuenta.external_id || '';
    if (!id) return fallo('falta el número de WhatsApp (WHATSAPP_PHONE_ID) para poder leer el canal');
    const numero = await pedirJson(`${GRAPH}/${id}?fields=display_phone_number,verified_name,quality_rating,platform_type,code_verification_status`, { headers: bearer(token) });
    const err = numero.dato?.error?.message;
    if (err) return fallo(err, { tokenVencido: numero.status === 401 });
    const d = numero.dato || {};
    const perfil = await pedirJson(`${GRAPH}/${id}/whatsapp_business_profile?fields=about,address,email,websites,vertical`, { headers: bearer(token) });
    const p = perfil.dato?.data?.[0] || {};
    return {
      ok: true,
      detalle: `el número ${String(d.display_phone_number || id)} responde (${String(d.verified_name || 'sin nombre verificado')}, calidad ${String(d.quality_rating || 'sin calificar')}). Los estados de entrega y lectura llegan por webhook y quedan en Conversaciones.`,
      datos: {
        numero: { external_id: id, display_phone_number: d.display_phone_number ?? '', verified_name: d.verified_name ?? '', quality_rating: d.quality_rating ?? '', platform_type: d.platform_type ?? '' },
        perfil: { about: p.about ?? '', vertical: p.vertical ?? '', websites: p.websites ?? [] },
        nota: 'WhatsApp no entrega demografía ni un listado de mensajes enviados: los estados llegan por webhook.',
      },
    };
  },
};

// 5 · TIKTOK — video corto: alcance y rendimiento por video.
const tiktok: DefinicionRed = {
  red: 'tiktok',
  nombre: 'TikTok',
  rol: 'Alcance y video',
  categoria: 'red social',
  env: ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET', 'TIKTOK_REDIRECT_URI'],
  permisos: ['user.info.basic', 'user.info.profile', 'user.info.stats', 'video.list'],
  tipo: 'oauth',
  // TikTok está en la lista de bundle.social: se puede conectar por ahí sin crear la app propia de TikTok.
  viaBundle: 'TIKTOK',
  que_aporta: 'Cuánta gente ve sus videos y cómo rinde cada uno: vistas, me gusta, comentarios y veces compartido.',
  como_funciona: 'Es la API oficial de TikTok (Login Kit for Business y Display API) sobre la cuenta del propio negocio. NO entrega demografía: ni edad, ni género, ni ciudad, ni país. Este conector no la inventa: el público se calibra con Instagram o YouTube, y lo de TikTok entra al backtest como métrica real por video.',
  urlDeAutorizacion: (state) => {
    const q = new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY || '',
      scope: tiktok.permisos.join(','),
      response_type: 'code',
      redirect_uri: process.env.TIKTOK_REDIRECT_URI || '',
      state,
    });
    return `https://www.tiktok.com/v2/auth/authorize/?${q.toString()}`;
  },
  canjearCodigo: async (codigo) => {
    const r = await pedirJson('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-Control': 'no-cache' },
      body: new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY || '',
        client_secret: process.env.TIKTOK_CLIENT_SECRET || '',
        code: codigo,
        grant_type: 'authorization_code',
        redirect_uri: process.env.TIKTOK_REDIRECT_URI || '',
      }).toString(),
    });
    const d = r.dato || {};
    if (!d.access_token) return { token: '', error: sinSecretos(d.error_description || d.message || d.error || r.error || 'TikTok no devolvió el token', process.env.TIKTOK_CLIENT_SECRET) };
    return {
      token: String(d.access_token),
      refresh_token: d.refresh_token ? String(d.refresh_token) : undefined,
      expira: d.expires_in ? new Date(Date.now() + Number(d.expires_in) * 1000).toISOString() : undefined,
      external_id: String(d.open_id || ''),
    };
  },
  renovarToken: async (cuenta) => {
    if (!cuenta.refresh_token) return { token: '', error: 'la cuenta de TikTok no tiene token de renovación guardado: hay que volver a autorizar' };
    const r = await pedirJson('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-Control': 'no-cache' },
      body: new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY || '',
        client_secret: process.env.TIKTOK_CLIENT_SECRET || '',
        grant_type: 'refresh_token',
        refresh_token: cuenta.refresh_token,
      }).toString(),
    });
    const d = r.dato || {};
    if (!d.access_token) return { token: '', error: sinSecretos(d.error_description || d.error || 'TikTok no renovó el token') };
    return { token: String(d.access_token), refresh_token: d.refresh_token ? String(d.refresh_token) : cuenta.refresh_token, expira: d.expires_in ? new Date(Date.now() + Number(d.expires_in) * 1000).toISOString() : undefined };
  },
  leer: async (token) => {
    const cab = bearer(token);
    const perfil = await pedirJson('https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,follower_count,likes_count,video_count', { headers: cab });
    const codigo = perfil.dato?.error?.code;
    const mensaje = perfil.dato?.error?.message;
    if (codigo && codigo !== 'ok') {
      return fallo(mensaje || 'TikTok rechazó el token', { tokenVencido: codigo === 'access_token_invalid' || perfil.status === 401 });
    }
    const u = perfil.dato?.data?.user;
    if (!u) return fallo('TikTok no devolvió el perfil de la cuenta');

    const lista = await pedirJson('https://open.tiktokapis.com/v2/video/list/?fields=id,title,view_count,like_count,comment_count,share_count', {
      method: 'POST', headers: cab, body: JSON.stringify({ max_count: 20 }),
    });
    const codigoVideos = lista.dato?.error?.code;
    if (codigoVideos && codigoVideos !== 'ok') {
      return fallo(lista.dato?.error?.message || 'TikTok no devolvió los videos', { tokenVencido: codigoVideos === 'access_token_invalid' });
    }
    const videos = (lista.dato?.data?.videos || []) as Record<string, any>[];
    const metricas: MetricaReal[] = [];
    for (const v of videos.slice(0, 20)) {
      const pieza = String(v.title || v.id || 'video sin título').slice(0, 120);
      metricas.push(
        { pieza, metrica: 'vistas', valor: Number(v.view_count || 0), fuente: 'tiktok' },
        { pieza, metrica: 'me_gusta', valor: Number(v.like_count || 0), fuente: 'tiktok' },
        { pieza, metrica: 'comentarios', valor: Number(v.comment_count || 0), fuente: 'tiktok' },
        { pieza, metrica: 'compartidos', valor: Number(v.share_count || 0), fuente: 'tiktok' },
      );
    }
    if (!metricas.length) return fallo('la cuenta de TikTok no tiene videos publicados para medir');
    return {
      ok: true,
      detalle: `leyó el perfil ${String(u.display_name || '')} (${Number(u.follower_count || 0)} seguidores, ${Number(u.video_count || 0)} videos) y midió ${videos.length} videos`,
      metricas,
      datos: { perfil: { display_name: u.display_name ?? '', follower_count: u.follower_count ?? 0, likes_count: u.likes_count ?? 0, video_count: u.video_count ?? 0 }, videos: videos.length, demografia: 'TikTok no entrega demografía' },
    };
  },
};

// 6 · EMAIL — por dónde salen los informes.
const email: DefinicionRed = {
  red: 'email',
  nombre: 'Correo',
  rol: 'Informes y avisos',
  categoria: 'envío',
  env: ['RESEND_API_KEY', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM'],
  permisos: ['envío de correo saliente'],
  tipo: 'token',
  tokenDeEntorno: () => process.env.RESEND_API_KEY || '',
  identidadDelEntorno: () => ({ external_id: process.env.EMAIL_FROM || '', nombre: process.env.EMAIL_FROM || 'Correo de informes' }),
  faltan: () => {
    const f: string[] = [];
    // Dos caminos: la API de Resend o un servidor SMTP propio. Con uno alcanza.
    if (!process.env.RESEND_API_KEY && !(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)) {
      f.push('RESEND_API_KEY', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS');
    }
    if (!process.env.EMAIL_FROM) f.push('EMAIL_FROM');
    return f;
  },
  que_aporta: 'El correo desde el que salen los informes del negocio: el resumen semanal y los avisos.',
  como_funciona: 'Es el dominio de envío del propio negocio, no un correo compartido. Al sincronizar se comprueba contra el proveedor (Resend) que el dominio esté verificado y pueda enviar; si el envío va por SMTP propio, esa verificación automática no se puede hacer y el conector lo dice en vez de dar por bueno un dominio sin comprobar.',
  urlDeAutorizacion: () => 'https://resend.com/domains',
  canjearCodigo: async () => ({ token: '', error: 'el correo se conecta con la clave del servidor (RESEND_API_KEY o SMTP_*), no por código' }),
  leer: async () => {
    const apiKey = process.env.RESEND_API_KEY || '';
    if (!apiKey) {
      const haySmtp = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
      return fallo(haySmtp
        ? 'el envío está configurado por SMTP, pero la verificación del dominio sólo se puede hacer con RESEND_API_KEY: no se puede comprobar que el dominio pueda enviar'
        : 'no hay proveedor de correo configurado: falta RESEND_API_KEY o los datos de SMTP (SMTP_HOST, SMTP_USER, SMTP_PASS)');
    }
    const r = await pedirJson('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${apiKey}` } });
    if (r.dato?.error || r.status === 401) {
      const m = r.dato?.error?.message || r.dato?.message || r.error || 'Resend rechazó la clave';
      return fallo(sinSecretos(m, apiKey), { tokenVencido: r.status === 401 });
    }
    const dominios = (r.dato?.data || []) as { name?: string; status?: string }[];
    const verificados = dominios.filter(d => String(d.status || '').toLowerCase() === 'verified');
    if (!dominios.length) return fallo('la cuenta de Resend no tiene ningún dominio cargado: sin dominio verificado no se pueden enviar los informes');
    if (!verificados.length) return fallo(`los dominios cargados todavía no están verificados (${dominios.map(d => `${d.name}: ${d.status}`).slice(0, 3).join(', ')}): hasta que no se verifiquen, el correo no puede enviar informes`);
    return {
      ok: true,
      detalle: `el correo puede enviar: ${verificados.length} dominio${verificados.length === 1 ? '' : 's'} verificado${verificados.length === 1 ? '' : 's'} (${verificados.map(d => d.name).slice(0, 3).join(', ')})`,
      datos: { remitente: process.env.EMAIL_FROM || '', dominios },
    };
  },
};

// 7 · TIENDA — la mejor métrica del backtest: lo que de verdad se vendió.
const tienda: DefinicionRed = {
  red: 'tienda',
  nombre: 'Tienda',
  rol: 'Ventas y catálogo',
  categoria: 'comercio',
  env: ['TIENDA_URL', 'TIENDA_TOKEN'],
  permisos: ['lectura de catálogo y pedidos'],
  tipo: 'token',
  tokenDeEntorno: () => process.env.TIENDA_TOKEN || '',
  identidadDelEntorno: () => {
    const host = (process.env.TIENDA_URL || '').replace(/^https?:\/\//, '').replace(/\/+$/, '');
    return { external_id: host, nombre: host };
  },
  que_aporta: 'El catálogo con sus precios y las ventas reales por producto: es la métrica más honesta del backtest, porque es plata que entró.',
  como_funciona: 'Lee la tienda del negocio (Shopify o WooCommerce) con un token de sólo lectura: productos, precios y pedidos pagados. Las unidades vendidas y el total facturado no se estiman, se leen. Para WooCommerce el token va como llave:secreto y para Shopify como token de acceso de la app.',
  urlDeAutorizacion: () => {
    const base = (process.env.TIENDA_URL || '').replace(/\/+$/, '');
    if (!base) return 'https://www.shopify.com/admin';
    return /myshopify|shopify/i.test(base) || process.env.TIENDA_TIPO === 'shopify'
      ? `${base}/admin`
      : `${base}/wp-admin/admin.php?page=wc-settings&tab=advanced&section=keys`;
  },
  canjearCodigo: async () => ({ token: '', error: 'la tienda se conecta con su token de servidor (TIENDA_URL y TIENDA_TOKEN), no por código' }),
  leer: async (token) => {
    const base = (process.env.TIENDA_URL || '').replace(/\/+$/, '');
    if (!base) return fallo('falta la dirección de la tienda (TIENDA_URL)');
    if (!token) return fallo('falta el token de la tienda (TIENDA_TOKEN)');
    const esShopify = /myshopify|shopify/i.test(base) || process.env.TIENDA_TIPO === 'shopify';
    if (!esShopify && !token.includes(':')) {
      return fallo('el token de WooCommerce tiene que venir como llave:secreto (TIENDA_TOKEN=ck_...:cs_...)');
    }
    const cab: Record<string, string> = esShopify
      ? { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' }
      : { Authorization: `Basic ${Buffer.from(token).toString('base64')}`, 'Content-Type': 'application/json' };

    const ruta = esShopify ? 'admin/api/2024-10' : 'wp-json/wc/v3';
    const productos = await pedirJson(`${base}/${ruta}/products?${esShopify ? 'limit=50&fields=id,title,variants' : 'per_page=50&status=publish'}`, { headers: cab });
    if (productos.status === 401 || productos.status === 403) return fallo('la tienda rechazó el token: revise que sea de sólo lectura y que siga vigente', { tokenVencido: true });
    if (!productos.dato?.products && !productos.dato?.length) {
      const m = productos.dato?.message || productos.dato?.errors || productos.error;
      return fallo(typeof m === 'string' ? m : 'la tienda no devolvió el catálogo (revise TIENDA_URL y TIENDA_TOKEN)');
    }

    const listaProd = (esShopify ? productos.dato.products : productos.dato) as Record<string, any>[];
    const pedidos = await pedirJson(`${base}/${ruta}/orders?${esShopify ? 'status=any&limit=50&fields=id,created_at,line_items,total_price,financial_status' : 'per_page=50&status=completed'}`, { headers: cab });
    if (pedidos.status === 401 || pedidos.status === 403) return fallo('la tienda rechazó el token al leer los pedidos: el token necesita permiso de lectura de órdenes');
    const listaPed = (esShopify ? pedidos.dato?.orders : pedidos.dato) as Record<string, any>[] | undefined;

    const metricas: MetricaReal[] = [];
    for (const p of (listaProd || []).slice(0, 50)) {
      const titulo = String(p.title || p.name || 'producto sin nombre').slice(0, 120);
      const precio = Number(esShopify ? (p.variants?.[0]?.price ?? 0) : (p.price ?? 0));
      metricas.push({ pieza: titulo, metrica: 'precio', valor: Math.round(precio * 100) / 100, fuente: 'tienda' });
    }
    const unidades: Record<string, number> = {};
    const ultimaVenta: Record<string, string> = {};
    let facturado = 0;
    for (const o of (listaPed || [])) {
      facturado += Number(o.total || o.total_price || 0);
      const cuando = String(o.date_created || o.created_at || '').slice(0, 10);
      for (const it of (o.line_items || [])) {
        const nombre = String(it.name || it.title || 'producto sin nombre').slice(0, 120);
        unidades[nombre] = (unidades[nombre] || 0) + Number(it.quantity || 0);
        if (cuando) ultimaVenta[nombre] = cuando;
      }
    }
    for (const [nombre, cantidad] of Object.entries(unidades)) {
      metricas.push({ pieza: nombre, metrica: 'unidades_vendidas', valor: cantidad, fuente: 'tienda', cuando: ultimaVenta[nombre] });
    }
    if (facturado) metricas.push({ metrica: 'facturado', valor: Math.round(facturado * 100) / 100, fuente: 'tienda' });

    return {
      ok: true,
      detalle: `leyó ${(listaProd || []).length} productos y ${(listaPed || []).length} pedidos (${Object.keys(unidades).length} productos con ventas, $${Math.round(facturado * 100) / 100} facturado)`,
      metricas,
      datos: { plataforma: esShopify ? 'shopify' : 'woocommerce', productos: (listaProd || []).length, pedidos: (listaPed || []).length },
    };
  },
};

// 8 · GOOGLE — campañas y tráfico del sitio.
const google: DefinicionRed = {
  red: 'google',
  nombre: 'Google',
  rol: 'Campañas y tráfico',
  categoria: 'publicidad y analítica',
  env: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI'],
  permisos: ['https://www.googleapis.com/auth/adwords', 'https://www.googleapis.com/auth/analytics.readonly'],
  tipo: 'oauth',
  que_aporta: 'Lo que entra al sitio desde Google y cómo rinden las campañas: sesiones, usuarios y conversiones.',
  como_funciona: 'Es el OAuth de Google sobre la cuenta del propio negocio: se lee su Analytics (GA4) y, si hay token de desarrollador, su cuenta de Google Ads. Son datos agregados del sitio y de las campañas, nunca de personas. No entrega demografía, así que no calibra a los 500: entra al backtest como métrica real.',
  urlDeAutorizacion: (state) => urlGoogle(state, google.permisos, process.env.GOOGLE_REDIRECT_URI || ''),
  canjearCodigo: (codigo) => canjearGoogle(codigo, process.env.GOOGLE_REDIRECT_URI || ''),
  renovarToken: async (cuenta) => renovarGoogle(cuenta),
  leer: async (token) => {
    const cab = bearer(token);
    const cuentas = await pedirJson('https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=50', { headers: cab });
    if (cuentas.status === 401) return fallo('Google rechazó el token de acceso', { tokenVencido: true });
    if (cuentas.dato?.error?.message) return fallo(cuentas.dato.error.message);
    const propiedades = ((cuentas.dato?.accountSummaries || []) as any[])
      .flatMap(a => (a.propertySummaries || []) as any[])
      .filter(p => p?.property);
    if (!propiedades.length) return fallo('la cuenta de Google no tiene propiedades de Analytics visibles: no hay tráfico para leer');

    const propiedad = String(propiedades[0].property).replace('properties/', '');
    const rep = await pedirJson(`https://analyticsdata.googleapis.com/v1beta/properties/${propiedad}:runReport`, {
      method: 'POST', headers: cab,
      body: JSON.stringify({
        dateRanges: [{ startDate: '90daysAgo', endDate: 'today' }],
        metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'conversions' }],
      }),
    });
    if (rep.status === 401) return fallo('Google rechazó el token al leer Analytics', { tokenVencido: true });
    if (rep.dato?.error?.message) return fallo(rep.dato.error.message);
    const fila = rep.dato?.rows?.[0]?.metricValues;
    if (!fila) return fallo('Analytics no devolvió datos de los últimos 90 días');
    const metricas: MetricaReal[] = [
      { pieza: propiedades[0].displayName || 'sitio', metrica: 'sesiones', valor: Number(fila[0]?.value || 0), fuente: 'google', cuando: hoy() },
      { pieza: propiedades[0].displayName || 'sitio', metrica: 'usuarios', valor: Number(fila[1]?.value || 0), fuente: 'google', cuando: hoy() },
      { pieza: propiedades[0].displayName || 'sitio', metrica: 'conversiones', valor: Number(fila[2]?.value || 0), fuente: 'google', cuando: hoy() },
    ];

    // Google Ads sólo se puede leer con token de desarrollador (es un requisito de su API, no una
    // decisión de este conector). Si está, se lee; si no, se dice en el detalle.
    let ads: { campanas: number; gasto: number; clics: number } | null = null;
    let notaAds = 'Google Ads no se leyó: para eso la API de Google exige un token de desarrollador (GOOGLE_ADS_DEVELOPER_TOKEN).';
    if (process.env.GOOGLE_ADS_DEVELOPER_TOKEN) {
      const clientes = await pedirJson('https://googleads.googleapis.com/v17/customers:listAccessibleCustomers', {
        headers: { ...cab, 'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN },
      });
      const primerCliente = String(clientes.dato?.resourceNames?.[0] || '').replace('customers/', '');
      if (primerCliente) {
        const adsRep = await pedirJson(`https://googleads.googleapis.com/v17/customers/${primerCliente}/googleAds:search`, {
          method: 'POST',
          headers: { ...cab, 'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN, 'login-customer-id': primerCliente },
          body: JSON.stringify({ query: 'SELECT campaign.name, metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions, metrics.ctr FROM campaign WHERE segments.date DURING LAST_30_DAYS', pageSize: 50 }),
        });
        const filas = (adsRep.dato?.results || []) as any[];
        if (filas.length) {
          let gasto = 0, clics = 0;
          for (const f of filas) {
            const nombre = String(f.campaign?.name || 'campaña sin nombre').slice(0, 120);
            const g = Number(f.metrics?.costMicros || 0) / 1_000_000;
            gasto += g; clics += Number(f.metrics?.clicks || 0);
            metricas.push(
              { pieza: nombre, metrica: 'gasto', valor: Math.round(g * 100) / 100, fuente: 'google' },
              { pieza: nombre, metrica: 'clics', valor: Number(f.metrics?.clicks || 0), fuente: 'google' },
              { pieza: nombre, metrica: 'conversiones', valor: Math.round(Number(f.metrics?.conversions || 0) * 100) / 100, fuente: 'google' },
              { pieza: nombre, metrica: 'ctr', valor: Math.round(Number(f.metrics?.ctr || 0) * 10000) / 10000, fuente: 'google' },
            );
          }
          ads = { campanas: filas.length, gasto: Math.round(gasto * 100) / 100, clics };
          notaAds = `Google Ads: ${ads.campanas} campañas, $${ads.gasto} de gasto y ${ads.clics} clics en 30 días.`;
        } else {
          notaAds = 'Google Ads no devolvió campañas con actividad en los últimos 30 días.';
        }
      }
    }
    return {
      ok: true,
      detalle: `leyó el sitio ${String(propiedades[0].displayName || propiedad)} (90 días: ${Number(fila[0]?.value || 0)} sesiones, ${Number(fila[1]?.value || 0)} usuarios, ${Number(fila[2]?.value || 0)} conversiones). ${notaAds}`,
      metricas,
      datos: { propiedad: { external_id: propiedad, nombre: propiedades[0].displayName ?? '' }, ads },
    };
  },
};

// 9 · PÍXEL — las conversiones reales del sitio del negocio.
const pixel: DefinicionRed = {
  red: 'pixel',
  nombre: 'Píxel del sitio',
  rol: 'Conversiones del sitio',
  categoria: 'medición',
  env: ['PIXEL_ID', 'PIXEL_TOKEN'],
  permisos: ['lectura de eventos del píxel'],
  tipo: 'token',
  tokenDeEntorno: () => process.env.PIXEL_TOKEN || '',
  identidadDelEntorno: () => ({ external_id: process.env.PIXEL_ID || '', nombre: 'Píxel del sitio' }),
  que_aporta: 'Los eventos que de verdad ocurrieron en la página del negocio: visitas, carritos y compras.',
  como_funciona: 'Lee el píxel del negocio en el Events Manager de Meta con su token de servidor. Cuenta eventos agregados por tipo en los últimos 30 días: no identifica a nadie, no guarda datos de visitantes y no entrega demografía. Es métrica real para el backtest, no calibración.',
  urlDeAutorizacion: () => `https://www.facebook.com/events_manager2/list/dataset/${process.env.PIXEL_ID || ''}`,
  canjearCodigo: async () => ({ token: '', error: 'el píxel se conecta con su token de servidor (PIXEL_ID y PIXEL_TOKEN), no por código' }),
  leer: async (token, cuenta) => {
    const id = process.env.PIXEL_ID || cuenta.external_id || '';
    if (!id) return fallo('falta el identificador del píxel (PIXEL_ID)');
    const cab = bearer(token);
    const info = await pedirJson(`${GRAPH}/${id}?fields=name,creation_time,last_fired_time,is_unavailable`, { headers: cab });
    const err = info.dato?.error?.message;
    if (err) return fallo(err, { tokenVencido: info.status === 401 });
    const d = info.dato || {};
    const desde = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const stats = await pedirJson(`${GRAPH}/${id}/stats?aggregation=event&start_time=${encodeURIComponent(desde)}`, { headers: cab });
    if (stats.dato?.error?.message) return fallo(stats.dato.error.message, { tokenVencido: stats.status === 401 });

    // La respuesta del píxel cambia de forma según la agregación: se recorren los nodos y se juntan los
    // pares {valor, cantidad} sin depender de la forma exacta.
    const pares: { valor: string; cantidad: number }[] = [];
    const recorrer = (nodo: unknown) => {
      if (!nodo) return;
      if (Array.isArray(nodo)) { for (const n of nodo) recorrer(n); return; }
      if (typeof nodo !== 'object') return;
      const o = nodo as Record<string, unknown>;
      if (typeof o.value === 'string' && o.count !== undefined) pares.push({ valor: o.value, cantidad: Number(o.count) || 0 });
      for (const v of Object.values(o)) if (v && typeof v === 'object') recorrer(v);
    };
    recorrer(stats.dato);

    if (!pares.length) return fallo(`el píxel ${String(d.name || id)} no registró eventos en los últimos 30 días`);
    const total = pares.reduce((s, p) => s + p.cantidad, 0);
    return {
      ok: true,
      detalle: `el píxel ${String(d.name || id)} registró ${pares.length} tipos de evento y ${total} eventos en 30 días`,
      metricas: pares.slice(0, 50).map(p => ({ metrica: `eventos:${p.valor}`.slice(0, 60), valor: p.cantidad, fuente: 'pixel', cuando: hoy() })),
      datos: { pixel: { external_id: id, nombre: d.name ?? '', ultimo_disparo: d.last_fired_time ?? '' }, eventos: pares },
    };
  },
};

// 10 · YOUTUBE — la otra red que sí entrega demografía real.
const youtube: DefinicionRed = {
  red: 'youtube',
  nombre: 'YouTube',
  rol: 'Público y video largo',
  categoria: 'red social',
  env: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI', 'YOUTUBE_REDIRECT_URI'],
  permisos: ['https://www.googleapis.com/auth/youtube.readonly', 'https://www.googleapis.com/auth/yt-analytics.readonly'],
  tipo: 'oauth',
  // bundle.social cubre YouTube en su pantalla; la demografía real sigue viniendo de la app propia de
  // Google cuando exista (bundle no entrega analítica de audiencia).
  viaBundle: 'YOUTUBE',
  calibra: true,
  faltan: () => {
    const f: string[] = [];
    if (!process.env.GOOGLE_CLIENT_ID) f.push('GOOGLE_CLIENT_ID');
    if (!process.env.GOOGLE_CLIENT_SECRET) f.push('GOOGLE_CLIENT_SECRET');
    // Con GOOGLE_REDIRECT_URI alcanza; si tampoco está, se pide la propia de YouTube.
    if (!process.env.YOUTUBE_REDIRECT_URI && !process.env.GOOGLE_REDIRECT_URI) f.push('YOUTUBE_REDIRECT_URI');
    return f;
  },
  que_aporta: 'El público que de verdad ve sus videos —con su edad y su género— y cómo rinde cada video.',
  como_funciona: 'Es la API oficial del canal del propio negocio (YouTube Data API y YouTube Analytics). La demografía llega agregada por rangos de edad y género, nunca con identidades, y sólo aparece cuando el canal tiene vistas suficientes; si no las tiene, el conector lo dice y no inventa porcentajes. Autoriza con la misma cuenta de Google que la integración de Google.',
  urlDeAutorizacion: (state) => urlGoogle(state, youtube.permisos, process.env.YOUTUBE_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI || ''),
  canjearCodigo: (codigo) => canjearGoogle(codigo, process.env.YOUTUBE_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI || ''),
  renovarToken: async (cuenta) => renovarGoogle(cuenta),
  leer: async (token) => {
    const cab = bearer(token);
    const canal = await pedirJson('https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true', { headers: cab });
    if (canal.status === 401) return fallo('YouTube rechazó el token de acceso', { tokenVencido: true });
    if (canal.dato?.error?.message) return fallo(canal.dato.error.message);
    const ch = canal.dato?.items?.[0];
    if (!ch) return fallo('la cuenta de Google no tiene un canal de YouTube');
    const nombreCanal = String(ch.snippet?.title || 'canal sin nombre');

    // La demografía real: YouTube la entrega por rango de edad y género, en porcentaje de vistas.
    const demo = await pedirJson(`https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${haceDias(90)}&endDate=${hoy()}&metrics=viewerPercentage&dimensions=ageGroup,gender&sort=-viewerPercentage`, { headers: cab });
    if (demo.status === 401) return fallo('YouTube rechazó el token al leer la demografía', { tokenVencido: true });
    if (demo.dato?.error?.message) return fallo(demo.dato.error.message);
    const filas = (demo.dato?.rows || []) as unknown[][];
    const cabeceras = ((demo.dato?.columnHeaders || []) as { name?: string }[]).map(h => String(h.name || ''));
    const iEdad = cabeceras.indexOf('ageGroup'), iGenero = cabeceras.indexOf('gender'), iPorc = cabeceras.indexOf('viewerPercentage');
    const iA = iEdad >= 0 ? iEdad : 0, iG = iGenero >= 0 ? iGenero : 1, iP = iPorc >= 0 ? iPorc : 2;
    const calibracion: SegmentoPeso[] = [];
    for (const f of filas) {
      const rango = RANGOS_EDAD[String(f[iA] || '')] || String(f[iA] || '');
      const genero = GENEROS[String(f[iG] || '')] || 'sin especificar';
      const peso = aPeso(Number(f[iP] || 0) / 100);
      if (rango && peso > 0) calibracion.push({ segmento: `${rango} · ${genero}`, peso, genero });
    }

    // La métrica real por video: es contra esto que se mide el backtest.
    const porVideo = await pedirJson(`https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${haceDias(90)}&endDate=${hoy()}&metrics=views,likes,comments,shares&dimensions=video&sort=-views&maxResults=25`, { headers: cab });
    const filasVideo = (porVideo.dato?.rows || []) as unknown[][];
    const metricas: MetricaReal[] = [];
    const ids: string[] = [];
    for (const f of filasVideo.slice(0, 25)) {
      const id = String(f[0] || '');
      if (!id) continue;
      ids.push(id);
      metricas.push(
        { pieza: id, metrica: 'vistas', valor: Number(f[1] || 0), fuente: 'youtube' },
        { pieza: id, metrica: 'me_gusta', valor: Number(f[2] || 0), fuente: 'youtube' },
        { pieza: id, metrica: 'comentarios', valor: Number(f[3] || 0), fuente: 'youtube' },
        { pieza: id, metrica: 'compartidos', valor: Number(f[4] || 0), fuente: 'youtube' },
      );
    }
    // El título hace la métrica legible para el negocio; es una lectura más a la API de datos.
    if (ids.length) {
      const titulos = await pedirJson(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${ids.slice(0, 25).join(',')}`, { headers: cab });
      const mapa = new Map<string, string>(((titulos.dato?.items || []) as any[]).map(v => [String(v.id), String(v.snippet?.title || '')]));
      for (const m of metricas) if (m.pieza && mapa.get(m.pieza)) m.pieza = String(mapa.get(m.pieza)).slice(0, 120);
    }

    const base = `YouTube Analytics · viewerPercentage (90 días)`;
    if (!calibracion.length) {
      return fallo('YouTube todavía no tiene suficientes vistas para dar la demografía del canal: hasta que las tenga, la calibración sale de Instagram. Los videos que ya tienen vistas sí quedaron medidos.', {
        metricas,
        datos: { canal: { external_id: String(ch.id || ''), nombre: nombreCanal, suscriptores: Number(ch.statistics?.subscriberCount || 0) }, videos: metricas.length / 4, demografia: 'sin filas' },
      });
    }
    return {
      ok: true,
      detalle: `calibró el público con ${calibracion.length} segmentos de edad y género del canal ${nombreCanal} y midió ${ids.length} videos`,
      calibracion,
      fuente: base,
      metricas,
      datos: { canal: { external_id: String(ch.id || ''), nombre: nombreCanal, suscriptores: Number(ch.statistics?.subscriberCount || 0), vistas: Number(ch.statistics?.viewCount || 0) }, videos: ids.length },
    };
  },
};

/** Los rangos de edad de YouTube, dichos como los dice la gente. */
const RANGOS_EDAD: Record<string, string> = {
  'age13-17': '13 a 17 años',
  'age18-24': '18 a 24 años',
  'age25-34': '25 a 34 años',
  'age35-44': '35 a 44 años',
  'age45-54': '45 a 54 años',
  'age55-64': '55 a 64 años',
  'age65-': '65 años en adelante',
};

const GENEROS: Record<string, string> = { male: 'hombres', female: 'mujeres' };

// ---------------------------------- AYUDAS DE META Y GOOGLE ----------------------------------

/** La dirección de autorización de Meta, con los permisos que pida cada red. */
function urlMeta(state: string, permisos: string[]): string {
  const q = new URLSearchParams({
    client_id: process.env.META_APP_ID || '',
    redirect_uri: process.env.META_REDIRECT_URI || '',
    state,
    response_type: 'code',
    scope: permisos.join(','),
  });
  return `https://www.facebook.com/${VERSION_META}/dialog/oauth?${q.toString()}`;
}

/** La dirección de autorización de Google. `access_type=offline` es lo que devuelve el refresh_token. */
function urlGoogle(state: string, alcances: string[], redirectUri: string): string {
  const q = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: alcances.join(' '),
    state,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q.toString()}`;
}

async function canjearGoogle(codigo: string, redirectUri: string): Promise<ResultadoCanje> {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) return { token: '', error: 'falta configurar la app de Google' };
  const r = await pedirJson('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: codigo,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }).toString(),
  });
  const d = r.dato || {};
  if (!d.access_token) return { token: '', error: sinSecretos(d.error_description || d.error || r.error || 'Google no devolvió el token', process.env.GOOGLE_CLIENT_SECRET) };
  return {
    token: String(d.access_token),
    refresh_token: d.refresh_token ? String(d.refresh_token) : undefined,
    expira: d.expires_in ? new Date(Date.now() + Number(d.expires_in) * 1000).toISOString() : undefined,
    external_id: d.id_token ? 'google' : '',
  };
}

/**
 * Renueva el token de acceso de Google con el refresh_token guardado: el de Google dura una hora, así
 * que sin esto la integración dejaría de leer al rato. El refresh_token no se devuelve nunca.
 */
async function renovarGoogle(cuenta: CuentaConectada): Promise<ResultadoCanje> {
  if (!cuenta.refresh_token) return { token: '', error: 'la cuenta de Google no tiene token de renovación guardado: hay que volver a autorizar' };
  const r = await pedirJson('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      refresh_token: cuenta.refresh_token,
      grant_type: 'refresh_token',
    }).toString(),
  });
  const d = r.dato || {};
  if (!d.access_token) return { token: '', error: sinSecretos(d.error_description || d.error || 'Google no renovó el token') };
  return { token: String(d.access_token), expira: d.expires_in ? new Date(Date.now() + Number(d.expires_in) * 1000).toISOString() : undefined };
}

// ---------------------------------- BUNDLE.SOCIAL ----------------------------------

// 11 · BUNDLE.SOCIAL — la puerta para PUBLICAR sin montar la app de cada plataforma.
//
// POR QUÉ ENTRA COMO UNA RED MÁS
//   Es un agregador: cada negocio conecta sus cuentas en la pantalla de bundle.social (permiso y elección
//   de cuenta, en dos pasos) y desde ahí se publica, sin crear una app propia en Meta, TikTok ni Google.
//   Para el panel es una red normal: se ve, se conecta y se sincroniza como las demás.
//
// UN EQUIPO POR NEGOCIO (lo que hace que las cuentas sean de cada quien)
//   bundle.social guarda las cuentas conectadas dentro de un EQUIPO. Si todos los negocios usaran el mismo
//   equipo, cada cliente vería las cuentas de los demás; por eso acá cada negocio tiene el suyo: se crea
//   con `POST /team` la primera vez (lo pidió el dueño: cada usuario agrega SU cuenta) y el elegido queda
//   anotado en `cuentas_conectadas.extra` para no volver a buscarlo. El negocio del dueño es la excepción:
//   ya tiene su equipo con sus cuentas conectadas, y se reconoce porque ese equipo lo creó el correo de un
//   usuario de ese negocio (o porque lo declara BUNDLE_NEGOCIO_DUENO). Así el dueño ve lo que ya conectó.
//
// LAS REDES QUE BUNDLE CUBRE
//   Se marcan con `viaBundle` sólo las que están en su lista: INSTAGRAM, FACEBOOK, TIKTOK y YOUTUBE. Las
//   otras siete quedan sin marca a propósito —Meta Ads es pauta y bundle publica (no administra campañas),
//   WhatsApp no está en su pantalla de conexión, Google entra por YouTube pero no por Ads ni GA4, y tienda,
//   píxel y correo no aplican—: sin marca, esa fila sigue respondiendo 501 con lo que le falta.
//
// LO QUE NO HACE, DICHO DE FRENTE
//   · Su plan no incluye analítica (la API responde 403 «Analytics access is disabled for your
//     subscription tier»): sirve para publicar, no para medir. La audiencia se sigue calibrando con
//     Instagram y YouTube.
//   · La API de bundle tampoco expone, hoy, una ruta para leer la lista de cuentas conectadas: esa lista
//     se ve en su pantalla. Por eso la constancia de que una cuenta quedó conectada la guardamos NOSOTROS
//     en `cuentas_conectadas` cuando el negocio vuelve de la pantalla (`/confirmar`): no hay otra forma de
//     que la fila del panel diga «conectada».
const BUNDLE_BASE = 'https://api.bundle.social/api/v1';

/** Las redes que la pantalla de bundle.social ofrece para autorizar. El negocio elige ahí cuáles conectar. */
const REDES_DE_BUNDLE = ['INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'YOUTUBE', 'LINKEDIN', 'THREADS', 'PINTEREST'];

/** La cabecera con la que se habla con bundle.social: la clave va en `x-api-key` y nunca en la URL. */
const cabeceraBundle = (clave: string) => ({ 'x-api-key': clave, 'Content-Type': 'application/json' });

/** ¿Está cargada la clave de bundle.social? Es lo que habilita cualquier camino por bundle. */
export function bundleConfigurado(): boolean {
  return !!process.env.BUNDLE_API_KEY;
}

/** ¿Esta red se conecta por bundle.social? `bundle` es la puerta misma; las demás, por `viaBundle`. */
export function cubiertaPorBundle(def: DefinicionRed): boolean {
  return def.red === 'bundle' || !!def.viaBundle;
}

/** Las plataformas de bundle que hay que autorizar para conectar esta red. */
export function plataformasDeBundle(def: DefinicionRed): string[] {
  return def.viaBundle ? [def.viaBundle] : REDES_DE_BUNDLE;
}

/** Un equipo de bundle.social, con quién lo creó y cuándo (sirve para saber de quién es). */
type EquipoBundle = { id: string; nombre: string; creadoPor: string; creadoEl: string };

/** Los equipos que ya existen en la organización de bundle.social. */
async function equiposDeBundle(clave: string): Promise<{ equipos?: EquipoBundle[]; error?: string }> {
  const r = await pedirJson(`${BUNDLE_BASE}/team`, { headers: cabeceraBundle(clave) });
  if (r.status === 401 || r.status === 403) {
    return { error: 'bundle.social rechazó la clave del servidor (BUNDLE_API_KEY): revise que siga vigente' };
  }
  const crudos = (r.dato?.items ?? r.dato?.data ?? []) as any[];
  const equipos: EquipoBundle[] = (Array.isArray(crudos) ? crudos : [])
    .filter(t => !!t?.id)
    .map(t => ({
      id: String(t.id),
      nombre: String(t.name || '').trim(),
      creadoPor: String(t.createdBy?.email || '').trim().toLowerCase(),
      creadoEl: String(t.createdAt || ''),
    }));
  if (!equipos.length) {
    const motivo = r.dato?.message || r.dato?.error || r.error || 'bundle.social no devolvió ningún equipo';
    return { error: sinSecretos(motivo, clave) || 'bundle.social no devolvió ningún equipo' };
  }
  return { equipos };
}

/** El primer equipo de la organización: respaldo para las cuentas que se conectaron sin equipo anotado. */
async function primerEquipo(clave: string): Promise<{ id?: string; nombre?: string; error?: string }> {
  const r = await equiposDeBundle(clave);
  const primero = r.equipos?.[0];
  if (!primero) return { error: r.error || 'bundle.social no devolvió ningún equipo' };
  return { id: primero.id, nombre: primero.nombre };
}

/** El equipo del negocio ya anotado en la base (lo deja `/empezar` y lo confirma `/confirmar`). */
export async function equipoAnotado(base: BaseDeDatos, businessId: string): Promise<string> {
  const r = await base.query(
    `SELECT extra->>'team_id' AS team_id FROM cuentas_conectadas
      WHERE business_id = $1 AND extra ? 'team_id' ORDER BY actualizado DESC LIMIT 1`, [businessId]);
  return String(r.rows?.[0]?.team_id || '').trim();
}

/** El nombre con el que se crea el equipo del negocio (bundle exige 3 letras como mínimo). */
function nombreDeEquipo(nombreNegocio: string, businessId: string): string {
  const nombre = String(nombreNegocio || '').trim().replace(/\s+/g, ' ');
  if (nombre.length >= 3) return nombre.slice(0, 80);
  return `Negocio ${businessId.slice(0, 8)}`;
}

/** Crea el equipo del negocio en bundle.social: es lo que separa las cuentas de cada cliente. */
async function crearEquipoDeBundle(clave: string, nombre: string): Promise<{ id?: string; nombre?: string; error?: string }> {
  const r = await pedirJson(`${BUNDLE_BASE}/team`, {
    method: 'POST', headers: cabeceraBundle(clave), body: JSON.stringify({ name: nombre }),
  });
  const d = (r.dato?.team ?? r.dato?.data ?? r.dato ?? {}) as { id?: string; name?: string };
  const id = String(d?.id || '').trim();
  if (!id) {
    const motivo = r.dato?.message || r.dato?.error || r.error
      || `bundle.social no creó el equipo del negocio (respuesta ${r.status || 'sin respuesta'})`;
    return { error: sinSecretos(motivo, clave) || 'bundle.social no creó el equipo del negocio' };
  }
  return { id, nombre: String(d.name || nombre) };
}

/**
 * EL EQUIPO DEL NEGOCIO — de dónde salen las cuentas que ese negocio conecta.
 * El orden, y el porqué de cada paso:
 *   1. Lo que ya quedó anotado en `cuentas_conectadas.extra` para ESTE negocio: no se vuelve a buscar.
 *      (Si el equipo anotado ya no existe en bundle, se sigue de largo y se resuelve otra vez.)
 *   2. El negocio del dueño, que ya tiene su equipo con cuentas conectadas. Se reconoce de dos maneras:
 *      porque lo declara `BUNDLE_NEGOCIO_DUENO` (con `BUNDLE_TEAM_DUENO` o, si no, el más antiguo), o
 *      porque el correo de un usuario de este negocio es el que creó ese equipo en bundle.social. Nunca
 *      se toma un equipo que otro negocio ya tenga anotado, por más que el correo coincida.
 *   3. Un equipo nuevo para el negocio (`POST /team`): es lo que hace que cada cliente tenga lo suyo.
 *   4. Si no se pudo crear: se usa el primer equipo SÓLO si la organización tiene uno solo (hoy, el del
 *      dueño). Con más de uno no se adivina: repartir equipos a ciegas sería mostrarle a un negocio las
 *      cuentas de otro, y eso es peor que fallar. FALTA la creación por negocio cuando se cae acá.
 */
export async function equipoDelNegocio(clave: string, businessId: string, nombreNegocio: string, base: BaseDeDatos)
  : Promise<{ id?: string; nombre?: string; origen?: string; error?: string }> {
  const r = await equiposDeBundle(clave);
  if (!r.equipos) return { error: r.error || 'bundle.social no devolvió ningún equipo' };
  const equipos = r.equipos;

  // 1 · lo anotado para este negocio
  const idAnotado = await equipoAnotado(base, businessId);
  if (idAnotado) {
    const mio = equipos.find(t => t.id === idAnotado);
    if (mio) return { id: mio.id, nombre: mio.nombre, origen: 'equipo ya anotado para este negocio' };
  }

  // 2a · el equipo del dueño, declarado por variable de entorno
  const equipoDueno = String(process.env.BUNDLE_TEAM_DUENO || '').trim();
  const negocioDueno = String(process.env.BUNDLE_NEGOCIO_DUENO || '').trim();
  if (negocioDueno && negocioDueno === businessId) {
    const pin = equipoDueno ? equipos.find(t => t.id === equipoDueno) : equipos[0];
    if (pin) return { id: pin.id, nombre: pin.nombre, origen: 'equipo del dueño (BUNDLE_TEAM_DUENO)' };
  }

  // 2b · el equipo del dueño, deducido: el más antiguo de la organización que haya creado el correo de
  //      alguien de este negocio y que NINGÚN OTRO negocio tenga anotado. La exclusión es la que lo hace
  //      confiable: los equipos que crea este servidor quedan a nombre del usuario de la clave de bundle
  //      (el dueño), así que sin excluir los ya anotados el dueño podría caer en el equipo de un cliente.
  const correos = await base.query('SELECT lower(email) AS email FROM users WHERE business_id = $1', [businessId]);
  const delNegocio = new Set<string>((correos.rows || []).map((f: any) => String(f.email || '').trim().toLowerCase()));
  const ajenas = await base.query(
    `SELECT DISTINCT extra->>'team_id' AS team_id FROM cuentas_conectadas
      WHERE business_id <> $1 AND extra ? 'team_id'`, [businessId]);
  const deOtros = new Set<string>((ajenas.rows || []).map((f: any) => String(f.team_id || '')));
  const suyos = equipos
    .filter(t => !deOtros.has(t.id) && !!t.creadoPor && delNegocio.has(t.creadoPor))
    .sort((a, b) => a.creadoEl.localeCompare(b.creadoEl));
  if (suyos.length) return { id: suyos[0].id, nombre: suyos[0].nombre, origen: 'equipo ya existente de este negocio' };

  // 3 · un equipo nuevo para este negocio
  const nuevo = await crearEquipoDeBundle(clave, nombreDeEquipo(nombreNegocio, businessId));
  if (nuevo.id) return { id: nuevo.id, nombre: nuevo.nombre || '', origen: 'equipo nuevo para este negocio' };

  // 4 · no se pudo crear
  if (equipos.length === 1) {
    return { id: equipos[0].id, nombre: equipos[0].nombre, origen: 'primer equipo de la organización (FALTA la creación por negocio)' };
  }
  return { error: nuevo.error || 'bundle.social no devolvió ningún equipo para este negocio' };
}

/**
 * La dirección a la que vuelve la pantalla de bundle.social al terminar de conectar.
 * Es `BUNDLE_REDIRECT_URL` y, si no está declarada, la dirección del panel que el servidor ya conoce
 * (la de CORS). Sin ninguna de las dos no se manda vuelta: la pantalla cierra sola y no se inventa una
 * dirección que no existe.
 */
function vueltaAlPanel(): string {
  const declarada = String(process.env.BUNDLE_REDIRECT_URL || '').trim();
  if (declarada) return declarada;
  return String(process.env.CORS_ORIGENES || '').split(',')
    .map(s => s.trim())
    .find(s => s !== '*' && /^https?:\/\/[a-z0-9.-]+/i.test(s)) || '';
}

/** El enlace de conexión de bundle.social para un negocio (su equipo) y unas plataformas. */
export async function enlaceDeBundle(clave: string, equipoId: string, plataformas: string[])
  : Promise<{ url?: string; error?: string }> {
  const cuerpo: Record<string, unknown> = {
    teamId: equipoId,
    socialAccountTypes: plataformas.length ? plataformas : REDES_DE_BUNDLE,
    language: 'es',
    // La pantalla queda válida 48 horas (2880 minutos): se puede cerrar y volver sin perderla.
    expiresIn: 2880,
    showModalOnConnectSuccess: true,
    userName: 'Sinkroo',
  };
  const vuelta = vueltaAlPanel();
  if (vuelta) cuerpo.redirectUrl = vuelta;

  const portal = await pedirJson(`${BUNDLE_BASE}/social-account/create-portal-link`, {
    method: 'POST', headers: cabeceraBundle(clave), body: JSON.stringify(cuerpo),
  });
  const url = String(portal.dato?.url || '').trim();
  if (!url) {
    const motivo = portal.dato?.message || portal.dato?.error || portal.error
      || `bundle.social no devolvió la pantalla de conexión (respuesta ${portal.status || 'sin respuesta'})`;
    return { error: sinSecretos(motivo, clave) || 'bundle.social no devolvió la pantalla de conexión' };
  }
  // Esta url se devuelve TAL CUAL: lleva el token de la sesión de conexión y el navegador lo necesita.
  // Por eso NO pasa por `sinSecretos` (lo tacharía) y por eso no se escribe en ningún registro.
  return { url };
}

/**
 * Anota en `cuentas_conectadas` (fila `red='bundle'`) cuál es el equipo del negocio: es el lugar donde
 * queda escrito de una vez por todas dónde están sus cuentas.
 * Mientras la conexión no vuelva confirmada la fila queda en `estado='iniciada'`, y el listado sólo cuenta
 * como conectada la fila que de verdad lo está: así el panel no muestra conectada una conexión a medias.
 */
export async function anotarEquipoDeBundle(base: BaseDeDatos, businessId: string, equipo: { id?: string; nombre?: string }): Promise<void> {
  if (!equipo.id) return;
  await base.query(
    `INSERT INTO cuentas_conectadas (business_id, red, external_id, nombre, token, permisos, estado, extra, actualizado)
     VALUES ($1, 'bundle', '', 'bundle.social', '', $4::text[], 'iniciada',
             jsonb_build_object('team_id', $2::text, 'equipo_nombre', $3::text, 'via', 'bundle.social'), now())
     ON CONFLICT (business_id, red) DO UPDATE SET
       extra = cuentas_conectadas.extra || EXCLUDED.extra,
       actualizado = now()`,
    [businessId, equipo.id, equipo.nombre || '', ['publicar por bundle.social']]);
}

const bundle: DefinicionRed = {
  red: 'bundle',
  nombre: 'bundle.social',
  rol: 'Publicar en sus redes sin montar cada API',
  categoria: 'publicación',
  env: ['BUNDLE_API_KEY'],
  permisos: ['publicar en las cuentas que usted conecte dentro de bundle.social'],
  tipo: 'oauth',
  que_aporta: 'Publica en las cuentas que usted conecte —Instagram, Facebook, TikTok, YouTube, LinkedIn, Threads y Pinterest— sin crear una app ni pedir permisos de desarrollador en cada plataforma.',
  como_funciona: 'La conexión se hace en la pantalla de bundle.social: ahí usted autoriza el permiso y elige la cuenta, en dos pasos, y nosotros sólo abrimos esa pantalla para su negocio. Es el camino para publicar cuando todavía no cuenta con app propia de Meta, TikTok o Google. Lo que no trae, y por eso se dice: su plan de bundle no incluye analítica, así que esta conexión sirve para publicar y no para medir la audiencia.',
  // La dirección de verdad la entrega bundle en el momento (lleva un token de un solo uso), así que el
  // camino real es `prepararConexion`. Esto queda como respaldo por si alguna vez se pide sin ella.
  urlDeAutorizacion: () => 'https://bundle.social/connect',
  prepararConexion: async (_state, ctx) => {
    const clave = process.env.BUNDLE_API_KEY || '';
    if (!clave) throw new Error('falta la clave de bundle.social (BUNDLE_API_KEY)');
    // El equipo del negocio: ahí van SUS cuentas, no las de otro cliente ni las del dueño.
    const equipo = await equipoDelNegocio(clave, ctx.businessId, ctx.nombreNegocio, ctx.base);
    if (equipo.error || !equipo.id) throw new Error(equipo.error || 'bundle.social no devolvió ningún equipo');
    // El equipo queda anotado: la fila dice 'iniciada' hasta que la conexión vuelva confirmada.
    await anotarEquipoDeBundle(ctx.base, ctx.businessId, equipo);
    const enlace = await enlaceDeBundle(clave, equipo.id, REDES_DE_BUNDLE);
    if (!enlace.url) throw new Error(enlace.error || 'bundle.social no devolvió la pantalla de conexión');
    return enlace.url;
  },
  canjearCodigo: async () => ({ token: '', error: 'bundle.social conecta las cuentas en su propia pantalla: no hay código que canjear' }),
  leer: async (_token, cuenta) => {
    const clave = process.env.BUNDLE_API_KEY || '';
    if (!clave) return fallo('falta la clave de bundle.social (BUNDLE_API_KEY)');
    // El equipo del negocio es el que quedó anotado al conectar; sin anotación, el primero de la
    // organización (como cuando esta integración era una sola cuenta).
    let equipoId = String(cuenta.extra?.team_id || '').trim();
    let nombreEquipo = String(cuenta.extra?.equipo_nombre || '').trim();
    if (!equipoId) {
      const primero = await primerEquipo(clave);
      if (primero.error || !primero.id) return fallo(primero.error || 'bundle.social no devolvió ningún equipo');
      equipoId = primero.id;
      nombreEquipo = primero.nombre || '';
    }

    // Lo único que esta cuenta deja leer es el listado de publicaciones hechas por esta vía. La analítica
    // contesta 403 para su plan, así que no hay números que traer y no se traen.
    const publicaciones = await pedirJson(`${BUNDLE_BASE}/post?teamId=${encodeURIComponent(equipoId)}&limit=25`, { headers: cabeceraBundle(clave) });
    if (publicaciones.status === 401 || publicaciones.status === 403) {
      return fallo('bundle.social rechazó la clave del servidor (BUNDLE_API_KEY) al leer las publicaciones');
    }
    if (publicaciones.status >= 400) {
      return fallo(publicaciones.dato?.message || publicaciones.dato?.error
        || `bundle.social no devolvió las publicaciones (respuesta ${publicaciones.status})`);
    }
    const items = (publicaciones.dato?.items || []) as unknown[];
    const total = Number(publicaciones.dato?.total ?? (Array.isArray(items) ? items.length : 0));
    const mensaje = `bundle.social quedó conectado para publicar${nombreEquipo ? ` en el equipo «${nombreEquipo}»` : ''}. `
      + 'Su plan no incluye analítica de audiencia (la API responde 403), así que todavía no hay números para medir.';
    // La lectura SÍ salió: devuelve ok:true con lo que haya, aunque sean 0 publicaciones. Antes volvía
    // ok:false y una sincronización correcta se veía en el panel como un fallo.
    return {
      ok: true,
      detalle: total
        ? `${mensaje} Van ${total} publicaciones hechas por esta vía, contadas en bundle.social.`
        : `${mensaje} Todavía no hay publicaciones hechas por esta vía.`,
      datos: {
        equipo: { external_id: equipoId, nombre: nombreEquipo },
        publicaciones: total,
        analitica: 'no incluida en el plan de bundle.social (la API responde 403)',
        nota: 'bundle.social no expone una ruta para leer la lista de cuentas conectadas: esa lista se ve en su pantalla, y la constancia de la conexión la guarda Sinkroo cuando el negocio vuelve (/confirmar).',
      },
    };
  },
};

// ---------------------------------- EL REGISTRO ----------------------------------

/**
 * Las once redes, en el orden en que el panel las muestra: primero lo que trae el público (que es lo
 * que calibra a los 500), después la pauta y las conversaciones, y al final los canales de medición y
 * la puerta para publicar (bundle.social).
 */
export const REDES: Record<string, DefinicionRed> = {
  instagram,
  facebook,
  meta_ads: metaAds,
  whatsapp,
  tiktok,
  youtube,
  google,
  tienda,
  pixel,
  email,
  bundle,
};

/** Las redes en orden, para recorrerlas sin depender del orden de las claves. */
export const LISTA_REDES: DefinicionRed[] = [instagram, facebook, metaAds, whatsapp, tiktok, youtube, google, tienda, pixel, email, bundle];

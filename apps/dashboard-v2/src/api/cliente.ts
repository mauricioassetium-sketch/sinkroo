// =============================================================================================
// EL CLIENTE DE LA API — la única puerta por la que el panel habla con el back.
//
// CÓMO SE ENCIENDE Y CÓMO SE APAGA
// El panel tiene que seguir funcionando con la demo, así que la API se enciende por fuera del código:
//   · `?api=https://api.sinkroo.com` en la dirección (y queda guardado para las próximas visitas), o
//   · la clave `sinkroo-api` en el navegador.
// Sin nada de eso, `hayApi()` es false y el panel trabaja con los datos de demostración, como hasta hoy.
// Así se prueba el back sin romperle el panel a nadie.
//
// NADA DE ESTO GUARDA SECRETOS: lo único que vive en el navegador es el token de la sesión.
// =============================================================================================

const CLAVE_TOKEN = 'sinkroo-token';
const CLAVE_API = 'sinkroo-api';

/** De dónde sale la dirección del back: la dirección, lo guardado, o nada (modo demostración). */
export function baseApi(): string {
  try {
    const host = window.location.hostname;

    // EL DOMINIO PROPIO ES LO ÚNICO QUE NO ACEPTA `?api=`, y es justo donde no hace falta: ahí el back
    // vive en el mismo origen (el servidor web pasa /api/ al motor), así que nadie tiene que decirle la
    // dirección. Y es el único sitio donde hay cuentas de clientes de verdad con la sesión abierta.
    //
    //   Antes se aceptaba en cualquier parte: un enlace como
    //   `https://panel.sinkroo.com/?api=https://sitio-del-atacante` quedaba GUARDADO en el navegador y,
    //   desde ahí, todas las peticiones del panel —con el token de la sesión en la cabecera— salían hacia
    //   ese sitio. Bastaba con que la persona abriera el enlace una vez.
    const esDominioPropio = host === 'sinkroo.com' || host.endsWith('.sinkroo.com');
    if (esDominioPropio) {
      // Lo que haya quedado guardado de antes se borra: si alguien alcanzó a dejar una dirección puesta,
      // deja de tener efecto.
      window.localStorage.removeItem(CLAVE_API);
      return window.location.origin;
    }

    // Fuera del dominio propio, el `?api=` SIGUE SIRVIENDO para probar el panel contra un back: en las
    // pruebas locales, en la maqueta publicada y en el túnel. Ahí no hay cuentas de clientes a las que
    // robarles la sesión.
    const deUrl = new URLSearchParams(window.location.search).get('api');
    if (deUrl) { window.localStorage.setItem(CLAVE_API, deUrl); return deUrl.replace(/\/$/, ''); }

    const guardada = window.localStorage.getItem(CLAVE_API);
    if (guardada) return guardada.replace(/\/$/, '');
  } catch { /* sin navegador */ }
  return '';
}

export const hayApi = () => baseApi() !== '';
export const token = () => { try { return window.localStorage.getItem(CLAVE_TOKEN) || ''; } catch { return ''; } };
export const guardarToken = (t: string) => {
  try { t ? window.localStorage.setItem(CLAVE_TOKEN, t) : window.localStorage.removeItem(CLAVE_TOKEN); } catch { /* nada */ }
};

export type Usuario = {
  id: string; email: string; nombre: string; business_id: string | null;
  /** Si la dirección de la cuenta ya quedó confirmada. Con el back nuevo siempre viene; si no viene, es «todavía no». */
  correo_verificado?: boolean;
};

/** El error que devuelve el back, con su código y su cuerpo: lo que la pantalla necesita para explicar el porqué
 *  (por ejemplo, cuántos intentos de PIN quedan cuando la clave es incorrecta). */
export type ErrorApi = Error & { codigo?: string; estado?: number; cuerpo?: Record<string, unknown> };

async function pedir<T>(ruta: string, opciones: { metodo?: string; cuerpo?: unknown } = {}): Promise<T> {
  const base = baseApi();
  if (!base) throw new Error('sin_api');
  const r = await fetch(base + ruta, {
    method: opciones.metodo || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
    },
    ...(opciones.cuerpo !== undefined ? { body: JSON.stringify(opciones.cuerpo) } : {}),
  });
  const texto = await r.text();
  const datos = texto ? JSON.parse(texto) : {};
  if (!r.ok) {
    const e = new Error(datos?.error || `error ${r.status}`) as ErrorApi;
    e.codigo = datos?.codigo; e.estado = r.status; e.cuerpo = datos;
    throw e;
  }
  return datos as T;
}

// ---------------- Cuentas ----------------

/**
 * Lo que el back responde sobre el correo de bienvenida al crear una cuenta: si SALIÓ, a dónde iba, qué
 * falta cuando no salió y el motivo. Es la única verdad sobre ese correo: si `enviado` es false, la
 * pantalla no puede decir «le enviamos un correo».
 */
export type AvisoDeCorreo = {
  enviado: boolean; para?: string; motivo?: string | null; falta?: string[]; detalle?: string;
};

export async function crearCuenta(nombre: string, email: string, clave: string) {
  const r = await pedir<{ token: string; usuario: Usuario; correo?: AvisoDeCorreo }>(
    '/api/auth/registro', { metodo: 'POST', cuerpo: { nombre, email, clave } },
  );
  guardarToken(r.token);
  return { usuario: r.usuario, correo: r.correo ?? null };
}

export async function entrar(email: string, clave: string) {
  const r = await pedir<{ token: string; usuario: Usuario }>('/api/auth/entrar', { metodo: 'POST', cuerpo: { email, clave } });
  guardarToken(r.token);
  return r.usuario;
}

/** Quién soy: se llama al abrir el panel para ver si la sesión sigue viva. */
export async function quienSoy(): Promise<Usuario | null> {
  if (!hayApi() || !token()) return null;
  try {
    const r = await pedir<{ usuario: Usuario }>('/api/auth/yo');
    return r.usuario;
  } catch (e) {
    // La sesión sólo se cae cuando el back dice que NO sirve (401/403). Un 429 (demasiadas peticiones),
    // un 500 o un corte de red no son la sesión: borrar el token ahí dejaba a la persona afuera por un
    // tropiezo del servidor, y volver a entrar costaba escribir la clave otra vez.
    const estado = (e as ErrorApi)?.estado;
    if (estado === 401 || estado === 403) guardarToken('');
    return null;
  }
}

export async function salir() {
  try { await pedir('/api/auth/salir', { metodo: 'POST' }); } catch { /* se cierra igual */ }
  guardarToken('');
}

// ---------------- Seguridad de la cuenta (el PIN y el correo) ----------------
// Las dos cosas que la pantalla de Cuenta muestra y que el back responde en una sola consulta: si el
// negocio tiene PIN, si su correo está confirmado, si el servidor tiene el correo configurado y, si
// está frenado por intentos fallidos, hasta cuándo.

export type EstadoSeguridad = {
  tiene_pin: boolean;
  correo_verificado: boolean;
  intentos_restantes: number;
  intentos_maximos?: number;
  /** ¿El PIN está frenado por intentos fallidos? Con cuántos minutos le quedan. */
  bloqueado?: boolean;
  bloqueado_hasta: string | null;
  minutos_restantes?: number;
  /** El contrato corto (el que se acordó primero): el correo en plano. */
  correo_configurado?: boolean;
  falta?: string[];
  /** El back de hoy: el correo viene anidado, con quién lo manda y qué falta para los enlaces. */
  correo?: {
    configurado: boolean;
    proveedor?: string | null;
    remitente?: string;
    falta?: string[];
    /** Lo que falta para que los ENLACES de los correos apunten al panel (APP_URL). */
    falta_enlaces?: string[];
    /** El correo de la cuenta: a dónde salen los avisos y los enlaces. */
    cuenta?: string;
  };
  /** La invitación del back cuando la cuenta todavía no tiene PIN. */
  aviso?: string | null;
};

export const leerSeguridad = () => pedir<EstadoSeguridad>('/api/seguridad/estado');

/** El correo del servidor, en plano: sirve con el contrato corto y con el back que anida `correo`. */
export const correoConfigurado = (e: EstadoSeguridad | null) =>
  !!(e && (e.correo?.configurado ?? e.correo_configurado));
/** Qué falta para poder mandar correo: las variables de envío, vengan en plano o anidadas. */
export const faltaDeCorreo = (e: EstadoSeguridad | null): string[] =>
  e ? (e.correo?.falta?.length ? e.correo.falta : (e.falta ?? [])) : [];
/** Qué falta para que los enlaces de los correos apunten al panel. */
export const faltaEnlaces = (e: EstadoSeguridad | null): string[] => e?.correo?.falta_enlaces ?? [];
/** El correo de la cuenta, si el back lo dice. */
export const correoDeLaCuenta = (e: EstadoSeguridad | null): string => e?.correo?.cuenta ?? '';

/** Crea el PIN del negocio (sin `pinActual`) o lo cambia (con el actual, que es lo que lo protege). */
export const guardarPin = (pin: string, pinActual?: string) =>
  pedir<{ ok: boolean }>('/api/seguridad/pin', {
    metodo: 'POST',
    cuerpo: pinActual ? { pin, pin_actual: pinActual } : { pin },
  });

/** Verifica el PIN contra el back antes de reintentar una acción sensible. */
export const verificarPin = (pin: string) =>
  pedir<{ ok: boolean; valido?: boolean; tiene_pin?: boolean; intentos_restantes: number; aviso?: string }>(
    '/api/seguridad/pin/verificar', { metodo: 'POST', cuerpo: { pin } },
  );

/** El paso de vuelta del correo de bienvenida: el enlace trae el token y esto confirma la dirección. */
export const verificarCorreo = (tokenDeLaDireccion: string) =>
  pedir<{ ok: boolean; correo_verificado: boolean; detalle?: string }>('/api/auth/verificar', {
    metodo: 'POST',
    cuerpo: { token: tokenDeLaDireccion },
  });

/**
 * PEDIR OTRO CORREO DE CONFIRMACIÓN. La ruta existe en el back y pide sesión. Ojo con una cosa: responde
 * 202 cuando el enlace quedó creado pero el correo NO salió (el envío todavía no está configurado), así
 * que `ok` no alcanza: la pantalla lee `enviado` y `detalle` antes de decir que le mandó algo.
 */
export const reenviarVerificacion = () =>
  pedir<{ ok: boolean; enviado?: boolean; para?: string; motivo?: string | null; falta?: string[]; detalle?: string }>(
    '/api/auth/verificar/reenviar', { metodo: 'POST', cuerpo: {} },
  );

// ---------------- Onboarding ----------------

export type OnboardingRemoto = { datos: Record<string, unknown>; hechos: number[]; arrancado: boolean };

export const leerOnboarding = () => pedir<OnboardingRemoto>('/api/onboarding');

/** Guarda lo que se escribió: el back mezcla los campos y no pisa lo que no se mandó. */
export const guardarOnboarding = (cuerpo: { datos?: Record<string, unknown>; hechos?: number[]; arrancado?: boolean }) =>
  pedir<OnboardingRemoto>('/api/onboarding', { metodo: 'PUT', cuerpo });

export const arrancarMotor = (pin?: string) => pedir<{ ok: boolean }>('/api/onboarding/arrancar', {
  metodo: 'POST',
  ...(pin ? { cuerpo: { pin } } : {}),
});

// ---------------- El código de entrada ----------------
// Sinkroo se entrega por invitación: el negocio recibe un código de quien le instaló el sistema y el
// asistente no avanza hasta que lo valide. El código se manda una vez y NO se guarda en el navegador:
// después de validarlo, lo único que el panel recuerda es si esa cuenta ya quedó registrada.

export type EstadoEntrada = {
  /** ¿Esta cuenta ya validó su código de entrada? Es lo único que deja avanzar el asistente. */
  registrado: boolean;
  /** Lo que el back quiera decirle al negocio cuando el código quedó aceptado. Sin nota, null. */
  nota: string | null;
  /** Cuándo se registró, si el back lo dice. */
  usado_at?: string | null;
};

export const leerCodigoDeEntrada = () => pedir<EstadoEntrada>('/api/entrada/codigo');

/**
 * Manda el código de entrada. `ya` viene en true cuando esa cuenta ya lo tenía registrado (volver a
 * mandarlo no es un error). Los 400 traen `codigo`: `codigo_vacio`, `codigo_invalido` o
 * `codigo_ya_usado` — es lo que la pantalla usa para explicar el porqué sin tecnicismos.
 */
export const reclamarCodigoDeEntrada = (codigo: string) =>
  pedir<{ ok: boolean; ya: boolean; nota: string | null }>('/api/entrada/codigo', {
    metodo: 'POST', cuerpo: { codigo },
  });

// ---------------- Los archivos del negocio ----------------
// Lo que el cliente sube en el paso 3 no puede quedarse en la memoria del navegador: vive en la carpeta
// del servidor, y es de ahí de donde el motor lo lee. Estas tres rutas son las únicas que lo tocan.

export type ArchivoRemoto = {
  id: string;
  nombre: string;
  tipo: string;
  /** El peso en bytes, tal como lo devuelve el back. */
  peso: number;
  created_at: string;
};

export const listarArchivos = () => pedir<{ archivos: ArchivoRemoto[] }>('/api/archivos');

/**
 * Sube UN archivo. Va por multipart, así que no pasa por `pedir` (ese manda JSON): la cabecera
 * Content-Type la pone el navegador con el límite del formulario, y el archivo va en el campo `archivo`.
 * Devuelve el archivo tal como quedó guardado (con su id y su peso reales).
 */
export async function subirArchivo(archivo: File): Promise<ArchivoRemoto> {
  const base = baseApi();
  if (!base) throw new Error('sin_api');
  const cuerpo = new FormData();
  cuerpo.append('archivo', archivo);
  const r = await fetch(base + '/api/archivos', {
    method: 'POST',
    headers: token() ? { Authorization: `Bearer ${token()}` } : {},
    body: cuerpo,
  });
  const texto = await r.text();
  let datos: Record<string, any> = {};
  try { datos = texto ? JSON.parse(texto) : {}; } catch { datos = {}; }
  if (!r.ok) {
    const e = new Error(datos?.error || `error ${r.status}`) as ErrorApi;
    e.codigo = datos?.codigo; e.estado = r.status; e.cuerpo = datos;
    throw e;
  }
  return datos.archivo as ArchivoRemoto;
}

/** Saca un archivo de la carpeta del servidor. Se puede volver a subir: no se pierde nada del negocio. */
export const borrarArchivo = (id: string) =>
  pedir<{ ok: boolean }>(`/api/archivos/${encodeURIComponent(id)}`, { metodo: 'DELETE' });

// ---------------- Integraciones ----------------

/**
 * El paso de vuelta: cuando el negocio autoriza en el proveedor, el navegador vuelve al redirect_uri con
 * `?code=...&state=...`. Esto canjea ese código por el token (del lado del servidor) y deja la cuenta
 * guardada. Sin este paso, autorizar no conectaba nada. La ruta es por red, así el mismo flujo sirve
 * para cualquiera: la red se recuerda al salir y, si no hay nada anotado, se asume Instagram (lo que
 * ya funcionaba sigue funcionando igual).
 */
export const volverDeMeta = (codigo: string, state: string, red = 'instagram', external_id?: string, nombre?: string) =>
  pedir<{ ok: boolean }>(`/api/integraciones/${encodeURIComponent(red)}/volver`, {
    metodo: 'POST',
    cuerpo: { codigo, state, external_id, nombre },
  });

/**
 * EL PASO DE VUELTA DEL PROVEEDOR QUE CONECTA EN SU PROPIA PANTALLA (bundle.social): no devuelve
 * ningún `code` que canjear —la cuenta ya quedó conectada allá—, así que lo único que falta es dejar
 * constancia de que el negocio volvió. Después de esto, la próxima lectura de las integraciones trae
 * esa red con su cuenta. Se llama sólo con la marca de éxito de la vuelta: con un error, no.
 */
export const confirmarRed = (red: string) =>
  pedir<{ ok: boolean; red?: string }>(`/api/integraciones/${encodeURIComponent(red)}/confirmar`, {
    metodo: 'POST',
    cuerpo: { ok: true },
  });

const CLAVE_RED = 'sinkroo-red-conectando';
/** La red a la que hay que volver: la que el panel anotó cuando abrió la autorización del proveedor. */
export const recordarRed = (red: string) => { try { window.localStorage.setItem(CLAVE_RED, red); } catch { /* sin almacén */ } };
const redAnotada = () => { try { return window.localStorage.getItem(CLAVE_RED) || ''; } catch { return ''; } };
/** El canje ya volvió: se olvida la red para que una recarga no vuelva a usarla. */
export const olvidarRed = () => { try { window.localStorage.removeItem(CLAVE_RED); } catch { /* sin almacén */ } };

/**
 * LAS MARCAS DE VUELTA DEL PROVEEDOR QUE CONECTA EN SU PANTALLA (bundle.social). No trae `code`: vuelve
 * con un parámetro por plataforma, y son dos, distintos:
 *   · Éxito — `instagram-callback`, `facebook-callback`, `tiktok-callback`, `youtube-callback`…
 *   · Error — `instagram-not-enough-accounts`, `facebook-not-enough-pages`, `*-not-enough-permissions`,
 *     o un `error` / `error_description` con su mensaje.
 * El `code` de siempre (Meta, TikTok, Google con app propia) sigue leyéndose igual: esto se suma.
 */
const QUE_DICE_QUE_NO = new Set(['false', '0', 'no', 'error', 'denied']);
const ES_EXITO = (k: string) => /-callback$/.test(k) || ['success', 'connected', 'conectado', 'ok'].includes(k);
const ES_FALLO = (k: string) => /not-enough|(^|-)error|(^|-)fallo/.test(k);

/** La marca de éxito de la vuelta, o '' si no vino ninguna. */
const marcaDeExito = (q: URLSearchParams) => [...q.keys()].find(k =>
  ES_EXITO(k) && !QUE_DICE_QUE_NO.has((q.get(k) || '').trim().toLowerCase())) || '';

/** La marca de error de la vuelta, o '' si no vino ninguna. El error siempre gana: no se confirma nada. */
const marcaDeFallo = (q: URLSearchParams) => {
  const claves = [...q.keys()];
  const directa = claves.find(k => ES_FALLO(k) || ['error', 'error_description'].includes(k));
  if (directa) return directa;
  // Un `-callback` con un valor que dice que no también es un error del proveedor.
  return claves.find(k => ES_EXITO(k) && QUE_DICE_QUE_NO.has((q.get(k) || '').trim().toLowerCase())) || '';
};

/** El nombre de la red tal como la nombra la marca (`instagram-callback` → `instagram`). Sin marca, ''. */
const redDeLaMarca = (marca: string) => (/-callback$|-not-enough/.test(marca)
  ? marca.replace(/-callback$/, '').replace(/-not-enough.*$/, '').replace(/-(error|fallo)$/, '')
  : '');

/**
 * LA VUELTA DEL CORREO DE BIENVENIDA. El enlace que el negocio recibe lo devuelve a esta misma dirección
 * con el token de la confirmación: `?token=…`. Es una vuelta distinta de la del proveedor (no trae código
 * ni marca de red) y por eso se lee aparte. Devuelve '' si la dirección no trae ninguna.
 */
export function tokenDeVerificacion(): string {
  try {
    const q = new URLSearchParams(window.location.search);
    return (q.get('token') || q.get('verificar') || '').trim();
  } catch { return ''; }
}

/** Los parámetros que deja el proveedor al volver, con la red a la que corresponden. */
export function codigoDeMeta(): { codigo: string; state: string; red: string; exito: string; fallo: string } | null {
  try {
    const q = new URLSearchParams(window.location.search);
    const codigo = q.get('code') || '';
    const state = q.get('state') || '';
    const exito = marcaDeExito(q);
    const fallo = marcaDeFallo(q);
    // Sin código, sin marca de éxito y sin error no hay vuelta que atender.
    if (!codigo && !exito && !fallo) return null;
    // La red: la que trae la dirección, la que nombra la marca, o la que el panel anotó al salir. Con
    // el `code` de siempre, la regla es exactamente la de antes (nada de esto la cambia).
    const red = q.get('red') || (codigo ? '' : redDeLaMarca(exito || fallo)) || redAnotada() || 'instagram';
    return { codigo, state, red, exito, fallo };
  } catch { return null; }
}

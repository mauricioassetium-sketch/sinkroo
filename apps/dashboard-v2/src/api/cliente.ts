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

export type Usuario = { id: string; email: string; nombre: string; business_id: string | null };

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
    const e = new Error(datos?.error || `error ${r.status}`) as Error & { codigo?: string; estado?: number };
    e.codigo = datos?.codigo; e.estado = r.status;
    throw e;
  }
  return datos as T;
}

// ---------------- Cuentas ----------------

export async function crearCuenta(nombre: string, email: string, clave: string) {
  const r = await pedir<{ token: string; usuario: Usuario }>('/api/auth/registro', { metodo: 'POST', cuerpo: { nombre, email, clave } });
  guardarToken(r.token);
  return r.usuario;
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
  } catch { guardarToken(''); return null; }
}

export async function salir() {
  try { await pedir('/api/auth/salir', { metodo: 'POST' }); } catch { /* se cierra igual */ }
  guardarToken('');
}

// ---------------- Onboarding ----------------

export type OnboardingRemoto = { datos: Record<string, unknown>; hechos: number[]; arrancado: boolean };

export const leerOnboarding = () => pedir<OnboardingRemoto>('/api/onboarding');

/** Guarda lo que se escribió: el back mezcla los campos y no pisa lo que no se mandó. */
export const guardarOnboarding = (cuerpo: { datos?: Record<string, unknown>; hechos?: number[]; arrancado?: boolean }) =>
  pedir<OnboardingRemoto>('/api/onboarding', { metodo: 'PUT', cuerpo });

export const arrancarMotor = () => pedir<{ ok: boolean }>('/api/onboarding/arrancar', { metodo: 'POST' });

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

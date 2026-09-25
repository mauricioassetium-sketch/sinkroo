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

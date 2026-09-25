import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { execute, query } from '../lib/db.js';

// =============================================================================================
// LAS VERIFICACIONES — los enlaces de un solo uso que llegan por correo.
// =============================================================================================
//
// PARA QUÉ
//   · tipo 'correo' → confirmar que el correo de la cuenta es del negocio (el que manda la bienvenida).
//   · tipo 'pin'    → restablecer el PIN de seguridad cuando se olvidó. No hay pregunta secreta: la prueba
//     de que es usted es el enlace que sólo puede llegar a su correo.
//
// CÓMO SE GUARDA EL TOKEN (y por qué así)
//   En la base NO queda nada que sirva para abrir el enlace: se guarda la huella con sal (scrypt), igual
//   que una clave. Como el token que se busca puede ser cualquiera, al lado va «busqueda», que es el
//   sha256 del token: sirve para encontrar la fila sin recorrer la tabla, y no le quita seguridad a la
//   huella porque un token de 32 bytes al azar (256 bits) no se puede adivinar.
//
// LAS REGLAS DEL ENLACE
//   · Vence a las 24 horas.
//   · Sirve UNA sola vez: queda anotado el uso y el segundo intento se rechaza con su motivo.
//   · Un enlace nuevo cancela el anterior del mismo negocio y del mismo tipo: si alguien pide otro
//     enlace, el viejo deja de servir.
//   · El motivo por el que no sirve se dice claro (venció / ya se usó / no existe), porque quien lo lee es
//     el dueño de la cuenta, no un atacante: el token ya lo tenía en la mano.
// =============================================================================================

export type TipoVerificacion = 'correo' | 'pin';

export const HORAS_VENCIMIENTO = 24;

/** 32 bytes al azar: es el token que viaja en el enlace. */
export const tokenDeVerificacion = () => randomBytes(32).toString('hex');

const buscador = (token: string) => createHash('sha256').update(token).digest('hex');

/** La huella con sal del token, igual que una clave: en la base no queda el token. */
function huellaConSal(token: string): string {
  const sal = randomBytes(16).toString('hex');
  return `${sal}:${scryptSync(token, sal, 64).toString('hex')}`;
}

const coincide = (token: string, guardada: string): boolean => {
  if (!guardada.includes(':')) return false;
  const [sal, huella] = guardada.split(':');
  const calculada = scryptSync(token, sal, 64);
  const esperada = Buffer.from(huella, 'hex');
  return calculada.length === esperada.length && timingSafeEqual(calculada, esperada);
};

/**
 * Crea el enlace y devuelve el token EN CLARO (una sola vez: es el que se manda en el correo).
 * Antes de crearlo borra los pendientes del mismo negocio y del mismo tipo: un enlace vigente a la vez.
 */
export async function crearVerificacion(businessId: string, tipo: TipoVerificacion): Promise<string> {
  const token = tokenDeVerificacion();
  await execute('DELETE FROM verificaciones WHERE business_id = $1 AND tipo = $2 AND usos = 0', [businessId, tipo]);
  await execute(
    `INSERT INTO verificaciones (business_id, tipo, token_hash, busqueda, expira, usos)
     VALUES ($1, $2, $3, $4, now() + ($5 || ' hours')::interval, 0)`,
    [businessId, tipo, huellaConSal(token), buscador(token), String(HORAS_VENCIMIENTO)],
  );
  return token;
}

export type ResultadoVerificacion = {
  ok: boolean;
  codigo?: 'token_falta' | 'token_invalido' | 'token_vencido' | 'token_usado';
  motivo?: string;
  business_id?: string;
  verificacion_id?: string;
};

/**
 * Revisa un token SIN gastarlo: dice si sirve y de qué negocio es. Es lo que usa la pantalla del enlace
 * para mostrar el formulario antes de que el negocio escriba nada.
 */
export async function revisarVerificacion(token: string, tipo: TipoVerificacion): Promise<ResultadoVerificacion> {
  const limpio = String(token || '').trim();
  if (!limpio) return { ok: false, codigo: 'token_falta', motivo: 'falta el token del enlace' };

  const filas = await query<{ id: string; business_id: string; token_hash: string; expira: Date; usos: number }>(
    `SELECT id, business_id, token_hash, expira, usos FROM verificaciones
      WHERE tipo = $1 AND busqueda = $2 ORDER BY created_at DESC LIMIT 1`,
    [tipo, buscador(limpio)],
  );
  const fila = filas[0];
  if (!fila || !coincide(limpio, fila.token_hash)) {
    return {
      ok: false, codigo: 'token_invalido',
      motivo: 'ese enlace no corresponde a ninguna verificación: puede que sea de otro tipo de enlace o de otra cuenta',
    };
  }
  if (Number(fila.usos) > 0) {
    return { ok: false, codigo: 'token_usado', motivo: 'ese enlace ya se usó: los enlaces sirven una sola vez, pida uno nuevo', business_id: fila.business_id };
  }
  const expira = new Date(fila.expira);
  if (expira.getTime() <= Date.now()) {
    return {
      ok: false, codigo: 'token_vencido',
      motivo: `ese enlace venció el ${expira.toISOString().slice(0, 16).replace('T', ' ')} (los enlaces duran ${HORAS_VENCIMIENTO} horas): pida uno nuevo`,
      business_id: fila.business_id,
    };
  }
  return { ok: true, business_id: fila.business_id, verificacion_id: fila.id };
}

/**
 * Comprueba un token y lo gasta: devuelve el negocio al que pertenece y deja anotado el uso.
 * El uso queda anotado en una sola sentencia condicionada (`usos = 0`): dos peticiones al mismo tiempo
 * no pueden gastar el mismo enlace dos veces.
 * No recibe el negocio a propósito: quien abre el enlace es el dueño de la cuenta y el enlace ya dice
 * de quién es. Todo lo demás (a quién le corresponde el token, para qué tipo es) se resuelve acá.
 */
export async function usarVerificacion(token: string, tipo: TipoVerificacion): Promise<ResultadoVerificacion> {
  const revisado = await revisarVerificacion(token, tipo);
  if (!revisado.ok || !revisado.verificacion_id) return revisado;
  const gastadas = await query<{ id: string }>(
    'UPDATE verificaciones SET usos = usos + 1 WHERE id = $1 AND usos = 0 RETURNING id',
    [revisado.verificacion_id],
  );
  if (!gastadas.length) {
    return { ok: false, codigo: 'token_usado', motivo: 'ese enlace ya se usó: los enlaces sirven una sola vez, pida uno nuevo', business_id: revisado.business_id };
  }
  return { ok: true, business_id: revisado.business_id, verificacion_id: revisado.verificacion_id };
}

/** Los datos del negocio que hacen falta en las pantallas de los enlaces: nombre y correo de la cuenta. */
export async function negocioYCorreo(businessId: string): Promise<{ negocio: string; correo: string }> {
  const filas = await query<{ name: string; email: string | null }>(
    `SELECT b.name, (SELECT u.email FROM users u WHERE u.business_id = b.id ORDER BY u.created_at LIMIT 1) AS email
       FROM businesses b WHERE b.id = $1`,
    [businessId],
  );
  return { negocio: String(filas[0]?.name || '').trim() || 'su negocio', correo: String(filas[0]?.email || '').trim() };
}

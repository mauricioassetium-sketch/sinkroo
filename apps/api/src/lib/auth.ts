import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { query } from './db.js';

// =============================================================================================
// CUENTAS: claves y sesiones.
//
// Reglas que manda el dueño y que este archivo hace cumplir:
//   · UN CORREO ES UNA CUENTA. El correo va en minúsculas y con UNIQUE en la base: no se puede registrar
//     dos veces ni con dos tipos distintos.
//   · La clave nunca se guarda: se guarda su huella (scrypt con sal por usuario).
//   · La sesión es un token al azar de 32 bytes que vive en la tabla `sessions`, con vencimiento.
// =============================================================================================

const DIAS_SESION = 30;

/** La huella de la clave: `sal:huella`. Sin la sal no se puede comparar en el próximo ingreso. */
export function huellaDeClave(clave: string): string {
  const sal = randomBytes(16).toString('hex');
  const huella = scryptSync(clave, sal, 64).toString('hex');
  return `${sal}:${huella}`;
}

/** Compara la clave con su huella sin filtrar tiempos (timing-safe). */
export function claveCorrecta(clave: string, guardada: string | null): boolean {
  if (!guardada || !guardada.includes(':')) return false;
  const [sal, huella] = guardada.split(':');
  const calculada = scryptSync(clave, sal, 64);
  const esperada = Buffer.from(huella, 'hex');
  return calculada.length === esperada.length && timingSafeEqual(calculada, esperada);
}

export const tokenNuevo = () => randomBytes(32).toString('hex');

/** El correo siempre en minúsculas: es la clave de la cuenta. */
export const correoNormal = (email: string) => String(email || '').trim().toLowerCase();

export async function abrirSesion(userId: string): Promise<string> {
  const token = tokenNuevo();
  await query(
    `INSERT INTO sessions (token, user_id, expira_at) VALUES ($1, $2, now() + ($3 || ' days')::interval)`,
    [token, userId, String(DIAS_SESION)],
  );
  return token;
}

export type UsuarioSesion = { id: string; email: string; nombre: string; business_id: string | null };

/** El usuario de la petición, o null si no hay token válido. */
export async function usuarioDe(req: FastifyRequest): Promise<UsuarioSesion | null> {
  const cabecera = String(req.headers.authorization || '');
  if (!cabecera.startsWith('Bearer ')) return null;
  const token = cabecera.slice(7).trim();
  if (!token) return null;
  const filas = await query<UsuarioSesion>(
    `SELECT u.id, u.email, u.nombre, u.business_id
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token = $1 AND s.expira_at > now()`,
    [token],
  );
  return filas[0] ?? null;
}

/** Corta la petición si no hay sesión. Devuelve el usuario para no volver a consultarlo. */
export async function exigirSesion(req: FastifyRequest, reply: FastifyReply): Promise<UsuarioSesion | null> {
  const u = await usuarioDe(req);
  if (!u) {
    reply.status(401).send({ error: 'necesita entrar para hacer esto', codigo: 'sin_sesion' });
    return null;
  }
  return u;
}

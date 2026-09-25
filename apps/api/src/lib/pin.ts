import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { query } from './db.js';
import { pasarElFreno } from './seguridad.js';

// =============================================================================================
// EL PIN DE SEGURIDAD — la llave corta de las acciones delicadas.
// =============================================================================================
//
// QUÉ ES Y PARA QUÉ SIRVE
//   Son 6 dígitos que elige el negocio. No reemplaza a la clave de la cuenta: la acompaña. La clave protege
//   la ENTRADA; el PIN protege lo que no tiene vuelta atrás o cuesta plata — desconectar una cuenta
//   conectada, cambiar el plan, borrar datos y arrancar una evaluación que gasta créditos.
//
// LAS CUATRO REGLAS QUE CUMPLE ESTE ARCHIVO
//   1. El PIN NUNCA se guarda: se guarda su huella con sal (scrypt), igual que la clave de la cuenta.
//   2. Un PIN no se puede probar a la loca: a los 5 intentos fallidos queda bloqueado 15 minutos. El
//      bloqueo vive en la BASE (`pines.bloqueado_hasta`), no en la memoria del proceso: así no se
//      reinicia reiniciando el servidor, y vale igual con varias instancias.
//   3. Cada intento queda en `intentos_pin`, con su hora: si algo pasa, se puede auditar.
//   4. Un negocio que todavía no tiene PIN no queda por fuera del producto: la acción sigue, y la
//      respuesta le avisa que puede crear el PIN (`pin_requerido: false`). Bloquear a quien nunca lo
//      creó sería romperle el uso para pedirle algo que todavía no le pidió nadie.
// =============================================================================================

export const INTENTOS_MAXIMOS = 5;
export const MINUTOS_BLOQUEO = 15;

/** Los PIN que cualquiera prueba primero. Se rechazan al crearlo: un PIN adivinable no protege nada. */
const FACILES = new Set([
  '000000', '111111', '222222', '333333', '444444', '555555', '666666', '777777', '888888', '999999',
  '123456', '234567', '345678', '456789', '654321', '987654', '112233', '121212', '131313', '010101',
  '123123', '102030', '246810', '135790', '666777', '777888', '000123', '123000',
]);

/** ¿Es un PIN de 6 dígitos? */
export const pinValido = (pin: unknown) => /^\d{6}$/.test(String(pin ?? '').trim());

/** Por qué un PIN no sirve, dicho de frente. `null` cuando sirve. */
export function porqueNoSirve(pin: unknown): string | null {
  const texto = String(pin ?? '').trim();
  if (!texto) return 'falta el PIN de 6 dígitos';
  if (!/^\d+$/.test(texto)) return 'el PIN sólo lleva números, sin espacios ni letras';
  if (texto.length !== 6) return `el PIN tiene que ser de 6 dígitos y este trae ${texto.length}`;
  if (FACILES.has(texto)) return 'ese PIN es de los primeros que cualquiera prueba (una serie o un número repetido): elija otro';
  if (texto === texto.split('').reverse().join('')) return 'ese PIN se lee igual al derecho y al revés: elija otro que no sea un capicúa';
  return null;
}

/** La huella del PIN: «sal:huella», con scrypt. Sin la sal no se puede comparar en el próximo intento. */
export function huellaDePin(pin: string): string {
  const sal = randomBytes(16).toString('hex');
  const huella = scryptSync(String(pin).trim(), sal, 64).toString('hex');
  return `${sal}:${huella}`;
}

/** Compara el PIN con su huella sin filtrar tiempos (timing-safe). */
export function pinCorrecto(pin: string, guardada: string | null | undefined): boolean {
  if (!guardada || !guardada.includes(':')) return false;
  const [sal, huella] = guardada.split(':');
  const calculada = scryptSync(String(pin).trim(), sal, 64);
  const esperada = Buffer.from(huella, 'hex');
  return calculada.length === esperada.length && timingSafeEqual(calculada, esperada);
}

export type EstadoPin = {
  tiene_pin: boolean;
  correo_verificado: boolean;
  intentos_fallidos: number;
  intentos_restantes: number;
  intentos_maximos: number;
  bloqueado: boolean;
  bloqueado_hasta: string | null;
  minutos_restantes: number;
  creado: string | null;
  actualizado: string | null;
};

/**
 * El estado del PIN del negocio, ya resuelto en palabras: ¿tiene PIN?, ¿está bloqueado?, ¿cuántos
 * intentos le quedan? Si el bloqueo ya venció, acá mismo se levanta y el contador vuelve a cero.
 */
export async function estadoDePin(businessId: string): Promise<EstadoPin> {
  const filas = await query<{
    pin_hash: string | null; intentos_fallidos: number | null; bloqueado_hasta: Date | null;
    creado: Date | null; actualizado: Date | null; correo_verificado: boolean;
  }>(
    `SELECT p.pin_hash, p.intentos_fallidos, p.bloqueado_hasta, p.creado, p.actualizado, b.correo_verificado
       FROM businesses b LEFT JOIN pines p ON p.business_id = b.id
      WHERE b.id = $1`,
    [businessId],
  );
  const f = filas[0];
  const tiene = !!f?.pin_hash;
  let fallidos = Number(f?.intentos_fallidos ?? 0);
  let bloqueadoHasta = f?.bloqueado_hasta ? new Date(f.bloqueado_hasta) : null;

  // El bloqueo vencido se levanta al leerlo: es la única forma de que a los 15 minutos vuelva a aceptar
  // sin depender de un proceso que pase limpiando.
  if (bloqueadoHasta && bloqueadoHasta.getTime() <= Date.now()) {
    await query('UPDATE pines SET intentos_fallidos = 0, bloqueado_hasta = NULL, actualizado = now() WHERE business_id = $1', [businessId]);
    fallidos = 0;
    bloqueadoHasta = null;
  }
  const bloqueado = !!bloqueadoHasta;
  const minutos = bloqueadoHasta ? Math.max(1, Math.ceil((bloqueadoHasta.getTime() - Date.now()) / 60_000)) : 0;
  return {
    tiene_pin: tiene,
    correo_verificado: !!f?.correo_verificado,
    intentos_fallidos: fallidos,
    intentos_restantes: bloqueado ? 0 : Math.max(0, INTENTOS_MAXIMOS - fallidos),
    intentos_maximos: INTENTOS_MAXIMOS,
    bloqueado,
    bloqueado_hasta: bloqueadoHasta ? bloqueadoHasta.toISOString() : null,
    minutos_restantes: minutos,
    creado: f?.creado ? new Date(f.creado).toISOString() : null,
    actualizado: f?.actualizado ? new Date(f.actualizado).toISOString() : null,
  };
}

/** Deja el intento en la auditoría. Nunca tumba la petición: el intento ya pasó. */
export async function registrarIntento(businessId: string, ok: boolean): Promise<void> {
  await query('INSERT INTO intentos_pin (business_id, ok) VALUES ($1, $2)', [businessId, ok]);
}

/**
 * Anota un intento fallido y, si llega al tope, deja el PIN bloqueado por 15 minutos.
 * El conteo y el bloqueo se resuelven en una sola sentencia: no hay dos procesos que puedan quedar
 * con la cuenta a medias entre «contar» y «bloquear».
 */
export async function anotarFallo(businessId: string): Promise<{ intentos_fallidos: number; bloqueado_hasta: string | null }> {
  const filas = await query<{ intentos_fallidos: number; bloqueado_hasta: Date | null }>(
    `UPDATE pines
        SET intentos_fallidos = intentos_fallidos + 1,
            bloqueado_hasta = CASE WHEN intentos_fallidos + 1 >= $2 THEN now() + ($3 || ' minutes')::interval ELSE bloqueado_hasta END,
            actualizado = now()
      WHERE business_id = $1
      RETURNING intentos_fallidos, bloqueado_hasta`,
    [businessId, INTENTOS_MAXIMOS, String(MINUTOS_BLOQUEO)],
  );
  const f = filas[0];
  return {
    intentos_fallidos: Number(f?.intentos_fallidos ?? 0),
    bloqueado_hasta: f?.bloqueado_hasta ? new Date(f.bloqueado_hasta).toISOString() : null,
  };
}

/** El intento salió bien: se limpia el contador (y un bloqueo que hubiera quedado de antes). */
export async function limpiarFallos(businessId: string): Promise<void> {
  await query('UPDATE pines SET intentos_fallidos = 0, bloqueado_hasta = NULL, actualizado = now() WHERE business_id = $1', [businessId]);
}

/** Crea o reemplaza el PIN del negocio. El PIN en claro no sale de esta función. */
export async function guardarPin(businessId: string, pin: string): Promise<void> {
  await query(
    `INSERT INTO pines (business_id, pin_hash, intentos_fallidos, bloqueado_hasta)
     VALUES ($1, $2, 0, NULL)
     ON CONFLICT (business_id) DO UPDATE SET
       pin_hash = EXCLUDED.pin_hash,
       intentos_fallidos = 0,
       bloqueado_hasta = NULL,
       actualizado = now()`,
    [businessId, huellaDePin(pin)],
  );
}

export type ResultadoPin = {
  /** true = la acción puede seguir. Si es false, la respuesta ya salió desde acá. */
  permite: boolean;
  /** Si el negocio todavía no tiene PIN: la acción sigue y la respuesta lo avisa. */
  pin_requerido?: boolean;
  aviso?: string;
  estado?: EstadoPin;
};

/** El texto de la invitación a crear el PIN (cuando el negocio todavía no lo tiene). */
export const AVISO_SIN_PIN = 'esta cuenta todavía no tiene PIN de seguridad: la acción se hizo igual, pero puede crear su PIN de 6 dígitos en Seguridad para que estas acciones queden protegidas';

/**
 * LA COMPROBACIÓN REUTILIZABLE — la llaman las rutas que gastan créditos o tocan algo sin vuelta atrás.
 * Devuelve `permite: true` y deja pasar cuando el negocio todavía no tiene PIN (con el aviso para la
 * respuesta); corta la petición —y responde— cuando el PIN falta, está mal o está bloqueado.
 */
export async function exigirPin(
  _req: FastifyRequest,
  reply: FastifyReply,
  businessId: string,
  pinDelCuerpo: unknown,
): Promise<ResultadoPin> {
  const estado = await estadoDePin(businessId);

  if (!estado.tiene_pin) return { permite: true, pin_requerido: false, aviso: AVISO_SIN_PIN, estado };

  if (estado.bloqueado) {
    reply.status(429).send({
      error: 'el PIN de seguridad está bloqueado por intentos fallidos',
      codigo: 'pin_bloqueado',
      bloqueado_hasta: estado.bloqueado_hasta,
      minutos_restantes: estado.minutos_restantes,
      detalle: `vuelva a intentarlo en ${estado.minutos_restantes} minuto${estado.minutos_restantes === 1 ? '' : 's'}, o restablezca el PIN con el enlace que le llega al correo`,
    });
    return { permite: false, pin_requerido: true, estado };
  }

  const pin = String(pinDelCuerpo ?? '').trim();
  if (!pin) {
    reply.status(403).send({
      error: 'esta acción pide el PIN de seguridad',
      codigo: 'pin_requerido',
      pin_requerido: true,
      detalle: 'mande el PIN de 6 dígitos en el cuerpo de la petición, en el campo «pin»',
    });
    return { permite: false, pin_requerido: true, estado };
  }

  // El freno de las rutas de entrada también cuenta acá: además del bloqueo por intentos, hay un tope de
  // intentos por negocio en una ventana corta, para que nadie pruebe PIN a la loca desde muchos lados.
  const freno = pasarElFreno(`pin:${businessId}`, 30, 5 * 60_000);
  if (!freno.pasa) {
    reply.status(429).send({
      error: 'demasiados intentos de PIN seguidos', codigo: 'frenado',
      detalle: 'espere unos minutos y vuelva a probar',
    });
    return { permite: false, pin_requerido: true, estado };
  }

  const filas = await query<{ pin_hash: string }>('SELECT pin_hash FROM pines WHERE business_id = $1', [businessId]);
  if (!pinCorrecto(pin, filas[0]?.pin_hash)) {
    await registrarIntento(businessId, false);
    const fallo = await anotarFallo(businessId);
    if (fallo.bloqueado_hasta) {
      reply.status(429).send({
        error: 'el PIN no es correcto y se acabaron los intentos',
        codigo: 'pin_bloqueado',
        bloqueado_hasta: fallo.bloqueado_hasta,
        minutos_restantes: MINUTOS_BLOQUEO,
        intentos_restantes: 0,
        detalle: `el PIN queda bloqueado ${MINUTOS_BLOQUEO} minutos: vuelva a intentarlo en ${MINUTOS_BLOQUEO} minutos o restablezca el PIN con el enlace que le llega al correo`,
      });
      return { permite: false, pin_requerido: true, estado: await estadoDePin(businessId) };
    }
    reply.status(401).send({
      error: 'el PIN de seguridad no es correcto',
      codigo: 'pin_malo',
      intentos_restantes: Math.max(0, INTENTOS_MAXIMOS - fallo.intentos_fallidos),
      detalle: `le quedan ${Math.max(0, INTENTOS_MAXIMOS - fallo.intentos_fallidos)} intento${INTENTOS_MAXIMOS - fallo.intentos_fallidos === 1 ? '' : 's'} antes de que el PIN quede bloqueado ${MINUTOS_BLOQUEO} minutos`,
    });
    return { permite: false, pin_requerido: true };
  }

  await registrarIntento(businessId, true);
  await limpiarFallos(businessId);
  return { permite: true, pin_requerido: true, estado: await estadoDePin(businessId) };
}

/**
 * Pega el aviso del PIN en la respuesta de la acción. Es lo que hace que la misma ruta sirva para los dos
 * casos: con PIN (queda constancia de que se pidió y se comprobó) y sin PIN (se dice que no hay y que se
 * puede crear).
 */
export function conAvisoDePin<T extends Record<string, unknown>>(cuerpo: T, pin: ResultadoPin): T & Record<string, unknown> {
  if (!pin.permite) return cuerpo;
  if (pin.pin_requerido === false) return { ...cuerpo, pin_requerido: false, pin_aviso: pin.aviso };
  return { ...cuerpo, pin_requerido: true, pin_verificado: true };
}

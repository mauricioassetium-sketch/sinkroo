import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

// =============================================================================================
// LOS TOKENS GUARDADOS, CIFRADOS EN LA BASE
// =============================================================================================
//
// POR QUÉ
//   Los tokens de Instagram, Google, TikTok y demás se guardaban EN TEXTO PLANO en
//   `cuentas_conectadas`. Quien mire esa tabla —un respaldo que se copia a otro lado, un `psql` de más,
//   una captura de pantalla— se lleva llaves que dan acceso a las cuentas de los clientes, sin necesidad
//   de la clave de nadie. Cifrados con una clave que vive fuera de la base, el mismo volcado no sirve.
//
// CÓMO SE COMPORTA
//   · Con `DATOS_CLAVE` puesta: lo que se guarda sale cifrado (AES-256-GCM) con el prefijo `enc:v1:`.
//   · Sin `DATOS_CLAVE`: se guarda como antes (texto plano) y queda el aviso en el registro. Así un
//     entorno de pruebas sin la variable sigue funcionando y nada se rompe por un olvido.
//   · Lo que ya estaba en texto plano se sigue leyendo igual (se reconoce porque NO tiene el prefijo),
//     así que no hay que migrar nada: se cifra lo que se vuelva a escribir.

const PREFIJO = 'enc:v1:';

const clave = (): Buffer | null => {
  const secreto = String(process.env.DATOS_CLAVE ?? '').trim();
  if (!secreto) return null;
  return createHash('sha256').update(secreto, 'utf8').digest();
};

/** ¿Este valor ya lo ciframos nosotros? */
export const estaCifrado = (valor: unknown): boolean => String(valor ?? '').startsWith(PREFIJO);

/**
 * Cifra un secreto para guardarlo. Un valor vacío queda vacío (no hay secreto que proteger) y, sin
 * `DATOS_CLAVE`, se devuelve tal cual.
 */
export function cifrar(valor: unknown): string {
  const texto = String(valor ?? '');
  if (!texto || estaCifrado(texto)) return texto;
  const k = clave();
  if (!k) return texto;
  const iv = randomBytes(12);
  const cifrador = createCipheriv('aes-256-gcm', k, iv);
  const datos = Buffer.concat([cifrador.update(texto, 'utf8'), cifrador.final()]);
  return PREFIJO + Buffer.concat([iv, cifrador.getAuthTag(), datos]).toString('base64');
}

/**
 * Abre un secreto guardado. Si estaba en texto plano (de antes) se devuelve igual. Si está cifrado y no
 * hay clave, se lanza a propósito: mejor fallar fuerte que devolver basura como si fuera un token bueno.
 */
export function descifrar(valor: unknown): string {
  const guardado = String(valor ?? '');
  if (!estaCifrado(guardado)) return guardado;
  const k = clave();
  if (!k) throw new Error('el dato está cifrado y falta DATOS_CLAVE en el entorno del servidor');
  const bruto = Buffer.from(guardado.slice(PREFIJO.length), 'base64');
  const descifrador = createDecipheriv('aes-256-gcm', k, bruto.subarray(0, 12));
  descifrador.setAuthTag(bruto.subarray(12, 28));
  return Buffer.concat([descifrador.update(bruto.subarray(28)), descifrador.final()]).toString('utf8');
}

/** Avisa UNA vez, en el arranque, que los secretos van sin cifrar. */
let avisado = false;
export function avisarSiNoHayClave(log?: { warn: (o: unknown) => void }): void {
  if (avisado || clave()) return;
  avisado = true;
  const detalle = 'DATOS_CLAVE no está configurada: los tokens de las cuentas conectadas se guardan SIN CIFRAR. Configure DATOS_CLAVE para que un volcado de la base no entregue las cuentas de los clientes.';
  if (log) log.warn({ seguridad: true, detalle });
  else console.warn(detalle);
}

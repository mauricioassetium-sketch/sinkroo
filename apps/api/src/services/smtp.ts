import { connect, type Socket } from 'node:net';
import { connect as conectarTls, type TLSSocket } from 'node:tls';
import { randomBytes } from 'node:crypto';
import { sinSecretos } from '../integrations/redes.js';

// =============================================================================================
// SMTP — el envío de correo por un servidor propio, sin dependencias.
// =============================================================================================
//
// POR QUÉ ESTÁ ESCRITO A MANO
//   El envío del producto tiene dos caminos: la API de Resend (una llamada HTTP) o un SMTP propio.
//   Para el SMTP no se trajo una librería: son cinco comandos (EHLO, AUTH, MAIL, RCPT, DATA) y acá
//   quedan a la vista, sin una dependencia más que cargar y actualizar. Lo que sí hace falta queda
//   hecho y dicho: TLS directo (puerto 465) o STARTTLS, autenticación, acentos en el asunto y en el
//   cuerpo (en base64, que es lo que manda el estándar), y un tope de tiempo para que un servidor de
//   correo que no responde no deje la petición colgada.
//
// REGLAS QUE NO SE ROMPEN
//   1. Nada de decir que salió si no salió: cualquier fallo vuelve como `ok: false` con su motivo.
//   2. La clave del servidor de correo NUNCA aparece en un mensaje de error: todo texto que sale de
//      acá pasa por `sinSecretos`.
//   3. El cuerpo va en base64: así los acentos viajan enteros y ninguna línea puede empezar por punto
//      (que en SMTP significa «fin del mensaje»).
// =============================================================================================

export type CartaSmtp = {
  host: string;
  puerto: number;
  /** TLS desde el primer byte (el 465 de siempre). */
  seguro: boolean;
  /** Sube a TLS después del saludo (el 587 de siempre). */
  starttls: boolean;
  usuario: string;
  clave: string;
  /** Remitente: puede venir como «Nombre <correo@dominio>» o sólo el correo. */
  de: string;
  para: string;
  asunto: string;
  texto: string;
  html?: string;
  /** Tope de tiempo de toda la conversación. */
  ms?: number;
};

type Canal = Socket | TLSSocket;

type Respuesta = { codigo: number; texto: string };

/**
 * La conversación con el servidor de correo: se pide una respuesta y se espera a que la mande.
 * Los mensajes de SMTP pueden venir en varias líneas (el saludo del EHLO viene así): una respuesta
 * termina en la línea que trae un espacio después del código («250 ...»), no en la que trae guion.
 */
class Dialogo {
  private buffer = '';
  private lineas: string[] = [];
  private esperando: { resolver: (r: Respuesta) => void; rechazar: (e: Error) => void } | null = null;
  private guardadas: Respuesta[] = [];
  private roto: Error | null = null;

  constructor(private canal: Canal) {
    this.escuchar(canal);
  }

  /** Los tres avisos que pueden llegar del canal: datos, error y cierre. */
  private escuchar(canal: Canal) {
    canal.on('data', (d: Buffer) => this.recibir(d.toString('utf8')));
    canal.on('error', (e: Error) => this.romper(new Error(e.message || 'el servidor de correo cortó la conexión')));
    canal.on('close', () => this.romper(new Error('el servidor de correo cerró la conexión')));
    canal.on('timeout', () => this.romper(new Error('el servidor de correo no respondió a tiempo')));
  }

  private romper(e: Error) {
    this.roto = e;
    if (this.esperando) { const p = this.esperando; this.esperando = null; p.rechazar(e); }
  }

  private recibir(crudo: string) {
    this.buffer += crudo;
    for (;;) {
      const salto = /\r?\n/.exec(this.buffer);
      if (!salto) break;
      const linea = this.buffer.slice(0, salto.index);
      this.buffer = this.buffer.slice(salto.index + salto[0].length);
      this.lineas.push(linea);
      if (/^\d{3} /.test(linea) || /^\d{3}$/.test(linea)) {
        const listas = this.lineas;
        this.lineas = [];
        this.entregar({ codigo: Number(linea.slice(0, 3)), texto: listas.join('\n') });
      }
    }
  }

  private entregar(r: Respuesta) {
    if (this.esperando) { const p = this.esperando; this.esperando = null; p.resolver(r); }
    else this.guardadas.push(r);
  }

  /** Escribe un comando (si hay) y devuelve la próxima respuesta del servidor. */
  async pedir(comando?: string): Promise<Respuesta> {
    if (comando !== undefined) this.escribir(comando);
    const guardada = this.guardadas.shift();
    if (guardada) return guardada;
    if (this.roto) throw this.roto;
    return new Promise<Respuesta>((resolver, rechazar) => { this.esperando = { resolver, rechazar }; });
  }

  /** El cuerpo del mensaje: no espera respuesta propia, va pegado al DATA. */
  escribir(texto: string) {
    if (this.canal.destroyed) throw new Error('el servidor de correo cerró la conexión');
    this.canal.write(texto.endsWith('\r\n') ? texto : `${texto}\r\n`);
  }

  /** Cambia el canal por uno cifrado (STARTTLS): el dialogo viejo deja de escuchar UNA sola vez. */
  cambiarCanal(nuevo: Canal) {
    this.canal.removeAllListeners('data');
    this.canal.removeAllListeners('error');
    this.canal.removeAllListeners('close');
    this.canal.removeAllListeners('timeout');
    this.canal = nuevo;
    this.buffer = '';
    this.lineas = [];
    this.roto = null;
    this.escuchar(nuevo);
  }

  cerrar() {
    this.canal.removeAllListeners('data');
    this.canal.removeAllListeners('error');
    this.canal.removeAllListeners('close');
    this.canal.removeAllListeners('timeout');
    this.canal.destroy();
  }
}

/** El correo pelado: de «Nombre <correo@dominio>» saca «correo@dominio». */
export const soloCorreo = (t: string) => {
  const dentro = /<([^>]+)>/.exec(String(t || ''));
  return (dentro ? dentro[1] : String(t || '')).trim();
};

/** El nombre visible del remitente, si lo trae. */
const nombreVisible = (t: string) => {
  const dentro = /^(.*)<[^>]+>\s*$/.exec(String(t || ''));
  return dentro ? dentro[1].trim().replace(/^"|"$/g, '') : '';
};

/** Base64 partido en líneas de 76: es lo que pide el estándar para un cuerpo de correo. */
const enBase64 = (texto: string) =>
  (Buffer.from(texto, 'utf8').toString('base64').match(/.{1,76}/g) || []).join('\r\n');

/** Un texto que va en una cabecera (asunto, nombre del remitente) con acentos va codificado. */
const cabeceraTexto = (texto: string) =>
  /^[\x20-\x7e]*$/.test(texto) ? texto : `=?UTF-8?B?${Buffer.from(texto, 'utf8').toString('base64')}?=`;

/** El mensaje completo: cabeceras, cuerpo de texto y, si hay, la versión en HTML. */
export function armarMensaje(c: CartaSmtp): string {
  const de = soloCorreo(c.de);
  const para = soloCorreo(c.para);
  const nombre = nombreVisible(c.de);
  const dominio = de.split('@')[1] || 'sinkroo.com';
  const cabeceras = [
    `Date: ${new Date().toUTCString()}`,
    `From: ${nombre ? `${cabeceraTexto(nombre)} <${de}>` : de}`,
    `To: <${para}>`,
    `Subject: ${cabeceraTexto(c.asunto)}`,
    `Message-ID: <${randomBytes(12).toString('hex')}@${dominio}>`,
    'MIME-Version: 1.0',
  ];

  if (!c.html) {
    return [
      ...cabeceras,
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      'Content-Language: es-CO',
      '',
      enBase64(c.texto),
      '',
    ].join('\r\n');
  }

  const frontera = `sinkroo-${randomBytes(9).toString('hex')}`;
  return [
    ...cabeceras,
    `Content-Type: multipart/alternative; boundary="${frontera}"`,
    '',
    `--${frontera}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    enBase64(c.texto),
    '',
    `--${frontera}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    enBase64(c.html),
    '',
    `--${frontera}--`,
    '',
  ].join('\r\n');
}

/**
 * Manda un correo por SMTP. Devuelve `ok:false` con el motivo cuando el servidor no lo aceptó: acá no
 * se da por enviado nada que no haya contestado «250».
 */
export async function enviarPorSmtp(c: CartaSmtp): Promise<{ ok: boolean; motivo?: string }> {
  const ms = c.ms ?? 15_000;
  let canal: Canal;
  try {
    canal = c.seguro
      ? conectarTls({ host: c.host, port: c.puerto, servername: c.host, timeout: ms })
      : connect({ host: c.host, port: c.puerto, timeout: ms });
  } catch (e) {
    return { ok: false, motivo: sinSecretos((e as Error).message, c.clave) || 'no se pudo abrir la conexión con el servidor de correo' };
  }
  canal.setTimeout(ms);

  const falloDeTiempo = new Error(`el servidor de correo no respondió en ${Math.round(ms / 1000)} segundos`);
  const dialogo = new Dialogo(canal);
  const reloj = setTimeout(() => {
    try { canal.destroy(); } catch { /* ya estaba cerrado */ }
  }, ms);

  try {
    const saludo = await dialogo.pedir();
    if (saludo.codigo !== 220) return { ok: false, motivo: `el servidor de correo saludó con ${saludo.codigo} y no con 220` };

    const ehlo = await dialogo.pedir('EHLO sinkroo.com');
    if (ehlo.codigo !== 250) return { ok: false, motivo: `el servidor de correo rechazó el saludo (${ehlo.codigo}): ${sinSecretos(ehlo.texto, c.clave)}` };

    if (c.starttls && !c.seguro) {
      const listo = await dialogo.pedir('STARTTLS');
      if (listo.codigo !== 220) return { ok: false, motivo: `el servidor de correo no aceptó cifrar la conexión (STARTTLS ${listo.codigo})` };
      const cifrado = await subirA( canal, c.host, ms);
      dialogo.cambiarCanal(cifrado);
      const ehlo2 = await dialogo.pedir('EHLO sinkroo.com');
      if (ehlo2.codigo !== 250) return { ok: false, motivo: `el servidor de correo rechazó el saludo cifrado (${ehlo2.codigo})` };
    }

    // La autenticación sólo si hay usuario y clave: un relevo interno de la misma máquina puede no pedirla.
    if (c.usuario && c.clave) {
      const pideUsuario = await dialogo.pedir('AUTH LOGIN');
      if (pideUsuario.codigo !== 334) return { ok: false, motivo: `el servidor de correo no aceptó autenticarse (${pideUsuario.codigo})` };
      const pideClave = await dialogo.pedir(Buffer.from(c.usuario, 'utf8').toString('base64'));
      if (pideClave.codigo !== 334) return { ok: false, motivo: `el servidor de correo rechazó el usuario (${pideClave.codigo})` };
      const fin = await dialogo.pedir(Buffer.from(c.clave, 'utf8').toString('base64'));
      if (fin.codigo !== 235) return { ok: false, motivo: sinSecretos(`el servidor de correo rechazó la clave (${fin.codigo}: ${fin.texto})`, c.clave) };
    }

    const de = soloCorreo(c.de);
    const para = soloCorreo(c.para);
    const remitente = await dialogo.pedir(`MAIL FROM:<${de}>`);
    if (remitente.codigo !== 250) return { ok: false, motivo: `el servidor de correo rechazó el remitente ${de} (${remitente.codigo}): ${sinSecretos(remitente.texto, c.clave)}` };

    const destino = await dialogo.pedir(`RCPT TO:<${para}>`);
    if (destino.codigo !== 250 && destino.codigo !== 251) {
      return { ok: false, motivo: `el servidor de correo rechazó el destinatario ${para} (${destino.codigo}): ${sinSecretos(destino.texto, c.clave)}` };
    }

    const datos = await dialogo.pedir('DATA');
    if (datos.codigo !== 354) return { ok: false, motivo: `el servidor de correo no aceptó el cuerpo del mensaje (${datos.codigo})` };

    // El punto solo, en una línea, es lo que cierra el mensaje. El cuerpo va en base64, así que ninguna
    // de sus líneas puede empezar por punto: no hay nada que «despuntar».
    const cuerpo = armarMensaje(c);
    const aceptado = await dialogo.pedir(`${cuerpo}\r\n.\r\n`);
    if (aceptado.codigo !== 250) {
      return { ok: false, motivo: sinSecretos(`el servidor de correo no aceptó el mensaje (${aceptado.codigo}: ${aceptado.texto})`, c.clave) };
    }

    dialogo.escribir('QUIT');
    dialogo.cerrar();
    return { ok: true };
  } catch (e) {
    // Aquí caen el tiempo agotado y cualquier caída de la conexión: nunca se dice que salió.
    const m = (e as Error).message || '';
    if (/no respondió|ETIMEDOUT|timeout/i.test(m)) return { ok: false, motivo: falloDeTiempo.message };
    return { ok: false, motivo: sinSecretos(m, c.clave) || 'no se pudo completar el envío del correo' };
  } finally {
    clearTimeout(reloj);
    try { canal.destroy(); } catch { /* ya estaba cerrado */ }
  }
}

/** Sube la conexión a TLS (STARTTLS) reusando el mismo canal ya abierto. */
function subirA(canal: Canal, host: string, ms: number): Promise<Canal> {
  return new Promise<Canal>((resolver, rechazar) => {
    const cifrado = conectarTls({ socket: canal as Socket, servername: host, timeout: ms });
    const reloj = setTimeout(() => { cifrado.destroy(); rechazar(new Error('no se pudo cifrar la conexión con el servidor de correo')); }, ms);
    cifrado.once('secureConnect', () => { clearTimeout(reloj); resolver(cifrado); });
    cifrado.once('error', (e: Error) => { clearTimeout(reloj); rechazar(new Error(e.message || 'no se pudo cifrar la conexión con el servidor de correo')); });
  });
}

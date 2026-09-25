import { execute, query } from '../lib/db.js';
import { sinSecretos } from '../integrations/redes.js';
import { enviarPorSmtp } from './smtp.js';

// =============================================================================================
// EL CORREO DEL PRODUCTO — la bienvenida, los avisos y los enlaces de confirmación.
// =============================================================================================
//
// LA REGLA QUE NO SE ROMPE
//   Si el correo no está configurado, NO se envía: se registra el intento en «correos_enviados» con
//   ok = false y el motivo (qué variable falta), y la función devuelve { ok: false, motivo }. Nada de
//   decir «le mandamos el correo» cuando no salió: el negocio se queda esperando algo que no existe.
//   Cada envío —salió o no— queda escrito en esa tabla, donde va la plantilla y el asunto pero NUNCA
//   el cuerpo: adentro hay datos personales (el enlace de confirmación, el nombre del negocio).
//
// LOS DOS CAMINOS PARA ENVIAR
//   1. Resend: una llamada a su API con la clave del servidor (RESEND_API_KEY).
//   2. SMTP propio (SMTP_HOST y su puerto; con usuario y clave si el servidor los pide).
//   Con que exista uno de los dos y haya remitente (EMAIL_FROM), el correo sale.
//
// LOS TEXTOS
//   Están en español de Colombia y en usted, dicen el nombre del negocio, no prometen nada que el
//   producto no haga y no nombran variables de entorno (eso es cosa del servidor, no del negocio).
// =============================================================================================

export type Carta = { asunto: string; texto: string; html: string };

export type Envio = {
  /** El negocio al que pertenece el correo. Sin él la fila queda sin dueño, pero se registra igual. */
  businessId?: string;
  para: string;
  asunto: string;
  texto: string;
  html?: string;
  /** Con qué plantilla se armó: es lo que se guarda para poder auditar sin leer el cuerpo. */
  plantilla: string;
};

export type ResultadoEnvio = { ok: boolean; motivo?: string; proveedor?: string; plantilla: string };

const URL_RESEND = 'https://api.resend.com/emails';

/** ¿Hay con qué enviar? (proveedor + remitente). Sin esto no se manda nada y se dice qué falta. */
export function correoConfigurado(): boolean {
  return faltaCorreo().length === 0;
}

/**
 * Lo que falta para poder enviar, en el orden de las variables.
 * El orden importa: primero el proveedor —Resend o su SMTP, con uno alcanza— y después el remitente.
 * El usuario y la clave del SMTP son opcionales: un relevo interno de la misma máquina no los pide.
 */
export function faltaCorreo(): string[] {
  const falta: string[] = [];
  const hayResend = !!process.env.RESEND_API_KEY;
  const haySmtp = !!process.env.SMTP_HOST;
  if (!hayResend && !haySmtp) falta.push('RESEND_API_KEY', 'SMTP_HOST');
  if (!process.env.EMAIL_FROM) falta.push('EMAIL_FROM');
  return falta;
}

/**
 * Lo que falta para que los ENLACES de los correos sirvan: la dirección pública del panel.
 * Sin APP_URL se usa la primera dirección declarada en CORS_ORIGENES (el servidor ya la conoce) y, si
 * tampoco hay, el enlace sale relativo: se avisa en vez de inventar una dirección que no existe.
 */
export function faltaEnlaces(): string[] {
  return baseApp() ? [] : ['APP_URL'];
}

/** La dirección pública del panel, para armar los enlaces del correo. */
export function baseApp(): string {
  const declarada = String(process.env.APP_URL || '').trim().replace(/\/+$/, '');
  if (declarada) return declarada;
  return String(process.env.CORS_ORIGENES || '').split(',')
    .map(s => s.trim().replace(/\/+$/, ''))
    .find(s => s !== '*' && /^https?:\/\//i.test(s)) || '';
}

/** El enlace de un token: la dirección pública más la ruta, con el token codificado. */
export const enlaceDe = (ruta: string, token: string) =>
  `${baseApp()}${ruta}?token=${encodeURIComponent(token)}`;

/** El nombre del negocio, tal como quedó en la base. Es el que va en el saludo de los correos. */
export async function nombreDelNegocio(businessId: string): Promise<string> {
  const filas = await query<{ name: string }>('SELECT name FROM businesses WHERE id = $1', [businessId]);
  return String(filas[0]?.name || '').trim() || 'su negocio';
}

/** La fecha de hoy, dicha como se dice acá: «25 de septiembre de 2026». */
export function fechaEnLetras(cuando: Date = new Date()): string {
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${cuando.getDate()} de ${meses[cuando.getMonth()]} de ${cuando.getFullYear()}`;
}

// ---------------------------------- PLANTILLAS ----------------------------------

/** El marco del HTML: sencillo, sin imágenes remotas y sin rastreadores. */
function conMarco(titulo: string, parrafos: string[]): string {
  const cuerpo = parrafos.map(p => `      <p style="margin:0 0 14px;line-height:1.5">${p}</p>`).join('\n');
  return `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:24px;background:#f6f6f7;font-family:Arial,Helvetica,sans-serif;color:#1c1c1e">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e3e3e6;border-radius:12px;padding:28px">
      <h1 style="margin:0 0 18px;font-size:19px;line-height:1.3">${titulo}</h1>
${cuerpo}
      <hr style="border:none;border-top:1px solid #e3e3e6;margin:22px 0 14px">
      <p style="margin:0;font-size:12px;color:#6b6b70">Sinkroo · pre-validación de anuncios con agentes</p>
    </div>
  </body>
</html>`;
}

/** El botón del enlace, que es lo que la gente termina abriendo. */
function boton(texto: string, enlace: string): string {
  return `<a href="${enlace}" style="display:inline-block;background:#111114;color:#ffffff;text-decoration:none;padding:11px 18px;border-radius:8px;font-weight:bold">${texto}</a>`;
}

/** 1 · La bienvenida: se manda al crear la cuenta y trae el enlace que confirma el correo. */
export function bienvenida(d: { negocio: string; enlace: string }): Carta {
  const asunto = `Bienvenido a Sinkroo, ${d.negocio}`;
  const texto = [
    `Hola, ${d.negocio}:`,
    '',
    'Su cuenta en Sinkroo quedó creada y este correo es el de entrada al panel.',
    'Para confirmar que el correo es suyo, abra este enlace:',
    d.enlace,
    '',
    'El enlace vence en 24 horas y sirve una sola vez.',
    'Cuando lo abra, puede crear su PIN de seguridad de 6 dígitos: con ese PIN usted autoriza las acciones delicadas de la cuenta, como desconectar una red o evaluar una pieza con el público (esa evaluación cuesta 48 créditos).',
    'Si usted no creó esta cuenta, ignore este mensaje: sin abrir el enlace no queda nada confirmado.',
    '',
    'Sinkroo · pre-validación de anuncios con agentes',
  ].join('\n');
  const html = conMarco(`Bienvenido, ${d.negocio}`, [
    'Su cuenta en Sinkroo quedó creada y este correo es el de entrada al panel.',
    'Para confirmar que el correo es suyo, abra este enlace:',
    boton('Confirmar mi correo', d.enlace),
    'El enlace vence en 24 horas y sirve una sola vez.',
    'Cuando lo abra, puede crear su PIN de seguridad de 6 dígitos: con ese PIN usted autoriza las acciones delicadas de la cuenta, como desconectar una red o evaluar una pieza con el público (esa evaluación cuesta 48 créditos).',
    'Si usted no creó esta cuenta, ignore este mensaje: sin abrir el enlace no queda nada confirmado.',
  ]);
  return { asunto, texto, html };
}

/** 2 · Confirmar el correo otra vez (cuando el primero venció): sólo el enlace, bien claro. */
export function verificarCorreo(d: { negocio: string; enlace: string }): Carta {
  const asunto = `Confirme el correo de ${d.negocio}`;
  const texto = [
    `Hola, ${d.negocio}:`,
    '',
    'Este enlace confirma que este correo es suyo:',
    d.enlace,
    '',
    'Vence en 24 horas y se puede usar una sola vez.',
    'Si no fue usted, ignore este mensaje: el correo queda sin confirmar y no pasa nada más.',
    '',
    'Sinkroo · pre-validación de anuncios con agentes',
  ].join('\n');
  const html = conMarco(`Confirme el correo de ${d.negocio}`, [
    'Este enlace confirma que este correo es suyo:',
    boton('Confirmar mi correo', d.enlace),
    'Vence en 24 horas y se puede usar una sola vez.',
    'Si no fue usted, ignore este mensaje: el correo queda sin confirmar y no pasa nada más.',
  ]);
  return { asunto, texto, html };
}

/** 3 · El PIN: aviso de que se creó o se cambió, con la fecha. Se manda al correo de la cuenta. */
export function pinDeSeguridad(d: { negocio: string; cuando: string; cambiado: boolean }): Carta {
  const que = d.cambiado ? 'se cambió' : 'quedó creado';
  const asunto = d.cambiado ? `El PIN de seguridad de ${d.negocio} cambió` : `El PIN de seguridad de ${d.negocio} quedó creado`;
  const texto = [
    `Hola, ${d.negocio}:`,
    '',
    `El PIN de seguridad de su cuenta ${que} el ${d.cuando}.`,
    'Con ese PIN usted autoriza las acciones delicadas: desconectar una cuenta conectada y las que gastan créditos, como evaluar una pieza con el público (48 créditos).',
    'Si no fue usted, entre a Sinkroo, desconecte esa red y cambie la contraseña de su cuenta.',
    '',
    'Sinkroo · pre-validación de anuncios con agentes',
  ].join('\n');
  const html = conMarco(`PIN de seguridad ${d.cambiado ? 'cambiado' : 'creado'}`, [
    `El PIN de seguridad de su cuenta ${que} el ${d.cuando}.`,
    'Con ese PIN usted autoriza las acciones delicadas: desconectar una cuenta conectada y las que gastan créditos, como evaluar una pieza con el público (48 créditos).',
    'Si no fue usted, entre a Sinkroo y cambie la contraseña de su cuenta.',
  ]);
  return { asunto, texto, html };
}

/** 4 · El aviso de una cuenta conectada: queda escrito con fecha y con el nombre de la red. */
export function avisoConexion(d: { negocio: string; red: string; cuando: string }): Carta {
  const asunto = `Se conectó ${d.red} en ${d.negocio}`;
  const texto = [
    `Hola, ${d.negocio}:`,
    '',
    `Su cuenta de ${d.red} quedó conectada a Sinkroo el ${d.cuando}.`,
    'Desde ahora el motor puede leer los datos que esa cuenta entrega. Esas credenciales viven en el servidor y no salen en ninguna respuesta.',
    'Si no fue usted, entre a su cuenta, desconecte esa red y cambie la contraseña de su cuenta.',
    '',
    'Sinkroo · pre-validación de anuncios con agentes',
  ].join('\n');
  const html = conMarco(`Se conectó ${d.red}`, [
    `Su cuenta de ${d.red} quedó conectada a Sinkroo el ${d.cuando}.`,
    'Desde ahora el motor puede leer los datos que esa cuenta entrega. Esas credenciales viven en el servidor y no salen en ninguna respuesta.',
    'Si no fue usted, entre a su cuenta, desconecte esa red y cambie la contraseña de su cuenta.',
  ]);
  return { asunto, texto, html };
}

/** 5 · Restablecer el PIN: es el camino cuando el PIN se olvidó. No hay pregunta secreta, hay enlace. */
export function restablecerPin(d: { negocio: string; enlace: string }): Carta {
  const asunto = `Restablezca el PIN de seguridad de ${d.negocio}`;
  const texto = [
    `Hola, ${d.negocio}:`,
    '',
    'Pedimos este enlace para que pueda elegir un PIN de seguridad nuevo:',
    d.enlace,
    '',
    'El enlace vence en 24 horas y sirve una sola vez.',
    'Si no fue usted, ignore este mensaje: su PIN actual sigue funcionando y sin abrir el enlace no se cambia nada.',
    '',
    'Sinkroo · pre-validación de anuncios con agentes',
  ].join('\n');
  const html = conMarco('Elija un PIN de seguridad nuevo', [
    'Pedimos este enlace para que pueda elegir un PIN de seguridad nuevo:',
    boton('Elegir un PIN nuevo', d.enlace),
    'El enlace vence en 24 horas y sirve una sola vez.',
    'Si no fue usted, ignore este mensaje: su PIN actual sigue funcionando y sin abrir el enlace no se cambia nada.',
  ]);
  return { asunto, texto, html };
}

/** 6 · El resumen de la semana: lo que quedó registrado, sin estimaciones de adorno. */
export function resumenSemanal(d: {
  negocio: string; desde: string; hasta: string;
  hallazgos: number; piezas: number; evaluaciones: number; creditos: number;
}): Carta {
  const asunto = `El resumen de la semana de ${d.negocio}`;
  const linea = `Entre el ${d.desde} y el ${d.hasta} quedaron ${d.hallazgos} hallazgo${d.hallazgos === 1 ? '' : 's'} de mercado, ${d.piezas} pieza${d.piezas === 1 ? '' : 's'} y ${d.evaluaciones} evaluación${d.evaluaciones === 1 ? '' : 'es'} hecha${d.evaluaciones === 1 ? '' : 's'}.`;
  const texto = [
    `Hola, ${d.negocio}:`,
    '',
    'Este es el resumen de su semana en Sinkroo.',
    linea,
    `Su saldo de créditos quedó en ${d.creditos}.`,
    'Estos números son lo que quedó escrito en el panel: cada movimiento tiene su motivo y se puede revisar.',
    'Si algo no cuadra con lo que usted hizo, entre al panel y revíselo ahí antes de sacar conclusiones.',
    '',
    'Sinkroo · pre-validación de anuncios con agentes',
  ].join('\n');
  const html = conMarco(`La semana de ${d.negocio}`, [linea, `Su saldo de créditos quedó en ${d.creditos}.`, 'Estos números son lo que quedó escrito en el panel: cada movimiento tiene su motivo y se puede revisar.']);
  return { asunto, texto, html };
}

// ---------------------------------- EL ENVÍO ----------------------------------

/** Deja la fila de auditoría. Si esto falla, el envío no se da por fallido: se dice y sigue. */
async function registrar(envio: Envio, ok: boolean, motivo: string) {
  try {
    await execute(
      `INSERT INTO correos_enviados (business_id, para, asunto, plantilla, ok, motivo)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [envio.businessId ?? null, envio.para.slice(0, 200), envio.asunto.slice(0, 200),
        envio.plantilla.slice(0, 60), ok, sinSecretos(motivo, process.env.RESEND_API_KEY, process.env.SMTP_PASS)],
    );
  } catch {
    // Sin registro no se puede auditar, pero tampoco se va a decir que el correo salió: el resultado que
    // devuelve `enviar` sigue siendo el del proveedor.
  }
}

/** Manda por Resend. Devuelve `ok:false` con el motivo exacto del proveedor, nunca con la clave. */
async function enviarPorResend(envio: Envio): Promise<{ ok: boolean; motivo?: string }> {
  const apiKey = process.env.RESEND_API_KEY || '';
  try {
    const r = await fetch(URL_RESEND, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || '',
        to: [envio.para],
        subject: envio.asunto,
        text: envio.texto,
        ...(envio.html ? { html: envio.html } : {}),
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const cuerpo = await r.text();
    let dato: Record<string, unknown> = {};
    try { dato = cuerpo ? JSON.parse(cuerpo) as Record<string, unknown> : {}; } catch { dato = {}; }
    if (r.ok) return { ok: true };
    const mensaje = String((dato.error as { message?: string } | undefined)?.message || dato.message || cuerpo || '').trim();
    return {
      ok: false,
      motivo: sinSecretos(`Resend no aceptó el envío (${r.status}): ${mensaje || 'sin detalle'}`, apiKey),
    };
  } catch (e) {
    return { ok: false, motivo: sinSecretos(`no se pudo hablar con Resend: ${(e as Error).message || 'sin detalle'}`, apiKey) };
  }
}

/**
 * Manda un correo y deja SIEMPRE la constancia en «correos_enviados».
 * Devuelve { ok, motivo, proveedor } y nunca revienta: el correo es un aviso, no puede tumbar la acción
 * que lo pidió (crear una cuenta o conectar una red tienen que terminar igual).
 */
export async function enviar(envio: Envio): Promise<ResultadoEnvio> {
  const para = String(envio.para || '').trim();
  const plantilla = envio.plantilla || 'sin_plantilla';

  if (!para || !para.includes('@')) {
    const motivo = 'el negocio no tiene un correo de cuenta válido al cual enviar';
    await registrar({ ...envio, para, plantilla }, false, motivo);
    return { ok: false, motivo, plantilla };
  }

  const falta = faltaCorreo();
  if (falta.length) {
    // El caso que hay que decir de frente: no hay con qué enviar, así que el intento queda anotado y no
    // se simula nada. `falta` nombra las variables porque quien lee esto es el servidor, no el negocio.
    const motivo = `el correo no está configurado: falta ${falta.join(' y ')}`;
    await registrar({ ...envio, para, plantilla }, false, motivo);
    return { ok: false, motivo, plantilla };
  }

  const proveedor = process.env.RESEND_API_KEY ? 'resend' : 'smtp';
  const resultado = proveedor === 'resend'
    ? await enviarPorResend({ ...envio, para })
    : await enviarPorSmtp({
      host: process.env.SMTP_HOST || '',
      puerto: Number(process.env.SMTP_PORT || 587),
      // 465 es TLS desde el primer byte; cualquier otro puerto sube con STARTTLS si se pide.
      seguro: String(process.env.SMTP_SEGURO || '') === '1' || Number(process.env.SMTP_PORT || 587) === 465,
      starttls: String(process.env.SMTP_STARTTLS || '') === '1' || Number(process.env.SMTP_PORT || 587) === 587,
      usuario: process.env.SMTP_USER || '',
      clave: process.env.SMTP_PASS || '',
      de: process.env.EMAIL_FROM || '',
      para,
      asunto: envio.asunto,
      texto: envio.texto,
      html: envio.html,
    });

  await registrar({ ...envio, para, plantilla }, resultado.ok, resultado.motivo || (resultado.ok ? 'enviado' : 'no salió'));
  return { ...resultado, proveedor, plantilla };
}

/** El estado del correo, para que el panel pueda explicar por qué un aviso no llegó. */
export function estadoCorreo() {
  return {
    configurado: correoConfigurado(),
    proveedor: process.env.RESEND_API_KEY ? 'resend' : process.env.SMTP_HOST ? 'smtp' : null,
    remitente: process.env.EMAIL_FROM || '',
    falta: faltaCorreo(),
    falta_enlaces: faltaEnlaces(),
  };
}

/** Lo último que se intentó enviar a este negocio: para que el panel lo muestre sin adornos. */
export async function ultimosEnvios(businessId: string, limite = 10) {
  return query(
    `SELECT para, asunto, plantilla, ok, motivo, created_at FROM correos_enviados
      WHERE business_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [businessId, Math.min(Math.max(limite, 1), 50)],
  );
}

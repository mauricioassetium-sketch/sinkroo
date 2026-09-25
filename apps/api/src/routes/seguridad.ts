import type { FastifyInstance } from 'fastify';
import { claveCorrecta, exigirSesion } from '../lib/auth.js';
import { query } from '../lib/db.js';
import { responderEnlace } from '../lib/paginas.js';
import {
  AVISO_SIN_PIN, INTENTOS_MAXIMOS, MINUTOS_BLOQUEO, estadoDePin, exigirPin,
  guardarPin, pinCorrecto, porqueNoSirve, registrarIntento,
} from '../lib/pin.js';
import { pasarElFreno } from '../lib/seguridad.js';
import {
  enlaceDe, enviar, estadoCorreo, faltaCorreo, fechaEnLetras, pinDeSeguridad, restablecerPin, ultimosEnvios,
} from '../services/correo.js';
import { crearVerificacion, negocioYCorreo, revisarVerificacion, usarVerificacion } from '../services/verificaciones.js';

// =============================================================================================
// SEGURIDAD DE LA CUENTA — el PIN de 6 dígitos y el estado de la seguridad.
// =============================================================================================
//
// LO QUE HACE ESTA PANTALLA (por dentro, que es lo que importa)
//   · Crear el PIN y cambiarlo. Para cambiarlo hay que probar quién es: el PIN actual o la clave de la
//     cuenta. Nunca se acepta «cámbielo porque lo pide».
//   · Verificarlo, para las acciones sensibles (desconectar una cuenta, cambiar el plan, borrar datos,
//     arrancar una evaluación que gasta créditos). Ahí está el bloqueo: 5 intentos y 15 minutos.
//   · Recuperarlo cuando se olvidó: un enlace al correo de la cuenta (tipo 'pin'), de un solo uso. No hay
//     pregunta secreta, porque una pregunta secreta se la sabe cualquiera que revise su Instagram.
//   · Decir el estado sin adorno: ¿hay PIN?, ¿está bloqueado?, ¿cuántos intentos quedan?, ¿el correo está
//     confirmado?, ¿y la configuración del correo del servidor?
//
// LO QUE NUNCA SALE EN UNA RESPUESTA
//   El PIN (ni su huella), el token del enlace y las variables del servidor con sus valores. `falta` dice
//   QUÉ variable falta, jamás su contenido.
// =============================================================================================

export async function seguridadRoutes(app: FastifyInstance) {
  /** El estado completo de la seguridad de la cuenta: lo que pinta la pantalla. */
  app.get('/api/seguridad/estado', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
    const estado = await estadoDePin(u.business_id);
    return {
      ...estado,
      correo: {
        ...estadoCorreo(),
        // El correo de la cuenta: es a donde salen los avisos y los enlaces.
        cuenta: u.email,
      },
      // Lo último que se intentó mandar a este negocio: si algo no llegó, acá está el motivo.
      correos_recientes: await ultimosEnvios(u.business_id, 5),
      acciones_sensibles: ACCIONES_SENSIBLES,
      como_recuperar: 'si olvida el PIN, pídalo de nuevo desde acá: le llega un enlace al correo de su cuenta, vence en 24 horas y sirve una sola vez',
      como_cambiar: 'para cambiarlo se pide el PIN actual o la clave de la cuenta',
      aviso: estado.tiene_pin ? null : AVISO_SIN_PIN,
    };
  });

  /**
   * Crear el PIN (si no existe) o cambiarlo.
   *   { pin }                        → lo crea, si la cuenta todavía no tiene.
   *   { pin, pin_actual }            → lo cambia, con el PIN actual.
   *   { pin, clave }                 → lo cambia, con la clave de la cuenta.
   *   { pin, token }                 → lo restablece con el enlace del correo (no pide sesión: el enlace
   *                                    ya prueba que es el dueño, y así funciona aunque haya olvidado todo).
   */
  app.post('/api/seguridad/pin', async (req, reply) => {
    const b = (req.body || {}) as { pin?: string; pin_actual?: string; clave?: string; token?: string };
    const pinNuevo = String(b.pin ?? '').trim();
    const problema = porqueNoSirve(pinNuevo);
    if (problema) return reply.status(400).send({ error: problema, codigo: 'pin_invalido' });

    // ---- El camino del enlace del correo (restablecer cuando se olvidó) ----
    if (b.token) {
      const verificado = await usarVerificacion(String(b.token), 'pin');
      if (!verificado.ok || !verificado.business_id) {
        const estado = verificado.codigo === 'token_falta' || verificado.codigo === 'token_invalido' ? 400 : 410;
        return reply.status(estado).send({
          error: verificado.motivo, codigo: verificado.codigo,
          detalle: 'pida un enlace nuevo desde la pantalla de seguridad de su cuenta',
        });
      }
      await guardarPin(verificado.business_id, pinNuevo);
      const aviso = await avisarPin(verificado.business_id, true);
      return {
        ok: true, tiene_pin: true, cambio: 'el PIN se restableció con el enlace del correo',
        pin_requerido: true, aviso_correo: aviso,
        detalle: 'su PIN nuevo quedó guardado: úselo en las acciones sensibles',
      };
    }

    // ---- Los caminos con sesión ----
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
    const estado = await estadoDePin(u.business_id);

    // Cambiar el PIN que ya existe pide prueba de quién es (PIN actual o clave de la cuenta).
    if (estado.tiene_pin) {
      if (estado.bloqueado) {
        return reply.status(429).send({
          error: 'el PIN de seguridad está bloqueado por intentos fallidos', codigo: 'pin_bloqueado',
          bloqueado_hasta: estado.bloqueado_hasta, minutos_restantes: estado.minutos_restantes,
          detalle: `no se puede cambiar el PIN mientras esté bloqueado: faltan ${estado.minutos_restantes} minuto${estado.minutos_restantes === 1 ? '' : 's'}, o restablézcalo con el enlace del correo`,
        });
      }
      const conPin = String(b.pin_actual ?? '').trim();
      let autorizado = false;
      if (conPin) {
        const filas = await query<{ pin_hash: string }>('SELECT pin_hash FROM pines WHERE business_id = $1', [u.business_id]);
        autorizado = pinCorrecto(conPin, filas[0]?.pin_hash);
        if (!autorizado) {
          // Un PIN actual que no sirve es un intento fallido: cuenta para el bloqueo y queda auditado.
          await registrarIntento(u.business_id, false);
          const filasFallo = await query<{ intentos_fallidos: number; bloqueado_hasta: Date | null }>(
            `UPDATE pines SET intentos_fallidos = intentos_fallidos + 1,
                bloqueado_hasta = CASE WHEN intentos_fallidos + 1 >= $2 THEN now() + ($3 || ' minutes')::interval ELSE bloqueado_hasta END,
                actualizado = now()
              WHERE business_id = $1 RETURNING intentos_fallidos, bloqueado_hasta`,
            [u.business_id, INTENTOS_MAXIMOS, String(MINUTOS_BLOQUEO)],
          );
          const restantes = Math.max(0, INTENTOS_MAXIMOS - Number(filasFallo[0]?.intentos_fallidos ?? 0));
          if (filasFallo[0]?.bloqueado_hasta) {
            return reply.status(429).send({
              error: 'el PIN actual no es correcto y se acabaron los intentos', codigo: 'pin_bloqueado',
              bloqueado_hasta: new Date(filasFallo[0].bloqueado_hasta).toISOString(),
              minutos_restantes: MINUTOS_BLOQUEO, intentos_restantes: 0,
              detalle: `el PIN queda bloqueado ${MINUTOS_BLOQUEO} minutos`,
            });
          }
          return reply.status(401).send({
            error: 'el PIN actual no es correcto', codigo: 'pin_malo', intentos_restantes: restantes,
            detalle: `le quedan ${restantes} intento${restantes === 1 ? '' : 's'}; también puede cambiarlo con la clave de su cuenta`,
          });
        }
      }
      if (!autorizado && b.clave) {
        const filas = await query<{ clave_hash: string | null }>('SELECT clave_hash FROM users WHERE id = $1', [u.id]);
        if (claveCorrecta(String(b.clave), filas[0]?.clave_hash ?? null)) autorizado = true;
        else {
          // La clave mala se audita, pero no gasta los intentos del PIN: son dos cosas distintas.
          await registrarIntento(u.business_id, false);
        }
      }
      if (!autorizado) {
        return reply.status(401).send({
          error: 'para cambiar el PIN hace falta el PIN actual o la clave de la cuenta',
          codigo: 'sin_autorizacion',
          detalle: 'mándelo en el cuerpo como «pin_actual», o la clave de la cuenta como «clave»; si olvidó el PIN, pida el enlace del correo',
        });
      }
    }

    await guardarPin(u.business_id, pinNuevo);
    const aviso = await avisarPin(u.business_id, estado.tiene_pin);
    return {
      ok: true,
      tiene_pin: true,
      cambio: estado.tiene_pin ? 'el PIN se cambió' : 'el PIN quedó creado',
      pin_requerido: true,
      aviso_correo: aviso,
      detalle: estado.tiene_pin
        ? 'el PIN nuevo quedó guardado y los intentos fallidos volvieron a cero'
        : 'desde ahora las acciones sensibles le van a pedir estos 6 dígitos',
    };
  });

  /**
   * Verificar el PIN: es lo que llama la pantalla antes de una acción sensible.
   * Aquí vive el bloqueo de verdad (5 intentos fallidos → 15 minutos), guardado en la base.
   */
  app.post('/api/seguridad/pin/verificar', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;
    const b = (req.body || {}) as { pin?: string };
    const resultado = await exigirPin(req, reply, u.business_id, b.pin);
    if (!resultado.permite) return;
    if (resultado.pin_requerido === false) {
      // No hay PIN: no hay nada que verificar, y se dice con la invitación a crearlo.
      return reply.status(200).send({ ok: true, valido: false, pin_requerido: false, tiene_pin: false, aviso: resultado.aviso });
    }
    return reply.status(200).send({ ok: true, valido: true, tiene_pin: true, intentos_restantes: INTENTOS_MAXIMOS });
  });

  /**
   * «Olvidé el PIN»: manda el enlace para elegir uno nuevo al correo de la cuenta.
   * El enlace es la prueba de identidad: no hay pregunta secreta. Si el correo del servidor todavía no está
   * configurado, se dice tal cual (y queda el intento anotado), sin dejar creer que el correo salió.
   */
  app.post('/api/seguridad/pin/olvide', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;

    // Un enlace de estos abre la puerta de la cuenta: no se puede pedir mil veces seguidas.
    const freno = pasarElFreno(`olvide-pin:${u.business_id}`, 3, 15 * 60_000);
    if (!freno.pasa) {
      return reply.status(429).send({
        error: 'ya pidió varios enlaces seguidos', codigo: 'frenado',
        detalle: 'espere unos minutos: si el primero no llegó, revise la carpeta de correo no deseado',
      });
    }

    const { negocio, correo } = await negocioYCorreo(u.business_id);
    if (!correo) {
      return reply.status(409).send({
        error: 'esta cuenta no tiene un correo al cual mandar el enlace', codigo: 'sin_correo',
        detalle: 'la cuenta se creó sin correo: no hay forma de comprobar quién es por esta vía',
      });
    }

    const token = await crearVerificacion(u.business_id, 'pin');
    const enlace = enlaceDe('/api/seguridad/pin/restablecer', token);
    const carta = restablecerPin({ negocio, enlace });
    const salio = await enviar({
      businessId: u.business_id, para: correo, asunto: carta.asunto,
      texto: carta.texto, html: carta.html, plantilla: 'restablecerPin',
    });

    // La respuesta dice la verdad de lo que pasó: enviado o el motivo exacto por el que no salió.
    return reply.status(salio.ok ? 201 : 202).send({
      ok: salio.ok,
      enviado: salio.ok,
      para: correo,
      motivo: salio.motivo ?? null,
      falta: salio.ok ? [] : faltaCorreo(),
      detalle: salio.ok
        ? `le mandamos el enlace a ${correo}: vence en 24 horas y sirve una sola vez`
        : 'el enlace quedó creado, pero el correo no salió: sin un proveedor de correo configurado no hay forma de mandarlo',
    });
  });

  /** La pantalla del enlace del correo (la abre la persona en el navegador). No gasta el token. */
  app.get('/api/seguridad/pin/restablecer', async (req, reply) => {
    const token = String((req.query as { token?: string })?.token || '').trim();
    const revisado = await revisarVerificacion(token, 'pin');
    if (!revisado.ok) {
      return responderEnlace(req, reply, {
        estado: revisado.codigo === 'token_falta' || revisado.codigo === 'token_invalido' ? 400 : 410,
        titulo: 'Ese enlace no sirve',
        mensaje: revisado.motivo || 'el enlace no sirve',
        detalle: 'entre a su cuenta y pida un enlace nuevo desde la pantalla de seguridad.',
        json: { ok: false, codigo: revisado.codigo, error: revisado.motivo },
      });
    }
    const { negocio } = await negocioYCorreo(revisado.business_id || '');
    return responderEnlace(req, reply, {
      estado: 200,
      titulo: `Elija un PIN nuevo para ${negocio}`,
      mensaje: 'Escriba los 6 dígitos que va a usar de ahora en adelante en las acciones sensibles.',
      detalle: 'El PIN se guarda cifrado: ni nosotros podemos verlo. Evite series (123456) y números repetidos.',
      formulario: { token },
      json: {
        ok: true, negocio,
        detalle: 'el enlace sirve: mande el PIN nuevo por POST a esta misma dirección con { token, pin }',
      },
    });
  });

  /**
   * El formulario de esa pantalla. También responde JSON para quien llame desde la API.
   * No pide sesión: el token es la prueba, y justamente sirve para cuando no se puede entrar.
   */
  app.post('/api/seguridad/pin/restablecer', async (req, reply) => {
    const b = (req.body || {}) as { token?: string; pin?: string };
    const problema = porqueNoSirve(b.pin);
    if (problema) {
      return responderEnlace(req, reply, {
        estado: 400, titulo: 'Ese PIN no sirve', mensaje: problema,
        detalle: 'vuelva a escribir los 6 dígitos.',
        formulario: { token: String(b.token || '') },
        json: { ok: false, codigo: 'pin_invalido', error: problema },
      });
    }
    const verificado = await usarVerificacion(String(b.token || ''), 'pin');
    if (!verificado.ok || !verificado.business_id) {
      return responderEnlace(req, reply, {
        estado: verificado.codigo === 'token_falta' || verificado.codigo === 'token_invalido' ? 400 : 410,
        titulo: 'Ese enlace no sirve', mensaje: verificado.motivo || 'el enlace no sirve',
        detalle: 'entre a su cuenta y pida un enlace nuevo desde la pantalla de seguridad.',
        json: { ok: false, codigo: verificado.codigo, error: verificado.motivo },
      });
    }
    await guardarPin(verificado.business_id, String(b.pin).trim());
    const aviso = await avisarPin(verificado.business_id, true);
    return responderEnlace(req, reply, {
      estado: 200,
      titulo: 'Su PIN nuevo quedó guardado',
      mensaje: 'Ya puede usar estos 6 dígitos en las acciones sensibles de su cuenta.',
      detalle: 'Puede cerrar esta página.',
      json: { ok: true, tiene_pin: true, detalle: 'el PIN quedó restablecido con el enlace del correo', aviso_correo: aviso },
    });
  });

}

/** Las acciones que el PIN protege. El panel las muestra; el servidor las exige una por una. */
export const ACCIONES_SENSIBLES = [
  'desconectar una cuenta conectada',
  'cambiar el plan',
  'borrar datos del negocio',
  'arrancar una evaluación del motor que gasta créditos',
];

/**
 * El aviso por correo de que el PIN se creó o se cambió. Nunca tumba la acción: si el correo no sale,
 * queda anotado en «correos_enviados» y la respuesta lo dice.
 */
async function avisarPin(businessId: string, cambiado: boolean): Promise<Record<string, unknown>> {
  const { negocio, correo } = await negocioYCorreo(businessId);
  if (!correo) return { enviado: false, motivo: 'la cuenta no tiene un correo al cual avisar' };
  const carta = pinDeSeguridad({ negocio, cuando: fechaEnLetras(), cambiado });
  const salio = await enviar({
    businessId, para: correo, asunto: carta.asunto, texto: carta.texto, html: carta.html,
    plantilla: 'pinDeSeguridad',
  });
  return {
    enviado: salio.ok,
    para: correo,
    motivo: salio.motivo ?? null,
    falta: salio.ok ? [] : faltaCorreo(),
  };
}

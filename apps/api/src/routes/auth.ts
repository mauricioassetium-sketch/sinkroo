import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { execute, query } from '../lib/db.js';
import { abrirSesion, claveCorrecta, correoNormal, exigirSesion, huellaDeClave } from '../lib/auth.js';
import { estadoDePin } from '../lib/pin.js';
import { responderEnlace } from '../lib/paginas.js';
import { pasarElFreno } from '../lib/seguridad.js';
import { bienvenida, enlaceDe, enviar, estadoCorreo, faltaCorreo, verificarCorreo as cartaDeVerificacion } from '../services/correo.js';
import { crearVerificacion, negocioYCorreo, usarVerificacion } from '../services/verificaciones.js';

// =============================================================================================
// CUENTAS — entrar, crear cuenta, salir y quién soy.
//
// LA REGLA DEL PRODUCTO: un correo, una cuenta, un negocio. Si el correo ya existe, no se crea otra: se
// entra con ese correo. Y al crear la cuenta se crea el negocio, porque no hay usuario sin negocio.
//
// LA ENTRADA POR CORREO (lo que se cerró acá)
//   Al crear la cuenta se manda la bienvenida con un enlace de un solo uso (/api/auth/verificar) que
//   confirma que el correo es del negocio: hasta que no lo abra, el negocio queda con
//   `correo_verificado = false` y el panel lo dice. Todo el uso del producto funciona igual —confirmar el
//   correo no es un permiso, es un hecho—, pero nadie da por bueno un correo que no se comprobó.
//   Si el servidor todavía no tiene proveedor de correo, NO se inventa un enviado: la cuenta se crea
//   igual, el intento queda anotado en `correos_enviados` con su motivo y la respuesta lo dice claro.
// =============================================================================================

type Cuerpo = { nombre?: string; email?: string; clave?: string };

/** Los créditos que trae el plan al empezar. El plan se cambia después desde Créditos. */
const CREDITOS_PLAN = 2000;

export async function authRoutes(app: FastifyInstance) {
  /** Crear cuenta. Crea también el negocio: el negocio es del usuario desde el primer momento. */
  app.post('/api/auth/registro', async (req, reply) => {
    const b = (req.body || {}) as Cuerpo;
    const email = correoNormal(b.email || '');
    const nombre = String(b.nombre || '').trim();
    if (!email || !email.includes('@')) return reply.status(400).send({ error: 'el correo no es válido' });
    if (!b.clave || String(b.clave).length < 6) {
      return reply.status(400).send({ error: 'la clave necesita al menos 6 caracteres' });
    }

    const ya = await query<{ id: string }>('SELECT id FROM users WHERE email = $1', [email]);
    if (ya.length) {
      // Un correo es una cuenta: no se crea otra, se entra con esa.
      return reply.status(409).send({
        error: 'ese correo ya tiene una cuenta', codigo: 'correo_existe',
        como_entrar: 'entre con ese correo y su clave',
      });
    }

    const negocio = await query<{ id: string }>(
      `INSERT INTO businesses (name, description) VALUES ($1, $2) RETURNING id`,
      [nombre || 'Mi negocio', ''],
    );
    const negocioId = negocio[0].id;

    const user = await query<{ id: string; email: string; nombre: string }>(
      `INSERT INTO users (email, nombre, clave_hash, via, business_id)
       VALUES ($1, $2, $3, 'email', $4) RETURNING id, email, nombre`,
      [email, nombre, huellaDeClave(String(b.clave)), negocioId],
    );

    await execute(`INSERT INTO onboarding (business_id) VALUES ($1) ON CONFLICT (business_id) DO NOTHING`, [negocioId]);

    // Los créditos del plan del mes. Es la asignación del plan, no un dato de ejemplo: queda escrita en el
    // libro con su motivo, así el saldo y su historia nunca se contradicen.
    await execute(
      `INSERT INTO movimientos_creditos (business_id, delta, motivo, detalle, saldo)
       VALUES ($1, $2, 'plan', 'Créditos del plan del mes', $2)`,
      [negocioId, CREDITOS_PLAN],
    );

    const token = await abrirSesion(user[0].id);

    // La bienvenida con el enlace de confirmación. Se manda DESPUÉS de tener la cuenta creada: si el
    // correo no sale, la cuenta igual existe —no se pierde nada— y la respuesta dice qué pasó.
    const carta = bienvenida({ negocio: nombre || 'Mi negocio', enlace: enlaceDe('/api/auth/verificar', await crearVerificacion(negocioId, 'correo')) });
    const salio = await enviar({
      businessId: negocioId, para: email, asunto: carta.asunto, texto: carta.texto, html: carta.html,
      plantilla: 'bienvenida',
    });
    const falta = salio.ok ? [] : faltaCorreo();

    return reply.status(201).send({
      token,
      usuario: { ...user[0], business_id: negocioId, correo_verificado: false },
      correo: {
        enviado: salio.ok,
        para: email,
        motivo: salio.motivo ?? null,
        falta,
        detalle: salio.ok
          ? `le mandamos la bienvenida a ${email} con el enlace para confirmar el correo (vence en 24 horas)`
          : falta.length
            ? 'la cuenta quedó creada, pero el correo de bienvenida no salió: mientras el envío de correo no esté configurado no hay forma de mandarlo, y sin ese enlace el correo queda sin confirmar'
            : `la cuenta quedó creada, pero el correo de bienvenida no salió (${salio.motivo}): el correo queda sin confirmar hasta que pueda confirmarlo`,
      },
    });
  });

  /** Entrar con correo y clave. */
  app.post('/api/auth/entrar', async (req, reply) => {
    const b = (req.body || {}) as Cuerpo;
    const email = correoNormal(b.email || '');
    const filas = await query<{ id: string; email: string; nombre: string; clave_hash: string | null; business_id: string | null }>(
      'SELECT id, email, nombre, clave_hash, business_id FROM users WHERE email = $1', [email],
    );
    if (!filas.length || !claveCorrecta(String(b.clave || ''), filas[0].clave_hash)) {
      return reply.status(401).send({ error: 'el correo o la clave no son correctos', codigo: 'clave_mala' });
    }
    const token = await abrirSesion(filas[0].id);
    // Se informa si el correo está confirmado: el panel lo muestra al abrir, sin pedir otra llamada.
    const correoVerificado = filas[0].business_id
      ? (await query<{ correo_verificado: boolean }>('SELECT correo_verificado FROM businesses WHERE id = $1', [filas[0].business_id]))[0]?.correo_verificado
      : false;
    return {
      token,
      usuario: { id: filas[0].id, email: filas[0].email, nombre: filas[0].nombre, business_id: filas[0].business_id, correo_verificado: !!correoVerificado },
    };
  });

  /** Quién soy: el front lo usa al abrir el panel para saber si la sesión sigue viva. */
  app.get('/api/auth/yo', async (req, reply) => {
    const u = await exigirSesion(req, reply);
    if (!u) return;
    const estado = u.business_id ? await estadoDePin(u.business_id) : null;
    return {
      usuario: { ...u, correo_verificado: estado?.correo_verificado ?? false },
      // El estado del correo del servidor, para que el panel pueda explicar por qué un aviso no llegó.
      correo: { ...estadoCorreo(), cuenta: u.email },
      // Y el estado de la seguridad de la cuenta, que es lo que pide la pantalla de Seguridad.
      seguridad: estado
        ? {
          tiene_pin: estado.tiene_pin, bloqueado: estado.bloqueado, bloqueado_hasta: estado.bloqueado_hasta,
          minutos_restantes: estado.minutos_restantes, intentos_restantes: estado.intentos_restantes,
        }
        : null,
    };
  });

  /**
   * Confirmar el correo de la cuenta con el enlace que llegó por correo.
   * GET para el navegador (el enlace del correo se abre con un clic) y POST para el panel o la API:
   * el mismo trabajo, el mismo token de un solo uso.
   */
  const confirmarCorreo = async (req: FastifyRequest, reply: FastifyReply) => {
    const token = String((req.query as { token?: string } | undefined)?.token || (req.body as { token?: string } | undefined)?.token || '').trim();
    const verificado = await usarVerificacion(token, 'correo');
    if (!verificado.ok || !verificado.business_id) {
      const estado = verificado.codigo === 'token_falta' || verificado.codigo === 'token_invalido' ? 400 : 410;
      return responderEnlace(req, reply, {
        estado,
        titulo: 'Ese enlace no sirve',
        mensaje: verificado.motivo || 'el enlace no sirve',
        detalle: 'entre a su cuenta y pida el enlace de nuevo: el correo de la cuenta es el que se confirma.',
        json: { ok: false, correo_verificado: false, codigo: verificado.codigo, error: verificado.motivo },
      });
    }

    await execute('UPDATE businesses SET correo_verificado = true WHERE id = $1', [verificado.business_id]);
    const { negocio } = await negocioYCorreo(verificado.business_id);
    return responderEnlace(req, reply, {
      estado: 200,
      titulo: 'Su correo quedó confirmado',
      mensaje: `La cuenta de ${negocio} ya tiene el correo confirmado.`,
      detalle: 'Puede cerrar esta página y seguir en el panel. Si todavía no creó su PIN de seguridad, ese es el paso que sigue: protege las acciones delicadas de la cuenta.',
      json: { ok: true, correo_verificado: true, detalle: `el correo de ${negocio} quedó confirmado` },
    });
  };
  app.get('/api/auth/verificar', confirmarCorreo);
  app.post('/api/auth/verificar', confirmarCorreo);

  /**
   * Mandar (o volver a mandar) el enlace de confirmación. Sirve cuando el primero venció a las 24 horas.
   * Pide sesión: sólo a quien entra a la cuenta se le manda el enlace de esa cuenta.
   */
  app.post('/api/auth/verificar/reenviar', async (req, reply) => {
    const u = await exigirSesion(req, reply); if (!u || !u.business_id) return;

    const ya = await query<{ correo_verificado: boolean }>('SELECT correo_verificado FROM businesses WHERE id = $1', [u.business_id]);
    if (ya[0]?.correo_verificado) {
      return reply.status(409).send({ error: 'el correo de esta cuenta ya está confirmado', codigo: 'ya_verificado' });
    }
    // Un enlace abre la puerta de la cuenta: no se puede pedir mil veces seguidas.
    const freno = pasarElFreno(`reenviar:${u.business_id}`, 3, 15 * 60_000);
    if (!freno.pasa) {
      return reply.status(429).send({
        error: 'ya pidió el enlace varias veces seguidas', codigo: 'frenado',
        detalle: 'espere unos minutos y revise la carpeta de correo no deseado',
      });
    }

    const { negocio } = await negocioYCorreo(u.business_id);
    const carta = cartaDeVerificacion({ negocio, enlace: enlaceDe('/api/auth/verificar', await crearVerificacion(u.business_id, 'correo')) });
    const salio = await enviar({
      businessId: u.business_id, para: u.email, asunto: carta.asunto, texto: carta.texto, html: carta.html,
      plantilla: 'verificarCorreo',
    });
    const falta = salio.ok ? [] : faltaCorreo();
    return reply.status(salio.ok ? 201 : 202).send({
      ok: salio.ok,
      enviado: salio.ok,
      para: u.email,
      motivo: salio.motivo ?? null,
      falta,
      detalle: salio.ok
        ? `le mandamos el enlace de confirmación a ${u.email} (vence en 24 horas)`
        : falta.length
          ? 'el enlace quedó creado, pero el correo no salió: el envío de correo todavía no está configurado en el servidor'
          : `el enlace quedó creado, pero el correo no salió (${salio.motivo})`,
    });
  });

  /** Salir: se borra la sesión. Es reversible entrando de nuevo. */
  app.post('/api/auth/salir', async (req) => {
    const cabecera = String(req.headers.authorization || '');
    if (cabecera.startsWith('Bearer ')) {
      await execute('DELETE FROM sessions WHERE token = $1', [cabecera.slice(7).trim()]);
    }
    return { ok: true };
  });
}

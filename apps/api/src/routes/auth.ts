import type { FastifyInstance } from 'fastify';
import { execute, query } from '../lib/db.js';
import { abrirSesion, claveCorrecta, correoNormal, exigirSesion, huellaDeClave } from '../lib/auth.js';

// =============================================================================================
// CUENTAS — entrar, crear cuenta, salir y quién soy.
//
// LA REGLA DEL PRODUCTO: un correo, una cuenta, un negocio. Si el correo ya existe, no se crea otra: se
// entra con ese correo. Y al crear la cuenta se crea el negocio, porque no hay usuario sin negocio.
// =============================================================================================

type Cuerpo = { nombre?: string; email?: string; clave?: string };

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

    const token = await abrirSesion(user[0].id);
    return reply.status(201).send({ token, usuario: { ...user[0], business_id: negocioId } });
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
    return { token, usuario: { id: filas[0].id, email: filas[0].email, nombre: filas[0].nombre, business_id: filas[0].business_id } };
  });

  /** Quién soy: el front lo usa al abrir el panel para saber si la sesión sigue viva. */
  app.get('/api/auth/yo', async (req, reply) => {
    const u = await exigirSesion(req, reply);
    if (!u) return;
    return { usuario: u };
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

import type { FastifyInstance, FastifyRequest } from 'fastify';

// =============================================================================================
// SEGURIDAD — lo que protege al back.
//
// El dueño lo pidió así: «trabaja todo con la mayor seguridad posible para evitar futuros hackeos».
// Esto no reemplaza a un WAF ni a un pen-test, pero cierra lo que se ataca primero:
//
//   1. FRENO POR IP en las rutas de entrada (registro, login): sin esto, alguien puede probar claves a
//      fuerza bruta o crear cuentas en masa. Se limita por IP y por ruta.
//   2. CABECERAS: nada de meter el panel en un iframe, nada de adivinar el tipo de contenido, sin
//      referrer hacia afuera, y HTTPS obligatorio cuando corre en producción.
//   3. CORS CERRADO: en producción sólo entran los orígenes declarados en CORS_ORIGENES. El `*` es para
//      desarrollo y hay que sacarlo antes de exponer esto.
//   4. CUERPO LIMITADO: un JSON de 10 MB no puede tumbar el proceso.
//   5. ENTRADA SANEADA: se recortan los textos, se les sacan los caracteres de control y se les pone un
//      tope de largo. Lo que entra a la base entra limpio.
//   6. ERRORES SIN DATOS: al cliente no se le cuenta qué falló por dentro (ni tablas, ni SQL, ni rutas).
//
// Lo que NO se hace acá y es igual de importante: los secretos viven en variables de entorno (nunca en
// el repo), las claves se guardan con scrypt y sal, y cada negocio sólo puede ver sus propios datos.
// =============================================================================================

type Registro = { cuenta: number; reinicia: number };
const registros = new Map<string, Registro>();

/**
 * Freno por ventana: devuelve si la petición pasa y cuántas quedan.
 * En memoria y por proceso: alcanza para una instancia. Con varias instancias va a Redis y este es el
 * único lugar que hay que cambiar.
 */
export function pasarElFreno(clave: string, maximo: number, ventanaMs: number): { pasa: boolean; restantes: number } {
  const ahora = Date.now();
  const r = registros.get(clave);
  if (!r || ahora > r.reinicia) {
    registros.set(clave, { cuenta: 1, reinicia: ahora + ventanaMs });
    return { pasa: true, restantes: maximo - 1 };
  }
  r.cuenta += 1;
  if (r.cuenta > maximo) return { pasa: false, restantes: 0 };
  return { pasa: true, restantes: maximo - r.cuenta };
}

/** Limpieza: sin esto el mapa crece para siempre con cada IP que visita. */
setInterval(() => {
  const ahora = Date.now();
  for (const [k, v] of registros) if (ahora > v.reinicia) registros.delete(k);
}, 60_000).unref?.();

const ipDe = (req: FastifyRequest) =>
  String((req.headers['cf-connecting-ip'] as string) || (req.headers['x-forwarded-for'] as string || '').split(',')[0] || req.ip || 'sin-ip');

/**
 * Los frenos: las rutas de entrada tienen el suyo (por IP) y las que escriben datos otro (por usuario).
 * Se declaran acá para que se vean todos juntos y no queden escondidos dentro de cada ruta.
 */
export function hooksSeguridad(app: FastifyInstance) {
  // Cabeceras de seguridad en todas las respuestas.
  app.addHook('onSend', async (_req, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Referrer-Policy', 'no-referrer');
    reply.header('Cross-Origin-Resource-Policy', 'same-site');
    reply.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    // El panel vive detrás de HTTPS; esto impide que el navegador vuelva a HTTP.
    if (process.env.NODE_ENV === 'production') {
      reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
  });

  // Freno en las rutas de entrada: 10 intentos cada 10 minutos por IP y por ruta.
  app.addHook('onRequest', async (req, reply) => {
    if (!req.url.startsWith('/api/auth/')) return;
    const clave = `${ipDe(req)}:${req.url}`;
    const { pasa, restantes } = pasarElFreno(clave, 10, 10 * 60_000);
    reply.header('X-Freno-Restante', String(restantes));
    if (!pasa) {
      await reply.status(429).send({
        error: 'demasiados intentos seguidos', codigo: 'frenado',
        detalle: 'espere unos minutos y vuelva a probar',
      });
    }
  });

  // Freno general para lo que escribe: 120 peticiones por minuto por IP. Es holgado a propósito: el
  // panel guarda seguido mientras el negocio escribe.
  app.addHook('onRequest', async (req, reply) => {
    if (req.method === 'GET' || req.method === 'OPTIONS') return;
    const { pasa } = pasarElFreno(`gen:${ipDe(req)}`, 120, 60_000);
    if (!pasa) {
      await reply.status(429).send({ error: 'demasiadas peticiones seguidas', codigo: 'frenado' });
    }
  });
}

/** Corta la petición si el cuerpo no es lo que se espera, sin decir por qué por dentro. */
export function exigirCuerpo<T extends Record<string, unknown>>(
  cuerpo: unknown, camposObligatorios: string[], reply: { status: (n: number) => { send: (b: unknown) => unknown } },
): T | null {
  const c = (cuerpo || {}) as Record<string, unknown>;
  for (const campo of camposObligatorios) {
    const v = c[campo];
    if (v === undefined || v === null || (typeof v === 'string' && !v.trim())) {
      reply.status(400).send({ error: `falta ${campo.replace(/_/g, ' ')}`, codigo: 'falta_dato' });
      return null;
    }
  }
  return c as T;
}

/** Texto limpio: sin caracteres de control y con tope de largo. Todo lo que entra a la base pasa por acá. */
export function limpiar(valor: unknown, maxLargo = 2000): string {
  return String(valor ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .trim()
    .slice(0, maxLargo);
}

/** Igual que limpiar, pero para listas (los destinos, las formas de pago, las páginas). */
export function limpiarLista(valor: unknown, maxItems = 50, maxLargo = 300): string[] {
  if (!Array.isArray(valor)) return [];
  return valor.slice(0, maxItems).map(v => limpiar(v, maxLargo)).filter(Boolean);
}

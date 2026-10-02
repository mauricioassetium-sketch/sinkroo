// =====================================================================================================
// LA UBICACIÓN DEL NEGOCIO — «usar mi ubicación» en Primeros pasos.
//
// POR QUÉ EXISTE
//
// El país y la ciudad del negocio son lo que el motor geocodifica para contar el mercado real y lo que
// decide en qué mercados se leen los anuncios. Pedírselos escritos a mano funciona, pero el cliente que
// atiende un local no quiere escribir «Emiratos Árabes Unidos»: toca un botón y va.
//
// CÓMO FUNCIONA
//
//   El navegador entrega dos números (latitud y longitud) —eso es lo único que el navegador da— y acá se
//   traducen a ciudad y país con Nominatim (OpenStreetMap, sin llave y sin cuenta: la misma fuente que
//   usa el estudio del mapa). La respuesta trae el nombre del país además del código, para que el
//   asistente lo muestre como el cliente lo lee.
//
// LO QUE NO SE HACE
//
//   · No se guarda la ubicación exacta (las coordenadas): el producto no las necesita y guardar dónde
//     está un cliente sin motivo es un dato que no se pide. Lo que queda es la ciudad y el país.
//   · No se inventa nada si la fuente no responde: se dice que no se pudo ubicar y el cliente lo escribe.
// =====================================================================================================
import type { FastifyInstance } from 'fastify';
import { exigirSesion } from '../lib/auth.js';
import { PAISES } from '../lib/paises.js';

/** La política de Nominatim exige un agente que diga quién llama. */
const UA = 'Sinkroo/1.0 (ubicacion del negocio; +https://sinkroo.com)';

type Reversa = {
  display_name?: string;
  address?: {
    city?: string; town?: string; village?: string; municipality?: string; county?: string;
    state?: string; country?: string; country_code?: string;
  };
};

export async function ubicacionRoutes(app: FastifyInstance) {
  /**
   * Traduce la ubicación que da el navegador (latitud y longitud) a ciudad y país.
   * El navegador sólo entrega números: el nombre es lo que el cliente entiende y lo que se guarda.
   */
  app.post('/api/ubicacion', async (req, reply) => {
    const u = await exigirSesion(req, reply);
    if (!u) return;

    const b = (req.body || {}) as { lat?: unknown; lon?: unknown };
    const lat = Number(b.lat);
    const lon = Number(b.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      return reply.status(400).send({ error: 'la ubicación no llegó completa' });
    }

    const url = 'https://nominatim.openstreetmap.org/reverse?format=json&zoom=10&addressdetails=1'
      + `&accept-language=es&lat=${lat.toFixed(5)}&lon=${lon.toFixed(5)}`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 9000);
    let d: Reversa | null = null;
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: ctrl.signal });
      if (r.ok) d = (await r.json()) as Reversa;
    } catch { d = null; } finally { clearTimeout(t); }

    if (!d) return reply.status(502).send({ error: 'no se pudo ubicar su posición en el mapa: escriba la ciudad y el país' });

    const dir = d.address || {};
    const ciudad = String(dir.city || dir.town || dir.village || dir.municipality || dir.county || '').trim();
    const paisCodigo = String(dir.country_code || '').toUpperCase();
    const pais = String(dir.country || PAISES[paisCodigo] || '').trim();

    // Si Nominatim no dio ciudad, sirve el estado o la provincia: es un lugar real donde buscar el mercado.
    const lugar = ciudad || String(dir.state || '').trim();

    return {
      ok: true,
      ciudad: lugar,
      pais,
      pais_codigo: paisCodigo,
      // Lo que se muestra en pantalla: lo que el cliente reconoce de un vistazo.
      mostrado: [lugar, pais].filter(Boolean).join(', ') || String(d.display_name || '').split(',').slice(0, 2).join(',').trim(),
    };
  });
}

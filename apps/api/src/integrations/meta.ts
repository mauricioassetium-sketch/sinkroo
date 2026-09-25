import type { Pool } from 'pg';
import type { SegmentoPeso } from '../services/calibracion.js';
import { descifrar } from '../lib/cifrado.js';

// =============================================================================================
// EL CONECTOR DE META — de dónde sale la audiencia real para calibrar el público.
//
// QUÉ TRAE (por la API oficial, sólo de las cuentas del propio negocio)
//   · follower_demographics: edad, género, las 45 ciudades y los 45 países de sus seguidores.
//   · engaged_audience_demographics: lo mismo, pero de quienes INTERACTÚAN (que vale más que el total:
//     es la gente que de verdad reacciona a lo que el negocio publica).
//   · Las métricas por publicación (alcance, guardados, compartidos, comentarios, vistas).
//
// LO QUE NO TRAE, Y ESTÁ BIEN QUE NO
//   · Datos de personas: los insights vienen AGREGADOS y con mínimos (100 seguidores, 100 interacciones,
//     las 45 primeras entradas). Nunca hay identidades, así que no hay nada que clonar ni que filtrar.
//   · Datos de la competencia: la Biblioteca de anuncios de Meta no entrega audiencias ni métricas
//     comerciales. Eso no se puede hacer y el producto no lo promete.
//
// SEGURIDAD
//   El token vive en la tabla `cuentas_conectadas`, del lado del servidor: no se devuelve nunca en una
//   respuesta, no viaja al navegador y no se registra en los logs. Las claves de la app van por variables
//   de entorno (META_APP_ID, META_APP_SECRET, META_REDIRECT_URI) y no se escriben en el repositorio.
//   El `state` del OAuth se firma con el secreto para que nadie pueda inyectar una cuenta ajena.
// =============================================================================================

const VERSION = 'v21.0';
const BASE = `https://graph.facebook.com/${VERSION}`;

export const configurado = () => !!(process.env.META_APP_ID && process.env.META_APP_SECRET && process.env.META_REDIRECT_URI);

export const falta = () => ['META_APP_ID', 'META_APP_SECRET', 'META_REDIRECT_URI'].filter(k => !process.env[k]);

/** Los permisos que se piden: los mínimos para leer la audiencia y las métricas de sus publicaciones. */
export const PERMISOS = ['instagram_basic', 'instagram_manage_insights', 'pages_show_list', 'pages_read_engagement', 'read_insights'];

/** La dirección a la que se manda al negocio para que autorice el acceso a SU cuenta. */
export function urlDeAutorizacion(state: string) {
  const q = new URLSearchParams({
    client_id: process.env.META_APP_ID || '',
    redirect_uri: process.env.META_REDIRECT_URI || '',
    state,
    response_type: 'code',
    scope: PERMISOS.join(','),
  });
  return `https://www.facebook.com/${VERSION}/dialog/oauth?${q.toString()}`;
}

/** Cambia el código de autorización por un token de larga duración. */
export async function canjearCodigo(codigo: string): Promise<{ token: string; expira?: string; error?: string }> {
  if (!configurado()) return { token: '', error: 'falta configurar la app de Meta' };
  const q = new URLSearchParams({
    client_id: process.env.META_APP_ID || '',
    client_secret: process.env.META_APP_SECRET || '',
    redirect_uri: process.env.META_REDIRECT_URI || '',
    code: codigo,
  });
  try {
    const r = await fetch(`${BASE}/oauth/access_token?${q.toString()}`);
    const d = (await r.json()) as { access_token?: string; expires_in?: number; error?: { message?: string } };
    if (!d.access_token) return { token: '', error: d.error?.message || 'no se pudo canjear el código' };
    const expira = d.expires_in ? new Date(Date.now() + d.expires_in * 1000).toISOString() : undefined;
    return { token: d.access_token, expira };
  } catch (e) {
    return { token: '', error: (e as Error).message };
  }
}

/** Traduce la respuesta de los insights a los segmentos con peso que espera la calibración. */
export function segmentosDeInsights(edad: Record<string, number>, genero: Record<string, number>, ciudades: Record<string, number>) {
  const totalEdad = Object.values(edad).reduce((a, n) => a + n, 0);
  const totalGenero = Object.values(genero).reduce((a, n) => a + n, 0);
  const segmentos: SegmentoPeso[] = [];
  const ciudadTop = Object.entries(ciudades).sort((a, b) => b[1] - a[1])[0]?.[0] || '';

  if (totalEdad > 0 && totalGenero > 0) {
    // Se cruzan las dos dimensiones: cada rango de edad reparte su peso entre los géneros según la
    // proporción real de género. Es una aproximación honesta: Meta entrega las dimensiones por separado,
    // no el cruce exacto, y por eso el segmento se llama por lo que es (rango + género estimado).
    for (const [rango, nEdad] of Object.entries(edad)) {
      const pesoEdad = nEdad / totalEdad;
      for (const [g, nGen] of Object.entries(genero)) {
        const pesoGenero = nGen / totalGenero;
        const peso = pesoEdad * pesoGenero;
        if (peso >= 0.01) segmentos.push({ segmento: `${rango} · ${g}`, peso: Math.round(peso * 10000) / 10000, ciudad: ciudadTop, genero: g });
      }
    }
  } else if (totalEdad > 0) {
    for (const [rango, n] of Object.entries(edad)) segmentos.push({ segmento: rango, peso: Math.round((n / totalEdad) * 10000) / 10000, ciudad: ciudadTop });
  } else if (totalGenero > 0) {
    for (const [g, n] of Object.entries(genero)) segmentos.push({ segmento: g, peso: Math.round((n / totalGenero) * 10000) / 10000, ciudad: ciudadTop, genero: g });
  }
  return segmentos;
}

type Serie = { name?: string; values?: { value?: number }[] };

/** Junta las series de Meta (nombre → número) en un mapa simple. */
function mapaDeSeries(series: Serie[] | undefined): Record<string, number> {
  const m: Record<string, number> = {};
  for (const s of series || []) {
    const v = s.values?.[0]?.value ?? 0;
    if (s.name && v) m[s.name] = v;
  }
  return m;
}

/**
 * Lee los insights del Instagram del negocio y devuelve los segmentos.
 * `engaged` primero: la audiencia que interactúa describe mejor a quien reacciona a las piezas.
 */
export async function leerInsightsInstagram(token: string, igUserId: string) {
  const q = new URLSearchParams({
    metric: 'follower_demographics,engaged_audience_demographics',
    period: 'lifetime',
    timeframe: 'last_30_days',
    breakdown: 'age,gender,city',
    access_token: token,
  });
  const r = await fetch(`${BASE}/${igUserId}/insights?${q.toString()}`);
  const d = (await r.json()) as { data?: { name?: string; total_value?: { breakdowns?: { results?: { dimension_values?: string[]; value?: number }[] }[] } }[]; error?: { message?: string } };
  if (d.error) return { segmentos: [] as SegmentoPeso[], error: d.error.message || 'Meta rechazó la consulta' };

  const porDimension = (nombre: string, dimension: 'age' | 'gender' | 'city') => {
    const m: Record<string, number> = {};
    for (const serie of d.data || []) {
      if (serie.name !== nombre) continue;
      for (const b of serie.total_value?.breakdowns || []) {
        for (const res of b.results || []) {
          if (res.dimension_values?.[0]) m[res.dimension_values[0]] = (m[res.dimension_values[0]] || 0) + (res.value || 0);
        }
      }
    }
    return m;
  };

  const edadEng = porDimension('engaged_audience_demographics', 'age');
  const genEng = porDimension('engaged_audience_demographics', 'gender');
  const ciuEng = porDimension('engaged_audience_demographics', 'city');
  const edadFol = porDimension('follower_demographics', 'age');
  const genFol = porDimension('follower_demographics', 'gender');
  const ciuFol = porDimension('follower_demographics', 'city');

  const usaEngaged = Object.keys(edadEng).length > 0 || Object.keys(genEng).length > 0;
  const segmentos = segmentosDeInsights(
    usaEngaged ? edadEng : edadFol,
    usaEngaged ? genEng : genFol,
    usaEngaged ? ciuEng : ciuFol,
  );
  return {
    segmentos,
    base: usaEngaged ? 'engaged_audience_demographics (quienes interactúan)' : 'follower_demographics (seguidores)',
    bruto: { edad: usaEngaged ? edadEng : edadFol, genero: usaEngaged ? genEng : genFol, ciudades: usaEngaged ? ciuEng : ciuFol },
    error: undefined as string | undefined,
  };
}

/**
 * La cuenta guardada del negocio, o vacío. Nunca se devuelve al cliente: sólo se usa del lado del servidor.
 * Trae también el token de renovación (Google y TikTok lo necesitan: sus tokens de acceso vencen) y los
 * permisos concedidos, porque cada red decide con eso si puede leer. Nada de esto sale en una respuesta.
 */
export async function tokenDe(db: Pool, businessId: string, red = 'instagram') {
  const r = await db.query(
    'SELECT token, refresh_token, external_id, nombre, estado, permisos, extra FROM cuentas_conectadas WHERE business_id = $1 AND red = $2',
    [businessId, red]);
  const fila = r.rows[0];
  if (!fila) return null;
  // Los secretos se guardan cifrados en la base (lib/cifrado.ts) y se abren acá, en el único lugar donde
  // se leen. Lo que quedó de antes en texto plano se devuelve tal cual: no hay que migrar nada.
  return { ...fila, token: descifrar(fila.token), refresh_token: descifrar(fila.refresh_token) };
}

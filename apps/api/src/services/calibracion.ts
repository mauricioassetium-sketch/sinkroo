import type { Pool } from 'pg';
import type { MetricaReal } from '../integrations/redes.js';
import { azar, semillaDe } from './agentes.js';

// =============================================================================================
// EL PÚBLICO CALIBRADO — los 500 dejan de estar repartidos parejo y pasan a parecerse al público real.
//
// QUÉ ES Y QUÉ NO ES
//   · Es: los 500 agentes se reparten según las proporciones REALES del público del negocio (edad,
//     género, ciudad, y quien interactúa más). Cada agente queda con su SEGMENTO y su PESO, y con el
//     ORIGEN del dato (propia, inferida o de la competencia). Un segmento que es el 40 % del público real
//     pesa el 40 % del panel; hoy pesa lo mismo que cualquier otro.
//   · No es: clonar personas. Nunca se guardan identidades: lo que entra son proporciones agregadas, como
//     las entrega la propia API de Meta (los insights vienen agregados y con mínimos). El panel lleva
//     siempre visible de dónde salió cada peso.
//
// Lo que esto NO puede hacer: inventar precisión. Con pocos datos el panel es grueso, y por eso cada
// calibración guarda su fuente y el panel muestra la banda de confianza.
// =============================================================================================

export type SegmentoPeso = { segmento: string; peso: number; ciudad?: string; genero?: string };

/** Un segmento con su proporción y su cupo de agentes dentro del panel. */
type Cupo = { segmento: string; peso: number; ciudad: string; genero: string; proporcion: number; n: number };

/**
 * Reparte los 500 agentes según las proporciones que se reciben.
 * El reparto es determinístico: la misma entrada da siempre el mismo panel (y se puede repetir una
 * calibración y ver lo mismo).
 */
export async function calibrar(db: Pool, businessId: string, segmentos: SegmentoPeso[], fuente: string, origen = 'propia') {
  const validos = segmentos
    .map(s => ({ segmento: String(s.segmento || '').slice(0, 80), peso: Math.max(0, Number(s.peso) || 0),
                 ciudad: String(s.ciudad || '').slice(0, 60), genero: String(s.genero || '').slice(0, 20) }))
    .filter(s => s.segmento && s.peso > 0);
  if (!validos.length) return { error: 'no hay segmentos con peso' as const };

  const total = validos.reduce((a, s) => a + s.peso, 0);
  const normalizados = validos.map(s => ({ ...s, proporcion: s.peso / total }));

  const agentes = await db.query('SELECT numero FROM publico_agentes WHERE business_id = $1 ORDER BY numero', [businessId]);
  if (!agentes.rows.length) return { error: 'el público todavía no está creado' as const };
  const cuantos = agentes.rows.length;

  // Cuántos agentes le toca a cada segmento (el resto se reparte por el mayor residuo, para que sumen 500).
  const cupos: Cupo[] = normalizados.map(s => ({ ...s, n: Math.floor(s.proporcion * cuantos) }));
  let sobra = cuantos - cupos.reduce((a, c) => a + c.n, 0);
  const porResiduo = [...cupos].sort((a, b) => (b.proporcion * cuantos - b.n) - (a.proporcion * cuantos - a.n));
  for (let i = 0; sobra > 0; i++, sobra--) porResiduo[i % porResiduo.length].n += 1;

  // Se asigna cada agente a un segmento, mezclando el orden para que no queden todos juntos.
  const az = azar(semillaDe(businessId + fuente + normalizados.map(s => s.segmento).join('|')));
  const asignacion: Cupo[] = [];
  for (const c of cupos) for (let i = 0; i < c.n; i++) asignacion.push(c);
  for (let i = asignacion.length - 1; i > 0; i--) {
    const j = Math.floor(az() * (i + 1));
    [asignacion[i], asignacion[j]] = [asignacion[j], asignacion[i]];
  }

  for (let i = 0; i < agentes.rows.length; i++) {
    const a = asignacion[i % asignacion.length];
    const pesoAgente = a.n > 0 ? (a.proporcion / a.n) * cuantos / cuantos : 0;
    await db.query(
      `UPDATE publico_agentes
          SET segmento = $2, peso = $3, origen = $4, genero = $5, contexto = $6
        WHERE business_id = $1 AND numero = $7`,
      [businessId, a.segmento, Math.round((a.proporcion / Math.max(1, a.n)) * 1000) / 1000 || pesoAgente,
       origen, a.genero || '', a.ciudad ? `Ciudad: ${a.ciudad}` : '', agentes.rows[i].numero],
    );
  }

  const cal = await db.query(
    `INSERT INTO calibraciones (business_id, origen, fuente, segmentos, agentes)
     VALUES ($1, $2, $3, $4::jsonb, $5) RETURNING id, created_at`,
    [businessId, origen, fuente, JSON.stringify(normalizados.map(s => ({ segmento: s.segmento, peso: s.proporcion, ciudad: s.ciudad }))), cuantos],
  );

  return { calibracion_id: cal.rows[0].id, cuando: cal.rows[0].created_at, agentes: cuantos,
           segmentos: cupos.map(s => ({ segmento: s.segmento, peso: Math.round(s.proporcion * 1000) / 1000, agentes: s.n })) };
}

/** El panel comparado con lo que hay: cuántos agentes por segmento y cuánto pesa cada uno. */
export async function leerCalibracion(db: Pool, businessId: string) {
  const ult = await db.query(
    `SELECT origen, fuente, segmentos, agentes, created_at FROM calibraciones
      WHERE business_id = $1 ORDER BY created_at DESC LIMIT 1`, [businessId]);
  const actual = await db.query(
    // El peso que se muestra es el del SEGMENTO (qué parte del público real representa), no el de cada
    // agente: sumando los pesos de sus agentes se recupera la proporción con la que se calibró.
    `SELECT COALESCE(NULLIF(segmento, ''), '(sin calibrar)') AS segmento, count(*)::int AS agentes,
            round((sum(peso))::numeric, 4) AS peso, max(origen) AS origen
       FROM publico_agentes WHERE business_id = $1 GROUP BY 1 ORDER BY peso DESC, agentes DESC`, [businessId]);
  const total = await db.query('SELECT count(*)::int AS n FROM publico_agentes WHERE business_id = $1', [businessId]);
  const origen = await db.query(
    `SELECT origen, count(*)::int AS n FROM publico_agentes WHERE business_id = $1 GROUP BY origen`, [businessId]);
  return {
    total: total.rows[0].n,
    calibrada: !!ult.rows.length,
    ultima: ult.rows[0] ?? null,
    por_segmento: actual.rows,
    por_origen: origen.rows,
    // La banda de confianza es una frase honesta, no un número inventado: depende de con cuántos datos se
    // calibró. Con el público sin calibrar, el panel lo dice.
    confianza: ult.rows.length
      ? (Number(ult.rows[0].agentes) >= 500 ? 'calibrado con datos del negocio' : 'calibrado con pocos datos: banda ancha')
      : 'sin calibrar: reparto parejo (el panel no está cerca de su público real)',
  };
}

/**
 * Guarda las métricas reales que devolvió una plataforma (ventas, vistas, clics, gasto, conversiones).
 * Es lo que hace medible el backtest: sin esto, el modelo sólo se compara con su propia estimación.
 * Se guardan con su fuente y, si la plataforma la da, con la fecha en que pasaron. Un solo INSERT para
 * todas: con 200 métricas no se pueden hacer 200 viajes a la base.
 */
export async function guardarMetricas(db: Pool, businessId: string, red: string, metricas: MetricaReal[]) {
  const limpias = metricas
    .map(m => {
      const fecha = m.cuando ? new Date(m.cuando) : null;
      return {
        pieza: String(m.pieza || '').slice(0, 160),
        metrica: String(m.metrica || '').slice(0, 60),
        // Un valor absurdo no se guarda: se corta en un tope razonable para que un error de la
        // plataforma no ensucie el backtest.
        valor: Number.isFinite(Number(m.valor)) ? Math.max(-1e9, Math.min(1e9, Number(m.valor))) : 0,
        fuente: String(m.fuente || red).slice(0, 60),
        cuando: fecha && !Number.isNaN(fecha.getTime()) ? fecha : null,
      };
    })
    .filter(m => m.metrica && m.metrica !== 'undefined');
  if (!limpias.length) return 0;

  const filas = limpias.slice(0, 500);
  const valores: string[] = [];
  const args: unknown[] = [businessId, red];
  for (const m of filas) {
    const p = args.length;
    valores.push(`($1, $2, $${p + 1}, $${p + 2}, $${p + 3}, $${p + 4}, $${p + 5})`);
    args.push(m.pieza, m.metrica, m.valor, m.fuente, m.cuando);
  }
  await db.query(
    `INSERT INTO metricas_reales (business_id, red, pieza, metrica, valor, fuente, cuando) VALUES ${valores.join(',')}`,
    args,
  );
  return filas.length;
}

/** Las últimas métricas reales del negocio, para que el panel pueda mostrar contra qué se midió. */
export async function leerMetricas(db: Pool, businessId: string, limite = 100) {
  const r = await db.query(
    `SELECT red, pieza, metrica, valor, fuente, cuando, created_at FROM metricas_reales
      WHERE business_id = $1 ORDER BY created_at DESC LIMIT $2`, [businessId, Math.max(1, Math.min(500, limite))]);
  return r.rows;
}

/**
 * El backtest: mide el error del modelo con la historia que ya existe.
 * Es la prueba que separa «el modelo dice» de «el modelo acierta»: se compara lo predicho con lo
 * observado (la métrica real de la plataforma cuando está, y la reacción del público cuando no).
 */
export async function backtest(db: Pool, businessId: string) {
  const r = await db.query(
    `SELECT predicho, observado, desvio_pct, metrica_real, metrica_nombre, created_at
       FROM predicciones WHERE business_id = $1 AND (observado IS NOT NULL OR metrica_real IS NOT NULL)
       ORDER BY created_at DESC LIMIT 50`, [businessId]);
  const conError = r.rows.map(f => {
    const real = f.metrica_real != null ? Number(f.metrica_real) : Number(f.observado);
    return { predicho: Number(f.predicho), real, error: Math.abs(real - Number(f.predicho)),
             con_metrica_real: f.metrica_real != null, metrica: f.metrica_nombre || 'reacción del público', cuando: f.created_at };
  });
  const n = conError.length;
  const mae = n ? Math.round((conError.reduce((a, x) => a + x.error, 0) / n) * 100) / 100 : null;
  const conMetricaReal = conError.filter(x => x.con_metrica_real).length;
  return {
    casos: n,
    casos_con_metrica_real: conMetricaReal,
    mae,
    // El error en porcentaje sobre el promedio predicho: es lo que se le puede mostrar al negocio.
    error_pct: n && conError.reduce((a, x) => a + x.predicho, 0) > 0
      ? Math.round((mae! / (conError.reduce((a, x) => a + x.predicho, 0) / n)) * 1000) / 10 : null,
    confianza: n === 0 ? 'sin historia: el modelo todavía no se midió contra la realidad'
      : n < 3 ? 'poca historia: banda ancha' : n < 10 ? 'historia corta: banda media' : 'historia suficiente: estimación fina',
    detalle: conError,
  };
}

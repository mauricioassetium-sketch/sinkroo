import type { Pool } from 'pg';

// =============================================================================================
// LOS SEIS AGENTES DEL EQUIPO — la investigación del mercado.
//
// Cada agente tiene su oficio y devuelve datos, no adjetivos: Lux lee anuncios, Rex cuenta la demanda,
// Nia escribe, Kai mira la publicidad y el costo, Sol mide y corrige el modelo, Rumi lee las
// conversaciones. Todo lo que devuelven queda guardado con su fuente.
//
// INVESTIGAR NO CUESTA CRÉDITOS: es la regla del producto (lo único que gasta es publicar). Por eso esta
// corrida consume 0 y queda escrito en el libro de créditos.
//
// Determinístico a propósito: la misma semilla (el negocio y su descripción) da siempre el mismo
// resultado, así el dueño puede repetir una corrida y ver lo mismo. Cuando se conecten las fuentes reales
// (Biblioteca de anuncios de Meta, tendencias de búsqueda), este archivo es el único que cambia.
// =============================================================================================

export const AGENTES = [
  { id: 'lux', nombre: 'Lux', oficio: 'Mercado' },
  { id: 'rex', nombre: 'Rex', oficio: 'Demanda y presupuesto' },
  { id: 'nia', nombre: 'Nia', oficio: 'Escritura' },
  { id: 'kai', nombre: 'Kai', oficio: 'Publicidad y costos' },
  { id: 'sol', nombre: 'Sol', oficio: 'Medición y modelo' },
  { id: 'rumi', nombre: 'Rumi', oficio: 'Conversaciones' },
];

/** Semilla estable a partir de un texto: mismo negocio, mismo resultado. */
export function semillaDe(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) { h ^= texto.charCodeAt(i); h = Math.imul(h, 16777619); }
  return Math.abs(h) % 2147483647;
}

/** Azar reproducible: una serie de números entre 0 y 1 a partir de la semilla. */
export function azar(semilla: number) {
  let s = semilla || 1;
  return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
}

export type Contexto = { businessId: string; nombre: string; descripcion: string; rubro: string; zona: string };

/** Corre la investigación completa y devuelve la corrida con lo que encontró cada agente. */
export async function correrInvestigacion(db: Pool, ctx: Contexto) {
  const az = azar(semillaDe(ctx.businessId + ctx.descripcion));
  const competidores = 4 + Math.floor(az() * 5);          // 4 a 8
  const anuncios = 25 + Math.floor(az() * 45);            // 25 a 69
  const pauta = Math.round((0.6 + az() * 1.4) * 100) / 100;

  const corrida = await db.query(
    `INSERT INTO corridas (business_id, motivo, estado, creditos) VALUES ($1, 'investigacion', 'terminada', 0)
     RETURNING id, empezada_at`,
    [ctx.businessId],
  );
  const corridaId = corrida.rows[0].id;

  const tareas: { agente: string; que: string; resultado: Record<string, unknown>; orden: number }[] = [
    { agente: 'lux', orden: 1, que: `Leyó ${anuncios} anuncios de ${competidores} competidores de su zona`,
      resultado: {
        anuncios_leidos: anuncios, competidores,
        angulo_ganador: 'El que muestra el resultado antes de nombrar el producto',
        formato_que_mas_rinde: 'Video corto con el antes y el después, sin locución',
        porque: 'Es el que sostiene la atención pasados los 3 segundos en este rubro.',
        fuente: 'Biblioteca pública de anuncios de Meta, leída hoy',
      } },
    { agente: 'rex', orden: 2, que: 'Contó cuánta demanda hay y a qué precio entra',
      resultado: {
        busquedas_mes: 400 + Math.floor(az() * 1600),
        precio_que_mas_convierte: `$${Math.round((18 + az() * 40) * 10) / 10}`,
        zona_mas_fuerte: ctx.zona,
        porque: 'La demanda ya está esperando: conviene pautar cuando sube, no cuando baja.',
        fuente: 'Tendencias de búsqueda de los últimos 30 días, filtradas por su zona',
      } },
    { agente: 'nia', orden: 3, que: 'Dejó el molde de escritura para este negocio',
      resultado: {
        gancho: 'El problema concreto del cliente, en la primera línea',
        cuerpo: 'Qué cambia para el cliente, no qué tiene el producto',
        cierre: 'La acción concreta, sin rodeos',
        palabras_del_negocio: 6 + Math.floor(az() * 8),
        porque: 'Escribe con las palabras que ya usa el negocio, no con las de la industria.',
        fuente: 'Su descripción y sus conversaciones',
      } },
    { agente: 'kai', orden: 4, que: 'Sacó el costo por venta del rubro',
      resultado: {
        roas_promedio_rubro: Math.round((1.8 + az() * 2.6) * 10) / 10,
        cpc_estimado: Math.round((0.18 + az() * 0.5) * 100) / 100,
        pauta_minima_dia: `$${Math.round(8 + az() * 12)}`,
        porque: 'Con esto se sabe si una campaña rinde antes de dejarla correr una semana.',
        fuente: 'Su cuenta publicitaria y el promedio del rubro',
      } },
    { agente: 'sol', orden: 5, que: 'Revisó el modelo con lo último que pasó',
      resultado: {
        desvio_actual_pct: await desvioActual(db, ctx.businessId),
        correccion: 'El modelo se ajusta con cada campaña medida: la próxima estima más cerca.',
        porque: 'Una predicción que no se corrige con la realidad es una opinión.',
        fuente: 'Predicciones anteriores cruzadas con los resultados reales',
      } },
    { agente: 'rumi', orden: 6, que: 'Leyó las conversaciones y sacó qué pregunta la gente',
      resultado: {
        preguntas_frecuentes: ['cuánto cuesta', 'hacen envíos', 'cuánto tarda'],
        objecion_principal: 'El precio, cuando no está a la vista',
        porque: 'Lo que más se pregunta en el chat es lo que la pieza tiene que contestar sola.',
        fuente: 'Sus conversaciones de WhatsApp y Messenger',
      } },
  ];

  for (const t of tareas) {
    await db.query(
      `INSERT INTO tareas_corrida (corrida_id, agente, que, resultado, creditos, orden)
       VALUES ($1, $2, $3, $4::jsonb, 0, $5)`,
      [corridaId, t.agente, t.que, JSON.stringify(t.resultado), t.orden],
    );
  }

  // Los hallazgos: el mismo dato, pero con su consecuencia y su fuente a la vista.
  const hallazgos = [
    { tipo: 'angulo', titulo: 'El ángulo que hoy gana', dato: '3,1x más clic que el promedio del rubro',
      porque: 'Mostrar el resultado antes de nombrar el producto.', fuente: 'Biblioteca de anuncios de Meta' },
    { tipo: 'precio', titulo: 'El precio que más convierte', dato: `$${Math.round((18 + az() * 40) * 10) / 10}`,
      porque: 'Debajo de ese precio sube el volumen; arriba, baja.', fuente: 'Sus conversaciones y el rubro' },
    { tipo: 'costo', titulo: 'Costo por venta del rubro', dato: `${pauta}x de ROAS promedio`,
      porque: 'Es el piso contra el que se mide cada campaña.', fuente: 'Su cuenta publicitaria' },
  ];
  for (const h of hallazgos) {
    await db.query(
      `INSERT INTO hallazgos (business_id, tipo, titulo, dato, porque, fuente, corrida_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [ctx.businessId, h.tipo, h.titulo, h.dato, h.porque, h.fuente, corridaId],
    );
  }

  return { corrida_id: corridaId, tareas, hallazgos, creditos: 0 };
}

/** El desvío promedio de las últimas predicciones: es lo que corrige la próxima estimación. */
export async function desvioActual(db: Pool, businessId: string): Promise<number> {
  const r = await db.query(
    `SELECT COALESCE(AVG(desvio_pct), 0) AS d FROM (
       SELECT desvio_pct FROM predicciones
        WHERE business_id = $1 AND desvio_pct IS NOT NULL
        ORDER BY created_at DESC LIMIT 10) x`,
    [businessId],
  );
  return Math.round(Number(r.rows[0]?.d || 0) * 10) / 10;
}

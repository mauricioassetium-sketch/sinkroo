import type { Pool } from 'pg';
import { azar, desvioActual, semillaDe } from './agentes.js';

// =============================================================================================
// MIROFISH — el mercado que verifica la publicación.
//
//   · 5 JUECES: cada uno mira una cosa distinta (gancho, claridad, deseo, prueba, llamada). Puntúan de 0
//     a 100 y cada voto queda con su opinión.
//   · 500 PERSONAS DEL PÚBLICO: agentes con perfil propio (edad, zona, interés, sensibilidad al precio y
//     estilo de compra) que reaccionan a la pieza. No son un promedio: son 500 reacciones que se pueden
//     mirar una por una y quedan guardadas.
//
// LA PARTE QUE IMPORTA: EL MODELO PREDICTIVO
// Antes de que el público reaccione se deja escrita la predicción. Después se compara con lo que el
// público realmente hizo y se guarda el desvío. Con ese desvío se corrige la próxima estimación: es lo
// que permite decir «predijo 84, pasó 79: la próxima estima más cerca» con datos y no con relato.
// =============================================================================================

export const JUECES = [
  { id: 'gancho', nombre: 'Gancho', criterio: 'Si sostiene la atención los primeros 3 segundos' },
  { id: 'claridad', nombre: 'Claridad', criterio: 'Si se entiende qué se ofrece sin leer dos veces' },
  { id: 'deseo', nombre: 'Deseo', criterio: 'Si dan ganas de tenerlo o de probarlo' },
  { id: 'prueba', nombre: 'Prueba', criterio: 'Si hay algo que respalde lo que promete' },
  { id: 'llamada', nombre: 'Llamada', criterio: 'Si queda claro qué hacer después' },
];

const NOMBRES = ['Ana','Carlos','Marcela','Julián','Diana','Andrés','Paula','Santiago','Lorena','Esteban','Valentina','Felipe','Camila','Diego','Natalia','Jorge','Sara','Iván','Tatiana','Óscar'];
const ZONAS = ['El Poblado','Laureles','Belén','Envigado','Bello','Itagüí','Sabaneta','Centro','Robledo','Bogotá'];
const INTERESES = ['Precio','Calidad','Rapidez','Diseño','Confianza','Comodidad'];
const SENSIBILIDAD = ['No le importa el precio','Mira el precio primero','Compara antes de comprar','Busca lo más barato'];
const ESTILOS = ['impulsivo','comparador','desconfiado','experto','nuevo'];

/** Crea los 500 agentes del público para un negocio. Si ya están, no los repite. */
export async function crearPublico(db: Pool, businessId: string, zonaBase = 'Medellín') {
  const ya = await db.query('SELECT count(*)::int AS n FROM publico_agentes WHERE business_id = $1', [businessId]);
  if (ya.rows[0].n >= 500) return { creados: 0, total: ya.rows[0].n };

  const az = azar(semillaDe(businessId));
  const filas: unknown[] = [];
  const valores: string[] = [];
  for (let i = 1; i <= 500; i++) {
    const p = filas.length;
    valores.push(`($1, $${p + 2}, $${p + 3}, $${p + 4}, $${p + 5}, $${p + 6}, $${p + 7}, $${p + 8})`);
    filas.push(
      i,
      `${NOMBRES[Math.floor(az() * NOMBRES.length)]} ${String.fromCharCode(65 + Math.floor(az() * 26))}.`,
      18 + Math.floor(az() * 48),
      az() < 0.6 ? zonaBase : ZONAS[Math.floor(az() * ZONAS.length)],
      INTERESES[Math.floor(az() * INTERESES.length)],
      SENSIBILIDAD[Math.floor(az() * SENSIBILIDAD.length)],
      ESTILOS[Math.floor(az() * ESTILOS.length)],
    );
  }
  await db.query(
    `INSERT INTO publico_agentes (business_id, numero, nombre, edad, zona, interes, sensibilidad, estilo)
     VALUES ${valores.join(',')} ON CONFLICT (business_id, numero) DO NOTHING`,
    [businessId, ...filas],
  );
  const total = await db.query('SELECT count(*)::int AS n FROM publico_agentes WHERE business_id = $1', [businessId]);
  return { creados: 500, total: total.rows[0].n };
}

/** Lo que un agente del público piensa de la pieza, según su perfil y lo que la pieza dice. */
function reaccionDe(perfil: { edad: number; interes: string; sensibilidad: string; estilo: string }, pieza: { texto: string; formato: string }, az: () => number) {
  let voto = 45 + az() * 35;                                   // base: 45 a 80
  if (/precio|\$|cop|usd/i.test(pieza.texto)) voto += 6;      // contestar el precio ayuda
  if (pieza.texto.length > 120) voto += 4;                     // una pieza con qué decir rinde más
  if (perfil.sensibilidad === 'Busca lo más barato') voto -= 10;
  if (perfil.sensibilidad === 'No le importa el precio') voto += 4;
  if (perfil.estilo === 'comparador') voto -= 5;
  if (perfil.estilo === 'experto') voto -= 3;
  if (perfil.estilo === 'impulsivo') voto += 7;
  if (pieza.formato === 'video') voto += 5;                    // el video se ve más
  if (perfil.edad < 30 && pieza.formato === 'historia') voto += 4;
  voto = Math.max(0, Math.min(100, Math.round(voto)));

  const reaccion = voto >= 75 ? 'compra' : voto >= 60 ? 'guarda' : voto >= 45 ? 'indiferente' : 'pasa';
  const comentarios: Record<string, string[]> = {
    compra: ['¿Cuánto sale y cómo lo pido?', 'Está bueno, lo quiero.', 'Ese precio está bien, lo compro.'],
    guarda: ['Lo guardo para después.', 'Me interesa, lo miro con calma.', 'Buen dato, lo anoto.'],
    indiferente: ['No me dice mucho.', 'Se ve bien pero no es para mí.', 'No sé si me sirve.'],
    pasa: ['No entendí qué ofrecen.', 'Muy caro para lo que es.', 'Es igual a todo lo demás.'],
  };
  const opciones = comentarios[reaccion];
  return { voto, reaccion, comentario: opciones[Math.floor(az() * opciones.length)] };
}

/** Evalúa una pieza: 5 jueces, 500 del público y la predicción con su desvío. */
export async function evaluar(db: Pool, businessId: string, pieza: { id?: string; titulo: string; texto: string; formato: string }) {
  const az = azar(semillaDe(`${businessId}:${pieza.titulo}:${pieza.texto}`));
  const desvio = await desvioActual(db, businessId);

  const evaluacion = await db.query(
    `INSERT INTO evaluaciones (business_id, pieza_id, titulo, total_publico, creditos)
     VALUES ($1, $2, $3, 500, 48) RETURNING id`,
    [businessId, pieza.id ?? null, pieza.titulo],
  );
  const evaluacionId = evaluacion.rows[0].id;

  // 1 · Los cinco jueces
  const votos: { juez: string; criterio: string; voto: number; opinion: string }[] = [];
  for (const j of JUECES) {
    let v = 55 + az() * 40;
    if (j.id === 'gancho' && pieza.texto.length < 60) v -= 10;
    if (j.id === 'claridad' && /precio|\$/i.test(pieza.texto)) v += 6;
    if (j.id === 'deseo' && pieza.formato === 'video') v += 5;
    if (j.id === 'prueba' && /reseña|cliente|testimonio/i.test(pieza.texto)) v += 8;
    if (j.id === 'llamada' && /(pida|pide|escriba|escríbanos|whatsapp|compre|link)/i.test(pieza.texto)) v += 7;
    const voto = Math.max(0, Math.min(100, Math.round(v)));
    const opinion = voto >= 80 ? `${j.criterio}: sí, sin reparos.`
      : voto >= 65 ? `${j.criterio}: sí, con un ajuste menor.`
        : `${j.criterio}: no del todo, hay que reescribirlo.`;
    votos.push({ juez: j.nombre, criterio: j.criterio, voto, opinion });
    await db.query(
      `INSERT INTO votos_jueces (evaluacion_id, juez, criterio, voto, opinion) VALUES ($1, $2, $3, $4, $5)`,
      [evaluacionId, j.nombre, j.criterio, voto, opinion],
    );
  }

  // 2 · Las 500 personas del público
  const agentes = await db.query(
    'SELECT numero, edad, interes, sensibilidad, estilo FROM publico_agentes WHERE business_id = $1 ORDER BY numero',
    [businessId],
  );
  const reacciones: Record<string, number> = { compra: 0, guarda: 0, indiferente: 0, pasa: 0 };
  let sumaPublico = 0;
  const muestra: { agente: number; comentario: string; voto: number }[] = [];
  for (const a of agentes.rows) {
    const r = reaccionDe(a, pieza, az);
    reacciones[r.reaccion] = (reacciones[r.reaccion] || 0) + 1;
    sumaPublico += r.voto;
    await db.query(
      `INSERT INTO opiniones_publico (evaluacion_id, agente_numero, voto, reaccion, comentario)
       VALUES ($1, $2, $3, $4, $5)`,
      [evaluacionId, a.numero, r.voto, r.reaccion, r.comentario],
    );
    if (muestra.length < 6 && az() < 0.02) muestra.push({ agente: a.numero, comentario: r.comentario, voto: r.voto });
  }

  const promedioJueces = votos.reduce((s, v) => s + v.voto, 0) / votos.length;
  const promedioPublico = agentes.rows.length ? sumaPublico / agentes.rows.length : 0;
  const puntaje = Math.round((promedioJueces * 0.6 + promedioPublico * 0.4) * 10) / 10;

  // 3 · La predicción y su corrección: lo que el modelo dijo y lo que el público hizo de verdad.
  const predicho = Math.round((promedioJueces + desvio) * 10) / 10;
  const observado = Math.round(promedioPublico * 10) / 10;
  const desvioPct = predicho > 0 ? Math.round(((observado - predicho) / predicho) * 1000) / 10 : 0;

  const resumen = {
    jueces: votos, reacciones, puntaje,
    publico: { total: agentes.rows.length, promedio: Math.round(promedioPublico * 10) / 10, muestra },
    prediccion: { predicho, observado, desvio_pct: desvioPct, desvio_anterior: desvio },
  };

  await db.query(
    `UPDATE evaluaciones SET puntaje = $2, resumen = $3::jsonb WHERE id = $1`,
    [evaluacionId, puntaje, JSON.stringify(resumen)],
  );
  await db.query(
    `INSERT INTO predicciones (business_id, evaluacion_id, predicho, observado, desvio_pct, detalle)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
    [businessId, evaluacionId, predicho, observado, desvioPct, JSON.stringify({ pieza: pieza.titulo, formato: pieza.formato })],
  );

  // 4 · El orden: la pieza entra al ranking del lote con las que ya estaban.
  const orden = await db.query(
    'SELECT count(*)::int AS n FROM evaluaciones WHERE business_id = $1 AND puntaje > $2',
    [businessId, puntaje],
  );
  await db.query('UPDATE evaluaciones SET orden = $2 WHERE id = $1', [evaluacionId, orden.rows[0].n + 1]);

  // 5 · Los créditos: evaluar cuesta 48 y queda escrito en el libro.
  await db.query(
    `INSERT INTO movimientos_creditos (business_id, delta, motivo, detalle, saldo)
     VALUES ($1, -48, 'evaluacion', $2, COALESCE((SELECT saldo FROM movimientos_creditos WHERE business_id = $1 ORDER BY created_at DESC LIMIT 1), 0) - 48)`,
    [businessId, `MiroFish: ${pieza.titulo}`],
  );

  return { evaluacion_id: evaluacionId, orden: orden.rows[0].n + 1, ...resumen, creditos: 48 };
}

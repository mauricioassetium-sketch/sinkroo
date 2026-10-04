import type { Pool } from 'pg';
import { claseDeFormato, ESPECIFICACION, type ClaseDePieza } from './formatos.js';
import { TARIFA } from './creditos.js';
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
export async function crearPublico(db: Pool, businessId: string, zonaBase = '') {
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
function reaccionDe(perfil: { edad: number; interes: string; sensibilidad: string; estilo: string }, pieza: { texto: string; formato: string }, az: () => number, clase: ClaseDePieza = 'video') {
  let voto = 45 + az() * 35;                                   // base: 45 a 80
  if (/precio|\$|cop|usd/i.test(pieza.texto)) voto += 6;      // contestar el precio ayuda
  if (pieza.texto.length > 120) voto += 4;                     // una pieza con qué decir rinde más
  if (perfil.sensibilidad === 'Busca lo más barato') voto -= 10;
  if (perfil.sensibilidad === 'No le importa el precio') voto += 4;
  if (perfil.estilo === 'comparador') voto -= 5;
  if (perfil.estilo === 'experto') voto -= 3;
  if (perfil.estilo === 'impulsivo') voto += 7;
  if (clase === 'video') voto += 5;                            // el video se ve más
  // El reel se lee menos que el video, sea de texto, de imágenes o con animación: el ajuste es el mismo.
  if (clase === 'reel_texto' || clase === 'reel_imagenes' || clase === 'reel_animacion') voto -= 2;
  // La imagen sola dice menos que un video, y un título animado dice todavía menos que la imagen: mismo ajuste.
  if (clase === 'imagen' || clase === 'titulo_animado') voto -= 1;
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
export async function evaluar(db: Pool, businessId: string, pieza: {
  id?: string; titulo: string; texto: string; formato: string;
  /** Lo que la pieza trae armado de su formato (tarjetas, texto sobre la imagen): con eso se juzga de verdad. */
  generacion?: Record<string, unknown>;
}, avisos?: {
  /** Se llama cuando los cinco jueces terminaron de votar. Sirve para la línea de carga del panel. */
  jueces?: () => void;
  /** Se llama cuando empieza a reaccionar el público. */
  publico?: () => void;
}) {
  const az = azar(semillaDe(`${businessId}:${pieza.titulo}:${pieza.texto}`));
  const desvio = await desvioActual(db, businessId);

  const evaluacion = await db.query(
    `INSERT INTO evaluaciones (business_id, pieza_id, titulo, total_publico, creditos)
     VALUES ($1, $2, $3, 500, $4) RETURNING id`,
    [businessId, pieza.id ?? null, pieza.titulo, TARIFA.evaluarPieza],
  );
  const evaluacionId = evaluacion.rows[0].id;

  // 1 · Los cinco jueces DE ESTE FORMATO. Los criterios salen del formato de la pieza: una imagen no se
  // juzga por su gancho hablado (no habla) y un reel de texto no se juzga por su voz (no tiene). Antes los
  // jueces eran los mismos para todo, y con eso una imagen podía sacar nota por cosas que no existen.
  const clase = claseDeFormato(pieza.formato);
  const spec = ESPECIFICACION[clase];
  const gen = (pieza.generacion ?? {}) as Record<string, any>;
  const tarjetas = (gen.tarjetas ?? []) as { texto: string; segundos: number }[];
  const textoSobreLaImagen = String(gen.texto_sobre_la_imagen || '');
  const palabrasDe = (t: string) => String(t || '').trim().split(/\s+/).filter(Boolean).length;
  const tarjetaMasLarga = tarjetas.reduce((m, t) => Math.max(m, palabrasDe(t.texto)), 0);
  const votos: { juez: string; criterio: string; voto: number; opinion: string }[] = [];
  for (const j of spec.criterios) {
    let v = 55 + az() * 40;
    if (j.id === 'gancho' && pieza.texto.length < 60) v -= 10;
    if (j.id === 'claridad' && /precio|\$/i.test(pieza.texto)) v += 6;
    if (j.id === 'deseo' && clase === 'video') v += 5;
    if (j.id === 'prueba' && /reseña|cliente|testimonio/i.test(pieza.texto)) v += 8;
    if (j.id === 'llamada' && /(pida|pide|escriba|escríbanos|whatsapp|compre|link)/i.test(pieza.texto)) v += 7;
    // --- lo que sólo se puede juzgar mirando el formato ---
    if (j.id === 'sin_audio') v += textoSobreLaImagen && palabrasDe(textoSobreLaImagen) <= 8 ? 10 : (textoSobreLaImagen ? -8 : -4);
    if (j.id === 'texto') v += palabrasDe(textoSobreLaImagen) >= 3 && palabrasDe(textoSobreLaImagen) <= 8 ? 9 : -6;
    if (j.id === 'primer_cuadro') v += tarjetas.length && palabrasDe(tarjetas[0]?.texto || '') <= 7 ? 9 : (tarjetas.length ? -6 : -10);
    if (j.id === 'se_lee') v += tarjetas.length && tarjetaMasLarga <= 7 ? 10 : (tarjetas.length ? -12 : -8);
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

  // Los cinco jueces ya votaron: se avisa (la línea de carga del panel pasa al público).
  try { avisos?.jueces?.(); } catch { /* un aviso no puede tumbar una evaluación */ }

  // 2 · Las 500 personas del público
  try { avisos?.publico?.(); } catch { /* idem */ }
  const agentes = await db.query(
    'SELECT numero, edad, interes, sensibilidad, estilo FROM publico_agentes WHERE business_id = $1 ORDER BY numero',
    [businessId],
  );
  const reacciones: Record<string, number> = { compra: 0, guarda: 0, indiferente: 0, pasa: 0 };
  let sumaPublico = 0;
  const muestra: { agente: number; comentario: string; voto: number }[] = [];
  for (const a of agentes.rows) {
    const r = reaccionDe(a, pieza, az, clase);
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
    clase,
    formato: pieza.formato,
    como_se_juzgo: `se juzgó como ${spec.nombre}: ${spec.criterios.map(c => c.nombre).join(' · ')}`,
    criterios: spec.criterios.map(c => ({ nombre: c.nombre, criterio: c.criterio })),
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

  // 5 · Los créditos: lo que cuesta una evaluación, que es el precio publicado (8), y queda en el libro.
  await db.query(
    `INSERT INTO movimientos_creditos (business_id, delta, motivo, detalle, saldo)
     VALUES ($1, $2, 'evaluacion', $3, COALESCE((SELECT saldo FROM movimientos_creditos WHERE business_id = $1 ORDER BY created_at DESC LIMIT 1), 0) + $2)`,
    [businessId, -TARIFA.evaluarPieza, `MiroFish: ${pieza.titulo}`],
  );

  return { evaluacion_id: evaluacionId, orden: orden.rows[0].n + 1, ...resumen, creditos: TARIFA.evaluarPieza };
}

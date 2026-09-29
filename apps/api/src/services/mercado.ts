// =============================================================================================
// EL INFORME DEL MERCADO, ARMADO CON LO QUE EL MOTOR YA LEYÓ
//
// El problema que resuelve: el motor lee el mercado de verdad —miles de anuncios activos, sus
// anunciantes, sus botones, desde cuándo corren— y el INFORME (lo único que el panel muestra como
// resultado) dependía de una corrida que nunca se hacía: nadie escribía la tabla del informe. El
// negocio veía «falta» para siempre, con el mercado ya leído.
//
// Acá se arma el informe con esa lectura, sin pedir nada nuevo:
//   · quiénes juegan (los anunciantes comparables, con su tiempo en el aire),
//   · las piezas vivas (los anuncios que más aguantan: el tiempo es la única señal pública de que una
//     pieza rinde),
//   · el patrón (lo que repiten: dónde corre, con qué botón, en qué lengua),
//   · lo saturado (lo que ya dicen todos) y el HUECO (lo que ninguno dice, buscado uno por uno),
//   · y el resumen, con los números que lo sostienen.
//
// LO QUE NO HACE: no inventa la analítica visual (colores, tipografía, encuadre). La Biblioteca de
// Anuncios entrega el texto y el botón, no el arte de la pieza: eso se dice, no se rellena.
// =============================================================================================

import { detectarLengua, nombreDeLengua } from './lenguas.js';
import { limpiar, sinSueltos } from '../lib/json-seguro.js';

/** Deja el texto listo para guardar (ver lib/json-seguro.ts: un anuncio con un emoji cortado hacía que
 *  Postgres rechazara el JSON completo del informe). */
const limpio = (v: unknown): string => sinSueltos(String(v ?? ''));

export type FilaAnuncio = { anunciante: string; copy: string; cta: string; pais: string; paises?: string[]; fecha_inicio: string };

/** Los meses como los escribe la Biblioteca de Anuncios, por si viene la abreviatura o el nombre entero. */
const MESES: Record<string, number> = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};

/** Los días que un anuncio lleva corriendo, desde su fecha de inicio («Aug 11, 2026»). 0 si no se puede leer. */
export function diasEnElAire(fecha: string, hoy = Date.now()): number {
  const m = String(fecha || '').match(/([A-Za-z]{3,10})\s+(\d{1,2}),?\s+(\d{4})/);
  if (!m) return 0;
  const mes = MESES[m[1]] ?? MESES[m[1].slice(0, 3)] ?? 0;
  if (!mes) return 0;
  const t = new Date(Number(m[3]), mes - 1, Number(m[2])).getTime();
  return Number.isFinite(t) ? Math.max(0, Math.round((hoy - t) / 86_400_000)) : 0;
}

/** Cuántas veces aparece algo, de mayor a menor. */
const rankear = (valores: string[]) => {
  const cuenta = new Map<string, number>();
  for (const v of valores.map(x => String(x).trim()).filter(Boolean)) cuenta.set(v, (cuenta.get(v) ?? 0) + 1);
  return [...cuenta.entries()].sort((a, b) => b[1] - a[1]);
};

/** Un puñado de señales que se buscan UNA POR UNA en los avisos: lo que no aparece en ninguno es un hueco. */
const SENALES = [
  { que: 'del precio o el rango', re: /\$|precio|cuesta|tarifa|desde usd|valor de/i, como: 'el precio o el rango: es la primera pregunta del cliente y ninguno lo contesta ahí' },
  { que: 'de una prueba sin costo', re: /demo|prueba|gratis|trial|sin costo|diagn[oó]stico|pilot/i, como: 'una prueba sin costo: baja el riesgo de probar y hoy nadie la ofrece' },
  { que: 'de la regulación y el respaldo legal', re: /regulaci|normativ|complianc|licencia|autorizad|marco legal|jurisdicci/i, como: 'el respaldo legal: en esta categoría es lo que frena la decisión' },
  { que: 'de un caso con números', re: /\d+\s?%|caso de [eé]xito|resultado real|ya funciona en/i, como: 'un caso con su número: nadie muestra un resultado concreto' },
  { que: 'de los plazos de entrega', re: /en \d+ (d[ií]as|semanas|meses)|entrega|plazo de/i, como: 'el plazo: cuánto tarda en estar funcionando' },
  { que: 'de para quién NO es', re: /no sirve para|no es para|excepto|salvo/i, como: 'decir para quién NO es: hoy todos le hablan a todos' },
];

/**
 * Recorta sin partir un emoji por la mitad. Un texto cortado justo en medio de un par surrogado deja un
 * carácter suelto, y Postgres rechaza el JSON completo («Unicode low surrogate must follow a high
 * surrogate»): un anuncio con emoji alcanzaba para que el informe no se guardara nunca.
 */
const recorte = (texto: string, n: number): string => {
  const puntos = [...texto];
  return puntos.length <= n ? texto : `${puntos.slice(0, n).join('')}…`;
};

export type InformeDelMercado = {
  resumen: string;
  jugadores: { detalle: string; cuantos: string; capa: string }[];
  piezas: { anunciante: string; tipo: string; dias: number; estilo: string; lugar: string; cta: string; destino: string; paleta: string[]; prueba_social: string; nota: string }[];
  patron: { k: string; v: string; s?: string }[];
  saturacion: string[];
  huecos: { que: string; titulo: string; detalle: string; como: string }[];
  falta: string[];
  como_se_armo: string[];
};

/**
 * Arma el informe con los anuncios comparables ya leídos. Todo lo que dice sale de esas fichas: los días
 * en el aire, el anunciante, el botón y el texto. Lo que no está en las fichas, se dice que falta.
 */
export function armarInformeDelMercadoLeido(datos: {
  comparables: FilaAnuncio[];
  /** Cuántos anuncios comparables entraron en el análisis (ya sin repetir el mismo anuncio). */
  total: number;
  ruido: number;
  /** Las fichas leídas en total y cuántos anuncios distintos son: el tamaño real de la lectura. */
  fichasLeidas?: number;
  anunciosDistintos?: number;
  /** Los países donde se leyó el mercado. */
  paises: string[];
  /** La fecha de lectura, para poder decir de cuándo es. */
  hoy?: number;
}): InformeDelMercado {
  const hoy = datos.hoy ?? Date.now();
  // Un anuncio, una vez: la Biblioteca devuelve la misma pieza por cada palabra y cada país, y contarla
  // varias veces inflaba los anunciantes, los avisos y los patrones. Se agrupa por anunciante y texto.
  const vistos = new Set<string>();
  const comparablesUnicos = datos.comparables.filter(f => {
    const clave = `${String(f.anunciante || '').trim().toLowerCase()}|${String(f.copy || '').slice(0, 80).toLowerCase()}`;
    if (vistos.has(clave)) return false;
    vistos.add(clave);
    return true;
  });
  const fichas = comparablesUnicos.map(f => ({
    anunciante: limpio(f.anunciante).trim() || 'un anunciante sin nombre',
    copy: limpio(f.copy).replace(/\s+/g, ' ').trim(),
    cta: limpio(f.cta).trim(),
    pais: limpio(f.pais).trim(),
    paises: (Array.isArray(f.paises) && f.paises.length ? f.paises : [limpio(f.pais).trim()]).map(x => limpio(x).trim()).filter(Boolean),
    dias: diasEnElAire(String(f.fecha_inicio || ''), hoy),
  }));
  const n = fichas.length;
  const paises = [...new Set(fichas.flatMap(f => f.paises).filter(Boolean))].sort();
  // Dónde corre: cuántos anuncios distintos aparecen en cada país (un anuncio puede correr en varios).
  const dondeCorre = rankear(fichas.flatMap(f => f.paises));
  const botones = rankear(fichas.map(f => f.cta));
  const sostenido = Math.max(0, ...fichas.map(f => f.dias));

  // ---------- quiénes juegan: por anunciante, con su tiempo en el aire ----------
  const porAnunciante = new Map<string, { avisos: number; dias: number; paises: Set<string>; boton: string }>();
  for (const f of fichas) {
    const a = porAnunciante.get(f.anunciante) ?? { avisos: 0, dias: 0, paises: new Set<string>(), boton: '' };
    a.avisos++;
    a.dias = Math.max(a.dias, f.dias);
    for (const p of f.paises) a.paises.add(p);
    if (!a.boton && f.cta) a.boton = f.cta;
    porAnunciante.set(f.anunciante, a);
  }
  const jugadores = [...porAnunciante.entries()]
    .sort((a, b) => b[1].dias - a[1].dias || b[1].avisos - a[1].avisos)
    .slice(0, 12)
    .map(([anunciante, a]) => ({
      detalle: `${anunciante} · ${a.avisos} ${a.avisos === 1 ? 'anuncio activo' : 'anuncios activos'} en ${[...a.paises].join(' · ') || 'sin país'}`,
      cuantos: `${a.dias} ${a.dias === 1 ? 'día' : 'días'} el más viejo${a.boton ? ` · botón: ${a.boton}` : ''}`,
      capa: a.dias >= 45 ? 'sostiene' : 'prueba',
    }));

  // ---------- las piezas vivas: los que más aguantan ----------
  const piezas = [...fichas]
    .sort((a, b) => b.dias - a.dias)
    .slice(0, 10)
    .map(f => ({
      anunciante: f.anunciante,
      tipo: f.cta ? `anuncio con botón «${f.cta}»` : 'anuncio activo',
      dias: f.dias,
      estilo: '', lugar: f.paises.join(' · '), cta: f.cta, destino: '',
      paleta: [] as string[], prueba_social: '',
      nota: f.copy ? `dice: «${recorte(f.copy, 120)}»` : 'sin texto en la ficha',
    }));

  // ---------- el patrón: lo que repiten ----------
  // LA LENGUA SE VOTA ANUNCIO POR ANUNCIO, no sobre todo el texto junto: pegar los textos hacía que un solo
  // anuncio raro mandara en el resultado y el mercado entero quedaba descrito en otro idioma.
  const votos = new Map<string, number>();
  for (const f of fichas) {
    const l = detectarLengua(f.copy.slice(0, 1_200))[0];
    if (l) votos.set(l.nombre, (votos.get(l.nombre) ?? 0) + 1);
  }
  const lenguas = [...votos.entries()].sort((a, b) => b[1] - a[1]).map(([nombre, votos]) => ({ nombre, marcas: votos }));
  const patron: { k: string; v: string; s?: string }[] = [];
  if (dondeCorre.length) {
    patron.push({
      k: 'Dónde corre su mercado',
      v: dondeCorre.slice(0, 4).map(([p, c]) => `${p} (${c})`).join(' · '),
      s: `de ${n} avisos comparables leídos: ${dondeCorre.slice(0, 4).map(([p, c]) => `${Math.round((c / n) * 100)}% en ${p}`).join(', ')}`,
    });
  }
  // El botón: la Biblioteca casi nunca lo devuelve (en esta lectura llegó en un puñado de fichas). Con uno o
  // dos casos no se puede decir qué botón usan: se dice que no se pudo medir en vez de inventar un patrón.
  const conBoton = botones.reduce((a, b) => a + b[1], 0);
  if (botones.length && botones[0][1] >= 3) {
    patron.push({
      k: 'El botón que repiten',
      v: `${botones[0][0]} (${botones[0][1]} de ${n})`,
      s: botones.slice(1, 3).map(([b, c]) => `${b}: ${c}`).join(' · ') || 'es el único botón que llevan',
    });
  } else {
    patron.push({
      k: 'El botón que llevan',
      v: 'no se pudo medir',
      s: `la Biblioteca solo devolvió el botón en ${conBoton} de ${n} anuncios: con tan pocos casos no se puede decir cuál usan`,
    });
  }
  if (lenguas.length) {
    patron.push({
      k: 'La lengua de sus avisos',
      v: lenguas[0].nombre,
      s: lenguas.slice(0, 3).map(l => `${l.nombre} (${l.marcas} de ${n} anuncios)`).join(' · '),
    });
  }
  patron.push({
    k: 'Cuánto aguanta el que gana',
    v: `${sostenido} días con el mismo anuncio activo`,
    s: 'el tiempo en el aire es la única señal pública de que una pieza rinde: nadie mantiene un perdedor meses',
  });

  // ---------- lo saturado: lo que ya dicen casi todos ----------
  const palabrasDeTodos = rankear(
    fichas.flatMap(f => f.copy.toLowerCase().split(/[^a-záéíóúñ0-9]+/).filter(w => w.length >= 6)),
  ).filter(([, c]) => c >= Math.max(3, Math.round(n * 0.35)));
  const saturacion = palabrasDeTodos.slice(0, 5).map(([p, c]) => `«${p}» — aparece en ${c} de ${n} avisos comparables`);

  // ---------- el hueco: lo que NINGUNO dice (se busca una por una) ----------
  const huecos = SENALES
    .map(s => ({ s, cuantos: fichas.filter(f => s.re.test(f.copy)).length }))
    .filter(x => x.cuantos === 0)
    .slice(0, 3)
    .map(x => ({
      que: x.s.que,
      titulo: `Ninguno habla ${x.s.que}`,
      detalle: `se leyeron los ${n} avisos comparables uno por uno y ninguno lo dice`,
      como: x.s.como,
    }));

  // ---------- el resumen: los números que sostienen todo lo de arriba ----------
  const resumen = [
    datos.fichasLeidas
      ? `Se leyeron ${datos.fichasLeidas.toLocaleString('es-CO')} fichas de la Biblioteca de Anuncios: ${(datos.anunciosDistintos ?? datos.total).toLocaleString('es-CO')} anuncios distintos${paises.length ? ` en ${paises.join(', ')}` : ''}.`
      : `Se leyeron ${datos.total} anuncios activos de su categoría${paises.length ? ` en ${paises.join(', ')}` : ''}.`,
    `Se compararon los ${n} que compiten con su negocio${datos.ruido ? ` (otros ${datos.ruido} entraron por la palabra clave sin competir)` : ''}:`,
    `${porAnunciante.size} ${porAnunciante.size === 1 ? 'anunciante' : 'anunciantes'} distintos.`,
    sostenido ? `El que más aguanta lleva ${sostenido} días con el mismo anuncio activo.` : '',
    botones.length ? `El botón que repiten es «${botones[0][0]}».` : '',
    huecos.length ? `Y ${huecos.length} ${huecos.length === 1 ? 'cosa que ninguno de ellos dice' : 'cosas que ninguno de ellos dice'}: ${huecos.map(h => h.que.replace(/^de /, '')).join('; ')}.` : '',
  ].filter(Boolean).join(' ');

  return limpiar({
    resumen, jugadores, piezas, patron, saturacion, huecos,
    falta: [
      'la lectura de las creatividades (colores, tipografía y encuadre de cada pieza): la Biblioteca entrega el texto y el botón, no el arte',
      'la demanda (cuánta gente busca) y los precios escritos: necesitan una fuente conectada (su cuenta o sus búsquedas)',
    ],
    como_se_armo: [
      `se leyeron ${datos.fichasLeidas ? datos.fichasLeidas.toLocaleString('es-CO') + ' fichas' : datos.total + ' anuncios'} de la Biblioteca de Anuncios (los comparables se separan cruzando el anunciante y el texto con las palabras del negocio y los términos de su categoría en todas sus lenguas)`,
      `de esos, ${n} son comparables: sobre esos ${n} se contó todo —anunciantes, países, botones, textos— y se buscaron los huecos uno por uno`,
      'los días en el aire salen de la fecha de inicio de cada anuncio: es lo único público que dice que una pieza aguanta',
      `la fecha del informe es la de esta lectura: los anuncios y sus días cambian todos los días`,
    ],
  });
}

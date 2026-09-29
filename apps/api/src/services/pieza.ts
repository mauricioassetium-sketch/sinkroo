// =============================================================================================
// LA PIEZA, ESCRITA Y LISTA PARA PUBLICAR
//
// Lo que faltaba: el motor decidía QUÉ publicar —y lo explicaba— pero la pieza no existía como texto.
// El dueño no tenía nada que aprobar, ni nada que publicar, ni nada que medir: por eso el panel decía
// «0 piezas produjo el motor» y el modelo no tenía ningún caso.
//
// ESTA PIEZA NO INVENTA NADA. Se arma con el material del propio negocio —sus frases, lo que dice que
// ofrece, a quién le habla— ordenado como se lee un anuncio: el problema primero, qué cambia después,
// y el cierre. El ángulo que la vuelve distinta sale del HUECO medido en su mercado (lo que ninguno de
// sus comparables dice). El arte no se escribe acá: se adjunta lo medido de su propia web (colores,
// tipografía, imágenes) para que la pieza salga con su cara y no con una prestada.
//
// LO QUE NO HACE: no redacta de cero ni traduce. Un texto nuevo, en otra lengua, es trabajo de un
// escritor; acá se ordena lo que el negocio ya dijo, y lo que falta se declara en «lo_que_falta».
// =============================================================================================

import { diasEnElAire } from './mercado.js';
import { detectarLengua } from './lenguas.js';
import { sinSueltos } from '../lib/json-seguro.js';

export type PiezaArmada = {
  titulo: string;
  formato: string;
  texto: string;
  guion: string;
  detalle: Record<string, unknown>;
};

/** Parte el material del negocio en frases: es de ahí —y solo de ahí— de donde sale el texto. */
const enFrases = (texto: string): string[] =>
  sinSueltos(String(texto || ''))
    .split(/(?:[.·\n!?]+|\s—\s)/)
    .map(f => f.replace(/^[-•*\s]+/, '').replace(/\s+/g, ' ').trim())
    .filter(f => f.length >= 25);

/** La primera frase que nombra un problema: ese es el gancho, con las palabras del dueño. */
const ES_PROBLEMA = /\bno\b|nadie|problema|dif[ií]cil|frena|frenan|pierde|pierden|tarda|caro|complicad|confus|riesgo|sin (?:poder|saber|acceso|control)/i;

export function armarLaPieza(d: {
  negocio: { nombre: string; queHace: string; descripcion: string; ofrece: string[]; aQuien: string };
  canales: string[];
  boton: string;
  formato: string;
  lengua: string;
  objetivo: string;
  /** El hueco del mercado que nadie ocupa: el ángulo que hace distinta la pieza. */
  hueco?: { que: string; como: string } | null;
  /** Lo que ya dicen todos en su mercado: no se repite. */
  saturado: string[];
  /** Los anuncios comparables, para citar al que más aguanta como referencia de la categoría. */
  comparables: { anunciante: string; copy: string; fecha_inicio: string; paises?: string[] }[];
  identidad: { leida: boolean; url?: string; colores?: { hex: string; usos: number; rol?: string }[]; tipografias?: { familia: string; usos: number; tamano?: string }[]; imagenes?: { url: string; para?: string }[] } | null;
}): PiezaArmada {
  const frases = enFrases(d.negocio.descripcion);
  // ¿EL MATERIAL ALCANZA PARA UN ANUNCIO? Si lo único que hay es una lista de palabras clave, la pieza
  // sale como una ficha, no como algo que alguien quiera leer. Eso se dice: no se disimula.
  const palabrasSueltas = /^[^.!?]{0,120}$/.test(d.negocio.descripcion.trim()) && (d.negocio.descripcion.match(/\s/g) || []).length < 12;
  const tieneProblema = frases.some(f => ES_PROBLEMA.test(f));
  const avisoDeMaterial = frases.length === 0 || (palabrasSueltas && !tieneProblema)
    ? 'su material es una lista de palabras clave, no una frase dirigida a un cliente: la pieza sale armada con esas palabras y se lee como una ficha. Escriba en Primeros pasos una frase con la que le hablaría a un cliente —el problema que le resuelve— y la pieza se arma con esa frase'
    : '';
  const gancho = frases.find(f => ES_PROBLEMA.test(f)) || frases[0] || d.negocio.queHace || `Lo que hace ${d.negocio.nombre}`;
  // El cuerpo: lo que cambia para el cliente, dicho por el negocio. Sin material, se arma con lo que
  // ofrece (sus propias palabras del material), y si tampoco hay, se dice que falta.
  const resto = frases.filter(f => f !== gancho).slice(0, 3);
  // Lo que «ofrece» suele venir del rótulo de su industria («servicios», «soluciones»): eso no dice nada
  // al cliente y no entra en la pieza. Si después de sacarlo no queda nada, el cuerpo queda vacío y se
  // avisa: rellenarlo con una palabra genérica es peor que decir que falta.
  const GENERICO = /^(servicios?|productos?|soluciones?|consultor[ií]a|asesor[ií]a|otros?|varios|general)$/i;
  const ofrece = d.negocio.ofrece.map(o => sinSueltos(String(o)).trim()).filter(o => o && !GENERICO.test(o));
  const cuerpo = resto.length
    ? resto.join('\n')
    : ofrece.slice(0, 3).map(o => `· ${o}`).join('\n');
  const cuerpoDebil = !resto.length
    ? (ofrece.length
        ? 'el cuerpo se armó con lo que el negocio dice que ofrece, no con lo que cambia para el cliente: falta material'
        : 'el cuerpo quedó vacío: su material no dice qué cambia para el cliente. Lo que hay que subir es eso, una frase con la que le hablaría a un cliente')
    : '';
  const canal = d.canales[0] || 'el canal que usted elija';
  const cierre = d.objetivo
    ? `El siguiente paso es el suyo: ${d.objetivo.toLowerCase()}.`
    : `Escríbanos por ${canal} y lo vemos con su caso.`;
  const boton = d.boton && !/sin definir/.test(d.boton) ? d.boton : `Escribir por ${canal}`;

  const texto = [gancho, cuerpo, cierre, `→ ${boton}`].filter(Boolean).join('\n\n');

  // El guion, solo si la pieza es de video: qué se ve y qué se dice, escena por escena.
  const esVideo = /video|reel|vertical|tiktok/i.test(d.formato);
  const guion = esVideo
    ? [
        `0-3 s · SE VE: ${gancho.length > 90 ? `${gancho.slice(0, 90)}…` : gancho}`,
        `3-10 s · SE VE: el producto o el trabajo en marcha, sin adornos${(resto[0] || ofrece[0]) ? `\n            DICE: ${resto[0] || ofrece[0]}` : ''}`,
        resto[1] ? `10-20 s · SE VE: una prueba de que funciona\n            DICE: ${resto[1]}` : '',
        `20-30 s · DICE: ${cierre}\n            EN PANTALLA: ${boton}`,
      ].filter(Boolean).join('\n')
    : '';

  // La referencia que aguanta en su categoría: el anuncio con más días activo entre los comparables.
  // No se copia: se cita, para saber contra qué se mide esta pieza.
  const referencia = [...d.comparables]
    .map(c => ({ ...c, dias: diasEnElAire(String(c.fecha_inicio || '')) }))
    .sort((a, b) => b.dias - a.dias)[0] || null;

  const colores = (d.identidad?.colores ?? []).slice(0, 5);
  const tipografias = (d.identidad?.tipografias ?? []).slice(0, 2);

  return {
    titulo: gancho.length > 90 ? `${gancho.slice(0, 87)}…` : gancho,
    formato: d.formato,
    texto,
    guion,
    detalle: {
      // ---------- las partes de la pieza, cada una con su origen ----------
      partes: [
        { k: 'Cómo entra', v: gancho },
        { k: 'Qué cambia', v: cuerpo },
        { k: 'Cómo cierra', v: `${cierre} → ${boton}` },
      ],
      aviso_de_material: avisoDeMaterial,
      aviso_del_cuerpo: cuerpoDebil,
      // ---------- qué es y de dónde sale cada línea ----------
      // La lengua del TEXTO es la del material del negocio —de ahí salen las palabras—, no la del mercado:
      // decir que la pieza está en inglés porque el mercado lo está sería mentir sobre lo que se lee.
      lengua_del_texto: detectarLengua(`${d.negocio.descripcion} ${d.negocio.ofrece.join(' ')}`)[0]?.nombre || 'sin medir',
      lengua_del_mercado: d.lengua,
      donde_va: d.canales,
      boton,
      de_donde_sale_cada_linea: {
        gancho: 'una frase del propio negocio: la que nombra el problema que él mismo describió',
        cuerpo: resto.length ? 'frases del propio negocio, recortadas al hueso' : 'lo que el negocio dice que ofrece (su material en Primeros pasos)',
        cierre: d.objetivo ? 'el objetivo que el negocio pidió en Primeros pasos' : 'la acción de contacto, con el canal que el negocio declaró',
        boton: /sin definir/.test(d.boton || '') ? 'propuesto por el sistema: el negocio todavía no dijo con qué botón cierra' : 'el botón que el negocio declaró',
      },
      // ---------- el ángulo: lo que ninguno de sus comparables dice ----------
      angulo_que_ninguno_usa: d.hueco
        ? { que: d.hueco.que, como: d.hueco.como }
        : 'todavía no hay hueco medido: hace falta la lectura del mercado',
      lo_que_ya_dicen_todos: d.saturado,
      // ---------- el arte: lo medido en su propia web ----------
      arte: d.identidad?.leida
        ? {
            fuente: `medido en su propia web (${d.identidad.url})`,
            colores: colores.map(c => ({ hex: c.hex, veces: c.usos, rol: c.rol ?? '' })),
            tipografias: tipografias.map(t => ({ familia: t.familia, veces: t.usos, tamano: t.tamano ?? '' })),
            imagenes_reales: (d.identidad.imagenes ?? []).slice(0, 6).map(i => i.url),
          }
        : { sin_fuente: 'no hay identidad que medir: el negocio no cargó una web legible' },
      // ---------- la referencia contra la que se mide ----------
      referencia_del_mercado: referencia
        ? { anunciante: referencia.anunciante, dias: referencia.dias, dice: sinSueltos(referencia.copy).slice(0, 140), paises: referencia.paises ?? [] }
        : 'sin comparables leídos: no hay contra qué medir esta pieza',
      // ---------- lo que falta, dicho ----------
      lo_que_falta: [
        'la prueba social (casos, clientes, números): no está en el material cargado, y no se inventa',
        'el precio: el negocio no lo cargó, y el mercado casi no lo publica',
        'las creatividades (fotos y video finales): el sistema todavía no genera imagen ni video',
      ],
      como_se_armo: [
        'el texto sale del material del negocio, en su orden de anuncio: problema, qué cambia, cierre y botón',
        'el ángulo es el hueco medido: lo que ninguno de sus comparables dice en sus anuncios',
        'el arte se adjunta medido de su web (colores, tipografía e imágenes reales), no elegido por gusto',
        'esta pieza es un borrador listo para editar: el dueño aprueba, cambia o pide otra',
      ],
    },
  };
}

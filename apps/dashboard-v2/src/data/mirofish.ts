// =============================================================================================
// MIROFISH — el panel de agentes que vota las publicaciones.
//
// El flujo completo, tal como tiene que verse en Campañas:
//   1. Sinkroo investiga el mercado y detecta los COLORES de la competencia que mejor convierte.
//   2. Con eso MEJORA o CREA el material: escribe los prompts de las imágenes y los videos.
//   3. Arma un mínimo de 5 OPCIONES de publicación distintas.
//   4. MiroFish las vota, se ORDENAN DEL 1 AL 5, y las 3 PRIMERAS pasan a producción.
// =============================================================================================

export const PERFILES = [
  { k: 'impulsivo', nombre: 'Comprador impulsivo', mira: 'decide en 3 segundos' },
  { k: 'compara', nombre: 'El que compara', mira: 'mira precio y alternativa' },
  { k: 'desconfiado', nombre: 'Desconfiado', mira: 'busca la letra chica' },
  { k: 'experto', nombre: 'Experto del rubro', mira: 'detecta lo que no es real' },
  { k: 'nuevo', nombre: 'Alguien que nunca le vio', mira: 'no sabe qué vende' },
] as const;

// ---------------------------------------------------------------------------------------------
// 1. LO QUE INVESTIGÓ — incluido el color del competidor que mejor convierte
// ---------------------------------------------------------------------------------------------
export const INVESTIGACION = {
  competidor: {
    nombre: 'Tienda Norte',
    leads: 240,
    detalle: 'Es el que más leads trae del rubro: 240 por mes, contra 96 suyos.',
  },
  colores: [
    { hex: '#4A7C59', nombre: 'Verde salvia', uso: 'fondo de video y placas', por: 'su anuncio con más leads del rubro' },
    { hex: '#F5EFE6', nombre: 'Crema', uso: 'texto sobre el verde', por: 'se lee al sol en el celular' },
    { hex: '#E8A33D', nombre: 'Ámbar', uso: 'precio y oferta', por: 'es lo que más se toca en esos anuncios' },
  ],
  hallazgos: [
    { t: 'Color y contraste', d: 'El video que más leads trae de todo el rubro usa verde salvia con texto crema. Se lee perfecto en pantalla al sol, que es donde su cliente mira.' },
    { t: 'Duración y ritmo', d: 'Entre 12 y 18 segundos. El producto entra en los primeros 2 segundos: si tarda más, se van.' },
    { t: 'El gancho', d: 'Arrancan mostrando el problema, no el producto. Los que arrancan con el logo no están entre los que más rinden.' },
    { t: 'Cuándo publican', d: 'Martes y jueves entre 19 y 21. Es la franja donde esos anuncios juntan más respuestas.' },
  ],
};

// ---------------------------------------------------------------------------------------------
// 2 y 3. LO QUE CREÓ — 5 opciones, cada una con el prompt que escribió el motor
// ---------------------------------------------------------------------------------------------
export interface Opcion {
  id: string;
  formato: 'Video vertical' | 'Imagen' | 'Carrusel' | 'Reel';
  medida: string;
  titulo: string;
  gancho: string;
  prompt: string;
  copy: string;
  cta: string;
  color: string;
  usaCompetidor: string;
  votos: Record<string, number>;
  /** Una línea por juez: es lo que se lee en el veredicto de la pieza, voto por voto. */
  opiniones: Record<string, string>;
  /** Solo en las variantes de una ronda de mejora: de qué pieza sale. */
  basedOn?: string;
  /** Solo en las variantes: qué se le cambió a la pieza que ganó. */
  queCambia?: string;
}

export const OPCIONES: Opcion[] = [
  {
    id: 'op1', formato: 'Video vertical', medida: '15 s · 9:16', titulo: 'El problema primero',
    gancho: '«Si su piel se le pone roja con todo, esto le va a interesar»',
    prompt: 'Plano cenital de la mesada del baño con luz de mañana entrando de costado. Fondo verde salvia (#4A7C59) desenfocado. Una mano entra y apoya el frasco en el centro. Texto crema (#F5EFE6) grande: a los 2 s aparece «roja». Cierre: el frasco en primer plano, el precio en ámbar (#E8A33D). Sin música, sonido ambiente del baño.',
    copy: 'Ese ardor no es normal: es su piel pidiendo otra cosa. Serum con 3 ingredientes, nada más.',
    cta: 'Ver el serum',
    color: '#4A7C59', usaCompetidor: 'los 3 colores que mejor rinden',
    votos: { impulsivo: 92, compara: 78, desconfiado: 74, experto: 88, nuevo: 84 },
    opiniones: {
      impulsivo: 'En el primer segundo ya se entiende que es para piel que se irrita: no necesito leer nada más.',
      compara: 'Dice que son 3 ingredientes, pero el precio recién aparece al final y yo lo quiero ver antes de comparar.',
      desconfiado: 'Habla de tres ingredientes y no dice cuáles: sin la lista a la vista, parece una promesa más del rubro.',
      experto: 'El verde salvia con texto crema se lee en el celular al sol, y el ardor como problema está bien elegido.',
      nuevo: 'Nunca vi la marca y aun así entendí qué vende y para quién es.',
    },
  },
  {
    id: 'op2', formato: 'Carrusel', medida: '5 placas · 4:5', titulo: 'Antes y después real',
    gancho: '«30 días usando lo mismo, así quedó»',
    prompt: 'Cinco placas con fondo crema (#F5EFE6) y borde verde salvia. Placa 1: una foto real del cliente, subida por la tienda, con la fecha encima en ámbar. Placas 2 a 4: el frasco en la mesada, la textura en la mano, el resultado. Placa 5: los 3 ingredientes en lista y el precio en ámbar. Tipografía gruesa, sin decoración.',
    copy: 'No le prometo magia: le muestro 30 días reales de la misma persona.',
    cta: 'Ver los resultados',
    color: '#F5EFE6', usaCompetidor: 'la paleta crema y verde',
    votos: { impulsivo: 74, compara: 88, desconfiado: 86, experto: 79, nuevo: 71 },
    opiniones: {
      impulsivo: 'El antes/después ya lo vi mil veces y la primera placa no muestra el frasco: tengo que pasar de placa para saber qué venden.',
      compara: 'Dice que son 30 días reales y fecha cada foto: con eso puedo comparar contra lo que promete el resto.',
      desconfiado: 'Son las fotos que subieron las clientas, no de banco de imágenes: eso no se puede inventar.',
      experto: 'Los 3 ingredientes al final suman, pero la letra de la última placa no se lee en el celular.',
      nuevo: 'Arranca con un antes/después sin decir de qué producto es: tardé dos placas en entender qué vendían.',
    },
  },
  {
    id: 'op3', formato: 'Video vertical', medida: '12 s · 9:16', titulo: 'El precio sin vueltas',
    gancho: '«Sale $34. Le muestro exactamente qué lleva»',
    prompt: 'Cámara en mano, un solo plano, sin cortes: alguien muestra el frasco, lo abre, pone una gota en el dorso de la mano y lo acerca. Fondo verde salvia. El precio en ámbar aparece a los 6 s y queda fijo. Voz real, no locución. Subtítulos en crema, chicos, abajo.',
    copy: '$34, con envío gratis desde $15.000. Nada más que explicar.',
    cta: 'Comprar ahora',
    color: '#E8A33D', usaCompetidor: 'el ámbar para el precio',
    votos: { impulsivo: 88, compara: 91, desconfiado: 69, experto: 72, nuevo: 66 },
    opiniones: {
      impulsivo: 'El precio aparece a los 6 segundos y queda fijo: no tengo que esperar al final para saber cuánto cuesta.',
      compara: 'Da el precio, el envío gratis y desde cuánto: no me deja ninguna duda para compararlo.',
      desconfiado: 'No dice en cuánto llega ni qué queda afuera del envío gratis: siempre hay una letra chica.',
      experto: 'Un solo plano sin cortes es riesgoso: sin edición, el ritmo depende de quien graba.',
      nuevo: 'Arranca con el precio y no me dice para qué sirve: no sé si es para mí.',
    },
  },
  {
    id: 'op4', formato: 'Imagen', medida: '1080x1350', titulo: 'El testimonio solo',
    gancho: '«Me lo recomendó mi dermatóloga»',
    prompt: 'Fondo verde salvia plano. En el centro, la captura real de un mensaje de WhatsApp de una clienta (tapando el número), con la frase subrayada en crema. Abajo a la derecha el frasco. Arriba, en ámbar, «reseña real de las 128 que tenemos». Tipografía de sistema, no de marca: tiene que parecer una captura, no un diseño.',
    copy: '128 reseñas, y esta es la que más se repite.',
    cta: 'Leer las reseñas',
    color: '#4A7C59', usaCompetidor: 'el verde salvia de fondo',
    votos: { impulsivo: 66, compara: 74, desconfiado: 92, experto: 81, nuevo: 78 },
    opiniones: {
      impulsivo: 'Es una captura de WhatsApp en el centro: no hay producto grande ni precio, y yo decido en 3 segundos.',
      compara: 'Dice que hay 128 reseñas, pero no muestra el precio ni con qué se compara el serum.',
      desconfiado: 'Es la captura real, con el número tapado y la frase subrayada: es lo más creíble que se puede mostrar.',
      experto: 'La tipografía de sistema hace que parezca una captura y no un diseño: eso sostiene la prueba social.',
      nuevo: 'Se entiende que mucha gente lo usó, aunque no queda claro para qué sirve el producto.',
    },
  },
  {
    id: 'op5', formato: 'Reel', medida: '18 s · 9:16', titulo: 'La rutina de 3 pasos',
    gancho: '«No sabe en qué orden usarlos, esto es para usted»',
    prompt: 'Tres cortes rápidos, uno por paso, cada uno con el mismo encuadre para que se sienta una rutina. Fondo crema, el verde salvia solo en los subtítulos. En cada corte aparece el número del paso en ámbar y el cronómetro del tiempo que hay que esperar. Cierre con los tres frascos alineados y el pack completo.',
    copy: 'El orden importa más que el producto: en qué orden y cuánto esperar.',
    cta: 'Ver la rutina',
    color: '#F5EFE6', usaCompetidor: 'el crema para el texto largo',
    votos: { impulsivo: 61, compara: 72, desconfiado: 68, experto: 84, nuevo: 88 },
    opiniones: {
      impulsivo: 'Son tres pasos y hasta el final no se ve el producto completo: en el medio ya me fui.',
      compara: 'Explica el orden y los tiempos, pero no dice el precio ni qué rinde el pack completo.',
      desconfiado: 'Dice que el orden importa sin explicar por qué: así suena a excusa para vender tres frascos.',
      experto: 'El cronómetro con el tiempo de espera entre pasos es información real que no da nadie del rubro.',
      nuevo: 'No sabía que había un orden para usarlos y ahora entiendo para qué sirve cada uno.',
    },
  },
];

/** El promedio de los 5 perfiles: es el puntaje final de cada opción. */
export function puntaje(o: Opcion) {
  const v = Object.values(o.votos);
  return Math.round(v.reduce((a, b) => a + b, 0) / v.length);
}

/** Las opciones ordenadas del 1 al 5 por puntaje. */
export function rankingDe(lote: Opcion[] = OPCIONES) {
  return [...lote].sort((a, b) => puntaje(b) - puntaje(a));
}

export const ranking = () => rankingDe(OPCIONES);

export const CUANTAS_PASAN = 3;

// =============================================================================================
// LA TARIFA — LA TABLA POR TIPO DE CONTENIDO (la fijó el dueño).
//
// EL DUEÑO DEL PRECIO ES EL BACK (`apps/api/src/services/creditos.ts`). Lo de acá es la copia del panel para
// las pantallas que corren con datos de ejemplo —sin back conectado—, y cuando el back contesta
// `GET /api/rondas` se muestran LOS SUYOS (`tarifa.por_tipo` y `tarifa.costo_ronda`), que son exactamente
// los mismos que cobra el libro. Ninguna pantalla escribe un precio a mano: todos salen de acá o del back.
//
//   · video ................ 48   (30 segundos como máximo)
//   · reel con animación ... 24   (animación + imagen + sonido)
//   · reel de imágenes ..... 20   (varias imágenes en secuencia con sonido)
//   · imagen con texto ..... 12   (una imagen sola con el texto encima)
//   · título animado ......... 8   (una animación corta de título)
//   · evaluar una pieza ...... 8   · el público (los 500) nunca se cobra
//
// UNA RONDA: 5 contenidos, COMO MÁXIMO 2 son video, y los otros 3 se reparten entre los cuatro tipos que no
// son video. Con los 2 videos + reel con animación + imagen con texto + título animado:
// 48+48+24+12+8 = 140 al crear, y 5×8 = 40 al evaluar = 180 créditos la ronda.
// =============================================================================================
export type TipoDeContenido = 'video' | 'reel con animación' | 'reel de imágenes' | 'imagen con texto' | 'título animado';

/** Lo que cuesta crear un contenido de cada tipo, en créditos. */
export const PRECIOS_POR_TIPO: Record<TipoDeContenido, number> = {
  video: 48,
  'reel con animación': 24,
  'reel de imágenes': 20,
  'imagen con texto': 12,
  'título animado': 8,
};

/** Los cinco tipos, en el orden en que se muestran. */
export const TIPOS_DE_CONTENIDO: TipoDeContenido[] = [
  'video', 'reel con animación', 'reel de imágenes', 'imagen con texto', 'título animado',
];

/** Qué es cada tipo, dicho como se lo diría al dueño (va al lado de su precio). */
export const QUE_ES_CADA_TIPO: Record<TipoDeContenido, string> = {
  video: 'video filmado, de 30 segundos como máximo',
  'reel con animación': 'mezcla de animación, imagen y sonido, para llamar la atención',
  'reel de imágenes': 'varias imágenes en secuencia, con sonido',
  'imagen con texto': 'una imagen sola con el texto encima',
  'título animado': 'una animación corta de título, para enganchar al principio',
};

export const TARIFA = {
  piezasRonda: 5,
  evaluarPieza: 8,
  publico: 0,
  /** La tabla por tipo, tal como la cobra el back. */
  porTipo: PRECIOS_POR_TIPO,
};

/** El precio de un tipo. Un tipo que no está en la tabla devuelve 0 y quien lo muestre lo dice. */
export const precioDeTipo = (tipo: TipoDeContenido | string | null | undefined): number =>
  (tipo ? (PRECIOS_POR_TIPO[tipo as TipoDeContenido] ?? 0) : 0);

/** El tipo de contenido de una pieza, leído de su formato (los mismos nombres que usa el back). */
export function tipoDeFormato(formato: string | null | undefined): TipoDeContenido | null {
  const f = String(formato || '');
  if (/t[íi]tulo animado/i.test(f)) return 'título animado';
  if (/reel con animaci[óo]n|reel animado/i.test(f)) return 'reel con animación';
  if (/reel de im[áa]genes|reel de fotos/i.test(f)) return 'reel de imágenes';
  if (/reel con texto|imagen/i.test(f)) return 'imagen con texto';
  if (/video/i.test(f)) return 'video';
  return null;
}

/** Lo que cuesta crear una pieza por su formato. Sin tipo reconocido devuelve null: no se inventa precio. */
export const precioDeFormato = (formato?: string | null): number | null => {
  const tipo = tipoDeFormato(formato);
  return tipo ? precioDeTipo(tipo) : null;
};

export interface CostoRonda {
  piezas: number;
  crear: number;
  evaluar: number;
  total: number;
  /** Qué tipo es cada contenido y cuánto cuesta crearlo: la suma, tal como se cobra. */
  por_tipo: { tipo: TipoDeContenido; creditos: number }[];
  mezcla: TipoDeContenido[];
}

/** La mezcla de la primera ronda: 2 videos y los tres tipos que entran primero. */
export const MEZCLA_DE_RONDA: TipoDeContenido[] = [
  'video', 'video', 'reel con animación', 'imagen con texto', 'título animado',
];

/** Una ronda: se suma POR TIPO, no por un precio único por pieza. */
export function costoDeRonda(tipos: TipoDeContenido[] = MEZCLA_DE_RONDA): CostoRonda {
  const por_tipo = tipos.map(tipo => ({ tipo, creditos: precioDeTipo(tipo) }));
  const crear = por_tipo.reduce((s, p) => s + p.creditos, 0);
  const evaluar = tipos.length * TARIFA.evaluarPieza;
  return { piezas: tipos.length, crear, evaluar, total: crear + evaluar, por_tipo, mezcla: tipos };
}

/** Lo que cuesta una ronda de 5 con dos videos: 140 + 40 = 180 créditos. */
export const COSTO_RONDA: CostoRonda = costoDeRonda();

/** Cuántas variantes hace una ronda de mejora: 3, no 5. */
export const CUANTAS_VARIANTES = 3;

/** Los cinco precios escritos cortos, para cuando la pantalla no sabe de qué tipo es la pieza. */
export const PRECIOS_EN_UNA_LINEA: string = TIPOS_DE_CONTENIDO
  .map(t => `${t} ${precioDeTipo(t)}`)
  .join(' · ');

/** Lo que cuesta lo más barato y lo más caro de la tabla: sirve para decir un rango sin inventar un número. */
export const RANGO_DE_VARIANTE = {
  min: Math.min(...Object.values(PRECIOS_POR_TIPO)),
  max: Math.max(...Object.values(PRECIOS_POR_TIPO)),
};

/** «2 video · 1 reel con animación · 1 imagen con texto · 1 título animado»: cómo viene repartida una ronda. */
export function resumenDeMezcla(tipos: TipoDeContenido[]): string {
  const cuenta = new Map<TipoDeContenido, number>();
  for (const t of tipos) cuenta.set(t, (cuenta.get(t) ?? 0) + 1);
  return [...cuenta.entries()].map(([t, n]) => `${n} ${t}`).join(' · ');
}

/** El costo desglosado y sumado por tipo: «48 + 48 + 24 + 12 + 8 al crear, 40 al evaluar». */
export const detalleDelCosto = (c: CostoRonda): string =>
  `${c.por_tipo.map(p => p.creditos).join(' + ')} al crear, ${c.evaluar} al evaluar`;

/** «entre 24 y 144 créditos» para `cuantas` variantes, cuando no se sabe de qué tipo son. */
export const rangoDeVariantes = (cuantas: number): string =>
  `${cuantas * RANGO_DE_VARIANTE.min} y ${cuantas * RANGO_DE_VARIANTE.max}`;

/**
 * Una ronda de mejora: `cuantas` variantes de la que ganó. Cada variante cuesta lo que cuesta SU tipo (una
 * variante de video 48, una de imagen 12), así que el tipo entra por parámetro y nunca se escribe un número.
 */
export function costoMejora(cuantas: number = CUANTAS_VARIANTES, tipo: TipoDeContenido = 'video'): CostoRonda {
  const mezcla: TipoDeContenido[] = Array.from({ length: cuantas }, () => tipo);
  return costoDeRonda(mezcla);
}

// ---------------------------------------------------------------------------------------------
// LAS OBJECIONES DE UNA PIEZA — lo que dejó el panel, juez por juez, de la más dura a la más
// blanda. Es el dato con el que arranca la ronda nueva: la primera es la que manda.
// ---------------------------------------------------------------------------------------------
export interface Objecion { k: string; juez: string; voto: number; texto: string; }

export function objeciones(o: Opcion): Objecion[] {
  const todas = PERFILES
    .map(p => ({ k: p.k, juez: p.nombre, voto: o.votos[p.k], texto: o.opiniones[p.k] }))
    .sort((a, b) => a.voto - b.voto);
  const reprueban = todas.filter(x => x.voto < 80);
  return reprueban.length > 0 ? reprueban : todas.slice(0, 1);
}

/** La objeción que manda: la del juez que votó más bajo. */
export const objecion = (o: Opcion) => objeciones(o)[0];

// ---------------------------------------------------------------------------------------------
// LA RONDA DE MEJORA — las 3 variantes que salen de la pieza que ganó la ronda anterior.
//
// La clave del negocio: no arranca de cero. Agarra la 1ª del ranking y le cambia UNA cosa por
// variante (la objeción del juez más duro, prueba social, el ángulo). Cada variante vale lo que valga
// SU tipo —una de video 48, una de imagen 12, una de título animado 8— más su evaluación de 8: por eso
// el número sale de la tabla (`costoMejora(cuantas, tipo)`) y no está escrito en ningún lado. La pieza
// original no se toca.
// ---------------------------------------------------------------------------------------------
interface CambioMejora {
  id: string;
  sufijo: string;
  queCambia: string;
  /** Cuánto sube o baja cada juez respecto de la pieza que ya ganó. */
  delta: Record<string, number>;
  /** Lo que se le agrega al prompt original: la variante es la misma pieza, con este cambio. */
  promptExtra: string;
  copy: string;
  cta: string;
  opiniones: Record<string, string>;
}

const CAMBIOS: CambioMejora[] = [
  {
    id: 'a', sufijo: 'con los 3 ingredientes a la vista',
    queCambia: 'contesta la objeción del juez más duro: muestra los 3 ingredientes con nombre y porcentaje',
    delta: { impulsivo: 1, compara: 1, desconfiado: 14, experto: 1, nuevo: 1 },
    promptExtra: 'Sobre el cierre, antes del precio, entra una placa de 2 s con los 3 ingredientes, cada uno con su nombre y su porcentaje, en crema (#F5EFE6) sobre el verde salvia. Sin locución: se lee.',
    copy: 'Ese ardor no es normal: es su piel pidiendo otra cosa. 3 ingredientes, con nombre y porcentaje. Nada más.',
    cta: 'Ver el serum',
    opiniones: {
      impulsivo: 'El arranque y el producto a los 2 segundos no cambiaron: sigue entendiéndose en el primer segundo.',
      compara: 'Ahora tengo el precio y la lista: con eso lo comparo contra el resto sin adivinar.',
      desconfiado: 'Los 3 ingredientes tienen nombre y porcentaje: era lo que le faltaba para no sonar a promesa más del rubro.',
      experto: 'La placa de los ingredientes entra bien y no rompe el ritmo: suma información que no da nadie del rubro.',
      nuevo: 'Sigo entendiendo qué vende y para quién, con un dato más a favor.',
    },
  },
  {
    id: 'b', sufijo: 'que cierra con una clienta real',
    queCambia: 'suma prueba social: el mismo arranque, pero cierra con una clienta real y la captura del mensaje',
    delta: { impulsivo: -2, compara: 6, desconfiado: 12, experto: 3, nuevo: 8 },
    promptExtra: 'A los 11 s entra un corte de 3 s con una clienta real mostrando el frasco, con la frase subrayada en crema y el texto en ámbar: «128 reseñas, esta es la que más se repite». Cierra con la captura del mensaje con el número tapado.',
    copy: 'Ese ardor no es normal: es su piel pidiendo otra cosa. Y 128 clientas ya lo dijeron antes que yo.',
    cta: 'Leer las reseñas',
    opiniones: {
      impulsivo: 'El cierre con la clienta estira el video y a mí con el primer segundo me alcanzaba: no me suma.',
      compara: 'Muestra las reseñas y la captura: puedo comparar la prueba social contra la de la competencia.',
      desconfiado: 'Una clienta real con el frasco en la mano y la captura del mensaje: eso no se puede inventar.',
      experto: 'La captura real en el cierre sostiene mejor la prueba social que la lista de ingredientes.',
      nuevo: 'Con la reseña entiendo que mucha gente lo usó, aunque sigo sin saber si es para mí.',
    },
  },
  {
    id: 'c', sufijo: 'con el ángulo del precio',
    queCambia: 'cambia el ángulo: arranca por el precio en vez del problema, mismo formato y mismo producto',
    delta: { impulsivo: 6, compara: 2, desconfiado: 2, experto: -2, nuevo: 2 },
    promptExtra: 'Se da vuelta el orden: el precio en ámbar (#E8A33D) entra a los 3 s y queda fijo en la esquina, y el problema aparece después. El producto se sigue viendo en los primeros 2 s.',
    copy: '$34, con envío gratis desde $15.000. Y si su piel se le pone roja con todo, esto le va a interesar.',
    cta: 'Ver el serum',
    opiniones: {
      impulsivo: 'El precio a los 3 segundos y fijo: no tengo que esperar al final para saber cuánto cuesta.',
      compara: 'Da el precio primero y el problema después: así es más simple compararlo contra el resto.',
      desconfiado: 'Arrancar por el precio me hace pensar que algo esconde: no dice qué trae ni en cuánto llega.',
      experto: 'Empezar por el precio es el ángulo más difícil del rubro: se sostiene solo si el producto se ve igual de claro.',
      nuevo: 'Sé cuánto cuesta, pero todavía me cuesta entender para qué sirve.',
    },
  },
];

/** Las 3 variantes de una pieza que ya ganó: la misma pieza, con un cambio por variante. */
export function variantesDe(base: Opcion): Opcion[] {
  return CAMBIOS.map(c => {
    const votos: Record<string, number> = {};
    for (const p of PERFILES) {
      votos[p.k] = Math.max(0, Math.min(100, base.votos[p.k] + (c.delta[p.k] ?? 0)));
    }
    return {
      ...base,
      id: `${base.id}-${c.id}`,
      titulo: `${base.titulo} · ${c.sufijo}`,
      gancho: base.gancho,
      prompt: `${base.prompt} — CAMBIO: ${c.promptExtra}`,
      copy: c.copy,
      cta: c.cta,
      votos,
      opiniones: c.opiniones,
      basedOn: base.id,
      queCambia: c.queCambia,
    };
  });
}

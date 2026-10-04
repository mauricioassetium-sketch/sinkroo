// =============================================================================================
// CADA FORMATO ES OTRA COSA, Y SE DICE
//
// Un video, un reel de texto sobre una imagen y una imagen fija NO se piden igual: el video lleva
// planos, voz y audio; el reel de texto lleva tarjetas —texto encima de una imagen, sin voz y sin
// audio—; la imagen es UN cuadro con su texto. Mezclarlos hacía que una imagen pidiera 30 segundos de
// voz en off, y que el guion de un reel hablara de escenas «que se ven» cuando nadie habla.
//
// Acá vive la única definición de qué pide cada formato y con qué criterios se juzga. La pieza, el
// prompt de generación y MiroFish leen de acá: si los tres no dicen lo mismo, el sistema se
// contradice —y eso es lo que veía el dueño.
// =============================================================================================

export type ClaseDePieza = 'video' | 'reel_texto' | 'imagen' | 'reel_imagenes' | 'reel_animacion' | 'titulo_animado';

/**
 * LOS CINCO TIPOS DE CONTENIDO DE UNA RONDA, con los nombres que muestra el panel (regla del dueño).
 * Cada ronda produce 5 contenidos: como máximo 2 son video (de 30 s como máximo) y los otros 3 se reparten
 * entre los cuatro tipos que no son video. El precio de cada tipo tiene un solo dueño: `creditos.ts`.
 */
export type TipoDeContenido = 'video' | 'imagen con texto' | 'reel de imágenes' | 'reel con animación' | 'título animado';

/** Techo de duración de un video: lo fijó el dueño (30 s como máximo). */
export const SEGUNDOS_MAXIMOS_VIDEO = 30;

/** Qué clase de pieza es, según su formato. Se decide por lo que ES, no por palabras sueltas:
 *  «reel con texto sobre imagen» es un reel de texto, no un video con voz, y tampoco una imagen.
 *  Los tres tipos que no son video se reconocen por su nombre completo ANTES de las reglas viejas: si no,
 *  «reel de imágenes» caería en el reel de texto de siempre y la pieza diría que no tiene sonido. */
export function claseDeFormato(formato: string): ClaseDePieza {
  const f = String(formato || '').toLowerCase();
  if (/t[ií]tulo animado/.test(f)) return 'titulo_animado';
  if (/reel con animaci[oó]n|reel animado/.test(f)) return 'reel_animacion';
  if (/reel de im[aá]genes|reel de fotos|secuencia de im[aá]genes/.test(f)) return 'reel_imagenes';
  if (/reel|tarjeta|texto sobre|texto encima|carrusel|secuencia de texto/.test(f)) return 'reel_texto';
  if (/video|historia|story|tiktok|clip|animaci/.test(f)) return 'video';
  return 'imagen';
}

export type Especificacion = {
  /** Cómo se llama en el panel. */
  nombre: string;
  /** Qué es, en una frase, para el dueño. */
  que_es: string;
  proporciones: string[];
  lleva_voz: boolean;
  lleva_audio: boolean;
  lleva_planos: boolean;
  lleva_tarjetas: boolean;
  lleva_texto_sobre_la_imagen: boolean;
  /** Qué tiene que producir el generador. */
  entregable: string;
  /** Cómo se arma, para que la pieza y el prompt digan lo mismo. */
  como_se_arma: string;
  /** Los jueces de ESTE formato: una imagen no se juzga por su gancho hablado porque no habla. */
  criterios: { id: string; nombre: string; criterio: string }[];
};

export const ESPECIFICACION: Record<ClaseDePieza, Especificacion> = {
  video: {
    nombre: 'video',
    que_es: 'un video con alguien hablando: se ve y se escucha',
    proporciones: ['9:16', '1:1'],
    lleva_voz: true,
    lleva_audio: true,
    lleva_planos: true,
    lleva_tarjetas: false,
    lleva_texto_sobre_la_imagen: true,
    entregable: 'la hoja de rodaje plano por plano (con sus segundos), el guion literal de lo que se dice y un prompt por plano',
    como_se_arma: 'los planos salen del guion de la pieza; cada uno dice qué se ve, qué se dice, en qué se apoya y con qué audio. Las líneas habladas van en 15 palabras o menos.',
    criterios: [
      { id: 'gancho', nombre: 'Gancho', criterio: 'Si sostiene la atención los primeros 3 segundos' },
      { id: 'claridad', nombre: 'Claridad', criterio: 'Si se entiende qué se ofrece sin leer dos veces' },
      { id: 'deseo', nombre: 'Deseo', criterio: 'Si dan ganas de tenerlo o de probarlo' },
      { id: 'prueba', nombre: 'Prueba', criterio: 'Si hay algo que respalde lo que promete' },
      { id: 'llamada', nombre: 'Llamada', criterio: 'Si queda claro qué hacer después' },
    ],
  },
  reel_texto: {
    nombre: 'reel de texto',
    que_es: 'una secuencia de tarjetas de texto sobre una imagen: se lee, no se escucha',
    proporciones: ['9:16'],
    lleva_voz: false,
    lleva_audio: false,
    lleva_planos: false,
    lleva_tarjetas: true,
    lleva_texto_sobre_la_imagen: true,
    entregable: 'las tarjetas, una por una (el texto exacto de cada una, sus segundos en pantalla y sobre qué imagen va) y el prompt de la imagen de fondo',
    como_se_arma: 'cada tarjeta lleva su frase —la del negocio— y el tiempo que alcanza a leerse (3 palabras por segundo, mínimo 2 s). Lo que no entre en una tarjeta se parte en dos. No hay voz ni audio: el mensaje entero está escrito.',
    criterios: [
      { id: 'primer_cuadro', nombre: 'Primer cuadro', criterio: 'Si la primera tarjeta frena el scroll sin ayuda de voz' },
      { id: 'se_lee', nombre: 'Se lee', criterio: 'Si cada tarjeta alcanza a leerse en los segundos que está en pantalla' },
      { id: 'claridad', nombre: 'Claridad', criterio: 'Si se entiende qué se ofrece sin leer dos veces' },
      { id: 'deseo', nombre: 'Deseo', criterio: 'Si dan ganas de tenerlo o de probarlo' },
      { id: 'llamada', nombre: 'Llamada', criterio: 'Si queda claro qué hacer después' },
    ],
  },
  imagen: {
    nombre: 'imagen',
    que_es: 'un solo cuadro con su texto encima: no hay secuencia ni sonido',
    proporciones: ['1:1', '9:16'],
    lleva_voz: false,
    lleva_audio: false,
    lleva_planos: false,
    lleva_tarjetas: false,
    lleva_texto_sobre_la_imagen: true,
    entregable: 'el prompt de la imagen (una sola), el texto exacto que va encima y el encuadre',
    como_se_arma: 'no hay planos, ni voz, ni segundos: todo el mensaje está en el texto sobre la imagen (7 palabras como máximo, dos líneas) y en un solo cuadro que se entienda sin sonido.',
    criterios: [
      { id: 'sin_audio', nombre: 'Sin sonido', criterio: 'Si se entiende con el teléfono en silencio, que es como se ve casi siempre' },
      { id: 'texto', nombre: 'El texto', criterio: 'Si el texto se lee de un vistazo y dice algo concreto' },
      { id: 'claridad', nombre: 'Claridad', criterio: 'Si se entiende qué se ofrece sin leer dos veces' },
      { id: 'deseo', nombre: 'Deseo', criterio: 'Si dan ganas de tenerlo o de probarlo' },
      { id: 'llamada', nombre: 'Llamada', criterio: 'Si queda claro qué hacer después' },
    ],
  },
  // ---------------------------------------------------------------------------------------------
  // LOS TRES CONTENIDOS QUE NO SON VIDEO (regla del dueño: de los 5 de una ronda, máximo 2 son video).
  // Ninguno de estos toca la GPU: se arman con ffmpeg —y el material de imagen, con el mismo proveedor de
  // `imagenes.ts`— y salen como MP4 reproducible, igual que el video de una pieza.
  // ---------------------------------------------------------------------------------------------
  reel_imagenes: {
    nombre: 'reel de imágenes',
    que_es: 'varias imágenes en secuencia con sonido: se ve, se lee y se oye',
    proporciones: ['9:16', '1:1'],
    lleva_voz: false,
    lleva_audio: true,
    lleva_planos: false,
    lleva_tarjetas: true,
    lleva_texto_sobre_la_imagen: true,
    entregable: 'las imágenes en orden (qué se ve en cada una, con su texto encima y sus segundos) y el sonido de fondo que lleva',
    como_se_arma: 'una imagen por tarjeta, en el orden del texto, con movimiento suave y un fondo sonoro; cada texto se alcanza a leer en los segundos que está en pantalla (3 palabras por segundo, mínimo 2 s). No hay voz.',
    criterios: [
      { id: 'primer_cuadro', nombre: 'Primer cuadro', criterio: 'Si la primera imagen frena el scroll' },
      { id: 'se_lee', nombre: 'Se lee', criterio: 'Si cada texto alcanza a leerse en los segundos que está en pantalla' },
      { id: 'sonido', nombre: 'El sonido', criterio: 'Si el fondo sonoro acompaña sin tapar lo que se lee' },
      { id: 'claridad', nombre: 'Claridad', criterio: 'Si se entiende qué se ofrece sin leer dos veces' },
      { id: 'llamada', nombre: 'Llamada', criterio: 'Si queda claro qué hacer después' },
    ],
  },
  reel_animacion: {
    nombre: 'reel con animación',
    que_es: 'animación, imagen y sonido mezclados para llamar la atención',
    proporciones: ['9:16', '1:1'],
    lleva_voz: false,
    lleva_audio: true,
    lleva_planos: false,
    lleva_tarjetas: true,
    lleva_texto_sobre_la_imagen: true,
    entregable: 'las imágenes con su movimiento y su texto animado, en orden, con el sonido de fondo',
    como_se_arma: 'cada imagen entra con movimiento y su texto aparece animado, con una franja de color de la marca y un fondo sonoro: el movimiento es lo que frena el scroll. No hay voz.',
    criterios: [
      { id: 'gancho', nombre: 'Gancho', criterio: 'Si el movimiento de los primeros segundos sostiene la atención' },
      { id: 'primer_cuadro', nombre: 'Primer cuadro', criterio: 'Si la primera imagen frena el scroll' },
      { id: 'se_lee', nombre: 'Se lee', criterio: 'Si cada texto alcanza a leerse mientras está en pantalla' },
      { id: 'deseo', nombre: 'Deseo', criterio: 'Si dan ganas de tenerlo o de probarlo' },
      { id: 'llamada', nombre: 'Llamada', criterio: 'Si queda claro qué hacer después' },
    ],
  },
  titulo_animado: {
    nombre: 'título animado',
    que_es: 'una animación corta de título: el texto entra y queda, para enganchar al principio',
    proporciones: ['9:16', '1:1'],
    lleva_voz: false,
    lleva_audio: false,
    lleva_planos: false,
    lleva_tarjetas: false,
    lleva_texto_sobre_la_imagen: true,
    entregable: 'el texto exacto del título y cómo entra en pantalla (tamaño, posición y en qué segundo queda fijo)',
    como_se_arma: 'una sola frase —la del negocio— entra animada sobre el fondo (su imagen o el color de su marca) y queda quieta el resto del tiempo: son 3 segundos para enganchar al principio. Sin voz y sin sonido.',
    criterios: [
      { id: 'primer_cuadro', nombre: 'Primer cuadro', criterio: 'Si el título se lee en el primer segundo' },
      { id: 'texto', nombre: 'El texto', criterio: 'Si el texto se lee de un vistazo y dice algo concreto' },
      { id: 'claridad', nombre: 'Claridad', criterio: 'Si se entiende qué se ofrece sin leer dos veces' },
      { id: 'deseo', nombre: 'Deseo', criterio: 'Si dan ganas de tenerlo o de probarlo' },
      { id: 'llamada', nombre: 'Llamada', criterio: 'Si queda claro qué hacer después' },
    ],
  },
};

/** La proporción, sacada del formato: 9:16 si es vertical, 1:1 si es cuadrado. */
export function proporcionDe(formato: string): string {
  const f = String(formato || '').toLowerCase();
  if (/1:1|cuadrad/.test(f)) return '1:1';
  return '9:16';
}

/** Cuántos segundos necesita un texto para leerse: 3 palabras por segundo, mínimo 2. */
export function segundosDeLectura(texto: string): number {
  const palabras = String(texto || '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(2, Math.ceil(palabras / 3));
}

/** Parte un texto en tarjetas que se puedan leer: una frase por tarjeta, sin pasar de 7 palabras. */
export function tarjetasDeTexto(frases: string[]): string[] {
  const tarjetas: string[] = [];
  for (const f of frases) {
    const limpia = String(f || '').replace(/\s+/g, ' ').trim();
    if (!limpia) continue;
    const palabras = limpia.split(' ');
    if (palabras.length <= 9) { tarjetas.push(limpia); continue; }
    // Frase larga: se parte en dos tarjetas por el punto medio, sin cortar una palabra.
    const medio = Math.ceil(palabras.length / 2);
    tarjetas.push(palabras.slice(0, medio).join(' '));
    tarjetas.push(palabras.slice(medio).join(' '));
  }
  return tarjetas;
}

// =============================================================================================
// DEL TIPO DE CONTENIDO AL FORMATO, Y AL REVÉS
//
// El TIPO es la regla del dueño (cuántos videos por ronda y a qué precio sale cada uno); el FORMATO es el
// texto que la pieza guarda y que todo el sistema lee (la medida, si lleva voz, cómo se juzga). Estos dos
// helpers son el único puente entre los dos, para que el panel, el cobro y el generador no se contradigan.
// =============================================================================================

/** El formato de un tipo de contenido, con su proporción. Es el texto que se guarda en la pieza. */
export function formatoDe(tipo: TipoDeContenido, proporcion: '9:16' | '1:1' = '9:16'): string {
  const forma = proporcion === '1:1' ? 'cuadrado 1:1' : 'vertical 9:16';
  switch (tipo) {
    case 'video': return `video ${forma}`;
    case 'imagen con texto': return `imagen ${forma} con texto`;
    case 'reel de imágenes': return `reel de imágenes ${forma}`;
    case 'reel con animación': return `reel con animación ${forma}`;
    case 'título animado': return `título animado ${forma}`;
  }
}

/**
 * El tipo de contenido que le corresponde a un formato. Devuelve null cuando el formato es de ANTES de la
 * tabla por tipo (el «reel con texto sobre imagen» de siempre): esa pieza no tiene precio por tipo y quien
 * lo muestre tiene que decirlo, no ponerle un número que nadie fijó.
 */
export function tipoDeContenidoDe(formato: string): TipoDeContenido | null {
  switch (claseDeFormato(formato)) {
    case 'video': return 'video';
    case 'imagen': return 'imagen con texto';
    case 'reel_imagenes': return 'reel de imágenes';
    case 'reel_animacion': return 'reel con animación';
    case 'titulo_animado': return 'título animado';
    default: return null;
  }
}

/** Si el formato es de los que producen un MP4 que el panel reproduce (el video y los tres no-video). */
export function produceVideo(clase: ClaseDePieza): boolean {
  return clase !== 'reel_texto';
}

/** La clase de una pieza, a partir del TIPO de contenido que le asignó la ronda. */
export function claseDelTipo(tipo: TipoDeContenido): ClaseDePieza {
  switch (tipo) {
    case 'video': return 'video';
    case 'imagen con texto': return 'imagen';
    case 'reel de imágenes': return 'reel_imagenes';
    case 'reel con animación': return 'reel_animacion';
    case 'título animado': return 'titulo_animado';
  }
}

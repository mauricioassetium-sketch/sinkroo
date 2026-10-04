// =====================================================================================================
// EL PROMPT DE CADA MOTOR — uno por motor, con SUS necesidades, y no uno genérico para todos
//
// De qué se queja este archivo cuando no existe: los cinco motores de la cadena piden cosas distintas y
// se les estaba mandando el mismo texto. Un prompt genérico se ve bien en el código y sale mediocre en el
// resultado, porque cada motor tiene lo suyo:
//
//   · FLUX.1-schnell (GPU, destilado, cfg 1): NO TIENE PROMPT NEGATIVO — la guía no se usa, así que un
//     negativo no hace nada; y peor: escribir «no text, no letters» le pone esas dos palabras delante, y
//     el modelo las DIBUJA. Lo que no se quiere se pide en positivo («cuadro limpio, fondo liso»). Tampoco
//     quiere ristras de etiquetas ni «masterpiece, 8k, best quality»: eso desplaza al sujeto y no aporta.
//   · SDXL base (GPU, cfg 5,5): SÍ tiene negativo y hay que llenarlo (texto, marcas de agua, deformes). Lee
//     bien las etiquetas separadas por comas además de las frases.
//   · PenShot (guion → planos): no le sirve el guion pelado. Necesita el contexto —formato, segundos,
//     idioma y país, tono— o inventa planos cuadrados, en otro idioma o con otro estilo entre planos.
//   · Edge TTS (la voz del montaje): lee lo que le den, así que hay que darle texto LEÍBLE: fuera emojis,
//     numerales, enlaces, marcas de markdown y comillas tipográficas, que los lee en voz alta o los salta
//     con un tropiezo.
//   · ffmpeg/drawtext (los cuadros de los reels): tiene 24 caracteres por renglón y 3 renglones. Un texto
//     más largo NO se encoge: se corta. El texto hay que ARMARLO para que quepa, no recortarlo después.
//
// Cada función devuelve además POR QUÉ quedó así, y eso se guarda con la pieza: un prompt sin su razón no
// se puede corregir después.
// =====================================================================================================

export type Motor = 'imagen-flux' | 'imagen-flux-dev' | 'imagen-sdxl' | 'planos-penshot' | 'voz-edge' | 'cuadros-ffmpeg';

/** Lo que cada motor recibe, lo que no soporta y la regla que se sigue. Es la tabla de la que sale todo. */
export const NECESIDADES: Record<Motor, { recibe: string; no_soporta: string; regla: string }> = {
  'imagen-flux': {
    recibe: 'una frase en inglés, en positivo, con el sujeto primero',
    no_soporta: 'prompt negativo (cfg 1) · listas de etiquetas · «no text»: lo dibuja',
    regla: 'lo que no se quiere va dicho en positivo («cuadro limpio, fondo liso, superficie sin letras»)',
  },
  'imagen-flux-dev': {
    recibe: 'una frase en inglés, en positivo, con el sujeto primero (guía 3,5 en su nodo y unos 22 pasos)',
    no_soporta: 'prompt negativo · listas de etiquetas: es de guía destilada, el negativo no se aplica (y con cfg alto la imagen se quema)',
    regla: 'lo que no se quiere se pide en positivo; el dev entiende mejor la escena, las manos y los objetos que el destilado',
  },
  'imagen-sdxl': {
    recibe: 'frases separadas por comas + un negativo aparte',
    no_soporta: 'nada de esto: tiene guía (cfg 5,5) y usa el negativo de verdad',
    regla: 'el negativo se llena (texto, logo, marca de agua, deformes) y el positivo mantiene el oficio fotográfico',
  },
  'planos-penshot': {
    recibe: 'el guion + el contexto de la pieza (formato, segundos, idioma y país, tono, qué hace el negocio)',
    no_soporta: 'un guion sin contexto: inventa planos cuadrados o en otro idioma',
    regla: 'el contexto va en un encabezado corto, el guion va literal: el guion no se reescribe',
  },
  'voz-edge': {
    recibe: 'texto plano, con puntos y comas, sin nada que no se lea en voz alta',
    no_soporta: 'emojis, #numerales, enlaces, markdown, «comillas tipográficas», listas con viñetas',
    regla: 'se limpia la forma y no se toca el contenido: lo que el negocio dice se dice igual',
  },
  'cuadros-ffmpeg': {
    recibe: 'tarjetas cortas, de 24 caracteres por renglón y 3 renglones como máximo',
    no_soporta: 'texto largo: no se encoge, se CORTA (y una frase cortada es un dato perdido)',
    regla: 'si la frase no cabe, se parte en otra tarjeta: nunca se recorta',
  },
};

/**
 * LO QUE ENTRA EN CADA CUADRO, medido donde el motor lo usa de verdad (`contenido.ts`, el `envolver` de cada
 * tipo): no son números elegidos acá. La letra es 1080/17 = 63 px de alto, y lo demás es la cuenta de renglones.
 * El título animado lleva MENOS: es un solo cuadro y su texto tiene que entrar de un golpe.
 */
export const CAPACIDAD_DEL_CUADRO: Record<string, { porRenglon: number; renglones: number }> = {
  'imagen con texto': { porRenglon: 22, renglones: 3 },
  'reel de imágenes': { porRenglon: 20, renglones: 3 },
  'reel con animación': { porRenglon: 20, renglones: 3 },
  'reel de texto': { porRenglon: 24, renglones: 3 },
  'título animado': { porRenglon: 18, renglones: 2 },
};
const capacidadDe = (tipo?: string) => CAPACIDAD_DEL_CUADRO[String(tipo || '')] ?? { porRenglon: 20, renglones: 3 };
/** Cuántos caracteres entran en un cuadro de ese tipo: es el tope del texto, no una sugerencia. */
export const caracteresDelCuadro = (tipo?: string) => { const c = capacidadDe(tipo); return c.porRenglon * c.renglones; };

export type MotorDeImagen = 'flux' | 'flux-dev' | 'sdxl';

/**
 * Qué familia de modelo es, por su nombre de archivo: manda el prompt y los ajustes de muestreo.
 * `flux-dev` va aparte de `flux` (schnell) porque NO se le pide lo mismo: el destilado muestrea sin guía
 * (cfg 1, 4 pasos) y su negativo se ignora, mientras el dev muestrea con guía real (cfg 3,5, ~22 pasos) y
 * su negativo trabaja. Confundirlos es tirar el negativo a la basura o quemar la imagen.
 */
export function motorDeImagen(nombreDelModelo: string): MotorDeImagen {
  if (/flux/i.test(nombreDelModelo)) return /dev/i.test(nombreDelModelo) ? 'flux-dev' : 'flux';
  return 'sdxl';
}

/**
 * EL DIRECTOR DE FOTOGRAFÍA — LA DECISIÓN DE CINE LA TOMA EL MOTOR, NO EL QUE ESCRIBE LOS PLANOS.
 *
 * Por qué existe: la luz, la óptica, el movimiento y el etalonaje los escribía el motor de planos dentro de
 * cada plano, y su propia instrucción dice «evitá la jerga técnica» y «sé conciso» porque su trabajo es la
 * continuidad entre planos, no la dirección de fotografía. Resultado medido: en la misma pieza convivían
 * «natural overcast» y «Kodak 2383», la óptica cambiaba de plano a plano y la luz no tenía que ver con lo que
 * decía la línea del guion.
 *
 * Acá la elección se toma UNA vez y es la misma para toda la pieza: un etalonaje por pieza (no uno por plano),
 * tamaños de plano y ópticas que rotan en un orden fijo, y una luz que AVANZA como avanza un día de trabajo
 * (hora dorada → luz pareja → hora azul). No depende del humor del modelo y se puede leer y corregir.
 */
export function cineDeLaPieza(d: { tono?: string; n: number; total: number }): {
  plano: string; optica: string; luz: string; movimiento: string; etalonaje: string; grano: string; porque: string;
} {
  const tono = String(d.tono || '').toLowerCase();
  const calido = /cercan|cálid|calid|amable|familiar|emocion/.test(tono);
  const formal = /formal|profesional|institucional|corporativ|serio|tecnico|técnico/.test(tono);

  // El tamaño de plano rota en un orden fijo y empieza y termina ancho: es el ritmo de montaje de cualquier
  // pieza corta (se abre el mundo, se entra en la persona, se vuelve a abrir).
  const TAMANOS = ['wide establishing shot', 'medium shot', 'medium close-up', 'medium shot', 'wide shot', 'close-up'];
  const plano = TAMANOS[(Math.max(1, d.n) - 1) % TAMANOS.length];
  const optica = /wide|establishing/.test(plano)
    ? 'shot on a 24mm wide lens, deep focus, everything sharp'
    : /close-up/.test(plano)
      ? 'shot on an 85mm lens, very shallow depth of field, background fully blurred'
      : /medium close/.test(plano)
        ? 'shot on a 50mm lens, shallow depth of field, background softly blurred'
        : 'shot on a 35mm lens, moderate depth of field';

  // LA LUZ AVANZA CON LA PIEZA: tres tramos, como un día de trabajo que pasa. Se calcula con el índice del
  // plano, no con la hora que alguien escriba, así la pieza nunca queda con dos luces que no pegan.
  const tramo = Math.max(1, d.total) <= 2 ? 1 : Math.ceil((Math.max(1, d.n) / Math.max(1, d.total)) * 3);
  const luz = tramo <= 1
    ? 'golden hour, low warm sun raking across the scene, long shadows'
    : tramo === 2
      ? 'flat overcast daylight, soft even light, no harsh shadows'
      : 'late blue hour, cool ambient light, practical lights starting to glow';

  // El movimiento de cámara también es nuestro: se pide el mínimo que hace falta (quieto o un empuje lento).
  const MOVIMIENTOS = ['locked-off tripod, no camera movement', 'slow steady push in', 'slow lateral dolly with the subject', 'locked-off tripod, no camera movement', 'gentle handheld follow', 'slow pull back'];
  const movimiento = MOVIMIENTOS[(Math.max(1, d.n) - 1) % MOVIMIENTOS.length];

  // UN ETALONAJE POR PIEZA: se deriva del tono, no del plano, así los seis planos se ven de la misma película.
  const etalonaje = calido
    ? 'warm film grade, Kodak 2383 print emulation, gentle highlight roll-off'
    : formal
      ? 'restrained film grade, Fujifilm ETERNA emulation, muted greens, neutral skin tones'
      : 'natural film grade, Kodak Portra emulation, honest skin tones';

  return { plano, optica, luz, movimiento, etalonaje, grano: 'fine film grain, 35mm negative texture',
    porque: `la decisión de cine es del motor y vale para toda la pieza: ${plano} (plano ${d.n} de ${d.total}), ${optica.split(',')[0]}, ${luz.split(',')[0]}, ${movimiento.split(',')[0]}, y un solo etalonaje (${etalonaje.split(',')[0]}), en vez de que el motor de planos la improvise plano por plano` };
}

/**
 * DE TODO LO QUE ESCRIBE EL MOTOR DE PLANOS, SÓLO LAS VARIABLES DURAS.
 *
 * Su instrucción no es de dirección de fotografía: es de continuidad (quién es, qué hace, con qué, dónde). Lo
 * que escriba de luz, cámara, óptica o acabado se descarta acá, y en su lugar entra la decisión de cine del
 * motor. Así el mismo hecho no se cuenta dos veces ni se contradice, y la pieza tiene una sola mirada.
 */
export function soloVariablesDuras(texto: string): string {
  const RUIDO = /\b(cinematic|cinematogr\w*|filmic|lighting|light|sunlit|sunlight|golden hour|blue hour|dusk|dawn|morning|afternoon|evening|midday|sunny|overcast|shadow\w*|contrast|grading|grade|colour grade|color grade|kodak\s*\d*|fujifilm|eterna|teal and orange|teal & orange|film grain|grain\w*|bokeh|depth of field|shallow|wide shot|establishing shot|full shot|medium shot|close-?up|extreme close|point of view|pov|low angle|high angle|aerial|drone|handheld|steadicam|steadycam|tripod|dolly|pan|pans|tilt|zoom|push in|pushes in|pull back|tracking|crane|orbits?|24 ?mm|35 ?mm|50 ?mm|85 ?mm|anamorphic|f\/\d+(\.\d+)?|static|camera motion|motion blur|frame rate|\d+ ?fps|photorealistic|hyperrealistic|realistic|8k|4k|high detail|ultra detailed|editorial|commercial photograph|commercial|professional|moody|dramatic|subject slightly off-centre|subject slightly off-center|cinematic realism|cinematic lighting)\b[^.,;]*/gi;
  return String(texto || '')
    .replace(RUIDO, ' ')
    // Y EL DIÁLOGO TAMBIÉN SE VA: la pieza lleva la voz en off por encima, así que el plano no debe mostrar a
    // nadie hablando (el motor de video le mueve la boca y queda un mimo). Medido: los planos traían
    // «speaking: You already tokenized your real-world assets.», que además no es lo que se ve.
    // El diálogo no siempre viene con dos puntos: medido, «speaking the Spanish line Usted ya tokenizo sus
    // activos del mundo real» quedaba dentro del prompt y el motor de video le mueve la boca al que habla.
    .replace(/\b(speaking|says|said|dice|diciendo)\b[^.,;]*/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    // Sacar una palabra deja la coma y el punto huérfanos («calm and,» «,, natural.,»): se limpian para que el
    // modelo no lea puntuación rota, que es ruido en un prompt.
    .replace(/\s*,\s*(?=[,.;])/g, '')
    .replace(/\s*,\s*,+/g, ',')
    .replace(/\s*\.\s*,/g, '.')
    .replace(/\s+([.,;])/g, '$1')
    .replace(/^[\s.,;]+/, '')
    .replace(/[\s,]+$/, '')
    .trim();
}

/**
 * EL PROMPT DE LA IMAGEN, POR MOTOR. Misma información, dos formas: FLUX la quiere en positivo y sin
 * negativo; SDXL la quiere con etiquetas y con su negativo aparte.
 */
export function promptDeImagen(motor: MotorDeImagen, d: {
  queHace: string; formato: string;
  /** LA MISMA ESCENA EN INGLÉS (la escribe `escritor.escenaEnIngles`): es lo que estos motores leen. */
  queHaceEn?: string;
  textoComoVa?: string;
  textoSobreLaImagen?: string;
  colores?: string[]; lugar?: string; tono?: string;
  /** Qué plano es (1..total) y cuántos tiene la pieza: con esto se decide el cine de toda la pieza. */
  n?: number; total?: number; textoEnIngles?: string;
}): { prompt: string; negativo: string; motor: Motor; porque: string } {
  const colores = (d.colores ?? []).filter(c => /^#[0-9a-f]{6}$/i.test(c)).slice(0, 3);
  // La escena en inglés manda sobre la española: medido con la misma semilla, la acción en español no traía
  // a la persona a la imagen. Si no hay inglés, se usa el español y se dice.
  const escena = String(d.queHaceEn || d.queHace || '')
    .replace(/\s+/g, ' ').trim()
    // La escena traducida llega como frase suelta («A hairdresser bathes a small dog.»): al empalmarla va en
    // minúscula y sin el punto final, que si no queda «showing A hairdresser …. , in …».
    .replace(/^([A-Z])/, (m) => m.toLowerCase())
    .replace(/[.\s]+$/, '')
    // El tope subió de 300 a 900: un plano de cine con su especificación (tamaño, óptica, movimiento, luz,
    // lugar, quién hace qué, etalonaje) mide entre 400 y 700 caracteres, y con 300 se perdía el final —que es
    // justo donde van la luz y el etalonaje.
    .slice(0, 900);
  const escenaFueTraducida = Boolean(d.queHaceEn);
  const notaDeIdioma = escenaFueTraducida
    ? 'la escena se pidió en inglés (es lo que leen estos modelos)'
    : 'OJO: la escena se pidió en español: puede que el motor no la atienda (no hubo traducción)';
  // LA DECISIÓN DE CINE ES NUESTRA Y VALE PARA TODA LA PIEZA (ver `cineDeLaPieza`): el tamaño de plano, la
  // óptica, la luz y el movimiento salen de acá, no de lo que haya escrito el motor de planos.
  const cine = cineDeLaPieza({ tono: d.tono, n: d.n ?? 1, total: d.total ?? 1 });
  // Y DE LA ESCENA DEL PLANO SÓLO QUEDAN LAS VARIABLES DURAS (quién hace qué, dónde, con qué): su luz, su
  // cámara y su acabado se descartan para que no compitan con la decisión de cine de arriba.
  const duras = soloVariablesDuras(escena);
  const vertical = /9:16|vertical|reel|historia/i.test(String(d.formato || ''));
  const tono = String(d.tono || '').toLowerCase();
  const calido = /cercan|cálid|calid|amable|familiar/.test(tono);
  const formal = /formal|profesional|institucional|corporativ/.test(tono);
  // El lugar es el nombre de la zona (Medellín, el norte de Medellín): no se le pone artículo, que en
  // «en un norte de Medellín real» suena a traducción.
  // La zona llega del negocio tal como él la escribió («el norte de Medellín»): el artículo en español se cae
  // para no dejar «in el norte de Medellín», que es inglés roto dentro del prompt.
  const zona = String(d.lugar || '').replace(/^(el|la|los|las)\s+/i, '').trim().slice(0, 60);
  const lugar = zona
    ? `in ${zona}, a real place in use with everyday objects around`
    : 'in a real workplace, in use, with everyday objects around';
  const luz = calido
    ? 'warm soft natural window light from the side, golden tone, gentle shadows'
    : formal
      ? 'clean soft daylight, even and calm, gentle shadows, no harsh contrast'
      : 'soft natural window light from the side, gentle shadows, no flash';
  const oficio = 'shot on a full-frame camera with a 50mm lens at f/2.0, shallow depth of field, background softly out of focus, natural textures, slight film grain, documentary style, photorealistic, high detail';
  const paleta = colores.length ? `muted neutral palette with the brand colours as accents: ${colores.join(', ')}` : 'muted neutral palette';

  if (motor === 'flux-dev' || motor === 'flux') {
    // `flux-dev` (el modelo bueno) comparte el positivo del schnell, pero ADEMÁS usa negativo: muestrea con
    // guía real, así que lo que se nombra ahí desaparece. Es la diferencia que arregla las letras inventadas
    // en el casco, las manos pegadas al equipo y el aire de render: antes no había forma de pedirlo.
    const esDev = motor === 'flux-dev';
    // FLUX: frases naturales, TODO en positivo, sin etiquetas y SIN NEGATIVO (cfg 1 no lo usa, y nombrar
    // «texto» o «logo» es la forma más segura de que aparezcan dibujados).
    // EN INGLÉS: el codificador de texto de FLUX (T5) lee inglés y con el español pierde —medido: con el
    // prompt en español la primera muestra salió un cuarto oscuro con letras inventadas en un envase—.
    // La regla sigue siendo la misma: TODO en positivo, sin negativo y sin nombrar lo que no se quiere.
    // LA ESCENA DEL PLANO VA PRIMERO Y SIN ADORNOS DELANTE. El plano ya viene escrito como una toma de cine
    // (tamaño, óptica, movimiento, luz, lugar, quién hace qué, etalonaje): es el mejor texto que tiene el
    // motor y antes iba detrás de un «editorial commercial photograph, subject slightly off-centre» genérico
    // que le competía. Acá solo se le suma lo que el plano no trae.
    const prompt = [
      // LAS VARIABLES DURAS DEL PLANO (quién hace qué, dónde, con qué): es lo único que aporta el motor de planos.
      duras || escena,
      // Y EL CINE, QUE ES NUESTRO: tamaño de plano, óptica, luz, movimiento, etalonaje y grano, decididos una
      // sola vez para toda la pieza. Antes esto lo improvisaba el motor de planos plano por plano.
      cine.plano,
      cine.optica,
      cine.luz,
      cine.movimiento,
      cine.etalonaje,
      cine.grano,
      // Lo que ningún plano escribe y hace que la foto no parezca de catálogo: momento real, imperfecciones,
      // cosas usadas. La instrucción vieja pedía «superficies lisas, fondo despejado, paredes vacías» para
      // esquivar las letras inventadas, y eso era peor: dejaba la escena muerta y sin nada que mirar.
      'candid documentary moment, photographed on location, natural imperfections, worn tools and surfaces, real working environment',
      // El cuadro se pide en positivo (con cfg 1 no hay negativo): lo que no se quiere se dice al revés.
      'incidental unmarked equipment, surfaces without lettering',
      vertical ? 'vertical 9:16 framing' : 'square 1:1 framing',
      paleta,
    ].filter(Boolean).join(', ');
    // LOS DOS FLUX SON DE GUÍA DESTILADA: el negativo NO SE USA (cfg 1) —llenario no cambia nada y nombrar
    // «texto» o «logo» en el positivo es la forma más segura de que aparezcan dibujados—. Lo que mejora la
    // calidad con el dev es el modelo (entiende mejor la escena, las manos y los objetos) y el positivo.
    return {
      prompt, negativo: '', motor: esDev ? 'imagen-flux-dev' : 'imagen-flux',
      porque: esDev
        ? `FLUX.1-dev es el modelo bueno (guía 3,5 en su propio nodo y unos 22 pasos contra los 4 del destilado): atiende mejor la escena y el oficio, pero como todo FLUX muestrea sin negativo, así que lo que no se quiere se pide en positivo («cuadro limpio, superficies lisas, sin rótulos») y ${notaDeIdioma}.`
        : `FLUX.1-schnell es destilado y muestrea sin guía (cfg 1): un negativo no se usa, y nombrar «texto» o «logo» hace que el modelo los dibuje. Todo va en positivo, en frases naturales y ${notaDeIdioma}.`,
    };
  }

  // SDXL: etiquetas separadas por comas y el negativo aparte —que aquí sí trabaja—.
  // EL SUJETO VA PRIMERO: SDXL pesa más los primeros tokens (su codificador es CLIP, no un T5 largo), y con
  // el oficio fotográfico delante se quedaba con la escena de ambiente y perdía a la persona (medido: la
  // misma escena en inglés con el oficio delante salió sin la peluquera). Acá el orden es sujeto → lugar →
  // luz → cámara → paleta.
  const prompt = [
    duras ? `a photo of ${duras}` : '',
    vertical ? 'editorial commercial photograph, vertical 9:16 framing, subject slightly off-centre' : 'editorial commercial photograph, square 1:1 framing, subject slightly off-centre',
    zona ? `in ${zona}, a real place in use with everyday objects around` : 'in a real workplace, in use, with everyday objects around',
    // La misma decisión de cine que en FLUX: la luz, la óptica y el movimiento son del motor, no del plano.
    cine.luz,
    `${cine.optica}, ${cine.movimiento}`,
    cine.etalonaje, cine.grano,
    'natural skin tones, realistic textures, slight film grain, documentary style, photorealistic, high detail',
    paleta === 'paleta neutra apagada' ? 'muted neutral palette' : `muted neutral palette with the brand colours as accents: ${colores.join(', ')}`,
  ].filter(Boolean).join(', ');
  const negativo = [
    'text', 'letters', 'words', 'watermark', 'logo', 'signature', 'caption',
    'illustration', 'cartoon', '3d render', 'cgi', 'plastic skin', 'deformed', 'extra limbs', 'extra fingers',
    'oversaturated', 'blurry', 'low quality', 'jpeg artifacts', 'stock-photo look, smiling models posing',
  ].join(', ');
  return {
    prompt, negativo, motor: 'imagen-sdxl',
    porque: `SDXL muestrea con guía (cfg 5,5): el negativo sí trabaja y por eso se llena (texto, marcas, deformes), el positivo mantiene el oficio fotográfico en frases separadas por comas, y ${notaDeIdioma}.`,
  };
}

/**
 * EL TEXTO QUE ANIMA EL PLANO (motor de video, imagen → video).
 *
 * El motor recibe la foto Y un texto, y el clip sigue al texto: si el texto describe la foto quieta, el clip
 * sale quieto. Hasta ahora se le pasaba la MISMA descripción que pintó la imagen, así que el movimiento solo
 * aparecía de casualidad («camera slowly pans»). Acá se pide el movimiento en tres partes: la acción que el
 * plano ya nombró, su movimiento de cámara repetido AL FINAL —que es donde el motor lo pesa más—, y una
 * frase que exige movimiento real entre cuadros.
 */
export function textoDeMovimiento(escena: string, movimiento?: string, accion?: string): { prompt: string; porque: string } {
  const limpio = soloVariablesDuras(String(escena || '')).replace(/\s+/g, ' ').trim();
  // El movimiento de cámara es la decisión de cine del motor (`cineDeLaPieza.movimiento`) y llega por parámetro.
  // Antes se buscaba dentro del texto del plano, que era de quien lo escribía: por eso el clip salía quieto.
  const pedido = String(movimiento || '').trim();
  const camara = /no camera movement|locked-off|locked off|tripod, no/i.test(pedido)
    // PARA EL VIDEO no existe el «quieto»: pedirle «sin movimiento de cámara» al motor de video es pedirle un
    // clip congelado, y lo obedece (medido: el clip salió foto con zoom). Si la decisión de cine es trípode
    // fijo, al motor de video se le pide una respiración mínima, que mantiene el cuadro vivo sin mover el plano.
    ? 'subtle handheld drift, the frame stays alive'
    : pedido
      || /\b(camera|dolly|pan|pans|tilt|crane|pushes?|pulls?|tracks?|zoom|handheld|steadicam|steadycam|orbits?|follows?)[^.,;]*/i
        .exec(String(escena || ''))?.[0]?.trim();
  // EL REPARTO DEL LARGO: primero se reserva el lugar de la cola de movimiento (cámara + la frase que exige
  // movimiento real) y recién después se recorta la escena. Antes el corte era parejo y se comía la cola, que
  // es la parte que más pesa al final del prompt.
  const cola = [camara || 'slow steady camera movement',
    'the action continues naturally through the whole shot, real movement between frames, subtle motion of people, hands and drifting light'].join(', ');
  const cuerpo = limpio.slice(0, Math.max(240, 900 - cola.length - 2)).replace(/[\s,]+$/, '');
  // LA ACCIÓN VA PEGADA A LA ESCENA, DELANTE: es lo que el motor de video tiene que hacer con el cuerpo. Si no
  // se la pide, el clip queda como una foto (medido: tres clips congelados con la escena sola).
  const prompt = [cuerpo, String(accion || '').trim(), cola].filter(Boolean).join(', ');
  return {
    prompt,
    porque: 'al motor de video se le pide el MOVIMIENTO, no la escena quieta: la acción del plano, su movimiento de cámara al final y una exigencia explícita de movimiento real entre cuadros',
  };
}

/**
 * LO QUE SE LE MANDA A PENSHOT. El guion va LITERAL —no se reescribe— y arriba va el contexto que el motor
 * necesita para no inventar planos cuadrados, en otro idioma o con otro estilo entre planos.
 */
export function entradaDePlanos(d: {
  guion: string; formato: string; segundos?: number; tono?: string; pais?: string; queHace?: string;
}): { script: string; porque: string } {
  const vertical = /9:16|vertical|reel|historia/i.test(String(d.formato || ''));
  const pais = String(d.pais || 'Colombia');
  const idioma = /mexic/i.test(pais) ? 'español de México' : /argentin|rioplat/i.test(pais) ? 'español de Argentina' : 'español de Colombia';
  const encabezado = [
    `Contexto de la pieza: aviso para redes${vertical ? ' en video vertical 9:16' : ''}.`,
    `Se habla en ${idioma} y todo lo que aparezca en pantalla va en ${idioma}.`,
    // EL NÚMERO DE PLANOS TIENE QUE ENTRAR EN LA DURACIÓN. Medido: sin esta línea el motor devolvía 15 planos
    // y 47,68 s para una pieza de 30 s, y el nuestro se quedaba con los primeros 6 (20,86 s): dos tercios de
    // los planos se tiraban y las últimas líneas del guion se quedaban sin imagen. El número se calcula, no se
    // deja al azar.
    d.segundos
      ? `La pieza dura ${Math.round(d.segundos)} segundos en total y cada plano dura 5 segundos o menos. Devolvé EXACTAMENTE ${Math.max(2, Math.min(6, Math.floor(d.segundos / 5)))} planos, uno por cada línea del guion, y que la suma de sus duraciones NO pase de ${Math.round(d.segundos)} segundos.`
      : 'Cada plano dura 5 segundos o menos.',
    d.tono ? `El tono del negocio es «${String(d.tono).slice(0, 60)}».` : '',
    // EL MATERIAL DEL NEGOCIO VA ENTERO (hasta 900 caracteres). Cortado a 160, el modelo no llegaba a ver
    // los mercados reales del negocio (torres, puertos, minas, campo) y solo le quedaba la abstracción: de
    // ahí salían los globos azules. El material concreto es lo que hace que el plano muestre algo de verdad.
    d.queHace ? `El negocio hace: ${String(d.queHace).slice(0, 900)}.` : '',
    // ---------------------------------------------------------------------------------------------
    // LA ESPECIFICACIÓN DE CÁMARA. Lo que había antes acá («lugar real y en uso, sin gente posando»)
    // produjo cuartos vacíos con una mesa; al abrirlo salió el otro extremo: el folleto tecnológico
    // (globos azules, cadenas flotando, «streams de datos»). Ninguno de los dos es cine. Lo que se pide
    // ahora es una toma de verdad: lugar real, gente trabajando, luz concreta y acabado de película.
    // ---------------------------------------------------------------------------------------------
    'Cada plano muestra LO QUE ESA LÍNEA DICE, con el sujeto concreto de la frase: quién hace, qué hace y con qué.',
    // EL REPARTO DE RESPONSABILIDADES: PenShot aporta las variables duras y nada más. La luz, la óptica, el
    // movimiento y el acabado los decide el motor (`cineDeLaPieza`), y si los escribiera acá se descartarían:
    // su propia instrucción es de continuidad, no de dirección de fotografía, así que dejarlo improvisar el
    // cine daba una pieza con dos luces y dos etalonajes que no pegaban entre sí.
    'Describe CADA PLANO con SOLO estos cuatro datos, sin adornos:',
    '  1) QUIÉN HACE QUÉ: personas reales en medio del trabajo, con la acción en curso y concreta (un topógrafo apuntando, un auditor revisando, un operario cargando). Sin poses, sin mirar a cámara;',
    '  2) DÓNDE: el lugar real y concreto, con sus señales de uso (polvo, huellas, herramientas, cableado, andamios, muelle, campo);',
    '  3) CON QUÉ: los objetos que se ven en el cuadro, apoyados y quietos;',
    '  4) CUÁNTO DURA: 5 segundos o menos.',
    'NO escribas la luz, la hora del día, la óptica, el movimiento de cámara ni el acabado: de eso se encarga el motor, y lo que escribas se descarta.',
    'BUSCA EL MUNDO REAL DEL NEGOCIO, no su metáfora: si vende verificación de activos, el plano es una torre en obra, un muelle con contenedores, una mina, una bodega de lingotes, un campo de cultivo o una sala de control — lo que el negocio realmente toca, y con lo que su material ya cuenta.',
    'PROHIBIDO el look de folleto tecnológico: nada de globos azules, íconos flotantes, hologramas, cadenas de bloques, «streams de datos», planetas de neón ni dibujos 3D. Si el negocio es serio, se muestra con cosas que existen.',
    'PROHIBIDO el relleno: nada de mesas con objetos, ventanas vacías ni pasillos si la línea habla de otra cosa.',
    'Sin texto legible: ni carteles, ni etiquetas, ni rótulos, ni marcas, ni títulos (el generador convierte cualquier texto en letras deformes).',
    'Cada plano dura 5 segundos o menos y tiene que poder ANIMARSE: se prefiere una acción en curso antes que una naturaleza muerta. No cambies el texto del guion.',
    'EVITÁ EL PLANO MUY CERRADO DE MANOS MANIPULANDO UN APARATO: es lo que peor resuelve cualquier generador (los dedos se funden con el objeto). Preferí un plano medio o general donde la acción se lea en el cuerpo entero —caminar, mirar, señalar, cargar—, o un detalle de textura SIN manos (el metal, la madera, el suelo).',
    'NO APOYES EL PLANO EN UN OBJETO CHICO EN LA MANO (un escáner, un teléfono, una llave, una herramienta): al animarse cambia de forma, se agranda o desaparece, y el cuadro entero se cae. Si hace falta el objeto, que esté apoyado y quieto, no en la mano.',
    'ESQUIVÁ LAS SUPERFICIES ROTULADAS: contenedores con códigos, carteles, máquinas con placas, envases con etiquetas. Cualquier letra que traiga el lugar sale inventada y encima se deforma al moverse. Preferí lugares de superficies limpias (obra, campo, muelle vacío, sala con paredes lisas).',
  ].filter(Boolean).join('\n');
  return {
    script: `${encabezado}\n\nGuion, tal cual (cada línea es un tramo):\n${String(d.guion || '').trim()}`,
    porque: 'PenShot desglosa sin contexto si no se le da: el formato, la duración, el idioma, el país y el tono van en un encabezado corto, y el guion va literal para que no lo reescriba.',
  };
}

/**
 * EL TEXTO QUE SE LEE EN VOZ ALTA. Se limpia la FORMA (lo que una voz no puede leer), nunca el contenido.
 * Devuelve también qué se quitó: si el texto sale distinto, hay que poder ver por qué.
 */
export function textoParaLaVoz(texto: string, titulo?: string): { texto: string; quitado: string[]; porque: string } {
  const quitado: string[] = [];
  let t = String(texto || '');

  // 1) EL TÍTULO PEGADO ADELANTE. El título de la pieza repite el gancho: leer los dos es decir lo mismo dos
  //    veces. Se saca del principio (con o sin dos puntos), nunca de en medio.
  const normal = (s: string) => s.replace(/\s+/g, ' ').trim();
  const tit = normal(String(titulo || ''));
  if (tit.length > 8) {
    for (const p of [tit, tit.split(':')[0]]) {
      const pp = normal(p);
      if (pp.length > 8 && normal(t).toLowerCase().startsWith(pp.toLowerCase())) {
        t = normal(t.slice(normal(t).length - (normal(t).length - pp.length)).replace(/^[\s:·—–-]+/, ''));
        quitado.push('el título pegado al principio');
        break;
      }
    }
  }

  // 2) LO QUE UNA VOZ NO LEE: emojis, numerales, enlaces, marcas de markdown, viñetas y comillas tipográficas.
  const reglas: { que: RegExp; como: string; motivo: string }[] = [
    { que: /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2190}-\u{21FF}]/gu, como: '', motivo: 'emojis y símbolos' },
    { que: /(^|\s)#[\p{L}\p{N}_]+/gu, como: ' ', motivo: 'numerales (#)' },
    { que: /https?:\/\/\S+|www\.\S+/gi, como: ' ', motivo: 'enlaces' },
    { que: /\*\*|__|~~|`{1,3}/g, como: '', motivo: 'marcas de markdown' },
    { que: /^\s*[-*•]\s+/gm, como: '', motivo: 'viñetas' },
    { que: /[«»]/g, como: '', motivo: 'comillas tipográficas' },
    { que: /[\[\]{}]/g, como: '', motivo: 'corchetes y llaves' },
    { que: /\b(?:WhatsApp|whatsapp)\b/g, como: 'wasap', motivo: 'la marca WhatsApp dicha en voz alta' },
    { que: /&/g, como: ' y ', motivo: 'el signo &' },
    { que: /\s*\/\s*/g, como: ' o ', motivo: 'la barra' },
  ];
  for (const r of reglas) {
    if (r.que.test(t)) { t = t.replace(r.que, r.como); quitado.push(r.motivo); }
  }

  // 3) LOS PUNTOS QUE FALTAN: sin punto final, el lector encadena la última frase con la siguiente de otro
  //    bloque. Se cierra cada renglón con punto (y coma si venía a medias) — es forma, no contenido.
  t = t.split(/\n+/).map(l => {
    const s = l.trim();
    if (!s) return '';
    return /[.!?:,;]$/.test(s) ? s : `${s}.`;
  }).filter(Boolean).join(' ');

  // 4) LOS ESPACIOS: dobles, delante de la coma y saltos de más. Y el texto final, en un solo bloque.
  t = t.replace(/\s+([.,;:!?])/g, '$1').replace(/\s{2,}/g, ' ').trim();

  return {
    texto: t,
    quitado: [...new Set(quitado)],
    porque: 'Edge TTS lee lo que le pongan: se limpia la forma (emojis, numerales, enlaces, markdown, viñetas, comillas) y el contenido queda igual. Los renglones se cierran con punto para que no encadene dos bloques.',
  };
}

/**
 * LAS TARJETAS DEL CUADRO, ARMADAS PARA QUE QUEPAN. El motor de ffmpeg tiene 24 caracteres por renglón y 3
 * renglones: un texto más largo no se encoge, se corta. Así que la frase larga se PARTE EN OTRA TARJETA en
 * vez de recortarse, y cada tarjeta sale ya envuelta en renglones que caben.
 */
export function tarjetasDelCuadro(frases: string[], tipoDeContenido?: string): { texto: string; lineas: string[] }[] {
  const { porRenglon, renglones } = capacidadDe(tipoDeContenido);
  const tope = porRenglon * renglones;
  const limpiar = (s: string) => String(s || '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '')  // un emoji no se puede dibujar con esta letra
    .replace(/[«»"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const envolver = (texto: string) => {
    const palabras = texto.split(' ').filter(Boolean);
    const lineas: string[] = [];
    for (const p of palabras) {
      const ultima = lineas[lineas.length - 1];
      if (ultima && (ultima + ' ' + p).length <= porRenglon) lineas[lineas.length - 1] = `${ultima} ${p}`;
      else lineas.push(p);
    }
    return lineas.slice(0, renglones);
  };
  const tarjetas: { texto: string; lineas: string[] }[] = [];
  for (const f of frases) {
    const limpia = limpiar(f);
    if (!limpia) continue;
    if (limpia.length <= tope) {
      tarjetas.push({ texto: limpia, lineas: envolver(limpia) });
      continue;
    }
    // No cabe: se parte en DOS tarjetas, por la mitad y sin cortar palabras — antes, lo que sobraba del cuadro
    // se descartaba en silencio y la frase del negocio quedaba a medias en pantalla.
    let palabras = limpia.split(' ');
    // Si aun partida por la mitad no cabe (frase larguísima), se parte en tantas como haga falta.
    const partes: string[][] = [];
    let actual: string[] = [];
    for (const w of palabras) {
      const tentativa = [...actual, w].join(' ');
      if (tentativa.length > tope && actual.length) { partes.push(actual); actual = [w]; }
      else actual = [...actual, w];
    }
    if (actual.length) partes.push(actual);
    // (Una sola parte acá solo puede pasar con una palabra más larga que el cuadro entero: se deja tal cual y
    // el motor la recorta; partir una palabra por la mitad sería peor.)
    for (const parte of partes) if (parte.length) tarjetas.push({ texto: parte.join(' '), lineas: envolver(parte.join(' ')) });
  }
  return tarjetas;
}

/**
 * EL TEXTO DE UN SOLO CUADRO (el título animado no se parte en tarjetas: es una sola frase que entra de un
 * golpe o no entra). Se elige la frase MÁS CORTA de las que caben; si ninguna cabe, se corta por palabra y se
 * DICE que se cortó — lo que no puede pasar es que se recorte en silencio.
 */
export function textoDeUnSoloCuadro(frases: string[], tipoDeContenido = 'título animado'): { texto: string; completo: boolean; porque: string } {
  const tope = caracteresDelCuadro(tipoDeContenido);
  const limpiar = (s: string) => String(s || '').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '').replace(/[«»"]/g, '').replace(/\s+/g, ' ').trim();
  const candidatas = frases.map(limpiar).filter(Boolean);
  if (!candidatas.length) return { texto: '', completo: true, porque: 'no había texto para el cuadro' };
  const caben = candidatas.filter(c => c.length <= tope).sort((a, b) => a.length - b.length);
  if (caben.length) {
    return { texto: caben[0], completo: true, porque: `entra entera en el cuadro (${caben[0].length} de ${tope} caracteres que caben)` };
  }
  // Ninguna cabe: se corta por palabra en el tope y se declara.
  const palabras = candidatas.sort((a, b) => a.length - b.length)[0].split(' ');
  const lineas = capacidadDe(tipoDeContenido);
  const partes: string[] = [];
  let actual = '';
  for (const w of palabras) {
    if (actual && (actual + ' ' + w).length > lineas.porRenglon * lineas.renglones) break;
    actual = actual ? `${actual} ${w}` : w;
    partes.push(w);
    if (partes.length > 40) break;
  }
  return { texto: actual, completo: false, porque: `el texto más corto disponible no entra en ${tope} caracteres: se cortó por palabra y se avisa` };
}

/** El por qué de las tarjetas, para que quede escrito junto al texto de la pieza. */
export const PORQUE_DE_LAS_TARJETAS = 'el motor de cuadros (ffmpeg/drawtext) tiene un tope por tipo de contenido '
  + `(${Object.entries(CAPACIDAD_DEL_CUADRO).map(([t, c]) => `${t}: ${c.porRenglon}×${c.renglones}`).join(' · ')}): `
  + 'el texto se arma para que quepa y, si no cabe, se parte en otra tarjeta en vez de cortarse';

/** Toda la tabla, para que el panel y el informe puedan mostrarla sin repetirla. */
export const TABLA_DE_MOTORES = (Object.keys(NECESIDADES) as Motor[]).map(m => ({ motor: m, ...NECESIDADES[m] }));

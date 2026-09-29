import type { Pool } from 'pg';

// =============================================================================================
// EL FORMATO DEL PROMPT DE GENERACIÓN — lo que el agente de arte entrega para que, cuando exista la
// capacidad de generar imágenes o videos, se genere con ESTO y no con una idea suelta.
//
// Nace de una regla del dueño: el sistema todavía no genera archivos, pero SÍ tiene que entregar el
// prompt completo —colores, tipografía, formato, si es UGC o toma de producto, escenas, texto en
// pantalla, audio, marca y lo que NO debe aparecer— con todo medido en el mercado.
//
// DE DÓNDE SALE CADA CAMPO (nada inventado):
//   · colores, tipografía, encuadre, formatos, hashtags y duraciones → la analítica visual del informe
//     del mercado (medida pieza por pieza sobre las creatividades reales).
//   · la promesa, la voz y el cierre → la pieza propuesta del informe (el hueco que se ataca).
//   · las plazas → los formatos que el mercado sostiene (vertical 9:16, cuadrado 1:1).
//   · las prohibiciones → las reglas de cuidado del rubro (política de la plataforma y del negocio).
// Lo que es una DECISIÓN nuestra y no una medición (la duración exacta, el modelo de generación, el
// número de escenas) va marcado como `elegido_por_nosotros`, con su razón. Así nadie confunde un dato
// con una elección.
//
// EL PROMPT VA EN INGLÉS (es el idioma con el que trabajan los modelos de imagen y video) y el brief
// legible va en español, que es el idioma del dueño y del equipo.
// =============================================================================================

export type Plaza = {
  plaza: string; formato: string; gancho: string; boton: string;
  paleta?: string[]; tipografia?: string; porque?: string;
};

export type PromptGeneracion = {
  clave: string;
  pieza: string;
  plaza: string;
  /** imagen | video */
  tipo: string;
  /** ugc | toma | producto | diseno — el dueño pidió explícitamente distinguir UGC de toma */
  estilo: string;
  estilo_explicado: string;
  proporcion: string;
  duracion_s: number | null;
  /** De qué pieza viva del mercado sale: para poder volver a mirarla. */
  referencia: { anunciante: string; dias: number; que_se_toma: string };
  sujeto: { quien: string; donde: string; accion: string; vestuario: string; mirada: string };
  escenas: { s: string; plano: string; accion: string; texto_en_pantalla: string; voz: string }[];
  colores: { paleta: string[]; rol: string; contraste: string };
  tipografia: {
    familia: string; peso: string; caja: string; tratamiento: string; ubicacion: string; texto_exacto: string;
  };
  iluminacion: string;
  camara: string;
  audio: { voz: string; musica: string };
  marca: string;
  no_debe_aparecer: string[];
  /** Listo para pegar en el modelo. */
  prompt: string;
  prompt_negativo: string;
  parametros: Record<string, string | number>;
  elegido_por_nosotros: string[];
  /**
   * LA TRAZA: de dónde sale cada campo del prompt, dato por dato. Es la respuesta a «cómo se arma el
   * prompt con la información del informe»: sin esto, el prompt parece escrito por gusto.
   */
  como_se_arma: { campo: string; sale_de: string; como_se_usa: string }[];
  verificaciones: string[];
  fuente: string;
};

/** El palo de la tipografía y su tratamiento: se leen del informe, no se imaginan. */
function tipografiaDe(av: any, conTexto: boolean) {
  const t = (av?.tipografia ?? [])[0] as any;
  if (!conTexto || !t) {
    return {
      familia: 'sin texto sobre la imagen',
      peso: '—', caja: '—', tratamiento: '—', ubicacion: '—',
      texto_exacto: 'todo el texto va en el copy del anuncio, no quemado en el píxel',
    };
  }
  return {
    familia: t.estilo || 'serif clásica (tipo Times/Georgia)',
    peso: /negrita|bold/i.test(t.estilo || '') ? 'negrita' : 'media',
    caja: t.caja || 'Título',
    tratamiento: t.tratamiento || 'contorno blanco + sombra suave',
    ubicacion: t.ubicacion || 'arriba a la izquierda',
    texto_exacto: '',
  };
}

/**
 * Arma el prompt de generación de una pieza, para una plaza. Todo lo que va adentro salió del informe
 * del mercado o de la pieza propuesta; lo que es decisión nuestra queda marcado.
 */
export function promptDePieza(datos: {
  pieza: string; plaza: Plaza; av: any; creadoras?: any[]; huecos?: any[]; cuidado?: string[]; fuente: string;
  referencia: { anunciante: string; dias: number };
  /** El guion real de la pieza propuesta: de ahí salen las escenas y las frases de pantalla. */
  guion?: string[];
  /** El estilo de la pieza que el mercado sostiene («ugc de cliente (celular en el salón)», «produccion de marca»…). */
  estiloDelMercado?: string;
  /** El formato que Nova recomienda para esta plaza, con su porqué y cuántas piezas lo sostienen. */
  formatoRecomendado?: { formato_recomendado: string; por_que: string; piezas_que_lo_sostienen: number; dias_sostenidos?: number; anunciantes_que_lo_repiten?: string[] } | null;
}): PromptGeneracion {
  const { pieza, plaza, av, referencia } = datos;
  // El guion REAL de la pieza propuesta: de ahí salen las escenas y las frases que van en pantalla.
  const guion = (datos.guion ?? []) as string[];
  const enMayuscula = (t: string) => t === t.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(t) && t.length >= 4;
  const vertical = /9:16|reel|historia/i.test(plaza.plaza) || /vertical/i.test(plaza.formato);
  const esVideo = /video/i.test(plaza.formato) || vertical;
  const conTexto = !/sin texto/i.test(plaza.tipografia || '');
  const paleta = plaza.paleta?.length ? plaza.paleta : ((av?.paletas?.[0]?.colores ?? []) as string[]);
  const typo = tipografiaDe(av, conTexto);
  const hueco = (datos.huecos?.[0]?.titulo as string) || '';
  const cuidado = datos.cuidado ?? [];
  const nivel = (datos.creadoras?.[0]?.nivel as string) || '';
  // El estilo sale del formato de ESA plaza y de lo que el informe atribuye al rubro. Una plaza de
  // «imagen con el resultado, sin persona» es toma de producto aunque el rubro use UGC en video.
  const senalUgc = /celular|ugc|a mano|sin producci|clienta|testimonio/i.test(
    `${plaza.formato} ${plaza.porque ?? ''} ${nivel} ${av?.resumen ?? ''}`);
  const senalProducto = /sin persona|producto solo|el resultado solo/i.test(`${plaza.formato} ${plaza.gancho ?? ''}`);
  const esUgc = senalUgc && !senalProducto;

  /**
   * LAS ESCENAS salen del guion real de la pieza (si lo hay): de cada línea se sacan los segundos, la
   * acción y las frases entre comillas, que son las únicas que pueden ir en pantalla o en voz. Un verso
   * de la analítica («el testimonio de la clienta con su nombre») NO es copy: nunca se pone en pantalla.
   */
  const escenasDelGuion = guion.map((linea, i) => {
    const seg = (linea.match(/^\s*([0-9]+\s*[-–]\s*[0-9]+|[0-9]+)\s*s/) || [])[1] || `${i + 1}`;
    const frases = [...linea.matchAll(/[«"]([^»"]{4,90})[»"]/g)].map(m => m[1].trim());
    // Lo que va en pantalla, en orden: 1) la frase que el guion marca con «texto en pantalla» o «texto:»,
    // 2) una frase en mayúsculas (la convención del guion), 3) nada (no se inventa copy).
    const marcada = (linea.match(/texto(?:\s+en\s+pantalla)?\s*:?\s*[«"]([^»"]{4,90})[»"]/i) || [])[1];
    const enPantalla = (marcada || frases.find(enMayuscula) || '').trim();
    const voz = frases.find(f => f !== enPantalla) || '';
    const accion = linea
      .replace(/^\s*[0-9]+\s*[-–]?\s*[0-9]*\s*s\s*·?\s*/i, '')
      .replace(/[«"][^»"]{0,90}[»"]/g, '')
      .replace(/\btexto\s+en\s+pantalla\s*:?\s*/gi, ' ')
      .replace(/\b(y\s+la\s+voz(\s+del?\s+\w+)?|y\s+la\s+voz)\s*:?\s*/gi, ' ')
      .replace(/\s*[,;:]\s*(?=[,;:]|$)/g, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/^[\s,;:.·-]+|[\s,;:.·-]+$/g, '').trim();
    return { s: seg.replace(/\s/g, ''), plano: '', accion, texto_en_pantalla: enPantalla, voz };
  });
  const escenas = esVideo
    ? (escenasDelGuion.length
      ? escenasDelGuion.map((e, i) => ({
        ...e,
        plano: ['primer plano, vertical, celular en mano', 'plano medio del lugar real', 'detalle, misma luz', 'plano medio a cámara'][i] || 'plano medio',
      }))
      : [
        { s: '0-3', plano: 'primer plano, vertical, celular en mano', accion: 'arranca nombrando el problema concreto del cliente', texto_en_pantalla: '', voz: 'la clienta habla en primera persona' },
        { s: '3-18', plano: 'plano medio y detalle, misma luz', accion: 'el antes y el después en el mismo plano, sin adjetivos', texto_en_pantalla: '', voz: 'la clienta describe el cambio' },
        { s: '18-25', plano: 'plano medio a cámara', accion: `cierre con la promesa del hueco: ${hueco || 'el mantenimiento'}`, texto_en_pantalla: '', voz: 'cierre directo a cámara' },
      ])
    : [
      { s: 'única', plano: 'plano detalle del producto o del resultado', accion: 'el resultado como protagonista, sin persona en cuadro', texto_en_pantalla: '', voz: 'sin voz: todo el mensaje va en el copy' },
    ];

  /** La frase que de verdad va sobre la imagen: sale del guion (en mayúsculas), nunca de una descripción. */
  const fraseEnPantalla = escenas.map(e => e.texto_en_pantalla).find(Boolean) || '';

  const prompt = [
    esVideo ? 'Vertical 9:16 mobile-shot video ad, 25 seconds.' : 'Square 1:1 image ad for social feed.',
    esUgc
      ? 'Style: authentic user-generated content filmed on a phone by a real customer inside a real local business: handheld, slightly imperfect framing, natural light from a window, no studio setup, no color grading.'
      : 'Style: clean product shot, real location (not a studio), soft natural light, subject centred, honest and unpolished-premium look.',
    `Setting and subject: ${plaza.plaza.includes('Reels') ? 'customer at home receiving the service result' : 'the product/result alone'} — real skin tones, real hair, real environment with the brand sign visible in the background.`,
    `Colour direction: dominant palette ${paleta.join(', ')}; ${(av?.paletas?.[0]?.nota as string) || 'warm, high-contrast, no oversaturation'}.`,
    conTexto
      ? `On-image text: ${typo.familia}${/negrita|bold/i.test(typo.familia) ? '' : `, ${typo.peso}`}, ${typo.caja}, ${typo.tratamiento}, placed ${typo.ubicacion}.${fraseEnPantalla ? ` The exact claim to render is: "${fraseEnPantalla}".` : ''} Short claim in capital letters, no more than 8 words.`
      : 'No text burned into the image: the copy lives in the ad text only.',
    'Composition: subject in the lower two thirds, negative space at the top for the text; high contrast so it reads on a phone in daylight.',
    esVideo ? 'Camera: handheld phone, vertical, one or two continuous shots, no transitions, no stock footage.' : 'Camera: single still frame, slightly tilted angle, shallow depth of field from a real lens.',
    esVideo ? 'Audio: real ambient sound plus the customer speaking in first person; no voice-over, no trending music unless it is the customer’s own.' : '',
    `Brand: the business sign or uniform visible inside the frame (${referencia.anunciante} style), no animated logo.`,
    'Photorealistic, not illustrated. No text errors, no extra fingers, no invented logos.',
  ].filter(Boolean).join('\n');

  const noAparecer = [
    'Fondo de estudio con bokeh: en este rubro lo que aguanta es el local real con celular.',
    'Rótulos con adjetivos («espectacular», «increíble»): las piezas sostenidas muestran, no califican.',
    'Texto quemado en la imagen cuando la pieza sostenida del rubro no lo lleva.',
    ...cuidado,
    ...((av?.lo_que_no_hay_que_copiar ?? []) as string[]),
  ];

  return {
    clave: `${pieza} · ${plaza.plaza}`,
    pieza, plaza: plaza.plaza,
    tipo: esVideo ? 'video' : 'imagen',
    estilo: esUgc ? 'ugc' : 'toma de producto o resultado',
    estilo_explicado: esUgc
      ? 'Grabado con celular por una persona real del negocio o una clienta, dentro del local o en su casa. Sin producción.'
      : 'Toma de producto o resultado: sin persona en cuadro, luz natural, el objeto como protagonista.',
    proporcion: vertical ? '9:16' : '1:1',
    duracion_s: esVideo ? 25 : null,
    referencia: { ...referencia, que_se_toma: plaza.porque || 'es el formato que el mercado ya sostiene' },
    sujeto: {
      quien: esUgc ? 'una clienta real del negocio (o quien atiende), sin actuación' : 'nadie: el producto o el resultado',
      donde: esUgc ? 'el local real o la casa de la clienta, con luz natural de ventana' : 'el local real, sobre una superficie real',
      accion: esVideo ? 'cuenta en primera persona qué pasó y muestra el resultado' : 'el resultado terminado, recién hecho',
      vestuario: esUgc ? 'ropa cotidiana, como entra a comprar' : '—',
      mirada: esVideo ? 'a cámara en el cierre, natural en el resto' : '—',
    },
    escenas,
    colores: {
      paleta,
      rol: (av?.paletas?.[0]?.nota as string) || 'el color lo pone el producto; el fondo se mantiene apagado',
      contraste: 'alto contraste para que se lea en una pantalla de celular a pleno sol',
    },
    tipografia: {
      ...typo,
      texto_exacto: conTexto
        ? (fraseEnPantalla || 'por definir: la frase de pantalla sale del guion de la pieza, no de la descripción del ángulo')
        : 'sin texto sobre la imagen',
    },
    iluminacion: 'luz natural suave y difusa, sin sombras duras, sin flash',
    camara: esVideo
      ? 'celular en vertical, plano medio y detalle, movimiento leve de mano, sin estabilizador ni drone'
      : 'una sola foto, ángulo ligeramente picado, lente real con desenfoque suave al fondo',
    audio: esVideo
      ? { voz: 'la propia clienta, en primera persona, sin locutor', musica: 'sonido ambiente real; música solo si la pone el negocio' }
      : { voz: 'sin voz', musica: 'sin audio' },
    marca: 'el rótulo del local o la camiseta del negocio, visible dentro del cuadro (no logo animado encima)',
    no_debe_aparecer: [...new Set(noAparecer)].filter(Boolean),
    prompt,
    prompt_negativo: 'studio background, bokeh studio bokeh, stock footage, professional studio lighting, on-screen adjectives, text errors, extra fingers, invented logos, oversaturated colours, plastic skin, AI-looking hands',
    parametros: {
      aspect_ratio: vertical ? '9:16' : '1:1',
      resolucion: vertical ? '1080x1920' : '1080x1080',
      ...(esVideo ? { duracion_s: 25, escenas: escenas.length, fps: 30 } : {}),
      cta_boton: plaza.boton,
      plaza: plaza.plaza,
    },
    como_se_arma: [
      {
        campo: 'style (UGC o toma de producto)',
        sale_de: `el formato de esta plaza («${plaza.formato}») + lo que el informe dice del rubro${nivel ? ` + la capa de creador: ${nivel}` : ''}`,
        como_se_usa: esUgc
          ? 'pide grabación con celular por una persona real, sin producción ni color grading'
          : 'pide toma de producto o resultado, sin persona en cuadro y con luz natural',
      },
      {
        campo: 'formato (el que Nova recomienda)',
        sale_de: datos.formatoRecomendado
          ? `el formato recomendado para «${plaza.plaza}»: ${datos.formatoRecomendado.formato_recomendado} · ${datos.formatoRecomendado.por_que}`
          : `el formato de la plaza «${plaza.plaza}» → ${plaza.formato} (sin recomendación medida todavía)`,
        como_se_usa: 'es el molde sobre el que se arma el prompt: no se elige por gusto, se elige el que el mercado ya premió en esa plaza',
      },
      {
        campo: 'aspect_ratio, resolución y escenas',
        sale_de: `el formato de la plaza «${plaza.plaza}» → ${plaza.formato}`,
        como_se_usa: vertical
          ? 'pide vertical 9:16 y reparte el guion en escenas con segundos'
          : 'pide cuadrado 1:1, un solo cuadro, sin escenas',
      },
      {
        campo: 'colour direction',
        sale_de: `la paleta medida sobre las creatividades: ${paleta.join(', ') || 'sin medir'}`,
        como_se_usa: 'los hex van tal cual al prompt; el papel del color sale de la nota de esa paleta',
      },
      {
        campo: 'on-image text',
        sale_de: conTexto
          ? `la tipografía medida en las creatividades: ${typo.familia} · ${typo.caja} · ${typo.tratamiento} · ${typo.ubicacion}`
          : 'las piezas sostenidas de esa plaza NO llevan texto sobre la imagen',
        como_se_usa: conTexto
          ? `se copian familia, caja, tratamiento y ubicación de la pieza medida; la frase exacta sale del guion de la pieza (${fraseEnPantalla ? `«${fraseEnPantalla}»` : 'y si el guion no la marca, no se escribe ninguna'})`
          : 'se prohíbe el texto quemado en el píxel: todo el mensaje va en el copy del anuncio',
      },
      {
        campo: 'composition',
        sale_de: `las reglas de encuadre medidas en el rubro (${((av?.composicion ?? []) as any[]).length} reglas)`,
        como_se_usa: 'sujeto en los dos tercios inferiores, aire arriba para el texto, alto contraste para leer al sol',
      },
      {
        campo: 'la promesa y el cierre',
        sale_de: hueco ? `el hueco medido que nadie ocupa: «${hueco}»` : 'la pieza propuesta del informe',
        como_se_usa: 'el hueco se vuelve el cierre de la última escena; nunca se convierte en un adjetivo',
      },
      {
        campo: 'la referencia de la pieza',
        sale_de: `la pieza más sostenida del rubro: ${referencia.anunciante} · ${referencia.dias} días activa`,
        como_se_usa: 'es el espejo: la pieza nueva conserva ese esqueleto y cambia una sola cosa (el hueco)',
      },
      {
        campo: 'duración y ritmo (video)',
        sale_de: (av?.duraciones_medidas ?? []).join(' · ') || 'no hay duración medida en el rubro',
        como_se_usa: esVideo
          ? 'se elige 25 s (dentro del rango medido) para que entre completa en Reels'
          : 'no aplica: es una imagen',
      },
      {
        campo: 'no_debe_aparecer y prompt_negativo',
        sale_de: `${((av?.lo_que_no_hay_que_copiar ?? []) as string[]).length} cosas medidas que el rubro no debe copiar + ${cuidado.length} reglas de cuidado del rubro`,
        como_se_usa: 'van como prohibiciones explícitas en español y en el negativo en inglés del modelo',
      },
      {
        campo: 'el botón y el destino',
        sale_de: `el botón que usan las piezas sostenidas: ${plaza.boton}`,
        como_se_usa: 'no va dentro del prompt de imagen: va en los parámetros de la pieza (el cierre es WhatsApp)',
      },
    ],
    elegido_por_nosotros: [
      esVideo ? 'la duración de 25 s (el mercado sostiene piezas de 20 s a 2 min: se eligió el extremo corto para que entre completa en Reels)' : 'el encuadre cuadrado (es el de las imágenes sostenidas del rubro)',
      'el número de escenas y su reparto de segundos',
      'el modelo o servicio de generación (todavía no hay uno conectado: el prompt queda listo para el que se conecte)',
    ],
    verificaciones: [
      'Conserva el formato, el estilo, el botón y la paleta de las piezas que el mercado sostiene.',
      'Ataca un hueco medido, no una intuición.',
      'Distingue si es UGC o toma de producto, y lo dice en el prompt.',
      'Lleva los colores en hex y la tipografía con su tratamiento y su ubicación.',
      'Lleva prohibiciones explícitas, incluidas las reglas de cuidado del rubro.',
      'El prompt está en inglés, listo para pegar en un modelo de imagen o video.',
    ],
    fuente: datos.fuente,
  };
}

/** Los prompts de todas las plazas, para la pieza propuesta del informe. */
export function promptsDelInforme(inf: {
  informe?: any; fuente?: string; rubro?: string; ciudad?: string;
}, formatosRecomendados: any[] = []): { pieza: string; prompts: PromptGeneracion[] } | null {
  const i = inf?.informe;
  const propuesta = (i?.propuestas ?? [])[0] as any;
  const plazas = (i?.analitica_visual?.por_plaza ?? []) as Plaza[];
  const piezas = (i?.piezas ?? []) as any[];
  if (!propuesta || !plazas.length) return null;
  const masVieja = [...piezas].sort((a, b) => (Number(b.dias) || 0) - (Number(a.dias) || 0))[0];
  const referencia = {
    anunciante: masVieja?.anunciante || 'la pieza más sostenida del rubro',
    dias: Number(masVieja?.dias) || 0,
  };
  const pieza = propuesta.titulo || 'Pieza propuesta';
  return {
    pieza,
    prompts: plazas.map(plaza => promptDePieza({
      // El formato que Nova recomienda para esta plaza (el molde que más se repite entre los que aguantan).
      formatoRecomendado: (formatosRecomendados ?? []).find(f => f.plaza === plaza.plaza) ?? null,
      guion: (propuesta.guion ?? []) as string[],
      pieza, plaza, av: i?.analitica_visual, creadoras: i?.creadoras, huecos: i?.huecos,
      cuidado: i?.cuidado, fuente: inf?.fuente || '', referencia,
      estiloDelMercado: String(masVieja?.estilo || ''),
    })),
  };
}

/**
 * EL PROMPT CUANDO TODAVÍA NO HAY MERCADO MEDIDO. Es el caso de la categoría nueva o de la corrida sin
 * informe: no hay analítica visual que copiar, así que NO se inventan colores ni tipografías —esos campos
 * van vacíos y dichos— y el prompt se arma con lo que el negocio ya tiene: lo que vende, a quién le habla,
 * las palabras de su categoría y la pieza que Tino decidió (gancho, cuerpo y cierre). La lengua del texto
 * es la del que compra, no la del dueño. Cuando haya mercado que leer, el prompt del informe lo reemplaza.
 */
export function promptDelNegocio(datos: {
  negocio: string;
  queSePublica: string;
  aQuien: string;
  gancho: string;
  cuerpo: string;
  cierre: string;
  idioma: { nombre: string; por_que: string };
  palabrasDeLaPieza: string[];
  rubro: string;
  canal: string;
  boton: string;
  material: string;
  fuente: string;
}): { pieza: string; prompts: PromptGeneracion[] } {
  const pieza = datos.queSePublica || `Primera pieza de ${datos.negocio}`;
  const palabras = datos.palabrasDeLaPieza.length
    ? datos.palabrasDeLaPieza.slice(0, 6).join(', ')
    : 'sin palabras de la categoría todavía';
  const escenas = [
    { s: '0-5', plano: 'plano medio, celular a la altura de los ojos', accion: 'una persona del negocio, en su lugar real, dice el problema del cliente en una frase', texto_en_pantalla: '', voz: datos.gancho },
    { s: '5-15', plano: 'plano detalle de la pantalla o del trabajo real', accion: 'se ve el trabajo haciéndose: la cuenta, el documento, el sistema, la verificación', texto_en_pantalla: '', voz: datos.cuerpo },
    { s: '15-25', plano: 'plano medio, mirando a cámara', accion: 'cierra con la acción concreta y el botón a la vista', texto_en_pantalla: '', voz: datos.cierre },
  ];
  const prompt = [
    `Vertical 9:16 social ad for ${datos.negocio} (${datos.rubro}).`,
    `Subject: a real person from the business, filmed with a phone in their actual workplace, talking to camera.`,
    `Action: ${datos.queSePublica}. Showing the real work being done, not a studio set.`,
    `Audience: ${datos.aQuien}.`,
    `Scenes: 1) medium shot, the person states the client's problem; 2) close-up of the work itself (screen, document, device); 3) medium shot, the person closes with the concrete next step.`,
    `On-image text: none by default (the message goes in the ad copy). If text is added, keep it short and in ${datos.idioma.nombre}.`,
    `Colour direction: keep the brand's own colours (no measured palette yet — none is prescribed here).`,
    `Look: natural light, handheld, no colour grading, no studio.`,
    `No third-party logos, no invented numbers, no promises of returns.`,
  ].join(' ');
  return {
    pieza,
    prompts: [{
      clave: `${pieza} · video vertical`,
      pieza,
      plaza: datos.canal ? `video vertical 9:16 · ${datos.canal}` : 'video vertical 9:16',
      tipo: 'video',
      estilo: 'toma propia con celular (UGC del negocio)',
      estilo_explicado: 'sin formatos medidos del rubro todavía: se rueda con el celular, con alguien real del negocio en su lugar de trabajo',
      proporcion: '9:16',
      duracion_s: 25,
      referencia: { anunciante: '', dias: 0, que_se_toma: 'nada: no hay mercado medido todavía, así que no se copia ningún molde ajeno' },
      sujeto: {
        quien: `alguien real de ${datos.negocio} (no un actor)`,
        donde: 'el lugar donde ocurre el trabajo',
        accion: `mostrar ${datos.queSePublica}`,
        vestuario: 'el de trabajo, como está todos los días',
        mirada: 'a cámara, hablando claro y sin leer',
      },
      escenas,
      colores: {
        paleta: [],
        rol: 'sin paleta medida: el color lo pone la identidad que el negocio ya usa, no una medición del mercado',
        contraste: 'alto contraste, para que se lea en un celular al sol',
      },
      tipografia: {
        familia: 'la que el negocio ya usa (sin medir)', peso: '—', caja: '—', tratamiento: '—', ubicacion: '—',
        texto_exacto: 'por defecto, ningún texto quemado en el píxel: todo el mensaje va en el copy del anuncio',
      },
      iluminacion: 'luz natural, la del lugar',
      camara: 'celular, plano medio y detalle, sin trípode ni equipo',
      audio: { voz: 'la voz del que habla, sin locutor', musica: 'sin música medida: si se usa, suave y con licencia' },
      marca: datos.negocio,
      no_debe_aparecer: [
        'logos o marcas de terceros',
        'números, precios o rendimientos que el negocio no haya dicho',
        'texto quemado ilegible o en párrafos',
        'música sin licencia',
      ],
      prompt,
      prompt_negativo: 'studio lighting, 3d render, stock footage, fake smiling models, tiny unreadable text, third-party logos, invented numbers, watermarks, distorted hands',
      parametros: {
        aspect_ratio: '9:16',
        resolucion: '1080x1920',
        duracion_s: 25,
        escenas: escenas.length,
        fps: 30,
        idioma_del_texto: datos.idioma.nombre,
        cta_boton: datos.boton,
      },
      como_se_arma: [
        { campo: 'el tema y el ángulo', sale_de: `lo que el negocio vende, dicho por él: ${datos.queSePublica}`, como_se_usa: 'es el asunto de la pieza; no se copia un molde ajeno porque todavía no hay mercado medido' },
        { campo: 'a quién le habla', sale_de: `el público que el negocio declaró en Primeros pasos: ${datos.aQuien}`, como_se_usa: 'define el tono y el vocabulario del guion' },
        { campo: 'el idioma del texto y de la voz', sale_de: datos.idioma.por_que, como_se_usa: `la pieza va en ${datos.idioma.nombre}: el texto en pantalla, el copy y la voz` },
        { campo: 'las palabras de la categoría', sale_de: `el vocabulario de su rubro en el material: ${palabras}`, como_se_usa: 'son las palabras con las que su cliente lo va a buscar: entran en el copy, no como relleno' },
        { campo: 'colour direction y on-image text', sale_de: 'NO hay analítica visual del rubro todavía: no se midió ninguna paleta ni tipografía', como_se_usa: 'esos campos quedan vacíos y dichos, en vez de inventar hex y familias que nadie midió' },
        { campo: 'las escenas y los segundos', sale_de: 'el gancho, el cuerpo y el cierre que decidió Tino, repartidos en tres escenas', como_se_usa: 'cada escena muestra algo que se puede filmar hoy con un celular' },
        { campo: 'el botón y el destino', sale_de: `el canal que el negocio declaró: ${datos.canal || 'sin definir'}`, como_se_usa: 'no va dentro del prompt de imagen: va en los parámetros de la pieza' },
      ],
      elegido_por_nosotros: [
        'el formato: video vertical 9:16, sin formatos del rubro medidos todavía',
        'la duración de 25 s',
        'el estilo: toma propia con celular, con alguien real del negocio',
        'el número de escenas y su reparto de segundos',
        'el modelo o servicio de generación (todavía no hay ninguno conectado)',
      ],
      verificaciones: [
        'Dice qué NO está medido: no lleva colores ni tipografías inventados.',
        'El texto sale de la pieza que decidió Tino, no de una idea suelta.',
        'La lengua de la pieza es la del que compra, y se dice de dónde sale.',
        'Las escenas se pueden filmar hoy: no piden equipo ni producción.',
        'El prompt está en inglés, listo para pegar en un modelo.',
      ],
      fuente: datos.fuente,
    }],
  };
}

/** Guarda los prompts del negocio: es el contrato que va a leer el generador cuando exista. */
export async function guardarPrompts(db: Pool, businessId: string, paquete: { pieza: string; prompts: PromptGeneracion[] }, corridaId?: string | null) {
  let n = 0;
  // Un prompt por pieza y plaza: la corrida de hoy reemplaza al de ayer (el prompt sigue al mercado).
  await db.query('DELETE FROM prompts_generacion WHERE business_id = $1 AND pieza = $2', [businessId, paquete.pieza]);
  for (const p of paquete.prompts) {
    await db.query(
      `INSERT INTO prompts_generacion (business_id, corrida_id, pieza, plaza, tipo, estilo, proporcion, prompt, prompt_negativo, parametros, detalle)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb)`,
      [businessId, corridaId ?? null, p.pieza, p.plaza, p.tipo, p.estilo, p.proporcion,
        p.prompt, p.prompt_negativo, JSON.stringify(p.parametros), JSON.stringify(p)]);
    n++;
  }
  return n;
}

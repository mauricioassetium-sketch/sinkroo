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
          ? `la tipografía medida: ${typo.familia} · ${typo.peso} · ${typo.caja} · ${typo.tratamiento} · ${typo.ubicacion}`
          : 'las piezas sostenidas de esa plaza NO llevan texto sobre la imagen',
        como_se_usa: conTexto
          ? 'se copian familia, peso, caja, tratamiento y ubicación; el texto es el gancho que el mercado usa'
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
}): { pieza: string; prompts: PromptGeneracion[] } | null {
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
      guion: (propuesta.guion ?? []) as string[],
      pieza, plaza, av: i?.analitica_visual, creadoras: i?.creadoras, huecos: i?.huecos,
      cuidado: i?.cuidado, fuente: inf?.fuente || '', referencia,
      estiloDelMercado: String(masVieja?.estilo || ''),
    })),
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

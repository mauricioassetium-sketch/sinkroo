import type { Pool } from 'pg';
import type { Identidad } from './identidad.js';

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
  /** El concepto creativo, cuando la pieza no copia un molde del mercado sino que propone uno: se dice como concepto. */
  concepto?: string;
  /** Los recursos de marca REALES (su logo, sus imágenes), con su dirección: nunca inventados. */
  recursos?: string[];
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
  /** El entregable técnico: qué tiene que producir el modelo, cuánto dura y en qué formato devuelve. */
  entregable?: { que: string; partes: string[]; formato_de_salida: string; duracion_total_s: number; planos: number };
  /** Un renglón por plano: segundos, qué se ve, qué se dice, en qué recurso se apoya y con qué audio. */
  hoja_de_rodaje?: { plano_n: number; desde_s: number; hasta_s: number; segundos: number; plano: string; que_se_ve: string; voz_literal: string; texto_en_pantalla: string; recurso: string; audio: string }[];
  /** El guion literal, escena por escena: la única fuente de lo que se dice y de lo que se escribe. */
  guion_literal?: { s: string; dice: string; en_pantalla: string; nota: string }[];
  /** Los roles de su paleta, medidos, con el contraste texto-sobre-fondo calculado. */
  roles_de_paleta?: { hex: string; usos: number; rol: string; contraste_con_fondo?: number }[];
  /** Los recursos de su marca y en qué escena entra cada uno. */
  recursos_y_donde?: { url: string; que_es: string; donde_va: string }[];
  /** Lo que no se puede decir en este sector, dicho: es terreno regulado. */
  cumplimiento?: string[];
  idioma_del_prompt?: { voz: string; pantalla: string; terminos_que_se_quedan: string[]; nota: string };
  /** Los dos caminos para hacer esta pieza, y lo que un generador de video NO puede entregar. */
  ruta_de_produccion?: {
    como_se_puede_hacer: string[];
    lo_que_el_generador_no_puede: string;
    cuando_hace_falta_una_cara_real: string;
    que_cambia_en_el_prompt: string;
  };
  /** Lo que el prompt NO puede llenar solo y queda marcado para que lo escriba el dueño. */
  lo_que_falta?: string[];
  fuente: string;
};

/** La luminancia relativa de un color (la fórmula de WCAG): sirve para saber si un texto se lee sobre un fondo. */
function luminancia(hex: string): number {
  const h = String(hex || '').replace('#', '').trim();
  const n = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  if (!/^[0-9a-f]{6}$/i.test(n)) return 0;
  const canales = [0, 2, 4].map(i => {
    const v = parseInt(n.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * canales[0] + 0.7152 * canales[1] + 0.0722 * canales[2];
}

/** El contraste entre dos colores, de 1:1 a 21:1. Se calcula: no se supone que un amarillo sobre negro se lee. */
function contrasteCon(a: string, b: string): number {
  const la = luminancia(a), lb = luminancia(b);
  const claro = Math.max(la, lb), oscuro = Math.min(la, lb);
  return Math.round(((claro + 0.05) / (oscuro + 0.05)) * 10) / 10;
}

/** La saturación, para saber cuál de los colores medidos es el de acento y no otro gris más. */
function saturacion(hex: string): number {
  const h = String(hex || '').replace('#', '');
  const n = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  if (!/^[0-9a-f]{6}$/i.test(n)) return 0;
  const [r, g, b] = [0, 2, 4].map(i => parseInt(n.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

/**
 * LOS ROLES DE LA PALETA, medidos: el más oscuro de los que más usa hace de fondo, el más claro de texto y
 * el más saturado de acento. Se dice que es una propuesta leída de sus propios usos, y con ella viene el
 * contraste calculado texto-sobre-fondo: si no llega a 4,5:1 el prompt pide levantarlo, no lo da por bueno.
 */
function rolesDePaleta(colores: { hex: string; usos: number; rol?: string }[]) {
  const cs = (colores ?? []).filter(c => /^#[0-9a-f]{3,6}$/i.test(String(c.hex || '')));
  if (!cs.length) return [] as { hex: string; usos: number; rol: string; contraste_con_fondo?: number }[];
  const porLuz = [...cs].sort((a, b) => luminancia(a.hex) - luminancia(b.hex));
  const fondo = porLuz[0];
  const texto = porLuz[porLuz.length - 1];
  const candidatosAcento = cs.filter(c => c.hex !== fondo.hex && c.hex !== texto.hex);
  const acento = [...candidatosAcento].sort((a, b) => (saturacion(b.hex) - saturacion(a.hex)) || (b.usos - a.usos))[0];
  return cs.map(c => ({
    hex: c.hex, usos: c.usos,
    rol: c.hex === fondo.hex ? 'fondo' : c.hex === texto.hex ? 'texto' : c.hex === acento?.hex ? 'acento' : 'apoyo',
    ...(c.hex === texto.hex ? { contraste_con_fondo: contrasteCon(texto.hex, fondo.hex) } : {}),
  }));
}

/**
 * LAS ESCENAS CON SUS SEGUNDOS REALES, sacadas del guion de la pieza: lo que el guion no dice no se
 * inventa —la línea hablada queda vacía y el prompt la marca como «falta»—. Cada plano dice qué se ve,
 * qué se dice y en qué se apoya (su logo al cierre, sus imágenes de respaldo en el medio).
 */
function repartirEscenas(guion: string[], queHace: string, imagenes: { url: string; para?: string }[]) {
  const planos = [
    'plano medio, celular a la altura de los ojos',
    'plano detalle del trabajo real',
    'plano medio, mirando a cámara',
  ];
  const limpiar = (t: string) => String(t || '').replace(/[ \t]+/g, ' ').trim();
  const lineas = (guion ?? []).map(l => String(l).trim()).filter(Boolean);
  const delGuion: { desde: number; hasta: number; ve: string; dice: string; pantalla: string }[] = [];
  for (let i = 0; i < lineas.length; i++) {
    const m = lineas[i].match(/^(\d+)\s*[-–]\s*(\d+)\s*s/);
    if (!m) continue;
    // El bloque de esta escena termina donde empieza la siguiente: así una frase no se le cuelga a la vecina.
    const bloque: string[] = [lineas[i]];
    for (let j = i + 1; j < lineas.length && j <= i + 3; j++) {
      const otra = lineas[j].match(/^\d+\s*[-–]\s*\d+\s*s/);
      if (otra) break;
      bloque.push(lineas[j]);
    }
    const texto = bloque.join(' ');
    const toma = (re: RegExp) => {
      const r = texto.match(re);
      return r ? String(r[1] || '').trim() : '';
    };
    delGuion.push({
      desde: Number(m[1]),
      hasta: Number(m[2]),
      ve: limpiar(toma(/SE\s+VE\s*:\s*(.+?)(?=\s+DICE|\s+EN\s+PANTALLA|$)/i)),
      dice: limpiar(toma(/DICE\s*:\s*(.+?)(?=\s+EN\s+PANTALLA|$)/i)),
      pantalla: limpiar(toma(/EN\s+PANTALLA\s*:\s*(.+?)(?=\s+DICE|$)/i)),
    });
  }
  const porDefecto = [
    { desde: 0, hasta: 4, ve: 'una persona real del negocio arranca contando el descubrimiento', dice: '', pantalla: '' },
    { desde: 4, hasta: 17, ve: `se ve cómo funciona de verdad: ${queHace || 'lo que el negocio hace'}`, dice: '', pantalla: '' },
    { desde: 17, hasta: 25, ve: 'qué cambia para el que lo usa, y la acción concreta', dice: '', pantalla: '' },
  ];
  const base = delGuion.length > 0 ? delGuion : porDefecto;
  const esMarca = (t: string) => /logo|icon|favicon/i.test(t);
  const marca = (imagenes ?? []).find(im => esMarca(`${im.para || ''} ${im.url}`));
  const sueltas = (imagenes ?? []).filter(im => !esMarca(`${im.para || ''} ${im.url}`));

  return base.map((b, k) => {
    const ultimo = k === base.length - 1;
    let recurso = '';
    if (ultimo && marca) recurso = `${marca.url} — su logo, como cierre`;
    if (!ultimo && sueltas[k - 1]) recurso = `${sueltas[k - 1].url} — ${sueltas[k - 1].para || 'imagen suya'} de respaldo`;
    return {
      n: k + 1,
      desde: b.desde,
      hasta: b.hasta,
      plano: planos[k] || 'plano medio',
      que_se_ve: b.ve || 'el trabajo real, sin adornos',
      vo: b.dice,
      en_pantalla: b.pantalla,
      audio: k === 1 ? 'sonido ambiente real de fondo, la voz en directo' : 'la voz en directo, sin locutor',
      recurso,
    };
  });
}

/** Si el material toca terreno regulado: activos digitales, RWA, security tokens, inversión. */
function sectorRegulado(texto: string): boolean {
  return /\b(rwa|real world assets?|security token|tokeniz|activos? digitales?|blockchain|cripto|criptomoneda|inversi|rendimiento|financier[ao]|mercado de capitales|regulad)/i.test(String(texto || ''));
}

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
      : '',
    // LA RUTA: ese aspecto se consigue GRABANDO. Si se genera, la persona es sintética y hay que pedir otra
    // cosa —que la actuación no parezca actuación y las líneas cortas—, no «una persona real».
    esUgc
      ? 'Route: this look is achieved by FILMING with a phone (a real customer, no acting). If this is GENERATED, the performer is synthetic and no instruction makes them real: do not attempt "a real person" — ask instead for a performance that does not look performed (conversational micro-pauses, no theatrical gestures) and for lines of 15 words or fewer, the rest in voice-over.'
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
  queHace?: string;
  canal: string;
  boton: string;
  material: string;
  fuente: string;
  /** El tono que el negocio declaró en Primeros pasos: es suyo, no una elección de estilo. */
  tono?: string[];
  /** Lo que el negocio quiere lograr («que lo conozcan», «que compren»). */
  objetivo?: string;
  /** La identidad medida en SU PROPIA PÁGINA: colores, tipografía e imágenes. Sin página, null. */
  identidad?: Identidad | null;
  /** El guion de la pieza, línea por línea, con sus segundos: de ahí salen los planos y las frases exactas. */
  guion?: string[];
  /** El enlace del negocio: el cierre no es «escríbanos», es a dónde escribe. */
  enlace?: string;
  /** Las palabras con las que el mercado nombra esto: lo que se queda sin traducir. */
  terminosDelMercado?: string[];
}): { pieza: string; prompts: PromptGeneracion[] } {
  const pieza = datos.queSePublica || `Primera pieza de ${datos.negocio}`;
  const palabras = datos.palabrasDeLaPieza.length
    ? datos.palabrasDeLaPieza.slice(0, 6).join(', ')
    : 'sin palabras de la categoría todavía';
  // Lo que hace el negocio, dicho corto y sin la puntuación suelta: es lo que va dentro del concepto y del
  // prompt, así que tiene que leerse bien (una frase larga cortada por su borde, no a mitad de palabra).
  const limpiar = (t: string) => String(t || '').replace(/\s+/g, ' ')
    .replace(/\s+([,.;:])/g, '$1').replace(/[,;:]\s*(?=[,.;:])/g, '').replace(/[\s.,;:]+$/, '').trim();
  const queHaceLargo = limpiar(datos.queHace || datos.queSePublica);
  const queHace = queHaceLargo.length > 100 ? `${queHaceLargo.slice(0, 98).replace(/\s+\S*$/, '')}…` : queHaceLargo;
  const id = datos.identidad && datos.identidad.leida ? datos.identidad : null;
  const paleta = (id?.colores ?? []).slice(0, 4).map(c => c.hex);
  const deLaPaleta = (id?.colores ?? []).slice(0, 4).map(c => `${c.hex} (${c.rol}, ${c.usos} veces en su CSS)`).join(' · ');
  const tipo = id?.tipografias?.[0];
  const imagenes = id?.imagenes ?? [];
  const tono = (datos.tono ?? []).filter(Boolean).join(' y ') || 'claro y directo, el del negocio';

  // ---------------------------------------------------------------------------------------------
  // EL CONCEPTO. Cuando no hay mercado medido no hay un molde ajeno que copiar, y copiar un molde
  // inventado sería mentir. Lo que SÍ se puede hacer, y es lo que hace un creador: contar el
  // DESCUBRIMIENTO —que existe un sistema que las empresas ya usan para esto— con alguien real
  // contándolo a cámara y el trabajo a la vista. El concepto se declara como concepto: es una
  // elección nuestra, y se dice de dónde sale cada parte.
  // ---------------------------------------------------------------------------------------------
  const esServicio = !/\b(software|plataforma|sistema|app|api|panel|herramienta)\b/i.test(`${queHace} ${datos.rubro}`);
  const concepto = [
    `Descubrimiento contado por alguien real: una persona del negocio —o un cliente— cuenta a cámara que encontró`,
    `un sistema que las empresas ya usan para esto: ${queHace || 'lo que el negocio vende'}. Lo muestra funcionando y explica qué cambia.`,
    esServicio
      ? `La forma es UGC a cámara con el trabajo real de fondo (no una pieza publicitaria): lo que se vende es que existe y cómo se usa.`
      : `La forma es UGC a cámara más la pantalla del sistema funcionando: lo que se vende es que existe y cómo se usa.`,
    `El gancho es el descubrimiento, no el producto: «así es como las empresas están verificando sus activos hoy» en vez de «compre X».`,
    `Se dice en la lengua del que compra y con las palabras de su categoría, no con las internas del negocio.`,
  ].join(' ');



  // ---------------------------------------------------------------------------------------------
  // EL ENTREGABLE. El prompt no es «una idea»: es un pedido ejecutable. Dice qué tiene que producir,
  // de qué duración, plano por plano, qué se dice palabra por palabra, dónde va cada recurso de su
  // marca, qué color hace de fondo y cuál de texto (con el contraste calculado, no supuesto), qué está
  // prohibido, y qué no puede decidir la máquina porque no está en el material del dueño.
  // ---------------------------------------------------------------------------------------------
  const partes = repartirEscenas(datos.guion ?? [], queHace, imagenes);
  // Las escenas del objeto salen del MISMO reparto que el prompt: una sola verdad, la del guion.
  const escenas = partes.map(p => ({
    s: `${p.desde}-${p.hasta}`, plano: p.plano, accion: p.que_se_ve,
    texto_en_pantalla: p.en_pantalla, voz: p.vo,
  }));
  const totalS = partes.length ? partes[partes.length - 1].hasta : 25;
  const roles = rolesDePaleta(id?.colores ?? []);
  const elFondo = roles.find(r => r.rol === 'fondo');
  const elTexto = roles.find(r => r.rol === 'texto');
  const sector = sectorRegulado(`${datos.material} ${datos.queHace ?? ''} ${datos.queSePublica} ${palabras}`);
  const terminos = (datos.terminosDelMercado ?? []).slice(0, 8);
  const enlace = String(datos.enlace || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
  // El botón cerrado con su destino: «Escriba por Facebook» sin decir a dónde escribe no es un cierre.
  const cierreConDestino = [datos.boton || 'Escriba', enlace ? `→ ${enlace}` : '', datos.canal ? `(${datos.canal})` : '']
    .filter(Boolean).join(' ');
  const sinGuion = partes.filter(p => !p.vo).length;
  // Lo que el prompt NO puede llenar solo: no se inventa, se marca para que lo escriba el dueño. Es la
  // diferencia entre un prompt vago y uno que se puede ejecutar: el hueco está dicho, no rellenado.
  const faltaEnElPrompt = [
    partes.some(p => !p.vo) ? `las líneas habladas que faltan (${sinGuion} de ${partes.length} escenas no tienen texto escrito por el negocio)` : '',
    'qué cambia para el cliente, en 2 o 3 cambios concretos y comprobables (su material no lo dice)',
    'el precio y cómo se pide (su material no lo dice)',
    'una prueba real de un cliente, si existe',
  ].filter(Boolean);

  const prompt = [
    // 1. EL ENTREGABLE Y SU FORMATO DE SALIDA
    'DELIVERABLE — produce a complete production package, in this order:',
    `1) SHOT LIST: one row per shot — shot number, shot type and camera, duration in seconds, what is seen, on-screen text, brand asset used, audio. ${partes.length} shots, ${totalS} seconds in total.`,
    '2) LITERAL SCRIPT: the exact words spoken and shown, shot by shot. Nothing outside these lines is spoken or written on screen: do not improvise claims.',
    `3) GENERATION PROMPTS: one prompt per shot, ready to paste into a video generator (Veo 3, Sora, Runway Gen-3, Kling), plus one still-image prompt (Midjourney, DALL·E, Flux) for the end card. Vertical 9:16, 1080x1920, 30 fps, ${totalS} seconds. Keep every spoken line under 15 words and prefer one short on-camera line per shot with voice-over for the rest: long delivered lines are where generated video shows.`,
    // 2. LA PIEZA
    `PRODUCT: a ${totalS}-second vertical video ad for ${datos.negocio} (${datos.rubro}${enlace ? `, ${enlace}` : ''}), in ${datos.idioma.nombre === 'inglés' ? 'English' : datos.idioma.nombre}. Audience: ${datos.aQuien}. Goal: ${datos.objetivo || 'que lo conozcan'}. Tone: ${tono}.`,
    `CONCEPT: a real person from the business —or a real client— talks to camera about discovering that this exists and how it works: ${queHace || 'what the business sells'}. Discovery story, not a product pitch.`,
    // LA RUTA DE PRODUCCIÓN, DICHA. Un generador de video NO puede entregar una persona real: cada persona
    // que produce es sintética y la lectura de un guion largo se nota. Pedirle «sin actor, sin leer guion» era
    // pedirle algo imposible; lo que sí se le puede pedir es el ASPECTO y el RITMO de una grabación de celular.
    'PRODUCTION ROUTE — pick ONE and follow its rules:',
    '(A) FILM IT with a phone: a real person from the business (or a real client) records it in their actual workplace. Here "not an actor, no script reading" applies and IS achievable — that is exactly what filming gives you.',
    '(B) GENERATE IT: the performer is synthetic and no instruction makes them real. Do not attempt "a real person": deliver instead the LOOK and the PACE of a phone recording — hand-held, eye level, window light, ordinary clutter in frame, no colour grading, no smooth camera moves — and make the performance NOT look performed: conversational micro-pauses, natural blink rate, small asymmetries, no theatrical gestures, no advertising smile, no perfect skin.',
    'IF THE AD NEEDS A REAL FACE (a client testimonial, a proof with a name), film it with a phone: never generate it.',
    'LINE LENGTH: every spoken line must be 15 words or fewer so it can sound conversational; if a line is longer, split it into two shots or move it to voice-over. No monologues.',
    'SUBJECT: someone from the business (or a client) in their actual workplace, on a phone. In route (B) they are a generated performer: keep them ordinary — everyday clothes, real workspace, no model looks, no stock-photo smile.',
    // 3. PLANO POR PLANO, CON SUS SEGUNDOS Y SU VOZ LITERAL
    `SHOT BY SHOT: ${partes.map(p => `shot ${p.n} ${p.desde}-${p.hasta} s — ${p.plano}; ${p.que_se_ve}; VO: ${p.vo ? `"${p.vo}"` : '[FILL: line missing — the client must write it]'}; ON-SCREEN: ${p.en_pantalla ? `"${p.en_pantalla}"` : 'none'}${p.recurso ? `; asset: ${p.recurso}` : ''}; audio: ${p.audio}`).join(' | ')}.`,
    // 4. LA LENGUA, CON SUS TÉRMINOS
    `LANGUAGE: spoken and on-screen text in ${datos.idioma.nombre === 'inglés' ? 'English' : datos.idioma.nombre}. The lines above are the client's own wording — translate them faithfully, do not add claims.${terminos.length ? ` These terms are used as-is by this market and stay untranslated: ${terminos.join(', ')}.` : ''}`,
    // 5. EL CIERRE
    `ENDING AND CTA: shot ${partes.length} ends with the on-screen call to action "${cierreConDestino}"${datos.canal ? ` and the ${datos.canal} button` : ''}${id?.imagenes?.length ? `; end card with their own logo` : ''}. No animated logo.`,
    // 6. CÁMARA Y RITMO
    'CAMERA AND RHYTHM: vertical 9:16 in every shot, hand-held phone at eye level, natural window light, no tripod, no gimbal, no drone, no stock footage, no transitions between shots, no speed ramps. Sound: live voice synced to picture; ambient room sound underneath; no voice-over, no music unless the business already has licensed music.',
    // 7. LA PALETA, CON ROLES Y CONTRASTE CALCULADO
    roles.length
      ? `PALETTE (measured on the client's own website — use these exact values, nothing else): ${roles.map(r => `${r.rol} ${r.hex} (used ${r.usos}x in their CSS)`).join('; ')}.${elTexto && elFondo ? ` Text on background contrast: ${elTexto.contraste_con_fondo}:1 — ${(elTexto.contraste_con_fondo ?? 0) >= 4.5 ? 'passes WCAG AA' : 'DOES NOT reach WCAG AA 4.5:1: raise the text colour or darken the background'}.` : ''}`
      : 'PALETTE: none was measured on their own site. Use the colours already in their assets; do not invent a brand palette.',
    (id?.tipografias ?? []).length
      ? `TYPOGRAPHY: their own website declares ${(id?.tipografias ?? []).map(t => `${t.familia} (${t.usos}x)`).join(', ')}${tipo?.tamano ? `, body around ${tipo.tamano}` : ''}. Use the most declared first. On-screen text: maximum 7 words per shot, maximum 2 lines, no blinking, no animated type.`
      : 'TYPOGRAPHY: no font was measured; use a neutral sans-serif. Maximum 7 words per shot, maximum 2 lines.',
    // 8. LOS RECURSOS DE SU MARCA, Y DÓNDE VA CADA UNO
    imagenes.length
      ? `BRAND ASSETS (real, read from their own site — where each one goes): ${imagenes.slice(0, 5).map((i, k) => `${i.url} (${i.para})${/logo|icon|favicon/i.test(`${i.para} ${i.url}`) ? ' → end card only, bottom centre, about 12% of the width' : ` → as B-roll in shot ${Math.min(2, partes.length)}${k % 2 ? ', full frame' : ', inset lower third'}`}`).join('; ')}. Do not invent a logo or any imagery that is not in this list.`
      : 'BRAND ASSETS: none were read from their site. Do not invent a logo or imagery.',
    // 9. LO PROHIBIDO
    'NEGATIVE — must not appear: stock actors or actresses, fake accents, epic or trailer music, template transitions, flashing or animated text, more than 7 words on screen at once, more than 2 lines of on-screen text, distorted hands, invented or third-party logos, watermarks, oversaturated colours, plastic skin, any text error, any number, price or return the client did not say.',
    // 10. EL SECTOR REGULADO
    sector
      ? `COMPLIANCE (regulated ground — this client works with digital assets, RWA and security tokens): no implicit financial advice, no mention of any regulator or licence, no yield, return or performance figure, no "guaranteed", no "risk-free", no comparison against financial products. Every claim must come from the client's own material. If a disclaimer is used, it is exactly "Not financial advice" and only if the client asks for it.`
      : 'COMPLIANCE: no claim that the client did not make; no regulator, no guarantees, no invented figures.',
    // 11. LO QUE FALTA, DICHO
    `FILL BEFORE SHOOTING — the system will not invent these: ${faltaEnElPrompt.join('; ')}.`,
  ].filter(Boolean).join('\n');

  const hojaDeRodaje = partes.map(p => ({
    plano_n: p.n, desde_s: p.desde, hasta_s: p.hasta, segundos: p.hasta - p.desde,
    plano: p.plano, que_se_ve: p.que_se_ve,
    voz_literal: p.vo, texto_en_pantalla: p.en_pantalla,
    recurso: p.recurso, audio: p.audio,
  }));
  const guionLiteral = partes.map(p => ({
    s: `${p.desde}-${p.hasta} s`, dice: p.vo, en_pantalla: p.en_pantalla,
    nota: p.vo ? '' : 'sin línea escrita por el negocio: el motor no la inventa',
  }));

  return {
    pieza,
    prompts: [{
      clave: `${pieza} · video vertical`,
      pieza,
      plaza: datos.canal ? `video vertical 9:16 · ${datos.canal}` : 'video vertical 9:16',
      tipo: 'video',
      estilo: 'UGC: alguien real del negocio contando el descubrimiento a cámara',
      estilo_explicado: 'sin formatos medidos del rubro todavía: se rueda con el celular, con alguien real del negocio en su lugar de trabajo, y la pieza cuenta el descubrimiento en vez de copiar un molde ajeno',
      proporcion: '9:16',
      duracion_s: 25,
      concepto,
      referencia: { anunciante: '', dias: 0, que_se_toma: 'nada: no hay mercado medido todavía, así que no se copia ningún molde ajeno' },
      sujeto: {
        quien: `alguien real de ${datos.negocio} —o un cliente suyo— (no un actor)`,
        donde: 'el lugar donde ocurre el trabajo',
        accion: `mostrar cómo funciona ${queHace || datos.queSePublica}`,
        vestuario: 'el de trabajo, como está todos los días',
        mirada: 'a cámara, hablando claro y sin leer',
      },
      escenas,
      colores: {
        paleta,
        rol: paleta.length
          ? `medidos en su propia web, no elegidos por nosotros: ${deLaPaleta}`
          : 'sin paleta medida: el color lo pone la identidad que el negocio ya usa, no una medición',
        contraste: 'alto contraste, para que se lea en un celular al sol',
      },
      tipografia: {
        familia: tipo?.familia || 'la que el negocio ya usa (sin medir)',
        peso: '—', caja: '—',
        tratamiento: 'sin texto quemado por defecto: el mensaje va en el copy del anuncio',
        ubicacion: 'si hay texto, abajo, en una línea',
        texto_exacto: 'por defecto, ningún texto quemado en el píxel',
      },
      iluminacion: 'luz natural, la del lugar',
      camara: esServicio ? 'celular, plano medio y detalle del trabajo, sin trípode ni equipo' : 'celular para la persona y captura de pantalla para el sistema',
      audio: { voz: 'la voz del que habla, sin locutor', musica: 'sin música medida: si se usa, suave y con licencia' },
      marca: datos.negocio,
      recursos: imagenes.slice(0, 6).map(i => `${i.url} — ${i.para}`),
      no_debe_aparecer: [
        'logos o marcas de terceros',
        'números, precios o rendimientos que el negocio no haya dicho',
        'texto quemado ilegible o en párrafos',
        'música sin licencia',
        'un logo o una imagen de marca inventados: si no se leyó ninguno, no se pone',
      ],
      prompt,
      prompt_negativo: 'studio lighting, 3d render, stock footage, fake smiling models, tiny unreadable text, third-party logos, invented numbers, watermarks, distorted hands',
      parametros: {
        aspect_ratio: '9:16',
        resolucion: '1080x1920',
        duracion_s: totalS,
        escenas: partes.length,
        fps: 30,
        idioma_del_texto: datos.idioma.nombre,
        cta_boton: datos.boton,
      },
      como_se_arma: [
        { campo: 'el tema y el ángulo', sale_de: `lo que el negocio vende, dicho por él: ${datos.queSePublica}`, como_se_usa: 'es el asunto de la pieza; el ángulo es el descubrimiento, porque la categoría todavía no se conoce' },
        { campo: 'el concepto', sale_de: 'una elección nuestra, dicha como tal: no hay mercado medido, así que no se copia un molde ajeno', como_se_usa: concepto },
        { campo: 'el tono', sale_de: datos.tono?.length ? `el que el negocio declaró en Primeros pasos: ${tono}` : `no declaró tono: se usa ${tono}`, como_se_usa: 'manda en cómo habla la persona y en el ritmo del corte' },
        { campo: 'los colores', sale_de: paleta.length ? `medidos en el CSS de su propia web: ${deLaPaleta}` : 'NO se midió ninguna identidad: no hay página legible y el negocio no la declaró', como_se_usa: paleta.length ? 'son los hex que va a usar la pieza, con el uso que cada uno tiene en su marca' : 'el campo queda vacío y dicho, en vez de inventar una paleta' },
        { campo: 'la tipografía', sale_de: tipo ? `las declaraciones font-family de su web: ${tipo.familia} (${tipo.usos} veces declarada${tipo.tamano ? `, cuerpo de ${tipo.tamano}` : ''})` : 'no se midió ninguna tipografía', como_se_usa: 'es la familia real de su marca, no una fuente de catálogo' },
        { campo: 'los recursos de marca', sale_de: (id?.imagenes ?? []).length ? `las imágenes que su web ya publica (${(id?.imagenes ?? []).length}), con su dirección real` : 'no se leyó ninguna imagen suya', como_se_usa: 'se usan como referencia: su logo y sus imágenes reales, nunca inventados' },
        { campo: 'a quién le habla', sale_de: `el público que el negocio declaró en Primeros pasos: ${datos.aQuien}`, como_se_usa: 'define el tono y el vocabulario del guion' },
        { campo: 'el idioma del texto y de la voz', sale_de: datos.idioma.por_que, como_se_usa: `la pieza va en ${datos.idioma.nombre}: el texto en pantalla, el copy y la voz` },
        { campo: 'las palabras de la categoría', sale_de: `el vocabulario de su rubro en el material: ${palabras}`, como_se_usa: 'son las palabras con las que su cliente lo va a buscar: entran en el copy, no como relleno' },
        { campo: 'las escenas y los segundos', sale_de: 'el gancho, el cuerpo y el cierre que decidió Tino, repartidos en tres escenas', como_se_usa: 'cada escena muestra algo que se puede filmar hoy con un celular' },
        { campo: 'el botón y el destino', sale_de: `el canal que el negocio declaró: ${datos.canal || 'sin definir'}${enlace ? ` y su enlace: ${enlace}` : ' (no hay enlace cargado)'}`, como_se_usa: `el cierre no es «escríbanos»: dice a dónde escribe — ${cierreConDestino}` },
        { campo: 'el entregable y su formato de salida', sale_de: `los ${partes.length} planos y los ${totalS} s que salen del guion de la pieza`, como_se_usa: 'el prompt pide un paquete: hoja de rodaje, guion literal y un prompt por plano, no «una idea de video»' },
        { campo: 'los roles de la paleta y el contraste', sale_de: roles.length ? `los ${roles.length} colores medidos en su web y sus usos (${roles.map(r => `${r.hex} ${r.rol} ${r.usos}x`).join(' · ')})` : 'no se midió ninguna paleta', como_se_usa: roles.length ? (elTexto as any)?.contraste_con_fondo ? `el más oscuro queda de fondo, el más claro de texto y el más saturado de acento; el contraste texto-fondo se calculó: ${(elTexto as any).contraste_con_fondo}:1` : 'el más oscuro queda de fondo, el más claro de texto y el más saturado de acento' : 'no se prescribe ningún color' },
        { campo: 'las prohibiciones y el terreno regulado', sale_de: sector ? `el material del negocio toca terreno regulado (activos digitales, RWA, security tokens)` : 'el material no toca terreno regulado', como_se_usa: 'van como prohibiciones explícitas, con lo que el sector no permite afirmar' },
        { campo: 'lo que el prompt NO llena', sale_de: 'lo que no está en el material del negocio', como_se_usa: `queda marcado como «falta» en vez de inventado: ${faltaEnElPrompt.length} cosas` },
      ],
      elegido_por_nosotros: [
        'el concepto: contar el descubrimiento (no hay mercado medido que diga qué molde funciona)',
        'el formato: video vertical 9:16, sin formatos del rubro medidos todavía',
        'la duración de 25 s',
        'el vehículo: UGC a cámara con el trabajo real a la vista',
        'el número de escenas y su reparto de segundos',
        'el modelo o servicio de generación (todavía no hay ninguno conectado)',
      ],
      verificaciones: [
        paleta.length
          ? `Los colores NO son una elección nuestra: son los que ${datos.negocio} ya usa en su web, contados en su CSS (${(id?.colores ?? []).length} colores de marca; blanco, negro y grises quedaron afuera).`
          : 'Dice qué NO está medido: no lleva colores ni tipografías inventados.',
        tipo ? `La tipografía es la suya: ${tipo.familia}, la que declara su web.` : 'No se midió tipografía: el campo lo dice en vez de rellenarlo.',
        imagenes.length ? `Los recursos de marca son los de su web (su logo y sus imágenes), con dirección real: ${imagenes.length}.` : 'No se leyó ninguna imagen suya: no se inventa un logo.',
        'El concepto se declara como concepto y dice por qué: sin mercado medido no hay molde ajeno que copiar.',
        'El texto sale de la pieza que decidió Tino, no de una idea suelta, y va en la lengua del que compra.',
        'Las escenas se pueden filmar hoy: no piden equipo ni producción.',
        'El prompt está en inglés, listo para pegar en un modelo, con los hex de su marca adentro.',
        `Dice qué tiene que producir y en qué formato: un paquete con la hoja de rodaje (${partes.length} planos, ${totalS} s), el guion literal y un prompt por plano.`,
        (elTexto as any)?.contraste_con_fondo
          ? `El contraste texto sobre fondo está calculado, no supuesto: ${(elTexto as any).contraste_con_fondo}:1 (${(elTexto as any).contraste_con_fondo >= 4.5 ? 'pasa AA' : 'NO llega a AA, y el prompt pide levantarlo'}).`
          : 'No hay paleta medida: el prompt pide usar la que el negocio ya tiene, sin inventar colores.',
        sinGuion
          ? `Dice lo que falta en vez de rellenarlo: ${sinGuion} de ${partes.length} escenas no tienen línea hablada escrita por el negocio.`
          : 'Todas las escenas tienen su línea hablada: el guion no se improvisa.',
        sector ? 'Lleva las reglas de su sector: sin asesoramiento financiero implícito, sin reguladores, sin cifras de rendimiento.' : 'Lleva la regla general: ninguna afirmación que el negocio no haya hecho.',
        imagenes.length ? `Dice dónde entra cada recurso suyo: el logo al cierre, ${imagenes.length - 1} imágenes de respaldo en el medio.` : 'No se leyó ningún recurso suyo: el prompt prohíbe inventar logo o imágenes.',
      ],
      entregable: {
        que: `un paquete de producción completo para un video vertical de ${totalS} s: guion literal, hoja de rodaje plano por plano y un prompt por plano para el generador`,
        partes: [
          `hoja de rodaje: ${partes.length} planos y ${totalS} s en total, con lo que se ve, lo que se dice, el recurso y el audio de cada uno`,
          'guion literal: las palabras exactas que se dicen y se escriben, escena por escena',
          'prompts del generador: uno por plano (video: Veo 3, Sora, Runway Gen-3, Kling) y uno de imagen fija (Midjourney, DALL·E, Flux) para el cierre',
        ],
        formato_de_salida: 'tabla de escena / plano / segundos / qué se ve / voz / texto en pantalla / recurso / audio, y después cada prompt por separado, listo para pegar',
        duracion_total_s: totalS,
        planos: partes.length,
      },
      hoja_de_rodaje: hojaDeRodaje,
      guion_literal: guionLiteral,
      roles_de_paleta: roles,
      recursos_y_donde: imagenes.slice(0, 6).map((im, k) => ({
        url: im.url, que_es: im.para || 'imagen suya',
        donde_va: /logo|icon|favicon/i.test(`${im.para || ''} ${im.url}`)
          ? 'al cierre, abajo al centro, sin animación'
          : `de respaldo en el plano ${Math.min(2, partes.length)}${k % 2 ? ', a pantalla completa' : ', en el tercio inferior'}`,
      })),
      cumplimiento: sector
        ? [
          'nada de asesoramiento financiero, ni implícito',
          'no se nombra ningún regulador ni licencia',
          'ninguna cifra de rendimiento, retorno o revalorización',
          'prohibido «garantizado», «sin riesgo» y cualquier comparación con un producto financiero',
          'todo lo que se afirme tiene que estar en el material del negocio',
          'si se usa un aviso, es «Not financial advice», y solo si el dueño lo pide',
        ]
        : ['ninguna afirmación que el negocio no haya hecho: sin cifras ni garantías inventadas'],
      // Lo que el generador NO puede hacer, dicho, y cómo se arregla: pedirle una persona real es pedirle algo
      // imposible, y de ahí salen los videos que se notan.
      ruta_de_produccion: {
        como_se_puede_hacer: [
          'grabarla con el celular: alguien real del negocio —o un cliente— delante de la cámara, en su lugar de trabajo. Es la única forma en que «sin actor» y «sin leer un guion» se cumplen de verdad.',
          'generarla: acá el que habla es un actor sintético y eso no se puede evitar. El prompt pide entonces lo que sí se puede: que no parezca actuación (líneas cortas, pausas naturales, sin sonrisa publicitaria) y el aspecto y el ritmo de una grabación de celular.',
        ],
        lo_que_el_generador_no_puede: 'un generador de video no puede entregar una persona real: cada persona que produce es sintética, y una línea larga se nota leída. Pedirle «sin actor, sin leer guion» fue pedirle algo imposible.',
        cuando_hace_falta_una_cara_real: 'si la pieza necesita la cara de un cliente de verdad (una prueba, un testimonio), se graba con el celular: no se genera.',
        que_cambia_en_el_prompt: 'las líneas habladas van cortas (15 palabras máximo, el resto a voz en off) y se pide el aspecto de una grabación, no una persona auténtica.',
      },
      idioma_del_prompt: {
        voz: datos.idioma.nombre, pantalla: datos.idioma.nombre,
        terminos_que_se_quedan: terminos,
        nota: `el guion que hay escrito está en las palabras del dueño: el prompt pide decirlo en ${datos.idioma.nombre} y traducirlo sin cambiar el sentido${terminos.length ? `, y dejar tal cual los términos que el mercado usa así (${terminos.slice(0, 5).join(', ')})` : ''}`,
      },
      lo_que_falta: [
        ...(sinGuion ? [`${sinGuion} de ${partes.length} escenas no tienen línea hablada escrita: el prompt las marca como «falta» y no las inventa`] : []),
        'los 2 o 3 cambios concretos que ve el cliente (su material no los dice)',
        'el precio y cómo se pide (su material no lo dice)',
        ...(imagenes.length ? [] : ['su logo y sus imágenes: no se leyó ninguna de su web']),
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

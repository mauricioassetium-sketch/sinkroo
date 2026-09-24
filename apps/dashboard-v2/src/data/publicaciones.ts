// =============================================================================================
// QUÉ SE PUEDE PUBLICAR — el área completa, curada.
//
// Del código inicial se rescataron los 15 tipos de campaña con su estrategia (ver ./campana.ts),
// porque eso SÍ define cómo trabaja el motor. Los 65 campos de ingesta NO se copiaron: se
// analizó cuáles sirven de verdad y quedaron 6 de material real que sirven a todas las formas
// de publicar.
//
// Y no todo lo que se publica es una "campaña". Éstas son las formas reales de publicar:
// anuncio pago, post/reel en el feed, historia, mensaje a tus clientes, lanzamiento,
// sorteo y colaboración con un creador. Cada una pide datos distintos y el motor los usa
// distinto. La automatización (recompra, carrito, referidos) vive en Conversaciones
// porque no se "publica": trabaja sola.
// =============================================================================================

export type TipoCampo = 'texto' | 'link' | 'imagenes' | 'videos' | 'archivos' | 'opciones' | 'numero';

export interface CampoPublicacion {
  id: string;
  etiqueta: string;
  tipo: TipoCampo;
  ayuda: string;
  opciones?: string[];
  multi?: boolean;
}

export interface Formato {
  key: FormatoKey;
  nombre: string;
  icono: string;
  color: string;
  resumen: string;
  paraQue: string;
  conObjetivo?: boolean;
  campos: CampoPublicacion[];
  avanzados?: CampoPublicacion[];
}

export type FormatoKey = 'anuncio' | 'feed' | 'historia' | 'mensaje' | 'lanzamiento' | 'sorteo' | 'creador';

// ---------------------------------------------------------------------------------------------
// MATERIAL — 6 cargadores reales, para todas las formas de publicar
// ---------------------------------------------------------------------------------------------
export const MATERIAL: CampoPublicacion[] = [
  { id: 'fotos_producto', etiqueta: '📷 Fotos de tus productos', tipo: 'imagenes', ayuda: 'Frente, detalle, en uso, empaque. JPG o PNG. Es lo que más mejora las piezas.' },
  { id: 'resenas', etiqueta: '⭐ Capturas de reseñas y mensajes de clientes', tipo: 'imagenes', ayuda: 'Fotos de reseñas, capturas de chats con clientes contentos. Es lo que más pesa en el panel.' },
  { id: 'videos_producto', etiqueta: '🎬 Videos del producto', tipo: 'videos', ayuda: 'Demo, unboxing, uso real. También sirven clips del celular.' },
  { id: 'logo', etiqueta: '✨ Tu logo', tipo: 'imagenes', ayuda: 'PNG con fondo transparente si lo tenés.' },
  { id: 'catalogo', etiqueta: '📋 Catálogo o lista de precios', tipo: 'archivos', ayuda: 'PDF, Excel o fotos de tu lista. Define qué se puede vender.' },
  { id: 'negocio', etiqueta: '🏪 Fotos del negocio o del equipo', tipo: 'imagenes', ayuda: 'Local, proceso, entregas. Da confianza y humaniza la marca.' },
  { id: 'manual_marca', etiqueta: '🎨 Manual de marca', tipo: 'archivos', ayuda: 'Colores, tipografías y estilo, para que todo se vea tuyo.' },
];

// ---------------------------------------------------------------------------------------------
// LAS FORMAS DE PUBLICAR
// ---------------------------------------------------------------------------------------------
export const FORMATOS: Formato[] = [
  {
    key: 'anuncio',
    nombre: 'Anuncio pago',
    icono: '🎯',
    color: '#a855f7',
    resumen: 'Pagás para que lo vea gente que no te conoce.',
    paraQue: 'Para vender o sumar gente nueva. Es lo único acá que gasta plata, y el motor lo optimiza por el objetivo que elijas.',
    conObjetivo: true,
    campos: [
      { id: 'productos_foco', etiqueta: 'Qué querés empujar', tipo: 'texto', ayuda: 'Los 2 o 3 productos de esta campaña y por qué. Ej. el pack completo porque tiene mejor margen.' },
      { id: 'presupuesto', etiqueta: 'Presupuesto por día', tipo: 'numero', ayuda: 'Cuánto querés invertir por día. Con esto y los días sale el total.' },
      { id: 'dias', etiqueta: 'Cuántos días', tipo: 'numero', ayuda: 'Duración de la campaña.' },
      { id: 'publico', etiqueta: 'A quién le hablás', tipo: 'texto', ayuda: 'Edad, zona, qué problema tiene. Ej. mujeres de 25 a 40 en CABA con piel sensible.' },
      { id: 'plataformas', etiqueta: 'Dónde se publica', tipo: 'opciones', ayuda: 'El motor adapta el tamaño y el texto a cada red.', opciones: ['Instagram', 'Facebook', 'WhatsApp', 'TikTok', 'Messenger'], multi: true },
      { id: 'link', etiqueta: 'A dónde los mandás', tipo: 'link', ayuda: 'Tu tienda, el producto, el WhatsApp o una landing.' },
    ],
    avanzados: [
      { id: 'precios', etiqueta: 'Precios y formas de pago', tipo: 'texto', ayuda: 'Cuánto cuesta cada cosa, cuotas, medios de pago.' },
      { id: 'ofertas', etiqueta: 'Ofertas vigentes', tipo: 'texto', ayuda: 'Descuentos, 2x1, envío gratis. Con fecha de vencimiento si tienen.' },
      { id: 'testimonios', etiqueta: 'Reseñas reales de tus clientes', tipo: 'texto', ayuda: 'Copiá mensajes de WhatsApp o comentarios. Es lo que más sube el puntaje del panel.' },
      { id: 'tono', etiqueta: 'Cómo hablás vos', tipo: 'texto', ayuda: 'Formal o divertida, cercana o directa, palabras que usás siempre y las que no dirías.' },
      { id: 'competencia', etiqueta: 'Contra quién competís', tipo: 'texto', ayuda: 'Las 2 o 3 tiendas parecidas y en qué te diferenciás.' },
    ],
  },
  {
    key: 'feed',
    nombre: 'Post en el feed',
    icono: '📸',
    color: '#22c55e',
    resumen: 'Contenido para tus seguidores. No gasta nada.',
    paraQue: 'Para mantenerte presente y que te compartan. El motor lo arma con tu material real y te dice el mejor día y hora.',
    campos: [
      { id: 'idea', etiqueta: 'Qué querés mostrar o contar', tipo: 'texto', ayuda: 'Una idea suelta alcanza. Ej. mostrar el proceso de armado del pack.' },
      { id: 'formato_post', etiqueta: 'Formato', tipo: 'opciones', ayuda: 'El motor cambia el guion según el formato.', opciones: ['Reel', 'Carrusel', 'Imagen', 'Video largo'] },
      { id: 'red_feed', etiqueta: 'En qué red', tipo: 'opciones', ayuda: 'Podés elegir más de una.', opciones: ['Instagram', 'Facebook', 'TikTok'], multi: true },
      { id: 'cuando_feed', etiqueta: 'Cuándo publicarlo', tipo: 'opciones', ayuda: 'Si no sabés, el motor elige la franja donde más te ven.', opciones: ['Que lo elija el motor', 'Hoy', 'Mañana', 'Esta semana'] },
      { id: 'texto_post', etiqueta: 'Algo que quieras que diga', tipo: 'texto', ayuda: 'Una frase tuya, un mensaje que no puede faltar. Opcional.' },
    ],
    avanzados: [
      { id: 'hashtags', etiqueta: 'Hashtags o palabras que usás', tipo: 'texto', ayuda: 'Los que ya te funcionan.' },
      { id: 'musica', etiqueta: 'Estilo o música', tipo: 'texto', ayuda: 'Tranquilo, enérgico, con tendencia de TikTok…' },
    ],
  },
  {
    key: 'historia',
    nombre: 'Historia',
    icono: '⚡',
    color: '#f59e0b',
    resumen: '24 horas, para los que ya te siguen.',
    paraQue: 'Para vender rápido a quien ya te conoce: mostrar stock, responder una duda o anunciar algo del día.',
    campos: [
      { id: 'idea_hist', etiqueta: 'Qué mostrás', tipo: 'texto', ayuda: 'Ej. llegó stock nuevo, o el envío gratis termina hoy.' },
      { id: 'interaccion', etiqueta: 'Qué querés que hagan', tipo: 'opciones', ayuda: 'La interacción sube el alcance de todas tus historias.' , opciones: ['Que respondan', 'Que voten en una encuesta', 'Que deslicen al link', 'Solo mirar'] },
      { id: 'cuando_hist', etiqueta: 'Cuándo sale', tipo: 'opciones', ayuda: 'Se puede programar.', opciones: ['Ahora', 'En 2 horas', 'Mañana temprano', 'Que lo elija el motor'] },
      { id: 'link_hist', etiqueta: 'A dónde lleva', tipo: 'link', ayuda: 'Producto, tienda o WhatsApp. Opcional pero suma mucho.' },
    ],
  },
  {
    key: 'mensaje',
    nombre: 'Mensaje a tus clientes',
    icono: '💬',
    color: '#25d366',
    resumen: 'WhatsApp o email directo a una lista tuya.',
    paraQue: 'Es el canal que más vende y el más barato, porque le hablás a gente que ya te compró. El motor segmenta solo.',
    campos: [
      { id: 'lista', etiqueta: 'A qué lista', tipo: 'opciones', ayuda: 'El motor ya tiene tus clientes separados por comportamiento.', opciones: ['Todos los que compraron', 'No compran hace +90 días', 'Abandonaron el carrito', 'Los que más compran', 'Lista propia'], multi: true },
      { id: 'que_decir', etiqueta: 'Qué les querés decir', tipo: 'texto', ayuda: 'La idea. Ej. volvió el serum que se había agotado.' },
      { id: 'incentivo_msg', etiqueta: 'Con qué incentivo', tipo: 'texto', ayuda: 'Cupón, envío gratis, regalo. Si no querés poner nada, dejalo vacío.' },
      { id: 'canal', etiqueta: 'Por dónde', tipo: 'opciones', ayuda: 'WhatsApp vende más; el email molesta menos.', opciones: ['WhatsApp', 'Email'], multi: true },
      { id: 'cuando_msg', etiqueta: 'Cuándo', tipo: 'opciones', ayuda: 'El motor solo escribe entre 8:00 y 22:00: es un freno que no se puede desactivar.', opciones: ['Hoy', 'Mañana 10:00', 'A la tarde', 'Que lo elija el motor'] },
    ],
    avanzados: [
      { id: 'faq', etiqueta: 'Preguntas que siempre te hacen', tipo: 'texto', ayuda: 'Precio, envío, garantía y tus respuestas. El agente las usa para contestar solo.' },
      { id: 'numero', etiqueta: 'Tu número de WhatsApp', tipo: 'texto', ayuda: 'Con código de país. Ya lo tenemos si conectaste la API.' },
    ],
  },
  {
    key: 'lanzamiento',
    nombre: 'Lanzamiento',
    icono: '🚀',
    color: '#ef4444',
    resumen: 'Una secuencia con fechas, no una sola publicación.',
    paraQue: 'Para algo nuevo: el motor arma teaser, revelación, preventa y apertura, cada uno en su día.',
    campos: [
      { id: 'que_lanzas', etiqueta: 'Qué lanzas', tipo: 'texto', ayuda: 'Producto nuevo, una versión mejorada, una marca.' },
      { id: 'fecha_salida', etiqueta: 'Cuándo sale a la venta', tipo: 'texto', ayuda: 'Fecha o semana. Con esto el motor arma el calendario para atrás.' },
      { id: 'etapas', etiqueta: 'Qué etapas querés', tipo: 'opciones', ayuda: 'Se puede empezar por la mitad si la fecha está encima.', opciones: ['Teaser', 'Revelación', 'Preventa', 'Apertura'], multi: true },
      { id: 'precio_lanz', etiqueta: 'Precio de lanzamiento', tipo: 'texto', ayuda: 'Si hay precio especial solo para los primeros días.' },
      { id: 'diferencia', etiqueta: 'Qué lo hace distinto', tipo: 'texto', ayuda: 'El argumento central: por qué este y no otro.' },
    ],
  },
  {
    key: 'sorteo',
    nombre: 'Sorteo o concurso',
    icono: '🎁',
    color: '#ec4899',
    resumen: 'Para ganar seguidores y comentarios rápido.',
    paraQue: 'Crece la cuenta y llena la lista de gente nueva, con la contra de que no todos compran. El motor lo usa para sumar, no para vender.',
    campos: [
      { id: 'premio', etiqueta: 'Qué sorteás', tipo: 'texto', ayuda: 'Tiene que valer la pena pero no comerte el margen.' },
      { id: 'mecanica', etiqueta: 'Cómo se participa', tipo: 'texto', ayuda: 'Ej. seguir la cuenta, comentar y etiquetar a dos personas.' },
      { id: 'cierre', etiqueta: 'Cuándo cierra', tipo: 'texto', ayuda: 'Fecha y hora. Los sorteos cortos rinden más.' },
      { id: 'requisitos', etiqueta: 'Requisitos y condiciones', tipo: 'texto', ayuda: 'Zona de entrega, mayores de edad, una sola participación por persona.' },
      { id: 'donde_sorteo', etiqueta: 'Dónde se anuncia', tipo: 'opciones', ayuda: 'El sorteo funciona mejor si se avisa en varios lados.', opciones: ['Instagram', 'Facebook', 'WhatsApp', 'TikTok'], multi: true },
    ],
  },
  {
    key: 'creador',
    nombre: 'Colaboración con creador',
    icono: '🤝',
    color: '#8b5cf6',
    resumen: 'Que alguien más lo cuente por vos.',
    paraQue: 'La recomendación de una persona de confianza vende más que cualquier anuncio. El motor prepara el brief.',
    campos: [
      { id: 'que_le_pedis', etiqueta: 'Qué le pedís', tipo: 'texto', ayuda: 'Un video usando el producto, una reseña, una historia, una mención. El buscador de creadores de acá abajo te dice quién puede hacerlo.' },
      { id: 'que_le_ofreces', etiqueta: 'Qué le ofreces', tipo: 'texto', ayuda: 'Producto, plata, comisión por venta o código de descuento. Los precios de cada creador están en las tarjetas.' },
      { id: 'cuando_creador', etiqueta: 'Para cuándo', tipo: 'texto', ayuda: 'Fecha de publicación acordada. Si todavía no la sabés, Rumi la cierra en la conversación con el creador.' },
    ],
    avanzados: [
      { id: 'brief', etiqueta: 'Qué no puede decir', tipo: 'texto', ayuda: 'Promesas de resultado, precios que no son, cosas que la marca no dice.' },
    ],
  },
];

// Lo que NO se publica: trabaja solo. Se muestra como puente a Conversaciones.
export const NO_SE_PUBLICA = [
  'Recuperar el carrito abandonado',
  'Recompra a los 30 días',
  'Bienvenida al que escribe por primera vez',
  'Pedir reseña después de la compra',
  'Referidos: que el cliente traiga a otro',
];

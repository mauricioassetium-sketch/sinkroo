// =============================================================================================
import { OFERTAS_ANTERIORES } from './demo';

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
  /** Deja elegir la HORA EXACTA (00:00 a 23:30, formato de 24 h) además de las opciones de la lista. */
  horaLibre?: boolean;
  /** Deja elegir EL DÍA Y LA HORA (los próximos 30 días + 24 h). La etiqueta de la pastilla sale de `opcionDiaHora`. */
  diaHora?: boolean;
  /** Texto de la pastilla que abre el selector de día y hora (sólo si `diaHora`). */
  opcionDiaHora?: string;
  /** Avisa cuando la hora elegida cae fuera de la ventana de envío de 8:00 a 22:00. */
  ventanaEnvio?: boolean;
  /** Qué hace cada opción, por opción: se muestra en el globito al pasar el mouse por la pastilla. */
  detalle?: Record<string, string>;
  /** Muestra el detalle de las opciones elegidas DEBAJO de las pastillas (en el celular no hay globito). */
  detalleVisible?: boolean;
  /** Un campo de texto que ADEMÁS acepta imágenes: pantallazos del celular o pegados con Ctrl+V. */
  conImagenes?: boolean;
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
  /** Lo que hay que explicar del modelo de esta forma de publicar, pegado a sus campos. */
  nota?: string;
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
// A DÓNDE CAE LA PERSONA — lista predefinida, compartida por las formas de publicar que llevan a
// algún lado (anuncio pago e historia). Cada destino explica qué hace: no son intercambiables, y
// elegir mal el destino es lo que hace que una pieza rinda o no.
// ---------------------------------------------------------------------------------------------
const DESTINOS = [
  'Tu tienda online', 'Un producto puntual', 'WhatsApp',
  'Instagram', 'Formulario o landing', 'Tu local en el mapa',
];
const DETALLE_DESTINOS: Record<string, string> = {
  'Tu tienda online': 'La página principal de tu tienda: sirve para vender cualquier cosa del catálogo.',
  'Un producto puntual': 'La ficha del producto de esta campaña. Es lo que mejor convierte cuando hay una sola oferta.',
  'WhatsApp': 'Abre el chat con vos. Es el que más vende, pero necesita que alguien conteste.',
  'Instagram': 'Tu perfil o el mensaje directo: sirve para sumar seguidores y mostrar el catálogo del feed.',
  'Formulario o landing': 'Una página donde la persona deja sus datos. Sirve para servicios y presupuestos.',
  'Tu local en el mapa': 'Para que vayan en persona: muestra la dirección, el horario y cómo llegar.',
};

// ---------------------------------------------------------------------------------------------
// FORMAS DE PAGO — lista predefinida, seleccionable. El cliente NO las escribe: elige las que usa.
// Los precios van en su propio campo. Cada forma explica cómo le entra la plata al negocio.
// ---------------------------------------------------------------------------------------------
const FORMAS_PAGO = [
  'Efectivo', 'Transferencia bancaria', 'Tarjeta de débito o crédito', 'Cuotas sin interés',
  'Mercado Pago', 'PayPal', 'USDT (cripto)', 'Bitcoin (cripto)',
];
const DETALLE_PAGOS: Record<string, string> = {
  'Efectivo': 'Lo cobrás en el momento, sin comisión ni espera.',
  'Transferencia bancaria': 'Entra derecho a tu cuenta. Es lo más común para montos grandes.',
  'Tarjeta de débito o crédito': 'Cobrás al instante, con la comisión del posnet o de la pasarela.',
  'Cuotas sin interés': 'Financiás vos el costo: sube la venta de tickets altos.',
  'Mercado Pago': 'Link o QR: es la forma que más se usa para cobrar a distancia.',
  'PayPal': 'Para clientes de afuera: cobra en dólares.',
  'USDT (cripto)': 'Dólar digital: entra al instante, sin banco y sin la volatilidad del bitcoin.',
  'Bitcoin (cripto)': 'Pago en BTC: para clientes que ya operan con cripto.',
};

// ---------------------------------------------------------------------------------------------
// EL TONO AL CONVERSAR — predefinido y seleccionable: es lo que decide cómo suena cada pieza. El
// texto libre queda para las palabras propias de la marca (muletillas, palabras que no diría).
// ---------------------------------------------------------------------------------------------
const TONOS = [
  'Cercano y cálido', 'Directo y sin vueltas', 'Divertido y descontracturado',
  'Profesional y formal', 'Experto y educativo', 'Premium y sobrio',
];
const DETALLE_TONOS: Record<string, string> = {
  'Cercano y cálido': 'Habla como si atendieras en el mostrador: de vos, con ganas de ayudar.',
  'Directo y sin vueltas': 'Va al beneficio en la primera línea, sin adornos ni rodeos.',
  'Divertido y descontracturado': 'Usa humor y complicidad. Sirve para marcas jóvenes y redes.',
  'Profesional y formal': 'Trato de usted y sin chistes: servicios, salud y clientes corporativos.',
  'Experto y educativo': 'Explica el por qué: ingredientes, modo de uso, comparaciones.',
  'Premium y sobrio': 'Pocas palabras y tono alto. Para tickets altos y productos exclusivos.',
};

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
      { id: 'destinos', etiqueta: 'A dónde los mandás', tipo: 'opciones', ayuda: 'Podés elegir más de uno. De acá sale el botón de la pieza y hacia dónde apunta el mensaje.', multi: true,
        opciones: DESTINOS, detalle: DETALLE_DESTINOS },
      { id: 'link', etiqueta: 'El link exacto (opcional)', tipo: 'link', ayuda: 'Pegá la dirección completa. Si elegiste WhatsApp o Instagram, el motor arma el link solo.' },
    ],
    avanzados: [
      { id: 'precios', etiqueta: 'Precios', tipo: 'texto', ayuda: 'Cuánto cuesta cada cosa. Ej. serum $34, pack $89 con envío gratis.' },
      { id: 'formas_pago', etiqueta: 'Formas de pago que aceptás', tipo: 'opciones', multi: true,
        ayuda: 'Elegí las que ya usás: la pieza va a decir el botón y la aclaración que correspondan.',
        opciones: FORMAS_PAGO, detalle: DETALLE_PAGOS },
      { id: 'ofertas', etiqueta: 'Ofertas vigentes', tipo: 'texto', ayuda: 'Descuentos, 2x1, envío gratis. Con fecha de vencimiento si tienen.' },
      { id: 'ofertas_previas', etiqueta: 'Ofertas que ya usaste', tipo: 'opciones', multi: true, detalleVisible: true,
        ayuda: 'Elegí las que querés repetir: se suman a lo que escribas arriba. Cada una trae el mes en que corrió y cómo le fue.',
        opciones: OFERTAS_ANTERIORES.map(o => o.oferta),
        detalle: Object.fromEntries(OFERTAS_ANTERIORES.map(o => [o.oferta, `${o.cuando} · ${o.comoLeFue}`])) },
      { id: 'testimonios', etiqueta: 'Reseñas reales de tus clientes', tipo: 'texto', conImagenes: true, ayuda: 'Escribí lo que te dijeron, o subí el pantallazo. Es lo que más sube el puntaje del panel.' },
      { id: 'tono', etiqueta: 'Cuál es tu tono al conversar', tipo: 'opciones', multi: true, detalleVisible: true,
        ayuda: 'Elegí los que te representen: con dos alcanza. El motor escribe con ese tono.',
        opciones: TONOS, detalle: DETALLE_TONOS },
      { id: 'tono_texto', etiqueta: 'Palabras y frases que usás siempre', tipo: 'texto', ayuda: 'Opcional: las muletillas de tu marca y las palabras que no dirías nunca.' },
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
      { id: 'cuando_feed', etiqueta: 'Cuándo publicarlo', tipo: 'opciones', ayuda: 'Si no sabés, el motor elige la franja donde más te ven. O elegí la hora exacta.', horaLibre: true, opciones: ['Que lo elija el motor', 'Hoy', 'Mañana', 'Esta semana'] },
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
      { id: 'cuando_hist', etiqueta: 'Cuándo sale', tipo: 'opciones', diaHora: true, opcionDiaHora: 'Elegí el día y la hora', opciones: ['Que lo recomiende el motor'], ayuda: 'Dos caminos: elegís el día y la hora, o el motor recomienda la mejor franja.' },
      { id: 'destinos_hist', etiqueta: 'A dónde lleva', tipo: 'opciones', ayuda: 'Podés elegir más de uno. Sin esto la historia solo se mira, no lleva a ningún lado.', multi: true,
        opciones: DESTINOS, detalle: DETALLE_DESTINOS },
      { id: 'link_hist', etiqueta: 'El link exacto (opcional)', tipo: 'link', ayuda: 'Pegá la dirección completa. Si elegiste WhatsApp o Instagram, el motor arma el link solo.' },
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
      { id: 'cuando_msg', etiqueta: 'Cuándo', tipo: 'opciones', ayuda: 'Elegí la hora exacta, de 00:00 a 23:30. Si lo decide el motor, escribe dentro de su ventana de 8:00 a 22:00.', horaLibre: true, ventanaEnvio: true, opciones: ['Hoy', 'Mañana 10:00', 'A la tarde', 'Que lo elija el motor'] },
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
    resumen: 'La pieza que ya grabó alguien con quien arreglaste por fuera.',
    paraQue: 'Sinkroo no busca colaboradores: el acuerdo lo cerrás vos por fuera y acá subís el link y el video. El motor monta esa pieza con lo suyo y todo va a la misma evaluación.',
    campos: [
      { id: 'link_colab', etiqueta: 'El link del colaborador', tipo: 'link', ayuda: 'Su perfil o la publicación donde se ve. El motor entra, ve quién es y con quién habla.' },
      { id: 'acuerdo_colab', etiqueta: 'Lo que arreglaron por fuera', tipo: 'texto', ayuda: 'Qué le pedís, qué le das a cambio y para cuándo. El acuerdo es entre ustedes: Sinkroo no lo cobra ni lo intermedia.' },
      { id: 'video_colab', etiqueta: 'El video del colaborador', tipo: 'videos', ayuda: 'El archivo tal como te lo entregó. Podés subir varios: se suman a los que produce el motor para esta campaña.' },
      { id: 'cuando_colab', etiqueta: 'Cuándo sale', tipo: 'opciones', diaHora: true, opcionDiaHora: 'Elegí el día y la hora', opciones: ['Que lo recomiende el motor'], ayuda: 'Dos caminos: elegís el día y la hora, o el motor recomienda la mejor franja.' },
      { id: 'filtro_colab', etiqueta: 'Su contenido y el filtro de MiroFish', tipo: 'opciones',
        ayuda: 'El contenido de un colaborador no pasa por el filtro de MiroFish, porque no lo produjo el motor. Si no elegís nada, se publica sin pasar.',
        opciones: ['Se publica sin pasar por el filtro', 'Probarlo también en MiroFish'],
        detalle: {
          'Se publica sin pasar por el filtro': 'Es el camino normal: su pieza entra tal como la entregó, sin que nada la frene.',
          'Probarlo también en MiroFish': 'Lo miran los 5 jueces y los 500 del público. El resultado no cambia qué se publica: es para ver cómo reacciona.',
        } },
    ],
    nota: 'La pieza que se publica es su video más lo que agrega el motor: guion, subtítulos, música, marca y copy. Se suma a los videos que produce el motor para esta campaña y todo junto pasa por la misma evaluación del público.',
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

// ===== Ingesta de material por tipo de campaña =====
// Cada tipo arma un MÓDULO COMPLETO: qué subir (visual, escrito, links, datos)
// para que la IA ingiera el material y cree piezas, videos, etc.
import type { ObjetivoCampana } from './data';

export type TipoCampo = 'imagenes' | 'videos' | 'archivos' | 'texto' | 'link';

export interface CampoIngesta {
  id: string;
  etiqueta: string;
  tipo: TipoCampo;
  ayuda: string;
}

export interface MaterialItem {
  etiqueta: string;
  tipo: 'archivo' | 'texto';
  valor: string;
}

export interface IngestaSpec {
  intro: string;
  secciones: IngestaSeccion[];
}

export interface IngestaSeccion {
  titulo: string;
  campos: CampoIngesta[];
}

// ===== Campos base reutilizables =====
// VISUALES
const FOTOS_PRODUCTO: CampoIngesta = { id: 'fotos_producto', etiqueta: '📷 Fotos de tus productos', tipo: 'imagenes', ayuda: 'Fotos reales: frente, detalle, en uso, empaque, ángulos. JPG o PNG.' };
const FOTOS_NEGOCIO: CampoIngesta = { id: 'fotos_negocio', etiqueta: '🏪 Fotos del negocio / equipo', tipo: 'imagenes', ayuda: 'Interior, local, equipo, proceso, entregas, detrás de escena.' };
const VIDEOS_NEGOCIO: CampoIngesta = { id: 'videos_negocio', etiqueta: '🎬 Videos que ya tenés', tipo: 'videos', ayuda: 'Clips, reels, testimonios grabados, grabaciones del celular.' };
const FOTOS_MARCA: CampoIngesta = { id: 'fotos_marca', etiqueta: '📸 Fotos de marca', tipo: 'imagenes', ayuda: 'Local, equipo, producto en contexto, estilo de vida, lifestyle.' };
const LOGO: CampoIngesta = { id: 'logo', etiqueta: '✨ Logo en alta calidad', tipo: 'imagenes', ayuda: 'PNG con fondo transparente si lo tenés; también SVG.' };
const VIDEOS_PRODUCTO: CampoIngesta = { id: 'videos_producto', etiqueta: '🎥 Videos del producto en acción', tipo: 'videos', ayuda: 'Demo, unboxing, uso real, tutoriales cortos.' };

// ESCRITOS
const DESC_PRODUCTO: CampoIngesta = { id: 'desc_producto', etiqueta: '📝 Descripción del producto/servicio', tipo: 'texto', ayuda: 'Qué es, qué hace, cómo se usa, de qué está hecho. Todo detalle.' };
const TESTIMONIOS: CampoIngesta = { id: 'testimonios', etiqueta: '⭐ Testimonios y reseñas reales', tipo: 'texto', ayuda: 'Copiá reseñas de clientes, mensajes de WhatsApp, comentarios.' };
const TONO_MARCA: CampoIngesta = { id: 'tono_marca', etiqueta: '🗣️ Tono y voz de la marca', tipo: 'texto', ayuda: 'Formal/divertida/cercana; palabras que usás siempre; lo que NO dirías.' };
const HISTORIA_MARCA: CampoIngesta = { id: 'historia_marca', etiqueta: '📖 Historia y valores', tipo: 'texto', ayuda: 'Quiénes son, por qué existen, qué los hace diferentes.' };
const PUBLICO_OBJETIVO: CampoIngesta = { id: 'publico_objetivo', etiqueta: '👥 Público objetivo', tipo: 'texto', ayuda: 'Edad, intereses, dónde viven, qué problema tienen, qué desean.' };
const OBJETIVO_CAMPANA_TXT: CampoIngesta = { id: 'objetivo_campana_txt', etiqueta: '🎯 Qué querés lograr', tipo: 'texto', ayuda: 'Vender X unidades, conseguir N leads, posicionar la marca…' };
const MENSAJES_CLAVE: CampoIngesta = { id: 'mensajes_clave', etiqueta: '💬 Mensajes clave que deben aparecer', tipo: 'texto', ayuda: 'Frases, promesas, diferenciales que no pueden faltar en las piezas.' };
const OFERTAS_PROMOS: CampoIngesta = { id: 'ofertas_promos', etiqueta: '🏷️ Ofertas / promos vigentes', tipo: 'texto', ayuda: 'Descuentos, 2x1, envío gratis, cupones con fecha de vencimiento.' };
const PRECIOS: CampoIngesta = { id: 'precios', etiqueta: '💰 Precios y formas de pago', tipo: 'texto', ayuda: 'Cuánto cuesta cada cosa, métodos de pago, cuotas.' };

// LINKS
const LINK_COMPRA: CampoIngesta = { id: 'link_compra', etiqueta: '🛒 Link de compra / checkout', tipo: 'link', ayuda: 'https://… (tienda, catálogo, WhatsApp, landing).' };
const LINK_REDES: CampoIngesta = { id: 'link_redes', etiqueta: '🔗 Redes y web', tipo: 'link', ayuda: 'Instagram, TikTok, Facebook, web oficial — https://…' };
const LINK_DESTINO: CampoIngesta = { id: 'link_destino', etiqueta: '🌐 URL de destino', tipo: 'link', ayuda: 'A dónde deben llevar las piezas (landing, página, WhatsApp).' };

// ARCHIVOS / DATOS
const CATALOGO_PDF: CampoIngesta = { id: 'catalogo_pdf', etiqueta: '📋 Catálogo / lista de productos', tipo: 'archivos', ayuda: 'PDF, Excel, CSV o fotos de tu lista con precios.' };
const MANUAL_MARCA: CampoIngesta = { id: 'manual_marca', etiqueta: '🎨 Manual de marca', tipo: 'archivos', ayuda: 'Colores, tipografías, guía de estilo en PDF o imágenes.' };

// ===== SECCIONES BASE REUTILIZABLES =====
const SEC_VISUAL: IngestaSeccion = { titulo: '📸 Material visual', campos: [FOTOS_PRODUCTO, FOTOS_NEGOCIO, VIDEOS_PRODUCTO, VIDEOS_NEGOCIO, FOTOS_MARCA, LOGO] };
const SEC_ESCRITO: IngestaSeccion = { titulo: '✍️ Información escrita', campos: [DESC_PRODUCTO, HISTORIA_MARCA, TONO_MARCA, MENSAJES_CLAVE] };
const SEC_COMERCIAL: IngestaSeccion = { titulo: '💰 Datos comerciales', campos: [PRECIOS, OFERTAS_PROMOS, TESTIMONIOS] };
const SEC_CONTACTO: IngestaSeccion = { titulo: '🔗 Links y contacto', campos: [LINK_COMPRA, LINK_REDES] };
const SEC_DOCS: IngestaSeccion = { titulo: '📎 Documentos', campos: [CATALOGO_PDF, MANUAL_MARCA] };

// ===== MÓDULOS COMPLETOS POR TIPO DE CAMPAÑA =====
export const INGESTA_CAMPANA: Record<ObjetivoCampana, IngestaSpec> = {
  ventas: {
    intro: 'Los agentes usarán tus fotos reales, precios y testimonios para crear las piezas que venden. Cuanto más material, mejor.',
    secciones: [
      SEC_COMERCIAL,
      SEC_VISUAL,
      SEC_ESCRITO,
      SEC_CONTACTO,
      SEC_DOCS,
      { titulo: '🎯 Estrategia', campos: [
        PUBLICO_OBJETIVO,
        OBJETIVO_CAMPANA_TXT,
        { id: 'productos_foco_ventas', etiqueta: '⭐ Productos foco de la campaña', tipo: 'texto', ayuda: 'Los 2-3 productos que querés empujar y por qué.' },
      ] },
    ],
  },
  seguidores: {
    intro: 'Los agentes necesitan saber cómo te ven hoy: subí fotos y videos de tu negocio y tus mejores publicaciones.',
    secciones: [
      SEC_VISUAL,
      SEC_ESCRITO,
      { titulo: '📱 Redes actuales', campos: [
        LINK_REDES,
        { id: 'mejores_posts', etiqueta: '🏆 Posts que te funcionaron', tipo: 'texto', ayuda: 'Qué publicaciones te dieron más alcance/seguidores y por qué creés que funcionaron.' },
        { id: 'peores_posts', etiqueta: '📉 Posts que NO funcionaron', tipo: 'texto', ayuda: 'Lo que probaste y no dio resultado. Para no repetirlo.' },
      ] },
      { titulo: '👥 Comunidad', campos: [
        PUBLICO_OBJETIVO,
        { id: 'competencia_ref', etiqueta: '⚔️ Cuentas que te gustan', tipo: 'link', ayuda: 'Referencias de marcas parecidas: https://…' },
      ] },
    ],
  },
  trafico: {
    intro: 'Subí a dónde van a llegar las personas y qué van a encontrar. Los agentes crean piezas que empujan al click.',
    secciones: [
      { titulo: '🌐 Destino', campos: [
        LINK_DESTINO,
        { id: 'capturas_landing', etiqueta: '📸 Capturas de la página de destino', tipo: 'imagenes', ayuda: 'Screenshots de la landing tal como la ven hoy.' },
        { id: 'que_encuentran', etiqueta: '🧭 Qué encuentran al llegar', tipo: 'texto', ayuda: 'Qué muestra la página: catálogo, formulario, promoción…' },
      ] },
      SEC_VISUAL,
      SEC_ESCRITO,
      SEC_COMERCIAL,
      SEC_CONTACTO,
    ],
  },
  mensajes: {
    intro: 'Los agentes arman las conversaciones con tus plantillas y tu catálogo real de WhatsApp.',
    secciones: [
      { titulo: '💬 WhatsApp', campos: [
        { id: 'numero_wa', etiqueta: '📱 Tu número de WhatsApp', tipo: 'texto', ayuda: 'Con código de país, ej. +52 55 1234 5678.' },
        { id: 'plantillas_mensajes', etiqueta: '📨 Mensajes que ya usás', tipo: 'texto', ayuda: 'Copiá los mensajes que mandás hoy, con lo que haya.' },
        { id: 'catalogo_wa', etiqueta: '📋 Catálogo de WhatsApp Business', tipo: 'archivos', ayuda: 'Export o capturas de tu catálogo actual.' },
      ] },
      SEC_VISUAL,
      SEC_COMERCIAL,
      { titulo: '❓ FAQ', campos: [
        { id: 'faq', etiqueta: '❓ Preguntas que siempre te hacen', tipo: 'texto', ayuda: 'Precio, horario, envío, garantía y tus respuestas.' },
      ] },
    ],
  },
  marca: {
    intro: 'Todo lo que defina tu identidad: logo, colores, historia. Los agentes lo usan para que la marca se reconozca.',
    secciones: [
      { titulo: '🎨 Identidad', campos: [
        LOGO,
        MANUAL_MARCA,
        HISTORIA_MARCA,
        TONO_MARCA,
        FOTOS_MARCA,
        { id: 'video_marca', etiqueta: '🎬 Video de marca', tipo: 'videos', ayuda: 'Video institucional o clips con el estilo de la marca.' },
      ] },
      SEC_ESCRITO,
      { titulo: '👥 Posicionamiento', campos: [
        PUBLICO_OBJETIVO,
        { id: 'competencia_marca', etiqueta: '⚔️ Competencia y diferencia', tipo: 'texto', ayuda: 'Contra quiénes competís y en qué te diferenciás.' },
      ] },
    ],
  },
  retargeting: {
    intro: 'Los agentes crean piezas para recuperar a los que ya te conocieron: usan tus productos más vistos y tus ofertas.',
    secciones: [
      { titulo: '📡 Datos de retargeting', campos: [
        { id: 'pixel_info', etiqueta: '📡 Píxel / datos de visitantes', tipo: 'texto', ayuda: 'Qué píxel tenés instalado y qué datos tenés (visitas, carritos…).' },
        { id: 'audiencias_actuales', etiqueta: '👥 Audiencias ya creadas', tipo: 'texto', ayuda: 'Visitantes 30 días, carritos abandonados, compradores…' },
        { id: 'productos_mas_vistos', etiqueta: '👀 Productos más vistos', tipo: 'texto', ayuda: 'Los 3-5 productos que más gente miró y no compró.' },
      ] },
      SEC_COMERCIAL,
      SEC_VISUAL,
      SEC_ESCRITO,
    ],
  },
  reventa: {
    intro: 'Los agentes personalizan los mensajes con el historial real de tus clientes: qué compran y cada cuánto.',
    secciones: [
      { titulo: '👥 Clientes y recompra', campos: [
        { id: 'base_clientes', etiqueta: '📊 Base de clientes', tipo: 'archivos', ayuda: 'Export CSV/Excel de tus clientes con lo que compraron.' },
        { id: 'patrones_compra', etiqueta: '🔁 Qué compran y cada cuánto', tipo: 'texto', ayuda: 'Consumibles, servicios recurrentes, frecuencia típica.' },
        { id: 'productos_recompra', etiqueta: '📦 Productos para recompra', tipo: 'texto', ayuda: 'Qué querés que vuelvan a comprar.' },
        { id: 'incentivo_recompra', etiqueta: '🎁 Incentivo de recompra', tipo: 'texto', ayuda: 'Descuento o regalo para el que vuelve a comprar.' },
      ] },
      SEC_VISUAL,
      SEC_COMERCIAL,
    ],
  },

  recuperacion: {
    intro: 'Los agentes escriben para volver a enganchar a quien se fue, con tus incentivos y tus productos.',
    secciones: [
      { titulo: '💤 Clientes inactivos', campos: [
        { id: 'base_inactivos', etiqueta: '💤 Lista de clientes inactivos', tipo: 'archivos', ayuda: 'Export o lista de clientes que dejaron de comprar.' },
        { id: 'ultima_compra_info', etiqueta: '📅 Cuándo compraron por última vez', tipo: 'texto', ayuda: 'Hace cuánto, qué compraron, monto típico.' },
        { id: 'incentivo_volver', etiqueta: '🫶 Razón para volver', tipo: 'texto', ayuda: 'Qué les vas a ofrecer para que regresen.' },
      ] },
      SEC_VISUAL,
      SEC_COMERCIAL,
      SEC_ESCRITO,
    ],
  },
  upsell: {
    intro: 'Los agentes arman combos con lo que ya compran tus clientes y lo que querés sumarle.',
    secciones: [
      { titulo: '🧺 Combos y sumas', campos: [
        { id: 'productos_base', etiqueta: '🧺 Qué compra tu cliente hoy', tipo: 'texto', ayuda: 'El producto base que ya se vende solo.' },
        { id: 'productos_complementarios', etiqueta: '➕ Qué querés sumarle', tipo: 'texto', ayuda: 'Complementos, accesorios, la versión premium.' },
        { id: 'combos_precios', etiqueta: '🏷️ Precios y combos', tipo: 'texto', ayuda: 'Precio individual, precio del combo, margen.' },
      ] },
      SEC_VISUAL,
      SEC_COMERCIAL,
      SEC_ESCRITO,
    ],
  },
  lealtad: {
    intro: 'Los agentes crean piezas que premian a tus clientes recurrentes con tu programa real.',
    secciones: [
      { titulo: '🏅 Programa', campos: [
        { id: 'programa_actual', etiqueta: '🏅 Tu programa de recompensas', tipo: 'texto', ayuda: 'Cómo funciona hoy: puntos, niveles, sellos, membresía.' },
        { id: 'recompensas', etiqueta: '🎁 Qué gana el cliente', tipo: 'texto', ayuda: 'Premios concretos: descuentos, gratis, exclusividades.' },
        { id: 'base_miembros', etiqueta: '👥 Miembros del programa', tipo: 'archivos', ayuda: 'Lista/export de quienes ya participan.' },
      ] },
      SEC_VISUAL,
      SEC_COMERCIAL,
      SEC_ESCRITO,
    ],
  },
  leads: {
    intro: 'Los agentes necesitan el imán (lo que entregás) y a dónde llega el interesado.',
    secciones: [
      { titulo: '🧲 Imán de leads', campos: [
        { id: 'lead_magnet', etiqueta: '🧲 Lo que entregás a cambio', tipo: 'archivos', ayuda: 'PDF, guía, cupón, presupuesto: el archivo que recibe el lead.' },
        { id: 'url_formulario', etiqueta: '📝 URL del formulario', tipo: 'link', ayuda: 'A dónde llega el interesado para dejar sus datos.' },
        { id: 'descripcion_oferta', etiqueta: '✍️ De qué va la oferta', tipo: 'texto', ayuda: 'Qué reciben, para quién es, por qué vale la pena.' },
      ] },
      SEC_VISUAL,
      SEC_ESCRITO,
      SEC_CONTACTO,
    ],
  },
  lanzamiento: {
    intro: 'Los agentes preparan la expectativa: usan fotos del producto nuevo, la fecha y qué lo hace único.',
    secciones: [
      { titulo: '🚀 Producto nuevo', campos: [
        { id: 'fotos_producto_nuevo', etiqueta: '📷 Fotos del producto nuevo', tipo: 'imagenes', ayuda: 'Todas las que tengas, incluso borradores o renders.' },
        { id: 'video_producto_nuevo', etiqueta: '🎬 Videos del producto nuevo', tipo: 'videos', ayuda: 'Demo, unboxing, prototipo en acción.' },
        { id: 'fecha_precio', etiqueta: '📅 Fecha de lanzamiento y precio', tipo: 'texto', ayuda: 'Cuándo sale y cuánto costará.' },
        { id: 'lista_espera', etiqueta: '👥 Lista de espera / inscriptos', tipo: 'archivos', ayuda: 'Export de interesados, si ya tenés.' },
        { id: 'diferencia_producto', etiqueta: '⚡ Qué lo hace diferente', tipo: 'texto', ayuda: 'El argumento clave: por qué este y no otro.' },
      ] },
      SEC_ESCRITO,
      SEC_COMERCIAL,
    ],
  },
  lanzamientoMarca: {
    intro: 'Los agentes presentan tu marca al mundo con tu identidad real.',
    secciones: [
      { titulo: '🎨 Identidad', campos: [LOGO, MANUAL_MARCA, HISTORIA_MARCA] },
      { titulo: '📅 Lanzamiento', campos: [
        { id: 'fecha_lanzamiento', etiqueta: '📅 Fecha del lanzamiento', tipo: 'texto', ayuda: 'Cuándo se presenta la marca públicamente.' },
        FOTOS_MARCA,
        { id: 'video_marca', etiqueta: '🎬 Video de marca', tipo: 'videos', ayuda: 'Video institucional o clips con el estilo de la marca.' },
      ] },
      SEC_ESCRITO,
    ],
  },
  referidos: {
    intro: 'Los agentes arman la mecánica y los mensajes para que tus clientes te recomienden.',
    secciones: [
      { titulo: '🤝 Mecánica', campos: [
        { id: 'como_funciona', etiqueta: '🤝 Cómo funciona tu programa', tipo: 'texto', ayuda: 'Qué tiene que hacer el cliente para referir.' },
        { id: 'incentivo_ambos', etiqueta: '🎁 Qué ganan ambos', tipo: 'texto', ayuda: 'Premio para quien refiere y para el nuevo cliente.' },
      ] },
      SEC_VISUAL,
      SEC_COMERCIAL,
      { titulo: '⭐ Testimonios', campos: [TESTIMONIOS] },
    ],
  },
  temporada: {
    intro: 'Los agentes preparan todo con anticipación: fechas, ofertas y fotos con temática del evento.',
    secciones: [
      { titulo: '📅 Evento', campos: [
        { id: 'evento_fechas', etiqueta: '📅 Evento y fechas clave', tipo: 'texto', ayuda: 'Black Friday, Navidad, Día de la Madre… fechas exactas.' },
        { id: 'ofertas_temporada', etiqueta: '🏷️ Ofertas del período', tipo: 'texto', ayuda: 'Descuentos, bundles, precios especiales del evento.' },
        { id: 'fotos_temporada', etiqueta: '📷 Fotos con temática', tipo: 'imagenes', ayuda: 'Fotos de producto/navidad/evento que ya tengas.' },
        { id: 'productos_foco', etiqueta: '🎯 Productos foco', tipo: 'texto', ayuda: 'Qué querés empujar durante el evento.' },
        { id: 'stock_logistica', etiqueta: '📦 Stock y tiempos', tipo: 'texto', ayuda: 'Cuánto stock hay y cuánto tarda el envío.' },
      ] },
      SEC_VISUAL,
      SEC_COMERCIAL,
    ],
  },
};

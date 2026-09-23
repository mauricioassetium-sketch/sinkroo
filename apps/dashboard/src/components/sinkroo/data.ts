// ===== Sinkroo — estado y datos (fiel al mockup) =====
export type ModKey = 'M1'|'M2'|'M3'|'M4'|'M5'|'M6'|'M7';
export interface Modulo { key: ModKey; nombre: string; icono: string; color: string; desc: string; pct: number; }
export const MODULOS: Modulo[] = [
  { key: 'M1', nombre: 'Mercado',   icono: '🌐', color: '#6366f1', desc: 'Análisis de mercado y competencia', pct: 32 },
  { key: 'M2', nombre: 'Estrategia', icono: '🎯', color: '#a855f7', desc: 'Definición de estrategia y posicionamiento', pct: 54 },
  { key: 'M3', nombre: 'Herramientas', icono: '🛠️', color: '#22c55e', desc: 'Stack de herramientas recomendado', pct: 32 },
  { key: 'M4', nombre: 'Campañas',  icono: '📣', color: '#f59e0b', desc: 'Ejecución de campañas y anuncios', pct: 72 },
  { key: 'M5', nombre: 'WhatsApp',   icono: '💬', color: '#25d366', desc: 'Automatización y mensajería', pct: 40 },
  { key: 'M6', nombre: 'Fidelización', icono: '❤️', color: '#ec4899', desc: 'Retención y referidos', pct: 18 },
  { key: 'M7', nombre: 'Inteligencia Predictiva', icono: '🧠', color: '#8b5cf6', desc: 'La magia del modelo colectivo', pct: 61 },
];

export type ObjetivoCampana = 'ventas'|'seguidores'|'trafico'|'mensajes'|'marca'|'retargeting'|'reventa'|'recuperacion'|'upsell'|'lealtad'|'leads'|'lanzamiento'|'lanzamientoMarca'|'referidos'|'temporada';

export interface TipoCampana {
  key: ObjetivoCampana;
  nombre: string;
  icono: string;
  color: string;
  kpi: string;           // métrica que persigue
  audiencia: string;     // a quién apunta
  tono: string;          // estilo de comunicación
  formato: string;       // piezas creativas
  estrategia: string;    // resumen ejecutivo de la estrategia
}

export const TIPOS_CAMPANA: TipoCampana[] = [
  { key: 'ventas', nombre: 'Campaña de Ventas', icono: '💰', color: '#22c55e', kpi: 'ROAS y conversiones', audiencia: 'Compradores con intención de compra alta (audiencias de lookalike de clientes + carrito)', tono: 'Directo, enfocado en oferta y urgencia', formato: 'Anuncios de catálogo dinámico + testimonios + descuento por tiempo limitado', estrategia: 'Convertir tráfico caliente en ventas: oferta clara, prueba social fuerte y llamado a acción inmediato. Se optimiza por costo por conversión.' },
  { key: 'seguidores', nombre: 'Sumar Seguidores', icono: '📈', color: '#3b82f6', kpi: 'Nuevos seguidores y engagement', audiencia: 'Interesados en tu nicho aún no convertidos (audiencias amplias por intereses)', tono: 'Inspirador, cercano, de marca personal', formato: 'Reels cortos + carruseles educativos + detrás de cámaras', estrategia: 'Crecer comunidad: contenido de valor que se comparte, ganchos fuertes y constancia. Se optimiza por costo por seguidor y tasa de interacción.' },
  { key: 'trafico', nombre: 'Tráfico al Sitio', icono: '🌐', color: '#a855f7', kpi: 'Clics y costo por clic (CPC)', audiencia: 'Buscadores e interesados en el tema (palabras clave + intereses)', tono: 'Informativo, resolutivo', formato: 'Carruseles y anuncios de enlace con lead magnet', estrategia: 'Llevar gente a tu web/tienda: titular que resuelve un problema, CTA de clic y landing optimizada. Se optimiza por CPC y CTR.' },
  { key: 'mensajes', nombre: 'Mensajes por WhatsApp', icono: '💬', color: '#25d366', kpi: 'Conversaciones iniciadas y costo por conversación', audiencia: 'Audiencias que ya te conocen o con dudas (retargeting tibio)', tono: 'Personal, conversacional', formato: 'Ads de clic-a-WhatsApp + secuencia de bienvenida', estrategia: 'Abrir conversación: generar confianza en el chat y calificar leads. El agente GAIA responde en segundos. Se optimiza por conversaciones iniciadas.' },
  { key: 'marca', nombre: 'Reconocimiento de Marca', icono: '🌟', color: '#f59e0b', kpi: 'Alcance y frecuencia', audiencia: 'Audiencias amplias por demografía e intereses', tono: 'Aspiracional, emocional', formato: 'Videos de 15-30" + formatos verticales', estrategia: 'Posicionar la marca en la mente del público: historia, valores y repetición. Se optimiza por alcance y costo por mil (CPM).' },
  { key: 'retargeting', nombre: 'Retargeting', icono: '🎯', color: '#ec4899', kpi: 'Recuperación de carritos y retorno', audiencia: 'Personas que ya visitaron o abandonaron el carrito', tono: 'Recordatorio + incentivo', formato: 'Anuncios dinámicos de producto + descuento de recuperación', estrategia: 'Recuperar a quien se fue sin comprar: mostrar el producto exacto que vio, con un incentivo. Se optimiza por ROAS de recuperación.' },
  { key: 'reventa', nombre: 'Reventa / Recompra', icono: '🔄', color: '#f97316', kpi: 'Tasa de recompra y LTV', audiencia: 'Clientes que ya compraron y están satisfechos (base de compradores)', tono: 'Cercano, de agradecimiento y exclusividad', formato: 'Email + WhatsApp post-compra + oferta de recompra con beneficio', estrategia: 'Volver a venderle a quien ya confía: recordar el producto, ofrecer recompra o repuesto y premiar la constancia. Se optimiza por tasa de recompra y valor del cliente (LTV).' },
  { key: 'recuperacion', nombre: 'Recuperar Inactivos / Standby', icono: '⏳', color: '#64748b', kpi: 'Reactivación de clientes dormidos', audiencia: 'Clientes que no interactúan ni compran hace +90 días', tono: 'Personal, tipo "te extrañamos", con incentivo de vuelta', formato: 'Campaña de reactivación por WhatsApp/email + descuento de retorno', estrategia: 'Despertar a los que dejaron de comprar: mensaje personal, beneficio de bienvenida de vuelta y segmentación por motivo de inactividad. Se optimiza por tasa de reactivación.' },
  { key: 'upsell', nombre: 'Upsell / Cross-sell', icono: '📦', color: '#14b8a6', kpi: 'Ticket promedio y AOV', audiencia: 'Clientes recientes con pedido en curso o recién comprado', tono: 'Sugerente, de valor añadido', formato: 'Recomendaciones de producto complementario + bundles post-compra', estrategia: 'Aumentar el valor de cada compra: productos complementarios, packs y upgrade. Se muestra justo después de la compra. Se optimiza por ticket promedio (AOV).' },
  { key: 'lealtad', nombre: 'Lealtad / Fidelización', icono: '🏅', color: '#eab308', kpi: 'Retención y tasa de repetición', audiencia: 'Mejores clientes (top 20% por frecuencia y gasto)', tono: 'De reconocimiento y pertenencia', formato: 'Programa de puntos/recompensas + acceso anticipado + exclusividades', estrategia: 'Premiar a los más fieles para que se queden: recompensas, beneficios exclusivos y reconocimiento. Se optimiza por retención y frecuencia de compra.' },
  { key: 'leads', nombre: 'Captación de Leads', icono: '🧲', color: '#8b5cf6', kpi: 'Costo por lead y calidad del lead', audiencia: 'Interesados que aún no están listos para comprar (top of funnel)', tono: 'Educativo, de valor gratuito', formato: 'Lead magnet (guía, checklist, webinar) + formulario + secuencia de nutrición', estrategia: 'Convertir desconocidos en contactos: entregar algo de valor gratis a cambio del dato, y nutrir la lista hasta la venta. Se optimiza por costo por lead.' },
  { key: 'lanzamiento', nombre: 'Lanzamiento de Producto', icono: '🚀', color: '#ef4444', kpi: 'Ventas del día 1 y buzz', audiencia: 'Comunidad existente + lista de espera + audiencias similares', tono: 'Expectativa, escasez, emoción', formato: 'Teaser → revelación → pre-venta → apertura de carrito', estrategia: 'Generar expectativa antes de abrir: secuencia de teasers, lista de espera y apertura con urgencia. Se optimiza por ventas del lanzamiento y conversión de la lista.' },
  { key: 'lanzamientoMarca', nombre: 'Lanzamiento de Marca', icono: '🏷️', color: '#d946ef', kpi: 'Recordación de marca y búsquedas del nombre', audiencia: 'Mercado objetivo que aún no conoce la marca (base cero de clientes)', tono: 'Manifiesto, presentación, identidad', formato: 'Video manifiesto + identidad visual multicanal + cobertura del nicho', estrategia: 'Presentar una marca NUEVA al mercado: qué la hace distinta, para quién existe y por qué. Diferente del lanzamiento de producto (vende algo puntual) y del branding continuo (mantiene presencia ya ganada). Se optimiza por recordación de marca, búsquedas del nombre y menciones.' },
  { key: 'referidos', nombre: 'Referidos / Boca a Boca', icono: '🤝', color: '#22c55e', kpi: 'Clientes nuevos referidos y viralidad', audiencia: 'Clientes satisfechos actuales + sus círculos cercanos (amigos, familia)', tono: 'De invitación, con doble beneficio (para quien invita y para quien llega)', formato: 'Programa de referidos con código único + premio por ambos lados + ranking de embajadores', estrategia: 'Convertir clientes felices en vendedores: cada cliente invita a sus contactos con un código y ambos ganan. Es el canal con mejor costo de adquisición y la confianza más alta, porque la recomendación viene de un amigo. Se optimiza por clientes nuevos referidos y tasa de viralidad (K).' },
  { key: 'temporada', nombre: 'Temporada / Eventos', icono: '📅', color: '#0ea5e9', kpi: 'Ventas del período y picos de demanda', audiencia: 'Todo el mercado con intención de compra estacional (regalos, ofertas, fechas clave)', tono: 'De urgencia y fecha límite, adaptado al evento', formato: 'Calendario por evento (Black Friday, Navidad, Día de la Madre, Hot Sale) + creatividades con countdown + ofertas por flash', estrategia: 'Aprovechar los picos de demanda del año: calendario de campañas por fecha clave, preparación de stock y audiencias con anticipación, creatividades con countdown y ofertas por tiempo limitado. Se prepara 3-4 semanas antes y se optimiza por ventas del período.' },
];

export interface Campana { id: string; nombre: string; emoji: string; modulo: ModKey; objetivo: ObjetivoCampana; estado: string; campPct: number; roas: string; presupuesto: string; alcance: string; costo: string; conversiones: string; }
export const CAMPANAS: Campana[] = [
  { id: 'c1', nombre: 'Lanzamiento D2C: Skincare Natural', emoji: '🧴', modulo: 'M4', objetivo: 'ventas', estado: 'Activa', campPct: 72, roas: '3.8x', presupuesto: '$1,200', alcance: '48.5K', costo: '$316', conversiones: '214' },
  { id: 'c2', nombre: 'Retargeting: Carrito Abandonado', emoji: '🛒', modulo: 'M4', objetivo: 'retargeting', estado: 'Activa', campPct: 45, roas: '5.1x', presupuesto: '$600', alcance: '12.2K', costo: '$118', conversiones: '96' },
  { id: 'c3', nombre: 'WhatsApp: Secuencia Bienvenida', emoji: '💬', modulo: 'M5', objetivo: 'mensajes', estado: 'En pausa', campPct: 28, roas: '—', presupuesto: '$300', alcance: '3.4K', costo: '$42', conversiones: '31' },
  { id: 'c4', nombre: 'Lookalike: Audiencia Similar', emoji: '🎯', modulo: 'M3', objetivo: 'seguidores', estado: 'Borrador', campPct: 10, roas: '—', presupuesto: '$900', alcance: '—', costo: '$0', conversiones: '0' },
  { id: 'c5', nombre: 'Marca: Brand Awareness', emoji: '🌟', modulo: 'M2', objetivo: 'marca', estado: 'Finalizada', campPct: 100, roas: '2.4x', presupuesto: '$1,500', alcance: '96K', costo: '$1,436', conversiones: '402' },
  { id: 'c6', nombre: 'Reventa: Cliente VIP Marzo', emoji: '🔄', modulo: 'M6', objetivo: 'reventa', estado: 'Activa', campPct: 34, roas: '6.2x', presupuesto: '$450', alcance: '5.8K', costo: '$86', conversiones: '78' },
  { id: 'c7', nombre: 'Standby: Reactivación Clientes Dormidos', emoji: '⏳', modulo: 'M6', objetivo: 'recuperacion', estado: 'Activa', campPct: 22, roas: '4.9x', presupuesto: '$380', alcance: '9.1K', costo: '$64', conversiones: '52' },
  { id: 'c8', nombre: 'Upsell: Pack Completo post-compra', emoji: '📦', modulo: 'M6', objetivo: 'upsell', estado: 'Activa', campPct: 41, roas: '7.3x', presupuesto: '$260', alcance: '4.2K', costo: '$52', conversiones: '44' },
];

export interface Canal { nombre: string; cuenta: string; icono: string; color: string; conectado: boolean; }
export const CANALES: Canal[] = [
  { nombre: 'WhatsApp', cuenta: '+54 9 11 5555-2341', icono: 'W', color: '#25d366', conectado: true },
  { nombre: 'Instagram', cuenta: '@skincare.natural', icono: 'IG', color: '#e11d48', conectado: true },
  { nombre: 'Meta Ads', cuenta: 'ID 8.442.119', icono: 'M', color: '#a855f7', conectado: true },
  { nombre: 'Email', cuenta: 'hola@skincarenatural.com', icono: 'E', color: '#f59e0b', conectado: false },
  { nombre: 'TikTok', cuenta: '@skincare.natural', icono: 'TT', color: '#6366f1', conectado: false },
];

export interface Plan { nombre: string; precio: string; creditos: string; desc: string; actual?: boolean; }
export const PLANES: Plan[] = [
  { nombre: 'Starter', precio: '$29/mes', creditos: '500/mes', desc: 'Para empezar tu tienda online' },
  { nombre: 'Pro', precio: '$79/mes', creditos: '1,760/mes', desc: 'Crecimiento acelerado con IA', actual: true },
  { nombre: 'Enterprise', precio: 'Custom', creditos: 'Ilimitados', desc: 'Operaciones a escala con soporte dedicado' },
];

export interface Referido { nombre: string; estado: string; nivel: number; }
export const REFERIDOS = {
  raiz: { nombre: 'Tú', estado: 'Plan Pro', nivel: 0 },
  hijos: [
    { nombre: 'Valeria Gómez', estado: 'Pagado · $79', nivel: 1, hijos: [
      { nombre: 'Martín Ruiz', estado: 'Pagado · $29', nivel: 2 },
      { nombre: 'Sofía Pérez', estado: 'Pendiente', nivel: 2 },
    ]},
    { nombre: 'Julián Díaz', estado: 'Pagado · $29', nivel: 1 },
    { nombre: 'Camila Torres', estado: 'Invitación enviada', nivel: 1 },
  ],
};

export interface CreditRow { detalle: string; fecha: string; cantidad: number; tipo: 'entrada'|'salida'; }
export const CREDITOS: CreditRow[] = [
  { detalle: 'Recarga de plan Pro', fecha: '12 Sep 2026', cantidad: 1760, tipo: 'entrada' },
  { detalle: 'Campaña: Lanzamiento D2C', fecha: '14 Sep 2026', cantidad: -120, tipo: 'salida' },
  { detalle: 'Análisis IA: Competencia', fecha: '16 Sep 2026', cantidad: -40, tipo: 'salida' },
  { detalle: 'Referidos: Valeria Gómez', fecha: '18 Sep 2026', cantidad: 250, tipo: 'entrada' },
  { detalle: 'Campaña: Retargeting', fecha: '20 Sep 2026', cantidad: -60, tipo: 'salida' },
];

export interface Notif { icono: string; txt: string; time: string; hot?: boolean; }
export const NOTIFICACIONES: Notif[] = [
  { icono: '📈', txt: 'Tu campaña "Lanzamiento D2C" alcanzó ROAS 3.8x', time: 'hace 2 h', hot: true },
  { icono: '🤖', txt: 'La IA detectó 3 oportunidades de mejora', time: 'hace 5 h' },
  { icono: '👥', txt: 'Valeria Gómez aceptó tu referido (+250 créditos)', time: 'hace 1 día' },
  { icono: '⚠️', txt: 'Campaña WhatsApp en pausa. Revisá los créditos', time: 'hace 2 días' },
];

export type ViewKey = 'dashboard'|'mercado'|'estrategia'|'herramientas'|'campanas'|'whatsapp'|'creatividades'|'referidos'|'creditos'|'kyc'|'config'|'predictiva';
export const VISTA_TITULOS: Record<ViewKey, string> = {
  dashboard: 'Dashboard', mercado: 'Mercado', estrategia: 'Estrategia', herramientas: 'Herramientas',
  campanas: 'Campañas', whatsapp: 'WhatsApp', creatividades: 'Creatividades', referidos: 'Referidos', creditos: 'Créditos', kyc: 'Verificación KYC', config: 'Configuración', predictiva: 'Inteligencia Predictiva',
};

export const CREDITOS_RESTANTES = 1760;
export const PLAN_ACTUAL = 'Plan Pro';

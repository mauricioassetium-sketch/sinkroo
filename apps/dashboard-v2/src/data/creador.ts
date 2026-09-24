// =============================================================================================
// SINKROO CREADORES — la otra piel del mismo motor (modelo de producto v2.0)
//
// La decisión central del documento: NO es otro producto. Es el motor que ya corre en Negocios
// (los 6 agentes, el dial de autonomía por acción, los guardrails, el panel de 5, el sistema de
// créditos y las vistas del Centro de Mando) configurado para otra persona: un creador, no una
// empresa. Los agentes conservan nombre, color y rol técnico: lo único que cambia es QUÉ miran y
// QUÉ producen, y eso sale de la Ficha del creador.
//
// Por eso este archivo es DATOS y no código nuevo: la piel se cambia acá, no en los componentes.
// =============================================================================================

export type Piel = 'empresa' | 'creador';
export type Carril = 'audiencia' | 'trabajo';

// ---------------------------------------------------------------------------------------------
// 1 · LOS PERFILES DE CREADOR (matriz §1 · §4.7)
// Una sola pregunta decide todo: ¿ganás por tu audiencia o por tu trabajo?
// ---------------------------------------------------------------------------------------------

export const PERFILES_CREADOR: {
  key: string; nombre: string; gana: string; activo: string; rolSinkroo: string; monetiza: string;
  carril: Carril; senales: string[];
}[] = [
  { key: 'contenido', nombre: 'Creador de contenido', carril: 'audiencia', gana: 'Motivación', activo: 'Constancia y voz',
    rolSinkroo: 'Acompañante de ideas', monetiza: 'Todavía no',
    senales: ['“Publico pero todavía no facturo”'] },
  { key: 'influencer', nombre: 'Influencer', carril: 'audiencia', gana: 'Audiencia', activo: 'Seguidores + alcance',
    rolSinkroo: 'Director de contenido', monetiza: 'Marcas, afiliados, propios',
    senales: ['“+10k, colaboro con marcas por alcance”'] },
  { key: 'ugc', nombre: 'Creador UGC', carril: 'trabajo', gana: 'Trabajo', activo: 'Habilidad de producción',
    rolSinkroo: 'Manager comercial', monetiza: 'Marcas que pagan por entregable',
    senales: ['“Grabo para marcas”, factura por piezas, no menciona seguidores'] },
  { key: 'especialista', nombre: 'Especialista de marca personal', carril: 'trabajo', gana: 'Trabajo (servicios)', activo: 'Autoridad',
    rolSinkroo: 'Director con embudo', monetiza: 'Clientes de SU servicio',
    senales: ['“Ofrezco servicios” (foto, diseño, oficio)'] },
  { key: 'local', nombre: 'Creador local / de nicho', carril: 'audiencia', gana: 'Audiencia que compra', activo: 'Comunidad hiperlocal',
    rolSinkroo: 'Puente con comercio local', monetiza: 'Negocios de su ciudad',
    senales: ['“1–10k, negocio local”'] },
];

/** La Ficha del creador: la cuenta del motor, extendida. Alimenta todo lo que los agentes producen. */
export const FICHA_CREADOR = {
  nombre: 'Camila Ferreyra',
  usuario: '@cami.ferreyra',
  perfil: 'Creador UGC',
  carril: 'trabajo' as Carril,
  carrilLinea: 'Tu equipo encuentra las marcas, vos solo grabás.',
  nicho: 'UGC de belleza y skincare',
  pais: 'Argentina',
  idioma: 'Español',
  registro: 'Voseo',
  tono: 'Cercano y directo',
  tabues: 'No muestra su casa, no habla de política, no promete resultados médicos.',
  tiempoSemana: 'Unas 6 horas por semana',
  equipamiento: 'Celular (iPhone 13) + aro de luz',
  redes: ['Instagram', 'TikTok'],
  seguidores: '9.400 en Instagram · 4.100 en TikTok',
  interaccion: '6,2%',
  formatoDominante: 'Video corto vertical, cara a cámara',
  lecturaDelPerfil: 'El perfil real coincide con lo declarado: graba para marcas y factura por pieza.',
  portafolio: '3 piezas de skincare + 2 de bienestar, con permiso de uso en redes de la marca',
  marcasTrabajadas: ['Skincare Natural', 'Bienestar Sur', 'Verde Vivo'],
  tiempoRespuesta: 'Contesta en menos de 24 h: es lo primero que mira una marca.',
};

// ---------------------------------------------------------------------------------------------
// 2 · LOS 6 AGENTES, CALIBRADOS (mismo nombre, mismo color, otro QUÉ) — §6
// ---------------------------------------------------------------------------------------------

export const AGENTES_CREADOR: {
  id: string; nombre: string; color: string; tecnico: string; enNegocios: string; enCreadores: string;
}[] = [
  { id: 'lux', nombre: 'Lux', color: '#a855f7', tecnico: 'market-analyst',
    enNegocios: 'Lee los anuncios de tu competencia y vigila precios.',
    enCreadores: 'Vigía del nicho: qué trendea, qué formatos copan el feed, qué marcas buscan UGC y a cuánto se paga cada pieza.' },
  { id: 'rex', nombre: 'Rex', color: '#6366f1', tecnico: 'marketing-strategist',
    enNegocios: 'Define el ángulo, la audiencia y el plan del mes.',
    enCreadores: 'Estratega del perfil: tu posicionamiento, hacia dónde crecer y el plan de contenido del mes.' },
  { id: 'nia', nombre: 'Nia', color: '#ec4899', tecnico: 'creative-strategist',
    enNegocios: 'Escribe textos y arma imágenes y prompts de video.',
    enCreadores: 'Creativo: guiones, hooks, captions y las piezas generadas en el Generador.' },
  { id: 'kai', nombre: 'Kai', color: '#22c55e', tecnico: 'media-buyer',
    enNegocios: 'Maneja el presupuesto, las plataformas y las pujas.',
    enCreadores: 'Guardián del presupuesto: tus créditos de generación (y tu pauta, si invertís). Optimiza dónde gastar y qué rinde.' },
  { id: 'sol', nombre: 'Sol', color: '#f59e0b', tecnico: 'performance-analyst',
    enNegocios: 'Mide resultados y calibra el modelo de predicción.',
    enCreadores: 'Analista: qué pieza funcionó, qué ángulo trajo deals, el resumen del viernes y la calibración de tus predicciones.' },
  { id: 'rumi', nombre: 'Rumi', color: '#8b5cf6', tecnico: 'sales-closer',
    enNegocios: 'Atiende y cierra conversaciones con clientes.',
    enCreadores: 'Closer de marcas: contesta los DMs de marcas y seguidores, propone respuestas, arma deals y escala cuando la marca pide hablar con vos.' },
];

// ---------------------------------------------------------------------------------------------
// 3 · LAS VISTAS, RE-ETIQUETADAS — §12
// El Centro de Mando es el mismo; cambia el idioma. El canal de aviso (Telegram/WhatsApp) es la
// puerta por la que el creador aprueba sin entrar al panel.
// ---------------------------------------------------------------------------------------------

export const VISTAS_CREADOR: Record<string, { nombre: string; sub: string }> = {
  hoy: { nombre: 'Hoy', sub: 'Lo que tu equipo hizo mientras no estabas' },
  campanas: { nombre: 'Contenido', sub: 'Series activas, piezas del mes y estado de cada una' },
  conversaciones: { nombre: 'Mensajes', sub: 'DMs de marcas y seguidores, con Rumi proponiendo respuestas' },
  mercado: { nombre: 'Nicho', sub: 'Qué trendea, qué formato copa el feed y qué marcas buscan UGC' },
  creditos: { nombre: 'Créditos', sub: 'Saldo, grilla de generación, días de autonomía y auto-recarga' },
  referidos: { nombre: 'Referidos', sub: 'Traé otros creadores y el equipo te devuelve créditos' },
  cuenta: { nombre: 'Cuenta y autonomía', sub: 'El dial por acción, los guardrails y tu Ficha de creador' },
  kyc: { nombre: 'Verificación', sub: 'Obligatoria antes de publicar y de cerrar deals' },
  onboarding: { nombre: 'Primeros pasos', sub: 'Lo que tu equipo necesita saber de vos' },
};

/** El canal de aviso: el creador vive en el chat, el panel es para ver el detalle. */
export const CANAL_AVISO = {
  titulo: 'Las decisiones llegan por WhatsApp o Telegram',
  texto: 'No hace falta que entres al panel para aprobar: la propuesta llega al chat con sus botones y respondés ahí. El panel es para ver el detalle cuando querés.',
};

// ---------------------------------------------------------------------------------------------
// 4 · AUTONOMÍA, ACCIÓN POR ACCIÓN — §7 (el dial que ya existe, recalibrado)
// ---------------------------------------------------------------------------------------------

export const AUTONOMIA_CREADOR: { accion: string; nivel: 'auto' | 'shared' | 'manual'; nota: string }[] = [
  { accion: 'Vigilancia del nicho y análisis', nivel: 'auto',
    nota: 'Revisa tu nicho, tus métricas y tus conversaciones cada 15 minutos. No tiene costo y no se puede bajar.' },
  { accion: 'Crear piezas y borradores', nivel: 'auto',
    nota: 'Los borradores no publican nada: los revisás antes de que salgan.' },
  { accion: 'Responder DMs de marcas y seguidores', nivel: 'shared',
    nota: 'Rumi propone la respuesta y vos la mandás. Escala solo si la marca pide hablar con una persona o si hay un deal en juego.' },
  { accion: 'Publicar en tus redes', nivel: 'shared', nota: 'Todo post pasa por tu OK antes de salir.' },
  { accion: 'Frenar algo que se quema', nivel: 'auto',
    nota: 'Frena primero y pregunta después: pausa una serie que no rinde o corta un pitch que no contesta. Reversible 24 h.' },
  { accion: 'Cambiar el presupuesto de créditos o de pauta', nivel: 'shared',
    nota: 'Los ajustes chicos van solos; los que pasan el 20% te esperan.' },
  { accion: 'Enviar rates, links de cobro o cerrar precios', nivel: 'manual',
    nota: 'Ningún cobro sale sin que lo mandes vos.' },
];

// ---------------------------------------------------------------------------------------------
// 5 · GUARDRAILS DEL CREADOR — §8 (los mismos del motor, con sus valores)
// ---------------------------------------------------------------------------------------------

export const GUARDRAILS_CREADOR: { nombre: string; valor: string; porQue: string }[] = [
  { nombre: 'Techo de gasto diario', valor: '300 créditos por día (≈ $3 de generación)', porQue: 'Una idea loca del equipo no se quema los créditos de tu semana.' },
  { nombre: 'Techo mensual', valor: 'El del plan: 1.500 o 4.000', porQue: 'Tope absoluto del mes.' },
  { nombre: 'Cambio máximo de presupuesto', valor: '±20% por acción', porQue: 'Que un ajuste no pase de 0 a 10x de una sola vez.' },
  { nombre: 'Máximo de acciones por hora', valor: '10', porQue: 'Evita bucles del equipo corrigiéndose solo.' },
  { nombre: 'Publicar requiere verificación', valor: 'KYC obligatorio', porQue: 'Riesgo legal: no se publica ni se pacta a nombre de alguien sin verificar.' },
  { nombre: 'No molestar a marcas', valor: 'De 22:00 a 08:00', porQue: 'Que una marca no reciba un pitch a las 3 de la mañana.' },
  { nombre: 'Deals o cobros de más de $200', valor: 'Piden tu OK', porQue: 'Un error de un dígito no se convierte en un cobro.' },
];

// ---------------------------------------------------------------------------------------------
// 6 · PIEZAS Y OBJETIVOS, EN IDIOMA DE CREADOR — §10
// ---------------------------------------------------------------------------------------------

export const PIEZAS_CREADOR: {
  key: string; nombre: string; para: string; carril?: Carril; creditos: string; icono: string;
}[] = [
  { key: 'post', nombre: 'Post del creador', para: 'El carril audiencia: una pieza para tu feed, con tu voz.', carril: 'audiencia', creditos: 'Con imagen generada: sí', icono: '📸' },
  { key: 'historias', nombre: 'Secuencia de historias', para: 'Dos o tres historias que cuentan algo, no una sola suelta.', carril: 'audiencia', creditos: 'Solo si genera', icono: '📱' },
  { key: 'pauta', nombre: 'Pauta del creador', para: 'Solo si invertís: mismo flujo que una campaña, con presupuesto real.', carril: 'audiencia', creditos: 'La pauta va aparte de los créditos', icono: '🎬' },
  { key: 'pitch', nombre: 'Pitch a marca', para: 'El mensaje que abre la puerta: portafolio, idea y precio en uno.', carril: 'trabajo', creditos: 'No gasta créditos', icono: '💬' },
  { key: 'entregable', nombre: 'Entregable UGC', para: 'El video o la imagen que le entregás a la marca, con sus indicaciones.', carril: 'trabajo', creditos: 'Sí: grilla de generación', icono: '➕' },
  { key: 'remaster', nombre: 'Remaster 4K', para: 'Tu pieza subida, mejorada: encuadre, color y sonido.', carril: 'trabajo', creditos: '1 crédito', icono: '✨' },
];

export const OBJETIVOS_CREADOR: { nombre: string; icono: string; para: string; kpi: string }[] = [
  { nombre: 'Deals con marcas', icono: '🧲', para: 'Conseguir marcas que te compren una pieza.', kpi: 'Marcas que responden y deals por mes' },
  { nombre: 'Lanzamiento propio', icono: '🚀', para: 'Producto, serie o canal propio.', kpi: 'Buzz y ventas del día 1' },
  { nombre: 'Colaboraciones', icono: '🤝', para: 'Duos y menciones con otros creadores.', kpi: 'Collabs cerradas' },
  { nombre: 'Fechas del nicho', icono: '📅', para: 'Navidad, día del especialista, temporada.', kpi: 'Ventas del período' },
  { nombre: 'Tráfico al link', icono: '🌐', para: 'Tu Linktree, tu tienda o tu canal.', kpi: 'Clicks y costo por clic' },
  { nombre: 'Comunidad', icono: '❤️', para: 'Crecer la audiencia que te sigue.', kpi: 'Seguidores y tasa de interacción' },
];

// ---------------------------------------------------------------------------------------------
// 7 · CRÉDITOS: LA GRILLA DEL 40% Y LOS PLANES DE CREADOR — §11
// 1 crédito = $0,01 · margen del 40%. La pieza rechazada por el panel NO se cobra: la paga el sistema.
// ---------------------------------------------------------------------------------------------

export const GRILLA_CREDITOS: { pieza: string; creditos: number }[] = [
  { pieza: 'Texto (hook, caption, guion)', creditos: 1 },
  { pieza: 'Imagen simple', creditos: 1 },
  { pieza: 'Foto UGC (producto en mano)', creditos: 5 },
  { pieza: 'Imagen hero (portada o feed)', creditos: 7 },
  { pieza: 'Imagen con texto montado', creditos: 15 },
  { pieza: 'Video 5 s estándar', creditos: 75 },
  { pieza: 'Video 5 s premium', creditos: 208 },
  { pieza: 'Remaster 4K de tu pieza', creditos: 1 },
  { pieza: 'Ultra (lo paga Sinkroo)', creditos: 275 },
];

export const PLANES_CREADOR: {
  key: string; nombre: string; precio: number; creditosMes: number; habilita: string; paraQuien: string;
  incluye: string[]; destacado?: boolean;
}[] = [
  { key: 'bienvenida', nombre: 'Bienvenida', precio: 0, creditosMes: 100,
    habilita: '100 créditos una vez, para probar el equipo',
    paraQuien: 'Recién llegás y querés ver qué hace el equipo con tu contenido.',
    incluye: ['100 créditos de regalo, una sola vez', 'La primera propuesta del equipo', 'El resumen del viernes'] },
  { key: 'creador', nombre: 'Creador', precio: 29, creditosMes: 1500,
    habilita: 'Los 6 agentes, la vigilancia cada 15 minutos y 3 redes o pipeline',
    paraQuien: 'Ya publicás y querés que el equipo te lleve el ritmo.',
    incluye: ['1.500 créditos por mes', 'Los 6 agentes calibrados a tu nicho', 'Vigilancia cada 15 minutos', 'Hasta 3 redes o pipeline de marcas', 'Lunes propuesta y viernes resumen'] },
  { key: 'pro', nombre: 'Pro', precio: 59, creditosMes: 4000,
    habilita: '+ Cazador activo: pitch a marcas, deals y el panel en cada propuesta',
    paraQuien: 'Vivís de esto: querés que el equipo salga a buscar marcas por vos.',
    incluye: ['4.000 créditos por mes', 'Pitch a marcas y seguimiento del pipeline', 'El panel de 5 en cada propuesta', 'Remaster 4K de tus piezas', 'Prioridad en la cola de generación'],
    destacado: true },
  { key: 'topup', nombre: 'Top-up', precio: 10, creditosMes: 1000,
    habilita: 'Pack extra de 1.000 créditos, no caduca',
    paraQuien: 'Se te acabaron los créditos del mes y no querés cambiar de plan.',
    incluye: ['1.000 créditos extra', 'No caducan', 'Se compran cuando querés'] },
];

// ---------------------------------------------------------------------------------------------
// 8 · EL CARRL DE TRABAJO: OPORTUNIDADES, PIPELINE Y PRECIOS — §5 y §17
// La estructura del pipeline es la misma que las campañas de Negocios, con las etapas de un deal.
// ---------------------------------------------------------------------------------------------

export const ETAPAS_PIPELINE = ['Marca', 'Pitch', 'Respuesta', 'Negociación', 'Deal', 'Entrega', 'Cobro'] as const;

export const OPORTUNIDADES: {
  marca: string; rubro: string; queBusca: string; paga: string; encaje: string; etapa: string; nota?: string;
}[] = [
  { marca: 'Skincare Natural', rubro: 'Skincare', queBusca: 'Reel de 30 s mostrando el serum en uso',
    paga: '$150 por pieza', encaje: 'Tu nicho exacto: ya grabaste para ellos y les rindió.', etapa: 'Deal',
    nota: 'Entrega el viernes: es la que ya está cerrada.' },
  { marca: 'Bienestar Sur', rubro: 'Bienestar', queBusca: '3 piezas para su lanzamiento de octubre',
    paga: '$420 por las tres', encaje: 'Ya les entregaste una y pidieron presupuesto de nuevo.', etapa: 'Negociación',
    nota: 'La marca pidió hablar con vos: Rumi escaló la conversación.' },
  { marca: 'Verde Vivo', rubro: 'Cosmética natural', queBusca: 'UGC para probar en pauta',
    paga: '$180 por pieza + $60 si la usan en anuncios', encaje: 'Pagan el uso en pauta aparte: conviene decir el precio de eso.', etapa: 'Respuesta' },
  { marca: 'Farmacia del Barrio', rubro: 'Farmacia', queBusca: 'Contenido para sus redes locales',
    paga: '$90 por pieza', encaje: 'Sirve para el hueco entre deals grandes: es una entrega corta.', etapa: 'Pitch' },
  { marca: 'DermaMarket', rubro: 'Dermocosmética', queBusca: 'Creadores de belleza para su catálogo',
    paga: '$220 por pieza', encaje: 'Competidor directo de tu mejor cliente: ojo con el uso en pauta.', etapa: 'Pitch' },
];

export const RATES = [
  { pieza: 'Video corto (15–30 s)', precio: '$150', nota: 'El más pedido: guion, grabación y edición simple.' },
  { pieza: 'Pack de 3 piezas', precio: '$420', nota: 'Con 10% de descuento por volumen.' },
  { pieza: 'Uso en pauta', precio: '+$60', nota: 'La marca paga para mostrarla a gente que no te conoce. Se cobra aparte del precio por pieza.' },
  { pieza: 'Historias (2–3)', precio: '$80', nota: 'Con sticker y link si la marca lo pide.' },
  { pieza: 'Foto de producto', precio: '$60', nota: 'Fondo limpio y luz natural.' },
];

// ---------------------------------------------------------------------------------------------
// 9 · EL NICHO (lo que mira Lux) Y LAS CONVERSACIONES (lo que contesta Rumi)
// ---------------------------------------------------------------------------------------------

export const NICHO = {
  trends: [
    { t: 'Antes y después con piel real', num: '+41%', lectura: 'Es el formato que más crece en tu nicho y el que mejor retiene. Conviene grabar 2 esta semana.' },
    { t: '“Lo probé 30 días”', num: '+26%', lectura: 'A las marcas les sirve para pauta: dice más que una reseña suelta.' },
    { t: 'Rutina de noche en 30 s', num: '+18%', lectura: 'Funciona con tu audiencia actual: es tu formato dominante.' },
    { t: 'Unboxing sin hablar', num: '-9%', lectura: 'Bajó: ahora piden voz y cara. No conviene gastar créditos ahí.' },
  ],
  marcasBuscando: [
    { marca: 'Skincare Natural', busca: 'Reel de 30 s', paga: '$150', encaje: 'Alto' },
    { marca: 'DermaMarket', busca: '2 piezas para catálogo', paga: '$220', encaje: 'Medio' },
    { marca: 'Verde Vivo', busca: 'UGC para pauta', paga: '$180 + $60', encaje: 'Alto' },
    { marca: 'Bienestar Sur', busca: '3 piezas de lanzamiento', paga: '$420', encaje: 'Alto' },
  ],
  precioPorPieza: [
    { nivel: 'Creador que arranca', rango: '$50 – $90', nota: 'Sin portafolio armado ni métricas para mostrar.' },
    { nivel: 'Tu nivel (nicho definido)', rango: '$120 – $220', nota: 'Con 3 piezas de muestra y una marca que repite: es donde estás.' },
    { nivel: 'Con uso en pauta', rango: '$250 – $400', nota: 'La marca paga el uso en anuncios: se cobra aparte y vale más que la pieza.' },
  ],
  formatosDelFeed: [
    { f: 'Video vertical con cara a cámara', pct: 62 },
    { f: 'Antes y después', pct: 21 },
    { f: 'Texto sobre pantalla', pct: 12 },
    { f: 'Producto solo, sin cara', pct: 5 },
  ],
};

export const MENSAJES_CREADOR: {
  de: string; tipo: 'marca' | 'seguidor'; texto: string; propuesta?: string; estado: string;
}[] = [
  { de: 'Skincare Natural', tipo: 'marca', texto: 'Hola Cami! ¿Podés entregar el reel el viernes? Lo necesitamos para el lanzamiento.',
    propuesta: 'Sí, el viernes lo tenés. Te paso el guion hoy para que lo apruebes antes de grabar.',
    estado: 'Espera tu OK' },
  { de: 'Bienestar Sur', tipo: 'marca', texto: 'Nos gustó mucho la primera pieza. ¿Cuánto saldría el pack de tres con uso en pauta?',
    propuesta: 'El pack de tres son $420 y el uso en pauta suma $60. Si cerramos esta semana, entrego el primero el martes.',
    estado: 'Espera tu OK' },
  { de: 'Valeria G.', tipo: 'seguidor', texto: '¿Qué serum usás para las rojeces? Tengo la piel súper sensible.',
    propuesta: 'Para rojeces, niacinamida de noche y protector todos los días. El serum que te muestro es de Skincare Natural: te dejo el código.',
    estado: 'Rumi contestó sola' },
  { de: 'DermaMarket', tipo: 'marca', texto: 'Estamos armando catálogo con creadores de belleza. ¿Tenés media kit con métricas?',
    propuesta: 'Te paso el media kit: 9.400 en Instagram con 6,2% de interacción, formato vertical con cara a cámara, y dos piezas de muestra.',
    estado: 'Espera tu OK' },
];

// ---------------------------------------------------------------------------------------------
// 10 · EL RITMO Y LAS FUNCIONES TRANSVERSALES — §13
// ---------------------------------------------------------------------------------------------

export const RITMO_SEMANA = {
  latidoMotor: 'Cada 15 minutos: vigila tu nicho, tus métricas y tus conversaciones.',
  lunes: { trabajo: 'Pitches nuevos y entregas de la semana: 3 marcas para contactar y 1 entrega agendada.', audiencia: 'La semana de contenido: 3 posts, 1 secuencia de historias y 2 ideas de reel con sus hooks puntuados.' },
  viernes: { trabajo: 'El pipeline: qué marcas respondieron, qué deals se cerraron y qué plata está en camino.', audiencia: 'Qué funcionó, qué hook ganó y qué conviene cambiar la semana que viene.' },
};

export const TRANSVERSALES: { icono: string; nombre: string; que: string }[] = [
  { icono: '🎙', nombre: 'Modo nota de voz', que: 'Mandás un audio de 2 o 3 minutos y el equipo devuelve ideas armadas, un guion o un post que trae consultas.' },
  { icono: '🎬', nombre: 'De un video sale todo', que: 'Subís un video largo y el equipo detecta los cortes: arma clips con caption para tu audiencia o versiones para el portafolio.' },
  { icono: '📋', nombre: 'Brief a guion', que: 'Una foto del brief o del producto de la marca y salen el guion, la lista de tomas y 3 hooks en minutos.' },
  { icono: '⏰', nombre: 'Aprobaciones con vencimiento', que: 'Si no respondés cerca del horario ideal, se reprograma y te avisa. Nunca presiona y nunca ejecuta sin tu sí.' },
];

/** Los dos carriles, en una línea: es la bifurcación que el equipo usa para todo. */
export const CARRILES: Record<Carril, { nombre: string; promesa: string; queHace: string; kpi: string[] }> = {
  audiencia: {
    nombre: 'Carril audiencia',
    promesa: 'Tu equipo te trae la semana armada: vos aprobás.',
    queHace: 'Estrategia de crecimiento, el calendario del mes, los hooks y las piezas que el panel puntúa antes de que las publiques.',
    kpi: ['Seguidores', 'Tasa de interacción', 'Alcance por pieza'],
  },
  trabajo: {
    nombre: 'Carril trabajo',
    promesa: 'Tu equipo encuentra las marcas, vos solo grabás.',
    queHace: 'Busca marcas del nicho, arma el pitch con tu portafolio, sigue el pipeline y prepara el entregable con las indicaciones de la marca.',
    kpi: ['Pitches por semana', 'Tasa de respuesta', 'Deals por mes', 'Ticket promedio'],
  },
};

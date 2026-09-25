// =============================================================================================
// Sinkroo v2 — datos de demo
//
// Este archivo implementa los documentos 03 (Motor a la Vista) y 04 (Autonomía y Centro de Mando).
// REGLA: nada que no se pueda trazar a un evento real se muestra como si fuera real.
// Toda entrada de trabajo declara su fuente (`source`): 'live' | 'demo' | 'simulated'.
// =============================================================================================

export type Source = 'live' | 'demo' | 'simulated';
export type Modo = 'auto' | 'shared' | 'manual';

export const TENANT = {
  cuenta: 'Skincare Natural',
  usuario: 'María Paula',
  plan: 'Pro',
  creditos: 1760,
  creditosMes: 5000,
  diasAutonomia: 12,
  modoActual: 'shared' as Modo,
};

// ---------------------------------------------------------------------------------------------
// LOS PLANES — lo que se contrata por mes. Cada uno dice para quién es y qué incluye, para que
// cambiar de plan sea una decisión y no una apuesta. El «Pro» es el que la cuenta tiene hoy
// (TENANT.plan): si el usuario cambia, la pantalla y el menú lo reflejan al instante.
// ---------------------------------------------------------------------------------------------
export const PLANES: {
  key: string; nombre: string; precio: number; creditosMes: number; paraQuien: string;
  incluye: string[]; falta?: string[];
}[] = [
  {
    key: 'base', nombre: 'Base', precio: 39, creditosMes: 2000,
    paraQuien: 'Una marca y una campaña a la vez.',
    incluye: [
      '2.000 créditos por mes',
      'Campañas y piezas con el veredicto del panel',
      'La investigación del mercado, una vez por semana',
      'Las automatizaciones: carrito, recompra y pedido de reseñas',
    ],
    falta: [
      'El equipo investigando todos los días',
      'Videos generados por el motor',
      'Más de una campaña corriendo a la vez',
    ],
  },
  {
    key: 'pro', nombre: 'Pro', precio: 79, creditosMes: 5000,
    paraQuien: 'Es el que tiene: varias campañas a la vez.',
    incluye: [
      '5.000 créditos por mes',
      'Varias campañas corriendo a la vez',
      'El equipo investigando su mercado todos los días',
      'Videos generados por el motor',
      'Automatizaciones y mercado completos',
    ],
    falta: ['Varias marcas en la misma cuenta'],
  },
  {
    key: 'estudio', nombre: 'Estudio', precio: 149, creditosMes: 12000,
    paraQuien: 'Varias marcas o un catálogo grande.',
    incluye: [
      '12.000 créditos por mes',
      'Hasta 5 marcas en la misma cuenta',
      'Videos y piezas sin tope diario',
      'Prioridad en la cola del motor',
      'Un informe de mercado por semana',
    ],
  },
];

// ---------------------------------------------------------------------------------------------
// EL DIAL — modos, excepciones y frenos
// ---------------------------------------------------------------------------------------------

export const MODOS: { key: Modo; nombre: string; desc: string; vidrio: string }[] = [
  { key: 'auto', nombre: 'Automático', desc: 'Decide y ejecuta. Le cuenta después, en la bitácora.', vidrio: 'hace 12 min: hizo X → ver' },
  { key: 'shared', nombre: 'Compartido', desc: 'Decide y le pide OK antes de hacer.', vidrio: 'espera su OK: quiere X → aprobar' },
  { key: 'manual', nombre: 'Manual', desc: 'Le sugiere y usted decide y ejecuta.', vidrio: 'sugiere X · 3 sugerencias sin usar' },
];

export interface Excepcion {
  key: string;
  etiqueta: string;
  nivel: Modo;
  fijo?: boolean;
  nota: string;
}

export const EXCEPCIONES: Excepcion[] = [
  { key: 'vigilancia', etiqueta: 'Vigilancia y análisis', nivel: 'auto', fijo: true,
    nota: 'Revisa sus campañas, métricas y conversaciones cada 15 minutos. No tiene costo y no se puede bajar.' },
  { key: 'crear', etiqueta: 'Escribir copys e imágenes', nivel: 'auto',
    nota: 'Los borradores no publican nada. Revise antes de que salga.' },
  { key: 'responder', etiqueta: 'Responder a clientes', nivel: 'shared',
    nota: 'Rumi propone la respuesta; usted la manda. Escala solo si el cliente se enoja o pide cancelar.' },
  { key: 'publicar', etiqueta: 'Publicar y gastar presupuesto', nivel: 'shared',
    nota: 'Toda campaña pasa por su OK antes de gastar un peso.' },
  { key: 'pausar', etiqueta: 'Pausar una campaña que se quema', nivel: 'auto',
    nota: 'Frena primero, pregunta después. Que no pueda parar mientras usted duerme cuesta más que frenar de más. Reversible 24 h.' },
  { key: 'presupuesto', etiqueta: 'Cambiar presupuesto más del 20%', nivel: 'shared',
    nota: 'Ajustes chicos van solos. Los grandes le esperan.' },
  { key: 'pagos', etiqueta: 'Enviar links de pago', nivel: 'manual',
    nota: 'Ningún cobro sale sin que usted lo envíe.' },
];

export interface Freno {
  key: string;
  etiqueta: string;
  valor: string;
  porQue: string;
}

export const FRENOS: Freno[] = [
  { key: 'gasto_dia', etiqueta: 'Techo de gasto diario', valor: '$120 / día',
    porQue: 'Una campaña no puede desbocarse de madrugada.' },
  { key: 'gasto_mes', etiqueta: 'Techo de gasto mensual', valor: '$2.400 / mes',
    porQue: 'Tope absoluto del mes, sumando todas las campañas.' },
  { key: 'delta_presu', etiqueta: 'Cambio máximo de presupuesto', valor: '±20% por acción',
    porQue: 'Que un ajuste no pase de 0 a 10x de una sola vez.' },
  { key: 'frecuencia', etiqueta: 'Máximo de acciones por hora', valor: '10',
    porQue: 'Evita bucles de la IA corrigiéndose a sí misma sin parar.' },
  { key: 'kyc', etiqueta: 'Publicar requiere KYC', valor: 'Obligatorio',
    porQue: 'Riesgo legal: no se publica a nombre de alguien sin verificar.' },
  { key: 'ventana', etiqueta: 'No molestar clientes', valor: '22:00 a 08:00',
    porQue: 'Que un cliente no reciba un WhatsApp a las 3 de la mañana.' },
  { key: 'pagos_max', etiqueta: 'Pagos sobre este monto piden OK', valor: '$200',
    porQue: 'Un error de un dígito no se convierte en un cobro.' },
];

// ---------------------------------------------------------------------------------------------
// EL MOTOR — los 6 agentes, con las tres anclas (algo suyo + resultado + tiempo)
// ---------------------------------------------------------------------------------------------

export interface Agente {
  id: string;
  nombre: string;
  rol: string;
  /** La función del agente en lenguaje llano: qué hace por el negocio, sin jerga. */
  funcion: string;
  tecnico: string;
  color: string;
  estado: 'trabajando' | 'esperando_ok' | 'al_dia';
  /** 1) algo suyo + 2) el resultado + 3) el tiempo */
  accion: string;
  ancla: string;
  resultado: string;
  artefacto: string;
  /** El nombre del artefacto que dejó: es lo que se lee en el botón que lo abre. */
  artefactoNombre: string;
  cuando: string;
  autonomia: Modo;
  /**
   * La tarea que tiene entre manos, con su avance: es lo que hace que la tarjeta del agente
   * muestre una barra que se mueve sola mientras el panel está abierto ('47 de 50 anuncios').
   * `hecho` es el punto de partida y `total` el techo de la vuelta.
   */
  tarea: { etiqueta: string; hecho: number; total: number };
}

export const AGENTES: Agente[] = [
  {
    id: 'lux', nombre: 'Lux', rol: 'Analista de Mercado', tecnico: 'market-analyst', color: '#a855f7',
    funcion: 'Lee los anuncios de su competencia, la demanda, los precios y su zona.',
    estado: 'trabajando', autonomia: 'auto',
    accion: 'Leyó 47 anuncios de 6 competidores de su zona',
    ancla: 'Mercado · skincare Medellín',
    resultado: 'Tienda Norte bajó precios 15% y duplicó su gasto en video corto',
    artefacto: 'Ver el informe',
    artefactoNombre: 'Informe de competencia · 47 anuncios',
    cuando: 'hace 12 min',
    tarea: { etiqueta: 'anuncios leídos', hecho: 47, total: 50 },
  },
  {
    id: 'rex', nombre: 'Rex', rol: 'Estratega de Marketing', tecnico: 'marketing-strategist', color: '#9333ea',
    funcion: 'Define el ángulo, la audiencia y el plan del mes.',
    estado: 'trabajando', autonomia: 'auto',
    accion: 'Reasignó $40/día de TikTok a Meta',
    ancla: 'Campaña · Lanzamiento D2C',
    resultado: 'TikTok daba $4,20 de CPC contra $2,10 de Meta con la misma audiencia',
    artefacto: 'Ver por qué',
    artefactoNombre: 'Plan del mes',
    cuando: 'hace 2 h',
    tarea: { etiqueta: 'días del plan con campaña', hecho: 4, total: 7 },
  },
  {
    id: 'nia', nombre: 'Nia', rol: 'Creativa de Anuncios', tecnico: 'creative-strategist', color: '#ec4899',
    funcion: 'Escribe los textos, arma las imágenes y los prompts de video.',
    estado: 'trabajando', autonomia: 'auto',
    accion: 'Escribió 6 variantes nuevas',
    ancla: 'Producto · Serum Vitamina C',
    resultado: 'Apoyadas en el ángulo "resultado", que el panel puntuó 12% mejor que "precio"',
    artefacto: 'Leer las 6',
    artefactoNombre: '6 variantes del aviso',
    cuando: 'hace 40 min',
    tarea: { etiqueta: 'variantes escritas', hecho: 6, total: 8 },
  },
  {
    id: 'kai', nombre: 'Kai', rol: 'Comprador de Medios', tecnico: 'media-buyer', color: '#22c55e',
    funcion: 'Maneja el presupuesto, las plataformas y las pujas.',
    estado: 'esperando_ok', autonomia: 'shared',
    accion: 'Quiere publicar "Retargeting Carrito"',
    ancla: 'Campaña · Retargeting Carrito',
    resultado: 'Presupuesto $30/día. El panel le dio 84 (aprobado), 1 de 5 vendedores dudó',
    artefacto: 'Aprobar ahora',
    artefactoNombre: 'Retargeting Carrito · espera su OK',
    cuando: 'espera desde hace 9 min',
    tarea: { etiqueta: 'conjuntos revisados', hecho: 4, total: 5 },
  },
  {
    id: 'sol', nombre: 'Sol', rol: 'Analista de Resultados', tecnico: 'performance-analyst', color: '#06b6d4',
    funcion: 'Mide los resultados y explica qué funcionó.',
    estado: 'al_dia', autonomia: 'auto',
    accion: 'Comparó lo que predijo con lo que pasó',
    ancla: 'Campaña · Lanzamiento D2C',
    resultado: 'Predijo 84, pasó 79. Corrigió el modelo: la próxima subestima 6% menos',
    artefacto: 'Ver la calibración',
    artefactoNombre: 'Informe de resultados de la semana',
    cuando: 'hace 1 día',
    tarea: { etiqueta: 'informes del día', hecho: 2, total: 3 },
  },
  {
    id: 'rumi', nombre: 'Rumi', rol: 'Vendedor de Cierre', tecnico: 'sales-closer', color: '#f59e0b',
    funcion: 'Atiende y cierra las conversaciones con sus clientes.',
    estado: 'al_dia', autonomia: 'shared',
    accion: 'Cerró 2 ventas y escaló 1 conversación',
    ancla: 'Conversaciones · WhatsApp',
    resultado: 'Valeria G. pidió envío a Envigado: la IA no pudo confirmar la cobertura',
    artefacto: 'Ver la conversación',
    artefactoNombre: 'Conversación de Valeria G.',
    cuando: 'hace 20 min',
    tarea: { etiqueta: 'conversaciones atendidas', hecho: 12, total: 15 },
  },
];

// ---------------------------------------------------------------------------------------------
// LA INVESTIGACIÓN DEL MERCADO — el equipo revisando el mercado desde que usted terminó el onboarding
//
// El motor no arranca cuando le pide una campaña: arranca solo cuando usted termina el onboarding y
// no para. Revisa su zona, la demanda, los precios y los anuncios de la competencia cada 15
// minutos, y deja un hallazgo con hora. Esto NO es la evaluación de una pieza (eso es MiroFish,
// ver mirofish.ts): es investigación de mercado, y cada línea se puede abrir.
// ---------------------------------------------------------------------------------------------

export const INVESTIGACION_MERCADO = {
  /** Cuándo se puso a trabajar solo. */
  arranco: 'hace 3 días',
  desde: 'cuando usted terminó el onboarding',
  /** Cada cuánto vuelve a mirar el mercado. */
  cadencia: 'cada 15 minutos',
  cadenciaMin: 15,
  /** La última vez que dejó un resultado. */
  ultimaRevision: 'hace 4 min',
  /** Cuántas veces revisó el mercado desde que arrancó (3 días a 15 minutos = 288). */
  revisiones: 288,
  /** Dónde mira: la zona del negocio. */
  zona: 'Medellín y su área metropolitana',
  zonaDetalle: '6 competidores a menos de 8 km de su tienda: El Poblado, Laureles y Envigado.',
};

export interface FrenteInvestigacion {
  id: string;
  /** Qué del negocio se está revisando. */
  t: string;
  /** La cifra que resume el frente. */
  dato: string;
  /** El resultado concreto de esa revisión. */
  resultado: string;
  /** El ancla: de qué parte de su negocio habla. */
  ancla: string;
  color: string;
  cuando: string;
}

export const FRENTES_INVESTIGACION: FrenteInvestigacion[] = [
  {
    id: 'zona', t: 'Su zona', dato: '6', color: '#a855f7', cuando: 'hace 6 min',
    resultado: 'Competidores activos a menos de 8 km: El Poblado, Laureles y Envigado.',
    ancla: '📍 Dónde vende',
  },
  {
    id: 'demanda', t: 'La demanda', dato: '+32%', color: '#22c55e', cuando: 'hace 3 h',
    resultado: 'Se busca "serum vitamina C" un 32% más que el mes pasado en su zona.',
    ancla: '🔎 Búsquedas de sus clientes',
  },
  {
    id: 'precios', t: 'Los precios', dato: '$29', color: '#f59e0b', cuando: 'hace 2 h',
    resultado: 'Tienda Norte bajó a $29. Belleza & Co está en $39 y DermaMarket en $44.',
    ancla: '💲 Su precio: $34',
  },
  {
    id: 'anuncios', t: 'Los anuncios activos', dato: '47', color: '#06b6d4', cuando: 'hace 12 min',
    resultado: '47 anuncios de 6 competidores: 14 son de Tienda Norte y 21 usan before/after.',
    ancla: '📣 Su campaña: Lanzamiento D2C',
  },
];

export interface Hallazgo {
  id: string;
  /** 3) el tiempo: cuándo lo encontró. */
  cuando: string;
  /** Quién lo encontró. */
  agente: string;
  color: string;
  /** 2) el resultado concreto, en una línea. */
  texto: string;
  /** Por qué le importa a su negocio. */
  detalle: string;
  /** El artefacto que dejó, si dejó uno: se abre. */
  artefacto: string;
}

export const HALLAZGOS: Hallazgo[] = [
  {
    id: 'h1', cuando: 'hace 2 h', agente: 'Lux', color: '#a855f7',
    texto: 'Tienda Norte bajó el precio de $34 a $29',
    detalle: 'Es su competidor más cercano (Bello) y el único del rubro que baja: puede llevarse su tráfico frío.',
    artefacto: 'Ver los 14 anuncios de Tienda Norte',
  },
  {
    id: 'h2', cuando: 'hace 3 h', agente: 'Lux', color: '#a855f7',
    texto: 'La demanda de "serum vitamina C" creció 32% en su zona',
    detalle: 'Es el término que más crece en Medellín en los últimos 30 días.',
    artefacto: 'Ver la tendencia de búsqueda',
  },
  {
    id: 'h3', cuando: 'hace 1 día', agente: 'Nia', color: '#ec4899',
    texto: 'El formato before/after es el que más crece: +41%',
    detalle: 'Lo usa 1 de cada 5 anuncios nuevos del rubro, y sus piezas todavía no lo usan.',
    artefacto: 'Ver las 6 variantes con before/after',
  },
  {
    id: 'h4', cuando: 'hace 1 día', agente: 'Rex', color: '#9333ea',
    texto: 'El ángulo "resultado" rinde 12% más que "precio"',
    detalle: 'Por eso el plan del mes empuja el resultado y usa el precio solo como comparación.',
    artefacto: 'Ver el plan del mes',
  },
];

// ---------------------------------------------------------------------------------------------
// EL FEED EN VIVO — lo que los agentes están haciendo AHORA, línea por línea
//
// Estas son las acciones que entran solas en el feed de arriba del bloque (ver EquipoInvestigando.tsx):
// una cada 2-4 segundos, con el nombre del agente, lo que hizo y el artefacto que dejó. Se
// recorren barajadas, así que el orden nunca es el mismo. REGLA: cada línea tiene algo del negocio
// del usuario y un resultado concreto, nunca un "analizando…".
// ---------------------------------------------------------------------------------------------

export interface AccionFeed {
  /** Quién la hizo: el id del agente (ver AGENTES). El feed le pone el nombre y el color. */
  agenteId: string;
  /** La acción concreta, en una línea. */
  texto: string;
  /** El artefacto que dejó, si dejó uno: el feed lo muestra como botón que se abre. */
  artefacto?: string;
}

export const ACCIONES_FEED: AccionFeed[] = [
  // Lux — analista de mercado
  { agenteId: 'lux', texto: 'leyó 6 anuncios nuevos de Tienda Norte', artefacto: 'Ver los anuncios' },
  { agenteId: 'lux', texto: 'midió la demanda de «serum vitamina C»: +32%', artefacto: 'Ver la tendencia' },
  { agenteId: 'lux', texto: 'comparó precios del rubro: su $34 contra $29 de Tienda Norte', artefacto: 'Ver la tabla de precios' },
  { agenteId: 'lux', texto: 'encontró 2 competidores nuevos en Sabaneta', artefacto: 'Ver su zona' },
  { agenteId: 'lux', texto: 'revisó 12 reseñas de Belleza & Co (Itagüí): 4 nombran la vitamina C', artefacto: 'Ver las reseñas' },
  { agenteId: 'lux', texto: 'contó 47 anuncios activos de 6 competidores', artefacto: 'Informe de competencia' },
  // Rex — estratega
  { agenteId: 'rex', texto: 'movió $40/día de TikTok a Meta: el CPC baja de $4,20 a $2,10', artefacto: 'Ver el plan del mes' },
  { agenteId: 'rex', texto: 'sacó «intereses amplios» y dejó la audiencia en lookalike 3%', artefacto: 'Ver la audiencia' },
  { agenteId: 'rex', texto: 'dejó el ángulo del mes: «resultado», con el precio como comparación', artefacto: 'Ver el ángulo' },
  { agenteId: 'rex', texto: 'asignó campaña al día 5 del plan: ya van 4 de 7 días', artefacto: 'Ver el calendario' },
  // Nia — creativa
  { agenteId: 'nia', texto: 'escribió una variante nueva del aviso para probar', artefacto: 'Leer la variante' },
  { agenteId: 'nia', texto: 'armó 2 imágenes con el formato before/after', artefacto: 'Ver las imágenes' },
  { agenteId: 'nia', texto: 'escribió el guion del video de 15 segundos', artefacto: 'Leer el guion' },
  { agenteId: 'nia', texto: 'cambió el titular a «Resultados en 14 días»', artefacto: 'Ver el cambio' },
  { agenteId: 'nia', texto: 'dejó 3 respuestas listas para los comentarios del aviso', artefacto: 'Leer las respuestas' },
  // Kai — comprador de medios
  { agenteId: 'kai', texto: 'movió $4 al conjunto que mejor rinde', artefacto: 'Ver el movimiento' },
  { agenteId: 'kai', texto: 'bajó la puja de $1,80 a $1,65 y sostuvo el CPA en $20', artefacto: 'Ver la puja' },
  { agenteId: 'kai', texto: 'pausó el conjunto «lookalike frío»: gastaba sin convertir', artefacto: 'Ver el conjunto' },
  { agenteId: 'kai', texto: 'revisó 5 conjuntos: el gasto del día va en $88 de $120', artefacto: 'Ver el gasto del día' },
  { agenteId: 'kai', texto: 'dejó «Retargeting Carrito» esperando su OK', artefacto: 'Revisar la campaña' },
  // Sol — analista de resultados
  { agenteId: 'sol', texto: 'cerró el informe del día: ROAS 3,8x', artefacto: 'Ver el informe' },
  { agenteId: 'sol', texto: 'comparó lo que predijo (84) con lo que pasó (79)', artefacto: 'Ver la calibración' },
  { agenteId: 'sol', texto: 'revisó 3 campañas y marcó 1 para bajar el presupuesto', artefacto: 'Ver qué revisó' },
  { agenteId: 'sol', texto: 'corrigió el modelo: la próxima subestima 6% menos', artefacto: 'Ver el modelo' },
  // Rumi — vendedor de cierre
  { agenteId: 'rumi', texto: 'respondió 3 consultas y cerró 1 venta', artefacto: 'Ver las conversaciones' },
  { agenteId: 'rumi', texto: 'le contestó a Valeria G.: envío a Envigado en 2 a 4 días', artefacto: 'Ver el mensaje' },
  { agenteId: 'rumi', texto: 'recuperó un carrito abandonado de $59', artefacto: 'Ver el carrito' },
  { agenteId: 'rumi', texto: 'escaló 1 conversación: la clienta pidió hablar con una persona', artefacto: 'Ver por qué' },
];

// ---------------------------------------------------------------------------------------------
// ALARMAS — 4 partes obligatorias: qué pasó · por qué importa en $ · qué sugiere · qué puede hacer
// ---------------------------------------------------------------------------------------------

export type Severidad = 'critico' | 'atencion' | 'oportunidad' | 'info';

export interface Alarma {
  id: string;
  severidad: Severidad;
  titulo: string;
  impacto: string;
  sugerencia: string;
  acciones: string[];
  origen: string;
  cuando: string;
}

export const ALARMAS: Alarma[] = [
  {
    id: 'a1', severidad: 'critico',
    titulo: 'El CPA de "Lanzamiento D2C" subió de $20 a $28',
    impacto: 'Está pagando $8 más por venta. A este ritmo: $240 esta semana.',
    sugerencia: 'Pausar el conjunto "lookalike frío" y mover ese presupuesto al que sí convierte.',
    acciones: ['Aplicar sugerencia', 'Ver campaña', 'Silenciar 7 días'],
    origen: 'Kai · vigilancia', cuando: 'hace 25 min',
  },
  {
    id: 'a2', severidad: 'critico',
    titulo: 'Valeria G. espera respuesta hace 4 horas',
    impacto: 'Un lead caliente enfriado. El 40% de estas conversaciones no vuelve a responder.',
    sugerencia: 'Rumi tiene la respuesta lista: confirma envío a Envigado (2-4 días hábiles).',
    acciones: ['Ver y responder', 'Dejar que Rumi responda'],
    origen: 'Rumi · conversaciones', cuando: 'hace 4 h',
  },
  {
    id: 'a3', severidad: 'atencion',
    titulo: 'Tienda Norte bajó precios 15% y subió su gasto en video',
    impacto: 'Es su competidor más cercano en precio ($34 vs $29). Puede llevarse su tráfico frío.',
    sugerencia: 'No bajar el precio — diferenciar. Nia ya escribió 6 variantes con el ángulo "ingredientes limpios".',
    acciones: ['Ver variantes', 'Ver el informe de Lux', 'Silenciar 7 días'],
    origen: 'Lux · vigilancia', cuando: 'hace 1 h',
  },
  {
    id: 'a4', severidad: 'atencion',
    titulo: 'Le quedan 12 días de autonomía',
    impacto: 'Con 1.760 créditos y el modo actual, el motor se detiene el 5 de octubre.',
    sugerencia: 'Activar la auto-recarga al bajar de 500 créditos, como ya tiene configurado en el plan Pro.',
    acciones: ['Ver créditos', 'Activar auto-recarga'],
    origen: 'Sistema · créditos', cuando: 'hoy 09:00',
  },
  {
    id: 'a5', severidad: 'oportunidad',
    titulo: 'La demanda de "serum vitamina C" creció 32% en su zona',
    impacto: 'Es el término que más crece en búsquedas de Medellín en los últimos 30 días.',
    sugerencia: 'Impulsar el serum con el formato before/after: es el que genera 3,1x más CTR.',
    acciones: ['Crear campaña', 'Ver la tendencia'],
    origen: 'Lux · vigilancia', cuando: 'hace 3 h',
  },
  {
    id: 'a6', severidad: 'info',
    titulo: 'Se resolvió solo: Kai pausó el conjunto que se estaba quemando',
    impacto: 'Evitó ~$180 de gasto sin retorno durante la noche.',
    sugerencia: 'No hace falta que haga nada.',
    acciones: ['Ver la acción', 'Deshacer'],
    origen: 'Kai · acción autónoma', cuando: 'ayer 03:12',
  },
];

// ---------------------------------------------------------------------------------------------
// Su DECISIÓN — los pendientes del motor (dial en Compartido)
// ---------------------------------------------------------------------------------------------

export interface Decision {
  id: string;
  agente: string;
  agenteColor: string;
  titulo: string;
  detalle: string;
  impacto: string;
  panel: { aprobaron: number; dudaron: number; total: number; objeccion: string };
  acciones: string[];
}

export const DECISIONES: Decision[] = [
  {
    id: 'd1', agente: 'Kai', agenteColor: '#22c55e',
    titulo: 'Publicar "Retargeting Carrito"',
    detalle: 'Presupuesto $30/día · público: visitantes 30 días que no compraron. La campaña está armada y lista.',
    impacto: 'Gasto $30/día · recupera carritos a $5,10 de CPC estimado.',
    panel: { aprobaron: 4, dudaron: 1, total: 5, objeccion: 'El público es muy amplio. Acótelo a 30 días y baje a $25/día para el primer tramo.' },
    acciones: ['Aprobar', 'Ajustar', 'Descartar'],
  },
  {
    id: 'd2', agente: 'Rex', agenteColor: '#9333ea',
    titulo: 'Subir el presupuesto de "Lanzamiento D2C" un 35%',
    detalle: '$40/día → $54/día durante 7 días. Rex detectó que el conjunto ganador no se satura todavía.',
    impacto: 'Gasto extra $98 esta semana. Proyección: +$310 de ventas si el ROAS se mantiene en 3,8x.',
    panel: { aprobaron: 5, dudaron: 0, total: 5, objeccion: 'Ninguna. Los 5 jueces aprobaron por unanimidad.' },
    acciones: ['Aprobar', 'Ajustar a 20%', 'Descartar'],
  },
  {
    id: 'd3', agente: 'Rumi', agenteColor: '#f59e0b',
    titulo: 'Enviar link de pago a Andrés R.',
    detalle: 'Confirmó que quiere el pack completo ($59). El link está generado y espera.',
    impacto: 'Cobro de $59. Está en modo Manual: ningún cobro sale sin que usted lo envíe.',
    panel: { aprobaron: 5, dudaron: 0, total: 5, objeccion: 'Ninguna.' },
    acciones: ['Enviar link', 'Descartar'],
  },
];

// ---------------------------------------------------------------------------------------------
// EL PANEL — el enjambre como focus group (doc 03, §3.2)
// El detalle voto por voto de las piezas vive en mirofish.ts (PERFILES + OPCIONES): es la única
// fuente de los 5 jueces y de las 5 piezas, así las dos pantallas no cuentan cosas distintas.
// ---------------------------------------------------------------------------------------------

export const PANEL_PIEZAS: { titulo: string; tipo: string; score: number; veredicto: 'go'|'review'|'stop'; emoji: string }[] = [
  { titulo: 'Antes y Después — Serum Vitamina C', tipo: 'Video 15s', score: 84, veredicto: 'go', emoji: '✨' },
  { titulo: 'Ingredientes limpios', tipo: 'Imagen', score: 78, veredicto: 'review', emoji: '🌿' },
  { titulo: 'Testimonio Valeria', tipo: 'Video 22s', score: 81, veredicto: 'go', emoji: '💬' },
  { titulo: 'Oferta 2x1 Lanzamiento', tipo: 'Imagen', score: 64, veredicto: 'review', emoji: '🎁' },
  { titulo: 'Rutina 3 pasos', tipo: 'Carrusel', score: 52, veredicto: 'stop', emoji: '🧖' },
  { titulo: 'Envío gratis desde $15.000', tipo: 'Imagen', score: 76, veredicto: 'review', emoji: '🚚' },
  { titulo: 'Antes y Después — Protector solar', tipo: 'Video 15s', score: 88, veredicto: 'go', emoji: '☀️' },
];

// ---------------------------------------------------------------------------------------------
// NÚMEROS — las cinco áreas del modelo
// ---------------------------------------------------------------------------------------------

export const NUMEROS: { area: string; label: string; valor: string; delta: string; up: boolean; color: string; meta: string; pct: number; serie: number[] }[] = [
  { area: 'Dinero', label: 'Ventas del mes', valor: '$4.280', delta: '+18%', up: true, color: '#22c55e', meta: 'de $6.000', pct: 71,
    serie: [2980, 3060, 3120, 3050, 3280, 3400, 3350, 3620, 3780, 3900, 4080, 4280] },
  { area: 'Dinero', label: 'ROAS', valor: '3,8x', delta: '+0,4', up: true, color: '#22c55e', meta: 'meta 3,5x', pct: 100,
    serie: [3.1, 3.2, 3.0, 3.3, 3.4, 3.3, 3.5, 3.6, 3.5, 3.7, 3.7, 3.8] },
  { area: 'Alcance', label: 'Personas alcanzadas', valor: '48,5K', delta: '+22%', up: true, color: '#a855f7', meta: 'de 60K', pct: 81,
    serie: [31, 33, 35, 34, 37, 39, 41, 40, 43, 45, 47, 48.5] },
  { area: 'Calidad', label: 'Score de sus piezas', valor: '83', delta: '+6', up: true, color: '#a855f7', meta: 'mínimo 80', pct: 83,
    serie: [70, 72, 74, 73, 76, 78, 79, 81, 80, 82, 82, 83] },
  { area: 'Conversaciones', label: 'Mensajes hoy', valor: '128', delta: '94% por IA', up: true, color: '#25d366', meta: 'de 150 hoy', pct: 85,
    serie: [80, 88, 95, 92, 101, 110, 108, 115, 120, 124, 126, 128] },
  { area: 'Recursos', label: 'Días de autonomía', valor: '12', delta: '1.760 cr', up: false, color: '#f59e0b', meta: 'de 30 días', pct: 40,
    serie: [30, 27, 25, 22, 20, 18, 17, 16, 15, 14, 13, 12] },
];

// ---------------------------------------------------------------------------------------------
// MIENTRAS NO ESTABAS — la contracara del modo automático
// ---------------------------------------------------------------------------------------------

export const MIENTRAS_NO_ESTABAS = {
  desde: 'ayer 18:00',
  acciones: [
    { txt: 'Pausó "Lanzamiento D2C"', detalle: 'el CPA había subido 40%', undo: true, cuando: '03:12' },
    { txt: 'Escribió 6 variantes nuevas', detalle: 'a partir del ángulo "resultado"', undo: true, cuando: '01:40' },
    { txt: 'Marcó 2 leads como fríos', detalle: 'y reprogramó el seguimiento a 7 días', undo: true, cuando: '23:55' },
  ],
  esperan: 1,
  gasto: '$340',
  ventas: '$1.180',
};

// ---------------------------------------------------------------------------------------------
// BITÁCORA — todo lo que se hizo, scrolleable y con deshacer
// ---------------------------------------------------------------------------------------------

export interface EntradaBitacora {
  id: string;
  cuando: string;
  agente: string;
  color: string;
  texto: string;
  ancla: string;
  artefacto?: string;
  autonomia: Modo;
  undo?: boolean;
}

export const BITACORA: EntradaBitacora[] = [
  { id: 'b1', cuando: '11:42', agente: 'Nia', color: '#ec4899', autonomia: 'auto',
    texto: 'Escribió 6 variantes nuevas del serum', ancla: 'Serum Vitamina C', artefacto: 'Leer las 6' },
  { id: 'b2', cuando: '11:18', agente: 'Kai', color: '#22c55e', autonomia: 'auto', undo: true,
    texto: 'Pausó el conjunto "lookalike frío" — el CPA llegó a $28', ancla: 'Lanzamiento D2C', artefacto: 'Ver por qué' },
  { id: 'b3', cuando: '10:55', agente: 'Lux', color: '#a855f7', autonomia: 'auto',
    texto: 'Leyó 47 anuncios de 6 competidores de su zona', ancla: 'Mercado · Medellín', artefacto: 'Ver el informe' },
  { id: 'b4', cuando: '10:30', agente: 'Sistema', color: '#8b5cf6', autonomia: 'auto',
    texto: '14 chequeos de vigilancia · 3 anomalías detectadas', ancla: 'Todas las campañas' },
  { id: 'b5', cuando: '09:12', agente: 'Rumi', color: '#f59e0b', autonomia: 'shared',
    texto: 'Cerró 2 ventas por WhatsApp', ancla: 'Conversaciones', artefacto: 'Ver las conversaciones' },
  { id: 'b6', cuando: '08:40', agente: 'Sol', color: '#06b6d4', autonomia: 'auto',
    texto: 'Calibró el modelo: predijo 84, pasó 79', ancla: 'Lanzamiento D2C', artefacto: 'Ver la calibración' },
  { id: 'b7', cuando: '03:12', agente: 'Kai', color: '#22c55e', autonomia: 'auto', undo: true,
    texto: 'Pausó "Lanzamiento D2C" durante la noche', ancla: 'Lanzamiento D2C', artefacto: 'Deshacer' },
  { id: 'b8', cuando: 'ayer 23:55', agente: 'Rumi', color: '#f59e0b', autonomia: 'auto', undo: true,
    texto: 'Marcó 2 leads como fríos y reprogramó el seguimiento', ancla: 'Conversaciones' },
];

// ---------------------------------------------------------------------------------------------
// CAMPAÑAS — 5 tipos (doc 02: salieron 10)
// ---------------------------------------------------------------------------------------------

export const TIPOS_CAMPANA = ['Ventas', 'Mensajes (WhatsApp)', 'Marca', 'Retargeting', 'Lanzamiento'];

export interface Campana {
  id: string;
  nombre: string;
  tipo: string;
  emoji: string;
  estado: 'Activa' | 'En pausa' | 'Borrador' | 'Finalizada';
  roas: string;
  presupuesto: string;
  alcance: string;
  conversiones: number;
  pct: number;
  score: number;
  artefactos: number;
  // --- La pieza que está corriendo: es lo que se ve en el marco visual de la tarjeta en vivo ---
  /** Formato de la pieza publicada, con el mismo vocabulario que la galería. */
  formato: 'Video vertical' | 'Reel' | 'Carrusel' | 'Imagen';
  medida: string;
  /** El texto del anuncio tal como lo ve el cliente en el feed. */
  copy: string;
  /** El botón del anuncio. */
  cta: string;
  /** Color de la pieza para el marco (los mismos colores de marca que usa la galería). */
  color: string;
  // --- Dónde corre y a quién le habla ---
  plataforma: string;
  publico: string;
  fechas: string;
  // --- El resultado: lo gastado en lo que va de la campaña y cuánto le costó cada venta ---
  /** Lo gastado hasta hoy. Las 3 activas suman $1.240, el invertido del mes que muestra el panel. */
  gastado: string;
  costo: string;
}

export const CAMPANAS: Campana[] = [
  { id: 'c1', nombre: 'Lanzamiento D2C', tipo: 'Lanzamiento', emoji: '🚀', estado: 'Activa', roas: '3,8x', presupuesto: '$40/día', alcance: '48,5K', conversiones: 214, pct: 72, score: 84, artefactos: 12,
    formato: 'Video vertical', medida: '15 s · 9:16',
    copy: 'Ese ardor no es normal: es su piel pidiendo otra cosa. Serum con 3 ingredientes, nada más.',
    cta: 'Ver el serum', color: '#4A7C59',
    plataforma: 'Instagram + Facebook', publico: 'Mujeres 25-44 · Medellín y su área metropolitana',
    fechas: '12 ago → hoy · día 15', gastado: '$780', costo: '$2,10' },
  { id: 'c2', nombre: 'Retargeting Carrito', tipo: 'Retargeting', emoji: '🛒', estado: 'Borrador', roas: '—', presupuesto: '$30/día', alcance: '—', conversiones: 0, pct: 15, score: 84, artefactos: 5,
    formato: 'Carrusel', medida: '5 placas · 4:5',
    copy: 'Le quedó el serum en el carrito. Vuelva y se lo reservamos 24 h.',
    cta: 'Terminar la compra', color: '#F5EFE6',
    plataforma: 'Instagram + Facebook', publico: 'Visitantes de los últimos 30 días que no compraron',
    fechas: 'Sale cuando usted dé el OK', gastado: '$135', costo: '—' },
  { id: 'c3', nombre: 'Mensajes: Secuencia Bienvenida', tipo: 'Mensajes (WhatsApp)', emoji: '💬', estado: 'Activa', roas: '—', presupuesto: '$12/día', alcance: '3,4K', conversiones: 31, pct: 64, score: 79, artefactos: 8,
    formato: 'Reel', medida: '18 s · 9:16',
    copy: 'Piel sensible o mixta: escribinos y le armamos la rutina en 2 minutos. Sin cargo.',
    cta: 'Escribir por WhatsApp', color: '#25d366',
    plataforma: 'WhatsApp Business', publico: 'Toda la base que escribió en los últimos 90 días',
    fechas: '2 ago → hoy · día 25', gastado: '$214', costo: '—' },
  { id: 'c4', nombre: 'Marca: Ingredientes limpios', tipo: 'Marca', emoji: '🌿', estado: 'Activa', roas: '2,4x', presupuesto: '$18/día', alcance: '96K', conversiones: 88, pct: 55, score: 81, artefactos: 9,
    formato: 'Imagen', medida: '1080 × 1350',
    copy: 'Tres ingredientes. Ninguno con nombre impronunciable. Mire la lista completa.',
    cta: 'Ver la lista', color: '#E8A33D',
    plataforma: 'Instagram + Facebook', publico: 'Intereses: skincare natural y cosmética vegana · 20-54',
    fechas: '28 jul → hoy · día 30', gastado: '$246', costo: '$3,80' },
  { id: 'c5', nombre: 'Ventas: Pack completo', tipo: 'Ventas', emoji: '📦', estado: 'En pausa', roas: '7,3x', presupuesto: '$9/día', alcance: '4,2K', conversiones: 44, pct: 41, score: 88, artefactos: 6,
    formato: 'Imagen', medida: '1080 × 1080',
    copy: 'El pack completo sale $59 y rinde 3 meses. Envío gratis desde $15.000.',
    cta: 'Ver el pack', color: '#4A7C59',
    plataforma: 'Instagram + Facebook', publico: 'Compradores de los últimos 60 días',
    fechas: 'Pausada el 21 sep', gastado: '$111', costo: '$1,90' },
];

// ---------------------------------------------------------------------------------------------
// CONVERSACIONES
//
// En la bandeja hay DOS cosas distintas y no se pueden mezclar: un CLIENTE es alguien que le
// compra (o le quiere comprar) y un CREADOR es alguien que le vende un servicio (le graba la
// pieza). Por eso cada conversación declara su `tipo` y sólo las de creador llevan `colab`, con
// los datos de la colaboración (qué se le pide, precio, plazo, qué entrega y en qué etapa va).
// Si esta distinción se pierde, el dueño no sabe si tiene que contestar como vendedor o como
// quien contrata, y los números del módulo (mensajes, % de IA, cola de humanos) se ensucian con
// conversaciones que nunca fueron de venta.
// ---------------------------------------------------------------------------------------------

export interface Mensaje { de: 'ellos' | 'ia' | 'yo'; txt: string; hora?: string }

/** Quién está del otro lado: el que le compra (cliente) o el que le produce una pieza (creador). */
export type TipoConversacion = 'cliente' | 'creador';

/** En qué etapa va el acuerdo con un creador. Se avanza de a una y se puede volver atrás. */
export type EstadoColaboracion = 'invitado' | 'negociando' | 'acordado';

/**
 * Los datos de la colaboración, sólo en las conversaciones de creador. Aquí no hay compras ni
 * ticket promedio: hay una pieza que se entrega, un precio y una fecha.
 */
export interface Colaboracion {
  pedido: string;   // qué le pide la tienda al creador
  precio: string;   // lo ofrecido en la charla o lo ya acordado
  plazo: string;    // cuándo publica / entrega
  entrega: string;  // qué piezas entrega
  estado: EstadoColaboracion;
}

export interface Conversacion {
  id: string;
  nombre: string;
  tag: string;
  color: string;
  canal: 'wa' | 'msgr';
  cola: 'ia' | 'humano';
  hora: string;
  esperando: string;
  msgs: Mensaje[];
  tipo: TipoConversacion;
  colab?: Colaboracion;
}

export const CONVERSACIONES: Conversacion[] = [
  {
    id: 'v1', nombre: 'Valeria G.', tag: 'Lead', color: '#22c55e', canal: 'wa', cola: 'humano', tipo: 'cliente', hora: '10:24', esperando: '4 h',
    msgs: [
      { de: 'ellos', txt: '¡Hola! Quería saber si el serum sirve para piel mixta', hora: '10:21' },
      { de: 'ia', txt: '¡Sí! Es ideal para piel mixta: hidrata sin generar grasa en la zona T. Le dejo el link 👇', hora: '10:22' },
      { de: 'ellos', txt: 'Perfecto, ¿hacen envío a Envigado?', hora: '10:24' },
    ],
  },
  {
    id: 'v2', nombre: 'Julián D.', tag: 'Post-venta', color: '#c084fc', canal: 'wa', cola: 'ia', tipo: 'cliente', hora: '09:12', esperando: '—',
    msgs: [
      { de: 'ellos', txt: 'Mi pedido llegó, gracias 🙏', hora: '09:10' },
      { de: 'ia', txt: '¡Nos alegra! ¿Puede dejarnos una reseña de 5⭐? Nos ayuda mucho.', hora: '09:12' },
    ],
  },
  {
    id: 'v3', nombre: 'Camila T.', tag: 'Lead', color: '#22c55e', canal: 'msgr', cola: 'ia', tipo: 'cliente', hora: 'Ayer', esperando: '—',
    msgs: [
      { de: 'ellos', txt: '¿Hacen envíos a Bogotá? Y quería saber opciones de pago en cuotas 🙏' },
      { de: 'ia', txt: '¡Sí, llegamos a todo el país! Bogotá: 3-5 días hábiles. Puede pagar con 3 o 6 cuotas sin interés.' },
    ],
  },
  {
    id: 'v4', nombre: 'Andrés R.', tag: 'Soporte', color: '#ef4444', canal: 'msgr', cola: 'humano', tipo: 'cliente', hora: 'Ayer', esperando: '11 h',
    msgs: [
      { de: 'ellos', txt: 'Quiero cancelar mi suscripción, no me está funcionando el producto' },
      { de: 'ia', txt: '¡Lamento escucharlo! ¿Puede contarme el motivo? Quizás lo podemos solucionar.' },
      { de: 'ellos', txt: 'No, directamente quiero cancelar. Es un tema de mi banco, necesito que alguien me lo resuelva.' },
    ],
  },
  // ---- CREADORES: no le compran, le producen una pieza. Rumi negocia precio, plazo y entrega. ----
  {
    // Recién invitada: Rumi le escribió la propuesta y todavía no contestó. No espera a nadie.
    id: 'v5', nombre: 'Sofía Bermúdez', tag: 'Colaboración · unboxing', color: '#a855f7', canal: 'wa', cola: 'ia', tipo: 'creador', hora: '11:02', esperando: '—',
    colab: {
      pedido: 'Un video corto de 20 segundos abriendo el pedido y mostrando el serum en la mano',
      precio: 'Ofrecido: $12.000 por pieza (es lo que tiene publicado)',
      plazo: 'publica antes del 12 de octubre',
      entrega: '1 video corto de 20 s + 2 historias con el link de la tienda',
      estado: 'invitado',
    },
    msgs: [
      { de: 'ia', txt: '¡Hola Sofía! Somos Sinkroo, la tienda de skincare natural de El Poblado. Nos gustó su unboxing del pedido completo y le queremos proponer una colaboración: un video corto de 20 s abriendo el pedido y mostrando el serum. Le ofrecemos $12.000 por la pieza, con dos historias extra, publicado antes del 12 de octubre. ¿Le sirve?', hora: '11:02' },
    ],
  },
  {
    // En negociación: ya hubo ida y vuelta por el precio ($22.000 pedidos, $20.000 ofrecidos) y por
    // el plazo (el 6 de octubre, que es la fecha que necesita la marca para la campaña).
    id: 'v6', nombre: 'Esteban Salinas', tag: 'Colaboración · reseña', color: '#8b5cf6', canal: 'wa', cola: 'ia', tipo: 'creador', hora: '10:47', esperando: '—',
    colab: {
      pedido: 'Una reseña del serum mostrando la lista de ingredientes y cómo lo usa de noche',
      precio: 'Ofrecido: $20.000 por la reseña (él pidió $22.000 por la pieza sola)',
      plazo: 'publica el 6 de octubre',
      entrega: '1 reseña de 60 s + 2 historias + 1 foto de producto',
      estado: 'negociando',
    },
    msgs: [
      { de: 'ia', txt: '¡Hola Esteban! Le escribimos de Sinkroo, la tienda de skincare natural. Seguimos su rutina de skincare de los lunes y nos interesa una reseña del serum mostrando la lista de ingredientes. ¿Cuánto cobra por una pieza así?', hora: '10:31' },
      { de: 'ellos', txt: '¡Hola! Una reseña sola la cobro $22.000. Si quiere foto de producto, $26.000 las dos piezas.', hora: '10:38' },
      { de: 'ia', txt: 'Podemos pagar $20.000 por la reseña, publicada el 6 de octubre, mostrando la lista de ingredientes y cómo lo usa de noche.', hora: '10:44' },
      { de: 'ellos', txt: 'Por $20.000 hago la reseña y le sumo dos historias, pero necesito publicar el 6 sí o sí: después me voy de viaje. Si le sirve, lo cerramos.', hora: '10:47' },
    ],
  },
];

// ---------------------------------------------------------------------------------------------
// AUTOMATIZACIONES — flujos, tiempos, condiciones y disparadores
// ---------------------------------------------------------------------------------------------
// Los tiempos del reloj NO se escriben a mano: se eligen de esta lista. Es una lista corta y
// cerrada a propósito, por dos razones: (1) el motor sólo sabe medir estos tiempos, cualquier
// otro no se puede cumplir; (2) escribir el retardo a mano confundía al dueño de la tienda, que
// terminaba tipeando cosas como "AI instante". `pasos[].delay` guarda siempre uno de estos textos.
export const RETARDOS = [
  'Al instante',
  '5 minutos después',
  '30 minutos después',
  '1 hora después',
  '3 horas después',
  '6 horas después',
  '1 día después',
  '3 días después',
  '7 días después',
  '30 días después',
];

// Los pasos que NO esperan un tiempo: dependen de lo que haga el cliente. Se guardan en el mismo
// campo `delay` del paso, pero con `condicion: true`, y se eligen de esta otra lista.
export const CONDICIONES = ['Si responde', 'Si no responde', 'Si no compra', 'Después de la compra'];

// Cuándo arranca cada automatización. También se elige de la lista: es el momento del negocio que
// la dispara, no un texto libre.
export const DISPARADORES = [
  'Cuando alguien escribe por primera vez',
  'Cuando abandona el carrito',
  '30 días después de comprar',
  'Cuando un cliente deja de comprar hace 90 días',
  'Después de la primera compra',
];

// Automatizaciones que manda el motor solo. `resultado` son dos cifras del negocio (clientes y
// dinero) calculadas con el ticket promedio real de la tienda ($8.400): sirven para saber, de un
// vistazo, si la automatización está sirviendo o hay que tocarla. `pasos[].id` existe para poder
// editar el paso en la pantalla sin confundirlo con otro.
export const FLUJOS = [
  {
    id: 'f1', nombre: 'Secuencia de Bienvenida', disparador: 'Cuando alguien escribe por primera vez', grupo: 'Mensajes', estado: 'Activo',
    resultado: [
      { v: '38 chats nuevos', l: 'abrió este mes' },
      { v: '$63.000', l: 'en primeras compras' },
    ],
    pasos: [
      { id: 'f1p1', delay: 'Al instante', txt: '👋 ¡Hola {nombre}! Gracias por escribirnos. Soy Rumi, el vendedor de la tienda.' },
      // '2 min después' era un tiempo que el motor no medía: quedó normalizado al más parecido de la lista.
      { id: 'f1p2', delay: '5 minutos después', txt: 'Veo que le interesan productos de skincare. ¿Qué tipo de piel tiene? 🤔' },
      { id: 'f1p3', delay: 'Si responde', txt: '→ Recomiendo productos según su tipo de piel.', condicion: true },
      { id: 'f1p4', delay: '1 día después', txt: 'Solo paso a recordarle: tenemos envío gratis en compras +$59.' },
    ],
  },
  {
    id: 'f2', nombre: 'Recupera carritos', disparador: 'Cuando abandona el carrito', grupo: 'Ventas', estado: 'Activo',
    resultado: [
      { v: '19 carritos', l: 'recuperados este mes' },
      { v: '$159.600', l: 'volvió a la caja' },
    ],
    pasos: [
      // '1 h después' y '24 h después' se normalizaron a las opciones de la lista de tiempos.
      { id: 'f2p1', delay: '1 hora después', txt: '🛒 ¡Hola! Quedó algo en su carrito. ¿Le ayudo a terminar la compra?' },
      { id: 'f2p2', delay: '1 día después', txt: 'Su carrito sigue guardado. Le dejé un cupón de 15%: VUELVA15 ⏳' },
      { id: 'f2p3', delay: 'Si no responde', txt: '→ Marcar lead como "frío" y pausar la secuencia.', condicion: true },
    ],
  },
  {
    id: 'f3', nombre: 'Recompra a los 30 días', disparador: '30 días después de comprar', grupo: 'Recuperación', estado: 'Activo',
    resultado: [
      { v: '12 clientes', l: 'volvieron a comprar' },
      { v: '$100.800', l: 'sumó este mes' },
    ],
    pasos: [
      { id: 'f3p1', delay: '30 días después', txt: '¡Hola {nombre}! Ya se le debe estar terminando el serum. ¿Le reservo otro?' },
      { id: 'f3p2', delay: 'Si no responde', txt: '→ Ofrecer 10% en la segunda compra.', condicion: true },
    ],
  },
  {
    id: 'f4', nombre: 'Programa de referidos', disparador: 'Después de la primera compra', grupo: 'Referidos', estado: 'En pausa',
    resultado: [
      { v: '7 amigos', l: 'traídos este mes' },
      { v: '$58.800', l: 'en ventas nuevas' },
    ],
    pasos: [
      { id: 'f4p1', delay: '7 días después', txt: '¿Le recomendaría el serum a alguien? Con su código gana 250 créditos 🎁' },
    ],
  },
];

// ---------------------------------------------------------------------------------------------
// MERCADO — competencia real (sin Google Maps, ver doc 02 §1.6)
// ---------------------------------------------------------------------------------------------

export const COMPETIDORES = [
  { nombre: 'Su marca', anuncios: 6, gasto: 'medio', precio: 34, leads: 48, propio: true, tend: 'up' as const },
  { nombre: 'Tienda Norte', anuncios: 14, gasto: 'alto', precio: 29, leads: 82, propio: false, tend: 'up' as const },
  { nombre: 'Belleza & Co', anuncios: 9, gasto: 'medio', precio: 39, leads: 61, propio: false, tend: 'flat' as const },
  { nombre: 'DermaMarket', anuncios: 11, gasto: 'alto', precio: 44, leads: 37, propio: false, tend: 'up' as const },
  { nombre: 'Green Beauty', anuncios: 4, gasto: 'bajo', precio: 59, leads: 22, propio: false, tend: 'down' as const },
];

// pct = de cada 100 anuncios del rubro, cuántos usan ese ángulo. lectura = qué significa para usted.
export const ANGULOS = [
  { nombre: 'Resultado', pct: 38, ej: '"Piel pareja en 14 días. Sin filtros."',
    lectura: 'Vender el resultado, no el producto. Es el más usado porque es el que más convierte: si su anuncio no dice qué cambia en la piel, arranca perdiendo.' },
  { nombre: 'Tecnología', pct: 27, ej: '"Vitamina C estabilizada al 10%. Formulación real."',
    lectura: 'Hablar del ingrediente y de la fórmula. Sirve para el que compara: le da el argumento técnico que necesita para decidir.' },
  { nombre: 'Emoción', pct: 21, ej: '"Vuelva a mirarse al espejo con ganas."',
    lectura: 'Apelar a cómo se va a sentir. Es el que mejor funciona con quien nunca lo ha visto, porque no necesita entender la fórmula.' },
  { nombre: 'Precio', pct: 14, ej: '"El mismo activo que las marcas de $90."',
    lectura: 'El que menos se usa, y por algo: competir por precio desgasta el margen y atrae al cliente que se va con el próximo descuento. Úselo como comparación, no como bandera.' },
];

// width = índice de 0 a 100 (qué tan fuerte está ese tema contra el máximo del rubro).
// num = cuánto se movió en 30 días. lectura = qué significa para usted.
export const TENDENCIAS = [
  { label: 'Demanda de "serum vitamina C"', num: '+32%', up: true, width: '78%', tag: 'Búsqueda',
    lectura: 'La gente lo busca un 32% más que el mes pasado. Si tiene ese producto, es su mejor momento para pautar: ya hay demanda esperando.' },
  { label: 'Formato before/after en alza', num: '+41%', up: true, width: '88%', tag: 'Formato',
    lectura: 'El antes y después es el formato que más crece del rubro. Es el que conviene usar hoy, y es el que su competencia está usando.' },
  { label: 'Crecimiento D2C skincare', num: '+24%', up: true, width: '62%', tag: 'Mercado',
    lectura: 'Todo el rubro crece, no es solo su tienda. Buen momento para subir el techo de inversión, no para bajar precios.' },
  { label: 'Precio de Tienda Norte', num: '-15%', up: false, width: '55%', tag: 'Competencia',
    lectura: 'Es el único número que baja: su competidor más cercano bajó 15% el precio. Si le sigue, le saca el tráfico frío: conviene diferenciar antes que igualar.' },
];

// ---------------------------------------------------------------------------------------------
// CONEXIONES
// ---------------------------------------------------------------------------------------------

export interface Conexion {
  key: string;
  nombre: string;
  rol: string;
  emoji: string;
  color: string;
  estado: 'conectada' | 'por_conectar' | 'error';
  detalle: string;
  capacidades: string[];
}

export const CONEXIONES: Conexion[] = [
  { key: 'whatsapp', nombre: 'WhatsApp Business', rol: 'Vender y atender', emoji: '💬', color: '#25d366',
    estado: 'conectada', detalle: 'Su token · +57 300 555 2341', capacidades: ['Enviar mensajes', 'Recibir webhooks', 'Plantillas'] },
  { key: 'meta_ads', nombre: 'Meta Ads', rol: 'Publicar y medir', emoji: '📣', color: '#a855f7',
    estado: 'conectada', detalle: 'act_8442119 · venció en 41 días', capacidades: ['Leer métricas', 'Crear campañas', 'Pausar'] },
  { key: 'instagram', nombre: 'Instagram', rol: 'Contenido orgánico', emoji: '📸', color: '#e11d48',
    estado: 'conectada', detalle: '@skincare.natural', capacidades: ['Leer métricas', 'Publicar'] },
  { key: 'email', nombre: 'Email (su Klaviyo)', rol: 'Carrito abandonado', emoji: '✉️', color: '#f59e0b',
    estado: 'por_conectar', detalle: 'Detectamos 12 carritos abandonados este mes', capacidades: ['Enviar secuencias'] },
  { key: 'pixel', nombre: 'Pixel + eventos', rol: 'Medir y optimizar', emoji: '📊', color: '#22c55e',
    estado: 'por_conectar', detalle: 'Sin pixel, Meta no puede optimizar bien', capacidades: ['Eventos de conversión'] },
];

export const CREDITOS_MOV = [
  { detalle: 'Recarga de plan Pro', fecha: '12 Sep', cantidad: 1760, tipo: 'entrada' as const },
  { detalle: 'Campaña: Lanzamiento D2C', fecha: '14 Sep', cantidad: -120, tipo: 'salida' as const },
  { detalle: 'Análisis IA: competencia', fecha: '16 Sep', cantidad: -40, tipo: 'salida' as const },
  { detalle: 'Referido: Valeria Gómez', fecha: '18 Sep', cantidad: 250, tipo: 'entrada' as const },
  { detalle: 'Campaña: Retargeting', fecha: '20 Sep', cantidad: -60, tipo: 'salida' as const },
];

// ---------------------------------------------------------------------------------------------
// EL MOTOR ANDANDO — mercado secundario predictivo (portado del dashboard original)
//
// Son DOS bloques distintos y viven separados:
//   · ESTE (MotorEnVivo.tsx, el paso «MiroFish» de Campañas): la propuesta se prueba en un mercado
//     simulado ANTES de gastar un peso. Se ve la etapa, el sentimiento, el score en vivo, los votos
//     y las reacciones. Es la VERIFICACIÓN de una publicación concreta.
//   · La INVESTIGACIÓN DEL MERCADO (EquipoInvestigando.tsx, en Hoy): los 6 agentes revisando el
//     mercado desde el onboarding, con AGENTES, INVESTIGACION_MERCADO, FRENTES_INVESTIGACION,
//     HALLAZGOS y ACCIONES_FEED. Corre siempre y no evalúa una pieza.
// Cada bloque usa sus propios datos: los de aquí son solo del motor que verifica la pieza.
// ---------------------------------------------------------------------------------------------

export const ETAPAS_MOTOR = [
  { t: 'Ingesta', d: 'La propuesta entra al mercado para ser probada.' },
  { t: 'Reacción', d: 'El mercado reacciona como lo haría su audiencia real.' },
  { t: 'Debate', d: 'El público discute pros y contras en el feed de comentarios.' },
  { t: 'Votación', d: 'Cada bot vota positivo o negativo y suma su score.' },
  { t: 'Ranking', d: 'La propuesta se ordena contra las demás del lote.' },
  { t: 'Veredicto', d: 'Se decide publicar o descartar antes de salir live.' },
];

export const PIEZAS_MOTOR = [
  { n: 'propuesta_imagen_01', t: 'Imagen', e: '🖼️' },
  { n: 'propuesta_reel_v2', t: 'Reel', e: '🎬' },
  { n: 'propuesta_video_a', t: 'Video', e: '📹' },
  { n: 'propuesta_paleta_v3', t: 'Paleta', e: '🎨' },
  { n: 'propuesta_publicacion', t: 'Publicación', e: '📝' },
  { n: 'propuesta_reel_antes_despues', t: 'Reel', e: '🎬' },
  { n: 'propuesta_video_demo', t: 'Video', e: '📹' },
];

export const CHAT_MOTOR = [
  { t: 'positivo', m: 'Los colores de esta pieza conectan con el nicho. +1' },
  { t: 'positivo', m: 'El ángulo de venta está alineado con la intención real. Me gusta' },
  { t: 'negativo', m: 'El titular se pierde en móvil. No la veo ganando' },
  { t: 'analisis', m: 'Estimando retención del primer segundo en 72%…' },
  { t: 'positivo', m: 'El hook de los primeros 3s engancha. Voto a favor' },
  { t: 'negativo', m: 'La oferta llega tarde en el reel. Riesgo de caída' },
  { t: 'analisis', m: 'Comparando esta contra 3 propuestas previas del lote' },
  { t: 'positivo', m: 'Contraste y legibilidad sólidos en escritorio y móvil' },
  { t: 'negativo', m: 'La paleta no resuena con la audiencia objetivo. Rechazo' },
  { t: 'analisis', m: 'Simulando la reacción de 500 agentes del público' },
  { t: 'positivo', m: 'CPA proyectado cae bajo el umbral. Vale publicar' },
  { t: 'positivo', m: 'Señal de compra real detectada en los comentarios simulados' },
];

export const VOTOS_MOTOR = ['Aprueba', 'Rechaza', 'Aprueba con reserva', 'Neutro'];

// ---------------------------------------------------------------------------------------------
// QUÉ HACE CADA BOTÓN — para que no haya que adivinar
// ---------------------------------------------------------------------------------------------

export const CONSECUENCIA: Record<string, string> = {
  a1: 'Aplicar pausa el conjunto "lookalike frío" y mueve sus $40/día al conjunto que sí convierte. Puede deshacerlo 24 h.',
  a2: 'Responder manda el mensaje por su WhatsApp real. "Dejar que Rumi responda" la envía sin que la lea antes.',
  a3: 'Ver variantes abre las 6 piezas que Nia escribió con el ángulo de ingredientes. Silenciar la esconde 7 días.',
  a4: 'Ver créditos muestra qué los consumió. Auto-recarga paga el próximo paquete cuando baje de 500.',
  a5: 'Crear campaña deja el borrador listo sin gastar nada todavía: publicar sigue necesitando su OK.',
  a6: 'Deshacer reactiva el conjunto tal como estaba a las 03:12, con su presupuesto original.',
  d1: 'Aprobar publica la campaña y empieza a gastar $30/día. Ajustar la deja lista sin publicar.',
  d2: 'Aprobar sube el presupuesto a $54/día por 7 días. "Ajustar a 20%" sube a $48/día.',
  d3: 'Enviar link manda el cobro de $59 por WhatsApp. Descartar lo deja sin enviar y avisa a Rumi.',
};

export const MES = {
  ventas: [3350, 3620, 3780, 3900, 4080, 4280],
  labels: ['Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago'],
  acumulado: '$40.280',
  promedio: '$6.713',
};

export const TAREAS_EXCLUIDAS = [
  'No pedimos margen de ganancia ni frecuencia de compra: los inferimos de sus ventas y conversaciones.',
  'No le pedimos que suba documentos para que "la IA los lea".',
  'No hay mapa de Google ni integraciones que no uses.',
  'No va a ver 15 tipos de campaña ni 218 casillas por llenar.',
  'No pedimos que conecte nada que no vaya a usar: cada conexión declara qué habilita.',
  'No hay que aprobar nada dos veces: si una acción es reversible, el motor puede hacerla solo.',
];

// ---------------------------------------------------------------------------------------------
// LA CARPETA DEL NEGOCIO — lo que el cliente YA subió en campañas anteriores, cargador por
// cargador. En «Su material real» se ofrece para sumar en un toque (el mismo producto, otra
// campaña) sin volver a subir el archivo. Lo nuevo —un producto que recién sale— se sube a mano.
// ---------------------------------------------------------------------------------------------
export const CARPETA: Record<string, { nombre: string; peso: string }[]> = {
  fotos_producto: [
    { nombre: 'serum-vitamina-c-frente.jpg', peso: '1,8 MB' },
    { nombre: 'serum-30ml-detalle.jpg', peso: '2,1 MB' },
    { nombre: 'pack-regalo-duo.jpg', peso: '1,4 MB' },
    { nombre: 'textura-serum-en-la-mano.jpg', peso: '980 KB' },
  ],
  resenas: [
    { nombre: 'whatsapp-marcela-agosto.png', peso: '240 KB' },
    { nombre: 'reseña-instagram-sofia.png', peso: '310 KB' },
    { nombre: 'google-5-estrellas.png', peso: '185 KB' },
  ],
  videos_producto: [
    { nombre: 'unboxing-pedido-rionegro.mp4', peso: '24 MB' },
    { nombre: 'rutina-de-noche-30s.mp4', peso: '18 MB' },
  ],
  logo: [
    { nombre: 'logo-skincare-natural.png', peso: '120 KB' },
    { nombre: 'logo-marca-blanca.png', peso: '96 KB' },
  ],
  catalogo: [
    { nombre: 'lista-de-precios-septiembre.pdf', peso: '1,2 MB' },
    { nombre: 'catalogo-verano.xlsx', peso: '340 KB' },
  ],
  negocio: [
    { nombre: 'local-medellin-plaza.jpg', peso: '2,6 MB' },
    { nombre: 'equipo-preparando-pedidos.jpg', peso: '1,9 MB' },
  ],
  manual_marca: [
    { nombre: 'manual-de-marca-2026.pdf', peso: '4,5 MB' },
    { nombre: 'paleta-y-tipografias.pdf', peso: '780 KB' },
  ],
};

// ---------------------------------------------------------------------------------------------
// OFERTAS QUE YA USÓ — el historial del negocio. En el formulario de publicar se ofrecen para
// repetir: son las que ya corrieron, con el mes y cómo le fue. Lo que se ve en pantalla sale de
// aquí; no se inventa una oferta nueva en cada lugar.
// ---------------------------------------------------------------------------------------------
export const OFERTAS_ANTERIORES: { oferta: string; cuando: string; comoLeFue: string }[] = [
  { oferta: 'Envío gratis desde $50', cuando: 'Agosto 2026', comoLeFue: 'subió el ticket promedio 18%' },
  { oferta: '2x1 en el serum', cuando: 'Julio 2026', comoLeFue: 'se agotó el stock en 4 días' },
  { oferta: '15% en la primera compra', cuando: 'Junio 2026', comoLeFue: 'sumó 96 clientes nuevos' },
  { oferta: 'Regalo en compras desde $80', cuando: 'Mayo 2026', comoLeFue: 'duplicó los pedidos grandes' },
  { oferta: '30% en Black Friday', cuando: 'Noviembre 2025', comoLeFue: 'fue su mejor día del año: 3,2x en ventas' },
  { oferta: 'Cupón de vuelta para clientes dormidos', cuando: 'Marzo 2026', comoLeFue: 'volvió a comprar 1 de cada 5' },
];

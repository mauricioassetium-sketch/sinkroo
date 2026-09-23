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
// EL DIAL — modos, excepciones y frenos
// ---------------------------------------------------------------------------------------------

export const MODOS: { key: Modo; nombre: string; desc: string; vidrio: string }[] = [
  { key: 'auto', nombre: 'Automático', desc: 'Decide y ejecuta. Te enterás después, en la bitácora.', vidrio: 'hace 12 min: hizo X → ver' },
  { key: 'shared', nombre: 'Compartido', desc: 'Decide y te pide OK antes de hacer.', vidrio: 'espera tu OK: quiere X → aprobar' },
  { key: 'manual', nombre: 'Manual', desc: 'Te sugiere y vos decidís y ejecutás.', vidrio: 'sugiere X · 3 sugerencias sin usar' },
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
    nota: 'Revisa tus campañas, métricas y conversaciones cada 15 minutos. No tiene costo y no se puede bajar.' },
  { key: 'crear', etiqueta: 'Escribir copys e imágenes', nivel: 'auto',
    nota: 'Los borradores no publican nada. Revisás antes de que salga.' },
  { key: 'responder', etiqueta: 'Responder a clientes', nivel: 'shared',
    nota: 'Rumi propone la respuesta; vos la mandás. Escala solo si el cliente se enoja o pide cancelar.' },
  { key: 'publicar', etiqueta: 'Publicar y gastar presupuesto', nivel: 'shared',
    nota: 'Toda campaña pasa por tu OK antes de gastar un peso.' },
  { key: 'pausar', etiqueta: 'Pausar una campaña que se quema', nivel: 'auto',
    nota: 'Frena primero, pregunta después. Que no pueda parar mientras dormís cuesta más que frenar de más. Reversible 24 h.' },
  { key: 'presupuesto', etiqueta: 'Cambiar presupuesto más del 20%', nivel: 'shared',
    nota: 'Ajustes chicos van solos. Los grandes te esperan.' },
  { key: 'pagos', etiqueta: 'Enviar links de pago', nivel: 'manual',
    nota: 'Ningún cobro sale sin que lo mandes vos.' },
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
// EL MOTOR — los 6 agentes, con las tres anclas (algo tuyo + resultado + tiempo)
// ---------------------------------------------------------------------------------------------

export interface Agente {
  id: string;
  nombre: string;
  rol: string;
  tecnico: string;
  color: string;
  estado: 'trabajando' | 'esperando_ok' | 'al_dia';
  /** 1) algo tuyo + 2) el resultado + 3) el tiempo */
  accion: string;
  ancla: string;
  resultado: string;
  artefacto: string;
  cuando: string;
  autonomia: Modo;
}

export const AGENTES: Agente[] = [
  {
    id: 'lux', nombre: 'Lux', rol: 'Analista de Mercado', tecnico: 'market-analyst', color: '#a855f7',
    estado: 'trabajando', autonomia: 'auto',
    accion: 'Leyó 47 anuncios de 6 competidores de tu zona',
    ancla: 'Mercado · skincare Buenos Aires',
    resultado: 'Tienda Norte bajó precios 15% y duplicó su gasto en video corto',
    artefacto: 'Ver el informe',
    cuando: 'hace 12 min',
  },
  {
    id: 'rex', nombre: 'Rex', rol: 'Estratega de Marketing', tecnico: 'marketing-strategist', color: '#9333ea',
    estado: 'trabajando', autonomia: 'auto',
    accion: 'Reasignó $40/día de TikTok a Meta',
    ancla: 'Campaña · Lanzamiento D2C',
    resultado: 'TikTok daba $4,20 de CPC contra $2,10 de Meta con la misma audiencia',
    artefacto: 'Ver por qué',
    cuando: 'hace 2 h',
  },
  {
    id: 'nia', nombre: 'Nia', rol: 'Creativa de Anuncios', tecnico: 'creative-strategist', color: '#ec4899',
    estado: 'trabajando', autonomia: 'auto',
    accion: 'Escribió 6 variantes nuevas',
    ancla: 'Producto · Serum Vitamina C',
    resultado: 'Apoyadas en el ángulo "resultado", que el panel puntuó 12% mejor que "precio"',
    artefacto: 'Leer las 6',
    cuando: 'hace 40 min',
  },
  {
    id: 'kai', nombre: 'Kai', rol: 'Comprador de Medios', tecnico: 'media-buyer', color: '#22c55e',
    estado: 'esperando_ok', autonomia: 'shared',
    accion: 'Quiere publicar "Retargeting Carrito"',
    ancla: 'Campaña · Retargeting Carrito',
    resultado: 'Presupuesto $30/día. El panel le dio 84 (aprobado), 1 de 5 vendedores dudó',
    artefacto: 'Aprobar ahora',
    cuando: 'espera desde hace 9 min',
  },
  {
    id: 'sol', nombre: 'Sol', rol: 'Analista de Resultados', tecnico: 'performance-analyst', color: '#06b6d4',
    estado: 'al_dia', autonomia: 'auto',
    accion: 'Comparó lo que predijo con lo que pasó',
    ancla: 'Campaña · Lanzamiento D2C',
    resultado: 'Predijo 84, pasó 79. Corrigió el modelo: la próxima subestima 6% menos',
    artefacto: 'Ver la calibración',
    cuando: 'hace 1 día',
  },
  {
    id: 'rumi', nombre: 'Rumi', rol: 'Vendedor de Cierre', tecnico: 'sales-closer', color: '#f59e0b',
    estado: 'al_dia', autonomia: 'shared',
    accion: 'Cerró 2 ventas y escaló 1 conversación',
    ancla: 'Conversaciones · WhatsApp',
    resultado: 'Valeria G. pidió envío a CABA: la IA no pudo confirmar la cobertura',
    artefacto: 'Ver la conversación',
    cuando: 'hace 20 min',
  },
];

// ---------------------------------------------------------------------------------------------
// ALARMAS — 4 partes obligatorias: qué pasó · por qué importa en $ · qué sugiere · qué podés hacer
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
    impacto: 'Estás pagando $8 más por venta. A este ritmo: $240 esta semana.',
    sugerencia: 'Pausar el conjunto "lookalike frío" y mover ese presupuesto al que sí convierte.',
    acciones: ['Aplicar sugerencia', 'Ver campaña', 'Silenciar 7 días'],
    origen: 'Kai · vigilancia', cuando: 'hace 25 min',
  },
  {
    id: 'a2', severidad: 'critico',
    titulo: 'Valeria G. espera respuesta hace 4 horas',
    impacto: 'Un lead caliente enfriado. El 40% de estas conversaciones no vuelve a responder.',
    sugerencia: 'Rumi tiene la respuesta lista: confirma envío a CABA (2-4 días hábiles).',
    acciones: ['Ver y responder', 'Dejar que Rumi responda'],
    origen: 'Rumi · conversaciones', cuando: 'hace 4 h',
  },
  {
    id: 'a3', severidad: 'atencion',
    titulo: 'Tienda Norte bajó precios 15% y subió su gasto en video',
    impacto: 'Es tu competidor más cercano en precio ($34 vs $29). Puede llevarse tu tráfico frío.',
    sugerencia: 'No bajar el precio — diferenciar. Nia ya escribió 6 variantes con el ángulo "ingredientes limpios".',
    acciones: ['Ver variantes', 'Ver el informe de Lux', 'Silenciar 7 días'],
    origen: 'Lux · vigilancia', cuando: 'hace 1 h',
  },
  {
    id: 'a4', severidad: 'atencion',
    titulo: 'Te quedan 12 días de autonomía',
    impacto: 'Con 1.760 créditos y el modo actual, el motor se detiene el 5 de octubre.',
    sugerencia: 'Activar la auto-recarga al bajar de 500 créditos, como ya tenés configurado en el plan Pro.',
    acciones: ['Ver créditos', 'Activar auto-recarga'],
    origen: 'Sistema · créditos', cuando: 'hoy 09:00',
  },
  {
    id: 'a5', severidad: 'oportunidad',
    titulo: 'La demanda de "serum vitamina C" creció 32% en tu zona',
    impacto: 'Es el término que más crece en búsquedas de Buenos Aires en los últimos 30 días.',
    sugerencia: 'Empujar el serum con el formatos before/after: es el que 3,1x más CTR genera.',
    acciones: ['Crear campaña', 'Ver la tendencia'],
    origen: 'Lux · vigilancia', cuando: 'hace 3 h',
  },
  {
    id: 'a6', severidad: 'info',
    titulo: 'Se resolvió solo: Kai pausó el conjunto que se estaba quemando',
    impacto: 'Evitó ~$180 de gasto sin retorno durante la noche.',
    sugerencia: 'No hace falta que hagas nada.',
    acciones: ['Ver la acción', 'Deshacer'],
    origen: 'Kai · acción autónoma', cuando: 'ayer 03:12',
  },
];

// ---------------------------------------------------------------------------------------------
// TU DECISIÓN — los pendientes del motor (dial en Compartido)
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
    panel: { aprobaron: 4, dudaron: 1, total: 5, objeccion: 'El público es muy amplio. Acotá a 30 días y bajá a $25/día para el primer tramo.' },
    acciones: ['Aprobar', 'Ajustar', 'Descartar'],
  },
  {
    id: 'd2', agente: 'Rex', agenteColor: '#9333ea',
    titulo: 'Subir el presupuesto de "Lanzamiento D2C" un 35%',
    detalle: '$40/día → $54/día durante 7 días. Rex detectó que el conjunto ganador no se satura todavía.',
    impacto: 'Gasto extra $98 esta semana. Proyección: +$310 de ventas si el ROAS se mantiene en 3,8x.',
    panel: { aprobaron: 5, dudaron: 0, total: 5, objeccion: 'Ninguna. El panel aprobó por unanimidad.' },
    acciones: ['Aprobar', 'Ajustar a 20%', 'Descartar'],
  },
  {
    id: 'd3', agente: 'Rumi', agenteColor: '#f59e0b',
    titulo: 'Enviar link de pago a Martín R.',
    detalle: 'Confirmó que quiere el pack completo ($59). El link está generado y espera.',
    impacto: 'Cobro de $59. Está en modo Manual: ningún cobro sale sin que lo mandes vos.',
    panel: { aprobaron: 5, dudaron: 0, total: 5, objeccion: 'Ninguna.' },
    acciones: ['Enviar link', 'Descartar'],
  },
];

// ---------------------------------------------------------------------------------------------
// EL PANEL — el enjambre como focus group (doc 03, §3.2)
// ---------------------------------------------------------------------------------------------

export interface Votante {
  nombre: string;
  persona: string;
  score: number;
  peso: string;
  rationale: string;
}

export const PANEL_ULTIMO: {
  pieza: string;
  score: number;
  veredicto: 'go' | 'review' | 'stop';
  criterio: string;
  votantes: Votante[];
} = {
  pieza: 'Antes y Después — Serum Vitamina C (video 15s)',
  score: 84,
  veredicto: 'go',
  criterio: 'Aprobado para lanzar (mínimo 80)',
  votantes: [
    { nombre: 'Comprador impulsivo', persona: 'compra por impulso', score: 89, peso: 'alto',
      rationale: 'El hook frena el scroll en el primer segundo: el antes/después se entiende sin leer.' },
    { nombre: 'CM escéptico', persona: 'desconfía de toda promesa', score: 72, peso: 'alto',
      rationale: 'Le falta prueba social: no hay un solo testimonio ni número verificable en pantalla.' },
    { nombre: 'Analista de performance', persona: 'mide todo', score: 80, peso: 'medio',
      rationale: 'CTR estimado 3,4%, por encima de tu promedio de 2,9%. El cierre es claro.' },
    { nombre: 'Guardián de marca', persona: 'protege el tono', score: 86, peso: 'medio',
      rationale: 'Tono coherente con tu línea de "ingredientes limpios". No hay promesas médicas.' },
    { nombre: 'Copywriter senior', persona: 'juzga el texto', score: 91, peso: 'alto',
      rationale: 'El ángulo de resultado está bien elegido y el CTA es concreto.' },
  ],
};

export const PANEL_PIEZAS: { titulo: string; tipo: string; score: number; veredicto: 'go'|'review'|'stop'; emoji: string }[] = [
  { titulo: 'Antes y Después — Serum Vitamina C', tipo: 'Video 15s', score: 84, veredicto: 'go', emoji: '✨' },
  { titulo: 'Ingredientes limpios', tipo: 'Imagen', score: 78, veredicto: 'review', emoji: '🌿' },
  { titulo: 'Testimonio Valeria', tipo: 'Video 22s', score: 81, veredicto: 'go', emoji: '💬' },
  { titulo: 'Oferta 2x1 Lanzamiento', tipo: 'Imagen', score: 64, veredicto: 'review', emoji: '🎁' },
  { titulo: 'Rutina 3 pasos', tipo: 'Carrusel', score: 52, veredicto: 'stop', emoji: '🧖' },
];

// ---------------------------------------------------------------------------------------------
// NÚMEROS — las cinco áreas del modelo
// ---------------------------------------------------------------------------------------------

export const NUMEROS: { area: string; label: string; valor: string; delta: string; up: boolean; color: string }[] = [
  { area: 'Dinero', label: 'Ventas del mes', valor: '$4.280', delta: '+18%', up: true, color: '#22c55e' },
  { area: 'Dinero', label: 'ROAS', valor: '3,8x', delta: '+0,4', up: true, color: '#22c55e' },
  { area: 'Alcance', label: 'Personas alcanzadas', valor: '48,5K', delta: '+22%', up: true, color: '#a855f7' },
  { area: 'Calidad', label: 'Score de tus piezas', valor: '84', delta: '+6', up: true, color: '#a855f7' },
  { area: 'Conversaciones', label: 'Mensajes hoy', valor: '128', delta: '94% por IA', up: true, color: '#25d366' },
  { area: 'Recursos', label: 'Días de autonomía', valor: '12', delta: '1.760 cr', up: false, color: '#f59e0b' },
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
    texto: 'Leyó 47 anuncios de 6 competidores de tu zona', ancla: 'Mercado · Buenos Aires', artefacto: 'Ver el informe' },
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
  estado: 'Activa' | 'En pausa' | 'Borrador';
  roas: string;
  presupuesto: string;
  alcance: string;
  conversiones: number;
  pct: number;
  score: number;
  artefactos: number;
}

export const CAMPANAS: Campana[] = [
  { id: 'c1', nombre: 'Lanzamiento D2C', tipo: 'Lanzamiento', emoji: '🚀', estado: 'Activa', roas: '3,8x', presupuesto: '$40/día', alcance: '48,5K', conversiones: 214, pct: 72, score: 84, artefactos: 12 },
  { id: 'c2', nombre: 'Retargeting Carrito', tipo: 'Retargeting', emoji: '🛒', estado: 'Borrador', roas: '—', presupuesto: '$30/día', alcance: '—', conversiones: 0, pct: 15, score: 84, artefactos: 5 },
  { id: 'c3', nombre: 'Mensajes: Secuencia Bienvenida', tipo: 'Mensajes (WhatsApp)', emoji: '💬', estado: 'Activa', roas: '—', presupuesto: '$12/día', alcance: '3,4K', conversiones: 31, pct: 64, score: 79, artefactos: 8 },
  { id: 'c4', nombre: 'Marca: Ingredientes limpios', tipo: 'Marca', emoji: '🌿', estado: 'Activa', roas: '2,4x', presupuesto: '$18/día', alcance: '96K', conversiones: 88, pct: 55, score: 81, artefactos: 9 },
  { id: 'c5', nombre: 'Ventas: Pack completo', tipo: 'Ventas', emoji: '📦', estado: 'En pausa', roas: '7,3x', presupuesto: '$9/día', alcance: '4,2K', conversiones: 44, pct: 41, score: 88, artefactos: 6 },
];

// ---------------------------------------------------------------------------------------------
// CONVERSACIONES
// ---------------------------------------------------------------------------------------------

export interface Mensaje { de: 'ellos' | 'ia' | 'yo'; txt: string; hora?: string }

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
}

export const CONVERSACIONES: Conversacion[] = [
  {
    id: 'v1', nombre: 'Valeria G.', tag: 'Lead', color: '#22c55e', canal: 'wa', cola: 'humano', hora: '10:24', esperando: '4 h',
    msgs: [
      { de: 'ellos', txt: '¡Hola! Quería saber si el serum sirve para piel mixta', hora: '10:21' },
      { de: 'ia', txt: '¡Sí! Es ideal para piel mixta: hidrata sin generar grasa en la zona T. Te dejo el link 👇', hora: '10:22' },
      { de: 'ellos', txt: 'Perfecto, ¿hacen envío a CABA?', hora: '10:24' },
    ],
  },
  {
    id: 'v2', nombre: 'Julián D.', tag: 'Post-venta', color: '#c084fc', canal: 'wa', cola: 'ia', hora: '09:12', esperando: '—',
    msgs: [
      { de: 'ellos', txt: 'Mi pedido llegó, gracias 🙏', hora: '09:10' },
      { de: 'ia', txt: '¡Nos alegra! ¿Podés dejarnos una reseña de 5⭐? Nos ayuda un montón.', hora: '09:12' },
    ],
  },
  {
    id: 'v3', nombre: 'Camila T.', tag: 'Lead', color: '#22c55e', canal: 'msgr', cola: 'ia', hora: 'Ayer', esperando: '—',
    msgs: [
      { de: 'ellos', txt: '¿Hacen envíos a Córdoba? Y quería saber opciones de pago en cuotas 🙏' },
      { de: 'ia', txt: '¡Sí, llegamos a todo el país! Córdoba: 3-5 días hábiles. Podés pagar con 3 o 6 cuotas sin interés.' },
    ],
  },
  {
    id: 'v4', nombre: 'Martín R.', tag: 'Soporte', color: '#ef4444', canal: 'msgr', cola: 'humano', hora: 'Ayer', esperando: '11 h',
    msgs: [
      { de: 'ellos', txt: 'Quiero cancelar mi suscripción, no me está funcionando el producto' },
      { de: 'ia', txt: '¡Lamento escucharlo! ¿Podés contarme el motivo? Quizás lo podemos solucionar.' },
      { de: 'ellos', txt: 'No, directamente quiero cancelar. Es un tema de mi banco, necesito que alguien me lo resuelva.' },
    ],
  },
];

export const FLUJOS = [
  {
    id: 'f1', nombre: 'Secuencia de Bienvenida', grupo: 'Mensajes', estado: 'Activo',
    pasos: [
      { delay: 'Al instante', txt: '👋 ¡Hola {nombre}! Gracias por escribirnos. Soy Rumi, el vendedor de la tienda.' },
      { delay: '2 min después', txt: 'Veo que te interesan productos de skincare. ¿Qué tipo de piel tenés? 🤔' },
      { delay: 'Si responde', txt: '→ Recomiendo productos según su tipo de piel.', condicion: true },
      { delay: '1 día después', txt: 'Solo pasé a recordarte: tenemos envío gratis en compras +$59.' },
    ],
  },
  {
    id: 'f2', nombre: 'Recupera carritos', grupo: 'Ventas', estado: 'Activo',
    pasos: [
      { delay: '1 h después', txt: '🛒 ¡Hola! Quedó algo en tu carrito. ¿Te ayudo a terminar la compra?' },
      { delay: '24 h después', txt: 'Tu carrito sigue guardado. Te dejé un cupón de 15%: VOLVE15 ⏳' },
      { delay: 'Si no responde', txt: '→ Marcar lead como "frío" y pausar la secuencia.', condicion: true },
    ],
  },
  {
    id: 'f3', nombre: 'Recompra a los 30 días', grupo: 'Recuperación', estado: 'Activo',
    pasos: [
      { delay: '30 días después de la compra', txt: '¡Hola {nombre}! Ya se te debe estar terminando el serum. ¿Te reservo otro?' },
      { delay: 'Si no responde', txt: '→ Ofrecer 10% en la segunda compra.', condicion: true },
    ],
  },
  {
    id: 'f4', nombre: 'Programa de referidos', grupo: 'Referidos', estado: 'En pausa',
    pasos: [
      { delay: '7 días después de la compra', txt: '¿Le recomendarías el serum a alguien? Con tu código ganás 250 créditos 🎁' },
    ],
  },
];

// ---------------------------------------------------------------------------------------------
// MERCADO — competencia real (sin Google Maps, ver doc 02 §1.6)
// ---------------------------------------------------------------------------------------------

export const COMPETIDORES = [
  { nombre: 'Tu marca', anuncios: 6, gasto: 'medio', precio: 34, leads: 48, propio: true, tend: 'up' as const },
  { nombre: 'Tienda Norte', anuncios: 14, gasto: 'alto', precio: 29, leads: 82, propio: false, tend: 'up' as const },
  { nombre: 'Belleza & Co', anuncios: 9, gasto: 'medio', precio: 39, leads: 61, propio: false, tend: 'flat' as const },
  { nombre: 'DermaMarket', anuncios: 11, gasto: 'alto', precio: 44, leads: 37, propio: false, tend: 'up' as const },
  { nombre: 'Green Beauty', anuncios: 4, gasto: 'bajo', precio: 59, leads: 22, propio: false, tend: 'down' as const },
];

export const ANGULOS = [
  { nombre: 'Resultado', pct: 38, ej: '"Piel pareja en 14 días. Sin filtros."' },
  { nombre: 'Tecnología', pct: 27, ej: '"Vitamina C estabilizada al 10%. Formulación real."' },
  { nombre: 'Emoción', pct: 21, ej: '"Volvé a mirarte al espejo con ganas."' },
  { nombre: 'Precio', pct: 14, ej: '"El mismo activo que las marcas de $90."' },
];

export const TENDENCIAS = [
  { label: 'Demanda de "serum vitamina C"', num: '+32%', up: true, width: '78%', tag: 'Búsqueda' },
  { label: 'Formato before/after en alza', num: '+41%', up: true, width: '88%', tag: 'Formato' },
  { label: 'Crecimiento D2C skincare', num: '+24%', up: true, width: '62%', tag: 'Mercado' },
  { label: 'Precio de Tienda Norte', num: '-15%', up: false, width: '55%', tag: 'Competencia' },
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
    estado: 'conectada', detalle: 'Tu token · +54 9 11 5555-2341', capacidades: ['Enviar mensajes', 'Recibir webhooks', 'Plantillas'] },
  { key: 'meta_ads', nombre: 'Meta Ads', rol: 'Publicar y medir', emoji: '📣', color: '#a855f7',
    estado: 'conectada', detalle: 'act_8442119 · venció en 41 días', capacidades: ['Leer métricas', 'Crear campañas', 'Pausar'] },
  { key: 'instagram', nombre: 'Instagram', rol: 'Contenido orgánico', emoji: '📸', color: '#e11d48',
    estado: 'conectada', detalle: '@skincare.natural', capacidades: ['Leer métricas', 'Publicar'] },
  { key: 'email', nombre: 'Email (tu Klaviyo)', rol: 'Carrito abandonado', emoji: '✉️', color: '#f59e0b',
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
// La propuesta se prueba en un mercado simulado ANTES de gastar un peso.
// ---------------------------------------------------------------------------------------------

export const ETAPAS_MOTOR = [
  { t: 'Ingesta', d: 'La propuesta entra al mercado para ser probada.' },
  { t: 'Reacción', d: 'El mercado reacciona como lo haría tu audiencia real.' },
  { t: 'Debate', d: 'Los bots discuten pros y contras en el chat lateral.' },
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
  { t: 'analisis', m: 'Simulando reacción esperada de 500 observadores' },
  { t: 'positivo', m: 'CPA proyectado cae bajo el umbral. Vale publicar' },
  { t: 'positivo', m: 'Señal de compra real detectada en los comentarios simulados' },
];

export const VOTOS_MOTOR = ['Aprueba', 'Rechaza', 'Aprueba con reserva', 'Neutro'];

// ---------------------------------------------------------------------------------------------
// QUÉ HACE CADA BOTÓN — para que no haya que adivinar
// ---------------------------------------------------------------------------------------------

export const CONSECUENCIA: Record<string, string> = {
  a1: 'Aplicar pausa el conjunto "lookalike frío" y mueve sus $40/día al conjunto que sí convierte. Podés deshacerlo 24 h.',
  a2: 'Responder manda el mensaje por tu WhatsApp real. "Dejar que Rumi responda" la envía sin que la leas antes.',
  a3: 'Ver variantes abre las 6 piezas que Nia escribió con el ángulo de ingredientes. Silenciar la esconde 7 días.',
  a4: 'Ver créditos muestra qué los consumió. Auto-recarga paga el próximo paquete cuando bajes de 500.',
  a5: 'Crear campaña deja el borrador listo sin gastar nada todavía: publicar sigue necesitando tu OK.',
  a6: 'Deshacer reactiva el conjunto tal como estaba a las 03:12, con su presupuesto original.',
  d1: 'Aprobar publica la campaña y empieza a gastar $30/día. Ajustar la deja lista sin publicar.',
  d2: 'Aprobar sube el presupuesto a $54/día por 7 días. "Ajustar a 20%" sube a $48/día.',
  d3: 'Enviar link manda el cobro de $59 por WhatsApp. Descartar lo deja sin enviar y avisa a Rumi.',
};

export const TAREAS_EXCLUIDAS = [
  'No pedimos margen de ganancia ni frecuencia de compra: los inferimos de tus ventas y conversaciones.',
  'No te pedimos que subas documentos para que "la IA los lea".',
  'No hay mapa de Google ni integraciones que no uses.',
  'No vas a ver 15 tipos de campaña ni 218 casillas por llenar.',
];

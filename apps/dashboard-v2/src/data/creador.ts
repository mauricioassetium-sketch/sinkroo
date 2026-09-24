// =============================================================================================
// SINKROO CREADORES — la piel de creador, ENFOCADA EN CONTENIDO.
//
// CORRECCIÓN DEL DUEÑO (manda sobre todo lo anterior):
//   «el modelo ayuda al creador de contenido a crear contenido, verificarlo y publicarlo; no le
//    vende al creador de contenido, por lo menos no ahora. Cambiá todo el modelo para que la función
//    principal sea eso: ayudarlo con el proceso de contenido, verificar su registro y publicarlo en
//    las diferentes redes, automatizar su avatar para crear por él. No hablemos de ventas a nadie acá
//    por ahora. La idea es usar a los agentes y el sistema para mover la cuenta del creador y
//    hacerla crecer, lo que necesite según su nicho.»
//
// Por eso acá NO hay marcas, pitches, deals, rates ni pipeline comercial. El trabajo del equipo es:
//
//   1. PRODUCIR   · tu avatar y Nia crean las piezas con tu material.
//   2. VERIFICAR  · el panel de 5 puntúa cada pieza antes de que salga (mínimo 80).
//   3. PUBLICAR   · Kai las programa y las publica en tus redes, en la mejor ventana.
//   4. CRECER     · Rex y Sol mueven la cuenta según el nicho: seguidores, alcance, retención.
//   5. COMUNIDAD  · Rumi contesta comentarios y mensajes de la audiencia.
//
// El motor es el MISMO de Negocios: los 6 agentes conservan nombre, color y rol técnico; el dial de
// autonomía, los guardrails, el panel de 5, los créditos y las vistas son los mismos.
// =============================================================================================

export type Piel = 'empresa' | 'creador';

// ---------------------------------------------------------------------------------------------
// 1 · QUIÉN ES EL CREADOR Y QUÉ BUSCA (la Ficha alimenta todo lo que el equipo produce)
// ---------------------------------------------------------------------------------------------

export const OBJETIVOS_PERFIL: { key: string; nombre: string; icono: string; quien: string; paraQue: string; kpi: string[] }[] = [
  { key: 'crecer', nombre: 'Hacer crecer la cuenta', icono: '📈',
    quien: 'Querés más gente que te siga y que vuelva.',
    paraQue: 'El equipo trabaja el alcance y la retención: qué formato retiene, a qué hora hay más gente y qué serie conviene sostener.',
    kpi: ['Seguidores nuevos', 'Alcance por pieza', 'Retención de los primeros 3 segundos'] },
  { key: 'comunidad', nombre: 'Armar comunidad', icono: '❤️',
    quien: 'Te importa que te contesten y que la gente vuelva a comentar.',
    paraQue: 'El equipo prioriza lo que genera conversación: preguntas, respuesta a comentarios y series que la gente sigue.',
    kpi: ['Comentarios por pieza', 'Guardados y compartidos', 'Gente que vuelve'] },
  { key: 'autoria', nombre: 'Mostrar autoridad en el nicho', icono: '🎓',
    quien: 'Querés que te vean como referente de tu tema.',
    paraQue: 'El equipo arma contenido que enseña: el por qué, los errores comunes y las comparaciones.',
    kpi: ['Guardados', 'Alcance de las piezas que enseñan', 'Preguntas que llegan'] },
  { key: 'ritmo', nombre: 'Publicar sin depender de mí', icono: '⏱️',
    quien: 'Tenés poco tiempo y querés constancia.',
    paraQue: 'El equipo produce y programa toda la semana con el avatar, y vos sólo aprobás.',
    kpi: ['Piezas publicadas por semana', 'Días seguidos publicando', 'Aprobaciones pendientes'] },
];

// ---------------------------------------------------------------------------------------------
// 1b · PARA QUÉ TIPO DE CREADOR ES ESTA HERRAMIENTA
//
// REGLA DEL DUEÑO: «debe ser una herramienta para todo el tipo de creador de contenido». Nada de
// acá asume un rubro —ni belleza, ni moda, ni comida— ni un perfil: sirve igual para el que publica
// por gusto, para el que hace crecer una audiencia, para el que graba para otros, para el que
// muestra su oficio o para el que habla de su ciudad.
//
// Lo que cambia entre tipos no es el motor: es QUÉ publica, QUÉ métrica persigue y CADA CUÁNTO
// puede. Eso sale de acá y el tipo se elige en el onboarding (se puede cambiar después).
// ---------------------------------------------------------------------------------------------

export const TIPOS_CREADOR: {
  key: string; nombre: string; icono: string; quien: string; publica: string; persigue: string; ritmo: string; ejemploNicho: string;
}[] = [
  { key: 'constancia', nombre: 'Publico por gusto', icono: '🌱',
    quien: 'Publicás lo que te gusta, todavía sin una meta clara.',
    publica: 'Lo que se te ocurre, cuando podés',
    persigue: 'Constancia: no dejar la cuenta quieta',
    ritmo: '2 o 3 piezas por semana',
    ejemploNicho: 'cocina casera, viajes, libros, tu día' },
  { key: 'audiencia', nombre: 'Hago crecer mi audiencia', icono: '📈',
    quien: 'Ya tenés gente siguiéndote y querés más.',
    publica: 'Series y formatos que retienen',
    persigue: 'Seguidores, alcance y retención',
    ritmo: '4 o 5 piezas por semana',
    ejemploNicho: 'fitness, humor, música, lifestyle' },
  { key: 'encargos', nombre: 'Grabo para otros', icono: '🎥',
    quien: 'Te encargan piezas y las producís.',
    publica: 'Las piezas que te piden, y tu portafolio',
    persigue: 'Cumplir entregas y tener muestras al día',
    ritmo: 'Lo que te pidan, con tu portafolio al día',
    ejemploNicho: 'UGC de producto, unboxing, demostraciones' },
  { key: 'oficio', nombre: 'Muestro mi oficio', icono: '🎓',
    quien: 'Tenés un servicio o un saber y lo mostrás.',
    publica: 'Contenido que enseña: el por qué y los errores comunes',
    persigue: 'Autoridad: que te vean como referente',
    ritmo: '3 piezas por semana, una que enseñe',
    ejemploNicho: 'consultoría, diseño, salud, oficios' },
  { key: 'local', nombre: 'Hablo de mi ciudad', icono: '📍',
    quien: 'Tu gente está cerca: tu barrio o tu zona.',
    publica: 'Lugares, novedades y cosas de la zona',
    persigue: 'Alcance local y comunidad que interactúa',
    ritmo: '3 o 4 piezas por semana',
    ejemploNicho: 'gastronomía local, eventos, comercios del barrio' },
];

/** El tipo elegido: la herramienta es la misma para todos, cambia lo que se publica y se mide. */
export const TIPO_DE_LA_CUENTA = {
  key: 'audiencia',
  nombre: 'Hago crecer mi audiencia',
  icono: '📈',
  nota: 'Se elige en el onboarding y se puede cambiar cuando quieras: el equipo rearma el plan con el tipo nuevo.',
};


export const FICHA_CREADOR = {
  nombre: 'Camila Ferreyra',
  usuario: '@cami.ferreyra',
  objetivo: 'Hacer crecer la cuenta',
  nicho: 'Belleza y skincare',
  subtemas: ['Rutinas simples', 'Piel sensible', 'Productos que sí funcionan'],
  tono: 'Cercano y directo',
  tabues: 'No muestra su casa, no habla de política, no promete resultados médicos.',
  tiempoSemana: 'Unas 4 horas por semana para grabar',
  equipamiento: 'Celular (iPhone 13) + aro de luz',
  redes: [
    { red: 'Instagram', usuario: '@cami.ferreyra', seguidores: '9.400', interaccion: '6,2%', estado: 'conectada' },
    { red: 'TikTok', usuario: '@cami.ferreyra', seguidores: '4.100', interaccion: '8,1%', estado: 'conectada' },
    { red: 'YouTube Shorts', usuario: '@camicrea', seguidores: '1.200', interaccion: '4,4%', estado: 'por conectar' },
  ],
  formatoDominante: 'Video vertical, cara a cámara',
  lecturaDelPerfil: 'Publica parejo y su formato fuerte es el video corto con cara: es lo que más retiene.',
  mejorVentana: 'De 19:00 a 21:00, cuando su audiencia está con el celular',
  peorVentana: 'Antes de las 9 de la mañana: ahí el alcance cae a la mitad',
  ritmoActual: '3 publicaciones por semana',
  ritmoObjetivo: '5 publicaciones por semana',
};

// ---------------------------------------------------------------------------------------------
// 2 · LOS 6 AGENTES, CALIBRADOS A CONTENIDO (mismo nombre, mismo color, mismo rol técnico)
// ---------------------------------------------------------------------------------------------

export const AGENTES_CREADOR: {
  id: string; nombre: string; color: string; tecnico: string; enNegocios: string; enCreadores: string; que: string;
}[] = [
  { id: 'lux', nombre: 'Lux', color: '#a855f7', tecnico: 'market-analyst',
    enNegocios: 'Lee los anuncios de tu competencia y vigila precios.',
    enCreadores: 'Vigía del nicho: qué trendea, qué formato retiene hoy y qué está copando el feed de tu tema.',
    que: 'Revisa tu nicho cada 15 minutos y te deja las ideas con su por qué.' },
  { id: 'rex', nombre: 'Rex', color: '#6366f1', tecnico: 'marketing-strategist',
    enNegocios: 'Define el ángulo, la audiencia y el plan del mes.',
    enCreadores: 'Estratega de crecimiento: tu posicionamiento, hacia dónde crecer y el plan de contenido del mes.',
    que: 'Arma la semana: qué series sostener, cuántas piezas y con qué objetivo.' },
  { id: 'nia', nombre: 'Nia', color: '#ec4899', tecnico: 'creative-strategist',
    enNegocios: 'Escribe textos y arma imágenes y prompts de video.',
    enCreadores: 'Creativo: guiones, hooks, captions y las piezas generadas — con el avatar o con tu material.',
    que: 'Escribe y arma cada pieza: el guion, el hook, el texto de pantalla y el caption.' },
  { id: 'kai', nombre: 'Kai', color: '#22c55e', tecnico: 'media-buyer',
    enNegocios: 'Maneja el presupuesto, las plataformas y las pujas.',
    enCreadores: 'Publicador: programa y publica en tus redes en la mejor ventana, y cuida el orden y la constancia.',
    que: 'Publica por vos y sostiene el ritmo: avisa si una pieza no salió y la reintenta.' },
  { id: 'sol', nombre: 'Sol', color: '#f59e0b', tecnico: 'performance-analyst',
    enNegocios: 'Mide resultados y calibra el modelo de predicción.',
    enCreadores: 'Analista de contenido: qué pieza funcionó, cuánto retuvo y qué hizo crecer la cuenta.',
    que: 'Mide cada pieza y te dice el viernes qué funcionó y qué cambiar.' },
  { id: 'rumi', nombre: 'Rumi', color: '#8b5cf6', tecnico: 'sales-closer',
    enNegocios: 'Atiende y cierra conversaciones con clientes.',
    enCreadores: 'Comunidad: contesta comentarios y mensajes de tu audiencia y te avisa cuando alguien espera algo tuyo.',
    que: 'Contesta lo repetido, te trae lo importante y detecta de qué habla tu gente.' },
];

// ---------------------------------------------------------------------------------------------
// 3 · EL AVATAR — el corazón de la piel de creador: el equipo crea por él
// ---------------------------------------------------------------------------------------------

export const AVATAR = {
  nombre: 'Tu avatar',
  estado: 'listo' as 'sin-entrenar' | 'entrenando' | 'listo',
  entrenadoCon: '18 piezas tuyas, de Instagram y TikTok',
  parecido: 94,
  voz: 'Tu voz, con tu tono (aprendida de 6 piezas habladas)',
  quePuede: [
    { t: 'Video tuyo hablando', s: 'Cara y voz con el guion que escribió Nia. Es lo que más retiene en tu nicho.' },
    { t: 'Fotos y carruseles', s: 'Con tu cara en situaciones nuevas, o tu producto con tu estilo de luz.' },
    { t: 'Clips cortos', s: 'Cortes de 8 a 15 segundos listos para historias o reel.' },
    { t: 'Historias del día', s: 'Dos o tres placas contando algo, con tu tipografía y tus colores.' },
  ],
  limites: [
    'Nada creado por el avatar se publica sin pasar por el panel de 5 y por tu OK.',
    'El avatar no inventa precios ni promesas: usa tu ficha y tu material.',
    'Podés apagarlo cuando quieras: lo que ya creó queda como borrador y no se pierde.',
  ],
  gasto: [
    { pieza: 'Video del avatar (5 s)', creditos: 75 },
    { pieza: 'Video del avatar premium (5 s)', creditos: 208 },
    { pieza: 'Foto con tu cara', creditos: 5 },
    { pieza: 'Imagen hero', creditos: 7 },
    { pieza: 'Clips de un video tuyo', creditos: 1 },
  ],
};

// ---------------------------------------------------------------------------------------------
// 4 · EL CICLO DE UNA PIEZA — producir, verificar, publicar, medir
// El estado de una pieza dice en qué parte del ciclo está: es el idioma de toda la piel.
// ---------------------------------------------------------------------------------------------

export const CICLO_PIEZA = ['Borrador', 'En verificación', 'Aprobada por el panel', 'Publicada', 'Medida'] as const;
export type EstadoPieza = typeof CICLO_PIEZA[number];

export const CICLO_PASOS = [
  { nombre: 'Producir', quien: 'Nia y tu avatar', que: 'Escriben el guion, arman la pieza y la dejan como borrador.' },
  { nombre: 'Verificar', quien: 'El panel de 5', que: 'La puntúa de 0 a 100. Con 80 o más aprueba; si no, vuelve con la objeción.' },
  { nombre: 'Publicar', quien: 'Kai', que: 'La programa en tus redes, en la ventana que le conviene a tu audiencia.' },
  { nombre: 'Crecer', quien: 'Rex y Sol', que: 'Miden qué retuvo, qué hizo crecer la cuenta y qué cambia la semana que viene.' },
];

export const PIEZAS_CREADOR: {
  key: string; nombre: string; para: string; creditos: string; icono: string; red: string;
}[] = [
  { key: 'video', nombre: 'Video del avatar', para: 'Cara y voz con un guion: el formato que más retiene.', creditos: '75 créditos (5 s) · 208 el premium', icono: '🎬', red: 'Instagram · TikTok' },
  { key: 'reel', nombre: 'Reel con tu material', para: 'Tus videos ya grabados, armados con el guion de Nia.', creditos: '1 crédito el remaster', icono: '📹', red: 'Instagram · TikTok' },
  { key: 'foto', nombre: 'Foto o carrusel', para: 'Tu cara o tu producto, con tu luz y tu estilo.', creditos: '5 créditos la foto · 7 la hero', icono: '📸', red: 'Instagram' },
  { key: 'historias', nombre: 'Secuencia de historias', para: 'Dos o tres placas contando algo del día.', creditos: '1 crédito por texto · 5 si genera', icono: '📱', red: 'Instagram' },
  { key: 'clip', nombre: 'Clip corto', para: 'De un video tuyo largo salen los mejores 10 segundos.', creditos: '1 crédito', icono: '✂️', red: 'Reel · Shorts' },
  { key: 'texto', nombre: 'Texto y caption', para: 'El hook, el guion y el texto de la publicación.', creditos: '1 crédito', icono: '✍️', red: 'Todas' },
];

export const GRILLA_CREDITOS: { pieza: string; creditos: number; quien: string }[] = [
  { pieza: 'Texto (hook, caption, guion)', creditos: 1, quien: 'Nia' },
  { pieza: 'Imagen simple', creditos: 1, quien: 'Nia' },
  { pieza: 'Foto con tu cara', creditos: 5, quien: 'Avatar' },
  { pieza: 'Imagen hero', creditos: 7, quien: 'Nia' },
  { pieza: 'Imagen con texto montado', creditos: 15, quien: 'Nia' },
  { pieza: 'Video del avatar (5 s)', creditos: 75, quien: 'Avatar' },
  { pieza: 'Video del avatar premium (5 s)', creditos: 208, quien: 'Avatar' },
  { pieza: 'Clips de un video tuyo', creditos: 1, quien: 'Kai' },
];

export const PLANES_CREADOR: {
  key: string; nombre: string; precio: number; creditosMes: number; habilita: string; paraQuien: string;
  incluye: string[]; destacado?: boolean;
}[] = [
  { key: 'bienvenida', nombre: 'Bienvenida', precio: 0, creditosMes: 100,
    habilita: '100 créditos una vez, para probar al equipo',
    paraQuien: 'Recién llegás y querés ver qué produce el equipo con tu contenido.',
    incluye: ['100 créditos de regalo, una sola vez', 'Tu primera pieza verificada por el panel', 'El plan de la primera semana'] },
  { key: 'creador', nombre: 'Creador', precio: 29, creditosMes: 1500,
    habilita: 'Los 6 agentes, la vigilancia del nicho cada 15 minutos y publicación en 2 redes',
    paraQuien: 'Publicás seguido y querés que el equipo te sostenga el ritmo.',
    incluye: ['1.500 créditos por mes', 'Los 6 agentes calibrados a tu nicho', 'Vigilancia del nicho cada 15 minutos', 'El panel verifica cada pieza', 'Publicación automática en 2 redes', 'Plan del lunes y resumen del viernes'] },
  { key: 'pro', nombre: 'Pro', precio: 59, creditosMes: 4000,
    habilita: '+ Avatar entrenado, publicación en todas tus redes y clips de tus videos',
    paraQuien: 'Querés que el equipo cree por vos y sostenga el crecimiento.',
    incluye: ['4.000 créditos por mes', 'Avatar entrenado con tus piezas', 'Publicación en todas tus redes', 'Clips y remaster de tus videos', 'Prioridad en la cola de generación', 'Analítica por pieza y por red'],
    destacado: true },
  { key: 'topup', nombre: 'Top-up', precio: 10, creditosMes: 1000,
    habilita: 'Pack extra de 1.000 créditos, no caduca',
    paraQuien: 'Se te acabaron los créditos del mes y no querés cambiar de plan.',
    incluye: ['1.000 créditos extra', 'No caducan', 'Se compran cuando querés'] },
];

// ---------------------------------------------------------------------------------------------
// 5 · EL TRABAJO DE LA SEMANA: producir, verificar, publicar y crecer
// ---------------------------------------------------------------------------------------------

export const PIEZAS_DEL_MES: {
  id: string; titulo: string; tipo: string; estado: EstadoPieza; puntaje: number; red: string;
  cuando: string; creditos: number; quien: string; nota?: string; retencion?: string;
}[] = [
  { id: 'p1', titulo: 'El error que arruina tu piel en verano', tipo: 'Video del avatar', estado: 'Publicada', puntaje: 89, red: 'Instagram', cuando: 'hoy 19:30', creditos: 75, quien: 'Avatar + Nia', retencion: '61% a los 3 s' },
  { id: 'p2', titulo: 'Rutina de noche en 3 pasos', tipo: 'Reel con tu material', estado: 'Publicada', puntaje: 86, red: 'TikTok', cuando: 'ayer 20:10', creditos: 1, quien: 'Nia', retencion: '54% a los 3 s' },
  { id: 'p3', titulo: 'Antes y después de 14 días', tipo: 'Reel con tu material', estado: 'Aprobada por el panel', puntaje: 91, red: 'Instagram', cuando: 'mañana 19:00', creditos: 1, quien: 'Nia' },
  { id: 'p4', titulo: '¿Sirve el serum de vitamina C?', tipo: 'Video del avatar', estado: 'Aprobada por el panel', puntaje: 84, red: 'TikTok', cuando: 'jueves 20:30', creditos: 75, quien: 'Avatar + Nia' },
  { id: 'p5', titulo: '3 mitos del protector solar', tipo: 'Foto o carrusel', estado: 'En verificación', puntaje: 0, red: 'Instagram', cuando: '—', creditos: 5, quien: 'Nia' },
  { id: 'p6', titulo: 'Mi rutina cuando tengo la piel reactiva', tipo: 'Video del avatar', estado: 'Borrador', puntaje: 0, red: 'TikTok', cuando: '—', creditos: 75, quien: 'Avatar' },
  { id: 'p7', titulo: 'Lo que nadie te dice del ácido hialurónico', tipo: 'Video del avatar', estado: 'Borrador', puntaje: 78, red: 'Instagram', cuando: '—', creditos: 75, quien: 'Avatar',
    nota: 'El panel la frenó en 78: el hook promete más de lo que la pieza explica.' },
];

export const PLAN_DEL_MES = {
  serie: 'Piel real',
  piezasPorSemana: 5,
  mezcla: [
    { tipo: 'Video del avatar', cuantas: 2, para: 'Es lo que más retiene en tu nicho.' },
    { tipo: 'Reel con tu material', cuantas: 2, para: 'Aprovecha lo que ya grabaste y sostiene el ritmo.' },
    { tipo: 'Secuencia de historias', cuantas: 1, para: 'Mantiene la conversación con los que ya te siguen.' },
  ],
  objetivo: 'Pasar de 3 a 5 publicaciones por semana y subir la retención de los primeros 3 segundos.',
};

export const PUBLICACIONES: {
  id: string; pieza: string; red: string; cuando: string; estado: 'programada' | 'publicada' | 'en cola' | 'falló'; ventana: string;
}[] = [
  { id: 'pu1', pieza: 'El error que arruina tu piel en verano', red: 'Instagram', cuando: 'hoy 19:30', estado: 'publicada', ventana: 'Tu mejor ventana' },
  { id: 'pu2', pieza: 'Rutina de noche en 3 pasos', red: 'TikTok', cuando: 'ayer 20:10', estado: 'publicada', ventana: 'Tu mejor ventana' },
  { id: 'pu3', pieza: 'Antes y después de 14 días', red: 'Instagram', cuando: 'mañana 19:00', estado: 'programada', ventana: 'Tu mejor ventana' },
  { id: 'pu4', pieza: '¿Sirve el serum de vitamina C?', red: 'TikTok', cuando: 'jueves 20:30', estado: 'programada', ventana: 'Tu mejor ventana' },
  { id: 'pu5', pieza: '3 mitos del protector solar', red: 'Instagram', cuando: 'viernes 19:00', estado: 'en cola', ventana: 'Esperando que el panel la apruebe' },
  { id: 'pu6', pieza: 'Clip: cómo aplico el sérum', red: 'YouTube Shorts', cuando: 'sábado 12:00', estado: 'falló', ventana: 'YouTube Shorts todavía no está conectado' },
];

export const CRECIMIENTO = {
  seguidores: { total: '14.700', nuevosSemana: '+412', meta: '+500' },
  alcance: { total: '128.400', promedio: '18.340 por pieza', variacion: '+22%' },
  retencion: { a3s: '58%', meta: '65%', nota: 'Es la métrica que más mueve el alcance en tu nicho.' },
  interaccion: { valor: '6,9%', variacion: '+0,7 pts' },
  guardados: { valor: '1.240', variacion: '+18%' },
  porRed: [
    { red: 'Instagram', seguidores: '9.400', nuevos: '+248', alcance: '82.100', mejorPieza: 'El error que arruina tu piel en verano' },
    { red: 'TikTok', seguidores: '4.100', nuevos: '+141', alcance: '40.200', mejorPieza: 'Rutina de noche en 3 pasos' },
    { red: 'YouTube Shorts', seguidores: '1.200', nuevos: '+23', alcance: '6.100', mejorPieza: 'sin datos: falta conectar la red' },
  ],
  queFunciono: [
    { t: 'Video con cara y voz en los primeros 3 segundos', s: 'Retuvo 61% contra 38% de los que arrancan con el producto.', etiqueta: '+23 pts', tono: 'green' as const },
    { t: 'Hook con el problema antes que el producto', s: '«El error que arruina tu piel» duplicó el alcance promedio.', etiqueta: '+2,1x', tono: 'green' as const },
    { t: 'Publicar entre 19 y 21', s: 'Tus piezas de la noche rinden 40% más que las de la mañana.', etiqueta: '+40%', tono: 'green' as const },
    { t: 'Unboxing sin hablar', s: 'Bajó 9% en tu nicho: no conviene gastar créditos ahí.', etiqueta: '−9%', tono: 'muted' as const },
  ],
  plan: [
    'Sostener 5 publicaciones por semana (hoy vas por 3).',
    'Dos videos del avatar por semana: es el formato que retiene.',
    'Cerrar cada pieza con una pregunta para subir los comentarios.',
    'Conectar YouTube Shorts: son 6.100 de alcance que hoy no se usan.',
  ],
};

export const NICHO = {
  trends: [
    { t: 'Antes y después con piel real', num: '+41%', lectura: 'Es el formato que más crece en tu nicho y el que mejor retiene. Conviene grabar 2 esta semana.' },
    { t: '“Lo probé 30 días”', num: '+26%', lectura: 'Retiene más que una reseña suelta: el público quiere el paso del tiempo.' },
    { t: 'Rutina de noche en 30 s', num: '+18%', lectura: 'Funciona con tu audiencia actual: es tu formato dominante.' },
    { t: 'Unboxing sin hablar', num: '-9%', lectura: 'Bajó: ahora piden voz y cara. No gastes créditos ahí.' },
  ],
  formatosDelFeed: [
    { f: 'Video vertical con cara a cámara', pct: 62 },
    { f: 'Antes y después', pct: 21 },
    { f: 'Texto sobre pantalla', pct: 12 },
    { f: 'Producto solo, sin cara', pct: 5 },
  ],
  temasQuePiden: [
    { t: 'Qué hacer con la piel reactiva', consultas: 34, lectura: 'Es la pregunta que más se repite en tus comentarios: da para una serie.' },
    { t: 'Protector solar en días nublados', consultas: 21, lectura: 'Muy pedido y casi nadie lo contesta bien en el nicho.' },
    { t: 'Orden de los productos en la rutina', consultas: 18, lectura: 'Formato explicativo: es el que más guardados genera.' },
    { t: 'Productos que no valen lo que cuestan', consultas: 12, lectura: 'Tiene riesgo: conviene hablarlo sin marcar productos puntuales.' },
  ],
  ventanas: [
    { franja: '19:00 a 21:00', rendimiento: 'La mejor: 40% más de alcance que la mañana.', usarla: true },
    { franja: '12:00 a 14:00', rendimiento: 'Aceptable para historias cortas.', usarla: false },
    { franja: '08:00 a 10:00', rendimiento: 'La peor de tu audiencia: la mitad del alcance.', usarla: false },
  ],
  precioProduccion: [
    { nivel: 'Lo más caro de producir', rango: '208 créditos', nota: 'Video premium del avatar: se usa para la pieza principal de la semana.' },
    { nivel: 'Lo que más rendimiento da', rango: '75 créditos', nota: 'Video del avatar de 5 s: es el formato que más retiene en tu nicho.' },
    { nivel: 'Lo más barato', rango: '1 crédito', nota: 'Clips de tus videos y textos: sirven para sostener el ritmo entre las piezas grandes.' },
  ],
};

export const COMENTARIOS: {
  id: string; de: string; red: string; texto: string; tipo: 'pregunta' | 'elogio' | 'consulta-personal' | 'critica';
  propuesta: string; estado: 'espera-tu-ok' | 'contestado-por-rumi' | 'tuyo';
}[] = [
  { id: 'c1', de: 'valen.rq', red: 'Instagram', tipo: 'pregunta',
    texto: '¿Ese sérum sirve para piel mixta o solo para seca?',
    propuesta: 'Sirve para las dos: es liviano. Si tenés la zona T grasa, usalo solo de noche.', estado: 'espera-tu-ok' },
  { id: 'c2', de: 'male.torres', red: 'TikTok', tipo: 'consulta-personal',
    texto: 'Tengo la piel roja y con ardor hace una semana, ¿qué me pongo?',
    propuesta: 'Eso puede ser irritación: antes de sumar productos, andá a un dermatólogo. Mientras, sólo agua tibia y protector.', estado: 'tuyo' },
  { id: 'c3', de: 'sofi_b', red: 'Instagram', tipo: 'elogio',
    texto: 'Hice la rutina de 3 pasos y a la semana se me notó. ¡Gracias!',
    propuesta: '¡Qué bueno! Contame si seguís con el protector todos los días, que es el que hace la diferencia.', estado: 'contestado-por-rumi' },
  { id: 'c4', de: 'juancruz_88', red: 'TikTok', tipo: 'critica',
    texto: 'Otra vez hablando de productos caros, para los de afuera es imposible.',
    propuesta: 'Buen punto: la semana que viene hago una rutina completa con lo que se consigue en farmacia.', estado: 'espera-tu-ok' },
  { id: 'c5', de: 'berni.makeup', red: 'Instagram', tipo: 'pregunta',
    texto: '¿El ácido hialurónico va antes o después de la niacinamida?',
    propuesta: 'Primero el ácido hialurónico con la piel húmeda, después la niacinamida. Al revés se siente pegajoso.', estado: 'espera-tu-ok' },
];

// ---------------------------------------------------------------------------------------------
// 6 · AUTONOMÍA Y GUARDRAILS — el dial por acción, recalibrado a contenido
// ---------------------------------------------------------------------------------------------

export const AUTONOMIA_CREADOR: { accion: string; nivel: 'auto' | 'shared' | 'manual'; nota: string }[] = [
  { accion: 'Vigilar el nicho y tus métricas', nivel: 'auto',
    nota: 'Revisa tu nicho, tus métricas y tus comentarios cada 15 minutos. No tiene costo y no se puede bajar.' },
  { accion: 'Escribir guiones y crear borradores', nivel: 'auto',
    nota: 'Los borradores no publican nada: los revisás antes de que salgan.' },
  { accion: 'Crear con tu avatar', nivel: 'shared',
    nota: 'El avatar produce con tu cara y tu voz, y vos aprobás antes de que la pieza quede lista.' },
  { accion: 'Verificar cada pieza con el panel', nivel: 'auto',
    nota: 'El panel de 5 puntúa todo antes de publicarse. La verificación no cuesta créditos y no se puede saltear.' },
  { accion: 'Publicar en tus redes', nivel: 'shared',
    nota: 'Todo post pasa por tu OK antes de salir, en la ventana que le conviene a tu audiencia.' },
  { accion: 'Contestar comentarios y mensajes', nivel: 'shared',
    nota: 'Rumi propone la respuesta y vos la mandás. Lo personal o sensible te lo deja a vos.' },
  { accion: 'Frenar lo que no rinde', nivel: 'auto',
    nota: 'Frena una serie que no funciona y te avisa. Reversible 24 horas.' },
  { accion: 'Borrar o cambiar algo ya publicado', nivel: 'manual', nota: 'Nada se borra de tus redes sin que lo hagas vos.' },
];

export const GUARDRAILS_CREADOR: { nombre: string; valor: string; porQue: string }[] = [
  { nombre: 'Techo de gasto diario', valor: '300 créditos por día', porQue: 'Una idea del equipo no se come los créditos de tu semana.' },
  { nombre: 'Techo mensual', valor: 'El del plan: 1.500 o 4.000', porQue: 'Tope absoluto del mes.' },
  { nombre: 'Máximo de piezas por día', valor: '3 publicaciones', porQue: 'Publicar más de golpe cansa a tu audiencia y baja el alcance.' },
  { nombre: 'Máximo de acciones por hora', valor: '10', porQue: 'Evita bucles del equipo corrigiéndose solo.' },
  { nombre: 'Nada se publica sin verificar', valor: 'Panel de 5 · mínimo 80', porQue: 'Es lo que hace que tu cuenta no publique algo que no está a la altura.' },
  { nombre: 'Publicar requiere verificación de identidad', valor: 'KYC obligatorio', porQue: 'Riesgo legal: no se publica a nombre de alguien sin verificar.' },
  { nombre: 'No se toca una publicación tuya', valor: 'Siempre manual', porQue: 'El equipo no edita ni borra lo que ya salió con tu nombre.' },
];

// ---------------------------------------------------------------------------------------------
// 7 · EL RITMO, LAS VISTAS Y LAS FUNCIONES DE CONTENIDO
// ---------------------------------------------------------------------------------------------

export const VISTAS_CREADOR: Record<string, { nombre: string; sub: string }> = {
  hoy: { nombre: 'Hoy', sub: 'Lo que tu equipo hizo y las decisiones que esperan tu OK' },
  campanas: { nombre: 'Contenido', sub: 'Tus piezas: borrador, verificadas por el panel y publicadas' },
  conversaciones: { nombre: 'Comunidad', sub: 'Comentarios y mensajes de tu audiencia, con la respuesta propuesta' },
  mercado: { nombre: 'Nicho', sub: 'Qué trendea en tu tema, qué formato retiene y qué te piden' },
  avatar: { nombre: 'Avatar', sub: 'El equipo crea por vos con tu cara y tu voz' },
  publicacion: { nombre: 'Publicación', sub: 'Qué sale, en qué red y a qué hora' },
  crecimiento: { nombre: 'Crecimiento', sub: 'Qué hizo crecer tu cuenta esta semana y qué sigue' },
  creditos: { nombre: 'Créditos', sub: 'Saldo, grilla de producción y días de autonomía' },
  referidos: { nombre: 'Referidos', sub: 'Traé otros creadores y el equipo te devuelve créditos' },
  cuenta: { nombre: 'Cuenta y autonomía', sub: 'Tu Ficha, el dial por acción y los guardrails' },
  kyc: { nombre: 'Verificación', sub: 'Obligatoria antes de publicar en tus redes' },
  onboarding: { nombre: 'Primeros pasos', sub: 'Lo que tu equipo necesita saber de vos y de tu contenido' },
};

export const RITMO_SEMANA = {
  latido: 'Cada 15 minutos: mira tu nicho, tus métricas y tus comentarios.',
  lunes: 'La semana armada: 5 piezas planificadas, 2 con el avatar, y los temas que más te pidió tu gente.',
  miercoles: 'El equipo sigue produciendo: los borradores aparecen en Contenido con su puntaje y podés aprobarlos.',
  viernes: 'El resumen: qué pieza retuvo más, qué hizo crecer la cuenta y qué cambia la semana que viene.',
};

export const TRANSVERSALES: { icono: string; nombre: string; que: string }[] = [
  { icono: '🎙', nombre: 'Modo nota de voz', que: 'Mandás un audio de 2 minutos y el equipo devuelve la pieza armada: guion, clips y caption.' },
  { icono: '🎬', nombre: 'De un video sale todo', que: 'Subís un video largo y el equipo saca los mejores cortes, con caption y en tu formato.' },
  { icono: '🧑‍🎤', nombre: 'Tu avatar', que: 'El equipo crea por vos con tu cara y tu voz, cuando no tenés tiempo de grabar.' },
  { icono: '⏰', nombre: 'Aprobaciones con vencimiento', que: 'Si no respondés cerca de la mejor ventana, se reprograma y te avisa. Nunca publica sin tu sí.' },
];

export const CANAL_AVISO = {
  titulo: 'Las decisiones llegan por WhatsApp o Telegram',
  texto: 'No hace falta que entres al panel para aprobar: la pieza te llega al chat con sus botones y respondés ahí. El panel es para ver el detalle.',
};

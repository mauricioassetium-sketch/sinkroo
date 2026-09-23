import { useState, useEffect } from 'react';
import { Card, Badge, Modal, Toast, Button } from '../components/sinkroo/ui';
import { I_Sparkle, I_Users, I_Image, I_Trend, I_Check, I_Eye, I_Zap, I_Question, I_Clock, I_Robot, I_Chat, I_Vote, I_Film, I_Trophy, I_Palette, I_Chart } from '../components/sinkroo/icons';

type Agente = { id: string; nombre: string; technical: string; rol: string; tarea: string; descripcion: string; fase: number; estado: 'pensando' | 'votando' | 'analizando' | 'idle'; color: string; carga: number; historial: { tarea: string; hace: string; fecha: string; duracion: string; resultado: string }[]; };

const AGENTES: Agente[] = [
  // ===== ERA 1. LOS ESTRATEGAS (1 nodo cada uno) =====
  { id: 'A1', nombre: 'Lux', technical: 'market-analyst', rol: 'Analista de Mercado', fase: 1, tarea: 'Estudiando tu oportunidad, audiencia y competencia', descripcion: 'Lee tu contexto y tus datos para entender el terreno: cuál es tu oportunidad, quién es tu audiencia y qué hace tu competencia. Es el que abre el flujo: sin su lectura, nadie más arranca.', estado: 'analizando', color: '#a855f7', carga: 82, historial: [
    { tarea: 'Detectó 3 oportunidades de mercado en tu nicho', hace: 'hace 2 días', fecha: '2026-09-20', duracion: '2h 15m', resultado: '3 oportunidades detectadas' },
    { tarea: 'Mapeó la audiencia principal por intención de compra', hace: 'hace 3 días', fecha: '2026-09-19', duracion: '1h 40m', resultado: 'Audiencia segmentada' },
    { tarea: 'Auditoría de competencia: precios y mensajes', hace: 'hace 4 días', fecha: '2026-09-18', duracion: '3h 05m', resultado: 'Reporte de competencia listo' },
    { tarea: 'Reporte de tamaño de mercado para el serum', hace: 'hace 5 días', fecha: '2026-09-17', duracion: '1h 20m', resultado: 'Tamaño de mercado validado' },
    { tarea: 'Identificó sub-nichos con baja competencia', hace: 'hace 6 días', fecha: '2026-09-16', duracion: '2h 50m', resultado: '2 sub-nichos identificados' },
  ]},
  { id: 'A2', nombre: 'Rex', technical: 'marketing-strategist', rol: 'Estratega de Marketing', fase: 2, tarea: 'Decidiendo posicionamiento, ángulo y presupuesto', descripcion: 'Con lo que descubrió el analista, arma el plan concreto: cómo te posicionás, desde qué ángulo se vende tu oferta y cuánto se invierte. Concreto y decisivo, no teoría.', estado: 'pensando', color: '#9333ea', carga: 71, historial: [
    { tarea: 'Definió el ángulo "manchas" como ganador', hace: 'hace 2 días', fecha: '2026-09-20', duracion: '1h 30m', resultado: 'Ángulo "manchas" aprobado' },
    { tarea: 'Solicitó presupuesto del lanzamiento: $40/día', hace: 'hace 3 días', fecha: '2026-09-19', duracion: '55m', resultado: 'Presupuesto asignado: $40/día' },
    { tarea: 'Plan de campañas del mes priorizado', hace: 'hace 4 días', fecha: '2026-09-18', duracion: '2h 10m', resultado: 'Plan del mes priorizado' },
    { tarea: 'Posicionamiento premium validado contra 2 alternativas', hace: 'hace 5 días', fecha: '2026-09-17', duracion: '1h 45m', resultado: 'Posicionamiento premium sellado' },
    { tarea: 'Reasignó presupuesto de TikTok a Meta', hace: 'hace 6 días', fecha: '2026-09-16', duracion: '50m', resultado: 'TikTok → Meta: reasignado' },
  ]},
  { id: 'A3', nombre: 'Nia', technical: 'creative-strategist', rol: 'Creativa de Anuncios', fase: 3, tarea: 'Escribiendo 3 variantes de copy (60-160 caracteres)', descripcion: 'Escribe los textos del anuncio: 3 variantes con ángulos distintos (60-160 caracteres), apoyadas en tu ventaja única. Es la voz de tu marca en cada anuncio.', estado: 'pensando', color: '#ec4899', carga: 64, historial: [
    { tarea: 'Escribió 3 variantes de copy para el serum', hace: 'hace 2 días', fecha: '2026-09-20', duracion: '1h 05m', resultado: '3 variantes de copy listas' },
    { tarea: 'Ángulo "antes/después" en el carrusel de rutina', hace: 'hace 3 días', fecha: '2026-09-19', duracion: '45m', resultado: 'Carrusel con ángulo ganador' },
    { tarea: 'Hook corto para video: 5 segundos que retienen', hace: 'hace 4 días', fecha: '2026-09-18', duracion: '1h 50m', resultado: 'Hook de 5s aprobado' },
    { tarea: 'Iteración de copy basada en los 47 comentarios', hace: 'hace 5 días', fecha: '2026-09-17', duracion: '1h 15m', resultado: 'Copy v2: +12% CTR' },
    { tarea: 'Reescritura del USP en 80 caracteres', hace: 'hace 6 días', fecha: '2026-09-16', duracion: '40m', resultado: 'USP en 80 caracteres' },
  ]},
  // ===== ERA 2. LOS OPERADORES (grafos multi-nodo) =====
  { id: 'A4', nombre: 'Kai', technical: 'media-buyer', rol: 'Comprador de Medios', fase: 4, tarea: 'Lanzando la campaña y vigilando CTR, CPA y ROAS', descripcion: 'Lanza la campaña de Meta y la vigila en vivo: CTR, CPA y ROAS. Si el CPA se dispara, pausa para no quemar presupuesto.', estado: 'votando', color: '#22c55e', carga: 47, historial: [
    { tarea: 'Lanzó la campaña de retargeting con 3 creativas', hace: 'hace 2 días', fecha: '2026-09-20', duracion: '4h 30m', resultado: 'Campaña activa, 3 creativas' },
    { tarea: 'Pausó un conjunto con CPA subiendo a $28', hace: 'hace 3 días', fecha: '2026-09-19', duracion: '25m', resultado: 'CPA contenido en $28' },
    { tarea: 'Optimización de pujas', hace: 'hace 4 días', fecha: '2026-09-18', duracion: '2h 05m', resultado: '-15% CPM' },
    { tarea: 'Rotación de creativas quemadas', hace: 'hace 5 días', fecha: '2026-09-17', duracion: '1h 35m', resultado: '2 creativas rotadas' },
    { tarea: 'Primer lanzamiento de la campaña de tráfico', hace: 'hace 6 días', fecha: '2026-09-16', duracion: '3h 40m', resultado: 'Campaña de tráfico activa' },
  ]},
  { id: 'A5', nombre: 'Sol', technical: 'performance-analyst', rol: 'Analista de Resultados', fase: 5, tarea: 'Comparando la predicción de MiroFish con el resultado real', descripcion: 'Toma la predicción de MiroFish (antes de gastar) y la compara con el resultado real de la campaña. Calcula la desviación y calibra la próxima predicción. Mantiene honesto a Miro sin tocar al predictor.', estado: 'analizando', color: '#06b6d4', carga: 91, historial: [
    { tarea: 'Calibró la próxima predicción de MiroFish', hace: 'hace 2 días', fecha: '2026-09-20', duracion: '1h 45m', resultado: 'Próxima predicción calibrada' },
    { tarea: 'Comparó predicción vs resultado', hace: 'hace 3 días', fecha: '2026-09-19', duracion: '2h 20m', resultado: 'Desviación: 8%' },
    { tarea: 'Recalibración del modelo', hace: 'hace 5 días', fecha: '2026-09-17', duracion: '3h 15m', resultado: 'Modelo recalibrado' },
    { tarea: 'Cierre del loop de retargeting', hace: 'hace 6 días', fecha: '2026-09-16', duracion: '1h 25m', resultado: 'Loop cerrado' },
  ]},
  { id: 'A6', nombre: 'Rumi', technical: 'sales-closer', rol: 'Vendedor de Cierre', fase: 6, tarea: 'Conduciendo al lead por saludo, calificación y cierre', descripcion: 'Tu vendedor: detecta la intención del lead y responde según la etapa (saludo → calificación → presentación → objeción → cierre → seguimiento). Tiene memoria por lead, pide el pago al cierre, y si la IA falla cae al modo determinista.', estado: 'pensando', color: '#f59e0b', carga: 39, historial: [
    { tarea: 'Condujo 12 leads a la etapa de calificación', hace: 'hace 2 días', fecha: '2026-09-20', duracion: '2h 40m', resultado: '12 leads calificados' },
    { tarea: 'Superó la objeción de precio en 3 chats', hace: 'hace 3 días', fecha: '2026-09-19', duracion: '1h 15m', resultado: 'Objeción superada ×3' },
    { tarea: 'Pidió el pago a 5 leads en etapa de cierre', hace: 'hace 3 días', fecha: '2026-09-19', duracion: '55m', resultado: '5 pagos solicitados' },
    { tarea: 'Seguimiento a leads dormidos', hace: 'hace 5 días', fecha: '2026-09-17', duracion: '1h 50m', resultado: 'Leads dormidos reactivados' },
    { tarea: 'Saludo + detección de intención en 9 leads nuevos', hace: 'hace 6 días', fecha: '2026-09-16', duracion: '2h 05m', resultado: '9 leads con intención detectada' },
  ]},
];

type Opinion = { publi: string; emoji: string; agentes: number; aFavor: number; enContra: number; sentimiento: 'positivo' | 'mixto' | 'negativo'; score: number; insight: string; };

const OPINIONES: Opinion[] = [
  { publi: 'Serum. Antes y Después', emoji: '✨', agentes: 9, aFavor: 7, enContra: 2, sentimiento: 'positivo', score: 78, insight: 'Alta intención de prueba. El dolor "manchas" resuena con la audiencia 30-45.' },
  { publi: 'Rutina 3 pasos (carrusel)', emoji: '🧖', agentes: 9, aFavor: 5, enContra: 4, sentimiento: 'mixto', score: 52, insight: 'El orden de los pasos confunde. Recomiendan simplificar a 2 pasos.' },
  { publi: 'Oferta 2x1 Lanzamiento', emoji: '🎁', agentes: 9, aFavor: 3, enContra: 6, sentimiento: 'negativo', score: 29, insight: 'Percibe como "barato", no premium. Riesgo de dañar la marca.' },
  { publi: 'Ingredientes limpios', emoji: '🌿', agentes: 9, aFavor: 8, enContra: 1, sentimiento: 'positivo', score: 84, insight: 'Fuerte ángulo de transparencia. Ideal para ads de confianza.' },
];

type Voto = { tema: string; emoji: string; aFavor: number; enContra: number; decision: string; };

const VOTOS: Voto[] = [
  { tema: 'Lanzar oferta 2x1 esta semana', emoji: '🚀', aFavor: 64, enContra: 36, decision: 'En debate' },
  { tema: 'Subir presupuesto a TikTok', emoji: '📈', aFavor: 78, enContra: 22, decision: 'Aprobado' },
  { tema: 'Cambiar tono de WhatsApp a más informal', emoji: '💬', aFavor: 41, enContra: 59, decision: 'Rechazado' },
];

type ImgOp = { titulo: string; estilo: string; emoji: string; grad: [string, string]; ctrPred: string; confianza: number; };

const OPCIONES_IMG: ImgOp[] = [
  { titulo: 'Minimalista clean', estilo: 'Producto sobre fondo neutro', emoji: '🧴', grad: ['#a855f7', '#7e22ce'], ctrPred: '3.9%', confianza: 86 },
  { titulo: 'Lifestyle real', estilo: 'Persona aplicando el serum', emoji: '👩', grad: ['#ec4899', '#be185d'], ctrPred: '4.6%', confianza: 91 },
  { titulo: 'Antes/después', estilo: 'Resultado visible en 14 días', emoji: '🔬', grad: ['#22c55e', '#15803d'], ctrPred: '5.2%', confianza: 94 },
  { titulo: 'Ilustración flat', estilo: 'Iconos de beneficios', emoji: '🎨', grad: ['#f59e0b', '#b45309'], ctrPred: '2.1%', confianza: 58 },
];

type VideoOp = { titulo: string; gancho: string; duracion: string; formato: string; emoji: string; grad: [string, string]; ctrPred: string; watchPred: string; confianza: number; };

const OPCIONES_VIDEO: VideoOp[] = [
  { titulo: 'Hook de 3s: "¿Tu tono se ve desparejo?"', gancho: 'Pregunta directa que incomoda lo justo', duracion: '15s', formato: '9:16 vertical', emoji: '🎬', grad: ['#a855f7', '#7e22ce'], ctrPred: '4.1%', watchPred: '68%', confianza: 83 },
  { titulo: 'Antes y después en 14 días', gancho: 'Resultado visual inmediato', duracion: '22s', formato: '9:16 vertical', emoji: '⚡', grad: ['#22c55e', '#15803d'], ctrPred: '5.0%', watchPred: '74%', confianza: 90 },
  { titulo: 'UGC rutina de mañana real', gancho: 'Testimonio espontáneo, no publicidad', duracion: '30s', formato: '9:16 vertical', emoji: '👩', grad: ['#ec4899', '#be185d'], ctrPred: '4.7%', watchPred: '71%', confianza: 87 },
  { titulo: 'Lifestyle playa, verano UAE', gancho: 'Contexto aspiracional local', duracion: '18s', formato: '9:16 vertical', emoji: '🌊', grad: ['#06b6d4', '#0e7490'], ctrPred: '3.6%', watchPred: '62%', confianza: 72 },
];

const HILO: { agente: string; color: string; texto: string; hora: string; tipo: 'msg' | 'voto' | 'accion' }[] = [
  { agente: 'Lux', color: '#a855f7', texto: 'Detecté 3 oportunidades en tu nicho. La audiencia 30-45 responde al dolor "manchas", 3× más que "arrugas".', hora: '10:41', tipo: 'msg' },
  { agente: 'Rex', color: '#9333ea', texto: 'Con esa lectura, propongo redirigir el posicionamiento del serum al ángulo "manchas". Riesgo bajo.', hora: '10:42', tipo: 'msg' },
  { agente: 'Nia', color: '#ec4899', texto: 'Escribo 3 variantes sobre ese dolor: una en frío, una con testimonio y una comparativa. Todas dentro del USP.', hora: '10:43', tipo: 'msg' },
  { agente: 'Sol', color: '#06b6d4', texto: 'Confirmo con datos: 47 comentarios, 31 mencionan manchas. La intención está ahí.', hora: '10:44', tipo: 'msg' },
  { agente: 'Kai', color: '#22c55e', texto: 'Acción: lanzo el test con $80 en Meta, 3 creativas del ángulo "manchas", presupuesto diario $40.', hora: '10:45', tipo: 'accion' },
  { agente: 'Rumi', color: '#f59e0b', texto: 'Voto a favor: mover la creativa del serum a ese dolor. Los leads del ángulo "manchas" convierten 1.8× mejor.', hora: '10:46', tipo: 'voto' },
];

type ReelPuesto = { lugar: 1 | 2 | 3; tipo: 'Imagen' | 'Video'; titulo: string; emoji: string; grad: [string, string]; ctrPred: string; razon: string; };

const PODIO_REEL: ReelPuesto[] = [
  { lugar: 1, tipo: 'Video', titulo: 'Antes y después en 14 días', emoji: '⚡', grad: ['#22c55e', '#15803d'], ctrPred: '5.0%', razon: 'Gancho visual inmediato + prueba social. Mayor watch time predicho (74%).' },
  { lugar: 2, tipo: 'Imagen', titulo: 'Antes/después (estático)', emoji: '🔬', grad: ['#22c55e', '#15803d'], ctrPred: '5.2%', razon: 'Altísimo CTR, ideal como thumb y primera toma del Reel.' },
  { lugar: 3, tipo: 'Video', titulo: 'UGC rutina de mañana real', emoji: '👩', grad: ['#ec4899', '#be185d'], ctrPred: '4.7%', razon: 'Autenticidad que frena el scroll y genera confianza.' },
];

const REEL_PLAN: { paso: number; duracion: string; texto: string; emoji: string }[] = [
  { paso: 1, duracion: '0-3s', texto: 'Hook: primer plano del rostro con tono desparejo + texto "¿Tu tono se ve desparejo?"', emoji: '🎯' },
  { paso: 2, duracion: '3-8s', texto: 'Mostrar el serum, aplicar 2 gotas sobre la zona. Corte rápido, luz natural.', emoji: '🧴' },
  { paso: 3, duracion: '8-15s', texto: 'Antes/después en pantalla dividida (14 días). Wipe lateral limpio.', emoji: '🔬' },
  { paso: 4, duracion: '15-20s', texto: 'Testimonio UGC de 5s: "lo noté a los 10 días".', emoji: '💬' },
  { paso: 5, duracion: '20-24s', texto: 'CTA: "Probá 14 días, garantía total". Botón/carrusel a la tienda.', emoji: '🛒' },
];

type CreaGen = { id: string; angulo: string; paleta: string; dots: [string, string]; conv: number; estado: 'activa ahora' | 'reserva' | 'disponible'; };

const CREAS_GEN: CreaGen[] = [
  { id: 'img_07', angulo: 'Tecnología · "habla con el mundo sin barreras"', paleta: 'Azul + blanco · moderno', dots: ['#3b82f6', '#ffffff'], conv: 3.8, estado: 'activa ahora' },
  { id: 'img_03', angulo: 'Emoción · familia que se comunica', paleta: 'Cálido + piel', dots: ['#f59e0b', '#f2c9a0'], conv: 3.1, estado: 'reserva' },
  { id: 'img_09', angulo: 'Resultado · "entiende a cualquier extranjero"', paleta: 'Verde + blanco', dots: ['#22c55e', '#ffffff'], conv: 2.9, estado: 'reserva' },
  { id: 'img_02', angulo: 'Precio · "solo hoy con envío gratis"', paleta: 'Rojo + amarillo', dots: ['#ef4444', '#facc15'], conv: 2.4, estado: 'disponible' },
  { id: 'img_05', angulo: 'Social proof · "más de 500 vendidos"', paleta: 'Neutro + gris', dots: ['#9ca3af', '#6b7280'], conv: 2.1, estado: 'disponible' },
];

const CREAS_ARCHIVADAS = 'img_01, 04, 06, 08, 10. Conversión simulada <2%. Archivadas';

type Angulo = {
  nombre: string; emoji: string; que: string; ejemplo: string; pieza: string; conv: string; resultado: 'Ganadora' | 'Reserva' | 'Disponible';
  paleta: [string, string];
  colorSignificado: string;
  neuro: { etiqueta: string; desc: string };
};

const ANGULOS_NICHO: Angulo[] = [
  { nombre: 'Tecnología', emoji: '🌍', que: 'Resalta lo que el producto hace: sus capacidades y su innovación. Funciona mejor cuando tu audiencia compra por funcionalidad y no por estética.', ejemplo: '"Habla con el mundo sin barreras"', pieza: 'img_07', conv: '3.8%', resultado: 'Ganadora', paleta: ['#3b82f6', '#ffffff'], colorSignificado: 'Azul = confianza, tecnología y calma. El cerebro asocia el azul con marcas sólidas y seguras. El blanco transmite limpieza y claridad.', neuro: { etiqueta: 'Confianza técnica', desc: 'Expresar la promesa como capacidad ("habla con el mundo") dispara el gatillo de LOGRO: el cerebro quiere pertenecer al grupo que ya logró eso.' } },
  { nombre: 'Emoción', emoji: '👨\u200d👩\u200d👧', que: 'Apela al sentimiento: escenas de vida, vínculos, historias que conectan antes de vender. Es el ángulo que más se comparte y más se recuerda.', ejemplo: 'Familia que se comunica sin fronteras', pieza: 'img_03', conv: '3.1%', resultado: 'Reserva', paleta: ['#f59e0b', '#f2c9a0'], colorSignificado: 'Ámbar cálido = calidez y cercanía. Tono piel = empatía y humanidad. Juntos disparan "familia, hogar, cuidado".', neuro: { etiqueta: 'Pertenencia', desc: 'Las escenas de familia activan el gatillo de PERTENENCIA. La neurolingüística usa ritmo pausado y frases en primera persona para que el espectador se vea dentro de la escena.' } },
  { nombre: 'Resultado', emoji: '🗣️', que: 'Muestra el beneficio concreto: qué obtiene tu cliente el día después de usarlo. Es el favorito del comprador rápido, que decide comparando resultados.', ejemplo: '"Entiende a cualquier extranjero"', pieza: 'img_09', conv: '2.9%', resultado: 'Reserva', paleta: ['#22c55e', '#ffffff'], colorSignificado: 'Verde = logro y "funciona". Es el color del "sí, se pudo": el cerebro lo asocia con éxito y validación. El blanco deja el mensaje limpio.', neuro: { etiqueta: 'Prueba visual', desc: 'Mostrar el resultado (no prometerlo) dispara la PRUEBA VISUAL: si lo veo funcionar, es real. Verbos de acción inmediata ("entiende", "mira", "escucha") colocan al cliente en el momento del beneficio.' } },
  { nombre: 'Precio', emoji: '🏷️', que: 'Juega con urgencia, descuentos y envío gratis. Da picos rápidos de venta pero se agota rápido: tu nicho responde más al valor que a la oferta.', ejemplo: '"Solo hoy con envío gratis"', pieza: 'img_02', conv: '2.4%', resultado: 'Disponible', paleta: ['#ef4444', '#facc15'], colorSignificado: 'Rojo = urgencia y acción. Amarillo = recompensa y rebaja. Juntos disparan el "se agota ahora", el estímulo de compra por impulso.', neuro: { etiqueta: 'Escasez + urgencia', desc: 'El rojo activa el sistema de alerta del cerebro y el amarillo la recompensa. La frase "solo hoy" es un anclaje de escasez: el miedo a perder la oferta vence a la duda de comprar.' } },
  { nombre: 'Social proof', emoji: '⭐', que: 'Usa la prueba de otros: cantidad de ventas, reseñas, testimonios. Convence al indeciso: si ya lo compraron 500 personas, no puede estar mal.', ejemplo: '"Más de 500 vendidos"', pieza: 'img_05', conv: '2.1%', resultado: 'Disponible', paleta: ['#9ca3af', '#6b7280'], colorSignificado: 'Gris neutro = objetividad y solidez. El gris no vende emoción, vende "datos": el cerebro lo lee como información verificable, no como publicidad.', neuro: { etiqueta: 'Prueba social', desc: 'La cifra "500 vendidos" dispara el sesgo de PRUEBA SOCIAL: seguimos lo que otros ya hicieron. Es el gatillo que mueve al indeciso cuando ningún color ni emoción alcanza.' } },
];

type GaleriaItem = { id: string; tipo: 'Imagen' | 'Video'; titulo: string; angulo: string; emoji: string; grad: [string, string]; resultado: 'elegida' | 'reserva' | 'activa ahora' | 'archivada' | 'disponible'; conv: string; };

const GALERIA: GaleriaItem[] = [
  { id: 'img_01', tipo: 'Imagen', titulo: 'Producto en fondo blanco', angulo: 'Neutro · catálogo', emoji: '🧴', grad: ['#94a3b8', '#64748b'], resultado: 'archivada', conv: '1.2%' },
  { id: 'img_02', tipo: 'Imagen', titulo: 'Precio · envío gratis', angulo: 'Precio · urgencia', emoji: '🏷️', grad: ['#ef4444', '#facc15'], resultado: 'disponible', conv: '2.4%' },
  { id: 'img_03', tipo: 'Imagen', titulo: 'Familia comunicándose', angulo: 'Emoción · familia', emoji: '👨‍👩‍👧', grad: ['#f59e0b', '#f2c9a0'], resultado: 'reserva', conv: '3.1%' },
  { id: 'img_04', tipo: 'Imagen', titulo: 'Componentes del producto', angulo: 'Tecnología · features', emoji: '⚙️', grad: ['#94a3b8', '#475569'], resultado: 'archivada', conv: '1.6%' },
  { id: 'img_05', tipo: 'Imagen', titulo: 'Social proof · 500 vendidos', angulo: 'Social proof', emoji: '⭐', grad: ['#9ca3af', '#6b7280'], resultado: 'disponible', conv: '2.1%' },
  { id: 'img_06', tipo: 'Imagen', titulo: 'Testimonio en texto grande', angulo: 'Testimonio', emoji: '💬', grad: ['#a8a8a8', '#7e7e7e'], resultado: 'archivada', conv: '1.9%' },
  { id: 'img_07', tipo: 'Imagen', titulo: 'Habla con el mundo sin barreras', angulo: 'Tecnología · sin barreras', emoji: '🌍', grad: ['#3b82f6', '#ffffff'], resultado: 'elegida', conv: '3.8%' },
  { id: 'img_08', tipo: 'Imagen', titulo: 'Descuento 20% stamp', angulo: 'Precio · promoción', emoji: '💸', grad: ['#f97316', '#c2410c'], resultado: 'archivada', conv: '1.4%' },
  { id: 'img_09', tipo: 'Imagen', titulo: 'Entiende a cualquier extranjero', angulo: 'Resultado · comprensión', emoji: '🗣️', grad: ['#22c55e', '#ffffff'], resultado: 'reserva', conv: '2.9%' },
  { id: 'img_10', tipo: 'Imagen', titulo: 'Lifestyle playa', angulo: 'Contexto · verano', emoji: '🏖️', grad: ['#06b6d4', '#0e7490'], resultado: 'archivada', conv: '1.1%' },
  { id: 'vid_01', tipo: 'Video', titulo: 'Hook 3s: "¿Tu tono se ve desparejo?"', angulo: 'Pregunta directa', emoji: '🎬', grad: ['#a855f7', '#7e22ce'], resultado: 'disponible', conv: '4.1%' },
  { id: 'vid_02', tipo: 'Video', titulo: 'Antes y después en 14 días', angulo: 'Resultado visual', emoji: '⚡', grad: ['#22c55e', '#15803d'], resultado: 'elegida', conv: '5.0%' },
  { id: 'vid_03', tipo: 'Video', 'titulo': 'UGC rutina de mañana', angulo: 'Autenticidad', emoji: '👩', grad: ['#ec4899', '#be185d'], resultado: 'reserva', conv: '4.7%' },
  { id: 'vid_04', tipo: 'Video', titulo: 'Lifestyle playa, verano UAE', angulo: 'Contexto aspiracional', emoji: '🌊', grad: ['#06b6d4', '#0e7490'], resultado: 'disponible', conv: '3.6%' },
];

const RESULTADO_LABEL: Record<GaleriaItem['resultado'] | 'disponible', string> = { elegida: '✅ Elegida por las IAs', reserva: '📌 Reserva', 'activa ahora': '🟢 Publicada ahora', archivada: '📦 Archivada', disponible: '⚪ Disponible' };

const MOTOR = [
  { k: 'Motor de generación', v: 'GAIA (principal)' },
  { k: 'Validación', v: 'Inteligencia Colectiva: 500 agentes' },
  { k: 'Diferenciación pHash', v: '100% única vs competencia en tu zona' },
  { k: 'Similitud coseno vs competencia', v: '0.28, muy diferenciada' },
  { k: 'Ángulos analizados del nicho', v: 'Tecnología · Emoción · Resultado · Precio · Social proof' },
  { k: 'Ads de competencia analizados', v: '50 ads activos en tu nicho' },
];

type Consumo = { concepto: string; calc: string; cr: number; };

const CONSUMOS: Consumo[] = [
  { concepto: 'Análisis de estrategia (M1-M3)', calc: '320 cr × 3', cr: 960 },
  { concepto: 'Módulo visual (M4)', calc: '180 cr × 1', cr: 180 },
  { concepto: 'Conversaciones WhatsApp', calc: '0.5 cr × 3,200', cr: 1600 },
  { concepto: 'Semáforo diario (M5)', calc: '2 cr × 35 días', cr: 70 },
  { concepto: 'Publicaciones FB/IG', calc: '5 cr × 86', cr: 430 },
];

const PLANES = [
  { nombre: 'Starter', precio: '$97/mes', detalle: '1,500 créditos/mes · 1 negocio', actual: false },
  { nombre: 'Pro', precio: '$297/mes', detalle: '5,000 créditos/mes · 1 negocio', actual: true },
  { nombre: 'Agency Starter', precio: '$397/mes', detalle: '8,000 créditos/mes · hasta 8 clientes · white label', actual: false },
];

const estadoLabel: Record<Agente['estado'], string> = { pensando: 'Pensando', votando: 'Votando', analizando: 'Analizando', idle: 'En espera' };

// Tareas que cada agente puede estar haciendo según su fase del flujo (rotan en vivo)
const TAREAS_AGENTES: Record<string, string[]> = {
  'Analista de Mercado': ['Estudiando tu oportunidad, audiencia y competencia', 'Mapeando qué hace tu competencia ahora', 'Midiendo el tamaño real de tu oportunidad', 'Segmentando tu audiencia por intención'],
  'Estratega de Marketing': ['Decidiendo posicionamiento, ángulo y presupuesto', 'Definiendo el ángulo ganador de la oferta', 'Repartiendo presupuesto entre canales', 'Priorizando el plan de la semana'],
  'Creativa de Anuncios': ['Escribiendo 3 variantes de copy (60-160 caracteres)', 'Probando ángulos distintos sobre tu USP', 'Afinando el hook de cada variante', 'Puliendo el copy para que sea directo'],
  'Comprador de Medios': ['Lanzando la campaña y vigilando CTR, CPA y ROAS', 'Vigilando que el CPA no se dispare', 'Optimizando pujas y placements', 'Pausando lo que no rinde para no quemar presupuesto'],
  'Analista de Resultados': ['Comparando la predicción de MiroFish con el resultado real', 'Calculando la desviación de la última predicción', 'Calibrando la próxima predicción de MiroFish', 'Cerrando el loop: resultado vs lo prometido'],
  'Vendedor de Cierre': ['Conduciendo al lead por saludo → calificación → cierre', 'Detectando la intención del lead', 'Superando la objeción de precio', 'Pidiendo el pago en la etapa de cierre'],
};
const estadoTone: Record<Agente['estado'], 'purple' | 'green' | 'amber' | 'muted'> = { pensando: 'purple', votando: 'amber', analizando: 'green', idle: 'muted' };

type TabKey = 'agentes' | 'tormenta' | 'opiniones' | 'imagenes' | 'videos' | 'reel' | 'mercado' | 'creatividades';
const TABS: { k: TabKey; lbl: string; Ico: any }[] = [
  { k: 'mercado', lbl: 'Mercado Predictivo', Ico: I_Chart },
  { k: 'agentes', lbl: 'Agentes', Ico: I_Robot },
  { k: 'tormenta', lbl: 'Conversaciones', Ico: I_Chat },
  { k: 'opiniones', lbl: 'Opiniones', Ico: I_Vote },
  { k: 'imagenes', lbl: 'Opciones de imagen', Ico: I_Image },
  { k: 'videos', lbl: 'Opciones de video', Ico: I_Film },
  { k: 'reel', lbl: 'Ranking del Reel', Ico: I_Trophy },
  { k: 'creatividades', lbl: 'Creatividades', Ico: I_Palette },
];
const MERCADO_ANALISIS = [
  { k: 'img', emoji: '🖼️', tipo: 'Imagen', que: 'Composición, rostro, texto sobre la imagen y contraste', cuando: 'antes de crear' },
  { k: 'col', emoji: '🎨', tipo: 'Colores', que: 'Psicología de la paleta y colores dominantes de tu nicho', cuando: 'antes de crear' },
  { k: 'reel', emoji: '🎬', tipo: 'Reel', que: 'Los primeros 3 segundos y la retención estimada', cuando: 'antes de armar' },
  { k: 'vid', emoji: '📹', tipo: 'Videos', que: 'Ritmo, duración, sonido y llamado a la acción', cuando: 'antes de publicar' },
  { k: 'txt', emoji: '📝', tipo: 'Textos y publicaciones', que: 'Titular, legibilidad y tono contra la voz de tu marca', cuando: 'antes de publicar' },
];
const PIEZAS_MERCADO = [
  { n: 'propuesta_imagen_01', t: 'Imagen', e: '🖼️' },
  { n: 'propuesta_reel_v2', t: 'Reel', e: '🎬' },
  { n: 'propuesta_video_a', t: 'Video', e: '📹' },
  { n: 'propuesta_paleta_v3', t: 'Paleta', e: '🎨' },
  { n: 'propuesta_publicacion', t: 'Publicación', e: '📝' },
  { n: 'propuesta_reel_antes_despues', t: 'Reel', e: '🎬' },
  { n: 'propuesta_video_demo', t: 'Video', e: '📹' },
];

const ETAPAS_MERCADO = [
  { t: 'Ingesta', d: 'La propuesta entra al mercado para ser probada.' },
  { t: 'Reacción', d: 'El mercado reacciona como lo haría tu audiencia real.' },
  { t: 'Debate', d: 'Los bots discuten pros y contras en el chat lateral.' },
  { t: 'Votación', d: 'Cada bot vota positivo o negativo y suma su score.' },
  { t: 'Ranking', d: 'La propuesta se ordena contra las demás del lote.' },
  { t: 'Veredicto', d: 'Se decide publicar o descartar antes de salir live.' },
];

const CHAT_GENERAL = [
  { t: 'positivo', m: 'Los colores de esta pieza conectan con el nicho. +1' },
  { t: 'positivo', m: 'El ángulo de venta está alineado con la intención real. Me gusta' },
  { t: 'negativo', m: 'El titular se pierde en móvil. No la veo ganando' },
  { t: 'analisis', m: 'Estimando retención del primer segundo en 72%...' },
  { t: 'positivo', m: 'El hook de los primeros 3s engancha. Voto a favor' },
  { t: 'negativo', m: 'La oferta llega tarde en el reel. Riesgo de caída' },
  { t: 'analisis', m: 'Comparando esta contra 3 propuestas previas del lote' },
  { t: 'positivo', m: 'Contraste y legibilidad sólidos en escritorio y móvil' },
  { t: 'negativo', m: 'La paleta no resuena con la audiencia objetivo. Rechazo' },
  { t: 'analisis', m: 'Simulando reacción esperada de 500 observadores' },
  { t: 'positivo', m: 'CPA proyectado cae bajo el umbral. Vale publicar' },
  { t: 'positivo', m: 'Señal de compra real detectada en los comentarios simulados' },
];

const VOTOS_MERCADO = ['Aprueba', 'Rechaza', 'Aprueba con reserva', 'Neutro'];

export default function Predictiva() {
  const [tab, setTab] = useState<TabKey>('mercado');
  const [galeriaOpen, setGaleriaOpen] = useState(false);
  const [autoRecarga, setAutoRecarga] = useState(true);
  const [galeriaTipo, setGaleriaTipo] = useState<'todo' | 'Imagen' | 'Video'>('todo');
  const [toast, setToast] = useState('');
  const [planActual, setPlanActual] = useState('Pro');
  const avisar = (t: string) => { setToast(t); setTimeout(() => setToast(''), 2600); };

  // ===== AGENTES EN VIVO =====
  const [agents, setAgents] = useState<Agente[]>(AGENTES);
  const [historialAgente, setHistorialAgente] = useState<Agente | null>(null);
  const [tick, setTick] = useState(0);

  // ===== MERCADO PREDICTIVO EN VIVO =====
  const [mktPos, setMktPos] = useState(0);
  const [mktPaso, setMktPaso] = useState(0);
  const [mktChat, setMktChat] = useState<{ id: number; t: string; m: string }[]>([]);
  const [mktScore, setMktScore] = useState(47);
  const [mktVotos, setMktVotos] = useState<{ id: number; v: string }[]>([]);
  const [mktHistScore, setMktHistScore] = useState<number[]>([47]);
  const [mktSent, setMktSent] = useState<{ pos: number; neg: number; ana: number }>({ pos: 3, neg: 1, ana: 1 });
  useEffect(() => {
    if (tab !== 'mercado') return;
    let n = 0;
    const id = setInterval(() => {
      n++;
      // 1-2 comentarios nuevos por tick
      const cuantos = Math.random() < 0.5 ? 1 : 2;
      const nuevos: { id: number; t: string; m: string }[] = [];
      for (let k = 0; k < cuantos; k++) {
        const c = CHAT_GENERAL[Math.floor(Math.random() * CHAT_GENERAL.length)];
        nuevos.push({ id: 100 + Math.floor(Math.random() * 400), t: c.t, m: c.m });
      }
      setMktChat(prev => [...nuevos, ...prev].slice(0, 14));
      setMktSent(sent => {
        let pos = sent.pos, neg = sent.neg, ana = sent.ana;
        nuevos.forEach(c => {
          if (c.t === 'positivo') pos++; else if (c.t === 'negativo') neg++; else ana++;
        });
        return { pos, neg, ana };
      });
      // cada 4 ticks avanza la etapa; al llegar a la 6, pieza nueva
      if (n % 4 === 0) {
        setMktPaso(paso => {
          if (paso < 5) return paso + 1;
          setMktPos(pos => (pos + 1) % PIEZAS_MERCADO.length);
          setMktHistScore(prev => [...prev, 40 + Math.floor(Math.random() * 30)].slice(-20));
          setMktScore(40 + Math.floor(Math.random() * 30));
          setMktVotos([0, 1, 2, 3, 4].map(() => ({ id: 100 + Math.floor(Math.random() * 400), v: VOTOS_MERCADO[Math.floor(Math.random() * VOTOS_MERCADO.length)] })));
          return 0;
        });
      }
    }, 900);
    return () => clearInterval(id);
  }, [tab]);
  useEffect(() => {
    if (tab !== 'agentes') return;
    const id = setInterval(() => {
      setAgents(prev => prev.map(a => {
        // carga oscila ±12 alrededor del valor base, 12-95
        const delta = Math.floor(Math.random() * 25) - 12;
        let carga = Math.max(12, Math.min(95, a.carga + delta));
        // 18% de chances de rotar tarea
        let tarea = a.tarea;
        let estado = a.estado;
        let historial = a.historial;
        if (Math.random() < 0.18) {
          const pool = TAREAS_AGENTES[a.rol] || [];
          if (pool.length) {
            const nueva = pool[Math.floor(Math.random() * pool.length)];
            // solo rota si es una tarea distinta Y aún no está en el historial reciente
            const yaEnHistorial = historial.some(h => h.tarea === nueva);
            if (nueva !== a.tarea && !yaEnHistorial) {
              // archiva la tarea vieja una sola vez (máx 7 días = 8 entradas)
              historial = [{ tarea: a.tarea, hace: 'hoy', fecha: '2026-09-22', duracion: 'en curso', resultado: 'Trabajando ahora' }, ...historial].slice(0, 8);
              tarea = nueva;
            }
          }
          const estados: Agente['estado'][] = ['pensando', 'votando', 'analizando', 'idle'];
          estado = estados[Math.floor(Math.random() * estados.length)];
        }
        return { ...a, carga, tarea, historial, estado };
      }));
      setTick(t => t + 1);
    }, 3000);
    return () => clearInterval(id);
  }, [tab]);
  const sentimientoTone = (s: Opinion['sentimiento']) => s === 'positivo' ? 'green' : s === 'negativo' ? 'red' : 'amber';
  const sentimientoTxt: Record<Opinion['sentimiento'], string> = { positivo: 'A favor', mixto: 'Divididas', negativo: 'En contra' };

  return (
    <>
      <div className="hdr">
        <div>
          <div className="hdr-t">🧠 Inteligencia Predictiva</div>
          <div className="hdr-s">La magia del modelo: mirá lo que las IAs de Inteligencia Colectiva están haciendo ahora, en tiempo real.</div>
        </div>
        <Badge tone="green"><span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span className="dot-live" />En vivo · tick {tick}</span></Badge>
      </div>

      {/* KPIs */}
      <div className="herr-stats" style={{ marginBottom: 20 }}>
        <div className="herr-stat"><div className="tiny muted" style={{ fontWeight: 600 }}>Deep Agents activos</div><div className="herr-stat-v" style={{ color: 'var(--purple4)' }}>{agents.filter(a => a.estado !== 'idle').length}</div><div className="tiny muted">de 6 en el flujo ahora</div></div>
        <div className="herr-stat"><div className="tiny muted" style={{ fontWeight: 600 }}>Conversaciones en curso</div><div className="herr-stat-v" style={{ color: 'var(--green)' }}>3</div><div className="tiny muted">hilos entre IAs</div></div>
        <div className="herr-stat"><div className="tiny muted" style={{ fontWeight: 600 }}>Votos emitidos hoy</div><div className="herr-stat-v">27</div><div className="tiny muted">decisiones colectivas</div></div>
        <div className="herr-stat"><div className="tiny muted" style={{ fontWeight: 600 }}>Publicaciones analizadas</div><div className="herr-stat-v" style={{ color: 'var(--amber)' }}>12</div><div className="tiny muted">comentarios y reacciones</div></div>
      </div>

      {/* Tabs */}
      <div className="row" style={{ gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        {TABS.map(({ k, lbl, Ico }) => (
          <button key={k} className={`chip ${tab === k ? 'chip-on' : ''}`} onClick={() => setTab(k)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Ico size={14} />
            {lbl}
          </button>
        ))}
      </div>

      {/* ===== AGENTES ===== */}
      {tab === 'agentes' && (
        <Card title={<><I_Users size={15} style={{ marginRight: 8, color: 'var(--purple4)' }} /> Mapa de agentes, qué está haciendo cada IA</>}>
          <div className="small muted" style={{ margin: '-4px 0 6px', lineHeight: 1.55 }}>Los <b>6 Deep Agents</b> son tu equipo de marketing autónomo, y trabajan en cadena: <b>Lux</b> estudia tu mercado → <b>Rex</b> arma el plan → <b>Nia</b> escribe los anuncios → <b>Kai</b> lanza y vigila → <b>Sol</b> compara con la predicción y recalibra → <b>Rumi</b> convierte los leads en ventas. Cada tarjeta te dice qué está haciendo ahora, y el flujo corre en vivo: cuando uno termina, pasa al siguiente.</div>
          <div className="tiny muted" style={{ marginBottom: 16 }}>Junto con los 5 jueces del enjambre y MiroFish, son las 12 inteligencias del sistema.</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {agents.map((a, i) => (
              <div key={a.id} style={{ display: 'flex', gap: 14, padding: '14px 16px', borderRadius: 14, border: '1px solid var(--border2)', background: 'var(--bg2)', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, color: '#fff', background: `linear-gradient(135deg, ${a.color}, ${a.color}99)` }} className="agt-avatar">{a.nombre[0].toUpperCase()}</div>
                  <span className="xs muted" style={{ fontWeight: 800, color: a.color }}>FASE {a.fase}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{a.nombre}</span>
                    <span className="tiny muted" style={{ fontFamily: 'monospace' }}>[{a.technical}]</span>
                    <span className="tiny muted">{a.rol}</span>
                    <Badge tone={estadoTone[a.estado]}>{estadoLabel[a.estado]}</Badge>
                  </div>
                  <div className="small agt-tarea" style={{ marginTop: 3, fontWeight: 600, color: 'var(--tx)' }}>{a.tarea}</div>
                  <div className="tiny muted" style={{ marginTop: 3, lineHeight: 1.5 }}>{a.descripcion}</div>
                  <div className="row" style={{ gap: 10, marginTop: 10, alignItems: 'center' }}>
                    <div className="herr-bar" style={{ flex: 1, height: 4 }}><div className="herr-bar-fill" style={{ width: `${a.carga}%`, background: a.color, height: 4, borderRadius: 99 }} /></div>
                    <span className="xs muted" style={{ fontWeight: 700, minWidth: 34, textAlign: 'right' }}>{a.carga}%</span>
                  </div>
                  {i < agents.length - 1 && <div style={{ fontSize: 12, marginTop: 6, color: 'var(--purple4)', fontWeight: 700 }}>↓ pasa a {agents[i+1].nombre}</div>}
                  {/* ===== HISTORIAL DE TRABAJO (3 últimas) ===== */}
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--border2)' }}>
                    <div className="xs muted" style={{ fontWeight: 800, marginBottom: 5, letterSpacing: '.3px' }}>HISTORIAL DE TRABAJO</div>
                    {a.historial.slice(0, 3).map((h, j) => (
                      <div key={j} className="row" style={{ gap: 8, padding: '3px 0', alignItems: 'flex-start' }}>
                        <span style={{ color: a.color, fontSize: 13, lineHeight: 1.4, marginTop: 1 }}>•</span>
                        <span className="tiny" style={{ flex: 1, lineHeight: 1.45, color: 'var(--tx2)' }}>{h.tarea} <span className="xs muted">({h.hace})</span></span>
                      </div>
                    ))}
                    <div className="row" style={{ gap: 8, marginTop: 8 }}>
                      <Button variant="outline" className="btn-sm" onClick={() => setHistorialAgente(a)}><I_Question size={13} /> Historial de trabajo</Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ===== CONVERSACIONES ===== */}
      {tab === 'tormenta' && (
        <Card title={<><I_Sparkle size={15} style={{ marginRight: 8, color: 'var(--purple4)' }} /> Qué están hablando Lux, Rex, Nia, Kai, Sol y Rumi</>}>
          <div className="small muted" style={{ margin: '-4px 0 6px', lineHeight: 1.55 }}>Esta es la <b>tormenta colectiva</b>: los agentes debaten entre ellos como un equipo de marketing real. Un <b>Voto</b> es una posición formal a favor o en contra; una <b>Acción</b> es una decisión ejecutada sin intervención humana (mover presupuesto, pausar un anuncio, responder un chat). Cuando lees el hilo, estás viendo cómo se tomó la decisión, no solo el resultado.</div>
          <div className="tiny muted" style={{ marginBottom: 16 }}>Este hilo se actualiza cada vez que un agente habla o actúa.</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {HILO.map((h, i) => (
              <div key={i} style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color: '#fff', background: `linear-gradient(135deg, ${h.color}, ${h.color}99)` }}>{h.agente[0]}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row" style={{ gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{h.agente}</span>
                    <span className="tiny muted">{h.hora}</span>
                    {h.tipo === 'voto' ? <Badge tone="amber">Voto</Badge> : h.tipo === 'accion' ? <Badge tone="green">Acción</Badge> : null}
                  </div>
                  <div className="small" style={{ marginTop: 3, lineHeight: 1.5 }}>{h.texto}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ===== OPINIONES ===== */}
      {tab === 'opiniones' && (
        <>
          <Card className="mb14" title="Cómo leer las opiniones de la colectividad">
            <div className="small muted" style={{ lineHeight: 1.55 }}>Cada publicación tuya pasa por las <b>12 inteligencias del sistema</b>: los 6 Deep Agents (Lux, Rex, Nia, Kai, Sol, Rumi), los 5 jueces del enjambre y MiroFish. La barra verde/roja es la <b>postura</b>: cuántos agentes están a favor y cuántos en contra de mantenerla. El número grande es el <b>score</b> (0–100): combina qué tan bien está rindiendo, qué dice la gente y qué tanto le conviene a tu estrategia. Cuanto más alto, más vale la pena que siga activa. La tarjeta de abajo es la <b>“Lectura de la IA”</b>: la conclusión en una frase.</div>
          </Card>
          {OPINIONES.map(o => (
            <Card key={o.publi} className="mb14">
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
                <div className="row" style={{ gap: 10 }}>
                  <span style={{ fontSize: 22 }}>{o.emoji}</span>
                  <span style={{ fontWeight: 700 }}>{o.publi}</span>
                </div>
                <Badge tone={sentimientoTone(o.sentimiento)}>{sentimientoTxt[o.sentimiento]}</Badge>
              </div>

              <div className="row" style={{ gap: 24, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <div className="tiny muted" style={{ marginBottom: 6 }}>Postura de las {o.agentes} IAs</div>
                  <div className="herr-bar" style={{ height: 18, display: 'flex', overflow: 'hidden', background: 'transparent', gap: 2 }}>
                    <div style={{ height: '100%', flex: o.aFavor, background: 'var(--green)', borderRadius: 6 }} title={`A favor: ${o.aFavor}`} />
                    <div style={{ height: '100%', flex: o.enContra, background: 'var(--red)', borderRadius: 6 }} title={`En contra: ${o.enContra}`} />
                  </div>
                  <div className="row small" style={{ justifyContent: 'space-between', marginTop: 6 }}>
                    <span className="muted" style={{ color: 'var(--green)' }}>✓ {o.aFavor} a favor</span>
                    <span className="muted" style={{ color: 'var(--red)' }}>{o.enContra} en contra ✗</span>
                  </div>
                </div>
                <div style={{ width: 90, textAlign: 'center' }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: o.score >= 70 ? 'var(--green)' : o.score >= 40 ? 'var(--amber)' : 'var(--red)' }}>{o.score}</div>
                  <div className="tiny muted">score</div>
                </div>
              </div>

              <div className="small" style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--txt)' }}>
                <I_Sparkle size={13} style={{ marginRight: 6, color: 'var(--purple4)' }} />
                <b>Lectura de la IA:</b> {o.insight}
              </div>
            </Card>
          ))}
        </>
      )}

      {/* ===== OPCIONES DE IMAGEN ===== */}
      {tab === 'imagenes' && (
        <Card title={<><I_Image size={15} style={{ marginRight: 8, color: 'var(--purple4)' }} /> Opciones de imagen propuestas por las IAs</>}>
          <div className="small muted" style={{ margin: '-4px 0 6px', lineHeight: 1.55 }}>Antes de gastar un peso en anuncios, el equipo de IAs genera varias variantes de imagen y simula cómo rendiría cada una con tu audiencia. El <b>CTR predicho</b> es el porcentaje de personas que haría clic; la <b>confianza</b> es qué tan segura está la IA de esa predicción (a más datos de tu nicho, más alta).</div>
          <div className="tiny muted" style={{ marginBottom: 14 }}>Con el botón de abajo podés ver TODAS las creaciones de la campaña y cuáles eligieron para publicar.</div>
          <button className="btn btn-primary btn-sm" style={{ marginBottom: 14 }} onClick={() => { setGaleriaTipo('Imagen'); setGaleriaOpen(true); }}><I_Eye size={13} style={{ marginRight: 6 }} /> Ver creaciones de imágenes</button>
          <div className="grid-3">
            {OPCIONES_IMG.map(o => (
              <div key={o.titulo} style={{ padding: 14, borderRadius: 14, border: '1px solid var(--border2)', background: 'var(--bg2)' }}>
                <div style={{ height: 110, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 42, background: `linear-gradient(135deg, ${o.grad[0]}22, ${o.grad[1]}22)`, border: `1px solid ${o.grad[0]}44` }}>
                  <span>{o.emoji}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: 13.5, marginTop: 10 }}>{o.titulo}</div>
                <div className="tiny muted" style={{ marginTop: 2 }}>{o.estilo}</div>

                <div className="row" style={{ justifyContent: 'space-between', marginTop: 12, alignItems: 'baseline' }}>
                  <span className="tiny muted">CTR predicho</span>
                  <span className="small" style={{ fontWeight: 800, color: 'var(--purple4)' }}>{o.ctrPred}</span>
                </div>
                <div className="row" style={{ gap: 8, marginTop: 6 }}>
                  <div className="herr-bar" style={{ flex: 1 }}><div className="herr-bar-fill" style={{ width: `${o.confianza}%`, background: o.grad[0] }} /></div>
                  <span className="xs muted" style={{ fontWeight: 700, minWidth: 30 }}>{o.confianza}%</span>
                </div>
                <div className="tiny muted" style={{ marginTop: 6 }}>confianza de la IA</div>

                <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                  <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => avisar(`✅ "${o.titulo}" seleccionada. La Inteligencia Colectiva la valida antes de publicar.`)}><I_Check size={13} style={{ marginRight: 4 }} /> Usar</button>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => { setGaleriaTipo('Imagen'); setGaleriaOpen(true); }}><I_Eye size={13} style={{ marginRight: 4 }} /> Vista previa</button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ===== OPCIONES DE VIDEO ===== */}
      {tab === 'videos' && (
        <Card title={<><I_Image size={15} style={{ marginRight: 8, color: 'var(--purple4)' }} /> Opciones de video propuestas por las IAs</>}>
          <div className="small muted" style={{ margin: '-4px 0 6px', lineHeight: 1.55 }}>Cada opción es un concepto de video distinto: el <b>gancho</b> es lo que frena el scroll en los primeros 3 segundos, el <b>watch time predicho</b> es el porcentaje de gente que vería el video completo. Las IAs eligen conceptos, no guiones cerrados: vos grabás el ganador.</div>
          <div className="tiny muted" style={{ marginBottom: 14 }}>Con el botón de abajo podés ver TODAS las creaciones (imágenes + videos) y cuáles eligieron.</div>
          <button className="btn btn-primary btn-sm" style={{ marginBottom: 14 }} onClick={() => { setGaleriaTipo('Video'); setGaleriaOpen(true); }}><I_Eye size={13} style={{ marginRight: 6 }} /> Ver creaciones de videos</button>
          <div className="grid-3">
            {OPCIONES_VIDEO.map(o => (
              <div key={o.titulo} style={{ padding: 14, borderRadius: 14, border: '1px solid var(--border2)', background: 'var(--bg2)' }}>
                <div style={{ height: 110, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 42, background: `linear-gradient(135deg, ${o.grad[0]}22, ${o.grad[1]}22)`, border: `1px solid ${o.grad[0]}44` }}>
                  <span>{o.emoji}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: 13.5, marginTop: 10 }}>{o.titulo}</div>
                <div className="tiny muted" style={{ marginTop: 2 }}>{o.gancho}</div>

                <div className="row" style={{ gap: 8, marginTop: 8 }}>
                  <Badge tone="purple">{o.duracion}</Badge>
                  <Badge tone="muted">{o.formato}</Badge>
                </div>

                <div className="row" style={{ justifyContent: 'space-between', marginTop: 12, alignItems: 'baseline' }}>
                  <span className="tiny muted">CTR predicho</span>
                  <span className="small" style={{ fontWeight: 800, color: 'var(--purple4)' }}>{o.ctrPred}</span>
                </div>
                <div className="row" style={{ justifyContent: 'space-between', marginTop: 4, alignItems: 'baseline' }}>
                  <span className="tiny muted">Watch time predicho</span>
                  <span className="small" style={{ fontWeight: 800, color: 'var(--green)' }}>{o.watchPred}</span>
                </div>
                <div className="row" style={{ gap: 8, marginTop: 8 }}>
                  <div className="herr-bar" style={{ flex: 1 }}><div className="herr-bar-fill" style={{ width: `${o.confianza}%`, background: o.grad[0] }} /></div>
                  <span className="xs muted" style={{ fontWeight: 700, minWidth: 30 }}>{o.confianza}%</span>
                </div>
                <div className="tiny muted" style={{ marginTop: 4 }}>confianza de la IA</div>

                <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                  <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => avisar(`✅ "${o.titulo}" seleccionado. La Inteligencia Colectiva lo valida antes de publicar.`)}><I_Check size={13} style={{ marginRight: 4 }} /> Usar</button>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => { setGaleriaTipo('Video'); setGaleriaOpen(true); }}><I_Eye size={13} style={{ marginRight: 4 }} /> Vista previa</button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ===== RANKING REEL ===== */}
      {tab === 'reel' && (
        <>
          <Card title={<><I_Trend size={15} style={{ marginRight: 8, color: 'var(--purple4)' }} /> El podio: qué ganó para el Reel</>}>
            <div className="small muted" style={{ margin: '-4px 0 6px', lineHeight: 1.55 }}>Entre todas las imágenes y videos creados, la colectividad <b>votó y ordenó</b> las 3 mejores piezas para tu Reel. El podio combina formatos: no gana solo el de más clics, también pesa el watch time y si encaja con tu marca. 🥇 es lo que deberías publicar primero.</div>
            <div className="tiny muted" style={{ marginBottom: 16 }}>Debajo, el guion paso a paso de cómo armar ese Reel ganador.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {PODIO_REEL.map(p => (
                <div key={p.lugar} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 14, border: '1px solid var(--border2)', background: 'var(--bg2)' }}>
                  <div style={{ width: 46, height: 46, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#fff', background: `linear-gradient(135deg, ${p.grad[0]}, ${p.grad[1]})` }}>
                    {p.lugar === 1 ? '🥇' : p.lugar === 2 ? '🥈' : '🥉'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row" style={{ gap: 8 }}>
                      <span style={{ fontWeight: 700 }}>{p.titulo}</span>
                      <Badge tone={p.tipo === 'Video' ? 'purple' : 'green'}>{p.tipo}</Badge>
                    </div>
                    <div className="small muted" style={{ marginTop: 3 }}>{p.razon}</div>
                    <div className="row" style={{ gap: 6, marginTop: 6 }}>
                      <span className="tiny muted">CTR predicho</span>
                      <span className="xs" style={{ fontWeight: 800, color: 'var(--purple4)' }}>{p.ctrPred}</span>
                      <span style={{ fontSize: 18 }}>{p.emoji}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title={<><I_Sparkle size={15} style={{ marginRight: 8, color: 'var(--purple4)' }} /> Cómo armar el Reel del producto</>} className="mt16">
            <div className="tiny muted" style={{ margin: '-6px 0 16px' }}>El guion paso a paso que proponen las IAs, con la duración de cada toma.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {REEL_PLAN.map(r => (
                <div key={r.paso} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', borderRadius: 12, border: '1px solid var(--border2)', background: 'var(--bg3)' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color: '#fff', background: 'var(--purple2)' }}>{r.paso}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <span className="small" style={{ fontWeight: 700 }}>{r.emoji} {r.texto}</span>
                      <Badge tone="muted">{r.duracion}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* ===== MERCADO PREDICTIVO ===== */}
      {tab === 'mercado' && (
        <>
          <Card title={<><I_Zap size={15} style={{ marginRight: 8, color: 'var(--purple4)' }} /> Mercado secundario predictivo</>}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 16, alignItems: 'start' }}>
              {/* ===== IZQUIERDA: proceso ===== */}
              <div>
                <div className="small muted" style={{ marginBottom: 12, lineHeight: 1.5 }}>La propuesta se prueba aquí antes de salir a internet. Esto es lo que sucede <b>ahora mismo</b>:</div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(168,85,247,.35)', background: 'rgba(124,58,237,.08)' }}>
                  <span style={{ fontSize: 22 }}>{PIEZAS_MERCADO[mktPos].e}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="small" style={{ fontWeight: 700 }}>En el filtro: {PIEZAS_MERCADO[mktPos].n}</div>
                    <div className="tiny muted">{PIEZAS_MERCADO[mktPos].t}</div>
                  </div>
                  <Badge tone="purple">Etapa {mktPaso + 1}/6</Badge>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
                  {/* 1. Sentimiento del mercado */}
                  <div style={{ padding: '10px', borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--bg2)' }}>
                    <div className="tiny muted" style={{ fontWeight: 700, marginBottom: 6 }}>Sentimiento del mercado</div>
                    <div style={{ display: 'flex', height: 44, borderRadius: 6, overflow: 'hidden' }}>
                      <div style={{ width: (mktSent.pos / (mktSent.pos + mktSent.neg + mktSent.ana)) * 100 + '%', background: 'linear-gradient(180deg,#34d399,#059669)', transition: 'width .5s ease' }} />
                      <div style={{ width: (mktSent.neg / (mktSent.pos + mktSent.neg + mktSent.ana)) * 100 + '%', background: 'linear-gradient(180deg,#f87171,#dc2626)', transition: 'width .5s ease' }} />
                      <div style={{ width: (mktSent.ana / (mktSent.pos + mktSent.neg + mktSent.ana)) * 100 + '%', background: 'linear-gradient(180deg,#a855f7,#7c3aed)', transition: 'width .5s ease' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                      <span className="tiny" style={{ color: '#34d399' }}>▲ {mktSent.pos}</span>
                      <span className="tiny" style={{ color: '#f87171' }}>▼ {mktSent.neg}</span>
                      <span className="tiny" style={{ color: '#a855f7' }}>● {mktSent.ana}</span>
                    </div>
                  </div>

                  {/* 2. Score en vivo (sparkline) */}
                  <div style={{ padding: '10px', borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--bg2)' }}>
                    <div className="tiny muted" style={{ fontWeight: 700, marginBottom: 6 }}>Score en vivo</div>
                    <svg width="100%" height="44" viewBox="0 0 100 40" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.5" />
                          <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {(() => {
                        const datos = mktHistScore;
                        const min = 40, max = 70;
                        const pts = datos.map((v, i) => [8 + (i / Math.max(1, datos.length - 1)) * 84, 36 - ((v - min) / (max - min)) * 32]);
                        const line = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
                        const area = line + ' L ' + pts[pts.length - 1][0].toFixed(1) + ' 38 L ' + pts[0][0].toFixed(1) + ' 38 Z';
                        const last = pts[pts.length - 1];
                        return (<g>
                          <path d={area} fill="url(#sparkFill)" />
                          <path d={line} fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <circle cx={last[0]} cy={last[1]} r="3" fill="#a855f7" />
                        </g>);
                      })()}
                    </svg>
                    <div className="tiny" style={{ color: '#a855f7', fontWeight: 800, marginTop: 2 }}>{mktScore}/100</div>
                  </div>

                  {/* 3. Distribución de votos */}
                  <div style={{ padding: '10px', borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--bg2)' }}>
                    <div className="tiny muted" style={{ fontWeight: 700, marginBottom: 6 }}>Distribución de votos</div>
                    {(() => {
                      const total = mktVotos.length || 1;
                      const cuenta: Record<string, number> = {};
                      mktVotos.forEach(v => { cuenta[v.v] = (cuenta[v.v] || 0) + 1; });
                      const filas = [['Aprueba', '#34d399'], ['Aprueba con reserva', '#a855f7'], ['Neutro', '#9ca3af'], ['Rechaza', '#f87171']];
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {filas.map(([lab, col]) => {
                            const n = cuenta[lab as string] || 0;
                            const pct = (n / total) * 100;
                            return (
                              <div key={lab as string} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span className="tiny" style={{ width: 46, color: col as string, flexShrink: 0, fontSize: 10 }}>{lab}</span>
                                <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--bg3)', overflow: 'hidden' }}>
                                  <div style={{ width: pct + '%', height: '100%', background: col as string, transition: 'width .5s ease' }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {ETAPAS_MERCADO.map((f, i) => {
                    const fase = mktPaso > i ? 'hecho' : mktPaso === i ? 'activo' : 'pendiente';
                    return (
                      <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '9px 12px', borderRadius: 10, border: '1px solid ' + (fase === 'activo' ? '#a855f7' : fase === 'hecho' ? 'rgba(52,211,153,.4)' : 'var(--border2)'), background: fase === 'activo' ? 'rgba(124,58,237,.10)' : fase === 'hecho' ? 'rgba(52,211,153,.06)' : 'var(--bg2)', transition: 'all .3s ease' }}>
                        <div style={{ width: 26, height: 26, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0, background: fase === 'pendiente' ? 'var(--bg3)' : fase === 'activo' ? 'linear-gradient(90deg,#7c3aed,#a855f7)' : '#34d399', color: '#fff', boxShadow: fase === 'activo' ? '0 0 14px rgba(168,85,247,.55)' : 'none' }}>
                          {fase === 'hecho' ? <I_Check size={15} /> : i + 1}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="small" style={{ fontWeight: 700, color: fase === 'activo' ? '#a855f7' : 'inherit' }}>{f.t}</div>
                          {fase === 'activo' && <div className="tiny muted" style={{ marginTop: 1 }}>{f.d}</div>}
                        </div>
                        {fase === 'activo' && <span className="tiny" style={{ color: '#a855f7', fontWeight: 700 }}>● ahora</span>}
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center', padding: '12px 14px', borderRadius: 12, background: 'rgba(124,58,237,.10)', border: '1px solid rgba(124,58,237,.25)' }}>
                  <div style={{ fontSize: 26 }}>🧠</div>
                  <div style={{ flex: 1 }}>
                    <div className="small" style={{ fontWeight: 700 }}>Score: {mktScore}/100</div>
                    <div className="tiny muted">{mktScore >= 60 ? 'El mercado sugiere PUBLICAR esta propuesta.' : 'El mercado aún debate si vale publicarla.'}</div>
                  </div>
                  <Badge tone={mktScore >= 60 ? 'green' : 'amber'}>{mktScore >= 60 ? 'Aprobada' : 'En debate'}</Badge>
                </div>
              </div>

              {/* ===== DERECHA: chat en vivo ===== */}
              <div style={{ border: '1px solid var(--border2)', borderRadius: 12, background: 'var(--bg1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid var(--border2)', background: 'var(--bg2)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: '#ef4444', boxShadow: '0 0 0 3px rgba(239,68,68,.25)', animation: 'pulse 1.5s infinite' }} />
                  <span className="small" style={{ fontWeight: 700 }}>Mercado, reacción en vivo</span>
                  <span className="tiny muted" style={{ marginLeft: 'auto' }}>500 observadores</span>
                </div>
                <div style={{ flex: 1, maxHeight: 320, overflowY: 'auto', padding: '10px 6px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {mktChat.length === 0 && <div className="tiny muted" style={{ padding: '6px 8px' }}>Esperando las primeras reacciones…</div>}
                  {mktChat.map((m, i) => (
                    <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', fontSize: 11.5, lineHeight: 1.35 }}>
                      <span style={{ fontWeight: 800, color: m.t === 'positivo' ? '#34d399' : m.t === 'negativo' ? '#f87171' : '#a855f7', flexShrink: 0 }}>#{m.id}</span>
                      <span style={{ color: 'var(--txt)', overflowWrap: 'anywhere' }}>{m.m}</span>
                    </div>
                  ))}
                </div>
                <div style={{ borderTop: '1px solid var(--border2)', padding: '8px 10px', background: 'var(--bg2)' }}>
                  <div className="tiny" style={{ fontWeight: 700, marginBottom: 4 }}>Votación del momento</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {mktVotos.map((v, i) => (
                      <span key={i} className="tiny" style={{ padding: '2px 8px', borderRadius: 999, background: v.v === 'Aprueba' ? 'rgba(52,211,153,.16)' : v.v === 'Rechaza' ? 'rgba(248,113,113,.16)' : 'rgba(168,85,247,.16)', color: v.v === 'Aprueba' ? '#34d399' : v.v === 'Rechaza' ? '#f87171' : '#a855f7' }}>
                        #{v.id} · {v.v}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 12, background: 'rgba(34,211,238,.08)', border: '1px solid rgba(34,211,238,.25)' }}>
              <div className="tiny muted"><b style={{ color: '#22d3ee' }}>🔒 El filtro antes de salir live:</b> solo lo que convence aquí se publica; lo que no, se descarta y enseña al sistema.</div>
            </div>
          </Card>
          <Card title={<><I_Chart size={15} style={{ marginRight: 8, color: 'var(--purple4)' }} /> Mercado Predictivo, probar antes de publicar</>}>
            <div className="small muted" style={{ margin: '-4px 0 14px', lineHeight: 1.55 }}>
              Nada sale live a ciegas. Cada pieza que se decide crear, imagen, colores, reel, video, texto o publicación, se prueba primero en este <b>mercado simulado</b>. Aquí los agentes de <b>MiroFish</b> hablan, reaccionan y analizan como lo haría tu audiencia real, y solo lo que convence sale a internet.
            </div>
            <div className="grid-3" style={{ marginBottom: 18 }}>
              {[{ v: '124', l: 'piezas probadas este mes' }, { v: '72', l: 'aprobadas y publicadas' }, { v: '58%', l: 'tasa de aprobación real' }].map((m, i) => (
                <div key={i} className="stat" style={{ padding: '14px 16px', borderRadius: 12, border: '1px solid var(--border2)', background: 'var(--bg2)' }}>
                  <div className="h27" style={{ color: 'var(--purple4)', fontWeight: 800 }}>{m.v}</div><div className="tiny muted">{m.l}</div>
                </div>
              ))}
            </div>
            <div className="tiny muted" style={{ fontWeight: 600, marginBottom: 10 }}>Qué analiza MiroFish antes de que algo salga live</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
              {MERCADO_ANALISIS.map(m => (
                <div key={m.k} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--border2)', background: 'var(--bg2)' }}>
                  <span style={{ fontSize: 20 }}>{m.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="small" style={{ fontWeight: 700 }}>{m.tipo}</div>
                    <div className="tiny muted">{m.que}</div>
                  </div>
                  <Badge tone="purple">{m.cuando}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* ===== CREATIVIDADES GENERADAS ===== */}
      {tab === 'creatividades' && (
        <>
          {/* KPIs de creatividades */}
          <div className="herr-stats mb14">
            <div className="herr-stat">
              <div className="tiny muted" style={{ fontWeight: 600 }}>Creatividades generadas</div>
              <div className="herr-stat-v" style={{ color: 'var(--purple4)' }}>10</div>
              <div className="tiny muted">para esta campaña</div>
            </div>
            <div className="herr-stat">
              <div className="tiny muted" style={{ fontWeight: 600 }}>Creatividad ganadora</div>
              <div className="row" style={{ gap: 8, marginTop: 4 }}>
                <span className="herr-stat-v" style={{ fontSize: 22 }}>img_07</span>
                <Badge tone="green">validada por Inteligencia Colectiva</Badge>
              </div>
            </div>
            <div className="herr-stat">
              <div className="tiny muted" style={{ fontWeight: 600 }}>Diferenciación vs competencia</div>
              <div className="herr-stat-v" style={{ color: 'var(--green)' }}>100%</div>
              <div className="tiny muted">única en tu zona y nicho</div>
            </div>
          </div>

          {/* Ranking tabla */}
          <Card title="Tus 10 creatividades, ranking por conversión simulada">
            <div className="small muted" style={{ margin: '-4px 0 6px', lineHeight: 1.55 }}>Estas son las 10 creatividades que generó el motor para tu campaña, ordenadas por la <b>conversión simulada</b>: el porcentaje de clicks que las IAs estiman mirando los ads reales de tu competencia, tu zona y tu nicho. La de arriba del todo (img_07) es la que va a publicar. Las que caen debajo del 2% se archivaron solas para no gastar presupuesto en piezas débiles.</div>
            <div className="tiny muted" style={{ marginBottom: 14 }}>Colores por ángulo: cada tarjeta muestra su paleta y el copy que la sostiene.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {CREAS_GEN.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', borderRadius: 12, border: `1px solid ${c.estado === 'activa ahora' ? 'rgba(34,197,94,.35)' : 'var(--border2)'}`, background: c.estado === 'activa ahora' ? 'rgba(34,197,94,.06)' : 'var(--bg2)' }}>
                  <span style={{ width: 60, fontWeight: 800, fontSize: 12.5 }}>{c.id}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="small" style={{ fontWeight: 600 }}>{c.angulo}</div>
                    <div className="row" style={{ gap: 6, marginTop: 3, alignItems: 'center' }}>
                      <span className="tiny muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ display: 'inline-flex', gap: 2 }}>
                          <span style={{ width: 10, height: 10, borderRadius: 99, background: c.dots[0], border: '1px solid var(--border2)' }} />
                          <span style={{ width: 10, height: 10, borderRadius: 99, background: c.dots[1], border: '1px solid var(--border2)' }} />
                        </span>
                        {c.paleta}
                      </span>
                    </div>
                  </div>
                  <div style={{ width: 130, textAlign: 'right' }}>
                    <div className="row" style={{ justifyContent: 'flex-end', gap: 8, alignItems: 'center' }}>
                      <div className="herr-bar" style={{ flex: 1 }}><div className="herr-bar-fill" style={{ width: `${(c.conv / 3.8) * 100}%`, background: c.estado === 'activa ahora' ? 'var(--green)' : 'var(--purple4)' }} /></div>
                      <span className="small" style={{ fontWeight: 800, minWidth: 36 }}>{c.conv}%</span>
                    </div>
                    <div className="tiny muted" style={{ marginTop: 2 }}>conv. simulada</div>
                  </div>
                  <Badge tone={c.estado === 'activa ahora' ? 'green' : c.estado === 'reserva' ? 'amber' : 'muted'}>{c.estado}</Badge>
                </div>
              ))}
              <div className="tiny muted" style={{ padding: '8px 14px', borderRadius: 10, background: 'var(--bg3)', border: '1px dashed var(--border2)' }}>
                📦 {CREAS_ARCHIVADAS}
              </div>
            </div>
          </Card>

          {/* ===== ÁNGULOS DEL NICHO EXPLICADOS ===== */}
          <Card className="mt16" title="Los 5 ángulos analizados del nicho">
            <div className="small muted" style={{ margin: '-6px 0 14px', lineHeight: 1.55 }}>Antes de generar las piezas, <b>GAIA</b> analizó los 50 ads activos de tu nicho y detectó los <b>5 ángulos de mensaje</b> que dominan tu mercado, los enfoques con los que tu competencia le habla a tus mismos clientes. Cada una de tus creatividades nace de uno de estos ángulos. Este es el detalle de cada uno, con la pieza que lo representa y cómo rindió:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {ANGULOS_NICHO.map(a => (
                <div key={a.nombre} style={{ position: 'relative', overflow: 'hidden', padding: '14px', borderRadius: 12, border: a.resultado === 'Ganadora' ? `1px solid ${a.paleta[0]}66` : '1px solid var(--border2)', background: a.resultado === 'Ganadora' ? `${a.paleta[0]}0d` : 'var(--bg3)' }}>
                  {/* Franja de color del ángulo */}
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: `linear-gradient(180deg, ${a.paleta[0]}, ${a.paleta[1]})` }} />
                  <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                    <div className="row" style={{ gap: 10 }}>
                      <span className="herr-ico" style={{ width: 36, height: 36, fontSize: 17, background: `${a.paleta[0]}26`, border: `1px solid ${a.paleta[0]}55` }}>{a.emoji}</span>
                      <div>
                        <div className="row" style={{ gap: 6, alignItems: 'center' }}>
                          <div className="small" style={{ fontWeight: 800 }}>{a.nombre}</div>
                          {/* Chips de paleta */}
                          <span title={a.colorSignificado} style={{ display: 'inline-flex', gap: 0 }}><span style={{ width: 14, height: 14, borderRadius: '4px 0 0 4px', background: a.paleta[0], border: '1px solid var(--border2)' }} /><span style={{ width: 14, height: 14, borderRadius: '0 4px 4px 0', background: a.paleta[1], border: '1px solid var(--border2)' }} /></span>
                        </div>
                        <div className="tiny muted">ej.: {a.ejemplo}</div>
                      </div>
                    </div>
                    <Badge tone={a.resultado === 'Ganadora' ? 'green' : a.resultado === 'Reserva' ? 'amber' : 'muted'}>{a.pieza} · {a.conv}{a.resultado === 'Ganadora' ? ' 🏆' : ''}</Badge>
                  </div>
                  <div className="tiny muted" style={{ lineHeight: 1.6, marginBottom: 8 }}>{a.que}</div>
                  {/* Código neurolingüístico */}
                  <div className="tiny" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '8px 10px', borderRadius: 10, background: `${a.paleta[0]}14`, border: `1px solid ${a.paleta[0]}30` }}>
                    <span style={{ color: a.paleta[0], fontWeight: 800 }}>🧠 {a.neuro.etiqueta}</span>
                    <span className="muted" style={{ flex: 1 }}>{a.neuro.desc}</span>
                  </div>
                  {/* Significado del color */}
                  <div className="tiny muted" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 6, padding: '8px 10px', borderRadius: 10, background: 'rgba(0,0,0,.25)', border: '1px dashed var(--border2)' }}>
                    <span style={{ width: 14, height: 14, borderRadius: 4, background: `linear-gradient(135deg, ${a.paleta[0]}, ${a.paleta[1]})`, flexShrink: 0, marginTop: 1 }} />
                    <span style={{ flex: 1 }}><b style={{ color: 'var(--text2)' }}>¿Por qué estos colores?</b> {a.colorSignificado}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="tiny muted" style={{ marginTop: 12, padding: '10px 12px', borderRadius: 10, background: 'rgba(168,85,247,.08)', border: '1px dashed rgba(168,85,247,.35)', lineHeight: 1.55 }}>
              🏆 <b style={{ color: 'var(--purple4)' }}>Conclusión del análisis:</b> tu audiencia responde mejor al ángulo <b>Tecnología</b> (3.8%). Las próximas piezas van a doblar la apuesta por ese enfoque, con <b>Emoción</b> y <b>Resultado</b> como refuerzo.
            </div>
          </Card>

          <div className="grid-2 mt16">
            {/* Cómo se generaron */}
            <Card title="Cómo se generaron tus creatividades">
              <div className="small muted" style={{ margin: '-6px 0 14px', lineHeight: 1.55 }}>El motor <b>GAIA</b> genera las piezas, y después <b>Inteligencia Colectiva</b> (un loop de 500 agentes), las valida simulando reacciones de tu audiencia. La <b>diferenciación pHash</b> compara el “ADN visual” de cada pieza contra los 50 ads activos de tu competencia: 100% significa que ninguna se parece a lo que ya está corriendo. La <b>similitud coseno</b> mide qué tanto difiere el mensaje: 0.28 = muy diferenciada.</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {MOTOR.map(m => (
                  <div key={m.k} style={{ padding: '11px 13px', borderRadius: 11, border: '1px solid var(--border2)', background: 'var(--bg3)' }}>
                    <div className="tiny muted" style={{ textTransform: 'uppercase', letterSpacing: '.4px', fontWeight: 700, fontSize: 10 }}>{m.k}</div>
                    <div className="small" style={{ fontWeight: 700, marginTop: 3 }}>{m.v}</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Plan y créditos */}
            <Card title="Plan actual">
              <div className="tiny muted" style={{ margin: '-6px 0 12px' }}>Créditos = el combustible que consume cada módulo al trabajar. Se renuevan cada mes con tu plan.</div>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div className="row" style={{ gap: 10 }}>
                  <span style={{ fontSize: 24 }}>💎</span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>Pro</div>
                    <div className="small" style={{ fontWeight: 700, color: 'var(--purple4)' }}>$297/mes</div>
                  </div>
                </div>
                <Badge tone="green">Plan actual</Badge>
              </div>

              <div className="tiny muted" style={{ fontWeight: 600, marginBottom: 4 }}>Créditos disponibles</div>
              <div className="row" style={{ alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 26, fontWeight: 800 }}>1,760</span>
                <span className="tiny muted">de 5,000 del plan</span>
              </div>
              <div className="herr-bar"><div className="herr-bar-fill" style={{ width: '35.2%', background: 'var(--purple4)' }} /></div>
              <div className="tiny muted" style={{ marginTop: 6 }}>Se renuevan el <b style={{ color: 'var(--txt)' }}>1 mayo</b> · en 27 días</div>

              <div className="tiny muted" style={{ fontWeight: 700, margin: '14px 0 8px', textTransform: 'uppercase', letterSpacing: '.4px' }}>Consumo de créditos este mes</div>
              <div className="tiny muted" style={{ marginBottom: 10, lineHeight: 1.5 }}><b style={{ color: 'var(--purple4)' }}>cr = crédito</b> · Cada acción del sistema (un análisis, una publicación, una conversación) consume créditos de tu plan.</div>
              <div className="small" style={{ fontWeight: 700, marginBottom: 8 }}>3,240 / 5,000 usados</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {CONSUMOS.map(c => (
                  <div key={c.concepto} className="row" style={{ justifyContent: 'space-between', padding: '8px 11px', borderRadius: 9, background: 'var(--bg3)', border: '1px solid var(--border2)' }}>
                    <div style={{ minWidth: 0 }}>
                      <div className="small" style={{ fontWeight: 600 }}>{c.concepto}</div>
                      <div className="tiny muted">{c.calc}</div>
                    </div>
                    <span className="small" style={{ fontWeight: 800 }} title="cr = créditos">{c.cr} cr</span>
                  </div>
                ))}
                <div className="row" style={{ justifyContent: 'space-between', padding: '10px 11px', borderRadius: 9, background: 'rgba(168,85,247,.1)', border: '1px solid rgba(168,85,247,.3)' }}>
                  <span className="small" style={{ fontWeight: 800 }}>Total consumido</span>
                  <span className="small" style={{ fontWeight: 800, color: 'var(--purple4)' }} title="cr = créditos">3,240 cr</span>
                </div>
              </div>

              <div className="divider" style={{ margin: '14px 0' }} />

              {/* Auto-recarga */}
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="row" style={{ gap: 10 }}>
                  <span className="herr-ico" style={{ background: 'rgba(168,85,247,.14)', color: 'var(--purple4)' }}><I_Zap size={16} /></span>
                  <div>
                    <div className="small" style={{ fontWeight: 600 }}>Auto-recarga</div>
                    <div className="tiny muted">Recarga automática al bajar de 500 créditos</div>
                  </div>
                </div>
                <button className={`toggle ${autoRecarga ? 'on' : ''}`} onClick={() => setAutoRecarga(!autoRecarga)} title={autoRecarga ? 'Desactivar auto-recarga' : 'Activar auto-recarga'}>
                  <span className="toggle-knob" />
                </button>
              </div>
            </Card>
          </div>

          {/* Comparar planes */}
          <Card title="Comparar planes" className="mt16">
            <div className="tiny muted" style={{ margin: '-6px 0 12px' }}>Créditos/mes y capacidad de clientes por plan. Tu plan actual queda marcado.</div>
            <div className="grid-3">
              {PLANES.map(pl => {
                const esActual = pl.nombre === planActual;
                return (
                <div key={pl.nombre} style={{ padding: 16, borderRadius: 13, border: `1px solid ${esActual ? 'rgba(168,85,247,.4)' : 'var(--border2)'}`, background: esActual ? 'rgba(168,85,247,.08)' : 'var(--bg2)' }}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 800 }}>{pl.nombre}</span>
                    {esActual && <Badge tone="purple">tu plan actual</Badge>}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, marginTop: 6, color: esActual ? 'var(--purple4)' : 'var(--txt)' }}>{pl.precio}</div>
                  <div className="small muted" style={{ marginTop: 4, lineHeight: 1.4 }}>{pl.detalle}</div>
                  <button className={`btn btn-sm mt16 ${esActual ? 'btn-ghost' : 'btn-primary'}`} style={{ width: '100%' }} onClick={() => { if (esActual) return; setPlanActual(pl.nombre); avisar(`✅ Cambiaste al plan ${pl.nombre} (${pl.precio}).`); }}>{esActual ? 'Plan actual' : 'Elegir'}</button>
                </div>
                );
              })}
            </div>
            <div className="tiny" style={{ marginTop: 12, color: 'var(--purple4)', fontWeight: 700, cursor: 'pointer' }}>Ver todos los planes →</div>
          </Card>
        </>
      )}

      {/* ===== VOTOS (resumen fijo al pie) ===== */}
      <Card title={<><I_Trend size={15} style={{ marginRight: 8, color: 'var(--purple4)' }} /> Votaciones recientes de la colectividad</>} className="mt16">
        <div className="tiny muted" style={{ margin: '-6px 0 14px' }}>Decisiones que los agentes tomaron votando. Verde = % a favor. Aprobado = se ejecuta solo.</div>
        <div className="grid-3">
          {VOTOS.map(v => (
            <div key={v.tema} style={{ padding: 14, borderRadius: 12, border: '1px solid var(--border2)', background: 'var(--bg2)' }}>
              <div className="row" style={{ gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 20 }}>{v.emoji}</span>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{v.tema}</span>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <div className="herr-bar" style={{ flex: 1 }}><div className="herr-bar-fill" style={{ width: `${v.aFavor}%`, background: 'var(--green)' }} /></div>
                <span className="xs" style={{ fontWeight: 800, color: 'var(--green)' }}>{v.aFavor}%</span>
              </div>
              <div className="row" style={{ justifyContent: 'space-between', marginTop: 10 }}>
                <span className="tiny muted">✓ a favor · ✗ {v.enContra}% en contra</span>
                <Badge tone={v.decision === 'Aprobado' ? 'green' : v.decision === 'Rechazado' ? 'red' : 'amber'}>{v.decision}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ===== MODAL: VER CREACIONES ===== */}
      <Modal open={galeriaOpen} onClose={() => setGaleriaOpen(false)} title="Todas las creaciones de la campaña">
        <div className="small muted" style={{ margin: '-8px 0 14px', lineHeight: 1.5 }}>Esto es lo que el motor generó para tu campaña. <b>✅ Elegida</b> = la IA la validó para publicar; <b>📌 Reserva</b> = la mantiene como plan B; <b>⚪ Disponible</b> = lista por si querés usarla; <b>📦 Archivada</b> = descartada por bajo rendimiento simulado.</div>
        <div className="row" style={{ gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          {(['todo', 'Imagen', 'Video'] as const).map(t => (
            <button key={t} className={`chip ${galeriaTipo === t ? 'chip-on' : ''}`} onClick={() => setGaleriaTipo(t)}>
              {t === 'todo' ? 'Todos' : t === 'Imagen' ? '🖼️ Imágenes' : '🎬 Videos'}
            </button>
          ))}
        </div>
        <div className="grid-2" style={{ gap: 12 }}>
          {GALERIA.filter(g => galeriaTipo === 'todo' || g.tipo === galeriaTipo).map(g => (
            <div key={g.id} style={{ padding: 12, borderRadius: 12, border: '1px solid var(--border2)', background: 'var(--bg2)' }}>
              <div style={{ height: 92, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, background: `linear-gradient(135deg, ${g.grad[0]}22, ${g.grad[1]}22)`, border: `1px solid ${g.grad[0]}44`, position: 'relative' }}>
                <span>{g.emoji}</span>
                <span style={{ position: 'absolute', top: 6, left: 6, fontSize: 9, fontWeight: 800, letterSpacing: '.3px', padding: '2px 7px', borderRadius: 99, background: 'var(--bg2)', border: '1px solid var(--border2)' }}>{g.tipo}</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 12.5, marginTop: 8, lineHeight: 1.3 }}>{g.titulo}</div>
              <div className="tiny muted" style={{ marginTop: 3 }}>{g.angulo}</div>
              <div className="row" style={{ justifyContent: 'space-between', marginTop: 8, alignItems: 'center' }}>
                <span className="tiny" style={{ fontWeight: 700 }}>{g.conv}</span>
                <Badge tone={g.resultado === 'elegida' ? 'green' : g.resultado === 'reserva' ? 'amber' : g.resultado === 'activa ahora' ? 'purple' : 'muted'}>{RESULTADO_LABEL[g.resultado]}</Badge>
              </div>
            </div>
          ))}
        </div>
        <div className="small" style={{ marginTop: 16, padding: '12px 14px', borderRadius: 10, background: 'var(--bg3)', border: '1px solid var(--border2)', lineHeight: 1.5 }}>
          <b>Resumen:</b> {GALERIA.filter(g => g.resultado === 'elegida').length} elegidas · {GALERIA.filter(g => g.resultado === 'reserva').length} en reserva · {GALERIA.filter(g => g.resultado === 'disponible').length} disponibles · {GALERIA.filter(g => g.resultado === 'archivada').length} archivadas.
        </div>
      </Modal>
    {/* ===== MODAL HISTORIAL DE TRABAJO ===== */}
      <Modal open={!!historialAgente} onClose={() => setHistorialAgente(null)} title="Historial de trabajo, últimos 7 días">
        {historialAgente && (
          <div>
            <div className="row" style={{ gap: 10, marginBottom: 14, alignItems: 'center' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, color: '#fff', background: `linear-gradient(135deg, ${historialAgente.color}, ${historialAgente.color}99)` }}>{historialAgente.nombre[0].toUpperCase()}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{historialAgente.nombre}</div>
                <div className="tiny muted">{historialAgente.rol} · Fase {historialAgente.fase}</div>
              </div>
            </div>
            <div className="small muted" style={{ marginBottom: 14, lineHeight: 1.5 }}>{historialAgente.descripcion}</div>
            <div className="xs muted" style={{ fontWeight: 800, letterSpacing: '.3px', marginBottom: 8 }}>HISTORIAL DE TRABAJO · ÚLTIMOS 7 DÍAS</div>
            <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--border2)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: 560 }}>
                <thead>
                  <tr style={{ background: 'var(--bg3)', textAlign: 'left' }}>
                    <th style={{ padding: '9px 12px', fontWeight: 700, color: 'var(--tx2)', whiteSpace: 'nowrap' }}>Fecha</th>
                    <th style={{ padding: '9px 12px', fontWeight: 700, color: 'var(--tx2)' }}>Tarea realizada</th>
                    <th style={{ padding: '9px 12px', fontWeight: 700, color: 'var(--tx2)', whiteSpace: 'nowrap' }}>Tiempo de trabajo</th>
                    <th style={{ padding: '9px 12px', fontWeight: 700, color: 'var(--tx2)' }}>Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {historialAgente.historial.map((h, j) => (
                    <tr key={j} style={{ borderTop: '1px solid var(--border2)', verticalAlign: 'top' }}>
                      <td style={{ padding: '9px 12px', whiteSpace: 'nowrap', color: 'var(--tx2)' }}>
                        <div style={{ fontWeight: 600, color: 'var(--tx)' }}>{h.fecha}</div>
                        <div className="tiny muted">{h.hace}</div>
                      </td>
                      <td style={{ padding: '9px 12px', color: 'var(--tx)' }}>{h.tarea}</td>
                      <td style={{ padding: '9px 12px', whiteSpace: 'nowrap', color: 'var(--tx2)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><I_Clock size={13} style={{ color: historialAgente.color }} />{h.duracion}</span>
                      </td>
                      <td style={{ padding: '9px 12px', color: 'var(--tx2)' }}>
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: 11.5, fontWeight: 700, background: `${historialAgente.color}1a`, color: historialAgente.color }}>{h.resultado}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="tiny muted" style={{ marginTop: 12, textAlign: 'center' }}>Mostrando las tareas de los últimos 7 días.</div>
          </div>
        )}
      </Modal>
    <Toast show={!!toast} text={toast} />
    </>
  );
}

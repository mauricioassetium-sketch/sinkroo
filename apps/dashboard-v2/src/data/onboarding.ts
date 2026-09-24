// =============================================================================================
// PRIMEROS PASOS — el onboarding, en cinco sub-pantallas.
//
// POR QUÉ ESTÁ ARMADO ASÍ
//
//  1. Sigue el mismo patrón que Campañas: un paso por pantalla con el stepper arriba. El dueño
//     rechazó el scroll largo; cinco pantallas cortas se terminan, una larga se abandona.
//  2. Pide SOLO lo que el motor no puede deducir. Todo lo demás va con su `infiere`: la frase que
//     dice de dónde lo saca («de tu Instagram saco quién te comenta y cada cuánto publicás»). Así
//     el cliente ve que no está llenando un formulario: está corrigiendo lo que el motor ya sabe.
//  3. Cada paso dice PARA QUÉ es, en términos del negocio del cliente (no del producto). Si un dato
//     no cambia nada de lo que el motor hace, no se pregunta.
//  4. Ningún paso es obligatorio: todos tienen salida. «El motor arranca igual» es la verdad del
//     producto y el onboarding no puede contradecirla.
//  5. El último paso no termina en un «listo»: arranca el motor y muestra el plan de la primera
//     semana, con lo que va a pasar cada día y lo que cuesta. La primera cosa que el cliente ve es
//     trabajo del motor, no una pantalla de bienvenida.
// =============================================================================================

export type CampoOnb = {
  id: string;
  etiqueta: string;
  tipo: 'texto' | 'numero' | 'chips' | 'chips-multi' | 'material';
  ayuda: string;
  opciones?: string[];
  detalle?: Record<string, string>;
  /** Ancho del control cuando la fila tiene varios campos chicos. */
  ancho?: number;
};

export type PasoOnb = {
  n: number;
  t: string;
  d: string;
  icono: string;
  /** Qué dice el paso de sí mismo: el titular de la pantalla. */
  titular: string;
  paraQue: string;
  infiere?: string;
  /** Campos que hacen falta para dar el paso por hecho. */
  minima: string[];
  campos: CampoOnb[];
  /** Aclaración al pie, pegada a los controles (nunca en el pie de la pantalla). */
  nota?: string;
};

// ---------------------------------------------------------------------------------------------
// Lo que se puede elegir sin escribir una letra. El cliente escribe sólo lo suyo: su negocio,
// sus precios y sus palabras.
// ---------------------------------------------------------------------------------------------

export const PUBLICOS = [
  'Mujeres de 25 a 40', 'Hombres de 25 a 45', 'Piel sensible o con acné', 'Regalos y packs',
  'Familias', 'Profesionales y oficina', 'Deportistas', 'Todo el país, por envío',
];
export const DETALLE_PUBLICO: Record<string, string> = {
  'Mujeres de 25 a 40': 'Es el público que ya te compra: la pieza le habla a alguien parecido.',
  'Hombres de 25 a 45': 'Cambia el tono y las fotos: menos rutina, más resultado.',
  'Piel sensible o con acné': 'Se habla del problema antes que del producto: ardor, rojeces, brotes.',
  'Regalos y packs': 'Las piezas muestran el pack armado y el envío, no el producto solo.',
  'Familias': 'Cambia el ángulo: rendimiento y precio por uso, no lujo.',
  'Profesionales y oficina': 'Rutina corta y que no se note: diez minutos a la mañana.',
  'Deportistas': 'Se habla de piel después del entrenamiento y de transpiración.',
  'Todo el país, por envío': 'Abre la pauta a todo el país en vez de tu zona: sube el alcance y baja el clic.',
};

export const OBJETIVOS_NEGOCIO = [
  'Vender más de lo que ya vendo', 'Salir de mi zona y vender al país', 'Recuperar clientes que no volvieron',
  'Llenar el mes con pocas ventas grandes', 'Hacer conocida la marca',
];
export const DETALLE_OBJETIVO: Record<string, string> = {
  'Vender más de lo que ya vendo': 'El motor empuja lo que ya vende y compara el costo por venta contra el de hoy.',
  'Salir de mi zona y vender al país': 'Primero se prueba el envío fuera de tu zona, con presupuesto chico.',
  'Recuperar clientes que no volvieron': 'Arranca por los que compraron una vez y no volvieron: es lo más barato de recuperar.',
  'Llenar el mes con pocas ventas grandes': 'Se pauta el pack grande y se mide el ticket promedio, no la cantidad.',
  'Hacer conocida la marca': 'Se paga alcance en vez de clics: se mide cuánta gente nueva te vio y volvió.',
};

export const PRESUPUESTOS = ['$10 por día', '$20 por día', '$30 por día', '$50 por día', 'Lo decido después'];
export const DETALLE_PRESUPUESTO: Record<string, string> = {
  '$10 por día': 'Alcanza para una campaña con dos variantes: es el piso para empezar a medir.',
  '$20 por día': 'Lo que hoy rinde más en tu cuenta: alcanza para dos campañas y una prueba.',
  '$30 por día': 'Tres campañas a la vez, con pruebas en dos públicos distintos.',
  '$50 por día': 'Para escalar lo que ya funciona: se reparte entre lo que rinde y una prueba nueva.',
  'Lo decido después': 'El motor arranca con $20 por día y no lo mueve sin tu permiso.',
};

// ---------------------------------------------------------------------------------------------
// LA PRIMERA SEMANA — lo que hace el motor desde que se aprieta «Arrancar». No es una promesa
// vaga: es el trabajo de cada día, con lo que cuesta en créditos. Los 500 del público no cuestan
// y la investigación del mercado tampoco: lo único que gasta plata de verdad es publicar.
// ---------------------------------------------------------------------------------------------

export const PRIMERA_SEMANA: { dia: string; quien: string; que: string; creditos: string }[] = [
  { dia: 'Día 1', quien: 'Lux', que: 'Lee los anuncios de tus 5 competidores y te dice con qué ángulo gana el rubro hoy.', creditos: '0 créditos' },
  { dia: 'Día 2', quien: 'Nia', que: 'Escribe 6 variantes de la primera pieza con ese ángulo, en tu tono y con tus precios.', creditos: '96 créditos' },
  { dia: 'Día 3', quien: 'El panel', que: 'Los 5 jueces las puntúan y los 500 del público reaccionan: quedan ordenadas y las 3 primeras pasan.', creditos: '48 créditos' },
  { dia: 'Día 4', quien: 'Kai', que: 'Publica las 3 mejores en tus cuentas y empieza a medir el costo por venta.', creditos: '0 créditos' },
  { dia: 'Día 5', quien: 'Kai', que: 'Ajusta la puja con lo que volvió el primer día y frena lo que no rinde.', creditos: '0 créditos' },
  { dia: 'Día 6', quien: 'Rex', que: 'Mueve el presupuesto al público que está comprando y te avisa por qué.', creditos: '0 créditos' },
  { dia: 'Día 7', quien: 'Sol', que: 'Te da el informe de la semana: qué se vendió, cuánto costó cada venta y qué conviene hacer.', creditos: '0 créditos' },
];

/** Lo que cuesta la primera semana en créditos, sumando la lista de arriba. */
export const COSTO_PRIMERA_SEMANA = PRIMERA_SEMANA.reduce((a, d) => a + Number((d.creditos.match(/\d+/) || ['0'])[0]), 0);

// ---------------------------------------------------------------------------------------------
// LAS CONEXIONES — de dónde publica y por dónde pregunta. Cada una declara qué habilita: sin la
// cuenta conectada, el motor no publica ahí (y eso tiene que verse en la pantalla, no en un aviso).
// ---------------------------------------------------------------------------------------------

export const CONEXIONES_ONB: { key: string; nombre: string; icono: string; habilitadoHoy: boolean; detalle: string }[] = [
  { key: 'instagram', nombre: 'Instagram', icono: '📸', habilitadoHoy: true, detalle: 'Publicar piezas y leer comentarios y mensajes.' },
  { key: 'facebook', nombre: 'Facebook', icono: '👍', habilitadoHoy: true, detalle: 'Publicar y pautar en la misma cuenta de Meta.' },
  { key: 'whatsapp', nombre: 'WhatsApp de tu negocio', icono: '💬', habilitadoHoy: true, detalle: 'Contestar solo, mandar la invitación a un referido y pedir la reseña.' },
  { key: 'email', nombre: 'Tu email', icono: '✉️', habilitadoHoy: false, detalle: 'Mandar el informe semanal y las secuencias a tus clientes.' },
  { key: 'tienda', nombre: 'Tu tienda online', icono: '🛒', habilitadoHoy: false, detalle: 'Leer precios y stock, y saber qué se vendió sin que lo cargues.' },
];

// ---------------------------------------------------------------------------------------------
// LOS CINCO PASOS
// ---------------------------------------------------------------------------------------------

export const PASOS_ONB: PasoOnb[] = [
  {
    n: 1, t: 'Tu negocio', d: 'Qué vendés y a quién', icono: '🏪',
    titular: 'Tu negocio, en cuatro datos',
    paraQue: 'Con esto el motor sabe a quién le habla cada pieza. Es lo único que no puede deducir de ningún lado y lo que más cambia el resultado.',
    infiere: 'De tu Instagram saca tu tono, cada cuánto publicás y quién te comenta. De tu web, los precios y qué es lo que más se vende.',
    minima: ['negocio_nombre', 'negocio_rubro', 'negocio_publico', 'negocio_objetivo'],
    campos: [
      { id: 'negocio_nombre', etiqueta: 'Cómo se llama tu negocio', tipo: 'texto', ayuda: 'El nombre que usa la gente cuando lo recomienda.' },
      { id: 'negocio_link', etiqueta: 'Tu Instagram o tu web', tipo: 'texto', ayuda: 'De acá el motor saca tu tono, tus precios y a quién le hablás. Con el link no hace falta que llenes nada más.' },
      { id: 'negocio_rubro', etiqueta: 'Qué vendés', tipo: 'chips-multi', ayuda: 'Elegí lo que vendés: puede ser más de una cosa.',
        opciones: ['Skincare', 'Maquillaje', 'Perfumes', 'Accesorios', 'Ropa', 'Servicios'],
        detalle: {
          'Skincare': 'El motor ya sabe qué se dice del rubro y qué está prohibido prometer (nada de resultados médicos).',
          'Maquillaje': 'Las piezas muestran resultado en piel y pasos cortos, en video.',
          'Perfumes': 'Se pauta por deseo y ocasión, no por precio.',
          'Accesorios': 'Se mide la reventa: el mismo cliente vuelve por otra pieza.',
          'Ropa': 'Se cambia la pauta por temporada y por talle, no por producto.',
          'Servicios': 'Se vende con prueba social y disponibilidad, no con producto.',
        } },
      { id: 'negocio_publico', etiqueta: 'A quién le hablás', tipo: 'chips-multi', ayuda: 'Elegí hasta tres: define el mensaje y el público que se pauta.',
        opciones: PUBLICOS, detalle: DETALLE_PUBLICO },
      { id: 'negocio_objetivo', etiqueta: 'Qué querés primero', tipo: 'chips', ayuda: 'Se puede cambiar cuando quieras: es un objetivo, no una jaula.',
        opciones: OBJETIVOS_NEGOCIO, detalle: DETALLE_OBJETIVO },
    ],
    nota: 'Si dejás el link, el motor completa esto solo en unas horas y te avisa qué corrigió.',
  },
  {
    n: 2, t: 'Qué vendés', d: 'Productos y precios', icono: '💵',
    titular: 'Lo que vendés, con su precio',
    paraQue: 'El motor no inventa precios: si los sabe, las piezas y los anuncios calculan la ganancia real y el costo por venta. Sin precios, la campaña se mide a ciegas.',
    infiere: 'Con tu tienda conectada, los precios y el stock se leen de ahí y se mantienen solos.',
    minima: ['prod_1', 'precio_1', 'formas_pago'],
    campos: [
      { id: 'prod_1', etiqueta: 'Lo que más vendés', tipo: 'texto', ayuda: 'El producto que te da de comer. Se empuja primero ese.' },
      { id: 'precio_1', etiqueta: 'A cuánto lo vendés', tipo: 'numero', ayuda: 'En dólares. Si es en tu moneda, el panel muestra la equivalencia.', ancho: 160 },
      { id: 'prod_2', etiqueta: 'El segundo que más vendés', tipo: 'texto', ayuda: 'Sirve para las piezas que muestran el pack o el combo.' },
      { id: 'precio_2', etiqueta: 'Su precio', tipo: 'numero', ayuda: 'En dólares.', ancho: 160 },
      { id: 'formas_pago', etiqueta: 'Formas de pago que aceptás', tipo: 'chips-multi', ayuda: 'El anuncio y la pieza dicen el botón y la aclaración que correspondan.',
        opciones: ['Efectivo', 'Transferencia bancaria', 'Tarjeta de débito o crédito', 'Cuotas sin interés', 'Mercado Pago', 'PayPal', 'USDT (cripto)', 'Bitcoin (cripto)'] },
      { id: 'envio', etiqueta: 'Cómo lo entregás', tipo: 'chips', ayuda: 'Es lo primero que pregunta el que te compra por primera vez.',
        opciones: ['Envío gratis desde cierto monto', 'Envío a todo el país', 'Sólo retiro en el local', 'Entrego yo en la zona'],
        detalle: {
          'Envío gratis desde cierto monto': 'Es la ventaja que más sube el ticket: se dice en la pieza.',
          'Envío a todo el país': 'Abre la pauta afuera de tu zona, con presupuesto chico la primera semana.',
          'Sólo retiro en el local': 'Se pauta sólo tu zona y se dice el horario de retiro.',
          'Entrego yo en la zona': 'Se pauta a pocos kilómetros y se promete entrega en el día.',
        } },
    ],
    nota: 'Los precios se pueden cargar después: hasta entonces, las piezas no hablan de precio ni de ofertas.',
  },
  {
    n: 3, t: 'Tu material', d: 'Lo que ya tenés', icono: '📷',
    titular: 'Tu material, no el de plantilla',
    paraQue: 'Es lo que hace que la pieza se vea tuya: tus fotos, tus reseñas y tu logo. El motor arranca igual sin nada, pero con material real la pieza se parece a tu negocio.',
    infiere: 'Nada: el material es sólo tuyo. Por eso es lo único que se sube a mano.',
    minima: ['mat:fotos_producto'],
    campos: [
      { id: 'material', etiqueta: 'Tu carpeta', tipo: 'material', ayuda: 'Elegí lo que ya está subido o sumá algo nuevo. Un producto nuevo se sube acá.' },
    ],
    nota: 'Puede quedar a medias: se puede seguir subiendo desde cualquier campaña, y lo que subas queda en tu carpeta para la próxima.',
  },
  {
    n: 4, t: 'Cómo trabajás', d: 'Tono, presupuesto y frenos', icono: '🎚️',
    titular: 'Cómo querés que trabaje',
    paraQue: 'Define cómo suena cada pieza, cuánto puede gastar y qué no puede hacer nunca sin preguntarte. Es lo que hace que puedas dejarlo trabajando sin mirarlo.',
    infiere: 'El tono se ajusta solo con tus conversaciones: si hablás corto y directo, las piezas salen así.',
    minima: ['tono', 'presupuesto'],
    campos: [
      { id: 'tono', etiqueta: 'Cuál es tu tono al conversar', tipo: 'chips-multi', ayuda: 'Elegí los que te representen: con dos alcanza.',
        opciones: ['Cercano y cálido', 'Directo y sin vueltas', 'Divertido y descontracturado', 'Profesional y formal', 'Experto y educativo', 'Premium y sobrio'] },
      { id: 'tono_texto', etiqueta: 'Palabras que usás siempre', tipo: 'texto', ayuda: 'Opcional: las muletillas de tu marca y las palabras que no dirías nunca.' },
      { id: 'presupuesto', etiqueta: 'Cuánto querés invertir por día', tipo: 'chips', ayuda: 'Es un techo: el motor no lo pasa y no lo mueve sin tu permiso.',
        opciones: PRESUPUESTOS, detalle: DETALLE_PRESUPUESTO },
      { id: 'modo', etiqueta: 'Cuánta autonomía le das', tipo: 'chips', ayuda: 'Se puede cambiar cuando quieras desde Cuenta y autonomía.',
        opciones: ['Manual', 'Compartido', 'Automático'],
        detalle: {
          'Manual': 'Prepara todo y no publica nada hasta que se lo pidas. Es el más lento y el más controlado.',
          'Compartido': 'Hace lo reversible solo y te pide el OK para lo que gasta o publica. Es con el que trabaja tu cuenta hoy.',
          'Automático': 'Decide y ejecuta, y te enterás después en la bitácora. Todo queda reversible 24 horas.',
        } },
    ],
    nota: 'Los frenos ya vienen puestos y no se tocan desde acá: no publica de noche, no manda más de un mensaje por persona por día y no toca el presupuesto sin permiso.',
  },
  {
    n: 5, t: 'Conectar', d: 'Dónde publica', icono: '🔌',
    titular: 'Dónde publica y con qué',
    paraQue: 'El motor publica en tus cuentas, no en las nuestras. Cada conexión declara qué habilita: sin la cuenta, no publica ahí.',
    infiere: 'Si ya usás el mismo email en tu tienda y en Instagram, el motor reconoce la marca y avisa antes de conectar nada.',
    minima: ['conectadas'],
    campos: [],
    nota: 'La verificación de identidad es aparte y es obligatoria para pautar: hasta que esté, el motor prepara y no publica.',
  },
];

/** El paso que el cliente tiene que terminar ahora: el primero sin completar. */
export const siguientePaso = (hechos: number[]) =>
  PASOS_ONB.find(p => !hechos.includes(p.n))?.n || 5;

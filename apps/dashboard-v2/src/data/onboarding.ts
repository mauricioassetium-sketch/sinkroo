// =============================================================================================
// PRIMEROS PASOS — el onboarding, en cinco sub-pantallas.
//
// POR QUÉ ESTÁ ARMADO ASÍ
//
//  1. Sigue el mismo patrón que Campañas: un paso por pantalla con el stepper arriba. El dueño
//     rechazó el scroll largo; cinco pantallas cortas se terminan, una larga se abandona.
//  2. Pide SOLO lo que el motor no puede deducir. Todo lo demás va con su `infiere`: la frase que
//     dice de dónde lo saca («de su Instagram saco quién le comenta y cada cuánto publica»). Así
//     el cliente ve que no está llenando un formulario: está corrigiendo lo que el motor ya sabe.
//  3. Cada paso dice PARA QUÉ es, en términos del negocio del cliente (no del producto). Si un dato
//     no cambia nada de lo que el motor hace, no se pregunta.
//  4. Ningún paso es obligatorio: todos tienen salida. «El motor arranca igual» es la verdad del
//     producto y el onboarding no puede contradecirla.
//  5. El último paso no termina en un «listo»: arranca el motor y muestra el plan de la primera
//     semana, con lo que va a pasar cada día y lo que cuesta. La primera cosa que el cliente ve es
//     trabajo del motor, no una pantalla de bienvenida.
// =============================================================================================

// ---------------------------------------------------------------------------------------------
// LO QUE SE PUEDE SUBIR — la ingesta acepta lo que el cliente tenga, no un formato ideal.
// Cada tipo declara qué hace el motor con eso: si no lo dijera, subir un PDF sería una apuesta.
// ---------------------------------------------------------------------------------------------
export const TIPOS_ARCHIVO: { para: string; lectura: string }[] = [
  { para: 'PDF, Word o texto', lectura: 'lee el contenido: qué vende, precios, promesas y condiciones.' },
  { para: 'Excel o planilla', lectura: 'toma la lista de precios y el stock tal como está.' },
  { para: 'Fotos', lectura: 'sus productos reales: fondos, colores y cómo se ve la marca.' },
  { para: 'Videos', lectura: 'clips para armar la pieza y mostrar el producto en uso.' },
  { para: 'Audio o voz', lectura: 'el tono de la marca: cómo se dice, no sólo qué se dice.' },
  { para: 'PowerPoint o presentación', lectura: 'lee el orden del relato y los datos que ya tiene armados.' },
];

export const ARCHIVOS_ACEPTADOS =
  '.pdf,.doc,.docx,.rtf,.txt,.md,.xls,.xlsx,.csv,.ppt,.pptx,.odt,.ods,image/*,video/*,audio/*';

export type CampoOnb = {
  id: string;
  etiqueta: string;
  tipo: 'texto' | 'texto-largo' | 'numero' | 'chips' | 'chips-multi' | 'material' | 'docs';
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
  'Mujeres de 25 a 40': 'Es el público que ya le compra: la pieza le habla a alguien parecido.',
  'Hombres de 25 a 45': 'Cambia el tono y las fotos: menos rutina, más resultado.',
  'Piel sensible o con acné': 'Se habla del problema antes que del producto: ardor, rojeces, brotes.',
  'Regalos y packs': 'Las piezas muestran el pack armado y el envío, no el producto solo.',
  'Familias': 'Cambia el ángulo: rendimiento y precio por uso, no lujo.',
  'Profesionales y oficina': 'Rutina corta y que no se note: diez minutos a la mañana.',
  'Deportistas': 'Se habla de piel después del entrenamiento y de transpiración.',
  'Todo el país, por envío': 'Abre la pauta a todo el país en vez de su zona: sube el alcance y baja el clic.',
};

export const OBJETIVOS_NEGOCIO = [
  'Vender más de lo que ya vende', 'Salir de su zona y vender al país', 'Recuperar clientes que no volvieron',
  'Llenar el mes con pocas ventas grandes', 'Hacer conocida la marca',
];
export const DETALLE_OBJETIVO: Record<string, string> = {
  'Vender más de lo que ya vende': 'El motor empuja lo que ya vende y compara el costo por venta contra el de hoy.',
  'Salir de su zona y vender al país': 'Primero se prueba el envío fuera de su zona, con presupuesto chico.',
  'Recuperar clientes que no volvieron': 'Arranca por los que compraron una vez y no volvieron: es lo más barato de recuperar.',
  'Llenar el mes con pocas ventas grandes': 'Se pauta el pack grande y se mide el ticket promedio, no la cantidad.',
  'Hacer conocida la marca': 'Se paga alcance en vez de clics: se mide cuánta gente nueva le vio y volvió.',
};

export const PRESUPUESTOS = ['$10 por día', '$20 por día', '$30 por día', '$50 por día', 'Lo decide después'];
export const DETALLE_PRESUPUESTO: Record<string, string> = {
  '$10 por día': 'Alcanza para una campaña con dos variantes: es el piso para empezar a medir.',
  '$20 por día': 'Lo que hoy rinde más en su cuenta: alcanza para dos campañas y una prueba.',
  '$30 por día': 'Tres campañas a la vez, con pruebas en dos públicos distintos.',
  '$50 por día': 'Para escalar lo que ya funciona: se reparte entre lo que rinde y una prueba nueva.',
  'Lo decide después': 'El motor arranca con $20 por día y no lo mueve sin su permiso.',
};

// ---------------------------------------------------------------------------------------------
// LA PRIMERA SEMANA — lo que hace el motor desde que se aprieta «Arrancar». No es una promesa
// vaga: es el trabajo de cada día, con lo que cuesta en créditos. Los 500 del público no cuestan
// y la investigación del mercado tampoco: lo único que gasta dinero de verdad es publicar.
// ---------------------------------------------------------------------------------------------

export const PRIMERA_SEMANA: { dia: string; quien: string; que: string; creditos: string }[] = [
  { dia: 'Día 1', quien: 'Lux', que: 'Lee los anuncios de sus 5 competidores y le dice con qué ángulo gana el rubro hoy.', creditos: '0 créditos' },
  { dia: 'Día 2', quien: 'Nia', que: 'Escribe 6 variantes de la primera pieza con ese ángulo, en su tono y con sus precios.', creditos: '96 créditos' },
  { dia: 'Día 3', quien: 'El panel', que: 'Los 5 jueces las puntúan y los 500 del público reaccionan: quedan ordenadas y las 3 primeras pasan.', creditos: '48 créditos' },
  { dia: 'Día 4', quien: 'Kai', que: 'Publica las 3 mejores en sus cuentas y empieza a medir el costo por venta.', creditos: '0 créditos' },
  { dia: 'Día 5', quien: 'Kai', que: 'Ajusta la puja con lo que volvió el primer día y frena lo que no rinde.', creditos: '0 créditos' },
  { dia: 'Día 6', quien: 'Rex', que: 'Mueve el presupuesto al público que está comprando y le avisa por qué.', creditos: '0 créditos' },
  { dia: 'Día 7', quien: 'Sol', que: 'Le da el informe de la semana: qué se vendió, cuánto costó cada venta y qué conviene hacer.', creditos: '0 créditos' },
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
  { key: 'whatsapp', nombre: 'WhatsApp de su negocio', icono: '💬', habilitadoHoy: true, detalle: 'Contestar solo, mandar la invitación a un referido y pedir la reseña.' },
  { key: 'email', nombre: 'Su email', icono: '✉️', habilitadoHoy: false, detalle: 'Mandar el informe semanal y las secuencias a sus clientes.' },
  { key: 'tienda', nombre: 'Su tienda online', icono: '🛒', habilitadoHoy: false, detalle: 'Leer precios y stock, y saber qué se vendió sin que lo cargue.' },
];

// ---------------------------------------------------------------------------------------------
// LOS CINCO PASOS
// ---------------------------------------------------------------------------------------------

export const PASOS_ONB: PasoOnb[] = [
  {
    n: 1, t: 'Su negocio', d: 'Qué vende y a quién', icono: '🏪',
    titular: 'Cuéntenos su negocio',
    paraQue: 'Con su descripción el motor entiende qué vende, a quién le vende y con qué palabras lo cuenta. Es lo primero que lee antes de escribir una sola pieza.',
    infiere: 'Del link de su Instagram o su web saca los precios, el tono y cada cuánto publica. Si sube su catálogo, también los productos.',
    minima: ['negocio_nombre', 'descripcion'],
    campos: [
      { id: 'negocio_nombre', etiqueta: 'Cómo se llama su negocio', tipo: 'texto', ayuda: 'El nombre que usa la gente cuando lo recomienda.' },
      { id: 'descripcion', etiqueta: 'Cuéntenos qué hace', tipo: 'texto-largo', ayuda: 'Escriba como se lo contaría a alguien que no le conoce: qué vende, en qué se diferencia y a quién le vende. Con tres o cuatro líneas alcanza, y no tiene que quedar perfecto: el motor lo ordena.' },
      { id: 'negocio_link', etiqueta: 'Su Instagram o su web (opcional)', tipo: 'texto', ayuda: 'Con el link, el motor completa solo los precios, el tono y el catálogo.' },
      { id: 'negocio_rubro', etiqueta: 'Qué vende', tipo: 'chips-multi', ayuda: 'Elija lo que vende: puede ser más de una cosa.',
        opciones: ['Skincare', 'Maquillaje', 'Perfumes', 'Accesorios', 'Ropa', 'Servicios'],
        detalle: {
          'Skincare': 'El motor ya sabe qué se dice del rubro y qué está prohibido prometer (nada de resultados médicos).',
          'Maquillaje': 'Las piezas muestran resultado en piel y pasos cortos, en video.',
          'Perfumes': 'Se pauta por deseo y ocasión, no por precio.',
          'Accesorios': 'Se mide la reventa: el mismo cliente vuelve por otra pieza.',
          'Ropa': 'Se cambia la pauta por temporada y por talle, no por producto.',
          'Servicios': 'Se vende con prueba social y disponibilidad, no con producto.',
        } },
      { id: 'negocio_publico', etiqueta: 'A quién le habla', tipo: 'chips-multi', ayuda: 'Elija hasta tres: define el mensaje y el público que se pauta.',
        opciones: PUBLICOS, detalle: DETALLE_PUBLICO },
      { id: 'negocio_objetivo', etiqueta: 'Qué quiere primero', tipo: 'chips', ayuda: 'Se puede cambiar cuando quiera: es un objetivo, no una jaula.',
        opciones: OBJETIVOS_NEGOCIO, detalle: DETALLE_OBJETIVO },
    ],
    nota: 'Lo único obligatorio es el nombre y la descripción. Todo lo demás se completa después y el motor arranca igual.',
  },
  {
    n: 2, t: 'Qué vende', d: 'Productos y precios', icono: '💵',
    titular: 'Lo que vende, con su precio',
    paraQue: 'El motor no inventa precios: si los sabe, las piezas y los anuncios calculan la ganancia real y el costo por venta. Sin precios, la campaña se mide a ciegas.',
    infiere: 'Con su tienda conectada, los precios y el stock se leen de ahí y se mantienen solos.',
    minima: ['prod_1', 'precio_1', 'formas_pago'],
    campos: [
      { id: 'prod_1', etiqueta: 'Lo que más vende', tipo: 'texto', ayuda: 'El producto que sostiene el negocio. Ese se empuja primero.' },
      { id: 'precio_1', etiqueta: 'A cuánto lo vende', tipo: 'numero', ayuda: 'En dólares. Si es en su moneda, el panel muestra la equivalencia.', ancho: 160 },
      { id: 'prod_2', etiqueta: 'El segundo que más vende', tipo: 'texto', ayuda: 'Sirve para las piezas que muestran el pack o el combo.' },
      { id: 'precio_2', etiqueta: 'Su precio', tipo: 'numero', ayuda: 'En dólares.', ancho: 160 },
      { id: 'formas_pago', etiqueta: 'Formas de pago que acepta', tipo: 'chips-multi', ayuda: 'El anuncio y la pieza dicen el botón y la aclaración que correspondan.',
        opciones: ['Efectivo', 'Transferencia bancaria', 'Tarjeta de débito o crédito', 'Cuotas sin interés', 'Mercado Pago', 'PayPal', 'USDT (cripto)', 'Bitcoin (cripto)'] },
      { id: 'envio', etiqueta: 'Cómo lo entrega', tipo: 'chips', ayuda: 'Es lo primero que pregunta el que le compra por primera vez.',
        opciones: ['Envío gratis desde cierto monto', 'Envío a todo el país', 'Sólo retiro en el local', 'Entrega propia en su zona'],
        detalle: {
          'Envío gratis desde cierto monto': 'Es la ventaja que más sube el ticket: se dice en la pieza.',
          'Envío a todo el país': 'Abre la pauta afuera de su zona, con presupuesto chico la primera semana.',
          'Sólo retiro en el local': 'Se pauta sólo su zona y se dice el horario de retiro.',
          'Entrega propia en su zona': 'Se pauta a pocos kilómetros y se promete entrega en el día.',
        } },
    ],
    nota: 'Los precios se pueden cargar después: hasta entonces, las piezas no hablan de precio ni de ofertas.',
  },
  {
    n: 3, t: 'Su material', d: 'Suba lo que tenga', icono: '📎',
    titular: 'Suba lo que ya tiene',
    paraQue: 'No haga trabajo de más: suba su catálogo, la lista de precios, las fotos de sus productos, las reseñas de sus clientes o el PDF de su marca, y el motor lo lee. Con eso las piezas salen con su información real y no con texto genérico.',
    infiere: 'Si no sube nada, el motor arranca igual con su descripción y lo que encuentra en su Instagram o su web: va a preguntar menos y a copiar menos.',
    minima: ['archivos'],
    campos: [
      { id: 'docs', etiqueta: 'Sus archivos', tipo: 'docs', ayuda: 'Suelte aquí lo que tenga o elija archivos: PDF, Word, Excel, PowerPoint, fotos, videos o audios. Puede subir varios a la vez y de cualquier formato.' },
    ],
    nota: 'Lo que suba queda en su carpeta y se puede usar en cualquier campaña. Nada se publica con sus archivos sin que lo vea antes: primero pasa por el panel.',
  },
  {
    n: 4, t: 'Cómo trabaja', d: 'Tono, presupuesto y frenos', icono: '🎚️',
    titular: 'Cómo quiere que trabaje',
    paraQue: 'Define cómo suena cada pieza, cuánto puede gastar y qué no puede hacer nunca sin preguntarle. Es lo que le permite dejarlo trabajando sin mirarlo.',
    infiere: 'El tono se ajusta solo con sus conversaciones: si habla corto y directo, las piezas salen así.',
    minima: ['tono', 'presupuesto'],
    campos: [
      { id: 'tono', etiqueta: 'Cuál es su tono al conversar', tipo: 'chips-multi', ayuda: 'Elija los que le representen: con dos alcanza.',
        opciones: ['Cercano y cálido', 'Directo y sin vueltas', 'Divertido y descomplicado', 'Profesional y formal', 'Experto y educativo', 'Premium y sobrio'] },
      { id: 'tono_texto', etiqueta: 'Palabras que usa siempre', tipo: 'texto', ayuda: 'Opcional: las muletillas de su marca y las palabras que no diría nunca.' },
      { id: 'presupuesto', etiqueta: 'Cuánto quiere invertir por día', tipo: 'chips', ayuda: 'Es un techo: el motor no lo pasa y no lo mueve sin su permiso.',
        opciones: PRESUPUESTOS, detalle: DETALLE_PRESUPUESTO },
      { id: 'modo', etiqueta: 'Cuánta autonomía le da', tipo: 'chips', ayuda: 'Se puede cambiar cuando quiera desde Cuenta y autonomía.',
        opciones: ['Manual', 'Compartido', 'Automático'],
        detalle: {
          'Manual': 'Prepara todo y no publica nada hasta que se lo pida. Es el más lento y el más controlado.',
          'Compartido': 'Hace lo reversible solo y le pide el OK para lo que gasta o publica. Es con el que trabaja su cuenta hoy.',
          'Automático': 'Decide y ejecuta, y le avisa después en la bitácora. Todo queda reversible 24 horas.',
        } },
    ],
    nota: 'Los frenos ya vienen puestos y no se tocan desde aquí: no publica de noche, no manda más de un mensaje por persona por día y no toca el presupuesto sin permiso.',
  },
  {
    n: 5, t: 'Conectar', d: 'Dónde publica', icono: '🔌',
    titular: 'Dónde publica y con qué',
    paraQue: 'El motor publica en sus cuentas, no en las nuestras. Cada conexión declara qué habilita: sin la cuenta, no publica ahí.',
    infiere: 'Si ya usa el mismo email en su tienda y en Instagram, el motor reconoce la marca y avisa antes de conectar nada.',
    // El resultado de este paso no es tener las cuentas conectadas (eso ya estaba): es que el motor
    // arranque. Si no, el contador diría «2 de 5» antes de que el cliente toque nada.
    minima: ['conectadas', 'arrancado'],
    campos: [],
    nota: 'La verificación de identidad es aparte y es obligatoria para pautar: hasta que esté, el motor prepara y no publica.',
  },
];

/** El paso que el cliente tiene que terminar ahora: el primero sin completar. */
export const siguientePaso = (hechos: number[]) =>
  PASOS_ONB.find(p => !hechos.includes(p.n))?.n || 5;

// =============================================================================================
// LA BIENVENIDA — lo primero que ve el cliente después de entrar
//
// Lo primero que ve el cliente después de entrar no es un formulario: es qué va a hacer el motor
// con su negocio y quién es él. El tipo de cuenta cambia las preguntas de verdad —una tienda vende
// productos y un creador vende piezas— así que se elige antes de empezar, no en un perfil escondido.
// =============================================================================================

export const BIENVENIDA = {
  titulo: 'Bienvenido a Sinkroo',
  // El titular de la bienvenida. Es lo primero que se lee en todo el producto: tiene que emocionar en
  // una línea y no pedir nada todavía. Se escribe en futuro y con el trabajo ya hecho, para que el
  // cliente se vea del otro lado antes de empezar.
  titular: 'Su equipo de marketing arranca hoy.',
  sub: 'En 4 minutos. El lunes abre el panel y la semana ya está armada.',
  // Tres cosas que empiezan a pasar. Una línea cada una, con su número: es lo que sostiene la promesa.
  queHace: [
    { t: 'Investiga su mercado cada mañana',
      s: '47 anuncios de sus competidores leídos antes de que abra el negocio.' },
    { t: 'Arma las piezas y las hace revisar',
      s: '5 jueces y 500 personas del público las puntúan: sólo salen las que convencen.' },
    { t: 'Publica, mide y frena lo que no rinde',
      s: 'El costo por venta, el presupuesto y lo que no funciona se mueven solos.' },
  ],
  // La confianza va en una línea, no en tres.
  reglas: [
    'Nada se publica sin pasar por el panel ni sin su permiso.',
  ],
  // Lo fácil que es empezar, dicho antes de que lea un solo campo.
  facil: 'Son cinco preguntas cortas: el nombre del negocio y qué vende. Todo lo demás lo saca el motor solo.',
};

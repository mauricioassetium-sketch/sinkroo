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
  /** Campos que comparten fila (el producto y su precio, por ejemplo) van con la misma marca. */
  fila?: string;
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

// NADA DE LISTAS CERRADAS EN ESTE PASO. El dueño fue claro: el modelo tiene que servir para cualquier
// empresa, así que el onboarding no puede sugerir rubros ni públicos («Skincare», «Mujeres de 25 a 40»).
// El motor no sabe nada del negocio hasta que el cliente lo cuenta con sus palabras, y de esa
// descripción saca el rubro, el público y el ángulo. Las listas de arriba existían y se borraron: lo
// único que se elige de una lista son cosas universales (formas de pago, tono, autonomía, presupuesto).

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

// Los canales donde el motor puede trabajar. No son sólo redes de productos: también sirven para un
// negocio de servicios, una tienda o alguien que vende por WhatsApp.
export const CONEXIONES_ONB: { key: string; nombre: string; icono: string; habilitadoHoy: boolean; detalle: string }[] = [
  { key: 'instagram', nombre: 'Instagram', icono: '📸', habilitadoHoy: true, detalle: 'Publicar piezas y leer comentarios y mensajes.' },
  { key: 'facebook', nombre: 'Facebook', icono: '👍', habilitadoHoy: true, detalle: 'Publicar y pautar en la misma cuenta de Meta.' },
  { key: 'whatsapp', nombre: 'WhatsApp de su negocio', icono: '💬', habilitadoHoy: true, detalle: 'Contestar solo, mandar la invitación a un referido y pedir la reseña.' },
  { key: 'tiktok', nombre: 'TikTok', icono: '🎵', habilitadoHoy: false, detalle: 'Publicar piezas en video y leer los comentarios.' },
  { key: 'email', nombre: 'Su email', icono: '✉️', habilitadoHoy: false, detalle: 'Mandar el informe semanal y las secuencias a sus clientes.' },
  { key: 'tienda', nombre: 'Su tienda online', icono: '🛒', habilitadoHoy: false, detalle: 'Leer precios y stock, y saber qué se vendió sin que lo cargue.' },
  { key: 'google', nombre: 'Su ficha de Google o sus anuncios', icono: '🔎', habilitadoHoy: false, detalle: 'Que lo encuentren en las búsquedas y publicar en la red de Google.' },
];

// ---------------------------------------------------------------------------------------------
// LOS CINCO PASOS
// ---------------------------------------------------------------------------------------------

export const PASOS_ONB: PasoOnb[] = [
  {
    n: 1, t: 'Su negocio', d: 'Qué vende y a quién', icono: '🏪',
    titular: 'Cuéntenos su negocio',
    paraQue: 'El motor todavía no sabe nada de su negocio: todo lo que va a entender sale de lo que escriba aquí. No hay que elegir de una lista ni usar palabras de marketing: describa su negocio como se lo contaría a un vecino, y el motor saca el rubro, el público y el ángulo de ahí.',
    infiere: 'Con el link, el motor completa solo los precios, el tono y el catálogo. Si no lo tiene, alcanza con la descripción.',
    minima: ['negocio_nombre', 'descripcion'],
    campos: [
      { id: 'negocio_nombre', etiqueta: 'Cómo se llama su negocio', tipo: 'texto', ayuda: 'El nombre que usa la gente cuando lo recomienda.' },
      { id: 'descripcion', etiqueta: 'Cuéntenos qué hace', tipo: 'texto-largo', ayuda: 'Escríbalo como se lo contaría a alguien que no le conoce: qué ofrece, para qué le sirve a la gente y por qué le compran a usted y no a otro. Tres o cuatro líneas alcanzan; no tiene que quedar perfecto ni usar palabras técnicas, el motor lo ordena.' },
      { id: 'negocio_link', etiqueta: 'Su Instagram, su web o su ficha (opcional)', tipo: 'texto', ayuda: 'Con el link, el motor completa solo los precios, el tono y el catálogo.' },
      { id: 'negocio_que', etiqueta: 'Qué vende o qué servicio presta', tipo: 'texto-largo', ayuda: 'Con sus palabras, sin elegir de una lista: los productos o servicios que ofrece, para qué sirven y en qué se diferencian. Si tiene varios, nómbrelos; el motor decide cuál empujar primero con el resto de sus datos.' },
      { id: 'negocio_publico', etiqueta: 'A quién le vende', tipo: 'texto-largo', ayuda: 'Quién le compra hoy y por qué: pueden ser empresas, otras tiendas, familias o una persona que necesita algo puntual. Cuente edad, zona o tipo de cliente, qué problema tiene y qué le molesta de lo que ya probó.' },
      { id: 'negocio_objetivo', etiqueta: 'Qué quiere lograr primero', tipo: 'texto', ayuda: 'Con sus palabras: vender más de lo que ya vende, conseguir clientes nuevos, recuperar los que no volvieron, dar a conocer la marca, abrir otra zona o ciudad, llenar los meses flojos… Con esto el motor ordena sus prioridades.' },
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
      { id: 'prod_1', etiqueta: 'Lo que más vende', tipo: 'texto', fila: 'p1', ayuda: 'Puede ser un producto o un servicio: lo que sostiene el negocio. Eso se empuja primero.' },
      { id: 'precio_1', etiqueta: 'A cuánto lo vende', tipo: 'numero', fila: 'p1', ayuda: 'En dólares. Si es en su moneda, el panel muestra la equivalencia.', ancho: 160 },
      { id: 'prod_2', etiqueta: 'El segundo que más vende', tipo: 'texto', fila: 'p2', ayuda: 'Sirve para las piezas que muestran el pack o el combo.' },
      { id: 'precio_2', etiqueta: 'Su precio', tipo: 'numero', fila: 'p2', ayuda: 'En dólares.', ancho: 160 },
      { id: 'formas_pago', etiqueta: 'Formas de pago que acepta', tipo: 'chips-multi', ayuda: 'El anuncio y la pieza dicen el botón y la aclaración que correspondan.',
        opciones: ['Efectivo', 'Transferencia bancaria', 'Tarjeta de débito o crédito', 'Cuotas sin interés', 'Mercado Pago', 'Nequi o Daviplata', 'PayPal', 'USDT (cripto)', 'Bitcoin (cripto)'] },
      { id: 'entrega', etiqueta: 'Cómo lo entrega o cómo se lo compran', tipo: 'texto', ayuda: 'Como sea en su negocio: envío a todo el país, entrega a domicilio en su zona, retiro o atención en el local, cita previa, servicio a domicilio, instalación… Es lo primero que pregunta alguien que le compra por primera vez, y el motor lo dice en la pieza.' },
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
  // El encabezado de la pantalla: quién entra y para qué es esto.
  titulo: 'Bienvenido',
  sub: 'Vamos a conocer su negocio para que el motor pueda ayudarle a vender más.',
  badge: 'Inteligencia artificial para su negocio',
  // El titular en dos líneas: la primera dice lo que el cliente NO necesita, la segunda quién lo hace.
  titular: 'No necesita saber de marketing.',
  titular2: 'Sinkroo lo hace todo por usted.',
  intro: 'Cualquier persona puede vender más sin saber nada de marketing: el motor trabaja en automático, ' +
    'de la publicación a la venta, apuntando al mercado que de verdad le compra.',
  // El recuadro: el argumento que más pesa, porque le quita el miedo a empezar.
  caja: {
    t: '¿Tiene un negocio? Ya tiene todo lo que hace falta.',
    s: 'Sin importar el rubro, el tamaño ni su experiencia: Sinkroo se ocupa del resto, de la primera ' +
      'publicación a la primera venta.',
  },
  nota: 'La información que suba es justo la que la IA necesita para arrancar.',
  // Las dos tarjetas que resumen el producto.
  tarjetas: [
    { t: 'Todo en automático', s: 'De la publicación a la venta, sin mover un dedo.' },
    { t: 'Al mercado exacto', s: 'El motor apunta a quien de verdad le compra.' },
  ],
  // El pie de la bienvenida: cuánto cuesta en tiempo y qué hay que saber.
  pie: ['5 pasos', '4 minutos', 'Cero conocimiento técnico'],
  reglas: [
    'Nada se publica sin pasar por el panel ni sin su permiso.',
  ],
  facil: 'Son cinco preguntas cortas: el nombre del negocio y qué vende. Todo lo demás lo saca el motor solo.',
};

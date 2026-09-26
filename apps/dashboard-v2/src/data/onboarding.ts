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
//  5. El último paso no termina en un «listo»: arranca el motor y muestra el plan de la secuencia, con
//     lo que va a pasar en cada etapa y lo que cuesta. La primera cosa que el cliente ve es trabajo del
//     motor, no una pantalla de bienvenida.
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

/** El tope por archivo. Es el mismo del servidor: el panel lo dice antes de que alguien suba 40 MB. */
export const MAX_ARCHIVO_MB = 25;

/** Los formatos que el motor sabe leer: los del servidor, ni uno más. Se declaran acá y no en el JSX. */
export const ARCHIVOS_PERMITIDOS =
  /\.(pdf|doc|docx|rtf|txt|md|xls|xlsx|csv|ppt|pptx|odt|ods|jpe?g|png|webp|gif|avif|heic|svg|mp4|mov|webm|avi|mp3|wav|m4a|ogg)$/i;

/**
 * Lo que el selector de archivos ofrece CON EL SERVIDOR ENCENDIDO: los formatos exactos que el back
 * acepta. El `image/*,video/*,audio/*` de la demostración dejaba elegir cosas que el servidor rechaza
 * (un .tiff, un .flac), y eso se veía como un error del panel en vez de un «eso no se puede leer».
 */
export const ARCHIVOS_ACEPTADOS_BACK =
  '.pdf,.doc,.docx,.rtf,.txt,.md,.xls,.xlsx,.csv,.ppt,.pptx,.odt,.ods,' +
  '.jpg,.jpeg,.png,.webp,.gif,.avif,.heic,.svg,.mp4,.mov,.webm,.avi,.mp3,.wav,.m4a,.ogg';

export type CampoOnb = {
  id: string;
  etiqueta: string;
  tipo: 'texto' | 'texto-largo' | 'numero' | 'chips' | 'chips-multi' | 'material' | 'docs' | 'links';
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
// LA SECUENCIA DE ARRANQUE — lo que hace el motor desde que se aprieta «Arrancar». No es una promesa
// vaga: es el trabajo de cada día, con lo que cuesta en créditos. Los 500 del público no cuestan
// y la investigación del mercado tampoco: lo único que va a gastar dinero de verdad es publicar en las
// redes, y esa ruta todavía no está conectada.
// ---------------------------------------------------------------------------------------------

// EL ARRANQUE — lo que hace el motor desde que se aprieta «Arrancar».
//
// Va numerado, 1 · 2 · 3, y NO por días: el dueño lo pidió así porque contar días hace pensar que lanzar
// tarda una semana. El trabajo del motor es una secuencia, no un calendario: el mismo día que arranca ya
// tiene el mercado leído y las primeras piezas escritas. Lo único que cuesta créditos es escribir y pasar
// por el panel; investigar y medir no gastan. Y ninguna etapa ajusta pujas ni mueve presupuesto en las
// plataformas: lo que el motor hace con lo que vuelve es medirlo, compararlo con su predicción y decirlo.
export const ARRANQUE: { paso: string; quien: string; que: string; creditos: string }[] = [
  { paso: '1', quien: 'Lux', que: 'Lee los anuncios de sus 5 competidores y le dice con qué ángulo gana el rubro hoy.', creditos: '0 créditos' },
  { paso: '2', quien: 'Nia', que: 'Escribe 6 variantes de la primera pieza con ese ángulo, en su tono y con sus precios.', creditos: '96 créditos' },
  { paso: '3', quien: 'El panel', que: 'Los 5 jueces las puntúan y los 500 del público reaccionan: quedan ordenadas y las 3 primeras pasan.', creditos: '48 créditos' },
  { paso: '4', quien: 'Kai', que: 'Deja las 3 mejores en el panel, listas para cuando conecte sus cuentas, y mide el costo por resultado cuando la plataforma lo reporte.', creditos: '0 créditos' },
  { paso: '5', quien: 'Kai', que: 'Mide lo que la plataforma reporta de cada pieza y lo compara con lo que el panel predijo: le dice cuál rindió y cuál no.', creditos: '0 créditos' },
  { paso: '6', quien: 'Rex', que: 'Con esa medición arma el plan que sigue: qué ángulo y qué público sostener, y cuáles dejar.', creditos: '0 créditos' },
  { paso: '7', quien: 'Sol', que: 'Le da el informe con lo que la plataforma reportó de cada pieza y qué conviene hacer.', creditos: '0 créditos' },
];

/** Lo que cuesta el arranque en créditos, sumando la lista de arriba. */
export const COSTO_ARRANQUE = ARRANQUE.reduce((a, d) => a + Number((d.creditos.match(/\d+/) || ['0'])[0]), 0);

// ---------------------------------------------------------------------------------------------
// LAS CONEXIONES — de dónde publica y por dónde pregunta. Cada una declara qué habilita: sin la
// cuenta conectada, el motor no publica ahí (y eso tiene que verse en la pantalla, no en un aviso).
// ---------------------------------------------------------------------------------------------

// Los canales donde el motor puede trabajar. No son sólo redes de productos: también sirven para un
// negocio de servicios, una tienda o alguien que vende por WhatsApp.
//
// `red` es la red del BACK con la que esa fila se conecta de verdad (`POST /api/integraciones/:red/...`).
// Es lo que deja de mentir el paso 5: con el back encendido, cada fila muestra el estado de SU red, no
// el del ejemplo. Una fila sin `red` no tiene conexión propia en el back (hoy no hay ninguna) y lo dice.
export type ConexionOnb = {
  key: string; nombre: string; icono: string; habilitadoHoy: boolean; detalle: string;
  /** La red del back de esta fila. Sin `red`, el back no tiene una conexión propia para esa fila. */
  red?: string;
};

export const CONEXIONES_ONB: ConexionOnb[] = [
  { key: 'instagram', nombre: 'Instagram', icono: '📸', habilitadoHoy: true, detalle: 'Leer comentarios y mensajes. Publicar piezas todavía no.', red: 'instagram' },
  // Facebook SÍ lleva `red` desde que existe bundle.social: el agregador conecta la cuenta de Facebook
  // como plataforma propia (FACEBOOK), aparte de la de Instagram. Por eso esta fila tiene su propia
  // conexión y su propio botón —antes no lo tenía porque la única vía era la app de Meta, que confirma
  // una sola cuenta y la de Facebook no llegaba aparte—. Sin `viaBundle` ni app propia configurada, el
  // back diría «falta configurar» y la fila sólo lo nombra: nunca ofrece un botón que no puede funcionar.
  { key: 'facebook', nombre: 'Facebook', icono: '👍', habilitadoHoy: true, detalle: 'Leer comentarios y mensajes de la misma cuenta de Meta. Publicar todavía no.', red: 'facebook' },
  { key: 'whatsapp', nombre: 'WhatsApp de su negocio', icono: '💬', habilitadoHoy: true, detalle: 'Contestar los mensajes de sus clientes. Mandar la invitación a un referido y pedir la reseña todavía no.', red: 'whatsapp' },
  { key: 'tiktok', nombre: 'TikTok', icono: '🎵', habilitadoHoy: false, detalle: 'Publicar piezas en video y leer los comentarios: todavía no está.', red: 'tiktok' },
  { key: 'email', nombre: 'Su email', icono: '✉️', habilitadoHoy: false, detalle: 'Mandar el informe semanal y las secuencias a sus clientes: todavía no está.', red: 'email' },
  { key: 'tienda', nombre: 'Su tienda online', icono: '🛒', habilitadoHoy: false, detalle: 'Leer precios y stock, y saber qué se vendió sin que lo cargue: todavía no está.', red: 'tienda' },
  { key: 'google', nombre: 'Su ficha de Google o sus anuncios', icono: '🔎', habilitadoHoy: false, detalle: 'Que lo encuentren en las búsquedas y publicar en la red de Google: todavía no está.', red: 'google' },
];

/** YouTube, la red que el dueño pidió expresa: va junto a las demás redes de video. */
const YOUTUBE_ONB: ConexionOnb = {
  key: 'youtube', nombre: 'YouTube', icono: '▶️', habilitadoHoy: false,
  detalle: 'Leer el público que ve sus videos y cómo rinde cada uno: todavía no está.', red: 'youtube',
};

/**
 * Las filas del paso 5 CON EL BACK ENCENDIDO: son las mismas filas del diseño (su nombre, su ícono y su
 * frase son las de `CONEXIONES_ONB`), más YouTube, que no existía en la lista. El modo demostración
 * sigue dibujando `CONEXIONES_ONB` tal cual: el demo no se toca.
 */
export const CONEXIONES_BACK: ConexionOnb[] = [
  ...CONEXIONES_ONB.slice(0, 4), YOUTUBE_ONB, ...CONEXIONES_ONB.slice(4),
];

// ---------------------------------------------------------------------------------------------
// LOS CINCO PASOS
// ---------------------------------------------------------------------------------------------

export const PASOS_ONB: PasoOnb[] = [
  {
    n: 1, t: 'Su negocio', d: 'Qué vende y a quién', icono: '🏪',
    titular: 'Cuéntenos su negocio',
    paraQue: 'Con esto el motor sabe qué vende, a quién y con qué palabras.',
    infiere: 'Lo que falte lo completa solo con su Instagram y su web.',
    minima: ['negocio_nombre', 'descripcion'],
    campos: [
      { id: 'negocio_nombre', etiqueta: 'Cómo se llama su negocio', tipo: 'texto',
        ayuda: 'El que usan al recomendarlo.' },
      { id: 'descripcion', etiqueta: 'Cuéntenos qué hace', tipo: 'texto-largo',
        ayuda: 'Qué ofrece y para quién.' },
      // De aquí para abajo, todo se elige: son categorías que sirven para cualquier negocio, no rubros.
      { id: 'negocio_que', etiqueta: 'Qué vende', tipo: 'chips-multi', ayuda: 'Puede marcar más de una.',
        opciones: ['Productos', 'Servicios', 'Cursos', 'Alquiler'] },
      { id: 'negocio_publico', etiqueta: 'A quién le vende', tipo: 'chips-multi', ayuda: 'Puede marcar más de una.',
        opciones: ['Personas', 'Empresas', 'Tiendas', 'El Estado'] },
      { id: 'negocio_zona', etiqueta: 'Dónde vende', tipo: 'chips-multi', ayuda: 'Define a quién se pauta.',
        opciones: ['Su zona', 'El país', 'Al exterior', 'Por internet'] },
    ],
    nota: 'Con el nombre y la descripción alcanza: lo demás se puede agregar después.',
  },
  {
    n: 2, t: 'Qué vende', d: 'Productos y precios', icono: '💵',
    titular: 'Qué vende y a cuánto',
    paraQue: 'Sin precios, el motor no sabe cuánto puede gastar por venta.',
    infiere: 'Con su tienda conectada, los precios y el stock se leen de ahí y se mantienen solos.',
    minima: ['prod_1', 'precio_1', 'formas_pago'],
    campos: [
      { id: 'prod_1', etiqueta: 'Lo que más vende', tipo: 'texto', fila: 'p1', ayuda: 'Un producto o un servicio: lo que sostiene el negocio.' },
      { id: 'precio_1', etiqueta: 'Precio en dólares', tipo: 'numero', fila: 'p1', ayuda: 'El panel muestra el equivalente.', ancho: 160 },
      { id: 'prod_2', etiqueta: 'Otro que venda bien (opcional)', tipo: 'texto', fila: 'p2', ayuda: 'Sirve para las piezas que muestran el combo.' },
      { id: 'precio_2', etiqueta: 'Precio en dólares', tipo: 'numero', fila: 'p2', ayuda: '', ancho: 160 },
      { id: 'formas_pago', etiqueta: 'Formas de pago que acepta', tipo: 'chips-multi', ayuda: 'Puede marcar varias.',
        opciones: ['Efectivo', 'Transferencia bancaria', 'Tarjeta de débito o crédito', 'Cuotas sin interés', 'Mercado Pago', 'Nequi o Daviplata', 'PayPal', 'USDT (cripto)', 'Bitcoin (cripto)'] },
      { id: 'entrega', etiqueta: 'Cómo lo entrega o cómo se lo compran', tipo: 'texto', ayuda: 'Envío a todo el país, entrega a domicilio, retiro en el local, cita previa o servicio a domicilio. El motor lo dice en la pieza.' },
    ],
    nota: 'Los precios se pueden cargar después.',
  },
  {
    n: 3, t: 'Su material', d: 'Suba lo que tenga', icono: '📎',
    titular: 'Suba lo que ya tiene',
    paraQue: 'Con esto el motor escribe con su información real: precios, promesas, condiciones y su tono, tal como usted los tiene escritos.',
    infiere: 'Si no sube nada, arranca con su descripción y lo que encuentre en sus páginas y redes.',
    minima: ['archivos'],
    campos: [
      { id: 'negocio_links', etiqueta: 'Sus páginas y redes (opcional)', tipo: 'links',
        ayuda: 'De ahí el motor saca solo los precios, el tono, el catálogo y cada cuánto publica.' },
      { id: 'docs', etiqueta: 'Sus archivos', tipo: 'docs', ayuda: 'Suelte aquí lo que tenga o elija archivos: PDF, Word, Excel, PowerPoint, fotos, videos o audios. Puede subir varios a la vez, hasta 25 MB por archivo.' },
    ],
    nota: 'Los archivos se pueden sacar cuando quiera y nada se publica con ellos sin que lo vea antes: primero pasa por el panel.',
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
      { id: 'tono_texto', etiqueta: 'Palabras que usa siempre', tipo: 'texto', ayuda: 'Opcional: las muletillas de su marca y las que no diría nunca.' },
      { id: 'negocio_objetivo', etiqueta: 'Qué quiere lograr primero', tipo: 'chips', ayuda: 'Se puede cambiar cuando quiera.',
        opciones: ['Vender más', 'Clientes nuevos', 'Recuperar', 'Que lo conozcan'] },
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
    paraQue: 'El sistema todavía no publica en las redes. Cuando lo haga, será en las cuentas del negocio, nunca en las de Sinkroo: sin la cuenta conectada no va a publicar ahí.',
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
    'investiga su mercado, escribe sus piezas y las prueba, apuntando al mercado que de verdad le compra.',
  // El recuadro: el argumento que más pesa, porque le quita el miedo a empezar.
  caja: {
    t: '¿Tiene un negocio? Ya tiene todo lo que hace falta.',
    s: 'Sin importar el rubro, el tamaño ni su experiencia: Sinkroo se ocupa del resto, de la investigación ' +
      'del mercado a las piezas listas para publicar.',
  },
  nota: 'La información que suba es justo la que la IA necesita para arrancar.',
  // Las dos tarjetas que resumen el producto.
  tarjetas: [
    { t: 'Todo en automático', s: 'Investiga, escribe, prueba y mide solo; publicar en sus redes todavía no.' },
    { t: 'Al mercado exacto', s: 'El motor apunta a quien de verdad le compra.' },
  ],
  // El pie de la bienvenida: cuánto cuesta en tiempo y qué hay que saber.
  pie: ['5 pasos', '4 minutos', 'Cero conocimiento técnico'],
  reglas: [
    'Nada se publica sin pasar por el panel ni sin su permiso.',
  ],
  facil: 'Son cinco preguntas cortas: el nombre del negocio y qué vende. Todo lo demás lo saca el motor solo.',
};

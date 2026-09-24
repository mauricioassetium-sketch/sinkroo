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

// ---------------------------------------------------------------------------------------------
// LO QUE SE PUEDE SUBIR — la ingesta acepta lo que el cliente tenga, no un formato ideal.
// Cada tipo declara qué hace el motor con eso: si no lo dijera, subir un PDF sería una apuesta.
// ---------------------------------------------------------------------------------------------
export const TIPOS_ARCHIVO: { para: string; lectura: string }[] = [
  { para: 'PDF, Word o texto', lectura: 'lee el contenido: qué vendés, precios, promesas y condiciones.' },
  { para: 'Excel o planilla', lectura: 'toma la lista de precios y el stock tal como está.' },
  { para: 'Fotos', lectura: 'tus productos reales: fondos, colores y cómo se ve la marca.' },
  { para: 'Videos', lectura: 'clips para armar la pieza y mostrar el producto en uso.' },
  { para: 'Audio o voz', lectura: 'el tono de la marca: cómo se dice, no sólo qué se dice.' },
  { para: 'PowerPoint o presentación', lectura: 'lee el orden del relato y los datos que ya tenés armados.' },
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
    titular: 'Contame tu negocio',
    paraQue: 'Con tu descripción el motor entiende qué vendés, a quién y con qué palabras lo decís. Es lo primero que lee antes de escribir una sola pieza.',
    infiere: 'Del link de tu Instagram o tu web saca los precios, el tono y cada cuánto publicás. Si subís tu catálogo, también los productos.',
    minima: ['negocio_nombre', 'descripcion'],
    campos: [
      { id: 'negocio_nombre', etiqueta: 'Cómo se llama tu negocio', tipo: 'texto', ayuda: 'El nombre que usa la gente cuando lo recomienda.' },
      { id: 'descripcion', etiqueta: 'Contame qué hacés', tipo: 'texto-largo', ayuda: 'Escribí como se lo contarías a alguien que no te conoce: qué vendés, qué te diferencia y a quién le vendés. Tres o cuatro líneas alcanzan, y no hace falta que esté prolijo: el motor lo ordena.' },
      { id: 'negocio_link', etiqueta: 'Tu Instagram o tu web (opcional)', tipo: 'texto', ayuda: 'Con el link, el motor completa solo los precios, el tono y el catálogo.' },
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
    nota: 'Lo único obligatorio es el nombre y la descripción. Todo lo demás se completa después y el motor arranca igual.',
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
    n: 3, t: 'Tu material', d: 'Subí lo que tengas', icono: '📎',
    titular: 'Subí lo que ya tenés',
    paraQue: 'No hagas trabajo de más: subí tu catálogo, la lista de precios, las fotos de tus productos, las reseñas de tus clientes o el PDF de tu marca, y el motor lo lee. Con eso las piezas salen con tu información real y no con texto genérico.',
    infiere: 'Si no subís nada, el motor arranca igual con tu descripción y lo que encuentra en tu Instagram o tu web: va a preguntar menos y a copiar menos.',
    minima: ['archivos'],
    campos: [
      { id: 'docs', etiqueta: 'Tus archivos', tipo: 'docs', ayuda: 'Soltá acá lo que tengas o elegí archivos: PDF, Word, Excel, PowerPoint, fotos, videos o audios. Podés subir varios a la vez y de cualquier formato.' },
    ],
    nota: 'Lo que subas queda en tu carpeta y se puede usar en cualquier campaña. Nada se publica con tus archivos sin que lo veas antes: primero pasa por el panel.',
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
    // El resultado de este paso no es tener las cuentas conectadas (eso ya estaba): es que el motor
    // arranque. Si no, el contador diría «2 de 5» antes de que el cliente toque nada.
    minima: ['conectadas', 'arrancado'],
    campos: [],
    nota: 'La verificación de identidad es aparte y es obligatoria para pautar: hasta que esté, el motor prepara y no publica.',
  },
];

/** El paso que el cliente tiene que terminar ahora: el primero sin completar. */
export const siguientePaso = (pasos: PasoOnb[], hechos: number[]) =>
  pasos.find(p => !hechos.includes(p.n))?.n || 5;

// =============================================================================================
// LA BIENVENIDA Y EL TIPO DE CUENTA
//
// Lo primero que ve el cliente después de entrar no es un formulario: es qué va a hacer el motor
// con su negocio y quién es él. El tipo de cuenta cambia las preguntas de verdad —una tienda vende
// productos y un creador vende piezas— así que se elige antes de empezar, no en un perfil escondido.
// =============================================================================================

export const BIENVENIDA = {
  titulo: 'Bienvenido a Sinkroo',
  sub: 'Un equipo de marketing que trabaja solo, con un panel que le revisa todo antes de publicar.',
  queHace: [
    { t: 'Investiga tu mercado todos los días', s: '47 anuncios de tus competidores, los precios que cambiaron y el ángulo que hoy gana en tu rubro.' },
    { t: 'Escribe y arma las piezas', s: 'Textos, imágenes y videos con tu material, tu tono y tus precios. No de plantilla.' },
    { t: 'Las pasa por el panel antes de publicar', s: '5 jueces las puntúan y 500 personas del público reaccionan. Las 3 mejores salen; si ninguna convence, no sale ninguna.' },
    { t: 'Publica, mide y frena lo que no rinde', s: 'Mide el costo por venta, mueve el presupuesto a donde rinde y te avisa por WhatsApp cuando hay algo que decidir.' },
  ],
  reglas: [
    'Nada se publica sin pasar por el panel.',
    'Nada se publica en tus cuentas sin tu permiso (según la autonomía que le des).',
    'Publicar es lo único que gasta plata: investigar y el público no cuestan créditos.',
  ],
};

export type TipoCuenta = 'empresa' | 'creador';

export const TIPOS_CUENTA: {
  key: TipoCuenta; nombre: string; quien: string; icono: string;
  paraQue: string; cambia: string[];
}[] = [
  {
    key: 'empresa', nombre: 'Negocio o empresa', icono: '🏪',
    quien: 'Vendés productos o servicios y querés vender más.',
    paraQue: 'Es el camino para vender: el motor investiga tu mercado, arma campañas, las pasa por el panel y las publica en tus cuentas.',
    cambia: [
      'Te pregunto qué vendés y a cuánto, y a quién le hablás.',
      'El motor arma campañas para tus productos, con tus precios y tu material.',
      'Termina con el plan de la primera semana de ventas.',
    ],
  },
  {
    key: 'creador', nombre: 'Creador de contenido', icono: '🎬',
    quien: 'Grabás contenido y querés que las marcas te contraten.',
    paraQue: 'Es el camino para ofrecerte: completás tu perfil de creador y las marcas que publican en Sinkroo te encuentran por lo que hacés, tu audiencia y tu precio.',
    cambia: [
      'Te pregunto qué contenido hacés, para qué rubros y en qué idiomas.',
      'Te pregunto qué entregás, a cuánto y en cuántos días.',
      'Termina con tu perfil publicado para que te encuentren, no con campañas.',
    ],
  },
];

// ---------------------------------------------------------------------------------------------
// LOS CINCO PASOS DEL CREADOR — mismas cinco pantallas, otras preguntas.
// Un creador no vende un producto: vende piezas. Preguntarle «qué vendés y a cuánto» sería el mismo
// error que preguntarle a una tienda cuántos seguidores tiene.
// ---------------------------------------------------------------------------------------------

export const PASOS_CREADOR: PasoOnb[] = [
  {
    n: 1, t: 'Tu contenido', d: 'Qué hacés y para quién', icono: '🎬',
    titular: 'Tu contenido, en cuatro datos',
    paraQue: 'Con esto el motor le muestra tu perfil a las marcas que buscan justo lo que hacés: el rubro, el formato y el idioma cambian quién te encuentra.',
    infiere: 'De tus últimas piezas saca tu estilo, cada cuánto publicás y qué porcentaje de tu audiencia reacciona.',
    minima: ['cre_formato', 'cre_rubros', 'cre_idioma', 'cre_red'],
    campos: [
      { id: 'cre_red', etiqueta: 'Tu Instagram o TikTok', tipo: 'texto', ayuda: 'De acá el motor saca tu audiencia, tu estilo y cada cuánto publicás.' },
      { id: 'cre_formato', etiqueta: 'Qué hacés', tipo: 'chips-multi', ayuda: 'Elegí todo lo que hacés: puede ser más de una cosa.',
        opciones: ['UGC', 'Reseña', 'Video corto', 'Unboxing', 'Historia', 'Foto de producto'],
        detalle: {
          'UGC': 'Contenido con tu cara y tu voz, como si lo recomendara un cliente.',
          'Reseña': 'Tu opinión con el producto usado: pesa más en la decisión.',
          'Video corto': 'Reel o TikTok de 15 a 30 segundos, con gancho en el primer segundo.',
          'Unboxing': 'La apertura del pedido: sirve para marcas nuevas que necesitan confianza.',
          'Historia': 'Pieza vertical de 24 horas, con sticker y link.',
          'Foto de producto': 'Fotos para el feed o para el carrusel de la marca.',
        } },
      { id: 'cre_rubros', etiqueta: 'Para qué rubros grabás', tipo: 'chips-multi', ayuda: 'Una marca de otro rubro no te va a encontrar si no lo decís.',
        opciones: ['Belleza y skincare', 'Bienestar', 'Indumentaria', 'Hogar y deco', 'Tecnología', 'Gastronomía', 'Deportes'] },
      { id: 'cre_idioma', etiqueta: 'En qué idiomas', tipo: 'chips', ayuda: 'Define a qué marcas les sirve tu contenido.',
        opciones: ['Español', 'Español e inglés', 'Portugués'],
        detalle: {
          'Español': 'Marcas locales y de Latinoamérica.',
          'Español e inglés': 'Abre marcas que venden a Estados Unidos: suelen pagar más por pieza.',
          'Portugués': 'Marcas de Brasil: es el mercado que menos contenido en español tiene.',
        } },
    ],
    nota: 'Sin el link, podés hacerlo igual: el perfil queda visible para las marcas y después se completa.',
  },
  {
    n: 2, t: 'Qué entregás', d: 'Formatos y precio', icono: '💵',
    titular: 'Qué entregás y a cuánto',
    paraQue: 'El precio por pieza y los días de entrega son lo primero que mira una marca. Si no están, te preguntan antes de contratarte y se pierde el contacto.',
    infiere: 'Con tu Instagram conectado, el motor estima tu alcance por pieza para las marcas que dudan.',
    minima: ['cre_precio', 'cre_plazo', 'cre_acepta'],
    campos: [
      { id: 'cre_precio', etiqueta: 'Cuánto cobrás por pieza', tipo: 'numero', ayuda: 'En dólares, por pieza y por formato. Después se puede cambiar.', ancho: 180 },
      { id: 'cre_plazo', etiqueta: 'En cuántos días entregás', tipo: 'chips', ayuda: 'Es lo que más se pregunta: una marca con lanzamiento necesita fechas.',
        opciones: ['En 3 días', 'En una semana', 'En 15 días'],
        detalle: {
          'En 3 días': 'Cobrás más por la urgencia y las marcas te eligen para lanzamientos.',
          'En una semana': 'Es el plazo normal del mercado: el más fácil de cumplir.',
          'En 15 días': 'Sirve para piezas elaboradas, con más producción y edición.',
        } },
      { id: 'cre_acepta', etiqueta: 'Qué aceptás como parte del pago', tipo: 'chips-multi', ayuda: 'Decilo ahora: evita que te ofrezcan lo que no querés.',
        opciones: ['Producto y dinero', 'Sólo dinero', 'Producto y comisión por venta'],
        detalle: {
          'Producto y dinero': 'Lo más común: el producto como parte del pago y el resto en dinero.',
          'Sólo dinero': 'Más simple y más claro: la marca paga la pieza y compra el producto aparte.',
          'Producto y comisión por venta': 'Conviene sólo si el código es tuyo y se puede medir.',
        } },
    ],
    nota: 'El dinero se acuerda con cada marca. Sinkroo no intermedia el pago: te muestra la oportunidad y vos cerrás.',
  },
  {
    n: 3, t: 'Tus muestras', d: 'Subí lo que grabaste', icono: '📎',
    titular: 'Subí tus muestras',
    paraQue: 'Nada convence más a una marca que ver lo que ya hiciste. Subí las piezas (videos, fotos, historias) y también tu media kit o la lista de precios si la tenés en un PDF o una planilla: el motor lo lee y arma el resumen de tu perfil.',
    infiere: 'Si no subís nada, el motor arma el perfil con tu descripción y lo que encuentra en tu Instagram o tu TikTok.',
    minima: ['archivos'],
    campos: [
      { id: 'docs', etiqueta: 'Tus archivos', tipo: 'docs', ayuda: 'Soltá acá tus piezas o elegí archivos: videos, fotos, PDF, Word, Excel. Podés subir varios a la vez.' },
    ],
    nota: 'Con dos o tres muestras buenas ya se puede mandar tu perfil; la carpeta queda guardada para las próximas postulaciones.',
  },
  {
    n: 4, t: 'Cómo trabajás', d: 'Ritmo, derechos y tono', icono: '🎚️',
    titular: 'Cómo trabajás con una marca',
    paraQue: 'Define cuántas piezas tomás por semana, de quién es la pieza cuando se publica y cómo hablás. Es lo que evita discusiones después de cerrar.',
    infiere: 'El tono se ajusta solo con tus propias piezas: si hablás corto y directo, tus muestras se describen así.',
    minima: ['cre_ritmo', 'cre_derechos', 'cre_tono'],
    campos: [
      { id: 'cre_ritmo', etiqueta: 'Cuántas piezas por semana', tipo: 'chips', ayuda: 'Es tu capacidad: si aceptás más de las que podés, incumplís.',
        opciones: ['Hasta 3', 'Hasta 5', 'Hasta 10', 'Depende el trabajo'],
        detalle: {
          'Hasta 3': 'Podés mirar cada pieza con detalle: es lo que eligen las marcas que cuidan la marca.',
          'Hasta 5': 'Un ritmo sostenido sin descuidar la calidad.',
          'Hasta 10': 'Trabajo casi a tiempo completo: requiere producción propia.',
          'Depende el trabajo': 'Se acuerda por proyecto: la marca pregunta y vos decidís.',
        } },
      { id: 'cre_derechos', etiqueta: 'De quién es la pieza cuando se publica', tipo: 'chips', ayuda: 'Es lo que más problemas trae si no está dicho antes.',
        opciones: ['La marca la usa en sus redes', 'La marca puede pautar con ella', 'La uso yo también en mi perfil'],
        detalle: {
          'La marca la usa en sus redes': 'Uso orgánico en las cuentas de la marca, con tu nombre.',
          'La marca puede pautar con ella': 'La marca paga para mostrarla a gente que no la conoce. Se cobra aparte del precio por pieza.',
          'La uso yo también en mi perfil': 'Podés mostrarla en tus redes: te sirve de muestra y no le cuesta a la marca.',
        } },
      { id: 'cre_tono', etiqueta: 'Cuál es tu tono al grabar', tipo: 'chips-multi', ayuda: 'Lo que la marca va a leer en tu perfil: con dos alcanza.',
        opciones: ['Cercano y cálido', 'Directo y sin vueltas', 'Divertido y descontracturado', 'Profesional y formal', 'Experto y educativo', 'Premium y sobrio'] },
    ],
    nota: 'Los frenos del panel no se tocan desde acá: tu perfil no publica nada por vos, sólo te muestra a las marcas.',
  },
  {
    n: 5, t: 'Publicarte', d: 'Que te encuentren', icono: '🔌',
    titular: 'Tu perfil, visible para las marcas',
    paraQue: 'Con esto tu perfil queda publicado en el mercado de creadores: las marcas que están publicando en Sinkroo te ven por lo que hacés, tu audiencia y tu precio.',
    infiere: 'Si ya subiste muestras, el motor arma el resumen de tu perfil y lo deja listo para revisar.',
    // Se da por hecho cuando el perfil se publica (que es el resultado del paso), no antes.
    minima: ['conectadas', 'publicado'],
    campos: [],
    nota: 'Ofrecerte no firmaste nada: las marcas te contactan, vos decidís cada trabajo y el pago lo acordás con ellas.',
  },
];

/** Los pasos según el tipo de cuenta elegido en el asistente. */
export const pasosDe = (tipo: TipoCuenta | null) => (tipo === 'creador' ? PASOS_CREADOR : PASOS_ONB);


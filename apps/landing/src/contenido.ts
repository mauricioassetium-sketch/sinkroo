/* =============================================================================================
   EL TEXTO DE LA LANDING — español (trato de usted) e inglés.
   El texto es DEL DUEÑO, LITERAL: aquí no se reescribe ni se agrega una promesa más. Si hay que
   cambiar algo, se cambia aquí y de aquí para el JSX; no se «mejora» por gusto.
   La página arranca en español (`IDIOMA_INICIAL`).

   LOS DIEZ BLOQUES (el armazón de siempre, con la información de hoy):
     1. Cabecera · 2. Portada (con el título que se cambia solo) · 3. Franja que se mueve ·
     4. Qué hacemos · 5. Cómo lo hacemos (el flujo animado y las siete etapas) ·
     6. Con qué trabaja · 7. Con quién se conecta (las 14) · 8. Planes · 9. Contacto · 10. Pie

   NADA DE ESTE TEXTO DICE QUE EL SISTEMA PUBLIQUE SOLO, CIERRE VENTAS NI MANDE ENLACES DE COMPRA:
   eso todavía no existe y la propia página lo dice en el bloque 7.
   ============================================================================================= */

export type Idioma = 'es' | 'en';

/** La página abre en español. */
export const IDIOMA_INICIAL: Idioma = 'es';

/** Adónde llevan los accesos que no tienen sección propia (planes, entrar): al panel. */
export const PANEL = '/panel/';

/**
 * Las capturas del panel y las fotos del trabajo. Viven locales en public/ (nada remoto).
 *
 * OJO CON LA DIRECCIÓN: van en /capturas/ y NO en /panel/. En el servidor, /panel/ entero está
 * tomado por el panel del negocio, así que una imagen pedida a /panel/algo.jpg no devuelve la
 * imagen: devuelve la página del panel con un 200 y en la landing sale rota.
 *
 * CADA BLOQUE CON IMAGEN MUESTRA UNA PANTALLA DISTINTA DEL PANEL (nunca se repite una captura en
 * dos bloques): el bloque 4 usa mercado, campanas y hoy; el bloque 6 usa motor, mirofish, cuenta,
 * en línea y créditos; el bloque 8 usa primeros pasos. Las fotos de gente son del trabajo (no son
 * el equipo del negocio ni el público real) y el bloque 5 lo dice con su rótulo.
 */
export const IMAGENES = {
  buho: '/67.png',
  portada: '/6-web.jpg',
  /* Bloque 4 · QUÉ HACEMOS */
  mercado: '/capturas/mercado.jpg',
  campanas: '/capturas/campanas.jpg',
  hoy: '/capturas/hoy.jpg',
  /* Bloque 6 · CON QUÉ TRABAJA */
  motor: '/capturas/motor.jpg',
  mirofish: '/capturas/mirofish.jpg',
  cuenta: '/capturas/cuenta.jpg',
  enLinea: '/capturas/en-linea.jpg',
  creditos: '/capturas/creditos.jpg',
  /* Bloque 8 · PLANES */
  primerosPasos: '/capturas/primeros-pasos.jpg',
  /* Bloque 5 · las fotos del trabajo */
  gente1: '/gente/gente-1.jpg',
  gente3: '/gente/gente-3.jpg',
} as const;

type Cifra = { etiqueta: string; valor: string };
type Enlace = { texto: string; href: string };
type TarjetaExplica = { numero: string; titulo: string; texto: string; imagen: string; alt: string };
type Etapa = { numero: string; titulo: string; texto: string };
type Herramienta = { numero: string; nombre: string; texto: string; imagen: string; alt: string };
type Conexion = { nombre: string; texto: string };
type Plan = { nombre: string; precio: string; creditos: string };

export type Contenido = {
  /* 1 · CABECERA */
  cabecera: {
    marca: string;
    enlaces: Enlace[];
    entrar: string;
    idioma: { etiqueta: string; es: string; en: string };
    abrirMenu: string;
    altBuho: string;
  };
  /* 2 · PORTADA */
  portada: {
    linea: string;
    /** Las cuatro frases del título que se cambian solas (con el HTML y sin JavaScript). */
    titulos: string[];
    bajada: string;
    accesos: { panel: string; comoFunciona: string; conexiones: string };
    cifras: Cifra[];
    indiceTitulo: string;
    indice: Enlace[];
    altPortada: string;
  };
  /* 3 · LA FRANJA QUE SE MUEVE */
  franja: { palabras: string[] };
  /* 4 · QUÉ HACEMOS */
  queHacemos: { titulo: string; parrafo: string; tarjetas: TarjetaExplica[] };
  /* 5 · CÓMO LO HACEMOS */
  comoLoHacemos: {
    titulo: { uno: string; dos: string };
    etapas: Etapa[];
    genteEtiqueta: string;
    gente: { imagen: string; alt: string }[];
  };
  /* 6 · CON QUÉ TRABAJA */
  conQueTrabaja: { titulo: { uno: string; dos: string }; herramientas: Herramienta[] };
  /* 7 · CON QUIÉN SE CONECTA */
  conexiones: { titulo: string; bajada: string; lista: Conexion[]; honestidad: string };
  /* 8 · PLANES */
  planes: {
    titulo: string;
    lista: Plan[];
    incluye: string;
    nota: string;
    boton: string;
    alt: string;
  };
  /* 9 · CONTACTO */
  contacto: {
    titulo: { uno: string; dos: string };
    bajada: string;
    correo: { etiqueta: string; valor: string };
    formulario: { nombre: string; correo: string; negocio: string; mensaje: string; boton: string };
  };
  /* 10 · PIE */
  pie: {
    marca: string;
    frase: string;
    enlacesTitulo: string;
    enlaces: Enlace[];
    escribir: string;
    derechos: string;
    direccion: string[];
  };
};

const ES: Contenido = {
  cabecera: {
    marca: 'Sinkroo',
    enlaces: [
      { texto: 'Qué hacemos', href: '#que-hacemos' },
      { texto: 'Cómo funciona', href: '#como-funciona' },
      { texto: 'Con qué trabaja', href: '#con-que-trabaja' },
      { texto: 'Conexiones', href: '#conexiones' },
      { texto: 'Planes', href: '#planes' },
    ],
    entrar: 'Entrar al panel',
    idioma: { etiqueta: 'Idioma', es: 'ES', en: 'EN' },
    abrirMenu: 'Abrir el menú',
    altBuho: 'Sinkroo: el búho',
  },
  portada: {
    linea: 'INVESTIGA · ESCRIBE · PRUEBA · APRUEBA · PUBLICA · MIDE',
    titulos: [
      'TU EQUIPO DE MARKETING, TRABAJANDO SOLO 24/7',
      'INVESTIGA SU MERCADO Y ESCRIBE LAS PIEZAS',
      'LAS PRUEBA CON 500 PERSONAS ANTES DE GASTAR',
      'Y MIDE CADA PESO QUE ENTRÓ',
    ],
    bajada:
      'Sinkroo monta el equipo completo de marketing de su negocio: investiga el mercado, escribe las piezas de cada red, las prueba antes de que usted gaste un peso y mide lo que pasó. Usted aprueba lo que sale.',
    accesos: {
      panel: 'ENTRAR A MI PANEL',
      comoFunciona: 'CÓMO FUNCIONA',
      conexiones: 'CON QUÉ SE CONECTA',
    },
    cifras: [
      { etiqueta: 'JUECES POR PIEZA', valor: '5' },
      { etiqueta: 'PERSONAS SIMULADAS', valor: '500' },
      { etiqueta: 'PESOS ANTES DEL VEREDICTO', valor: '0' },
    ],
    indiceTitulo: 'EN ESTA PÁGINA',
    indice: [
      { texto: 'Qué hacemos', href: '#que-hacemos' },
      { texto: 'Cómo lo hacemos', href: '#como-funciona' },
      { texto: 'Con qué trabaja', href: '#con-que-trabaja' },
      { texto: 'Conexiones', href: '#conexiones' },
      { texto: 'Planes', href: '#planes' },
    ],
    altPortada: 'Sinkroo: la tarjeta de marca',
  },
  franja: {
    palabras: ['INVESTIGA', 'ESCRIBE', 'PRUEBA', 'APRUEBA', 'MIDE', 'APRENDE'],
  },
  queHacemos: {
    titulo: 'QUÉ HACEMOS',
    parrafo:
      'Un negocio sin equipo de marketing tiene tres problemas: no sabe qué está funcionando en su mercado, no alcanza a producir todo lo que habría que publicar, y gasta a ciegas. Sinkroo hace las tres cosas, con el material que usted ya tiene.',
    tarjetas: [
      {
        numero: '01',
        titulo: 'LA INVESTIGACIÓN',
        texto:
          'Seis agentes leen su mercado y guardan cada hallazgo con su fuente: qué publica la competencia, con qué colores, en qué duración, con qué gancho y a qué precio.',
        imagen: IMAGENES.mercado,
        alt: 'Panel de Sinkroo: la pantalla «Mercado», donde quedan los hallazgos con su fuente.',
      },
      {
        numero: '02',
        titulo: 'LA CREACIÓN',
        texto:
          'Con esos hallazgos, el motor escribe las piezas de cada red en su formato y con su texto. Cada pieza nace de un hallazgo, no de una corazonada.',
        imagen: IMAGENES.campanas,
        alt: 'Panel de Sinkroo: la pantalla «Campañas», con el flujo por etapas del motor.',
      },
      {
        numero: '03',
        titulo: 'EL FILTRO',
        texto:
          'Antes de gastar, cada pieza se prueba: cinco jueces la puntúan y quinientas personas simuladas reaccionan. La que no convence vuelve a corregirse y no gasta un peso.',
        imagen: IMAGENES.hoy,
        alt: 'Panel de Sinkroo: la pantalla «Hoy» del negocio, con el trabajo del motor.',
      },
    ],
  },
  comoLoHacemos: {
    titulo: { uno: 'CÓMO LO HACEMOS,', dos: 'PASO POR PASO' },
    etapas: [
      {
        numero: '1',
        titulo: 'SU NEGOCIO',
        texto: 'Conecta su negocio y sube lo que ya tiene: su logo, sus fotos, su catálogo y sus precios.',
      },
      {
        numero: '2',
        titulo: 'INVESTIGA',
        texto: 'Los seis agentes salen a leer el mercado y vuelven con hallazgos con fuente.',
      },
      {
        numero: '3',
        titulo: 'ESCRIBE',
        texto: 'El motor redacta la pieza de cada red en el formato de esa red.',
      },
      {
        numero: '4',
        titulo: 'PRUEBA',
        texto: 'MiroFish la pone a prueba: cinco jueces con su nota y quinientas personas opinando en vivo.',
      },
      {
        numero: '5',
        titulo: 'APRUEBA',
        texto: 'Usted mira el veredicto y da el OK. Nada sale sin su aprobación.',
      },
      {
        numero: '6',
        titulo: 'PUBLICA',
        texto: 'La pieza queda lista para sus cuentas y usted decide dónde entra.',
      },
      {
        numero: '7',
        titulo: 'MIDE',
        texto: 'Alcance, clics, costo por venta y el desvío del modelo contra lo que había predicho.',
      },
    ],
    genteEtiqueta: 'IMÁGENES DEL TRABAJO',
    gente: [
      { imagen: IMAGENES.gente1, alt: 'Imágenes del trabajo: una sala de trabajo.' },
      { imagen: IMAGENES.gente3, alt: 'Imágenes del trabajo: una reunión de trabajo.' },
    ],
  },
  conQueTrabaja: {
    titulo: { uno: 'CON QUÉ', dos: 'TRABAJA' },
    herramientas: [
      {
        numero: '01',
        nombre: 'EL EQUIPO DE INVESTIGACIÓN',
        texto:
          'Seis agentes que leen el mercado y dejan todo por escrito con su fuente. Cada hallazgo que usan después las piezas viene de ahí.',
        imagen: IMAGENES.motor,
        alt: 'Panel de Sinkroo: la pantalla «Campañas», donde arranca el trabajo del motor.',
      },
      {
        numero: '02',
        nombre: 'MIROFISH',
        texto:
          'El mercado simulado. Cinco jueces (Claridad, Gancho, Deseo, Prueba y Llamada) y quinientas personas con el comportamiento de su público. Es lo que se interpone entre su dinero y la publicación.',
        imagen: IMAGENES.mirofish,
        alt: 'Panel de Sinkroo: la pestaña «MiroFish», con la nota de una pieza y lo que votó cada juez.',
      },
      {
        numero: '03',
        nombre: 'EL PANEL',
        texto:
          'Su día, campañas, mercado, conversaciones, créditos y autonomía. Todo lo que el motor hace queda ahí, con su fecha y su motivo.',
        imagen: IMAGENES.cuenta,
        alt: 'Panel de Sinkroo: la pantalla «Cuenta y autonomía», con el negocio, sus créditos y lo que decide la IA.',
      },
      {
        numero: '04',
        nombre: 'LAS MEDICIONES',
        texto:
          'Lo que las plataformas reportan de verdad (alcance, clics, gasto, ventas) y la comparación con lo que el modelo había predicho: el desvío.',
        imagen: IMAGENES.enLinea,
        alt: 'Panel de Sinkroo: la pestaña «En línea», con el monitoreo en vivo de lo que va corriendo.',
      },
      {
        numero: '05',
        nombre: 'LOS CRÉDITOS',
        texto:
          'Un crédito es una unidad de trabajo del motor. Cada análisis, cada pieza y cada prueba consumen, y usted ve en qué se va.',
        imagen: IMAGENES.creditos,
        alt: 'Panel de Sinkroo: la pantalla «Créditos», con lo que tiene, en qué se va y cómo cargarlo.',
      },
    ],
  },
  conexiones: {
    titulo: 'CONECTA SUS CUENTAS',
    bajada:
      'El motor trabaja con sus cuentas, no con las nuestras; cada conexión es suya y la puede revocar cuando quiera desde el panel.',
    lista: [
      {
        nombre: 'Instagram',
        texto:
          'Quiénes son sus seguidores de verdad —edad, género y las ciudades donde están— y cómo rinde cada publicación.',
      },
      {
        nombre: 'Facebook',
        texto: 'La Página del negocio y cuánta gente la sigue.',
      },
      {
        nombre: 'WhatsApp',
        texto:
          'El número por el que entran los clientes y el estado del canal que atiende esas conversaciones.',
      },
      {
        nombre: 'TikTok',
        texto:
          'Cuánta gente ve sus videos y cómo rinde cada uno: vistas, me gusta, comentarios y veces compartido.',
      },
      {
        nombre: 'YouTube',
        texto: 'El público que de verdad ve sus videos y cómo rinde cada video.',
      },
      {
        nombre: 'Google',
        texto:
          'Lo que entra al sitio desde Google y cómo rinden las campañas: sesiones, usuarios y conversiones.',
      },
      {
        nombre: 'Correo',
        texto: 'El correo desde el que salen los informes del negocio: el resumen semanal y los avisos.',
      },
      {
        nombre: 'Meta Ads',
        texto: 'Lo que de verdad costó y rindió la pauta: gasto, resultados, CTR y CPM por campaña.',
      },
      {
        nombre: 'Tienda',
        texto:
          'El catálogo con sus precios y las ventas reales por producto: la métrica más honesta, porque es plata que entró.',
      },
      {
        nombre: 'Píxel del sitio',
        texto: 'Los eventos que de verdad ocurrieron en la página: visitas, carritos y compras.',
      },
      {
        nombre: 'bundle.social',
        texto:
          'Publica en las cuentas que usted conecte —Instagram, Facebook, TikTok, YouTube, LinkedIn, Threads y Pinterest— sin crear una app ni pedir permisos de desarrollador en cada plataforma.',
      },
      {
        nombre: 'LinkedIn · Threads · Pinterest',
        texto: 'Se conectan por la vía de bundle.social.',
      },
    ],
    honestidad:
      'Publicar en las redes todavía no está conectado: por ahora el sistema deja las piezas listas, con su veredicto, y usted decide cuándo entran.',
  },
  planes: {
    titulo: 'PLANES',
    lista: [
      { nombre: 'Base', precio: '$39', creditos: '2.000 créditos por mes' },
      { nombre: 'Pro', precio: '$79', creditos: '5.000 créditos por mes' },
      { nombre: 'Estudio', precio: '$149', creditos: '12.000 créditos por mes' },
    ],
    incluye:
      'Los tres planes incluyen: el motor, la investigación del mercado, el filtro de MiroFish, el panel y los créditos del mes.',
    nota: 'El detalle y la carga de créditos están adentro del panel.',
    boton: 'ENTRAR AL PANEL',
    alt: 'Panel de Sinkroo: «Primeros pasos», donde se ve el plan con sus créditos del mes.',
  },
  contacto: {
    titulo: { uno: 'ANTES DE INVERTIR,', dos: 'VEA CÓMO PIENSA EL SISTEMA' },
    bajada:
      'Déjenos su negocio y le escribimos con el panel abierto, para que vea qué haría el motor con lo suyo primero. Sin compromiso.',
    correo: { etiqueta: 'Para escribirnos', valor: 'info@sinkroo.com' },
    formulario: {
      nombre: 'Su nombre',
      correo: 'Su correo',
      negocio: 'El sitio de su negocio',
      mensaje: 'Cuéntenos qué vende',
      boton: 'PEDIR UNA DEMOSTRACIÓN',
    },
  },
  pie: {
    marca: 'Sinkroo',
    frase: 'Prueba antes de gastar. Porque vender no es una apuesta.',
    enlacesTitulo: 'Accesos rápidos',
    enlaces: [
      { texto: 'Qué hacemos', href: '#que-hacemos' },
      { texto: 'Cómo lo hacemos', href: '#como-funciona' },
      { texto: 'Conexiones', href: '#conexiones' },
      { texto: 'Planes', href: '#planes' },
      { texto: 'Entrar al panel', href: PANEL },
    ],
    escribir: 'Para escribirnos:',
    derechos: '© 2026 Sinkroo',
    direccion: [
      'Innovation Hub, Level 14, Gate Village Building 4',
      'Dubai International Financial Centre (DIFC)',
      'Dubai, United Arab Emirates',
    ],
  },
};

/* La traducción es literal: mismo contenido, mismas mayúsculas en los títulos, nada de más ni de
   menos. Lo que no se puede traducir sin cambiarle el sentido se queda como está. */
const EN: Contenido = {
  cabecera: {
    marca: 'Sinkroo',
    enlaces: [
      { texto: 'What we do', href: '#que-hacemos' },
      { texto: 'How it works', href: '#como-funciona' },
      { texto: 'What it works with', href: '#con-que-trabaja' },
      { texto: 'Connections', href: '#conexiones' },
      { texto: 'Plans', href: '#planes' },
    ],
    entrar: 'Enter the panel',
    idioma: { etiqueta: 'Language', es: 'ES', en: 'EN' },
    abrirMenu: 'Open the menu',
    altBuho: 'Sinkroo: the owl',
  },
  portada: {
    linea: 'RESEARCHES · WRITES · TESTS · APPROVES · PUBLISHES · MEASURES',
    titulos: [
      'YOUR MARKETING TEAM, WORKING ON ITS OWN 24/7',
      'IT RESEARCHES YOUR MARKET AND WRITES THE PIECES',
      'IT TESTS THEM WITH 500 PEOPLE BEFORE YOU SPEND',
      'AND MEASURES EVERY PESO THAT CAME IN',
    ],
    bajada:
      'Sinkroo builds the complete marketing team for your business: it researches the market, writes the pieces for each network, tests them before you spend a single peso and measures what happened. You approve what goes out.',
    accesos: {
      panel: 'ENTER MY PANEL',
      comoFunciona: 'HOW IT WORKS',
      conexiones: 'WHAT IT CONNECTS TO',
    },
    cifras: [
      { etiqueta: 'JUDGES PER PIECE', valor: '5' },
      { etiqueta: 'SIMULATED PEOPLE', valor: '500' },
      { etiqueta: 'PESOS BEFORE THE VERDICT', valor: '0' },
    ],
    indiceTitulo: 'ON THIS PAGE',
    indice: [
      { texto: 'What we do', href: '#que-hacemos' },
      { texto: 'How we do it', href: '#como-funciona' },
      { texto: 'What it works with', href: '#con-que-trabaja' },
      { texto: 'Connections', href: '#conexiones' },
      { texto: 'Plans', href: '#planes' },
    ],
    altPortada: 'Sinkroo: the brand card',
  },
  franja: {
    palabras: ['RESEARCHES', 'WRITES', 'TESTS', 'APPROVES', 'MEASURES', 'LEARNS'],
  },
  queHacemos: {
    titulo: 'WHAT WE DO',
    parrafo:
      'A business with no marketing team has three problems: it does not know what is working in its market, it cannot produce everything that should be published, and it spends blind. Sinkroo does all three, with the material you already have.',
    tarjetas: [
      {
        numero: '01',
        titulo: 'THE RESEARCH',
        texto:
          'Six agents read your market and keep every finding with its source: what the competition publishes, in which colours, at what length, with which hook and at what price.',
        imagen: IMAGENES.mercado,
        alt: 'Sinkroo panel: the “Mercado” screen, where the findings are kept with their source.',
      },
      {
        numero: '02',
        titulo: 'THE CREATION',
        texto:
          'With those findings, the engine writes the pieces for each network in its format and with its text. Every piece is born from a finding, not from a hunch.',
        imagen: IMAGENES.campanas,
        alt: 'Sinkroo panel: the “Campañas” screen, with the engine flow by stages.',
      },
      {
        numero: '03',
        titulo: 'THE FILTER',
        texto:
          'Before spending, every piece is tested: five judges score it and five hundred simulated people react. The one that does not convince goes back to be fixed and does not spend a peso.',
        imagen: IMAGENES.hoy,
        alt: 'Sinkroo panel: the “Hoy” screen of the business, with the work of the engine.',
      },
    ],
  },
  comoLoHacemos: {
    titulo: { uno: 'HOW WE DO IT,', dos: 'STEP BY STEP' },
    etapas: [
      {
        numero: '1',
        titulo: 'YOUR BUSINESS',
        texto:
          'Connect your business and upload what you already have: your logo, your photos, your catalogue and your prices.',
      },
      {
        numero: '2',
        titulo: 'RESEARCHES',
        texto: 'The six agents go out to read the market and come back with findings and their source.',
      },
      {
        numero: '3',
        titulo: 'WRITES',
        texto: "The engine writes the piece for each network in that network's format.",
      },
      {
        numero: '4',
        titulo: 'TESTS',
        texto:
          'MiroFish puts it to the test: five judges with their score and five hundred people giving their opinion live.',
      },
      {
        numero: '5',
        titulo: 'APPROVES',
        texto: 'You look at the verdict and give the OK. Nothing goes out without your approval.',
      },
      {
        numero: '6',
        titulo: 'PUBLISHES',
        texto: 'The piece is left ready for your accounts and you decide where it goes in.',
      },
      {
        numero: '7',
        titulo: 'MEASURES',
        texto: 'Reach, clicks, cost per sale and the deviation of the model against what it had predicted.',
      },
    ],
    genteEtiqueta: 'PICTURES OF THE WORK',
    gente: [
      { imagen: IMAGENES.gente1, alt: 'Pictures of the work: a work room.' },
      { imagen: IMAGENES.gente3, alt: 'Pictures of the work: a work meeting.' },
    ],
  },
  conQueTrabaja: {
    titulo: { uno: 'WHAT IT', dos: 'WORKS WITH' },
    herramientas: [
      {
        numero: '01',
        nombre: 'THE RESEARCH TEAM',
        texto:
          'Six agents that read the market and leave everything in writing with its source. Every finding the pieces use afterwards comes from there.',
        imagen: IMAGENES.motor,
        alt: 'Sinkroo panel: the “Campañas” screen, where the work of the engine starts.',
      },
      {
        numero: '02',
        nombre: 'MIROFISH',
        texto:
          'The simulated market. Five judges (Clarity, Hook, Desire, Proof and Call) and five hundred people with your audience’s behaviour. It is what stands between your money and publishing.',
        imagen: IMAGENES.mirofish,
        alt: 'Sinkroo panel: the “MiroFish” tab, with the score of a piece and what each judge voted.',
      },
      {
        numero: '03',
        nombre: 'THE PANEL',
        texto:
          'Your day, campaigns, market, conversations, credits and autonomy. Everything the engine does is there, with its date and its reason.',
        imagen: IMAGENES.cuenta,
        alt: 'Sinkroo panel: the “Cuenta y autonomía” screen, with the business, its credits and what the AI decides.',
      },
      {
        numero: '04',
        nombre: 'THE MEASUREMENTS',
        texto:
          'What the platforms report for real (reach, clicks, spend, sales) and the comparison with what the model had predicted: the deviation.',
        imagen: IMAGENES.enLinea,
        alt: 'Sinkroo panel: the “En línea” tab, with live monitoring of what is running.',
      },
      {
        numero: '05',
        nombre: 'THE CREDITS',
        texto:
          'A credit is a unit of work of the engine. Every analysis, every piece and every test consume, and you see where it goes.',
        imagen: IMAGENES.creditos,
        alt: 'Sinkroo panel: the “Créditos” screen, with what you have, where it goes and how to load it.',
      },
    ],
  },
  conexiones: {
    titulo: 'CONNECT YOUR ACCOUNTS',
    bajada:
      'The engine works with your accounts, not with ours; every connection is yours and you can revoke it whenever you want from the panel.',
    lista: [
      {
        nombre: 'Instagram',
        texto:
          'Who your followers really are —age, gender and the cities they are in— and how each post performs.',
      },
      {
        nombre: 'Facebook',
        texto: 'The business Page and how many people follow it.',
      },
      {
        nombre: 'WhatsApp',
        texto:
          'The number clients come in through and the state of the channel that answers those conversations.',
      },
      {
        nombre: 'TikTok',
        texto:
          'How many people see your videos and how each one performs: views, likes, comments and times shared.',
      },
      {
        nombre: 'YouTube',
        texto: 'The audience that really watches your videos and how each video performs.',
      },
      {
        nombre: 'Google',
        texto:
          'What comes into the site from Google and how the campaigns perform: sessions, users and conversions.',
      },
      {
        nombre: 'Email',
        texto:
          'The email the business reports go out from: the weekly summary and the notices.',
      },
      {
        nombre: 'Meta Ads',
        texto: 'What the ads really cost and delivered: spend, results, CTR and CPM per campaign.',
      },
      {
        nombre: 'Store',
        texto:
          'The catalogue with its prices and the real sales per product: the most honest metric, because it is money that came in.',
      },
      {
        nombre: 'Site pixel',
        texto: 'The events that really happened on the page: visits, carts and purchases.',
      },
      {
        nombre: 'bundle.social',
        texto:
          'Publishes in the accounts you connect —Instagram, Facebook, TikTok, YouTube, LinkedIn, Threads and Pinterest— without creating an app or asking for developer permissions on each platform.',
      },
      {
        nombre: 'LinkedIn · Threads · Pinterest',
        texto: 'They connect through bundle.social.',
      },
    ],
    honestidad:
      'Publishing on the networks is not connected yet: for now the system leaves the pieces ready, with their verdict, and you decide when they go in.',
  },
  planes: {
    titulo: 'PLANS',
    lista: [
      { nombre: 'Base', precio: '$39', creditos: '2,000 credits per month' },
      { nombre: 'Pro', precio: '$79', creditos: '5,000 credits per month' },
      { nombre: 'Studio', precio: '$149', creditos: '12,000 credits per month' },
    ],
    incluye:
      'The three plans include: the engine, the market research, the MiroFish filter, the panel and the credits of the month.',
    nota: 'The detail and the loading of credits are inside the panel.',
    boton: 'ENTER THE PANEL',
    alt: 'Sinkroo panel: “Primeros pasos”, where the plan with its credits of the month is shown.',
  },
  contacto: {
    titulo: { uno: 'BEFORE YOU INVEST,', dos: 'SEE HOW THE SYSTEM THINKS' },
    bajada:
      'Leave us your business and we will write to you with the panel open, so you can see what the engine would do with yours first. No strings attached.',
    correo: { etiqueta: 'To write to us', valor: 'info@sinkroo.com' },
    formulario: {
      nombre: 'Your name',
      correo: 'Your email',
      negocio: 'Your business website',
      mensaje: 'Tell us what you sell',
      boton: 'REQUEST A DEMO',
    },
  },
  pie: {
    marca: 'Sinkroo',
    frase: 'Tests before spending. Because selling is not a bet.',
    enlacesTitulo: 'Quick access',
    enlaces: [
      { texto: 'What we do', href: '#que-hacemos' },
      { texto: 'How we do it', href: '#como-funciona' },
      { texto: 'Connections', href: '#conexiones' },
      { texto: 'Plans', href: '#planes' },
      { texto: 'Enter the panel', href: PANEL },
    ],
    escribir: 'To write to us:',
    derechos: '© 2026 Sinkroo',
    direccion: [
      'Innovation Hub, Level 14, Gate Village Building 4',
      'Dubai International Financial Centre (DIFC)',
      'Dubai, United Arab Emirates',
    ],
  },
};

export const CONTENIDO: Record<Idioma, Contenido> = { es: ES, en: EN };

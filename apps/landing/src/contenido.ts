/* =============================================================================================
   EL TEXTO DE LA LANDING — español (trato de usted) e inglés.
   El texto es DEL DUEÑO, LITERAL: aquí no se reescribe ni se agrega una promesa más. Si hay que
   cambiar algo, se cambia aquí y de aquí para el JSX; no se «mejora» por gusto.
   La página arranca en español (`IDIOMA_INICIAL`).
   ============================================================================================= */

export type Idioma = 'es' | 'en';

/** La página abre en español. */
export const IDIOMA_INICIAL: Idioma = 'es';

/** Adónde llevan los accesos que no tienen sección propia (planes, entrar): al panel. */
export const PANEL = '/panel/';

/**
 * Las cuatro capturas del panel. Viven locales en public/capturas (nada remoto).
 *
 * OJO CON LA DIRECCIÓN: van en /capturas/ y NO en /panel/. En el servidor, /panel/ entero está
 * tomado por el panel del negocio, así que una imagen pedida a /panel/algo.jpg no devolvía la
 * imagen: devolvía la página del panel con un 200 y en la landing salía rota.
 */
export const IMAGENES = {
  buho: '/67.png',
  portada: '/6-web.jpg',
  hoy: '/capturas/hoy.jpg',
  campanas: '/capturas/campanas.jpg',
  mercado: '/capturas/mercado.jpg',
  creditos: '/capturas/creditos.jpg',
} as const;

type Cifra = { etiqueta: string; valor: string };
type TarjetaTrabajo = { numero: string; titulo: string; texto: string; enlace: string; imagen: string; alt: string };
type Modulo = { numero: string; titulo: string; texto: string; imagen: string; alt: string };
type TarjetaCifra = { etiqueta: string; valor: string; subtitulo: string; texto: string; imagen?: string; alt?: string };

export type Contenido = {
  /* 1 · CABECERA */
  cabecera: {
    marca: string;
    menu: { comoFunciona: string; planes: string; entrar: string };
    idioma: { etiqueta: string; es: string; en: string };
    abrirMenu: string;
    altBuho: string;
  };
  /* 2 · PORTADA */
  portada: {
    linea: string;
    titulo: { uno: string; dos: string };
    bajada: string;
    accesos: { panel: string; comoFunciona: string; planes: string };
    cifras: Cifra[];
    altPortada: string;
  };
  /* 3 · LOS DOS PÁRRAFOS */
  introduccion: { uno: string; dos: string };
  /* 4 · LA FRANJA QUE SE MUEVE */
  franja: { palabras: string[]; frases: string[] };
  /* 5 · CÓMO FUNCIONA */
  comoFunciona: {
    etiqueta: string;
    titulo: { uno: string; dos: string };
    parrafos: { uno: string; dos: string };
    linea: string;
    boton: string;
    tarjetas: TarjetaTrabajo[];
  };
  /* 6 · LOS SIETE MÓDULOS */
  modulosTitulo: { uno: string; dos: string };
  modulos: Modulo[];
  /* 7 · LA DIFERENCIA ES EL ORDEN */
  cifras: {
    etiqueta: string;
    titulo: { uno: string; dos: string };
    parrafo: string;
    tarjetas: TarjetaCifra[];
    linea1: string;
    linea2: string;
    enlace: string;
  };
  /* 8 · BLOQUE NUMERADO */
  investigacion: {
    numero: string;
    etiqueta: string;
    titulo: { uno: string; dos: string };
    subtitulo: [string, string];
    texto: string;
    enlace: string;
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
    enlaces: { texto: string; href: string }[];
    escribir: string;
    derechos: string;
    direccion: string[];
  };
};

const ES: Contenido = {
  cabecera: {
    marca: 'Sinkroo',
    menu: { comoFunciona: 'Cómo funciona', planes: 'Planes', entrar: 'Entrar' },
    idioma: { etiqueta: 'Idioma', es: 'ES', en: 'EN' },
    abrirMenu: 'Abrir el menú',
    altBuho: 'Sinkroo: el búho',
  },
  portada: {
    linea: 'CINCO JUECES · QUINIENTAS PERSONAS · CERO PESOS ANTES DEL VEREDICTO',
    titulo: { uno: 'TU EQUIPO DE MARKETING,', dos: 'TRABAJANDO SOLO 24/7' },
    bajada:
      'Investiga su mercado, escribe las piezas, las prueba con quinientas personas simuladas y cinco jueces, y mide cada peso. El trabajo queda hecho: sólo queda aprobar.',
    accesos: { panel: 'ENTRAR A MI PANEL', comoFunciona: 'CÓMO FUNCIONA', planes: 'VER LOS PLANES' },
    cifras: [
      { etiqueta: 'JUECES POR PIEZA', valor: '5' },
      { etiqueta: 'PERSONAS DEL PÚBLICO', valor: '500' },
      { etiqueta: 'PESOS ANTES DEL VEREDICTO', valor: '0' },
    ],
    altPortada: 'Sinkroo: la tarjeta de marca',
  },
  introduccion: {
    uno: 'Sinkroo lee su negocio, su material y sus cuentas. De ahí en adelante trabaja solo: investiga el mercado donde compite, escribe las piezas de cada red y las prueba antes de que usted gaste un peso.',
    dos: 'No adivina. Cada pieza se somete a su público simulado y a cinco jueces: la que no convence vuelve a corregirse y queda guardada con el voto de cada juez. Lo que sale, sale con veredicto.',
  },
  franja: {
    palabras: ['INVESTIGA', 'ESCRIBE', 'PRUEBA', 'APRUEBA', 'MIDE', 'APRENDE'],
    frases: [
      'SEIS AGENTES DE INVESTIGACIÓN',
      'CINCO JUECES',
      'QUINIENTAS PERSONAS',
      'UN PANEL PARA USTED',
    ],
  },
  comoFunciona: {
    etiqueta: 'CÓMO TRABAJA',
    titulo: { uno: 'EL FIN DE', dos: 'ADIVINAR' },
    parrafos: {
      uno: 'Hoy el marketing se decide por intuición y el error se paga después: se produce, se publica y sólo entonces se sabe si funcionó.',
      dos: 'Sinkroo le da vuelta al orden. Primero investiga, después escribe, y sólo sale lo que pasó el filtro. Cada decisión queda escrita, con su dato y con de dónde salió.',
    },
    linea: 'SISTEMÁTICO · PREDECIBLE · MEDIBLE',
    boton: 'ENTRAR A MI PANEL',
    tarjetas: [
      {
        numero: '01',
        titulo: 'EL EQUIPO INVESTIGA',
        texto:
          'Seis agentes leen el mercado: qué publica su competencia, con qué colores, qué ganchos y qué precios. Cada hallazgo queda guardado con su fuente.',
        enlace: 'Ver la investigación',
        imagen: IMAGENES.mercado,
        alt: 'Panel de Sinkroo: la pantalla «Mercado», donde quedan los hallazgos con su fuente.',
      },
      {
        numero: '02',
        titulo: 'EL MOTOR ESCRIBE',
        texto:
          'De esos hallazgos salen las piezas de cada red, con su formato y su texto. Nada se inventa de la nada: cada pieza nace de un hallazgo.',
        enlace: 'Ver las piezas',
        imagen: IMAGENES.campanas,
        alt: 'Panel de Sinkroo: la pantalla «Campañas» con el flujo por etapas.',
      },
      {
        numero: '03',
        titulo: 'MIROFISH DECIDE',
        texto:
          'Cinco jueces y quinientas personas simuladas votan cada pieza. La que no pasa el filtro no se publica y no gasta un peso.',
        enlace: 'Ver el veredicto',
        imagen: IMAGENES.hoy,
        alt: 'Panel de Sinkroo: la pantalla «Hoy» con los cinco jueces y las quinientas personas del público por pieza.',
      },
    ],
  },
  modulosTitulo: { uno: 'LOS SIETE', dos: 'MÓDULOS' },
  modulos: [
    {
      numero: 'M1',
      titulo: 'SU NEGOCIO',
      texto:
        'El sistema lee su negocio, su material y sus productos: qué vende, a quién y con qué tono.',
      imagen: IMAGENES.hoy,
      alt: 'Panel de Sinkroo: la pantalla «Hoy» de la cuenta de demostración.',
    },
    {
      numero: 'M2',
      titulo: 'SU PÚBLICO',
      texto:
        'Con eso arma el público con el que se prueba: quinientas personas simuladas con la edad, la zona y el comportamiento de su mercado.',
      imagen: IMAGENES.hoy,
      alt: 'Panel de Sinkroo: la pantalla «Hoy», con los cinco jueces y las quinientas personas del público por pieza.',
    },
    {
      numero: 'M3',
      titulo: 'LA INVESTIGACIÓN',
      texto:
        'Seis agentes leen el mercado y guardan cada hallazgo con la fuente: de ahí salen los colores, los ganchos y los precios.',
      imagen: IMAGENES.mercado,
      alt: 'Panel de Sinkroo: la pantalla «Mercado», con los hallazgos y su fuente.',
    },
    {
      numero: 'M4',
      titulo: 'LAS PIEZAS',
      texto:
        'El motor escribe las piezas de cada red, cada una en su formato y con su texto, partiendo de los hallazgos.',
      imagen: IMAGENES.campanas,
      alt: 'Panel de Sinkroo: la pantalla «Campañas», con las piezas que el motor crea.',
    },
    {
      numero: 'M5',
      titulo: 'EL FILTRO',
      texto:
        'Cinco jueces las puntúan y quinientas personas reaccionan. La que no convence vuelve a corregirse y no gasta un peso.',
      imagen: IMAGENES.hoy,
      alt: 'Panel de Sinkroo: la pantalla «Hoy», donde se ve el filtro de cinco jueces y quinientas personas.',
    },
    {
      numero: 'M6',
      titulo: 'SU APROBACIÓN',
      texto:
        'Lo que pasa el filtro queda listo para salir y usted decide qué se publica. Nada sale de sus cuentas sin su OK.',
      imagen: IMAGENES.campanas,
      alt: 'Panel de Sinkroo: la pantalla «Campañas», donde el flujo termina en su decisión.',
    },
    {
      numero: 'M7',
      titulo: 'LA MEDICIÓN',
      texto:
        'Se mide qué rindió cada pieza y cuánto costó, y se compara con lo que el modelo había predicho: de ahí sale el desvío.',
      imagen: IMAGENES.mercado,
      alt: 'Panel de Sinkroo: la pantalla «Mercado», con el desvío del modelo frente a lo que pasó.',
    },
  ],
  cifras: {
    etiqueta: 'LA DIFERENCIA ES EL ORDEN',
    titulo: { uno: 'PRIMERO SE PRUEBA.', dos: 'DESPUÉS SE GASTA.' },
    parrafo:
      'En el marketing corriente el dinero sale primero y el aprendizaje llega después, cuando ya se gastó. Acá es al revés: lo que se gasta ya pasó por quinientas personas y cinco jueces.',
    tarjetas: [
      {
        etiqueta: 'EL FILTRO',
        valor: '5 jueces',
        subtitulo: 'Cada pieza recibe el voto de cinco jueces',
        texto: 'Claridad, Gancho, Deseo, Prueba y Llamada.',
      },
      {
        etiqueta: 'EL PÚBLICO',
        valor: '500 personas',
        subtitulo: 'Reaccionan a cada pieza antes de que salga.',
        texto: 'Su reacción y el sentimiento del mercado se ven en vivo mientras el motor trabaja.',
      },
      {
        etiqueta: 'EL GASTO',
        valor: '0 pesos',
        subtitulo: 'Antes del veredicto no se gasta nada.',
        texto:
          'Lo que no convence vuelve a corregirse y se guarda con el voto de cada juez.',
        imagen: IMAGENES.creditos,
        alt: 'Panel de Sinkroo: la pantalla «Créditos», que muestra qué tiene, en qué se va y cómo cargarlo.',
      },
    ],
    linea1: 'NADA SALE SIN VEREDICTO',
    linea2: 'Cero pesos en lo que no pasó el filtro.',
    enlace: 'VER CÓMO FUNCIONA →',
  },
  investigacion: {
    numero: '03 —',
    etiqueta: 'LA INVESTIGACIÓN DEL MERCADO',
    titulo: { uno: 'QUÉ ESTÁ FUNCIONANDO EN SU MERCADO,', dos: 'CON LA FUENTE' },
    subtitulo: ['Alta fidelidad', 'Referencia del mercado'],
    texto:
      'Los seis agentes estudian su mercado y dejan por escrito lo que encontraron: qué publica la competencia, con qué colores, en qué duración, con qué gancho y a qué precio. Cada hallazgo queda guardado con su fuente, y el desvío del modelo le dice qué tan cerca estuvo de lo que pasó de verdad.',
    enlace: 'Ver la investigación',
    alt: 'Panel de Sinkroo: la pantalla «Mercado», con los hallazgos del mercado y su fuente.',
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
      { texto: 'Cómo funciona', href: '#como-funciona' },
      { texto: 'La investigación', href: '#investigacion' },
      { texto: 'Planes', href: PANEL },
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

const EN: Contenido = {
  cabecera: {
    marca: 'Sinkroo',
    menu: { comoFunciona: 'How it works', planes: 'Plans', entrar: 'Enter' },
    idioma: { etiqueta: 'Language', es: 'ES', en: 'EN' },
    abrirMenu: 'Open the menu',
    altBuho: 'Sinkroo: the owl',
  },
  portada: {
    linea: 'FIVE JUDGES · FIVE HUNDRED PEOPLE · ZERO SPENT BEFORE THE VERDICT',
    titulo: { uno: 'YOUR MARKETING TEAM,', dos: 'WORKING ON ITS OWN 24/7' },
    bajada:
      'It researches your market, writes the pieces, tests them with five hundred simulated people and five judges, and measures every peso. The work gets done: it is only waiting for your approval.',
    accesos: { panel: 'ENTER MY PANEL', comoFunciona: 'HOW IT WORKS', planes: 'SEE THE PLANS' },
    cifras: [
      { etiqueta: 'JUDGES PER PIECE', valor: '5' },
      { etiqueta: 'PEOPLE IN THE AUDIENCE', valor: '500' },
      { etiqueta: 'SPENT BEFORE THE VERDICT', valor: '0' },
    ],
    altPortada: 'Sinkroo: the brand card',
  },
  introduccion: {
    uno: 'Sinkroo reads your business, your material and your accounts. From there it works on its own: it researches the market you compete in, writes the pieces for each network and tests them before you spend a single peso.',
    dos: "It does not guess. Every piece faces your simulated audience and five judges: the one that does not convince goes back to be fixed and stays on file with each judge's vote. What goes out, goes out with a verdict.",
  },
  franja: {
    palabras: ['RESEARCHES', 'WRITES', 'TESTS', 'APPROVES', 'MEASURES', 'LEARNS'],
    frases: ['SIX RESEARCH AGENTS', 'FIVE JUDGES', 'FIVE HUNDRED PEOPLE', 'ONE PANEL FOR YOU'],
  },
  comoFunciona: {
    etiqueta: 'HOW IT WORKS',
    titulo: { uno: 'THE END OF', dos: 'GUESSWORK' },
    parrafos: {
      uno: 'Today marketing is decided by intuition and the mistake is paid later: you produce, you publish, and only then you find out whether it worked.',
      dos: 'Sinkroo flips the order. First it researches, then it writes, and only what passed the filter goes out. Every decision is on file, with its data and where it came from.',
    },
    linea: 'SYSTEMATIC · PREDICTABLE · MEASURABLE',
    boton: 'ENTER MY PANEL',
    tarjetas: [
      {
        numero: '01',
        titulo: 'THE TEAM RESEARCHES',
        texto:
          'Six agents read the market: what your competitors publish, with which colours, which hooks and which prices. Every finding is kept with its source.',
        enlace: 'See the research',
        imagen: IMAGENES.mercado,
        alt: 'Sinkroo panel: the “Mercado” screen, where the findings are kept with their source.',
      },
      {
        numero: '02',
        titulo: 'THE ENGINE WRITES',
        texto:
          'From those findings come the pieces for each network, each in its own format and with its own text. Nothing is invented out of thin air: every piece is born from a finding.',
        enlace: 'See the pieces',
        imagen: IMAGENES.campanas,
        alt: 'Sinkroo panel: the “Campañas” screen with the flow by stages.',
      },
      {
        numero: '03',
        titulo: 'MIROFISH DECIDES',
        texto:
          'Five judges and five hundred simulated people vote on every piece. The one that does not pass the filter is not published and does not spend a peso.',
        enlace: 'See the verdict',
        imagen: IMAGENES.hoy,
        alt: 'Sinkroo panel: the “Hoy” screen with the five judges and the five hundred people per piece.',
      },
    ],
  },
  modulosTitulo: { uno: 'THE SEVEN', dos: 'MODULES' },
  modulos: [
    {
      numero: 'M1',
      titulo: 'YOUR BUSINESS',
      texto: 'The system reads your business, your material and your products: what you sell, to whom, and in what tone.',
      imagen: IMAGENES.hoy,
      alt: 'Sinkroo panel: the “Hoy” screen of the demo account.',
    },
    {
      numero: 'M2',
      titulo: 'YOUR AUDIENCE',
      texto:
        'With that it builds the audience it tests with: five hundred simulated people with the age, the area and the behaviour of your market.',
      imagen: IMAGENES.hoy,
      alt: 'Sinkroo panel: the “Hoy” screen, with the five judges and the five hundred people per piece.',
    },
    {
      numero: 'M3',
      titulo: 'THE RESEARCH',
      texto: 'Six agents read the market and keep every finding with its source: from there come the colours, the hooks and the prices.',
      imagen: IMAGENES.mercado,
      alt: 'Sinkroo panel: the “Mercado” screen, with the findings and their source.',
    },
    {
      numero: 'M4',
      titulo: 'THE PIECES',
      texto: 'The engine writes the pieces for each network, each in its own format and with its own text, starting from the findings.',
      imagen: IMAGENES.campanas,
      alt: 'Sinkroo panel: the “Campañas” screen, with the pieces the engine creates.',
    },
    {
      numero: 'M5',
      titulo: 'THE FILTER',
      texto: 'Five judges score them and five hundred people react. The one that does not convince goes back to be fixed and does not spend a peso.',
      imagen: IMAGENES.hoy,
      alt: 'Sinkroo panel: the “Hoy” screen, where the filter of five judges and five hundred people is shown.',
    },
    {
      numero: 'M6',
      titulo: 'YOUR APPROVAL',
      texto: 'What passes the filter is ready to go out and you decide what gets published. Nothing leaves your accounts without your OK.',
      imagen: IMAGENES.campanas,
      alt: 'Sinkroo panel: the “Campañas” screen, where the flow ends in your decision.',
    },
    {
      numero: 'M7',
      titulo: 'THE MEASUREMENT',
      texto:
        'What each piece delivered and what it cost is measured, and compared with what the model had predicted: from there comes the deviation.',
      imagen: IMAGENES.mercado,
      alt: 'Sinkroo panel: the “Mercado” screen, with the model deviation against what actually happened.',
    },
  ],
  cifras: {
    etiqueta: 'THE DIFFERENCE IS THE ORDER',
    titulo: { uno: 'FIRST IT IS TESTED.', dos: 'THEN IT IS SPENT.' },
    parrafo:
      'In ordinary marketing the money goes out first and the learning arrives later, when it is already spent. Here it is the other way around: what is spent has already faced five hundred people and five judges.',
    tarjetas: [
      {
        etiqueta: 'THE FILTER',
        valor: '5 judges',
        subtitulo: 'Every piece gets the vote of five judges',
        texto: 'Clarity, Hook, Desire, Proof and Call.',
      },
      {
        etiqueta: 'THE AUDIENCE',
        valor: '500 people',
        subtitulo: 'They react to every piece before it goes out.',
        texto: 'Their reaction and the market sentiment are seen live while the engine works.',
      },
      {
        etiqueta: 'THE SPEND',
        valor: '0 pesos',
        subtitulo: 'Nothing is spent before the verdict.',
        texto: "What does not convince goes back to be fixed and stays on file with each judge's vote.",
        imagen: IMAGENES.creditos,
        alt: 'Sinkroo panel: the “Créditos” screen, which shows what you have, where it goes and how to load it.',
      },
    ],
    linea1: 'NOTHING GOES OUT WITHOUT A VERDICT',
    linea2: 'Zero pesos on what did not pass the filter.',
    enlace: 'SEE HOW IT WORKS →',
  },
  investigacion: {
    numero: '03 —',
    etiqueta: 'MARKET RESEARCH',
    titulo: { uno: 'WHAT IS WORKING IN YOUR MARKET,', dos: 'WITH THE SOURCE' },
    subtitulo: ['High fidelity', 'Market benchmark'],
    texto:
      "The six agents study your market and write down what they found: what competitors publish, in which colours, at what length, with which hook and at what price. Every finding is kept with its source, and the model's deviation tells you how close it was to what actually happened.",
    enlace: 'See the research',
    alt: 'Sinkroo panel: the “Mercado” screen, with the market findings and their source.',
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
      { texto: 'How it works', href: '#como-funciona' },
      { texto: 'The research', href: '#investigacion' },
      { texto: 'Plans', href: PANEL },
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

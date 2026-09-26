/* =============================================================================================
   EL TEXTO DE LA LANDING — español (trato de usted) e inglés.
   El texto es DEL DUEÑO, LITERAL: aquí no se reescribe ni se agrega una promesa más. Si hay que
   cambiar algo, se cambia aquí y de aquí para el JSX; no se «mejora» por gusto.
   La página arranca en español (`IDIOMA_INICIAL`).

   LOS ONCE BLOQUES (el armazón de siempre, con la información de hoy):
     1. Cabecera · 2. Portada (con el título que se cambia solo) · 3. Franja que se mueve ·
     4. Qué hacemos · 5. Cómo lo hacemos (el flujo animado y las siete etapas) ·
     6. Con qué trabaja · 7. Con quién se conecta (las 14) · 8. Planes ·
     9. Palabras de nuestra CEO (la foto de María Paula y su cita) · 10. Contacto · 11. Pie

   NADA DE ESTE TEXTO DICE QUE EL SISTEMA PUBLIQUE SOLO, CIERRE VENTAS NI MANDE ENLACES DE COMPRA:
   eso todavía no existe. (El bloque 7 decía con todas las letras que publicar en las redes todavía no
   estaba conectado; el dueño mandó borrar esa línea el 2026-09-26 y ya no está en ningún idioma.)
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
 * dos bloques): el bloque 4 usa investigacion, creacion y jueces; el bloque 8 usa primeros pasos. El
 * bloque 6 ya no lleva capturas: sus cinco tarjetas llevan los dibujos animados de
 * `IconosHerramientas.tsx`. El bloque 5 ya no lleva fotos: cierra con el dibujo animado de Dubai
 * (`Dubai.tsx`), que es del dueño y no muestra ni al equipo ni al público.
 */
import type { CualHerramienta } from './IconosHerramientas';

export const IMAGENES = {
  buho: '/67.png',
  portada: '/6-web.jpg',
  /* Bloque 4 · QUÉ HACEMOS — una pantalla por paso, y cada una con lo que dice su tarjeta: el paso 1
     son los seis agentes investigando, el paso 2 las piezas ya creadas y el paso 3 los cinco jueces
     ordenándolas. Son las capturas ANCHAS de escritorio que mandó el dueño (1200 px de ancho, con la
     barra del navegador recortada): la tarjeta las muestra enteras, sin recortar. */
  investigacion: '/capturas/investigacion.jpg',
  creacion: '/capturas/creacion.jpg',
  jueces: '/capturas/jueces.jpg',
  /* Estas tres las dejó de usar el bloque 4 (el panel las sigue mostrando en su carpeta): no las usa
     ningún bloque y quedan aquí por si otro frente vuelve a mostrarlas. */
  mercado: '/capturas/mercado.jpg',
  campanas: '/capturas/campanas.jpg',
  hoy: '/capturas/hoy.jpg',
  /* Bloque 8 · PLANES */
  primerosPasos: '/capturas/primeros-pasos.jpg',
  /* Bloque 9 · PALABRAS DE NUESTRA CEO */
  ceo: '/ceo/maria-paula-castanos.webp',
} as const;

type Cifra = { etiqueta: string; valor: string };
type Enlace = { texto: string; href: string };
type TarjetaExplica = { numero: string; titulo: string; texto: string; imagen: string; alt: string };
type Etapa = { numero: string; titulo: string; texto: string };
type Herramienta = {
  numero: string;
  nombre: string;
  texto: string;
  /** Cuál de los cinco dibujos animados de `IconosHerramientas.tsx` (5 s cada uno). */
  dibujo: CualHerramienta;
};
type Conexion = { nombre: string; texto: string; /** Los `id` de `redes.ts` que van como icono delante del nombre. */ redes: string[] };
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
    altPortada: string;
  };
  /** Los dos párrafos de la columna derecha de la portada. */
  introduccion: { uno: string; dos: string };
  /* 3 · LA FRANJA QUE SE MUEVE */
  franja: { palabras: string[] };
  /* 4 · QUÉ HACEMOS */
  queHacemos: { titulo: string; parrafo: string; tarjetas: TarjetaExplica[] };
  /* 5 · CÓMO LO HACEMOS */
  comoLoHacemos: {
    titulo: { uno: string; dos: string };
    etapas: Etapa[];
  };
  /* 6 · CON QUÉ TRABAJA */
  conQueTrabaja: { titulo: { uno: string; dos: string }; herramientas: Herramienta[] };
  /* 7 · CON QUIÉN SE CONECTA */
  conexiones: { titulo: string; bajada: string; lista: Conexion[] };
  /* 8 · PLANES */
  planes: {
    titulo: string;
    lista: Plan[];
    incluye: string;
    nota: string;
    boton: string;
    alt: string;
  };
  /* 9 · PALABRAS DE NUESTRA CEO */
  ceo: {
    etiqueta: string;
    /** Las palabras de ella, un párrafo por línea. Se citan tal cual. */
    cita: string[];
    firma: string;
    cargo: string;
    alt: string;
    /** El perfil de LinkedIn de la CEO, para el botón que va debajo del retrato. */
    linkedin: string;
    /** El texto del botón. */
    linkedinTexto: string;
    /** Lo que dice el `title` del botón: qué hace y que no cambia nada. */
    linkedinTitulo: string;
  };
  /* 10 · CONTACTO */
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
    /* Las cuatro frases del título. REGLA (la pidió el dueño): cada una se lee SOLA, porque se ven de a
       una. Antes eran pedazos de una misma oración encadenada —«INVESTIGA SU MERCADO Y ESCRIBE LAS
       PIEZAS», «LAS PRUEBA CON 500 PERSONAS…», «Y MIDE CADA PESO QUE ENTRÓ»—: el «LAS» y el «Y»
       colgaban de la frase anterior, y al aparecer sola cada una quedaba a medias. Ahora cada frase
       trae su sujeto y dice una cosa distinta: qué es · lo que investiga · lo que prueba antes de
       gastar · lo que mide después. */
    titulos: [
      'SINKROO ES SU EQUIPO DE MARKETING COMPLETO',
      'SEIS AGENTES LEEN SU MERCADO CADA MAÑANA',
      'CADA PIEZA SE PRUEBA ANTES DE GASTAR UN PESO',
      'MIDE LO QUE PASÓ EN SUS REDES, PESO POR PESO',
    ],
    /* Y la bajada ya no repite la lista de arriba: dice otra cosa — cómo se trabaja y quién manda. */
    bajada:
      'Sin agencia y sin contratar a nadie: el trabajo queda hecho y usted decide qué sale. Nada llega a sus cuentas sin su aprobación.',
    accesos: {
      panel: 'ENTRAR A MI PANEL',
      comoFunciona: 'CÓMO FUNCIONA',
      conexiones: 'CON QUÉ SE CONECTA',
    },
    cifras: [
      { etiqueta: 'JUECES POR PIEZA', valor: '5' },
      { etiqueta: 'PERSONAS SIMULADAS', valor: '500' },
      { etiqueta: 'PESOS ANTES DEL VEREDICTO', valor: '$0' },
    ],
    altPortada: 'Sinkroo: la tarjeta de marca',
  },
  /* Los DOS párrafos de la columna derecha de la portada. Estuvieron fuera un tiempo (en su lugar
     iba el índice «EN ESTA PÁGINA») y el dueño pidió que volvieran: se restauran LITERALES, tal
     como estaban antes. */
  introduccion: {
    uno: 'Sinkroo lee su negocio, su material y sus cuentas. De ahí en adelante trabaja solo: investiga el mercado donde compite, escribe las piezas de cada red y las prueba antes de que usted gaste un peso.',
    dos: 'No adivina. Cada pieza se somete a su público simulado y a cinco jueces: la que no convence vuelve a corregirse y queda guardada con el voto de cada juez. Lo que sale, sale con veredicto.',
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
        imagen: IMAGENES.investigacion,
        alt: 'Panel de Sinkroo: lo que investigaron los 6 agentes (colores, duración, gancho y cuándo publican) y lo que crearon, en la pantalla «Campañas».',
      },
      {
        numero: '02',
        titulo: 'LA CREACIÓN',
        texto:
          'Con esos hallazgos, el motor escribe las piezas de cada red en su formato y con su texto. Cada pieza nace de un hallazgo, no de una corazonada.',
        imagen: IMAGENES.creacion,
        alt: 'Panel de Sinkroo: las piezas ya escritas, cada una con su puntaje y su veredicto, en la pantalla «Campañas».',
      },
      {
        numero: '03',
        titulo: 'EL FILTRO',
        texto:
          'Antes de gastar, cada pieza se prueba: cinco jueces la puntúan y quinientas personas simuladas reaccionan. La que no convence vuelve a corregirse y no gasta un peso.',
        imagen: IMAGENES.jueces,
        alt: 'Panel de Sinkroo: el mercado simulado probando una pieza, con el puntaje de los cinco jueces y la reacción del público.',
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
    /* El bloque cierra con el dibujo de Dubai (el Burj Khalifa y su juego de luces, en `Dubai.tsx`).
       Sin textos: el dueño los mandó sacar. El domicilio sigue en el pie de la página. */
  },
  conQueTrabaja: {
    titulo: { uno: 'CON QUÉ', dos: 'TRABAJA' },
    herramientas: [
      {
        numero: '01',
        nombre: 'EL EQUIPO DE INVESTIGACIÓN',
        texto:
          'Seis agentes que leen el mercado y dejan todo por escrito con su fuente. Cada hallazgo que usan después las piezas viene de ahí.',
        dibujo: 'investigacion',
      },
      {
        numero: '02',
        nombre: 'MIROFISH',
        texto:
          'El mercado simulado. Cinco jueces (Claridad, Gancho, Deseo, Prueba y Llamada) y quinientas personas con el comportamiento de su público. Es lo que se interpone entre su dinero y la publicación.',
        dibujo: 'mirofish',
      },
      {
        numero: '03',
        nombre: 'EL PANEL',
        texto:
          'Su día, campañas, mercado, conversaciones, créditos y autonomía. Todo lo que el motor hace queda ahí, con su fecha y su motivo.',
        dibujo: 'panel',
      },
      {
        numero: '04',
        nombre: 'LAS MEDICIONES',
        texto:
          'Lo que las plataformas reportan de verdad (alcance, clics, gasto, ventas) y la comparación con lo que el modelo había predicho: el desvío.',
        dibujo: 'mediciones',
      },
      {
        numero: '05',
        nombre: 'LOS CRÉDITOS',
        texto:
          'Un crédito es una unidad de trabajo del motor. Cada análisis, cada pieza y cada prueba consumen, y usted ve en qué se va.',
        dibujo: 'creditos',
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
        redes: ['instagram'],
        texto:
          'Quiénes son sus seguidores de verdad —edad, género y las ciudades donde están— y cómo rinde cada publicación.',
      },
      {
        nombre: 'Facebook',
        redes: ['facebook'],
        texto: 'La Página del negocio y cuánta gente la sigue.',
      },
      {
        nombre: 'WhatsApp',
        redes: ['whatsapp'],
        texto:
          'El número por el que entran los clientes y el estado del canal que atiende esas conversaciones.',
      },
      {
        nombre: 'TikTok',
        redes: ['tiktok'],
        texto:
          'Cuánta gente ve sus videos y cómo rinde cada uno: vistas, me gusta, comentarios y veces compartido.',
      },
      {
        nombre: 'YouTube',
        redes: ['youtube'],
        texto: 'El público que de verdad ve sus videos y cómo rinde cada video.',
      },
      {
        nombre: 'Google',
        redes: ['google'],
        texto:
          'Lo que entra al sitio desde Google y cómo rinden las campañas: sesiones, usuarios y conversiones.',
      },
      {
        nombre: 'Correo',
        redes: ['correo'],
        texto: 'El correo desde el que salen los informes del negocio: el resumen semanal y los avisos.',
      },
      {
        nombre: 'Meta Ads',
        redes: ['meta-ads'],
        texto: 'Lo que de verdad costó y rindió la pauta: gasto, resultados, CTR y CPM por campaña.',
      },
      {
        nombre: 'Tienda',
        redes: ['tienda'],
        texto:
          'El catálogo con sus precios y las ventas reales por producto: la métrica más honesta, porque es plata que entró.',
      },
      {
        nombre: 'Píxel del sitio',
        redes: ['pixel'],
        texto: 'Los eventos que de verdad ocurrieron en la página: visitas, carritos y compras.',
      },
      {
        nombre: 'bundle.social',
        redes: ['bundle-social'],
        texto:
          'Publica en las cuentas que usted conecte —Instagram, Facebook, TikTok, YouTube, LinkedIn, Threads y Pinterest— sin crear una app ni pedir permisos de desarrollador en cada plataforma.',
      },
      {
        nombre: 'LinkedIn · Threads · Pinterest',
        redes: ['linkedin', 'threads', 'pinterest'],
        texto: 'Se conectan por la vía de bundle.social.',
      },
    ],
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
  /* Las palabras son de ella: las escribe el dueño de producto y aquí quedaron reescritas (él dejó las
     suyas como ejemplo). Debajo, el bloque `ceo` explica qué se conservó y qué no. */
  ceo: {
    etiqueta: 'PALABRAS DE NUESTRA CEO',
    /* Las tres ideas que pidió el dueño (el mercado cambió y lo de antes ya no puede seguir · la IA es un
       cambio de paradigma · una sola plataforma frente a la mejor agencia), escritas por nosotros: la
       versión que él dejó era un ejemplo. «Mil veces más» no se afirma: es lo único de ese texto que la
       página no podría sostener con un dato. */
    cita: [
      'Vengo del marketing de antes: el de la intuición, el del presupuesto que se quema primero y explica después. Ese marketing ya no aguanta. El mercado cambió, y seguir haciendo lo de ayer es la forma más cara de quedarse quieto.',
      'La inteligencia artificial no es una herramienta nueva: es un cambio de paradigma. Lo que antes exigía un equipo entero, hoy una sola plataforma lo investiga, lo escribe, lo prueba y lo mide por una fracción de lo que cuesta la mejor agencia, y con resultados que se pueden ver.',
      'Lo que hace dos años era imposible, hoy es una decisión. De eso se trata Sinkroo.',
    ],
    firma: 'María Paula Castaños',
    cargo: 'CEO de Sinkroo · Experta en marketing',
    alt: 'María Paula Castaños, CEO de Sinkroo, con el suéter de punto.',
    /* El enlace va sin los parámetros de rastreo que traía el link compartido desde el teléfono
       (`utm_source=share_via&utm_content=profile&utm_medium=member_ios`): llevan al perfil igual. */
    linkedin: 'https://www.linkedin.com/in/maria-paula-c-30288820a',
    linkedinTexto: 'Ver su perfil en LinkedIn',
    linkedinTitulo:
      'Abre el perfil de LinkedIn de María Paula en una pestaña nueva. Se puede cerrar y no cambia nada.',
  },
  /* 10 · CONTACTO */
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
      'SINKROO IS YOUR COMPLETE MARKETING TEAM',
      'SIX AGENTS READ YOUR MARKET EVERY MORNING',
      'EVERY PIECE IS TESTED BEFORE YOU SPEND A PESO',
      'IT MEASURES WHAT HAPPENED, PESO BY PESO',
    ],
    bajada:
      'No agency and no one to hire: the work gets done and you decide what goes out. Nothing reaches your accounts without your approval.',
    accesos: {
      panel: 'ENTER MY PANEL',
      comoFunciona: 'HOW IT WORKS',
      conexiones: 'WHAT IT CONNECTS TO',
    },
    cifras: [
      { etiqueta: 'JUDGES PER PIECE', valor: '5' },
      { etiqueta: 'SIMULATED PEOPLE', valor: '500' },
      { etiqueta: 'PESOS BEFORE THE VERDICT', valor: '$0' },
    ],
    altPortada: 'Sinkroo: the brand card',
  },
  /* The TWO paragraphs of the right-hand column of the hero. They were out for a while (the
     «ON THIS PAGE» index went in their place) and the owner asked for them back: restored
     VERBATIM, exactly as they were before. */
  introduccion: {
    uno: 'Sinkroo reads your business, your material and your accounts. From there it works on its own: it researches the market you compete in, writes the pieces for each network and tests them before you spend a single peso.',
    dos: "It does not guess. Every piece faces your simulated audience and five judges: the one that does not convince goes back to be fixed and stays on file with each judge's vote. What goes out, goes out with a verdict.",
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
        imagen: IMAGENES.investigacion,
        alt: 'Sinkroo panel: what the 6 agents researched (colours, length, hook, when they publish) and what they created, on the “Campañas” screen.',
      },
      {
        numero: '02',
        titulo: 'THE CREATION',
        texto:
          'With those findings, the engine writes the pieces for each network in its format and with its text. Every piece is born from a finding, not from a hunch.',
        imagen: IMAGENES.creacion,
        alt: 'Sinkroo panel: the pieces already written, each with its score and its verdict, on the “Campañas” screen.',
      },
      {
        numero: '03',
        titulo: 'THE FILTER',
        texto:
          'Before spending, every piece is tested: five judges score it and five hundred simulated people react. The one that does not convince goes back to be fixed and does not spend a peso.',
        imagen: IMAGENES.jueces,
        alt: 'Sinkroo panel: the simulated market testing a piece, with the score of the five judges and the reaction of the public.',
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
    /* El bloque cierra con el dibujo de Dubai (el Burj Khalifa y su juego de luces, en `Dubai.tsx`).
       Sin textos: el dueño los mandó sacar. El domicilio sigue en el pie de la página. */
  },
  conQueTrabaja: {
    titulo: { uno: 'WHAT IT', dos: 'WORKS WITH' },
    herramientas: [
      {
        numero: '01',
        nombre: 'THE RESEARCH TEAM',
        texto:
          'Six agents that read the market and leave everything in writing with its source. Every finding the pieces use afterwards comes from there.',
        dibujo: 'investigacion',
      },
      {
        numero: '02',
        nombre: 'MIROFISH',
        texto:
          'The simulated market. Five judges (Clarity, Hook, Desire, Proof and Call) and five hundred people with your audience’s behaviour. It is what stands between your money and publishing.',
        dibujo: 'mirofish',
      },
      {
        numero: '03',
        nombre: 'THE PANEL',
        texto:
          'Your day, campaigns, market, conversations, credits and autonomy. Everything the engine does is there, with its date and its reason.',
        dibujo: 'panel',
      },
      {
        numero: '04',
        nombre: 'THE MEASUREMENTS',
        texto:
          'What the platforms report for real (reach, clicks, spend, sales) and the comparison with what the model had predicted: the deviation.',
        dibujo: 'mediciones',
      },
      {
        numero: '05',
        nombre: 'THE CREDITS',
        texto:
          'A credit is a unit of work of the engine. Every analysis, every piece and every test consume, and you see where it goes.',
        dibujo: 'creditos',
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
        redes: ['instagram'],
        texto:
          'Who your followers really are —age, gender and the cities they are in— and how each post performs.',
      },
      {
        nombre: 'Facebook',
        redes: ['facebook'],
        texto: 'The business Page and how many people follow it.',
      },
      {
        nombre: 'WhatsApp',
        redes: ['whatsapp'],
        texto:
          'The number clients come in through and the state of the channel that answers those conversations.',
      },
      {
        nombre: 'TikTok',
        redes: ['tiktok'],
        texto:
          'How many people see your videos and how each one performs: views, likes, comments and times shared.',
      },
      {
        nombre: 'YouTube',
        redes: ['youtube'],
        texto: 'The audience that really watches your videos and how each video performs.',
      },
      {
        nombre: 'Google',
        redes: ['google'],
        texto:
          'What comes into the site from Google and how the campaigns perform: sessions, users and conversions.',
      },
      {
        nombre: 'Email',
        redes: ['correo'],
        texto:
          'The email the business reports go out from: the weekly summary and the notices.',
      },
      {
        nombre: 'Meta Ads',
        redes: ['meta-ads'],
        texto: 'What the ads really cost and delivered: spend, results, CTR and CPM per campaign.',
      },
      {
        nombre: 'Store',
        redes: ['tienda'],
        texto:
          'The catalogue with its prices and the real sales per product: the most honest metric, because it is money that came in.',
      },
      {
        nombre: 'Site pixel',
        redes: ['pixel'],
        texto: 'The events that really happened on the page: visits, carts and purchases.',
      },
      {
        nombre: 'bundle.social',
        redes: ['bundle-social'],
        texto:
          'Publishes in the accounts you connect —Instagram, Facebook, TikTok, YouTube, LinkedIn, Threads and Pinterest— without creating an app or asking for developer permissions on each platform.',
      },
      {
        nombre: 'LinkedIn · Threads · Pinterest',
        redes: ['linkedin', 'threads', 'pinterest'],
        texto: 'They connect through bundle.social.',
      },
    ],
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
  /* These are her words: the idea is the one the owner dictated (the market changed, it cannot keep
     going the same way, and AI brings another paradigm: one platform does a thousand times more than
     the best agency at a tiny cost and with real results). Ordered to be read in one breath. */
  ceo: {
    etiqueta: 'WORDS FROM OUR CEO',
    cita: [
      'I come from the marketing of before: the one of intuition, of the budget you burn first and explain later. That marketing no longer holds. The market changed, and repeating yesterday is the most expensive way to stand still.',
      'Artificial intelligence is not a new tool: it is a paradigm shift. What used to take a whole team, today a single platform researches, writes, tests and measures for a fraction of what the best agency costs, and with results you can see.',
      'What two years ago was impossible is now a decision. That is what Sinkroo is about.',
    ],
    firma: 'María Paula Castaños',
    cargo: 'CEO of Sinkroo · Marketing expert',
    alt: 'María Paula Castaños, CEO of Sinkroo, in a knit sweater.',
    linkedin: 'https://www.linkedin.com/in/maria-paula-c-30288820a',
    linkedinTexto: 'See her profile on LinkedIn',
    linkedinTitulo:
      "Opens María Paula's LinkedIn profile in a new tab. You can close it and nothing changes.",

  },
  /* 10 · CONTACT */
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

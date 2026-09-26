/* =============================================================================================
   DUBAI — EL BURJ KHALIFA Y SU JUEGO DE LUCES, DIBUJADO Y ANIMADO EN SVG.

   El cierre del bloque 5 (`COMO LO HACEMOS`), donde antes estaban las dos fotos de gente.

   POR QUÉ EL LIENZO ES TAN ANCHO (2400 x 400):
     El dibujo tiene que entrar en una franja baja y, al mismo tiempo, cruzar la pantalla de lado a
     lado. Si el lienzo fuera cuadrado, al bajarlo de alto el dibujo se agrandaría y se recortaría
     por arriba (o dejaría de llegar a los costados). Con un lienzo de 6 a 1 las dos cosas pasan
     juntas: en un monitor de 1280 px la franja mide 1280x211 (6,06 de proporción) y entra casi
     exacta; en un celular de 390 px se ve la parte del medio, con la torre y los vecinos vecinos.

   CÓMO ESTÁ HECHO (y por qué así):
     · ES UN DIBUJO, NO UNA FOTO: todo son formas de SVG. No hay imágenes remotas.
     · NADA DE JAVASCRIPT: son relojes de CSS. Sin JS se ve el dibujo quieto y encendido.
     · LAS POSICIONES SON FIJAS, sacadas de listas escritas a mano: nunca al azar. Así el dibujo se
       ve igual en todas las visitas — la misma regla de las 31 líneas de la portada.
     · LA LÓGICA DEL JUEGO DE LUCES ES LA DEL BURJ KHALIFA DE VERDAD:
         1. La fachada es una pantalla: la luz SUBE. Una ola recorre la torre de abajo hacia arriba
            y las franjas prenden en orden, de la primera a la última.
         2. La ciudad se ve por las ventanas encendidas: prenden y apagan de a una, en olas que
            cruzan de un costado al otro (el retardo sale de la posición). Una de cada dos queda
            fija toda la noche, como en Dubai.
         3. El juego termina en los HACES: salen de la torre, barren la ciudad y dejan su mancha de
            luz contra los vecinos, que es lo que los alumbra.
     · `prefers-reduced-motion`: el dibujo queda quieto y con la ciudad ENCENDIDA.
   ============================================================================================= */

/* ---------------------------------------------------------------------------------------------
   LOS EDIFICIOS VECINOS: 26, trece de cada lado de la torre (antes eran doce en total). Los anchos,
   los altos y los remates salen de tres listas fijas, así que la ciudad es siempre la misma.
   Ninguno le tapa la punta al Burj: el más alto llega a 228 y la torre pasa los 340.
   --------------------------------------------------------------------------------------------- */
type Remate = 'plano' | 'escalonado' | 'aguja' | 'piramide' | 'redondo';
type Edificio = { x: number; w: number; h: number; remate: Remate };

const ANCHOS = [72, 54, 90, 62, 84, 48, 78, 66, 96, 58, 70, 52, 88];
const ALTOS = [120, 186, 96, 228, 140, 86, 168, 110, 200, 92, 154, 128, 210];
const REMATES: Remate[] = [
  'escalonado', 'plano', 'redondo', 'aguja', 'plano', 'piramide', 'aguja',
  'plano', 'escalonado', 'redondo', 'piramide', 'plano', 'redondo',
];
const HUECO = 14;
const LIENZO = 2400;

/** La fila de un costado: se arma de la punta hacia la torre, con las tres listas y un hueco fijo. */
function fila(lado: 'izq' | 'der'): Edificio[] {
  const out: Edificio[] = [];
  if (lado === 'izq') {
    let x = 16;
    for (let i = 0; i < ANCHOS.length; i++) {
      const w = ANCHOS[i];
      out.push({ x, w, h: ALTOS[(i + 3) % ALTOS.length], remate: REMATES[i] });
      x += w + HUECO;
    }
  } else {
    let x = LIENZO - 16;
    for (let i = 0; i < ANCHOS.length; i++) {
      const w = ANCHOS[(i + 7) % ANCHOS.length];
      x -= w;
      out.push({ x, w, h: ALTOS[(i + 5) % ALTOS.length], remate: REMATES[(i + 2) % REMATES.length] });
      x -= HUECO;
    }
  }
  return out;
}

const VECINOS: Edificio[] = [...fila('izq'), ...fila('der')];

/** El piso donde se apoyan todos (y donde llegan los haces). Va al borde de abajo del lienzo: la
 *  ciudad queda pegada al piso del bloque, sin aire debajo. */
const PISO = 396;

/** El remate de un vecino: lo que le da carácter. Va encima del cuerpo. */
function Remate({ edificio }: { edificio: Edificio }) {
  const { x, w, h, remate } = edificio;
  const y = PISO - h;
  const medio = x + w / 2;

  if (remate === 'escalonado') {
    return (
      <g className="dubai-remate">
        <rect x={x + w * 0.2} y={y - 6} width={w * 0.6} height={6} rx={1.2} />
        <rect x={x + w * 0.36} y={y - 11} width={w * 0.28} height={5} rx={1.2} />
      </g>
    );
  }
  if (remate === 'aguja') {
    return (
      <g className="dubai-remate">
        <rect x={medio - 1} y={y - 20} width={2} height={20} rx={1} />
        <circle className="dubai-luz-remate" cx={medio} cy={y - 21} r={1.8} />
      </g>
    );
  }
  if (remate === 'piramide') {
    return <polygon className="dubai-remate" points={`${x + 2},${y} ${medio},${y - 15} ${x + w - 2},${y}`} />;
  }
  if (remate === 'redondo') {
    return <path className="dubai-remate" d={`M ${x},${y + 10} Q ${medio},${y - 16} ${x + w},${y + 10} Z`} />;
  }
  return null;
}

/* ---------------------------------------------------------------------------------------------
   LAS VENTANAS DE UN VECINO. Una columna cada 18 y un piso cada 16, siempre con su borde. El
   retardo sale de la posición (nunca al azar): cuanto más a la derecha está el edificio, más tarde
   prende, y así la ola cruza la ciudad de un costado al otro, como el haz que la enciende.
   --------------------------------------------------------------------------------------------- */
function Ventanas({ edificio, indice }: { edificio: Edificio; indice: number }) {
  const { x, w, h } = edificio;
  const columnas = Math.max(1, Math.floor((w - 14) / 18));
  const filas = Math.max(1, Math.floor((h - 22) / 16));
  const ancho = 7;
  const alto = 8;
  const separacion = 18;
  const sobra = w - columnas * separacion;
  const ventanas: { x: number; y: number; retardo: string; fija: boolean }[] = [];

  for (let fila = 0; fila < filas; fila++) {
    for (let col = 0; col < columnas; col++) {
      const i = fila * columnas + col;
      const t = (indice * 0.42 + fila * 0.17 + col * 0.11) % 9;
      ventanas.push({
        x: x + sobra / 2 + col * separacion + 3,
        y: PISO - 10 - fila * 16,
        retardo: `${t.toFixed(2)}s`,
        // Dos de cada tres ventanas quedan FIJAS en su luz de noche: con 26 edificios y casi 500
        // ventanas, si titilaran todas la ciudad se vería como una feria y el navegador tendría tres
        // veces más trabajo. Las que titilan alcanzan de sobra para que la ciudad se vea viva.
        fija: i % 3 !== 0,
      });
    }
  }

  return (
    <g className="dubai-edificio">
      <rect
        className="dubai-cuerpo"
        x={x}
        y={PISO - h}
        width={w}
        height={h}
        rx={edificio.remate === 'redondo' ? 7 : 2}
      />
      <Remate edificio={edificio} />
      {ventanas.map((v, i) => (
        <rect
          key={`v-${indice}-${i}`}
          className={v.fija ? 'dubai-ventana dubai-ventana-fija' : 'dubai-ventana'}
          x={v.x}
          y={v.y}
          width={ancho}
          height={alto}
          rx={1}
          style={v.fija ? undefined : { animationDelay: v.retardo }}
        />
      ))}
    </g>
  );
}

/* ---------------------------------------------------------------------------------------------
   LA TORRE. El perfil del Burj Khalifa: sus seis cuerpos y la aguja, cada cuerpo más angosto que el
   de abajo, que es lo que hace que se reconozca de una. Va en el medio del lienzo (x 1200).
   Encima del perfil van las dos cosas que se mueven: las FRANJAS de la fachada (prenden de abajo
   hacia arriba) y las BURBUJAS (la luz que sube por el edificio).
   --------------------------------------------------------------------------------------------- */
const PERFIL =
  'M 1160,396 L 1160,324 L 1170,324 L 1170,260 L 1179,260 L 1179,192 L 1187,192 L 1187,132 ' +
  'L 1194,132 L 1197,96 L 1200,50 L 1203,96 L 1206,132 L 1213,132 L 1213,192 L 1221,192 ' +
  'L 1221,260 L 1230,260 L 1230,324 L 1240,324 L 1240,396 Z';

/** Las franjas de la fachada: su ancho acompaña el del cuerpo de la torre a esa altura. */
const FRANJAS: { y: number; w: number }[] = [
  { y: 374, w: 68 },
  { y: 342, w: 64 },
  { y: 310, w: 60 },
  { y: 278, w: 54 },
  { y: 246, w: 50 },
  { y: 214, w: 44 },
  { y: 182, w: 38 },
  { y: 150, w: 32 },
  { y: 118, w: 24 },
  { y: 88, w: 16 },
];

/** Las burbujas que suben por la fachada: su x y su hora de salida, fijas. */
const BURBUJAS: { x: number; retardo: number; r: number }[] = [
  { x: 1200, retardo: 0.0, r: 5.6 },
  { x: 1191, retardo: 0.6, r: 4.2 },
  { x: 1209, retardo: 1.2, r: 4.8 },
  { x: 1196, retardo: 1.8, r: 3.6 },
  { x: 1204, retardo: 2.4, r: 5.2 },
  { x: 1189, retardo: 3.0, r: 3.8 },
  { x: 1211, retardo: 3.6, r: 4.4 },
  { x: 1200, retardo: 4.2, r: 5.0 },
];

/* ---------------------------------------------------------------------------------------------
   LOS HACES. Ocho, salen de la torre a dos alturas y bajan hasta el piso del otro lado de los
   vecinos: con la ciudad el doble de ancha hacían falta más para que la barran entera. Cada uno
   deja su mancha de luz contra los vecinos, que es lo que los alumbra.
   --------------------------------------------------------------------------------------------- */
const HACES: { x: number; desde: number; retardo: number }[] = [
  { x: 120, desde: 80, retardo: 0.0 },
  { x: 420, desde: 190, retardo: 0.7 },
  { x: 700, desde: 80, retardo: 1.4 },
  { x: 980, desde: 190, retardo: 2.1 },
  { x: 1420, desde: 190, retardo: 2.8 },
  { x: 1700, desde: 80, retardo: 3.5 },
  { x: 1980, desde: 190, retardo: 4.2 },
  { x: 2280, desde: 80, retardo: 4.9 },
];

export function SkylineDubai() {
  return (
    <svg
      className="dubai"
      viewBox="0 0 2400 400"
      role="img"
      aria-label="Dubai de noche: el Burj Khalifa en el centro con su juego de luces, los haces barriendo la ciudad y los edificios de los costados con las ventanas encendidas."
      preserveAspectRatio="xMidYMax slice"
    >
      <defs>
        {/* El resplandor bajo la torre: la luz del juego se apoya en el piso. */}
        <radialGradient id="dubai-base" cx="50%" cy="100%" r="70%">
          <stop offset="0%" stopColor="#c084fc" stopOpacity="0.30" />
          <stop offset="45%" stopColor="#a855f7" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
        </radialGradient>
        {/* El haz: fuerte donde nace y desvanecido donde llega. */}
        <linearGradient id="dubai-haz" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f3e8ff" stopOpacity="0.72" />
          <stop offset="45%" stopColor="#c084fc" stopOpacity="0.30" />
          <stop offset="100%" stopColor="#c084fc" stopOpacity="0.03" />
        </linearGradient>
        {/* La mancha que deja el haz en el piso, contra los vecinos: eso es lo que los alumbra. */}
        <radialGradient id="dubai-mancha" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e9d5ff" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
        </radialGradient>
        {/* El cuerpo de la torre: un pelo de luz violeta, más claro arriba. */}
        <linearGradient id="dubai-torre" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#2a1b3d" />
          <stop offset="70%" stopColor="#3b2560" />
          <stop offset="100%" stopColor="#5b3a8f" />
        </linearGradient>
        {/* El brillo de las luces: lo que hace que se lean como luz y no como cuadros de color. */}
        <filter id="dubai-brillo" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* El resplandor del piso, detrás de todo. */}
      <rect x="0" y="160" width="2400" height="240" fill="url(#dubai-base)" />

      {/* LOS VECINOS: primero la fila de la izquierda, después la de la derecha, para que el retardo
          de las ventanas corra de un costado al otro. */}
      {VECINOS.map((e, i) => (
        <Ventanas key={`vecino-${i}`} edificio={e} indice={i} />
      ))}

      {/* LA TORRE, con sus franjas y sus burbujas. Va después de las siluetas: queda por delante. */}
      <g className="dubai-torre-g">
        <path className="dubai-perfil" d={PERFIL} fill="url(#dubai-torre)" />
        {/* LA OLA: la luz que sube por la fachada de un tirón, del pie a la punta. */}
        <rect className="dubai-ola" x={1166} y={PISO - 2} width={68} height={14} rx={7} />
        {FRANJAS.map((f, i) => (
          <rect
            key={`franja-${i}`}
            className="dubai-franja"
            x={1200 - f.w / 2}
            y={f.y}
            width={f.w}
            height={4.4}
            rx={2.2}
            style={{ animationDelay: `${(i * 0.28).toFixed(2)}s` }}
          />
        ))}
        {/* La aguja: la punta que titila. */}
        <circle className="dubai-aguja" cx={1200} cy={46} r={3.2} />
        {BURBUJAS.map((b, i) => (
          <circle
            key={`burbuja-${i}`}
            className="dubai-burbuja"
            cx={b.x}
            cy={PISO - 14}
            r={b.r}
            style={{ animationDelay: `${b.retardo}s` }}
          />
        ))}
      </g>

      {/* LOS HACES. El grupo entero barre de un costado al otro (con la torre como eje) y adentro
          cada haz tiene su hora, con su mancha de luz en el piso. */}
      <g className="dubai-haces" filter="url(#dubai-brillo)">
        {HACES.map((h, i) => (
          <g key={`haz-${i}`} className="dubai-haz" style={{ animationDelay: `${h.retardo}s` }}>
            <polygon
              points={`1200,${h.desde} ${h.x - 26},${PISO + 4} ${h.x + 26},${PISO + 4}`}
              fill="url(#dubai-haz)"
            />
            <ellipse cx={h.x} cy={PISO + 1} rx={56} ry={13} fill="url(#dubai-mancha)" />
          </g>
        ))}
      </g>

      {/* El piso: una línea de un pelo, al borde de abajo del lienzo. */}
      <rect className="dubai-piso" x="0" y={PISO} width="2400" height="1.4" />
    </svg>
  );
}

export default SkylineDubai;

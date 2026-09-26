/* =============================================================================================
   DUBAI — EL BURJ KHALIFA Y SU JUEGO DE LUCES, DIBUJADO Y ANIMADO EN SVG.

   Reemplaza a las dos fotos de gente que estaban al final del bloque 5 (`IMÁGENES DEL TRABAJO`)
   y cuenta de dónde es la casa desde la que trabaja Sinkroo.

   CÓMO ESTÁ HECHO (y por qué así):
     · ES UN DIBUJO, NO UNA FOTO: todo son formas de SVG. No hay ni una imagen remota y nada se
       carga desde afuera.
     · NADA DE JAVASCRIPT: son relojes de CSS. El aparato no tiene un `useEffect` que mueva nada
       (la página se pinta igual siempre, y sin JS se ve el dibujo quieto y encendido).
     · LAS POSICIONES SON FIJAS, escritas a mano o sacadas de una cuenta: nunca al azar. Así el
       dibujo se ve igual en todas las visitas — es la misma regla que usan las 31 líneas del
       fondo de la portada.
     · LA LÓGICA DEL JUEGO DE LUCES ES LA DEL BURJ KHALIFA DE VERDAD:
         1. La fachada completa es una pantalla de luces: la luz SUBE por el edificio. Por eso las
            franjas de la torre y las burbujas van de abajo hacia arriba, en orden.
         2. El edificio se ve de noche por las ventanas encendidas: los vecinos prenden y apagan
            ventanas de a una, nunca de golpe. En Dubai hay ventanas que se quedan fijas toda la
            noche, y acá también: una de cada tres.
         3. El juego termina en los HACES: salen de la torre, barren la ciudad de un costado al otro
            y se apagan. Cada haz deja su mancha de luz en el piso contra los vecinos, y las ventanas
            prenden cuando la ola del haz les pasa por encima (por eso el retardo de cada ventana
            sale de su posición: la ola no es un adorno, es el haz).
     · `prefers-reduced-motion` (o quien tenga el movimiento apagado en su sistema): el dibujo queda
       quieto y con la ciudad ENCENDIDA — nunca un cuadro vacío ni apagado.

   El tamaño: un `viewBox` de 1000x380. En `dubai.css` el dibujo se estira en el celular
   (`preserveAspectRatio="xMidYMax slice"` + un alto mínimo), porque a 390 px de ancho la torre
   quedaría del tamaño de un sello.
   ============================================================================================= */

/* ---------------------------------------------------------------------------------------------
   LOS EDIFICIOS VECINOS. Cada uno es un ancho, un alto, su lugar en la fila y su remate: no todos
   terminan igual, porque una ciudad de cajas idénticas no se ve como una ciudad.
   Las alturas están pensadas para que NINGUNO le tape la punta al Burj: el más alto de los vecinos
   llega a 236 y la torre pasa los 330.
   La fila de la izquierda termina antes de la torre (x 462) y la de la derecha arranca después
   (x 538): la torre queda en el hueco, que es como se ve desde el DIFC.
   --------------------------------------------------------------------------------------------- */
type Remate = 'plano' | 'escalonado' | 'aguja' | 'piramide' | 'redondo';
type Edificio = { x: number; w: number; h: number; remate: Remate };

const VECINOS: Edificio[] = [
  // la fila de la izquierda
  { x: 18, w: 70, h: 108, remate: 'escalonado' },
  { x: 96, w: 56, h: 182, remate: 'plano' },
  { x: 160, w: 82, h: 96, remate: 'redondo' },
  { x: 250, w: 64, h: 222, remate: 'aguja' },
  { x: 322, w: 74, h: 144, remate: 'plano' },
  { x: 404, w: 50, h: 88, remate: 'piramide' },
  // la fila de la derecha
  { x: 546, w: 52, h: 92, remate: 'redondo' },
  { x: 606, w: 76, h: 158, remate: 'escalonado' },
  { x: 690, w: 60, h: 236, remate: 'aguja' },
  { x: 758, w: 84, h: 104, remate: 'plano' },
  { x: 850, w: 64, h: 182, remate: 'piramide' },
  { x: 922, w: 68, h: 126, remate: 'escalonado' },
];

/** El piso donde se apoyan todos (y donde llegan los haces). Va casi al borde de abajo del cuadro
 *  (el `viewBox` mide 380 de alto) para que la ciudad quede PEGADA a la línea del texto de abajo:
 *  antes quedaba un hueco de aire entre el pie de los edificios y el rótulo. */
const PISO = 375;

/** El remate de un vecino: lo que le da carácter. Va encima del cuerpo. */
function Remate({ edificio }: { edificio: Edificio }) {
  const { x, w, h, remate } = edificio;
  const y = PISO - h;
  const medio = x + w / 2;

  if (remate === 'escalonado') {
    return (
      <g className="dubai-remate">
        <rect x={x + w * 0.2} y={y - 8} width={w * 0.6} height={8} rx={1.5} />
        <rect x={x + w * 0.36} y={y - 15} width={w * 0.28} height={7} rx={1.5} />
      </g>
    );
  }
  if (remate === 'aguja') {
    return (
      <g className="dubai-remate">
        <rect x={medio - 1.2} y={y - 26} width={2.4} height={26} rx={1.2} />
        <circle className="dubai-luz-remate" cx={medio} cy={y - 27} r={2.2} />
      </g>
    );
  }
  if (remate === 'piramide') {
    return <polygon className="dubai-remate" points={`${x + 2},${y} ${medio},${y - 20} ${x + w - 2},${y}`} />;
  }
  if (remate === 'redondo') {
    return <path className="dubai-remate" d={`M ${x},${y + 14} Q ${medio},${y - 22} ${x + w},${y + 14} Z`} />;
  }
  return null;
}

/* ---------------------------------------------------------------------------------------------
   LAS VENTANAS DE UN VECINO. Se reparten solas: una columna cada 16 y un piso cada 20, dejando un
   borde. Cada ventana lleva su propio retardo, y ese retardo sale de la posición (nunca al azar):
   cuanto más a la derecha está el edificio, más tarde prende — así la ola cruza la ciudad de un
   costado al otro, igual que el haz.
   --------------------------------------------------------------------------------------------- */
function Ventanas({ edificio, indice }: { edificio: Edificio; indice: number }) {
  const { x, w, h } = edificio;
  const columnas = Math.max(1, Math.floor((w - 16) / 16));
  const filas = Math.max(1, Math.floor((h - 24) / 20));
  const ancho = 8;
  const alto = 10;
  const separacion = 16;
  const sobra = w - columnas * separacion;
  const ventanas: { x: number; y: number; retardo: string; fija: boolean }[] = [];

  for (let fila = 0; fila < filas; fila++) {
    for (let col = 0; col < columnas; col++) {
      const i = fila * columnas + col;
      // El retardo: manda la posición horizontal (la ola) y la ayudan el piso y la columna para que
      // no se enciendan todas juntas. Todo con cuentas fijas.
      const t = (indice * 0.85 + fila * 0.22 + col * 0.13) % 9;
      ventanas.push({
        x: x + sobra / 2 + col * separacion + 3,
        y: PISO - 12 - fila * 20,
        retardo: `${t.toFixed(2)}s`,
        // Una de cada tres ventanas queda FIJA, en su luz de noche: una ciudad donde todas titilan es
        // una feria. Además baja el trabajo del navegador sin que se note.
        fija: i % 3 === 2,
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
        rx={edificio.remate === 'redondo' ? 8 : 2}
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
   LA TORRE. El perfil del Burj Khalifa, simplificado a sus seis cuerpos y la aguja: cada cuerpo es
   más angosto que el de abajo, que es lo que hace que se reconozca de una.
   Encima del perfil van las dos cosas que se mueven:
     · LAS FRANJAS: la fachada es una pantalla, así que las franjas prenden de abajo hacia arriba.
     · LAS BURBUJAS: la luz que sube por el edificio, como en el juego de luces de verdad.
   --------------------------------------------------------------------------------------------- */
const PERFIL =
  'M 462,372 L 462,300 L 472,300 L 472,236 L 481,236 L 481,168 L 489,168 L 489,108 L 496,108 ' +
  'L 499,72 L 500,26 L 501,72 L 504,108 L 511,108 L 511,168 L 519,168 L 519,236 L 528,236 ' +
  'L 528,300 L 538,300 L 538,372 Z';

/** Las franjas de la fachada: su ancho acompaña el del cuerpo de la torre a esa altura. */
const FRANJAS: { y: number; w: number }[] = [
  { y: 350, w: 68 },
  { y: 318, w: 64 },
  { y: 286, w: 60 },
  { y: 254, w: 54 },
  { y: 222, w: 50 },
  { y: 190, w: 44 },
  { y: 158, w: 38 },
  { y: 126, w: 32 },
  { y: 96, w: 24 },
  { y: 66, w: 16 },
];

/** Las burbujas que suben por la fachada: su x y su hora de salida, fijas. */
const BURBUJAS: { x: number; retardo: number; r: number }[] = [
  { x: 500, retardo: 0.0, r: 6.2 },
  { x: 489, retardo: 0.6, r: 4.6 },
  { x: 511, retardo: 1.2, r: 5.2 },
  { x: 495, retardo: 1.8, r: 3.8 },
  { x: 506, retardo: 2.4, r: 5.8 },
  { x: 486, retardo: 3.0, r: 4.2 },
  { x: 514, retardo: 3.6, r: 4.8 },
  { x: 500, retardo: 4.2, r: 5.6 },
];

/* ---------------------------------------------------------------------------------------------
   LOS HACES. Salen de la torre (de dos alturas, como en el juego real) y bajan hasta el piso del
   otro lado de los vecinos. Adentro del grupo cada uno tiene su hora y todos juntos barren de un
   costado al otro. Duran lo suficiente para que siempre haya alguno prendido: con destellos de un
   instante el juego de luces no se lee.
   --------------------------------------------------------------------------------------------- */
const HACES: { x: number; desde: number; retardo: number }[] = [
  { x: 60, desde: 58, retardo: 0.0 },
  { x: 190, desde: 150, retardo: 0.9 },
  { x: 330, desde: 58, retardo: 1.8 },
  { x: 670, desde: 58, retardo: 2.7 },
  { x: 810, desde: 150, retardo: 3.6 },
  { x: 950, desde: 58, retardo: 4.5 },
];

export function SkylineDubai() {
  return (
    <svg
      className="dubai"
      viewBox="0 0 1000 380"
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
      <rect x="0" y="150" width="1000" height="230" fill="url(#dubai-base)" />

      {/* LOS VECINOS: primero los de la izquierda, después los de la derecha, para que el retardo de
          las ventanas corra de un costado al otro. */}
      {VECINOS.map((e, i) => (
        <Ventanas key={`vecino-${i}`} edificio={e} indice={i} />
      ))}

      {/* LA TORRE, con sus franjas y sus burbujas. Va última de las siluetas: queda por delante. */}
      <g className="dubai-torre-g">
        <path className="dubai-perfil" d={PERFIL} fill="url(#dubai-torre)" />
        {/* LA OLA: la luz que sube por la fachada de un tirón, del pie a la punta. Es el efecto que
            más se reconoce del juego de luces del Burj Khalifa y el que pidió el dueño («de abajo
            para arriba como burbujas»). Va encima del perfil y debajo de las franjas. */}
        <rect className="dubai-ola" x={466} y={372} width={68} height={14} rx={7} />
        {FRANJAS.map((f, i) => (
          <rect
            key={`franja-${i}`}
            className="dubai-franja"
            x={500 - f.w / 2}
            y={f.y}
            width={f.w}
            height={4.4}
            rx={2.2}
            style={{ animationDelay: `${(i * 0.28).toFixed(2)}s` }}
          />
        ))}
        {/* La aguja: la punta que titila. */}
        <circle className="dubai-aguja" cx={500} cy={22} r={3.4} />
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

      {/* LOS HACES. El grupo entero barre de un costado al otro (esa es la parte que se mueve de
          verdad en el juego de luces) y adentro cada haz tiene su hora, con su mancha en el piso. */}
      <g className="dubai-haces" filter="url(#dubai-brillo)">
        {HACES.map((h, i) => (
          <g key={`haz-${i}`} className="dubai-haz" style={{ animationDelay: `${h.retardo}s` }}>
            <polygon
              points={`500,${h.desde} ${h.x - 22},${PISO + 4} ${h.x + 22},${PISO + 4}`}
              fill="url(#dubai-haz)"
            />
            <ellipse cx={h.x} cy={PISO + 1} rx={46} ry={12} fill="url(#dubai-mancha)" />
          </g>
        ))}
      </g>

      {/* El piso: una línea de un pelo, para que la ciudad no quede flotando. */}
      <rect className="dubai-piso" x="0" y={PISO} width="1000" height="1" />
    </svg>
  );
}

export default SkylineDubai;

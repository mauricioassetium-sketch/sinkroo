import type { ReactNode } from 'react';
import './iconos-herramientas.css';

/* ==================================================================================================
   LOS CINCO ICONOS DE «CON QUÉ TRABAJA» — el componente <IconoHerramienta/>, con su hoja al lado
   (iconos-herramientas.css). Reemplazan a las cinco capturas del panel: uno por tarjeta.

     <IconoHerramienta cual="investigacion" />   01 · EL EQUIPO DE INVESTIGACIÓN
     <IconoHerramienta cual="mirofish" />        02 · MIROFISH
     <IconoHerramienta cual="panel" />           03 · EL PANEL
     <IconoHerramienta cual="mediciones" />      04 · LAS MEDICIONES
     <IconoHerramienta cual="creditos" />        05 · LOS CRÉDITOS

   TRES COSAS QUE CONVIENE SABER ANTES DE TOCAR ESTO:

     1. ES UN DIBUJO, NO UNA IMAGEN. Todo el SVG va en línea, aquí mismo. No hay archivos remotos,
        ni librerías, ni una sola etiqueta `<img>`: el dibujo se pinta con la página.
     2. NO HAY NI UN TEMPORIZADOR. Este componente no tiene estado ni efectos: es una función pura
        que devuelve marcado. Todo el movimiento —los cinco segundos y sus bucles cortos— está en
        el CSS. Si el navegador no anima, el dibujo igual aparece, entero y quieto.
     3. CADA UNO CUENTA SU SECCIÓN. Mirá los comentarios de cada dibujo: dicen qué se mueve y en
        qué orden.
   ================================================================================================== */

/** Los cinco dibujos, uno por tarjeta de la sección «CON QUÉ TRABAJA». */
export type CualHerramienta = 'investigacion' | 'mirofish' | 'panel' | 'mediciones' | 'creditos';

/** Qué se ve en cada uno, para quien no mira la pantalla. */
const ROTULO: Record<CualHerramienta, string> = {
  investigacion:
    'Dibujo animado: seis agentes se encienden uno por uno sobre un mapa de datos mientras una lupa barre la escena.',
  mirofish:
    'Dibujo animado: cinco fichas de juez se van llenando con su nota mientras el público opina en bocadillos.',
  panel:
    'Dibujo animado: una pantalla con cinco módulos que se encienden en secuencia y una barra superior que se completa.',
  mediciones:
    'Dibujo animado: un gráfico de barras que crece y una línea que sube, con el desvío señalado contra la línea de lo previsto.',
  creditos:
    'Dibujo animado: un contador de ejemplo que baja mientras las fichas viajan hacia el motor.',
};

/* --------------------------------------------------------------------------------------------------
   01 · EL EQUIPO DE INVESTIGACIÓN
   El mapa de datos (retícula tenue y dos contornos que corren, a 2,5 s) y encima el equipo: seis
   puntos —los seis agentes— que se prenden de izquierda a derecha, uno cada 0,45 s, en el mismo
   orden en que la lupa los va alcanzando. La lupa barre la escena de izquierda a derecha durante
   los cinco segundos, meciéndose a 1,25 s.
   -------------------------------------------------------------------------------------------------- */
const AGENTES: Array<[number, number]> = [
  [20, 26],
  [26, 52],
  [44, 19],
  [50, 46],
  [70, 28],
  [74, 58],
];

function Investigacion() {
  return (
    <>
      {/* El mapa de datos: la retícula y dos contornos punteados. */}
      <g className="ico-inv-mapa">
        <line x1="12" y1="24" x2="88" y2="24" />
        <line x1="12" y1="38" x2="88" y2="38" />
        <line x1="12" y1="52" x2="88" y2="52" />
        <line x1="12" y1="66" x2="88" y2="66" />
        <line x1="28" y1="18" x2="28" y2="82" />
        <line x1="50" y1="18" x2="50" y2="82" />
        <line x1="72" y1="18" x2="72" y2="82" />
      </g>
      <path className="ico-inv-contorno" d="M12 70 C 26 58, 36 74, 50 62 S 74 44, 88 50" />
      <path className="ico-inv-contorno ico-inv-contorno--b" d="M12 40 C 26 30, 40 44, 54 34 S 78 22, 88 27" />

      {/* El equipo: seis agentes, cada uno con su halo y su punto. */}
      {AGENTES.map(([x, y], i) => (
        <g className={`ico-inv-agente ico-inv-agente--${i + 1}`} key={`agente-${i}`}>
          <circle className="ico-inv-halo" cx={x} cy={y} r="5.6" />
          <circle className="ico-inv-punto" cx={x} cy={y} r="2.7" />
          <circle className="ico-inv-punto-luz" cx={x} cy={y} r="1.1" />
        </g>
      ))}

      {/* La lupa: el grupo de afuera la corre por la escena, el de adentro la mece. */}
      <g className="ico-inv-lupa">
        <g className="ico-inv-lupa-flota">
          <circle className="ico-inv-cristal-brillo" cx="22" cy="48" r="11" />
          <circle className="ico-inv-cristal" cx="22" cy="48" r="11" />
          <line className="ico-inv-cruz" x1="22" y1="40.5" x2="22" y2="55.5" />
          <line className="ico-inv-cruz" x1="14.5" y1="48" x2="29.5" y2="48" />
          <line className="ico-inv-mango" x1="29.6" y1="55.6" x2="36.6" y2="62.6" />
        </g>
      </g>
    </>
  );
}

/* --------------------------------------------------------------------------------------------------
   02 · MIROFISH
   A la izquierda, las cinco fichas de juez: cada una se enciende y su barra de nota crece hasta su
   largo (una nota distinta por juez), con 0,3 s de diferencia entre una y otra. A la derecha, los
   tres bocadillos del público: aparecen, se quedan un momento y se van, uno detrás del otro, con
   sus tres puntos tecleando a 1 s.
   -------------------------------------------------------------------------------------------------- */
function Mirofish() {
  return (
    <>
      {/* La raya que separa a los jueces del público. */}
      <line className="ico-mf-raya" x1="58" y1="16" x2="58" y2="84" />

      {/* Las cinco fichas de juez. */}
      {[0, 1, 2, 3, 4].map((i) => {
        const y = 15 + i * 14.4;
        return (
          <g className={`ico-mf-ficha ico-mf-ficha--${i + 1}`} key={`ficha-${i}`}>
            <rect className="ico-mf-tarjeta" x="8" y={y} width="44" height="10.4" rx="3" />
            <rect className="ico-mf-nota" x="12" y={y + 3.5} width="36" height="3.4" rx="1.7" />
          </g>
        );
      })}

      {/* El público: tres bocadillos que van y vienen. */}
      <g className="ico-mf-bocadillo ico-mf-bocadillo--1">
        <path className="ico-mf-cola" d="M68 28.4 L64.6 34.2 L73.4 28.4 Z" />
        <rect className="ico-mf-globo" x="62" y="16" width="30" height="13" rx="4.5" />
        <circle className="ico-mf-grano ico-mf-grano--1" cx="70.5" cy="22.5" r="1.6" />
        <circle className="ico-mf-grano ico-mf-grano--2" cx="77" cy="22.5" r="1.6" />
        <circle className="ico-mf-grano ico-mf-grano--3" cx="83.5" cy="22.5" r="1.6" />
      </g>
      <g className="ico-mf-bocadillo ico-mf-bocadillo--2">
        <path className="ico-mf-cola" d="M66 54.4 L62.6 60.2 L71.4 54.4 Z" />
        <rect className="ico-mf-globo" x="60" y="42" width="26" height="13" rx="4.5" />
        <circle className="ico-mf-grano ico-mf-grano--1" cx="67" cy="48.5" r="1.6" />
        <circle className="ico-mf-grano ico-mf-grano--2" cx="72.6" cy="48.5" r="1.6" />
        <circle className="ico-mf-grano ico-mf-grano--3" cx="78.2" cy="48.5" r="1.6" />
      </g>
      <g className="ico-mf-bocadillo ico-mf-bocadillo--3">
        <path className="ico-mf-cola" d="M70 80.4 L66.6 86.2 L75.4 80.4 Z" />
        <rect className="ico-mf-globo" x="64" y="68" width="28" height="13" rx="4.5" />
        <circle className="ico-mf-grano ico-mf-grano--1" cx="71" cy="74.5" r="1.6" />
        <circle className="ico-mf-grano ico-mf-grano--2" cx="77" cy="74.5" r="1.6" />
        <circle className="ico-mf-grano ico-mf-grano--3" cx="83" cy="74.5" r="1.6" />
      </g>
    </>
  );
}

/* --------------------------------------------------------------------------------------------------
   03 · EL PANEL
   La mini pantalla: los tres puntos de la barra, la barra superior que se completa de izquierda a
   derecha, un brillo que la cruza a 2,5 s, y cinco módulos que se van encendiendo en secuencia
   (0,45 s entre uno y otro), cada uno con sus líneas, su led y su barrita.
   -------------------------------------------------------------------------------------------------- */
const MODULOS = [
  { x: 14, y: 25, w: 34, h: 21 },
  { x: 52, y: 25, w: 34, h: 21 },
  { x: 14, y: 50, w: 34, h: 21 },
  { x: 52, y: 50, w: 34, h: 21 },
  { x: 14, y: 75, w: 72, h: 9 },
];

function Panel() {
  return (
    <>
      <defs>
        <clipPath id="ico-panel-recorte">
          <rect x="9.4" y="13.4" width="81.2" height="73.2" rx="4" />
        </clipPath>
      </defs>

      <rect className="ico-panel-marco" x="8" y="12" width="84" height="76" rx="5" />
      <rect className="ico-panel-pantalla" x="9.4" y="13.4" width="81.2" height="73.2" rx="4" />

      {/* El brillo que cruza la pantalla, recortado por el marco. */}
      <g clipPath="url(#ico-panel-recorte)">
        <rect className="ico-panel-brillo" x="-16" y="13" width="14" height="74" />
      </g>

      {/* La barra superior: tres puntos y la barra que se completa. */}
      <circle className="ico-panel-lente" cx="15" cy="19" r="1.2" />
      <circle className="ico-panel-lente" cx="19.2" cy="19" r="1.2" />
      <circle className="ico-panel-lente" cx="23.4" cy="19" r="1.2" />
      <rect className="ico-panel-pista" x="28" y="17.7" width="56" height="2.6" rx="1.3" />
      <rect className="ico-panel-barra" x="28" y="17.7" width="56" height="2.6" rx="1.3" />

      {/* Los cinco módulos. */}
      {MODULOS.map((m, i) => (
        <g className={`ico-panel-modulo ico-panel-modulo--${i + 1}`} key={`modulo-${i}`}>
          <rect className="ico-panel-caja" x={m.x} y={m.y} width={m.w} height={m.h} rx="3" />
          <g className="ico-panel-luz">
            <rect className="ico-panel-caja-luz" x={m.x} y={m.y} width={m.w} height={m.h} rx="3" />
            <rect className="ico-panel-linea" x={m.x + 4} y={m.y + 5} width={m.w * 0.48} height="1.8" rx="0.9" />
            <rect className="ico-panel-linea" x={m.x + 4} y={m.y + 9.4} width={m.w * 0.3} height="1.8" rx="0.9" />
            <circle className="ico-panel-led" cx={m.x + m.w - 5.5} cy={m.y + 5.9} r="1.5" />
            <rect
              className="ico-panel-barra-mini"
              x={m.x + 4}
              y={m.y + m.h - 4.6}
              width={m.w - 8}
              height="2.2"
              rx="1.1"
            />
          </g>
        </g>
      ))}
    </>
  );
}

/* --------------------------------------------------------------------------------------------------
   04 · LAS MEDICIONES
   Las cinco barras suben (0,2 s entre una y otra), la línea las recorre de izquierda a derecha
   hasta el último dato, y al final aparece el desvío: la guía punteada contra la línea de lo
   previsto, con el punto medido —el único verde del juego— latiendo a 1,25 s.
   -------------------------------------------------------------------------------------------------- */
const BARRAS = [22, 30, 26, 40, 48];
const X_BARRAS = [14, 28.6, 43.2, 57.8, 72.4];
const LINEA = X_BARRAS.map((x, i) => `${x + 4.5},${78 - BARRAS[i]}`).join(' ');

function Mediciones() {
  return (
    <>
      <defs>
        <linearGradient id="ico-med-degradado" x1="0" y1="1" x2="0" y2="0">
          <stop className="ico-med-parada-a" offset="0%" />
          <stop className="ico-med-parada-b" offset="100%" />
        </linearGradient>
      </defs>

      {/* Los ejes y la línea de lo previsto (punteada, siempre a la vista). */}
      <line className="ico-med-eje" x1="12" y1="78" x2="88" y2="78" />
      <line className="ico-med-previsto" x1="12" y1="42" x2="88" y2="42" />

      {/* Las cinco barras. */}
      {BARRAS.map((h, i) => (
        <rect
          className={`ico-med-barra ico-med-barra--${i + 1}`}
          key={`barra-${i}`}
          x={X_BARRAS[i]}
          y={78 - h}
          width="9"
          height={h}
          rx="1.6"
        />
      ))}

      {/* La línea que sube: se dibuja sola, de izquierda a derecha. */}
      <polyline className="ico-med-trazo" points={LINEA} pathLength="1" />

      {/* El desvío: lo que se midió contra lo que se había previsto. */}
      <g className="ico-med-desvio">
        <line className="ico-med-guia" x1="76.9" y1="42" x2="76.9" y2="30" />
        <line className="ico-med-tope" x1="74.4" y1="42" x2="79.4" y2="42" />
        <circle className="ico-med-pulso" cx="76.9" cy="30" r="3" />
        <circle className="ico-med-punto" cx="76.9" cy="30" r="2.3" />
      </g>
    </>
  );
}

/* --------------------------------------------------------------------------------------------------
   05 · LOS CRÉDITOS
   La pila de créditos se va consumiendo ficha por ficha (de arriba hacia abajo), las fichas viajan
   hacia el motor durante todo el ciclo, el aro del contador se vacía y el número baja. Cerca del
   final todo se repone: la pila vuelve, el aro se llena y el número vuelve al primero. El número
   es de ejemplo y está rotulado como tal.
   -------------------------------------------------------------------------------------------------- */
const CIFRAS = ['24', '18', '12', '06'];
const Y_FICHAS = [54, 59.2, 64.4, 69.6, 74.8, 80];

function Creditos() {
  return (
    <>
      {/* El contador: las cifras, una por vez, y su rótulo. */}
      {CIFRAS.map((cifra, i) => (
        <text className={`ico-cre-cifra ico-cre-cifra--${i + 1}`} x="11" y="31" key={cifra}>
          {cifra}
        </text>
      ))}
      <text className="ico-cre-rotulo" x="11" y="41.5">
        EJEMPLO
      </text>

      {/* El aro del contador: se va vaciando a medida que se consume. */}
      <circle className="ico-cre-aro-pista" cx="79" cy="27" r="10" />
      <circle className="ico-cre-aro" cx="79" cy="27" r="10" />

      {/* La pila de créditos. */}
      {Y_FICHAS.map((y, i) => (
        <rect
          className={`ico-cre-ficha ico-cre-ficha--${i + 1}`}
          key={`ficha-${i}`}
          x="10"
          y={y}
          width="22"
          height="3.6"
          rx="1.8"
        />
      ))}

      {/* Las fichas que viajan al motor: el trabajo que se consume. */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect
          className={`ico-cre-viajera ico-cre-viajera--${i + 1}`}
          key={`viajera-${i}`}
          x="34"
          y={i % 2 === 0 ? 62 : 68}
          width="5"
          height="4"
          rx="1.4"
        />
      ))}

      {/* El motor: la caja, el engranaje que gira y el núcleo. */}
      <g className="ico-cre-motor">
        <rect className="ico-cre-motor-caja" x="66" y="54" width="26" height="26" rx="5" />
        <circle className="ico-cre-motor-halo" cx="79" cy="67" r="9.5" />
        <g className="ico-cre-engranaje">
          <circle className="ico-cre-engranaje-aro" cx="79" cy="67" r="5.4" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angulo) => (
            <rect
              className="ico-cre-diente"
              key={`diente-${angulo}`}
              x="78.2"
              y="57.6"
              width="1.6"
              height="3.4"
              rx="0.8"
              transform={`rotate(${angulo} 79 67)`}
            />
          ))}
        </g>
        <circle className="ico-cre-nucleo" cx="79" cy="67" r="1.9" />
      </g>
    </>
  );
}

/** El dibujo de cada valor de `cual`. */
const DIBUJO: Record<CualHerramienta, ReactNode> = {
  investigacion: <Investigacion />,
  mirofish: <Mirofish />,
  panel: <Panel />,
  mediciones: <Mediciones />,
  creditos: <Creditos />,
};

/**
 * Un icono animado de la sección «CON QUÉ TRABAJA».
 *
 * Es cuadrado (el `viewBox` es 0 0 100 100 y la caja mide `width: 100%` con `aspect-ratio: 1 / 1`),
 * así que entra en cualquier tarjeta y se achica sin romperse. Todo el movimiento son cinco
 * segundos de CSS que se repiten en bucle; con `prefers-reduced-motion: reduce` el dibujo queda
 * entero y quieto.
 */
export function IconoHerramienta({ cual }: { cual: CualHerramienta }) {
  const velo = `ico-velo-${cual}`;

  return (
    <div className="ico-h" data-icono={cual} role="img" aria-label={ROTULO[cual]}>
      <svg
        className="ico-h__svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <radialGradient id={velo} cx="50%" cy="46%" r="62%">
            <stop className="ico-h__brillo-a" offset="0%" />
            <stop className="ico-h__brillo-b" offset="100%" />
          </radialGradient>
        </defs>

        {/* La caja: el fondo, el velo violeta y el marco fino. */}
        <rect className="ico-h__fondo" x="0.6" y="0.6" width="98.8" height="98.8" rx="14" />
        <rect
          className="ico-h__velo"
          x="0.6"
          y="0.6"
          width="98.8"
          height="98.8"
          rx="14"
          fill={`url(#${velo})`}
        />
        <rect className="ico-h__marco" x="0.6" y="0.6" width="98.8" height="98.8" rx="14" />

        {DIBUJO[cual]}
      </svg>
    </div>
  );
}

// ==================================================================================================
// EL FLUJO ANIMADO — el modelo de Sinkroo, explicado en un dibujo de TRECE SEGUNDOS que se repite.
//
// QUÉ ES: UN SOLO <svg> en línea (nada de imágenes de terceros salvo el propio logo del búho, que es
// un archivo que ya está en `public/`) donde el búho de Sinkroo recorre las siete etapas del modelo:
//
//      1. SU NEGOCIO      el material cae al motor
//      2. INVESTIGA       seis agentes leen el mercado
//      3. ESCRIBE         se escriben las piezas, una por red
//      4. MIROFISH PRUEBA cinco jueces votan con su nota y el público opina (bocadillos)
//      5. USTED APRUEBA   el visto bueno: un instante
//      6. SE PUBLICA      los iconos de las redes se encienden uno por uno
//      7. MIDE            las cifras (de ejemplo) suben
//
// Las seis primeras etapas duran lo mismo que siempre; MIDE se estiró un segundo (de 1,20 s a
// 2,20 s), así que el recorrido completo pasó de 12 s a 13 s. Todo el reloj vive en `flujo.css`.
//
// LO QUE NO HACE, Y NO PUEDE DECIR QUE HAGA: el sistema no publica solo en las cuentas de nadie. La
// etapa 6 dice «SE PUBLICA» porque es el nombre de la etapa del modelo, y adentro aclara «USTED DA EL
// OK ANTES DE PUBLICAR». Ninguna cifra de la etapa 7 es una medición: van rotuladas como ejemplo.
//
// CÓMO SE ANIMA: 100 % CSS (`src/flujo.css`), con `@keyframes` de 13s e `infinite`. Este componente no
// tiene estado, ni efectos, ni un solo `setTimeout`: se monta y queda andando. Si no hay animación
// —o si alguien pidió `prefers-reduced-motion`— el dibujo se ve COMPLETO y QUIETO, con las siete
// etapas a la vez y el búho al final del recorrido.
//
// CÓMO SE MONTA: `export function FlujoAnimado()` no lleva props. Se pone donde sea:
//
//      import { FlujoAnimado } from './FlujoAnimado';
//      <FlujoAnimado />
//
// Es responsive: `width: 100%` y `height: auto`, con un `viewBox` de 720x664 (en un celular de 390 px
// queda de unos 360 px de alto). No saca scroll horizontal ni se sale de su caja.
//
// EL CARRIL TIENE SU PROPIO ESPACIO: el recorrido punteado va entre las dos filas con 26 unidades de
// aire arriba y abajo, y ningún panel ni ningún rótulo lo toca (antes el carril entraba en los
// paneles de las dos filas y los rótulos de abajo quedaban pegados a la línea). Por eso la fila de
// arriba mide 222 de alto, la de abajo empieza 26 unidades más abajo que el carril y los tres rótulos
// de abajo (MIDE · SE PUBLICA · USTED · APRUEBA) quedan en la misma línea, a la misma distancia de su
// panel. El carril y el reloj del búho NO se movieron: siguen en las mismas coordenadas.
//
// OJO: los `id` de los gradientes y los filtros son fijos (`flujo-glow`, `flujo-halo`…). Si algún día
// se montara el componente DOS veces en la misma página, conviene pasar a `useId()` para no repetir
// identificadores.
// ==================================================================================================

import './flujo.css';
import { MARCAS, type Marca } from './flujo-marcas';

/** EL RELOJ DEL DIBUJO: el ciclo duró 12 s y ahora dura 13 s (la etapa MIDE se estiró 1 s). Los
 *  desfases absolutos de las seis primeras etapas NO cambian: se estiran en la misma proporción,
 *  13/12 = 1,083333. Los de la etapa 7 (MIDE) no van por acá: se reparten en la ventana nueva. */
const RELOJ = 13 / 12;

/** Un desfase en segundos ya escalado al ciclo de 13 s. Se escribe igual que antes (0,99 / 0,394 /
 *  0,171…), así que cada elemento cae en el mismo instante absoluto de siempre dentro del ciclo. */
const desfase = (segundos: number): string => `${(segundos * RELOJ).toFixed(2)}s`;

/** Las marcas por nombre: así se pide un trazo concreto sin depender del orden del arreglo. */
const POR_NOMBRE: Record<string, Marca> = {};
for (const marca of MARCAS) POR_NOMBRE[marca.nombre] = marca;

/** Las notas de los cinco jueces. Son de EJEMPLO (así lo dice el rótulo de la etapa 7 y el <desc>). */
const JUECES: { nota: number; texto: string }[] = [
  { nota: 8.4, texto: '8,4' },
  { nota: 7.9, texto: '7,9' },
  { nota: 8.8, texto: '8,8' },
  { nota: 6.7, texto: '6,7' },
  { nota: 9.1, texto: '9,1' },
];

/** Lo que dice el público. Tres reacciones cortas, de ejemplo, como las diría una persona. */
const VOCES: string[] = [
  '«me engancha el arranque»',
  '«no entiendo qué ofrecen»',
  '«yo la compraría»',
];

/** Las cuatro cifras de «MIDE». Inventadas para el dibujo: van rotuladas como ejemplo. */
const CIFRAS: { rotulo: string; valor: string }[] = [
  { rotulo: 'ALCANCE', valor: '128.400' },
  { rotulo: 'CLICS', valor: '9.420' },
  { rotulo: 'COSTO POR\nVENTA', valor: '1.850' },
  { rotulo: 'DESVÍO DEL\nMODELO', valor: '2,1 %' },
];

/** Las cinco primeras marcas que se ven en las tarjetas de «ESCRIBE» (una pieza por red). */
const PIEZAS = ['Instagram', 'TikTok', 'YouTube'];

/** El nombre de la etapa, arriba de su panel.
 *
 *  Va SIN número a propósito: con siete etapas en 720 unidades de ancho, el «1.» de una etapa se
 *  comía el nombre de la anterior en el celular. El orden lo dicen las flechas del riel, el búho que
 *  viaja y el propio orden de lectura; y el número de cada etapa está escrito en el <desc>, que es lo
 *  que lee un lector de pantalla. `linea2` es para el único rótulo que no cabe en una línea. */
function Etiqueta({ x, y, linea2, children }: { x: number; y: number; linea2?: string; children: string }) {
  return (
    <>
      <text className="flujo-nombre" x={x} y={y}>
        {children}
      </text>
      {linea2 ? (
        <text className="flujo-nombre" x={x} y={y + 18}>
          {linea2}
        </text>
      ) : null}
    </>
  );
}

/** El panel de una etapa: el mismo rectángulo redondeado para las siete. */
function Panel({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return <rect className="flujo-panel" x={x} y={y} width={w} height={h} rx={12} />;
}

/** El trazo de una marca (24x24) puesto en un punto y a un tamaño. Monocromo: usa `currentColor`. */
function Glifo({ marca, x, y, tam }: { marca: Marca; x: number; y: number; tam: number }) {
  return (
    <g className="flujo-color-violeta" transform={`translate(${x} ${y})`}>
      <path className="flujo-glifo" d={marca.d} transform={`scale(${tam / 24})`} />
    </g>
  );
}

/** Un documento del material que entra al motor (etapa 1). */
function Documento({ x, y, retraso }: { x: number; y: number; retraso: string }) {
  return (
    <g className="flujo-cae" style={{ animationDelay: retraso }}>
      <rect className="flujo-doc" x={x} y={y} width={26} height={34} rx={4} />
      <rect className="flujo-doc-linea" x={x + 5} y={y + 9} width={16} height={2.5} rx={1.25} />
      <rect className="flujo-doc-linea" x={x + 5} y={y + 16} width={12} height={2.5} rx={1.25} />
      <rect className="flujo-doc-linea" x={x + 5} y={y + 23} width={14} height={2.5} rx={1.25} />
    </g>
  );
}

/** Una tarjeta de las que se escriben solas (etapa 3). */
function Pieza({ marca, x, y }: { marca: Marca; x: number; y: number }) {
  return (
    <g>
      <rect className="flujo-tarjeta" x={x} y={y} width={96} height={54} rx={7} />
      <Glifo marca={marca} x={x + 8} y={y + 12} tam={14} />
      <rect className="flujo-tarjeta-titulo" x={x + 30} y={y + 16} width={52} height={4} rx={2} />
      <rect
        className="flujo-tarjeta-linea flujo-escribe"
        x={x + 8}
        y={y + 33}
        width={70}
        height={3}
        rx={1.5}
      />
      <rect
        className="flujo-tarjeta-linea flujo-escribe"
        x={x + 8}
        y={y + 42}
        width={54}
        height={3}
        rx={1.5}
        style={{ animationDelay: desfase(0.6) }}
      />
      <rect className="flujo-cursor" x={x + 68} y={y + 41} width={4} height={5} rx={1} />
    </g>
  );
}

/** Una ficha de juez con su nota y su barra de voto (etapa 4). */
function Juez({ x, nota, texto, retraso }: { x: number; nota: number; texto: string; retraso: string }) {
  return (
    <g className="flujo-e4" style={{ animationDelay: retraso }}>
      <rect className="flujo-juez" x={x} y={52} width={54} height={52} rx={7} />
      <circle className="flujo-juez-cara" cx={x + 27} cy={68} r={6.5} />
      <circle className="flujo-juez-cara" cx={x + 27} cy={68} r={2} />
      <text className="flujo-puntaje" x={x + 27} y={88} textAnchor="middle">
        {texto}
      </text>
      <rect className="flujo-voto-pista" x={x + 8} y={94} width={38} height={3.5} rx={1.75} />
      <rect
        className="flujo-voto"
        x={x + 8}
        y={94}
        width={(38 * nota) / 10}
        height={3.5}
        rx={1.75}
        style={{ animationDelay: retraso }}
      />
    </g>
  );
}

/** Un bocadillo del público (etapa 4): entra, se lee y se va. */
function Bocadillo({ x, y, texto, retraso }: { x: number; y: number; texto: string; retraso: string }) {
  return (
    <g className="flujo-dice" style={{ animationDelay: retraso }}>
      <rect className="flujo-burbuja" x={x} y={y} width={284} height={34} rx={9} />
      <path className="flujo-burbuja-cola" d={`M ${x + 20},${y + 34} l 0,7 l -9,-7 z`} />
      <text className="flujo-dice-txt" x={x + 14} y={y + 22}>
        {texto}
      </text>
    </g>
  );
}

/** Un icono de red con su cajita, dentro de la etapa 6. */
function Red({ marca, x, y, retraso }: { marca: Marca; x: number; y: number; retraso: string }) {
  return (
    <g className="flujo-red" style={{ animationDelay: retraso }}>
      <rect className="flujo-red-caja" x={x} y={y} width={36} height={36} rx={9} />
      <Glifo marca={marca} x={x + 5.2} y={y + 5.2} tam={26} />
    </g>
  );
}

/** Una cifra de «MIDE» (etapa 7). Todas son de EJEMPLO. El rótulo puede venir en dos líneas
 *  (separadas con `\n`) cuando no cabe en una. */
function Cifra({
  x,
  y,
  rotulo,
  valor,
  retraso,
}: {
  x: number;
  y: number;
  rotulo: string;
  valor: string;
  retraso: string;
}) {
  const lineas = rotulo.split('\n');
  return (
    <g>
      <rect className="flujo-metrica-caja" x={x} y={y} width={118} height={60} rx={8} />
      {lineas.length === 1 ? (
        <text className="flujo-metrica-rot" x={x + 10} y={y + 22}>
          {lineas[0]}
        </text>
      ) : (
        lineas.map((linea, i) => (
          <text key={linea} className="flujo-metrica-rot" x={x + 10} y={y + 15 + i * 11}>
            {linea}
          </text>
        ))
      )}
      <text className="flujo-metrica-num flujo-sube" x={x + 10} y={y + 50} style={{ animationDelay: retraso }}>
        {valor}
      </text>
    </g>
  );
}

export function FlujoAnimado() {
  return (
    <div className="flujo-caja">
      <svg
        className="flujo-svg"
        viewBox="0 0 720 664"
        role="img"
        aria-labelledby="flujo-titulo"
        aria-describedby="flujo-desc"
        xmlns="http://www.w3.org/2000/svg"
      >
        <title id="flujo-titulo">
          El modelo de Sinkroo en un recorrido de trece segundos: su negocio, la investigación, la
          escritura, la prueba con MiroFish, su aprobación, la publicación y la medición.
        </title>
        <desc id="flujo-desc">
          Dibujo animado del modelo de Sinkroo. El búho recorre siete etapas en trece segundos: 1) SU
          NEGOCIO: el material del negocio cae al motor. 2) INVESTIGA: seis agentes leen el mercado.
          3) ESCRIBE: se escriben las piezas, una por red. 4) MIROFISH PRUEBA: cinco jueces votan con
          su nota y el público opina, por ejemplo «me engancha el arranque», «no entiendo qué
          ofrecen» y «yo la compraría». 5) USTED APRUEBA: usted marca el visto bueno. 6) SE PUBLICA:
          se encienden los iconos de Instagram, Facebook, WhatsApp, TikTok, YouTube, Google, LinkedIn,
          Threads, Pinterest y Correo; usted da el OK antes de publicar y el sistema no publica nada
          por su cuenta. 7) MIDE: alcance, clics, costo por venta y desvío del modelo. Las cifras y
          las notas que se ven en el dibujo son de ejemplo, no mediciones reales.
        </desc>

        <defs>
          <radialGradient id="flujo-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#c084fc" stopOpacity="0.5" />
            <stop offset="65%" stopColor="#a855f7" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="flujo-brillo-fondo" cx="50%" cy="0%" r="85%">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.13" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
          </radialGradient>
          <filter id="flujo-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="2.2" result="desenfoque" />
            <feMerge>
              <feMergeNode in="desenfoque" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="flujo-glow-buho" x="-70%" y="-70%" width="240%" height="240%">
            <feGaussianBlur stdDeviation="3.2" result="desenfoque" />
            <feMerge>
              <feMergeNode in="desenfoque" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ---------- EL TABLERO ---------- */}
        <rect className="flujo-tablero" x={0} y={0} width={720} height={664} rx={16} />
        <rect x={0} y={0} width={720} height={664} rx={16} fill="url(#flujo-brillo-fondo)" />

        {/* ---------- LOS RÓTULOS DE LAS SIETE ETAPAS (arriba de cada panel) ---------- */}
        <Etiqueta x={12} y={18}>SU NEGOCIO</Etiqueta>
        <Etiqueta x={140} y={18}>INVESTIGA</Etiqueta>
        <Etiqueta x={292} y={18}>ESCRIBE</Etiqueta>
        <Etiqueta x={416} y={18}>MIROFISH PRUEBA</Etiqueta>
        <Etiqueta x={556} y={410} linea2="APRUEBA">USTED</Etiqueta>
        <Etiqueta x={286} y={428}>SE PUBLICA</Etiqueta>
        <Etiqueta x={12} y={428}>MIDE</Etiqueta>

        {/* ==========================================================================================
            ETAPA 1 — SU NEGOCIO. El material cae y entra al motor.
            ========================================================================================== */}
        <g className="flujo-etapa flujo-e1">
          <Panel x={12} y={28} w={116} h={222} />
          {/* El contenido del panel, un 9 % más chico y centrado: así ningún texto queda
              pegado al borde del recuadro. El recuadro y su luz NO se tocan. */}
          <g transform="translate(70 139) scale(0.91) translate(-70 -139)">
          <text className="flujo-chico" x={20} y={46}>
            MATERIAL
          </text>
          <Documento x={24} y={52} retraso={desfase(0)} />
          <Documento x={54} y={52} retraso={desfase(0.99)} />
          <Documento x={84} y={52} retraso={desfase(2.01)} />
          {/* El motor: la boca por donde entra el material y el cuerpo que lo muele. */}
          <path className="flujo-motor-boca" d="M 36,166 L 104,166 L 94,180 L 46,180 Z" />
          <rect className="flujo-motor" x={22} y={178} width={96} height={58} rx={10} />
          <g className="flujo-gira" transform="translate(54 207)">
            <circle cx={0} cy={0} r={16} fill="none" stroke="#c084fc" strokeWidth={1.6} strokeDasharray="5 4" />
            <circle cx={0} cy={0} r={5.5} fill="#c084fc" fillOpacity={0.55} />
          </g>
          <rect className="flujo-escribe" x={78} y={194} width={30} height={4} rx={2} fill="#c084fc" fillOpacity={0.55} />
          <rect
            className="flujo-escribe"
            x={78}
            y={205}
            width={30}
            height={4}
            rx={2}
            fill="#c084fc"
            fillOpacity={0.55}
            style={{ animationDelay: desfase(0.34) }}
          />
          <rect
            className="flujo-escribe"
            x={78}
            y={216}
            width={30}
            height={4}
            rx={2}
            fill="#c084fc"
            fillOpacity={0.55}
            style={{ animationDelay: desfase(0.69) }}
          />
          </g>
          <rect className="flujo-luz flujo-e1" x={12} y={28} width={116} height={222} rx={12} />
        </g>

        {/* ==========================================================================================
            ETAPA 2 — INVESTIGA. Seis agentes leyendo el mercado, con lupa y gráfico.
            ========================================================================================== */}
        <g className="flujo-etapa flujo-e2">
          <Panel x={140} y={28} w={140} h={222} />
          {/* El contenido del panel, un 9 % más chico y centrado: así ningún texto queda
              pegado al borde del recuadro. El recuadro y su luz NO se tocan. */}
          <g transform="translate(210 139) scale(0.91) translate(-210 -139)">
          <text className="flujo-chico" x={152} y={42}>
            6 AGENTES
          </text>
          <text className="flujo-chico" x={152} y={54}>
            EL MERCADO
          </text>
          {/* Los seis puntitos que trabajan: laten cada uno a su tiempo. */}
          {[[252, 96], [231, 132], [189, 132], [168, 96], [189, 60], [231, 60]].map(([cx, cy], i) => (
            <circle
              key={`agente-${i}`}
              className="flujo-agente flujo-latido"
              cx={cx}
              cy={cy}
              r={5.5}
              style={{ animationDelay: desfase(i * 0.394) }}
            />
          ))}
          {/* La lupa. */}
          <circle className="flujo-lupa" cx={210} cy={96} r={20} />
          <line x1={224} y1={110} x2={238} y2={124} stroke="#c084fc" strokeWidth={2.5} strokeLinecap="round" />
          {/* El gráfico del mercado: cinco barras que suben y bajan. */}
          <line className="flujo-eje" x1={154} y1={232} x2={266} y2={232} />
          {[28, 44, 20, 52, 36].map((alto, i) => (
            <rect
              key={`barra-${i}`}
              className="flujo-barra flujo-crece"
              x={158 + i * 22}
              y={232 - alto}
              width={14}
              height={alto}
              rx={2}
              style={{ animationDelay: desfase(i * 0.257) }}
            />
          ))}
          </g>
          <rect className="flujo-luz flujo-e2" x={140} y={28} width={140} height={222} rx={12} />
        </g>

        {/* ==========================================================================================
            ETAPA 3 — ESCRIBE. Una pieza por red, escribiéndose sola.
            ========================================================================================== */}
        <g className="flujo-etapa flujo-e3">
          <Panel x={292} y={28} w={112} h={222} />
          {/* El contenido del panel, un 9 % más chico y centrado: así ningún texto queda
              pegado al borde del recuadro. El recuadro y su luz NO se tocan. */}
          <g transform="translate(348 139) scale(0.91) translate(-348 -139)">
          <text className="flujo-chico" x={300} y={42}>
            ESCRIBE
          </text>
          <text className="flujo-chico" x={300} y={54}>
            UNA PIEZA
          </text>
          {PIEZAS.map((nombre, i) => (
            <Pieza key={nombre} marca={POR_NOMBRE[nombre]} x={300} y={62 + i * 62} />
          ))}
          </g>
          <rect className="flujo-luz flujo-e3" x={292} y={28} width={112} height={222} rx={12} />
        </g>

        {/* ==========================================================================================
            ETAPA 4 — MIROFISH PRUEBA. Los cinco jueces y el público hablando.
            ========================================================================================== */}
        <g className="flujo-etapa flujo-e4">
          <Panel x={416} y={28} w={294} h={222} />
          {/* El contenido del panel, un 9 % más chico y centrado: así ningún texto queda
              pegado al borde del recuadro. El recuadro y su luz NO se tocan. */}
          <g transform="translate(563 139) scale(0.91) translate(-563 -139)">
          <text className="flujo-chico" x={424} y={44}>
            5 JUECES · VOTAN
          </text>
          {JUECES.map((juez, i) => (
            <Juez
              key={`juez-${i}`}
              x={421 + i * 58}
              nota={juez.nota}
              texto={juez.texto}
              retraso={desfase(i * 0.171)}
            />
          ))}
          <text className="flujo-chico" x={424} y={122}>
            EL PÚBLICO OPINA
          </text>
          {VOCES.map((voz, i) => (
            <Bocadillo
              key={voz}
              x={421}
              y={130 + i * 36}
              texto={voz}
              retraso={desfase(i * 0.857)}
            />
          ))}
          </g>
          <rect className="flujo-luz flujo-e4" x={416} y={28} width={294} height={222} rx={12} />
        </g>

        {/* ==========================================================================================
            ETAPA 5 — USTED APRUEBA. El visto bueno del dueño: un instante, y se marca.
            ========================================================================================== */}
        <g className="flujo-etapa flujo-e5">
          <Panel x={556} y={444} w={154} h={200} />
          {/* El contenido del panel, un 9 % más chico y centrado: así ningún texto queda
              pegado al borde del recuadro. El recuadro y su luz NO se tocan. */}
          <g transform="translate(633 544) scale(0.91) translate(-633 -544)">
          <circle className="flujo-cheque-halo" cx={633} cy={542} r={40} />
          <path className="flujo-cheque" d="M 606,546 L 626,566 L 668,510" />
          <text className="flujo-ok-txt" x={633} y={610} textAnchor="middle">
            APROBADO
          </text>
          </g>
          <rect className="flujo-luz flujo-e5" x={556} y={444} width={154} height={200} rx={12} />
        </g>

        {/* ==========================================================================================
            ETAPA 6 — SE PUBLICA. Los iconos de las redes se encienden uno por uno.
            (El rótulo de abajo aclara que el OK es del dueño: el sistema no publica solo.)
            ========================================================================================== */}
        <g className="flujo-etapa flujo-e6">
          <Panel x={286} y={444} w={258} h={200} />
          {/* El contenido del panel, un 9 % más chico y centrado: así ningún texto queda
              pegado al borde del recuadro. El recuadro y su luz NO se tocan. */}
          <g transform="translate(415 544) scale(0.91) translate(-415 -544)">
          {MARCAS.map((marca, i) => (
            <Red
              key={marca.nombre}
              marca={marca}
              x={293 + (i % 5) * 52}
              y={i < 5 ? 496 : 566}
              retraso={desfase(i * 0.137)}
            />
          ))}
          <text className="flujo-nota" x={415} y={620} textAnchor="middle">
            USTED DA EL OK ANTES DE PUBLICAR
          </text>
          </g>
          <rect className="flujo-luz flujo-e6" x={286} y={444} width={258} height={200} rx={12} />
        </g>

        {/* ==========================================================================================
            ETAPA 7 — MIDE. Las cifras suben. Todas son de EJEMPLO.
            ========================================================================================== */}
        <g className="flujo-etapa flujo-e7">
          <Panel x={12} y={444} w={262} h={200} />
          {/* El contenido del panel, un 9 % más chico y centrado: así ningún texto queda
              pegado al borde del recuadro. El recuadro y su luz NO se tocan. */}
          <g transform="translate(143 544) scale(0.91) translate(-143 -544)">
          {/* Las cifras se reparten en la ventana nueva de MIDE (10,80–13,00 s): una cada 0,37 s, la
              última a 1,11 s. Antes el desfase era de 0,171 s por cifra dentro de una ventana de
              1,20 s; ahora la ventana es de 2,20 s y el desfase acompaña. */}
          {CIFRAS.map((cifra, i) => (
            <Cifra
              key={cifra.rotulo}
              x={i % 2 === 0 ? 20 : 148}
              y={i < 2 ? 494 : 562}
              rotulo={cifra.rotulo}
              valor={cifra.valor}
              retraso={`${(i * 0.37).toFixed(2)}s`}
            />
          ))}
          <rect className="flujo-ejemplo-caja" x={20} y={624} width={246} height={18} rx={9} />
          <text className="flujo-ejemplo-txt" x={143} y={637} textAnchor="middle">
            CIFRAS Y NOTAS DE EJEMPLO
          </text>
          </g>
          <rect className="flujo-luz flujo-e7" x={12} y={444} width={262} height={200} rx={12} />
        </g>

        {/* ---------- EL RIEL: por acá anda el búho. Las flechas dicen hacia dónde va el flujo. ---------- */}
        <path
          className="flujo-riel"
          d="M 70,268 H 650 Q 688,268 688,330 Q 688,392 650,392 H 70 Q 32,392 32,330 Q 32,268 70,268"
        />
        {[131, 283, 407].map((x) => (
          <path key={`flecha-ida-${x}`} className="flujo-flecha" d={`M ${x},262 L ${x + 8},268 L ${x},274 Z`} />
        ))}
        {[283, 553].map((x) => (
          <path key={`flecha-vuelta-${x}`} className="flujo-flecha" d={`M ${x},386 L ${x - 8},392 L ${x},398 Z`} />
        ))}

        {/* ---------- EL BÚHO: el que viaja. Se mueve por CSS (ver `flujoBuho` en flujo.css). ---------- */}
        <g className="flujo-buho">
          <ellipse className="flujo-buho-halo" cx={0} cy={0} rx={27} ry={23} />
          <image
            className="flujo-buho-imagen"
            href="/67.png"
            x={-29}
            y={-24}
            width={58}
            height={48}
            preserveAspectRatio="xMidYMid meet"
          />
        </g>
      </svg>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Card, Badge, Button } from './ui';
import { I_Zap, I_ArrowRight, I_Users, I_Eye } from './icons';
import {
  AGENTES, ACCIONES_FEED, INVESTIGACION_MERCADO, FRENTES_INVESTIGACION, HALLAZGOS,
  type Agente, type AccionFeed, type Hallazgo,
} from '../data/demo';

// =============================================================================================
// EL EQUIPO TRABAJANDO — la investigación del mercado, hecha por los 6 agentes
//
// Esto NO es la evaluación de una pieza: eso es MiroFish (los 5 jueces + 500 del público) y entra
// recién cuando hay una pieza para evaluar. Acá se ve la otra mitad, la que corre SIEMPRE: el
// motor se puso solo cuando el usuario terminó el onboarding y desde entonces revisa el mercado
// de su negocio cada 15 minutos. Lux, Rex, Nia, Kai, Sol y Rumi, en una grilla compacta, con lo
// que están haciendo ahora y el artefacto que dejaron.
//
// REGLA DE ORO: cada línea que se muestra tiene (1) algo del negocio del usuario, (2) un resultado
// concreto y (3) una hora. Y el resultado se abre: no hay estados vacíos tipo "analizando…".
//
// ESTO SE MUEVE SOLO. Todo lo que cambia en pantalla sale de un único reloj de 1 segundo (`t`) y
// de un programador de líneas con setTimeout que se limpia al desmontar:
//   · el feed: entra una línea nueva cada 2-4 s, con su hora ('hace un instante' → 'hace 20 s')
//   · la cuenta regresiva a la próxima vuelta al mercado (mm:ss, baja de verdad)
//   · 'revisado hasta ahora': sube cada 2 s
//   · el avance de la tarea de cada agente: '47 de 50 anuncios' → 48
//   · el estado de Lux: 'trabajando' → 'al día' → 'trabajando' (y los contadores del encabezado)
//   · la hora del último resultado de cada agente ('hace 12 min' → 'hace 13 min')
// Ninguno de estos timers queda vivo al desmontar: los dos efectos devuelven su limpieza.
//
// EL BLOQUE ENTRA EN UNA PANTALLA: a 1440×900 mide ~860 px (encabezado + feed + los 6 agentes +
// los frentes y hallazgos + el puente a MiroFish). Para eso los agentes van de a 3 por fila, los
// frentes y los hallazgos son filas de una sola línea, y paddings y tipografías van un punto abajo.
// =============================================================================================

/** Cada cuánto el motor vuelve a mirar el mercado: 15 min. */
const CADENCIA_SEG = INVESTIGACION_MERCADO.cadenciaMin * 60;
/** La última revisión fue hace 4 min: de ahí sale el arranque de la cuenta regresiva. */
const EDAD_INICIAL_SEG = 4 * 60;
/** Segundos que faltan para la próxima vuelta cuando se abre el panel. */
const FALTAN_INICIAL_SEG = CADENCIA_SEG - EDAD_INICIAL_SEG;
/** Cómo entran las líneas del feed: una cada 2 a 4 segundos. */
const MS_LINEA_MIN = 2000;
const MS_LINEA_MAX = 4000;
/** Cuántas líneas del feed se ven a la vez (la altura de la lista está atada a esta cifra). */
const MAX_LINEAS = 6;
/** Los tiempos de la lista arrancan escalonados: la lista no nace vacía. */
const EDADES_INICIALES_SEG = [4, 14, 28, 47, 65, 95];
/** Cada cuánto avanza un punto la tarea de cada agente, y cada cuánto se estira el de al lado. */
const PASO_TAREA_SEG = 7;
const DESFASE_TAREA_SEG = 3;
/** Cada cuántos segundos Lux se toma un respiro: al día 14 s, trabajando 30 s, y vuelve. */
const CICLO_ESTADO_SEG = 44;
const DESDE_AFLORA_SEG = 30;

const ESTADO_LB: Record<Agente['estado'], string> = {
  trabajando: 'trabajando',
  esperando_ok: 'esperando tu OK',
  al_dia: 'al día',
};

const CLASE_ESTADO: Record<Agente['estado'], string> = {
  trabajando: 'working',
  esperando_ok: 'waiting',
  al_dia: 'idle',
};

/** El agente, por id: el feed guarda a quién pertenece cada acción. */
const AGENTE_POR_ID: Record<string, Agente> = AGENTES.reduce(
  (m, a) => { m[a.id] = a; return m; }, {} as Record<string, Agente>,
);

/** El botón abre el artefacto: lo dice el título, y aclara que no cambia nada. */
function tituloArtefacto(nombre: string, estado: Agente['estado']) {
  return estado === 'esperando_ok'
    ? `Abre «${nombre}». Todavía no gasta: para publicarla tenés que aprobarla vos.`
    : `Abre «${nombre}». Solo lectura: no cambia nada.`;
}

/** Una línea del feed: quién, qué hizo, cuándo nació (en segundos del reloj del motor). */
interface LineaFeed {
  id: number;
  agenteId: string;
  texto: string;
  artefacto?: string;
  nace: number;
}

/** 'hace un instante' → 'hace 20 s' → 'hace 2 min' → 'hace 3 h'. */
function hace(seg: number): string {
  if (seg < 6) return 'hace un instante';
  if (seg < 90) return `hace ${Math.floor(seg / 5) * 5} s`;
  if (seg < 3600) return `hace ${Math.round(seg / 60)} min`;
  return `hace ${Math.round(seg / 3600)} h`;
}

/** Los minutos que declara cada agente ('hace 12 min', 'hace 2 h', 'hace 1 día'). */
function minutosDe(cuando: string, porDefecto: number): number {
  const m = cuando.match(/(\d+)\s*(min|h|d)/i);
  if (!m) return porDefecto;
  const n = Number(m[1]);
  const u = m[2].toLowerCase();
  return u === 'min' ? n : u === 'h' ? n * 60 : n * 1440;
}

/** Ese mismo tiempo, ya corrido por el reloj: 'hace 12 min' → 'hace 13 min' sin recargar nada. */
function haceMin(min: number): string {
  if (min < 60) return `hace ${min} min`;
  if (min < 1440) return `hace ${Math.floor(min / 60)} h`;
  const d = Math.floor(min / 1440);
  return `hace ${d} ${d === 1 ? 'día' : 'días'}`;
}

/** Baraja una copia: el feed recorre las acciones siempre en un orden distinto. */
function barajar<T>(xs: T[]): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

export function MotorEnVivo({ setToast, irAGaleria }: {
  setToast: (t: string) => void;
  /** Lleva a la galería de Campañas, donde viven las piezas que MiroFish ya puntuó. */
  irAGaleria?: () => void;
}) {
  // ---- El reloj del motor: el único timer de 1 segundo. Todo lo demás se deriva de acá. ----
  const [t, setT] = useState(0);
  const tRef = useRef(0);
  useEffect(() => {
    const id = setInterval(() => { tRef.current += 1; setT(tRef.current); }, 1000);
    return () => clearInterval(id);
  }, []);

  // ---- El feed: arranca con la lista puesta y después entra una línea nueva cada 2-4 s. ----
  const [lineas, setLineas] = useState<LineaFeed[]>([]);
  const [nuevas, setNuevas] = useState(0);
  const seqRef = useRef(0);
  const colaRef = useRef<AccionFeed[]>([]);
  const ultimaRef = useRef('');
  useEffect(() => {
    // Saca la próxima acción; cuando se acaba la vuelta, la baraja de nuevo sin repetir la última.
    const siguiente = (): AccionFeed => {
      if (colaRef.current.length === 0) {
        const cola = barajar(ACCIONES_FEED);
        if (cola.length > 1 && cola[0].texto === ultimaRef.current) {
          const t0 = cola[0]; cola[0] = cola[1]; cola[1] = t0;
        }
        colaRef.current = cola;
      }
      const a = colaRef.current.shift() as AccionFeed;
      ultimaRef.current = a.texto;
      return a;
    };
    const crear = (a: AccionFeed, nace: number): LineaFeed => ({
      id: seqRef.current++, agenteId: a.agenteId, texto: a.texto, artefacto: a.artefacto, nace,
    });

    setLineas(EDADES_INICIALES_SEG.map(e => crear(siguiente(), -e)));

    let id: ReturnType<typeof setTimeout>;
    const programar = () => {
      const espera = MS_LINEA_MIN + Math.random() * (MS_LINEA_MAX - MS_LINEA_MIN);
      id = setTimeout(() => {
        const a = siguiente();
        setLineas(prev => [crear(a, tRef.current), ...prev].slice(0, MAX_LINEAS));
        setNuevas(n => n + 1);
        programar();
      }, espera);
    };
    programar();
    return () => clearTimeout(id);
  }, []);

  // ---- La vuelta al mercado: cuenta regresiva, hora de la última y revisiones acumuladas ----
  const ciclo = t % CADENCIA_SEG;
  const faltan = ciclo < FALTAN_INICIAL_SEG
    ? FALTAN_INICIAL_SEG - ciclo
    : CADENCIA_SEG - (ciclo - FALTAN_INICIAL_SEG);
  const edadUltima = ciclo >= FALTAN_INICIAL_SEG ? ciclo - FALTAN_INICIAL_SEG : EDAD_INICIAL_SEG + ciclo;
  const vueltas = Math.floor(t / CADENCIA_SEG) + (ciclo >= FALTAN_INICIAL_SEG ? 1 : 0);
  const mmss = `${String(Math.floor(faltan / 60)).padStart(2, '0')}:${String(faltan % 60).padStart(2, '0')}`;
  /** Sube de a uno cada 2 segundos mientras mirás: la pantalla nunca está quieta. */
  const revisados = 47 + Math.floor(t / 2);

  // ---- El equipo, con lo que cambia solo: estado, avance de la tarea y hora corrida ----
  const luxAfloja = (t % CICLO_ESTADO_SEG) >= DESDE_AFLORA_SEG;
  const equipo = AGENTES.map((a, i) => {
    const estado: Agente['estado'] = luxAfloja && a.id === 'lux' ? 'al_dia' : a.estado;
    const rango = a.tarea.total - a.tarea.hecho + 1;
    const hecho = a.tarea.hecho + (Math.floor((t + i * DESFASE_TAREA_SEG) / PASO_TAREA_SEG) % rango);
    const min = minutosDe(a.cuando, 5) + Math.floor(t / 60);
    return { a, estado, hecho, cuando: haceMin(min) };
  });
  const trabajando = equipo.filter(e => e.estado === 'trabajando').length;
  const esperando = equipo.filter(e => e.estado === 'esperando_ok').length;
  const alDia = equipo.filter(e => e.estado === 'al_dia').length;

  const verGaleria = () => {
    if (irAGaleria) irAGaleria();
    else setToast('La galería de Campañas está en el paso «Galería» (demo)');
  };

  return (
    <div className="eq-wrap">
      {/* ==================== ENCABEZADO: el equipo trabaja desde el onboarding ==================== */}
      <div className="eq-head">
        <div className="eq-head-top">
          <span className="eq-live"><span className="dot-live" /> EN VIVO</span>
          <span className="eq-head-t">El equipo trabajando: la investigación de tu mercado</span>
          <Badge tone="green">{trabajando} trabajando ahora</Badge>
        </div>
        <div className="eq-arranque">
          <b>Arrancó solo {INVESTIGACION_MERCADO.desde}</b>, {INVESTIGACION_MERCADO.arranco}.
          {' '}Desde entonces revisa tu mercado <b>{INVESTIGACION_MERCADO.cadencia}</b> y te avisa si algo cambia.
        </div>
        <div className="eq-estado">
          <span><b>{trabajando}</b> trabajando</span>
          <span className="eq-sep">·</span>
          <span><b>{esperando}</b> esperando tu OK</span>
          <span className="eq-sep">·</span>
          <span><b>{alDia}</b> al día</span>
          <span className="eq-sep">·</span>
          <span title={`La última vez que el motor dejó un resultado en tu panel. Vuelve cada ${INVESTIGACION_MERCADO.cadencia}.`}>
            última revisión: <b>{hace(edadUltima)}</b></span>
          <span className="eq-sep">·</span>
          <span className="eq-prox" title="Cuenta regresiva real a la próxima vuelta al mercado: baja cada segundo.">
            próxima vuelta en <b>{mmss}</b></span>
          <span className="eq-sep">·</span>
          <span title="Anuncios, precios y conversaciones que el equipo viene de revisar. Sube solo.">
            revisado hasta ahora: <b>{revisados}</b></span>
          <span className="eq-count">{INVESTIGACION_MERCADO.revisiones + vueltas} revisiones desde que arrancó</span>
        </div>
      </div>

      {/* ============ EL FEED EN VIVO: lo que están haciendo ahora, entrando línea por línea ============ */}
      <div className="eq-feed">
        <div className="eq-feed-head">
          <span className="eq-live"><span className="dot-live" /> EN VIVO</span>
          <span className="eq-feed-t">Lo que están haciendo ahora, agente por agente</span>
          <span className="eq-feed-n" title="Líneas que entraron al feed desde que abriste el panel.">
            <b>{nuevas}</b> {nuevas === 1 ? 'nueva' : 'nuevas'} desde que abriste
          </span>
        </div>
        {/* Altura fija: entra una línea y el resto de la pantalla NO se mueve ni un pixel. */}
        <div className="eq-feed-lista">
          {lineas.map(l => {
            const ag = AGENTE_POR_ID[l.agenteId];
            return (
              <div className="eq-feed-l" key={l.id}>
                <span className="eq-av" style={{ background: ag.color }}>{ag.nombre[0]}</span>
                <span className="eq-feed-nm">{ag.nombre}</span>
                <span className="eq-feed-tx" title={l.texto}>{l.texto}</span>
                <span className="eq-feed-when">{hace(t - l.nace)}</span>
                {l.artefacto && (
                  <Button variant="ghost" className="btn-sm eq-feed-btn"
                    title={`Abre «${l.artefacto}». Solo lectura: no cambia nada.`}
                    onClick={() => setToast(`${l.artefacto} (demo)`)}>
                    <I_ArrowRight size={12} />
                    <span className="eq-feed-btn-t">{l.artefacto}</span>
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ==================== LAS DOS TARJETAS: quién es quién y qué está mirando ==================== */}
      <div className="duo">
        <Card className="eq-card"
          title={<span className="row" style={{ gap: 8 }}><I_Users size={14} style={{ color: 'var(--purple3)' }} /> El equipo, agente por agente</span>}
          action={<Badge tone="muted">{AGENTES.length} agentes</Badge>}
        >
          {/* De a 3 por fila: los 6 entran en dos filas y el bloque respira sin scrollear. */}
          <div className="eq-agentes">
            {equipo.map(e => <FichaAgente key={e.a.id} a={e.a} estado={e.estado} hecho={e.hecho} cuando={e.cuando} setToast={setToast} />)}
          </div>
          <div className="acc-why">
            Cada agente dice <b>qué miró de tu negocio</b>, <b>qué resultó</b> y <b>cuándo</b>.
            Lo que produjo se abre con un clic: no hay resultados sin comprobar.
          </div>
        </Card>

        <Card className="eq-card"
          title={<span className="row" style={{ gap: 8 }}><I_Eye size={14} style={{ color: '#22d3ee' }} /> Qué está investigando del mercado ahora</span>}
          action={<Badge tone="purple">{INVESTIGACION_MERCADO.zona}</Badge>}
        >
          <div className="eq-inv">
            <div className="eq-zona">
              <span style={{ fontSize: 15, flexShrink: 0 }}>📍</span>
              <div style={{ minWidth: 0, flex: '1 1 220px' }}>
                <div className="eq-zona-t">Lux está mirando tu zona: {INVESTIGACION_MERCADO.zona}</div>
                <div className="eq-zona-d" title={INVESTIGACION_MERCADO.zonaDetalle}>{INVESTIGACION_MERCADO.zonaDetalle}</div>
              </div>
              <span className="eq-tag">revisado {hace(edadUltima)}</span>
            </div>

            <div className="eq-frentes">
              {FRENTES_INVESTIGACION.map(f => (
                <div key={f.id} className="eq-frente" style={{ borderLeftColor: f.color }}
                  title={`${f.ancla} · ${f.resultado}`}>
                  <span className="eq-frente-t">{f.t}</span>
                  <span className="eq-frente-v" style={{ color: f.color }}>{f.dato}</span>
                  <span className="eq-frente-r">{f.resultado}</span>
                  <span className="eq-frente-a">{f.cuando}</span>
                </div>
              ))}
            </div>

            <div className="bs" style={{ marginBottom: 1 }}>Los últimos hallazgos, con la hora en que los encontró:</div>
            <div className="eq-hallazgos">
              {HALLAZGOS.map(h => <FilaHallazgo key={h.id} h={h} setToast={setToast} />)}
            </div>
          </div>
        </Card>
      </div>

      {/* ==================== EL PUENTE A MIROFISH ==================== */}
      <div className="eq-puente">
        <span className="eq-puente-t">
          Esto es la <b>investigación del mercado</b>: corre desde el onboarding y no gasta presupuesto.
          Cuando hay una <b>pieza para evaluar</b> (un aviso, un video, una imagen), entra <b>MiroFish</b>:
          los 5 jueces y 500 del público la votan antes de que salga a internet.
        </span>
        <Button variant="ghost" className="btn-sm"
          title="Te lleva a la galería de Campañas, donde están las piezas que MiroFish ya puntuó. No publica nada."
          onClick={verGaleria}>
          <I_Zap size={13} /> Ver la galería de MiroFish <I_ArrowRight size={13} />
        </Button>
      </div>
    </div>
  );
}

// =============================================================================================
// La ficha de un agente: nombre, función llana, estado, qué está haciendo, el resultado, el
// avance de su tarea (que se mueve solo) y el artefacto que dejó.
function FichaAgente({ a, estado, hecho, cuando, setToast }: {
  a: Agente;
  /** El estado de ahora: puede haber cambiado solo desde que abriste el panel. */
  estado: Agente['estado'];
  /** Cuánto lleva hecho de su tarea: avanza solo. */
  hecho: number;
  /** Su hora, ya corrida por el reloj. */
  cuando: string;
  setToast: (t: string) => void;
}) {
  const clase = CLASE_ESTADO[estado];
  const pct = Math.round((hecho / a.tarea.total) * 100);
  const espera = estado === 'esperando_ok';
  return (
    <div className={`eq-ag ${clase}`}>
      <div className="eq-ag-top">
        <span className="eq-av" style={{ background: a.color }}>{a.nombre[0]}</span>
        <span className="eq-nm">{a.nombre}</span>
        <span className={`eq-est ${clase}`}>{ESTADO_LB[estado]}</span>
      </div>
      <div className="eq-rol" title={a.rol}>{a.rol}</div>
      <div className="eq-fn" title={a.funcion}>{a.funcion}</div>
      <div className="eq-ahora" title={`${a.accion} · ${cuando}`}>
        <b>Ahora: </b>{a.accion} <span className="eq-cz">· {cuando}</span>
      </div>
      <div className="eq-ancla" title={a.ancla}>{a.ancla}</div>
      <div className="eq-res" title={a.resultado}><b>→ </b>{a.resultado}</div>
      {/* El avance de la tarea: la barra se llena sola mientras mirás la pantalla. */}
      <div className="eq-prog" title={`${a.nombre}: ${hecho} de ${a.tarea.total} ${a.tarea.etiqueta}. Avanza solo.`}>
        <span className="eq-prog-t">{hecho} de {a.tarea.total} {a.tarea.etiqueta}</span>
        <span className="eq-prog-b"><i style={{ width: `${pct}%`, background: a.color }} /></span>
      </div>
      <Button variant="ghost" className="btn-sm eq-ag-btn"
        title={espera ? tituloArtefacto(a.artefactoNombre, estado) : tituloArtefacto(a.artefactoNombre, estado)}
        onClick={() => setToast(`Abrimos «${a.artefactoNombre}» (demo)`)}>
        <I_ArrowRight size={12} /> <span className="eq-ag-btn-t">{a.artefactoNombre}</span>
      </Button>
    </div>
  );
}

// =============================================================================================
// El hallazgo: una sola línea, con la hora, quién lo encontró, qué encontró y el artefacto.
// El detalle completo (por qué le importa al negocio) viaja en el title: no se pierde nada.
function FilaHallazgo({ h, setToast }: { h: Hallazgo; setToast: (t: string) => void }) {
  return (
    <div className="eq-hall" title={`${h.agente} · ${h.texto} — ${h.detalle}`}>
      <span className="eq-hall-when">{h.cuando}</span>
      <div className="eq-hall-b">
        <b style={{ color: h.color }}>{h.agente}</b> · {h.texto}
      </div>
      <Button variant="ghost" className="btn-sm eq-hall-btn"
        title={`Abre «${h.artefacto}». Solo lectura: no cambia nada.`}
        onClick={() => setToast(`${h.artefacto} (demo)`)}>
        <I_ArrowRight size={12} /> {h.artefacto}
      </Button>
    </div>
  );
}

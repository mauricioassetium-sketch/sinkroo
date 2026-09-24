import { useEffect, useState } from 'react';
import { Card, Badge, Button } from './ui';
import { I_Zap, I_ArrowRight, I_Users, I_Eye } from './icons';
import {
  AGENTES, INVESTIGACION_MERCADO, FRENTES_INVESTIGACION, HALLAZGOS,
  type Agente, type Hallazgo,
} from '../data/demo';

// =============================================================================================
// EL EQUIPO TRABAJANDO — la investigación del mercado, hecha por los 6 agentes
//
// Esto NO es la evaluación de una pieza: eso es MiroFish (los 5 jueces + 500 del público) y entra
// recién cuando hay una pieza para evaluar. Acá se ve la otra mitad, la que corre SIEMPRE: el
// motor se puso solo cuando el usuario terminó el onboarding y desde entonces revisa el mercado
// de su negocio cada 15 minutos. Lux, Rex, Nia, Kai, Sol y Rumi, uno por fila, con lo que están
// haciendo ahora y el artefacto que dejaron.
//
// REGLA DE ORO: cada línea que se muestra tiene (1) algo del negocio del usuario, (2) un resultado
// concreto y (3) una hora. Y el resultado se abre: no hay estados vacíos tipo "analizando…".
// =============================================================================================

const CADENCIA_SEG = INVESTIGACION_MERCADO.cadenciaMin * 60;
/** Segundos que faltan para la próxima vuelta al abrir el panel: la última fue hace 4 min. */
const FALTAN_INICIAL = CADENCIA_SEG - 4 * 60;

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

/** El botón abre el artefacto: lo dice el título, y aclara que no cambia nada. */
function tituloArtefacto(nombre: string, estado: Agente['estado']) {
  return estado === 'esperando_ok'
    ? `Abre «${nombre}». Todavía no gasta: para publicarla tenés que aprobarla vos.`
    : `Abre «${nombre}». Solo lectura: no cambia nada.`;
}

export function MotorEnVivo({ setToast, irAGaleria }: {
  setToast: (t: string) => void;
  /** Lleva a la galería de Campañas, donde viven las piezas que MiroFish ya puntuó. */
  irAGaleria?: () => void;
}) {
  const trabajando = AGENTES.filter(a => a.estado === 'trabajando').length;
  const esperando = AGENTES.filter(a => a.estado === 'esperando_ok').length;
  const alDia = AGENTES.filter(a => a.estado === 'al_dia').length;

  // El reloj del motor: la última revisión fue hace 4 min y la próxima cae cada 15. El contador
  // avanza de verdad, así el bloque se ve andando y no congelado.
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT(x => x + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const faltan = FALTAN_INICIAL - (t % CADENCIA_SEG);
  const vueltas = Math.floor(t / CADENCIA_SEG);
  const mmss = `${Math.floor(faltan / 60)}:${String(faltan % 60).padStart(2, '0')}`;

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
          <span>última revisión del mercado: <b>{INVESTIGACION_MERCADO.ultimaRevision}</b></span>
          <span className="eq-sep">·</span>
          <span className="eq-prox">próxima vuelta en <b>{mmss}</b></span>
          <span className="eq-count">{INVESTIGACION_MERCADO.revisiones + vueltas} revisiones desde que arrancó</span>
        </div>
      </div>

      {/* ==================== LAS DOS TARJETAS: quién es quién y qué está mirando ==================== */}
      <div className="duo">
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Users size={14} style={{ color: 'var(--purple3)' }} /> El equipo, agente por agente</span>}
          action={<Badge tone="muted">{AGENTES.length} agentes</Badge>}
        >
          <div className="eq-lista">
            {AGENTES.map(a => <FilaAgente key={a.id} a={a} setToast={setToast} />)}
          </div>
          <div className="acc-why">
            Cada agente dice <b>qué miró de tu negocio</b>, <b>qué resultó</b> y <b>cuándo</b>.
            Lo que produjo se abre con un clic: no hay resultados sin comprobar.
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Eye size={14} style={{ color: '#22d3ee' }} /> Qué está investigando del mercado ahora</span>}
          action={<Badge tone="purple">{INVESTIGACION_MERCADO.zona}</Badge>}
        >
          <div className="eq-inv">
            <div className="eq-zona">
              <span style={{ fontSize: 18, flexShrink: 0 }}>📍</span>
              <div style={{ minWidth: 0 }}>
                <div className="eq-zona-t">Lux está mirando tu zona: {INVESTIGACION_MERCADO.zona}</div>
                <div className="eq-zona-d">{INVESTIGACION_MERCADO.zonaDetalle}</div>
              </div>
              <span className="eq-tag">revisado {INVESTIGACION_MERCADO.ultimaRevision}</span>
            </div>

            <div className="eq-frentes">
              {FRENTES_INVESTIGACION.map(f => (
                <div key={f.id} className="eq-frente" style={{ borderLeftColor: f.color }}>
                  <div className="eq-frente-top">
                    <span className="eq-frente-t">{f.t}</span>
                    <span className="eq-frente-v" style={{ color: f.color }}>{f.dato}</span>
                  </div>
                  <div className="eq-frente-r">{f.resultado}</div>
                  <div className="eq-frente-a">{f.ancla} · {f.cuando}</div>
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
function FilaAgente({ a, setToast }: { a: Agente; setToast: (t: string) => void }) {
  const clase = CLASE_ESTADO[a.estado];
  return (
    <div className={`eq-ag ${clase}`}>
      <div className="eq-ag-top">
        <span className="eq-av" style={{ background: a.color }}>{a.nombre[0]}</span>
        <span className="eq-nm">{a.nombre}</span>
        <span className="eq-rol">{a.rol}</span>
        <span className={`eq-est ${clase}`}>{ESTADO_LB[a.estado]}</span>
      </div>
      <div className="eq-fn">{a.funcion}</div>
      <span className="eq-ancla">{a.ancla}</span>
      <div className="eq-ahora"><b>Ahora: </b>{a.accion} <span className="eq-cz">· {a.cuando}</span></div>
      <div className="eq-res"><b>→ </b>{a.resultado}</div>
      <Button variant="ghost" className="btn-sm"
        title={tituloArtefacto(a.artefactoNombre, a.estado)}
        onClick={() => setToast(`Abrimos «${a.artefactoNombre}» (demo)`)}>
        <I_ArrowRight size={12} /> {a.artefactoNombre}
      </Button>
    </div>
  );
}

// =============================================================================================
function FilaHallazgo({ h, setToast }: { h: Hallazgo; setToast: (t: string) => void }) {
  return (
    <div className="eq-hall">
      <span className="eq-hall-when">{h.cuando}</span>
      <div className="eq-hall-b">
        <div className="eq-hall-t"><b style={{ color: h.color }}>{h.agente}</b> · {h.texto}</div>
        <div className="eq-hall-d">{h.detalle}</div>
      </div>
      <Button variant="ghost" className="btn-sm eq-hall-btn"
        title={`Abre «${h.artefacto}». Solo lectura: no cambia nada.`}
        onClick={() => setToast(`${h.artefacto} (demo)`)}>
        <I_ArrowRight size={12} /> {h.artefacto}
      </Button>
    </div>
  );
}

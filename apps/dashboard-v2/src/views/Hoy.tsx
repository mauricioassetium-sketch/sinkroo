import { useState } from 'react';
import { Card, Badge, Button } from '../components/ui';
import { KpiRow, type Vista } from '../components/Layout';
import { I_Check, I_ArrowRight, I_Wallet, I_Eye, I_Vote, I_Chat, I_Megaphone, I_Question, I_Credit, I_Users, I_Star, I_Sun } from '../components/icons';
import {
  TENANT, ALARMAS, DECISIONES, AGENTES, NUMEROS, MIENTRAS_NO_ESTABAS, BITACORA, MODOS, TAREAS_EXCLUIDAS,
  type Modo, type Severidad,
} from '../data/demo';

const SEV_LB: Record<Severidad, string> = { critico: 'CRÍTICO', atencion: 'ATENCIÓN', oportunidad: 'OPORTUNIDAD', info: 'RESUELTO SOLO' };

export function ViewHoy({ setToast, setVista, modo }: { setToast: (t: string) => void; setVista: (v: Vista) => void; modo: Modo }) {
  const [alarmasExtra, setAlarmasExtra] = useState(false);
  const [hechas, setHechas] = useState<string[]>([]);
  const [bitacoraCompleta, setBitacoraCompleta] = useState(false);

  const alarmas = alarmasExtra ? ALARMAS : ALARMAS.slice(0, 3);
  const pendientes = DECISIONES.filter(d => !hechas.includes(d.id));
  const modoNombre = MODOS.find(m => m.key === modo)?.nombre ?? '';

  const resolver = (id: string, txt: string) => {
    setHechas([...hechas, id]);
    setToast(txt);
  };

  return (
    <>
      {/* ============ ENCABEZADO ============ */}
      <div className="card" style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <div className="ttl" style={{ fontSize: 22 }}>Buen día, {TENANT.usuario.split(' ')[0]} 👋</div>
          <div className="sub" style={{ marginTop: 4, lineHeight: 1.5 }}>
            Mientras dormías el motor trabajó <b style={{ color: 'var(--green)' }}>3 acciones</b> y evitó ~$180 de gasto sin retorno.
            Hoy hay <b style={{ color: 'var(--amber)' }}>{pendientes.length} decisiones</b> que sólo podés tomar vos.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Badge tone="purple">Modo {modoNombre}</Badge>
          <Badge tone="green">6 agentes activos</Badge>
          <Badge tone="amber">{TENANT.diasAutonomia} días de autonomía</Badge>
        </div>
      </div>

      {/* ============ 0 · MIENTRAS NO ESTABAS (protagonista en modo Automático) ============ */}
      {modo === 'auto' && <MientrasNoEstabas primera />}

      {/* ============ 1 · ALARMAS ============ */}
      <div className="csec">
        <span className="csec-n">1</span>
        <span className="csec-t">Alarmas</span>
        <span className="csec-c">{ALARMAS.filter(a => a.severidad === 'critico').length}</span>
        <span className="csec-s">Lo que se rompe o pierde plata ahora</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        {alarmas.map(a => <Alarma key={a.id} a={a} setToast={setToast} />)}
      </div>
      {!alarmasExtra && (
        <div style={{ marginTop: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setAlarmasExtra(true)}>
            Ver {ALARMAS.length - 3} alarmas más <I_ArrowRight size={13} />
          </button>
        </div>
      )}

      {/* ============ 2 · TU DECISIÓN ============ */}
      <div className="csec">
        <span className="csec-n">2</span>
        <span className="csec-t">Tu decisión</span>
        {pendientes.length > 0
          ? <span className="csec-c amber">{pendientes.length}</span>
          : <span className="badge badge-green" style={{ fontSize: 10 }}>al día</span>}
        <span className="csec-s">Lo que el motor dejó listo y espera tu OK</span>
      </div>
      {pendientes.length === 0 ? (
        <Card>
          <div className="empty-note">
            <I_Check size={15} /> Nada te espera. El motor siguió trabajando solo.
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {pendientes.map(d => <Decision key={d.id} d={d} onResolver={resolver} />)}
        </div>
      )}

      {/* ============ 3 · EL MOTOR ============ */}
      <div className="csec">
        <span className="csec-n">3</span>
        <span className="csec-t">El motor</span>
        <span className="csec-c purple">en vivo</span>
        <span className="csec-s">Qué está haciendo cada agente, sobre qué tuyo y qué produjo</span>
      </div>
      <Card action={<span className="tiny muted">todo trazable a un evento real</span>}>
        <div className="work">
          {AGENTES.map(a => <AgenteRow key={a.id} a={a} setToast={setToast} />)}
        </div>
      </Card>

      {/* ============ 4 · LOS NÚMEROS ============ */}
      <div className="csec">
        <span className="csec-n">4</span>
        <span className="csec-t">Los números</span>
        <span className="csec-s">Dinero · alcance · calidad · conversaciones · recursos</span>
      </div>
      <div className="numbar">
        {NUMEROS.map((n, i) => (
          <KpiRow key={i} icon={ICONO_AREA[n.area] ?? <I_Star size={14} />} label={n.label} value={n.valor} sub={`${n.delta} vs mes pasado`} color={n.color} />
        ))}
      </div>

      {/* ============ 5 · MIENTRAS NO ESTABAS ============ */}
      {modo !== 'auto' && <MientrasNoEstabas />}

      {/* ============ 6 · LA BITÁCORA ============ */}
      <div className="csec">
        <span className="csec-n">6</span>
        <span className="csec-t">La bitácora</span>
        <span className="csec-s">Todo lo que se hizo, con su porqué y su deshacer</span>
      </div>
      <Card
        action={
          <button className="btn btn-ghost btn-sm" onClick={() => setBitacoraCompleta(!bitacoraCompleta)}>
            {bitacoraCompleta ? 'Ver menos' : 'Ver toda la semana'}
          </button>
        }
      >
        <div className="tl">
          {(bitacoraCompleta ? BITACORA : BITACORA.slice(0, 5)).map(b => (
            <div key={b.id} className="tl-item">
              <span className="tl-dot" style={{ background: b.color }} />
              <span className="tl-time">{b.cuando}</span>
              <div className="tl-body">
                <div className="tl-text">
                  <b style={{ color: b.color }}>{b.agente}</b> {b.texto}
                </div>
                <div className="tl-anchor">
                  <span>📎 {b.ancla}</span>
                  {b.artefacto && (
                    <span className="tl-undo" onClick={() => setToast(`Abriendo: ${b.artefacto} (demo)`)}>{b.artefacto}</span>
                  )}
                  {b.autonomia === 'auto' && <span className="tiny muted">decidido solo</span>}
                  {b.autonomia === 'shared' && <span className="tiny muted">con tu OK</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ============ LO QUE ESTE MODELO YA NO TE PIDE ============ */}
      <div className="csec">
        <span className="csec-n">✓</span>
        <span className="csec-t">Lo que este modelo ya no te pide</span>
        <span className="csec-s">Comparado con el dashboard anterior</span>
      </div>
      <Card>
        <div className="strike-list">
          {TAREAS_EXCLUIDAS.map((t, i) => (
            <div key={i} className="strike-item">
              <I_Check size={14} />
              <span>{t}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="row" style={{ marginTop: 20, gap: 10, flexWrap: 'wrap' }}>
        <Button onClick={() => setVista('conversaciones')}>
          <I_Chat size={14} /> Ver conversaciones
        </Button>
        <Button variant="outline" onClick={() => setVista('campanas')}>
          <I_Megaphone size={14} /> Ver campañas
        </Button>
        <Button variant="ghost" onClick={() => setVista('cuenta')}>
          Ajustar cuánto decide la IA <I_ArrowRight size={13} />
        </Button>
      </div>
      <div className="tiny muted" style={{ marginTop: 14, display: 'flex', gap: 7, alignItems: 'center' }}>
        <I_Question size={13} /> Todo lo que ves acá está trazado a un evento real del motor. En la demo los datos son ilustrativos, pero cada bloque tiene su contraparte en el back.
      </div>
    </>
  );
}

// =============================================================================================
// ALARMA — cuatro partes: qué pasó · por qué importa en $ · qué sugiere · qué podés hacer
// =============================================================================================
function Alarma({ a, setToast }: { a: typeof ALARMAS[number]; setToast: (t: string) => void }) {
  return (
    <div className={`alarm ${a.severidad}`}>
      <div className="alarm-head">
        <span className={`alarm-sev ${a.severidad}`}>{SEV_LB[a.severidad]}</span>
        <span className="alarm-title">{a.titulo}</span>
        <span className="alarm-when">{a.cuando}</span>
      </div>
      <div className="alarm-money">
        <span className="ico" style={{ color: 'var(--amber)' }}><I_Wallet size={14} /></span>
        <span><b style={{ color: 'var(--amber)' }}>Por qué importa: </b>{a.impacto}</span>
      </div>
      <div className="alarm-sug">
        <b>Qué sugiere la IA: </b>{a.sugerencia}
      </div>
      <div className="alarm-acts">
        {a.acciones.map((ac, i) => (
          <Button key={i} variant={i === 0 ? 'primary' : 'ghost'} className="btn-sm"
            onClick={() => setToast(`${ac} → resuelto (demo)`)}>
            {i === 0 ? <I_Check size={13} /> : null} {ac}
          </Button>
        ))}
        <span className="alarm-src">{a.origen}</span>
      </div>
    </div>
  );
}

// =============================================================================================
// DECISIÓN — se resuelve en el lugar, sin navegar
// =============================================================================================
function Decision({ d, onResolver }: { d: typeof DECISIONES[number]; onResolver: (id: string, t: string) => void }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="dec">
      <div className="dec-head">
        <span className="dec-av" style={{ background: d.agenteColor }}>{d.agente[0]}</span>
        <span className="dec-agent" style={{ color: d.agenteColor }}>{d.agente}</span>
        <button className="btn btn-ghost btn-sm" onClick={() => setAbierto(!abierto)}>
          <I_Eye size={13} /> {abierto ? 'Ocultar el panel' : 'Ver el panel de expertos'}
        </button>
        <span className="dec-since">espera desde hace 9 min</span>
      </div>
      <div className="dec-title">{d.titulo}</div>
      <div className="dec-det">{d.detalle}</div>
      <div className="dec-impact">
        <b style={{ color: 'var(--green)' }}>Si lo aprobás: </b>{d.impacto}
      </div>

      {abierto && (
        <div className="dec-panel">
          <div className="dec-panel-top">
            <I_Vote size={14} style={{ color: 'var(--purple3)' }} />
            <b>El panel revisó esta acción antes de proponértela</b>
            <Badge tone={d.panel.dudaron === 0 ? 'green' : 'amber'}>
              {d.panel.aprobaron} de {d.panel.total} a favor
            </Badge>
          </div>
          <div className="dec-obj">
            {d.panel.dudaron > 0 ? <><b>El más duro dijo:</b> «{d.panel.objeccion}»</> : d.panel.objeccion}
          </div>
        </div>
      )}

      <div className="dec-acts">
        {d.acciones.map((ac, i) => (
          <Button key={i} variant={i === 0 ? 'primary' : 'ghost'} className="btn-sm"
            onClick={() => onResolver(d.id, `${ac}: ${d.titulo} (demo)`)}>
            {i === 0 ? <I_Check size={13} /> : null} {ac}
          </Button>
        ))}
      </div>
    </div>
  );
}

// =============================================================================================
// AGENTE — las tres anclas: algo tuyo + resultado + tiempo
// =============================================================================================
function AgenteRow({ a, setToast }: { a: typeof AGENTES[number]; setToast: (t: string) => void }) {
  const clase = a.estado === 'trabajando' ? 'working' : a.estado === 'esperando_ok' ? 'waiting' : 'idle';
  return (
    <div className={`work-row ${clase}`}>
      <div className="work-av" style={{ background: a.color }}>{a.nombre[0]}</div>
      <div className="work-body">
        <div className="work-top">
          <span className="work-name">{a.nombre}</span>
          <span className="work-role">{a.rol}</span>
          <span className="work-anchor">{a.ancla}</span>
          {a.estado === 'trabajando' && <Badge tone="green">trabajando</Badge>}
          {a.estado === 'esperando_ok' && <Badge tone="amber">espera tu OK</Badge>}
          {a.estado === 'al_dia' && <Badge tone="muted">al día</Badge>}
        </div>
        <div className="work-what">{a.accion}</div>
        <div className="work-res"><b>→ </b>{a.resultado}</div>
        <div className="work-foot">
          <Button variant="ghost" className="btn-sm" onClick={() => setToast(`${a.artefacto} (demo)`)}>
            <I_ArrowRight size={12} /> {a.artefacto}
          </Button>
          <span className="tiny muted">decide {a.autonomia === 'auto' ? 'solo' : a.autonomia === 'shared' ? 'con tu OK' : 'bajo tu mano'}</span>
          <span className="work-when">{a.cuando}</span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================================
// MIENTRAS NO ESTABAS
// =============================================================================================
function MientrasNoEstabas({ primera = false }: { primera?: boolean }) {
  const m = MIENTRAS_NO_ESTABAS;
  return (
    <>
      {primera && (
        <div className="csec">
          <span className="csec-n">★</span>
          <span className="csec-t">Mientras no estabas</span>
          <span className="csec-s">Estás en Automático: el motor trabajó solo y te lo cuenta</span>
        </div>
      )}
      {!primera && (
        <div className="csec">
          <span className="csec-n">5</span>
          <span className="csec-t">Mientras no estabas</span>
          <span className="csec-s">Desde {m.desde}</span>
        </div>
      )}
      <div className="mwb">
        <div className="mwb-top">
          <I_Sun size={16} style={{ color: 'var(--green)' }} />
          <b style={{ fontSize: 14 }}>El motor trabajó sin vos</b>
          <Badge tone="green">{m.acciones.length} acciones autónomas</Badge>
          {m.esperan > 0 && <Badge tone="amber">{m.esperan} decisión espera tu OK</Badge>}
        </div>
        <div className="mwb-grid">
          <div className="mwb-k">
            <div className="mwb-k-lb">Gasto que evitó</div>
            <div className="mwb-k-v" style={{ color: 'var(--green)' }}>$180</div>
          </div>
          <div className="mwb-k">
            <div className="mwb-k-lb">Gasto que hizo</div>
            <div className="mwb-k-v">{m.gasto}</div>
          </div>
          <div className="mwb-k">
            <div className="mwb-k-lb">Ventas atribuidas</div>
            <div className="mwb-k-v" style={{ color: 'var(--green)' }}>{m.ventas}</div>
          </div>
        </div>
        <div className="mwb-list">
          {m.acciones.map((ac, i) => (
            <div key={i} className="mwb-item">
              <span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Check size={14} /></span>
              <span className="tx">
                {ac.txt}
                <small>{ac.detalle}</small>
              </span>
              <span className="hr">{ac.cuando}</span>
              {ac.undo && <span className="tl-undo">deshacer</span>}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

const ICONO_AREA: Record<string, any> = {
  Dinero: <I_Wallet size={14} />,
  Alcance: <I_Users size={14} />,
  Calidad: <I_Star size={14} />,
  Conversaciones: <I_Chat size={14} />,
  Recursos: <I_Credit size={14} />,
};

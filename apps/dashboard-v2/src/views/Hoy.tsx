import { useState } from 'react';
import { Card, Badge, Button } from '../components/ui';
import { MotorEnVivo } from '../components/MotorEnVivo';
import { Bars, Ring, BarRow, Metrica } from '../components/viz';
import { SinkrooMark, I_Check, I_ArrowRight, I_Wallet, I_Eye, I_Vote, I_Chat, I_Megaphone, I_Question, I_Credit, I_Users, I_Star, I_Sun, I_Zap, I_Trend, I_Clock } from '../components/icons';
import type { Vista } from '../components/Layout';
import {
  TENANT, ALARMAS, DECISIONES, AGENTES, NUMEROS, MIENTRAS_NO_ESTABAS, BITACORA, MODOS, TAREAS_EXCLUIDAS, CONSECUENCIA,
  MES, PANEL_PIEZAS,
  type Modo, type Severidad,
} from '../data/demo';

const SEV_LB: Record<Severidad, string> = { critico: 'CRÍTICO', atencion: 'ATENCIÓN', oportunidad: 'OPORTUNIDAD', info: 'RESUELTO SOLO' };

export function ViewHoy({ setToast, setVista, modo }: { setToast: (t: string) => void; setVista: (v: Vista) => void; modo: Modo }) {
  const [hechas, setHechas] = useState<string[]>([]);
  const [alarmasExtra, setAlarmasExtra] = useState(false);
  const [bitacoraCompleta, setBitacoraCompleta] = useState(false);

  const alarmas = alarmasExtra ? ALARMAS : ALARMAS.slice(0, 3);
  const pendientes = DECISIONES.filter(d => !hechas.includes(d.id));
  const modoNombre = MODOS.find(m => m.key === modo)?.nombre ?? '';
  const criticas = ALARMAS.filter(a => a.severidad === 'critico').length;
  const resolver = (id: string, txt: string) => { setHechas([...hechas, id]); setToast(txt); };

  return (
    <div className="dash">
      {/* ============================== HERO ============================== */}
      <div className="hero card">
        <div className="hero-side">
          <div className="hero-greet">
            <SinkrooMark size={104} radius={52} />
            <div>
              <div className="hero-live" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="dot-live" /> TU AGENTE ESTÁ ACTIVO
                <button className="tour-start-btn" title="Recorré el panel con Sinkroo"
                  onClick={() => setToast('Tour guiado del panel (demo)')}>▶ Iniciar tour</button>
              </div>
              <div className="hdr-t" style={{ fontSize: 24, lineHeight: 1.2 }}>
                Hola {TENANT.usuario.split(' ')[0]}, soy <span className="grad-text" style={{ fontWeight: 900 }}>Sinkroo</span> 👋
              </div>
              <div className="hdr-s">Te estoy vigilando la tienda 24/7. Mirá lo que hice hoy.</div>
            </div>
          </div>
        </div>
        <div className="hero-metrics">
          <div className="hero-metric"><div className="metric">47</div><div className="m-label">Ventas</div><div className="m-desc">concretadas hoy</div></div>
          <div className="hero-metric"><div className="metric">3.8x</div><div className="m-label">ROAS</div><div className="m-desc">retorno por cada $1 invertido</div></div>
          <div className="hero-metric"><div className="metric">84</div><div className="m-label">Score</div><div className="m-desc">calidad del creativo aprobado</div></div>
        </div>
        <div className="hero-ad">
          <div className="hero-ad-tag">PUBLICIDAD</div>
          <div className="hero-ad-title">Más marcas, una cuenta</div>
          <div className="hero-ad-sub">Con Sinkroo Agency, operás hasta 8 marcas desde una sola cuenta, white label incluido.</div>
          <button className="hero-ad-btn" title="Ver los planes de agencia" onClick={() => setVista('cuenta')}>Ver planes →</button>
        </div>
      </div>

      {/* ====================== EL MOTOR ANDANDO ====================== */}
      <MotorEnVivo setToast={setToast} />

      {/* ====================== FILA 1: ACCIÓN ====================== */}
      <div className="csec">
        <span className="csec-n">1</span>
        <span className="csec-t">Lo que necesita tu atención</span>
        <span className="csec-c">{criticas}</span>
        <span className="csec-s">Cada botón dice qué hace antes de que lo toques</span>
      </div>
      <div className="duo">
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Zap size={14} style={{ color: 'var(--red)' }} /> Alarmas</span>}
          action={<Badge tone="red">{criticas} críticas</Badge>}
        >
          <div className="col-stack">
            {alarmas.map(a => (
              <div key={a.id} className={`alarm ${a.severidad}`}>
                <div className="alarm-head">
                  <span className={`alarm-sev ${a.severidad}`}>{SEV_LB[a.severidad]}</span>
                  <span className="alarm-when">{a.cuando}</span>
                </div>
                <div className="alarm-title" style={{ minWidth: 0 }}>{a.titulo}</div>
                <div className="alarm-money">
                  <span className="ico" style={{ color: 'var(--amber)' }}><I_Wallet size={14} /></span>
                  <span><b style={{ color: 'var(--amber)' }}>Por qué importa: </b>{a.impacto}</span>
                </div>
                <div className="alarm-sug"><b>Qué sugiere la IA: </b>{a.sugerencia}</div>
                <div className="alarm-acts">
                  {a.acciones.map((ac, i) => (
                    <Button key={i} variant={i === 0 ? 'primary' : 'ghost'} className="btn-sm"
                      title={CONSECUENCIA[a.id] ?? `Ejecuta: ${ac}`}
                      onClick={() => setToast(`${ac} → ${a.titulo} (demo)`)}>
                      {i === 0 ? <I_Check size={13} /> : null} {ac}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
            {!alarmasExtra && (
              <Button variant="ghost" className="btn-sm" title="Muestra las 3 alarmas restantes, incluidas las oportunidades"
                onClick={() => setAlarmasExtra(true)}>
                Ver {ALARMAS.length - 3} alarmas más <I_ArrowRight size={13} />
              </Button>
            )}
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Vote size={14} style={{ color: 'var(--amber)' }} /> Tu decisión</span>}
          action={pendientes.length > 0 ? <Badge tone="amber">{pendientes.length} esperan</Badge> : <Badge tone="green">al día</Badge>}
        >
          {pendientes.length === 0 ? (
            <div className="col-empty"><I_Check size={15} /> Nada te espera. El motor siguió trabajando solo.</div>
          ) : (
            <div className="col-stack">
              {pendientes.map(d => <Decision key={d.id} d={d} onResolver={resolver} />)}
            </div>
          )}
        </Card>
      </div>

      {/* ====================== FILA 2: EL MOTOR Y LOS NÚMEROS ====================== */}
      <div className="csec">
        <span className="csec-n">2</span>
        <span className="csec-t">El motor y los números</span>
        <span className="csec-s">Quién está trabajando y cómo van las métricas del modelo</span>
      </div>
      <div className="duo">
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Users size={14} style={{ color: 'var(--purple3)' }} /> El motor, agente por agente</span>}
          action={<Badge tone="green">3 trabajando</Badge>}
        >
          <div className="work">
            {AGENTES.map(a => <AgenteRow key={a.id} a={a} setToast={setToast} />)}
          </div>
          <div className="acc-why">
            Cada botón abre <b>el artefacto</b> que produjo ese agente: el informe, las variantes o el porqué.
            Nada de acá es un estado — es trabajo terminado y revisable.
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Trend size={14} style={{ color: 'var(--green)' }} /> El modelo en números</span>}
          action={<Badge tone="purple">este mes</Badge>}
        >
          <div className="duo">
            {NUMEROS.map((n, i) => (
              <Metrica key={i} label={n.label} sub={n.area} valor={n.valor} delta={n.delta}
                serie={n.serie} color={n.color} up={n.up} />
            ))}
          </div>
          <div className="acc-why">
            Todos salen de tus conexiones reales: Meta Ads, tu WhatsApp y tu tienda.{' '}
            <b>Días de autonomía</b> es cuánto puede seguir trabajando el motor con los créditos que tenés.
          </div>
        </Card>
      </div>

      {/* ====================== FILA 3: EVOLUCIÓN Y CALIDAD ====================== */}
      <div className="csec">
        <span className="csec-n">3</span>
        <span className="csec-t">Cómo viene el mes y tu calidad</span>
        <span className="csec-s">Lo que creció y qué tan buenas son tus piezas</span>
      </div>
      <div className="duo">
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Trend size={14} style={{ color: 'var(--green)' }} /> Ventas por mes</span>}
          action={<Badge tone="green">{MES.acumulado} acumulado</Badge>}
        >
          <Bars data={MES.ventas} labels={MES.labels} color="#22c55e" fmt={v => `${(v / 1000).toFixed(1)}K`} />
          <div className="datos-row" style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
            <div className="dato"><span className="dato-l">Promedio por mes</span><span className="dato-v">{MES.promedio}</span></div>
            <div className="dato"><span className="dato-l">Último mes</span><span className="dato-v" style={{ color: 'var(--green)' }}>$4.280</span></div>
            <div className="dato"><span className="dato-l">Crecimiento</span><span className="dato-v" style={{ color: 'var(--green)' }}>+28%</span></div>
          </div>
          <div className="acc-why">Cada barra es un mes cerrado. <b>El crecimiento es real</b>: sale de las ventas que entraron por tus conexiones.</div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Star size={14} style={{ color: 'var(--purple3)' }} /> La calidad de tus piezas</span>}
          action={<Badge tone="green">sobre 100</Badge>}
        >
          <div className="row" style={{ gap: 20, marginBottom: 16 }}>
            <Ring valor={84} label="SCORE" color="var(--green)" sub="la pieza aprobada" />
            <div className="dato" style={{ flex: 1 }}>
              <span className="dato-l">Qué significa</span>
              <span className="bs">
                Es el promedio del panel de 5 expertos. Arriba de <b style={{ color: 'var(--green)' }}>80</b> se publica,
                entre 60 y 80 se revisa, abajo de 60 se descarta.
              </span>
            </div>
          </div>
          {PANEL_PIEZAS.map(p => {
            const c = p.score >= 80 ? 'var(--green)' : p.score >= 60 ? 'var(--amber)' : 'var(--red)';
            return (
              <div key={p.titulo} style={{ padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                <div className="row spread" style={{ marginBottom: 6 }}>
                  <span className="bt" style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.titulo}</span>
                  <span style={{ fontWeight: 900, fontSize: 14, color: c, flexShrink: 0 }}>{p.score}</span>
                </div>
                <BarRow valor={p.score} max={100} color={c} />
              </div>
            );
          })}
          <div className="acc-why">
            <b>Una pieza que no pasa el panel nunca se publica.</b> Ahí está el ahorro: el dinero se gasta después de que el mercado la aprobó, no antes.
          </div>
        </Card>
      </div>

      {/* ====================== FILA 4: AUTONOMÍA Y MEMORIA ====================== */}
      <div className="csec">
        <span className="csec-n">4</span>
        <span className="csec-t">Autonomía y memoria</span>
        <span className="csec-s">Qué hizo solo y todo lo que podés revisar</span>
      </div>
      <div className="duo">
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Sun size={14} style={{ color: 'var(--green)' }} /> Mientras no estabas</span>}
          action={<Badge tone="green">modo {modoNombre}</Badge>}
        >
          <MientrasNoEstabas modo={modo} />
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Clock size={14} style={{ color: 'var(--purple3)' }} /> La bitácora</span>}
          action={
            <Button variant="ghost" className="btn-sm" title="Muestra todo lo que hizo el motor en la semana"
              onClick={() => setBitacoraCompleta(!bitacoraCompleta)}>
              {bitacoraCompleta ? 'Ver menos' : 'Ver la semana'}
            </Button>
          }
        >
          <div className="tl">
            {(bitacoraCompleta ? BITACORA : BITACORA.slice(0, 5)).map(b => (
              <div key={b.id} className="tl-item">
                <span className="tl-dot" style={{ background: b.color }} />
                <span className="tl-time">{b.cuando}</span>
                <div className="tl-body">
                  <div className="tl-text"><b style={{ color: b.color }}>{b.agente}</b> {b.texto}</div>
                  <div className="tl-anchor">
                    <span>📎 {b.ancla}</span>
                    {b.artefacto && <span className="tl-undo" onClick={() => setToast(`${b.artefacto} (demo)`)}>{b.artefacto}</span>}
                    {b.autonomia === 'auto' && <span className="tiny muted">decidido solo</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="acc-why">
            <b>Deshacer</b> aparece solo en las acciones reversibles y dura 24 h. Es lo que hace seguro el modo Automático:
            si el motor se equivoca, el costo es un clic.
          </div>
        </Card>
      </div>

      {/* ====================== FILA 5: CIERRE ====================== */}
      <div className="duo" style={{ marginTop: 16 }}>
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Check size={14} style={{ color: 'var(--green)' }} /> Lo que este modelo ya no te pide</span>}
          action={<Badge tone="muted">vs. el dashboard anterior</Badge>}
        >
          <div className="strike-list">
            {TAREAS_EXCLUIDAS.map((t, i) => (
              <div key={i} className="strike-item"><I_Check size={14} /><span>{t}</span></div>
            ))}
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Question size={14} style={{ color: 'var(--purple3)' }} /> Por dónde seguir</span>}
        >
          <div className="duo">
            <Button onClick={() => setVista('campanas')} title="Ver tus campañas y el panel de expertos de cada pieza">
              <I_Megaphone size={14} /> Campañas
            </Button>
            <Button variant="outline" onClick={() => setVista('conversaciones')} title="Ver los chats que atienden tus agentes">
              <I_Chat size={14} /> Conversaciones
            </Button>
            <Button variant="ghost" onClick={() => setVista('mercado')} title="Qué está haciendo tu competencia ahora">
              <I_Trend size={14} /> Mercado
            </Button>
            <Button variant="ghost" onClick={() => setVista('cuenta')} title="Elegir cuánto decide la IA y cuánto decidís vos">
              <I_Credit size={14} /> Autonomía
            </Button>
          </div>
          <div className="acc-why">
            Cada botón te lleva a la sección donde se resuelve ese tema. <b>Autonomía</b> es donde elegís
            si la IA decide sola o te pide permiso antes de gastar.
          </div>
        </Card>
      </div>
    </div>
  );
}

// =============================================================================================
function Decision({ d, onResolver }: { d: typeof DECISIONES[number]; onResolver: (id: string, t: string) => void }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="dec">
      <div className="dec-head">
        <span className="dec-av" style={{ background: d.agenteColor }}>{d.agente[0]}</span>
        <span className="dec-agent" style={{ color: d.agenteColor }}>{d.agente}</span>
        <Button variant="ghost" className="btn-sm" title="Muestra cómo votó el panel de expertos sobre esta acción"
          onClick={() => setAbierto(!abierto)}>
          <I_Eye size={13} /> {abierto ? 'Ocultar el panel' : 'Ver el panel'}
        </Button>
      </div>
      <div className="dec-title">{d.titulo}</div>
      <div className="dec-det">{d.detalle}</div>
      <div className="dec-impact"><b style={{ color: 'var(--green)' }}>Si lo aprobás: </b>{d.impacto}</div>
      {abierto && (
        <div className="dec-panel">
          <div className="dec-panel-top">
            <I_Vote size={14} style={{ color: 'var(--purple3)' }} />
            <b>El panel revisó esta acción antes de proponértela</b>
            <Badge tone={d.panel.dudaron === 0 ? 'green' : 'amber'}>{d.panel.aprobaron} de {d.panel.total} a favor</Badge>
          </div>
          <div className="dec-obj">
            {d.panel.dudaron > 0 ? <><b>El más duro dijo:</b> «{d.panel.objeccion}»</> : d.panel.objeccion}
          </div>
        </div>
      )}
      <div className="dec-acts">
        {d.acciones.map((ac, i) => (
          <Button key={i} variant={i === 0 ? 'primary' : 'ghost'} className="btn-sm"
            title={CONSECUENCIA[d.id] ?? `Ejecuta: ${ac}`} onClick={() => onResolver(d.id, `${ac}: ${d.titulo} (demo)`)}>
            {i === 0 ? <I_Check size={13} /> : null} {ac}
          </Button>
        ))}
      </div>
      <div className="acc-why">{CONSECUENCIA[d.id]}</div>
    </div>
  );
}

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
          {a.estado === 'trabajando' && <Badge tone="green">trabajando</Badge>}
          {a.estado === 'esperando_ok' && <Badge tone="amber">espera tu OK</Badge>}
          {a.estado === 'al_dia' && <Badge tone="muted">al día</Badge>}
        </div>
        <div className="work-anchor" style={{ marginTop: 7, display: 'inline-block' }}>{a.ancla}</div>
        <div className="work-what">{a.accion}</div>
        <div className="work-res"><b>→ </b>{a.resultado}</div>
        <div className="work-foot">
          <Button variant="ghost" className="btn-sm" title={`Abre: ${a.artefacto}`} onClick={() => setToast(`${a.artefacto} (demo)`)}>
            <I_ArrowRight size={12} /> {a.artefacto}
          </Button>
          <span className="work-when">{a.cuando}</span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================================
function MientrasNoEstabas({ modo }: { modo: Modo }) {
  const m = MIENTRAS_NO_ESTABAS;
  return (
    <>
      <div className="mwb-top">
        {modo === 'auto'
          ? <><I_Check size={15} style={{ color: 'var(--green)' }} /><b style={{ fontSize: 13.5 }}>Trabajó solo y te lo cuenta</b></>
          : <><I_Zap size={15} style={{ color: 'var(--amber)' }} /><b style={{ fontSize: 13.5 }}>Esto hizo solo desde {m.desde}</b></>}
      </div>
      <div className="mwb-grid">
        <div className="mwb-k"><div className="mwb-k-lb">Gasto que evitó</div><div className="mwb-k-v" style={{ color: 'var(--green)' }}>$180</div></div>
        <div className="mwb-k"><div className="mwb-k-lb">Gasto que hizo</div><div className="mwb-k-v">{m.gasto}</div></div>
        <div className="mwb-k"><div className="mwb-k-lb">Ventas</div><div className="mwb-k-v" style={{ color: 'var(--green)' }}>{m.ventas}</div></div>
      </div>
      <div className="mwb-list">
        {m.acciones.map((ac, i) => (
          <div key={i} className="mwb-item">
            <span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Check size={14} /></span>
            <span className="tx">{ac.txt}<small>{ac.detalle}</small></span>
            <span className="hr">{ac.cuando}</span>
            {ac.undo && <span className="tl-undo">deshacer</span>}
          </div>
        ))}
      </div>
      <div className="acc-why">
        {modo === 'auto'
          ? <>Estás en <b>Automático</b>: el motor decide y ejecuta sin preguntarte. Todas las acciones de acá son reversibles 24 h.</>
          : <>Estás en <b>{MODOS.find(x => x.key === modo)?.nombre}</b>: el motor decide, pero <b>te pide OK</b> antes de publicar o gastar.</>}
      </div>
    </>
  );
}

import { useState } from 'react';
import { Card, Badge, Button } from '../components/ui';
import { MotorEnVivo } from '../components/MotorEnVivo';
import { LineChart, Spark } from '../components/charts';
import { SinkrooMark, I_Check, I_ArrowRight, I_Wallet, I_Eye, I_Vote, I_Chat, I_Megaphone, I_Question, I_Credit, I_Users, I_Star, I_Sun, I_Zap, I_Trend, I_Clock } from '../components/icons';
import type { Vista } from '../components/Layout';
import {
  TENANT, ALARMAS, DECISIONES, AGENTES, NUMEROS, MIENTRAS_NO_ESTABAS, BITACORA, MODOS, TAREAS_EXCLUIDAS, CONSECUENCIA,
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
  const criticas = ALARMAS.filter(a => a.severidad === 'critico').length;

  const resolver = (id: string, txt: string) => { setHechas([...hechas, id]); setToast(txt); };

  return (
    <div className="dash">
      {/* ============================================================================ */}
      {/* HERO — logo, bienvenida y los números del día (fiel al original)              */}
      {/* ============================================================================ */}
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
          <div className="hero-metric">
            <div className="metric">47</div>
            <div className="m-label">Ventas</div>
            <div className="m-desc">concretadas hoy</div>
          </div>
          <div className="hero-metric">
            <div className="metric">3.8x</div>
            <div className="m-label">ROAS</div>
            <div className="m-desc">retorno por cada $1 invertido</div>
          </div>
          <div className="hero-metric">
            <div className="metric">84</div>
            <div className="m-label">Score</div>
            <div className="m-desc">calidad del creativo aprobado</div>
          </div>
        </div>

        <div className="hero-ad">
          <div className="hero-ad-tag">PUBLICIDAD</div>
          <div className="hero-ad-title">Más marcas, una cuenta</div>
          <div className="hero-ad-sub">Con Sinkroo Agency, operás hasta 8 marcas desde una sola cuenta, white label incluido.</div>
          <button className="hero-ad-btn" title="Ver los planes de agencia" onClick={() => setVista('cuenta')}>Ver planes →</button>
        </div>
      </div>

      {/* ============================================================================ */}
      {/* EL MOTOR ANDANDO — el vidrio del motor                                        */}
      {/* ============================================================================ */}
      <div className="csec" style={{ marginTop: 6 }}>
        <span className="csec-n">▶</span>
        <span className="csec-t">El motor andando</span>
        <span className="csec-c purple">en vivo</span>
        <span className="csec-s">Tu propuesta se prueba en un mercado simulado antes de gastar un peso</span>
      </div>
      <MotorEnVivo setToast={setToast} />

      {/* ============================================================================ */}
      {/* MÓDULOS — máximo 2 por fila                                                   */}
      {/* ============================================================================ */}

      <div className="csec">
        <span className="csec-n">1</span>
        <span className="csec-t">Lo que necesita tu atención</span>
        <span className="csec-c">{criticas}</span>
        <span className="csec-s">Cada botón dice qué hace antes de que lo toques</span>
      </div>
      <div className="grid-2">
        {/* ---- ALARMAS ---- */}
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
                <div className="alarm-src" style={{ marginLeft: 0 }}>{a.origen}</div>
              </div>
            ))}
          </div>
          {!alarmasExtra && (
            <div style={{ marginTop: 12 }}>
              <Button variant="ghost" className="btn-sm" title="Muestra las 3 alarmas restantes, incluidas las oportunidades"
                onClick={() => setAlarmasExtra(true)}>
                Ver {ALARMAS.length - 3} alarmas más <I_ArrowRight size={13} />
              </Button>
            </div>
          )}
        </Card>

        {/* ---- TU DECISIÓN ---- */}
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

      <div className="grid-2" style={{ marginTop: 16 }}>
        {/* ---- LOS 6 AGENTES ---- */}
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Users size={14} style={{ color: 'var(--purple3)' }} /> El motor, agente por agente</span>}
          action={<Badge tone="green">3 trabajando</Badge>}
        >
          <div className="work">
            {AGENTES.map(a => <AgenteRow key={a.id} a={a} setToast={setToast} />)}
          </div>
          <div className="acc-why">
            Cada botón abre <b>el artefacto</b> que produjo ese agente: el informe, las variantes o el porqué de la decisión.
            Nada de acá es un estado — es trabajo terminado y revisable.
          </div>
        </Card>

        {/* ---- EL MODELO EN NÚMEROS ---- */}
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Trend size={14} style={{ color: 'var(--green)' }} /> El modelo en números</span>}
          action={<Badge tone="purple">este mes</Badge>}
        >
          {/* La curva del mes */}
          <div style={{ background: 'radial-gradient(120% 90% at 50% 40%, #2a1245 0%, rgba(24,12,40,.6) 45%, transparent 78%)', borderRadius: 12, padding: '14px 10px 2px', marginBottom: 16 }}>
            <div className="row spread" style={{ marginBottom: 4, padding: '0 6px' }}>
              <span className="tiny muted">Ventas, últimos 12 meses</span>
              <span className="tiny" style={{ fontWeight: 800 }}>$40.280 acumulado</span>
            </div>
            <LineChart
              data={[2980, 3060, 3120, 3050, 3280, 3400, 3350, 3620, 3780, 3900, 4080, 4280]}
              height={150}
              labels={['Sep', 'Oct', 'Nov', 'Dic', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago']}
            />
          </div>

          <div>
            {NUMEROS.map((n, i) => (
              <div key={i} className="nrow">
                <span style={{ color: n.color, display: 'flex', flexShrink: 0 }}>{ICONO_AREA[n.area] ?? <I_Star size={15} />}</span>
                <span className="nrow-lb">
                  {n.label}
                  <span className="tiny muted" style={{ display: 'block' }}>{n.area}</span>
                </span>
                <span className="nrow-spark"><Spark data={n.serie} width={74} height={28} color={n.color} /></span>
                <span className="nrow-v">{n.valor}</span>
                <span className={`nrow-d ${n.up ? 'up' : 'down'}`}>{n.delta}</span>
              </div>
            ))}
          </div>
          <div className="acc-why">
            Todos salen de tus conexiones reales: Meta Ads, tu WhatsApp y tu tienda.{' '}
            <b>Días de autonomía</b> es cuánto puede seguir trabajando el motor con los créditos que tenés.
          </div>
        </Card>
      </div>

      <div className="grid-2" style={{ marginTop: 16 }}>
        {/* ---- MIENTRAS NO ESTABAS ---- */}
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Sun size={14} style={{ color: 'var(--green)' }} /> Mientras no estabas</span>}
          action={<Badge tone="green">modo {modoNombre}</Badge>}
        >
          <MientrasNoEstabas modo={modo} />
        </Card>

        {/* ---- LA BITÁCORA ---- */}
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
                    {b.autonomia === 'shared' && <span className="tiny muted">con tu OK</span>}
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

      <div className="grid-2" style={{ marginTop: 16 }}>
        {/* ---- LO QUE YA NO TE PIDE ---- */}
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

        {/* ---- POR DÓNDE SEGUIR ---- */}
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Question size={14} style={{ color: 'var(--purple3)' }} /> Por dónde seguir</span>}
        >
          <div className="col-stack">
            <Button onClick={() => setVista('campanas')} title="Ver tus campañas y el panel de expertos de cada pieza">
              <I_Megaphone size={14} /> Ver campañas y el panel de expertos
            </Button>
            <Button variant="outline" onClick={() => setVista('conversaciones')} title="Ver los chats que atienden tus agentes">
              <I_Chat size={14} /> Ver conversaciones
            </Button>
            <Button variant="ghost" onClick={() => setVista('mercado')} title="Qué está haciendo tu competencia ahora">
              <I_Trend size={14} /> Ver mercado
            </Button>
            <Button variant="ghost" onClick={() => setVista('cuenta')} title="Elegir cuánto decide la IA y cuánto decidís vos">
              <I_Credit size={14} /> Ajustar cuánto decide la IA <I_ArrowRight size={13} />
            </Button>
          </div>
          <div className="acc-why">
            Cada botón te lleva a la sección donde se resuelve ese tema. <b>Cuenta y autonomía</b> es donde elegís
            si la IA decide sola o te pide permiso antes de gastar.
          </div>
        </Card>
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
            title={CONSECUENCIA[d.id] ?? `Ejecuta: ${ac}`}
            onClick={() => onResolver(d.id, `${ac}: ${d.titulo} (demo)`)}>
            {i === 0 ? <I_Check size={13} /> : null} {ac}
          </Button>
        ))}
      </div>
      <div className="acc-why">{CONSECUENCIA[d.id]}</div>
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
          {a.estado === 'trabajando' && <Badge tone="green">trabajando</Badge>}
          {a.estado === 'esperando_ok' && <Badge tone="amber">espera tu OK</Badge>}
          {a.estado === 'al_dia' && <Badge tone="muted">al día</Badge>}
        </div>
        <div className="work-anchor" style={{ marginTop: 7, display: 'inline-block' }}>{a.ancla}</div>
        <div className="work-what">{a.accion}</div>
        <div className="work-res"><b>→ </b>{a.resultado}</div>
        <div className="work-foot">
          <Button variant="ghost" className="btn-sm" title={`Abre: ${a.artefacto}`}
            onClick={() => setToast(`${a.artefacto} (demo)`)}>
            <I_ArrowRight size={12} /> {a.artefacto}
          </Button>
          <span className="work-when">{a.cuando}</span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================================
// MIENTRAS NO ESTABAS — la contracara del modo Automático
// =============================================================================================
function MientrasNoEstabas({ modo }: { modo: Modo }) {
  const m = MIENTRAS_NO_ESTABAS;
  return (
    <>
      <div className="mwb" style={{ border: 'none', background: 'transparent', padding: 0 }}>
        <div className="mwb-top">
          {modo === 'auto'
            ? <><I_Check size={15} style={{ color: 'var(--green)' }} /><b style={{ fontSize: 13.5 }}>Trabajó solo y te lo cuenta</b></>
            : <><I_Zap size={15} style={{ color: 'var(--amber)' }} /><b style={{ fontSize: 13.5 }}>Esto hizo solo desde {m.desde}</b></>}
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
            <div className="mwb-k-lb">Ventas</div>
            <div className="mwb-k-v" style={{ color: 'var(--green)' }}>{m.ventas}</div>
          </div>
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
      </div>
      <div className="acc-why">
        {modo === 'auto'
          ? <>Estás en <b>Automático</b>: el motor decide y ejecuta sin preguntarte. Todas las acciones de acá son reversibles 24 h.</>
          : <>Estás en <b>{MODOS.find(x => x.key === modo)?.nombre}</b>: el motor decide, pero <b>te pide OK</b> antes de publicar o gastar. Por eso tenés {DECISIONES.length} decisiones esperando en la columna de al lado.</>}
      </div>
    </>
  );
}

const ICONO_AREA: Record<string, any> = {
  Dinero: <I_Wallet size={15} />,
  Alcance: <I_Users size={15} />,
  Calidad: <I_Star size={15} />,
  Conversaciones: <I_Chat size={15} />,
  Recursos: <I_Credit size={15} />,
};

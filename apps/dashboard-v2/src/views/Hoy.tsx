import { useState } from 'react';
import { Card, Badge, Button } from '../components/ui';
import { MotorEnVivo } from '../components/MotorEnVivo';
import { Bars, Ring, BarRow, MetricaAnillo } from '../components/viz';
import { usePerfil, nombreDePila } from '../lib/perfil';
import { SinkrooMark, I_Check, I_ArrowRight, I_Wallet, I_Eye, I_Vote, I_Users, I_Star, I_Sun, I_Zap, I_Trend, I_Clock } from '../components/icons';
import type { Vista } from '../components/Layout';
import {
  ALARMAS, DECISIONES, AGENTES, NUMEROS, MIENTRAS_NO_ESTABAS, BITACORA, MODOS, CONSECUENCIA,
  MES, PANEL_PIEZAS,
  type Modo, type Severidad,
} from '../data/demo';

const SEV_LB: Record<Severidad, string> = { critico: 'CRÍTICO', atencion: 'ATENCIÓN', oportunidad: 'OPORTUNIDAD', info: 'RESUELTO SOLO' };

export function ViewHoy({ setToast, setVista, modo }: { setToast: (t: string) => void; setVista: (v: Vista) => void; modo: Modo }) {
  const { perfil } = usePerfil();
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
            <span className="hero-logo">
              <SinkrooMark size={136} />
            </span>
            <div className="hero-txt">
              <div className="hero-live" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="dot-live" /> TU AGENTE ESTÁ ACTIVO
                <button className="tour-start-btn" title="Recorré el panel con Sinkroo"
                  onClick={() => setToast('Tour guiado del panel (demo)')}>▶ Iniciar tour</button>
              </div>
              <div className="hdr-t hero-title">
                Hola {nombreDePila(perfil.nombre)}, soy <span className="grad-text">Sinkroo</span> 👋
              </div>
              <div className="hdr-s hero-sub">
                Te estoy vigilando la tienda <b>24/7</b>. Mirá lo que hice hoy.
              </div>
              <div className="hero-chips">
                <span className="hero-chip hot">● {AGENTES.filter(a => a.estado === 'trabajando').length} de los 6 agentes trabajando ahora</span>
                <span className="hero-chip">14 revisiones hoy</span>
                {pendientes.length > 0 && <span className="hero-chip amber">{pendientes.length} decisiones esperan tu OK</span>}
                {criticas > 0 && <span className="hero-chip red">{criticas} alarmas críticas</span>}
              </div>
            </div>
          </div>
        </div>
        <div className="hero-metrics">
          <div className="hero-metric"><div className="metric" style={{ color: 'var(--green)' }}>47</div><div className="m-label">Ventas</div><div className="m-desc">concretadas hoy</div></div>
          <div className="hero-metric"><div className="metric" style={{ color: 'var(--green)' }}>3.8x</div><div className="m-label">ROAS</div><div className="m-desc">retorno por cada $1 invertido</div></div>
          <div className="hero-metric"><div className="metric grad-text">84</div><div className="m-label">Score</div><div className="m-desc">calidad del creativo aprobado</div></div>
        </div>
        <div className="hero-start">
          <div className="hero-ad-tag">EMPEZÁ ACÁ</div>
          <div className="hero-ad-title">Tu primera campaña</div>
          <div className="hero-ad-sub">
            Decís qué querés publicar y subís tu material: el motor la crea, el panel la aprueba
            y recién ahí sale a tus redes. <b>No gasta un peso antes.</b>
          </div>
          <button className="hero-ad-btn" title="Te lleva a «Qué querés publicar», el primer paso: ahí arranca el modelo"
            onClick={() => { setVista('campanas'); setToast('Arrancá por acá: decí qué querés publicar'); }}>
            Crear la primera →
          </button>
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
            <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
              <div className="dato"><span className="dato-l">Revisiones de hoy</span><span className="dato-v">14</span></div>
              <div className="dato"><span className="dato-l">En riesgo si no actuás</span><span className="dato-v" style={{ color: 'var(--amber)' }}>$180</span></div>
              <div className="dato"><span className="dato-l">Resueltas solas</span><span className="dato-v" style={{ color: 'var(--green)' }}>6</span></div>
            </div>
            <div className="acc-why">
              La vigilancia corre <b>cada 15 minutos</b> y no gasta IA: compara tus números contra los de ayer.
              Solo cuando algo se sale de lo normal entra un agente a mirarlo.
            </div>
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
          title={<span className="row" style={{ gap: 8 }}><I_Users size={14} style={{ color: 'var(--purple3)' }} /> El motor · estrategia y creatividad</span>}
          action={<Badge tone="green">{AGENTES.filter(a => a.estado === 'trabajando').length} trabajando</Badge>}
        >
          <div className="work">
            {AGENTES.slice(0, 3).map(a => <AgenteRow key={a.id} a={a} setToast={setToast} />)}
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
          <div className="met-grid">
            {NUMEROS.map((n, i) => (
              <MetricaAnillo key={i} label={n.label} valor={n.valor} delta={n.delta} pct={n.pct} meta={n.meta} color={n.color} up={n.up} />
            ))}
          </div>
          <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <div className="dato"><span className="dato-l">Acumulado del mes</span><span className="dato-v" style={{ color: 'var(--green)' }}>{MES.acumulado}</span></div>
            <div className="dato"><span className="dato-l">Crecimiento mensual</span><span className="dato-v" style={{ color: 'var(--green)' }}>+28%</span></div>
            <div className="dato"><span className="dato-l">Dato más viejo</span><span className="dato-v">hace 12 meses</span></div>
          </div>
          <div>
            <div className="bs" style={{ marginBottom: 8 }}>Lo que más se movió este mes, contra el mes pasado:</div>
            <BarRow label="Ventas" valor={18} max={22} sufijo="%" color="var(--green)" formato="+18" />
            <BarRow label="Alcance" valor={22} max={22} sufijo="%" color="var(--purple2)" formato="+22" />
            <BarRow label="ROAS" valor={12} max={22} sufijo="%" color="var(--green)" formato="+12" />
            <BarRow label="Autonomía" valor={9} max={22} sufijo=" días" color="var(--amber)" formato="-9" />
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
        <span className="csec-t">El motor y la calidad de tus piezas</span>
        <span className="csec-s">Quién produce y qué tan bueno es lo que produce</span>
      </div>
      <div className="duo">
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Users size={14} style={{ color: 'var(--purple3)' }} /> El motor · medios y ventas</span>}
          action={<Badge tone="amber">1 espera tu OK</Badge>}
        >
          <div className="work">
            {AGENTES.slice(3).map(a => <AgenteRow key={a.id} a={a} setToast={setToast} />)}
          </div>
          <div>
            <div className="bs" style={{ marginBottom: 9 }}>Lo que dejó este equipo hoy, listo para revisar:</div>
            <div className="guards">
              <div className="guard"><I_Check size={14} style={{ color: 'var(--green)', flexShrink: 0 }} /><span className="guard-lb">Presupuesto reasignado a la campaña que mejor rinde<small>Kai · hace 3 h · reversible</small></span><span className="guard-val" style={{ color: 'var(--green)' }}>+7,3x</span></div>
              <div className="guard"><I_Check size={14} style={{ color: 'var(--green)', flexShrink: 0 }} /><span className="guard-lb">Informe de resultados de la semana<small>Sol · hace 5 h</small></span><span className="guard-val">1</span></div>
              <div className="guard"><I_Check size={14} style={{ color: 'var(--green)', flexShrink: 0 }} /><span className="guard-lb">Clientes que quedaron a un mensaje de comprar<small>Rumi · hace 20 min</small></span><span className="guard-val" style={{ color: 'var(--amber)' }}>4</span></div>
            </div>
          </div>
          <div className="acc-why">
            Estos tres son los que <b>gastan, miden y venden</b>: Kai mueve el presupuesto, Sol te dice qué funcionó
            y Rumi atiende a quien escribe. Si algo pasa de su techo, te lo pide antes de hacerlo.
          </div>
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
                Es el promedio de los 5 jueces de MiroFish. Arriba de <b style={{ color: 'var(--green)' }}>80</b> se publica,
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
            <b>Una pieza que no pasa a los jueces nunca se publica.</b> Ahí está el ahorro: el dinero se gasta después de que el mercado la aprobó, no antes.
          </div>
        </Card>
      </div>

      {/* ====================== FILA 4: AUTONOMÍA Y MEMORIA ====================== */}
      <div className="csec">
        <span className="csec-n">4</span>
        <span className="csec-t">Cómo viene el mes y qué hizo solo</span>
        <span className="csec-s">El crecimiento y las acciones que tomó sin vos</span>
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
          title={<span className="row" style={{ gap: 8 }}><I_Sun size={14} style={{ color: 'var(--green)' }} /> Mientras no estabas</span>}
          action={<Badge tone="green">modo {modoNombre}</Badge>}
        >
          <MientrasNoEstabas modo={modo} />
        </Card>
      </div>

      {/* ====================== FILA 5: CIERRE ====================== */}
      <div className="csec">
        <span className="csec-n">5</span>
        <span className="csec-t">Memoria y cierre</span>
        <span className="csec-s">Todo lo que hizo el motor y cómo vas contra tus metas</span>
      </div>
      <div className="duo">
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

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Star size={14} style={{ color: 'var(--green)' }} /> Tus metas del mes</span>}
          action={<Badge tone="green">2 de 3 en camino</Badge>}
        >
          <div>
            <div className="row spread" style={{ marginBottom: 6 }}>
              <span className="bt">Ventas</span>
              <span className="bs">$4.280 de $6.000 · faltan $1.720</span>
            </div>
            <BarRow valor={71} max={100} formato="71%" color="var(--green)" />
          </div>
          <div>
            <div className="row spread" style={{ marginBottom: 6 }}>
              <span className="bt">ROAS</span>
              <span className="bs">3,8x sobre una meta de 3,5x</span>
            </div>
            <BarRow valor={100} max={100} formato="108%" color="var(--green)" />
          </div>
          <div>
            <div className="row spread" style={{ marginBottom: 6 }}>
              <span className="bt">Responder en menos de 5 min</span>
              <span className="bs">92% sobre una meta de 90%</span>
            </div>
            <BarRow valor={92} max={100} formato="92%" color="var(--amber)" />
          </div>
          <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <div className="dato"><span className="dato-l">Cierre proyectado</span><span className="dato-v" style={{ color: 'var(--green)' }}>$5.650</span></div>
            <div className="dato"><span className="dato-l">Días que quedan</span><span className="dato-v">8</span></div>
            <div className="dato"><span className="dato-l">Para llegar faltan</span><span className="dato-v" style={{ color: 'var(--amber)' }}>$215/día</span></div>
          </div>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <Button className="btn-sm" title="Kai reasigna el presupuesto entre tus campañas para llegar con el mismo gasto total"
              onClick={() => setToast('Plan para llegar a la meta del mes (demo)')}><I_ArrowRight size={13} /> Pedir un plan para llegar</Button>
            <Button variant="ghost" className="btn-sm" title="Cambiás el objetivo del mes. No cambia el presupuesto ni lo que ya se gastó."
              onClick={() => setToast('Editar las metas del mes (demo)')}>Ajustar la meta</Button>
          </div>
          <div className="acc-why">
            La meta la ponés vos. <b>El motor no gasta más para llegar</b>: reasigna lo que ya tenés
            y te avisa cuando el objetivo deja de ser alcanzable con el presupuesto actual.
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
        <Button variant="ghost" className="btn-sm" title="Muestra cómo votaron los 5 jueces sobre esta acción"
          onClick={() => setAbierto(!abierto)}>
          <I_Eye size={13} /> {abierto ? 'Ocultar el veredicto' : 'Ver el veredicto'}
        </Button>
      </div>
      <div className="dec-title">{d.titulo}</div>
      <div className="dec-det">{d.detalle}</div>
      <div className="dec-impact"><b style={{ color: 'var(--green)' }}>Si lo aprobás: </b>{d.impacto}</div>
      {abierto && (
        <div className="dec-panel">
          <div className="dec-panel-top">
            <I_Vote size={14} style={{ color: 'var(--purple3)' }} />
            <b>Los 5 jueces revisaron esta acción antes de proponértela</b>
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
          : modo === 'shared'
            ? <>Estás en <b>Compartido</b>: el motor decide, pero <b>te pide OK</b> antes de publicar o gastar.</>
            : <>Estás en <b>Manual</b>: el motor solo te <b>sugiere</b>. Publicás y gastás vos.</>}
      </div>
    </>
  );
}

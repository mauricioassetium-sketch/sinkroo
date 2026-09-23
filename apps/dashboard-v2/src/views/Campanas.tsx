import { useState } from 'react';
import { Card, Badge, Button, Progress } from '../components/ui';
import { I_ArrowRight, I_Plus, I_Check, I_Palette, I_Trend, I_Star, I_File } from '../components/icons';
import { CAMPANAS, PANEL_ULTIMO, PANEL_PIEZAS, TIPOS_CAMPANA, type Modo } from '../data/demo';

export function ViewCampanas({ setToast, modo }: { setToast: (t: string) => void; modo: Modo }) {
  const [pieza, setPieza] = useState(0);
  const p = PANEL_ULTIMO;

  const colorScore = (s: number) => (s >= 80 ? 'var(--green)' : s >= 60 ? 'var(--amber)' : 'var(--red)');
  const veredicto = (v: string) => (v === 'go' ? { t: 'Listo para lanzar', tone: 'green' as const } : v === 'review' ? { t: 'Revisar antes', tone: 'amber' as const } : { t: 'No lanzar así', tone: 'red' as const });

  return (
    <>
      {/* ============ CABECERA ============ */}
      <div className="card" style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <div className="ttl" style={{ fontSize: 20 }}>{CAMPANAS.length} campañas · 5 tipos</div>
          <div className="sub" style={{ marginTop: 4, lineHeight: 1.5 }}>
            Antes esto eran 15 tipos y 218 casillas por llenar. Ahora son 5 tipos y ninguna casilla:
            el material de tu negocio ya está cargado y se reusa.
          </div>
        </div>
        <div className="pill-months">
          {TIPOS_CAMPANA.map(t => <span key={t} className="badge badge-purple">{t}</span>)}
        </div>
      </div>

      {/* ============ EL PANEL (el enjambre como focus group) ============ */}
      <div className="csec">
        <span className="csec-n">★</span>
        <span className="csec-t">El panel de expertos</span>
        <span className="csec-c purple">11 expertos</span>
        <span className="csec-s">Cada pieza pasa por el panel antes de gastar un peso</span>
      </div>

      <div className="card">
        <div className="panel-top">
          <div className={`panel-score ${p.veredicto}`}>
            <div className="panel-score-num">{p.score}</div>
            <div className="panel-score-lb">{p.veredicto === 'go' ? 'APROBADO' : p.veredicto === 'review' ? 'REVISAR' : 'RECHAZADO'}</div>
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-.3px' }}>{p.pieza}</div>
            <div className="sub" style={{ marginTop: 5 }}>{p.criterio} · abajo de 60 se rechaza</div>
            <div className="row" style={{ gap: 8, marginTop: 13, flexWrap: 'wrap' }}>
              <Badge tone="green">5 perfiles revisaron en 8 segundos</Badge>
              <Badge tone="purple">11 dimensiones</Badge>
              <Badge tone="amber">1 objeción concreta</Badge>
            </div>
            <div className="row" style={{ gap: 9, marginTop: 15, flexWrap: 'wrap' }}>
              <Button onClick={() => setToast('Publicando en Meta Ads… (demo)')}><I_Check size={14} /> Lanzar esta pieza</Button>
              <Button variant="outline" onClick={() => setToast('Nia está reescribiendo con la objeción (demo)')}>
                <I_Palette size={14} /> Reescribir con la objeción
              </Button>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          {p.votantes.map(v => (
            <div key={v.nombre} className="pv">
              <div className="pv-av" style={{ background: colorScore(v.score) }}>{v.score}</div>
              <div className="pv-body">
                <div className="pv-head">
                  <span className="pv-name">{v.nombre}</span>
                  <span className="pv-persona">· {v.persona}</span>
                  <Badge tone="muted">peso {v.peso}</Badge>
                  <span className="pv-score" style={{ color: colorScore(v.score) }}>{v.score}</span>
                </div>
                <div className="pv-bar">
                  <span style={{ width: `${v.score}%`, background: colorScore(v.score) }} />
                </div>
                <div className="pv-why">«{v.rationale}»</div>
              </div>
            </div>
          ))}
        </div>

        <div className="alarm atencion" style={{ marginTop: 16 }}>
          <div className="alarm-head">
            <span className="alarm-sev atencion">LO QUE HAY QUE ARREGLAR</span>
            <span className="alarm-title">El más duro te puso 72</span>
          </div>
          <div className="alarm-sug">
            <b>Instrucción directa: </b>agregar un testimonio con nombre y número verificable. Es la única objeción del panel
            y es la que separa esta pieza de un 90.
          </div>
          <div className="alarm-acts">
            <Button variant="primary" className="btn-sm" onClick={() => setToast('Nia agrega testimonio y re-evalúa (demo)')}>
              <I_Palette size={13} /> Que Nia lo arregle
            </Button>
            <Button variant="ghost" className="btn-sm" onClick={() => setToast('Detalle del voto (demo)')}>Ver detalle del voto</Button>
          </div>
        </div>
      </div>

      {/* ============ TUS PIEZAS ============ */}
      <div className="csec">
        <span className="csec-n">2</span>
        <span className="csec-t">Tus piezas</span>
        <span className="csec-s">Una pieza que no pasó el panel nunca se publica</span>
      </div>
      <div className="card">
        {PANEL_PIEZAS.map((pz, i) => {
          const v = veredicto(pz.veredicto);
          return (
            <div key={pz.titulo} className="pv" style={{ cursor: 'pointer', opacity: i === pieza ? 1 : .85 }}
              onClick={() => { setPieza(i); setToast(`Panel de "${pz.titulo}" (demo)`); }}>
              <div className="pv-av" style={{ background: 'var(--bg3)', border: '1px solid var(--border2)' }}>{pz.emoji}</div>
              <div className="pv-body">
                <div className="pv-head">
                  <span className="pv-name">{pz.titulo}</span>
                  <span className="pv-persona">· {pz.tipo}</span>
                  <Badge tone={v.tone}>{v.t}</Badge>
                  <span className="pv-score" style={{ color: colorScore(pz.score) }}>{pz.score}</span>
                </div>
                <div className="pv-bar"><span style={{ width: `${pz.score}%`, background: colorScore(pz.score) }} /></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ============ CAMPAÑAS ============ */}
      <div className="csec">
        <span className="csec-n">3</span>
        <span className="csec-t">Campañas activas</span>
        <span className="csec-s">Qué corre, cuánto gasta y cuántos artefactos produjo el motor</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 13 }}>
        {CAMPANAS.map(c => (
          <Card key={c.id}>
            <div className="row spread" style={{ alignItems: 'flex-start' }}>
              <div className="row" style={{ gap: 9 }}>
                <span style={{ fontSize: 20 }}>{c.emoji}</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{c.nombre}</div>
                  <div className="tiny muted">{c.tipo}</div>
                </div>
              </div>
              <Badge tone={c.estado === 'Activa' ? 'green' : c.estado === 'En pausa' ? 'amber' : 'muted'}>{c.estado}</Badge>
            </div>

            <div className="row" style={{ gap: 18, marginTop: 14 }}>
              <div>
                <div className="tiny muted">ROAS</div>
                <div style={{ fontWeight: 900, fontSize: 17 }}>{c.roas}</div>
              </div>
              <div>
                <div className="tiny muted">Presupuesto</div>
                <div style={{ fontWeight: 800, fontSize: 14, marginTop: 3 }}>{c.presupuesto}</div>
              </div>
              <div>
                <div className="tiny muted">Score</div>
                <div style={{ fontWeight: 900, fontSize: 17, color: colorScore(c.score) }}>{c.score}</div>
              </div>
            </div>

            <div style={{ marginTop: 13 }}>
              <div className="row spread tiny muted" style={{ marginBottom: 5 }}>
                <span>Presupuesto consumido</span><span>{c.pct}%</span>
              </div>
              <Progress pct={c.pct} color={c.pct > 70 ? 'amber' : 'purple'} />
            </div>

            <div className="row spread" style={{ marginTop: 13 }}>
              <span className="tiny muted">{c.conversiones} conversiones · {c.alcance}</span>
              <span className="badge badge-purple" style={{ fontSize: 10 }}><I_File size={10} /> {c.artefactos}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* ============ CREAR ============ */}
      <div className="csec">
        <span className="csec-n">4</span>
        <span className="csec-t">Crear una campaña</span>
        <span className="csec-s">Sin casillas: una frase alcanza</span>
      </div>
      <Card>
        <div className="alarm" style={{ border: '1px dashed var(--border2)', borderLeft: '1px dashed var(--border2)', background: 'transparent' }}>
          <div className="alarm-head">
            <span className="alarm-title" style={{ fontWeight: 600, color: 'var(--muted)' }}>
              «Quiero vender el pack completo en CABA a mujeres de 25 a 40 con $20 por día»
            </span>
          </div>
          <div className="alarm-sug">
            Nia escribe el anuncio, el panel lo puntúa, {modo === 'auto' ? 'Kai lo publica y te avisa' : modo === 'shared' ? 'Kai te pide el OK antes de publicar' : 'Kai te deja la campaña lista para que la publiques vos'}.
            <b> Vos no llenás nada.</b>
          </div>
          <div className="alarm-acts">
            <Button variant="primary" className="btn-sm" onClick={() => setToast('Nia está escribiendo 6 variantes… (demo)')}>
              <I_Plus size={13} /> Crear con una frase
            </Button>
            <Button variant="ghost" className="btn-sm" onClick={() => setToast('Briefing guiado (demo)')}>
              <I_ArrowRight size={13} /> Prefiero que me guíe
            </Button>
          </div>
        </div>
      </Card>

      <div className="tiny muted" style={{ marginTop: 18, display: 'flex', gap: 7, alignItems: 'center' }}>
        <I_Star size={13} /> El panel es el mismo motor de predicción de Sinkroo: se muestra como focus group porque es exactamente lo que es.
        <I_Trend size={13} style={{ marginLeft: 6 }} /> Sin nombres técnicos ni contadores de votos sueltos.
      </div>
    </>
  );
}

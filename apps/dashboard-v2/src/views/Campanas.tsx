import { useState } from 'react';
import { Card, Badge, Button, Progress } from '../components/ui';
import { ViewHead, Bars, Ring, BarRow } from '../components/viz';
import { I_Megaphone, I_Palette, I_Check, I_Plus, I_ArrowRight, I_Star, I_Vote, I_File, I_Zap } from '../components/icons';
import { CAMPANAS, PANEL_ULTIMO, PANEL_PIEZAS, TIPOS_CAMPANA, type Modo } from '../data/demo';

const GASTO = [40, 30, 12, 18, 9];
const GASTO_LB = CAMPANAS.map(c => c.nombre.split(' ')[0]);

export function ViewCampanas({ setToast, modo }: { setToast: (t: string) => void; modo: Modo }) {
  const [abierto, setAbierto] = useState(true);
  const p = PANEL_ULTIMO;
  const colorScore = (s: number) => (s >= 80 ? 'var(--green)' : s >= 60 ? 'var(--amber)' : 'var(--red)');
  const veredicto = (v: string) => (v === 'go' ? { t: 'Listo', tone: 'green' as const } : v === 'review' ? { t: 'Revisar', tone: 'amber' as const } : { t: 'No lanzar', tone: 'red' as const });
  const artefactos = CAMPANAS.reduce((s, c) => s + c.artefactos, 0);
  const diario = GASTO.reduce((s, v) => s + v, 0);

  return (
    <div className="dash">
      <ViewHead
        icon={<I_Megaphone size={19} />}
        titulo="Campañas"
        sub="5 tipos en vez de 15 y ninguna casilla: el material de tu negocio ya está cargado y se reusa."
        nums={[
          { v: String(CAMPANAS.length), l: 'campañas' },
          { v: `$${diario}`, l: 'invertido por día', c: 'var(--green)' },
          { v: '3,8x', l: 'ROAS del mes' },
          { v: String(artefactos), l: 'artefactos producidos', c: 'var(--purple3)' },
        ]}
      />

      {/* ============ EL PANEL Y LAS PIEZAS ============ */}
      <div className="csec" style={{ marginTop: 0 }}>
        <span className="csec-n">★</span>
        <span className="csec-t">El panel de expertos</span>
        <span className="csec-c purple">11 expertos</span>
        <span className="csec-s">Cada pieza pasa por el panel antes de gastar un peso</span>
      </div>
      <div className="duo">
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Vote size={14} style={{ color: 'var(--purple3)' }} /> Veredicto de la última pieza</span>}
          action={<Badge tone="green">{p.veredicto === 'go' ? 'aprobada' : p.veredicto === 'review' ? 'revisar' : 'rechazada'}</Badge>}
        >
          <div className="row" style={{ gap: 20, marginBottom: 14 }}>
            <Ring valor={p.score} label="SCORE" color="var(--green)" sub="mínimo 80 para publicar" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="bt">{p.pieza}</div>
              <div className="bs" style={{ marginTop: 5 }}>{p.criterio} · revisada por 5 perfiles en 8 segundos.</div>
              <div className="row" style={{ gap: 7, marginTop: 11, flexWrap: 'wrap' }}>
                <Badge tone="purple">11 dimensiones</Badge>
                <Badge tone="amber">1 objeción</Badge>
              </div>
            </div>
          </div>

          {abierto && p.votantes.map(v => (
            <div key={v.nombre} style={{ padding: '10px 0', borderTop: '1px solid var(--border)' }}>
              <div className="row spread" style={{ marginBottom: 6 }}>
                <span className="bt">{v.nombre} <span className="tiny muted">· {v.persona}</span></span>
                <span style={{ fontWeight: 900, fontSize: 15, color: colorScore(v.score) }}>{v.score}</span>
              </div>
              <BarRow valor={v.score} max={100} color={colorScore(v.score)} />
              <div className="bs" style={{ marginTop: 5 }}>«{v.rationale}»</div>
            </div>
          ))}

          <div className="alarm atencion" style={{ marginTop: 14 }}>
            <div className="alarm-head"><span className="alarm-sev atencion">LO QUE HAY QUE ARREGLAR</span></div>
            <div className="alarm-sug"><b>Instrucción directa: </b>agregar un testimonio con nombre y número verificable. Es la única objeción y es lo que separa esta pieza de un 90.</div>
          </div>
          <div className="row" style={{ gap: 9, marginTop: 12, flexWrap: 'wrap' }}>
            <Button className="btn-sm" title="Nia reescribe la pieza y el panel la vuelve a puntuar"
              onClick={() => setToast('Nia agrega testimonio y re-evalúa (demo)')}><I_Palette size={13} /> Que Nia lo arregle</Button>
            <Button variant="ghost" className="btn-sm" title="Muestra el detalle del voto, perfil por perfil"
              onClick={() => setAbierto(!abierto)}>{abierto ? 'Ocultar el detalle' : 'Ver el detalle'}</Button>
            <Button variant="ghost" className="btn-sm" title="Publica la pieza en Meta Ads"
              onClick={() => setToast('Publicando en Meta Ads… (demo)')}><I_Check size={13} /> Publicar</Button>
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_File size={14} style={{ color: 'var(--purple3)' }} /> Tus piezas</span>}
          action={<Badge tone="muted">{PANEL_PIEZAS.length} en el lote</Badge>}
        >
          {PANEL_PIEZAS.map(pz => {
            const v = veredicto(pz.veredicto);
            return (
              <div key={pz.titulo} style={{ padding: '11px 0', borderBottom: '1px solid var(--border)' }}>
                <div className="row spread" style={{ marginBottom: 7 }}>
                  <span className="bt">{pz.emoji} {pz.titulo} <span className="tiny muted">· {pz.tipo}</span></span>
                  <span className="row" style={{ gap: 9 }}>
                    <Badge tone={v.tone}>{v.t}</Badge>
                    <span style={{ fontWeight: 900, fontSize: 15, color: colorScore(pz.score) }}>{pz.score}</span>
                  </span>
                </div>
                <BarRow valor={pz.score} max={100} color={colorScore(pz.score)} />
              </div>
            );
          })}
          <div className="acc-why">
            <b>Una pieza que no pasa el panel nunca se publica.</b> El orden importa: primero convence al mercado simulado, después gasta tu dinero.
          </div>
        </Card>
      </div>

      {/* ============ LAS CAMPAÑAS ============ */}
      <div className="csec">
        <span className="csec-n">1</span>
        <span className="csec-t">Tus campañas</span>
        <span className="csec-s">Qué corre, cuánto gasta y cuántos artefactos produjo el motor</span>
      </div>
      <div className="duo">
        {CAMPANAS.map(c => (
          <Card key={c.id}>
            <div className="row spread" style={{ alignItems: 'flex-start' }}>
              <div className="row" style={{ gap: 9 }}>
                <span style={{ fontSize: 20 }}>{c.emoji}</span>
                <div>
                  <div className="bt">{c.nombre}</div>
                  <div className="tiny muted">{c.tipo}</div>
                </div>
              </div>
              <Badge tone={c.estado === 'Activa' ? 'green' : c.estado === 'En pausa' ? 'amber' : 'muted'}>{c.estado}</Badge>
            </div>

            <div className="datos-row" style={{ marginTop: 14 }}>
              <div className="dato"><span className="dato-l">ROAS</span><span className="dato-v" style={{ color: c.roas === '—' ? 'var(--muted)' : 'var(--green)' }}>{c.roas}</span></div>
              <div className="dato"><span className="dato-l">Presupuesto</span><span className="dato-v">{c.presupuesto}</span></div>
              <div className="dato"><span className="dato-l">Score</span><span className="dato-v" style={{ color: colorScore(c.score) }}>{c.score}</span></div>
              <div className="dato"><span className="dato-l">Artefactos</span><span className="dato-v" style={{ color: 'var(--purple3)' }}>{c.artefactos}</span></div>
            </div>

            <div style={{ marginTop: 14 }}>
              <div className="row spread tiny muted" style={{ marginBottom: 6 }}>
                <span>Presupuesto consumido</span><span>{c.pct}%</span>
              </div>
              <Progress pct={c.pct} color={c.pct > 70 ? 'amber' : 'purple'} />
            </div>

            <div className="row" style={{ gap: 8, marginTop: 13, flexWrap: 'wrap' }}>
              <Button variant="ghost" className="btn-sm" title={`Ver las ${c.artefactos} piezas de esta campaña`}
                onClick={() => setToast(`Artefactos de "${c.nombre}" (demo)`)}><I_File size={12} /> Ver piezas</Button>
              <Button variant="ghost" className="btn-sm" title={c.estado === 'Activa' ? 'Pausa la campaña y deja de gastar' : 'Reactiva la campaña'}
                onClick={() => setToast(`${c.estado === 'Activa' ? 'Pausar' : 'Activar'} "${c.nombre}" (demo)`)}>
                {c.estado === 'Activa' ? 'Pausar' : c.estado === 'Borrador' ? 'Publicar' : 'Reactivar'}
              </Button>
            </div>
          </Card>
        ))}

        {/* el gráfico de gasto completa la grilla de 2 */}
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Zap size={14} style={{ color: 'var(--green)' }} /> Dónde va tu presupuesto</span>}
          action={<Badge tone="green">${diario}/día</Badge>}
        >
          <Bars data={GASTO} labels={GASTO_LB} color="#a855f7" fmt={v => `$${v}`} />
          <div className="datos-row" style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
            <div className="dato"><span className="dato-l">Por semana</span><span className="dato-v">${diario * 7}</span></div>
            <div className="dato"><span className="dato-l">Por mes</span><span className="dato-v">${diario * 30}</span></div>
            <div className="dato"><span className="dato-l">La que más rinde</span><span className="dato-v" style={{ color: 'var(--green)' }}>Pack completo · 7,3x</span></div>
          </div>
          <div className="acc-why">
            El presupuesto se reparte según lo que rinde, no según lo que ya estaba cargado.
            <b> El motor mueve plata solo</b> cuando el modo está en Automático y dentro de los frenos.
          </div>
        </Card>
      </div>

      {/* ============ CREAR ============ */}
      <div className="duo" style={{ marginTop: 16 }}>
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Plus size={14} style={{ color: 'var(--purple3)' }} /> Crear una campaña</span>}
          action={<Badge tone="purple">sin casillas</Badge>}
        >
          <div className="alarm" style={{ border: '1px dashed var(--border2)', borderLeft: '1px dashed var(--border2)', background: 'transparent' }}>
            <div className="alarm-title" style={{ fontWeight: 600, color: 'var(--muted)', minWidth: 0 }}>
              «Quiero vender el pack completo en CABA a mujeres de 25 a 40 con $20 por día»
            </div>
          </div>
          <div className="bs" style={{ marginTop: 12 }}>
            Nia escribe el anuncio, el panel lo puntúa, y{' '}
            {modo === 'auto' ? 'Kai lo publica y te avisa' : modo === 'shared' ? 'Kai te pide el OK antes de publicar' : 'Kai te deja la campaña lista para que la publiques vos'}.
            <b> Vos no llenás nada.</b>
          </div>
          <div className="row" style={{ gap: 9, marginTop: 13, flexWrap: 'wrap' }}>
            <Button className="btn-sm" title="Nia escribe 6 variantes a partir de esa frase"
              onClick={() => setToast('Nia está escribiendo 6 variantes… (demo)')}><I_Plus size={13} /> Crear con una frase</Button>
            <Button variant="ghost" className="btn-sm" title="Te lleva paso a paso pidiéndote lo mínimo"
              onClick={() => setToast('Briefing guiado (demo)')}><I_ArrowRight size={13} /> Prefiero que me guíe</Button>
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Star size={14} style={{ color: 'var(--green)' }} /> Los 5 tipos que quedaron</span>}
          action={<Badge tone="muted">antes eran 15</Badge>}
        >
          {TIPOS_CAMPANA.map(t => (
            <div key={t} className="nrow">
              <span style={{ color: 'var(--green)', display: 'flex', flexShrink: 0 }}><I_Check size={15} /></span>
              <span className="nrow-lb">{t}</span>
              <span className="nrow-d up">{CAMPANAS.filter(c => c.tipo === t).length}</span>
            </div>
          ))}
          <div className="acc-why">
            Los otros 10 "tipos" en realidad eran automatizaciones y se movieron a <b>Conversaciones</b>:
            recompra, referidos, recuperación. Ahí trabajan solos y no hace falta crear una campaña para cada uno.
          </div>
        </Card>
      </div>
    </div>
  );
}

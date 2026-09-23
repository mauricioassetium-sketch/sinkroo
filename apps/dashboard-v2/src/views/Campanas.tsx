import { useState } from 'react';
import { Card, Badge, Button, Progress } from '../components/ui';
import { ViewHead, Bars, Ring, BarRow, Gauge } from '../components/viz';
import { Publicar } from '../components/Publicar';
import { FlujoMiroFish } from '../components/FlujoMiroFish';
import { Stepper, IngestaManual, Galeria, PASOS_CAMPANA, type PasoCampana } from '../components/CampanaPasos';
import { MotorEnVivo } from '../components/MotorEnVivo';
import { EnLinea } from '../components/EnLinea';
import { I_Megaphone, I_Palette, I_Check, I_Vote, I_File, I_Zap, I_Trend, I_Eye, I_Robot, I_Play, I_Upload } from '../components/icons';
import type { Vista } from '../components/Layout';
import { CAMPANAS, PANEL_ULTIMO, PANEL_PIEZAS, type Modo } from '../data/demo';

const GASTO = [40, 30, 12, 18, 9];
const GASTO_LB = CAMPANAS.map(c => c.nombre.split(' ')[0]);

export function ViewCampanas({ setToast, modo, setVista }: { setToast: (t: string) => void; modo: Modo; setVista: (v: Vista) => void }) {
  const [paso, setPaso] = useState<PasoCampana>(1);
  const [manual, setManual] = useState(false);
  const listos = PASOS_CAMPANA.filter(p => p.n < paso).map(p => p.n) as PasoCampana[];
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
        sub="Es un flujo por etapas: subís lo que tenés, Sinkroo crea, MiroFish vota y vos decidís mirando las piezas."
        nums={[
          { v: String(CAMPANAS.length), l: 'campañas' },
          { v: `$${diario}`, l: 'invertido por día', c: 'var(--green)' },
          { v: '3,8x', l: 'ROAS del mes' },
          { v: String(artefactos), l: 'artefactos producidos', c: 'var(--purple3)' },
        ]}
      />

      {/* ==================== EL FLUJO, POR ETAPAS ==================== */}
      <Stepper actual={paso} ir={setPaso} listos={listos} />

      {paso === 1 && (
        <>
          <Card className="atajo">
            <div className="row spread" style={{ gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
              <div className="row" style={{ gap: 11, flex: 1, minWidth: 240 }}>
                <span style={{ color: 'var(--purple3)', flexShrink: 0 }}><I_Robot size={20} /></span>
                <div style={{ minWidth: 0 }}>
                  <div className="bt">Paso 1 · Decile a Sinkroo qué querés</div>
                  <div className="bs">Subí la info y el material. Sinkroo elige el tipo de campaña, el ángulo y el público, crea todo y lo manda a MiroFish. <b>Todo lo que subas pasa por ahí.</b></div>
                </div>
              </div>
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <Button title="Arranca: Sinkroo investiga, crea las 5 opciones y las manda a MiroFish"
                  onClick={() => { setToast('Sinkroo arrancó: ahora lo ves en MiroFish'); setPaso(2); }}>
                  <I_Play size={14} /> Iniciar
                </Button>
                <Button variant="outline" className="btn-sm" title={manual ? 'Volver al camino con Sinkroo' : 'Si ya tenés las imágenes o los videos hechos, subilos y el panel los puntúa'}
                  onClick={() => setManual(!manual)}>
                  {manual ? <><I_Robot size={13} /> Mejor que lo haga Sinkroo</> : <><I_Upload size={13} /> Ya tengo todo listo</>}
                </Button>
              </div>
            </div>
          </Card>

          {manual
            ? <div style={{ marginTop: 16 }}><IngestaManual setToast={setToast} ir={setPaso} /></div>
            : <Publicar setToast={setToast} modo={modo} irAConversaciones={() => setVista('conversaciones')} soloIngesta />}
        </>
      )}

      {paso === 2 && (
        <>
          <div className="csec" style={{ marginTop: 16 }}>
            <span className="csec-n">2</span>
            <span className="csec-t">MiroFish</span>
            <span className="csec-c purple">{'5 perfiles'}</span>
            <span className="csec-s">Todo lo que subiste cae acá: el mercado lo mira, vota y lo ordena del 1 al 5</span>
          </div>
          <MotorEnVivo setToast={setToast} />
          <FlujoMiroFish modo={modo} setToast={setToast} nombre="tu campaña" esAnuncio />
        </>
      )}

      {paso === 3 && <Galeria modo={modo} setToast={setToast} ir={setPaso} />}

      {paso === 4 && <EnLinea setToast={setToast} />}

      {paso === 5 && (<>
      <div className="csec" style={{ marginTop: 0 }}>
        <span className="csec-n">5</span>
        <span className="csec-t">Tus campañas y el panel</span>
        <span className="csec-s">Lo que está corriendo y el veredicto de la última pieza</span>
      </div>

      {/* ============ EL PANEL Y LAS PIEZAS ============ */}
      <div className="csec" style={{ marginTop: 26 }}>
        <span className="csec-n">1</span>
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
          <div className="bs" style={{ marginTop: 12 }}>
            El panel puntúa <b>cada pieza antes de publicarse</b>: arriba de 80 sale, entre 60 y 80 vuelve con la
            objeción más votada, y abajo de 60 no se gasta un peso.
          </div>
          <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <div className="dato"><span className="dato-l">Piezas puntuadas este mes</span><span className="dato-v">31</span></div>
            <div className="dato"><span className="dato-l">Aprobadas</span><span className="dato-v" style={{ color: 'var(--green)' }}>18</span></div>
            <div className="dato"><span className="dato-l">Frenadas a tiempo</span><span className="dato-v" style={{ color: 'var(--amber)' }}>13</span></div>
          </div>
          <div className="acc-why">
            <b>Una pieza que no pasa el panel nunca se publica.</b> El orden importa: primero convence al mercado simulado, después gasta tu dinero.
          </div>
        </Card>
      </div>

      {/* ============ LAS CAMPAÑAS ============ */}
      <div className="csec">
        <span className="csec-n">2</span>
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

            <div className="datos-row" style={{ marginTop: 12, paddingTop: 11, borderTop: '1px solid var(--border)' }}>
              <div className="dato"><span className="dato-l">Costo por venta</span><span className="dato-v">$2,10</span></div>
              <div className="dato"><span className="dato-l">Últimos 7 días</span><span className="dato-v" style={{ color: c.roas === '—' ? 'var(--muted)' : 'var(--green)' }}>{c.roas === '—' ? 'sin datos' : c.roas}</span></div>
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

      {/* ============ CÓMO VA EL MES Y QUÉ HACER ============ */}
      <div className="csec">
        <span className="csec-n">3</span>
        <span className="csec-t">Cómo va el mes y qué conviene hacer</span>
        <span className="csec-s">Con cuánta plata contás y en qué te conviene moverla</span>
      </div>
      <div className="duo">
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Zap size={14} style={{ color: 'var(--amber)' }} /> Tu presupuesto del mes</span>}
          action={<Badge tone="amber">queda 24%</Badge>}
        >
          <Gauge pct={76} label="Invertido del techo del mes" detalle="$1.240 de $1.640" color="var(--grad)" />
          <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <div className="dato"><span className="dato-l">Cierre proyectado</span><span className="dato-v">$1.580</span></div>
            <div className="dato"><span className="dato-l">Días que quedan</span><span className="dato-v">8</span></div>
            <div className="dato"><span className="dato-l">Techo por día</span><span className="dato-v" style={{ color: 'var(--green)' }}>$109</span></div>
          </div>
          <div>
            <div className="bs" style={{ marginBottom: 8 }}>Invertido por semana:</div>
            <Bars data={[280, 300, 320, 340]} labels={['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4']} color="#a855f7" fmt={v => `$${v}`} />
          </div>
          <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
            <Button variant="outline" className="btn-sm" title="Cambiás el techo mensual. El motor nunca lo pasa sin tu permiso."
              onClick={() => setToast('Cambiar el techo mensual (demo)')}>Cambiar el techo</Button>
            <Button variant="ghost" className="btn-sm" title="Muestra en qué se fue cada peso, campaña por campaña"
              onClick={() => setToast('Detalle del gasto (demo)')}>Ver el detalle</Button>
          </div>
          <div className="acc-why">
            Este es el <b>freno de gasto</b>: el motor mueve plata solo, pero nunca más allá del techo que pusiste.
            Si no cambiás nada, esta campaña se frena sola el día 30.
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Zap size={14} style={{ color: 'var(--green)' }} /> Qué conviene hacer ahora</span>}
          action={<Badge tone="amber">3 acciones</Badge>}
        >
          <div className="guards">
            <div className="guard">
              <span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Trend size={14} /></span>
              <span className="guard-lb">Subirle $5 por día a Retargeting carrito
                <small>Rinde 7,3x contra 3,8x de promedio: está limitada por presupuesto, no por demanda.</small>
              </span>
              <Button className="btn-sm" title="Sube el presupuesto de $18 a $23 por día. Reversible: podés volver al valor anterior cuando quieras."
                onClick={() => setToast('Retargeting carrito: $18 → $23 por día (demo)')}>+$5/día</Button>
            </div>
            <div className="guard">
              <span style={{ color: 'var(--red)', flexShrink: 0 }}><I_Zap size={14} /></span>
              <span className="guard-lb">Pausar Marca
                <small>Gasta $12 por día y devuelve 2,1x, abajo del 3,8x del promedio. Cada semana así cuesta unos $38 de margen.</small>
              </span>
              <Button variant="ghost" className="btn-sm" title="Pausa la campaña ahora. Es reversible: la reactivás con un clic desde la bitácora."
                onClick={() => setToast('Marca pausada. Reversible desde la bitácora (demo)')}>Pausar</Button>
            </div>
            <div className="guard">
              <span style={{ color: 'var(--amber)', flexShrink: 0 }}><I_Eye size={14} /></span>
              <span className="guard-lb">Refrescar el creativo de Pack completo
                <small>La frecuencia subió a 4,1 y el CTR bajó 18% en 7 días: la misma gente lo está viendo demasiadas veces.</small>
              </span>
              <Button variant="ghost" className="btn-sm" title="Nia escribe 3 variantes del mismo mensaje para rotar el creativo. No toca el presupuesto."
                onClick={() => setToast('Nia está escribiendo 3 variantes (demo)')}>3 variantes</Button>
            </div>
          </div>
          <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <div className="dato"><span className="dato-l">Si aplicás las 3</span><span className="dato-v" style={{ color: 'var(--green)' }}>+$36/día</span></div>
            <div className="dato"><span className="dato-l">Riesgo</span><span className="dato-v">ninguno</span></div>
            <div className="dato"><span className="dato-l">Se deshace en</span><span className="dato-v" style={{ color: 'var(--purple3)' }}>24 h</span></div>
          </div>
          <div className="acc-why">
            Sale de tus propios números: compara cada campaña contra tu promedio.
            <b> Ninguna mueve más del 20% del presupuesto</b>, que es un freno duro que no se puede desactivar.
          </div>
        </Card>
      </div>
      </>)}
    </div>
  );
}

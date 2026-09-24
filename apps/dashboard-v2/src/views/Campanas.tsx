import { useState } from 'react';
import { Card, Badge, Button, Dinero, NotaMoneda } from '../components/ui';
import { ViewHead, Bars, Ring, Gauge } from '../components/viz';
import { Publicar } from '../components/Publicar';
import { FlujoMiroFish } from '../components/FlujoMiroFish';
import { Stepper, IngestaManual, Galeria, PASOS_CAMPANA, type PasoCampana } from '../components/CampanaPasos';
import { MotorEnVivo } from '../components/MotorEnVivo';
import { EnLinea } from '../components/EnLinea';
import { CampanaViva } from '../components/CampanaViva';
import { I_Megaphone, I_Check, I_Refresh, I_Vote, I_File, I_Zap, I_Trend, I_Eye, I_Robot, I_Play, I_Upload, I_Pause } from '../components/icons';
import type { Vista } from '../components/Layout';
import { CAMPANAS, type Modo } from '../data/demo';
import { PERFILES, puntaje, ranking } from '../data/mirofish';

const GASTO = [40, 30, 12, 18, 9];
const GASTO_LB = CAMPANAS.map(c => c.nombre.split(' ')[0]);

export function ViewCampanas({ setToast, modo, setVista }: { setToast: (t: string) => void; modo: Modo; setVista: (v: Vista) => void }) {
  const [paso, setPaso] = useState<PasoCampana>(1);
  const [manual, setManual] = useState(false);
  const listos = PASOS_CAMPANA.filter(p => p.n < paso).map(p => p.n) as PasoCampana[];
  // --- Última fila del paso 5: LISTA + DETALLE con una sola fuente de datos.
  // Las piezas y los jueces salen de mirofish.ts: las mismas 5 opciones de la galería del paso 3
  // y los mismos 5 perfiles que las votaron. El puntaje es el promedio de esos 5 votos.
  const piezasJuzgadas = ranking();                       // las 5, de mayor a menor puntaje
  const [elegida, setElegida] = useState<string>(() => piezasJuzgadas[0].id);
  const pieza = piezasJuzgadas.find(o => o.id === elegida) ?? piezasJuzgadas[0];
  const scorePieza = puntaje(pieza);
  const pasaPieza = scorePieza >= 80;
  const votosPieza = PERFILES.map(per => ({
    k: per.k, nombre: per.nombre, mira: per.mira,
    score: pieza.votos[per.k], opinion: pieza.opiniones[per.k],
  }));
  const votoMasBajo = votosPieza.reduce((a, b) => (b.score < a.score ? b : a));
  const colorScore = (s: number) => (s >= 80 ? 'var(--green)' : s >= 60 ? 'var(--amber)' : 'var(--red)');
  const palabraVeredicto = (s: number) => (s >= 80 ? 'Lista' : s >= 60 ? 'Revisar' : 'No lanzar');
  const tonoVeredicto = (s: number): 'green' | 'amber' | 'red' => (s >= 80 ? 'green' : s >= 60 ? 'amber' : 'red');
  const criterioPieza = (s: number) => s >= 80
    ? `Pasa: arriba de 80 se publica. El promedio de los ${PERFILES.length} jueces dio ${s}.`
    : s >= 60
      ? `Vuelve con la objeción: entre 60 y 80 no gasta un peso hasta corregir eso. El promedio dio ${s}.`
      : `No se lanza: abajo de 60 no se gasta. El promedio de los ${PERFILES.length} jueces dio ${s}.`;
  const artefactos = CAMPANAS.reduce((s, c) => s + c.artefactos, 0);
  const diario = GASTO.reduce((s, v) => s + v, 0);
  const vivas = CAMPANAS.filter(c => c.estado === 'Activa');
  const otras = CAMPANAS.filter(c => c.estado !== 'Activa');
  const lblAccion = (e: string) => (e === 'Borrador' ? 'Publicar' : e === 'En pausa' ? 'Reactivar' : e === 'Finalizada' ? 'Ver el informe' : 'Pausar');
  const titleAccion = (c: typeof CAMPANAS[number]) =>
    c.estado === 'Borrador' ? 'Publica la campaña: arranca a gastar su presupuesto diario. Todavía no gastó nada.'
      : c.estado === 'En pausa' ? 'Reactiva la campaña y sigue desde donde estaba: no perdió ni el historial ni la pieza.'
        : c.estado === 'Finalizada' ? 'Abre el informe final: qué rindió y cuánto gastó en total.'
          : 'Pausa la campaña y deja de gastar. Es reversible: la reactivás cuando quieras.';

  return (
    <div className="dash">
      <ViewHead
        icon={<I_Megaphone size={19} />}
        titulo="Campañas"
        sub="Es un flujo por etapas: subís lo que tenés, Sinkroo crea, MiroFish vota y vos decidís mirando las piezas."
        nums={[
          { v: String(CAMPANAS.length), l: 'campañas' },
          { v: <Dinero monto={diario} />, l: 'invertido por día', c: 'var(--green)' },
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
                {!manual && (
                  <Button title="Arranca con el camino automático: Sinkroo elige el tipo de campaña, el ángulo y el público, crea las 5 opciones y las manda a MiroFish"
                    onClick={() => { setToast('Sinkroo arrancó: mirá el paso 2'); setPaso(2); }}>
                    <I_Play size={14} /> Iniciar
                  </Button>
                )}
                <Button variant="outline" className="btn-sm" title={manual ? 'Volver al camino con Sinkroo' : 'Si ya tenés las imágenes o los videos hechos, subilos y MiroFish los puntúa'}
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
            <span className="csec-c purple">{'5 jueces · 500 del público'}</span>
            <span className="csec-s">Todo lo que subiste cae acá: el mercado lo mira, vota y lo ordena del 1 al 5</span>
          </div>
          <MotorEnVivo setToast={setToast} />
          <FlujoMiroFish modo={modo} setToast={setToast} esAnuncio />
        </>
      )}

      {paso === 3 && <Galeria modo={modo} setToast={setToast} ir={setPaso} />}

      {paso === 4 && <EnLinea setToast={setToast} ir={setPaso} />}

      {paso === 5 && (<>
      <div className="csec" style={{ marginTop: 0 }}>
        <span className="csec-n">5</span>
        <span className="csec-t">Tus campañas y el panel</span>
        <span className="csec-s">Primero lo que está corriendo ahora, después los gráficos del mes y al final el veredicto de la última pieza</span>
      </div>

      {/* ============ 1. LAS QUE ESTÁN EN VIVO — la pieza, el texto del anuncio y el resultado ============ */}
      <div className="csec" style={{ marginTop: 6 }}>
        <span className="csec-n">1</span>
        <span className="csec-t">Tus campañas en vivo</span>
        <span className="csec-c purple">{vivas.length} corriendo</span>
        <span className="csec-s">Cada tarjeta muestra la pieza que se está viendo, el texto del anuncio y cómo está rindiendo</span>
      </div>
      <div className="cv-grid">
        {vivas.map(c => <CampanaViva key={c.id} c={c} setToast={setToast} />)}
      </div>

      {/* ============ 2. LAS QUE NO ESTÁN CORRIENDO — en fila compacta, sin ocupar media pantalla ============ */}
      <div className="csec">
        <span className="csec-n">2</span>
        <span className="csec-t">Las que no están corriendo</span>
        <span className="csec-c amber">{otras.length} sin correr</span>
        <span className="csec-s">No gastan nada y no pierden el historial: las reactivás cuando quieras</span>
      </div>
      <Card
        title={<span className="row" style={{ gap: 8 }}><I_Pause size={14} style={{ color: 'var(--amber)' }} /> El resto de tus campañas</span>}
        action={<Badge tone="muted">{otras.length} esperando</Badge>}
      >
        {otras.map(c => (
          <div key={c.id} className="cv-fila">
            <span className="cv-fila-emoji">{c.emoji}</span>
            <span className="cv-fila-nombre">
              <span className="bt">{c.nombre}</span>
              <span className="tiny muted">{c.tipo} · {c.plataforma} · {c.fechas}</span>
            </span>
            <Badge tone={c.estado === 'En pausa' ? 'amber' : c.estado === 'Borrador' ? 'muted' : 'purple'}>{c.estado}</Badge>
            <span className="cv-fila-datos">
              <span className="dato" title="Cuánto devuelve por cada peso invertido">
                <span className="dato-l">ROAS</span>
                <span className="dato-v" style={{ color: c.roas === '—' ? 'var(--muted)' : 'var(--green)' }}>{c.roas}</span>
              </span>
              <span className="dato" title="Lo que le pagás a Meta por día cuando la campaña corre">
                <span className="dato-l">Presupuesto</span>
                <span className="dato-v"><Dinero monto={c.presupuesto} /></span>
              </span>
              <span className="dato" title="Piezas que el motor ya creó para esta campaña">
                <span className="dato-l">Piezas</span>
                <span className="dato-v" style={{ color: 'var(--purple3)' }}>{c.artefactos}</span>
              </span>
            </span>
            <Button variant="ghost" className="btn-sm" title={titleAccion(c)}
              onClick={() => setToast(`${lblAccion(c.estado)} «${c.nombre}» (demo)`)}>
              {lblAccion(c.estado)}
            </Button>
          </div>
        ))}
        <div className="acc-why">
          Una campaña en pausa no gasta un peso y no pierde nada: queda esperando con sus piezas y su historial.
          <b> Los borradores no salen solos</b>: publicar siempre necesita tu OK, aunque el modo esté en Automático.
        </div>
      </Card>

      {/* ============ 3. LOS GRÁFICOS — cómo va el mes y qué conviene hacer ============ */}
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
          <Gauge pct={76} label="Invertido del techo del mes"
            detalle={<><Dinero monto={1240} equivalente={false} /> de <Dinero monto={1640} equivalente={false} /></>} color="var(--grad)" />
          <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <div className="dato"><span className="dato-l">Cierre proyectado</span><span className="dato-v"><Dinero monto={1580} /></span></div>
            <div className="dato"><span className="dato-l">Días que quedan</span><span className="dato-v">8</span></div>
            <div className="dato"><span className="dato-l">Techo por día</span><span className="dato-v" style={{ color: 'var(--green)' }}><Dinero monto={109} /></span></div>
          </div>
          <div>
            <div className="bs" style={{ marginBottom: 8 }}>Invertido por semana:</div>
            <Bars data={[280, 300, 320, 340]} labels={['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4']} color="#a855f7" fmt={v => <Dinero monto={v} equivalente={false} />} />
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
          <NotaMoneda />
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
                onClick={() => setToast('Retargeting carrito: $18 → $23 por día (demo)')}>+<Dinero monto={5} equivalente={false} />/día</Button>
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
            <div className="dato"><span className="dato-l">Si aplicás las 3</span><span className="dato-v" style={{ color: 'var(--green)' }}>+<Dinero monto={36} />/día</span></div>
            <div className="dato"><span className="dato-l">Riesgo</span><span className="dato-v">ninguno</span></div>
            <div className="dato"><span className="dato-l">Se deshace en</span><span className="dato-v" style={{ color: 'var(--purple3)' }}>24 h</span></div>
          </div>
          <div className="acc-why">
            Sale de tus propios números: compara cada campaña contra tu promedio.
            <b> Ninguna mueve más del 20% del presupuesto</b>, que es un freno duro que no se puede desactivar.
          </div>
        </Card>
      </div>

      {/* El gráfico de gasto cierra la sección: qué campaña se lleva cada peso del techo diario */}
      <Card
        title={<span className="row" style={{ gap: 8 }}><I_Zap size={14} style={{ color: 'var(--green)' }} /> Dónde va tu presupuesto</span>}
        action={<Badge tone="green"><Dinero monto={diario} equivalente={false} />/día</Badge>}
      >
        <div className="graf-ancho">
          <Bars data={GASTO} labels={GASTO_LB} color="#a855f7" fmt={v => <Dinero monto={v} equivalente={false} />} />
          <div className="col-stack">
            <div className="datos-row">
              <div className="dato"><span className="dato-l">Por semana</span><span className="dato-v"><Dinero monto={diario * 7} /></span></div>
              <div className="dato"><span className="dato-l">Por mes</span><span className="dato-v"><Dinero monto={diario * 30} /></span></div>
              <div className="dato"><span className="dato-l">La que más rinde</span><span className="dato-v" style={{ color: 'var(--green)' }}>Pack completo · 7,3x</span></div>
            </div>
            <div className="acc-why">
              El presupuesto se reparte según lo que rinde, no según lo que ya estaba cargado.
              <b> El motor mueve plata solo</b> cuando el modo está en Automático y dentro de los frenos.
            </div>
          </div>
        </div>
      </Card>

      {/* ============ 4. LA LISTA DE PIEZAS Y EL VEREDICTO DE LA ELEGIDA — lista + detalle, con los mismos 5 jueces ============ */}
      <div className="csec">
        <span className="csec-n">4</span>
        <span className="csec-t">El veredicto y tus piezas</span>
        <span className="csec-c purple">{PERFILES.length} jueces · {piezasJuzgadas.length} piezas</span>
        <span className="csec-s">Elegí una pieza de la lista y al lado ves, voto por voto, cómo la juzgaron los 5 jueces y qué hay que corregirle</span>
      </div>
      <div className="duo">
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_File size={14} style={{ color: 'var(--purple3)' }} /> Tus piezas, juzgadas</span>}
          action={<Badge tone="muted">{piezasJuzgadas.length} en el lote</Badge>}
        >
          <div className="datos-row">
            <div className="dato" title="Todas las piezas que pasaron por los jueces este mes, no solo las de este lote">
              <span className="dato-l">Juzgadas este mes</span>
              <span className="dato-v">31</span>
            </div>
            <div className="dato" title="Las que pasaron el mínimo de 80 y salieron a tus redes">
              <span className="dato-l">Pasaron</span>
              <span className="dato-v" style={{ color: 'var(--green)' }}>18</span>
            </div>
            <div className="dato" title="Las que volvieron con la objeción antes de gastar un peso">
              <span className="dato-l">Frenadas a tiempo</span>
              <span className="dato-v" style={{ color: 'var(--amber)' }}>13</span>
            </div>
          </div>

          <div className="pz-filas">
            {piezasJuzgadas.map(o => {
              const s = puntaje(o);
              return (
                <button key={o.id} className={`pz-fila ${o.id === pieza.id ? 'on' : ''}`}
                  title={`Muestra en la tarjeta de al lado cómo la votaron los ${PERFILES.length} jueces, uno por uno. No publica nada: acá no se gasta un peso.`}
                  onClick={() => setElegida(o.id)}>
                  <span className="pz-fila-n" style={{ color: colorScore(s) }}>{s}</span>
                  <span className="pz-fila-txt">
                    <span className="pz-fila-t">{o.titulo}</span>
                    <span className="pz-fila-m">{o.formato} · {o.medida}</span>
                    <span className="pz-fila-v">Los {PERFILES.length} votos: {PERFILES.map(per => o.votos[per.k]).join(' · ')}</span>
                  </span>
                  <Badge tone={tonoVeredicto(s)}>{palabraVeredicto(s)}</Badge>
                </button>
              );
            })}
          </div>

          <div className="bs">
            El panel puntúa <b>cada pieza antes de publicarse</b>: arriba de 80 sale, entre 60 y 80 vuelve con la
            objeción del juez que votó más bajo, y abajo de 60 no se gasta un peso.
          </div>
          <div className="acc-why">
            <b>Las {piezasJuzgadas.length} de arriba son las últimas que votó el panel</b> y son las mismas de la galería
            del paso 3. El mes entero son 31: 18 salieron y 13 volvieron con la objeción antes de gastar.
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Vote size={14} style={{ color: 'var(--purple3)' }} /> El veredicto de la pieza elegida</span>}
          action={<Badge tone={tonoVeredicto(scorePieza)}>{palabraVeredicto(scorePieza).toLowerCase()}</Badge>}
        >
          <div className="row" style={{ gap: 20, marginBottom: 22, flexWrap: 'wrap' }}>
            <Ring valor={scorePieza} label="SCORE" sub="mínimo 80 para publicar" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="bt">{pieza.titulo}</div>
              <div className="bs" style={{ marginTop: 5 }}>
                {pieza.formato} · {pieza.medida} · los {PERFILES.length} jueces la miraron 8 segundos.
              </div>
              <div className="bs" style={{ marginTop: 8 }}><b>{criterioPieza(scorePieza)}</b></div>
            </div>
          </div>

          <div className="guards">
            {votosPieza.map(v => (
              <div key={v.k} className="guard">
                <span style={{ width: 34, flexShrink: 0, textAlign: 'center', fontSize: 17, fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: colorScore(v.score) }}>{v.score}</span>
                <span className="guard-lb">
                  {v.nombre} <span className="tiny muted">· {v.mira}</span>
                  <small>«{v.opinion}»</small>
                </span>
              </div>
            ))}
          </div>

          <div className="alarm atencion">
            <div className="alarm-head">
              <span className="alarm-sev atencion">{pasaPieza ? 'EL VOTO MÁS BAJO' : 'LO QUE HAY QUE ARREGLAR'}</span>
              <span className="alarm-title">{votoMasBajo.nombre} fue el más duro: le puso {votoMasBajo.score} de 100.</span>
            </div>
            <div className="alarm-sug">
              «{votoMasBajo.opinion}» <b>{pasaPieza
                ? `No frena la publicación: es lo que hay que resolver si querés subirla de ${scorePieza}.`
                : 'Es la objeción a corregir antes de gastar un peso.'}</b>
            </div>
          </div>

          <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
            {pasaPieza ? (
              <Button className="btn-sm"
                title="Publica esta pieza en tus redes con el texto que ya aprobaron los 5 jueces. Es reversible: la pausás cuando quieras y no pierde el historial."
                onClick={() => setToast(`«${pieza.titulo}» sale a tus redes (demo)`)}>
                <I_Check size={13} /> Publicar esta
              </Button>
            ) : (
              <Button className="btn-sm"
                title="Nia corrige la pieza con esa objeción y los 5 jueces la vuelven a juzgar. Es reversible: si te gustaba más la versión de ahora, se vuelve a ella."
                onClick={() => setToast(`Nia corrige «${pieza.titulo}» y el panel la vuelve a juzgar (demo)`)}>
                <I_Refresh size={13} /> Corregir eso y volver a juzgarla
              </Button>
            )}
          </div>

          <div className="acc-why">
            <b>Ninguna pieza se publica sin pasar el mínimo.</b> Cuando corregís una, los 5 jueces la vuelven a votar
            y el voto nuevo queda al lado del anterior: así se ve si la objeción se resolvió.
          </div>
        </Card>
      </div>
      </>)}
    </div>
  );
}

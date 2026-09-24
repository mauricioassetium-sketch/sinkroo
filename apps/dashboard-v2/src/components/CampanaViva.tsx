import { Badge, Button, Progress, Dinero } from './ui';
import { I_Film, I_Image, I_Pause, I_File, I_Users, I_Cal, I_Target } from './icons';
import type { Campana } from '../data/demo';

// =============================================================================================
// LA CAMPAÑA QUE ESTÁ EN VIVO — la tarjeta visual de la sub-pantalla 5
//
// Arriba, el marco de la pieza que está corriendo (mismo lenguaje visual que la galería:
// .pz-frame, .pz-formato, .pz-ico, .pz-gancho, .pz-medida) con el texto del anuncio como si
// fuera el pie de la pieza. Abajo, los datos de la campaña y el resultado de la misma.
// =============================================================================================

const esVideo = (f: Campana['formato']) => f === 'Video vertical' || f === 'Reel';

export function CampanaViva({ c, setToast }: { c: Campana; setToast: (t: string) => void }) {
  const conDatos = c.roas !== '—';

  return (
    <div className="cv">
      {/* a) El marco visual de la pieza: el formato, el ícono, el rótulo EN VIVO y el texto del anuncio */}
      <div className="pz-frame cv-frame" style={{ background: `linear-gradient(150deg, ${c.color}, ${c.color}22 70%, var(--bg3))` }}>
        <span className="cv-live" title="La pieza se está mostrando ahora mismo: la campaña está gastando y midiendo">
          <span className="dot-live" /> EN VIVO
        </span>
        <span className="pz-formato">{esVideo(c.formato) ? <><I_Film size={12} /> {c.formato}</> : <><I_Image size={12} /> {c.formato}</>}</span>
        <span className="pz-ico">{esVideo(c.formato) ? <I_Film size={34} /> : <I_Image size={34} />}</span>
        <span className="pz-gancho">{c.copy}</span>
        <span className="pz-medida">{c.medida} · Botón: «{c.cta}»</span>
      </div>

      <div className="cv-body">
        {/* b) De qué es la campaña: nombre, objetivo, dónde corre, a quién le habla y desde cuándo */}
        <div className="row spread" style={{ gap: 10, alignItems: 'flex-start' }}>
          <div className="row" style={{ gap: 9, minWidth: 0 }}>
            <span style={{ fontSize: 20 }}>{c.emoji}</span>
            <div style={{ minWidth: 0 }}>
              <div className="bt">{c.nombre}</div>
              <div className="tiny muted">{c.tipo}</div>
            </div>
          </div>
          <Badge tone="green">{c.estado}</Badge>
        </div>

        <div className="cv-meta">
          <span className="row" style={{ gap: 7 }} title="Dónde se está publicando la pieza"><I_Target size={12} /> {c.plataforma}</span>
          <span className="row" style={{ gap: 7 }} title="A quién le está hablando la campaña"><I_Users size={12} /> {c.publico}</span>
          <span className="row" style={{ gap: 7 }} title="Desde cuándo corre y en qué día va"><I_Cal size={12} /> {c.fechas}</span>
        </div>

        {/* c) El resultado de esa campaña */}
        <div className="datos-row" style={{ paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <div className="dato" title="Cuánto devuelve por cada peso invertido">
            <span className="dato-l">ROAS</span>
            <span className="dato-v" style={{ color: conDatos ? 'var(--green)' : 'var(--muted)' }}>{c.roas}</span>
          </div>
          <div className="dato" title="Personas distintas que vieron la pieza">
            <span className="dato-l">Alcance</span>
            <span className="dato-v">{c.alcance}</span>
          </div>
          <div className="dato" title="Ventas y conversaciones cerradas por esta campaña">
            <span className="dato-l">Conversiones</span>
            <span className="dato-v">{c.conversiones}</span>
          </div>
          <div className="dato" title="Lo que lleva gastado la campaña desde que arrancó">
            <span className="dato-l">Gastado</span>
            <span className="dato-v"><Dinero monto={c.gastado} /></span>
          </div>
        </div>

        <div title="Cuánto del presupuesto que le asignaste a esta campaña ya se gastó. Al 100% el motor la frena sola.">
          <div className="row spread tiny muted" style={{ marginBottom: 6 }}>
            <span>Presupuesto consumido</span><span>{c.pct}%</span>
          </div>
          <Progress pct={c.pct} color={c.pct > 70 ? 'amber' : 'purple'} />
        </div>

        <div className="datos-row">
          <div className="dato" title="Lo que le pagás a Meta por día para que la campaña corra">
            <span className="dato-l">Presupuesto</span>
            <span className="dato-v"><Dinero monto={c.presupuesto} /></span>
          </div>
          <div className="dato" title="Cuánto te cuesta cada venta que trae esta campaña">
            <span className="dato-l">Costo por venta</span>
            <span className="dato-v" style={{ color: c.costo === '—' ? 'var(--muted)' : 'var(--txt)' }}><Dinero monto={c.costo} /></span>
          </div>
          <div className="dato" title="El puntaje que le dieron los 5 jueces de MiroFish antes de publicarse (mínimo 80)">
            <span className="dato-l">Score</span>
            <span className="dato-v" style={{ color: c.score >= 80 ? 'var(--green)' : c.score >= 60 ? 'var(--amber)' : 'var(--red)' }}>{c.score}</span>
          </div>
          <div className="dato" title="Piezas que el motor creó para esta campaña">
            <span className="dato-l">Artefactos</span>
            <span className="dato-v" style={{ color: 'var(--purple3)' }}>{c.artefactos}</span>
          </div>
        </div>

        {/* d) Lo que podés hacer con la campaña que está corriendo */}
        <div className="row cv-acciones">
          <Button variant="ghost" className="btn-sm"
            title="Frena la campaña y deja de gastar. Es reversible: la reactivás con un clic desde la bitácora."
            onClick={() => setToast(`«${c.nombre}» en pausa. Reversible desde la bitácora (demo)`)}>
            <I_Pause size={12} /> Pausar
          </Button>
          <Button variant="outline" className="btn-sm"
            title={`Ver las ${c.artefactos} piezas de esta campaña y qué votó MiroFish en cada una`}
            onClick={() => setToast(`Las ${c.artefactos} piezas de «${c.nombre}» (demo)`)}>
            <I_File size={12} /> Ver las piezas
          </Button>
        </div>
      </div>
    </div>
  );
}

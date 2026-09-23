import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export type TourStep = {
  selector: string;
  titulo: string;
  texto: string;
  posicion?: 'top' | 'bottom' | 'left' | 'right' | 'center';
};

export function Tour({ pasos, onFinish, onSkip }: { pasos: TourStep[]; onFinish: () => void; onSkip: () => void }) {
  const [i, setI] = useState(0);
  const [pos, setPos] = useState<{ top: number; left: number; w: number; h: number; ready: boolean }>({ top: 0, left: 0, w: 0, h: 0, ready: false });
  const tipRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    let cancel = false;
    const medir = () => {
      const el = document.querySelector(pasos[i].selector);
      if (!el || cancel) return;
      const r = el.getBoundingClientRect();
      setPos({ top: r.top, left: r.left, w: r.width, h: r.height, ready: true });
    };
    setPos(p => ({ ...p, ready: false }));
    medir();
    const t = setInterval(medir, 200);
    return () => { cancel = true; clearInterval(t); };
  }, [i, pasos]);

  const avanzar = () => { if (i < pasos.length - 1) setI(i + 1); else onFinish(); };
  const retroceder = () => { if (i > 0) setI(i - 1); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSkip();
      else if (e.key === 'ArrowRight') avanzar();
      else if (e.key === 'ArrowLeft') retroceder();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  if (!pos.ready) return null;

  const paso = pasos[i];
  const PAD = 6;
  const tipW = 310;
  const tipH = 190;
  const VW = window.innerWidth;
  const VH = window.innerHeight;

  let tipTop = 0;
  let tipLeft = 0;

  if (paso.posicion === 'center') {
    tipTop = VH / 2 - tipH / 2;
    tipLeft = VW / 2 - tipW / 2;
  } else {
    const encima = (paso.posicion || 'top') !== 'bottom';
    tipTop = encima ? pos.top - tipH - 12 : pos.top + pos.h + 12;
    if (tipTop < 10) tipTop = pos.top + pos.h + 12;
    if (tipTop + tipH > VH - 10) tipTop = pos.top - tipH - 12;
    tipLeft = pos.left + pos.w / 2 - tipW / 2;
    tipLeft = Math.max(10, Math.min(tipLeft, VW - tipW - 10));
  }

  return (
    <div>
      <div className="tour-overlay" onClick={onSkip} />
      <div className="tour-spot" style={{ top: pos.top - PAD, left: pos.left - PAD, width: pos.w + PAD * 2, height: pos.h + PAD * 2 }} />
      <div className="tour-tip" ref={tipRef} style={{ top: tipTop, left: tipLeft }}>
        <div className="tour-step">PASO {i + 1} DE {pasos.length}</div>
        <div className="tour-title">{paso.titulo}</div>
        <div className="tour-text">{paso.texto}</div>
        <div className="tour-dots">
          {pasos.map((_, k) => <span key={k} className={`tour-dot ${k === i ? 'on' : ''} ${k < i ? 'done' : ''}`} />)}
        </div>
        <div className="tour-btns">
          <button className="tour-btn-skip" onClick={onSkip}>Saltar tour</button>
          <div style={{ display: 'flex', gap: 8 }}>
            {i > 0 && <button className="tour-btn-ghost" onClick={retroceder}>← Atrás</button>}
            <button className="tour-btn-grad" onClick={avanzar}>{i === pasos.length - 1 ? 'Finalizar ✓' : 'Siguiente →'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

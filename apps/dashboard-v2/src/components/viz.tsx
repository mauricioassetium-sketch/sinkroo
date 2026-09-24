import type { ReactNode } from 'react';
import { Spark } from './charts';

// =============================================================================================
// VOCABULARIO VISUAL DE SINKROO v2
//
// Diseñado a medida sobre el design system: cada pieza usa las variables de color del tema,
// así que funciona igual en claro y en oscuro. Sin SVG que se deforme ni escalados raros.
// =============================================================================================

/** Barras verticales con su valor arriba y su etiqueta abajo. */
export function Bars({ data, labels, color = '#a855f7', track = 92, fmt }: {
  data: number[]; labels?: string[]; color?: string; track?: number; fmt?: (v: number) => ReactNode;
}) {
  const max = Math.max(...data, 1);
  return (
    <div className="bars">
      {data.map((v, i) => (
        <div key={i} className="bars-col">
          <div className="bars-val" style={{ color }}>{fmt ? fmt(v) : v}</div>
          <div className="bars-track" style={{ height: track }}>
            <div className="bars-bar" style={{ height: `${Math.max(3, (v / max) * 100)}%`, background: color }} />
          </div>
          <div className="bars-lb">{labels?.[i] ?? ''}</div>
        </div>
      ))}
    </div>
  );
}

/** Anillo de progreso (0-100) con el valor en el centro. */
export function Ring({ valor, max = 100, label, sub, color, size = 104 }: {
  valor: number; max?: number; label?: string; sub?: string; color?: string; size?: number;
}) {
  const pct = Math.max(0, Math.min(100, (valor / max) * 100));
  const c = color ?? (pct >= 80 ? 'var(--green)' : pct >= 60 ? 'var(--amber)' : 'var(--red)');
  return (
    <div className="ring-wrap">
      <div className="ring" style={{ width: size, height: size, ['--p' as any]: pct, ['--c' as any]: c }}>
        <div className="ring-in">
          <div className="ring-v" style={{ color: c }}>{valor}</div>
          {label && <div className="ring-l">{label}</div>}
        </div>
      </div>
      {sub && <div className="ring-sub">{sub}</div>}
    </div>
  );
}

/** Barra horizontal con etiqueta y valor: para distribuciones. */
export function BarRow({ label, valor, max, color = 'var(--purple2)', sufijo, formato }: {
  label?: string; valor: number; max: number; color?: string; sufijo?: string; formato?: string;
}) {
  return (
    <div className="brow">
      {label ? <span className="brow-lb">{label}</span> : null}
      <span className="brow-bar">
        <span className="brow-fill" style={{ width: `${Math.max(2, (valor / (max || 1)) * 100)}%`, background: color }} />
      </span>
      <span className="brow-v">{formato ?? valor}{sufijo ?? ''}</span>
    </div>
  );
}

/** Medidor lineal: para recursos que se consumen (créditos, días de autonomía). */
export function Gauge({ pct, label, detalle, color }: { pct: number; label: string; detalle?: ReactNode; color?: string }) {
  return (
    <div className="gauge">
      <div className="row spread" style={{ marginBottom: 7 }}>
        <span className="tiny" style={{ fontWeight: 700 }}>{label}</span>
        {detalle && <span className="tiny muted">{detalle}</span>}
      </div>
      <div className="gauge-bar"><div className="gauge-fill" style={{ width: `${Math.min(100, pct)}%`, background: color ?? 'var(--grad)' }} /></div>
    </div>
  );
}

/** Métrica con su sparkline: el patrón base de todo el dashboard. */
/** Métrica con diagrama circular: el anillo muestra qué tan cerca está de su meta. */
export function MetricaAnillo({ label, valor, delta, pct, meta, color = '#a855f7', up = true }: {
  label: string; valor: ReactNode; delta?: string; pct: number; meta?: ReactNode; color?: string; up?: boolean;
}) {
  const p = Math.max(0, Math.min(100, pct));
  const c = p >= 80 ? 'var(--green)' : p >= 60 ? 'var(--amber)' : 'var(--red)';
  return (
    <div className="metrica-r">
      <div className="ring" style={{ width: 76, height: 76, ['--p' as any]: p, ['--c' as any]: c }}>
        <div className="ring-in">
          <div className="ring-v" style={{ color: c, fontSize: 16, letterSpacing: '-.5px' }}>{p}%</div>
        </div>
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="metrica-lb">{label}</div>
        <div className="metrica-v" style={{ color }}>{valor}</div>
        {meta && <div className="metrica-meta">{meta}</div>}
        {delta && <div className={`metrica-d ${up ? 'up' : 'down'}`}>{delta}</div>}
      </div>
    </div>
  );
}

export function Metrica({ label, valor, delta, serie, color = '#a855f7', sub, up = true }: {
  label: string; valor: ReactNode; delta?: string; serie?: number[]; color?: string; sub?: string; up?: boolean;
}) {
  return (
    <div className="metrica">
      <div className="metrica-lb">{label}{sub && <span className="metrica-sub">{sub}</span>}</div>
      {serie && <span className="metrica-spark"><Spark data={serie} width={70} height={26} color={color} /></span>}
      <div className="metrica-v" style={{ color }}>{valor}</div>
      {delta && <div className={`metrica-d ${up ? 'up' : 'down'}`}>{delta}</div>}
    </div>
  );
}

export { Spark };

/** Fila de cifras compacta: se usa como encabezado en todas las vistas. */
export function Cifras({ nums }: { nums: { v: ReactNode; l: string; c?: string }[] }) {
  return (
    <div className="cifras">
      {nums.map((n, i) => (
        <div key={i} className="cifra">
          <div className="cifra-v" style={{ color: n.c }}>{n.v}</div>
          <div className="cifra-l">{n.l}</div>
        </div>
      ))}
    </div>
  );
}

/** Encabezado de vista: coherente en las 5 pantallas. */
export function ViewHead({ icon, titulo, sub, nums, accion }: {
  icon: ReactNode; titulo: string; sub: string; nums: { v: ReactNode; l: string; c?: string }[]; accion?: ReactNode;
}) {
  return (
    <div className="vhead card">
      <div className="vhead-txt">
        <span className="vhead-ico">{icon}</span>
        <div style={{ minWidth: 0 }}>
          <div className="vhead-t">{titulo}</div>
          <div className="vhead-s">{sub}</div>
        </div>
      </div>
      <Cifras nums={nums} />
      {accion}
    </div>
  );
}

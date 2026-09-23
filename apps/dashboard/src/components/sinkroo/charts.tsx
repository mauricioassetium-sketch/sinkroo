import { useId, useState } from 'react';

// Línea sofisticada: grid, gradiente, smooth curve, tooltip, glow en punto activo
export function LineChart({ data, height = 200, stroke = '#a855f7', labels }: { data: number[]; height?: number; stroke?: string; labels?: string[] }) {
  const id = useId().replace(/:/g, '');
  const [hover, setHover] = useState<number | null>(null);
  const W = 600, H = 220;
  const PAD = { l: 34, r: 14, t: 16, b: 26 };
  const max = Math.max(...data), min = Math.min(...data, 0);
  const niceMax = Math.ceil(max * 1.12);

  const X = (i: number) => PAD.l + (i / (data.length - 1)) * (W - PAD.l - PAD.r);
  const Y = (v: number) => PAD.t + (1 - (v - min) / (niceMax - min)) * (H - PAD.t - PAD.b);

  const pts = data.map((v, i) => [X(i), Y(v)] as const);

  // curva suave (catmull-rom -> bezier)
  const line = pts.map((p, i) => {
    if (i === 0) return `M${p[0].toFixed(1)},${p[1].toFixed(1)}`;
    const p0 = pts[i - 1], p1 = p;
    const cx = (p0[0] + p1[0]) / 2;
    return `C${cx.toFixed(1)},${p0[1].toFixed(1)} ${cx.toFixed(1)},${p1[1].toFixed(1)} ${p1[0].toFixed(1)},${p1[1].toFixed(1)}`;
  }).join(' ');
  const area = `${line} L${pts[pts.length - 1][0]},${H - PAD.b} L${PAD.l},${H - PAD.b} Z`;

  // gridlines Y
  const gridsteps = 4;
  const gridLines = Array.from({ length: gridsteps + 1 }, (_, i) => {
    const val = min + ((niceMax - min) * i) / gridsteps;
    return { y: Y(val), val: Math.round(val) };
  });

  const hov = hover !== null ? pts[hover] : null;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height, display: 'block' }}>
        <defs>
          <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity=".42"/>
            <stop offset="60%" stopColor={stroke} stopOpacity=".08"/>
            <stop offset="100%" stopColor={stroke} stopOpacity="0"/>
          </linearGradient>
          <linearGradient id={`s${id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#9333ea"/><stop offset="50%" stopColor="#a855f7"/><stop offset="100%" stopColor="#c084fc"/>
          </linearGradient>
          <filter id={`f${id}`} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* grid + labels Y */}
        {gridLines.map((g, i) => (
          <g key={i}>
            <line x1={PAD.l} y1={g.y} x2={W - PAD.r} y2={g.y} stroke="var(--border2)" strokeWidth="1" strokeDasharray="3 5" opacity=".5" />
            <text x={PAD.l - 8} y={g.y + 3} textAnchor="end" fontSize="9" fill="var(--muted)" fontFamily="Inter, sans-serif">{g.val}</text>
          </g>
        ))}

        {/* area */}
        <path d={area} fill={`url(#g${id})`} />

        {/* línea con gradiente + glow */}
        <path d={line} fill="none" stroke={`url(#s${id})`} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" filter={`url(#f${id})`} />

        {/* puntos */}
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={hover === i ? 6 : 4.4} fill={stroke} stroke="var(--card)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" style={{ transition: 'r .12s', cursor: 'pointer' }} />
        ))}

        {/* crosshair en hover */}
        {hov && (
          <g>
            <line x1={hov[0]} y1={PAD.t} x2={hov[0]} y2={H - PAD.b} stroke={stroke} strokeWidth="1" strokeDasharray="3 4" opacity=".7" />
            <circle cx={hov[0]} cy={hov[1]} r="8" fill="none" stroke={stroke} strokeWidth="1.5" opacity=".5" vectorEffect="non-scaling-stroke" />
          </g>
        )}

        {/* captura de hover, overlay transparente por columna */}
        {pts.map((p, i) => (
          <rect key={`h${i}`} x={p[0] - (W / data.length) / 2} y={PAD.t} width={W / data.length} height={H - PAD.t - PAD.b} fill="transparent"
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: 'pointer' }} />
        ))}
      </svg>

      {/* tooltip */}
      {hov && (
        <div style={{
          position: 'absolute', left: `${(hov[0] / W) * 100}%`, top: `${(hov[1] / H) * 100}%`,
          transform: 'translate(-50%, -130%)', pointerEvents: 'none',
          background: 'var(--card)', border: '1px solid var(--border2)', borderRadius: 8,
          padding: '6px 10px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
          boxShadow: '0 6px 20px rgba(0,0,0,.45)', zIndex: 5
        }}>
          <div style={{ color: 'var(--muted)', fontSize: 10, fontWeight: 600 }}>{labels?.[hover!] ?? `Mes ${(hover ?? 0) + 1}`}</div>
          <div style={{ color: '#c084fc' }}>${data[hover!].toLocaleString()}</div>
        </div>
      )}
    </div>
  );
}

// Barras verticales sofisticadas: grid, eje Y $, gradiente+glow, valores sobre cada barra
export function BarChart({ data, labels, height = 200, color = '#a855f7', prefix = '$' }: { data: number[]; labels?: string[]; height?: number; color?: string; prefix?: string }) {
  const id = useId().replace(/:/g, '');
  const [hover, setHover] = useState<number | null>(null);
  const W = 600, H = 240;
  const PAD = { l: 40, r: 12, t: 20, b: 28 };
  const max = Math.max(...data, 1);
  const niceMax = Math.ceil(max * 1.15);
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const bw = plotW / data.length;

  const Y = (v: number) => PAD.t + (1 - v / niceMax) * plotH;
  const gridsteps = 4;
  const gridLines = Array.from({ length: gridsteps + 1 }, (_, i) => {
    const val = (niceMax * i) / gridsteps;
    return { y: Y(val), val };
  });

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height, display: 'block' }}>
        <defs>
          <linearGradient id={`b${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c084fc"/><stop offset="45%" stopColor={color}/><stop offset="100%" stopColor="#7c3aed"/>
          </linearGradient>
          <linearGradient id={`bg${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity=".22"/><stop offset="100%" stopColor={color} stopOpacity="0"/>
          </linearGradient>
          <filter id={`bf${id}`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* fondo degradado suave */}
        <rect x={PAD.l} y={PAD.t} width={plotW} height={plotH} fill={`url(#bg${id})`} rx="8" />

        {/* grid + labels Y ($) */}
        {gridLines.map((g, i) => (
          <g key={i}>
            <line x1={PAD.l} y1={g.y} x2={W - PAD.r} y2={g.y} stroke="var(--border2)" strokeWidth="1" strokeDasharray="3 5" opacity=".5" />
            <text x={PAD.l - 8} y={g.y + 3} textAnchor="end" fontSize="9" fill="var(--muted)" fontFamily="Inter, sans-serif">{prefix}{Math.round(g.val)}</text>
          </g>
        ))}

        {/* barras */}
        {data.map((v, i) => {
          const x = PAD.l + i * bw + bw * 0.18;
          const w = bw * 0.64;
          const h = Y(0) - Y(v);
          const y = Y(v);
          const active = hover === i;
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: 'pointer' }}>
              <rect x={x} y={y} width={w} height={h} rx="5" fill={`url(#b${id})`} opacity={hover === null || active ? 1 : .55} filter={`url(#bf${id})`} style={{ transition: 'opacity .15s' }} />
              {/* valor sobre la barra */}
              <text x={x + w / 2} y={y - 7} textAnchor="middle" fontSize="10.5" fontWeight="700" fill={active ? '#e9d5ff' : 'var(--muted)'} fontFamily="Inter, sans-serif">{prefix}{v}</text>
              {/* barra fantasma para hover en toda la columna */}
              <rect x={PAD.l + i * bw} y={PAD.t} width={bw} height={plotH} fill="transparent" />
            </g>
          );
        })}

        {/* labels X */}
        {labels && labels.map((l, i) => {
          const cx = PAD.l + i * bw + bw / 2;
          return <text key={i} x={cx} y={H - PAD.b + 16} textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--muted)" fontFamily="Inter, sans-serif">{l}</text>;
        })}
      </svg>

      {/* tooltip */}
      {hover !== null && (
        <div style={{
          position: 'absolute', left: `${((PAD.l + hover * bw + bw / 2) / W) * 100}%`, top: `${(Y(data[hover]) / H) * 100}%`,
          transform: 'translate(-50%, -120%)', pointerEvents: 'none',
          background: 'var(--card)', border: '1px solid var(--border2)', borderRadius: 8,
          padding: '6px 10px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
          boxShadow: '0 6px 20px rgba(0,0,0,.45)', zIndex: 5, textAlign: 'center'
        }}>
          <div style={{ color: 'var(--muted)', fontSize: 10, fontWeight: 600 }}>{labels?.[hover] ?? `N°${hover + 1}`}</div>
          <div style={{ color: '#c084fc' }}>{prefix}{data[hover].toLocaleString()}</div>
        </div>
      )}
    </div>
  );
}

// Donut con gradiente (púrpura -> azul)
export function Donut({ value, size = 110, stroke = 10, label }: { value: number; size?: number; stroke?: number; color?: string; label?: string }) {
  const gid = useId().replace(/:/g, '');
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(Math.max(value, 0), 100) / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <linearGradient id={`dn${gid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a855f7"/><stop offset="55%" stopColor="#c026d3"/><stop offset="100%" stopColor="#ec4899"/>
        </linearGradient>
      </defs>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border2)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={`url(#dn${gid})`} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} transform={`rotate(-90 ${size/2} ${size/2})`} style={{ transition: 'stroke-dashoffset .6s' }} />
      <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" fill="var(--txt)" fontSize={size * 0.2} fontWeight="800">{value}%</text>
      {label && <text x="50%" y="63%" textAnchor="middle" dominantBaseline="middle" fill="var(--muted)" fontSize={size * 0.09}>{label}</text>}
    </svg>
  );
}

// Sparkline mini (stats)
export function Spark({ data, width = 90, height = 30, color = '#a855f7' }: { data: number[]; width?: number; height?: number; color?: string }) {
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 6) - 3;
    return [x, y] as const;
  });
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  return <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}><path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

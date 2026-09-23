import type { ReactNode } from 'react';
import { I_X } from './icons';

export function Badge({ children, tone = 'purple' }: { children: ReactNode; tone?: 'purple'|'green'|'amber'|'red'|'muted' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Button({ children, onClick, variant = 'primary', className = '', disabled, style }: { children: ReactNode; onClick?: () => void; variant?: 'primary'|'ghost'|'outline'|'danger'; className?: string; disabled?: boolean; style?: any }) {
  return <button className={`btn btn-${variant} ${className}`} onClick={onClick} disabled={disabled} style={style}>{children}</button>;
}

export function Toast({ show, text }: { show: boolean; text: string }) {
  return <div className={`toast ${show ? 'show' : ''}`}>{text}</div>;
}

export function Avatar({ name, size = 40, tone = 0 }: { name: string; size?: number; tone?: number }) {
  const cols = ['#a855f7', '#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4'];
  const c = cols[tone % cols.length];
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return <div className="av grad-ring" style={{ width: size, height: size, fontSize: size * 0.36, background: `linear-gradient(135deg, ${c}, ${c}cc)` }}>{initials}</div>;
}

export function StatCard({ label, value, delta, icon, spark, color = '#a855f7' }: { label: string; value: string; delta?: string; icon?: ReactNode; spark?: number[]; color?: string }) {
  return (
    <div className="card stat-card">
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        {icon && <span className="stat-ico" style={{ color }}>{icon}</span>}
      </div>
      <div className="stat-val">{value}</div>
      <div className="stat-bottom">
        {delta && <span className="stat-delta">{delta}</span>}
        {spark && <span className="stat-spark"><SparkMini data={spark} color={color} /></span>}
      </div>
    </div>
  );
}

function SparkMini({ data, color }: { data: number[]; color: string }) {
  const w = 90, h = 28;
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1) * w).toFixed(1)},${(h - ((v - min) / range) * (h - 6) - 3).toFixed(1)}`).join(' ');
  return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}><polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function Card({ children, className = '', title, action, tour }: { children: ReactNode; className?: string; title?: ReactNode; action?: ReactNode; tour?: string }) {
  return (
    <div className={`card ${className}`} data-tour={tour}>
      {(title || action) && <div className="card-head"><div className="card-title">{title}</div>{action}</div>}
      {children}
    </div>
  );
}

export function Progress({ pct, color = 'purple' }: { pct: number; color?: 'purple'|'amber' }) {
  return <div className="progress-bar"><div className={`progress-fill ${color === 'amber' ? 'fill-amber' : ''}`} style={{ width: `${Math.min(pct, 100)}%` }} /></div>;
}

export function Modal({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: ReactNode; title?: string }) {
  if (!open) return null;
  return (
    <div className="ob-modal-back" onClick={onClose}>
      <div className="card" style={{ maxWidth: 560, width: '100%', maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div className="card-title" style={{ fontSize: 16 }}>{title}</div>
          <button className="icon-btn" onClick={onClose}><I_X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

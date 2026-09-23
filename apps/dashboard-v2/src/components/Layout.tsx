import { useState, type ReactNode } from 'react';
import { SinkrooMark, I_Home, I_Megaphone, I_Whatsapp, I_Globe, I_Settings, I_Bell, I_Sun, I_Moon, I_Zap, I_Clock, I_Vote, I_Robot, I_Credit, I_Gift, I_Shield, I_Edit, I_Menu, I_X } from './icons';
import { TENANT, AGENTES, ALARMAS, DECISIONES, MODOS, type Modo } from '../data/demo';
import { usePerfil, inicialesDe } from '../lib/perfil';
import { PerfilModal } from './PerfilModal';

export type Vista = 'hoy' | 'campanas' | 'conversaciones' | 'mercado' | 'cuenta' | 'creditos' | 'referidos' | 'kyc';


/** Lleva al motor andando: si no estás en Hoy, cambia de vista y después baja hasta el bloque. */
export function bajarAlMotor(setVista: (v: Vista) => void) {
  setVista('hoy');
  window.setTimeout(() => {
    const m = document.getElementById('motor');
    if (m) m.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 160);
}

const NAV: { key: Vista; nombre: string; Icon: any }[] = [
  { key: 'hoy', nombre: 'Hoy', Icon: I_Home },
  { key: 'campanas', nombre: 'Campañas', Icon: I_Megaphone },
  { key: 'conversaciones', nombre: 'Conversaciones', Icon: I_Whatsapp },
  { key: 'mercado', nombre: 'Mercado', Icon: I_Globe },
];

// Para crecer: cargar el motor y traer gente
const NAV_CRECER: { key: Vista; nombre: string; Icon: any }[] = [
  { key: 'creditos', nombre: 'Créditos', Icon: I_Credit },
  { key: 'referidos', nombre: 'Referidos', Icon: I_Gift },
];

// Para habilitar cosas dentro del sistema
const NAV_CONF: { key: Vista; nombre: string; Icon: any }[] = [
  { key: 'cuenta', nombre: 'Cuenta y autonomía', Icon: I_Settings },
  { key: 'kyc', nombre: 'Verificación', Icon: I_Shield },
];

export function Layout({ vista, setVista, children, theme, cicloTema, toast, modo, avisar }: {
  vista: Vista; setVista: (v: Vista) => void; children: ReactNode;
  theme: string; cicloTema: () => void; toast: string; modo: Modo; avisar?: (t: string) => void;
}) {
  const { perfil } = usePerfil();
  const [perfilAbierto, setPerfilAbierto] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [notif, setNotif] = useState(false);
  const trabajando = AGENTES.filter(a => a.estado === 'trabajando').length;
  const esperando = DECISIONES.length;
  const criticas = ALARMAS.filter(a => a.severidad === 'critico').length;
  const nombreModo = MODOS.find(m => m.key === modo)?.nombre ?? '';

  return (
    <div className="app">
      {/* ================= SIDEBAR ================= */}
      <aside className={`sidebar ${menuAbierto ? 'abierto' : ''}`}>
        <div className="sb-brand">
          <SinkrooMark size={30} />
          <div className="wordmark">Sinkroo</div>
          <button className="sb-close" title="Cerrar el menú" onClick={() => setMenuAbierto(false)}><I_X size={16} /></button>
          <span className="badge badge-purple sb-v2" style={{ marginLeft: 'auto', fontSize: 9 }}>v2</span>
        </div>

        <div className="sb-plan">
          <div className="sb-plan-name">{perfil.marca}</div>
          <div className="tiny muted">Plan {TENANT.plan}</div>
          <div className="row spread" style={{ marginTop: 10 }}>
            <span className="tiny muted">Créditos</span>
            <span className="tiny" style={{ fontWeight: 800 }}>{TENANT.creditos.toLocaleString('es-AR')}</span>
          </div>
          <div className="row spread" style={{ marginTop: 4 }}>
            <span className="tiny muted">Autonomía</span>
            <span className="tiny" style={{ fontWeight: 800, color: 'var(--purple3)' }}>{nombreModo}</span>
          </div>
        </div>

        <div className="sb-section-label">TRABAJO</div>
        {NAV.slice(0, 4).map(n => (
          <div key={n.key} className={`nav-item ${vista === n.key ? 'active' : ''}`} onClick={() => { setVista(n.key); setMenuAbierto(false); }}>
            <n.Icon size={17} />
            <span className="nav-label">{n.nombre}</span>
            {n.key === 'conversaciones' && esperando > 0 && (
              <span className="badge badge-amber" style={{ marginLeft: 'auto', fontSize: 9 }}>{esperando}</span>
            )}
          </div>
        ))}

        <div className="sb-section-label" style={{ marginTop: 10 }}>CRECER</div>
        {NAV_CRECER.map(n => (
          <div key={n.key} className={`nav-item ${vista === n.key ? 'active' : ''}`} onClick={() => { setVista(n.key); setMenuAbierto(false); }}>
            <n.Icon size={17} />
            <span className="nav-label">{n.nombre}</span>
            {n.key === 'creditos' && (
              <span className="badge badge-amber" style={{ marginLeft: 'auto', fontSize: 9 }}>12 días</span>
            )}
          </div>
        ))}

        <div className="sb-section-label" style={{ marginTop: 10 }}>CONFIGURACIÓN</div>
        {NAV_CONF.map(n => (
          <div key={n.key} className={`nav-item ${vista === n.key ? 'active' : ''}`} onClick={() => { setVista(n.key); setMenuAbierto(false); }}>
            <n.Icon size={17} />
            <span className="nav-label">{n.nombre}</span>
            {n.key === 'kyc' && (
              <span className="badge badge-amber" style={{ marginLeft: 'auto', fontSize: 9 }}>falta</span>
            )}
          </div>
        ))}

        <div className="sb-user" onClick={() => setPerfilAbierto(true)} role="button" tabIndex={0}
          title="Tu perfil: nombre, marca, email, zona horaria y moneda. Se puede editar."
          onKeyDown={e => { if (e.key === 'Enter') setPerfilAbierto(true); }}>
          <div className="av" style={{ width: 34, height: 34, fontSize: 12, background: `linear-gradient(135deg, ${perfil.color}, ${perfil.color}bb)` }}>
            {inicialesDe(perfil.nombre)}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="tiny" style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{perfil.nombre}</div>
            <div className="tiny muted" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{perfil.marca}</div>
          </div>
          <span className="sb-edit" title="Editar mi perfil"><I_Edit size={14} /></span>
        </div>
        <PerfilModal abierto={perfilAbierto} cerrar={() => setPerfilAbierto(false)} avisar={avisar} />
      </aside>

      {/* En celular el menú se abre encima del contenido */}
      {menuAbierto && <div className="sb-backdrop" onClick={() => setMenuAbierto(false)} />}

      {/* ================= MAIN ================= */}
      <div className="main">
        <header className="topbar v2-topbar">
          <div className="topbar-row">
            <button className="menu-btn" title="Abrir el menú" onClick={() => setMenuAbierto(true)}>
              <I_Menu size={18} />
            </button>
            <div className="titles-wrap">
              <div className="ttl">{tituloVista(vista)}</div>
              <div className="sub">{subtituloVista(vista)}</div>
            </div>

            <div className="ticker" style={{ marginLeft: 8 }}>
              <span className="ticker-label">MOTOR</span>
              <span className="ticker-text">
                {AGENTES.find(a => a.estado === 'trabajando')?.accion} · {AGENTES[3].accion}
              </span>
            </div>

            <div className="topbar-right">
              <div className="theme-tgl" onClick={cicloTema} title="Cambiar tema">
                {theme === 'dark' ? <I_Sun size={16} /> : <I_Moon size={16} />}
              </div>
              <div className="bell-wrap" onClick={() => setNotif(!notif)}>
                <I_Bell size={16} />
                {criticas > 0 && <span className="bell-dot" />}
              </div>
            </div>
          </div>

          {/* ---------- BARRA DEL MOTOR: siempre visible en toda la app ---------- */}
          <div className="ebar">
            <span className="ebar-dot" />
            <span className="ebar-seg">
              <b>{trabajando} agentes</b> trabajando en tu proyecto
            </span>
            <span className="ebar-sep" />
            <span className="ebar-seg">
              <I_Clock size={13} />
              <b>{esperando}</b> decisiones esperan tu OK
            </span>
            <span className="ebar-sep" />
            <span className="ebar-seg">
              <I_Zap size={13} />
              <b>{criticas}</b> alarmas críticas
            </span>
            <span className="ebar-sep" />
            <span className="ebar-seg">
              <I_Vote size={13} />
              <b>5 jueces</b> + <b>500 del público</b> por pieza
            </span>
            <span className="ebar-cta">
              <span className="badge badge-purple" style={{ fontSize: 10 }}>
                Modo {nombreModo}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={() => { setNotif(false); bajarAlMotor(setVista); }}>Ver el motor</button>
            </span>
          </div>
        </header>

        {notif && (
          <div className="notif-panel" style={{ top: 118 }}>
            <div className="row spread" style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 800, fontSize: 13 }}>Lo que necesita tu atención</div>
              <span className="badge badge-red" style={{ fontSize: 10 }}>{criticas} críticas</span>
            </div>
            {ALARMAS.slice(0, 3).map(a => (
              <div key={a.id} className="notif" onClick={() => { setNotif(false); setVista('hoy'); }} style={{ cursor: 'pointer' }}>
                <div className="notif-ico" style={{ color: a.severidad === 'critico' ? 'var(--red)' : 'var(--amber)' }}>
                  {a.severidad === 'critico' ? '🔴' : '🟠'}
                </div>
                <div>
                  <div className="tiny" style={{ fontWeight: 700, lineHeight: 1.4 }}>{a.titulo}</div>
                  <div className="notif-time">{a.cuando}</div>
                </div>
              </div>
            ))}
            <div className="tiny muted" style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <I_Robot size={13} /> El resto está resuelto en la bitácora de Tu día.
            </div>
          </div>
        )}

        <div className="content">{children}</div>
      </div>

      <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
    </div>
  );
}

function tituloVista(v: Vista) {
  return ({ hoy: 'Tu día', campanas: 'Campañas', conversaciones: 'Conversaciones', mercado: 'Mercado', cuenta: 'Cuenta y autonomía', creditos: 'Créditos', referidos: 'Referidos', kyc: 'Verificación de identidad' } as const)[v];
}
function subtituloVista(v: Vista) {
  return ({
    hoy: 'Lo que el motor hizo, lo que espera de vos y lo que necesita tu atención',
    campanas: 'Cada campaña con el veredicto de los 5 jueces y sus artefactos',
    conversaciones: 'Todo lo que tus agentes contestan, con el contexto de cada cliente',
    mercado: 'Qué está haciendo tu competencia y por dónde conviene ir',
    cuenta: 'Cuánto decide la IA y cuánto decidís vos',
    creditos: 'Con qué se carga el motor y en qué se va cada crédito',
    referidos: 'Traé gente y el motor te devuelve créditos',
    kyc: 'Sin esto el motor no puede publicar ni mover dinero por vos',
  } as const)[v];
}

export function KpiRow({ icon, label, value, sub, color = '#a855f7' }: { icon: ReactNode; label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="numb">
      <div className="row" style={{ gap: 7, alignItems: 'center' }}>
        <span style={{ color, display: 'flex' }}>{icon}</span>
        <span className="numb-lb">{label}</span>
      </div>
      <div className="numb-v">{value}</div>
      {sub && <div className="numb-d" style={{ color: 'var(--muted)' }}>{sub}</div>}
    </div>
  );
}

import { useState, useRef, type ReactNode } from 'react';
import { SinkrooMark, I_Bell, I_ChevDn, I_Bank, I_Wallet, I_Home, I_Globe, I_Target, I_Tools, I_Megaphone, I_Whatsapp, I_Heart, I_Sparkle, I_Image, I_Users, I_Shield, I_Settings } from './sinkroo/icons';
import { Modal, Toast, Badge } from './sinkroo/ui';
import { MODULOS, CREDITOS_RESTANTES, NOTIFICACIONES, VISTA_TITULOS, type ViewKey, type ModKey } from './sinkroo/data';
import type { Theme } from '../lib/theme';

const NAV_MOD: { key: ModKey; vista: ViewKey; Icon: any; nombre: string }[] = [
  { key: 'M1', vista: 'mercado', Icon: I_Globe, nombre: 'Mercado' },
  { key: 'M2', vista: 'estrategia', Icon: I_Target, nombre: 'Estrategia' },
  { key: 'M3', vista: 'herramientas', Icon: I_Tools, nombre: 'Herramientas' },
  { key: 'M4', vista: 'campanas', Icon: I_Megaphone, nombre: 'Campañas' },
  { key: 'M5', vista: 'whatsapp', Icon: I_Whatsapp, nombre: 'WhatsApp' },
  { key: 'M6', vista: 'creditos', Icon: I_Heart, nombre: 'Fidelización' },
  { key: 'M7', vista: 'predictiva', Icon: I_Sparkle, nombre: 'Predictiva' },
];

const OTROS: { vista: ViewKey; Icon: any; etiqueta: string }[] = [
  { vista: 'creatividades', Icon: I_Image, etiqueta: 'Creatividades' },
  { vista: 'referidos', Icon: I_Users, etiqueta: 'Referidos' },
  { vista: 'kyc', Icon: I_Shield, etiqueta: 'Verificación KYC' },
  { vista: 'config', Icon: I_Settings, etiqueta: 'Configuración' },
];

interface Nav { origen: 'mod'|'otro'; mod?: ModKey; vista?: ViewKey; }

export default function Layout({ vista, onNav, theme, onCycleTheme, showNotif, onToggleNotif, children }:
  { vista: ViewKey; onNav: (n: Nav) => void; theme: Theme; onCycleTheme: () => void; showNotif: boolean; onToggleNotif: () => void; children: ReactNode }) {

  const data = MODULOS.find(m => m.key === 'M2')!;
  const ticker = `M2 · ${data.nombre} · ROAS global 3.8x · Ventas del mes +18% · ${NOTIFICACIONES[0].txt}`;
  const nombreModulo = NAV_MOD.find(n => n.vista === vista)?.key ?? '';

  // ==== Perfil de usuario (customizable) ====
  const [perfilOpen, setPerfilOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [usuario, setUsuario] = useState({
    cuenta: 'Assettium', nombre: 'Mauricio', apellido: '', email: 'mauricio@assettium.com', rol: 'Administrador', foto: null as string | null,
    // KYC + dirección
    telefono: '', pais: '', ciudad: '', direccion: '', cp: '', documento: '', docTipo: 'DNI', kycEstado: 'pendiente',
  });
  const [draft, setDraft] = useState({ ...usuario });
  const fileRef = useRef<HTMLInputElement>(null);

  const avisar = (t: string) => { setToast(t); setTimeout(() => setToast(''), 2600); };
  const iniciales = () => { const n = (usuario.nombre || '').split(/\s+/).filter(Boolean); return ((n[0]?.[0] || '') + (n[1]?.[0] || '')).toUpperCase() || 'AM'; };

  const abrirPerfil = () => { setDraft({ ...usuario }); setPerfilOpen(true); };

  const elegirFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => { setDraft(d => ({ ...d, foto: r.result as string })); avisar('🖼️ Foto cargada. Guardá para aplicarla.'); };
    r.readAsDataURL(f);
  };

  const guardarPerfil = () => {
    setUsuario(draft);
    setPerfilOpen(false);
    avisar('✓ Perfil actualizado.');
  };

  const Avatar = ({ size, radius }: { size: number; radius?: number }) => (
    draft.foto || usuario.foto
      ? <img src={(draft.foto || usuario.foto)!} alt="Avatar" style={{ width: size, height: size, borderRadius: radius ?? 8, objectFit: 'cover', cursor: 'pointer', display: 'block' }} onClick={abrirPerfil} />
      : <div className="av" style={{ width: size, height: size, background: 'linear-gradient(135deg,#a855f7,#7e22ce)', cursor: 'pointer', fontSize: size * 0.4 }} onClick={abrirPerfil}>{iniciales()}</div>
  );

  // ==== Modal de perfil con pestañas ====
  const [tabPerfil, setTabPerfil] = useState<'datos' | 'kyc' | 'dir'>('datos');

  const PerfilModal = () => {
    const F = ({ children }: { children: React.ReactNode }) => (
      <label className="pf-label">{children}</label>
    );
    return (
      <Modal open={perfilOpen} onClose={() => setPerfilOpen(false)} title="Tu perfil">
        <div style={{ minWidth: 360, display: 'flex', flexDirection: 'column' }}>
          {/* Tabs */}
          <div className="row" style={{ gap: 4, marginBottom: 4 }}>
            {([['datos', 'Datos'], ['kyc', 'KYC'], ['dir', 'Dirección']] as const).map(([k, lbl]) => (
              <button key={k} className={`chip ${tabPerfil === k ? 'chip-on' : ''}`} onClick={() => setTabPerfil(k)}>{lbl}</button>
            ))}
          </div>

          {/* ===== DATOS ===== */}
          {tabPerfil === 'datos' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <Avatar size={64} radius={14} />
                <div>
                  <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>🖼️ Cambiar foto</button>
                  <div className="tiny muted" style={{ marginTop: 6 }}>JPG o PNG. Se ve en sidebar y arriba.</div>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={elegirFoto} />
                </div>
              </div>
              <div className="pf-field"><F>Nombre de la cuenta</F>
              <input className="input" value={draft.cuenta} onChange={e => setDraft(d => ({ ...d, cuenta: e.target.value }))} /></div>
              <div className="row" style={{ gap: 8 }}>
                <div className="pf-field" style={{ flex: 1 }}><F>Nombre</F><input className="input" value={draft.nombre} onChange={e => setDraft(d => ({ ...d, nombre: e.target.value }))} /></div>
                <div className="pf-field" style={{ flex: 1 }}><F>Apellido</F><input className="input" value={draft.apellido} onChange={e => setDraft(d => ({ ...d, apellido: e.target.value }))} /></div>
              </div>
              <div className="pf-field"><F>Email</F>
              <input className="input" value={draft.email} onChange={e => setDraft(d => ({ ...d, email: e.target.value }))} /></div>
              <div className="pf-field"><F>Teléfono</F>
              <input className="input" value={draft.telefono} onChange={e => setDraft(d => ({ ...d, telefono: e.target.value }))} /></div>
              <div className="pf-field"><F>Rol</F>
              <select className="input" value={draft.rol} onChange={e => setDraft(d => ({ ...d, rol: e.target.value }))}>
                <option>Administrador</option><option>Editor</option><option>Analista</option><option>Solo lectura</option>
              </select>
              </div>
            </>
          )}

          {/* ===== KYC ===== */}
          {tabPerfil === 'kyc' && (
            <>
              <div className="tiny muted" style={{ marginBottom: 2 }}>Estado actual: <Badge tone={usuario.kycEstado === 'verificado' ? 'green' : 'amber'}>{usuario.kycEstado}</Badge></div>
              <div className="pf-field"><F>Tipo de documento</F>
              <select className="input" value={draft.docTipo} onChange={e => setDraft(d => ({ ...d, docTipo: e.target.value }))}>
                <option>DNI</option><option>Pasaporte</option><option>Licencia de conducir</option><option>Cédula</option>
              </select>
              </div>
              <div className="pf-field"><F>Número de documento</F>
              <input className="input" value={draft.documento} onChange={e => setDraft(d => ({ ...d, documento: e.target.value }))} placeholder="Ej: 30123456" />
              </div>
              <div className="pf-field"><F>Nacionalidad</F>
              <input className="input" value={draft.pais} onChange={e => setDraft(d => ({ ...d, pais: e.target.value }))} placeholder="País de emisión" />
              </div>
              <div className="tiny muted" style={{ marginTop: 4 }}>🛡️ Esta info se valida según tu plan y regulación. Se guarda cifrada.</div>
            </>
          )}

          {/* ===== DIRECCION ===== */}
          {tabPerfil === 'dir' && (
            <>
              <div className="pf-field"><F>País</F>
              <input className="input" value={draft.pais} onChange={e => setDraft(d => ({ ...d, pais: e.target.value }))} /></div>
              <div className="pf-field"><F>Ciudad</F>
              <input className="input" value={draft.ciudad} onChange={e => setDraft(d => ({ ...d, ciudad: e.target.value }))} /></div>
              <div className="pf-field"><F>Dirección</F>
              <input className="input" value={draft.direccion} onChange={e => setDraft(d => ({ ...d, direccion: e.target.value }))} placeholder="Calle, número, depto" /></div>
              <div className="pf-field"><F>Código postal</F>
              <input className="input" value={draft.cp} onChange={e => setDraft(d => ({ ...d, cp: e.target.value }))} /></div>
            </>
          )}

          <div className="row" style={{ gap: 8, marginTop: 6 }}>
            <button className="btn btn-primary" onClick={guardarPerfil}>Guardar perfil</button>
            <button className="btn btn-ghost" onClick={() => setPerfilOpen(false)}>Cancelar</button>
          </div>
        </div>
      </Modal>
    );
  };

  return (
    <div className="app">
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <linearGradient id="skGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#9333ea" />
            <stop offset="45%" stopColor="#a855f7" />
            <stop offset="75%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>
        </defs>
      </svg>
      {/* ===== SIDEBAR ===== */}
      <aside className="sidebar">
        <div className="sb-brand">
          <SinkrooMark size={34} radius={9} />
          <span className="wordmark">Sinkroo</span>
        </div>
        <div className="sb-plan">
          <div className="spread"><span className="small muted">Plan actual</span><I_Bank size={15} /></div>
          <div className="sb-plan-name">Plan Pro</div>
        </div>

        {/* Dashboard principal */}
        <div className={`nav-item ${vista === 'dashboard' ? 'active' : ''}`} onClick={() => onNav({ origen: 'otro', vista: 'dashboard' })}>
          <span className="nav-ico"><I_Home size={17} /></span>
          <span className="nav-label">Dashboard principal</span>
        </div>

        <div className="sb-section-label">MÓDULOS</div>
        {NAV_MOD.map(n => {
          const m = MODULOS.find(x => x.key === n.key)!;
          const active = vista === n.vista;
          return (
            <div key={n.key} className={`nav-item ${active ? 'active' : ''}`} onClick={() => onNav({ origen: 'mod', mod: n.key, vista: n.vista })}>
              <span className="nav-ico"><n.Icon size={17} /></span>
              <span className="nav-label">{m.nombre}</span>
              <span className="nav-mod-tag">{n.key}</span>
            </div>
          );
        })}

        <div className="sb-section-label" style={{ marginTop: 12 }}>MÁS</div>
        {OTROS.map(o => (
          <div key={o.vista} className={`nav-item ${vista === o.vista ? 'active' : ''}`} onClick={() => onNav({ origen: 'otro', vista: o.vista })}>
            <span className="nav-ico"><o.Icon size={17} /></span>
            <span className="nav-label">{o.etiqueta}</span>
          </div>
        ))}

        {/* ===== BLOQUE CRÉDITOS ===== */}
        <div className="credit-block">
          <div className="spread"><span className="small muted">Créditos</span><I_Wallet size={15} /></div>
          <div className="credit-num">{CREDITOS_RESTANTES}</div>
          <div className="small muted" style={{ marginBottom: 10 }}>disponibles este mes</div>
          <button className="btn btn-primary btn-sm" style={{ width: '100%' }} onClick={() => onNav({ origen: 'otro', vista: 'creditos' })}>Comprar créditos</button>
        </div>

        <div className="sb-user" onClick={abrirPerfil} style={{ cursor: 'pointer' }}>
          <Avatar size={32} />
          <div style={{ minWidth: 0 }}><div className="small" style={{ fontWeight: 700 }}>{usuario.cuenta}</div><div className="tiny muted">{usuario.nombre}</div></div>
          <I_ChevDn size={15} />
        </div>
      </aside>

      {/* ===== MAIN ===== */}
      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <span className="crumb">Sinkroo</span>
            {nombreModulo && <><span className="crumb-sep">/</span><span className="crumb cur">{VISTA_TITULOS[vista]}</span></>}
          </div>
          <div className="ticker"><span className="ticker-label">M2</span><span className="ticker-text">{ticker}</span></div>
          <div className="topbar-right">
            <div className="theme-tgl" onClick={onCycleTheme} title="Cambiar tema">
              {theme === "dark" ? "🌙" : "☀️"}
            </div>
            <div className="bell-wrap" onClick={onToggleNotif}>
              <I_Bell size={19} />
              <span className="bell-dot" />
            </div>
            <Avatar size={34} />
          </div>
        </header>

        {showNotif && (
          <div className="notif-panel">
            <div className="card-head"><span>Notificaciones</span><span className="badge badge-purple">{NOTIFICACIONES.length}</span></div>
            {NOTIFICACIONES.map((n, i) => (
              <div key={i} className="notif">
                <span style={{ fontSize: 18 }}>{n.icono}</span>
                <div style={{ flex: 1 }}><div className="small" style={{ fontWeight: n.hot ? 700 : 500 }}>{n.txt}</div><div className="tiny muted">{n.time}</div></div>
              </div>
            ))}
          </div>
        )}

        <div className="content">{children}</div>
      </main>

      {/* ===== MODAL PERFIL ===== */}
      <PerfilModal />

      <Toast show={!!toast} text={toast} />
    </div>
  );
}

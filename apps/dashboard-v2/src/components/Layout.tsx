import { useState, type ReactNode } from 'react';
import { SinkrooMark, I_Home, I_Megaphone, I_Whatsapp, I_Globe, I_Settings, I_Bell, I_Sun, I_Moon, I_Zap, I_Clock, I_Vote, I_Robot, I_Credit, I_Gift, I_Shield, I_User, I_Palette, I_Menu, I_X } from './icons';
import { TENANT, AGENTES, ALARMAS, DECISIONES, MODOS, type Modo } from '../data/demo';
import { Progress } from './ui';
import { usePerfil, inicialesDe } from '../lib/perfil';
import { PerfilModal } from './PerfilModal';
import { PersonalizarPanel } from './PersonalizarPanel';

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
  // `perfilVisible` es el perfil guardado MÁS la edición en curso: así el logo y los colores que
  // el cliente está eligiendo en el pop-up de personalización se ven ya en el sidebar, la barra de
  // arriba y el hero, sin esperar a que guarde.
  const { perfilVisible: perfil } = usePerfil();
  const [perfilAbierto, setPerfilAbierto] = useState(false);
  const [persAbierto, setPersAbierto] = useState(false);
  // Cada toque en una de las dos puertas de la personalización suma uno: es lo que hace que el
  // panel vuelva a aparecer aunque lo hayas corrido con «Ver el panel completo».
  const [persSenal, setPersSenal] = useState(0);
  const abrirPersonalizacion = () => { setPersAbierto(true); setPersSenal(s => s + 1); };
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [notif, setNotif] = useState(false);
  const trabajando = AGENTES.filter(a => a.estado === 'trabajando').length;
  const esperando = DECISIONES.length;
  const criticas = ALARMAS.filter(a => a.severidad === 'critico').length;
  const nombreModo = MODOS.find(m => m.key === modo)?.nombre ?? '';
  const descModo = MODOS.find(m => m.key === modo)?.desc ?? '';
  // Los días de autonomía NO se escriben a mano: salen de los créditos que hay hoy, con el mismo
  // consumo del plan que usa la vista de Créditos (150 créditos por día, `Math.round(saldo / 150)`).
  // Si el saldo cambia, el menú y la vista dicen lo mismo; si el número estuviera fijo, se
  // desincronizaría en la primera recarga.
  const dias = Math.max(0, Math.round(TENANT.creditos / 150));
  const todosLosDias = Math.round(TENANT.creditosMes / 150);
  const pctCreditos = Math.min(100, Math.round((TENANT.creditos / TENANT.creditosMes) * 100));
  // Ir a una vista del menú y cerrar la bandeja en celular: el mismo gesto para la tarjeta de
  // plan y para los ítems de navegación.
  const irA = (v: Vista) => { setVista(v); setMenuAbierto(false); };

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

        {/* ---------- TARJETA DE PLAN ----------
            Antes eran cuatro líneas de texto sueltas: no se leía nada de un vistazo. Ahora la
            jerarquía es la del resto del panel, de lo que identifica la cuenta a lo que se mira
            todos los días:
              1) la MARCA arriba y con peso, con el PLAN como badge (era texto gris al lado);
              2) los CRÉDITOS con su número grande, su barra del plan del mes y los días de
                 autonomía que quedan al lado;
              3) la AUTONOMÍA como píldora con punto de color según el modo (verde Automático,
                 violeta Compartido, ámbar Manual): el color dice algo, no está siempre en violeta.
            Los dos bloques de datos son tocables y llevan a donde se cambia cada cosa: es un menú,
            si muestra un dato tiene que poder ir a dónde se toca ese dato. */}
        <div className="sb-plan">
          <div className="sb-plan-top">
            <div className="sb-plan-name" title={`${perfil.marca}: este panel es de tu negocio`}>{perfil.marca}</div>
            <span className="badge badge-purple sb-plan-badge"
              title={`Plan ${TENANT.plan}: ${TENANT.creditosMes.toLocaleString('es-AR')} créditos por mes, unos ${todosLosDias} días de motor`}>
              Plan {TENANT.plan}
            </span>
          </div>

          <div className="sb-plan-block" role="button" tabIndex={0}
            onClick={() => irA('creditos')}
            onKeyDown={e => { if (e.key === 'Enter') irA('creditos'); }}
            title={`Créditos: te quedan ${TENANT.creditos.toLocaleString('es-AR')} de ${TENANT.creditosMes.toLocaleString('es-AR')} del plan del mes. Tocalo para ver en qué se va cada crédito`}>
            <div className="sb-plan-cred">
              <span className="sb-plan-num">{TENANT.creditos.toLocaleString('es-AR')}</span>
              <span className="sb-plan-unit">créditos</span>
              <span className="sb-plan-dias"
                title={`Autonomía: al consumo actual (150 créditos por día) al motor le quedan ${dias} días sin que recargues`}>
                {dias} días
              </span>
            </div>
            <div className="sb-plan-bar">
              <Progress pct={pctCreditos} color={pctCreditos <= 25 ? 'amber' : 'purple'} />
            </div>
          </div>

          <div className="sb-plan-block sb-plan-modo" role="button" tabIndex={0}
            onClick={() => irA('cuenta')}
            onKeyDown={e => { if (e.key === 'Enter') irA('cuenta'); }}
            title={`Autonomía en modo ${nombreModo}: ${descModo} Tocalo para cambiarlo en Cuenta y autonomía`}>
            <span className="sb-plan-lb">Autonomía</span>
            <span className={`sb-modo sb-modo-${modo}`}><i className="sb-modo-dot" />{nombreModo}</span>
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
              <span className="badge badge-amber" style={{ marginLeft: 'auto', fontSize: 9 }} title={`Autonomía: ${dias} días al consumo de hoy`}>{dias} días</span>
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

        {/* El bloque de usuario abre LA PERSONALIZACIÓN (logo y colores). Los datos de la cuenta
            (nombre, email, WhatsApp…) tienen su propio botoncito al lado, para no mezclar las dos
            cosas: acá se juega con la marca, ahí se editan los datos. */}
        <div className="sb-user" onClick={abrirPersonalizacion} role="button" tabIndex={0}
          title="Personalizá tu panel: subí tu logo y elegí los colores de tu marca"
          onKeyDown={e => { if (e.key === 'Enter') abrirPersonalizacion(); }}>
          <div className="av" style={{ width: 34, height: 34, fontSize: 12, background: `linear-gradient(135deg, ${perfil.color}, ${perfil.color}bb)` }}>
            {inicialesDe(perfil.nombre)}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="tiny" style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{perfil.nombre}</div>
            <div className="tiny muted" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{perfil.marca}</div>
          </div>
          <span className="sb-edit" title="Tu logo y tus colores: se ven en todo el panel"><I_Palette size={14} /></span>
          <button className="sb-datos" title="Tus datos de cuenta: nombre, marca, email, WhatsApp, zona horaria y moneda"
            onClick={e => { e.stopPropagation(); setPerfilAbierto(true); }}><I_User size={14} /></button>
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
            {/* El logo del cliente, chiquito, a la izquierda del título. Si no subió ninguno se ve
                el símbolo de Sinkroo, como hasta ahora. */}
            <span className={`tb-logo ${perfil.logo ? 'propio' : ''}`}
              title={perfil.logo
                ? `El logo de ${perfil.marca}, tu negocio`
                : 'Sinkroo. Si querés tu logo acá, abrí «Hacé tuyo este panel»: el botón de la paleta, arriba a la derecha'}>
              {perfil.logo
                ? <img src={perfil.logo} alt={`Logo de ${perfil.marca}`} />
                : <SinkrooMark size={26} />}
            </span>
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
              {/* El botón de la personalización: subir el logo y elegir los colores. Es la puerta
                  más visible al pop-up «Hacé tuyo este panel». */}
              <div className={`theme-tgl pers-tgl ${persAbierto ? 'on' : ''}`} onClick={abrirPersonalizacion}
                role="button" tabIndex={0}
                title="Personalizá tu panel: subí tu logo y elegí los colores de tu marca"
                onKeyDown={e => { if (e.key === 'Enter') abrirPersonalizacion(); }}>
                <I_Palette size={16} />
              </div>
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
              <button className="btn btn-ghost btn-sm" title="Te lleva al bloque del motor: ahí ves qué están investigando tus 6 agentes ahora mismo" onClick={() => { setNotif(false); bajarAlMotor(setVista); }}>Ver el motor</button>
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

      {/* La personalización va colgada de la raíz, NO adentro del sidebar: en celular el sidebar
          tiene `transform` (es la bandeja que entra y sale) y eso convertiría al pop-up en su
          rehén, con lo que quedaría fuera de la pantalla. Acá ocupa la pantalla entera. */}
      <PersonalizarPanel abierto={persAbierto} senal={persSenal} cerrar={() => setPersAbierto(false)} avisar={avisar} />
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

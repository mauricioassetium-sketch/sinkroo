import { useState, type ReactNode } from 'react';
import { SinkrooMark, I_Home, I_Megaphone, I_Whatsapp, I_Globe, I_Settings, I_Bell, I_Sun, I_Moon, I_Zap, I_Clock, I_Vote, I_Robot, I_Credit, I_Gift, I_Shield, I_User, I_Palette, I_Menu, I_X, I_Rocket, I_Logout } from './icons';
import { MODOS, PLANES, type Modo } from '../data/demo';
import { Progress } from './ui';
import { usePerfil, inicialesDe } from '../lib/perfil';
import { useDatos } from '../api/datos';
import { useOnboarding } from '../lib/onboarding';
import { PerfilModal } from './PerfilModal';
import { PersonalizarPanel } from './PersonalizarPanel';

export type Vista = 'hoy' | 'onboarding' | 'campanas' | 'conversaciones' | 'mercado' | 'cuenta' | 'creditos' | 'referidos' | 'kyc';


/** Lleva al motor andando: si no está en Hoy, cambia de vista y después baja hasta el bloque. */
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

// Para habilitar cosas dentro del sistema. «Primeros pasos» va primero: es lo que se hace una vez
// y deja al motor trabajando; el resto de la configuración se toca cuando hace falta.
const NAV_CONF: { key: Vista; nombre: string; Icon: any }[] = [
  { key: 'onboarding', nombre: 'Primeros pasos', Icon: I_Rocket },
  { key: 'cuenta', nombre: 'Cuenta y autonomía', Icon: I_Settings },
  { key: 'kyc', nombre: 'Verificación', Icon: I_Shield },
];

export function Layout({ vista, setVista, children, theme, cicloTema, toast, modo, avisar, onSalir }: {
  vista: Vista; setVista: (v: Vista) => void; children: ReactNode;
  theme: string; cicloTema: () => void; toast: string; modo: Modo; avisar?: (t: string) => void;
  /** Cierra la sesión y vuelve a la entrada. Lo hace App: acá sólo se aprieta el botón. */
  onSalir?: () => void;
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
  const nombreModo = MODOS.find(m => m.key === modo)?.nombre ?? '';
  const descModo = MODOS.find(m => m.key === modo)?.desc ?? '';
  // Los días de autonomía NO se escriben a mano: salen de los créditos que hay hoy, con el mismo
  // consumo del plan que usa la vista de Créditos (150 créditos por día, `Math.round(saldo / 150)`).
  // Si el saldo cambia, el menú y la vista dicen lo mismo; si el número estuviera fijo, se
  // desincronizaría en la primera recarga.
  // TODO SALE DE SU CUENTA: los créditos, el plan y el nombre del negocio los manda el back. Sin back
  // no hay cuenta que leer, así que el encabezado queda neutro («Su negocio», los créditos en «—») en
  // vez de mostrar otro negocio.
  const datos = useDatos();
  // La fuente la decide el BACK, no el negocio: si el back está encendido, de esta pantalla no sale
  // ni un dato de ejemplo (y si el negocio todavía no llegó, va «—»). Sin back no hay cuenta que leer:
  // el encabezado queda neutro hasta que la haya.
  const esReal = datos.real;
  const planDelNegocio = esReal ? PLANES.find((pl: { key: string }) => pl.key === (datos.negocio?.plan || '')) : undefined;
  const creditos: number | null = esReal ? (datos.negocio?.creditos ?? 0) : null;
  const marca = esReal ? (datos.negocio?.name || 'Su negocio') : 'Su negocio';
  const planNombre = planDelNegocio?.nombre ?? (esReal ? (datos.negocio?.plan || null) : null);
  // El tope del mes: el del plan del back sólo si el catálogo lo tiene. Si no, no se sabe y no se
  // dibuja ninguna barra contra un número que no conocemos.
  const creditosMes = planDelNegocio?.creditosMes ?? null;
  const dias: number | null = creditos === null ? null : Math.max(0, Math.round(creditos / 150));
  const onb = useOnboarding();
  const todosLosDias = creditosMes ? Math.round(creditosMes / 150) : 0;
  const pctCreditos = creditosMes && creditos !== null ? Math.min(100, Math.round((creditos / creditosMes) * 100)) : 0;
  // La barra de arriba cuenta lo que hay de verdad: un negocio nuevo no tiene nada trabajando, ni
  // decisiones, ni alarmas. Sin back no hay cuenta que leer, así que también es cero: nunca se
  // rellena con agentes, decisiones ni alarmas de ejemplo.
  const trabajando = esReal && datos.resumen ? (datos.resumen.corridas > 0 ? 1 : 0) : 0;
  const esperando = 0;
  const criticas = 0;
  const conversacionesSinLeer = esReal ? (datos.resumen?.conversaciones ?? 0) : 0;
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
            <div className="sb-plan-name" title={`${marca}: este panel es de su negocio`}>{marca}</div>
            <span className="badge badge-purple sb-plan-badge"
              title={planNombre
                ? (creditosMes
                  ? `Plan ${planNombre}: ${creditosMes.toLocaleString('es-CO')} créditos por mes, unos ${todosLosDias} días de motor. Se ve desde Créditos.`
                  : `Plan ${planNombre}. Los créditos por mes todavía no están cargados: se ven desde Créditos.`)
                : 'Los planes y sus precios se ven desde Créditos. El de su cuenta sale de su cuenta.'}>
              {planNombre ? `Plan ${planNombre}` : 'Sin plan cargado'}
            </span>
          </div>

          <div className="sb-plan-block" role="button" tabIndex={0}
            onClick={() => irA('creditos')}
            onKeyDown={e => { if (e.key === 'Enter') irA('creditos'); }}
            title={creditos === null
              ? 'Créditos: su saldo sale de su cuenta. Tóquelo para ver en qué se va cada crédito'
              : (creditosMes
                ? `Créditos: le quedan ${creditos.toLocaleString('es-CO')} de ${creditosMes.toLocaleString('es-CO')} del plan del mes. Tóquelo para ver en qué se va cada crédito`
                : `Créditos: le quedan ${creditos.toLocaleString('es-CO')}. Tóquelo para ver en qué se va cada crédito`)}>
            <div className="sb-plan-cred">
              <span className="sb-plan-num">{creditos === null ? '—' : creditos.toLocaleString('es-CO')}</span>
              <span className="sb-plan-unit">créditos</span>
              <span className="sb-plan-dias"
                title={dias === null
                  ? 'La autonomía sale de los créditos que haya en su cuenta: todavía no se leyeron'
                  : `Autonomía: al consumo actual (150 créditos por día) al motor le quedan ${dias} días sin que recargue`}>
                {dias === null ? '—' : `${dias} días`}
              </span>
            </div>
            {/* La barra del mes sólo se dibuja si se conoce el tope del mes: sin tope no hay porcentaje. */}
            {creditosMes ? (
              <div className="sb-plan-bar">
                <Progress pct={pctCreditos} color={pctCreditos <= 25 ? 'amber' : 'purple'} />
              </div>
            ) : (
              <div className="sb-plan-lb" style={{ color: 'var(--muted)' }}>
                Créditos por mes de su plan: sin dato
              </div>
            )}
          </div>

          <div className="sb-plan-block sb-plan-modo" role="button" tabIndex={0}
            onClick={() => irA('cuenta')}
            onKeyDown={e => { if (e.key === 'Enter') irA('cuenta'); }}
            title={`Autonomía en modo ${nombreModo}: ${descModo} Tóquelo para cambiarlo en Cuenta y autonomía`}>
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
              <span className="badge badge-amber" style={{ marginLeft: 'auto', fontSize: 9 }}>{conversacionesSinLeer}</span>
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
            {n.key === 'onboarding' && !onb.arrancado && (
              <span className="badge badge-amber" style={{ marginLeft: 'auto', fontSize: 9 }}
                title={`Primeros pasos: ${onb.listos.length} de 5 hechos. Faltan los datos que el motor no puede deducir por sí solo.`}>
                {onb.listos.length} de 5
              </span>
            )}
            {n.key === 'onboarding' && onb.arrancado && (
              <span className="badge badge-green" style={{ marginLeft: 'auto', fontSize: 9 }}
                title="El motor ya arrancó con lo que le puso">en marcha</span>
            )}
            {n.key === 'kyc' && (
              <span className="badge badge-amber" style={{ marginLeft: 'auto', fontSize: 9 }}>falta</span>
            )}
          </div>
        ))}

        {/* El bloque de usuario abre LA PERSONALIZACIÓN (logo y colores). Los datos de la cuenta
            (nombre, email, WhatsApp…) tienen su propio botoncito al lado, para no mezclar las dos
            cosas: aquí se juega con la marca, ahí se editan los datos. */}
        <div className="sb-user" onClick={abrirPersonalizacion} role="button" tabIndex={0}
          title="Personalice su panel: suba su logo y elija los colores de su marca"
          onKeyDown={e => { if (e.key === 'Enter') abrirPersonalizacion(); }}>
          <div className="av" style={{ width: 34, height: 34, fontSize: 12, background: `linear-gradient(135deg, ${perfil.color}, ${perfil.color}bb)` }}>
            {inicialesDe(perfil.nombre)}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="tiny" style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{perfil.nombre}</div>
            <div className="tiny muted" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{perfil.marca}</div>
          </div>
          <span className="sb-edit" title="Su logo y sus colores: se ven en todo el panel"><I_Palette size={14} /></span>
          <button className="sb-datos" title="Sus datos de cuenta: nombre, marca, email, WhatsApp, zona horaria y moneda"
            onClick={e => { e.stopPropagation(); setPerfilAbierto(true); }}><I_User size={14} /></button>
          {/* CERRAR LA SESIÓN. Va acá, al lado de sus datos, y no escondido en un menú: el dueño lo
              pidió por acá. El title dice lo que hace y lo que NO pasa (nada se pierde). */}
          {onSalir && (
            <button className="sb-datos sb-salir"
              title="Cierra la sesión en este navegador y vuelve a la pantalla de entrada. Su cuenta, su negocio y todo lo que hizo el motor quedan guardados: para volver, entre con su correo y su clave."
              onClick={e => { e.stopPropagation(); onSalir(); }}><I_Logout size={14} /></button>
          )}
        </div>
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
                ? `El logo de ${perfil.marca}, su negocio`
                : 'Sinkroo. Si quiere su logo aquí, abra «Haga suyo este panel»: el botón de la paleta, arriba a la derecha'}>
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
                {esReal ? 'Su negocio está conectado al motor: lo que hace aparece en Hoy' : 'Conecte su cuenta para ver acá lo que hace el motor'}
              </span>
            </div>

            <div className="topbar-right">
              {/* El botón de la personalización: subir el logo y elegir los colores. Es la puerta
                  más visible al pop-up «Haga suyo este panel». */}
              <div className={`theme-tgl pers-tgl ${persAbierto ? 'on' : ''}`} onClick={abrirPersonalizacion}
                role="button" tabIndex={0}
                title="Personalice su panel: suba su logo y elija los colores de su marca"
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
              <b>{trabajando} agentes</b> trabajando en su proyecto
            </span>
            <span className="ebar-sep" />
            <span className="ebar-seg">
              <I_Clock size={13} />
              <b>{esperando}</b> decisiones esperan su OK
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
              <button className="btn btn-ghost btn-sm" title="Le lleva al bloque del motor: ahí ve qué están investigando sus 6 agentes ahora mismo" onClick={() => { setNotif(false); bajarAlMotor(setVista); }}>Ver el motor</button>
            </span>
          </div>
        </header>

        {notif && (
          <div className="notif-panel" style={{ top: 118 }}>
            <div className="row spread" style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 800, fontSize: 13 }}>Lo que necesita su atención</div>
              {criticas > 0
                ? <span className="badge badge-red" style={{ fontSize: 10 }}>{criticas} críticas</span>
                : <span className="badge badge-muted" style={{ fontSize: 10 }}>sin alarmas</span>}
            </div>
            <div className="tiny muted" style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <I_Robot size={13} /> {esReal
                ? 'No hay alarmas abiertas: cuando el motor necesite su atención, queda aquí.'
                : 'El resto está resuelto en la bitácora de «Su día».'}
            </div>
          </div>
        )}

        <div className="content">{children}</div>
      </div>

      <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>

      {/* La personalización va colgada de la raíz, NO adentro del sidebar: en celular el sidebar
          tiene `transform` (es la bandeja que entra y sale) y eso convertiría al pop-up en su
          rehén, con lo que quedaría fuera de la pantalla. Aquí ocupa la pantalla entera. */}
        <PerfilModal abierto={perfilAbierto} cerrar={() => setPerfilAbierto(false)} avisar={avisar} />
      <PersonalizarPanel abierto={persAbierto} senal={persSenal} cerrar={() => setPersAbierto(false)} avisar={avisar} />
    </div>
  );
}

function tituloVista(v: Vista) {
  return ({ hoy: 'Su día', onboarding: 'Primeros pasos', campanas: 'Campañas', conversaciones: 'Conversaciones', mercado: 'Mercado', cuenta: 'Cuenta y autonomía', creditos: 'Créditos', referidos: 'Referidos', kyc: 'Verificación de identidad' } as const)[v];
}
function subtituloVista(v: Vista) {
  return ({
    hoy: 'Lo que el motor hizo, lo que espera de usted y lo que necesita su atención',
    onboarding: 'Cinco pantallas cortas y el motor queda trabajando',
    campanas: 'Cada campaña con el veredicto de los 5 jueces y sus piezas',
    conversaciones: 'Todo lo que sus agentes contestan, con el contexto de cada cliente',
    mercado: 'Qué está haciendo su competencia y por dónde conviene ir',
    cuenta: 'Cuánto decide la IA y cuánto decide usted',
    creditos: 'Con qué se carga el motor y en qué se va cada crédito',
    referidos: 'Traiga gente y el motor le devuelve créditos',
    kyc: 'Sin esto el motor no puede publicar ni mover dinero por usted',
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

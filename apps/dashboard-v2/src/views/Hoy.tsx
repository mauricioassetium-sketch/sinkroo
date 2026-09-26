import { useState } from 'react';
import { Card, Badge, Button } from '../components/ui';
import { EquipoInvestigando } from '../components/EquipoInvestigando';
import { Ring, BarRow } from '../components/viz';
import { usePerfil, nombreDePila } from '../lib/perfil';
import { SinkrooMark, I_ArrowRight, I_Wallet, I_Eye, I_Vote, I_Star, I_Clock, I_Rocket, I_Users, I_Trend } from '../components/icons';
import type { Vista } from '../components/Layout';
import { useDetalle } from '../components/Detalle';
import { useOnboarding } from '../lib/onboarding';
import { PASOS_ONB } from '../data/onboarding';
// =============================================================================================
// LA CAPA DE DATOS DE ESTA PANTALLA
//
// `useDatos()` es la única fuente: con el back encendido (`d.real`) todo lo que se ve abajo sale
// del servidor, y sin back el mismo contrato llega vacío y la pantalla invita a conectar la cuenta.
// No hay un segundo camino con datos de ejemplo: un negocio de mentira en Su día sería mentirle.
// Del paquete sólo se usan el catálogo del producto (los cinco pasos y los nombres del equipo), que
// no son el resultado de nadie.
// =============================================================================================
import { useDatos } from '../api/datos';
import { EstadoVacio } from '../components/EstadoVacio';
import { baseApi, token } from '../api/cliente';
import { MODOS, type Modo } from '../data/demo';

/** La hora del servidor, en corto: día, mes, hora y minutos. Si no se puede leer, se muestra tal cual vino. */
const horaDe = (iso?: string | null) => {
  if (!iso) return '';
  const f = new Date(iso);
  return isNaN(f.getTime())
    ? String(iso)
    : f.toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

/** El resultado que dejó una tarea del motor, en una línea: «clave: valor · clave: valor». */
const resultadoTxt = (r: Record<string, unknown>) => {
  try {
    const partes = Object.entries(r || {})
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`);
    return partes.length ? partes.slice(0, 4).join(' · ') : 'sin detalle cargado';
  } catch { return 'sin detalle cargado'; }
};

/** El máximo de una lista, para escalar las barras: nunca cero, que rompería la proporción. */
const maxDe = (xs: number[]) => Math.max(1, ...xs);

/** La hora del historial de una conversación, en corto. */
const haceTxt = (iso?: string | null) => {
  if (!iso) return '';
  const f = new Date(iso);
  if (isNaN(f.getTime())) return String(iso);
  const min = Math.round((Date.now() - f.getTime()) / 60000);
  if (min < 1) return 'hace un instante';
  if (min < 60) return `hace ${min} min`;
  if (min < 1440) return `hace ${Math.floor(min / 60)} h`;
  const d = Math.floor(min / 1440);
  return `hace ${d} ${d === 1 ? 'día' : 'días'}`;
};

export function ViewHoy({ setToast, setVista, modo }: { setToast: (t: string) => void; setVista: (v: Vista) => void; modo: Modo }) {
  // Ve el perfil que se está editando (así el logo y el nombre se ven al instante al subirlos).
  const { perfilVisible: perfil } = usePerfil();
  const detalle = useDetalle();
  const onb = useOnboarding();
  /** El modo del motor que el dueño tiene puesto (Automático, Compartido o Manual): es un ajuste
   *  del panel, no un dato de nadie. */
  const modoNombre = MODOS.find(m => m.key === modo)?.nombre ?? '';

  // -------------------------------------------------------------------------------------------
  // LO QUE SALE DEL BACK — ningún número de esta pantalla se escribe a mano.
  // -------------------------------------------------------------------------------------------
  const datos = useDatos();
  const [corriendo, setCorriendo] = useState(false);
  const [bitacoraCompleta, setBitacoraCompleta] = useState(false);

  /** La corrida que se pide desde los estados vacíos y desde el bloque del motor. */
  const correr = async () => {
    setCorriendo(true);
    try {
      await fetch(baseApi() + '/api/agentes/correr', { method: 'POST', headers: { Authorization: 'Bearer ' + token() } });
    } catch { /* si no responde, el refresco de abajo muestra lo que haya: aquí no se inventa nada */ }
    await datos.refrescar();
    setCorriendo(false);
  };
  /** Lleva a la galería de Campañas, donde viven las piezas que MiroFish ya puntuó. No publica nada. */
  const irAGaleria = () => {
    setVista('campanas');
    setToast('En Campañas, entre al paso «Galería»: ahí están las piezas que MiroFish ya puntuó');
  };

  /** Lo que el motor dejó, según el back. */
  const resumen = datos.resumen;
  const totalResumen = resumen
    ? resumen.piezas + resumen.evaluaciones + resumen.hallazgos + resumen.conversaciones + resumen.publico + resumen.corridas
    : 0;
  /** El negocio quedó configurado y el motor todavía no dejó nada: ahí va el estado vacío. */
  const nadaTodavia = !datos.cargando && !datos.error && totalResumen === 0 && datos.corridas.length === 0;

  /**
   * Mientras el back está respondiendo NO se afirma que no hay nada: se dice que se está leyendo.
   * Un «todavía no hay» que dura un segundo es una afirmación falsa, y esta pantalla no hace eso.
   */
  const vacio = (titulo: string, texto: string) => datos.cargando
    ? { titulo: 'Leyendo el back…', texto: 'El panel está leyendo lo que hay en el servidor. Si no hay nada, lo dice enseguida; mientras tanto no se muestra ninguna cifra inventada.' }
    : { titulo, texto };

  /**
   * La invitación concreta a que el motor trabaje: con el back encendido se le pide una corrida;
   * sin back, lo que falta es conectar las cuentas (Primeros pasos), porque el motor no puede
   * trabajar sobre nada. Ninguna de las dos acciones publica ni gasta.
   */
  const invitar = () => datos.real
    ? {
      accion: corriendo ? 'Corriendo el motor…' : 'Correr el motor ahora',
      onAccion: () => { if (!corriendo) void correr(); },
    }
    : {
      accion: 'Conectar mis cuentas',
      onAccion: () => { setVista('onboarding'); setToast('Primeros pasos: conecte sus cuentas y el motor arranca solo'); },
    };

  return (
    <div className="dash">
      {/* ============================== HERO ============================== */}
      <div className="hero card">
        <div className="hero-side">
          <div className="hero-greet">
            {/* El logo del cliente manda en el hero: es SU panel. El búho de Sinkroo queda como
                marca del producto en el sidebar y también aquí mientras no haya logo propio. */}
            <span className={`hero-logo ${perfil.logo ? 'propio' : ''}`}
              title={perfil.logo
                ? `El logo de ${perfil.marca}: así se ve su marca en su panel`
                : 'Sinkroo. Cargue el logo de su marca en «Haga suyo este panel» y aparece aquí'}>
              {perfil.logo
                ? <img className="marca-logo" src={perfil.logo} alt={`Logo de ${perfil.marca}`} />
                : <SinkrooMark size={136} />}
              {perfil.logo ? <span className="hero-logo-lb">{perfil.marca}</span> : null}
            </span>
            <div className="hero-txt">
              <div className="hero-live" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="dot-live" /> {datos.real
                  ? (datos.onboarding?.arrancado
                    ? `Su motor está activo${modoNombre ? ` · modo ${modoNombre}` : ''}`
                    : 'El motor todavía no arrancó')
                  : 'El motor arranca cuando conecte sus cuentas'}
              </div>
              <div className="hdr-t hero-title">
                {/* El saludo usa el nombre de la cuenta con la que se entró. Si la cuenta no tiene nombre
                    todavía, se saluda sin nombre: nunca se pone el de otra persona (antes, con el back
                    encendido, esta línea decía «Hola María» aunque hubiera entrado cualquiera). */}
                {perfil.nombre.trim()
                  ? <>Hola {nombreDePila(perfil.nombre)}, soy <span className="grad-text">Sinkroo</span> 👋</>
                  : <>Hola, soy <span className="grad-text">Sinkroo</span> 👋</>}
              </div>
              <div className="hdr-s hero-sub">
                <b>Su marketing, en automático.</b><br />
                Pruebo cada publicación con <b>500 personas como su audiencia</b>. Antes de que gaste.
              </div>
            </div>
          </div>
        </div>
        <div className="hero-metrics">
          {/* Las tres cifras del hero salen del back (piezas, evaluaciones y conversaciones). Mientras
              el panel no esté leyendo la cuenta NO se pone un cero: se pone «—», que es lo que hay. */}
          {datos.real ? (
            <>
              <div className="hero-metric"><div className="metric" style={{ color: 'var(--green)' }}>{resumen?.piezas ?? 0}</div><div className="m-label">Piezas</div><div className="m-desc">produjo el motor</div></div>
              <div className="hero-metric"><div className="metric" style={{ color: 'var(--green)' }}>{resumen?.evaluaciones ?? 0}</div><div className="m-label">Evaluaciones</div><div className="m-desc">pasaron el panel</div></div>
              <div className="hero-metric"><div className="metric grad-text">{resumen?.conversaciones ?? 0}</div><div className="m-label">Conversaciones</div><div className="m-desc">atiende el motor</div></div>
            </>
          ) : (
            <>
              <div className="hero-metric"><div className="metric" style={{ color: 'var(--muted2)' }}>—</div><div className="m-label">Piezas</div><div className="m-desc">cuando lea su cuenta</div></div>
              <div className="hero-metric"><div className="metric" style={{ color: 'var(--muted2)' }}>—</div><div className="m-label">Evaluaciones</div><div className="m-desc">cuando lea su cuenta</div></div>
              <div className="hero-metric"><div className="metric" style={{ color: 'var(--muted2)' }}>—</div><div className="m-label">Conversaciones</div><div className="m-desc">cuando lea su cuenta</div></div>
            </>
          )}
        </div>
        <div className="hero-start">
          <div className="hero-ad-tag">Empiece Aquí</div>
          <div className="hero-ad-title">Su primera campaña</div>
          <div className="hero-ad-sub">
            Diga qué quiere publicar y suba su material: el motor la crea, el panel la aprueba
            y sólo entonces sale a sus redes. <b>No gasta un peso antes.</b>
          </div>
          <button className="hero-ad-btn" title="Abra «Qué quiere publicar», el primer paso: ahí empieza el trabajo del motor"
            onClick={() => { setVista('campanas'); setToast('Empiece por aquí: diga qué quiere publicar'); }}>
            Crear la primera →
          </button>
        </div>
      </div>

      {/* ============== PRIMEROS PASOS: lo que falta para que el motor trabaje mejor ==============
          Va arriba de todo, después del hero: es lo único que el cliente tiene que hacer. Cuando el
          motor ya arrancó y los cinco pasos están hechos, desaparece sola (no queda un cartel fijo). */}
      {!(onb.arrancado && onb.listos.length === 5) && (
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Rocket size={14} style={{ color: 'var(--purple3)' }} /> Primeros pasos
            <span className="tiny muted">· lo que el motor no puede deducir solo</span></span>}
          action={<Badge tone={onb.arrancado ? 'green' : onb.listos.length > 0 ? 'purple' : 'amber'}>
            {onb.arrancado ? 'el motor está en marcha' : `${onb.listos.length} de 5 hechos`}
          </Badge>}
        >
          <div className="bs">
            {onb.arrancado
              ? <>Arrancó con lo que le puso y sigue por el mercado. Puede completar los pasos que faltan cuando quiera: el motor los toma en la próxima vuelta.</>
              : <>Son <b>cinco pantallas cortas</b> y el motor queda trabajando. Nada es obligatorio: lo que no ponga, lo deduce de su cuenta y de sus conversaciones.</>}
          </div>
          <div className="onb-datos">
            {PASOS_ONB.map(p => (
              <div key={p.n} className="dato">
                <span className="dato-l">{p.n}. {p.t}</span>
                <span className="dato-v" style={{ color: onb.listos.includes(p.n) ? 'var(--green)' : 'var(--muted2)' }}>
                  {onb.listos.includes(p.n) ? 'hecho' : 'falta'}
                </span>
              </div>
            ))}
          </div>
          <div className="row" style={{ gap: 9, marginTop: 14, flexWrap: 'wrap' }}>
            <Button className="btn-sm"
              title={`Abra el paso ${onb.siguiente}: ${PASOS_ONB.find(p => p.n === onb.siguiente)?.t}. Todo lo que ponga lo usa el motor en la próxima vuelta.`}
              onClick={() => { setVista('onboarding'); setToast(`Seguimos por el paso ${onb.siguiente}: ${PASOS_ONB.find(p => p.n === onb.siguiente)?.t}`); }}>
              <I_ArrowRight size={13} /> {onb.listos.length === 0 ? 'Empezar por el paso 1' : `Seguir por el paso ${onb.siguiente}: ${PASOS_ONB.find(p => p.n === onb.siguiente)?.t}`}
            </Button>
            <Button variant="ghost" className="btn-sm" title="Muestre qué hace el motor con cada dato y de dónde saca el resto"
              onClick={() => detalle({
                titulo: 'Qué hace el motor con cada paso',
                sub: 'Estos pasos no son un formulario para el motor: son la corrección de lo que ya sabe. Cada dato cambia algo concreto de lo que produce.',
                bloques: [
                  { tipo: 'filas', items: PASOS_ONB.map(p => ({
                    t: `${p.n}. ${p.t}`, s: p.infiere ? `Lo que saca solo: ${p.infiere}` : 'Esto sólo lo sabe usted.',
                    etiqueta: onb.listos.includes(p.n) ? 'hecho' : 'falta', tono: onb.listos.includes(p.n) ? 'green' as const : 'muted' as const,
                  })) },
                  { tipo: 'aviso', texto: 'Nada de esto frena al motor: trabaja igual con dos datos y va corrigiendo con lo que aprende de sus conversaciones y de su cuenta.' },
                ],
                fuente: 'Primeros pasos: los cinco pasos y lo que deduce cada uno.',
                acciones: [{ label: 'Ir a Primeros pasos', variante: 'primary', title: 'Abra el primer paso pendiente', onClick: () => setVista('onboarding') }],
              })}>Qué hace con cada cosa</Button>
          </div>
        </Card>
      )}

      {/* ============================== EL MOTOR ==============================
          Lo que el motor hizo DE VERDAD, tal como está en el back: los seis números del resumen y,
          abajo, las corridas agente por agente. Sin back, este mismo bloque dice que todavía no está
          leyendo ninguna cuenta y ofrece conectarla: no hay investigación de ejemplo en su lugar. */}
      <div id="motor">
        <div className="eq-wrap">
          <div className="eq-head">
            <div className="eq-head-top">
              <span className="eq-live"><span className="dot-live" /> {datos.real ? 'DATOS DEL BACK' : 'SIN LEER TODAVÍA'}</span>
              <span className="eq-head-t">El motor trabajando{datos.negocio ? ` en ${datos.negocio.name}` : ''}</span>
              {datos.real
                ? <Badge tone={resumen?.corridas ? 'green' : 'amber'}>{resumen?.corridas ?? 0} corridas</Badge>
                : <Badge tone="amber">esperando sus cuentas</Badge>}
              {datos.error ? <Badge tone="red">{datos.error}</Badge> : null}
            </div>
            <div className="eq-arranque">
              {datos.real
                ? <>Todo lo de abajo sale del servidor de Sinkroo{datos.negocio
                  ? <>{': '}<b>{datos.negocio.name}</b>, plan {datos.negocio.plan}, zona {datos.negocio.zona}</>
                  : ''}. El motor queda trabajando solo: lo que deja aparece aquí sin refrescar nada a mano.</>
                : <>Este bloque muestra lo que el motor produce y lo lee del servidor de Sinkroo. Todavía no está leyendo ninguna cuenta suya, así que no hay nada que mostrar: conéctela en Primeros pasos y el motor empieza a dejar aquí sus hallazgos y sus corridas.</>}
            </div>
            {
              datos.real && (
                <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  <Button variant="ghost" className="btn-sm" disabled={corriendo}
                    title="Vuelva a leer el back: lo que haya ahora es lo que se muestra. No cambia nada del negocio."
                    onClick={() => void datos.refrescar()}>{corriendo ? 'Leyendo el back…' : 'Volver a leer el back'}</Button>
                </div>
              )
            }
          </div>

          {datos.cargando ? (
            <Card action={<Badge tone="purple">leyendo</Badge>}>
              <EstadoVacio
                titulo="Leyendo el back…"
                texto="El panel está leyendo lo que hay en el servidor. En un momento dice qué hay: si no hay nada, lo dice, y si hay, lo muestra con sus números." />
            </Card>
          ) : datos.real && datos.error ? (
            <Card action={<Badge tone="red">sin respuesta</Badge>}>
              <EstadoVacio
                titulo="No se pudo leer lo que hizo el motor"
                texto={datos.error}
                accion="Volver a leer el back"
                onAccion={() => void datos.refrescar()} />
            </Card>
          ) : nadaTodavia ? (
            <Card
              title={<span className="row" style={{ gap: 8 }}><I_Rocket size={14} style={{ color: 'var(--purple3)' }} /> El motor ya está trabajando</span>}
              action={<Badge tone="amber">{datos.real ? 'todavía sin resultados' : 'sin cuentas conectadas'}</Badge>}>
              <EstadoVacio
                {...vacio(
                  datos.real ? 'No hay nada que mostrar todavía' : 'El motor todavía no ha trabajado',
                  datos.real
                    ? 'Su negocio quedó configurado y el motor está en marcha. Todavía no dejó piezas, evaluaciones, hallazgos ni conversaciones, así que no hay números para mostrar: no le vamos a inventar ninguno. Pídale una corrida y vuelva a mirar en un momento.'
                    : 'El panel no está leyendo ninguna cuenta suya: conéctela y el motor arranca. Lo que produzca aparece aquí con sus números, y mientras tanto esta pantalla no muestra los de nadie.',
                )}
                {...invitar()} />
            </Card>
          ) : (
            <Card className="eq-card"
              title={<span className="row" style={{ gap: 8 }}><I_Trend size={14} style={{ color: 'var(--green)' }} /> Lo que dejó el motor</span>}
              action={
                <span className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                  <Badge tone="purple">datos del back</Badge>
                  <Button variant="ghost" className="btn-sm" disabled={corriendo}
                    title="Pídale una corrida al motor ahora (POST /api/agentes/correr). Cuando termina, esta pantalla vuelve a leer el back."
                    onClick={() => { if (!corriendo) void correr(); }}>{corriendo ? 'Corriendo…' : 'Pedir una corrida'}</Button>
                </span>
              }>
              <div className="datos-row">
                <div className="dato"><span className="dato-l">Piezas</span><span className="dato-v">{resumen?.piezas ?? 0}</span></div>
                <div className="dato"><span className="dato-l">Evaluaciones</span><span className="dato-v">{resumen?.evaluaciones ?? 0}</span></div>
                <div className="dato"><span className="dato-l">Hallazgos</span><span className="dato-v">{resumen?.hallazgos ?? 0}</span></div>
                <div className="dato"><span className="dato-l">Conversaciones</span><span className="dato-v">{resumen?.conversaciones ?? 0}</span></div>
                <div className="dato"><span className="dato-l">Público</span><span className="dato-v">{resumen?.publico ?? 0}</span></div>
                <div className="dato"><span className="dato-l">Corridas</span><span className="dato-v" style={{ color: 'var(--green)' }}>{resumen?.corridas ?? 0}</span></div>
              </div>
              <div className="acc-why">
                Estos seis números son los del back, tal como están hoy: si alguno está en cero, es
                porque todavía no hay nada de eso, no porque falte mostrarlo.
                {datos.desvioPct !== 0 ? <> El desvío actual del panel es <b>{datos.desvioPct}%</b>.</> : null}
              </div>
            </Card>
          )}
        </div>

        {/* El equipo, agente por agente: las corridas que devolvió el back. Si no hay ninguna, lo dice. */}
        <EquipoInvestigando setToast={setToast} irAGaleria={irAGaleria} />
      </div>

      {/* ====================== FILA 1: LO QUE NECESITA SU ATENCIÓN ======================
          Hallazgos del motor y conversaciones: las dos cosas salen del back. Sin hallazgos y sin
          conversaciones, cada tarjeta dice qué hacer para tenerlos. */}
      <div className="csec">
        <span className="csec-n">1</span>
        <span className="csec-t">Lo que necesita su atención</span>
        <span className="csec-c">{datos.hallazgos.length}</span>
        <span className="csec-s">Lo que el motor encontró en su mercado y las conversaciones que está atendiendo</span>
      </div>
      <div className="duo">
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Eye size={14} style={{ color: 'var(--amber)' }} /> Hallazgos del motor</span>}
          action={<Badge tone={datos.hallazgos.length ? 'amber' : 'muted'}>{datos.hallazgos.length}</Badge>}>
          {datos.hallazgos.length === 0 ? (
            <EstadoVacio
              {...vacio(
                'Todavía no encontró nada',
                'Los hallazgos son lo que el motor ve en su mercado: competencia, precios y demanda. Cuando encuentre algo aparece aquí, con su dato y su fuente. No hay nada inventado esperando.',
              )}
              {...invitar()} />
          ) : (
            <div className="col-stack">
              {datos.hallazgos.map(h => (
                <div key={h.id} className="alarm oportunidad">
                  <div className="alarm-head">
                    <span className="alarm-sev oportunidad">{String(h.tipo || 'hallazgo').toUpperCase()}</span>
                    <span className="alarm-when">{horaDe(h.created_at)}</span>
                  </div>
                  <div className="alarm-title" style={{ minWidth: 0 }}>{h.titulo}</div>
                  <div className="alarm-money">
                    <span className="ico" style={{ color: 'var(--amber)' }}><I_Wallet size={14} /></span>
                    <span><b style={{ color: 'var(--amber)' }}>El dato: </b>{h.dato}</span>
                  </div>
                  <div className="alarm-sug"><b>Por qué importa: </b>{h.porque}</div>
                  <div className="tiny muted">Fuente: {h.fuente}</div>
                </div>
              ))}
            </div>
          )}
          <div className="acc-why">
            Cada hallazgo trae el dato, por qué importa y de dónde salió. <b>Todo esto sale del back</b>:
            lo que aparece aquí lo encontró el motor en su mercado, con su fecha y su fuente.
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Users size={14} style={{ color: 'var(--purple3)' }} /> Conversaciones</span>}
          action={<Badge tone={datos.conversaciones.length ? 'green' : 'muted'}>{datos.conversaciones.length}</Badge>}>
          {datos.conversaciones.length === 0 ? (
            <EstadoVacio
              {...vacio(
                'Todavía no hay conversaciones',
                'Aquí aparecen los clientes que el motor atiende por WhatsApp, con su etapa, su estado y su puntaje. Cuando entre el primero, lo ve en esta tarjeta, sin salir de Su día.',
              )} />
          ) : (
            <div className="col-stack">
              {datos.conversaciones.slice(0, 6).map(c => (
                <div key={c.id} className="dec">
                  <div className="dec-head">
                    <span className="dec-agent">{c.lead_phone}</span>
                    <span className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                      <Badge tone="purple">{c.stage}</Badge>
                      <Badge tone={c.status === 'abierta' || c.status === 'open' ? 'green' : 'muted'}>{c.status}</Badge>
                      <span className="tiny muted">puntaje {c.lead_score}</span>
                    </span>
                  </div>
                  <div className="dec-det">{c.ultimo || 'El back todavía no mandó el texto del último mensaje de esta conversación.'}</div>
                  <div className="acc-why">
                    {c.ultimo
                      ? `Último mensaje ${haceTxt(c.last_message_at)}.`
                      : c.last_message_at
                        ? `La conversación se movió ${haceTxt(c.last_message_at)}, pero el texto de ese mensaje todavía no está en el back.`
                        : 'El back todavía no tiene la fecha del último mensaje.'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ====================== FILA 2: LOS NÚMEROS DEL MES Y LA CALIDAD ======================
          Las piezas que el panel puntuó de verdad y el público que votó, tal como los devuelve el
          servidor. Sin piezas evaluadas y sin votos, la tarjeta invita a que el motor produzca. */}
      <div className="csec">
        <span className="csec-n">2</span>
        <span className="csec-t">Los números del mes y la calidad de lo que produjo</span>
        <span className="csec-s">Las piezas que puntuó el panel y el público que votó, tal como están en el back</span>
      </div>
      <div className="duo">
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Star size={14} style={{ color: 'var(--purple3)' }} /> La calidad de sus piezas</span>}
          action={<Badge tone={datos.evaluaciones.length ? 'green' : 'muted'}>{datos.evaluaciones.length} evaluadas</Badge>}>
          {datos.evaluaciones.length === 0 ? (
            <EstadoVacio
              {...vacio(
                'Todavía no hay piezas evaluadas',
                'Cuando el motor produzca una pieza, los 5 jueces la puntúan antes de que salga y el puntaje aparece aquí, con cuánta gente del público la votó.',
              )}
              {...invitar()} />
          ) : (
            <>
              <div className="row" style={{ gap: 20, marginBottom: 16 }}>
                <Ring valor={Math.round(datos.evaluaciones.reduce((s, e) => s + (e.puntaje || 0), 0) / datos.evaluaciones.length)}
                  label="SCORE" color="var(--green)" sub="promedio de sus piezas" />
                <div className="dato" style={{ flex: 1 }}>
                  <span className="dato-l">Qué significa</span>
                  <span className="bs">
                    Es el puntaje que el panel le puso a cada pieza. Arriba de <b style={{ color: 'var(--green)' }}>80</b> se publica,
                    entre 60 y 80 se revisa, abajo de 60 se descarta.
                  </span>
                </div>
              </div>
              {datos.evaluaciones.map(e => {
                const c = e.puntaje >= 80 ? 'var(--green)' : e.puntaje >= 60 ? 'var(--amber)' : 'var(--red)';
                return (
                  <div key={e.id} style={{ padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                    <div className="row spread" style={{ marginBottom: 6 }}>
                      <span className="bt" style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.titulo}</span>
                      <span style={{ fontWeight: 900, fontSize: 14, color: c, flexShrink: 0 }}>{e.puntaje}</span>
                    </div>
                    <BarRow valor={e.puntaje} max={100} color={c} />
                    <div className="tiny muted" style={{ marginTop: 4 }}>
                      {e.total_publico > 0 ? `${e.total_publico} personas del público la votaron` : 'sin votos del público cargados'}
                      {e.orden ? ` · orden ${e.orden}` : ''}
                      {e.created_at ? ` · ${horaDe(e.created_at)}` : ''}
                    </div>
                  </div>
                );
              })}
            </>
          )}
          <div className="acc-why">
            <b>Una pieza que no pasa a los jueces nunca se publica.</b> Los puntajes de aquí son los que
            hay en el servidor, con la fecha en que se evaluó cada una.
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Vote size={14} style={{ color: 'var(--green)' }} /> El público que votó</span>}
          action={<Badge tone={datos.publico?.total ? 'green' : 'muted'}>{datos.publico?.total ?? 0} personas</Badge>}>
          {!datos.publico || datos.publico.total === 0 ? (
            <EstadoVacio
              {...vacio(
                'Todavía no hay público',
                'Aquí se ve quién votó sus piezas, por estilo y por edad. Cuando haya votos, aparecen agrupados en esta tarjeta: es el mismo público que decide si una pieza sale.',
              )} />
          ) : (
            <>
              <div className="bs" style={{ marginBottom: 8 }}>Por estilo:</div>
              {(datos.publico.por_estilo ?? []).slice(0, 6).map((e, i) => (
                <BarRow key={i} label={e.estilo} valor={e.n} max={maxDe((datos.publico?.por_estilo ?? []).map(x => x.n))} color="var(--purple2)" formato={String(e.n)} />
              ))}
              <div className="bs" style={{ marginTop: 14, marginBottom: 8 }}>Por edad:</div>
              {(datos.publico.por_edad ?? []).slice(0, 6).map((e, i) => (
                <BarRow key={i} label={e.rango} valor={e.n} max={maxDe((datos.publico?.por_edad ?? []).map(x => x.n))} color="var(--green)" formato={String(e.n)} />
              ))}
              {datos.publico.muestra?.length > 0 && (
                <div className="tiny muted" style={{ marginTop: 10 }}>
                  {datos.publico.muestra.length} {datos.publico.muestra.length === 1 ? 'persona' : 'personas'} en la muestra que dejó el motor.
                </div>
              )}
            </>
          )}
          <div className="acc-why">
            El público es lo que hace que un puntaje no sea una opinión: <b>son personas de verdad las que
            votan</b> antes de que la pieza gaste un peso.
          </div>
        </Card>
      </div>

      {/* ====================== FILA 3: MEMORIA Y CIERRE ======================
          La bitácora sale de las corridas del back (`d.corridas`), una línea por corrida con lo que
          hizo cada agente; al lado, los créditos tal como están registrados. Las dos leen del back. */}
      <div className="csec">
        <span className="csec-n">3</span>
        <span className="csec-t">Memoria y cierre</span>
        <span className="csec-s">Todo lo que hizo el motor, corrida por corrida, tal como quedó en el back</span>
      </div>
      <div className="duo">
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Clock size={14} style={{ color: 'var(--purple3)' }} /> La bitácora</span>}
          action={
            <Button variant="ghost" className="btn-sm"
              title={`Muestre todas las corridas del motor (${datos.corridas.length}). No cambia nada.`}
              onClick={() => setBitacoraCompleta(!bitacoraCompleta)}>
              {bitacoraCompleta ? 'Ver menos' : 'Ver todas'}
            </Button>
          }
        >
          {datos.corridas.length === 0 ? (
            <EstadoVacio
              {...vacio(
                'El motor todavía no dejó corridas',
                'Cada vez que el motor trabaja, queda una corrida aquí con lo que hizo cada agente: qué corrió, en qué terminó y cuántos créditos usó. Todavía no hay ninguna.',
              )}
              {...invitar()} />
          ) : (
            <div className="tl">
              {(bitacoraCompleta ? datos.corridas : datos.corridas.slice(0, 5)).map(c => (
                <div key={c.id} className="tl-item">
                  <span className="tl-dot" style={{ background: c.estado === 'ok' || c.estado === 'terminada' ? 'var(--green)' : 'var(--amber)' }} />
                  <span className="tl-time">{horaDe(c.empezada_at)}</span>
                  <div className="tl-body">
                    <div className="tl-text">
                      <b style={{ color: 'var(--purple3)' }}>El motor</b> corrió {c.motivo || 'sin motivo cargado'}
                      <span className="tiny muted"> · {c.estado || 'en curso'}{typeof c.creditos === 'number' ? ` · ${c.creditos} créditos` : ''}</span>
                    </div>
                    {!c.tareas || c.tareas.length === 0 ? (
                      <div className="tiny muted">Esta corrida no dejó tareas cargadas.</div>
                    ) : (
                      (c.tareas ?? []).slice().sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)).map((t, i) => (
                        <div key={i} className="tl-anchor" style={{ display: 'block' }}>
                          <b style={{ color: 'var(--purple3)' }}>{t.agente}</b> {t.que}
                          {t.resultado && Object.keys(t.resultado).length > 0
                            ? <span className="tiny muted"> · {resultadoTxt(t.resultado)}</span>
                            : null}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="acc-why">
            Cada línea es una corrida del motor, con lo que hizo cada agente. <b>Sale del back</b>: la
            hora, el estado y los créditos son los que quedaron registrados.
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Wallet size={14} style={{ color: 'var(--green)' }} /> Sus créditos, tal como están en el back</span>}
          action={
            !datos.real
              ? <Badge tone="muted">sin leer</Badge>
              : <Badge tone={datos.creditos && datos.creditos.saldo > 0 ? 'green' : 'amber'}>
                {datos.creditos ? `${datos.creditos.saldo} créditos` : 'leyendo'}
              </Badge>
          }
        >
          {!datos.real ? (
            <EstadoVacio
              titulo="Todavía no hay créditos que mostrar"
              texto="El saldo y los movimientos salen del servidor de Sinkroo: cuánto entró, cuánto salió y con qué motivo. Cuando el panel esté leyendo su cuenta, aparecen aquí." />
          ) : !datos.creditos ? (
            <EstadoVacio
              {...vacio('Todavía no se pudo leer sus créditos', 'Esta tarjeta muestra el saldo y los movimientos que el servidor tiene registrados: cuánto entró, cuánto salió y con qué motivo. El servidor no respondió; vuelva a leerlo y aparece.')}
              accion="Volver a leer"
              onAccion={() => void datos.refrescar()} />
          ) : (datos.creditos.movimientos ?? []).length === 0 ? (
            <EstadoVacio
              titulo="Todavía no hay movimientos de créditos"
              texto="Este negocio no ha cargado ni gastado créditos: cuando haya el primer movimiento, queda aquí con su monto, su motivo y su fecha, tal como lo registró el servidor." />
          ) : (
            <>
              <div className="datos-row">
                <div className="dato"><span className="dato-l">Saldo</span><span className="dato-v" style={{ color: 'var(--green)' }}>{datos.creditos.saldo}</span></div>
                <div className="dato"><span className="dato-l">Movimientos registrados</span><span className="dato-v">{datos.creditos.movimientos.length}</span></div>
              </div>
              <div className="tl" style={{ marginTop: 12 }}>
                {datos.creditos.movimientos.slice(0, 5).map((m, i) => (
                  <div key={i} className="tl-item">
                    <span className="tl-dot" style={{ background: m.delta >= 0 ? 'var(--green)' : 'var(--amber)' }} />
                    <span className="tl-time">{horaDe(m.created_at)}</span>
                    <div className="tl-body">
                      <div className="tl-text"><b>{m.delta >= 0 ? '+' : ''}{m.delta}</b> {m.motivo || 'sin motivo cargado'}</div>
                      <div className="tl-anchor">{m.detalle || `saldo después del movimiento: ${m.saldo}`}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="acc-why">
                El saldo y cada movimiento <b>salen del back</b>: no son una estimación del panel. Los
                movimientos más viejos quedan en la pantalla de Créditos.
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

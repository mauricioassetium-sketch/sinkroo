import { useState } from 'react';
import { Card, Badge, Button } from '../components/ui';
import { ViewHead, Gauge } from '../components/viz';
import { I_Settings, I_Check, I_Lock, I_Plus, I_Zap, I_Credit, I_Link, I_Clock, I_X, I_Refresh } from '../components/icons';
import { MODOS, PLANES, type Modo } from '../data/demo';
// La capa de datos del panel: TODO lo que se muestra sale de su cuenta (`datos.real`): el negocio, el
// onboarding, las integraciones y el libro de créditos del back. Sin back no hay cuenta que leer, así
// que la pantalla es la misma con los datos que no llegaron en «—» y un estado vacío donde no hay nada.
import { useDatos, type IntegracionRed } from '../api/datos';
// Las acciones de la conexión con Instagram (conectar, sincronizar, desconectar) van al back con el
// token de la sesión: es el mismo cliente que usa la capa de datos, no una puerta nueva.
import { arrancarMotor, baseApi, recordarRed, token } from '../api/cliente';
// La seguridad de la cuenta (el PIN y el correo): la tarjeta de abajo lee el estado real y el aviso del
// PIN se abre desde aquí, que es donde están las acciones que lo piden.
import { useSeguridad } from '../lib/seguridad';
import { TarjetaSeguridad } from '../components/Seguridad';
import { EstadoVacio } from '../components/EstadoVacio';
import { PASOS_ONB } from '../data/onboarding';

const NOMBRE: Record<Modo, string> = { auto: 'Automático', shared: 'Compartido', manual: 'Manual' };

/** La hora real de cada movimiento: es lo que hace que el historial no sea un texto fijo. */
const ahora = () => new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

/** La fecha del back, en corto: día, mes y año. Si no se puede leer, se muestra tal cual vino. */
const diaDe = (iso?: string | null) => {
  if (!iso) return '';
  const f = new Date(iso);
  return isNaN(f.getTime()) ? String(iso) : f.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
};

/** La fecha y hora del back: para el libro de créditos, donde importa el orden de los movimientos. */
const fechaHoraDe = (iso?: string | null) => {
  if (!iso) return '';
  const f = new Date(iso);
  return isNaN(f.getTime())
    ? String(iso)
    : f.toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const palabraCuenta = (n: number) => (n === 1 ? 'una cosa' : `${n} cosas`);

/** El ícono de cada red conectable: el que el back manda por nombre. Lo que el back mande y no esté
 *  en la lista sale con el ícono de enlace, nunca sin ícono. */
const ICONO_RED: Record<string, string> = {
  instagram: '📸', meta_ads: '📣', whatsapp: '💬', tiktok: '🎵', youtube: '📺',
  email: '✉️', tienda: '🛒', google: '🔎', pixel: '📊',
};
const iconoDe = (red: string) => ICONO_RED[red] || '🔗';

export function ViewCuenta({ setToast, modo, setModo }: { setToast: (t: string) => void; modo: Modo; setModo: (m: Modo) => void }) {
  // La misma pantalla, dos pieles: si la cuenta es de un creador, ve su Cuenta y autonomía (el dial
  // acción por acción, los guardrails y su Ficha). El corte va en el cuerpo de esta función, antes
  // que cualquier otro hook, así el cambio de piel no altera el orden de los hooks de la vista de
  // negocio: ésa vive intacta abajo, en `ViewCuentaNegocio`.
  return <ViewCuentaNegocio setToast={setToast} modo={modo} setModo={setModo} />;
}

function ViewCuentaNegocio({ setToast, modo, setModo }: { setToast: (t: string) => void; modo: Modo; setModo: (m: Modo) => void }) {
  // La fuente de todo: su cuenta (`datos.real`). Sin back no hay cuenta que leer, y los datos que no
  // llegaron van en «—»: esta pantalla no rellena ningún hueco con un número de ejemplo.
  const datos = useDatos();
  // La seguridad del negocio: el estado del PIN y del correo, y el aviso que le pide los seis dígitos
  // antes de una acción sensible. Sin back, `estado` es null y no se muestra nada nuevo.
  const seguridad = useSeguridad();

  // =============================================================================================
  // LO QUE ESTA PANTALLA CAMBIA — y por eso queda escrito en la pantalla, no en un aviso que se va.
  // Cada estado de aquí abajo tiene su línea o su etiqueta a la vista, con la hora real del momento
  // en que se produjo el cambio.
  // =============================================================================================

  /** Lo que se movió en esta visita (el dial), con la hora real: queda escrito en la pantalla. */
  const [historial, setHistorial] = useState<{ hora: string; t: string; s: string }[]>([]);
  /** La auto-recarga: cambia lo que dice la tarjeta de créditos y evita que el motor se detenga. */
  const [autoRecarga, setAutoRecarga] = useState(false);
  /** La hora en que se encendió: es la que se muestra en la línea de la pantalla, no una hora fija. */
  const [autoRecargaDesde, setAutoRecargaDesde] = useState('');
  /** La acción que está en curso en una de las redes (conectar, sincronizar, desconectar): mientras
   *  corre, el botón lo dice y no se puede volver a apretar. null = no hay nada corriendo. */
  const [trabajando, setTrabajando] = useState<{ red: string; accion: string } | null>(null);

  const registrar = (t: string, s: string) => setHistorial(h => [...h, { hora: ahora(), t, s }]);

  // ---------------------------------------------------------------------------------------------
  // LOS PANELES DE DETALLE — el dato real de cada cosa, en el mismo lugar para todos los botones.
  // ---------------------------------------------------------------------------------------------

  // ---------------------------------------------------------------------------------------------
  // LAS CONEXIONES REALES, CON EL BACK ENCENDIDO — el estado de cada red y sus tres acciones.
  // El back manda la lista de redes conectables (con su nombre, su rol y qué aporta cada una): aquí se
  // recorre tal cual llega, sin fijar a mano cuántas son. El token vive en el servidor: esta pantalla
  // no lo pide ni lo muestra, sólo dice si hay uno guardado. Las tres acciones llaman a la ruta de ESA
  // red y, salvo la de conectar (que se lleva al navegador al proveedor), releen el estado para que la
  // fila muestre lo que quedó en el servidor.
  // ---------------------------------------------------------------------------------------------
  const ig = datos.integraciones;
  /**
   * ¿Esta red se puede conectar hoy? Con su app propia cargada en el servidor, o por bundle.social
   * (`viaBundle`): el agregador conecta la cuenta sin que haga falta la app de la plataforma. Una red
   * que se puede conectar no puede decir «falta configurar» ni quedarse sin su botón.
   */
  const sePuedeConectar = (r: IntegracionRed) => r.configurado || !!r.viaBundle;

  /** Una llamada al back con el token de la sesión, siempre la misma forma de leer el error. El PIN va en
   *  el cuerpo cuando la acción es sensible y el negocio ya lo tiene puesto. */
  const accionRed = async (red: string, accion: 'empezar' | 'sincronizar' | 'desconectar', pin?: string) => {
    const r = await fetch(baseApi() + `/api/integraciones/${encodeURIComponent(red)}/${accion}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token() },
      // Sin PIN el cuerpo va igual que siempre (ninguno): sólo las acciones sensibles lo mandan.
      ...(pin ? { body: JSON.stringify({ pin }) } : {}),
    });
    const cuerpo = await r.json().catch(() => ({})) as {
      url?: string; error?: string; detalle?: string; codigo?: string; que_hizo?: string; red?: string;
      /** El back pide el PIN de seguridad para dejar pasar esta acción. */
      pin_requerido?: boolean;
    };
    return { ok: r.ok, cuerpo };
  };

  /** ¿El back está pidiendo el PIN de seguridad para dejar pasar esto? */
  const pideElPin = (cuerpo: { codigo?: string; pin_requerido?: boolean }) =>
    cuerpo.pin_requerido === true || cuerpo.codigo === 'pin_necesario';

  /**
   * UNA ACCIÓN SENSIBLE CON EL PIN ADELANTE: se intenta; si el back contesta que le hace falta el PIN,
   * se le pide los seis dígitos (se verifican contra el servidor en ese mismo aviso) y se reintenta sola
   * con el PIN puesto. Si la persona cierra el aviso, no se ejecuta nada y se dice.
   */
  const conElPin = async <T,>(
    accion: (pin?: string) => Promise<T>,
    esFaltaDePin: (r: T) => boolean,
    motivo: string,
  ): Promise<{ r: T; cancelado: boolean }> => {
    const primero = await accion();
    if (!esFaltaDePin(primero)) return { r: primero, cancelado: false };
    const pin = await seguridad.pedirPin(motivo);
    if (!pin) return { r: primero, cancelado: true };
    return { r: await accion(pin), cancelado: false };
  };

  /** Conectar una red: el back devuelve la dirección del proveedor y el navegador se va para allá. */
  const conectarRed = async (red: string, nombre: string) => {
    setTrabajando({ red, accion: 'conectar' });
    try {
      const { ok, cuerpo } = await accionRed(red, 'empezar');
      if (ok && cuerpo.url) {
        // La red queda anotada: es lo que hace que el paso de vuelta sepa a qué red pertenece el código.
        recordarRed(red);
        setToast(`${nombre} le va a pedir el permiso: cuando autorice, su cuenta queda conectada`);
        window.location.href = cuerpo.url;
      } else {
        setToast(cuerpo.error || `No se pudo empezar la conexión con ${nombre}: el servidor respondió con un error`);
      }
    } catch { setToast(`No se pudo hablar con el servidor: la conexión con ${nombre} no arrancó`); }
    setTrabajando(null);
  };

  /** Sincronizar ahora: el back lee los datos de esa red y calibra solo. Después se relee todo. */
  const sincronizarRed = async (red: string, nombre: string) => {
    setTrabajando({ red, accion: 'sincronizar' });
    try {
      const { ok, cuerpo } = await accionRed(red, 'sincronizar');
      if (ok) {
        // Lo que devolvió el back, con sus palabras: qué hizo y con qué detalle.
        const dicho = [cuerpo.que_hizo, cuerpo.detalle].filter(Boolean).join(': ');
        setToast(dicho || `${nombre} sincronizó con el servidor`);
      } else {
        setToast(cuerpo.error || `No se pudo sincronizar ${nombre}: el servidor respondió con un error`);
      }
    } catch { setToast('No se pudo sincronizar: el servidor no respondió'); }
    await datos.refrescar();
    setTrabajando(null);
  };

  /** Desconectar: el back borra el token guardado. Volver a conectar es el mismo paso de autorización.
   *  Es una de las acciones sensibles: si el negocio tiene PIN, el back lo pide y aquí se pide y se
   *  reintenta sola con el PIN ya verificado. */
  const desconectarRed = async (red: string, nombre: string) => {
    setTrabajando({ red, accion: 'desconectar' });
    try {
      const { r: { ok, cuerpo }, cancelado } = await conElPin(
        pin => accionRed(red, 'desconectar', pin),
        x => !x.ok && pideElPin(x.cuerpo),
        `Para desconectar una cuenta le pedimos su PIN de seguridad. ${nombre} va a quedar desconectado del motor.`,
      );
      if (cancelado) setToast(`${nombre} sigue conectado: no se desconectó nada`);
      else if (ok) setToast(`${nombre} quedó desconectado: el token se borró del servidor y no se frena nada de lo que ya corre`);
      else setToast(cuerpo.error || `No se pudo desconectar ${nombre}: el servidor respondió con un error`);
    } catch { setToast('No se pudo desconectar: el servidor no respondió'); }
    await datos.refrescar();
    setTrabajando(null);
  };

  /** Arrancar el motor con lo que haya. Es la otra acción sensible: puede pedir el PIN y se reintenta sola. */
  const arrancarConElPin = async () => {
    try {
      const { r: fallo, cancelado } = await conElPin<{ codigo?: string; message?: string } | null>(
        async pin => {
          try { await arrancarMotor(pin); return null; }
          catch (e) { return e as { codigo?: string; message?: string }; }
        },
        x => !!x && (x.codigo === 'pin_necesario' || x.codigo === 'pin_requerido'),
        'Para arrancar el motor le pedimos su PIN de seguridad: desde ahí el motor empieza a trabajar con lo que le puso.',
      );
      if (cancelado) setToast('El motor sigue detenido: no se arrancó nada');
      else if (fallo) setToast(`No se pudo arrancar el motor: ${fallo.message || 'el servidor respondió con un error'}`);
      else setToast('El motor arrancó: empieza por el mercado y no gasta nada hasta publicar');
    } catch { setToast('No se pudo arrancar el motor: el servidor no respondió'); }
    await datos.refrescar();
  };

  // ---------------------------------------------------------------------------------------------
  // DE DÓNDE SALEN LOS CRÉDITOS, EL PLAN Y LOS DÍAS — con el back encendido son los del negocio
  // real; sin back no se sabe, y va en «—». El plan se busca en el catálogo de planes (eso es
  // producto, no datos del negocio) y los días salen del mismo consumo que usa el menú (150/día):
  // así el menú y esta pantalla dicen siempre el mismo número.
  // ---------------------------------------------------------------------------------------------
  const planBack = PLANES.find(p => p.key === (datos.negocio?.plan || ''));
  // El saldo: el de su cuenta cuando el back la leyó. Sin back no se sabe, y va en «—»: no se
  // reemplaza por el de otro plan.
  const creditos: number | null = datos.real ? (datos.creditos?.saldo ?? datos.negocio?.creditos ?? 0) : null;
  // El tope de créditos del mes: el del plan del back SÓLO si el catálogo lo tiene. Si no lo tiene
  // no se sabe, y no se reemplaza por el de otro plan: sin tope no se dibuja ninguna barra.
  const creditosMes = planBack?.creditosMes ?? null;
  const pctCreditos = creditosMes && creditos !== null ? Math.min(100, Math.round((creditos / creditosMes) * 100)) : 0;
  const diasAutonomia: number | null = creditos === null ? null : Math.max(0, Math.round(creditos / 150));
  /** La fecha en que el motor se detendría: se calcula con los créditos de hoy, no se escribe a mano. */
  const seDetieneEl = diasAutonomia === null ? '' : new Date(Date.now() + diasAutonomia * 24 * 60 * 60 * 1000)
    .toLocaleDateString('es-CO', { day: 'numeric', month: 'long' });
  const movimientosBack = datos.creditos?.movimientos ?? [];

  return (
    <div className="dash">
      <ViewHead
        icon={<I_Settings size={19} />}
        titulo="Cuenta y autonomía"
        sub="Su negocio, sus créditos y cuánto decide la IA. Todo de aquí sale de su cuenta: lo que todavía no está cargado va en «—»."
        nums={[
          { v: NOMBRE[modo], l: 'modo actual', c: 'var(--purple3)' },
          { v: creditos === null ? '—' : creditos.toLocaleString('es-CO'), l: 'créditos disponibles' },
          { v: diasAutonomia === null ? '—' : String(diasAutonomia), l: 'días de autonomía', c: 'var(--amber)' },
          { v: datos.real ? `${datos.onboarding?.hechos.length ?? 0}/5` : '—', l: 'primeros pasos', c: 'var(--green)' },
        ]}
      />

      {/* ============ EL NEGOCIO REAL Y SUS PRIMEROS PASOS (sólo con el back encendido) ============
          Estas dos tarjetas son la cara del negocio real: el nombre, el plan, la zona y los créditos
          que devuelve el back, y el estado del onboarding guardado allí. Sin back no se muestran. */}
      {datos.real && (
        <div className="duo" style={{ marginTop: 16 }}>
          <Card
            title={<span className="row" style={{ gap: 8 }}><I_Settings size={14} style={{ color: 'var(--purple3)' }} /> Su negocio</span>}
            action={<Badge tone="green">{datos.negocio?.plan || 'sin plan'}</Badge>}>
            {!datos.negocio ? (
              <EstadoVacio
                titulo={datos.cargando ? 'Leyendo su negocio del back…' : 'No se pudo leer su negocio del servidor'}
                texto={datos.cargando
                  ? 'El panel está leyendo el negocio de su cuenta: en un momento dice qué hay.'
                  : (datos.error || 'El panel está conectado al servidor, pero la lectura del negocio no trajo datos.')}
                accion={datos.cargando ? 'Leyendo…' : 'Volver a leer el back'}
                onAccion={() => { if (!datos.cargando) void datos.refrescar(); }} />
            ) : (
              <>
                <div className="datos-row">
                  <div className="dato"><span className="dato-l">Nombre</span><span className="dato-v">{datos.negocio.name}</span></div>
                  <div className="dato"><span className="dato-l">Plan</span><span className="dato-v">{datos.negocio.plan}</span></div>
                  <div className="dato"><span className="dato-l">Zona</span><span className="dato-v">{datos.negocio.zona || 'sin zona'}</span></div>
                  <div className="dato"><span className="dato-l">Créditos</span><span className="dato-v" style={{ color: 'var(--amber)' }}>{creditos === null ? '—' : creditos.toLocaleString('es-CO')}</span></div>
                </div>
                <div className="bs" style={{ marginTop: 12 }}>{datos.negocio.description || 'Su negocio todavía no tiene descripción.'}</div>
                <div className="tiny muted" style={{ marginTop: 6 }}>
                  {datos.negocio.industry ? `${datos.negocio.industry} · ` : ''}cuenta creada el {diaDe(datos.negocio.created_at) || 'sin fecha'} · id {datos.negocio.id}
                </div>
                <div className="acc-why">
                  Estos datos son suyos y salen de su cuenta. El plan define
                  cuántos créditos entran por mes y de ahí salen los días de autonomía.
                </div>
              </>
            )}
          </Card>

          <Card
            title={<span className="row" style={{ gap: 8 }}><I_Check size={14} style={{ color: 'var(--purple3)' }} /> Primeros pasos</span>}
            action={<Badge tone={datos.onboarding?.arrancado ? 'green' : 'amber'}>
              {datos.onboarding?.arrancado ? 'el motor está en marcha' : `${datos.onboarding?.hechos.length ?? 0} de 5 hechos`}
            </Badge>}>
            <div className="onb-datos">
              {PASOS_ONB.map(p => (
                <div key={p.n} className="dato">
                  <span className="dato-l">{p.n}. {p.t}</span>
                  <span className="dato-v" style={{ color: datos.onboarding?.hechos.includes(p.n) ? 'var(--green)' : 'var(--muted2)' }}>
                    {datos.onboarding?.hechos.includes(p.n) ? 'hecho' : 'falta'}
                  </span>
                </div>
              ))}
            </div>
            {datos.onboarding?.arrancado ? (
              <div className="bs" style={{ marginTop: 12 }}>
                El motor arrancó con lo que usted le puso. Lo que falte lo toma en la próxima vuelta: puede completarlo cuando quiera.
              </div>
            ) : (
              <>
                <div className="bs" style={{ marginTop: 12 }}>
                  El motor todavía no arrancó. Se puede arrancar con lo que haya: lo que falte lo deduce de su negocio y de sus conversaciones.
                </div>
                <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  <Button className="btn-sm"
                    title="Arranca el motor con lo que ya está cargado (POST /api/onboarding/arrancar). Desde ahí trabaja solo y lo que haga queda en Su día. Si su negocio tiene PIN de seguridad, se lo pedimos antes."
                    onClick={() => void arrancarConElPin()}>
                    <I_Zap size={13} /> Arrancar el motor
                  </Button>
                </div>
              </>
            )}
            <div className="acc-why">
              El estado de los cinco pasos es el que quedó guardado en el back: no es una copia de esta visita.
            </div>
          </Card>
        </div>
      )}

      {/* ============ LA SEGURIDAD DE LA CUENTA (sólo con el back encendido) ============
          El PIN y el correo de la cuenta, con el estado que tiene hoy el servidor: si el PIN está puesto
          (y cuándo se puede volver a intentar), si la dirección está confirmada y si el servidor tiene
          el correo configurado. Sin back no hay nada que mostrar: la tarjeta no aparece. */}
      {datos.real && (
        <div style={{ marginTop: 16 }}>
          <TarjetaSeguridad seg={seguridad} />
        </div>
      )}

      {/* ============ EL DIAL ============ */}
      <div className="csec" style={{ marginTop: 0 }}>
        <span className="csec-n">★</span>
        <span className="csec-t">¿Cuánto decide la IA?</span>
        <span className="csec-s">Una decisión suya. El mismo vidrio del motor, tres comportamientos distintos</span>
      </div>
      <Card>
        <div className="dial-modes">
          {MODOS.map(m => (
            <div key={m.key} className={`dial-mode ${modo === m.key ? 'on' : ''}`}
              onClick={() => {
                if (modo !== m.key) registrar(`El motor pasa a ${m.nombre}`, `venía en ${NOMBRE[modo]}`);
                setModo(m.key);
                setToast(`Modo ${m.nombre}: ${m.desc}`);
              }}>
              <div className="dial-mode-top">
                <span className="dial-radio" />
                <span className="dial-mode-nm">{m.nombre}</span>
                {m.key === 'shared' && <span className="badge badge-purple" style={{ marginLeft: 'auto', fontSize: 9 }}>recomendado</span>}
              </div>
              <div className="dial-mode-ds">{m.desc}</div>
            </div>
          ))}
        </div>

        {/* Lo que se movió en esta visita: es un registro real de esta pantalla, con la hora. */}
        {historial.length > 0 && (
          <div className="tiny" style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 12, color: 'var(--purple3)', fontWeight: 700 }}>
            <I_Clock size={13} /> En esta visita movió {palabraCuenta(historial.length)}: la última, «{historial[historial.length - 1].t}» a las {historial[historial.length - 1].hora}.
          </div>
        )}

        <div className="alarm" style={{ marginTop: 15, borderLeft: '3px solid var(--purple2)', background: 'rgba(168,85,247,.05)' }}>
          <div className="alarm-head">
            <span className="alarm-sev oportunidad">CÓMO SE VE EN EL MOTOR</span>
          </div>
          <div className="alarm-sug">
            {modo === 'auto'
              ? <>En <b>Automático</b> el motor no le pregunta nada: hace y se lo cuenta en la bitácora. Lo que igual no puede tocar es el freno del saldo: nunca gasta más de los créditos que hay en su cuenta.</>
              : modo === 'shared'
                ? <>En <b>Compartido</b> el motor prepara todo y se frena esperándolo. Va a ver "3 decisiones esperan su OK" en la barra del motor, y puede resolverlas sin salir de Su día.</>
                : <>En <b>Manual</b> el motor sólo sugiere y acumula propuestas. Usted escribe, publica y responde. No gasta nada por su cuenta.</>}
          </div>
        </div>

        <div className="row" style={{ gap: 20, marginTop: 18, flexWrap: 'wrap', alignItems: 'center' }}>
          <I_Credit size={22} style={{ color: 'var(--amber)' }} />
          <div style={{ flex: 1, minWidth: 220 }}>
            {creditosMes && creditos !== null ? (
              <Gauge pct={pctCreditos} label="Días de autonomía restantes"
                detalle={`${creditos.toLocaleString('es-CO')} de ${creditosMes.toLocaleString('es-CO')} créditos`} />
            ) : (
              <div className="bs">
                {creditos === null
                  ? <>Su saldo sale de su cuenta: cuando el panel la lea, acá se dibuja la barra del mes con el tope de su plan.</>
                  : <><b>{creditos.toLocaleString('es-CO')} créditos disponibles.</b> El tope de créditos del mes todavía no está cargado, así que el panel no dibuja la barra ni calcula un porcentaje contra un número que no conoce.</>}
              </div>
            )}
            <div className="bs" style={{ marginTop: 8 }}>
              {diasAutonomia === null
                ? <>Los días de autonomía salen de los créditos que haya en su cuenta: todavía no se leyeron.</>
                : diasAutonomia === 0
                  ? <>Con los créditos de hoy el motor <b style={{ color: 'var(--amber)' }}>no tiene días de autonomía</b>: se detiene hasta que recargue.</>
                  : <>Con el modo actual el motor trabaja <b style={{ color: 'var(--purple3)' }}>{diasAutonomia} días más</b> y se detendría el {seDetieneEl}.</>}
              {' '}El plan y los créditos son los que hay cargados en su cuenta hoy.
            </div>
          </div>
          {autoRecarga && <Badge tone="green">auto-recarga activa</Badge>}
          <Button variant={autoRecarga ? 'outline' : 'primary'} className="btn-sm"
            title={autoRecarga
              ? 'Apaga la auto-recarga: el motor vuelve a detenerse cuando se agoten los créditos. Reversible: la puede volver a activar.'
              : 'Paga el próximo paquete solo cuando los créditos bajen de 500, sin que el motor se detenga. Reversible: se apaga cuando quiera.'}
            onClick={() => {
              const nuevo = !autoRecarga;
              setAutoRecarga(nuevo);
              setAutoRecargaDesde(nuevo ? ahora() : '');
              setToast(nuevo
                ? 'Auto-recarga activada: al bajar de 500 créditos se paga el paquete y el motor no se detiene'
                : 'Auto-recarga apagada: vuelve a recargar usted cuando quiera');
            }}>
            {autoRecarga ? <><I_Check size={13} /> Apagar auto-recarga</> : <><I_Zap size={13} /> Activar auto-recarga</>}
          </Button>
        </div>

        {autoRecarga && (
          <div className="tiny" style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 12, color: 'var(--green)', fontWeight: 700 }}>
            <I_Check size={13} /> Auto-recarga activa desde las {autoRecargaDesde}: cuando los créditos bajen de 500
            se paga el próximo paquete y el motor <b>no se detiene{diasAutonomia === null ? '' : ` el ${seDetieneEl}`}</b>. Se apaga con el mismo botón, sin perder nada del plan.
            {' '}Es una decisión de esta visita: todavía no queda guardada en su cuenta.
          </div>
        )}
      </Card>

      {/* ============ CONEXIONES Y CRÉDITOS ============ */}
      <div className="duo" style={{ marginTop: 16 }}>
        {/* ============ LAS CONEXIONES: las que devuelve el back ============
            Una fila por CADA red que devuelva el back, en el orden en que llegan: si la app de esa red está configurada en el
            servidor (o si la cubre bundle.social, que va con `viaBundle`), si hay cuenta conectada y
            cuándo se sincronizó. El token vive en el servidor: aquí no se pide ni se muestra, sólo se dice
            si hay uno guardado. Los nombres y los roles son los que manda el back: aquí no hay una lista de
            redes escrita a mano. */}
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Link size={14} style={{ color: 'var(--green)' }} /> Conexiones</span>}
          action={<Badge tone={!ig ? 'muted' : ig.resumen.conectadas > 0 ? 'green' : 'amber'}>
            {!ig ? (datos.cargando ? 'leyendo' : 'sin leer') : `${ig.resumen.conectadas} de ${ig.resumen.total}`}
          </Badge>}
        >
          <div className="bs" style={{ marginBottom: 12 }}>
            Conecte sus propias cuentas: el sistema todavía no publica en las redes y sólo va a trabajar con
            las que usted conecte, nunca con las cuentas de Sinkroo. Cada fila
            dice hoy si se puede conectar —las que van por bundle.social o con la app de Sinkroo cargada en el
            servidor traen su botón— y cuáles todavía dicen «falta configurar», con la variable que falta. Lo que
            se ve aquí es el estado del servidor, no una copia de esta visita.
          </div>

          {!ig ? (
            /* Sin back no hay cuenta que leer, y si el back está encendido pero no respondió se dice eso:
               en los dos casos se nombra lo que pasa, no se dibuja una red inventada. */
            datos.real ? (
              <EstadoVacio
                {...(datos.cargando
                  ? { titulo: 'Leyendo sus conexiones…', texto: 'El panel está leyendo el estado de sus conexiones en su cuenta. Mientras lee no afirma nada: si no hay nada, lo dice enseguida.' }
                  : { titulo: 'No se pudo leer el estado de las conexiones', texto: 'Aquí se ve, red por red, si la app de cada red está configurada en el servidor, si hay una cuenta conectada y cuándo se sincronizó por última vez. El servidor no respondió; vuelva a leerlo y aparece tal como está.' })}
                {...(datos.cargando ? {} : { accion: 'Volver a leer', onAccion: () => void datos.refrescar() })} />
            ) : (
              <EstadoVacio
                titulo="Todavía no hay conexiones que leer"
                texto="Aquí va a ver, red por red, si la app de cada red está configurada en el servidor, si hay una cuenta conectada y cuándo se sincronizó por última vez. Todavía no se leyó su cuenta, así que no hay ninguna fila que mostrar."
              />
            )
          ) : ig.redes.length === 0 ? (
            /* El back respondió y no mandó ninguna red: se dice eso, sin dibujar filas inventadas. */
            <EstadoVacio titulo="El servidor todavía no mandó redes para conectar"
              texto="Cuando el back devuelva sus redes conectables, cada una aparece aquí con su nombre, su rol y su estado. Devolvió la lista vacía."
              accion="Volver a leer" onAccion={() => void datos.refrescar()} />
          ) : (
          ig.redes.map(r => {
            const cuenta = r.cuenta;
            const ultima = r.ultima_sincronizacion;
            const falta = r.falta?.length ? r.falta : [];
            const enCurso = trabajando?.red === r.red ? trabajando.accion : '';
            return (
            <div key={r.red} style={{ padding: '11px 0', borderBottom: '1px solid var(--border)' }}>
              <div className="row spread" style={{ marginBottom: 6 }}>
                <span className="row" style={{ gap: 9 }}>
                  <span style={{ fontSize: 17 }}>{iconoDe(r.red)}</span>
                  <span>
                    <span className="bt">{r.nombre}</span>
                    <span className="tiny muted" style={{ display: 'block' }}>
                      {r.rol}{cuenta ? ` · ${cuenta.nombre || cuenta.external_id || 'cuenta sin nombre'}` : ''}
                    </span>
                  </span>
                </span>
                <span className="row" style={{ gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <Badge tone={cuenta ? 'green' : sePuedeConectar(r) ? 'muted' : 'red'}>
                    {cuenta ? 'conectada' : sePuedeConectar(r) ? 'sin conectar' : 'falta configurar'}
                  </Badge>
                </span>
              </div>

              {r.que_aporta && <div className="bs">{r.que_aporta}</div>}

              {/* NO SE PUEDE CONECTAR POR NINGUNA VÍA: se nombra lo que falta y NO se ofrece un botón
                  que no puede funcionar. Si la cubre bundle.social, esta rama ni se toca. */}
              {!sePuedeConectar(r) ? (
                <>
                  <div className="bs" style={{ marginTop: 4 }}>
                    {r.nombre} todavía no está configurada en el servidor y bundle.social tampoco la cubre{falta.length ? `: falta cargar ${falta.length === 1 ? 'esta variable' : 'estas variables'} de entorno` : ''}.
                    Mientras falte, el panel no le puede ofrecer conectar {r.nombre}: sin eso el permiso no se
                    puede pedir ni el token se puede guardar.
                  </div>
                  {falta.length > 0 && (
                    <div className="row" style={{ gap: 7, marginTop: 9, flexWrap: 'wrap' }}>
                      {falta.map(v => <span key={v} className="badge badge-muted" style={{ fontSize: 9.5 }}>{v}</span>)}
                    </div>
                  )}
                  <div className="tiny" style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8, color: 'var(--amber)', fontWeight: 700 }}>
                    <I_Lock size={13} /> Sin ninguna vía configurada no hay botón de conectar: esta fila no ofrece lo que todavía no puede hacer.
                  </div>
                </>
              ) : !cuenta ? (
                /* SE PUEDE CONECTAR Y NO HAY CUENTA. Hay dos casos, y son distintos de verdad:
                   · las redes por autorización (Instagram, TikTok, Google, YouTube, Meta Ads) todavía no
                     tienen permiso: el permiso lo da el dueño de la cuenta en la plataforma (o en la
                     pantalla de bundle.social, cuando la red va por el agregador).
                   · las redes por clave (WhatsApp, correo, tienda, píxel) ya tienen su clave cargada en el
                     servidor: no hay permiso que pedir, sólo falta la primera lectura. */
                <div className="bs">
                  {r.tipo === 'token' ? (
                    <>Su clave ya está cargada en el servidor: no hay permiso que pedir. Falta la primera lectura
                    para que sus datos entren al motor —el panel nunca muestra ni pide esa clave.</>
                  ) : r.viaBundle ? (
                    <>Su cuenta todavía no está conectada, y se puede conectar: al tocar «Conectar» se abre la
                    pantalla de bundle.social, donde el permiso lo da el dueño de la cuenta y elige la cuenta
                    ({r.viaBundle.toLowerCase()}). El token queda guardado del lado del servidor: el panel nunca
                    lo pide ni lo muestra.</>
                  ) : (
                    <>Su cuenta todavía no está conectada. Al conectar, el permiso se le pide al dueño de la cuenta
                    en {r.nombre} y el token queda guardado del lado del servidor: el panel nunca lo pide ni lo
                    muestra.</>
                  )}
                </div>
              ) : (
                /* CONECTADA: la cuenta, desde cuándo, cuándo se sincronizó y cómo salió esa sincronización. */
                <>
                  <div className="bs">
                    Su cuenta está conectada y el token vive en el servidor.{r.como_funciona ? ` ${r.como_funciona}` : ''}
                  </div>
                  <div className="datos-row" style={{ marginTop: 12 }}>
                    <div className="dato"><span className="dato-l">Cuenta</span><span className="dato-v">{cuenta.nombre || 'sin nombre'}</span></div>
                    <div className="dato"><span className="dato-l">Identificador</span><span className="dato-v">{cuenta.external_id || 'sin id'}</span></div>
                    <div className="dato"><span className="dato-l">Estado</span><span className="dato-v" style={{ color: 'var(--green)' }}>{cuenta.estado || 'conectada'}</span></div>
                    <div className="dato"><span className="dato-l">Token</span><span className="dato-v">{cuenta.tiene_token ? 'en el servidor' : 'sin guardar'}</span></div>
                    {cuenta.token_expira && (
                      <div className="dato"><span className="dato-l">El token vence</span><span className="dato-v">{diaDe(cuenta.token_expira)}</span></div>
                    )}
                    <div className="dato"><span className="dato-l">Conectada el</span><span className="dato-v">{diaDe(cuenta.created_at) || 'sin fecha'}</span></div>
                  </div>
                  {ultima ? (
                    <div className="tiny" style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 10, color: ultima.ok ? 'var(--green)' : 'var(--amber)', fontWeight: 700 }}>
                      {ultima.ok ? <I_Check size={13} /> : <I_Clock size={13} />}
                      Última sincronización ({ultima.que || 'datos'}): {ultima.ok ? 'salió bien' : 'no salió'} · {ultima.detalle || 'sin detalle'} · {fechaHoraDe(ultima.created_at) || 'sin fecha'}
                    </div>
                  ) : (
                    <div className="tiny" style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 10, color: 'var(--muted2)', fontWeight: 700 }}>
                      <I_Clock size={13} /> Todavía no se sincronizó ninguna vez: su público sigue repartido parejo hasta la primera sincronización.
                    </div>
                  )}
                </>
              )}

              <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                {/* Las redes por autorización ofrecen «Conectar» —el permiso lo da el dueño de la cuenta,
                    en la plataforma o en la pantalla de bundle.social—; las que van por clave no tienen
                    permiso que pedir, así que ofrecen la lectura (que es lo único que les falta). */}
                {sePuedeConectar(r) && !cuenta && r.tipo !== 'token' && (
                  <Button className="btn-sm" disabled={trabajando !== null}
                    title={r.viaBundle
                      ? `Conecta ${r.nombre}: abre la pantalla de bundle.social, donde el permiso lo da el dueño de la cuenta y elige cuál conectar (POST /api/integraciones/${r.red}/empezar). El token queda guardado en el servidor: esta pantalla nunca lo ve. Reversible: se desconecta desde esta misma fila.`
                      : `Conecta ${r.nombre}: el permiso lo da el dueño de la cuenta en ${r.nombre} (POST /api/integraciones/${r.red}/empezar). El token queda guardado en el servidor: esta pantalla nunca lo ve. Reversible: se desconecta desde esta misma fila.`}
                    onClick={() => void conectarRed(r.red, r.nombre)}>
                    <I_Link size={13} /> {enCurso === 'conectar' ? 'Abriendo…' : 'Conectar'}
                  </Button>
                )}
                {sePuedeConectar(r) && !cuenta && r.tipo === 'token' && (
                  <Button className="btn-sm" disabled={trabajando !== null}
                    title={`Lee los datos de ${r.nombre} con la clave que ya está cargada en el servidor (POST /api/integraciones/${r.red}/sincronizar). Si la clave no sirve, lo dice: no inventa datos.`}
                    onClick={() => void sincronizarRed(r.red, r.nombre)}>
                    <I_Refresh size={13} /> {enCurso === 'sincronizar' ? 'Leyendo…' : 'Probar y sincronizar'}
                  </Button>
                )}
                {cuenta && (
                  <>
                    <Button className="btn-sm" disabled={trabajando !== null}
                      title={`Lee los datos de ${r.nombre} y con ellos calibra su público solo (POST /api/integraciones/${r.red}/sincronizar). No frena nada de lo que ya corre: al terminar dice qué hizo.`}
                      onClick={() => void sincronizarRed(r.red, r.nombre)}>
                      <I_Refresh size={13} /> {enCurso === 'sincronizar' ? 'Sincronizando…' : 'Sincronizar ahora'}
                    </Button>
                    <Button variant="ghost" className="btn-sm" disabled={trabajando !== null}
                      title={`Borra el token de ${r.nombre} guardado en el servidor (POST /api/integraciones/${r.red}/desconectar). Reversible: se vuelve a conectar con el mismo paso de siempre, y no se frena nada de lo que ya corre.`}
                      onClick={() => void desconectarRed(r.red, r.nombre)}>
                      <I_X size={13} /> {enCurso === 'desconectar' ? 'Desconectando…' : 'Desconectar'}
                    </Button>
                  </>
                )}
              </div>
            </div>
            );
          })
          )}

          {ig && ig.redes.length > 0 && (
            <div className="acc-why">
              <b>El token nunca se muestra:</b> vive en el servidor, no viaja al navegador, y cada fila sólo
              dice si hay uno guardado. Conectar una red no frena las demás: cada una se conecta por su cuenta.
            </div>
          )}
        </Card>

        <div className="col">
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Credit size={14} style={{ color: 'var(--amber)' }} /> Créditos</span>}
          action={<Badge tone="amber">{creditos === null ? 'saldo sin leer' : `${creditos.toLocaleString('es-CO')} disponibles`}</Badge>}
        >
          <div style={{ marginBottom: 16 }}>
            {creditosMes && creditos !== null ? (
              <Gauge pct={100 - pctCreditos} label="Consumo del mes"
                detalle={`${100 - pctCreditos}% usado · ${creditosMes.toLocaleString('es-CO')} por mes`} color="var(--grad)" />
            ) : (
              <div className="bs">
                {creditos === null
                  ? <>Su saldo sale de su cuenta: cuando el panel la lea, acá se dibuja el consumo del mes.</>
                  : <><b>{creditos.toLocaleString('es-CO')} créditos disponibles.</b> El tope de créditos del mes todavía no está cargado: sin ese dato no hay porcentaje de consumo que mostrar.</>}
              </div>
            )}
          </div>
          <div className="bs" style={{ marginBottom: 6 }}>
            El libro de créditos de su cuenta, con el saldo que quedó después de cada movimiento:
          </div>

          <div className="guards" style={{ marginTop: 16 }}>
            {movimientosBack.length === 0 ? (
              <EstadoVacio
                {...(datos.cargando
                  ? { titulo: 'Leyendo el libro de créditos…', texto: 'El panel está leyendo el libro de créditos de su cuenta: en un momento dice qué hay.' }
                  : { titulo: 'Su cuenta todavía no tiene movimientos', texto: 'Cuando el motor gaste o reciba créditos, cada movimiento queda aquí con su motivo, su detalle y el saldo que quedó. Todavía no hay ninguno.' })} />
            ) : movimientosBack.map((m, i) => (
                <div key={i} className="guard">
                  <span style={{ color: m.delta > 0 ? 'var(--green)' : 'var(--muted)', flexShrink: 0 }}>
                    {m.delta > 0 ? <I_Plus size={14} /> : <I_Clock size={14} />}
                  </span>
                  <span className="guard-lb">
                    {m.motivo || 'movimiento de créditos'}
                    <small>{m.detalle ? `${m.detalle} · ` : ''}saldo {m.saldo} · {fechaHoraDe(m.created_at)}</small>
                  </span>
                  <span className="guard-val" style={{ color: m.delta > 0 ? 'var(--green)' : 'var(--muted)' }}>
                    {m.delta > 0 ? '+' : ''}{m.delta}
                  </span>
                </div>
              ))}
          </div>
          <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <div className="dato"><span className="dato-l">Se repone</span><span className="dato-v" style={{ color: autoRecarga ? 'var(--green)' : 'var(--amber)' }}>{autoRecarga ? 'automático' : 'manual'}</span></div>
            <div className="dato"><span className="dato-l">Próxima recarga</span><span className="dato-v">{autoRecarga ? 'al bajar de 500' : 'cuando la actives'}</span></div>
            <div className="dato"><span className="dato-l">Consumo por día</span><span className="dato-v">150 créditos</span></div>
          </div>
          {autoRecarga && (
            <div className="tiny" style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 11, color: 'var(--green)', fontWeight: 700 }}>
              <I_Check size={13} /> Auto-recarga activa: no tiene que acordarse de recargar ni mirar los días de autonomía.
            </div>
          )}
          <div className="acc-why">
            <b>Días de autonomía</b> es la traducción de los créditos a algo que se entiende:
            cuánto puede seguir trabajando el motor si no recarga.
          </div>
        </Card>

        </div>
      </div>
    </div>
  );
}

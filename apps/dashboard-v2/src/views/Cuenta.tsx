import { useState } from 'react';
import { Card, Badge, Button, Dinero, NotaMoneda } from '../components/ui';
import { ViewHead, Gauge, BarRow } from '../components/viz';
import { I_Settings, I_Check, I_Shield, I_Lock, I_Plus, I_Zap, I_Credit, I_Link, I_Clock, I_Sun, I_X, I_Refresh } from '../components/icons';
import { MODOS, EXCEPCIONES, FRENOS, CONEXIONES, CREDITOS_MOV, TENANT, INVESTIGACION_MERCADO, PLANES, type Modo, type Conexion } from '../data/demo';
import { useDetalle, type Bloque } from '../components/Detalle';
// La capa de datos del panel: con el back encendido (`datos.real`), esta pantalla muestra el negocio
// real, el estado del onboarding y el libro de créditos del back. Lo que es del negocio de ejemplo
// (el historial de autonomía, los frenos y las conexiones de la demo) se muestra sólo sin back.
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

/** El ícono de cada red conectable: el mismo que ya usa la tarjeta de la demo para esa conexión. Lo que
 *  el back mande y no esté en la lista sale con el ícono de enlace, nunca sin ícono. */
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
  const detalle = useDetalle();
  // La fuente de todo: con el back encendido (`datos.real`), esta pantalla lee del back y nada del demo.
  const datos = useDatos();
  // La seguridad del negocio: el estado del PIN y del correo, y el aviso que le pide los seis dígitos
  // antes de una acción sensible. Sin back, `estado` es null y no se muestra nada nuevo.
  const seguridad = useSeguridad();
  const [niveles, setNiveles] = useState<Record<string, Modo>>(
    Object.fromEntries(EXCEPCIONES.map(e => [e.key, e.nivel])),
  );

  // =============================================================================================
  // LO QUE ESTA PANTALLA CAMBIA — y por eso queda escrito en la pantalla, no en un aviso que se va.
  // Cada estado de aquí abajo tiene su línea o su etiqueta a la vista, con la hora real del momento
  // en que se produjo el cambio.
  // =============================================================================================

  /** Los movimientos del dial y de las excepciones de esta visita, con su hora: es lo que abre «Ver historial». */
  const [historial, setHistorial] = useState<{ hora: string; t: string; s: string }[]>([]);
  /** La auto-recarga: cambia lo que dice la tarjeta de créditos y evita que el motor se detenga. */
  const [autoRecarga, setAutoRecarga] = useState(false);
  /** La hora en que se encendió: es la que se muestra en la línea de la pantalla, no una hora fija. */
  const [autoRecargaDesde, setAutoRecargaDesde] = useState('');
  /** El resultado de la última prueba de cada conexión, con la hora: queda a la vista en la fila. */
  const [pruebas, setPruebas] = useState<Record<string, string>>({});
  /** Conexiones marcadas para reemplazar el token. Reversible desde la misma fila. */
  const [paraReemplazar, setParaReemplazar] = useState<string[]>([]);
  /** Conexiones que el dueño agendó para conectar hoy. Todavía NO están conectadas. */
  const [paraConectar, setParaConectar] = useState<string[]>([]);
  /** La acción que está en curso en una de las redes (conectar, sincronizar, desconectar): mientras
   *  corre, el botón lo dice y no se puede volver a apretar. null = no hay nada corriendo. */
  const [trabajando, setTrabajando] = useState<{ red: string; accion: string } | null>(null);

  const registrar = (t: string, s: string) => setHistorial(h => [...h, { hora: ahora(), t, s }]);

  const cambiar = (key: string, m: Modo, fijo?: boolean) => {
    const ex = EXCEPCIONES.find(e => e.key === key);
    // La vigilancia es la única sin palanca: en vez de un aviso que se va, explica por qué con su dato real.
    if (fijo) { abrirVigilancia(); return; }
    const antes = niveles[key] ?? ex?.nivel ?? 'auto';
    setNiveles({ ...niveles, [key]: m });
    if (antes !== m) registrar(`«${ex?.etiqueta}» pasa a ${NOMBRE[m]}`, `venía en ${NOMBRE[antes]}`);
    setToast(`"${ex?.etiqueta}" ahora trabaja en modo ${NOMBRE[m]}`);
  };

  const volverACompartido = () => {
    if (modo !== 'shared') registrar('El motor vuelve a Compartido', `venía en ${NOMBRE[modo]}: prepara todo y le pide OK antes de gastar`);
    setModo('shared');
    setToast('Modo Compartido activado: el motor prepara y le pide OK antes de gastar un peso');
  };

  // ---------------------------------------------------------------------------------------------
  // LOS PANELES DE DETALLE — el dato real de cada cosa, en el mismo lugar para todos los botones.
  // ---------------------------------------------------------------------------------------------

  /** «La vigilancia no se puede apagar»: el por qué, con el reloj real de la vigilancia. */
  const abrirVigilancia = () => detalle({
    titulo: 'La vigilancia no se puede apagar',
    sub: 'Es lo único de esta pantalla que no tiene palanca. Y es lo que hace que el motor nunca esté quieto.',
    bloques: [
      { tipo: 'texto', texto: EXCEPCIONES[0].nota },
      { tipo: 'datos', filas: [
        { k: 'Cada cuánto mira', v: INVESTIGACION_MERCADO.cadencia, s: `arrancó ${INVESTIGACION_MERCADO.arranco}, ${INVESTIGACION_MERCADO.desde}` },
        { k: 'Revisiones hechas', v: String(INVESTIGACION_MERCADO.revisiones), s: 'desde que terminó la configuración inicial' },
        { k: 'Última revisión', v: INVESTIGACION_MERCADO.ultimaRevision, tono: 'green' },
        { k: 'Dónde mira', v: INVESTIGACION_MERCADO.zona, s: INVESTIGACION_MERCADO.zonaDetalle },
        { k: 'Lo que cuesta', v: 'nada', s: 'no gasta créditos: sólo lee' },
      ] },
      { tipo: 'aviso', texto: 'Si la vigilancia se pudiera apagar, el motor dejaría de enterarse de lo que pasa y el resto de la autonomía trabajaría a ciegas. Todo lo demás sí lo decide usted.' },
    ],
    fuente: 'Sale del reloj real de la vigilancia de esta cuenta: cuándo arrancó, cada cuánto revisa y cuántas veces revisó.',
    acciones: [
      { label: 'Entendido', variante: 'primary', onClick: () => setToast('La vigilancia sigue activa: es lo que mantiene el motor despierto') },
    ],
  });

  /** «Ver historial»: los movimientos de esta visita, con la hora, y con qué nivel viene trabajando cada acción. */
  const abrirHistorial = () => {
    const propias = EXCEPCIONES.filter(e => (niveles[e.key] ?? e.nivel) !== modo);
    const bloques: Bloque[] = [
      historial.length > 0
        ? { tipo: 'filas', items: historial.slice().reverse().map(h => ({ t: h.t, s: h.s, etiqueta: h.hora, tono: 'purple' as const })) }
        : { tipo: 'texto', texto: 'Todavía no ha movido nada en esta visita: el motor viene trabajando como lo dejó la última vez. En cuanto mueva el dial o una excepción, cada cambio queda aquí con la hora.' },
      { tipo: 'datos', filas: [
        { k: 'Modo general hoy', v: NOMBRE[modo], s: 'es el que decide cuando una acción no tiene nivel propio' },
        { k: 'Acciones con nivel propio', v: `${propias.length} de ${EXCEPCIONES.length}`, s: 'no siguen el modo general: tienen su propia palanca' },
        { k: 'Excepciones sin palanca', v: String(EXCEPCIONES.filter(e => e.fijo).length), s: 'la vigilancia: es la que mantiene el motor despierto' },
        { k: 'Frenos que valen siempre', v: String(FRENOS.length), s: 'no dependen del modo: valen también en Automático' },
      ] },
      { tipo: 'filas', items: EXCEPCIONES.map(e => {
        const n = niveles[e.key] ?? e.nivel;
        return { t: e.etiqueta, s: e.nota, etiqueta: NOMBRE[n], tono: (n === 'auto' ? 'green' : n === 'shared' ? 'purple' : 'muted') as 'green' | 'purple' | 'muted' };
      }) },
      { tipo: 'aviso', texto: 'Cambiar de modo no borra nada de lo que el motor ya hizo: la bitácora queda completa. Y la vigilancia no se puede apagar: es lo que hace que el motor nunca esté quieto.' },
    ];
    detalle({
      titulo: 'Historial de autonomía',
      sub: 'Lo que movió en esta visita, con la hora, y con qué nivel viene trabajando cada tipo de acción.',
      bloques,
      fuente: 'Sale de esta misma pantalla: el dial, las 7 excepciones y los 7 frenos que tiene hoy. Se actualiza en cuanto cambia algo.',
      acciones: modo === 'shared'
        ? [{ label: 'Cerrar', onClick: () => {} }]
        : [{ label: 'Volver a Compartido', variante: 'primary', onClick: volverACompartido }],
    });
  };

  /** «Conectar mi API»: qué habilita, qué hace el motor mientras tanto, y la deja agendada. */
  const abrirConexion = (c: Conexion) => detalle({
    titulo: `Conectar ${c.nombre}`,
    sub: `${c.rol}. ${c.detalle}`,
    bloques: [
      { tipo: 'datos', filas: [
        { k: 'Qué habilita', v: c.capacidades.join(' · ') },
        { k: 'De quién es el acceso', v: 'Suyo', s: 'conecta su propio proveedor: Sinkroo no le pide la cuenta' },
        { k: 'Qué necesita', v: 'El acceso de su proveedor', s: 'una sola vez' },
        { k: 'Mientras no esté', v: 'El motor sigue sin esta capacidad', s: 'nada de lo que ya corre se frena por esto' },
      ] },
      { tipo: 'pasos', items: [
        'Pega el acceso de su proveedor.',
        'Se prueba contra su API antes de guardarlo.',
        'Recién ahí la conexión figura como conectada.',
        `El motor empieza a usar: ${c.capacidades.join(', ').toLowerCase()}.`,
      ] },
      { tipo: 'aviso', tono: 'amber', texto: 'Hasta que la prueba dé bien, esta conexión no cuenta como conectada: la pantalla no muestra funcionando nada que todavía no lo esté.' },
    ],
    fuente: `Sale del estado real de ${c.nombre} en esta cuenta, hoy.`,
    acciones: [
      { label: 'Agendarla para conectar hoy', variante: 'primary', onClick: () => {
        setParaConectar(p => (p.includes(c.key) ? p : [...p, c.key]));
        setToast(`${c.nombre} quedó agendada: cuando pegue el acceso lo probamos antes de guardarlo`);
      } },
      { label: 'Ahora no', onClick: () => setToast(`${c.nombre} queda como está: sin conectar`) },
    ],
  });

  /** «Reemplazar»: qué implica cambiar el token, y deja la conexión marcada. */
  const abrirReemplazo = (c: Conexion) => detalle({
    titulo: `Reemplazar el token de ${c.nombre}`,
    sub: 'Cambiar un token no toca nada de lo que ya publicó: es para cuando rota el acceso o el proveedor le dio uno nuevo.',
    bloques: [
      { tipo: 'datos', filas: [
        { k: 'Conexión', v: c.nombre, s: c.detalle },
        { k: 'Qué usa ahora', v: 'El token actual', s: 'sigue funcionando hasta que el nuevo pase la prueba' },
        { k: 'Qué habilita', v: c.capacidades.join(' · ') },
        { k: 'Mientras lo cambia', v: 'No se frena nada', s: 'lo que está corriendo sigue corriendo' },
      ] },
      { tipo: 'pasos', items: [
        'Pega el token nuevo de su proveedor.',
        'Se prueba contra su API antes de guardarlo.',
        'Si responde bien, el viejo se descarta y queda el nuevo.',
        'Si no responde, sigue el viejo: una conexión nunca queda a medio cambiar.',
      ] },
      { tipo: 'aviso', tono: 'amber', texto: 'El token viejo se descarta recién cuando el nuevo responde. Si lo pega mal, la conexión sigue funcionando como hasta ahora.' },
    ],
    fuente: `Sale del estado real de ${c.nombre} en esta cuenta, hoy.`,
    acciones: [
      { label: 'Marcarla para reemplazo', variante: 'primary', onClick: () => {
        setParaReemplazar(p => (p.includes(c.key) ? p : [...p, c.key]));
        setToast(`${c.nombre} quedó marcada: sigue con el token actual hasta que pegue el nuevo`);
      } },
      { label: 'Cancelar', onClick: () => setToast(`${c.nombre} sigue con el token actual: sin cambios`) },
    ],
  });

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
  // real; sin back, los del negocio de ejemplo. El plan se busca en el catálogo de planes (eso es
  // producto, no datos del negocio) y los días salen del mismo consumo que usa el menú (150/día):
  // así el menú y esta pantalla dicen siempre el mismo número.
  // ---------------------------------------------------------------------------------------------
  const saldoBack = datos.creditos?.saldo ?? datos.negocio?.creditos ?? 0;
  const planBack = PLANES.find(p => p.key === (datos.negocio?.plan || ''));
  const creditos = datos.real ? saldoBack : TENANT.creditos;
  const creditosMes = datos.real ? (planBack?.creditosMes ?? TENANT.creditosMes) : TENANT.creditosMes;
  const pctCreditos = creditosMes > 0 ? Math.min(100, Math.round((creditos / creditosMes) * 100)) : 0;
  const diasAutonomia = datos.real ? Math.max(0, Math.round(creditos / 150)) : TENANT.diasAutonomia;
  /** La fecha en que el motor se detendría: se calcula con los créditos de hoy, no se escribe a mano. */
  const seDetieneEl = new Date(Date.now() + diasAutonomia * 24 * 60 * 60 * 1000)
    .toLocaleDateString('es-CO', { day: 'numeric', month: 'long' });
  const movimientosBack = datos.creditos?.movimientos ?? [];
  const conectadas = CONEXIONES.filter(c => c.estado === 'conectada').length;
  const porConectar = CONEXIONES.filter(c => c.estado !== 'conectada').length;

  return (
    <div className="dash">
      <ViewHead
        icon={<I_Settings size={19} />}
        titulo="Cuenta y autonomía"
        sub={datos.real
          ? 'Su negocio, sus créditos y cuánto decide la IA. Todo lo de aquí sale del servidor, no de la demostración.'
          : 'Cuánto decide la IA y cuánto decide usted. Se puede cambiar cuando quiera, sin perder nada.'}
        nums={datos.real ? [
          { v: NOMBRE[modo], l: 'modo actual', c: 'var(--purple3)' },
          { v: creditos.toLocaleString('es-CO'), l: 'créditos disponibles' },
          { v: String(diasAutonomia), l: 'días de autonomía', c: 'var(--amber)' },
          { v: `${datos.onboarding?.hechos.length ?? 0}/5`, l: 'primeros pasos', c: 'var(--green)' },
        ] : [
          { v: NOMBRE[modo], l: 'modo actual', c: 'var(--purple3)' },
          { v: TENANT.creditos.toLocaleString('es-CO'), l: 'créditos disponibles' },
          { v: String(TENANT.diasAutonomia), l: 'días de autonomía', c: 'var(--amber)' },
          { v: `${conectadas}/${CONEXIONES.length}`, l: 'conexiones activas', c: 'var(--green)' },
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
                  ? 'El panel está leyendo el negocio del servidor. Nada de lo que se ve aquí sale de la demostración.'
                  : (datos.error || 'El panel está conectado al back, pero la lectura del negocio no trajo datos. Lo que se vea aquí nunca sale de la demostración.')}
                accion={datos.cargando ? 'Leyendo…' : 'Volver a leer el back'}
                onAccion={() => { if (!datos.cargando) void datos.refrescar(); }} />
            ) : (
              <>
                <div className="datos-row">
                  <div className="dato"><span className="dato-l">Nombre</span><span className="dato-v">{datos.negocio.name}</span></div>
                  <div className="dato"><span className="dato-l">Plan</span><span className="dato-v">{datos.negocio.plan}</span></div>
                  <div className="dato"><span className="dato-l">Zona</span><span className="dato-v">{datos.negocio.zona || 'sin zona'}</span></div>
                  <div className="dato"><span className="dato-l">Créditos</span><span className="dato-v" style={{ color: 'var(--amber)' }}>{creditos.toLocaleString('es-CO')}</span></div>
                </div>
                <div className="bs" style={{ marginTop: 12 }}>{datos.negocio.description || 'Su negocio todavía no tiene descripción.'}</div>
                <div className="tiny muted" style={{ marginTop: 6 }}>
                  {datos.negocio.industry ? `${datos.negocio.industry} · ` : ''}cuenta creada el {diaDe(datos.negocio.created_at) || 'sin fecha'} · id {datos.negocio.id}
                </div>
                <div className="acc-why">
                  Estos datos son suyos y salen del back: <b>no son la demostración</b>. El plan define
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
          el correo configurado. Sin back esta tarjeta no se muestra: el modo demostración queda igual. */}
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
              <code className="dial-vidrio">{m.vidrio}</code>
            </div>
          ))}
        </div>

        <div className="alarm" style={{ marginTop: 15, borderLeft: '3px solid var(--purple2)', background: 'rgba(168,85,247,.05)' }}>
          <div className="alarm-head">
            <span className="alarm-sev oportunidad">CÓMO SE VE EN EL MOTOR</span>
          </div>
          <div className="alarm-sug">
            {modo === 'auto'
              ? <>En <b>Automático</b> el motor no le pregunta nada: hace y se lo cuenta en la bitácora. Va a ver "hizo 3 acciones mientras usted no estaba". Lo que igual no puede tocar son los frenos de abajo.</>
              : modo === 'shared'
                ? <>En <b>Compartido</b> el motor prepara todo y se frena esperándolo. Va a ver "3 decisiones esperan su OK" en la barra del motor, y puede resolverlas sin salir de Su día.</>
                : <>En <b>Manual</b> el motor sólo sugiere y acumula propuestas. Usted escribe, publica y responde. No gasta nada por su cuenta.</>}
          </div>
        </div>

        <div className="row" style={{ gap: 20, marginTop: 18, flexWrap: 'wrap', alignItems: 'center' }}>
          <I_Credit size={22} style={{ color: 'var(--amber)' }} />
          <div style={{ flex: 1, minWidth: 220 }}>
            <Gauge pct={pctCreditos} label="Días de autonomía restantes"
              detalle={`${creditos.toLocaleString('es-CO')} de ${creditosMes.toLocaleString('es-CO')} créditos`} />
            <div className="bs" style={{ marginTop: 8 }}>
              {diasAutonomia === 0
                ? <>Con los créditos de hoy el motor <b style={{ color: 'var(--amber)' }}>no tiene días de autonomía</b>: se detiene hasta que recargue.</>
                : <>Con el modo actual el motor trabaja <b style={{ color: 'var(--purple3)' }}>{diasAutonomia} días más</b> y se detendría el {seDetieneEl}.</>}
              {datos.real
                ? ' El plan y los créditos son los que hay cargados en su cuenta hoy.'
                : ' El modo Automático consume más: bajaría a 8 días.'}
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
            se paga el próximo paquete y el motor <b>no se detiene el {seDetieneEl}</b>. Se apaga con el mismo botón, sin perder nada del plan.
            {datos.real ? ' Es una decisión de esta visita: el back todavía no guarda la auto-recarga.' : ''}
          </div>
        )}
      </Card>

      {/* ============ EXCEPCIONES Y FRENOS ============
          Las 7 excepciones y los 7 frenos son los del negocio de ejemplo: con el back encendido NO se
          muestran, porque no hay nada de esto guardado en el back todavía. */}
      {!datos.real && (<>
      <div className="duo" style={{ marginTop: 16 }}>
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Settings size={14} style={{ color: 'var(--purple3)' }} /> Excepciones por tipo de acción</span>}
          action={<Badge tone="purple">{EXCEPCIONES.length}</Badge>}
        >
          <div className="exc">
            {EXCEPCIONES.map(e => (
              <div key={e.key} className="exc-row">
                <div className="exc-top">
                  <span className="exc-lb">{e.etiqueta}</span>
                  {e.fijo && <span className="exc-fijo">no se puede apagar</span>}
                  <div className="seg-group">
                    {(['auto', 'shared', 'manual'] as Modo[]).map(m => (
                      <span key={m} className={`seg ${(niveles[e.key] ?? e.nivel) === m ? 'on' : ''} ${e.fijo && m !== 'auto' ? 'locked' : ''}`}
                        onClick={() => cambiar(e.key, m, e.fijo)}>{NOMBRE[m]}</span>
                    ))}
                  </div>
                </div>
                <div className="exc-nota">{e.nota}</div>
              </div>
            ))}
          </div>
          <div className="acc-why">
            No es una sola palanca: <b>el dinero y los clientes tienen su propio nivel</b>.
            Pausar una campaña que se quema va en Automático aunque todo lo demás le pregunte.
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Shield size={14} style={{ color: 'var(--green)' }} /> Frenos</span>}
          action={<Badge tone="green">siempre activos</Badge>}
        >
          <div className="guards">
            {FRENOS.map(f => (
              <div key={f.key} className="guard">
                <I_Lock size={14} style={{ color: 'var(--purple3)', flexShrink: 0 }} />
                <span className="guard-lb">{f.etiqueta}<small>{f.porQue}</small></span>
                <span className="guard-val"><Dinero monto={f.valor} /></span>
              </div>
            ))}
          </div>
          <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <div className="dato"><span className="dato-l">Cortes por freno este mes</span><span className="dato-v">7</span></div>
            <div className="dato"><span className="dato-l">Dinero que evitaron</span><span className="dato-v" style={{ color: 'var(--green)' }}><Dinero monto={180} /></span></div>
            <div className="dato"><span className="dato-l">Le pidió permiso</span><span className="dato-v" style={{ color: 'var(--amber)' }}>2 veces</span></div>
          </div>
          <div className="bs" style={{ marginTop: 11 }}>
            Los frenos no son castigos: son lo que le permite dejar el modo Automático prendido sin estar mirando.
            Cada vez que uno se activa, el motor se lo cuenta en la bitácora con el motivo.
          </div>
          <div className="acc-why">
            Aplican <b>incluso en Automático</b>. Si esto se pudiera desactivar, el modo Automático no debería existir:
            un error que toca presupuestos sin techo cuesta dinero real.
          </div>
          <NotaMoneda />
          <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <Badge tone="green">La autonomía es un techo, no un piso</Badge>
            <Badge tone="purple">La IA puede pedir más control, nunca tomarlo</Badge>
          </div>
        </Card>
      </div>
      </>)}

      {/* ============ CONEXIONES Y CRÉDITOS ============ */}
      <div className="duo" style={{ marginTop: 16 }}>
        {/* Las conexiones de la demo son las del negocio de ejemplo: con el back encendido no se
            muestran. En su lugar va la tarjeta de abajo, con las redes reales que devuelve el back. */}
        {!datos.real && (
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Link size={14} style={{ color: 'var(--green)' }} /> Conexiones</span>}
          action={<Badge tone={porConectar ? 'amber' : 'green'}>{conectadas} de {CONEXIONES.length}</Badge>}
        >
          <div className="bs" style={{ marginBottom: 12 }}>
            Todo lo externo es suyo: conecta su propia API, no la nuestra. Cada conexión declara qué <b>capacidades</b> habilita.
            Las conectadas se pueden probar y sus tokens, reemplazar: cada movimiento queda escrito en la fila.
          </div>
          {CONEXIONES.map(c => {
            const probada = pruebas[c.key];
            const marcadaReemplazo = paraReemplazar.includes(c.key);
            const agendada = paraConectar.includes(c.key);
            return (
            <div key={c.key} style={{ padding: '11px 0', borderBottom: '1px solid var(--border)' }}>
              <div className="row spread" style={{ marginBottom: 6 }}>
                <span className="row" style={{ gap: 9 }}>
                  <span style={{ fontSize: 17 }}>{c.emoji}</span>
                  <span>
                    <span className="bt">{c.nombre}</span>
                    <span className="tiny muted" style={{ display: 'block' }}>{c.rol}</span>
                  </span>
                </span>
                <span className="row" style={{ gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {probada && <Badge tone="green">probada {probada}</Badge>}
                  {marcadaReemplazo && <Badge tone="amber">token por reemplazar</Badge>}
                  {agendada && <Badge tone="amber">para conectar hoy</Badge>}
                  <Badge tone={c.estado === 'conectada' ? 'green' : c.estado === 'error' ? 'red' : 'muted'}>
                    {c.estado === 'conectada' ? 'conectada' : c.estado === 'error' ? 'vencida' : 'por conectar'}
                  </Badge>
                </span>
              </div>
              <div className="bs">{c.detalle}</div>
              <div className="row" style={{ gap: 7, marginTop: 9, flexWrap: 'wrap' }}>
                {c.capacidades.map(cap => <span key={cap} className="badge badge-muted" style={{ fontSize: 9.5 }}>{cap}</span>)}
              </div>
              <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                {c.estado === 'conectada' ? (
                  <>
                    <Button variant="ghost" className="btn-sm"
                      title="Prueba el token contra la API y deja el resultado con la hora en esta fila. No guarda ni cambia el token: reversible, no toca nada de lo que está corriendo."
                      onClick={() => {
                        const h = ahora();
                        setPruebas(p => ({ ...p, [c.key]: h }));
                        setToast(`${c.nombre} respondió bien a las ${h}: el token sigue activo`);
                      }}><I_Check size={13} /> {probada ? 'Probar de nuevo' : 'Probar'}</Button>
                    {marcadaReemplazo ? (
                      <Button variant="ghost" className="btn-sm"
                        title="Deja sin efecto el reemplazo: la conexión sigue con el token actual. Reversible: se puede marcar otra vez."
                        onClick={() => {
                          setParaReemplazar(p => p.filter(k => k !== c.key));
                          setToast(`Se canceló el reemplazo de ${c.nombre}: sigue con el token actual`);
                        }}><I_X size={13} /> Cancelar reemplazo</Button>
                    ) : (
                      <Button variant="ghost" className="btn-sm"
                        title="Le muestra qué implica cambiar el token y deja la conexión marcada para reemplazarlo. Reversible: se cancela desde esta misma fila."
                        onClick={() => abrirReemplazo(c)}>Reemplazar</Button>
                    )}
                  </>
                ) : agendada ? (
                  <Button variant="outline" className="btn-sm"
                    title="La saca de la lista para conectar hoy: vuelve a quedar como estaba, sin conectar. Reversible."
                    onClick={() => {
                      setParaConectar(p => p.filter(k => k !== c.key));
                      setToast(`${c.nombre} vuelve a quedar sin conectar`);
                    }}><I_X size={13} /> Quitar de la lista</Button>
                ) : (
                  <Button className="btn-sm"
                    title="Le muestra qué habilita esta conexión y qué hace el motor mientras tanto, y la deja agendada para conectar hoy. Reversible: se quita de la lista cuando quiera."
                    onClick={() => abrirConexion(c)}><I_Link size={13} /> Conectar su API</Button>
                )}
              </div>
              {probada && (
                <div className="tiny" style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8, color: 'var(--green)', fontWeight: 700 }}>
                  <I_Check size={13} /> Probada a las {probada}: respondió bien y el token sigue activo. No se guardó nada nuevo ni se frenó nada.
                </div>
              )}
              {marcadaReemplazo && (
                <div className="tiny" style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8, color: 'var(--amber)', fontWeight: 700 }}>
                  <I_Clock size={13} /> Marcada para reemplazar el token: sigue usando el actual hasta que pegue el nuevo y la prueba dé bien. El motor no se frena mientras tanto.
                </div>
              )}
              {agendada && (
                <div className="tiny" style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8, color: 'var(--amber)', fontWeight: 700 }}>
                  <I_Clock size={13} /> Agendada para conectar hoy: cuando pegue el acceso de {c.nombre} se prueba antes de guardarlo. Hasta entonces el motor sigue sin {c.capacidades.join(', ').toLowerCase()}.
                </div>
              )}
            </div>
            );
          })}
          <div className="acc-why">
            Las capacidades son lo que el negocio pide (<b>"enviar mensaje", "leer anuncios"</b>), no un proveedor concreto.
            Si mañana cambia de herramienta, el motor sigue funcionando sin tocar una línea.
          </div>
        </Card>
        )}

        {/* ============ LAS CONEXIONES REALES (sólo con el back encendido) ============
            La misma fila de la demo —ícono, nombre, rol, estado y botones—, repetida para CADA red que
            devuelva el back, en el orden en que llegan: si la app de esa red está configurada en el
            servidor (o si la cubre bundle.social, que va con `viaBundle`), si hay cuenta conectada y
            cuándo se sincronizó. El token vive en el servidor: aquí no se pide ni se muestra, sólo se dice
            si hay uno guardado. Los nombres y los roles son los que manda el back: aquí no hay una lista de
            redes escrita a mano. */}
        {datos.real && (
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Link size={14} style={{ color: 'var(--green)' }} /> Conexiones</span>}
          action={<Badge tone={!ig ? 'muted' : ig.resumen.conectadas > 0 ? 'green' : 'amber'}>
            {!ig ? (datos.cargando ? 'leyendo' : 'sin leer') : `${ig.resumen.conectadas} de ${ig.resumen.total}`}
          </Badge>}
        >
          <div className="bs" style={{ marginBottom: 12 }}>
            Conecte sus propias cuentas: el motor publica en lo suyo, nunca en las cuentas de Sinkroo. Cada fila
            dice hoy si se puede conectar —las que van por bundle.social o con la app de Sinkroo cargada en el
            servidor traen su botón— y cuáles todavía dicen «falta configurar», con la variable que falta. Lo que
            se ve aquí es el estado del servidor, no una copia de esta visita.
          </div>

          {!ig ? (
            /* El back no respondió: se dice eso, no que no haya nada. Mientras lee, dice que está leyendo. */
            <EstadoVacio
              {...(datos.cargando
                ? { titulo: 'Leyendo las conexiones del back…', texto: 'El panel está leyendo el estado de sus conexiones en el servidor. Mientras lee no afirma nada: si no hay nada, lo dice enseguida.' }
                : { titulo: 'No se pudo leer el estado de las conexiones', texto: 'Aquí se ve, red por red, si la app de cada red está configurada en el servidor, si hay una cuenta conectada y cuándo se sincronizó por última vez. El servidor no respondió; vuelva a leerlo y aparece tal como está.' })}
              {...(datos.cargando ? {} : { accion: 'Volver a leer', onAccion: () => void datos.refrescar() })} />
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
        )}

        <div className="col">
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Credit size={14} style={{ color: 'var(--amber)' }} /> Créditos</span>}
          action={<Badge tone="amber">{creditos.toLocaleString('es-CO')} disponibles</Badge>}
        >
          <div style={{ marginBottom: 16 }}>
            <Gauge pct={100 - pctCreditos} label="Consumo del mes"
              detalle={`${100 - pctCreditos}% usado · ${creditosMes.toLocaleString('es-CO')} por mes`} color="var(--grad)" />
          </div>
          {/* El desglose de consumo es del negocio de ejemplo: con el back encendido en su lugar van
              los movimientos reales del libro de créditos (d.creditos.movimientos). */}
          {!datos.real && (<>
          <div className="bs" style={{ marginBottom: 6 }}>Qué consume el motor, en claro:</div>
          <BarRow label="Campañas" valor={180} max={180} color="var(--purple2)" />
          <BarRow label="Análisis IA" valor={40} max={180} color="var(--green)" />
          <BarRow label="Conversaciones" valor={0} max={180} color="var(--muted)" />
          <div className="bs" style={{ marginTop: 8 }}>Las conversaciones no consumen créditos: están incluidas en el plan Pro.</div>
          </>)}
          {datos.real && (
            <div className="bs" style={{ marginBottom: 6 }}>
              El libro de créditos de su cuenta, con el saldo que quedó después de cada movimiento:
            </div>
          )}

          <div className="guards" style={{ marginTop: 16 }}>
            {datos.real ? (
              movimientosBack.length === 0 ? (
                <EstadoVacio
                  {...(datos.cargando
                    ? { titulo: 'Leyendo el back…', texto: 'El panel está leyendo el libro de créditos del servidor: en un momento dice qué hay.' }
                    : { titulo: 'Todavía no hay movimientos', texto: 'Cuando el motor gaste o reciba créditos, cada movimiento queda aquí con su motivo, su detalle y el saldo que quedó. Todavía no hay ninguno.' })} />
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
              ))
            ) : (
              CREDITOS_MOV.map((m, i) => (
                <div key={i} className="guard">
                  <span style={{ color: m.tipo === 'entrada' ? 'var(--green)' : 'var(--muted)', flexShrink: 0 }}>
                    {m.tipo === 'entrada' ? <I_Plus size={14} /> : <I_Clock size={14} />}
                  </span>
                  <span className="guard-lb">{m.detalle}<small>{m.fecha}</small></span>
                  <span className="guard-val" style={{ color: m.tipo === 'entrada' ? 'var(--green)' : 'var(--muted)' }}>
                    {m.cantidad > 0 ? '+' : ''}{m.cantidad}
                  </span>
                </div>
              ))
            )}
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

        {/* ============ LA AUTONOMÍA DE ESTA VISITA (demo) ============
            El historial de autonomía y sus movimientos son del negocio de ejemplo: con el back
            encendido no se muestran, porque ese historial no se guarda en el servidor todavía. */}
        {!datos.real && (
        <div className="card" style={{ background: 'linear-gradient(120deg, rgba(168,85,247,.09), transparent)' }}>
          <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
            <I_Sun size={20} style={{ color: 'var(--purple3)', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="bt">Puede cambiar el modo en cualquier momento</div>
              <div className="bs" style={{ marginTop: 4 }}>
                Si le cansa aprobar, pasa a Automático. Si algo le asusta, vuelve a Compartido.
                <b> Nada de lo que el motor hizo se pierde al cambiar de modo.</b>
              </div>
            </div>
          </div>
          <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <Button variant="outline" className="btn-sm"
              title="Abre lo que movió en esta visita, con la hora, y con qué nivel viene trabajando cada tipo de acción hoy."
              onClick={abrirHistorial}>Ver historial</Button>
            <Button variant="ghost" className="btn-sm" title="Vuelve al modo recomendado, el que le pide OK antes de gastar. Reversible: puede volver a Automático cuando quiera."
              onClick={volverACompartido}>Volver a Compartido</Button>
          </div>
          {historial.length > 0 && (
            <div className="tiny" style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 12, color: 'var(--purple3)', fontWeight: 700 }}>
              <I_Clock size={13} /> En esta visita movió {palabraCuenta(historial.length)}: el historial las guarda con la hora y el nivel que tenían antes (la última: {historial[historial.length - 1].hora}).
            </div>
          )}
          <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <Badge tone="purple">Cambiar de modo no borra nada</Badge>
            <Badge tone="green">Puede volver cuando quiera</Badge>
          </div>
        </div>
        )}
        </div>
      </div>
    </div>
  );
}

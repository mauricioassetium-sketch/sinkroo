import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Badge, Button, Modal } from '../components/ui';
import { I_Check, I_Lock, I_Shield, I_X } from '../components/icons';
import {
  guardarPin, hayApi, leerSeguridad, reenviarVerificacion, token, tokenDeVerificacion, verificarCorreo,
  verificarPin, type ErrorApi, type EstadoSeguridad,
} from '../api/cliente';

// =============================================================================================
// LA SEGURIDAD DE LA CUENTA — el PIN y el correo, en un solo lugar.
//
// Esto es lo que el dueño pidió: «configuremos el onboarding, entrada de correo, respuesta de correo
// de bienvenida y pin de seguridad, todo profesional». El PIN no es un adorno: es lo que se pide
// antes de las acciones que tocan algo de verdad (desconectar una cuenta, arrancar el motor).
//
// DE DÓNDE SALE TODO: de `GET /api/seguridad/estado`. La pantalla no guarda un estado propio del PIN
// ni del correo: si el back dice que hay PIN, hay PIN. Nada se afirma de memoria.
//
// EL AVISO DEL PIN VIVE AQUÍ, no en cada pantalla: `pedirPin(motivo)` abre el mismo aviso, verifica
// contra el back y devuelve los seis dígitos ya aprobados para que la acción se reintente sola. Así
// cada acción sensible no repite ni el aviso ni el manejo de los intentos fallidos.
//
// SIN BACK NO EXISTE NADA DE ESTO: `hayApi()` en falso y el estado queda en null; el modo demostración
// sigue igual que siempre.
// =============================================================================================

export type Seguridad = {
  /** El estado real que devolvió el back, o null si no hay back o todavía no se pudo leer. */
  estado: EstadoSeguridad | null;
  cargando: boolean;
  error: string;
  /** Abre el aviso para crear el PIN (si no tiene) o cambiarlo (pidiendo el actual). */
  configurarPin: () => void;
  /** Pide el PIN de seis dígitos, lo verifica contra el back y lo devuelve. null = se canceló. */
  pedirPin: (motivo: string) => Promise<string | null>;
  /** Vuelve a pedir el correo de confirmación de la dirección. */
  pedirOtroCorreo: () => void;
  pidiendoCorreo: boolean;
  /** Qué pasó con el último «pedir otro correo»: se muestra en la fila. */
  avisoCorreo: string;
  refrescar: () => void;
};

const SegCtx = createContext<Seguridad | null>(null);

export function useSeguridad(): Seguridad {
  const c = useContext(SegCtx);
  if (!c) throw new Error('useSeguridad necesita el SeguridadProvider arriba');
  return c;
}

/** Cuánto falta para poder volver a intentar el PIN, en palabras: «en 4 minutos». */
const faltanMinutos = (iso?: string | null) => {
  if (!iso) return '';
  const ms = new Date(iso).getTime() - Date.now();
  if (isNaN(ms)) return String(iso);
  if (ms <= 0) return 'ya mismo';
  const min = Math.ceil(ms / 60000);
  if (min < 60) return `en ${min} minuto${min === 1 ? '' : 's'}`;
  const horas = Math.round(min / 60);
  return `en ${horas} hora${horas === 1 ? '' : 's'}`;
};

/** Cómo se le dice a alguien que su PIN no sirvió, sin alarmismo y con el dato real. */
const motivoDeError = (e: unknown) => {
  const err = e as ErrorApi;
  const cuerpo = (err.cuerpo || {}) as { intentos_restantes?: number; bloqueado_hasta?: string | null; minutos_restantes?: number; detalle?: string };
  // `pin_malo` es el código del back; los otros son los del contrato corto. Los tres dicen lo mismo.
  if (err.codigo === 'pin_malo' || err.codigo === 'pin_actual_malo' || err.codigo === 'pin_incorrecto') {
    const quedan = cuerpo.intentos_restantes;
    return typeof quedan === 'number' && quedan > 0
      ? `Ese no es su PIN de seguridad. Le quedan ${quedan} intento${quedan === 1 ? '' : 's'} antes de que quede bloqueado.`
      : (cuerpo.detalle || 'Ese no es su PIN de seguridad.');
  }
  if (err.codigo === 'pin_bloqueado' || err.estado === 429) {
    const cuando = typeof cuerpo.minutos_restantes === 'number'
      ? `en ${cuerpo.minutos_restantes} minuto${cuerpo.minutos_restantes === 1 ? '' : 's'}`
      : faltanMinutos(cuerpo.bloqueado_hasta);
    return `Por seguridad el PIN quedó bloqueado después de varios intentos fallidos. Puede volver a intentarlo ${cuando || 'más tarde'}${cuerpo.detalle ? `: ${cuerpo.detalle}` : '.'}`;
  }
  if (err.codigo === 'pin_invalido' || err.codigo === 'pin_debil') {
    return cuerpo.detalle || 'El PIN no sirve: son seis dígitos y no puede repetir el mismo número ni ir en fila (123456).';
  }
  if (err.codigo === 'sin_autorizacion') return 'Para cambiar el PIN que ya tiene hace falta el PIN actual: escríbalo y vuelva a intentarlo.';
  if (err.codigo === 'ya_verificado') return 'El correo de esta cuenta ya estaba confirmado: no hay nada que volver a mandar.';
  if (err.codigo === 'frenado') return cuerpo.detalle || 'Pidió el enlace varias veces seguidas: espere unos minutos y vuelva a intentarlo.';
  return err.message || 'no se pudo hablar con el servidor';
};

/**
 * Lo que el back respondió al pedir otro correo, en palabras honestas. Son TRES casos, no dos:
 *   · `enviado:true`  → salió: se puede decir.
 *   · `enviado:false` → el back dice que el enlace quedó creado pero el correo no salió (contesta 202):
 *                       se dice eso, con el motivo y lo que falta.
 *   · sin `enviado`   → el back contestó bien pero NO dice si salió: entonces tampoco se afirma que
 *                       salió ni que no salió. Se dice lo único cierto: recibió el pedido.
 */
const avisoDeReenvio = (r: { ok?: boolean; enviado?: boolean; detalle?: string; motivo?: string | null; falta?: string[]; para?: string }) => {
  // Las frases del back vienen en minúscula: acá empiezan una oración, así que se pone la mayúscula.
  const dicho = (t?: string) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : '');
  if (r?.enviado === true) {
    return dicho(r.detalle) || `Le mandamos el enlace de confirmación a ${r.para || 'su dirección'} (vence en 24 horas). Si no llega en unos minutos, mire en la carpeta de correo no deseado.`;
  }
  if (r?.enviado === false) {
    const falta = r?.falta?.length ? ` Falta cargar ${r.falta.join(', ')}.` : '';
    return `El enlace quedó creado, pero el correo NO salió todavía: ${r?.motivo || r?.detalle || 'el envío de correo no está configurado en el servidor'}.${falta} No le decimos que revise el correo porque no hay nada que revisar.`;
  }
  return `${r?.detalle ? `${dicho(r.detalle)} ` : ''}El panel no puede confirmar si el correo salió: el estado real está en Cuenta y autonomía → Seguridad de la cuenta.`;
};

type Solicitud = { motivo: string; resolver: (pin: string | null) => void };

export function SeguridadProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoSeguridad | null>(null);
  // Arranca diciendo que está leyendo cuando hay back y sesión: es la verdad del primer dibujo (ya se va
  // a leer) y evita el parpadeo de un «no se pudo leer» antes de que la consulta salga.
  const [cargando, setCargando] = useState(() => hayApi() && !!token());
  const [error, setError] = useState('');
  const [pidiendoCorreo, setPidiendoCorreo] = useState(false);
  const [avisoCorreo, setAvisoCorreo] = useState('');
  /** El aviso del PIN de una acción sensible: mientras haya solicitud, el aviso está abierto. */
  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  /** El aviso de crear o cambiar el PIN. */
  const [configurando, setConfigurando] = useState(false);

  const refrescar = useCallback(() => {
    if (!hayApi() || !token()) { setEstado(null); setCargando(false); setError(''); return; }
    setCargando(true);
    leerSeguridad()
      .then(r => { setEstado(r); setError(''); })
      .catch((e: ErrorApi) => {
        setEstado(null);
        setError(e.estado === 401
          ? 'La sesión del panel ya no está viva: vuelva a entrar y el estado de seguridad aparece.'
          : `No se pudo leer el estado de seguridad del servidor (${e.message}).`);
      })
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => { refrescar(); }, [refrescar]);

  const pedirPin = useCallback((motivo: string) => new Promise<string | null>(resolve => {
    setSolicitud({ motivo, resolver: resolve });
  }), []);

  const cerrarSolicitud = (pin: string | null) => {
    solicitud?.resolver(pin);
    setSolicitud(null);
  };

  const guardarPinDelNegocio = async (pin: string, pinActual?: string): Promise<string> => {
    try {
      await guardarPin(pin, pinActual);
      refrescar();
      return '';
    } catch (e) { return motivoDeError(e); }
  };

  const pedirOtroCorreo = async () => {
    setPidiendoCorreo(true); setAvisoCorreo('');
    try {
      const r = await reenviarVerificacion();
      setAvisoCorreo(avisoDeReenvio(r));
    } catch (e) {
      const err = e as ErrorApi;
      setAvisoCorreo(err.codigo === 'ya_verificado'
        ? 'El correo de su cuenta ya está confirmado: no hay nada que volver a mandar.'
        : err.estado === 404 || err.estado === 501
          ? 'El servidor todavía no tiene habilitada la ruta para pedir otro correo.'
          : `No se pudo pedir otro correo: ${err.message}.`);
    }
    setPidiendoCorreo(false);
  };

  const valor: Seguridad = {
    estado, cargando, error,
    configurarPin: () => setConfigurando(true),
    pedirPin,
    pedirOtroCorreo: () => { void pedirOtroCorreo(); },
    pidiendoCorreo, avisoCorreo,
    refrescar,
  };

  return (
    <SegCtx.Provider value={valor}>
      {children}
      <ModalPinNuevo abierto={configurando} tienePin={!!estado?.tiene_pin}
        cerrar={() => setConfigurando(false)} guardar={guardarPinDelNegocio} />
      <ModalPinPedido solicitud={solicitud}
        cerrar={() => cerrarSolicitud(null)} listo={pin => cerrarSolicitud(pin)} />
    </SegCtx.Provider>
  );
}

// ---------------------------------------------------------------------------------------------
// LA VUELTA DEL CORREO DE BIENVENIDA
//
// Es el mismo mecanismo de vuelta que ya existía para el proveedor (`VueltaDeConexion`, en App.tsx):
// la dirección trae un dato, el panel llama al back UNA sola vez, dice cómo salió y limpia la
// dirección. Lo único que cambia es qué se canjea: acá un `?token=…` por la confirmación de la
// dirección; allá un `code` por el token del proveedor.
// ---------------------------------------------------------------------------------------------

/** Deja la dirección limpia: los parámetros de la vuelta se borran para que recargar no repita la llamada. */
export function quitarDeLaDireccion(claves: string[], ademas?: RegExp) {
  try {
    const url = new URL(window.location.href);
    [...url.searchParams.keys()]
      .filter(k => claves.includes(k) || (ademas ? ademas.test(k) : false))
      .forEach(k => url.searchParams.delete(k));
    window.history.replaceState({}, '', url.toString());
  } catch { /* sin navegador */ }
}

export type EstadoVueltaCorreo = 'verificando' | 'verificado' | 'vencido' | 'usado' | 'invalido' | 'error' | 'pedido' | 'pedido_dudoso' | 'pedido_fallido';

export type VueltaCorreo = {
  /** null = esta dirección no trae ninguna vuelta de correo. */
  estado: EstadoVueltaCorreo | null;
  /** Lo que dijo el servidor cuando no salió bien. */
  detalle: string;
  /** Mientras se está pidiendo otro correo. */
  pidiendo: boolean;
  pedirOtro: () => void;
};

/** Cómo salió la vuelta, en las palabras que se muestran: la usan la entrada y el aviso del panel. */
export function textoDeVuelta(v: VueltaCorreo): { tono: 'ok' | 'mal'; titulo: string; detalle: string } | null {
  switch (v.estado) {
    case 'verificando':
      return { tono: 'ok', titulo: 'Confirmando su dirección…', detalle: 'Estamos cambiando el enlace por la confirmación en el servidor. En un momento le decimos cómo salió.' };
    case 'verificado':
      return { tono: 'ok', titulo: 'Su dirección quedó confirmada.', detalle: 'Ya puede entrar con su correo y su clave: el panel no le vuelve a pedir esta confirmación.' };
    case 'vencido':
      return { tono: 'mal', titulo: 'Ese enlace ya venció.', detalle: 'Los enlaces de confirmación caducan a las 24 horas por seguridad. Pida otro y le llega uno nuevo a su dirección.' };
    case 'usado':
      return { tono: 'mal', titulo: 'Ese enlace ya se usó.', detalle: 'Los enlaces sirven una sola vez. Si su correo ya quedó confirmado, no hay nada más que hacer; si no, pida otro.' };
    case 'invalido':
      return { tono: 'mal', titulo: 'Ese enlace no sirve.', detalle: 'Puede que sea de otra cuenta o que haya llegado incompleto. Pida otro y le llega uno nuevo a su dirección.' };
    case 'pedido':
      // Dos casos honestos: el back dijo que salió (verde) o dijo que no salió (con `detalle`, en rojo).
      return v.detalle
        ? { tono: 'mal', titulo: 'El pedido llegó al servidor, pero el correo no salió.', detalle: v.detalle }
        : { tono: 'ok', titulo: 'Le pedimos otro correo al servidor.', detalle: 'Le llega en unos minutos. Mire también en la carpeta de correo no deseado.' };
    case 'pedido_dudoso':
      // El back contestó bien pero no dijo si el correo salió: no se afirma ninguna de las dos cosas.
      return { tono: 'ok', titulo: 'El servidor recibió el pedido.', detalle: v.detalle || 'El panel no puede confirmar si el correo salió: el estado real está en Cuenta y autonomía → Seguridad de la cuenta.' };
    case 'pedido_fallido':
      return { tono: 'mal', titulo: 'No se pudo pedir otro correo.', detalle: v.detalle || 'El servidor no respondió al pedido.' };
    case 'error':
      return { tono: 'mal', titulo: 'No se pudo confirmar su dirección.', detalle: v.detalle || 'El servidor no respondió. Vuelva a abrir el enlace del correo, o pida otro.' };
    default:
      return null;
  }
}

/**
 * Atiende la vuelta del correo: si la dirección trae el token de la confirmación, lo canjea contra el
 * back una sola vez y limpia la dirección en los dos casos (salió bien o mal), igual que la vuelta del
 * proveedor. Devuelve el estado para que la entrada lo muestre tal cual.
 */
export function useVueltaDeCorreo(): VueltaCorreo {
  const [estado, setEstado] = useState<EstadoVueltaCorreo | null>(null);
  const [detalle, setDetalle] = useState('');
  const [pidiendo, setPidiendo] = useState(false);
  const [atendida, setAtendida] = useState(false);

  useEffect(() => {
    if (atendida) return;
    const tokenDelEnlace = tokenDeVerificacion();
    if (!tokenDelEnlace || !hayApi()) return;
    setAtendida(true);
    setEstado('verificando');
    verificarCorreo(tokenDelEnlace)
      .then(r => { setEstado(r?.correo_verificado === false ? 'invalido' : 'verificado'); })
      .catch((e: ErrorApi) => {
        setDetalle(e.message || '');
        setEstado(e.codigo === 'token_vencido' ? 'vencido'
          : e.codigo === 'token_usado' ? 'usado'
            : e.codigo === 'token_invalido' || e.codigo === 'token_falta' ? 'invalido' : 'error');
      })
      .finally(() => quitarDeLaDireccion(['token', 'verificar']));
  }, [atendida]);

  const pedirOtro = () => {
    setPidiendo(true);
    reenviarVerificacion()
      .then(r => {
        // Tres casos: salió (verde), no salió (con el detalle del back) o el back no lo dijo (dudoso).
        if (r?.enviado === false) { setDetalle(avisoDeReenvio(r)); setEstado('pedido'); }
        else if (r?.enviado === true) { setDetalle(''); setEstado('pedido'); }
        else { setDetalle(avisoDeReenvio(r)); setEstado('pedido_dudoso'); }
      })
      .catch((e: ErrorApi) => {
        setDetalle(e.codigo === 'ya_verificado'
          ? 'El correo de su cuenta ya está confirmado: no hay nada que volver a mandar.'
          : e.estado === 404 || e.estado === 501
            ? 'El servidor todavía no tiene habilitada la ruta para pedir otro correo.'
            : (e.message || ''));
        setEstado('pedido_fallido');
      })
      .finally(() => setPidiendo(false));
  };

  return { estado, detalle, pidiendo, pedirOtro };
}

/**
 * DENTRO DEL PANEL: cuando la vuelta del correo salió bien, la tarjeta de seguridad se relee sola (la
 * dirección quedó confirmada) y el resultado se cuenta con el aviso del panel. Va adentro del
 * proveedor de seguridad porque es el único lugar donde se puede pedir esa relectura.
 */
export function SeguridadAlDia({ vuelta, avisar }: { vuelta: VueltaCorreo; avisar?: (t: string) => void }) {
  const seg = useSeguridad();
  const contado = useRef<string | null>(null);

  useEffect(() => {
    if (!vuelta.estado || contado.current === vuelta.estado) return;
    contado.current = vuelta.estado;
    const dicho = textoDeVuelta(vuelta);
    if (dicho && avisar) avisar(dicho.titulo);
    if (vuelta.estado === 'verificado') seg.refrescar();
  }, [vuelta.estado]);

  return null;
}

function ModalPinPedido({ solicitud, cerrar, listo }: {
  solicitud: Solicitud | null; cerrar: () => void; listo: (pin: string) => void;
}) {
  const [pin, setPin] = useState('');
  const [verificando, setVerificando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [bloqueado, setBloqueado] = useState(false);
  const [abiertoAntes, setAbiertoAntes] = useState(false);

  // Cada vez que se abre, se parte de cero: ni dígitos viejos ni avisos viejos.
  if (!!solicitud && !abiertoAntes) { setAbiertoAntes(true); setPin(''); setAviso(''); setBloqueado(false); }
  if (!solicitud && abiertoAntes) setAbiertoAntes(false);

  const listoParaEnviar = /^\d{6}$/.test(pin) && !verificando && !bloqueado;

  const verificar = async () => {
    if (!listoParaEnviar) return;
    setVerificando(true); setAviso('');
    try {
      await verificarPin(pin);
      listo(pin);
    } catch (e) {
      const err = e as ErrorApi;
      setAviso(motivoDeError(e));
      if (err.codigo === 'pin_bloqueado' || err.estado === 429) setBloqueado(true);
      setPin('');
    }
    setVerificando(false);
  };

  return (
    <Modal open={!!solicitud} onClose={cerrar} title="Su PIN de seguridad">
      <div className="row" style={{ gap: 9, alignItems: 'flex-start', marginBottom: 12 }}>
        <I_Shield size={18} style={{ color: 'var(--purple3)', flexShrink: 0, marginTop: 2 }} />
        <div className="bs" style={{ margin: 0 }}>
          {solicitud?.motivo || 'Esta acción le pide su PIN de seguridad.'}
        </div>
      </div>

      <label className="label" style={{ marginTop: 4 }}>Sus seis dígitos</label>
      <input className="input" value={pin} inputMode="numeric" autoComplete="off" maxLength={6}
        placeholder="••••••" style={{ letterSpacing: 6, fontSize: 18, textAlign: 'center' }}
        title="El PIN de seguridad de su negocio: seis dígitos, ni más ni menos"
        onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void verificar(); } }} />
      <div className="tiny muted" style={{ marginTop: 6 }}>
        Se los pedimos sólo para esta acción y no se guardan en el navegador: viajan al servidor y se
        verifican allá. Si no se acuerda del PIN, no insista: cada intento cuenta y el servidor lo frena
        un rato. Sin el PIN, la acción no se ejecuta.
      </div>

      {aviso && <div className="alarm" style={{ marginTop: 12, borderLeft: '3px solid var(--amber)', background: 'rgba(245,158,11,.08)' }}>
        <div className="alarm-sug">{aviso}</div>
      </div>}

      <div className="row" style={{ gap: 9, justifyContent: 'flex-end', marginTop: 16, flexWrap: 'wrap' }}>
        {verificando && <Badge tone="purple">revisando</Badge>}
        <Button variant="ghost" className="btn-sm" title="Cierra el aviso sin hacer nada: la acción no se ejecuta"
          onClick={cerrar}><I_X size={13} /> Ahora no</Button>
        <Button className="btn-sm" disabled={!listoParaEnviar}
          title={bloqueado ? 'El PIN está bloqueado por intentos fallidos: espere a que se cumpla el tiempo' : 'Verifica el PIN contra el servidor y, si es correcto, la acción sigue sola'}
          onClick={() => void verificar()}>
          <I_Lock size={13} /> {verificando ? 'Verificando…' : 'Continuar'}
        </Button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------------------------
// CREAR O CAMBIAR EL PIN — seis dígitos dos veces; si ya tiene uno, primero pide el actual.
// ---------------------------------------------------------------------------------------------
function ModalPinNuevo({ abierto, tienePin, cerrar, guardar }: {
  abierto: boolean; tienePin: boolean; cerrar: () => void;
  guardar: (pin: string, pinActual?: string) => Promise<string>;
}) {
  const [actual, setActual] = useState('');
  const [pin, setPin] = useState('');
  const [repetido, setRepetido] = useState('');
  const [aviso, setAviso] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [abiertoAntes, setAbiertoAntes] = useState(false);

  if (abierto && !abiertoAntes) { setAbiertoAntes(true); setActual(''); setPin(''); setRepetido(''); setAviso(''); }
  if (!abierto && abiertoAntes) setAbiertoAntes(false);

  const seis = (v: string) => v.replace(/\D/g, '').slice(0, 6);
  const faltaActual = tienePin && !/^\d{6}$/.test(actual);
  const repetidoDistinto = repetido.length > 0 && repetido !== pin;
  const listo = /^\d{6}$/.test(pin) && pin === repetido && !faltaActual && !guardando;

  const enviar = async () => {
    if (!listo) return;
    setGuardando(true); setAviso('');
    const fallo = await guardar(pin, tienePin ? actual : undefined);
    setGuardando(false);
    if (fallo) { setAviso(fallo); return; }
    cerrar();
  };

  return (
    <Modal open={abierto} onClose={cerrar} title={tienePin ? 'Cambie su PIN de seguridad' : 'Cree su PIN de seguridad'}>
      <div className="bs">
        {tienePin
          ? 'Su cuenta ya tiene PIN. Para cambiarlo le pedimos el actual: así nadie que se siente un momento en su puesto puede dejarlo a su gusto.'
          : 'Seis dígitos. Con el PIN puesto, el panel le pide sus seis dígitos antes de desconectar una cuenta o de arrancar el motor: son las acciones que tocan algo de verdad.'}
      </div>

      {tienePin && (<>
        <label className="label" style={{ marginTop: 14 }}>Su PIN actual</label>
        <input className="input" value={actual} inputMode="numeric" autoComplete="off" maxLength={6}
          placeholder="••••••" style={{ letterSpacing: 6, fontSize: 18, textAlign: 'center' }}
          title="Los seis dígitos que tiene hoy: es lo que protege el cambio"
          onChange={e => setActual(seis(e.target.value))} />
      </>)}

      <label className="label" style={{ marginTop: 14 }}>{tienePin ? 'El PIN nuevo (seis dígitos)' : 'Su PIN (seis dígitos)'}</label>
      <input className="input" value={pin} inputMode="numeric" autoComplete="off" maxLength={6}
        placeholder="••••••" style={{ letterSpacing: 6, fontSize: 18, textAlign: 'center' }}
        title="Seis dígitos: es lo que le vamos a pedir antes de las acciones sensibles"
        onChange={e => setPin(seis(e.target.value))} />

      <label className="label" style={{ marginTop: 11 }}>Repítalo para confirmar</label>
      <input className="input" value={repetido} inputMode="numeric" autoComplete="off" maxLength={6}
        placeholder="••••••" style={{ letterSpacing: 6, fontSize: 18, textAlign: 'center' }}
        title="Los mismos seis dígitos otra vez: así se asegura de que los escribió bien"
        onChange={e => setRepetido(seis(e.target.value))}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void enviar(); } }} />

      {repetidoDistinto && <div className="tiny" style={{ color: 'var(--amber)', marginTop: 6 }}>Los dos PIN no son iguales: escríbalos otra vez.</div>}
      {aviso && <div className="alarm" style={{ marginTop: 12, borderLeft: '3px solid var(--amber)', background: 'rgba(245,158,11,.08)' }}>
        <div className="alarm-sug">{aviso}</div>
      </div>}

      <div className="tiny muted" style={{ marginTop: 12 }}>
        El PIN no viaja guardado en ninguna parte: se manda al servidor y allá queda con su clave. Nadie
        del panel lo puede leer, ni siquiera esta pantalla.
      </div>

      <div className="row" style={{ gap: 9, justifyContent: 'flex-end', marginTop: 16, flexWrap: 'wrap' }}>
        <Button variant="ghost" className="btn-sm" title="Cierra sin cambiar el PIN" onClick={cerrar}>Cancelar</Button>
        <Button className="btn-sm" disabled={!listo}
          title={faltaActual ? 'Primero escriba su PIN actual' : !listo ? 'Escriba los seis dígitos dos veces, iguales' : tienePin ? 'Cambia el PIN del negocio' : 'Deja el PIN puesto en el negocio'}
          onClick={() => void enviar()}>
          <I_Check size={13} /> {guardando ? 'Guardando…' : tienePin ? 'Cambiar el PIN' : 'Crear el PIN'}
        </Button>
      </div>
    </Modal>
  );
}

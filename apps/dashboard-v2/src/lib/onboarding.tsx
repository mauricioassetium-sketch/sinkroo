import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  PASOS_ONB, siguientePaso, CONEXIONES_ONB, ARCHIVOS_PERMITIDOS, MAX_ARCHIVO_MB,
} from '../data/onboarding';
import {
  arrancarMotor, borrarArchivo, guardarOnboarding, hayApi, leerCodigoDeEntrada, leerOnboarding,
  listarArchivos, reclamarCodigoDeEntrada, subirArchivo, token,
  type ArchivoRemoto, type ErrorApi,
} from '../api/cliente';

// =============================================================================================
// EL ESTADO DE LOS PRIMEROS PASOS
//
// El onboarding es lo único del panel que puede quedar a medias: el cliente entra, hace dos pasos,
// se va a mirar otra cosa y vuelve. Por eso su estado no puede vivir adentro de la pantalla (se
// perdería al cambiar de vista) y vive aquí: así el menú muestra cuánto falta y Hoy puede decir qué
// sigue. Lo que se completa también queda aquí: el material elegido y los datos escritos.
//
// DOS COSAS MÁS VIVEN AQUÍ, y las dos son frenos de verdad:
//   · El CÓDIGO DE ENTRADA. Sinkroo se entrega por invitación: con el servidor encendido, el
//     asistente no avanza y el motor no arranca hasta que esa cuenta tenga su código registrado. El
//     código no se guarda en el navegador ni se vuelve a mostrar: sólo queda el hecho de si quedó.
//   · El MATERIAL. Con el servidor encendido, la lista de archivos sale del BACK (no de la memoria
//     del navegador) y subir es subir de verdad, uno por uno, con su avance y su motivo cuando falla.
// =============================================================================================

export type ValorOnb = string | string[];
export type DatosOnb = Record<string, ValorOnb>;

/** Un archivo que el cliente subió en la ingesta: lo que el motor va a leer. */
export type ArchivoIngesta = {
  /** El id que le dio el servidor. Sin servidor no hay id: el archivo sólo existe en esta visita. */
  id?: string;
  nombre: string;
  peso: string;
  tipo: 'doc' | 'imagen' | 'video' | 'audio' | 'otro';
};

/** Cómo va una subida, para poder decir «Subiendo 2 de 3…» mientras pasa. */
export type Subida = { hechos: number; total: number } | null;

/** El código de entrada, tal como lo ve la pantalla. */
export type EntradaEstado = {
  /** ¿Esta cuenta ya validó su código? Es lo único que deja avanzar el asistente. */
  registrado: boolean;
  /** Lo que el back dijo al aceptarlo. Sin nota, null. */
  nota: string | null;
  cargando: boolean;
  /** El último error, ya en palabras del negocio: la pantalla lo muestra tal cual. */
  error: string;
  /** La lectura del estado falló (el servidor no respondió). Es distinto de «el código no sirve». */
  errorLectura: string;
};

type Ctx = {
  datos: DatosOnb;
  /** Con el servidor encendido: los archivos que el cliente subió, tal como los devuelve el back. */
  archivos: ArchivoIngesta[];
  subirArchivos: (files: FileList | File[] | null) => Promise<void>;
  quitarArchivo: (a: ArchivoIngesta) => Promise<void>;
  /** El avance de la subida («Subiendo 2 de 3…»). null = no hay nada subiendo. */
  subiendo: Subida;
  /** Lo último que no se pudo subir, con el motivo. Vacío = todo salió bien. */
  errorArchivos: string;
  /** Con el servidor encendido, ¿la lista de archivos es la del servidor? Sin servidor, es la visita. */
  conBack: boolean;
  /** El código de entrada. */
  entrada: EntradaEstado;
  /** Manda el código. Devuelve true cuando quedó registrado. */
  reclamarCodigo: (codigo: string) => Promise<boolean>;
  /** Vuelve a leer si el código quedó registrado (sirve cuando la lectura falló). */
  recargarEntrada: () => Promise<void>;
  paso: number;
  irA: (n: number) => void;
  escribir: (id: string, v: ValorOnb) => void;
  /** El asistente de entrada: bienvenida y tipo primero, después los cinco pasos. */
  asistente: { abierto: boolean; fase: number };
  abrirAsistente: (fase?: number) => void;
  irAFase: (f: number) => void;
  cerrarAsistente: () => void;
  /** Los pasos que el cliente ya dio por hechos. */
  hechos: number[];
  /** Marca el paso como hecho (es lo que hace «Continuar»). */
  marcar: (n: number) => void;
  /** Deja el paso como pendiente pero guardado: es lo que hace «Seguir después». */
  desmarcar: (n: number) => void;
  /** El motor ya arrancó: desde aquí, el panel muestra lo que el motor hizo, paso por paso. */
  arrancado: boolean;
  /**
   * Arranca el motor. Con el servidor encendido NO lo arranca si falta el código de entrada, y sólo
   * lo da por arrancado cuando el back lo confirma.
   */
  arrancar: () => Promise<void>;
  /** ¿Se puede arrancar? Falso cuando con el servidor encendido falta el código de entrada. */
  puedeArrancar: boolean;
  /** Hay un arranque en curso: el botón se apaga para no mandarlo dos veces. */
  arrancando: boolean;
  /** Lo que dijo el back cuando el arranque no salió. Vacío = no falló nada. */
  errorArranque: string;
  /** Aviso del panel: lo usan los controles compartidos, que viven fuera de las vistas. */
  avisar: (t: string) => void;
  /** Los cinco pasos del negocio, en orden. */
  pasos: typeof PASOS_ONB;
  /** Los datos mínimos del paso están puestos: se calcula, no se declara. */
  completo: (n: number) => boolean;
  siguiente: number;
  listos: number[];
};

const OnbCtx = createContext<Ctx | null>(null);

export function useOnboarding(): Ctx {
  const c = useContext(OnbCtx);
  if (!c) throw new Error('useOnboarding necesita el OnboardingProvider arriba');
  return c;
}

const tieneValor = (v: ValorOnb | undefined) =>
  Array.isArray(v) ? v.length > 0 : !!String(v || '').trim();

// ---------------------------------------------------------------------------------------------
// EL CÓDIGO DE ENTRADA, EN PALABRAS DEL NEGOCIO
// Los cuatro mensajes que puede ver el cliente. El back manda `codigo` y de ahí sale el texto: nunca
// se muestra su `error` crudo, que es un mensaje del sistema.
// ---------------------------------------------------------------------------------------------
const SIN_CODIGO = 'Escriba el código de entrada: es el que le entregó quien le instaló Sinkroo.';
const CODIGO_INVALIDO = 'Ese código no existe. Revíselo tal como se lo entregaron o pídale el suyo a quien le instaló Sinkroo.';
const CODIGO_USADO = 'Ese código ya se usó. Cada código sirve una sola vez: pídale otro a quien le instaló Sinkroo.';
const CODIGO_SIN_RESPUESTA = 'No se pudo validar el código: el servidor no respondió. Vuelva a intentarlo.';
const CODIGO_FRENADO = 'Hubo demasiados intentos seguidos con códigos que no sirven. Espere unos minutos y vuelva a intentarlo.';
const ENTRADA_SIN_LEER = 'No se pudo leer si su código de entrada ya quedó registrado: el servidor no respondió. Hasta que se pueda leer, el asistente no avanza.';

const textoDeCodigo = (e: unknown): string => {
  const codigo = (e as ErrorApi)?.codigo;
  return codigo === 'codigo_vacio' ? SIN_CODIGO
    : codigo === 'codigo_invalido' ? CODIGO_INVALIDO
      : codigo === 'codigo_ya_usado' ? CODIGO_USADO
        : codigo === 'frenado' ? CODIGO_FRENADO
          : CODIGO_SIN_RESPUESTA;
};

/** El motivo de un fallo, en palabras del negocio. Del back sólo se muestra su texto cuando HUBO
 *  respuesta: un fallo de red no trae más que un «Failed to fetch», que no le dice nada a nadie. */
const motivoDeFallo = (e: unknown, porDefecto = 'no se pudo hablar con el servidor'): string => {
  const err = e as ErrorApi;
  if (typeof err?.estado === 'number' && err.message && err.message !== 'sin_api') return err.message;
  return porDefecto;
};

/** El peso, como lo muestra el panel: en MB si pasa de un mega, en KB si no. Si el back ya lo manda
 *  escrito, se muestra tal cual: el peso que se ve es el que devolvió el servidor. */
const pesoBonito = (peso: number | string) => {
  if (typeof peso === 'string') return peso.trim() || 'sin peso';
  if (!Number.isFinite(peso) || peso < 0) return 'sin peso';
  return peso > 1048576 ? `${(peso / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(peso / 1024))} KB`;
};

export function OnboardingProvider({ children, avisar }: { children: ReactNode; avisar: (t: string) => void }) {
  const [datos, setDatos] = useState<DatosOnb>(() => ({
    // Sin la API encendida, las cuentas del ejemplo arrancan puestas: el paso 5 muestra el estado del
    // negocio, no una lista vacía, y lo que se destilda no se desconecta solo (se marca).
    // CON LA API ENCENDIDA NO SE SIEMBRA NADA: el estado real lo lee el bloque del paso 5 del back.
    // Sembrarlas desde el ejemplo era afirmar conexiones que no existen.
    conectadas: hayApi() ? [] : CONEXIONES_ONB.filter(c => c.habilitadoHoy).map(c => c.key),
  }));
  const [archivos, setArchivos] = useState<ArchivoIngesta[]>([]);
  const [subiendo, setSubiendo] = useState<Subida>(null);
  const [errorArchivos, setErrorArchivos] = useState('');
  const [entrada, setEntrada] = useState<EntradaEstado>({
    registrado: false, nota: null, cargando: hayApi(), error: '', errorLectura: '',
  });
  const [arrancando, setArrancando] = useState(false);
  const [errorArranque, setErrorArranque] = useState('');
  const [paso, setPaso] = useState(1);
  const [hechos, setHechos] = useState<number[]>([]);
  const [arrancado, setArrancado] = useState(false);
  // El asistente de entrada: fase 0 la bienvenida, 2..6 los cinco pasos.
  const [asistente, setAsistente] = useState({ abierto: false, fase: 0 });
  // Con la API encendida, esto dice si ya se leyó lo guardado. No se escribe en el back antes de leer:
  // si no, el primer guardado pisaría lo que había.
  const [cargado, setCargado] = useState(false);
  const guardadoPendiente = useRef<number | null>(null);

  /** ¿Se habla con el back? Es la misma condición que usa todo el panel: hay dirección y hay sesión. */
  const conBack = hayApi() && !!token();

  // Al abrir el panel, se trae lo que hay guardado. Es lo que hace que cerrar el navegador y volver no
  // pierda nada: el negocio sigue donde estaba.
  useEffect(() => {
    if (!hayApi() || !token()) { setCargado(true); return; }
    let vivo = true;
    leerOnboarding()
      .then(r => {
        if (!vivo) return;
        if (r.datos && Object.keys(r.datos).length) setDatos(d => ({ ...d, ...(r.datos as DatosOnb) }));
        if (Array.isArray(r.hechos)) setHechos(r.hechos);
        if (r.arrancado) setArrancado(true);
        setCargado(true);
      })
      .catch(() => setCargado(true));
    return () => { vivo = false; };
  }, []);

  // Cada cambio se manda al back, con una pausa corta: mientras el negocio escribe no se dispara una
  // petición por letra, y si cierra el navegador igual queda guardado.
  useEffect(() => {
    if (!hayApi() || !token() || !cargado) return;
    if (guardadoPendiente.current) window.clearTimeout(guardadoPendiente.current);
    guardadoPendiente.current = window.setTimeout(() => {
      guardarOnboarding({ datos, hechos }).catch(() => { /* sin conexión: se reintenta al próximo cambio */ });
    }, 700);
    return () => { if (guardadoPendiente.current) window.clearTimeout(guardadoPendiente.current); };
  }, [datos, hechos, cargado]);

  const escribir = (id: string, v: ValorOnb) => setDatos(d => ({ ...d, [id]: v }));

  /** El tipo se mira por la extensión: es lo que el motor va a usar para leer el archivo. */
  const tipoDe = (nombre: string): ArchivoIngesta['tipo'] =>
    /\.(pdf|docx?|rtf|txt|md|xlsx?|csv|pptx?|odt|ods)$/i.test(nombre) ? 'doc'
      : /\.(jpe?g|png|webp|gif|avif|heic|svg)$/i.test(nombre) ? 'imagen'
        : /\.(mp4|mov|webm|avi|mkv|m4v)$/i.test(nombre) ? 'video'
          : /\.(mp3|wav|m4a|ogg|aac)$/i.test(nombre) ? 'audio' : 'otro';

  // ---------------------------------------------------------------------------------------------
  // EL CÓDIGO DE ENTRADA
  // Se lee UNA sola vez al abrir el panel (con el back encendido y sesión, igual que el resto). Lo
  // único que queda en memoria es si el código ya quedó registrado: el código en sí no se guarda en
  // ninguna parte del navegador ni se vuelve a mostrar.
  // ---------------------------------------------------------------------------------------------
  const leerEntrada = useCallback(async () => {
    if (!hayApi() || !token()) { setEntrada({ registrado: false, nota: null, cargando: false, error: '', errorLectura: '' }); return; }
    setEntrada(e => ({ ...e, cargando: true, error: '', errorLectura: '' }));
    try {
      const r = await leerCodigoDeEntrada();
      setEntrada({ registrado: !!r.registrado, nota: r.nota ?? null, cargando: false, error: '', errorLectura: '' });
    } catch {
      // No se pudo leer: NO se asume que esté registrado. El asistente queda frenado y lo dice, con
      // la puerta para volver a leer.
      setEntrada({ registrado: false, nota: null, cargando: false, error: '', errorLectura: ENTRADA_SIN_LEER });
    }
  }, []);

  useEffect(() => { void leerEntrada(); }, [leerEntrada]);

  const reclamarCodigo = async (codigo: string): Promise<boolean> => {
    const limpio = codigo.trim();
    if (!limpio) { setEntrada(e => ({ ...e, error: SIN_CODIGO })); return false; }
    setEntrada(e => ({ ...e, cargando: true, error: '', errorLectura: '' }));
    try {
      const r = await reclamarCodigoDeEntrada(limpio);
      setEntrada({ registrado: true, nota: r.nota ?? null, cargando: false, error: '', errorLectura: '' });
      avisar(r.ya
        ? 'Ese código ya estaba registrado en su cuenta: puede seguir'
        : 'Código de entrada aceptado: puede seguir');
      return true;
    } catch (e) {
      setEntrada(x => ({ ...x, cargando: false, error: textoDeCodigo(e), errorLectura: '' }));
      return false;
    }
  };

  // ---------------------------------------------------------------------------------------------
  // EL MATERIAL
  // Con el back encendido la lista sale del SERVIDOR: se lee al abrir y se refresca al subir o al
  // borrar. Sin back sigue como siempre (en memoria) y la pantalla lo dice, porque ahí no se guarda.
  // ---------------------------------------------------------------------------------------------
  const aDeIngesta = (a: ArchivoRemoto): ArchivoIngesta => ({
    id: a.id, nombre: a.nombre, peso: pesoBonito(a.peso), tipo: tipoDe(a.nombre),
  });

  const refrescarArchivos = useCallback(async () => {
    if (!hayApi() || !token()) return;
    try {
      const r = await listarArchivos();
      // La lista que queda en pantalla es la del servidor, con su nombre, su peso y su tipo.
      setArchivos((r.archivos || []).map(a => ({
        id: a.id, nombre: a.nombre, peso: pesoBonito(a.peso), tipo: tipoDe(a.nombre),
      })));
      setErrorArchivos('');
    } catch {
      setErrorArchivos('No se pudo leer lo que ya tenía guardado en el servidor. Vuelva a entrar y aparece.');
    }
  }, []);

  useEffect(() => { void refrescarArchivos(); }, [refrescarArchivos]);

  /** Lo que el panel dice ANTES de subir: el tope y los formatos son los del servidor, no una promesa. */
  const revisarArchivo = (f: File): string => {
    if (f.size > MAX_ARCHIVO_MB * 1048576) return `pesa ${pesoBonito(f.size)} y el tope es ${MAX_ARCHIVO_MB} MB`;
    if (!ARCHIVOS_PERMITIDOS.test(f.name)) return 'ese formato no se puede leer: se aceptan documentos, imágenes, videos y audios';
    return '';
  };

  const subirArchivos = async (files: FileList | File[] | null): Promise<void> => {
    if (!files) return;
    const lista = Array.from(files);
    if (!lista.length) return;

    // SIN BACK: los archivos quedan en esta visita y se dicen así. Nada de «subido» sin servidor.
    if (!hayApi() || !token()) {
      const nuevos: ArchivoIngesta[] = lista.map(f => ({
        nombre: f.name || 'archivo sin nombre',
        peso: pesoBonito(f.size),
        tipo: tipoDe(f.name || ''),
      }));
      setArchivos(a => {
        const ya = new Set(a.map(x => x.nombre));
        return [...a, ...nuevos.filter(n => !ya.has(n.nombre))];
      });
      return;
    }

    // CON BACK: uno por uno, con su avance, y lo que falla no se lleva por delante lo que sí subió.
    setErrorArchivos('');
    const fallos: string[] = [];
    // Lo que ya está en su carpeta no se vuelve a subir: quedarían dos filas con el mismo nombre y el
    // motor leería dos veces lo mismo. Si de verdad quiere reemplazarlo, saca el que está y lo sube.
    const yaEnCarpeta = new Set(archivos.map(a => a.nombre));
    let subidos = 0;
    for (let i = 0; i < lista.length; i++) {
      const f = lista[i];
      setSubiendo({ hechos: i + 1, total: lista.length });
      const nombre = f.name || 'archivo sin nombre';
      if (yaEnCarpeta.has(nombre)) { fallos.push(`${nombre}: ya estaba en su carpeta (sáquelo si quiere reemplazarlo)`); continue; }
      const problema = revisarArchivo(f);
      if (problema) { fallos.push(`${nombre}: ${problema}`); continue; }
      try {
        const guardado = await subirArchivo(f);
        subidos++;
        yaEnCarpeta.add(guardado.nombre);
        setArchivos(a => [...a.filter(x => x.nombre !== guardado.nombre), aDeIngesta(guardado)]);
      } catch (e) {
        fallos.push(`${nombre}: ${motivoDeFallo(e)}`);
      }
    }
    setSubiendo(null);
    // Se relee del servidor: la lista que queda en pantalla es la que quedó guardada de verdad.
    await refrescarArchivos();
    if (subidos) avisar(`${subidos} archivo${subidos > 1 ? 's' : ''} ${subidos > 1 ? 'quedaron' : 'quedó'} en su carpeta: el motor lo${subidos > 1 ? 's' : ''} lee`);
    if (fallos.length) setErrorArchivos(`No se pudo subir ${fallos.length} de ${lista.length} — ${fallos.join(' · ')}`);
  };

  const quitarArchivo = async (a: ArchivoIngesta): Promise<void> => {
    if (hayApi() && token() && a.id) {
      try {
        await borrarArchivo(a.id);
        setArchivos(x => x.filter(y => y.id !== a.id));
        avisar(`${a.nombre} salió de su carpeta: se puede volver a subir cuando quiera`);
        void refrescarArchivos();
      } catch (e) {
        avisar(`No se pudo borrar ${a.nombre}: ${motivoDeFallo(e)}. Sigue en su carpeta.`);
      }
      return;
    }
    setArchivos(x => x.filter(y => y.nombre !== a.nombre));
    avisar('Archivo sacado de la lista de esta visita');
  };

  /** Un paso está completo cuando están TODOS sus datos mínimos. El material se mira aparte. */
  const completo = (n: number) => {
    const p = PASOS_ONB.find(x => x.n === n);
    if (!p) return false;
    return p.minima.every(id => {
      if (id === 'archivos') return archivos.length > 0;
      if (id === 'conectadas') return (datos['conectadas'] as string[] | undefined)?.length ? true : false;
      // El resultado del paso de cierre no es un dato escrito: es que el motor haya arrancado.
      if (id === 'arrancado') return arrancado;
      return tieneValor(datos[id]);
    });
  };

  const listos = PASOS_ONB.filter(p => completo(p.n) || hechos.includes(p.n)).map(p => p.n);

  const marcar = (n: number) => setHechos(h => (h.includes(n) ? h : [...h, n]));
  const desmarcar = (n: number) => setHechos(h => h.filter(x => x !== n));

  // ---------------------------------------------------------------------------------------------
  // EL ARRANQUE — el botón que prende el motor y crea los 500 del público.
  //
  // Con el servidor encendido, este es el freno duro: sin código de entrada NO se llama al back, y el
  // motor no se da por arrancado hasta que el back lo confirma. Antes se pintaba «arrancado» antes de
  // que el servidor contestara: una pantalla podía decir que sus 500 quedaron cuando no quedó ninguno.
  // ---------------------------------------------------------------------------------------------
  const puedeArrancar = !hayApi() || (!entrada.cargando && entrada.registrado);

  const arrancar = async (): Promise<void> => {
    if (!hayApi() || !token()) {
      setArrancado(true);
      marcar(5);
      avisar('El motor arrancó: quedaron sus 500 del público y empieza por el mercado; no gasta nada hasta publicar');
      return;
    }
    if (!entrada.registrado) {
      setErrorArranque('Falta el código de entrada: sin él el motor no arranca. El código lo entrega quien le instaló Sinkroo y se valida en la bienvenida.');
      avisar('Falta el código de entrada: sin él el motor no arranca');
      return;
    }
    setArrancando(true);
    setErrorArranque('');
    try {
      await arrancarMotor();
      setArrancado(true);
      marcar(5);
      avisar('El motor arrancó: quedaron sus 500 del público y empieza por el mercado; no gasta nada hasta publicar');
    } catch (e) {
      const motivo = motivoDeFallo(e);
      setErrorArranque(`No se pudo arrancar el motor: ${motivo}. No quedó arrancado: vuelva a intentarlo.`);
      avisar(`No se pudo arrancar el motor: ${motivo}`);
    } finally {
      setArrancando(false);
    }
  };

  return (
    <OnbCtx.Provider value={{
      datos, archivos, subirArchivos, quitarArchivo, subiendo, errorArchivos, conBack,
      entrada, reclamarCodigo, recargarEntrada: leerEntrada,
      paso, irA: setPaso, escribir,
      asistente,
      abrirAsistente: (fase = 0) => setAsistente({ abierto: true, fase }),
      irAFase: (f: number) => setAsistente(a => ({ ...a, fase: f })),
      cerrarAsistente: () => setAsistente(a => ({ ...a, abierto: false })),
      avisar,
      pasos: PASOS_ONB,
      hechos, marcar, desmarcar, arrancado, arrancar, puedeArrancar, arrancando, errorArranque,
      completo, siguiente: siguientePaso(listos), listos,
    }}>
      {children}
    </OnbCtx.Provider>
  );
}

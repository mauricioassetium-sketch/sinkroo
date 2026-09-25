import { createContext, useContext, useState, type ReactNode } from 'react';
import { PASOS_ONB, siguientePaso, CONEXIONES_ONB } from '../data/onboarding';

// =============================================================================================
// EL ESTADO DE LOS PRIMEROS PASOS
//
// El onboarding es lo único del panel que puede quedar a medias: el cliente entra, hace dos pasos,
// se va a mirar otra cosa y vuelve. Por eso su estado no puede vivir adentro de la pantalla (se
// perdería al cambiar de vista) y vive aquí: así el menú muestra cuánto falta y Hoy puede decir qué
// sigue. Lo que se completa también queda aquí: el material elegido y los datos escritos.
// =============================================================================================

export type ValorOnb = string | string[];
export type DatosOnb = Record<string, ValorOnb>;

/** Un archivo que el cliente subió en la ingesta: lo que el motor va a leer. */
export type ArchivoIngesta = { nombre: string; peso: string; tipo: 'doc' | 'imagen' | 'video' | 'audio' | 'otro' };

type Ctx = {
  datos: DatosOnb;
  /** Lo que el cliente subió en la ingesta, en orden. Se muestra tal cual: nombre, peso y tipo. */
  archivos: ArchivoIngesta[];
  subirArchivos: (files: FileList | File[] | null) => number;
  quitarArchivo: (nombre: string) => void;
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
  arrancar: () => void;
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

export function OnboardingProvider({ children, avisar }: { children: ReactNode; avisar: (t: string) => void }) {
  const [datos, setDatos] = useState<DatosOnb>({
    // Las cuentas que la cuenta YA tenía conectadas arrancan puestas: el paso 5 muestra el estado
    // real del negocio, no una lista vacía. Lo que se destilda aquí no se desconecta solo: se marca.
    conectadas: CONEXIONES_ONB.filter(c => c.habilitadoHoy).map(c => c.key),
  });
  const [archivos, setArchivos] = useState<ArchivoIngesta[]>([]);
  const [paso, setPaso] = useState(1);
  const [hechos, setHechos] = useState<number[]>([]);
  const [arrancado, setArrancado] = useState(false);
  // El asistente de entrada: fase 0 la bienvenida, 1 el tipo de cuenta, 2..6 los cinco pasos.
  const [asistente, setAsistente] = useState({ abierto: false, fase: 0 });

  const escribir = (id: string, v: ValorOnb) => setDatos(d => ({ ...d, [id]: v }));

  /** El tipo se mira por la extensión: es lo que el motor va a usar para leer el archivo. */
  const tipoDe = (nombre: string): ArchivoIngesta['tipo'] =>
    /\.(pdf|docx?|rtf|txt|md|xlsx?|csv|pptx?|odt|ods)$/i.test(nombre) ? 'doc'
      : /\.(jpe?g|png|webp|gif|avif|heic|svg)$/i.test(nombre) ? 'imagen'
        : /\.(mp4|mov|webm|avi|mkv|m4v)$/i.test(nombre) ? 'video'
          : /\.(mp3|wav|m4a|ogg|aac)$/i.test(nombre) ? 'audio' : 'otro';

  const subirArchivos = (files: FileList | File[] | null) => {
    if (!files) return 0;
    const nuevos: ArchivoIngesta[] = Array.from(files).map(f => ({
      nombre: f.name || 'archivo sin nombre',
      peso: f.size > 1048576 ? `${(f.size / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(f.size / 1024))} KB`,
      tipo: tipoDe(f.name || ''),
    }));
    setArchivos(a => {
      const ya = new Set(a.map(x => x.nombre));
      return [...a, ...nuevos.filter(n => !ya.has(n.nombre))];
    });
    return nuevos.length;
  };

  const quitarArchivo = (nombre: string) => setArchivos(a => a.filter(x => x.nombre !== nombre));

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

  return (
    <OnbCtx.Provider value={{
      datos, archivos, subirArchivos, quitarArchivo, paso, irA: setPaso, escribir,
      asistente,
      abrirAsistente: (fase = 0) => setAsistente({ abierto: true, fase }),
      irAFase: (f: number) => setAsistente(a => ({ ...a, fase: f })),
      cerrarAsistente: () => setAsistente(a => ({ ...a, abierto: false })),
      avisar,
      pasos: PASOS_ONB,
      hechos, marcar, desmarcar, arrancado, arrancar: () => setArrancado(true),
      completo, siguiente: siguientePaso(listos), listos,
    }}>
      {children}
    </OnbCtx.Provider>
  );
}

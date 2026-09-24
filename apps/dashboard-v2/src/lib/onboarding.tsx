import { createContext, useContext, useState, type ReactNode } from 'react';
import { PASOS_ONB, siguientePaso, CONEXIONES_ONB, pasosDe, type TipoCuenta } from '../data/onboarding';

// =============================================================================================
// EL ESTADO DE LOS PRIMEROS PASOS
//
// El onboarding es lo único del panel que puede quedar a medias: el cliente entra, hace dos pasos,
// se va a mirar otra cosa y vuelve. Por eso su estado no puede vivir adentro de la pantalla (se
// perdería al cambiar de vista) y vive acá: así el menú muestra cuánto falta y Hoy puede decir qué
// sigue. Lo que se completa también queda acá: el material elegido y los datos escritos.
// =============================================================================================

export type ValorOnb = string | string[];
export type DatosOnb = Record<string, ValorOnb>;

type Ctx = {
  datos: DatosOnb;
  /** El material elegido de la carpeta, por cargador. */
  material: Record<string, string[]>;
  paso: number;
  irA: (n: number) => void;
  escribir: (id: string, v: ValorOnb) => void;
  alternarMaterial: (campo: string, archivo: string) => void;
  /** El tipo de cuenta: cambia las preguntas y lo que pasa al terminar. */
  tipo: TipoCuenta | null;
  elegirTipo: (t: TipoCuenta) => void;
  /** Los pasos del tipo elegido (empresa por defecto hasta que se elija). */
  pasos: typeof PASOS_ONB;
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
  /** El motor ya arrancó: desde acá, el panel muestra el plan de la semana. */
  arrancado: boolean;
  arrancar: () => void;
  /** El perfil del creador quedó visible para las marcas (es su equivalente a arrancar). */
  publicado: boolean;
  publicar: () => void;
  /** Aviso del panel: lo usan los controles compartidos, que viven fuera de las vistas. */
  avisar: (t: string) => void;
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
    // real del negocio, no una lista vacía. Lo que se destilda acá no se desconecta solo: se marca.
    conectadas: CONEXIONES_ONB.filter(c => c.habilitadoHoy).map(c => c.key),
  });
  const [material, setMaterial] = useState<Record<string, string[]>>({});
  const [paso, setPaso] = useState(1);
  const [hechos, setHechos] = useState<number[]>([]);
  const [arrancado, setArrancado] = useState(false);
  const [publicado, setPublicado] = useState(false);
  // El tipo de cuenta se elige en la bienvenida y cambia los pasos y el cierre.
  const [tipo, setTipo] = useState<TipoCuenta | null>(null);
  const pasos = pasosDe(tipo);
  // El asistente de entrada: fase 0 la bienvenida, 1 el tipo de cuenta, 2..6 los cinco pasos.
  const [asistente, setAsistente] = useState({ abierto: false, fase: 0 });

  const escribir = (id: string, v: ValorOnb) => setDatos(d => ({ ...d, [id]: v }));

  const alternarMaterial = (campo: string, archivo: string) =>
    setMaterial(m => {
      const actual = m[campo] || [];
      return { ...m, [campo]: actual.includes(archivo) ? actual.filter(a => a !== archivo) : [...actual, archivo] };
    });

  /** Un paso está completo cuando están TODOS sus datos mínimos. El material se mira aparte. */
  const completo = (n: number) => {
    const p = pasos.find(x => x.n === n);
    if (!p) return false;
    return p.minima.every(id => {
      if (id === 'mat:fotos_producto') return (material['fotos_producto'] || []).length > 0;
      if (id === 'conectadas') return (datos['conectadas'] as string[] | undefined)?.length ? true : false;
      // El resultado de los pasos de cierre no es un dato escrito: es que el motor haya arrancado
      // (o que el perfil del creador se haya publicado).
      if (id === 'arrancado') return arrancado;
      if (id === 'publicado') return publicado;
      return tieneValor(datos[id]);
    });
  };

  const listos = pasos.filter(p => completo(p.n) || hechos.includes(p.n)).map(p => p.n);

  const marcar = (n: number) => setHechos(h => (h.includes(n) ? h : [...h, n]));
  const desmarcar = (n: number) => setHechos(h => h.filter(x => x !== n));

  /** El tipo se elige una vez y arrastra los pasos: si se cambia, los hechos vuelven a foja cero. */
  const elegirTipo = (t: TipoCuenta) => {
    if (t !== tipo) { setTipo(t); setHechos([]); setPaso(1); }
  };

  return (
    <OnbCtx.Provider value={{
      datos, material, paso, irA: setPaso, escribir, alternarMaterial,
      tipo, elegirTipo, pasos,
      asistente,
      abrirAsistente: (fase = 0) => setAsistente({ abierto: true, fase }),
      irAFase: (f: number) => setAsistente(a => ({ ...a, fase: f })),
      cerrarAsistente: () => setAsistente(a => ({ ...a, abierto: false })),
      avisar,
      hechos, marcar, desmarcar, arrancado, arrancar: () => setArrancado(true),
      publicado, publicar: () => setPublicado(true),
      completo, siguiente: siguientePaso(pasos, listos), listos,
    }}>
      {children}
    </OnbCtx.Provider>
  );
}

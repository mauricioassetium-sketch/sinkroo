import { createContext, useContext, useState, type ReactNode } from 'react';
import { PASOS_ONB, siguientePaso, CONEXIONES_ONB } from '../data/onboarding';

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
  /** Los pasos que el cliente ya dio por hechos. */
  hechos: number[];
  /** Marca el paso como hecho (es lo que hace «Continuar»). */
  marcar: (n: number) => void;
  /** Deja el paso como pendiente pero guardado: es lo que hace «Seguir después». */
  desmarcar: (n: number) => void;
  /** El motor ya arrancó: desde acá, el panel muestra el plan de la semana. */
  arrancado: boolean;
  arrancar: () => void;
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

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [datos, setDatos] = useState<DatosOnb>({
    // Las cuentas que la cuenta YA tenía conectadas arrancan puestas: el paso 5 muestra el estado
    // real del negocio, no una lista vacía. Lo que se destilda acá no se desconecta solo: se marca.
    conectadas: CONEXIONES_ONB.filter(c => c.habilitadoHoy).map(c => c.key),
  });
  const [material, setMaterial] = useState<Record<string, string[]>>({});
  const [paso, setPaso] = useState(1);
  const [hechos, setHechos] = useState<number[]>([]);
  const [arrancado, setArrancado] = useState(false);

  const escribir = (id: string, v: ValorOnb) => setDatos(d => ({ ...d, [id]: v }));

  const alternarMaterial = (campo: string, archivo: string) =>
    setMaterial(m => {
      const actual = m[campo] || [];
      return { ...m, [campo]: actual.includes(archivo) ? actual.filter(a => a !== archivo) : [...actual, archivo] };
    });

  /** Un paso está completo cuando están TODOS sus datos mínimos. El material se mira aparte. */
  const completo = (n: number) => {
    const p = PASOS_ONB.find(x => x.n === n);
    if (!p) return false;
    return p.minima.every(id => {
      if (id === 'mat:fotos_producto') return (material['fotos_producto'] || []).length > 0;
      if (id === 'conectadas') return (datos['conectadas'] as string[] | undefined)?.length ? true : false;
      return tieneValor(datos[id]);
    });
  };

  const listos = PASOS_ONB.filter(p => completo(p.n) || hechos.includes(p.n)).map(p => p.n);

  const marcar = (n: number) => setHechos(h => (h.includes(n) ? h : [...h, n]));
  const desmarcar = (n: number) => setHechos(h => h.filter(x => x !== n));

  return (
    <OnbCtx.Provider value={{
      datos, material, paso, irA: setPaso, escribir, alternarMaterial,
      hechos, marcar, desmarcar, arrancado, arrancar: () => setArrancado(true),
      completo, siguiente: siguientePaso(listos), listos,
    }}>
      {children}
    </OnbCtx.Provider>
  );
}

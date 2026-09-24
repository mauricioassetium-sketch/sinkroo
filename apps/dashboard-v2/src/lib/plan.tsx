import { createContext, useContext, useState, type ReactNode } from 'react';
import { PLANES, TENANT } from '../data/demo';
import { PLANES_CREADOR } from '../data/creador';
import { useOnboarding } from './onboarding';

// =============================================================================================
// EL PLAN DE LA CUENTA — un solo dato para todo el panel, y cambia con la piel.
//
// El plan se ve en tres lados: la píldora del menú, la barra de créditos del mes (que usa los
// créditos que el plan incluye) y la pantalla de Créditos, donde se cambia. Si cada uno lo leyera
// por su cuenta, el cambio se vería en una pantalla y no en las otras —y peor: el menú diría un
// plan y la pantalla otro—. Por eso vive acá y **el catálogo sale de la piel de la cuenta**: un
// negocio contrata Base/Pro/Estudio y un creador contrata Creador/Pro más el pack extra.
//
// El plan elegido se guarda por piel: cada cuenta es de un tipo, y su plan no se pisa con el otro.
// =============================================================================================

/** Un plan contratable, de cualquier piel: los dos catálogos comparten forma. */
export type Plan = {
  key: string; nombre: string; precio: number; creditosMes: number;
  paraQuien?: string; incluye: string[]; falta?: string[]; habilita?: string; destacado?: boolean;
};

const porDefecto = (planes: Plan[]) => planes.find(p => p.nombre === TENANT.plan) || planes[1];

type Ctx = {
  plan: Plan;
  /** Todos los planes de la piel activa: lo que se puede contratar. */
  planes: Plan[];
  cambios: number;
  /** Cambia el plan de la cuenta. Devuelve el plan anterior para poder avisar qué cambió. */
  cambiarPlan: (key: string) => Plan;
};

const inicial = porDefecto(PLANES as Plan[]);
const PlanCtx = createContext<Ctx>({ plan: inicial, planes: PLANES as Plan[], cambios: 0, cambiarPlan: () => inicial });

export const usePlan = () => useContext(PlanCtx);

export function PlanProvider({ children }: { children: ReactNode }) {
  // PlanProvider va DENTRO del OnboardingProvider: la piel de la cuenta decide el catálogo.
  const { tipo } = useOnboarding();
  const creador = tipo === 'creador';
  const planes: Plan[] = creador ? (PLANES_CREADOR as Plan[]) : (PLANES as Plan[]);

  const [elegidos, setElegidos] = useState<Record<'empresa' | 'creador', string>>({ empresa: 'pro', creador: 'pro' });
  const [cambios, setCambios] = useState(0);
  const clave: 'empresa' | 'creador' = creador ? 'creador' : 'empresa';
  const plan = planes.find(p => p.key === elegidos[clave]) || porDefecto(planes);

  const cambiarPlan = (key: string) => {
    const anterior = plan;
    if (planes.some(p => p.key === key) && key !== plan.key) {
      setElegidos(e => ({ ...e, [clave]: key }));
      setCambios(n => n + 1);
    }
    return anterior;
  };

  return <PlanCtx.Provider value={{ plan, planes, cambios, cambiarPlan }}>{children}</PlanCtx.Provider>;
}

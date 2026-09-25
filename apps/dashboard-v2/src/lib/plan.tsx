import { createContext, useContext, useState, type ReactNode } from 'react';
import { PLANES, TENANT } from '../data/demo';

// =============================================================================================
// EL PLAN DE LA CUENTA — un solo dato para todo el panel.
//
// El plan se ve en tres lados: la píldora del menú, la barra de créditos del mes (que usa los
// créditos que el plan incluye) y la pantalla de Créditos, donde se cambia. Si cada uno lo leyera
// por su cuenta, el cambio se vería en una pantalla y no en las otras —y peor: el menú diría un
// plan y la pantalla otro—. Por eso vive aquí.
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
  const planes = PLANES as Plan[];
  const [plan, setPlan] = useState<Plan>(() => porDefecto(planes));
  const [cambios, setCambios] = useState(0);

  const cambiarPlan = (key: string) => {
    const anterior = plan;
    const nuevo = planes.find(p => p.key === key);
    if (nuevo && nuevo.key !== plan.key) {
      setPlan(nuevo);
      setCambios(n => n + 1);
    }
    return anterior;
  };

  return <PlanCtx.Provider value={{ plan, planes, cambios, cambiarPlan }}>{children}</PlanCtx.Provider>;
}

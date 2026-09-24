import { createContext, useContext, useState, type ReactNode } from 'react';
import { PLANES, TENANT } from '../data/demo';

// =============================================================================================
// EL PLAN DE LA CUENTA — un solo dato para todo el panel.
//
// El plan se muestra en tres lados: la píldora del menú (Plan Pro), la barra de créditos del mes
// (que usa los créditos que incluye el plan) y la pantalla de Créditos, donde se cambia. Si cada
// uno lo leyera por su cuenta, cambiar de plan se vería en una pantalla y no en las otras: es
// exactamente el tipo de incoherencia que el dueño detecta. Por eso vive acá.
//
// El valor inicial sale de TENANT.plan (el plan contratado en la data del negocio).
// =============================================================================================

export type Plan = (typeof PLANES)[number];

const inicial = PLANES.find(p => p.nombre === TENANT.plan) || PLANES[1];

type Ctx = {
  plan: Plan;
  cambios: number;
  /** Cambia el plan de la cuenta. Devuelve el plan anterior para poder avisar qué cambió. */
  cambiarPlan: (key: string) => Plan;
};

const PlanCtx = createContext<Ctx>({ plan: inicial, cambios: 0, cambiarPlan: () => inicial });

export const usePlan = () => useContext(PlanCtx);

export function PlanProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<Plan>(inicial);
  const [cambios, setCambios] = useState(0);

  const cambiarPlan = (key: string) => {
    const anterior = plan;
    const nuevo = PLANES.find(p => p.key === key);
    if (nuevo && nuevo.key !== plan.key) {
      setPlan(nuevo);
      setCambios(n => n + 1);
    }
    return anterior;
  };

  return <PlanCtx.Provider value={{ plan, cambios, cambiarPlan }}>{children}</PlanCtx.Provider>;
}

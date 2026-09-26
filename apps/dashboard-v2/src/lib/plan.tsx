import { createContext, useContext, useState, type ReactNode } from 'react';
import { PLANES } from '../data/demo';
import { useDatos } from '../api/datos';

// =============================================================================================
// EL PLAN DE LA CUENTA — un solo dato para todo el panel.
//
// El plan se ve en tres lados: la píldora del menú, la barra de créditos del mes (que usa los
// créditos que el plan incluye) y la pantalla de Créditos, donde se cambia. Si cada uno lo leyera
// por su cuenta, el cambio se vería en una pantalla y no en las otras —y peor: el menú diría un
// plan y la pantalla otro—. Por eso vive aquí.
//
// DE DÓNDE SALE: de la cuenta (`d.negocio.plan`), NUNCA del negocio de ejemplo. Antes nacía con el plan
// de ese negocio y el asistente le prometía a cualquiera «los X créditos del plan» de un negocio ajeno.
// Mientras la cuenta no lo traiga, `plan` va en null y la pantalla dice que todavía no se leyó —que es
// la verdad— en vez de mostrar el de otro. `PLANES` queda como lo que es: el catálogo contratable.
// =============================================================================================

/** Un plan contratable, de cualquier piel: los dos catálogos comparten forma. */
export type Plan = {
  key: string; nombre: string; precio: number; creditosMes: number;
  paraQuien?: string; incluye: string[]; falta?: string[]; habilita?: string; destacado?: boolean;
};

/**
 * El plan de la cuenta, buscado en el catálogo por nombre o por clave. Sin dato que buscar, null: si la
 * cuenta no lo trajo, el panel no muestra el plan de nadie.
 */
const planDeLaCuenta = (planes: Plan[], nombre: string | null | undefined): Plan | null => {
  const buscado = (nombre || '').trim();
  if (!buscado) return null;
  return planes.find(p => p.nombre === buscado || p.key === buscado) ?? null;
};

type Ctx = {
  /** El plan de la cuenta. `null` = el panel todavía no lo leyó: no se inventa uno. */
  plan: Plan | null;
  /** Todos los planes del catálogo: lo que se puede contratar. */
  planes: Plan[];
  cambios: number;
  /** Cambia el plan de la cuenta. Devuelve el plan anterior para poder avisar qué cambió. */
  cambiarPlan: (key: string) => Plan | null;
};

const PlanCtx = createContext<Ctx>({ plan: null, planes: PLANES as Plan[], cambios: 0, cambiarPlan: () => null });

export const usePlan = () => useContext(PlanCtx);

export function PlanProvider({ children }: { children: ReactNode }) {
  const planes = PLANES as Plan[];
  // El plan lo dice la cuenta; el catálogo sólo traduce el nombre a precio y créditos por mes.
  const d = useDatos();
  const deLaCuenta = planDeLaCuenta(planes, d.negocio?.plan);
  // Lo que se cambie desde Créditos vive acá. El back todavía no guarda el cambio, y la pantalla lo dice.
  const [elegido, setElegido] = useState<Plan | null>(null);
  const [cambios, setCambios] = useState(0);
  const plan = elegido ?? deLaCuenta;

  const cambiarPlan = (key: string): Plan | null => {
    const anterior = plan;
    const nuevo = planes.find(p => p.key === key);
    if (nuevo && nuevo.key !== plan?.key) {
      setElegido(nuevo);
      setCambios(n => n + 1);
    }
    return anterior;
  };

  return <PlanCtx.Provider value={{ plan, planes, cambios, cambiarPlan }}>{children}</PlanCtx.Provider>;
}

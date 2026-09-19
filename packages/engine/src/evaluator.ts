import type { AgentProfile, AgentVote, Creative, CreativeDimension } from '@sinkroo/core';

/**
 * Evaluador = la función que, dado un agente y una pieza, produce un voto.
 *
 * En la Etapa 0, GAIA es quien implementa esta interfaz: GAIA encarna a cada
 * agente y juzga la pieza. El Engine solo orquesta (reparte, recoge, agrega).
 * Esta separación mantiene el motor determinista y testeable, y deja la
 * inteligencia en GAIA, que es justo lo que la hace única.
 */
export interface Evaluator {
  /** Devuelve UN voto por dimensión prioritaria del agente. */
  evaluate(agent: AgentProfile, creative: Creative): Promise<AgentVote[]>;
}

/**
 * Evaluador determinista de referencia (sin IA). Útil para tests y para
 * tener un "piso" cuando GAIA no está disponible. NO es la fuente de
 * inteligencia real — GAIA reemplaza esto en producción.
 *
 * Cada agente vota sobre TODAS sus dimensiones prioritarias, con una
 * heurística simple sobre el texto del copy, para producir un desglose
 * más rico que un solo voto.
 */
export class HeuristicEvaluator implements Evaluator {
  async evaluate(agent: AgentProfile, creative: Creative): Promise<AgentVote[]> {
    return agent.priorities.map((dimension) => ({
      agentId: agent.id,
      dimension,
      score: this.scoreFor(creative.copy, dimension),
      rationale: `Heurística: copy de ${creative.copy.length} caracteres (dimensión ${dimension})`,
    }));
  }

  private scoreFor(copy: string, dimension: CreativeDimension): number {
    let s = 50;
    if (copy.length >= 40 && copy.length <= 300) s += 15;
    if (/\d/.test(copy)) s += 10;
    if (/(ahora|hoy|últim|solo|por tiempo limitado)/i.test(copy)) {
      s += dimension === 'gancho' || dimension === 'urgencia' ? 15 : 5;
    }
    if (dimension === 'credibilidad' && copy.length < 200) s += 5;
    if (dimension === 'claridad' && copy.length > 20 && copy.length < 250) s += 5;
    return Math.max(0, Math.min(100, s));
  }
}

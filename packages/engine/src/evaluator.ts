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
  evaluate(agent: AgentProfile, creative: Creative): Promise<AgentVote>;
}

/**
 * Evaluador determinista de referencia (sin IA). Útil para tests y para
 * tener un "piso" cuando GAIA no está disponible. NO es la fuente de
 * inteligencia real — GAIA reemplaza esto en producción.
 *
 * Aplica una heurística simple sobre el texto del copy: longitud, signos de
 * urgencia y presencia de cifras. Diseñado para ser predecible, no bueno.
 */
export class HeuristicEvaluator implements Evaluator {
  async evaluate(agent: AgentProfile, creative: Creative): Promise<AgentVote> {
    const score = this.scoreFor(creative.copy, agent.priorities);
    const dim = agent.priorities[0];
    return {
      agentId: agent.id,
      dimension: dim,
      score,
      rationale: `Heurística: copy de ${creative.copy.length} caracteres`,
    };
  }

  private scoreFor(copy: string, priorities: CreativeDimension[]): number {
    let s = 50;
    if (copy.length >= 40 && copy.length <= 300) s += 15;
    if (/\d/.test(copy)) s += 10;
    if (/(ahora|hoy|últim|solo|por tiempo limitado|before)/i.test(copy)) s += 10;
    if (priorities.includes('credibilidad') && copy.length < 200) s += 5;
    return Math.max(0, Math.min(100, s));
  }
}

import type { AgentProfile, AgentVote, Creative } from '@sinkroo/core';
import type { Evaluator } from '@sinkroo/engine';

/**
 * GaiaEvaluator — el "cerebro" del enjambre.
 *
 * En producción, GAIA encarna a cada agente del enjambre, juzga la pieza
 * contra el perfil del agente, y devuelve un voto razonado.
 *
 * Este archivo define el CONTRATO: una función `judge` que GAIA provee. La
 * implementación concreta (llamada al modelo GAIA) se inyecta — así el
 * motor queda limpio y testeable, y la inteligencia vive en GAIA.
 */

/** Firma de la función que GAIA implementa: (agente, pieza) -> voto. */
export type GaiaJudgeFn = (agent: AgentProfile, creative: Creative) => Promise<AgentVote>;

/** Envuelve la función de GAIA en un Evaluator compatible con el Engine. */
export class GaiaEvaluator implements Evaluator {
  constructor(private readonly judge: GaiaJudgeFn) {}

  async evaluate(agent: AgentProfile, creative: Creative): Promise<AgentVote> {
    return this.judge(agent, creative);
  }
}

/**
 * Helper para construir un voto tipado desde una respuesta de GAIA.
 * Encapsula el clamp de score y la forma canónica del voto.
 */
export function makeVote(
  agent: AgentProfile,
  score: number,
  rationale: string,
  dimension?: AgentVote['dimension'],
): AgentVote {
  const dim = dimension ?? agent.priorities[0];
  return {
    agentId: agent.id,
    dimension: dim,
    score: Math.max(0, Math.min(100, Math.round(score))),
    rationale,
  };
}

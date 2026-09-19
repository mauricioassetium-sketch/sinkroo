import type {
  AgentProfile,
  Creative,
  Score,
  SwarmResult,
  SwarmVerdict,
} from '@sinkroo/core';
import { clampScore, deriveVerdict, CREATIVE_DIMENSIONS } from '@sinkroo/core';
import type { Evaluator } from './evaluator.js';

export interface SwarmEngineOptions {
  agents?: AgentProfile[];
  evaluator: Evaluator;
}

/**
 * Sinkroo Engine — motor de enjambre.
 *
 * Dado una pieza creativa y un enjambre de agentes, cada agente vota y el
 * motor agrega los votos en un score ponderado 0..100 con veredicto.
 *
 * Diseño (decisiones deliberadas):
 *  - El Engine NO decide qué tan buena es una pieza: delega en el Evaluator
 *    (GAIA). El Engine solo orquesta y agrega de forma determinista.
 *  - El agregado es un promedio ponderado por agente y por dimensión.
 *  - Salida tipada y trazable (cada voto queda registrado).
 */
export class SwarmEngine {
  private readonly agents: AgentProfile[];
  private readonly evaluator: Evaluator;

  constructor(options: SwarmEngineOptions) {
    this.agents = options.agents ?? [];
    if (this.agents.length === 0) {
      throw new Error('SwarmEngine requiere al menos un agente');
    }
    this.evaluator = options.evaluator;
  }

  /** Evalúa una pieza y devuelve el resultado agregado del enjambre. */
  async evaluate(creative: Creative): Promise<SwarmResult> {
    const votes = [];
    for (const agent of this.agents) {
      votes.push(await this.evaluator.evaluate(agent, creative));
    }

    const overallScore = this.weightedOverall(votes);
    const dimensionScores = this.dimensionAggregates(votes);

    return {
      creativeId: creative.id,
      overallScore,
      dimensionScores,
      votes,
      verdict: deriveVerdict(overallScore),
      evaluatedAt: new Date().toISOString(),
    };
  }

  /** Promedio ponderado global (peso por agente, media por dimensión). */
  private weightedOverall(votes: SwarmResult['votes']): Score {
    const weightByAgent = new Map(this.agents.map((a) => [a.id, a.weight ?? 1]));
    let sum = 0;
    let totalWeight = 0;
    for (const v of votes) {
      const w = weightByAgent.get(v.agentId) ?? 1;
      sum += v.score * w;
      totalWeight += w;
    }
    if (totalWeight === 0) return 0;
    return clampScore(sum / totalWeight);
  }

  /** Promedio ponderado por dimensión. */
  private dimensionAggregates(
    votes: SwarmResult['votes'],
  ): Record<(typeof CREATIVE_DIMENSIONS)[number], Score> {
    const acc = {} as Record<(typeof CREATIVE_DIMENSIONS)[number], { s: number; w: number }>;
    const weightByAgent = new Map(this.agents.map((a) => [a.id, a.weight ?? 1]));
    for (const dim of CREATIVE_DIMENSIONS) acc[dim] = { s: 0, w: 0 };
    for (const v of votes) {
      const w = weightByAgent.get(v.agentId) ?? 1;
      acc[v.dimension].s += v.score * w;
      acc[v.dimension].w += w;
    }
    const out = {} as Record<(typeof CREATIVE_DIMENSIONS)[number], Score>;
    for (const dim of CREATIVE_DIMENSIONS) {
      out[dim] = acc[dim].w === 0 ? 0 : clampScore(acc[dim].s / acc[dim].w);
    }
    return out;
  }
}

import type {
  AgentProfile,
  Creative,
  Score,
  SwarmResult,
} from '@sinkroo/core';
import { clampScore, deriveVerdict, CREATIVE_DIMENSIONS } from '@sinkroo/core';
import type { Evaluator } from './evaluator.js';

export interface SwarmEngineOptions {
  agents?: AgentProfile[];
  evaluator: Evaluator;
}

/**
 * Sinkroo Engine — swarm engine.
 *
 * Given a creative piece and a swarm of agents, each agent votes on its
 * priority dimensions and the engine aggregates the votes into a weighted
 * 0..100 score with a verdict.
 *
 * Design (deliberate decisions):
 *  - The Engine does NOT decide how good a piece is: it delegates to the
 *    Evaluator (GAIA). The Engine only orchestrates and aggregates
 *    deterministically.
 *  - Aggregation is a weighted average per agent and per dimension.
 *  - Typed, traceable output (every vote is recorded).
 */
export class SwarmEngine {
  private readonly agents: AgentProfile[];
  private readonly evaluator: Evaluator;

  constructor(options: SwarmEngineOptions) {
    this.agents = options.agents ?? [];
    if (this.agents.length === 0) {
      throw new Error('SwarmEngine requires at least one agent');
    }
    this.evaluator = options.evaluator;
  }

  /** Evaluates a piece and returns the aggregated swarm result. */
  async evaluate(creative: Creative): Promise<SwarmResult> {
    const votes: SwarmResult['votes'] = [];
    for (const agent of this.agents) {
      const agentVotes = await this.evaluator.evaluate(agent, creative);
      votes.push(...agentVotes);
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

  /** Global weighted average (per-agent weight, mean over all votes). */
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

  /** Weighted average per dimension. */
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

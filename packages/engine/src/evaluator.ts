import type { AgentProfile, AgentVote, Creative, CreativeDimension } from '@sinkroo/core';

/**
 * Evaluator = the function that, given an agent and a piece, produces votes.
 *
 * At Stage 0, GAIA implements this interface: GAIA embodies each agent and
 * judges the piece. The Engine only orchestrates (dispatches, collects,
 * aggregates). This separation keeps the engine deterministic and testable,
 * and leaves the intelligence in GAIA — exactly what makes it unique.
 */
export interface Evaluator {
  /** Returns ONE vote per priority dimension of the agent. */
  evaluate(agent: AgentProfile, creative: Creative): Promise<AgentVote[]>;
}

/**
 * Deterministic reference evaluator (no AI). Useful for tests and as a
 * "floor" when GAIA is unavailable. NOT the real intelligence — GAIA
 * replaces this in production.
 *
 * Each agent votes on ALL its priority dimensions with a simple heuristic
 * over the copy text, to produce a richer breakdown than a single vote.
 */
export class HeuristicEvaluator implements Evaluator {
  async evaluate(agent: AgentProfile, creative: Creative): Promise<AgentVote[]> {
    return agent.priorities.map((dimension) => ({
      agentId: agent.id,
      dimension,
      score: this.scoreFor(creative.copy, dimension),
      rationale: `Heuristic: copy of ${creative.copy.length} chars (dimension ${dimension})`,
    }));
  }

  private scoreFor(copy: string, dimension: CreativeDimension): number {
    let s = 50;
    if (copy.length >= 40 && copy.length <= 300) s += 15;
    if (/\d/.test(copy)) s += 10;
    if (/(now|today|last|only|limited time)/i.test(copy)) {
      s += dimension === 'hook' || dimension === 'urgency' ? 15 : 5;
    }
    if (dimension === 'credibility' && copy.length < 200) s += 5;
    if (dimension === 'clarity' && copy.length > 20 && copy.length < 250) s += 5;
    return Math.max(0, Math.min(100, s));
  }
}

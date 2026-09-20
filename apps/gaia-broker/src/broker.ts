import type { AgentProfile, Creative, SwarmResult } from '@sinkroo/core';
import { SwarmEngine, DEFAULT_AGENTS } from '@sinkroo/engine';
import type { Evaluator } from '@sinkroo/engine';
import { createProvider, type ReasoningProvider, type CreativeBrief } from './providers.js';
import { predictPreSpend, type PreSpendPrediction } from './predict.js';

/**
 * GaiaBroker — the brain behind a single interface.
 *
 * Receives a creative and returns the swarm verdict, using the active provider
 * (real LLM or GAIA endpoint). The rest of the system does NOT know what is
 * behind it: it only calls evaluate() or generateCreatives().
 */
export class GaiaBroker {
  private readonly engine: SwarmEngine;
  private readonly provider: ReasoningProvider;

  constructor(options?: { provider?: ReasoningProvider; agents?: AgentProfile[] }) {
    this.provider = options?.provider ?? createProvider();
    this.engine = new SwarmEngine({
      agents: options?.agents ?? DEFAULT_AGENTS,
      evaluator: this.toEvaluator(this.provider),
    });
  }

  get brain(): string {
    return this.provider.name;
  }

  async evaluate(creative: Creative): Promise<SwarmResult> {
    return this.engine.evaluate(creative);
  }

  /** M4 — Generates N copy variants from a product brief. */
  async generateCreatives(brief: CreativeBrief, count = 5): Promise<string[]> {
    return this.provider.generate(brief, count);
  }

  /** M3 — Evaluates and predicts pre-spend performance in a single step. */
  async predict(creative: Creative): Promise<{ swarm: SwarmResult; prediction: PreSpendPrediction; brain: string }> {
    const swarm = await this.engine.evaluate(creative);
    const prediction = predictPreSpend(swarm, creative);
    return { swarm, prediction, brain: this.provider.name };
  }

  /** Adapts a ReasoningProvider to the engine's Evaluator interface. */
  private toEvaluator(provider: ReasoningProvider): Evaluator {
    return {
      evaluate: (agent, creative) => provider.judge(agent, creative),
    };
  }
}

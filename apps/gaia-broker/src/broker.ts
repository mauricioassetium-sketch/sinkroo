import type { AgentProfile, Creative, SwarmResult } from '@sinkroo/core';
import { SwarmEngine, DEFAULT_AGENTS } from '@sinkroo/engine';
import type { Evaluator } from '@sinkroo/engine';
import { createProvider, type ReasoningProvider } from './providers.js';

/**
 * GaiaBroker — el cerebro detrás de una única interfaz.
 *
 * Recibe un creative y devuelve el veredicto del enjambre, usando el provider
 * activo (LLM real o endpoint GAIA). El resto del sistema NO sabe qué hay
 * detrás: solo llama a evaluate().
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

  /** Adapta un ReasoningProvider a la interfaz Evaluator del motor. */
  private toEvaluator(provider: ReasoningProvider): Evaluator {
    return {
      evaluate: (agent, creative) => provider.judge(agent, creative),
    };
  }
}

import type { AgentProfile, Creative, SwarmResult, ConversationState, SalesAgentResult } from '@sinkroo/core';
import { SwarmEngine, DEFAULT_AGENTS } from '@sinkroo/engine';
import type { Evaluator } from '@sinkroo/engine';
import { createProvider, type ReasoningProvider, type CreativeBrief } from './providers.js';
import { predictPreSpend, type PreSpendPrediction } from './predict.js';
import { SalesAgent } from './conversation.js';
import { DeepAgentsRuntime, type BrokerAgentId } from './deep-agents.js';
import type { DeepAgentTask } from '@sinkroo/deep-agents';

/**
 * GaiaBroker — the brain behind a single interface.
 *
 * Recibe un creative y devuelve el veredicto del enjambre. La conversación (M6)
 * la resuelven los Deep Agents: el grafo sales-closer es el cerebro real, con el
 * SalesAgent determinista como red de seguridad si el grafo falla. El resto de
 * Deep Agents se exponen por runAgent() (market-analyst, media-buyer, …).
 */
export class GaiaBroker {
  private readonly engine: SwarmEngine;
  private readonly provider: ReasoningProvider;
  private readonly sales: SalesAgent;
  private readonly deep: DeepAgentsRuntime;

  constructor(options?: { provider?: ReasoningProvider; agents?: AgentProfile[]; deep?: DeepAgentsRuntime; runDeepAgents?: boolean }) {
    this.provider = options?.provider ?? createProvider();
    this.engine = new SwarmEngine({
      agents: options?.agents ?? DEFAULT_AGENTS,
      evaluator: this.toEvaluator(this.provider),
    });
    this.sales = new SalesAgent(this.provider);
    // Los Deep Agents siempre se levantan (offline si no hay credenciales);
    // runDeepAgents=false los desactiva solo para tests aislados del broker.
    if (options?.runDeepAgents === false) {
      this.deep = new DeepAgentsRuntime();
    } else {
      this.deep = options?.deep ?? new DeepAgentsRuntime();
    }
  }

  get brain(): string {
    return this.provider.name;
  }

  get deepBrain(): string {
    return this.deep.brain;
  }

  async evaluate(creative: Creative): Promise<SwarmResult> {
    return this.engine.evaluate(creative);
  }

  /** M4 — genera N variantes de copy desde un brief. */
  async generateCreatives(brief: CreativeBrief, count = 5): Promise<string[]> {
    return this.provider.generate(brief, count);
  }

  /** M6 — un turno de conversación de venta, vía grafo sales-closer. */
  async converse(state: ConversationState): Promise<SalesAgentResult> {
    try {
      return await this.deep.converse(state);
    } catch (err) {
      // Red de seguridad: el grafo nunca debe tumbar la venta. Pero el error se ve.
      console.error('[broker] deep sales-closer falló — usando fallback determinista:', err instanceof Error ? err.message : err);
      return this.sales.converse(state);
    }
  }

  /** Ejecuta un Deep Agent genérico por id (market-analyst, media-buyer, …). */
  async runAgent(id: BrokerAgentId, task: DeepAgentTask): Promise<unknown> {
    return this.deep.run(id, task);
  }

  /** M3 — evalúa y predice rendimiento pre-gasto en un solo paso. */
  async predict(creative: Creative): Promise<{ swarm: SwarmResult; prediction: PreSpendPrediction; brain: string }> {
    const swarm = await this.engine.evaluate(creative);
    const prediction = predictPreSpend(swarm, creative);
    return { swarm, prediction, brain: this.provider.name };
  }

  /** Adapta un ReasoningProvider a la interfaz Evaluator del engine. */
  private toEvaluator(provider: ReasoningProvider): Evaluator {
    return {
      evaluate: (agent, creative) => provider.judge(agent, creative),
    };
  }
}

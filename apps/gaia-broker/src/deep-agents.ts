/**
 * Deep Agents runtime — el puente entre el broker y los 6 Deep Agents (LangGraph).
 *
 * Un solo punto de montaje: construye UN ChatRuntime desde las MISMAS env vars
 * que createProvider() (GAIA_ENDPOINT_URL > PROVIDER_*), instancia los 6 agentes
 * con sus interfaces REALES (cada era-2 tiene firma propia), y expone:
 *
 *   - converse(state):  el grafo sales-closer como cerebro del endpoint M6 (/converse).
 *   - run(id, task):    cualquier Deep Agent; los era-2 reciben sus datos por task.data.
 *
 * Si no hay credenciales, ChatRuntime queda en modo offline y los grafos usan
 * sus caminos deterministas (sales-closer nunca se queda callado). El broker
 * NO necesita saber qué hay detrás: solo llama a converse() o run().
 */

import { ChatRuntime, createDeepAgent, SalesCloserAgent, MediaBuyerAgent, PerformanceAnalystAgent, InMemoryMetaClient } from '@sinkroo/deep-agents';
import type { DeepAgent, DeepAgentId, DeepAgentTask, DeepAgentResult, CampaignBrief, MetaClient, PredictionSnapshot, ActualResults } from '@sinkroo/deep-agents';
import type { ConversationState, SalesAgentResult, PaymentProvider } from '@sinkroo/core';

/** Recrea la resolución del broker pero para el runtime de los grafos. */
export function createSharedRuntime(): ChatRuntime {
  const gaiaUrl = process.env.GAIA_ENDPOINT_URL;
  if (gaiaUrl) {
    return new ChatRuntime({
      baseUrl: gaiaUrl.replace(/\/$/, ''),
      model: process.env.GAIA_MODEL ?? 'gaia',
      apiKey: process.env.GAIA_API_KEY ?? '',
      authHeader: 'Bearer',
    });
  }
  const base = process.env.PROVIDER_BASE_URL;
  const key = process.env.PROVIDER_API_KEY;
  if (base && key) {
    return new ChatRuntime({
      baseUrl: base.replace(/\/$/, ''),
      model: process.env.PROVIDER_MODEL ?? 'default',
      apiKey: key,
      authHeader: (process.env.PROVIDER_AUTH ?? 'Bearer') as 'Bearer' | 'x-api-key',
    });
  }
  return new ChatRuntime({ baseUrl: 'http://offline.invalid', model: 'offline', apiKey: '' });
}

/** Ids expuestos por el endpoint /agents/:id (sales-closer va aparte, vía /converse). */
export const BROKER_AGENT_IDS = [
  'market-analyst', 'marketing-strategist', 'creative-strategist', 'media-buyer', 'performance-analyst',
] as const;
export type BrokerAgentId = (typeof BROKER_AGENT_IDS)[number];

export class DeepAgentsRuntime {
  private readonly runtime: ChatRuntime;
  private readonly salesCloser: SalesCloserAgent;
  private readonly mediaBuyer: MediaBuyerAgent;
  private readonly performanceAnalyst: PerformanceAnalystAgent;
  private readonly strategistAgents = new Map<string, DeepAgent>();
  /** MetaClient del broker — InMemoryMetaClient (mock) hasta que existan credenciales reales. */
  private readonly meta: MetaClient;

  constructor(runtime?: ChatRuntime, payment?: PaymentProvider, meta?: MetaClient) {
    this.runtime = runtime ?? createSharedRuntime();
    this.meta = meta ?? new InMemoryMetaClient();
    this.salesCloser = new SalesCloserAgent(this.runtime, payment);
    this.mediaBuyer = new MediaBuyerAgent(this.runtime);
    this.performanceAnalyst = new PerformanceAnalystAgent(this.runtime);
    const strategistIds: BrokerAgentId[] = ['market-analyst', 'marketing-strategist', 'creative-strategist'];
    for (const id of strategistIds) {
      this.strategistAgents.set(id, createDeepAgent(id, this.runtime));
    }
  }

  get brain(): string {
    return this.runtime.offline ? 'deep-agents (offline/determinista)' : `deep-agents (LLM)`;
  }

  /** M6 — delega el turno de venta al grafo sales-closer (memoria por conversationId). */
  async converse(state: ConversationState): Promise<SalesAgentResult> {
    return this.salesCloser.run({
      conversationId: state.conversationId,
      stage: state.stage,
      history: state.history.map((m) => ({ sender: m.sender, text: m.text })),
      context: state.context,
      leadScore: state.leadScore,
    });
  }

  /** Ejecuta un Deep Agent por id. Los era-2 reciben sus entradas tipadas por task.data. */
  async run(id: BrokerAgentId, task: DeepAgentTask): Promise<unknown> {
    const strategist = this.strategistAgents.get(id);
    if (strategist) return strategist.run(task);

    const data = (task.data ?? {}) as Record<string, unknown>;
    if (id === 'media-buyer') return this.runMediaBuyer(data);
    if (id === 'performance-analyst') return this.runPerformanceAnalyst(data);
    throw new Error(`[deep-agents] unknown agent "${id}"`);
  }

  /** media-buyer: lanza (o monitorea si data.campaignId) contra el MetaClient. */
  private async runMediaBuyer(data: Record<string, unknown>): Promise<unknown> {
    const brief = (data.brief ?? data) as CampaignBrief;
    if (typeof brief?.objective !== 'string' || typeof brief?.dailyBudgetUsd !== 'number') {
      throw new Error('[media-buyer] data.brief requires { objective, dailyBudgetUsd }');
    }
    const campaignId = typeof data.campaignId === 'string' ? data.campaignId : undefined;
    if (campaignId) return this.mediaBuyer.check(campaignId, brief, this.meta);
    return this.mediaBuyer.run(brief, this.meta);
  }

  /** performance-analyst: data = { prediction, actuals, prior? } — calibra a Miro. */
  private async runPerformanceAnalyst(data: Record<string, unknown>): Promise<unknown> {
    const prediction = data.prediction as PredictionSnapshot | undefined;
    const actuals = data.actuals as ActualResults | undefined;
    if (!actuals || typeof actuals.spend !== 'number') {
      throw new Error('[performance-analyst] data requires { prediction, actuals: { spend, impressions, clicks, conversions } }');
    }
    const prior = typeof data.prior === 'number' ? data.prior : 1;
    return this.performanceAnalyst.run(prediction ?? {}, actuals, prior);
  }
}

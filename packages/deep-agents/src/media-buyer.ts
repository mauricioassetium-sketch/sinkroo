/**
 * #5 — media-buyer (M4 como grafo LangGraph).
 *
 * Ciclo plan → launch → monitor contra una interfaz MetaClient. HOY la única
 * implementación es InMemoryMetaClient: ningún peso real se mueve hasta que
 * exista MetaGraphAPIClient con credenciales reales. La interfaz queda fija
 * para que el swap sea transparente.
 */

import { StateGraph, Annotation, MemorySaver, START, END } from '@langchain/langgraph';
import type { ChatRuntime } from './chat-runtime.js';

/** Presupuesto y objetivo de una campaña — lo mínimo que M4 necesita decidir. */
export interface CampaignBrief {
  objective: 'conversions' | 'traffic' | 'leads';
  dailyBudgetUsd: number;
  audienceHint?: string;
  creativeRef?: string;
}

export interface CampaignMetrics {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

/** Interfaz fija — el mock y la API real de Meta comparten esta forma. */
export interface MetaClient {
  launchCampaign(brief: CampaignBrief): Promise<{ campaignId: string }>;
  getMetrics(campaignId: string): Promise<CampaignMetrics>;
  pauseCampaign(campaignId: string): Promise<void>;
}

/** Métricas + derivadas que el grafo calcula. */
export interface MetricsWithDerived extends CampaignMetrics {
  ctr: number;               // clicks / impressions
  cpc: number;               // spend / clicks
  cpa: number;               // spend / conversions
  roas: number;              // conversions * valor estimado / spend (valor=1 por defecto)
}

export interface MediaBuyerReport {
  /** Identificador del agente productor del reporte. */
  agentId: 'media-buyer';
  summary: string;
  action: 'launched' | 'monitoring' | 'paused' | 'no_launch';
  campaignId?: string;
  metrics?: MetricsWithDerived;
  recommendation: string;
  /** Nodos recorridos por el grafo — trazabilidad. */
  trace?: string[];
}

const MBState = Annotation.Root({
  brief: Annotation<CampaignBrief>,
  client: Annotation<MetaClient>,
  result: Annotation<MediaBuyerReport | null>({
    reducer: (_a, b) => b,
    default: () => null,
  }),
});

/** Umbral de pausa: CPA por encima del presupuesto diario → pausa y reporta. */
export function deriveMetrics(m: CampaignMetrics): MetricsWithDerived {
  const ctr = m.impressions > 0 ? m.clicks / m.impressions : 0;
  const cpc = m.clicks > 0 ? m.spend / m.clicks : 0;
  const cpa = m.conversions > 0 ? m.spend / m.conversions : 0;
  return { ...m, ctr, cpc, cpa, roas: m.spend > 0 ? m.conversions / m.spend : 0 };
}

export class MediaBuyerAgent {
  readonly id = 'media-buyer' as const;

  constructor(private readonly runtime: ChatRuntime) {}

  private build() {
    const g = new StateGraph(MBState)
      .addNode('launch', async (s: typeof MBState.State) => {
        const { campaignId } = await s.client.launchCampaign(s.brief);
        const report: MediaBuyerReport = {
          agentId: 'media-buyer',
          summary: 'Campaign ' + campaignId + ' launched (objective: ' + s.brief.objective + ').',
          action: 'launched',
          campaignId,
          recommendation: 'Monitor daily; first 48h are learning phase.',
        };
        return { result: report };
      })
      .addNode('monitor', async (s: typeof MBState.State) => {
        const id = s.result?.campaignId ?? '';
        const raw = await s.client.getMetrics(id);
        const metrics = deriveMetrics(raw);
        const shouldPause = metrics.cpa > 0 && metrics.cpa > s.brief.dailyBudgetUsd;
        const action: MediaBuyerReport['action'] = shouldPause ? 'paused' : 'monitoring';
        if (shouldPause) await s.client.pauseCampaign(id);
        const report: MediaBuyerReport = {
          agentId: 'media-buyer',
          campaignId: id,
          summary: 'Campaign ' + id + ': spend $' + metrics.spend.toFixed(2)
            + ', CTR ' + (metrics.ctr * 100).toFixed(2) + '%'
            + ', CPA $' + metrics.cpa.toFixed(2) + ' — ' + action + '.',
          action,
          metrics,
          recommendation: shouldPause
            ? 'CPA $' + metrics.cpa.toFixed(2) + ' exceeds daily budget $' + s.brief.dailyBudgetUsd + '. Paused. Review creative or audience before relaunch.'
            : 'CPA $' + metrics.cpa.toFixed(2) + ' within budget. Keep running; revisit at 2x spend.',
        };
        return { result: report };
      })
      .addEdge(START, 'launch')
      .addEdge('launch', 'monitor')
      .addEdge('monitor', END);
    return g.compile({ checkpointer: new MemorySaver() });
  }

  private graph = this.build();

  /** Lanza y devuelve el reporte del primer monitoreo. */
  async run(brief: CampaignBrief, client: MetaClient): Promise<MediaBuyerReport> {
    const final = await this.graph.invoke(
      { brief, client, result: null },
      { configurable: { thread_id: `mb-${brief.objective}-${Date.now()}` } },
    );
    return final.result as MediaBuyerReport;
  }

  /** Monitorea una campaña ya lanzada (sin relanzar). */
  async check(campaignId: string, brief: CampaignBrief, client: MetaClient): Promise<MediaBuyerReport> {
    const raw = await client.getMetrics(campaignId);
    const metrics = deriveMetrics(raw);
    const action: MediaBuyerReport['action'] = metrics.cpa > 0 && metrics.cpa > brief.dailyBudgetUsd
      ? 'paused' : 'monitoring';
    if (action === 'paused') await client.pauseCampaign(campaignId);
    return {
      agentId: 'media-buyer', campaignId, action, metrics,
      summary: `Campaign ${campaignId}: spend $${metrics.spend.toFixed(2)}, CPA $${metrics.cpa.toFixed(2)} — ${action}.`,
      recommendation: action === 'paused'
        ? `CPA $${metrics.cpa.toFixed(2)} exceeds daily budget $${brief.dailyBudgetUsd}. Paused.`
        : `CPA $${metrics.cpa.toFixed(2)} within budget. Keep running.`,
    };
  }
}

/** Mock en memoria — para verify y dev. Ningún peso real. */
export class InMemoryMetaClient implements MetaClient {
  private campaigns = new Map<string, CampaignMetrics>();
  constructor(private readonly seedMetrics?: CampaignMetrics) {}
  async launchCampaign(brief: CampaignBrief): Promise<{ campaignId: string }> {
    const campaignId = `camp_${Math.random().toString(36).slice(2, 10)}`;
    this.campaigns.set(campaignId, this.seedMetrics ?? { spend: 0, impressions: 0, clicks: 0, conversions: 0 });
    return { campaignId };
  }
  async getMetrics(campaignId: string): Promise<CampaignMetrics> {
    return this.campaigns.get(campaignId) ?? { spend: 0, impressions: 0, clicks: 0, conversions: 0 };
  }
  async pauseCampaign(campaignId: string): Promise<void> {
    this.campaigns.delete(campaignId);
  }
}

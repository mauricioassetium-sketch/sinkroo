/**
 * #6 — performance-analyst (el que cierra el loop con MiroFish).
 *
 * Grafo: compare → calibrate. Compara la predicción de Miro contra los
 * resultados reales (matemática determinista) y produce un factor de
 * corrección suavizado (EMA) para calibrar la próxima predicción.
 * Miro sigue aislado: este agente SOLO lee su predicción y emite
 * calibración — nunca entra al predictor.
 */

import { StateGraph, Annotation, MemorySaver, START, END } from '@langchain/langgraph';
import type { ChatRuntime } from './chat-runtime.js';

/** Snapshot de lo que predijo Miro antes de gastar. */
export interface PredictionSnapshot {
  predictedCpa?: number;
  predictedCpc?: number;
  predictedCtr?: number;
  predictedConversions?: number;
  confidence?: number; // 0..1
  channel?: string;
}

/** Lo que realmente pasó (viene de MetaClient.getMetrics). */
export interface ActualResults {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

export interface CalibrationReport {
  agentId: 'performance-analyst';
  summary: string;
  /** Desviación CPA real vs. predicho (1.0 = exacto; 1.3 = 30% peor). */
  cpaDeviation: number;
  /** Factor de corrección suavizado para la próxima predicción de Miro. */
  correction: number;
  /** Miro sobre- o sub-estimó el costo. */
  bias: 'overconfident' | 'underconfident' | 'accurate';
  recommendation: string;
  trace: string[];
}

const PAState = Annotation.Root({
  prediction: Annotation<PredictionSnapshot>,
  actuals: Annotation<ActualResults>,
  prior: Annotation<number>({ value: (_a, b) => b, default: () => 1 }), // corrección previa (EMA)
  report: Annotation<CalibrationReport | null>({
    reducer: (_a, b) => b,
    default: () => null,
  }),
});

/** CPA real desde los resultados. */
function actualCpa(a: ActualResults): number {
  return a.conversions > 0 ? a.spend / a.conversions : 0;
}

/** EMA: nueva corrección = 0.7·anterior + 0.3·observada (suaviza ruido). */
export function emaCorrection(prior: number, observed: number): number {
  return Math.min(3, Math.max(0.33, 0.7 * prior + 0.3 * observed));
}

export class PerformanceAnalystAgent {
  readonly id = 'performance-analyst' as const;

  constructor(private readonly runtime: ChatRuntime) {}

  private build() {
    const self = this;
    const g = new StateGraph(PAState)
      .addNode('compare', (s) => {
        const real = actualCpa(s.actuals);
        const predicted = s.prediction.predictedCpa ?? 0;
        const deviation = real > 0 && predicted > 0 ? real / predicted : 1;
        // corrección observada = inverso de la desviación (si Miro predijo barato, corregir al alza)
        const observed = predicted > 0 && real > 0 ? 1 / deviation : 1;
        const correction = emaCorrection(s.prior, observed);
        const bias: CalibrationReport['bias'] =
          Math.abs(deviation - 1) < 0.15 ? 'accurate' : deviation > 1 ? 'overconfident' : 'underconfident';
        return { report: {
          agentId: 'performance-analyst',
          summary: self.numericSummary(real, predicted, deviation, correction, bias),
          cpaDeviation: deviation,
          correction,
          bias,
          recommendation: bias === 'overconfident'
            ? `Miro overestimated efficiency (predicted $${predicted.toFixed(2)} CPA, real $${real.toFixed(2)}). Apply correction ${correction.toFixed(3)} to next prediction.`
            : bias === 'underconfident'
              ? `Miro underestimated efficiency. Correction ${correction.toFixed(3)} relaxes the next prediction up.`
              : `Miro within tolerance (${(deviation * 100).toFixed(0)}% of predicted). Keep correction ${correction.toFixed(3)}.`,
          trace: ['compare'],
        } satisfies CalibrationReport };
      })
      .addNode('calibrate', async (s) => {
        const r = s.report!;
        let narrative = r.summary;
        if (!self.runtime.offline) {
          try {
            const txt = await self.runtime.json<string>(
              'You are a performance analyst. Reply with exactly one sentence: was the prediction good? Plain text, no JSON.',
              r.summary + ' Bias: ' + r.bias + '. Correction: ' + r.correction.toFixed(3) + '.',
            );
            narrative = String(txt).trim();
          } catch { /* mantiene la numérica */ }
        }
        return { report: { ...r, summary: narrative, trace: [...r.trace, 'calibrate'] } };
      })
      .addEdge(START, 'compare')
      .addEdge('compare', 'calibrate')
      .addEdge('calibrate', END);
    return g.compile({ checkpointer: new MemorySaver() });
  }

  private graph = this.build();

  private numericSummary(real: number, predicted: number, deviation: number, correction: number, bias: string): string {
    const predictedStr = predicted > 0 ? ' $' + predicted.toFixed(2) : 'n/a';
    const realStr = real > 0 ? ' $' + real.toFixed(2) : 'n/a (no conversions yet)';
    return `Miro predicted${predictedStr} CPA; actual${realStr}. Deviation ${deviation.toFixed(2)}x (${bias}). New calibration: ${correction.toFixed(3)}.`;
  }

  /** Compara predicción vs. real, devuelve el reporte y el factor de calibración. */
  async run(
    prediction: PredictionSnapshot,
    actuals: ActualResults,
    prior = 1,
  ): Promise<CalibrationReport> {
    const final = await this.graph.invoke(
      { prediction, actuals, prior, report: null } as Record<string, unknown>,
      { configurable: { thread_id: `pa-${prediction.channel ?? 'all'}-${Date.now()}` } },
    );
    return final.report as CalibrationReport;
  }
}

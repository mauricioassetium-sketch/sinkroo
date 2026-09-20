import type { Pool } from 'pg';
import type { SwarmResult } from '@sinkroo/core';

/**
 * Pre-spend validation service (M3).
 * Delegates the prediction to GaiaBroker (endpoint /predict), which judges
 * the copy with the swarm and emits the predictive performance score.
 */

export interface PredictInput {
  copy: string;
  channel?: string;
  audience?: string;
}

export interface PreSpendPrediction {
  creativeId: string;
  preSpendScore: number;
  swarmScore: number;
  adjustments: Array<{ label: string; delta: number }>;
  risk: { level: string; reasons: string[] };
  recommendation: string;
}

export interface PredictResult {
  swarm: SwarmResult;
  prediction: PreSpendPrediction;
  brain: string;
}

const BROKER_URL = process.env.BROKER_URL ?? 'http://127.0.0.1:3100';

export async function predictPreSpend(input: PredictInput): Promise<PredictResult> {
  const res = await fetch(`${BROKER_URL}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new Error(`Broker responded ${res.status}: ${await res.text()}`);
  return (await res.json()) as PredictResult;
}

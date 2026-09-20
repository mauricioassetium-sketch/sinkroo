import type { Pool } from 'pg';
import type { SwarmResult } from '@sinkroo/core';

/**
 * Servicio de validación pre-spend (M3).
 * Delega la predicción en el GaiaBroker (endpoint /predict), que juzga
 * el copy con el enjambre y emite el score predictivo de desempeño.
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
  if (!res.ok) throw new Error(`Broker respondió ${res.status}: ${await res.text()}`);
  return (await res.json()) as PredictResult;
}

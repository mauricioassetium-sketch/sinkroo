import type { Creative } from '@sinkroo/core';
import type { SwarmResult } from '@sinkroo/core';

/**
 * API swarm service.
 *
 * Delegates all intelligence to GaiaBroker (apps/gaia-broker), which
 * encapsulates the real reasoning (LLM or GAIA endpoint). The API only
 * translates the incoming request and returns the verdict.
 */

export interface EvaluateInput {
  id: string;
  copy: string;
  imageUrl?: string;
  channel?: string;
  audience?: string;
}

export interface SwarmService {
  evaluateCreative(input: EvaluateInput): Promise<SwarmResult>;
}

/**
 * Implementation that calls the broker over HTTP.
 * Configurable via BROKER_URL (default http://localhost:3100).
 */
export class HttpSwarmService implements SwarmService {
  constructor(private readonly brokerUrl = process.env.BROKER_URL ?? 'http://127.0.0.1:3100') {}

  async evaluateCreative(input: EvaluateInput): Promise<SwarmResult> {
    const res = await fetch(`${this.brokerUrl}/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) throw new Error(`Broker responded ${res.status}: ${await res.text()}`);
    return (await res.json()) as SwarmResult;
  }
}

/** Factory (one service per process). */
let _service: SwarmService | undefined;
export function getSwarmService(): SwarmService {
  if (!_service) _service = new HttpSwarmService();
  return _service;
}

/** Helper compatible with previous code. */
export async function evaluateCreative(input: EvaluateInput): Promise<SwarmResult> {
  return getSwarmService().evaluateCreative(input);
}

import type { Creative } from '@sinkroo/core';
import type { SwarmResult } from '@sinkroo/core';

/**
 * Servicio de enjambre de la API.
 *
 * Delega toda la inteligencia en el GaiaBroker (apps/gaia-broker), que
 * encapsula el razonamiento real (LLM o endpoint GAIA). La API solo traduce
 * el request entrante y devuelve el veredicto.
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
 * Implementación que llama al broker por HTTP.
 * Configurable con BROKER_URL (default http://localhost:3100).
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
    if (!res.ok) throw new Error(`Broker respondió ${res.status}: ${await res.text()}`);
    return (await res.json()) as SwarmResult;
  }
}

/** Fábrica (un solo servicio por proceso). */
let _service: SwarmService | undefined;
export function getSwarmService(): SwarmService {
  if (!_service) _service = new HttpSwarmService();
  return _service;
}

/** Helper compatible con el código anterior. */
export async function evaluateCreative(input: EvaluateInput): Promise<SwarmResult> {
  return getSwarmService().evaluateCreative(input);
}

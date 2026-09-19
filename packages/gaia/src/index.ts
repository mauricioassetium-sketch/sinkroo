import type { AgentProfile, AgentVote, Creative } from '@sinkroo/core';
import { clampScore } from '@sinkroo/core';
import type { Evaluator } from '@sinkroo/engine';
import {
  HttpGaiaClient,
  LocalGaiaClient,
  type GaiaEndpointConfig,
  type GaiaEndpointClient,
} from './http.js';
import { systemPrompt, userPrompt } from './prompt.js';

/**
 * GaiaEvaluator — el "cerebro" del enjambre Sinkroo.
 *
 * Implementa la interfaz `Evaluator` del Engine: para cada agente del enjambre,
 * GAIA encarna su persona, juzga la pieza y devuelve votos razonados (uno por
 * dimensión prioritaria). La inteligencia vive en GAIA; el Engine solo orquesta.
 *
 * Dos backends intercambiables:
 *   - HttpGaiaClient  → llama a un endpoint real de GAIA (chat completions).
 *   - LocalGaiaClient → fallback determinista (sin red, para tests/offline).
 * Elegir cuál se usa es tarea de createGaiaEvaluator() según config/entorno.
 */

/** Firma de bajo nivel: (agente, pieza) -> votos. */
export type GaiaJudgeFn = (agent: AgentProfile, creative: Creative) => Promise<AgentVote[]>;

/** Envuelve un cliente en un Evaluator compatible con el Engine. */
export class GaiaEvaluator implements Evaluator {
  constructor(private readonly client: GaiaEndpointClient) {}

  async evaluate(agent: AgentProfile, creative: Creative): Promise<AgentVote[]> {
    return this.client.judge(agent, creative);
  }
}

export interface GaiaOptions {
  /** Config del endpoint GAIA. Si se omite, usa el fallback local. */
  endpoint?: GaiaEndpointConfig;
  /** Inyectar un cliente custom (para tests o integraciones especiales). */
  client?: GaiaEndpointClient;
}

/**
 * Fábrica: construye un GaiaEvaluator listo para enjambrar.
 * - Si hay `client`, lo usa tal cual.
 * - Si hay `endpoint`, usa HttpGaiaClient.
 * - Si no hay nada, usa LocalGaiaClient (corre offline, siempre).
 */
export function createGaiaEvaluator(options: GaiaOptions = {}): GaiaEvaluator {
  const client =
    options.client ??
    (options.endpoint ? new HttpGaiaClient(options.endpoint) : new LocalGaiaClient());
  return new GaiaEvaluator(client);
}

/** Helper para construir un voto tipado (clamp + forma canónica). */
export function makeVote(
  agent: AgentProfile,
  score: number,
  rationale: string,
  dimension?: AgentVote['dimension'],
): AgentVote {
  const dim = dimension ?? agent.priorities[0];
  return {
    agentId: agent.id,
    dimension: dim,
    score: clampScore(score),
    rationale,
  };
}

export {
  HttpGaiaClient,
  LocalGaiaClient,
  systemPrompt,
  userPrompt,
};
export type {
  GaiaEndpointClient,
  GaiaEndpointConfig,
};

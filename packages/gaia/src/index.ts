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
 * GaiaEvaluator — the "brain" of the Sinkroo swarm.
 *
 * Implements the Engine's `Evaluator` interface: for each swarm agent, GAIA
 * embodies its persona, judges the piece and returns reasoned votes (one per
 * priority dimension). The intelligence lives in GAIA; the Engine only
 * orchestrates.
 *
 * Two interchangeable backends:
 *   - HttpGaiaClient  → calls a real GAIA endpoint (chat completions).
 *   - LocalGaiaClient → deterministic fallback (offline, for tests/offline).
 * Choosing which one is used is createGaiaEvaluator()'s job per config/env.
 */

/** Low-level signature: (agent, piece) -> votes. */
export type GaiaJudgeFn = (agent: AgentProfile, creative: Creative) => Promise<AgentVote[]>;

/** Wraps a client into an Engine-compatible Evaluator. */
export class GaiaEvaluator implements Evaluator {
  constructor(private readonly client: GaiaEndpointClient) {}

  async evaluate(agent: AgentProfile, creative: Creative): Promise<AgentVote[]> {
    return this.client.judge(agent, creative);
  }
}

export interface GaiaOptions {
  /** GAIA endpoint config. If omitted, the local fallback is used. */
  endpoint?: GaiaEndpointConfig;
  /** Inject a custom client (for tests or special integrations). */
  client?: GaiaEndpointClient;
}

/**
 * Factory: builds a swarm-ready GaiaEvaluator.
 * - If there is a `client`, uses it as-is.
 * - If there is an `endpoint`, uses HttpGaiaClient.
 * - With neither, uses LocalGaiaClient (runs offline, always).
 */
export function createGaiaEvaluator(options: GaiaOptions = {}): GaiaEvaluator {
  const client =
    options.client ??
    (options.endpoint ? new HttpGaiaClient(options.endpoint) : new LocalGaiaClient());
  return new GaiaEvaluator(client);
}

/** Helper to build a typed vote (clamp + canonical shape). */
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

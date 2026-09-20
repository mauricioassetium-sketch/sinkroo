import type { AgentProfile, AgentVote, Creative, CreativeDimension } from '@sinkroo/core';
import { clampScore } from '@sinkroo/core';
import { systemPrompt, userPrompt } from './prompt.js';

/**
 * Generic HTTP client toward the GAIA brain.
 *
 * GAIA may be exposed as an OpenAI Chat Completions-compatible endpoint (or a
 * custom one). This adapter writes to that contract: sends the agent prompt
 * and parses the JSON response. Switching providers = changing baseUrl + key,
 * nothing more.
 */

export interface GaiaEndpointConfig {
  /** Endpoint base URL (e.g. https://your-gaia.orijins.app/v1). */
  baseUrl: string;
  /** Model to call. */
  model: string;
  /** Authorization token (optional for open endpoints). */
  apiKey?: string;
  /** Timeout ms per call. */
  timeoutMs?: number;
}

export interface GaiaEndpointClient {
  judge(agent: AgentProfile, creative: Creative): Promise<AgentVote[]>;
}

const DIMENSIONS = new Set<CreativeDimension>([
  'clarity', 'hook', 'credibility', 'urgency',
  'relevance', 'differentiation', 'emotion', 'ctr',
]);

/** Parsed result of a single model decision. */
interface RawVote {
  dimension?: string;
  score?: number | string;
  rationale?: string;
}

/** Real client: calls the GAIA endpoint over HTTP. */
export class HttpGaiaClient implements GaiaEndpointClient {
  constructor(private readonly cfg: GaiaEndpointConfig) {}

  async judge(agent: AgentProfile, creative: Creative): Promise<AgentVote[]> {
    const body = {
      model: this.cfg.model,
      messages: [
        { role: 'system', content: systemPrompt(agent) },
        { role: 'user', content: userPrompt(creative) },
      ],
      temperature: 0.4,
      response_format: { type: 'json_object' },
    };

    const res = await fetch(`${this.cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.cfg.apiKey ? { Authorization: `Bearer ${this.cfg.apiKey}` } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.cfg.timeoutMs ?? 30_000),
    });

    if (!res.ok) {
      throw new Error(`GAIA endpoint responded ${res.status}: ${await res.text()}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error('GAIA endpoint returned no content');

    return this.parseVotes(content, agent);
  }

  /** Parses the model JSON and normalizes into AgentVote[]. */
  private parseVotes(raw: string, agent: AgentProfile): AgentVote[] {
    // The model may wrap in ```json``` despite response_format.
    const cleaned = raw.replace(/```(?:json)?/gi, '').trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // last resort: extract the first JSON object
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (!m) throw new Error('Could not parse GAIA response as JSON');
      parsed = JSON.parse(m[0]);
    }

    const votes = (parsed as { votes?: RawVote[] })?.votes;
    if (!Array.isArray(votes)) throw new Error('GAIA response missing "votes" array');

    return votes
      .filter((v) => v.dimension && DIMENSIONS.has(v.dimension as CreativeDimension))
      .map((v) => ({
        agentId: agent.id,
        dimension: v.dimension as CreativeDimension,
        score: clampScore(Number(v.score ?? 0)),
        rationale: String(v.rationale ?? ''),
      }));
  }
}

/**
 * Deterministic local fallback — used when NO endpoint is configured.
 * A richer reference evaluator than the base heuristic: produces reasoned
 * per-dimension votes so the swarm runs complete. Replaced by HttpGaiaClient
 * as soon as URL+key exist.
 */
export class LocalGaiaClient implements GaiaEndpointClient {
  async judge(agent: AgentProfile, creative: Creative): Promise<AgentVote[]> {
    const copy = creative.copy || '';
    return agent.priorities.map((dimension) => ({
      agentId: agent.id,
      dimension,
      score: this.scoreFor(copy, dimension),
      rationale: this.rationaleFor(copy, dimension),
    }));
  }

  private scoreFor(copy: string, d: CreativeDimension): number {
    let s = 55;
    if (copy.length >= 40 && copy.length <= 300) s += 12;
    if (/\d/.test(copy)) s += 8;
    const urgent = /(now|today|last|only|limited time|left)/i.test(copy);
    if (d === 'hook') s += /^.{0,5}[!?]?[A-Z]/.test(copy) ? 6 : 0;
    if (d === 'urgency' && urgent) s += 15;
    if (d === 'hook' && urgent) s += 8;
    if (d === 'clarity' && copy.length > 20 && copy.length < 250) s += 6;
    if (d === 'credibility' && copy.length < 200) s += 6;
    if (d === 'ctr' && /\d/.test(copy)) s += 6;
    if (d === 'relevance' && /(for|you|your|yours)/i.test(copy)) s += 6;
    return clampScore(s);
  }

  private rationaleFor(copy: string, d: CreativeDimension): string {
    const base = `Copy of ${copy.length} chars`;
    if (d === 'hook') return `${base}: opening ${copy.length > 5 ? 'with' : 'without'} retention intent.`;
    if (d === 'clarity') return `${base}: message ${copy.length >= 20 ? 'legible' : 'too short'}.`;
    if (d === 'urgency') return `${base}: ${/(now|today|only|last)/i.test(copy) ? 'with' : 'without'} urgency trigger.`;
    if (d === 'credibility') return `${base}: tone ${copy.length < 200 ? 'restrained' : 'excessive'}.`;
    return `${base}: reference evaluation (dimension ${d}).`;
  }
}

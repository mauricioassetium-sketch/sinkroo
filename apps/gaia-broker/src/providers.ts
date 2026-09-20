import type { AgentProfile, AgentVote, Creative, CreativeDimension } from '@sinkroo/core';
import { clampScore } from '@sinkroo/core';

/**
 * GAIA connector layer — reasoning AND generation providers.
 *
 * The broker exposes ONE interface (`ReasoningProvider`) and behind it any AI
 * brain can live: an LLM (OpenAI/Anthropic/Gemini/Groq), or the real
 * GAIA-orijins endpoint when it exists. Switching brains = switching the
 * provider, without touching the engine or the API.
 */

export interface ReasoningProvider {
  readonly name: string;
  /** Judges a piece from an agent's standpoint (prioritized dimensions). */
  judge(agent: AgentProfile, creative: Creative): Promise<AgentVote[]>;
  /** Generates copy variants from a product brief. */
  generate(brief: CreativeBrief, count: number): Promise<string[]>;
}

/** Generation brief (M4): product + unique angle + audience + channel. */
export interface CreativeBrief {
  productName: string;
  usp: string;
  offer?: string;
  audience?: string;
  tone?: string;
  channel?: string;
  cta?: string;
}

/** Common config for a chat-completions-style provider. */
export interface ChatProviderConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
  authHeader?: 'Bearer' | 'x-api-key';
  timeoutMs?: number;
}

const DIMENSIONS = new Set<CreativeDimension>([
  'clarity', 'hook', 'credibility', 'urgency',
  'relevance', 'differentiation', 'emotion', 'ctr',
]);

const RUBRIC: Record<CreativeDimension, string> = {
  clarity: 'Is the message understood on first read?',
  hook: 'Do the first words stop the scroll?',
  credibility: 'Does it sound credible and verifiable?',
  urgency: 'Is there a real reason to act now?',
  relevance: 'Does it speak directly to the target audience?',
  differentiation: 'Does it stand out from competitors?',
  emotion: 'Does it trigger an emotional response?',
  ctr: 'Click probability?',
};

/** Generic chat-completions provider (OpenAI, Groq, DeepSeek, Gemini-compatible, etc.) */
export class ChatProvider implements ReasoningProvider {
  readonly name: string;
  private retries: number;
  private readonly maxRetries = 5;
  constructor(private readonly cfg: ChatProviderConfig) {
    this.name = `${cfg.model} @ ${cfg.baseUrl}`;
    this.retries = this.maxRetries;
  }

  async judge(agent: AgentProfile, creative: Creative): Promise<AgentVote[]> {
    const dims = agent.priorities.map((d) => `- ${d}: ${RUBRIC[d]}`).join('\n');
    const system = [
      `You are an ad evaluator embodying: "${agent.persona}".`,
      `Judge the piece from that standpoint, with no corporate filters.`,
      `Evaluate ONLY these dimensions:`,
      dims,
      `Respond with strict JSON: {"votes":[{"dimension":"<nombre>","score":<0-100>,"rationale":"<1 frase>"}]}`,
    ].join('\n');

    const content = await this.chat(system, `Copy: ${creative.copy || '(no copy)'}`, 0.4);
    return this.parseVotes(content, agent);
  }

  async generate(brief: CreativeBrief, count: number): Promise<string[]> {
    const n = Math.max(1, Math.min(count, 10));
    const system = [
      `You are a senior performance copywriter.`,
      `Generate ${n} ad copy variants for the following product.`,
      ``,
      `Producto: ${brief.productName}`,
      `Unique selling proposition (USP): ${brief.usp || '(unspecified — highlight it if present)'}`,
      `Offer/hook: ${brief.offer || '(no offer)'}`,
      `Audience: ${brief.audience || '(general)'}`,
      `Tone: ${brief.tone || 'direct, warm and clear'}`,
      `Channel: ${brief.channel || 'meta'}`,
      `CTA: ${brief.cta || 'act now'}`,
      ``,
      `Rules:`,
      `- Each variant must be distinct (different angle/hook), not a paraphrase of the previous.`,
      `- ALWAYS lean on the USP so the copy is not generic.`,
      `- 60-160 characters per variant.`,
      `- Respond with strict JSON: {"variants":["<copy 1>","<copy 2>",...]}`,
    ].join('\n');

    const content = await this.chat(system, `Generate ${n} variants.`, 0.8);
    return this.parseVariants(content, n);
  }

  /** Calls the chat/completions endpoint and returns the first message text. */
  private async chat(system: string, user: string, temperature: number): Promise<string> {
    const body = {
      model: this.cfg.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature,
      response_format: { type: 'json_object' },
    };

    const authHeader = this.cfg.authHeader ?? 'Bearer';
    const res = await fetch(`${this.cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${authHeader === 'Bearer' ? 'Bearer' : authHeader} ${this.cfg.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.cfg.timeoutMs ?? 30_000),
    });

    if (!res.ok) {
      if ((res.status === 429 || res.status === 503) && this.retries > 0) {
        await new Promise((r) => setTimeout(r, 900 * (this.maxRetries - this.retries + 1)));
        this.retries--;
        return this.chat(system, user, temperature);
      }
      throw new Error(`[${this.name}] HTTP ${res.status}: ${await res.text()}`);
    }

    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error(`[${this.name}] no content`);
    return content;
  }

  private parseVotes(raw: string, agent: AgentProfile): AgentVote[] {
    const parsed = this.parseJson(raw);
    const votes = (parsed as { votes?: Array<{ dimension?: string; score?: number | string; rationale?: string }> })?.votes;
    if (!Array.isArray(votes)) throw new Error('[provider] missing "votes"');
    return votes
      .filter((v) => v.dimension && DIMENSIONS.has(v.dimension as CreativeDimension))
      .map((v) => ({ agentId: agent.id, dimension: v.dimension as CreativeDimension, score: clampScore(Number(v.score ?? 0)), rationale: String(v.rationale ?? '') }));
  }

  private parseVariants(raw: string, count: number): string[] {
    const parsed = this.parseJson(raw);
    const arr = (parsed as { variants?: string[] })?.variants;
    if (!Array.isArray(arr) || arr.length === 0) throw new Error('[provider] missing "variants"');
    return arr
      .map((v) => String(v).trim())
      .filter((v) => v.length >= 20)
      .slice(0, count);
  }

  private parseJson(raw: string): unknown {
    const cleaned = raw.replace(/```(?:json)?/gi, '').trim();
    try { return JSON.parse(cleaned); }
    catch { const m = cleaned.match(/\{[\s\S]*\}/); if (!m) throw new Error('[provider] invalid JSON'); return JSON.parse(m[0]); }
  }
}

/**
 * Deterministic local provider — ALWAYS available as a fallback.
 * Not real AI; it is the floor that keeps the system from failing offline.
 */
export class LocalProvider implements ReasoningProvider {
  readonly name = 'local (fallback)';

  async judge(agent: AgentProfile, creative: Creative): Promise<AgentVote[]> {
    const copy = creative.copy || '';
    return agent.priorities.map((d) => ({
      agentId: agent.id,
      dimension: d,
      score: this.score(copy, d),
      rationale: `Copy ${copy.length} chars (dimension ${d})`,
    }));
  }

  async generate(brief: CreativeBrief, count: number): Promise<string[]> {
    const n = Math.max(1, Math.min(count, 10));
    const base = brief.usp ? ` ${brief.usp}.` : '';
    const cta = brief.cta || 'Discover it today';
    const out: string[] = [];
    for (let i = 0; i < n; i++) {
      const hook = this.hooks[i % this.hooks.length];
      out.push(`${hook} ${brief.productName}.${base} ${cta}.`);
    }
    return out;
  }

  private hooks = [
    'Stop searching.',
    'Last chance:',
    'This changes everything:',
    'What nobody told you:',
    'Attention:',
  ];

  private score(copy: string, d: CreativeDimension): number {
    let s = 55;
    if (copy.length >= 40 && copy.length <= 300) s += 12;
    if (/\d/.test(copy)) s += 8;
    if (/(now|today|only|last)/i.test(copy)) { if (d === 'urgency' || d === 'hook') s += 12; }
    if (d === 'clarity' && copy.length > 20 && copy.length < 250) s += 6;
    if (d === 'credibility' && copy.length < 200) s += 6;
    return clampScore(s);
  }
}

/**
 * Factory: picks the provider from the environment.
 * Priority: GAIA_ENDPOINT_URL (real orijins) > PROVIDER_* (LLM) > local.
 */
export function createProvider(): ReasoningProvider {
  const ori = process.env.GAIA_ENDPOINT_URL;
  if (ori) return new ChatProvider({ baseUrl: ori.replace(/\/$/, ''), model: process.env.GAIA_MODEL ?? 'gaia', apiKey: process.env.GAIA_API_KEY ?? '', authHeader: 'Bearer' });

  const base = process.env.PROVIDER_BASE_URL;
  const key = process.env.PROVIDER_API_KEY;
  if (base && key) {
    return new ChatProvider({
      baseUrl: base.replace(/\/$/, ''),
      model: process.env.PROVIDER_MODEL ?? 'default',
      apiKey: key,
      authHeader: (process.env.PROVIDER_AUTH ?? 'Bearer') as 'Bearer' | 'x-api-key',
    });
  }

  return new LocalProvider();
}

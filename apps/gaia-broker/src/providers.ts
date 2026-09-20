import type { AgentProfile, AgentVote, Creative, CreativeDimension } from '@sinkroo/core';
import { clampScore } from '@sinkroo/core';
import type { ConversationStage, Sender } from '@sinkroo/core';

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
  /**
   * M6 — one conversational sales turn. Given the sales context and the
   * recent history, responds with the agent's reply and the detected move.
   * Returns null when the brain cannot converse (provider is generation-only);
   * callers MUST fall back to the LocalProvider conversation.
   */
  converse?(ctx: SalesTurn): Promise<SalesConversationReply>;
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

/** One conversational turn the agent reasons over (M6). */
export interface SalesTurn {
  /** Current sales stage. */
  stage: ConversationStage;
  /** Recent history, oldest first. */
  history: Array<{ sender: Sender; text: string }>;
  /** Sales context (product, price, tone, language). */
  context: {
    businessName: string;
    productName: string;
    priceLabel?: string;
    usp?: string;
    tone?: string;
    language?: string;
    paymentUrl?: string;
  };
  /** Current lead score (0..100), to help the agent gauge interest. */
  leadScore: number;
}

/** The agent's reply plus the machine-readable move it implies. */
export interface SalesConversationReply {
  reply: string;
  nextStage: ConversationStage;
  leadScoreDelta: number;
  intent: string;
  requestPayment: boolean;
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

  async converse(turn: SalesTurn): Promise<SalesConversationReply> {
    const system = this.salesSystemPrompt(turn);
    const history = turn.history.map((m) => `${m.sender === 'lead' ? 'Lead' : 'Agent'}: ${m.text}`).join('\n');
    const user = [
      `Conversation so far:\n${history || '(start of conversation)'}`,
      ``,
      `Stage: ${turn.stage} — leadScore ${turn.leadScore}`,
      `The lead just sent the LAST message above. Reply as the agent.`,
    ].join('\n');

    const content = await this.chat(system, user, 0.5);
    const parsed = this.parseJson(content) as {
      reply?: string;
      nextStage?: string;
      leadScoreDelta?: number;
      intent?: string;
      requestPayment?: boolean;
    };
    if (!parsed.reply) throw new Error('[provider] missing "reply"');
    return {
      reply: String(parsed.reply).trim(),
      nextStage: (parsed.nextStage as ConversationStage) ?? turn.stage,
      leadScoreDelta: Number(parsed.leadScoreDelta ?? 0),
      intent: String(parsed.intent ?? ''),
      requestPayment: Boolean(parsed.requestPayment),
    };
  }

  private salesSystemPrompt(turn: SalesTurn): string {
    const c = turn.context;
    const lang = c.language || 'es';
    return [
      `You are ${c.businessName}'s warm, sharp sales agent selling "${c.productName}".`,
      `Always reply in ${lang}. Keep replies short (2-4 sentences), human, no lists.`,
      ``,
      `Offer: ${c.usp || '(highlight the strongest benefit)'}`,
      `Price: ${c.priceLabel || '(reveal only when asked or at closing)'}`,
      `Tone: ${c.tone || 'friendly and direct'}`,
      `Payment link available: ${c.paymentUrl ? 'yes' : 'no (do not mention payment yet)'}`,
      ``,
      `Sales stages and what to do for each:`,
      `- greeting: welcome, ask one light opening question.`,
      `- qualification: uncover problem, budget, timeline, authority — listen more than talk.`,
      `- presentation: recap their need, present the solution, 3 benefits max, offer a demo/next step.`,
      `- objection: acknowledge, reframe, add social proof, ask "does this address your concern?".`,
      `- closing: recap the offer, remove friction, point to the payment link when available.`,
      `- follow_up: check in, offer value, keep the door open.`,
      ``,
      `Detect the lead's signal and reply with STRICT JSON:`,
      `{"reply":"<your message>","nextStage":"<stage>","leadScoreDelta":<int>,"intent":"<short label>","requestPayment":<bool>}`,
      `- nextStage: where to go next (may stay).`,
      `- requestPayment: true ONLY at closing when ready to pay.`,
    ].join('\n');
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

  async converse(turn: SalesTurn): Promise<SalesConversationReply> {
    const c = turn.context;
    const last = turn.history[turn.history.length - 1]?.text?.toLowerCase() ?? '';
    // Simple deterministic funnel: pick reply by stage + signal.
    let reply: string;
    let nextStage = turn.stage;
    let intent = 'generic';
    let delta = 0;
    let requestPayment = false;

    if (/(^|\s)(hi|hola|hello|hey|buenas|interested|interesad)/.test(last)) {
      reply = `Hi! Thanks for reaching out about ${c.productName}. Quick question: what are you looking to solve?`;
      nextStage = 'qualification';
      intent = 'greeting';
    } else if (/(expensiv|caro|price|precio|costo|cost)/.test(last)) {
      reply = `Totally fair concern. ${c.productName}${c.usp ? ` — ${c.usp}.` : ' is built for outcomes, not just features.'} Does that address your worry?`;
      nextStage = 'objection';
      intent = 'objection_price';
    } else if (/(no me convence|not sure|doubt|duda|pensar|think)/.test(last)) {
      reply = `Take your time. Just so you know, ${c.usp ? c.usp : 'most clients see results quickly'}. Anything specific holding you back?`;
      nextStage = 'objection';
      intent = 'objection_hesitation';
    } else if (/(yes|si|ok|deal|count me in|avanza|proceed|buy|comprar|dale|let's go|vamos)/.test(last)) {
      reply = c.paymentUrl
        ? `Awesome — you can lock it in right here: ${c.paymentUrl}`
        : `Awesome! I'll set everything up. Stand by for the next step.`;
      nextStage = 'closing';
      intent = 'closing_signal';
      delta = 20;
      requestPayment = true;
    } else if (/(demo|mas info|más info|tell me more|cuentame|detalles|details)/.test(last)) {
      reply = `${c.usp ? c.usp + '. ' : ''}Here's the short version: ${c.productName} helps you get the outcome without the usual headache. Want me to walk you through it?`;
      nextStage = 'presentation';
      intent = 'info_request';
    } else {
      switch (turn.stage) {
        case 'greeting':
          reply = `Welcome! I help people get the most out of ${c.productName}. What are you looking for today?`;
          nextStage = 'qualification';
          intent = 'open';
          break;
        case 'qualification':
          reply = `Got it. On a scale of 1-10, how urgent is this for you right now?`;
          intent = 'qualify';
          delta = 10;
          break;
        case 'presentation':
          reply = `${c.productName}${c.priceLabel ? ` — ${c.priceLabel}` : ''}. ${c.usp || 'Built to deliver, not just promise.'} Shall we move forward?`;
          nextStage = 'closing';
          intent = 'pitch';
          break;
        case 'objection':
          reply = `Makes sense. What would it take for you to feel confident moving forward?`;
          intent = 'probe';
          break;
        case 'closing':
          reply = c.paymentUrl
            ? `Ready when you are: ${c.paymentUrl}`
            : `Alright, let's finalize — I'll send you everything you need.`;
          intent = 'close';
          requestPayment = true;
          break;
        case 'follow_up':
          reply = `Quick check-in — how's everything feeling so far? Anything I can clarify?`;
          intent = 'check_in';
          break;
      }
    }

    return { reply, nextStage, leadScoreDelta: delta, intent, requestPayment };
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

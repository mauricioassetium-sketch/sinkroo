import type { AgentProfile, AgentVote, Creative, CreativeDimension } from '@sinkroo/core';
import { clampScore } from '@sinkroo/core';

/**
 * Capa conectora de GAIA — providers de razonamiento Y generación.
 *
 * El broker expone UNA interfaz (`ReasoningProvider`) y detrás puede haber
 * cualquier cerebro de IA: un LLM (OpenAI/Anthropic/Gemini/Groq), o el endpoint
 * real de GAIA-orijins cuando exista. Cambiar de cerebro = cambiar el provider,
 * sin tocar el motor ni la API.
 */

export interface ReasoningProvider {
  readonly name: string;
  /** Juzga una pieza desde el lugar de un agente (dimensiones priorizadas). */
  judge(agent: AgentProfile, creative: Creative): Promise<AgentVote[]>;
  /** Genera variantes de copy a partir de un brief de producto. */
  generate(brief: CreativeBrief, count: number): Promise<string[]>;
}

/** Brief de generación (M4): producto + ángulo único + público + canal. */
export interface CreativeBrief {
  productName: string;
  usp: string;
  offer?: string;
  audience?: string;
  tone?: string;
  channel?: string;
  cta?: string;
}

/** Configuración común de un provider tipo chat-completions. */
export interface ChatProviderConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
  authHeader?: 'Bearer' | 'x-api-key';
  timeoutMs?: number;
}

const DIMENSIONS = new Set<CreativeDimension>([
  'claridad', 'gancho', 'credibilidad', 'urgencia',
  'relevancia', 'diferenciacion', 'emocion', 'ccr',
]);

const RUBRIC: Record<CreativeDimension, string> = {
  claridad: '¿Se entiende el mensaje a la primera?',
  gancho: '¿Las primeras palabras detienen el scroll?',
  credibilidad: '¿Suena creíble y verificable?',
  urgencia: '¿Hay razón real para actuar ahora?',
  relevancia: '¿Le habla directo al público objetivo?',
  diferenciacion: '¿Se distingue de la competencia?',
  emocion: '¿Provoca reacción emocional?',
  ccr: '¿Probabilidad de clic?',
};

/** Provider genérico tipo chat-completions (OpenAI, Groq, DeepSeek, Gemini-compatible, etc.) */
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
      `Eres un evaluador de anuncios encarnando a: "${agent.persona}".`,
      `Juzga la pieza desde ese lugar, sin filtros corporativos.`,
      `Evalúa SOLO estas dimensiones:`,
      dims,
      `Responde JSON estricto: {"votes":[{"dimension":"<nombre>","score":<0-100>,"rationale":"<1 frase>"}]}`,
    ].join('\n');

    const content = await this.chat(system, `Copy: ${creative.copy || '(sin copy)'}`, 0.4);
    return this.parseVotes(content, agent);
  }

  async generate(brief: CreativeBrief, count: number): Promise<string[]> {
    const n = Math.max(1, Math.min(count, 10));
    const system = [
      `Eres un copywriter senior de performance.`,
      `Genera ${n} variantes de copy de anuncio para el siguiente producto.`,
      ``,
      `Producto: ${brief.productName}`,
      `Propuesta única (USP): ${brief.usp || '(sin especificar — resáltala si la hay)'}`,
      `Oferta/gancho: ${brief.offer || '(sin oferta)'}`,
      `Público: ${brief.audience || '(general)'}`,
      `Tono: ${brief.tone || 'directo, cercano y claro'}`,
      `Canal: ${brief.channel || 'meta'}`,
      `CTA: ${brief.cta || 'actúa ahora'}`,
      ``,
      `Reglas:`,
      `- Cada variante debe ser distinta (distinto ángulo/gancho), no parafraseo de la anterior.`,
      `- Apóyate SIEMPRE en la USP para que no sea un copy genérico.`,
      `- 60-160 caracteres por variante.`,
      `- Responde JSON estricto: {"variants":["<copy 1>","<copy 2>",...]}`,
    ].join('\n');

    const content = await this.chat(system, `Genera ${n} variantes.`, 0.8);
    return this.parseVariants(content, n);
  }

  /** Llama al endpoint chat/completions y devuelve el texto del primer mensaje. */
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
    if (!content) throw new Error(`[${this.name}] sin contenido`);
    return content;
  }

  private parseVotes(raw: string, agent: AgentProfile): AgentVote[] {
    const parsed = this.parseJson(raw);
    const votes = (parsed as { votes?: Array<{ dimension?: string; score?: number | string; rationale?: string }> })?.votes;
    if (!Array.isArray(votes)) throw new Error('[provider] sin "votes"');
    return votes
      .filter((v) => v.dimension && DIMENSIONS.has(v.dimension as CreativeDimension))
      .map((v) => ({ agentId: agent.id, dimension: v.dimension as CreativeDimension, score: clampScore(Number(v.score ?? 0)), rationale: String(v.rationale ?? '') }));
  }

  private parseVariants(raw: string, count: number): string[] {
    const parsed = this.parseJson(raw);
    const arr = (parsed as { variants?: string[] })?.variants;
    if (!Array.isArray(arr) || arr.length === 0) throw new Error('[provider] sin "variants"');
    return arr
      .map((v) => String(v).trim())
      .filter((v) => v.length >= 20)
      .slice(0, count);
  }

  private parseJson(raw: string): unknown {
    const cleaned = raw.replace(/```(?:json)?/gi, '').trim();
    try { return JSON.parse(cleaned); }
    catch { const m = cleaned.match(/\{[\s\S]*\}/); if (!m) throw new Error('[provider] JSON inválido'); return JSON.parse(m[0]); }
  }
}

/**
 * Provider local determinista — SIEMPRE disponible como fallback.
 * No es IA real; es el piso que evita que el sistema se caiga sin red.
 */
export class LocalProvider implements ReasoningProvider {
  readonly name = 'local (fallback)';

  async judge(agent: AgentProfile, creative: Creative): Promise<AgentVote[]> {
    const copy = creative.copy || '';
    return agent.priorities.map((d) => ({
      agentId: agent.id,
      dimension: d,
      score: this.score(copy, d),
      rationale: `Copy ${copy.length} chars (dimensión ${d})`,
    }));
  }

  async generate(brief: CreativeBrief, count: number): Promise<string[]> {
    const n = Math.max(1, Math.min(count, 10));
    const base = brief.usp ? ` ${brief.usp}.` : '';
    const cta = brief.cta || 'Descúbrelo hoy';
    const out: string[] = [];
    for (let i = 0; i < n; i++) {
      const hook = this.hooks[i % this.hooks.length];
      out.push(`${hook} ${brief.productName}.${base} ${cta}.`);
    }
    return out;
  }

  private hooks = [
    'Deja de buscar.',
    'Última oportunidad:',
    'Esto cambia todo:',
    'Lo que nadie te dijo:',
    'Atención:',
  ];

  private score(copy: string, d: CreativeDimension): number {
    let s = 55;
    if (copy.length >= 40 && copy.length <= 300) s += 12;
    if (/\d/.test(copy)) s += 8;
    if (/(ahora|hoy|solo|últim)/i.test(copy)) { if (d === 'urgencia' || d === 'gancho') s += 12; }
    if (d === 'claridad' && copy.length > 20 && copy.length < 250) s += 6;
    if (d === 'credibilidad' && copy.length < 200) s += 6;
    return clampScore(s);
  }
}

/**
 * Fábrica: elige el provider según entorno.
 * Prioridad: GAIA_ENDPOINT_URL (orijins real) > PROVIDER_* (LLM) > local.
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

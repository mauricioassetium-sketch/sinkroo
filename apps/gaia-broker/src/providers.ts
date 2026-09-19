import type { AgentProfile, AgentVote, Creative, CreativeDimension } from '@sinkroo/core';
import { clampScore } from '@sinkroo/core';

/**
 * Capa conectora de GAIA — providers de razonamiento.
 *
 * El broker expone UNA interfaz (`ReasoningProvider`) y detrás puede haber
 * cualquier cerebro de IA: un LLM (OpenAI/Anthropic/Gemini/Groq), o el endpoint
 * real de GAIA-orijins cuando exista. Cambiar de cerebro = cambiar el provider,
 * sin tocar el motor ni la API.
 */

export interface ReasoningProvider {
  readonly name: string;
  judge(agent: AgentProfile, creative: Creative): Promise<AgentVote[]>;
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

/** Provider genérico tipo chat-completions (funciona con OpenAI, Groq, DeepSeek, etc.) */
export class ChatProvider implements ReasoningProvider {
  readonly name: string;
  constructor(private readonly cfg: ChatProviderConfig) {
    this.name = `${cfg.model} @ ${cfg.baseUrl}`;
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

    const body = {
      model: this.cfg.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: `Copy: ${creative.copy || '(sin copy)'}` },
      ],
      temperature: 0.4,
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

    if (!res.ok) throw new Error(`[${this.name}] HTTP ${res.status}: ${await res.text()}`);

    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error(`[${this.name}] sin contenido`);

    return this.parse(content, agent);
  }

  private parse(raw: string, agent: AgentProfile): AgentVote[] {
    const cleaned = raw.replace(/```(?:json)?/gi, '').trim();
    let parsed: unknown;
    try { parsed = JSON.parse(cleaned); }
    catch { const m = cleaned.match(/\{[\s\S]*\}/); if (!m) throw new Error('[provider] JSON inválido'); parsed = JSON.parse(m[0]); }
    const votes = (parsed as { votes?: Array<{ dimension?: string; score?: number | string; rationale?: string }> })?.votes;
    if (!Array.isArray(votes)) throw new Error('[provider] sin "votes"');
    return votes
      .filter((v) => v.dimension && DIMENSIONS.has(v.dimension as CreativeDimension))
      .map((v) => ({ agentId: agent.id, dimension: v.dimension as CreativeDimension, score: clampScore(Number(v.score ?? 0)), rationale: String(v.rationale ?? '') }));
  }
}

/**
 * Provider local determinista — SIEMPRE disponible como fallback.
 * No es IA real; es el piso que evita que el enjambre se caiga sin red.
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
  // 1) Endpoint real de GAIA-orijins (futuro): apuntar y listo.
  const ori = process.env.GAIA_ENDPOINT_URL;
  if (ori) return new ChatProvider({ baseUrl: ori.replace(/\/$/, ''), model: process.env.GAIA_MODEL ?? 'gaia', apiKey: process.env.GAIA_API_KEY ?? '', authHeader: 'Bearer' });

  // 2) LLM configurable por entorno (OpenAI/Groq/DeepSeek/Gemini-compatible).
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

  // 3) Fallback local (siempre opera).
  return new LocalProvider();
}

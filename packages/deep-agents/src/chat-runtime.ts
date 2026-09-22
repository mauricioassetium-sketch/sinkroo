/**
 * Runtime de chat para los grafos de los Deep Agents.
 *
 * NO usa @langchain/openai (exige node>=22; el Dockerfile de Sinkroo usa node:20).
 * En su lugar, replica el mismo patrón fetch chat-completions del ChatProvider del
 * broker: mismas env vars (PROVIDER_BASE_URL / PROVIDER_MODEL / PROVIDER_API_KEY /
 * PROVIDER_AUTH, GAIA_ENDPOINT_URL), mismo comportamiento de reintentos — para que
 * el VPS configure UNA sola capa de credenciales.
 */

import type { ChatRuntimeConfig } from './types.js';

export class ChatRuntimeError extends Error {
  constructor(msg: string, public readonly status?: number) {
    super(msg);
    this.name = 'ChatRuntimeError';
  }
}

export function resolveChatConfigFromEnv(env: NodeJS.ProcessEnv = process.env): ChatRuntimeConfig | undefined {
  // Prioridad idéntica a createProvider() del broker: GAIA real > cualquier LLM compatible.
  const gaiaUrl = env.GAIA_ENDPOINT_URL;
  if (gaiaUrl) {
    return {
      baseUrl: gaiaUrl.replace(/\/$/, ''),
      model: env.GAIA_MODEL ?? 'gaia',
      apiKey: env.GAIA_API_KEY ?? '',
      authHeader: 'Bearer',
    };
  }
  const base = env.PROVIDER_BASE_URL;
  const key = env.PROVIDER_API_KEY;
  if (base && key) {
    return {
      baseUrl: base.replace(/\/$/, ''),
      model: env.PROVIDER_MODEL ?? 'default',
      apiKey: key,
      authHeader: (env.PROVIDER_AUTH ?? 'Bearer') as 'Bearer' | 'x-api-key',
    };
  }
  return undefined;
}

export class ChatRuntime {
  private retries: number;
  private readonly maxRetries = 3;
  constructor(private readonly cfg: ChatRuntimeConfig) {
    this.retries = this.maxRetries;
  }

  /** Llamada chat-completions con salida JSON estricta (response_format json_object). */
  async json<T>(system: string, user: string): Promise<T> {
    const raw = await this.raw(system, user);
    return this.parse<T>(raw);
  }

  async raw(system: string, user: string): Promise<string> {
    const body = {
      model: this.cfg.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: this.cfg.temperature ?? 0.4,
      response_format: { type: 'json_object' },
    };
    const authHeader = this.cfg.authHeader ?? 'Bearer';
    const res = await fetch(`${this.cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${authHeader} ${this.cfg.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.cfg.timeoutMs ?? 30_000),
    });
    if (!res.ok) {
      if ((res.status === 429 || res.status === 503) && this.retries > 0) {
        await new Promise((r) => setTimeout(r, 900 * (this.maxRetries - this.retries + 1)));
        this.retries--;
        return this.raw(system, user);
      }
      throw new ChatRuntimeError(`[${this.cfg.model}] HTTP ${res.status}: ${await res.text()}`, res.status);
    }
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new ChatRuntimeError(`[${this.cfg.model}] no content`);
    return content;
  }

  private parse<T>(raw: string): T {
    const cleaned = raw.replace(/```(?:json)?/gi, '').trim();
    try {
      return JSON.parse(cleaned) as T;
    } catch {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (!m) throw new ChatRuntimeError('invalid JSON from model');
      return JSON.parse(m[0]) as T;
    }
  }
}

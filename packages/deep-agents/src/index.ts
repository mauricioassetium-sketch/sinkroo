/**
 * @sinkroo/deep-agents — Deep Agents de Sinkroo.
 *
 * Factory único: creas el agente por su id; la memoria se particiona por userId
 * en el thread_id del grafo (ADR-0005).
 */

import { ChatRuntime, resolveChatConfigFromEnv } from './chat-runtime.js';
import { MarketAnalystAgent, MarketingStrategistAgent, CreativeStrategistAgent, DeepAgent } from './agents.js';
import type { DeepAgentId, ChatRuntimeConfig } from './types.js';

export { DeepAgent, MarketAnalystAgent, MarketingStrategistAgent, CreativeStrategistAgent };
export { ChatRuntime, resolveChatConfigFromEnv } from './chat-runtime.js';
export type { DeepAgentId, DeepAgentTask, DeepAgentResult, BusinessContext, ChatRuntimeConfig, UserId } from './types.js';
export { resultSchema } from './agents.js';

/** Crea un Deep Agent por su id. `runtime` si ya tienes uno; si no, se resuelve de env. */
export function createDeepAgent(id: DeepAgentId, runtime?: ChatRuntime): DeepAgent {
  const rt = runtime ?? createDefaultRuntime();
  switch (id) {
    case 'market-analyst':
      return new MarketAnalystAgent(rt);
    case 'marketing-strategist':
      return new MarketingStrategistAgent(rt);
    case 'creative-strategist':
      return new CreativeStrategistAgent(rt);
    default: {
      const _exhaustive: never = id;
      throw new Error(`[deep-agents] unknown agent: ${_exhaustive}`);
    }
  }
}

function createDefaultRuntime(): ChatRuntime {
  const cfg = resolveChatConfigFromEnv();
  if (!cfg) {
    // Sin credenciales: runtime en modo "offline" — devuelve respuestas deterministas
    // para que los grafos se puedan validar sin red (ver scripts/verify-deep-agents.mjs).
    return new ChatRuntime({
      baseUrl: 'http://offline.invalid',
      model: 'offline',
      apiKey: '',
    });
  }
  return new ChatRuntime(cfg);
}

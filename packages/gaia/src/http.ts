import type { AgentProfile, AgentVote, Creative, CreativeDimension } from '@sinkroo/core';
import { clampScore } from '@sinkroo/core';
import { systemPrompt, userPrompt } from './prompt.js';

/**
 * Cliente HTTP genérico hacia el cerebro de GAIA.
 *
 * GAIA puede exponerse como un endpoint compatible con OpenAI Chat Completions
 * (o uno propio). Este adapter escribe a ese contrato: envía el prompt del
 * agente y parsea la respuesta JSON. Cambiar de proveedor = cambiar baseUrl + key,
 * nada más.
 */

export interface GaiaEndpointConfig {
  /** URL base del endpoint (ej. https://tu-gaia.orijins.app/v1). */
  baseUrl: string;
  /** Modelo a invocar. */
  model: string;
  /** Token de autorización (opcional para endpoints abiertos). */
  apiKey?: string;
  /** Timeout ms por llamada. */
  timeoutMs?: number;
}

export interface GaiaEndpointClient {
  judge(agent: AgentProfile, creative: Creative): Promise<AgentVote[]>;
}

const DIMENSIONS = new Set<CreativeDimension>([
  'claridad', 'gancho', 'credibilidad', 'urgencia',
  'relevancia', 'diferenciacion', 'emocion', 'ccr',
]);

/** Resultado parseado de una sola decisión del modelo. */
interface RawVote {
  dimension?: string;
  score?: number | string;
  rationale?: string;
}

/** Cliente real: llama al endpoint de GAIA por HTTP. */
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
      throw new Error(`GAIA endpoint respondió ${res.status}: ${await res.text()}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error('GAIA endpoint no devolvió contenido');

    return this.parseVotes(content, agent);
  }

  /** Parsea el JSON del modelo y lo normaliza a AgentVote[]. */
  private parseVotes(raw: string, agent: AgentProfile): AgentVote[] {
    // El modelo puede envolver en ```json``` a pesar del response_format.
    const cleaned = raw.replace(/```(?:json)?/gi, '').trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // último recurso: extraer el primer objeto JSON
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (!m) throw new Error('No se pudo parsear la respuesta de GAIA como JSON');
      parsed = JSON.parse(m[0]);
    }

    const votes = (parsed as { votes?: RawVote[] })?.votes;
    if (!Array.isArray(votes)) throw new Error('Respuesta de GAIA sin array "votes"');

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
 * Fallback local determinista — usado cuando NO hay endpoint configurado.
 * Es un evaluador de referencia más rico que la heurística base: produce
 * votos razonados por dimensión para que el enjambre corra completo.
 * Lo reemplazamos por HttpGaiaClient en cuanto exista URL+key.
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
    const urgent = /(ahora|hoy|últim|solo|por tiempo limitado|queda)/i.test(copy);
    if (d === 'gancho') s += /^.{0,5}[¿¡]?[A-ZÁÉÍÓÚ]/.test(copy) ? 6 : 0;
    if (d === 'urgencia' && urgent) s += 15;
    if (d === 'gancho' && urgent) s += 8;
    if (d === 'claridad' && copy.length > 20 && copy.length < 250) s += 6;
    if (d === 'credibilidad' && copy.length < 200) s += 6;
    if (d === 'ccr' && /\d/.test(copy)) s += 6;
    if (d === 'relevancia' && /(para|tu|usted|vos|ti)/i.test(copy)) s += 6;
    return clampScore(s);
  }

  private rationaleFor(copy: string, d: CreativeDimension): string {
    const base = `Copy de ${copy.length} caracteres`;
    if (d === 'gancho') return `${base}: apertura ${copy.length > 5 ? 'con' : 'sin'} intención de retención.`;
    if (d === 'claridad') return `${base}: mensaje ${copy.length >= 20 ? 'legible' : 'demasiado corto'}.`;
    if (d === 'urgencia') return `${base}: ${/(ahora|hoy|solo|últim)/i.test(copy) ? 'con' : 'sin'} disparador de urgencia.`;
    if (d === 'credibilidad') return `${base}: tono ${copy.length < 200 ? 'contenido' : 'excesivo'}.`;
    return `${base}: evaluación de referencia (dimensión ${d}).`;
  }
}

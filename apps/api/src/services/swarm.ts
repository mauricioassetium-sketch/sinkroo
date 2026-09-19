import { SwarmEngine, DEFAULT_AGENTS } from '@sinkroo/engine';
import { createGaiaEvaluator } from '@sinkroo/gaia';
import type { Creative } from '@sinkroo/core';

/**
 * Servicio de enjambre: expone la evaluación de una pieza como operación
 * de negocio. Usa GAIA como cerebro (endpoint si GAIA_ENDPOINT_URL está
 * configurado, fallback local si no).
 */

function buildEngine() {
  const endpointUrl = process.env.GAIA_ENDPOINT_URL;
  const evaluator = createGaiaEvaluator(
    endpointUrl
      ? { endpoint: { baseUrl: endpointUrl, model: process.env.GAIA_MODEL ?? 'gaia-sinkroo' } }
      : {},
  );
  return new SwarmEngine({ agents: DEFAULT_AGENTS, evaluator });
}

/** Evalúa un creative y devuelve el resultado agregado (tipado). */
export async function evaluateCreative(input: {
  id: string;
  copy: string;
  imageUrl?: string;
  channel?: string;
  audience?: string;
}) {
  const creative: Creative = {
    id: input.id,
    copy: input.copy,
    imageUrl: input.imageUrl,
    channel: input.channel ?? 'meta',
    audience: input.audience,
  };
  const engine = buildEngine();
  return engine.evaluate(creative);
}

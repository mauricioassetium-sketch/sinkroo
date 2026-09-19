import type { AgentProfile, Creative, CreativeDimension } from '@sinkroo/core';

/**
 * Prompts de GAIA para el enjambre.
 *
 * Armar el prompt de cada agente por separado es lo que hace a GAIA distinta
 * de una heurística: GAIA ENCARNA a cada persona y juzga desde ese lugar.
 * El prompt traduce el perfil del agente (persona + prioridades) a una tarea
 * de evaluación concreta, pidiendo un voto razonado por cada dimensión.
 */

/** Rúbrica corta por dimensión, para guiar el juicio del agente. */
const RUBRIC: Record<CreativeDimension, string> = {
  claridad:
    '¿Se entiende el mensaje a la primera? ¿Sin ambigüedad ni jerga que confunda?',
  gancho:
    '¿Las primeras palabras detienen el scroll? ¿Provocan curiosidad o deseo inmediato?',
  credibilidad:
    '¿Suena creíble y verificable? ¿Evita promesas exageradas que generan desconfianza?',
  urgencia:
    '¿Hay una razón real para actuar ahora y no después? ¿Sin caer en presión barata?',
  relevancia:
    '¿Le habla directamente al público objetivo y a su dolor/contexto?',
  diferenciacion:
    '¿Se distingue de la competencia? ¿Tiene un ángulo propio o es genérico?',
  emocion:
    '¿Genera una reacción emocional (deseo, alivio, aspiración, seguridad)?',
  ccr: '¿Qué tan probable es que alguien haga clic? ¿La promesa + llamado a la acción son fuertes?',
};

/** Construye el prompt del sistema para un agente. */
export function systemPrompt(agent: AgentProfile): string {
  const dims = agent.priorities.map((d) => `- ${d}: ${RUBRIC[d]}`).join('\n');
  return [
    `Eres un evaluador de anuncios encarnando a: "${agent.persona}".`,
    `Juzga la pieza únicamente desde ese lugar, SIN filtros corporativos.`,
    ``,
    `Debes evaluar SOLO estas dimensiones (las que tu perfil prioriza):`,
    dims,
    ``,
    `Salida OBLIGATORIA: devuelve JSON estricto, sin markdown ni prosa, con la forma:`,
    `{"votes":[{"dimension":"<nombre>","score":<0-100>,"rationale":"<1 frase en español, por qué>"}]}`,
    `Un voto POR dimensión prioritaria. scores enteros 0-100. rationale corto y específico a la pieza.`,
  ].join('\n');
}

/** Construye el prompt del usuario (la pieza a juzgar). */
export function userPrompt(creative: Creative): string {
  const parts = [`Copy del anuncio:`, creative.copy || '(sin copy)'];
  if (creative.audience) parts.push(`Audiencia objetivo: ${creative.audience}`);
  if (creative.channel) parts.push(`Canal: ${creative.channel}`);
  if (creative.imageUrl) parts.push(`Imagen (URL): ${creative.imageUrl}`);
  return parts.join('\n');
}

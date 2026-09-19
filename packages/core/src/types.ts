/**
 * Contrato de datos de Sinkroo.
 *
 * Todo lo que cruza la frontera entre GAIA (orquestador), el Sinkroo Engine
 * (motor de enjambre) y la API pasa por estos tipos. Cambiarlos es una
 * decisión de arquitectura, no un detalle local.
 */

/** Puntaje 0..100. 0 = catastrófico, 100 = impecable. */
export type Score = number;

/** Dimensión que un agente evalúa sobre una pieza creativa. */
export const CREATIVE_DIMENSIONS = [
  'claridad',
  'gancho',
  'credibilidad',
  'urgencia',
  'relevancia',
  'diferenciacion',
  'emocion',
  'ccr', // click-through-rate estimado (conversión)
] as const;

export type CreativeDimension = (typeof CREATIVE_DIMENSIONS)[number];

/** Una pieza creativa que se somete al enjambre. */
export interface Creative {
  /** id estable de la pieza. */
  id: string;
  /** Copy / texto del anuncio. */
  copy: string;
  /** URL de la imagen (opcional en Etapa 0). */
  imageUrl?: string;
  /** Mensaje de voz / toma de locución (opcional en Etapa 0). */
  voiceUrl?: string;
  /** Contexto mínimo: a quién va dirigida. */
  audience?: string;
  /** Canal objetivo (meta, google, tiktok...). */
  channel?: string;
}

/** Perfil de un agente del enjambre: a quién representa. */
export interface AgentProfile {
  id: string;
  /** Rol / persona que encarna (ej. 'comprador_impulsivo', 'cm_esceptico'). */
  persona: string;
  /** Peso relativo del voto de este agente (default 1). */
  weight?: number;
  /** Criterios que prioriza este agente. */
  priorities: CreativeDimension[];
}

/** Voto individual de un agente sobre una pieza. */
export interface AgentVote {
  agentId: string;
  dimension: CreativeDimension;
  score: Score;
  /** Razonamiento en lenguaje natural del agente. */
  rationale: string;
}

/** Resultado del enjambre sobre una pieza creativa. */
export interface SwarmResult {
  creativeId: string;
  /** Promedio ponderado global 0..100. */
  overallScore: Score;
  /** Desglose por dimensión (promedios ponderados). */
  dimensionScores: Record<CreativeDimension, Score>;
  /** Votos individuales (trazabilidad completa). */
  votes: AgentVote[];
  /** Veredicto legible derivado del score. */
  verdict: SwarmVerdict;
  /** Timestamp de la evaluación. */
  evaluatedAt: string;
}

export type SwarmVerdict =
  | { kind: 'go'; label: 'Aprobar y lanzar' }
  | { kind: 'review'; label: 'Revisar antes de lanzar' }
  | { kind: 'stop'; label: 'Rehacer' };

/** Umbrales de decisión (ajustables, centralizados aquí). */
export const SCORE_THRESHOLDS = {
  /** >= 80 → aprobar. */
  GO: 80,
  /** >= 60 → revisar. */
  REVIEW: 60,
} as const;

/** Deriva el veredicto a partir de un score. */
export function deriveVerdict(score: Score): SwarmVerdict {
  if (score >= SCORE_THRESHOLDS.GO) return { kind: 'go', label: 'Aprobar y lanzar' };
  if (score >= SCORE_THRESHOLDS.REVIEW) return { kind: 'review', label: 'Revisar antes de lanzar' };
  return { kind: 'stop', label: 'Rehacer' };
}

/** Clamp de un score al rango 0..100. */
export function clampScore(n: number): Score {
  return Math.max(0, Math.min(100, Math.round(n)));
}

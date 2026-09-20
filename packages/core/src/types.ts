/**
 * Sinkroo data contract.
 *
 * Everything crossing the boundary between GAIA (orchestrator), the Sinkroo
 * Engine (swarm engine) and the API goes through these types. Changing them
 * is an architecture decision, not a local detail.
 */

/** Score 0..100. 0 = catastrophic, 100 = flawless. */
export type Score = number;

/** Dimension an agent scores on a creative piece. */
export const CREATIVE_DIMENSIONS = [
  'clarity',
  'hook',
  'credibility',
  'urgency',
  'relevance',
  'differentiation',
  'emotion',
  'ctr', // estimated click-through-rate (conversion)
] as const;

export type CreativeDimension = (typeof CREATIVE_DIMENSIONS)[number];

/** A creative piece submitted to the swarm. */
export interface Creative {
  /** Stable id for the piece. */
  id: string;
  /** Ad copy / text. */
  copy: string;
  /** Image URL (optional in Stage 0). */
  imageUrl?: string;
  /** Voice message / voiceover take (optional in Stage 0). */
  voiceUrl?: string;
  /** Minimal context: who it targets. */
  audience?: string;
  /** Target channel (meta, google, tiktok...). */
  channel?: string;
}

/** Swarm agent profile: who it embodies. */
export interface AgentProfile {
  id: string;
  /** Role / persona it embodies (e.g. 'impulsive_buyer', 'skeptical_cm'). */
  persona: string;
  /** Relative weight of this agent's vote (default 1). */
  weight?: number;
  /** Dimensions this agent prioritizes. */
  priorities: CreativeDimension[];
}

/** A single agent vote on a piece. */
export interface AgentVote {
  agentId: string;
  dimension: CreativeDimension;
  score: Score;
  /** Agent's natural-language reasoning. */
  rationale: string;
}

/** Swarm result for a creative piece. */
export interface SwarmResult {
  creativeId: string;
  /** Weighted global average 0..100. */
  overallScore: Score;
  /** Per-dimension breakdown (weighted averages). */
  dimensionScores: Record<CreativeDimension, Score>;
  /** Individual votes (full traceability). */
  votes: AgentVote[];
  /** Human-readable verdict derived from the score. */
  verdict: SwarmVerdict;
  /** Evaluation timestamp. */
  evaluatedAt: string;
}

export type SwarmVerdict =
  | { kind: 'go'; label: 'Approve & launch' }
  | { kind: 'review'; label: 'Review before launch' }
  | { kind: 'stop'; label: 'Rework' };

/** Decision thresholds (tunable, centralized here). */
export const SCORE_THRESHOLDS = {
  /** >= 80 → approve. */
  GO: 80,
  /** >= 60 → review. */
  REVIEW: 60,
} as const;

/** Derives the verdict from a score. */
export function deriveVerdict(score: Score): SwarmVerdict {
  if (score >= SCORE_THRESHOLDS.GO) return { kind: 'go', label: 'Approve & launch' };
  if (score >= SCORE_THRESHOLDS.REVIEW) return { kind: 'review', label: 'Review before launch' };
  return { kind: 'stop', label: 'Rework' };
}

/** Clamp a score to the 0..100 range. */
export function clampScore(n: number): Score {
  return Math.max(0, Math.min(100, Math.round(n)));
}

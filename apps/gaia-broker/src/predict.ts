import type { Creative, SwarmResult, CreativeDimension } from '@sinkroo/core';
import { clampScore } from '@sinkroo/core';

/**
 * M3 — Pre-spend validation.
 *
 * Converts the swarm verdict (a QUALITY judgment) into a PERFORMANCE
 * prediction (0-100): the probability the piece performs and does not burn
 * budget before spending real money on ads.
 *
 * Transparent, not a black box: starts from the swarm overallScore and applies
 * documented adjustments — confidence, channel fit, and Meta risk.
 */

export type RiskLevel = 'low' | 'medium' | 'high';

export interface PreSpendRisk {
  level: RiskLevel;
  reasons: string[];
}

export interface PreSpendPrediction {
  creativeId: string;
  /** Final 0-100 pre-spend performance prediction. */
  preSpendScore: number;
  /** Raw swarm score (input). */
  swarmScore: number;
  /** Breakdown of adjustments applied (transparency). */
  adjustments: {
    label: string;
    delta: number;
  }[];
  /** Risk level of spending money on this. */
  risk: PreSpendRisk;
  /** Actionable recommendation. */
  recommendation: string;
}

const CONVERSION_BY_CHANNEL: Record<string, number> = {
  meta: 2.1,
  tiktok: 2.8,
  google: 1.9,
  email: 3.5,
  whatsapp: 4.2,
};

/** Artificial-urgency words / claims that trigger Meta rejection or erode trust. */
const RISK_PATTERNS: Array<{ re: RegExp; reason: string }> = [
  { re: /(only today|last chance|limited|hurry|don't miss|act now)/i, reason: 'Artificial urgency (frequently rejected on Meta, low credibility in feed)' },
  { re: /(get rich|guaranteed \d+%|no risk|guaranteed results|millionaire)/i, reason: 'Unverifiable gain/guarantee claim (rejection risk under ad policy)' },
  { re: /(free without|gift|100% free)/i, reason: 'Free promise that may read as bait' },
  { re: /!!+|¡¡+/g, reason: 'Excess exclamation marks (spammy appearance)' },
];

export function predictPreSpend(swarm: SwarmResult, creative: Creative): PreSpendPrediction {
  const swarmScore = swarm.overallScore;
  const adjustments: PreSpendPrediction['adjustments'] = [];
  const reasons: string[] = [];

  // 1) Swarm confidence: dispersion of votes. Higher dispersion = less reliable.
  const dispersion = voteDispersion(swarm.votes);
  let confDelta = 0;
  if (dispersion >= 25) { confDelta = -8; reasons.push('Agents strongly divided: prediction is uncertain.'); }
  else if (dispersion >= 15) { confDelta = -4; reasons.push('High dispersion across agents.'); }
  else if (dispersion <= 8) { confDelta = 3; reasons.push('Aligned agents: consistent judgment.'); }
  adjustments.push({ label: 'Confidence (dispersion)', delta: confDelta });

  // 2) Channel adjustment: each channel has a different base conversion rate.
  const channel = creative.channel ?? 'meta';
  const base = CONVERSION_BY_CHANNEL[channel] ?? 2.1;
  const channelDelta = Math.round((base - 2.1) * 3); // ±~6 points per channel
  adjustments.push({ label: `Channel ${channel} (base conv ${base}%)`, delta: channelDelta });

  // 3) Meta / credibility risk: artificial-urgency patterns or claims.
  const riskReasons: string[] = [];
  for (const p of RISK_PATTERNS) {
    if (p.re.test(creative.copy)) riskReasons.push(p.reason);
  }
  const riskDelta = riskReasons.length === 0 ? 2 : -Math.min(12, riskReasons.length * 6);
  if (riskReasons.length > 0) reasons.push(...riskReasons);
  adjustments.push({ label: 'Meta/credibility risk', delta: riskDelta });

  // Aggregate: base score + adjustments, with ceiling/floor.
  const total = clampScore(
    swarmScore + confDelta + channelDelta + riskDelta,
  );

  // Final risk level.
  let level: RiskLevel = 'low';
  if (total < 60 || riskReasons.length >= 2) level = 'high';
  else if (total < 72 || riskReasons.length === 1) level = 'medium';

  const recommendation =
    level === 'high' ? 'Not recommended to spend yet: adjust the copy before investing in ads.'
    : total >= 80 ? 'Ready to launch with a moderate budget and measure.'
    : 'Acceptable: launch with a capped budget and A/B against another variant.';

  return {
    creativeId: creative.id,
    preSpendScore: total,
    swarmScore,
    adjustments,
    risk: { level, reasons },
    recommendation,
  };
}

/** Vote dispersion = population standard deviation (0 = full agreement). */
function voteDispersion(votes: SwarmResult['votes']): number {
  if (votes.length < 2) return 0;
  const scores = votes.map((v) => v.score);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((a, b) => a + (b - mean) ** 2, 0) / scores.length;
  return Math.sqrt(variance);
}

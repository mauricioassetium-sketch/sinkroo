import type { Creative, SwarmResult, CreativeDimension } from '@sinkroo/core';
import { clampScore } from '@sinkroo/core';

/**
 * M3 — Validación pre-spend.
 *
 * Convierte el veredicto del enjambre (juicio de CALIDAD) en una predicción
 * de DESEMPEÑO (0-100): la probabilidad de que la pieza rinda y no queme
 * presupuesto antes de gastar dinero real en ads.
 *
 * Es transparente, no una caja negra: parte del overallScore del enjambre y
 * aplica ajustes documentados — confianza, ajuste al canal y riesgo Meta.
 */

export type RiskLevel = 'low' | 'medium' | 'high';

export interface PreSpendRisk {
  level: RiskLevel;
  reasons: string[];
}

export interface PreSpendPrediction {
  creativeId: string;
  /** Predicción final 0-100 de desempeño pre-spend. */
  preSpendScore: number;
  /** Puntaje crudo del enjambre (input). */
  swarmScore: number;
  /** Desglose de ajustes aplicados (transparencia). */
  adjustments: {
    label: string;
    delta: number;
  }[];
  /** Nivel de riesgo de gastar plata en esto. */
  risk: PreSpendRisk;
  /** Recomendación accionable. */
  recommendation: string;
}

const CONVERSION_BY_CHANNEL: Record<string, number> = {
  meta: 2.1,
  tiktok: 2.8,
  google: 1.9,
  email: 3.5,
  whatsapp: 4.2,
};

/** Palabras de urgencia artificial / claims que disparan rechazo en Meta o pierden confianza. */
const RISK_PATTERNS: Array<{ re: RegExp; reason: string }> = [
  { re: /(solo hoy|última oportunidad|últimos \d+|no te lo pierdas|corre|apúrate)/i, reason: 'Urgencia artificial (rechazada con frecuencia en Meta y poco creíble en feed)' },
  { re: /(hazte rico|garantizad[oa] \d+%|sin riesgo|resultados garantizados|millonario)/i, reason: 'Claim de ganancia/garantía no verificable (riesgo de rechazo por política de anuncios)' },
  { re: /(gratis sin|regalo|100% gratis)/i, reason: 'Promesa de gratuidad que puede percibirse como bait' },
  { re: /!!+|¡¡+/g, reason: 'Exceso de signos de exclamación (aspecto spam)' },
];

export function predictPreSpend(swarm: SwarmResult, creative: Creative): PreSpendPrediction {
  const swarmScore = swarm.overallScore;
  const adjustments: PreSpendPrediction['adjustments'] = [];
  const reasons: string[] = [];

  // 1) Confianza del enjambre: dispersión de votos. A mayor dispersión, menos confiable.
  const dispersion = voteDispersion(swarm.votes);
  let confDelta = 0;
  if (dispersion >= 25) { confDelta = -8; reasons.push('Agentes muy divididos: la predicción es incierta.'); }
  else if (dispersion >= 15) { confDelta = -4; reasons.push('Dispersión alta entre agentes.'); }
  else if (dispersion <= 8) { confDelta = 3; reasons.push('Agentes alineados: juicio consistente.'); }
  adjustments.push({ label: 'Confianza (dispersión)', delta: confDelta });

  // 2) Ajuste por canal: el canal tiene una tasa de conversión base distinta.
  const channel = creative.channel ?? 'meta';
  const base = CONVERSION_BY_CHANNEL[channel] ?? 2.1;
  const channelDelta = Math.round((base - 2.1) * 3); // ±~6 puntos según canal
  adjustments.push({ label: `Canal ${channel} (conv base ${base}%)`, delta: channelDelta });

  // 3) Riesgo Meta / credibilidad: patrones de urgencia artificial o claims.
  const riskReasons: string[] = [];
  for (const p of RISK_PATTERNS) {
    if (p.re.test(creative.copy)) riskReasons.push(p.reason);
  }
  const riskDelta = riskReasons.length === 0 ? 2 : -Math.min(12, riskReasons.length * 6);
  if (riskReasons.length > 0) reasons.push(...riskReasons);
  adjustments.push({ label: 'Riesgo Meta/credibilidad', delta: riskDelta });

  // Agregar: score base + ajustes, con techo/floor.
  const total = clampScore(
    swarmScore + confDelta + channelDelta + riskDelta,
  );

  // Nivel de riesgo final.
  let level: RiskLevel = 'low';
  if (total < 60 || riskReasons.length >= 2) level = 'high';
  else if (total < 72 || riskReasons.length === 1) level = 'medium';

  const recommendation =
    level === 'high' ? 'No recomendado para gastar aún: ajusta el copy antes de invertir en ads.'
    : total >= 80 ? 'Listo para lanzar con presupuesto moderado y medir.'
    : 'Aceptable: lanza con presupuesto acotado y A/B contra otra variante.';

  return {
    creativeId: creative.id,
    preSpendScore: total,
    swarmScore,
    adjustments,
    risk: { level, reasons },
    recommendation,
  };
}

/** Dispersión de votos = desviación estándar poblacional (0 indica total acuerdo). */
function voteDispersion(votes: SwarmResult['votes']): number {
  if (votes.length < 2) return 0;
  const scores = votes.map((v) => v.score);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((a, b) => a + (b - mean) ** 2, 0) / scores.length;
  return Math.sqrt(variance);
}

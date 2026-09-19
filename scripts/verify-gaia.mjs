/**
 * Verificación de la Etapa 1 (GAIA real en el motor).
 * Corre el enjambre completo usando createGaiaEvaluator() con el
 * fallback local, y valida que GAIA produce votos razonados por dimensión.
 */
import { createGaiaEvaluator, systemPrompt, userPrompt } from '../packages/gaia/dist/index.js';
import { SwarmEngine, DEFAULT_AGENTS } from '../packages/engine/dist/index.js';
import { CREATIVE_DIMENSIONS } from '../packages/core/dist/index.js';

const creative = {
  id: 'cre-001',
  copy: '¡Solo por hoy! 50% de descuento en tu primera sesión. Agendá antes de medianoche.',
  audience: 'Mujeres 25-40 interesadas en belleza y estética',
  channel: 'meta',
};

// 1) GAIA local (fallback) — sin endpoint, corre offline.
const gaia = createGaiaEvaluator();
const engine = new SwarmEngine({ agents: DEFAULT_AGENTS, evaluator: gaia });
const result = await engine.evaluate(creative);

console.log('=== RESULTADO DEL ENJAMBRE (GAIA local) ===');
console.log(`overallScore: ${result.overallScore}  →  ${result.verdict.label}`);
console.log(`votos totales: ${result.votes.length}`);
console.log('desglose:');
for (const d of CREATIVE_DIMENSIONS) {
  if (result.dimensionScores[d] > 0) {
    console.log(`  ${d} = ${result.dimensionScores[d]}`);
  }
}

// Aserciones
const assert = (cond, msg) => { if (!cond) throw new Error('FALLÓ: ' + msg); };
assert(result.votes.length > 0, 'no hubo votos');
// cada agente debe votar todas sus dimensiones prioritarias
const expectedTotal = DEFAULT_AGENTS.reduce((n, a) => n + a.priorities.length, 0);
assert(result.votes.length === expectedTotal, `esperaba ${expectedTotal} votos, hubo ${result.votes.length}`);
assert(result.votes.every((v) => v.rationale && v.rationale.length > 0), 'algún voto sin rationale');
assert(result.overallScore >= 0 && result.overallScore <= 100, 'score fuera de rango');
assert(['go', 'review', 'stop'].includes(result.verdict.kind), 'veredicto inválido');

// 2) Los prompts se generan bien por agente
const p = systemPrompt(DEFAULT_AGENTS[0]);
assert(p.includes('comprador_impulsivo') || p.includes('Comprador impulsivo'), 'prompt sin persona');
assert(userPrompt(creative).includes('50%'), 'prompt usuario sin copy');

console.log('=== OK: verificaciones pasaron ===');
console.log(`\nMuestra de votos (2):`);
for (const v of result.votes.slice(0, 2)) {
  console.log(`  [${v.agentId}] ${v.dimension}=${v.score} — ${v.rationale}`);
}

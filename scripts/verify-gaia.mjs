/**
 * Stage 1 verification (real GAIA in the engine).
 * Runs the full swarm using createGaiaEvaluator() with the local fallback, and
 * validates that GAIA produces reasoned per-dimension votes.
 */
import { createGaiaEvaluator, systemPrompt, userPrompt } from '../packages/gaia/dist/index.js';
import { SwarmEngine, DEFAULT_AGENTS } from '../packages/engine/dist/index.js';
import { CREATIVE_DIMENSIONS } from '../packages/core/dist/index.js';

const creative = {
  id: 'cre-001',
  copy: 'Today only! 50% off your first session. Book before midnight.',
  audience: 'Women 25-40 interested in beauty and aesthetics',
  channel: 'meta',
};

// 1) Local GAIA (fallback) — no endpoint, runs offline.
const gaia = createGaiaEvaluator();
const engine = new SwarmEngine({ agents: DEFAULT_AGENTS, evaluator: gaia });
const result = await engine.evaluate(creative);

console.log('=== SWARM RESULT (local GAIA) ===');
console.log(`overallScore: ${result.overallScore}  →  ${result.verdict.label}`);
console.log(`total votes: ${result.votes.length}`);
console.log('breakdown:');
for (const d of CREATIVE_DIMENSIONS) {
  if (result.dimensionScores[d] > 0) {
    console.log(`  ${d} = ${result.dimensionScores[d]}`);
  }
}

// Assertions
const assert = (cond, msg) => { if (!cond) throw new Error('FAILED: ' + msg); };
assert(result.votes.length > 0, 'no votes');
// each agent must vote all its priority dimensions
const expectedTotal = DEFAULT_AGENTS.reduce((n, a) => n + a.priorities.length, 0);
assert(result.votes.length === expectedTotal, `expected ${expectedTotal} votes, got ${result.votes.length}`);
assert(result.votes.every((v) => v.rationale && v.rationale.length > 0), 'some vote missing rationale');
assert(result.overallScore >= 0 && result.overallScore <= 100, 'score out of range');
assert(['go', 'review', 'stop'].includes(result.verdict.kind), 'invalid verdict');

// 2) Prompts are generated correctly per agent
const p = systemPrompt(DEFAULT_AGENTS[0]);
assert(p.includes('impulsive_buyer') || p.includes('Impulsive buyer'), 'prompt missing persona');
assert(userPrompt(creative).includes('50%'), 'user prompt missing copy');

console.log('=== OK: checks passed ===');
console.log(`\nSample votes (2):`);
for (const v of result.votes.slice(0, 2)) {
  console.log(`  [${v.agentId}] ${v.dimension}=${v.score} — ${v.rationale}`);
}

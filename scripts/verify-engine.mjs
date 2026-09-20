import { SwarmEngine, HeuristicEvaluator, DEFAULT_AGENTS } from '../packages/engine/dist/index.js';
import { deriveVerdict } from '../packages/core/dist/index.js';
import assert from 'node:assert/strict';

const creative = {
  id: 'ad-1',
  copy: 'Buy now and save 50% for a limited time — today only.',
  audience: 'online shoppers',
  channel: 'meta',
};

const engine = new SwarmEngine({ agents: DEFAULT_AGENTS, evaluator: new HeuristicEvaluator() });
const result = await engine.evaluate(creative);

console.log('overallScore:', result.overallScore, '| verdict:', result.verdict.kind);
console.log('total votes:', result.votes.length, '(N agents × N dimensions)');
console.log('dimensions evaluated:',
  Object.entries(result.dimensionScores)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${k}=${v}`).join(', '));

// Invariants that must ALWAYS hold
assert.ok(result.overallScore >= 0 && result.overallScore <= 100, 'score in range 0-100');
assert.ok(result.votes.length >= DEFAULT_AGENTS.length, 'at least one vote per agent');
assert.equal(result.creativeId, 'ad-1');
assert.equal(result.votes.every(v => v.score >= 0 && v.score <= 100), true, 'each vote in range');
assert.equal(deriveVerdict(85).kind, 'go');
assert.equal(deriveVerdict(70).kind, 'review');
assert.equal(deriveVerdict(45).kind, 'stop');
console.log('OK: checks passed');

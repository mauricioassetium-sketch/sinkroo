import { SwarmEngine, HeuristicEvaluator, DEFAULT_AGENTS } from '../packages/engine/dist/index.js';
import { deriveVerdict } from '../packages/core/dist/index.js';
import assert from 'node:assert/strict';

const creative = {
  id: 'ad-1',
  copy: 'Compra ahora y ahorra 50% por tiempo limitado — solo hoy.',
  audience: 'compradores online',
  channel: 'meta',
};

const engine = new SwarmEngine({ agents: DEFAULT_AGENTS, evaluator: new HeuristicEvaluator() });
const result = await engine.evaluate(creative);

console.log('overallScore:', result.overallScore, '| verdict:', result.verdict.kind);
console.log('votos totales:', result.votes.length, '(N agentes × N dimensiones)');
console.log('dimensiones evaluadas:',
  Object.entries(result.dimensionScores)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${k}=${v}`).join(', '));

// Invariantes que SIEMPRE deben cumplirse
assert.ok(result.overallScore >= 0 && result.overallScore <= 100, 'score en rango 0-100');
assert.ok(result.votes.length >= DEFAULT_AGENTS.length, 'al menos un voto por agente');
assert.equal(result.creativeId, 'ad-1');
assert.equal(result.votes.every(v => v.score >= 0 && v.score <= 100), true, 'cada voto en rango');
assert.equal(deriveVerdict(85).kind, 'go');
assert.equal(deriveVerdict(70).kind, 'review');
assert.equal(deriveVerdict(45).kind, 'stop');
console.log('OK: verificaciones pasaron');

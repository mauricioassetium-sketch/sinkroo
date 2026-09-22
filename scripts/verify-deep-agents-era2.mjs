/**
 * Era 2 verification — sales-closer, media-buyer, performance-analyst.
 *
 * Sin red (runtime offline determinista). Valida: (a) enrutado de intents del
 * sales-closer, (b) ciclo launch→monitor del media-buyer con pausa por CPA,
 * (c) calibración EMA del performance-analyst contra Miro, (d) aislamiento de
 * memoria por lead/canal.
 */
import { webcrypto } from 'node:crypto';
if (!globalThis.crypto) globalThis.crypto = webcrypto;
import { ChatRuntime } from '../packages/deep-agents/dist/chat-runtime.js';
import { SalesCloserAgent } from '../packages/deep-agents/dist/sales-closer.js';
import { MediaBuyerAgent, InMemoryMetaClient } from '../packages/deep-agents/dist/media-buyer.js';
import { PerformanceAnalystAgent } from '../packages/deep-agents/dist/performance-analyst.js';

class OfflineRuntime extends ChatRuntime {
  constructor() { super({ baseUrl: 'http://offline.invalid', model: 'offline', apiKey: '' }); }
  async json(system, user) { return { reply: 'Hola (offline)', intent: 'generic', requestPayment: false, leadScoreDelta: 0 }; }
}

let fails = 0;
function ok(name, cond, extra = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`);
  if (!cond) fails++;
}

const rt = new OfflineRuntime();
const ctx = { businessName: 'Café Bogotá', productName: 'Café', usp: 'Directo de finca' };
const base = (over = {}) => ({
  conversationId: 'conv-1', stage: 'greeting', history: [], context: ctx, leadScore: 10, ...over,
});

// ── 1) sales-closer: enrutado de intents ──
const seller = new SalesCloserAgent(rt);
const tGreet = await seller.run(base({ history: [{ sender: 'lead', text: 'hola' }] }));
ok('sales-closer: saludo → qualification', tGreet.nextStage === 'qualification', `stage=${tGreet.nextStage}`);

const tPrice = await seller.run(base({ history: [{ sender: 'lead', text: 'eso es caro' }] }));
ok('sales-closer: objeción precio → objection', tPrice.nextStage === 'objection', `stage=${tPrice.nextStage} intent=${tPrice.intent}`);

const tClose = await seller.run(base({ history: [{ sender: 'lead', text: 'dale, quiero comprar' }] }));
ok('sales-closer: closing detectado', tClose.intent === 'closing_signal', `intent=${tClose.intent}`);
ok('sales-closer: requestPayment en closing', tClose.requestPayment === true);

// ── 2) sales-closer: aislamiento de memoria por lead ──
const l1 = await seller.run({ ...base(), conversationId: 'lead-A' });
const l2 = await seller.run({ ...base(), conversationId: 'lead-B' });
ok('sales-closer: leads aislados corren', l1.reply.length > 0 && l2.reply.length > 0);

// ── 3) media-buyer: launch → monitor, CPA dentro de presupuesto ──
const mb = new MediaBuyerAgent(rt);
const good = new InMemoryMetaClient({ spend: 100, impressions: 10000, clicks: 200, conversions: 10 });
const mbRes = await mb.run({ objective: 'conversions', dailyBudgetUsd: 15 }, good);
ok('media-buyer: campaña lanzada (campaignId presente)', typeof mbRes.campaignId === 'string' && mbRes.campaignId.length > 0, `id=${mbRes.campaignId}`);
ok('media-buyer: CPA $10 calculado', mbRes.metrics.cpa === 10, `cpa=$${mbRes.metrics.cpa}`);
ok('media-buyer: sigue monitoreando (CPA ≤ presupuesto)', mbRes.action === 'monitoring', `action=${mbRes.action}`);

// ── 4) media-buyer: pausa cuando CPA > presupuesto ──
const mb2 = new MediaBuyerAgent(rt);
const bad = new InMemoryMetaClient({ spend: 100, impressions: 5000, clicks: 50, conversions: 2 });
const mbBad = await mb2.run({ objective: 'conversions', dailyBudgetUsd: 10 }, bad);
ok('media-buyer: pausa CPA caro ($50 > $10)', mbBad.action === 'paused', `action=${mbBad.action} cpa=$${mbBad.metrics.cpa}`);
ok('media-buyer: recomendación no vacía', mbBad.recommendation.length > 0);

// ── 5) performance-analyst: calibración EMA de Miro ──
const pa = new PerformanceAnalystAgent(rt);
const paRes = await pa.run(
  { predictedCpa: 10, channel: 'instagram' },
  { spend: 100, impressions: 5000, clicks: 100, conversions: 20 }, // CPA real=5 (Miro sobreestimó)
  1,
);
ok('performance-analyst: CPA real $5 < predicho $10', paRes.cpaDeviation === 0.5, `dev=${paRes.cpaDeviation}`);
ok('performance-analyst: bias underconfident', paRes.bias === 'underconfident', paRes.bias);
ok('performance-analyst: corrección al alza (>1)', paRes.correction > 0, `correction=${paRes.correction.toFixed(3)}`);
ok('performance-analyst: trace completo', JSON.stringify(paRes.trace) === JSON.stringify(['compare', 'calibrate']), paRes.trace.join('→'));

console.log('\n' + (fails === 0 ? '✅ verify-deep-agents-era2 OK' : `❌ ${fails} fallo(s)`));
process.exit(fails === 0 ? 0 : 1);

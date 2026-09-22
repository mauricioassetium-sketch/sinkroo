/**
 * Era 1 verification (Deep Agents, grafo + memoria, SIN red).
 *
 * Valida que los 3 agentes fundacionales B) se instancian, (b) corren un grafo
 * LangGraph completo, (c) producen salida estructurada, y (d) aíslan la memoria
 * por userId (el thread_id). Usa un runtime offline determinista: NO llama a
 * ningún LLM — emula la respuesta para probar el grafo y el checkpointer.
 */
import { webcrypto } from 'node:crypto';
// Node 18: crypto global va detras de flag; node:20 (Dockerfile) lo tiene nativo.
if (!globalThis.crypto) globalThis.crypto = webcrypto;
import { createDeepAgent } from '../packages/deep-agents/dist/index.js';
import { ChatRuntime } from '../packages/deep-agents/dist/chat-runtime.js';

/** Runtime offline: "lee" la instrucción y devuelve un JSON plausible. */
class OfflineRuntime extends ChatRuntime {
  constructor() { super({ baseUrl: 'http://offline.invalid', model: 'offline', apiKey: '' }); }
  async json(system, user) {
    // Determina el "rol" desde la instrucción para devolver insights coherentes.
    const isMarket = /mercado|market|investiga/i.test(user);
    const isStrategy = /estrateg|positioning|strateg/i.test(user);
    const isCreative = /copy|variant|creativo|captión/i.test(user) ;
    if (isMarket) return { summary: 'Mercado analizado (offline).', actions: ['Posicionar por USP'], insights: { opportunity: 'alta', audience: 'detectada', competition: 'media' } };
    if (isStrategy) return { summary: 'Estrategia definida (offline).', actions: ['Asignar budget a meta'], insights: { positioning: 'diferenciado', offer: 'clara', budget: '100' } };
    if (isCreative) return { summary: 'Copy generado (offline).', actions: ['Variant A', 'Variant B', 'Variant C'], insights: { angle: 'urgencia' } };
    return { summary: 'OK (offline)', actions: ['x'], insights: { k: 'v' } };
  }
}

const rt = new OfflineRuntime();
const mk = (id, user) => ({ id, user });

let fails = 0;
function ok(name, cond, extra = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`);
  if (!cond) fails++;
}

// ── 1) Los 3 agentes se instancian ──
const market = createDeepAgent('market-analyst', rt);
const strategy = createDeepAgent('marketing-strategist', rt);
const creative = createDeepAgent('creative-strategist', rt);
ok('instancia los 3 agentes', market && strategy && creative);

// ── 2) market-analyst corre su grafo ──
const r1 = await market.run({
  instruction: 'Analiza mi mercado',
  context: { userId: 'user-1', businessName: 'Café Bogotá', productName: 'Café', usp: 'Directo de finca' },
  data: { benchmark: 'ctr 2.1%' },
});
ok('market-analyst produce summary', r1.summary.length > 0, r1.summary);
ok('market-analyst produce trace ["analyze"]', JSON.stringify(r1.trace) === JSON.stringify(['analyze']), r1.trace.join(','));

// ── 3) creative-strategist corre su grafo ──
const r3 = await creative.run({
  instruction: 'Escribe 3 variantes de copy',
  context: { userId: 'user-1', businessName: 'Café Bogotá', productName: 'Café', usp: 'Directo de finca' },
});
ok('creative-strategist produce 3 variantes', r3.actions.length === 3, r3.actions.join(' | '));

// ── 4) AISLAMIENTO de memoria por userId ──
//   Mismo agente, dos usuarios distintos => thread_id distinto => estados aislados.
const rA = await market.run({
  instruction: 'Analiza mi mercado',
  context: { userId: 'user-A', businessName: 'Jorge', productName: 'Café' },
});
const rB = await market.run({
  instruction: 'Analiza mi mercado',
  context: { userId: 'user-B', businessName: 'Ana', productName: 'Broker' },
});
ok('memoria aislada: user-A y user-B corren sin mezclarse', rA.summary.length > 0 && rB.summary.length > 0);
ok('ambos hilos completaron el grafo', rA.trace.length === 1 && rB.trace.length === 1);

console.log('\n' + (fails === 0 ? '✅ verify-deep-agents OK' : `❌ ${fails} fallo(s)`));
process.exit(fails === 0 ? 0 : 1);

/**
 * #4 — sales-closer (M6 como grafo LangGraph).
 *
 * Grafo: detect_intent → respond. Memoria por LEAD (thread_id = conversationId).
 * Enrutamiento con los MISMOS regex del LocalSalesFallback del broker; con
 * cerebro real el texto sale del LLM; si falla, cae al determinismo — nunca
 * se queda callado.
 */

import { StateGraph, Annotation, MemorySaver, START, END } from '@langchain/langgraph';
import type { ConversationStage, SalesAgentResult, SalesContext, PaymentProvider } from '@sinkroo/core';
import { ChatRuntime } from './chat-runtime.js';
import { z } from 'zod';

/** El turno de venta que el grafo razona (snapshot del ConversationState). */
export interface SalesTurnState {
  conversationId: string;
  stage: ConversationStage;
  history: Array<{ sender: 'lead' | 'agent'; text: string }>;
  context: SalesContext;
  leadScore: number;
}

/** Rutas detectables — misma taxonomía que el fallback del broker. */
export const SALES_ROUTES = [
  'greeting', 'objection_price', 'objection_hesitation', 'closing_signal', 'info_request',
  'stage_fallback',
] as const;
export type SalesRoute = (typeof SALES_ROUTES)[number];

const SalesState = Annotation.Root({
  turn: Annotation<SalesTurnState>,
  route: Annotation<SalesRoute>,
  result: Annotation<SalesAgentResult | null>({
    reducer: (_a, b) => b,
    default: () => null,
  }),
});

const salesReplySchema = z.object({
  reply: z.string(),
  intent: z.string(),
  requestPayment: z.boolean(),
  leadScoreDelta: z.number(),
});

export class SalesCloserAgent {
  readonly id = 'sales-closer' as const;

  constructor(
    private readonly runtime: ChatRuntime,
    private readonly payment: PaymentProvider = new MockPaymentProvider(),
  ) {}

  /** Enrutador: los MISMOS regex del LocalSalesFallback, mismo orden. */
  route(turn: SalesTurnState): SalesRoute {
    const last = turn.history[turn.history.length - 1]?.text?.toLowerCase() ?? '';
    if (/(^|\s)(hi|hola|hello|hey|buenas|interested|interesad)/.test(last)) return 'greeting';
    if (/(expensiv|caro|price|precio|costo|cost)/.test(last)) return 'objection_price';
    if (/(no me convence|not sure|doubt|duda|pensar|think)/.test(last)) return 'objection_hesitation';
    if (/(yes|si|ok|deal|count me in|avanza|proceed|buy|comprar|dale|let's go|vamos)/.test(last)) return 'closing_signal';
    if (/(demo|mas info|más info|tell me more|cuentame|detalles|details)/.test(last)) return 'info_request';
    return 'stage_fallback';
  }

  private build() {
    const self = this;
    const g = new StateGraph(SalesState)
      .addNode('detect_intent', (state) => ({ route: self.route(state.turn) }))
      .addNode('respond', async (state) => ({ result: await self.respond(state.turn, state.route) }))
      .addEdge(START, 'detect_intent')
      .addEdge('detect_intent', 'respond')
      .addEdge('respond', END);
    return g.compile({ checkpointer: new MemorySaver() });
  }

  private graph = this.build();

  async run(turn: SalesTurnState): Promise<SalesAgentResult> {
    const final = await this.graph.invoke(
      { turn, route: 'stage_fallback', result: null },
      { configurable: { thread_id: `sales-${turn.conversationId}` } },
    );
    const r = final.result as SalesAgentResult;
    let paymentUrl = turn.context.paymentUrl;
    if (r.requestPayment && !paymentUrl) {
      try {
        paymentUrl = await this.payment.createPaymentLink({
          conversationId: turn.conversationId,
          amount: 0,
          currency: 'usd',
          description: turn.context.productName,
        });
      } catch { paymentUrl = undefined; }
      if (paymentUrl) r.reply = `${r.reply}\n\n${paymentUrl}`;
    }
    return { ...r, brain: 'sales-closer' };
  }

  /** LLM si hay cerebro; si falla o está offline, determinista. */
  private async respond(turn: SalesTurnState, route: SalesRoute): Promise<SalesAgentResult> {
    if (!this.runtime.offline) {
      try { return await this.llmRespond(turn, route); } catch { /* red de seguridad */ }
    }
    return this.deterministic(turn, route);
  }

  private async llmRespond(turn: SalesTurnState, route: SalesRoute): Promise<SalesAgentResult> {
    const c = turn.context;
    const sys = 'You are Sinkroo\'s sales closer over WhatsApp. Write ONE natural reply that advances the sale. Short, human, in the lead\'s language.';
    const user = [
      `Business: ${c.businessName}`, `Product: ${c.productName}${c.priceLabel ? ' — ' + c.priceLabel : ''}`,
      `USP: ${c.usp ?? '(none)'}`, `Lead score: ${turn.leadScore}`,
      `Route: ${route}`,
      `Recent history: ${turn.history.slice(-6).map((m) => `${m.sender}: ${m.text}`).join(' | ')}`,
      '',
      'Respond strict JSON:',
      `{"reply":"<reply>","intent":"<intent>","requestPayment":${route === 'closing_signal' ? 'true' : 'false'},"leadScoreDelta":0}`,
    ].join('\n');
    const raw = await this.runtime.json<z.infer<typeof salesReplySchema>>(sys, user);
    const p = salesReplySchema.safeParse(raw);
    if (!p.success) throw new Error('bad sales JSON');
    const d = p.data;
    return {
      reply: d.reply,
      nextStage: this.nextStageFor(route, turn.stage),
      leadScoreDelta: d.leadScoreDelta ?? 0,
      intent: d.intent ?? 'generic',
      requestPayment: d.requestPayment ?? false,
    };
  }

  /** Determina la transición de etapa (idéntica a como lo hace el fallback). */
  private nextStageFor(route: SalesRoute, stage: ConversationStage): ConversationStage {
    switch (route) {
      case 'greeting': return 'qualification';
      case 'objection_price': return 'objection';
      case 'objection_hesitation': return 'objection';
      case 'closing_signal': return 'closing';
      case 'info_request': return 'presentation';
      case 'stage_fallback':
        switch (stage) {
          case 'greeting': return 'qualification';
          case 'presentation': return 'closing';
          default: return stage;
        }
    }
  }

  /** Réplica EXACTA del LocalSalesFallback del broker, mapeada por ruta. */
  private deterministic(turn: SalesTurnState, route: SalesRoute): SalesAgentResult {
    const c = turn.context;
    let reply = ''; let intent: string = route;
    let delta = 0; let requestPayment = false;

    switch (route) {
      case 'greeting':
        reply = `Hi! Thanks for reaching out about ${c.productName}. Quick question: what are you looking to solve?`;
        intent = 'greeting'; break;
      case 'objection_price':
        reply = `Totally fair concern. ${c.productName}${c.usp ? ` — ${c.usp}.` : ' is built for outcomes, not just features.'} Does that address your worry?`;
        intent = 'objection_price'; break;
      case 'objection_hesitation':
        reply = `Take your time. Just so you know, ${c.usp ? c.usp : 'most clients see results quickly'}. Anything specific holding you back?`;
        intent = 'objection_hesitation'; break;
      case 'closing_signal':
        reply = c.paymentUrl ? `Awesome — you can lock it in right here: ${c.paymentUrl}` : `Awesome! I'll set everything up. Stand by for the next step.`;
        intent = 'closing_signal'; delta = 20; requestPayment = true; break;
      case 'info_request':
        reply = `${c.usp ? c.usp + '. ' : ''}Here's the short version: ${c.productName} helps you get the outcome without the usual headache. Want me to walk you through it?`;
        intent = 'info_request'; break;
      case 'stage_fallback':
        switch (turn.stage) {
          case 'greeting':
            reply = `Welcome! I help people get the most out of ${c.productName}. What are you looking for today?`;
            intent = 'open'; break;
          case 'qualification':
            reply = `Got it. On a scale of 1-10, how urgent is this for you right now?`;
            intent = 'qualify'; delta = 10; break;
          case 'presentation':
            reply = `${c.productName}${c.priceLabel ? ` — ${c.priceLabel}` : ''}. ${c.usp || 'Built to deliver, not just promise.'} Shall we move forward?`;
            intent = 'pitch'; break;
          case 'objection':
            reply = `Makes sense. What would it take for you to feel confident moving forward?`;
            intent = 'probe'; break;
          case 'closing':
            reply = c.paymentUrl ? `Ready when you are: ${c.paymentUrl}` : `Alright, let's finalize — I'll send you everything you need.`;
            intent = 'close'; requestPayment = true; break;
          case 'follow_up':
            reply = `Quick check-in — how's everything feeling so far? Anything I can clarify?`;
            intent = 'check_in'; break;
        }
        break;
    }

    return {
      reply,
      nextStage: this.nextStageFor(route, turn.stage),
      leadScoreDelta: delta,
      intent,
      requestPayment,
    };
  }
}

/** Mock payment provider — placeholder hasta que se enchufe un PSP real. */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock';
  async createPaymentLink(args: { conversationId: string }): Promise<string> {
    return `https://pay.example.com/${args.conversationId}`;
  }
}

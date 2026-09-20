import type { ConversationStage, ConversationState, SalesAgentResult, PaymentProvider, Sender } from '@sinkroo/core';
import type { ReasoningProvider, SalesTurn } from './providers.js';

/**
 * M6 — the conversational sales agent.
 *
 * Stateless reasoning layer: takes a ConversationState snapshot (from the DB,
 * loaded by the API) and returns the next agent move. It delegates the actual
 * "what to say" to the provider's converse() (LLM today, GAIA later) and falls
 * back to the deterministic LocalProvider when the brain cannot converse.
 *
 * The payment step is abstracted behind PaymentProvider so any PSP can be
 * plugged in later (Stripe, Mercado Pago, …). The default is a mock that
 * returns a placeholder link — no real money moves until a provider is wired.
 */
export class SalesAgent {
  constructor(
    private readonly provider: ReasoningProvider,
    private readonly payment: PaymentProvider = new MockPaymentProvider(),
  ) {}

  get brain(): string {
    return this.provider.name;
  }

  async converse(state: ConversationState): Promise<SalesAgentResult> {
    const turn: SalesTurn = {
      stage: state.stage,
      history: state.history.map((m) => ({ sender: m.sender as Sender, text: m.text })),
      context: {
        businessName: state.context.businessName,
        productName: state.context.productName,
        priceLabel: state.context.priceLabel,
        usp: state.context.usp,
        tone: state.context.tone,
        language: state.context.language,
        paymentUrl: state.context.paymentUrl,
      },
      leadScore: state.leadScore,
    };

    let reply = this.provider.converse
      ? await this.provider.converse(turn)
      : await this.fallbackConverse(turn);

    // If the move asks for payment, attach a real link (or mock).
    let paymentUrl = turn.context.paymentUrl;
    if (reply.requestPayment && !paymentUrl) {
      try {
        paymentUrl = await this.payment.createPaymentLink({
          conversationId: state.conversationId,
          amount: 0, // amount is product-dependent; the API sets it when known
          currency: 'usd',
          description: `${state.context.productName} — ${state.leadPhone}`,
        });
      } catch {
        paymentUrl = undefined; // never block the sale on a payment failure
      }
      if (paymentUrl) {
        reply.reply = `${reply.reply}\n\n${paymentUrl}`;
      }
    }

    return {
      reply: reply.reply,
      nextStage: reply.nextStage,
      leadScoreDelta: reply.leadScoreDelta,
      intent: reply.intent,
      requestPayment: reply.requestPayment,
      brain: this.provider.name,
    };
  }

  private async fallbackConverse(turn: SalesTurn) {
    // Deterministic fallback so the agent never goes silent even without a brain.
    return await new LocalSalesFallback().converse(turn);
  }
}

/** Deterministic sales fallback — mirrors LocalProvider.converse logic. */
class LocalSalesFallback {
  async converse(turn: SalesTurn) {
    const c = turn.context;
    const last = turn.history[turn.history.length - 1]?.text?.toLowerCase() ?? '';
    let reply: string;
    let nextStage: ConversationStage = turn.stage;
    let intent = 'generic';
    let delta = 0;
    let requestPayment = false;

    if (/(^|\s)(hi|hola|hello|hey|buenas|interested|interesad)/.test(last)) {
      reply = `Hi! Thanks for reaching out about ${c.productName}. Quick question: what are you looking to solve?`;
      nextStage = 'qualification'; intent = 'greeting';
    } else if (/(expensiv|caro|price|precio|costo|cost)/.test(last)) {
      reply = `Totally fair concern. ${c.productName}${c.usp ? ` — ${c.usp}.` : ' is built for outcomes, not just features.'} Does that address your worry?`;
      nextStage = 'objection'; intent = 'objection_price';
    } else if (/(no me convence|not sure|doubt|duda|pensar|think)/.test(last)) {
      reply = `Take your time. Just so you know, ${c.usp ? c.usp : 'most clients see results quickly'}. Anything specific holding you back?`;
      nextStage = 'objection'; intent = 'objection_hesitation';
    } else if (/(yes|si|ok|deal|count me in|avanza|proceed|buy|comprar|dale|let's go|vamos)/.test(last)) {
      reply = c.paymentUrl ? `Awesome — you can lock it in right here: ${c.paymentUrl}` : `Awesome! I'll set everything up. Stand by for the next step.`;
      nextStage = 'closing'; intent = 'closing_signal'; delta = 20; requestPayment = true;
    } else if (/(demo|mas info|más info|tell me more|cuentame|detalles|details)/.test(last)) {
      reply = `${c.usp ? c.usp + '. ' : ''}Here's the short version: ${c.productName} helps you get the outcome without the usual headache. Want me to walk you through it?`;
      nextStage = 'presentation'; intent = 'info_request';
    } else {
      switch (turn.stage) {
        case 'greeting':
          reply = `Welcome! I help people get the most out of ${c.productName}. What are you looking for today?`;
          nextStage = 'qualification'; intent = 'open'; break;
        case 'qualification':
          reply = `Got it. On a scale of 1-10, how urgent is this for you right now?`;
          intent = 'qualify'; delta = 10; break;
        case 'presentation':
          reply = `${c.productName}${c.priceLabel ? ` — ${c.priceLabel}` : ''}. ${c.usp || 'Built to deliver, not just promise.'} Shall we move forward?`;
          nextStage = 'closing'; intent = 'pitch'; break;
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
    }

    return { reply, nextStage, leadScoreDelta: delta, intent, requestPayment };
  }
}

/** Mock payment provider — placeholder until a real PSP is configured. */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock';
  async createPaymentLink(args: { conversationId: string }): Promise<string> {
    return `https://pay.example.com/${args.conversationId}`;
  }
}

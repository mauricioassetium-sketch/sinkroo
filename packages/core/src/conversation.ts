/**
 * M6 — WhatsApp sales-agent conversation contract.
 *
 * These types cross the same boundary as the creative types: GAIA/Broker ⇄
 * Engine ⇄ API. The six-stage sales flow is state tracked in Postgres; the
 * broker only reasons over a snapshot of that state and returns the next
 * move.
 */

/** The six sales stages, in order. */
export const CONVERSATION_STAGES = [
  'greeting',
  'qualification',
  'presentation',
  'objection',
  'closing',
  'follow_up',
] as const;

export type ConversationStage = (typeof CONVERSATION_STAGES)[number];

/** Who sent a message. */
export type Sender = 'lead' | 'agent';

/** Where a conversation stands, closed or not. */
export type ConversationStatus =
  | 'active'
  | 'closed_won'
  | 'closed_lost'
  | 'manual_takeover';

/** A single message in the thread. */
export interface ConversationMessage {
  id: string;
  sender: Sender;
  /** Plain-text body. */
  text: string;
  /** Timestamp (ISO string). */
  at: string;
}

/** The snapshot the broker reasons over. */
export interface ConversationState {
  conversationId: string;
  /** Phone / identifier of the lead. */
  leadPhone: string;
  stage: ConversationStage;
  status: ConversationStatus;
  /** 0..100 qualification score. */
  leadScore: number;
  /** Recent history, oldest first (last N messages). */
  history: ConversationMessage[];
  /** Sales context — product + business + agent personality. */
  context: SalesContext;
}

/** Everything the agent needs to sell. */
export interface SalesContext {
  businessName: string;
  productName: string;
  /** Price shown to the lead, human-readable (e.g. "$499/mo"). */
  priceLabel?: string;
  /** Unique selling proposition / offer. */
  usp?: string;
  /** Agent tone: friendly | professional | casual | enthusiastic. */
  tone?: string;
  /** Language the agent replies in (default es). */
  language?: string;
  /** Payment link hint — set when a payment provider is configured. */
  paymentUrl?: string;
}

/** The broker's answer: what the agent says and where the conversation goes. */
export interface SalesAgentResult {
  /** Reply to send to the lead. */
  reply: string;
  /** Stage to advance to (may equal incoming stage). */
  nextStage: ConversationStage;
  /** Lead score adjustment (delta). */
  leadScoreDelta: number;
  /** Detected intent / signal, for observability. */
  intent: string;
  /** True when a payment link should be sent in/after the reply. */
  requestPayment: boolean;
  /** Raw brain label, for the response envelope. */
  brain?: string;
}

/** Abstract payment provider — plug any PSP here (Stripe, Mercado Pago, …). */
export interface PaymentProvider {
  readonly name: string;
  /** Build a payment link for the given conversation + amount. */
  createPaymentLink(args: {
    conversationId: string;
    amount: number;
    currency: string;
    description?: string;
  }): Promise<string>;
}

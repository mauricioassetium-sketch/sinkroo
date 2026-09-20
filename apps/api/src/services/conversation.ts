import type { Pool } from 'pg';
import type { ConversationState, SalesAgentResult } from '@sinkroo/core';
import { CloudApiTransport, type WhatsAppTransport } from '../integrations/whatsapp.js';

/**
 * M6 — conversation service.
 *
 * The API is the bridge: it loads persisted state, delegates the reasoning to
 * GaiaBroker (/converse), persists both sides of the exchange, and sends the
 * reply through the WhatsApp transport. It owns no sales logic of its own.
 */

const BROKER_URL = process.env.BROKER_URL ?? 'http://127.0.0.1:3100';
const MAX_HISTORY = 20;

export interface InboundLeadMessage {
  from: string;
  text: string;
  messageId: string;
  timestamp: number;
}

export async function handleInbound(
  db: Pool,
  transport: WhatsAppTransport,
  inbound: InboundLeadMessage,
): Promise<SalesAgentResult> {
  // 1) Find or create the conversation keyed by business + lead phone.
  const business = await resolveBusiness(db);
  let conv = await db.query(
    `SELECT * FROM conversations WHERE business_id = $1 AND lead_phone = $2 ORDER BY created_at DESC LIMIT 1`,
    [business.id, inbound.from],
  );

  let conversationId: string;
  let stage: string;
  let status: string;
  let leadScore: number;
  if (conv.rows.length === 0) {
    const created = await db.query(
      `INSERT INTO conversations (business_id, lead_phone) VALUES ($1, $2) RETURNING *`,
      [business.id, inbound.from],
    );
    const row = created.rows[0];
    conversationId = row.id; stage = row.stage; status = row.status; leadScore = row.lead_score;
  } else {
    const row = conv.rows[0];
    conversationId = row.id; stage = row.stage; status = row.status; leadScore = row.lead_score;
  }

  // 2) Persist the inbound lead message.
  await db.query(
    `INSERT INTO conversation_messages (conversation_id, sender, text) VALUES ($1, $2, $3)`,
    [conversationId, 'lead', inbound.text],
  );

  // 3) Load recent history (now includes the lead message just stored).
  const hist = await db.query(
    `SELECT sender, text, created_at FROM conversation_messages
      WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT $2`,
    [conversationId, MAX_HISTORY],
  );

  // 4) Build the snapshot for the broker.
  const product = await resolveProduct(db, business.id);
  const state: ConversationState = {
    conversationId,
    leadPhone: inbound.from,
    stage: stage as ConversationState['stage'],
    status: status as ConversationState['status'],
    leadScore,
    history: hist.rows.map((m) => ({
      id: '', sender: m.sender, text: m.text, at: new Date(m.created_at).toISOString(),
    })),
    context: {
      businessName: business.name,
      productName: product.name,
      priceLabel: product.price != null ? `${product.price}${product.price_unit ? ` ${product.price_unit}` : ''}` : undefined,
      usp: product.usp || product.offer || undefined,
      tone: business.tone || undefined,
      language: 'es',
    },
  };

  // 5) Delegate reasoning to the broker.
  const res = await fetch(`${BROKER_URL}/converse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`Broker responded ${res.status}: ${await res.text()}`);
  const result = (await res.json()) as SalesAgentResult;

  // 6) Persist the agent reply + advance the conversation.
  await db.query(
    `INSERT INTO conversation_messages (conversation_id, sender, text, intent) VALUES ($1, $2, $3, $4)`,
    [conversationId, 'agent', result.reply, result.intent],
  );
  await db.query(
    `UPDATE conversations
        SET stage = $1, lead_score = lead_score + $2, status = $3, last_message_at = now()
      WHERE id = $4`,
    [result.nextStage, result.leadScoreDelta, result.nextStage === 'closing' ? 'active' : status, conversationId],
  );

  // 7) Send the reply.
  await transport.sendText(inbound.from, result.reply);

  return result;
}

async function resolveBusiness(db: Pool) {
  // Default business: the most recent one. (Multi-business routing is a later concern.)
  const r = await db.query(`SELECT id, name, tone FROM businesses ORDER BY created_at DESC LIMIT 1`);
  if (r.rows.length === 0) throw new Error('no business configured — create one via /api/businesses first');
  return r.rows[0];
}

async function resolveProduct(db: Pool, businessId: string) {
  const r = await db.query(
    `SELECT name, price, price_unit, usp, offer FROM products
      WHERE business_id = $1 ORDER BY is_primary DESC, created_at ASC LIMIT 1`,
    [businessId],
  );
  if (r.rows.length === 0) return { name: 'our product', price: null, price_unit: null, usp: '', offer: '' };
  return r.rows[0];
}

/** Convenience: build the default transport. */
export function defaultTransport(): WhatsAppTransport {
  return new CloudApiTransport();
}

import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * M6 — WhatsApp Cloud API transport.
 *
 * Decoupled from the sales brain: the broker reasons, this layer only moves
 * messages. Two responsibilities:
 *   1. Verify inbound webhook signatures (Meta x-hub-signature-256).
 *   2. Send agent replies back through the WhatsApp Cloud API.
 *
 * When WHATSAPP_TOKEN / WHATSAPP_PHONE_ID are not set, the transport is a
 * no-op recorder (logs and returns a synthetic message id) so the whole flow
 * can run end-to-end locally without Meta credentials.
 */

export interface InboundMessage {
  /** Sender's WhatsApp phone number (E.164). */
  from: string;
  /** Message text. */
  text: string;
  /** Meta message id (for dedup / acks). */
  messageId: string;
  /** Timestamp (sec). */
  timestamp: number;
}

export interface WhatsAppTransport {
  /** Decode a Meta webhook payload into inbound messages ([] when none). */
  parseInbound(body: any): InboundMessage[];
  /** Send a text reply to a lead. */
  sendText(to: string, text: string): Promise<void>;
}

const WHATSAPP_API = 'https://graph.facebook.com/v20.0';

export class CloudApiTransport implements WhatsAppTransport {
  constructor(
    private readonly token = process.env.WHATSAPP_TOKEN ?? '',
    private readonly phoneNumberId = process.env.WHATSAPP_PHONE_ID ?? '',
  ) {}

  parseInbound(body: any): InboundMessage[] {
    const entries = body?.entry ?? [];
    const out: InboundMessage[] = [];
    for (const entry of entries) {
      for (const change of entry?.changes ?? []) {
        const v = change?.value ?? {};
        for (const msg of v.messages ?? []) {
          const text = msg?.text?.body ?? '';
          if (!text) continue;
          out.push({
            from: msg.from ?? '',
            text,
            messageId: msg.id ?? '',
            timestamp: Number(msg.timestamp ?? 0),
          });
        }
      }
    }
    return out;
  }

  async sendText(to: string, text: string): Promise<void> {
    if (!this.token || !this.phoneNumberId) {
      // No-op recorder: keeps the flow runnable without Meta credentials.
      console.log(`[whatsapp:send] -> ${to}: ${text.slice(0, 120)}${text.length > 120 ? '…' : ''}`);
      return;
    }
    const res = await fetch(`${WHATSAPP_API}/${this.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`WhatsApp send failed ${res.status}: ${await res.text()}`);
  }
}

/** Verify the x-hub-signature-256 header against the raw body. */
export function verifySignature(header: string | undefined, rawBody: string, secret: string): boolean {
  if (!header) return false;
  const expected = header.startsWith('sha256=') ? header.slice(7) : header;
  const actual = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(actual, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Webhook verification (GET) challenge handshake. */
export function verifyWebhook(mode: string, token: string, challenge: string, expectedToken: string): string | null {
  if (mode === 'subscribe' && token === expectedToken) return challenge;
  return null;
}

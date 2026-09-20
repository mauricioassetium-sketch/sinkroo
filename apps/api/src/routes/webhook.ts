import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { verifySignature, verifyWebhook, CloudApiTransport } from '../integrations/whatsapp.js';
import { handleInbound } from '../services/conversation.js';

/**
 * M6 — WhatsApp webhook routes.
 *
 * GET  /webhooks/whatsapp  → Meta verification handshake (subscribe challenge).
 * POST /webhooks/whatsapp  → inbound message; verifies x-hub-signature-256,
 *                            runs the conversational turn, replies via Cloud API.
 *
 * Both are config-driven: when the verify token / app secret are unset, the
 * handshake returns the challenge and the signature step is skipped so local
 * testing stays frictionless.
 */

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? '';
const APP_SECRET = process.env.WHATSAPP_APP_SECRET ?? '';

export async function webhookRoutes(app: FastifyInstance, db: Pool, transport: CloudApiTransport = new CloudApiTransport()) {
  // Capture the raw body for signature verification.
  let rawBody = '';
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
    rawBody = typeof body === 'string' ? body : '';
    try { done(null, JSON.parse(rawBody)); } catch { done(null, {}); }
  });

  app.get('/webhooks/whatsapp', async (req: any, reply) => {
    const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query as any;
    const result = verifyWebhook(String(mode ?? ''), String(token ?? ''), String(challenge ?? ''), VERIFY_TOKEN || String(token ?? ''));
    if (result == null) return reply.code(403).send({ error: 'verification failed' });
    return reply.type('text/plain').send(result);
  });

  app.post('/webhooks/whatsapp', async (req: any, reply) => {
    const signature = req.headers['x-hub-signature-256'] as string | undefined;
    if (APP_SECRET && !verifySignature(signature, rawBody, APP_SECRET)) {
      return reply.code(401).send({ error: 'invalid signature' });
    }

    const messages = transport.parseInbound(req.body);
    if (messages.length === 0) {
      // Status/echo updates carry no text — ack silently.
      return reply.send({ ok: true, handled: 0 });
    }

    const results = [];
    for (const msg of messages) {
      const r = await handleInbound(db, transport, msg);
      results.push(r);
    }
    return reply.send({ ok: true, handled: results.length, results });
  });
}

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
 * SEGURIDAD (esto estaba abierto)
 *   Antes, si `WHATSAPP_VERIFY_TOKEN` o `WHATSAPP_APP_SECRET` no estaban puestos, la ruta se los saltaba
 *   «para que probar en local siguiera siendo cómodo»: el saludo del GET se contestaba con el token que
 *   mandara quien llamaba, y el POST aceptaba cualquier cuerpo sin firma. Cualquiera en internet podía
 *   hacerse pasar por Meta y meter conversaciones y mensajes en la base a nombre de un negocio. Y en el
 *   servidor de producción esos valores NO estaban puestos: no era teórico.
 *   Ahora la regla es la contraria: sin configurar, la ruta NO atiende (503 y listo). Se configura el día
 *   que se conecte WhatsApp de verdad, con el token y el secreto que da Meta.
 */

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? '';
const APP_SECRET = process.env.WHATSAPP_APP_SECRET ?? '';

export async function webhookRoutes(app: FastifyInstance, db: Pool, transport: CloudApiTransport = new CloudApiTransport()) {
  // El cuerpo crudo se guarda EN LA PETICIÓN, no en una variable del módulo: la firma se calcula sobre
  // los bytes que llegaron, y con una variable compartida dos peticiones simultáneas se pisaban el
  // cuerpo (una terminaba comprobando la firma contra el texto de la otra).
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
    const crudo = typeof body === 'string' ? body : '';
    (req as { cuerpoCrudo?: string }).cuerpoCrudo = crudo;
    try { done(null, JSON.parse(crudo)); } catch { done(null, {}); }
  });

  app.get('/webhooks/whatsapp', async (req: any, reply) => {
    if (!VERIFY_TOKEN) {
      return reply.code(503).send({
        error: 'el webhook de WhatsApp no está configurado en el servidor',
        codigo: 'whatsapp_sin_configurar',
        detalle: 'falta la variable WHATSAPP_VERIFY_TOKEN: hasta que esté, el webhook no atiende a nadie',
      });
    }
    const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query as any;
    const result = verifyWebhook(String(mode ?? ''), String(token ?? ''), String(challenge ?? ''), VERIFY_TOKEN);
    if (result == null) return reply.code(403).send({ error: 'verification failed' });
    return reply.type('text/plain').send(result);
  });

  app.post('/webhooks/whatsapp', async (req: any, reply) => {
    if (!APP_SECRET) {
      return reply.code(503).send({
        error: 'el webhook de WhatsApp no está configurado en el servidor',
        codigo: 'whatsapp_sin_configurar',
        detalle: 'falta la variable WHATSAPP_APP_SECRET: sin el secreto de Meta no se puede comprobar la firma, así que no se atiende nada',
      });
    }
    const signature = req.headers['x-hub-signature-256'] as string | undefined;
    if (!verifySignature(signature, String(req.cuerpoCrudo ?? ''), APP_SECRET)) {
      return reply.code(401).send({ error: 'invalid signature' });
    }

    const messages = transport.parseInbound(req.body);
    if (messages.length === 0) {
      // Status/echo updates carry no text — ack silently.
      return reply.send({ ok: true, handled: 0 });
    }

    const results: unknown[] = [];
    for (const msg of messages) {
      try {
        results.push(await handleInbound(db, transport, msg));
      } catch (e) {
        req.log.error(e);
        if (String((e as Error).message) === 'sin_negocio_para_el_numero') {
          // Se responde 200 igual: el mensaje está bien formado y la firma es válida, pero el número que
          // lo recibió no está conectado a ningún negocio. Reintentarlo no lo arregla.
          results.push({
            ok: false, codigo: 'sin_negocio_para_el_numero',
            detalle: 'el número de WhatsApp que recibió el mensaje no está conectado a ningún negocio',
          });
          continue;
        }
        results.push({ ok: false, codigo: 'sin_respuesta' });
      }
    }
    return reply.send({ ok: true, handled: results.length, results });
  });
}

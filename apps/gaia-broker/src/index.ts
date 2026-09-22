import './crypto-polyfill.js';
import Fastify from 'fastify';
import { GaiaBroker } from './broker.js';
import type { CreativeBrief } from './providers.js';
import { BROKER_AGENT_IDS, type BrokerAgentId } from './deep-agents.js';
const broker_agent_ids: string[] = [...BROKER_AGENT_IDS, 'sales-closer'];
import type { ConversationState } from '@sinkroo/core';

/**
 * GAIA broker HTTP service.
 * - POST /evaluate  { copy, id?, imageUrl?, channel?, audience? }  → swarm verdict
 * - POST /generate  { productName, usp, offer?, audience?, tone?, channel?, cta?, count? }  → copy variants
 */

const broker = new GaiaBroker();

async function build() {
  const app = Fastify({ logger: true });

  app.get('/healthz', async () => ({
    status: 'ok',
    service: 'gaia-broker',
    brain: broker.brain,
    deepBrain: broker.deepBrain,
  }));

  app.post<{ Body: { copy: string; id?: string; imageUrl?: string; channel?: string; audience?: string } }>(
    '/evaluate',
    async (req, reply) => {
      if (!req.body?.copy || req.body.copy.length < 10) {
        return reply.code(400).send({ error: 'copy required (min 10 characters)' });
      }
      const result = await broker.evaluate({
        id: req.body.id ?? `cre-${Date.now()}`,
        copy: req.body.copy,
        imageUrl: req.body.imageUrl,
        channel: req.body.channel ?? 'meta',
        audience: req.body.audience,
      });
      return { ...result, brain: broker.brain };
    },
  );

  // M3 — Pre-spend validation: judges AND predicts performance in one step
  app.post<{ Body: { copy: string; channel?: string; audience?: string } }>('/predict', async (req, reply) => {
    if (!req.body?.copy || req.body.copy.length < 10) {
      return reply.code(400).send({ error: 'copy required (min 10 characters)' });
    }
    const result = await broker.predict({
      id: `pre-${Date.now()}`,
      copy: req.body.copy,
      channel: req.body.channel ?? 'meta',
      audience: req.body.audience,
    });
    return result;
  });

  // M6 — Conversational sales turn
  app.post<{ Body: ConversationState }>('/converse', async (req, reply) => {
    if (!req.body?.conversationId || !req.body?.history) {
      return reply.code(400).send({ error: 'conversationId and history are required' });
    }
    return broker.converse(req.body);
  });

  // M4 — Creative generation from a product brief
  app.post<{ Body: CreativeBrief & { count?: number } }>('/generate', async (req, reply) => {
    const b = req.body;
    if (!b?.productName || !b?.usp) {
      return reply.code(400).send({ error: 'productName and usp are required' });
    }
    const count = Number(b.count ?? 5);
    const variants = await broker.generateCreatives(b, count);
    return { variants, brain: broker.brain, count: variants.length };
  });

  // Deep Agents (LangGraph) — corre un agente por id con la task del body.
  // Body: { userId, instruction, context, data? }
  app.post<{ Body: { userId: string; instruction: string; context?: Record<string, unknown>; data?: Record<string, unknown> } }>(
    '/agents/:id',
    async (req, reply) => {
      const id = (req.params as { id: string }).id;
      const b = req.body;
      if (!broker_agent_ids.includes(id)) {
        return reply.code(404).send({ error: `unknown agent "${id}"`, available: broker_agent_ids });
      }
      if (!b?.userId || !b?.instruction) {
        return reply.code(400).send({ error: 'userId and instruction are required' });
      }
      const task = {
        instruction: b.instruction,
        context: { userId: b.userId, ...(b.context ?? {}) },
        data: b.data,
      };
      const result = await broker.runAgent(id as BrokerAgentId, task);
      return { agentId: id, result, deepBrain: broker.deepBrain };
    },
  );

  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = await build();
  const port = Number(process.env.PORT ?? 3100);
  await app.listen({ port, host: '0.0.0.0' });
}

export { GaiaBroker, build };

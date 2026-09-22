/**
 * Los 6 Deep Agents de Sinkroo — GRAFOS LangGraph definidos una sola vez (plataforma),
 * instanciados con la memoria de un usuario concreto (userId).
 *
 * Principio (ADR-0005): "definición compartida, memoria privada".
 */

import { StateGraph, Annotation, MemorySaver, START, END, CompiledStateGraph } from '@langchain/langgraph';
import { ChatRuntime } from './chat-runtime.js';
import type { DeepAgentId, DeepAgentResult, DeepAgentTask, BusinessContext } from './types.js';
import { z } from 'zod';

const DeepState = Annotation.Root({
  userId: Annotation<string>,
  instruction: Annotation<string>,
  context: Annotation<BusinessContext>,
  task: Annotation<DeepAgentTask>,
  draft: Annotation<DeepAgentResult>({
    reducer: (a, b) => ({ ...a, ...b }),
    default: () => ({ agentId: '' as DeepAgentId, summary: '', actions: [], insights: {}, trace: [] }),
  }),
});

export const resultSchema = z.object({
  summary: z.string(),
  actions: z.array(z.string()),
  insights: z.record(z.string(), z.string()),
});

function pushTrace(d: DeepAgentResult, node: string): DeepAgentResult {
  return { ...d, trace: [...d.trace, node] };
}

export abstract class DeepAgent {
  readonly id: DeepAgentId;
  protected readonly runtime: ChatRuntime;
  private readonly graph: CompiledStateGraph<any, any, any, any, any, any>;

  constructor(id: DeepAgentId, runtime: ChatRuntime) {
    this.id = id;
    this.runtime = runtime;
    this.graph = this.build();
  }

  protected abstract build(): CompiledStateGraph<any, any, any, any, any, any>;

  async run(task: DeepAgentTask): Promise<DeepAgentResult> {
    const final = await this.graph.invoke(
      {
        userId: task.context.userId,
        instruction: task.instruction,
        context: task.context,
        task,
        draft: { agentId: this.id, summary: '', actions: [], insights: {}, trace: [] },
      },
      { configurable: { thread_id: `deep-${this.id}-${task.context.userId}` } },
    );
    return { ...final.draft, agentId: this.id };
  }
}

// =========================================================================================
// #1 — market-analyst
// =========================================================================================

export class MarketAnalystAgent extends DeepAgent {
  constructor(runtime: ChatRuntime) {
    super('market-analyst', runtime);
  }

  protected build() {
    const self = this;
    const g = new StateGraph(DeepState)
      .addNode('analyze', async (state) => {
        const c = state.context;
        const sys = 'You are Sinkroo\'s senior market analyst. Analyze ONE user\'s market opportunity, competition and audience from their context and any provided data.';
        const user = [
          `Business: ${c.businessName ?? '(unknown)'}`,
          `Product: ${c.productName ?? '(unknown)'}`,
          `Audience: ${c.audience ?? '(general)'}`,
          `USP: ${c.usp ?? '(none)'}`,
          `Data: ${JSON.stringify(state.task.data ?? {})}`,
          `Instruction: ${state.instruction}`,
          '',
          'Respond strict JSON: {"summary":"<2-4 frases>","actions":["<recomendación>"],"insights":{"opportunity":"<...>","audience":"<...>","competition":"<...>"}}',
        ].join('\n');
        let d: z.infer<typeof resultSchema>;
        if (self.runtime.offline) {
          d = {
            summary: `Análisis preliminar de ${c.businessName ?? 'tu negocio'} en modo determinista: sin cerebro LLM disponible. ${state.instruction}`,
            actions: ['Conectar credenciales del LLM para análisis completo', 'Validar audiencia objetivo con datos propios'],
            insights: { opportunity: 'Modo offline: análisis de mercado pendiente hasta conectar el cerebro.', audience: c.audience ?? 'general', competition: 'sin datos' },
          };
        } else {
          const r = await self.runtime.json<z.infer<typeof resultSchema>>(sys, user);
          const p = resultSchema.safeParse(r);
          d = p.success ? p.data : { summary: 'No se pudo analizar el mercado.', actions: [], insights: {} };
        }
        return { draft: { ...pushTrace(state.draft, 'analyze'), ...d } };
      })
      .addEdge(START, 'analyze')
      .addEdge('analyze', END);
    return g.compile({ checkpointer: new MemorySaver() });
  }
}

// =========================================================================================
// #2 — marketing-strategist
// =========================================================================================

export class MarketingStrategistAgent extends DeepAgent {
  constructor(runtime: ChatRuntime) {
    super('marketing-strategist', runtime);
  }

  protected build() {
    const self = this;
    const g = new StateGraph(DeepState)
      .addNode('strategize', async (state) => {
        const c = state.context;
        const sys = 'You are Sinkroo\'s marketing strategist. Given one user\'s context and any research, decide positioning, offer angle and budget. Be concrete and decisive.';
        const user = [
          `Business: ${c.businessName ?? '(unknown)'}`,
          `Product: ${c.productName ?? '(unknown)'}`,
          `Audience: ${c.audience ?? '(general)'}`,
          `USP: ${c.usp ?? '(none)'}`,
          `Research: ${JSON.stringify(state.task.data ?? {})}`,
          `Instruction: ${state.instruction}`,
          '',
          'Respond strict JSON: {"summary":"<2-4 frases>","actions":["<decisión>"],"insights":{"positioning":"<...>","offer":"<...>","budget":"<...>"}}',
        ].join('\n');
        let d: z.infer<typeof resultSchema>;
        if (self.runtime.offline) {
          d = {
            summary: `Estrategia preliminar para ${c.businessName ?? 'tu negocio'} en modo determinista. ${state.instruction}`,
            actions: ['Definir posicionamiento con el market-analyst con LLM activo', 'Arrancar con presupuesto de prueba pequeño y medir antes de escalar'],
            insights: { positioning: 'Modo offline: posicionamiento pendiente.', offer: c.usp ?? 'sin USP', budget: 'empezar pequeño, escalar con datos' },
          };
        } else {
          const r = await self.runtime.json<z.infer<typeof resultSchema>>(sys, user);
          const p = resultSchema.safeParse(r);
          d = p.success ? p.data : { summary: 'No se pudo definir estrategia.', actions: [], insights: {} };
        }
        return { draft: { ...pushTrace(state.draft, 'strategize'), ...d } };
      })
      .addEdge(START, 'strategize')
      .addEdge('strategize', END);
    return g.compile({ checkpointer: new MemorySaver() });
  }
}

// =========================================================================================
// #3 — creative-strategist
// =========================================================================================

export class CreativeStrategistAgent extends DeepAgent {
  constructor(runtime: ChatRuntime) {
    super('creative-strategist', runtime);
  }

  protected build() {
    const self = this;
    const g = new StateGraph(DeepState)
      .addNode('generate', async (state) => {
        const c = state.context;
        const sys = 'You are Sinkroo\'s senior creative strategist and copywriter. Write ad copy concepts for ONE user\'s product. 60-160 chars per variant, lean on the USP, distinct angles.';
        const user = [
          `Business: ${c.businessName ?? '(unknown)'}`,
          `Product: ${c.productName ?? '(unknown)'}`,
          `USP: ${c.usp ?? '(none)'}`,
          `Audience: ${c.audience ?? '(general)'}`,
          `Instruction: ${state.instruction}`,
          '',
          'Respond strict JSON: {"summary":"<2-4 frases del concepto>","actions":["<variant 1>","<variant 2>","<variant 3>"],"insights":{"angle":"<...>"}}',
        ].join('\n');
        let d: z.infer<typeof resultSchema>;
        if (self.runtime.offline) {
          d = {
            summary: `Tres variantes de copy deterministas para ${c.productName ?? 'tu producto'}. ${state.instruction}`,
            actions: [
              `${c.usp ?? 'Resultados reales'} — sin promesas vacías.`,
              `${c.productName ?? 'Tu producto'}: probalo ${c.audience ? `si sos ${c.audience}` : 'hoy'} y decidí con datos.`,
              `Cambio real en ${c.businessName ?? 'tu negocio'} o te devolvemos la diferencia.`,
            ],
            insights: { angle: 'Modo offline: USP directo como ángulo principal.' },
          };
        } else {
          const r = await self.runtime.json<z.infer<typeof resultSchema>>(sys, user);
          const p = resultSchema.safeParse(r);
          d = p.success ? p.data : { summary: 'No se pudo generar copy.', actions: [], insights: {} };
        }
        return { draft: { ...pushTrace(state.draft, 'generate'), ...d } };
      })
      .addEdge(START, 'generate')
      .addEdge('generate', END);
    return g.compile({ checkpointer: new MemorySaver() });
  }
}

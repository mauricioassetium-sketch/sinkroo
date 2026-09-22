/**
 * Contratos de los Deep Agents.
 *
 * Principio ADR-0005: definición compartida (plataforma) + memoria privada (usuario).
 * Cada agente es un GRAFO LangGraph definido una vez; el `userId` particiona la
 * memoria (checkpointer por namespace) — nunca una definición por usuario.
 */

/** Identifica de forma única un hilo de un usuario concreto (memoria privada). */
export type UserId = string;

export type DeepAgentId =
  | 'market-analyst'
  | 'marketing-strategist'
  | 'creative-strategist'
  | 'sales-closer'
  | 'media-buyer'
  | 'performance-analyst';

/** Contexto del negocio del usuario — la memoria "fría" que alimenta al agente. */
export interface BusinessContext {
  userId: UserId;
  businessName?: string;
  productName?: string;
  offer?: string;
  usp?: string;
  audience?: string;
  tone?: string;
  language?: string;
  channel?: string;
}

/** Un paso de trabajo pedido al agente. */
export interface DeepAgentTask {
  /** Instrucción libre del usuario o del orquestador. */
  instruction: string;
  /** Contexto del negocio del usuario que hace el pedido. */
  context: BusinessContext;
  /** Datos estructurados opcionales (benchmark, informe previo, budget…). */
  data?: Record<string, unknown>;
}

/** Salida estructurada del agente (validada con zod dentro del grafo). */
export interface DeepAgentResult {
  agentId: DeepAgentId;
  /** Resumen ejecutivo en 2-4 frases, en el idioma del usuario. */
  summary: string;
  /** Acciones recomendadas, ordenadas, accionables. */
  actions: string[];
  /** Datos/insights clave que otro agente del ciclo puede reusar. */
  insights: Record<string, string>;
  /** Señal para el orquestador: ¿necesita más trabajo de otro agente? */
  nextAgent?: DeepAgentId;
  /** Trazabilidad del grafo: nodos recorridos. */
  trace: string[];
}

/** Config del runtime de chat (mismo contrato que usa el ChatProvider del broker). */
export interface ChatRuntimeConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
  authHeader?: string;
  temperature?: number;
  timeoutMs?: number;
}

export const DEEP_AGENT_IDS: readonly DeepAgentId[] = [
  'market-analyst',
  'marketing-strategist',
  'creative-strategist',
  'sales-closer',
  'media-buyer',
  'performance-analyst',
];

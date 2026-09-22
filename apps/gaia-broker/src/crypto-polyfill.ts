/**
 * Polyfill de webcrypto para Node 18 — LangGraph usa globalThis.crypto en invoke().
 * Node 20 (producción, node:20-alpine) ya lo expone nativo: acá es un no-op.
 * Importarlo primero desde index.ts, antes de cualquier invoke de grafo.
 */
import { webcrypto } from 'node:crypto';

const g = globalThis as unknown as { crypto?: unknown };
if (!g.crypto) {
  g.crypto = webcrypto;
}

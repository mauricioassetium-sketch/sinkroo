# Sinkroo

**Autonomous AI Marketing Infrastructure** — el primer Marketing Operating System que simula la realidad para predecir, ejecutar y escalar campañas con precisión.

## Estructura del monorepo

```
sinkroo/
├── index.html, assets/, *.png   # landing actual (sinkroo.pages.dev) — INTACTA
├── apps/
│   ├── web/        # dashboard del producto (React/TypeScript)
│   └── api/        # backend Node/TypeScript (Fastify)
├── packages/
│   ├── core/       # contrato de datos + score 0-100 (schema compartido)
│   ├── engine/     # Sinkroo Engine — motor de enjambre (N agentes votan 0-100)
│   └── gaia/       # cliente orquestador GAIA <-> Sinkroo
├── infra/          # docker-compose, PostgreSQL, scripts de despliegue
└── docs/           # spec v1.2 + ADRs (decisiones de arquitectura)
```

## Decisiones clave (Etapa 0)

- **Stack:** Node/TypeScript + PostgreSQL, desplegado en servidor propio.
- **Motor de enjambre:** reimplementado como **Sinkroo Engine** (TS puro), sin dependencias AGPL.
- **GAIA** es el orquestador/cerebro (copy, imágenes, texto, voz, analytics).

Ver `docs/adr/` para el detalle de cada decisión.

> **Nota:** este README convive con la landing actual sin tocarla. El código vivo del producto está en `apps/` y `packages/`.

## Verificación rápida (Etapa 0)

```bash
npm install
npm run build --workspace packages/core
npm run build --workspace packages/engine
npm run build --workspace packages/gaia
node scripts/verify-engine.mjs
```

Debe imprimir `overallScore` + `verdict` y terminar con `OK: verificaciones pasaron`.

---

## Estado del proyecto

### Etapa 0 — Fundación ✅
Monorepo npm workspaces + contrato de datos + `Sinkroo Engine` (motor de enjambre determinista).

### Etapa 1 — Núcleo vivo ✅
- **`packages/gaia`** — `GaiaEvaluator` con dos backends intercambiables:
  - `HttpGaiaClient` → endpoint real de GAIA (chat completions).
  - `LocalGaiaClient` → fallback determinista offline.
  - Fábrica `createGaiaEvaluator({ endpoint?, client? })`.
- **`apps/api`** — Fastify + PostgreSQL:
  - `GET /health`
  - `POST /api/swarm/evaluate` → enjambre completo → veredicto.
  - Esquema núcleo: `users`, `products`, `creatives`, `swarm_results`.

### Cómo correr
```bash
npm install
npm run build          # core → engine → gaia → api
npm run verify         # verifica motor + GAIA
node apps/api/dist/index.js   # levanta la API en :3000
```

### Conexión a GAIA real
Cuando exista el endpoint, se activa por entorno, sin tocar código:
```bash
export GAIA_ENDPOINT_URL=https://tu-gaia.orijins.app/v1
export DATABASE_URL=postgres://usuario:clave@host:5432/sinkroo
```
Sin `GAIA_ENDPOINT_URL`, el enjambre corre con el fallback local (siempre operativo).

### Capa conectora (GaiaBroker)
`apps/gaia-broker` encapsula el razonamiento de IA detrás de una sola interfaz.
Orden de resolución del "cerebro":
1. `GAIA_ENDPOINT_URL` → endpoint real de orijins (futuro).
2. `PROVIDER_BASE_URL` + `PROVIDER_API_KEY` → cualquier LLM chat-completions.
3. fallback local (siempre operativo).

`apps/api` ahora delega el juicio al broker (via `BROKER_URL`), en lugar de duplicar lógica.
Endpoints: broker `POST /evaluate`, `GET /healthz`. Ver `apps/gaia-broker/.env.example`.

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

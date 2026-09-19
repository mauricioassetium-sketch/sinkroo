# ADR-0001: Estructura del monorepo

**Estado:** Aceptado
**Fecha:** 2026-09-20
**Decidido por:** Mauricio + GAIA

## Contexto

El repo `sinkroo` era una landing estática (build Vite sin `src/`) espejada
desde `sinkroo.pages.dev`. El producto real (motor de enjambre + orquestación
GAIA) no tenía representación en código.

## Decisión

Convertir `sinkroo` en un monorepo npm workspaces, **sin tocar la landing actual**:

- `apps/web`, `apps/api`, `packages/core`, `packages/engine`, `packages/gaia`, `infra/`, `docs/`
- La landing (index.html, assets/, PNGs) permanece en la raíz intacta.

## Consecuencias

- Una sola fuente de verdad y un solo CI.
- La landing y el producto conviven hasta migrar la landing a `apps/web` cuando tenga sentido.

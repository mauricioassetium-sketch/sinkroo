# ADR-0002: Reimplementar el motor de enjambre (Sinkroo Engine) en lugar de forkear MiroFish

**Estado:** Aceptado
**Fecha:** 2026-09-20
**Decidido por:** Mauricio + GAIA

## Contexto

`MiroFish` (repo existente) es un proyecto open-source de terceros bajo
**AGPL-3.0**. Forkearlo e integrarlo habría heredado obligaciones de código
abierto (distribuir el fuente de Sinkroo ante clientes SaaS).

## Decisión

Reimplementar el motor de enjambre como **Sinkroo Engine**, en TypeScript,
100% propiedad de Mauricio, sin dependencia AGPL. El concepto (N agentes
evalúan una pieza y votan 0-100) es una técnica, no un API propietario.

GAIA actúa como el `Evaluator` del enjambre (encarna a cada agente).

## Consecuencias

- 100% control y propiedad legal del código.
- Más simple que MiroFish (no requiere Zep Cloud ni CAMEL OASIS).
- Costo inicial mayor (reescribir), beneficio permanente (sin candado AGPL).

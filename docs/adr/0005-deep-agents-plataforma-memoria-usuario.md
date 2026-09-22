# ADR-0005 — Deep Agents: definiciones de plataforma + memoria particionada por usuario

- **Estado:** aceptado
- **Fecha:** 2026-09-22
- **Decisor:** Mauricio (con recomendación de GAIA)

## Contexto

Sinkroo necesita agentes con memoria ("Deep Agents", patrón `deepagents` de langchain-ai)
que trabajen en todo el modelo — mercado, investigación, marketing — por tarea diaria del
usuario. MiroFish queda reservado **exclusivamente** para predicción, nunca como
cerebro/motor (ver ADR-0002: motor propio, sin fork AGPL).

La pregunta a resolver: ¿los agentes se crean **por usuario** o **por plataforma**?

## Decisión

Ni uno ni otro. **Definición compartida + memoria privada por usuario (arquitectura C).**

- **Definición (plataforma):** cada agente — su rol, prompt, herramientas y políticas —
  se define **una única vez**. Es un constructor de un grafo LangGraph, reutilizable para
  todos los usuarios.
- **Memoria (usuario):** el estado de cada conversación/hilo se particiona por `userId`
  (tabla `users` del Postgres existente). Mismo grafo, checkpoint/namespace distinto por
  usuario. Aislamiento firme: ningún usuario ve datos de otro.

```
DEFINICIÓN (una, plataforma)      +     MEMORIA (por userId)
market-analyst   (rol + tools)          ├─ hilo user-1
marketing-strategist (rol + tools)      ├─ hilo user-2
creative-strategist  (rol + tools)      └─ hilo user-N
```

## Consecuencias

- **Costo O(1) en definiciones**, O(usuarios activos) solo en memoria — no se duplican
  prompts ni lógica por usuario.
- **Mantenimiento O(1):** mejorar el prompt de un agente mejora para todos a la vez.
- **Aislamiento firme** vía `userId` (evita el fallo fatal de una memoria global compartida).
- **Aprendizaje conjunto limpio:** se pueden agregar señales anónimas a nivel plataforma
  (qué hooks generan más CTR en general) para alimentar a Miro, sin exponer datos
  individuales.

## Los 6 Deep Agents (dos olas)

**Ola 1 (fundacional):** `market-analyst` (investigación), `marketing-strategist`
(decisión), `creative-strategist` (creación).

**Ola 2 (operativa):** `sales-closer` (M6 como grafo), `media-buyer` (operación Meta),
`performance-analyst` (calibra a Miro).

Regla anti-fragmentación: lo que venga más allá de estos 6 **no es un agente nuevo, es
una tool dentro del grafo que le corresponde**.

## Alternativas rechazadas

- **A. Agente por usuario:** aislamiento máximo, pero costo y mantenimiento O(N) sin
  ganancia proporcional; sin aprendizaje compartido.
- **B. Agente global con memoria única:** costo mínimo, pero mezcla datos entre cuentas —
  inaceptable en un producto B2B multiusuario heterogéneo.

## Referencia

- Implementación era 1: `packages/deep-agents/src/` + verify `scripts/verify-deep-agents.mjs`.

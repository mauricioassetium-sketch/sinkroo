# ADR 0004 — GAIA como capa conectora (GaiaBroker)

## Contexto
Sinkroo necesita que sus agentes "juzguen" creativos con inteligencia real.
GAIA (el orquestador) es quien encarna a cada agente. Pero el motor corre
como proceso Node en el VPS del cliente, mientras GAIA vive en la
infraestructura de orijins. Entre ambos hace falta un cable.

## Decisión
Introducir `apps/gaia-broker`, un servicio que encapsula TODO el razonamiento
detrás de una única interfaz (`GaiaBroker.evaluate()`). Los backends son
intercambiables vía `ReasoningProvider`:

1. **Endpoint real de GAIA-orijins** — `GAIA_ENDPOINT_URL` (cuando exista).
2. **LLM chat-completions** — `PROVIDER_BASE_URL` + `PROVIDER_API_KEY`
   (OpenAI/Groq/Gemini/DeepSeek…), la capacidad real hoy.
3. **Local determinista** — fallback que evita que el enjambre se caiga.

El resto del sistema (apps/api, motor) solo llama `POST /evaluate`. No sabe
qué cerebro hay detrás.

## Consecuencias
- Cambiar/mejorar la inteligencia = cambiar el provider, sin tocar motor ni API.
- La credencial de IA es responsabilidad del operador (VPS), no del código.
- GAIA real se conecta cambiando UNA variable de entorno cuando el endpoint exista.

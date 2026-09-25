# 10 · El back: qué hay, qué falta y en qué orden

Estado: **borrador para aprobar**. Nada nuevo construido todavía (lo que sigue ya estaba en el repo).
Fecha: 25/09/2026.
Este documento reemplaza la versión anterior de este archivo, que proponía armar un back desde cero **sin
saber que el repo ya tenía uno**. El back ya arrancó: lo que hay que hacer ahora es terminarlo y conectar el
front.

---

## 1 · Lo que YA existe en el repo (verificado leyendo el código)

| Pieza | Dónde | Qué es |
|---|---|---|
| API | `apps/api` — Fastify + `pg` | Servidor HTTP con migración propia al arrancar (`src/lib/schema.ts`) |
| Rutas vivas | `src/routes/` | `health`, `swarm`, `businesses`, `products`, `generate`, `predict`, `webhook` |
| Servicios | `src/services/` | `conversation`, `generate`, `predict`, `swarm` |
| Integración WhatsApp | `src/integrations/whatsapp.ts` | Envío y webhook de mensajes |
| Esquema (inglés, convención de código) | `src/lib/schema.ts` | `businesses`, `products`, `conversations`, `conversation_messages` (M1: Business → Product → Creative → SwarmResult) |
| Engine | `packages/engine`, `packages/core` | El motor de piezas |
| GAIA | `packages/gaia` + `apps/gaia-broker` | Orquestador y su capa conectora (broker, providers, predict, deep-agents) |
| Memoria del negocio | `packages/deep-agents` | Agentes profundos con memoria |
| Verificaciones | `scripts/verify-engine.mjs`, `verify-gaia.mjs`, `verify-deep-agents.mjs` | Se corren con `npm run verify` |
| Migración de base | `scripts/migrate.mjs` | `npm run migrate` |
| Despliegue | `Dockerfile`, `docker-compose.yml` | VPS propio |

**Decisiones que ya están tomadas y no se reabren** (docs/adr): monorepo (0001), motor propio en vez de fork
(0002), **Node/TypeScript con Fastify y PostgreSQL en servidor propio** (0003), GAIA como capa conectora
(0004), agentes con memoria del negocio (0005).

**Consecuencia para el trabajo:** el back se **termina**, no se empieza. Y la librería de datos del front
tiene que hablar con esta API (`/api/...`), no con otra cosa.

---

## 2 · Cómo se conecta el front (la regla que ordena el trabajo)

1. **Primero el contrato:** qué necesita cada pantalla, con nombres y formas de datos. Se escribe una vez.
2. **Después una capa `src/api/` en el front** que exponga las mismas funciones que hoy salen de
   `src/data/*.ts` (por ejemplo `listarCampanas()`, `guardarPasoOnboarding()`, `pedirInformeMercado()`) y
   adentro haga HTTP. Cada pantalla cambia **una línea** (su import) y sigue igual.
3. **Se migra pantalla por pantalla**, con la demo viva al lado. Ninguna pantalla queda rota en el camino y
   se puede parar en cualquier momento sin dejar el panel a medias.

Eso permite mostrar avance real cada semana (una pantalla conectada es una pantalla que ya guarda de
verdad) en vez de un mes de trabajo invisible.

---

## 3 · Los módulos, con su estado

**Ya hay algo (extender, no crear):**

| # | Módulo | Estado real |
|---|---|---|
| 1 | Negocio (perfil) | `POST /api/businesses`, `GET /api/businesses`, `GET /api/businesses/:id` existen con la tabla `businesses`. Falta que acepte **todos** los campos del onboarding v2 (los cinco pasos, campos abiertos, listas) y el estado de cada paso. |
| 2 | Productos y precios | Existe (tabla `products`). Falta el precio en dólares con el equivalente local y las formas de pago. |
| 3 | Conversaciones | Existen `conversations` y `conversation_messages`, el servicio y la integración de WhatsApp. Falta la bandeja del dashboard (pasar a humano, colaboración con creador). |
| 4 | Motor y GAIA | Existen los paquetes y el broker, con sus verificaciones. Falta exponerlos como corridas con bitácora, costo en créditos y estado por tarea. |

**Falta (crear):**

| # | Módulo | Qué tiene que resolver |
|---|---|---|
| 5 | **Cuentas y sesiones** | Entrar (correo, contraseña, Google), sesiones, y la regla **un correo = una cuenta**. Es lo primero: sin esto no hay negocio al que pertenezcan los datos. |
| 6 | **Onboarding persistido** | Guardar los cinco pasos y el estado de cada uno, y el arranque del motor. Es lo que hace que el asistente de entrada sirva de verdad. |
| 7 | **Archivos y material** | Subir el material del negocio (PDF, Word, Excel, fotos, videos, audios), guardarlo en la carpeta y extraerle el texto. |
| 8 | **Créditos y planes** | El libro de créditos (cada consumo con su motivo), los planes Base/Pro/Estudio y el tope del mes. |
| 9 | **Campañas y piezas** | Las siete formas de publicar, las piezas con su formato, el día y la hora, los destinos y el presupuesto. |
| 10 | **Evaluación (MiroFish)** | Los 5 jueces y las 500 personas: puntajes, orden del 1 al 5 y el porqué de cada veredicto. |
| 11 | **Publicación y métricas** | Publicar en Instagram, Facebook, WhatsApp, TikTok y Google, y leer alcance, clics y costo por venta. |
| 12 | **Mercado** | Los anuncios de los competidores, la tendencia de búsqueda y los hallazgos con su fuente. |
| 13 | **Verificación (KYC)** | Documento y selfie, quién revisa y en qué estado está: es obligatorio para pautar. |
| 14 | **Cobros y referidos** | Suscripción, recarga de créditos, recompensas de referidos y su historial. |
| 15 | **Avisos y bitácora** | Avisos al negocio por WhatsApp y correo; bitácora de lo que hizo el motor con opción de revertir. |

---

## 4 · Lo que necesito de tu lado

**Ya decidido (no hace falta que respondas):** Node + TypeScript con Fastify, PostgreSQL, servidor propio
con Docker Compose, mismo repo (`apps/api`).

**Sí necesito, cuando llegue el momento:**

| Para qué | Qué hace falta |
|---|---|
| Publicar de verdad | Una app de Meta con permisos de publicación (Instagram, Facebook y WhatsApp Cloud API). Es el corazón del producto. |
| Pauta y ficha de Google | Clave de Google Ads y de Google Business. |
| TikTok | Clave de su API de publicación. |
| Los agentes | Proveedor de modelos y su clave, con el tope de gasto por negocio. |
| Cobros | Pasarela colombiana (Wompi o Mercado Pago). |
| Mercado | Acceso a la Biblioteca de anuncios de Meta. |
| Archivos | Almacenamiento de objetos (Cloudflare R2 o S3): los videos no pueden vivir en el servidor. |
| Despliegue | Dónde corre el back (VPS) y quién entra a esa máquina. |

**Ningún valor de estos se escribe en el repositorio:** todo por variables de entorno, y ningún secreto
aparece en el código, en los commits ni en el chat.

---

## 5 · En qué orden

**Fase 1 · La unión, sin ninguna clave** ← *es donde estoy*
Cuentas y sesiones, onboarding persistido, y la capa `src/api/` del front con **las pantallas de entrada y
Primeros pasos conectadas de verdad**. Al final: entrás, completás el onboarding, cerrás el navegador, volvés
y todo sigue ahí. Eso prueba que el front y el back están unidos.

**Fase 2 · Material y créditos** — archivos reales, extracción de texto, libro de créditos.
**Fase 3 · Campañas, piezas y evaluación** — crear campañas, evaluarlas con MiroFish, ordenarlas.
**Fase 4 · Publicar y medir** — (necesita Meta) publicación real y métricas de costo por venta.
**Fase 5 · Conversaciones, mercado y verificación.**
**Fase 6 · Cobros, referidos y avisos.**

---

## 6 · Lo primero que entrego

El final de la **Fase 1 probado de punta a punta**, con el front conectado a esta API: entrar, completar el
onboarding, salir, volver a entrar y encontrar todo como quedó. Sin credenciales de terceros de por medio.

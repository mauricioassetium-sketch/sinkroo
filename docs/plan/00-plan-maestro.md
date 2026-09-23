# Sinkroo — Plan Maestro: Back-end dirigido por el Dashboard

**Versión:** 1.0 · **Fecha:** 2026-09-23
**Método:** inversión (reverse-spec). El dashboard define el contrato; el back se construye para cumplirlo.
**Documento hermano:** `01-inventario-dashboard-spec.md` (inventario vista por vista).

---

## 0. Los tres principios

### 0.1 El dashboard manda
Ningún elemento visible del dashboard queda sin respaldo. Para cada uno hay que poder responder:
**¿qué entidad lo guarda, qué endpoint lo sirve, y qué pasa cuando el usuario interactúa?**
Si no hay respuesta, no se toca el front: primero se diseña el back.

Corolario: **se prohíbe el mock permanente.** Los datos de ejemplo del dashboard (`data.ts`,
`CONVERSACIONES`, `AGENTES`, `COMPETENCIA`…) no se borran: se convierten en el **seed de demo**
de cada tenant nuevo. Siguen sirviendo para que la app nunca se vea vacía, pero dejan de ser la
única fuente.

### 0.2 Todo lo externo es BYO (Bring Your Own)
**Ninguna credencial de plataforma vive en el código ni en la base como secreto compartido.**

- Sin credenciales conectadas, el sistema funciona igual, en **modo demo determinista** (como
  hoy). El usuario ve la app viva, con datos de ejemplo, y un aviso claro de qué conectar.
- Con credenciales conectadas, esas mismas pantallas se llenan con datos reales.
- **El usuario es dueño de sus tokens.** Sinkroo los cifra, los usa y los devuelve cuando el
  usuario revoca. Nunca los comparte entre tenants.

Esto tiene una consecuencia de negocio: Sinkroo no necesita registrar su propia app en cada
proveedor para el 100% de los casos, y no queda atado a cuotas ni a baneos de cuenta.

### 0.3 Todo estado real, cero simulación silenciosa
Si un dato es simulado, el front lo dice. El dashboard ya tiene el vocabulario correcto
("mercado simulado", "conv. simulada", "modo determinista"). Se formaliza: **toda respuesta de la
API declara su origen** (`source: "live" | "demo" | "simulated"`) y el front lo refleja.

---

## 1. Arquitectura objetivo

```
                        ┌─────────────────────────────────────┐
   Dashboard (React) ───│  API Gateway (Fastify)              │
   SSE / WebSocket      │  auth · tenants · RBAC · rate limit │
                        └──────────────┬──────────────────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        │                              │                              │
   ┌────▼─────┐                  ┌─────▼──────┐                 ┌─────▼──────┐
   │ Dominio  │                  │ Motor de   │                 │  Capa de   │
   │ (CRUD)   │                  │ Agentes    │                 │ Integración│
   │ campañas │                  │ (6 Deep    │                 │  (BYO)     │
   │ creativid│                  │  Agents)   │                 │            │
   │ mercado  │                  │ + Sinkroo  │                 │ OAuth2     │
   │ chat     │                  │   Engine   │                 │ API keys   │
   └────┬─────┘                  └─────┬──────┘                 └─────┬──────┘
        │                              │                              │
        │        ┌─────────────────────┼──────────────────────┐       │
        │        │                     │                      │       │
   ┌────▼────────▼───┐   ┌─────────────▼──────┐   ┌───────────▼───────▼──┐
   │  PostgreSQL     │   │  Cola + Scheduler  │   │  Credential Vault    │
   │  + RLS por      │   │  (Redis + BullMQ)  │   │  (AES-256-GCM, DEK    │
   │    tenant       │   │  jobs 24/7         │   │   por credencial)     │
   └─────────────────┘   └────────────────────┘   └───────────────────────┘
        │                                                     │
   ┌────▼─────────────┐                            ┌──────────▼──────────┐
   │  Object Storage  │                            │  Providers externos │
   │  (S3/MinIO)      │                            │  Meta · Google ·    │
   │  fotos videos    │                            │  WhatsApp · TikTok  │
   │  docs KYC        │                            │  Klaviyo · PSP      │
   └──────────────────┘                            └─────────────────────┘
```

**Servicios (contenedores):** `api`, `worker` (jobs + agentes), `webhooks` (público, recepción
Meta), `db`, `redis`, `storage`, `broker` (ya existe). El `broker` de hoy se reubica como
proveedor del motor de agentes.

---

## 2. La capa de integración BYO (la pieza central)

Este es el corazón del pedido. Todo lo externo pasa por acá.

### 2.1 Tres conceptos, tres tablas

```
providers          → catálogo de plataformas soportadas (plataforma, no usuario)
  key                  meta_ads | whatsapp_cloud | messenger | instagram |
                       google_maps | google_login | facebook_login | tiktok |
                       klaviyo | smtp | meta_pixel | stripe | mercadopago | kyc
  nombre, categoria, logo
  auth_type            oauth2 | api_key | bearer | basic | smtp | none
  scopes[], campos_requeridos[]   (driven-UI: el front dibuja el form solo)
  capabilities[]       qué sabe hacer: send_message, read_ads, create_campaign,
                       geocode, search_places, read_metrics, create_payment…
  docs_url, healthcheck_spec

connections        → una cuenta externa CONECTADA por un usuario
  id, tenant_id, provider_key
  external_account_id, external_account_name    (ej: act_123456, página, WABA)
  scopes[]
  status               pending | connected | expired | error | revoked
  health_checked_at, last_error, expires_at, refresh_token_expires_at
  metadata jsonb       (lo no secreto: phone_number_id, pixel_id, ad account)

credentials        → los secretos, tabla separada, cifrada
  connection_id (1:1)
  ciphertext, iv, auth_tag, key_ref             AES-256-GCM
  rotated_at, version
```

### 2.2 Los dos flujos de autenticación

**Flujo A — OAuth2 (Meta, Google, TikTok)**
Cuando el proveedor exige una app registrada, Sinkroo registra **una app propia por proveedor**
(no una por usuario). El usuario hace clic en "Conectar Meta Ads", autoriza, **y elige qué
cuentas comparte** (selector de ad accounts / páginas / WABAs). Sinkroo guarda el refresh token
de ese usuario y opera solo sobre lo que autorizó.

```
POST /api/connections/:provider/start
  → 200 { authUrl }        (state firmado con HMAC, atado a tenant+user, TTL 10 min)
[navegador del usuario → proveedor]
GET  /api/connections/:provider/callback?code=&state=
  → intercambio server-side, listo las cuentas disponibles
  → 200 { accounts: [...] }   el usuario elige
POST /api/connections/:provider/finish { accountId }
  → cifra y guarda la credencial, dispara healthcheck, status=connected
```

**Flujo B — Credencial directa (WhatsApp Cloud, Klaviyo, Pixel, SMTP)**
El proveedor no ofrece OAuth útil, o el usuario ya tiene sus tokens. El front dibuja el
formulario a partir de `providers.campos_requeridos` y el usuario pega sus datos.

```
POST /api/connections/:provider/connect
  { phoneNumberId, wabaId, accessToken, verifyToken, appSecret }
  → VALIDACIÓN OBLIGATORIA contra el proveedor antes de guardar (llamada de prueba real)
  → si falla: 422 con el error del proveedor, NO se guarda nada
  → si pasa: cifra, guarda, status=connected
```

> **Regla dura:** nunca se guarda una credencial sin haber probado que funciona. Un token
> guardado y roto es peor que ninguno: el usuario cree que está conectado y los datos no llegan.

### 2.3 Cifrado en reposo

- **Envelope encryption.** Una DEK (data key) aleatoria por credencial, cifrada con AES-256-GCM.
  La DEK se envuelve con una KEK que vive fuera de la base (`SINKROO_KEK` en el entorno del
  contenedor, mañana KMS/HSM). Si se roba un dump de la base, los secretos no sirven.
- Los secretos **nunca salen por la API**. `GET /api/connections/:id` devuelve metadata y
  `••••••4242`. No existe endpoint que devuelva un token.
- **Desconectar = borrar.** `DELETE /api/connections/:id` destruye la credencial y revoca del
  lado del proveedor cuando el proveedor lo permite. Si el usuario revoca desde Meta, el
  healthcheck marca `revoked` en la próxima corrida.
- **Rotación.** Cada proveedor declara su política (Meta: 60 días para el token de usuario;
  WhatsApp: token permanente de system user). Un job diario renueva lo que se puede y avisa lo
  que el usuario tiene que reconectar.

### 2.4 Salud, cuotas y degradación

- **Healthcheck** por conexión: cada 6-24h (según proveedor) una llamada barata. Resultado
  visible en Herramientas (verde/ámbar/rojo) — que es exactamente lo que la vista ya dibuja.
- **Cuotas por proveedor**: cada conexión lleva contador de llamadas y se respeta el rate limit
  del proveedor. Un tenant ruidoso no puede tumbar la integración de los demás (buckets por
  conexión).
- **Degradación ordenada:** si una conexión cae, la vista afectada lo dice y ofrece reconectar;
  el resto del sistema sigue funcionando en modo demo. **Nunca una integración caída debe tirar
  la app.**

### 2.5 Los 11 proveedores que el dashboard exige

| Proveedor | auth_type | Qué habilita en el dashboard | Notas |
|---|---|---|---|
| `whatsapp_cloud` | api_key | Vistas Dashboard y WhatsApp completas: bandeja, flujos, envío | token system user + WABA + phone id + verify token + app secret |
| `messenger` | oauth2 | Selector de canal Messenger, bandeja unificada | permisos de página |
| `instagram` | oauth2 | Publicaciones con más lead, seguidores, insights orgánicos | página FB vinculada |
| `meta_ads` | oauth2 | Campañas, inversión semanal, ROAS/CPC/CPA, lanzar y pausar | `ads_management` + `act_*` |
| `meta_pixel` | api_key | "Pixel + eventos" como herramienta + optimización real | Pixel ID + Conversions API |
| `tiktok` | oauth2 | Herramienta TikTok + formatos virales | TikTok Business |
| `klaviyo` | api_key | Email, carrito abandonado, post-venta | alternativa: `smtp` propio |
| `smtp` | smtp | Envío por email con el servidor del usuario | host/port/user/pass |
| `google_maps` | api_key | **El mapa de Mercado**: Maps JS + Places + Geocoding | ⚠️ requiere billing habilitado |
| `google_login` / `facebook_login` | oauth2 | Botones de Login | identidad, NO datos |
| `stripe` / `mercadopago` | api_key | Créditos, planes, facturas, auto-recarga | según país/moneda |
| `kyc_provider` | api_key | Verificación de identidad | o revisión manual (ver decisiones) |

**El catálogo es datos, no código.** Agregar un proveedor = insertar una fila en `providers` con
su spec. El front dibuja el formulario solo, lee `capabilities` y sabe qué ofrecer. Eso es lo que
permite que dentro de dos años haya 30 integraciones sin tocar el core.

### 2.6 Cómo se ve en el código

Hoy el broker resuelve el "cerebro" con 3 alternativas por variable de entorno
(`GAIA_ENDPOINT_URL` > `PROVIDER_*` > local). **Ese mismo patrón se generaliza a todas las
integraciones.** Un `IntegrationRegistry` con la misma forma:

```typescript
interface Integration {
  readonly provider: string;
  readonly capabilities: Capability[];
  health(connection: Connection): Promise<HealthResult>;
}
// y el consumo es capability-based, no provider-based:
await integrations.require(tenantId, 'send_message')      // resuelve la conexión que sepa hacerlo
await integrations.require(tenantId, 'read_ads')
await integrations.require(tenantId, 'geocode')
```

Ventaja: el dominio pide **capacidades**, no proveedores. Si mañana el usuario conecta TikTok en
vez de Meta Ads para captar, el código del motor de campañas no cambia una línea.

---

## 3. Modelo de dominio

### 3.1 Ya existe (3 de 5 tablas reutilizables)
`users` · `businesses` · `products` · `conversations` · `conversation_messages`

### 3.2 Nuevas entidades, por bloque

**Tenancy y acceso**
`tenants` · `memberships` (rol: admin/editor/analista/readonly) · `identities` · `audit_log` ·
`notifications` · `settings` (moneda, zona horaria)

**Ingesta y material** (Onboarding + Campañas)
`assets` (imagen/video/archivo, con storage_key, mime, tamaño, checksum, alt de IA) ·
`extractions` (lo que la IA sacó de un PDF/Excel) · `ingest_specs` (la spec dinámica por tipo de
campaña, hoy hardcodeada en `ingesta.ts`)

**Mercado** (vista M1)
`locations` · `market_snapshots` · `competitors` · `competitor_snapshots` · `market_places`
(competidores geolocalizados) · `market_publications` · `market_trends` · `market_findings`

**Estrategia** (M2)
`strategies` · `strategy_kpis` · `strategy_actions` · `strategy_risks` · `strategy_factors` ·
`strategy_roadmap`

**Campañas y creatividades** (M4, Creatividades, M7)
`campaign_types` (catálogo de los 15) · `campaigns` · `campaign_metrics` · `creatives` ·
`creative_variants` · `creative_metrics` · `evaluations` · `votes` · `simulations`

**Conversaciones** (Dashboard, M5)
`flows` · `flow_steps` · `flow_runs` · `conversation_events` · `suggestions`

**Agentes**
`agent_runs` (estado, fase, carga, traza, duración) · `agent_history` · `agent_thread`

**Economía**
`plans` · `subscriptions` · `credit_packs` · `wallet` · `credit_transactions` (libro de doble
entrada) · `invoices` · `payment_methods` · `referrals` · `referral_links`

**Integración** (§2)
`providers` · `connections` · `credentials` · `webhook_events` · `integration_calls`

**Cumplimiento**
`kyc_verifications` · `kyc_documents`

### 3.3 Aislamiento multi-tenant — no negociable
Toda tabla de negocio lleva `tenant_id`. **Row Level Security de Postgres activada** con política
por `current_setting('app.tenant_id')`. La app setea el tenant por request.

> Razón: el dashboard promete "operás hasta 8 marcas desde una sola cuenta" (Sinkroo Agency). Un
> bug de aislamiento ahí no es un bug: es una filtración de datos entre clientes. RLS lo hace
> imposible por diseño, no por disciplina.

---

## 4. Superficie de API

Convención única (que el `apps/api` de hoy no tiene y hay que fijar ya):

```jsonc
// Éxito
{ "data": {...}, "meta": { "source": "live|demo|simulated", "asOf": "ISO", "pagination": {...} } }
// Error
{ "error": { "code": "CONNECTION_EXPIRED", "message": "…", "provider": "meta_ads" } }
```

Códigos de error pensados para el front: `CONNECTION_REQUIRED`, `CONNECTION_EXPIRED`,
`CREDITS_INSUFFICIENT`, `PLAN_LIMIT_REACHED`, `KYC_REQUIRED`, `PROVIDER_RATE_LIMITED`.

**Grupos (~95 endpoints):**

| Grupo | Endpoints | Cubre |
|---|---|---|
| `/auth` | 8 | login, oauth social, refresh, sesión |
| `/me`, `/settings`, `/members`, `/notifications` | 12 | Config, Layout, Perfil, roles |
| `/onboarding` | 7 | los 7 pasos |
| `/api/assets`, `/api/ingest-specs` | 5 | subida de material |
| `/api/connections`, `/api/providers` | 9 | **Herramientas** |
| `/api/businesses`, `/api/products` | 8 | ya existen, se extienden |
| `/api/market/*` | 9 | Mercado |
| `/api/strategy/*` | 6 | Estrategia |
| `/api/campaigns`, `/api/campaign-types` | 10 | Campañas |
| `/api/creatives/*` | 9 | Creatividades + M7 |
| `/api/conversations/*`, `/api/flows/*`, `/api/whatsapp/*` | 14 | WhatsApp + Dashboard |
| `/api/agents/*` | 6 | Predictiva |
| `/api/simulation/*` | 3 | MiroFish |
| `/api/wallet`, `/api/credit-packs`, `/api/invoices`, `/api/subscriptions` | 10 | Créditos |
| `/api/referrals/*` | 4 | Referidos |
| `/api/kyc/*` | 4 | KYC |
| `/api/metrics/*` | 5 | Dashboard principal |
| `/api/stream` (SSE) | 1 | "En vivo" |
| `/webhooks/*` | 4 | entrantes por proveedor |

---

## 5. Motor de agentes y economía de créditos

### 5.1 Los 6 agentes (nombres del dashboard ↔ implementación real)

| Nombre | `technical` | Rol | Estado real hoy |
|---|---|---|---|
| **Lux** | `market-analyst` | Analista de Mercado | ✅ implementado (era 1) |
| **Rex** | `marketing-strategist` | Estratega de Marketing | ✅ implementado |
| **Nia** | `creative-strategist` | Creativa de Anuncios | ✅ implementado |
| **Kai** | `media-buyer` | Comprador de Medios | ✅ implementado (era 2, con MetaClient mock) |
| **Sol** | `performance-analyst` | Analista de Resultados | ✅ implementado |
| **Rumi** | `sales-closer` | Vendedor de Cierre | ✅ implementado |

Los 6 existen en `packages/deep-agents`. **Lo que falta no son agentes: es el sustrato que los
hace vivir** — cola, scheduler, historial persistente, estado en vivo, y el `MetaClient` real
detrás de la capa BYO. Hoy `InMemoryMetaClient` es un mock; con `meta_ads` conectado, Kai opera de
verdad.

### 5.2 Ciclo de vida de una corrida
```
trigger (manual | scheduler | evento)
  → agent_run (queued) → worker toma → (running) → nodos LangGraph
  → persiste trace, duración, resultado, consumo de créditos
  → (done | failed) → emite evento SSE → el dashboard lo refleja en vivo
  → enriquece agent_history (lo que muestra "Historial de trabajo, últimos 7 días")
```

### 5.3 Créditos: el medidor real
El dashboard muestra créditos en 4 vistas. Sin esto no hay producto, hay demo.

- **Cada acción de IA declara su costo** en una tabla `action_costs` (ej.: análisis de mercado 40
  cr, evaluación de enjambre 8 cr/voto, generación de 5 creativos 120 cr, respuesta de agente 2 cr).
- **Libro de doble entrada** en `credit_transactions`: entradas (plan, recarga, referidos) y
  salidas (acciones). Saldo = suma. Nunca un contador mutable — así la auditoría cierra siempre.
- **Reserva previa:** antes de una acción cara, se reserva el costo; si falla, se libera. Evita
  cobrar por un fallo.
- **Auto-recarga** con umbral (el dashboard dice 500 cr) y `CREDITS_INSUFFICIENT` como error
  tipado para que el front ofrezca recargar en el momento.

---

## 6. Realtime, scheduler y almacenamiento

- **SSE (`/api/stream`)** para "En vivo", pulsos de agentes, votación del momento, contadores de
  conversaciones. SSE y no WebSocket: es unidireccional, atraviesa proxies y reconecta solo.
- **Scheduler + cola (Redis + BullMQ):** jobs por tenant — vigilar campañas, healthcheck de
  conexiones, renovar tokens, recalibrar predicciones con resultados reales, enviar pasos de flujo
  con delay (los "+2 min", "+1 día", "+3 días" del editor de flujos **son jobs programados**, no
  `setTimeout`).
- **Object storage (S3/MinIO)** con URLs firmadas y subida directa desde el front (no por la API,
  para no cargar videos de 4 GB a través de Fastify). Reglas: límite por plan, validación de mime,
  antivirus, y los documentos de KYC en un bucket aparte con acceso restringido y retención.

---

## 7. Fases

Cada fase termina con algo **visible y verificable en el dashboard**, no con "el back quedó
listo".

### Fase 0 — Cimientos (bloqueante de todo)
Tenants + RLS · auth real (email + OAuth Google/Facebook) · membresías y roles · auditoría ·
contrato de API (`data`/`meta`/`error`) · migraciones versionadas · seed de demo por tenant.
**Entregable:** login real, y el dashboard entra con un usuario de verdad.

### Fase 1 — La capa BYO + Herramientas ⭐
`providers` · `connections` · `credentials` (cifrado envelope) · los flujos OAuth y de credencial
directa · healthcheck · webhooks entrantes. **Empezar por WhatsApp Cloud y Meta Ads** (son los dos
que desbloquean más vistas).
**Entregable:** la vista Herramientas muestra conexiones **reales**, con estado real, y se puede
conectar/desconectar de verdad.

### Fase 2 — Ingesta y material
`assets` + storage + subida directa · los 7 pasos del onboarding persistiendo · `ingest_specs`
migrada del front · extracción de documentos.
**Entregable:** el onboarding guarda todo de verdad y el material queda en el storage.

### Fase 3 — Conversaciones (M5 + Dashboard)
Bandeja unificada WA/Messenger · historial real · flujos como jobs · colas IA/humano ·
sugerencias · webhook → agente → respuesta.
**Entregable:** llega un mensaje real de WhatsApp y aparece en el dashboard; la IA responde.

### Fase 4 — Campañas, creatividades y métricas
`campaigns` + `creative_metrics` + `ad_spend_daily` · lanzar/pausar en Meta · sincronización
periódica de métricas · el `MetaClient` real detrás de Kai.
**Entregable:** los números del Dashboard principal y de Creatividades son reales.

### Fase 5 — Mercado y Estrategia
Google Maps + Places + Geocoding (BYO) · competidores reales por zona · publicaciones · tendencias ·
informes de Lux y Rex persistidos.
**Entregable:** el mapa de Mercado muestra competidores reales alrededor del negocio.

### Fase 6 — Agentes 24/7 + créditos
Scheduler · `agent_runs` persistente · SSE en vivo · wallet y `credit_transactions` ·
`action_costs` · auto-recarga.
**Entregable:** la vista Predictiva tiene historial real y los agentes corren solos.

### Fase 7 — Economía y cumplimiento
PSP (suscripciones, paquetes, facturas) · referidos multinivel · KYC · notificaciones ·
Sinkroo Agency (multi-marca) con white label.

### Fase 8 — Endurecimiento
Rate limiting por tenant y por conexión · observabilidad (traces por corrida de agente) ·
backups y restauración probada · runbook de incidentes · pentest del flujo de credenciales.

---

## 8. Decisiones que necesito de vos

Ninguna de estas la quiero decidir solo: cambian el diseño de raíz.

### 8.1 ¿Cuál es la numeración canónica de módulos?
El dashboard usa **M1 Mercado · M2 Estrategia · M3 Herramientas · M4 Campañas · M5 WhatsApp ·
M6 Fidelización · M7 Inteligencia Predictiva**.
El back/roadmap usa otra cosa (M1 ingesta, M3 pre-spend, M6 WhatsApp…).
**Propuesta:** el del dashboard pasa a ser el canónico — es el que el usuario ve, el que aparece
en créditos y el que se va a vender. Los hitos internos del código se renombran a `Hito N` para
no chocar.

### 8.2 ¿"6 Deep Agents" o "12 inteligencias"?
Predictiva dice las dos cosas: "los 6 Deep Agents" y "cada publicación pasa por las 12
inteligencias del sistema". Hay que elegir una cifra y sostenerla en todo el producto.
**Propuesta:** 6 agentes (roles) × 5 evaluadores del enjambre de creativos = **11 "inteligencias"**
que votan, 6 que actúan. O simplificar a 6 y borrar el 12.

### 8.3 WhatsApp: ¿solo Cloud API oficial, o también QR?
Cloud API oficial (BYO token) es lo correcto para un producto B2B: estable, legal, con plantillas.
Pero exige que el usuario tenga WhatsApp Business verificado y número propio.
Las librerías tipo QR (Baileys) permiten conectar cualquier WhatsApp en 30 segundos, pero violan
los términos de Meta y se banean.
**Propuesta:** solo Cloud API oficial. Si querés el camino fácil, se hace un proveedor
`whatsapp_qr` aparte, fuera del camino crítico y con aviso explícito de riesgo.

### 8.4 Meta: ¿una app de Sinkroo, o cada usuario su propia app?
Acá quiero ser claro porque "conectar su propia API de Facebook" puede significar dos cosas muy
distintas:
- **(A) Una app Sinkroo, cada usuario autoriza sus cuentas** — es el estándar de la industria
  (así funcionan todos los SaaS de marketing). Requiere que Sinkroo pase el App Review de Meta
  una vez. El usuario solo hace clic y elige sus ad accounts.
- **(B) Cada usuario registra su propia app en Meta** — sin App Review, pero es brutal para el
  usuario: tiene que crear una app, configurar el redirect URI, generar tokens. Mata la adopción.

**Recomendación fuerte: (A).** El principio BYO se mantiene donde importa — *el usuario es dueño
de los datos y de las cuentas, y puede revocar cuando quiera*. Pero pedirle registrar una app de
desarrollador es un impuesto que ningún cliente pyme va a pagar. Igual con Google Maps: **una key
de plataforma de Sinkroo** (cuyo costo se traslada a créditos) rinde mucho mejor que pedirle a
cada usuario su propia cuenta de Google Cloud con billing.

### 8.5 Google Maps: ¿key de plataforma o del usuario?
Google exige cuenta con billing habilitado. Pedirle eso a un emprendedor es fricción alta.
**Propuesta:** key de plataforma, y el costo se consume como créditos (así el mapa es un ingreso,
no un gasto). La opción "traé tu propia key" queda disponible para el plan Enterprise que quiera
controlar su propio billing.

### 8.6 PSP y multi-moneda
Config soporta USD, ARS y AED. ¿Stripe (USD, excelente DX), Mercado Pago (ARS, imprescindible en
Argentina), o los dos?

### 8.7 KYC: ¿proveedor externo o revisión manual al principio?
Hay 3 pasos (documento, domicilio, selfie). Un proveedor automatizado cuesta por verificación;
la revisión manual no escala pero es gratis al principio.

---

## 9. Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| App Review de Meta demora o rechaza | Bloquea Fase 1 completa | Empezar el trámite **ya**, en paralelo a Fase 0. Mientras: modo demo y WhatsApp Cloud (que no necesita review para tu propio número de prueba) |
| Google Maps exige billing desde el día 1 | Bloquea Mercado | Key de plataforma en Fase 5; el mapa actual (Leaflet/OpenTopoMap) sigue funcionando como fallback |
| Costo de IA se descontrola | Márgen negativo | Créditos con costo por acción **desde la Fase 0**, aunque el cobro real llegue en Fase 7 |
| El aislamiento multi-tenant falla | Filtración entre clientes | RLS en Postgres desde el primer commit, no como refactor |
| Migrar 12 vistas de mock a real es enorme | Parálisis | Fase por fase, vista por vista, con `source: demo\|live` para poder mostrar progreso mixto |
| Secreto filtrado del vault | Catástrofe reputacional | Envelope encryption + nunca exponer por API + rotación + auditoría |

---

## 10. Primer paso concreto

Si aprobás este plan, el orden de trabajo es:

1. **Fase 0** completa (tenants + auth + contrato + migraciones). Es chica y es bloqueante.
2. **En paralelo, hoy:** iniciar el App Review de Meta (8.4) — tiene cola y no depende de código.
3. **Fase 1** empezando por `whatsapp_cloud` (credential directa, sin OAuth, sin review: el camino
   más corto a una conexión real funcionando de punta a punta).
4. Con eso ya se puede mostrar el ciclo completo: **conectar → recibir un mensaje real → el
   dashboard lo muestra → la IA responde.**

Ese es el primer hito que convierte la maqueta en producto. Todo lo demás son repeticiones de ese
mismo patrón sobre las otras vistas.

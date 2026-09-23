# Sinkroo — Inventario del Dashboard como Spec del Back-end

**Método:** inversión. El dashboard es el contrato. Cada elemento visible se traduce a
(1) entidad de dominio, (2) endpoint, (3) servicio externo requerido.

**Fuente:** `apps/dashboard/src` — 25 archivos, 4.969 líneas, 12 vistas + onboarding + login.
Verificado renderizando la app en navegador: **0 llamadas de red, 0 errores de JS**. Todo es mock.

**Leyenda de cobertura del back actual**
- 🟢 el back ya puede servir esto (existe entidad + endpoint)
- 🟡 existe la entidad pero falta endpoint o faltan campos
- 🔴 no existe nada: entidad nueva + endpoint nuevo
- 🌐 requiere integración externa (credencial del usuario)

Estado del back hoy: 5 tablas (`users`, `businesses`, `products`, `conversations`,
`conversation_messages`), 9 endpoints, 1 servicio de IA (broker). Todo lo demás es rojo.

---

## 1. Login (`views/Login.tsx`)

| Elemento | Entidad | Endpoint | Externo |
|---|---|---|---|
| Email + Contraseña → Entrar | 🟡 `users` sin password | `POST /auth/login` | — |
| Continuar con Google | 🔴 `identities` | `POST /auth/oauth/google` | 🌐 Google Identity (OAuth) |
| Continuar con Facebook | 🔴 `identities` | `POST /auth/oauth/facebook` | 🌐 Meta Login (OAuth) |

> **Distinción crítica:** login social (identidad) ≠ conexión de datos (Meta Ads). Son dos
> flujos OAuth distintos con permisos distintos. No mezclar.

## 2. Onboarding (7 pasos) (`views/Onboarding.tsx` + `components/sinkroo/ingesta.ts`)

| Paso | Elemento | Entidad | Endpoint | Externo |
|---|---|---|---|---|
| 1 | Hero / bienvenida | — | — | — |
| 2 | Nombre de marca, categoría, **fotos** (hasta 10) | 🔴 `businesses` + `assets` | `POST /onboarding/step/2` | 🔴 storage |
| 3 | Qué vendés, modelo, rango de precio, margen, frecuencia, dolor | 🟡 `businesses` (faltan 6 campos) | `POST /onboarding/step/3` | — |
| 4 | **Productos** (nombre, fotos, precio) | 🟢 `products` | `POST /api/products` | 🔴 storage |
| 5 | Presentación / pitch / diferencial / información extra + **subir PDF, Word, TXT, Excel** ("la IA lo lee y extrae todo") | 🔴 `assets` + `extractions` | `POST /onboarding/step/5` | 🔴 OCR/parse + LLM |
| 6 | Presupuesto mensual (4 tiers) + proyección (alcance, ventas, ROAS esperado) | 🔴 `budgets` + `projections` | `POST /onboarding/step/6` | 🔴 motor de proyección |
| 7 | **Conexión de canales** (WhatsApp, Instagram, Meta Ads, Email, TikTok) | 🔴 `connections` | `POST /api/connections` | 🌐 5 integraciones |

> También existe `INGESTA_CAMPANA`: 15 tipos de campaña × secciones de material (fotos, videos,
> textos, links, archivos). Es un **formulario dinámico dirigido por datos** — el back debe servir
> la spec de ingesta, no hardcodear los campos. Hoy vive en el front.

## 3. Dashboard principal (`views/Dashboard.tsx`)

| Elemento | Entidad | Endpoint | Externo |
|---|---|---|---|
| Saludo + 3 KPIs (47 ventas, 3.4x ROAS, 96 score) | 🔴 `metrics_daily` | `GET /api/metrics/summary` | 🌐 ads+store |
| Banners / avisos IA | 🔴 `notifications` | `GET /api/notifications` | — |
| Ventas del mes, ROAS global, alcance, créditos | 🔴 `metrics_daily` + `wallet` | `GET /api/metrics/kpis` | 🌐 |
| Gráfico "Rendimiento de ventas 30 días" | 🔴 `metrics_daily` | `GET /api/metrics/timeseries?range=30d` | 🌐 |
| **Inversión semanal Meta Ads** (S1-S4, $2.930, costo x lead/cliente/clic/conversión) | 🔴 `ad_spend_daily` | `GET /api/ads/spend` | 🌐 **Meta Ads** |
| **"Qué está haciendo la IA"** (6 agentes, estado Ejecutando/En cola, pulso) | 🔴 `agent_runs` | `GET /api/agents/live` | — (SSE) |
| "En vivo" · 128 conversaciones hoy · 94% resueltas por IA · 1.4s respuesta media · escaladas | 🔴 `conv_metrics` | `GET /api/metrics/conversations` | 🌐 WA+Messenger |
| **Bandeja unificada WA/Messenger** (selector de canal con contadores) | 🟡 `conversations` (falta `channel`) | `GET /api/conversations?channel=` | 🌐 WA Cloud + Messenger |
| **Flujo automático por pasos** (4 pasos con delays, estados Enviado/Ejecutando/En espera) | 🔴 `flows` + `flow_steps` + `flow_runs` | `GET/POST /api/flows` | 🌐 WA |
| Pausar/reactivar flujo (toggle) | 🔴 `flows.status` | `PATCH /api/flows/:id` | — |
| Selector de campaña de flujo (4 flujos) | 🔴 `flows` | `GET /api/flows` | — |
| Responder manual en chat | 🟡 `conversation_messages` | `POST /api/conversations/:id/messages` | 🌐 WA send |
| "Dejar que la IA responda" | 🟡 broker `/converse` | `POST /api/conversations/:id/ai-reply` | 🔴 LLM |
| Campañas activas (5 con ROAS y conversiones) | 🔴 `campaigns` | `GET /api/campaigns?status=active` | 🌐 Meta Ads |
| Tour guiado | — (front) | — | — |

## 4. Mercado (`views/Mercado.tsx`) — M1

| Elemento | Entidad | Endpoint | Externo |
|---|---|---|---|
| Selector de **ciudad** (4 ciudades) + coordenadas | 🔴 `locations` | `GET /api/locations` | 🌐 **Geocoding** |
| **Mapa de calor** (Leaflet + OpenTopoMap, radio de demanda, 7 comercios con lat/lng y distancia) | 🔴 `market_places` | `GET /api/market/map?lat=&lng=&radius=` | 🌐 **Google Maps + Places** ⚠️ |
| Selector de **producto** (4) | 🟢 `products` | `GET /api/products` | — |
| **Comparativa de precios/leads** vs 5 marcas (precio, leads, tendencia, posición) | 🔴 `competitors` + `competitor_snapshots` | `GET /api/market/competitors` | 🌐 scraping/ads library |
| **Publicaciones con más lead** (red, autor, formato, leads, CPL, CTR, link + imagen) | 🔴 `market_publications` | `GET /api/market/publications` | 🌐 IG/TikTok/FB |
| **Tendencias** (6 ítems con %, tag, detalle) | 🔴 `market_trends` | `GET /api/market/trends` | 🌐 búsqueda/tendencias |
| Análisis del producto vs competencia (texto IA) | 🔴 informe | `GET /api/market/report?productId=` | 🔴 LLM (agente Lux) |
| **Hallazgos IA** (4 alertas con fecha) | 🔴 `market_findings` | `GET /api/market/findings` | 🔴 agente |
| Radar de la Inteligencia Colectiva | — | — | — |

> **El mapa hoy NO es Google.** Usa Leaflet + OpenTopoMap (relieve, gratis, sin key) y los
> competidores son **offsets hardcodeados** (`dlat`/`dlng`). Google Maps + Places API es un
> cambio de proveedor real y requiere key con billing.

## 5. Estrategia (`views/Estrategia.tsx`) — M2

| Elemento | Entidad | Endpoint | Externo |
|---|---|---|---|
| Misión / Visión (12 meses) | 🔴 `strategies` | `GET /api/strategy` | 🔴 LLM (Rex) |
| Resumen estratégico + gap detectado | 🔴 `strategies.analysis` | `GET /api/strategy` | 🔴 |
| **4 KPIs** (madurez 54%, claridad, riesgo, ventaja) | 🔴 `strategy_kpis` | `GET /api/strategy/kpis` | 🔴 |
| **4 recomendaciones priorizadas** (título, desc, canal, impacto, plazo) | 🔴 `strategy_actions` | `GET /api/strategy/actions` | 🔴 |
| **4 acciones estratégicas** con impacto y plazo | 🔴 `strategy_actions` | `GET /api/strategy/actions` | 🔴 |
| **Riesgos** (nivel, mitigación) | 🔴 `strategy_risks` | `GET /api/strategy/risks` | 🔴 |
| Fortalezas / a reforzar | 🔴 `strategy_factors` | `GET /api/strategy/factors` | 🔴 |
| Roadmap / jugadas clave | 🔴 `strategy_roadmap` | `GET /api/strategy/roadmap` | 🔴 |
| "En curso · 54% madurez" | 🔴 | — | — |

## 6. Herramientas (`views/Herramientas.tsx`) — M3 ⭐ **núcleo del pedido BYO**

Vista 100% de integraciones. 6 herramientas con estado `Conectado | Por conectar | Conectando`,
% de uso, métrica y nota. Más un flujo de 4 etapas (Captar → Medir → Cerrar → Fidelizar) y un
análisis IA que prioriza qué conectar.

| Herramienta | Categoría | Rol | Auth real requerido | Estado |
|---|---|---|---|---|
| **WhatsApp Business** | Mensajería | Cierre y fidelización | 🌐 Cloud API: token permanente + WABA ID + phone_number_id + verify token + app secret | 🔴 |
| **Meta Ads** | Publicidad | Captación y retargeting | 🌐 OAuth: `ads_management`, `ads_read`, `act_*` | 🔴 |
| **Instagram** | Social | Contenido orgánico | 🌐 OAuth Graph: `instagram_basic`, `instagram_manage_insights`, página vinculada | 🔴 |
| **Klaviyo (Email)** | Email | Carrito abandonado, post-venta | 🌐 API key privada (`pk_*`/`sk_*`) o SMTP propio | 🔴 |
| **TikTok** | Social | Alcance orgánico | 🌐 OAuth TikTok Business + `advertiser_id` | 🔴 |
| **Pixel + eventos** | Tracking | Medición y optimización | 🌐 Pixel ID + Conversions API token | 🔴 |

| Elemento UI | Entidad | Endpoint |
|---|---|---|
| Grid de 6 tarjetas con estado/uso/métrica | 🔴 `connections` + `providers` (catálogo) | `GET /api/connections` |
| Botón **Conectar** (con estado "Conectando…") | 🔴 `connections.status` | `POST /api/connections/:provider/start` |
| Botón **Configurar →** (navega al módulo) | — | — |
| Modal "+ Conectar" (lista las no conectadas) | 🔴 | `GET /api/providers` |
| "X / 6 conectadas · % del stack activo" | 🔴 cálculo | derivado |
| Análisis IA del stack + orden de prioridad | 🔴 | `GET /api/stack/analysis` |

## 7. Campañas (`views/Campanas.tsx`) — M4

| Elemento | Entidad | Endpoint | Externo |
|---|---|---|---|
| 15 **tipos de campaña** con KPI, audiencia, tono, formato y estrategia | 🔴 `campaign_types` (catálogo) | `GET /api/campaign-types` | — |
| Lista de campañas (progreso, ROAS, presupuesto, alcance, costo, conversiones) | 🔴 `campaigns` + `campaign_metrics` | `GET /api/campaigns` | 🌐 Meta Ads |
| Filtro por estado (Activa/En pausa/Borrador/Finalizada) | 🔴 | `?estado=` | — |
| **Crear campaña** (nombre + tipo + material: imágenes/videos/texto/links) | 🔴 `campaigns` + `assets` | `POST /api/campaigns` | 🔴 storage |
| Editar nombre / Duplicar / Eliminar | 🔴 | `PATCH`/`POST /:id/duplicate`/`DELETE` | — |
| **Activar / Reactivar** | 🔴 | `POST /api/campaigns/:id/launch` | 🌐 **Meta Ads create** |
| Ver reporte (Estado, Progreso, ROAS, Presupuesto, Costo, Alcance, Conversiones) | 🔴 | `GET /api/campaigns/:id/report` | 🌐 |
| Ver estrategia | 🔴 | `GET /api/campaign-types/:key` | — |
| **Subir material** ("arrastrá o hacé click") | 🔴 `assets` | `POST /api/assets` | 🔴 storage |
| Secciones de ingesta por tipo de campaña | 🔴 (spec dinámica) | `GET /api/ingest-spec/:type` | — |

## 8. WhatsApp (`views/Whatsapp.tsx`) — M5

| Elemento | Entidad | Endpoint | Externo |
|---|---|---|---|
| Badge "Conectado" | 🔴 `connections` | — | 🌐 |
| Métricas: % respuestas IA, pendientes de humano, leads activos | 🔴 | `GET /api/whatsapp/metrics` | — |
| **Selector de canal WA / Messenger con contadores** | 🟡 `conversations.channel` | `GET /api/conversations?channel=` | 🌐 2 canales |
| Selector de campaña/flujo | 🔴 `flows` | `GET /api/flows` | — |
| **Flujo automático** (pasos con delay, tipo auto/condición, editor de texto, agregar paso, pausar) | 🔴 `flows`+`flow_steps`+`flow_runs` | CRUD `/api/flows` | 🌐 WA send |
| **Bandeja en 2 colas**: "Responde la IA" / "Requiere humano" | 🔴 `conversations.requires_human` | `GET /api/conversations?queue=ai|human` | — |
| Chat con historial (lead / IA / humano) | 🟡 | `GET /api/conversations/:id/messages` | 🌐 |
| **Ideas de respuesta** sugeridas por IA | 🔴 | `POST /api/conversations/:id/suggestions` | 🔴 LLM |
| Enviar respuesta manual | 🟡 | `POST /api/conversations/:id/messages` | 🌐 WA send |
| "Dejar que la IA responda" | 🟡 broker `/converse` | `POST /api/conversations/:id/ai-reply` | 🔴 |
| "Marcar atendida" | 🟡 `conversations.status` | `PATCH` | — |
| Webhook entrante | 🟢 `/webhooks/whatsapp` | ya existe | 🌐 |

## 9. Creatividades (`views/Creatividades.tsx`)

| Elemento | Entidad | Endpoint | Externo |
|---|---|---|---|
| 3 KPIs (CTR promedio, ROAS promedio, activas) | 🔴 | `GET /api/creatives/summary` | 🌐 |
| Lista de creatividades (tipo Video/Imagen/Carrusel, CTR, CPC, ROAS, alcance, conversiones, badge "Ganadora") | 🔴 `creatives` + `creative_metrics` | `GET /api/creatives` | 🌐 Meta Ads |
| Filtro por tipo | 🔴 | `?tipo=` | — |
| **Crear con IA** (modal + idea → generar) | 🟡 `/generate` | `POST /api/creatives/generate` | 🔴 LLM + imagen |
| Editar / Duplicar / Eliminar | 🔴 | CRUD | — |
| Ideas de IA sugeridas (3) | 🔴 | `GET /api/creatives/ideas` | 🔴 |

## 10. Inteligencia Predictiva (`views/Predictiva.tsx`) — M7 ⭐ la vista más compleja (1.090 líneas)

| Elemento | Entidad | Endpoint | Externo |
|---|---|---|---|
| 4 KPIs (Deep Agents activos, conversaciones en curso, votos hoy, publicaciones analizadas) | 🔴 | `GET /api/predictive/summary` | — |
| **Mapa de los 6 agentes** con nombre, rol, tarea en curso, estado, carga % | 🔴 `agent_runs` | `GET /api/agents` | — |
| **Historial de trabajo por agente** (5 tareas c/u: tarea, cuándo, fecha, duración, resultado) | 🔴 `agent_history` | `GET /api/agents/:id/history` | — |
| **Tormenta colectiva**: hilo con Voto/Acción por agente | 🔴 `agent_thread` | `GET /api/agents/thread` | — |
| Publicación evaluada: postura + score por cada "12 inteligencias" | 🔴 `evaluations` + `votes` | `GET /api/evaluations/:id` | 🔴 enjambre |
| **Opciones de imagen** propuestas (CTR predicho, confianza, imagen) + Usar / Vista previa | 🔴 `creative_variants` | `GET /api/creatives/variants?type=image` | 🔴 generación imagen |
| **Opciones de video** (gancho, watch time predicho, confianza) | 🔴 | `?type=video` | 🔴 generación video |
| **El podio**: ganador + guion paso a paso del Reel | 🔴 | `GET /api/creatives/podium` | 🔴 |
| **Mercado secundario predictivo**: sentimiento, score en vivo, distribución de votos, 500 observadores, votación del momento | 🔴 `simulations` | `GET /api/simulation/:id` (SSE) | 🔴 **MiroFish** |
| Vista "MiroFish": creatividades generadas, ganadora validada, diferenciación vs competencia, conversión simulada | 🔴 `simulations` | `GET /api/simulation/:id` | 🔴 |
| **Análisis GAIA**: 50 ads del nicho → 5 ángulos de mensaje (Tecnología/Emoción/Resultado) | 🔴 | `GET /api/strategy/angles` | 🔴 LLM + ads library |
| Diferenciación pHash / similitud coseno (0.28) | 🔴 | `GET /api/creatives/differentiation` | 🔴 algoritmo perceptual |
| **Créditos**: plan, disponibles, de X del plan, renovación, consumo del mes, auto-recarga | 🔴 `wallet` | `GET /api/wallet` | — |
| Historial de tareas 7 días (tabla: fecha, tarea, tiempo, resultado) | 🔴 `agent_history` | `GET /api/agents/history?range=7d` | — |

## 11. Referidos (`views/Referidos.tsx`)

| Elemento | Entidad | Endpoint |
|---|---|---|
| Link de referido (`sinkroo.ai/r/assettium`) + copiar | 🔴 `referral_links` | `GET /api/referrals/link` |
| Progreso (2 pagados, 1 pendiente, 1 invitación) | 🔴 `referrals` | `GET /api/referrals/summary` |
| **Árbol de red multinivel** (hasta 2-3 niveles, con estado y plan) | 🔴 `referrals` (jerárquico) | `GET /api/referrals/tree` |
| Premio: 250 créditos por primer mes pago | 🔴 `credit_transactions` | gancho en webhook de pago |

## 12. Créditos (`views/Creditos.tsx`)

| Elemento | Entidad | Endpoint | Externo |
|---|---|---|---|
| Saldo + auto-recarga (toggle, umbral 500) | 🔴 `wallet` | `GET/PATCH /api/wallet` | — |
| Método de pago (Visa ****4242, cambiar) | 🔴 `payment_methods` | `GET /api/payment-methods` | 🌐 **PSP** |
| Movimientos (entradas/salidas con fecha y detalle) | 🔴 `credit_transactions` | `GET /api/wallet/transactions` | — |
| **Facturas** (ID, fecha, concepto, monto, estado Pagada/Pendiente) + descargar | 🔴 `invoices` | `GET /api/invoices`, `GET /api/invoices/:id.pdf` | — |
| **4 paquetes de recarga** (Mini 500/$15, Estándar 1000/$25, Pro 1760/$39, Máximo 5000/$99) | 🔴 `credit_packs` | `GET /api/credit-packs` | — |
| Comprar / confirmar compra | 🔴 | `POST /api/wallet/purchase` | 🌐 **PSP** |
| **3 planes** (Starter $29, Pro $79, Enterprise custom) + cambiar plan | 🔴 `plans`+`subscriptions` | `POST /api/subscriptions` | 🌐 **PSP** |
| "Tus datos de pago están cifrados y protegidos" | 🔴 | — | 🔴 PCI |

## 13. KYC (`views/Kyc.tsx`)

| Elemento | Entidad | Endpoint | Externo |
|---|---|---|---|
| 3 pasos: Identidad (documento), Domicilio (comprobante), Selfie | 🔴 `kyc_verifications` + `kyc_documents` | `POST /api/kyc/documents` | 🌐 KYC provider |
| Estado "en revisión" | 🔴 `kyc_verifications.status` | `GET /api/kyc` | — |
| Datos: nombre, tipo de doc, número, nacionalidad, país, ciudad, dirección, CP | 🔴 | `PATCH /api/kyc` | — |
| Subida de archivos (drag&drop, JPG/PNG/PDF) | 🔴 `assets` | `POST /api/assets` | 🔴 storage |

## 14. Configuración (`views/Config.tsx`) + Perfil (`Layout.tsx`)

| Elemento | Entidad | Endpoint |
|---|---|---|
| Nombre de cuenta, email, **moneda (USD/ARS/AED)** | 🟡 `businesses` + `tenants.settings` | `GET/PATCH /api/settings` |
| Perfil: nombre, apellido, email, teléfono, rol, avatar | 🟡 `users` (faltan campos) | `GET/PATCH /api/me` |
| Datos de facturación del perfil (tipo doc, número, nacionalidad, país, ciudad, dirección, CP) | 🔴 `billing_profiles` | `PATCH /api/me/billing` |
| **Roles** (Administrador, Editor, Analista, Solo lectura) | 🔴 `memberships` + RBAC | `GET /api/members` |
| Notificaciones (campanita con lista) | 🔴 `notifications` | `GET /api/notifications` |
| Badge plan + créditos en sidebar | 🔴 `subscriptions` + `wallet` | derivado |

## 15. Cross-cutting (todas las vistas)

| Requisito transversal | Por qué | Estado |
|---|---|---|
| **Multi-tenant** | "Más marcas, una cuenta" (Sinkroo Agency, hasta 8 marcas) | 🔴 inmenso |
| **Realtime / SSE** | "En vivo", pulsos, "conversaciones por hora", "votación del momento" | 🔴 |
| **Scheduler 24/7** | "Te estoy vigilando la tienda 24/7", "En cola" | 🔴 |
| **Sistema de créditos** | presente en 4 vistas | 🔴 |
| **Object storage** | fotos, videos, PDF, Excel, KYC docs | 🔴 |
| **Auditoría** | multi-tenant + credenciales | 🔴 |
| **Notificaciones** | campanita + banners | 🔴 |
| **Tour guiado** (Teleport) | 4 pasos sobre elementos del DOM | front puro |

---

## Resumen cuantitativo

| | Cantidad |
|---|---|
| Vistas a servir | 12 + onboarding + login |
| Endpoints nuevos a diseñar | ~95 |
| Entidades nuevas (aprox.) | ~45 |
| Integraciones externas BYO | 11 |
| Entidades reutilizables del back actual | 3 de 5 |

**Ninguna vista funciona hoy con datos reales. Ni una.** El back existe, pero vive en otro
mundo: sirve 5 endpoints de negocio mientras el dashboard muestra 15 módulos.

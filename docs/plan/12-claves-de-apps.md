# 12 · Las claves de las apps: qué hay que crear y quién lo puede hacer

Este documento es la lista exacta para encender las nueve conexiones. Está escrito para seguirlo
sin saber de código: cada plataforma dice **dónde se crea la app**, **qué permisos se le piden**,
**qué dirección de retorno hay que registrar** y **qué variables quedan cargadas en el servidor**.

## Lo que sólo puede hacer el dueño (y por qué)

Yo no puedo crear estas apps. No es una limitación de capacidad, son tres cosas concretas:

1. **Hay que entrar con la cuenta del dueño** en el panel de desarrolladores de cada plataforma.
   No tengo —ni debo tener— esas credenciales.
2. **Hay que aceptar los términos** de cada plataforma en nombre de Sinkroo. Eso es un acto legal:
   lo tiene que hacer quien es el responsable de la empresa.
3. **Varias plataformas exigen verificación** que sólo puede pasar el titular: verificación de
   negocio, documento de identidad, número de teléfono, y en el caso de Meta, la **revisión de la
   app** (que puede tardar días y pregunta para qué se usan los permisos).

Todo lo demás —cargar las claves en el servidor, reiniciar el servicio, probar cada conexión de
punta a punta y dejarlas funcionando— lo hago yo.

## Cómo me pasás las claves sin exponerlas

Nunca las escribas en el chat: quedarían guardadas en la conversación para siempre. Hay dos caminos:

- **El que recomiendo**: entrás por SSH y pegás las claves en el archivo `/root/work/sinkroo-a/.env.local`
  (te dejo la plantilla al lado de este documento, `.env.ejemplo`). Yo después lo uso para levantar el
  servicio y no queda copia en ningún otro lado.
- Si preferís, me las pasás y las cargo yo, pero quedan en el historial del chat. Vos decidís.

---

## Antes de empezar: la dirección de retorno

Las plataformas exigen registrar a dónde vuelve el negocio después de autorizar (el *redirect URI*).
Tiene que ser una dirección **pública y fija**. Nuestro túnel de pruebas cambia cada vez que se
reinicia, así que hay dos caminos:

- **Para probar hoy**: registramos el túnel actual y, si cambia, lo actualizamos (Meta permite
  registrar varias direcciones; TikTok también).
- **Para producción (lo correcto)**: un dominio fijo nuestro, por ejemplo
  `https://api.sinkroo.com/api/integraciones/<red>/volver`. Esto necesita que el dominio esté
  apuntando al servidor; es un paso aparte y conviene hacerlo antes de la revisión de Meta, porque
  cambiar la dirección después obliga a revisar de nuevo.

Las redes que **no** tienen dirección de retorno son las de clave (WhatsApp, tienda, correo, píxel):
esas se conectan con una clave fija, no con autorización.

---

## 1 · Instagram y Meta Ads (una sola app de Meta)

- **Dónde**: `developers.facebook.com` → Mis apps → Crear app → tipo **Negocio**.
- **Productos que hay que agregar**: *Instagram* (API con inicio de sesión de Facebook o de Instagram)
  y *Marketing API*.
- **Permisos a pedir**: `instagram_basic`, `instagram_manage_insights`, `pages_show_list`,
  `pages_read_engagement`, `read_insights`, y para la pauta `ads_read` y `ads_management`.
- **Dirección de retorno**: una por red, apuntando a `…/api/integraciones/instagram/volver` y
  `…/api/integraciones/meta_ads/volver`.
- **De dónde salen las claves**: Configuración → Básica → *Identificador de la app* y *Clave secreta*.
- **Ojo**: para leer la audiencia de Instagram, la cuenta tiene que ser **profesional (empresa o
  creador) y estar vinculada a una página de Facebook**. Con menos de 100 seguidores o 100
  interacciones, Meta no devuelve la demografía: eso no es un error nuestro, es su mínimo.
- **Variables**: `META_APP_ID`, `META_APP_SECRET`, `META_REDIRECT_URI`.

## 2 · WhatsApp (Cloud API)

- **Dónde**: `developers.facebook.com` → la misma app → producto **WhatsApp**.
- **Qué se necesita**: un número de teléfono verificado para el negocio y el *identificador del
  número* (phone number ID).
- **Dirección de retorno**: no aplica (es por clave).
- **Variables**: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_VERIFY_TOKEN` (este último lo
  inventamos nosotros: es la palabra secreta con la que WhatsApp firma los avisos que nos manda).

## 3 · TikTok

- **Dónde**: `developers.tiktok.com` → Manage apps → Connect an app.
- **Productos**: **Login Kit for Web** y **Display API**.
- **Permisos (scopes)**: `user.info.basic`, `user.info.profile`, `user.info.stats`, `video.list`.
- **Dirección de retorno**: `…/api/integraciones/tiktok/volver`.
- **De dónde salen las claves**: *Client key* y *Client secret*.
- **Ojo**: TikTok revisa la app antes de dejarla leer datos de otros usuarios. En modo desarrollo
  sólo funciona con las cuentas que agregues como probadoras.
- **Variable de la verdad**: TikTok **no entrega demografía** (edad, género, ciudad). Sirve para las
  métricas de cada video, no para calibrar el público. El panel lo dice tal cual.
- **Variables**: `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_REDIRECT_URI`.

## 4 · YouTube (y Google)

- **Dónde**: `console.cloud.google.com` → crear un proyecto → **APIs y servicios**.
- **APIs que hay que habilitar**: *YouTube Data API v3* y *YouTube Analytics API* (la segunda es la
  que entrega la demografía: edad y género de quienes ven los videos).
- **Pantalla de consentimiento OAuth**: tipo **Externo**, y mientras esté en modo prueba hay que
  agregar como usuarios de prueba las cuentas que la vayan a usar.
- **Permisos**: `https://www.googleapis.com/auth/youtube.readonly` y
  `https://www.googleapis.com/auth/yt-analytics.readonly`.
- **Dirección de retorno**: `…/api/integraciones/youtube/volver` (y `…/google/volver` si también se
  conecta Google Ads/Analytics).
- **De dónde salen las claves**: Credenciales → *Crear credenciales* → **ID de cliente OAuth**.
- **Variables**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `YOUTUBE_REDIRECT_URI`,
  `GOOGLE_REDIRECT_URI`.

## 5 · Tienda (Shopify o WooCommerce)

- **Shopify**: en la tienda, *Configuración* → *Apps y canales de venta* → *Desarrollar apps* →
  crear app → permisos de lectura de productos y pedidos → instalar → copiar el token.
- **WooCommerce**: *WooCommerce* → *Ajustes* → *Avanzado* → *REST API* → crear clave con permiso de
  lectura → copiar **consumer key** y **consumer secret**.
- **Variables**: `TIENDA_URL`, `TIENDA_TOKEN` (en WooCommerce, con el formato `llave:secreto`),
  y `TIENDA_TIPO` (`shopify` o `woo`).
- **Para qué sirve**: es **la métrica más honesta** del backtest: ventas reales por producto.

## 6 · Píxel del sitio

- **Dónde**: el píxel que ya tenga la página (Meta Events Manager) o el que se cree ahí.
- **Variables**: `PIXEL_ID`, `PIXEL_TOKEN`.

## 7 · Correo (los informes del negocio)

- **Dónde**: `resend.com` (o el proveedor de correo que se prefiera) → API Keys.
- **Requiere**: verificar el dominio desde el que se envía.
- **Variables**: `RESEND_API_KEY`, `EMAIL_FROM` (o, si se usa SMTP: `SMTP_HOST`, `SMTP_USER`,
  `SMTP_PASS`).

---

## Cómo queda encendido (lo hago yo)

1. Cargar las variables en el servidor y reiniciar el servicio.
2. Entrar al panel con la cuenta real y revisar que la tarjeta de conexiones deje de decir «falta
   configurar» y ofrezca **Conectar**.
3. Hacer el paso de autorización con la cuenta real y comprobar que el token queda guardado del lado
   del servidor (nunca en el panel).
4. Sincronizar y verificar que el público se recalibra con datos reales y que el backtest empieza a
   medirse contra la realidad.
5. Dejar el documento del estado actualizado con lo que quedó conectado y lo que falta.

## El orden que conviene

1. **Google/YouTube** — es el más rápido de aprobar y el que además calibra el público.
2. **Instagram** — el otro que calibra; necesita cuenta profesional y página.
3. **TikTok** — métricas; su revisión puede tardar.
4. **Tienda** — la métrica más honesta, y no necesita revisión de nadie.
5. **WhatsApp, píxel y correo** — claves directas, sin trámite.
6. **Meta Ads** — va con la misma app de Instagram, pero la pauta necesita revisión aparte.

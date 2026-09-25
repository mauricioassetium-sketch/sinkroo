# 13 · Cómo se conecta cada red (y por qué son dos caminos, no uno)

Esta es la explicación de la experiencia de conexión: qué ve el dueño del negocio en el panel, qué
tiene que hacer, y qué de eso se puede resolver con un botón y qué no.

## Primero: hay DOS niveles de claves, y se confunden todo el tiempo

**Nivel 1 — La llave de la app (una sola, de Sinkroo).**
Para que Sinkroo pueda pedirle permiso a Instagram o a TikTok en nombre de un cliente, primero tiene que
existir **una app de Sinkroo** en cada plataforma. Esa app tiene su identificador y su clave secreta:
son **una sola para toda la plataforma**, compartidas por todos los negocios.

- Las crea el dueño de Sinkroo (una vez por plataforma).
- Viven en el servidor, nunca en el panel y nunca en la base.
- **Ningún cliente las ve ni las escribe.** El cliente no tiene por qué saber que existen.
- Mientras falten, el panel dice «falta configurar» y no ofrece botón, porque no puede pedir un permiso
  en nombre de nadie.

**Nivel 2 — La cuenta del negocio (una por negocio).**
Es el permiso del negocio para que el motor lea sus datos. Se consigue de dos maneras, y **cuál se usa no
lo elegimos nosotros: lo impone la plataforma**.

- **Por autorización (un botón)**: el dueño aprieta «Conectar», va a la plataforma, entra con su cuenta,
  le da «Permitir» y vuelve. **Nunca ve una clave.** Es el camino más simple que existe y por eso se usa
  siempre que la plataforma lo permita.
- **Por clave (pegar un texto)**: la plataforma no tiene pantalla de «Permitir» para apps de terceros, así
  que entrega una clave larga que alguien tiene que generar en su panel y pegar. Es el único camino
  posible en esas redes.

## Qué camino tiene cada red

| Red | Camino disponible | ¿Puede ser un botón? |
|---|---|---|
| Instagram | Autorización (Meta) | **Sí** |
| Meta Ads | Autorización (Meta) | **Sí** |
| TikTok | Autorización (Login Kit) | **Sí** |
| YouTube | Autorización (Google) | **Sí** |
| Google | Autorización (Google) | **Sí** |
| Tienda (Shopify) | Autorización, si publicamos la app de Shopify | **Sí**, con la app publicada |
| Tienda (WooCommerce) | Clave del propio sitio | No: se pega |
| WhatsApp | Autorización, por *Embedded Signup* de Meta | **Sí**, con el flujo de Meta |
| WhatsApp (alternativa) | Clave fija del número | No: se pega |
| Píxel del sitio | Clave del píxel | No: se pega |
| Correo | Clave del proveedor | No: se pega |

**Conclusión de la tabla**: de las nueve, **seis pueden conectarse con un solo botón** (incluidas las dos
que hoy se ven difíciles: la tienda de Shopify y WhatsApp, porque sus plataformas sí ofrecen ese flujo).
Lo demás son cuatro casos donde la clave es inevitable.

## La forma más sencilla para el usuario (lo que conviene construir)

1. **Botón siempre que se pueda.** El usuario no debería escribir jamás un identificador de app. Aprieta,
   autoriza, vuelve, y ya está conectado. Cero claves a la vista.
2. **Para las cuatro que piden clave, un asistente de un solo campo.** No un formulario técnico: un
   cuadro para pegar, un enlace que abre **la página exacta** donde se genera esa clave, y al guardar una
   **prueba inmediata** («conectado y leyendo» o «esta clave no sirve»). Nunca guardar sin probar.
3. **Nada de pedirle la clave de la app al cliente.** Ese es el error que hunde productos: pedirle al
   dueño del negocio el App ID y el App Secret de Meta. Sólo nosotros lo vemos.
4. **El estado siempre visible en la fila**: conectada, sin conectar, o falta configurar — con lo que
   falta nombrado. Nunca un botón que no pueda funcionar.

## Lo que esto implica para el lanzamiento (hay que decir la parte incómoda)

- **Con las llaves de la app puestas, se puede probar el mismo día** con las cuentas del propio dueño.
- **Abrirlo a todos los clientes requiere que la plataforma revise la app** (Meta sobre todo, y TikTok).
  Mientras esté en revisión, sólo funcionan las cuentas que se agreguen expresamente como probadoras.
- **La dirección de retorno tiene que ser fija y pública** antes de pedir la revisión, porque cambiarla
  después obliga a revisar de nuevo. Es decir: el dominio propio (`api.sinkroo.com`) conviene dejarlo
  resuelto **antes** de pedir la revisión, no después.

## Lo que hago yo y lo que sólo puede hacer el dueño

**El dueño (poco, pero es suyo):** crear la app en cada plataforma, aceptar sus términos, pasar sus
verificaciones, y pegar las llaves en el servidor (para que no queden en el chat). La lista exacta está
en el documento 12.

**Yo:** el botón y el asistente en el panel, cargar las llaves de la app, probar cada conexión de punta a
punta, y dejar constancia de lo que quedó conectado.

## El orden que conviene (y por qué)

1. **Google y YouTube** — la revisión es la más liviana, y YouTube además **calibra el público**.
2. **Instagram** — el otro que calibra; necesita cuenta profesional ligada a una página.
3. **Tienda** — no necesita revisión de nadie y es **la métrica más honesta** para medir si el modelo
   acierta.
4. **TikTok** — sirve para las métricas por video; su revisión puede tardar.
5. **WhatsApp, píxel y correo** — claves directas, sin trámite, se encienden el mismo día.
6. **Meta Ads** — va con la app de Instagram, pero la pauta necesita una revisión aparte.

## La regla que no se negocia

**Ninguna clave se pide ni se muestra en el chat, y ninguna se guarda en la base sin cifrar.** Las de la
app viven en el servidor como variables de entorno; las del cliente, cifradas y por negocio el día que se
construya el asistente de claves.

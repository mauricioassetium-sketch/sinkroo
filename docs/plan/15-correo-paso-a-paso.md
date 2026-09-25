# 15 · El correo de Sinkroo, paso a paso (para quien nunca lo ha hecho)

Este documento es para seguir de arriba abajo, sin saber del tema. Al final, Sinkroo va a poder mandar
correos profesionales —bienvenida, confirmación de la dirección, avisos— **desde una dirección de tu
dominio** (por ejemplo `hola@sinkroo.com`), no desde un correo cualquiera, para que no caigan en spam.

Se hace una sola vez, y se tarda entre 20 y 40 minutos. La mayor parte es esperar.

---

## Antes de empezar: necesitás dos cosas

1. **Un dominio** (por ejemplo `sinkroo.com`). Es la dirección de tu marca en internet. Si todavía no
   lo tenés, se compra en cualquier registrador (Namecheap, GoDaddy, Cloudflare, Hostinger) por unos
   10 a 15 dólares al año. **Decime y te digo cuál conviene y cómo se compra.**
2. **Acceso al panel donde se administra ese dominio** (donde lo compraste o donde apuntan sus DNS).
   Ahí se pegan los registros del paso 3.

Si ya tenés correo del dominio (por ejemplo un Gmail de empresa con tu dominio), existe el camino más
corto: usarlo por SMTP. Al final lo explico.

---

## Paso 1 · Crear la cuenta del proveedor de correo

Vamos a usar **Resend**, que es el más simple de los que existen hoy:

1. Entrá a **resend.com** y creá una cuenta con tu correo (puede ser tu Gmail personal).
2. Confirmá el correo que te manda Resend para activar la cuenta.
3. Ya estás dentro. No hace falta tarjeta para empezar: tiene un plan gratuito de sobra para las pruebas
   (miles de correos al mes).

Es la misma lógica que hicimos con bundle: un servicio que manda los correos en tu nombre.

## Paso 2 · Agregar tu dominio

1. En Resend, menú **Domains** → botón **Add Domain**.
2. Escribí tu dominio (por ejemplo `sinkroo.com`) y confirmá.
3. Resend te va a mostrar **una lista de registros DNS** (normalmente tres o cuatro): uno de tipo
   **MX**, uno **TXT** de SPF y uno o dos **TXT** de DKIM. **Dejá esa pantalla abierta**, la vas a usar en
   el paso siguiente.

No cierres: cada registro tiene un **nombre** y un **valor**. Hay que copiarlos tal cual.

## Paso 3 · Pegar los registros en tu dominio

1. Entrá al panel donde administrás tu dominio (el mismo donde lo compraste; suele llamarse
   «DNS», «Zona DNS» o «Administrar DNS»).
2. Agregá **un registro por cada uno que muestra Resend**: elegís el tipo (MX o TXT), pegás el nombre y
   el valor. Si alguno ya existe (por ejemplo un MX de otro correo), no lo borres: agregá el que falta.
3. Guardá. Los cambios **tardan** entre unos minutos y unas horas en propagarse. Es normal.

## Paso 4 · Verificar

1. Volvé a la pantalla de Resend, en **Domains**, y tocá **Verify**.
2. Si todo está bien, el dominio pasa a **Verified** (verde). Si algo falla, te dice cuál registro está
   mal: se corrige ese y se vuelve a verificar. No pasa nada por intentar varias veces.

## Paso 5 · Crear la clave y cargarla en el servidor

1. En Resend: menú **API Keys** → **Create API Key**. Nombre: `Sinkroo servidor`. Permiso: **Sending**.
2. Copiá la clave (empieza con `re_`). **Se muestra una sola vez.**
3. En la consola del servidor (la misma que usaste para bundle), pegá este comando y seguí lo que pide:

```
bash /root/poner-clave-correo.sh
```

Te va a pedir: la clave de Resend, la dirección desde la que se envía (por ejemplo
`hola@sinkroo.com` — tiene que ser del dominio que verificaste), la dirección pública del panel y **tu
correo**, para mandarte un correo de prueba. Si el correo de prueba llega, quedó listo.

## Paso 6 · Probar de verdad

Cuando termine lo que está en construcción, entrá al panel y registrate con un correo nuevo: debería
llegar el correo de bienvenida con el enlace para confirmar la dirección. Si no llega, avisame: reviso el
registro de intentos y el motivo exacto.

---

## Si preferís no comprar dominio (o ya tenés correo del dominio)

- **Ya tenés correo con tu dominio** (Google Workspace, Zoho, el del hosting): se usa por **SMTP**. En ese
  caso necesitás el servidor, el puerto, el usuario y la clave de esa casilla; te los da el panel de tu
  proveedor de correo. El comando del paso 5 también los acepta.
- **No querés dominio todavía**: se puede probar con **Resend sin dominio verificado**, pero solo te deja
  enviar **a tu propio correo** (el de la cuenta de Resend). Sirve para ver que todo funciona, no para
  clientes reales. Decime y lo dejamos así mientras tanto.

## Lo que NO hay que hacer

- **No pegues la clave en el chat.** Queda guardada para siempre en la conversación. Va en el servidor,
  con el comando del paso 5 (que no la muestra en pantalla).
- No inventes un dominio que no sea tuyo: Resend no lo va a verificar y los correos no salen.
- No prometas a nadie que el correo sale antes de ver el «Verified» en verde.

## Resumen en una línea

Cuenta en Resend → agregar el dominio → pegar sus registros DNS → verificar → crear la clave →
cargarla en el servidor con el comando. Y el correo empieza a salir.

---

## Anexo: dónde va cada cosa en el servidor

El comando del paso 5 escribe estas variables en `/root/work/sinkroo-a/.env.local` (archivo que solo root
puede leer, fuera del repositorio):

- `RESEND_API_KEY` — la clave del paso 5.
- `EMAIL_FROM` — la dirección desde la que se envía, del dominio verificado.
- `APP_URL` — la dirección pública del panel, porque los enlaces de los correos apuntan ahí.
- Si se usa SMTP en vez de Resend: `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`.

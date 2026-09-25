# 16 · Los datos de Resend, para copiar y pegar

Esta es la ficha con **todo lo que vas a necesitar** para configurar Resend sin pensar. Lo que está en
negrita es lo que se copia tal cual.

---

## 1 · Antes de entrar: tené a mano esto

| Dato | Valor |
|---|---|
| **Dominio a verificar** | `sinkroo.com` |
| **Remitente (desde dónde salen los correos)** | `hola@sinkroo.com` |
| **Nombre del remitente** | `Sinkroo` |
| **Dirección pública del panel** | `https://sinkroo.com` |
| **Nombre de la clave** | `Sinkroo servidor` |
| **Tu correo, para la prueba** | (el tuyo) |

> La casilla `hola@sinkroo.com` todavía **no existe como buzón**: Resend la usa para **enviar**, no para
> recibir. Recibir es otra cosa (Zoho Mail, si lo querés después). No hace falta que la crees en ningún
> lado para enviar.

## 2 · Crear la cuenta

1. Entrá a **`resend.com`**.
2. **Sign up** con tu correo (sirve tu Gmail).
3. Confirmá el correo que te mandan. Ya estás dentro; no pide tarjeta.

## 3 · Agregar el dominio

1. Menú **Domains** → **Add Domain**.
2. Escribí: **`sinkroo.com`** → **Add**.
3. Se abre una tabla de **registros DNS**. **Dejá esa pantalla abierta.**

Resend te va a mostrar entre 3 y 4 filas. Se ven así (los valores son los que te dé Resend, no estos):

| Tipo | Nombre (así se ve) | Para qué |
|---|---|---|
| **MX** | `send` | Que el correo salga autorizado |
| **TXT** | `send` | SPF: dice quién puede enviar en tu nombre |
| **TXT** | `resend._domainkey` | DKIM: la firma que hace que no caiga en spam |
| **TXT** | `_dmarc` (puede ya existir) | Reglas de tu dominio para el correo |

> Si un registro ya existe (vos ya tenés un `_dmarc`), **no se borra**: se deja como está.

## 4 · Pegar los registros en GoDaddy

En **godaddy.com** → *Mis productos* → **sinkroo.com** → **Administrar DNS** → **Agregar registro**.
Uno por cada fila que muestra Resend: elegís el **Tipo** (MX o TXT), pegás el **Nombre** y el **Valor**,
y guardás.

**No toques** lo que ya arreglamos y funciona:

- El **A** con nombre `@` → `143.244.158.224` (es el que sirve el panel)
- El **CNAME** de `www`
- El **TXT `_dmarc`** que ya tenés
- Los **NS** de GoDaddy

Después de guardar, en Resend tocá **Verify**. Puede tardar de minutos a unas horas. En verde, listo.

## 5 · Crear la clave

Menú **API Keys** → **Create API Key**:

- Nombre: **`Sinkroo servidor`**
- Permiso: **Sending**
- **Create** → copiá la clave (empieza con **`re_`**). **Se muestra una sola vez.**

## 6 · Cargarla en el servidor

En la consola del servidor (la misma que usaste para bundle), pegá:

```
bash /root/poner-clave-correo.sh
```

Te va a preguntar cuatro cosas — respondelas con los datos de la tabla del punto 1:

1. **La clave de Resend** (la del punto 5) — no se ve mientras la pegás.
2. **Dirección desde la que se envía**: `hola@sinkroo.com`
3. **Dirección pública del panel**: `https://sinkroo.com`
4. **Tu correo**, para la prueba.

Al final **manda un correo de prueba de verdad** a ese correo. Si llega, quedó funcionando. Si no,
te dice el motivo exacto (dominio sin verificar, dirección que no es del dominio, clave incompleta).

## 7 · Lo que queda guardado en el servidor

Para que sepas qué se cargó (nunca en el repositorio, nunca en el panel):

| Variable | Valor |
|---|---|
| `RESEND_API_KEY` | la clave del punto 5 |
| `EMAIL_FROM` | `hola@sinkroo.com` |
| `APP_URL` | `https://sinkroo.com` |

## 8 · Cómo comprobar que todo quedó bien

Vos: entrá a **`https://sinkroo.com`**, hacé un registro con un correo nuevo → debería llegar el correo
de bienvenida con el enlace para confirmar la dirección.

Yo: reviso el registro de envíos del servidor (`correos_enviados`) y te digo, con el motivo exacto, si
algún correo no salió y por qué.

---

## Recordatorios

- **No pegues la clave acá en el chat.** Va directo al servidor con el comando del punto 6.
- El `?api=` ya no hace falta: el panel y la API son el mismo dominio.
- Resend es solo para **enviar**. El buzón para recibir (si lo querés) es aparte.

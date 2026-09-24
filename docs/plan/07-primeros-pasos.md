# 07 · Primeros pasos (el onboarding)

> Cómo entra un cliente nuevo a Sinkroo, qué se le pide, qué deduce el motor solo y qué pasa
> exactamente cuando aprieta «Arrancar el motor». Escrito después de construir el flujo, para que
> la implementación y el modelo no se separen.

---

## 1 · Qué es y por qué está armado así

El onboarding **no es un formulario de registro**: es la corrección de lo que el motor ya sabe. El
producto promete «vos no llenás nada», así que cada dato que se pide tiene que justificarse contra
esa promesa: se pregunta **solo lo que no se puede deducir**, y al lado de cada bloque se dice de
dónde sale el resto.

Tres reglas del dueño mandan sobre el diseño:

1. **Nada de scroll largo.** El flujo son **cinco sub-pantallas**, con el mismo stepper que usa
   Campañas. Cinco pantallas cortas se terminan; una larga se abandona.
2. **Nada es obligatorio.** Todos los pasos se pueden saltar y el motor arranca igual. Cualquier
   paso que bloquee contradice el producto.
3. **Cada botón hace algo y se ve.** (Regla general del panel.) Acá: «Continuar» marca el paso y
   avanza, «Seguir después» avanza sin marcar, «Arrancar» cambia el estado del motor y muestra el
   plan de la semana, y cada conexión cambia de estado en su fila.

Vive en **Configuración → Primeros pasos** (menú), con un cartel arriba de Hoy mientras haya algo
pendiente. Cuando el motor arrancó y los cinco pasos están hechos, **los dos desaparecen solos**: no
queda un cartel de bienvenida pegado para siempre.

---

## 2 · Los cinco pasos

Cada paso declara cuatro cosas: el titular, **para qué** se pide (en términos del negocio del
cliente), **qué deduce el motor solo**, y los datos mínimos para darlo por hecho.

### Paso 1 · Tu negocio — «Tu negocio, en cuatro datos»
| Se pide | Qué cambia |
|---|---|
| Nombre del negocio | Cómo lo nombra el motor y cómo firma las piezas |
| Instagram o web | De acá saca el tono, los precios, cada cuánto publica y quién le comenta |
| Qué vendés (chips) | Qué se dice del rubro y qué está prohibido prometer |
| A quién le hablás (chips) | Define el mensaje y el público que se pauta |
| Qué querés primero (chips) | Cambia el objetivo de las primeras campañas |

**Deduce solo:** del Instagram el tono y la frecuencia; de la web los precios y lo más vendido.
**Si no se hace:** el motor arranca igual y lo completa con lo que lee de la cuenta.

### Paso 2 · Qué vendés — «Lo que vendés, con su precio»
Los dos productos que más vende con su precio, las formas de pago que acepta (incluidas cripto) y
cómo entrega. **Por qué:** sin precios, el anuncio no puede calcular la ganancia ni el costo por
venta, y la campaña se mide a ciegas. **Deduce solo:** con la tienda conectada, los precios y el
stock se leen de ahí y se mantienen solos.

### Paso 3 · Tu material — «Tu material, no el de plantilla»
Los siete cargadores (productos, reseñas, videos, logo, catálogo, local, manual de marca) con **la
carpeta del negocio**: lo que ya subió antes se elige en un toque; lo nuevo se sube y queda en la
carpeta. **Por qué:** es lo único que hace que la pieza se parezca a su negocio. **Deduce solo:**
nada — el material es solo suyo, y por eso es lo único que se sube a mano.

### Paso 4 · Cómo trabajás — «Cómo querés que trabaje»
Tono al conversar, palabras propias, **cuánto invertir por día** (techo) y **cuánta autonomía** darle
(Manual / Compartido / Automático). Los frenos no se tocan desde acá: no publica de noche, no manda
más de un mensaje por persona por día y no mueve el presupuesto sin permiso. **Por qué:** es lo que
hace que se pueda dejar trabajando sin mirarlo.

### Paso 5 · Conectar — «Dónde publica y con qué»
Las cuentas (Instagram, Facebook, WhatsApp ya vienen conectadas; email y tienda se conectan), el
aviso de la **verificación de identidad** (obligatoria para pautar, enlaza a Verificación) y el botón
**«Arrancar el motor»**. **Deduce solo:** si el mismo email está en la tienda y en Instagram,
reconoce la marca y avisa antes de conectar nada.

---

## 3 · El arranque: el plan de la primera semana

«Arrancar el motor» no muestra un «listo»: muestra **lo que va a pasar cada día**, quién lo hace y
lo que cuesta en créditos.

| Día | Quién | Qué hace | Créditos |
|---|---|---|---|
| 1 | Lux | Lee los anuncios de los 5 competidores y dice con qué ángulo gana el rubro | 0 |
| 2 | Nia | Escribe 6 variantes de la primera pieza con ese ángulo | 96 |
| 3 | El panel | Los 5 jueces puntúan y los 500 del público reaccionan: pasan las 3 primeras | 48 |
| 4 | Kai | Publica las 3 mejores y empieza a medir el costo por venta | 0 |
| 5 | Kai | Ajusta la puja y frena lo que no rinde | 0 |
| 6 | Rex | Mueve el presupuesto al público que está comprando | 0 |
| 7 | Sol | Informe de la semana: qué se vendió, cuánto costó cada venta y qué conviene hacer | 0 |

**Total: 144 créditos** de los que el plan incluye por mes (la investigación y los 500 del público no
cuestan; **publicar es lo único que gasta plata**). El principio que se sostiene en todo el flujo:
nada sale a las cuentas del cliente sin pasar por el panel.

---

## 4 · El estado (por qué vive en un contexto)

El onboarding es lo único del panel que **puede quedar a medias**. Si su estado viviera adentro de la
pantalla, se perdería al cambiar de vista y el cliente vería «0 de 5» cada vez que entra. Por eso
vive en `lib/onboarding.tsx`, compartido: así el menú muestra cuánto falta, Hoy puede decir qué sigue,
y lo que se escribió (incluido el material elegido) sigue ahí.

- `completo(n)` se **calcula** de los datos mínimos del paso, no se declara a mano.
- Las cuentas ya conectadas **arrancan puestas** en el paso 5: la pantalla muestra el estado real del
  negocio en vez de una lista vacía.
- Nada de lo que se complete en el onboarding **bloquea** al motor: se toma en la próxima vuelta.

---

## 5 · Lo que respeta del resto del producto

- **Voseo y texto profesional**; cero «(demo)» y cero charla sobre decisiones de diseño del producto.
- Las palabras del modelo: **6 agentes** que trabajan, **5 jueces** + **500 del público** que
  verifican, **3 primeras pasan**. Nunca «perfiles», «observadores» ni «expertos».
- **Dinero siempre en dólares** con el equivalente local al lado.
- Los importes de créditos salen de la tabla de costos real (ronda, variante, imagen, video,
  evaluación) — no inventados para el onboarding.
- Todo control con **globito** que dice qué hace y si es reversible.

---

## 6 · Decisiones abiertas (para el dueño)

1. **¿La verificación antes o después de arrancar?** Hoy se puede arrancar sin verificar: el motor
   prepara y no publica. Decidir si eso frena el arranque o queda como está.
2. **¿Onboarding para el cliente que ya tenía campañas corriendo?** Hoy el flujo arranca de cero; para
   una cuenta que ya usa el panel, el cartel de Hoy dice lo que falta, pero no hay un «revisión
   rápida» de datos ya cargados.
3. **¿Se puede volver a cero?** Sin botón de reinicio: si alguien quiere rehacer los pasos, hoy
   puede tocarlos uno por uno, no borrarlos de una.

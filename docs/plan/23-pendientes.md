# 23 · Pendientes anotados

Cosas que ya se saben y **no se tocan por ahora**, con su por qué y con lo que habría que hacer cuando llegue
el momento. Se anotan acá para que no se pierdan ni se re-descubran.

---

## 1. Los «planos» de cada pieza viajan en el refresco general

- **Qué pasa:** `/api/piezas` devuelve 242 KB y **206 KB son los `planos`** de cada pieza (los diez o veinte
  renglones de escena con su acción, su texto en pantalla y su voz). El panel los pide en **cada refresco**, y
  sólo se dibujan en una pantalla: los pasos de campaña.
- **Por qué se deja así:** el dueño lo dejó en consideración para adelante (no se toca ahora). Los planos **sí se
  usan**, así que no se pueden borrar de la respuesta como se hizo con el `detalle` de los prompts (ese era peso
  muerto: ninguna pantalla lo dibujaba).
- **Qué habría que hacer:** un endpoint propio para esa pantalla (`/api/piezas/:id/planos`, o un `planos` que se
  pida al abrir los pasos) y sacarlos de la respuesta general. Bajaría el refresco otros ~200 KB.
- **Cómo se mide el resultado:** el total por refresco hoy es de **475 KB** (venía de ~1.400 KB). Con esto
  quedaría en ~275 KB.

## 2. Cuántos mercados lee el motor en cada corrida

- **Qué pasa:** cada consulta a la Biblioteca de Anuncios tarda **~3 minutos**, y el motor lee con un techo
  (hoy: cuatro palabras × los primeros mercados declarados). Con dos mercados son seis consultas = ~18 minutos de
  lectura por vuelta.
- **Qué falta:** que el dueño diga **cuántos mercados** quiere que lea de verdad en cada corrida. Ahora el mapa
  muestra los mercados declarados y cuál se está verificando, así que ese trabajo **se ve** — pero cuánto
  profundiza es una decisión de producto suya, no técnica.

## 3. La pregunta abierta del motor, sin responder

- **Qué pasa:** el motor dejó una pregunta al cliente («¿En qué países o regiones están sus clientes?», con las
  opciones que salieron de su propio estudio). **Mientras no se responda, el mapa no puede mostrar más países**:
  sólo dibuja los mercados declarados.
- **Qué falta:** la respuesta en el panel (bloque «Preguntas del motor»). No es código: es el cliente contando lo
  que sólo él sabe.

# 22 · La memoria de los agentes

Qué sabe cada agente, de dónde lo saca, qué deja escrito y qué guarda entre corrida y corrida.
Está escrito a partir de lo que el motor **hace hoy** (no de lo que se pensó hacer): cada línea se puede
comprobar en el código y en la base.

---

## Cómo funciona la memoria (las tres capas)

| Capa | Dónde vive | Qué guarda | Cuánto dura |
|---|---|---|---|
| **El material del cliente** | `archivos`, `onboarding.datos`, los enlaces | lo que el cliente subió: su web, sus PDF, sus precios | hasta que lo saque |
| **Lo que el agente dejó** | `tareas_corrida.resultado` | lo que midió y escribió en su paso, con su fuente | queda en la corrida, para siempre |
| **Lo que el motor sabe del negocio** | `businesses` (`rubro`, `zona`, `categoria`), `onboarding` | lo deducido: a qué se dedica, dónde está, su categoría | se corrige en cada corrida |

**El agente no recuerda por su cuenta: recuerda el back.** Cada corrida vuelve a leer lo que quedó guardado y
trabaja sobre eso. Por eso dos corridas del mismo negocio no empiezan de cero.

---

## Los diez agentes, uno por uno

### Vera · Entender el negocio (va primero)

- **Qué lee:** la descripción del negocio, sus enlaces (los pide y los lee) y sus archivos (los PDF de texto se
  descomprimen y se leen).
- **Qué deja:** el rubro deducido, el alcance (local o global), los lugares que nombra el material, qué ofrece,
  a quién le vende, los canales y sus palabras clave.
- **Qué queda guardado:** el rubro en `businesses.rubro` (si el negocio no lo había escrito), **la zona en
  `businesses.zona`** cuando el material la nombra, y **la categoría en `businesses.categoria`**, que es con la
  que el motor busca su mercado. Si el material no alcanza para la zona o para los mercados, **queda una
  pregunta** para el cliente (`preguntas_del_motor`).
- **Por qué va primero:** sin entender el negocio, los demás salen a investigar sin saber qué buscar.

### Lex · Las lenguas

- **Qué lee:** el material, para ver en qué lenguas nombra su categoría.
- **Qué deja:** las lenguas en las que hay que buscar (inglés, árabe, español…) y el término de la categoría en
  cada una, de la enciclopedia abierta.
- **Por qué importa:** buscar la categoría en la lengua del que vende trae otro mercado.

### Lux · El mercado

- **Qué lee:** los anuncios **ya leídos** de la Biblioteca de Anuncios (`anuncios_leidos`), el informe del
  mercado (`mercado_informes`) y el mapa (OpenStreetMap: Overpass + Nominatim).
- **Qué deja:** cuántos anuncios activos hay y cuánto lleva el más viejo; cuántos competidores de verdad hay
  (no los que entraron por una palabra suelta); qué dice todo el mundo (la saturación) y el hueco que nadie
  ocupa.
- **Su trabajo largo:** **la lectura** — quien sale a la Biblioteca de Anuncios es el trabajador
  (`workers/lector-anuncios.mjs`), que tarda ~3 minutos por consulta y usa **su propio navegador** de la flota.
  Cuando la corrida ya cerró y la lectura sigue, la tarjeta de Lux es la que se enciende.
- **Su memoria:** el informe queda en `mercado_informes` (con su fuente y su fecha) y los anuncios en
  `anuncios_leidos`: la próxima corrida compara contra eso.

### Rex · La demanda y los precios

- **Qué lee:** lo que se haya podido medir del mercado.
- **Qué deja:** lo que puede sostener con una fuente. Cuando no puede (la demanda y los precios escritos
  necesitan una fuente conectada), **lo dice** en vez de estimarlo.

### Nia · La escritura

- **Qué lee:** el material del cliente, el ángulo de esta pieza y el vocabulario del rubro.
- **Qué deja:** el copy: frases cortas, una idea por línea, todo filmable, con las palabras del negocio.
- **Pausa del producto:** escribir cuesta créditos (96 la pieza, 8 su evaluación) y **está pausado a pedido del
  dueño** (`NO_ESCRIBIR_PIEZAS=1`) mientras el motor se ajusta. Cuando está pausado, la corrida hace todo el
  estudio y no escribe, y lo dice en su paso.

### Kai · La publicidad y los costos

- **Qué lee:** los anuncios leídos y cómo pauta el rubro.
- **Qué deja:** cómo cierran las piezas (botón o no), qué formato usa el que gana y qué cuesta.
- **Nota:** el sistema **no publica** ni mueve presupuesto en las plataformas.

### Sol · La medición y el modelo

- **Qué lee:** las predicciones (`predicciones`) y lo que la plataforma reportó (`metricas_reales`).
- **Qué deja:** el desvío real entre lo que el panel predijo y lo que pasó: con eso corrige la próxima
  estimación.

### Rumi · Las conversaciones

- **Qué lee:** las conversaciones del negocio (`conversations`).
- **Qué deja:** respuestas listas para que las mande el dueño, y las frases que más se repiten (lo que la pieza
  tiene que contestar sola).

### Iris · El arte y los prompts

- **Qué lee:** los planos de la pieza y la decisión de cine de toda la pieza (`cineDeLaPieza`).
- **Qué deja:** el prompt de cada motor, con la dirección de fotografía del motor —no la que improvisa el
  generador de planos—: un solo etalonaje por pieza, ópticas por tamaño de plano, y la acción concreta.
- **Regla:** los prompts se validan **en seco** antes de gastar GPU (`pruebas/validar-en-seco.ts`).

### Nova · Los formatos y las tendencias

- **Qué lee:** las tendencias por país y los formatos que se mueven en el rubro.
- **Qué deja:** el molde y el formato de la pieza.

### Tino · La decisión

- **Qué lee:** todo lo que midió el equipo en esta corrida.
- **Qué deja:** qué se sostiene, qué se prueba y qué se deja, con el dato de cada uno — y la decisión de qué
  publicar, según la autonomía que tenga puesta el negocio (Manual · Compartido · Automático).

---

## Lo que el cliente ve de esa memoria

- **Su día** → «El equipo, agente por agente»: la última tarea de cada agente, con su resultado y la corrida de
  la que salió. Mientras el motor trabaja, el que la tiene en la mano muestra su barra y qué está haciendo.
- **El mapa** → qué mercados está verificando (el que se mira ahora late; los ya verificados y los que faltan,
  cada uno con su estado).
- **Hallazgos** → lo que el motor encontró en su mercado, con el dato, por qué importa y la fuente. Un hallazgo
  se **actualiza** (no se repite) cuando la medición cambia.
- **Preguntas** → lo que el motor necesita y sólo el cliente sabe, con las opciones que salieron de su propio
  estudio. La respuesta se guarda donde el motor la lee.

## Las decisiones del dueño que la memoria respeta

1. **El modelo se mantiene SIN audiencia:** los 500 agentes del público trabajan con su comportamiento
   simulado y la calibración con la cuenta del cliente no se propone.
2. **Sólo camino pago para imágenes:** FLUX en la GPU alquilada (o por API). El gratuito está apagado.
3. **Sin gastar en cada corrida** mientras el motor no esté como se quiere: imágenes y videos desconectados y la
   escritura pausada (tres marcas en `/etc/sinkroo/back.env`, que se sacan para reactivarlos).
4. **Nada falseado en pantalla:** lo que no se pudo medir se dice, no se estima.

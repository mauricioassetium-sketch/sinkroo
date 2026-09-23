# Sinkroo — El Motor a la Vista (Glass Engine)

**Versión:** 1.0 · **Fecha:** 2026-09-23
**Idea rectora:** *el ser humano cree lo que ve.* Si el usuario ve a los equipos trabajando,
sabe que hay trabajo real aplicándose a su proyecto publicitario.
**Analogía:** un deportivo con la tapa del motor transparente. El vidrio no enseña mecánica:
prueba que hay algo potente, encendido y trabajando.

---

## 0. La analogía, bien entendida

La analogía es precisa **si distinguimos dos cosas que se confunden fácil**:

| | Vidrio del motor ✅ | Diagrama del motor ❌ |
|---|---|---|
| Qué muestra | pistones moviéndose, aceite circulando, correas girando | el ciclo de combustión en 4 fases |
| Qué comunica | *"esto trabaja, y trabaja para vos"* | *"entendé cómo funcionamos"* |
| Qué exige del usuario | nada | conocimientos técnicos |

**El error que yo cometí** en el análisis anterior: mezclé las dos y recomendé sacar a los agentes.
**El error que hay que evitar ahora:** meter el diagrama adentro del vidrio.

**La ley del vidrio:**

> Lo que se ve es **TRABAJO**, no **ARQUITECTURA**.
>
> El vidrio muestra *qué se hizo, sobre qué tuyo, y cuándo*. Nunca *cómo está construido por
> dentro*.

**Corolario clave:** el enjambre de votación **no es arquitectura: es un panel de expertos**. Y
un panel de expertos es algo que el usuario *quiere* ver. Una cosa es `48 votos emitidos hoy`
(telemetría vacía) y otra muy distinta es *"tu anuncio pasó por 11 personas y así votó cada una"*
(un focus group). **Lo segundo es una de las mejores features del producto y hoy está escondida
detrás de un contador.**

Así que hay **dos motores** que deben verse, y son dos metáforas distintas:

| | El taller | El panel |
|---|---|---|
| Qué es | los 6 agentes trabajando en el tiempo | el enjambre evaluando una pieza |
| Metáfora | un equipo de trabajo, con bitácora | un focus group, con veredicto |
| Pregunta que responde | *"¿qué está haciendo por mí?"* | *"¿esto va a funcionar?"* |
| Cadencia | continua | puntual, por pieza |
| Dónde vive | **Hoy** (vista principal) + barra persistente | **Campañas** (al aprobar una pieza) |

---

## 1. Las tres anclas — la regla de diseño

Todo lo que se muestre como "el motor trabajando" debe tener **las tres anclas**. Si le falta una,
es decoración y sale.

| Ancla | Pregunta | Ejemplo ✅ | Anti-ejemplo ❌ |
|---|---|---|---|
| **1. Algo tuyo** | ¿sobre qué de *mi* negocio? | "…tu campaña del serum" | "…análisis de mercado" (¿de quién?) |
| **2. Un resultado** | ¿qué produjo? | "…encontró que bajaron 15% los precios" | "…está analizando" |
| **3. Un tiempo** | ¿cuándo? | "hace 12 minutos" | "en curso" |

**Y el resultado debe ser clickeable.** Cada trabajo terminado entrega un **artefacto** que el
usuario puede abrir: el informe, las 3 variantes, el anuncio pausado, el gráfico. Un estado se
cree o no se cree; **un artefacto no se discute**.

---

## 2. Los cuatro principios

### 2.1 Artefactos sobre estados
`Ejecutando` no prueba nada. `Hace 4 min: escribió 3 variantes de copy para tu serum → verlas`
prueba todo. Se reemplaza el vocabulario de estado por el vocabulario de resultado.

### 2.2 El motor no se puede ver vacío ⚠️
**Este es el riesgo #1 de la idea, y hay que decirlo claro:**

Si mostrás el motor, y el usuario abre la app y no hay nada pasando, **probaste que no se hace
nada**. Eso es peor que no mostrar nada.

Un vidrio vacío destruye más confianza que una tapa opaca. Por eso la vigilancia tiene que ser
**real, continua y baratísima** (§4) — no un LLM corriendo cada 5 minutos.

Si el motor está genuinamente quieto, la frase honesta no es `inactivo`, es:
**"Listo para arrancar. Aprobá estas 2 piezas y sigo."** El reposo también tiene que ser un estado
con trabajo pendiente del usuario.

### 2.3 Números reales o nada
El vidrio del motor **obliga a que el motor sea real**. Si el usuario ve `votación del momento:
47 votos` y descubre que es un número inventado, no pierde la feature: pierde la confianza en todo
el producto, incluido lo que sí era real.

**Regla:** ningún número se muestra si no se puede trazar a un evento en la base.
El modo demo se etiqueta como demo (`source: demo`) — mostrar el motor en demo está bien, mentir
sobre números no.

Hoy el dashboard viola esto en: `carga: 82%`, `48 votos emitidos hoy`, `500 observadores`,
`votación del momento`, `1.4s de respuesta media`, `96 score`. **Todos esos salen o se vuelven
reales.**

### 2.4 Trabajo barato la mayor parte del tiempo
Para que el vidrio nunca esté vacío sin fundir el negocio en cómputo (§4).

---

## 3. Qué se muestra: antes y después

### 3.1 Los 6 agentes — el taller

**Se queda:** los nombres (Lux, Rex, Nia, Kai, Sol, Rumi) y su rol. Son identidad y son el motor
visible.
**Sale:** `carga: 82%`, `fase: 1`, el `technical` (`market-analyst`), `estado: 'En cola'`, y la
`duracion` (revela lentitud sin dar valor).
**Se agrega:** el ancla (tu campaña / tu producto), el resultado clickeable, y el tiempo relativo.

| Hoy (telemetría) | Después (trabajo anclado) |
|---|---|
| `Lux · Analista de Mercado · carga 82% · estado: analizando` | **Lux** leyó 47 anuncios de 6 competidores de tu zona y encontró que Tienda Norte bajó precios 15%. `hace 12 min` → *ver el hallazgo* |
| `Rex · Estratega · pensando` | **Rex** reasignó $40/día de TikTok a Meta para tu campaña del serum. `hace 2 h` → *ver por qué* |
| `Nia · Creativa · pensando` | **Nia** escribió 3 variantes nuevas apoyadas en el ángulo "resultado". `hace 40 min` → *leerlas* |
| `Kai · Comprador de Medios · **En cola**` | **Kai** está esperando que apruebes las 3 piezas para lanzar. → *aprobar ahora* |
| `Sol · Analista de Resultados · votando` | **Sol** comparó tu predicción (84) con el resultado real (79) y corrigió el modelo. `hace 1 día` → *ver la calibración* |
| `Rumi · Vendedor · historial` | **Rumi** cerró 2 ventas por WhatsApp hoy y escaló 1 conversación a vos. `hace 20 min` → *abrir* |

**El cambio de fondo:** `En cola` pasa de ser un estado pasivo a ser **una decisión pendiente
tuya**. El motor en reposo le pide algo al usuario. Eso convierte el mirar en actuar.

### 3.2 El enjambre — el panel

**Se queda:** las 8 dimensiones (claridad, hook, credibilidad, urgencia, relevancia,
diferenciación, emoción, CTR), los votos con su rationale, el score y el veredicto.
**Sale:** `12 inteligencias`, `votos emitidos hoy`, `500 observadores`, `votación del momento`,
`tormenta colectiva`.
**Se agrega:** presentarlo como **focus group**, con las personas reales que ya existen en el
código (`DEFAULT_AGENTS`): comprador impulsivo, community manager escéptico, analista de
performance, guardián de marca, copywriter senior.

```
Tu anuncio pasó por 11 expertos          Score 84  →  Aprobado para lanzar

  Comprador impulsivo    89   "El hook frena el scroll en el primer segundo"
  CM escéptico           72   "Le falta prueba social: ningún testimonio visible"
  Analista de performance 80  "CTR estimado 3,4% — por encima de tu promedio"
  Guardián de marca      86   "Tono coherente con tu línea de ingredientes limpios"
  Copywriter senior      91   "El ángulo de resultado está bien elegido"
  …
  El más duro te puso 72. Esto es lo que hay que arreglar: →
```

**Por qué esto es motor a la vista y no arquitectura:** porque un focus group es un servicio que
el usuario ya entiende y ya paga. No hay nada que explicar. Y el rationale de cada votante —
que **ya existe en el código** (`AgentVote.rationale`)— es el contenido más valioso del sistema y
hoy no se muestra.

**El detalle que lo hace accionable:** el voto más bajo es la instrucción. *"El más duro te puso
72: le falta prueba social."* Eso es una tarea concreta, no un número.

### 3.3 Lo que sale sin reemplazo

| Elemento | Por qué |
|---|---|
| `carga: 82%` | Telemetría de máquina. Al usuario no le dice nada y es inventada |
| `tarea: 'Estudiando tu oportunidad…'` (genérico) | No tiene ancla. Se reescribe con el caso concreto |
| `duracion: '2h 15m'` | Revela lentitud y no aporta. Se reemplaza por `hace 2 días` |
| `500 observadores`, `votación del momento` | Números inventados. El principio 2.3 los prohíbe |
| `48 votos emitidos hoy` | Volumen sin significado. Se reemplaza por "4 de tus anuncios pasaron por el panel" |
| `12 inteligencias del sistema` | La cifra es inconsistente con los 6 agentes y no es una unidad comprensible |
| `MiroFish` / `mercado secundario predictivo` | Nombre de proveedor interno expuesto como sección |

---

## 4. Los tres niveles de trabajo — cómo se sostiene la vigilancia

**El problema:** si el motor tiene que estar siempre trabajando, y cada trabajo es una llamada a
un LLM, el costo escala con el tiempo encendido. 24/7 es inviable así.

**La solución:** tres niveles, de barato a caro. La mayoría del tiempo visible lo cubre el nivel 1.

| Nivel | Qué corre | Cómo | Frecuencia | Costo | Qué se ve |
|---|---|---|---|---|---|
| **1 · Vigilancia** | Chequeos deterministas contra datos reales: campaña se desvió, CPA subió, conversación sin responder hace X, stock de piezas aprobadas | SQL + reglas, **sin LLM** | cada 15 min | ~0 | "Kai revisó tus 4 campañas: 3 normales, 1 con CPA subiendo" |
| **2 · Análisis** | Lectura de patrones: competencia, tendencias, ángulos, calibración | LLM programado | 2-4 veces/día | bajo | "Lux leyó 47 anuncios nuevos" |
| **3 · Creación** | Piezas, variantes, imágenes, videos, guiones | LLM + modelos caros | bajo demanda / aprobación | alto | "Nia escribió 3 variantes" |

**La clave del vidrio:** el nivel 1 corre siempre y **siempre produce algo verdadero que mostrar**.
Aunque el usuario no haya pedido nada, aunque no haya campañas nuevas, aunque sea de madrugada.

Un chequeo que confirma "todo normal" **es trabajo** y **es prueba de que el sistema cuida el
proyecto**. El dashboard ya lo promete: *"Te estoy vigilando la tienda 24/7"*. Esto es cómo se
cumple sin quebrar.

**Y hay un beneficio secundario:** cuando el nivel 1 detecta algo, puede **disparar** el nivel 2 o
3. Así el gasto caro ocurre cuando hay un motivo real, no por reloj.

---

## 5. Dónde vive el motor — diseño de la superficie

### 5.1 La barra de actividad persistente
**Visible en toda la app**, abajo o en la barra superior. Es el vidrio del motor en su forma
mínima:

```
● 3 agentes trabajando ahora   ·   2 esperan tu OK        [ver]
```

- Nunca dice "0 trabajando". Si no hay nada activo, dice **"Todo al día. 14 revisiones hoy"**.
- El contador de "esperan tu OK" es la llamada a la acción más importante del producto.

### 5.2 `Hoy` — la vista principal
Tres bloques, en este orden:
1. **El resultado** — KPIs (ventas, ROAS, score, alcance)
2. **El motor** — los 6 agentes con su trabajo real y anclado (§3.1)
3. **Tu turno** — lo que el motor necesita del usuario: aprobar piezas, responder una
   conversación, decidir un presupuesto

El bloque 3 es el que cierra el ciclo: **mirar el motor tiene que terminar en una acción.**

### 5.3 La bitácora — el historial
El dashboard ya lo tiene (`tarea, hace, fecha, duracion, resultado`) y **es la parte más valiosa
del diseño actual**. Se convierte en una **línea de tiempo scrolleable** por día/semana/mes.

- Filtrable por agente y por proyecto.
- Cada entrada abre su artefacto.
- Es también **la mejor pieza de venta**: una demo donde el usuario ve 30 días de trabajo
  acumulado desde el primer minuto, aunque la cuenta se haya creado hace 5 minutos (con el
  `source: demo` bien etiquetado).

### 5.4 La ficha del agente
Click en un agente abre su **legajo**: qué hizo hoy, esta semana, este mes; cuánto produjo; qué
decisiones tomó; qué está esperando. Es el "service record" del equipo.

### 5.5 El panel (en Campañas)
Cuando una pieza se pre-valida, se abre el focus group (§3.2). Ahí vive el motor del enjambre.

---

## 6. El vocabulario — cómo se escribe el trabajo

Regla de redacción: **sujeto + acción concreta + objeto tuyo + resultado + tiempo.**
Sin adjetivos, sin gerundios vacuos, sin nombres internos.

| ❌ No | ✅ Sí |
|---|---|
| "Estudiando tu oportunidad, audiencia y competencia" | "Leyó 47 anuncios de 6 competidores de tu zona. Tu ventaja de precio se achicó 15%." |
| "Analizando resultados" | "Comparó lo que predijo (84) con lo que pasó (79). Ajustó el modelo para la próxima." |
| "Generando creativos" | "Escribió 3 variantes del serum apoyadas en el ángulo "resultado"." |
| "En cola" | "Espera tu OK para publicar 3 piezas." |
| "Ejecutando" | "Pausó 1 campaña esta mañana porque el CPA subió a $28." |

---

## 7. El riesgo principal y cómo se mitiga

| Riesgo | Por qué es grave | Mitigación |
|---|---|---|
| **El motor falso** | Mostrar números inventados y que se descubra destruye la confianza en todo, incluido lo real | Principio 2.3: trazabilidad obligatoria. Etiquetado `demo/live` |
| **El vidrio vacío** | Enseñar que no pasa nada es peor que no mostrar | Nivel 1 de vigilancia siempre activo (§4) |
| **Ruido / notificaciones** | Un motor que avisa todo se silencia y deja de existir | Avisar **solo cuando hay una decisión para el usuario**, no cuando hay actividad |
| **Costo de cómputo** | 24/7 con LLM no cierra | Los tres niveles (§4) |
| **Teatro de actividad** | Si el motor se vuelve decorativo, pierde valor | Las tres anclas (§1): sin ancla, sale |
| **Lentitud expuesta** | Mostrar `duración: 2h 15m` hace que el sistema parezca lento | Se muestra tiempo relativo, no duración |

---

## 8. Impacto en el roadmap

Esta idea **adelanta** una parte de la Fase 6 y la convierte en columna vertebral temprana.
No se puede mostrar el motor si no hay motor.

### Nueva fase: **Fase 0.5 — La columna del motor** (después de cimientos, antes de integraciones)

| Componente | Qué es |
|---|---|
| `agent_runs` | Corrida con estado, inicio, fin, resultado, artefacto vinculado |
| `artifacts` | Todo lo que produce un agente, con tipo y vínculo a proyecto |
| `work_events` | El evento del nivel 1: chequeo determinista con conclusión |
| **Scheduler** | Jobs por tenant: nivel 1 cada 15 min, nivel 2 programado |
| **SSE `/api/stream`** | El "en vivo" real |
| **Seed de demo** | 30 días de bitácora verosímil para cuentas nuevas, etiquetado `demo` |

**Por qué antes de las integraciones:** permite construir y validar toda la experiencia del motor
con datos del nivel 1 (que no dependen de ninguna credencial externa), en paralelo a los trámites
de App Review de Meta, que tienen cola.

### Ajuste en las otras fases
- **Fase 3** (Conversaciones): Rumi aparece en el taller desde el día 1.
- **Fase 4** (Campañas): el panel del enjambre se construye acá, junto con la pre-validación.
- **Fase 6** (de "agentes 24/7") queda reducida a los niveles 2 y 3 en su forma completa.

---

## 9. Cómo sabremos si funciona

| Métrica | Qué mide | Objetivo |
|---|---|---|
| % de sesiones con ≥1 trabajo nuevo visible | que el vidrio nunca esté vacío | > 80% |
| Trabajos con artefacto abierto | que el trabajo se consuma, no se mire | > 30% |
| Acciones disparadas desde el motor | que mirar termine en actuar | > 1 por usuario/semana |
| Conversión de "esperan tu OK" → aprobado | que el pedido del motor se entienda | > 60% |
| Retención D7 / D30 | que el vidrio retenga | a definir vs. línea base |

Si la métrica 3 es baja, el motor entretiene pero no sirve. Si la 4 es baja, el motor pide mal.

---

## 10. Decisiones

1. **¿La barra de actividad persistente va arriba o abajo?** Arriba = más visible, choca con los
   KPIs. Abajo = menos intrusiva. *Recomiendo abajo y que se expanda al click.*
2. **¿Se muestran los 6 agentes siempre, o solo los que están trabajando?** Mostrar siempre
   comunica "equipo completo"; solo los activos comunica "movimiento". *Recomiendo siempre los 6,
   con los quietos en estado "esperando tu OK" o "al día".*
3. **¿La bitácora arranca con 30 días de demo en cuentas nuevas?** *Recomiendo sí, bien etiquetado
   — es la mejor demostración del valor y resuelve el día 1 vacío.*
4. **¿El panel del enjambre muestra los 5 votantes o los 11?** El código tiene 5 personas × sus
   dimensiones prioritarias = ~11 votos. Mostrar 5 personas con su voto agregado es más
   comprensible que 11 votos sueltos. *Recomiendo 5 personas.*
5. **¿"Lux/Rex/Nia/Kai/Sol/Rumi" llevan avatar humano o ícono?** Avatar humano sube la sensación
   de equipo y baja la de software. *Recomiendo avatar.*

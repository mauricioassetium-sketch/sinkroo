# 11 · El público calibrado con datos reales

> **ESTADO: EN PAUSA POR DECISIÓN DEL DUEÑO (25/09/2026).**
> Por ahora el modelo se mantiene **sin audiencia**: los 500 agentes trabajan con su propio
> comportamiento simulado, sin clonar ni calibrar con la audiencia del negocio. Es más simple, no
> depende de permisos de ninguna plataforma y el motor funciona igual. Lo construido (las rutas de
> calibración y los conectores) queda disponible, sin usarse como promesa del producto, para retomarlo
> cuando se decida. Textual del dueño: «mantengamos el modelo sin audiencia como estaba antes… ya
> veremos cómo mejorar esto».

Estado: **propuesta de diseño, nada construido**. Fecha: 25/09/2026.
Pedido del dueño: «que los 6 analicen el mercado y le asignen el comportamiento del mercado del usuario
real… en Instagram tengo 200 seguidores, en Facebook 500… veo cuáles reaccionan mejor a mi perfil y
productos… y con eso le generamos comportamiento y realidad segmentada a esos 500 agentes… podríamos no
solo ver mi perfil sino el perfil de las competencias y clonar personalidades… analízalo a profundidad… sin
romper las reglas de Meta Ads… dime cómo se haría y busca la mejor opción».

---

## 1 · La idea, en una frase

Hoy los 500 agentes del público son **inventados y su reacción es un modelo fijo**. La propuesta es que
dejen de ser inventados: que su composición y su manera de reaccionar salgan de **datos reales** —primero
los del propio negocio— para que lo que dice el público se parezca a lo que diría su mercado.

Eso tiene nombre en la investigación: **silicon sampling** (muestreo sintético). El trabajo de referencia
(Argyle y otros) mostró que un modelo condicionado con perfiles sociodemográficos reproduce distribuciones
de opinión parecidas a las de encuestas reales. La conclusión de la literatura posterior es la que importa
para nosotros:

- Condicionar **solo con demografía da malos resultados**: error alto y correlación casi nula.
- **Agregar contexto** (qué consume, cómo compra, qué le molesta) mejora la estimación de forma notoria.
- Los sintéticos **aciertan en la dirección y en los promedios, y fallan en la varianza** de cada
  subgrupo, en la polarización y en las interacciones entre varias variables.
- Los productos serios del rubro (Eleya, AuraOne, Assembly, Echo) hacen tres cosas siempre: **calibran con
  datos reales**, **declaran la incertidumbre** y **se validan contra el mundo** (backtest, holdout,
  validación hacia adelante). Y todos repiten una regla: **un perfil de grupo nunca se convierte en una
  afirmación sobre una persona real**.

Traducido a Sinkroo: la idea es buena y es el camino, pero **no se hace clonando personas** —se hace
calibrando un panel con datos reales y midiendo si mejora.

---

## 2 · Qué datos existen de verdad (y cuáles no)

### 2.1 Del negocio del usuario: sí, por la API oficial

Con la app de Meta conectada al Instagram/Facebook del negocio (cuenta profesional), la API de Instagram
(v26) entrega:

| Dato | Detalle real |
|---|---|
| Audiencia del perfil | Edad, género, **las 45 ciudades y los 45 países principales**. Requiere **100+ seguidores**. |
| Audiencia que interactúa | Las mismas cuatro dimensiones, pero de quienes **reaccionan** (no solo de quienes siguen). Requiere **100+ interacciones** en la ventana. |
| Interacción por publicación | Me gusta, comentarios, compartidos, **guardados**, alcance, vistas, seguidores nuevos y visitas al perfil. |
| Límites | Solo los **45 primeros** de cada dimensión; demora de hasta 48 h; nada en cuentas con menos de 100 seguidores; se conserva 2 años. |

Es decir: **la audiencia real viene como distribuciones marginales** (edad × género × ciudad), no como una
lista de personas. Eso alcanza para lo que queremos hacer y además es lo correcto: son agregados, sin
identidades.

De Facebook (página del negocio) sale el equivalente. Y de lo que Sinkroo ya tiene: **las conversaciones**
de WhatsApp son datos propios de primera mano (qué preguntan, qué objeta, en qué zona).

### 2.2 De la competencia: casi nada, y está bien saberlo

- La **Biblioteca de anuncios de Meta** por API entrega anuncios **políticos y de causa** en todo el mundo
  y **todos** los anuncios solo para **UE y Reino Unido**. Los anuncios comerciales de un negocio
  colombiano **no están** en la API.
- Nunca entrega: **audiencias**, segmentación, CTR, ROAS, gasto real (salvo rangos en políticos) ni
  conversiones.
- Lo que sí se ve (en la web pública de la biblioteca): el **creativo**, si está activo, desde cuándo corre
  y en qué plataformas. Y la longevidad de un anuncio es el mejor indicador indirecto de que funciona: si
  nadie lo apagara, es porque rinde.

**Conclusión dura:** no hay forma legítima de obtener la audiencia ni las métricas de la competencia. Por
eso **no se clonan competidores**. Lo que sí se toma de ellos es lo público: sus anuncios, su ángulo, su
formato y cuánto tiempo llevan corriendo.

### 2.3 Lo que NO se va a hacer, y por qué

1. **Clonar seguidores o clientes reales.** No hay API que entregue los seguidores de otra cuenta; hacerlo
   por scraping viola las *Automated Data Collection Terms* de Meta (octubre 2024: «no se hará recolección
   automática de datos sin permiso escrito expreso») y, sobre personas identificables, choca con protección
   de datos. Además sería frágil: cualquier cambio de Meta rompe el robot.
2. **Pegarle a la web de la biblioteca con un robot.** Aunque un fallo judicial de 2024 dejó claro que leer
   datos públicos sin iniciar sesión no está alcanzado por los términos de Meta, automatizar la recolección
   sí lo está desde octubre de 2024. Un producto que crece no puede apoyarse en eso.
3. **Presentar la simulación como si fuera el mercado.** Es la trampa del rubro: un solo resultado de un
   modelo no es un mercado. Si lo decimos con esa seguridad, el día que falle una campaña se cae la
   confianza que costó construir.

---

## 3 · Cómo se haría: el público calibrado, en cuatro capas

### Capa 1 · La semilla real (solo datos propios, por API)

Los 6 agentes traen los datos reales de las cuentas conectadas del negocio: las distribuciones de la
audiencia (seguidores y quienes interactúan) y la interacción de sus últimas publicaciones. De ahí sale
**quién es su público** (composición real) y **qué premia** (qué formatos y ángulos tuvieron más guardados,
compartidos y alcance).

Nada de esto se inventa: si el negocio tiene 200 seguidores, la distribución es la de esos 200 (agregada).

### Capa 2 · La composición del panel: 500 agentes muestreados, no inventados

Los 500 agentes se generan **muestreando las distribuciones reales** (edad × género × ciudad, según los
insights) y no al azar. Cada agente queda con:

- **Segmento** al que pertenece (la celda de la distribución).
- **Peso**: qué proporción del público real representa ese segmento. Con esto, un segmento que es el 40 %
  de la audiencia pesa el 40 % del panel — y no como pasa hoy, donde los 500 están repartidos parejo.
- **Origen del dato**: `propia` (de las cuentas), `inferida` (del rubro y de lo que el negocio describió) o
  `competencia` (de los anuncios públicos). Que el origen se vea en la pantalla es parte del producto.
- **Contexto** además de la demografía: interés, sensibilidad al precio, estilo de compra y, si hay
  conversaciones, qué preguntó y qué objetó gente de ese segmento.

Los datos de la audiencia vienen con mínimos (100 seguidores / 100 interacciones y solo los 45 primeros).
Cuando son pocos, el panel lo dice: **el panel no inventa precisión que los datos no tienen**.

### Capa 3 · El comportamiento: lo que hace que reaccionen como el mercado real

Acá está la diferencia entre «simulado» y «calibrado». La reacción de cada agente deja de ser una fórmula
fija y pasa a depender de dos cosas:

1. **Su segmento** (qué pesa para quien es de ese segmento).
2. **Los rasgos de la pieza** (formato, si dice el precio, si muestra prueba social, si tiene llamada).

Y esos pesos **se estiman con los datos del propio negocio**: qué publicó, con qué rasgos, y cómo le fue de
verdad (guardados, compartidos, alcance, clics, ventas). Es un modelo simple de pesos que se **corrige con
cada campaña medida** — el mismo principio que ya tiene la tabla `predicciones` (predicho vs. observado y su
desvío), ahora alimentado con las métricas reales de las publicaciones.

Cuando no hay datos suficientes, arranca con los priors del rubro y **lo dice**: «calibrado con 3
publicaciones propias y los datos del rubro».

### Capa 4 · La validación honesta (lo que hace que esto sirva de algo)

Sin esta capa, todo lo anterior es un modelo que suena bien. Con esta capa, es un instrumento:

| Prueba | Cómo se hace | Qué se reporta |
|---|---|---|
| **Backtest** | Se reservan las últimas N publicaciones del negocio. El modelo predice su rendimiento **sin verlas** y después se compara con lo que pasó de verdad. | El error (MAE) y en qué dirección se equivoca. |
| **Validación hacia adelante** | La predicción se guarda **antes** de publicar; cuando la campaña corre, se carga el resultado real. | El desvío por pieza y el acumulado del negocio. |
| **Estabilidad** | Se corre la misma evaluación con semillas distintas. | Cuánto se mueve el resultado según la semilla (si se mueve mucho, el resultado no es confiable). |
| **Sensibilidad al enunciado** | La misma pieza, preguntada de dos formas. | Cuánto cambia la respuesta por cómo se pregunta (si cambia mucho, es artefacto). |
| **Banda de confianza** | Con pocos datos, la banda se **ensancha**, no se estrecha. | Se muestra arriba del resultado: «estimación con poca historia». |

Esto es exactamente lo que hacen los productos serios del rubro, y es lo que nos va a permitir decir con
honestidad: **«predijo 84, pasó 79: el modelo corrigió y la próxima estima más cerca»**, con el error
medido y no con una frase.

---

## 4 · Lo que se le muestra al dueño del negocio

1. **Su audiencia real** (de sus cuentas): edad, género, ciudades principales, y qué publicaciones
   funcionaron mejor. Con la fecha del dato.
2. **Su panel de 500**: cuántos agentes por segmento y **con qué peso**, marcando qué parte viene de datos
   propios y qué parte es inferida.
3. **La confianza**: cuántas publicaciones propias sostienen la calibración y qué banda tiene la estimación.
4. **El acierto del modelo**: predicho vs. real de las últimas campañas, con el error promedio. Y la frase
   honesta cuando el error es grande.
5. **De la competencia**: solo lo público (sus anuncios, su ángulo, su formato, cuánto llevan corriendo), y
   dicho así: «no se puede saber su audiencia; esto es lo que se ve de ellos».

---

## 5 · Cómo se implementa (por fases, sin romper nada)

### Fase A · Sin depender de ninguna clave nueva
- Campos nuevos en `publico_agentes`: `segmento`, `peso`, `origen` (propia/inferida/competencia) y
  `contexto`.
- `POST /api/publico/calibrar`: recibe las distribuciones (edad × género × ciudad) y **redistribuye los 500**
  con sus pesos, sin borrar el histórico de reacciones.
- `GET /api/publico/calibracion`: devuelve el panel comparado con la distribución real y de dónde sale cada
  peso.
- `predicciones` suma: la métrica real observada, el error y el acumulado por negocio.
- `POST /api/mirofish/backtest`: corre la prueba con las piezas ya evaluadas y devuelve el error.
- En la pantalla: el panel con sus pesos, el origen del dato y la banda de confianza.

### Fase B · Con la app de Meta (cuando estén las claves)
- Traer automáticamente la audiencia y la interacción por publicación de las cuentas conectadas (los
  insights ya vienen agregados y con mínimos: no hay identidades de nadie).
- Calibrar el panel solo, cada vez que se refrescan los datos.
- Alimentar el backtest con las métricas reales de lo publicado.

### Fase C · El aprendizaje continuo
- Cada campaña que se mide ajusta los pesos del segmento.
- El informe de confianza viaja con cada evaluación: con poca historia, banda ancha; con historia, estimación
  fina.

**Nada de esto toca las reglas de Meta**: solo se leen los datos del propio negocio por su API, lo público
de la competencia se lee como lo lee cualquier persona (y a escala de análisis, vía biblioteca, no con
robots), y nunca se guarda ni se muestra información de personas identificables.

---

## 6 · Riesgos y límites (dichos antes de construir)

1. **Poca audiencia, poca señal**: con 200 seguidores los insights son gruesos (y hay umbrales de 100). El
   panel va a ser una aproximación con banda ancha, no una radiografía. Hay que mostrarlo así.
2. **El error al principio será alto.** Un modelo calibrado con tres publicaciones vale por su capacidad de
   corregirse, no por acertar la primera vez.
3. **Acierta en dirección y promedio, falla en los extremos**: no sirve para predecir «esta persona
   comprará», sí para estimar «cuántos de cada cien van a guardar la pieza».
4. **La tentación de exagerar.** El producto tiene que resistir la presión de decir «el mercado dice» y
   seguir diciendo «la estimación dice, con este error». Es la diferencia entre un juguete y un instrumento.
5. **Metas de plataforma**: si mañana cambian los permisos de Meta, la Fase B se apaga y el panel vuelve a
   los priors del rubro, avisando. El producto no se rompe: pierde calibración.

---

## 7 · La recomendación

**Hacerlo, pero como calibración y no como clonación, y en el orden que protege la confianza:**

1. **Fase A ya** (no necesita claves): pesos por segmento + origen del dato + backtest + banda de confianza.
   Esto ya mejora los 500 y, sobre todo, empieza a medir el error.
2. **Fase B cuando estén las claves de Meta**: la calibración automática con la audiencia real.
3. **Nunca** clonar personas ni scrapear audiencias ajenas: es lo que rompe las reglas, y además es
   innecesario — lo que hace que el panel se parezca al mercado es la **calibración medida**, no el parecido
   superficial con alguien real.

Con esto, la frase de la portada («predice cómo va a rendir antes de publicar») deja de ser una promesa y
pasa a ser una afirmación con error medido detrás.

---

## Fuentes

- Instagram Platform · Insights (edad, género, ciudades, métricas por publicación)
  https://developers.facebook.com/documentation/instagram-platform/api-reference/instagram-user/insights
- Referencia de las APIs de Instagram (límites: 45 entradas, 100+ seguidores, 48 h)
  https://gist.github.com/jameschapman2c/65eff9f54a2d350b17a6ce5127b9fe42
- Límites reales de la Biblioteca de anuncios de Meta (comercial solo UE/Reino Unido, sin métricas)
  https://adlibrary.com/posts/meta-ad-library-api-limitations
- Meta · Automated Data Collection Terms (octubre 2024: permiso escrito expreso)
  https://adship.ai/blog/facebook-ad-library-downloader
- Meta v. Bright Data (2024): leer datos públicos sin iniciar sesión no está alcanzado por los términos
  https://admakeai.com/blog/meta-ad-library-scraping-terms-of-service
- Silicon sampling: fundamentos y límites
  https://getminds.ai/blog/silicon-sampling
- «LLM Generated Persona is a Promise with a Catch» (calibrar exige muestrear de la distribución correcta)
  https://arxiv.org/html/2503.16527v1
- Random Silicon Sampling (condicionar por grupo puede rendir mejor que perfilar individuos)
  https://www.alphaxiv.org/abs/2402.18144
- Metodología de audiencias sintéticas con validación (backtest, holdout, estabilidad, sensibilidad)
  https://www.assemblysimulator.com/methodology
- Poblaciones sintéticas calibradas con datos propios y regla de no atribuir a personas reales
  https://auraone.ai/product/synthetic-populations

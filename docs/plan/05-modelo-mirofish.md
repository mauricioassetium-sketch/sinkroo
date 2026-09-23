# Sinkroo — El modelo MiroFish (cerrado)

**Versión:** 1.0 · **Fecha:** 2026-09-23
**Qué resuelve:** cierra el conflicto de cifras y nombres que quedó abierto entre los documentos 00–04
y el código del dashboard v2 (`12 inteligencias`, `11 expertos`, `11 dimensiones`, `5 perfiles`,
`500 observadores`, `los bots`, `el panel de expertos`, `vendedores`, `enjambre`).
**Regla de este documento:** donde contradiga a los docs 00–04 o al código, **manda este documento**.
Los otros cuatro siguen valiendo en todo lo demás.

**Fuentes verificadas:** `apps/dashboard-v2/src/data/{mirofish.ts,demo.ts,campana.ts,publicaciones.ts}`,
`components/{FlujoMiroFish,MotorEnVivo,Publicar,CampanaPasos}.tsx`, `views/{Campanas,Hoy,Creditos,Cuenta}.tsx`.

---

## 0. Las tres capas, en una imagen

```
  ┌──────────────────────────────────────────────────────────────────────┐
  │  CAPA 1 · LOS 6 AGENTES CENTRALES                                    │
  │  Lux · Rex · Nia · Kai · Sol · Rumi                                  │
  │  PRODUCEN y ACTÚAN.  No votan, no puntúan nada.                      │
  └───────────────────────┬──────────────────────────────────────────────┘
                          │  convocan y dan el criterio  ↓
  ┌───────────────────────▼──────────────────────────────────────────────┐
  │  CAPA 2 · LOS 5 JUECES DE MIROFISH                                   │
  │  El impulsivo · El que compara · El desconfiado ·                    │
  │  El experto del rubro · Alguien que nunca te vio                     │
  │  100 agentes del público a cargo cada uno → 5 × 100 = 500            │
  │  DEFINEN LA LENTE y FIRMAN EL VOTO.  No crean piezas.                │
  └───────────────────────┬──────────────────────────────────────────────┘
                          │  despliegan las preguntas  ↓
  ┌───────────────────────▼──────────────────────────────────────────────┐
  │  CAPA 3 · LOS 500 DEL PÚBLICO                                        │
  │  5 lentes × 4 estados con la marca × 25 réplicas = 500               │
  │  REACCIONAN. Son los que producen el número.                         │
  └───────────────────────┬──────────────────────────────────────────────┘
                          │  sube el voto: 500 → 5 votos de juez → score  │
                          └─────────────► ranking del 1 al 5 · veredicto
```

**Las tres cifras canónicas son 6 · 5 · 500.** Ninguna otra. Si una pantalla, un documento o un
texto comercial dice otra cosa, está mal.

---

## 1. Una sola palabra para cada cosa (el vocabulario)

Esto es lo primero que hay que arreglar, porque el usuario hoy lee cinco nombres distintos para la
misma capa. Se queda **una** palabra por concepto.

| Concepto | Palabra única (oficial) | Se retira |
|---|---|---|
| Los que producen | **los 6 agentes** (Lux, Rex, Nia, Kai, Sol, Rumi) | `6 Deep Agents`, `12 inteligencias`, `el equipo de 6` |
| Los que juzgan | **los 5 jueces de MiroFish** | `5 perfiles`, `11 expertos`, `el panel de expertos`, `vendedores`, `el enjambre`, `focus group`, `tormenta colectiva` |
| Los que reaccionan | **el público** (500 agentes del público) | `500 observadores`, `los bots`, `mercado secundario predictivo` |
| El sistema de evaluación | **MiroFish** (y su descripción en una línea: «el mercado simulado») | `mercado secundario predictivo`, `simulación predictiva` |
| Los criterios que se miran | **los 8 criterios** (claridad, gancho, credibilidad, urgencia, relevancia, diferenciación, emoción, texto) | `11 dimensiones`, `12 dimensiones` |
| La unidad de cómputo | **créditos** | — |

Dos aclaraciones que evitan el 80% de la confusión:

- **MiroFish es un lugar, no un agente.** Es la etapa por la que pasa todo. Los 5 jueces y los 500
  del público viven adentro; los 6 agentes entran y salen.
- **Los 8 criterios no son agentes.** Son las ocho preguntas que el público se hace. Un criterio no
  vota: vota un agente del público que mira ese criterio. Confundir criterios con votantes es
  exactamente de donde salieron las «11 dimensiones» y las «12 inteligencias».

---

## 2. Capa 1 — Los 6 agentes centrales

Son los mismos 6 de siempre (ya existen en `packages/deep-agents` y en `data/demo.ts`). Lo que este
documento fija es **qué hacen con MiroFish**, que es lo que estaba sin definir.

| Agente | Rol | Qué hace | Relación con MiroFish |
|---|---|---|---|
| **Lux** | Analista de Mercado | Lee los anuncios que corren, detecta los colores, los ángulos y los precios que convierten. | **Alimenta.** Sus hallazgos son el material con el que se arma el lote que va a juicio. No vota. |
| **Rex** | Estratega de Marketing | Define objetivo, público, ángulo y presupuesto. | **Convoca.** Decide qué lote entra a MiroFish y con qué objetivo se mide. No vota. |
| **Nia** | Creativa de Anuncios | Escribe los prompts, los copys y las variantes. | **Produce y corrige.** Arma las piezas que se juzgan y rehace lo que los jueces objetan. No vota lo suyo. |
| **Kai** | Comprador de Medios | Publica, pausa y mueve presupuesto. | **Ejecuta lo aprobado.** No puede publicar nada sin veredicto `go`. Es el freno entre el juicio y la plata. |
| **Sol** | Analista de Resultados | Compara lo que se predijo con lo que pasó de verdad. | **Enseña.** Recalibra los pesos del público con el resultado real. Es el que mantiene vivo el número. |
| **Rumi** | Vendedor de Cierre | Atiende WhatsApp, cierra, escala a un humano. | **No pasa por MiroFish.** Una conversación en curso no se simula: hay un cliente real del otro lado. |

**Regla dura:** ninguno de los 6 vota. Si un agente votara su propia pieza, el número dejaría de ser
una medición del público y volvería a ser la opinión del que la escribió.

---

## 3. Capa 2 — Los 5 jueces de MiroFish

### 3.1 Quiénes son (y por qué esta lista y no la otra)

Hoy hay **dos listas de votantes** en el código y hay que quedarse con una:

- `data/mirofish.ts` → `PERFILES`: impulsivo, compara, desconfiado, experto, nuevo. **Es la lista buena.**
- `data/demo.ts` → `PANEL_ULTIMO.votantes`: comprador impulsivo, CM escéptico, analista de
  performance, guardián de marca, copywriter senior. **Se retira.**

**Por qué la segunda se retira:** esos cinco no son el público, son **el equipo disfrazado de
votantes**. «Analista de performance» es el trabajo de Sol, «copywriter senior» es el trabajo de Nia,
«guardián de marca» es lo que hacen Rex y Nia, y «CM escéptico» es el desconfiado con otro nombre.
Cuando el panel son los que escribieron la pieza, el juicio es una autoevaluación. La lista de
`mirofish.ts` es la única que mira desde afuera: **son cinco personas del público, no cinco
profesionales**.

| # | Juez | Qué es | Qué mira | Qué salva si falta |
|---|---|---|---|---|
| 1 | **Alguien que nunca te vio** | No sabe qué vendés ni quién sos | claridad, gancho, relevancia | La pieza que se entiende solo entre los que ya te conocen |
| 2 | **El impulsivo** | Decide en 3 segundos | gancho, claridad, emoción | El scroll que no frena en el primer segundo |
| 3 | **El que compara** | Mira precio y alternativa | claridad, relevancia, diferenciación | La oferta escondida y la pieza que no se distingue de las otras 4 |
| 4 | **El desconfiado** | Busca la letra chica | credibilidad, claridad | La promesa sin prueba social |
| 5 | **El experto del rubro** | Detecta lo que no es real | credibilidad, diferenciación, urgencia | El dato inventado, el claim flojo, el «ingrediente mágico» |

Los cinco están en orden de **recorrido de decisión**, no alfabético: no te conoce → mira 3 segundos →
compara → desconfía → verifica. Cada pieza se cae en alguno de esos cinco escalones, y **el juez que
le puso el puntaje más bajo es el escalón donde se cae**. Eso es lo que hace accionable el resultado:
no «sacó 74», sino *«se cae en el escalón de la confianza: falta prueba social»*.

### 3.2 Por qué 5 y no otro número

| Número | Veredicto | Por qué |
|---|---|---|
| 1 | ❌ | Es un promedio de una opinión. El «juicio» pasa a ser lo que diga el modelo con otro nombre. |
| 3 | ❌ | Deja afuera al que desconfía y al que no te conoce. Son justo los dos que frenan más anuncios. |
| **5** | ✅ | Cubre los **cinco escalones reales** del recorrido de decisión, sin repetir ninguno. Ni uno de menos ni uno de más. |
| 6 | ❌ | Seis ya son los agentes. Dos capas con el mismo número se confunden para siempre. |
| 8 / 11 / 12 | ❌ | El usuario no puede repetir 8 nombres de memoria, y el promedio de 11 lentes diluye la objeción: todos aprueban un poco y ninguna objeción es accionable. |

Y hay una razón de producto, no de diseño: **5 jueces × 5 opciones = 25 votos por ronda**, que es
exactamente la grilla que ya está construida en la pantalla. Con 5 se ve entero de un vistazo; con 11
no entra.

### 3.3 Un juez no es un votante suelto: es la cabeza de 100

Cada juez **tiene 100 agentes del público a cargo**. Su voto es el resumen de esos 100 y su `rationale`
es la voz del grupo. Cuando el usuario abre el detalle, ve los 100 votos individuales y la frase que
los sintetiza. Nada se inventa: el voto del juez es una agregación, no una opinión aparte.

---

## 4. Capa 3 — Los 500 del público

### 4.1 De dónde sale exactamente el 500

No es un número redondo elegido para impresionar. Sale de multiplicar tres dimensiones del público real:

```
  5 lentes (los 5 jueces)
× 4 estados con la marca
× 25 réplicas por combinación
= 500 agentes del público
```

Los **4 estados con la marca** son los que hacen que el público no sea un bloque:

| Estado | Quién es | Por qué cambia el voto |
|---|---|---|
| **Nunca te vio** | Frío total | Necesita entender qué vendés antes de juzgar cualquier otra cosa |
| **Te vio y no compró** | Tibio | Compara contra lo que ya vio y no lo convenció |
| **Te compró una vez** | Cliente | Ya te cree: le importa menos la prueba social y más la oferta |
| **Cliente frecuente** | Fiel | Castiga la pieza que canibaliza lo que ya le vendiste |

Las 25 réplicas de cada celda tienen un sesgo chico y fijo (más sensible al color, al precio, a la
duración del gancho, al tamaño del texto, a la prueba social). Ese sesgo se asigna con una semilla
derivada de `(pieza, lente, estado, réplica)`, así que **la misma pieza da siempre el mismo resultado**:
se puede auditar, repetir y defender.

### 4.2 Cómo se simulan (sin inventar nada)

Cada agente del público reacciona en dos pasos, **sin LLM libre**:

1. **Filtro duro determinista.** El mismo catálogo de chequeos medibles que usa la vigilancia del doc
   03 §4: ¿el texto tiene contraste suficiente para leerse al sol en un celular? ¿el gancho entra en
   los primeros 2 segundos? ¿dice el precio o lo esconde? ¿hay prueba social? ¿promete algo prohibido?
   ¿se parece demasiado a otra pieza del lote (pHash / similitud coseno)? Si no pasa, no puntúa: queda
   registrado como rechazo **con el motivo**.
2. **Puntaje 0–100 por atributos.** El agente cruza esos atributos medibles con su lente, su estado y
   su sesgo. No hay opinión libre: hay una función de cosas que se pueden medir en la pieza.

**Lo único que usa un modelo caro:** los 5 jueces escribiendo su frase y el feed de reacciones
(traducir los rechazos a lenguaje humano). Los 500 no son 500 conversaciones de IA — son 500
evaluaciones deterministas + 5 lecturas. **Eso es lo que hace que 500 cueste lo mismo que 5.**

> Y el feed que el usuario ve en pantalla tiene que salir de los votos reales: si rechaza el
> desconfiado, la línea que aparece es sobre la prueba social que falta. Hoy `CHAT_MOTOR`
> (`data/demo.ts`) elige frases al azar y eso viola el principio 2.3 del doc 03. Ver §8.

### 4.3 Por qué cientos y no 5

| Razón | Sin el público (5 votos) | Con los 500 |
|---|---|---|
| **Varianza** | No sabés si un 84 es parejo o es la mitad encantada y la mitad indignada | Sabés que al 89% le gustó, con 6% de rechazo duro |
| **Segmento** | Sabés que gusta, no **a quién** le gusta | Sabés que la rechazan tus clientes frecuentes → riesgo de canibalizar |
| **Confianza** | Un 84 sin confianza es un 84 | Sabés si es un 84 firme (votos parejos) o un 84 frágil (disperso) |
| **Robustez** | Cambiar una palabra mueve todo el resultado | El promedio aguanta y el score se vuelve comparable entre piezas |
| **Costo** | — | **Cero extra:** el público es determinista, así que 500 cuesta lo mismo que 5 |
| **Se ve** | Un contador | 500 personas mirando tu pieza es el vidrio del motor (doc 03 §11) |

La última fila es la que cierra la discusión: **pasar de 5 a 500 no cuesta plata, cuesta diseño.** Por
eso se hace.

---

## 5. La relación entre las tres capas (la pregunta del dueño)

**Pregunta:** *«¿los 5 guían a los cientos?»*

**Respuesta:** sí, pero guiar es **decidir qué miran**, no **decidir cómo votan**. El voto siempre sube
desde abajo. El criterio siempre baja desde arriba.

```
   BAJA EL CRITERIO  ↓
   los 6 convocan  →  los 5 definen la lente y las preguntas  →  los 500 miran eso y solo eso

   SUBE EL VOTO  ↑
   500 votos individuales  →  5 votos de juez (cada uno = sus 100)  →  1 score 0-100
```

Con las palabras del producto:

- **Los 6 no votan: producen y actúan.** Convocan el juicio.
- **Los 5 no crean y no cambian votos.** Son a la vez la **lente** (qué se mira, hacia abajo) y la
  **voz** (el porqué, hacia arriba). Si un juez pudiera corregir a sus 100, el número volvería a ser
  una opinión y MiroFish perdería lo único que lo hace valioso: que sea una **medición**.
- **Los 500 no debaten entre ellos ni hablan libremente: reaccionan** a propiedades medibles de la
  pieza, cada uno desde su lente y su relación con la marca.

Una consecuencia que conviene decir en voz alta porque es contraintuitiva: **el juez no es más
importante que los 500, es más legible.** El número sale de los 500; el juez es la interfaz entre ese
número y el usuario. Por eso el que manda en la matemática es el público y el que manda en la pantalla
es el juez.

**Y MiroFish es punto de paso obligatorio:** nada se publica y ningún peso se gasta sin veredicto.
Kai está bloqueado por el score — es un freno duro, no una sugerencia.

---

## 6. La matemática de la votación

### 6.1 Los tres pasos

```
Nivel 1 · 500 votos          cada agente del público puntúa la pieza de 0 a 100
                             (o la rechaza de entrada, con motivo)

Nivel 2 · 5 votos de juez    V(j) = promedio de los 100 agentes de ese juez
                             redondeado. El juez agrega la frase: por qué.

Nivel 3 · score de la pieza  Score = ( V1 + V2 + V3 + V4 + V5 ) / 5
                             redondeado. Es el número de 0 a 100.
```

**Regla de oro de la pantalla:** el score se calcula **de abajo hacia arriba** (500 → 5 → 1) y **el
número que se muestra siempre tiene que poder rehacerse a mano con los 5 votos que el usuario ve**.
Nada de ajustes invisibles: si hay un descuento (por parecido a otra pieza, por ejemplo), se muestra
como **una línea aparte**, nunca escondido dentro del 84.

### 6.2 El veredicto (absoluto)

Sobre el score de cada pieza, los mismos cortes que ya están en el código:

| Score | Veredicto | Qué pasa |
|---|---|---|
| **80–100** | `go` | Aprobada para publicar |
| **60–79** | `review` | Vuelve a Nia con la objeción del juez más duro (una variante) |
| **0–59** | `stop` | No se publica. No se gasta un peso. |

### 6.3 El ranking del 1 al 5 (relativo)

El lote se ordena por score, de mayor a menor. **Las 3 primeras pasan** (`CUANTAS_PASAN = 3`, ya está
en el código). Las otras 2 se guardan con sus votos, para saber exactamente qué les faltó.

**Regla que hay que hacer explícita en la interfaz:**

> **El puesto es relativo al lote. El veredicto es absoluto.**

Una pieza puede ser **la 1ª de un lote malo y no llegar al mínimo**: sale 1ª y igual queda en `review`.
Sin esta regla, un lote débil publica basura con el argumento de que «fue la mejor». Con la regla, la
pantalla dice *«la mejor de la ronda, pero no llega al mínimo: mirá lo que objetó el más duro»*.

**Desempate, en este orden:** (1) menor dispersión de votos — más parejo gana; (2) menor proporción de
rechazos duros; (3) el voto del juez más duro.

**Batch chico:** el ranking necesita lote. Con una sola pieza (el caso típico del camino manual) hay
score y veredicto, y no hay puesto. El 1 al 5 aparece cuando hay 2 o más piezas compitiendo.

### 6.4 Los otros dos números (los que evitan el «84 y listo»)

| Número | De dónde sale | Para qué sirve |
|---|---|---|
| **Sentimiento** del público | Cuántos de los 500 aprueban / dudan / rechazan | «El 89% la aprobó» |
| **Confianza** | Cuánto se dispersan los 500 votos | «84 firme» vs «84 frágil». Distingue la pieza sólida de la polémica |

Un score alto con confianza baja es una advertencia, no un permiso. Se muestran juntos o el número miente.

### 6.5 El veto de un juez (no resta puntos: frena)

Hay tres reglas duras que **no se promedian**. Si una se viola, la pieza **no se publica aunque saque 95**:

1. **Claim prohibido o riesgoso** (promesa de curar, resultado garantizado, cualquier cosa que Meta rechaza).
2. **Incoherencia con tu catálogo** (un precio, un envío o un producto que no coinciden con tus datos reales).
3. **Lo que tu marca nunca dice** (la lista que el usuario deja una vez en Cuenta).

El veto **no baja el score**, porque bajar el score sería mentir sobre lo que votó el público. El score
queda, el veredicto cambia a `stop`, y la pieza se marca como frenada por regla dura, con el motivo.

### 6.6 Sol y la recalibración (por qué el número no se congela)

Un público simulado que nunca aprende es decoración. El cierre del circuito es Sol: cuando una pieza
publicada mide de verdad, compara el score con el resultado real y **ajusta los pesos de las lentes**.
Si las piezas que el público puntuó 84 rindieron como un 60, los pesos se corrigen y la próxima ronda
predice mejor. Eso se muestra: *«predijo 84, pasó 79, corregí el modelo»* (ya está en `BITACORA`).
Sin esta capa, MiroFish sería una encuesta; con esta capa, es un modelo que mejora.

### 6.7 Ejemplo completo, con los números que ya están en el código

El lote real del serum (`data/mirofish.ts`), con los 5 votos de juez que ya existen:

| Puesto | Pieza | Impulsivo | Compara | Desconfiado | Experto | Nuevo | **Score** | Veredicto |
|---|---|---|---|---|---|---|---|---|
| 1º | El problema primero (video) | 92 | 78 | 74 | 88 | 84 | **83** | `go` |
| 2º | Antes y después real (carrusel) | 74 | 88 | 86 | 79 | 71 | **80** | `go` |
| 3º | El testimonio solo (imagen) | 66 | 74 | 92 | 81 | 78 | **78** | `review` ⚠️ |
| 4º | El precio sin vueltas (video) | 88 | 91 | 69 | 72 | 66 | **77** | `review` |
| 5º | La rutina de 3 pasos (reel) | 61 | 72 | 68 | 84 | 88 | **75** | `review` |

Lo que este ejemplo enseña, y por eso está acá:

- **Pasan 2, no 3.** La 3ª es la 3ª del lote pero sacó 78: se va a `review` en vez de publicarse. Es la
  regla de §6.3 funcionando.
- **Cada pieza tiene su escalón de caída.** La 1ª se cae en la confianza (74 del desconfiado). La 5ª se
  cae en los 3 segundos (61 del impulsivo).
- **La instrucción sale del cruce.** La imagen que el desconfiado premia con 92 es un testimonio.
  Cruzar el gancho de la 1ª con la prueba social de la 3ª da una pieza mejor que las dos: **16 créditos
  de variante** (§7) en lugar de 160 de ronda nueva. Esa es la feature.
- **La suma se puede rehacer a mano:** 92+78+74+88+84 = 416, /5 = 83,2 → **83**. Nada escondido.

---

## 7. Los dos caminos de carga

Existen exactamente **dos caminos**, y la diferencia es una sola: **quién escribe**.

### 7.1 Camino A — El motor trabaja

El usuario sube material (o nada) y dice qué quiere. De ahí en adelante trabaja Sinkroo. Adentro de
este camino hay dos variantes, y el usuario elige una:

| Variante | Qué hace el motor | Cuándo la quiere el usuario |
|---|---|---|
| **A1 · Mejorar lo mío** | Toma **tu** imagen o video, lo revisa contra los 8 criterios y produce **versiones mejoradas** | «Ya tengo la pieza. Quiero publicar algo parecido, pero mejor» |
| **A2 · Crear de cero** | Lux investiga el mercado, Nia escribe los prompts y arma un lote de 5 opciones distintas | «No tengo nada. Quiero opciones» |

**Regla de A1 que no se negocia: tu pieza original no se toca.** Las mejoras son piezas **nuevas**, y
**tu original entra al mismo lote y compite contra sus propias versiones mejoradas**. Así el usuario ve
si la mejora valió la pena, en vez de tener que creerle al motor. Si tu pieza gana, la publicás tal
como la subiste y no se gastó nada en crearla.

### 7.2 Camino B — 100% manual

El usuario **sube la imagen o el video y escribe él la descripción**: el gancho, el texto del anuncio y
el botón. **El sistema no crea, no reescribe y no sugiere texto.** Mira y puntúa.

Es el camino de quien ya sabe lo que quiere y solo viene a que le digan si funciona. Tiene que estar
**explícito en la interfaz**: *«Acá el motor no escribe nada. Subís tu pieza, escribís tu descripción y
MiroFish la evalúa. Si después querés que la mejore, eso es otra acción y se cobra aparte.»*

### 7.3 Lo que es idéntico en los dos (y hay que decirlo)

| | Camino A (el motor) | Camino B (100% manual) |
|---|---|---|
| ¿Pasa por MiroFish? | **Sí** | **Sí** |
| Quién la evalúa | Los 500 del público + los 5 jueces | **Los mismos** 500 y los mismos 5 |
| Cómo se evalúa | Mismos 8 criterios, mismos filtros duros | **Idéntico** |
| Score y veredicto | 0–100 con `go` / `review` / `stop` | **Idéntico** |
| Veto por regla dura | Sí | **Sí** |
| Se ordena del 1 al 5 | Si hay 2 o más piezas en el lote | **Igual** |
| Sale a publicar | Solo con `go` y con el OK del dial | **Igual** |
| Quién escribe la pieza | El motor | **Vos** |
| Costo | Se cobra crear **y** evaluar | **Solo se cobra evaluar** |

> **La frase que resume el modelo:** *haya escrito la pieza el motor o vos, el jurado es el mismo.* Lo
> que cambia es quién trabaja, no cómo se juzga. Si el camino manual se evaluara distinto, el sistema
> estaría midiendo el prestigio del que escribió, no la pieza.

Los dos caminos ya existen en la pantalla (paso 1 de Campañas: botón **Iniciar** vs botón **Ya tengo
todo listo**). Lo que falta está en §8.

---

## 8. Los costos en créditos

### 8.1 La regla

> **Se cobra por producir y por evaluar. Atender y mirar son gratis.**

- **Producir** (crear una pieza, un video, un prompt, una variante): se cobra. Consume modelos caros.
- **Evaluar** (MiroFish: los 500 + los 5 jueces): se cobra poco, porque el público es determinista.
- **Atender** (responder un cliente en WhatsApp con Rumi): **gratis, incluido en el plan.** Ya lo dice
  la vista Créditos (`Conversaciones · 0 · incluidas en tu plan`) y es la decisión correcta: cobrar por
  atender mata la adopción del canal que más vende. **Esto revierte el `respuesta de agente 2 cr` del
  doc 00 §5.3.**
- **Mirar** (abrir el score, los votos, el porqué de cada uno, la bitácora): **gratis, siempre.**
- **Vigilar** (nivel 1 del doc 03: chequeos deterministas cada 15 min): **gratis, siempre.** No usa LLM.

Las tres franjas del doc 03 §4 se cobran así: **nivel 1 gratis · nivel 2 por campaña activa · nivel 3
por pieza o ronda.**

### 8.2 La tarifa

**Producir (nivel 3)**

| Acción | Créditos | Qué incluye |
|---|---|---|
| **Ronda completa** (5 opciones) | **120** | Lux investiga el mercado + Nia escribe los prompts, las 5 piezas y los copys + el objetivo y el público de Rex. Un solo precio, sin sorpresas. |
| **Variante** (mejorar una pieza) | **16** | Rehace **una** pieza a partir de la objeción del juez. **Incluye la re-evaluación.** Es el precio que ya está en la vista Créditos. |
| Imagen generada (suelta) | 12 | Un solo asset, sin ronda |
| Video generado 12–18 s (suelto) | 60 | El asset más caro del sistema |
| Copy + gancho + botón de una pieza | 3 | Texto suelto |

**Evaluar (MiroFish)**

| Acción | Créditos | Por qué |
|---|---|---|
| **Los 500 del público** | **0** | Determinista. **No se cobra nunca.** Es la decisión que hace viable el modelo |
| **Los 5 jueces + el score** (por pieza) | **8** | Cinco lecturas cortas con IA que escriben el porqué |
| **Evaluar una ronda entera** (5 piezas) | **40** | 5 × 8 |
| **Evaluar una acción que mueve plata** (lanzar, subir presupuesto, mandar un link de pago) | **8** | No hay pieza que mirar: juzgan los 5 jueces, sin público |

**Analizar (nivel 2)**

| Acción | Créditos | Qué incluye |
|---|---|---|
| **Campaña activa** | **60 / mes** | Toda la vigilancia con IA y el informe de Sol sobre esa campaña. Es el precio que ya está en la vista |
| **Lectura de mercado** (Lux) | **10** | Una pasada: qué anuncios nuevos hay, qué cambió |
| **Informe profundo de rubro** | **40** | Los 50 anuncios del nicho y los 5 ángulos de mensaje (el análisis GAIA del doc 01) |

**Los precios insignia que el usuario tiene que poder recordar de memoria:**

```
  Una ronda completa  (5 opciones + juicio)  =  160 créditos
  Una variante        (mejorar una pieza)    =   16 créditos
  Evaluar una pieza tuya (camino manual)     =    8 créditos
  Atender, mirar y vigilar                   =    0 créditos
```

### 8.3 Qué es gratis, en una lista

1. **Vigilancia determinista** (nivel 1) — todos los chequeos de campaña, siempre.
2. **Los 500 agentes del público** — el volumen más grande del sistema no cuesta nada.
3. **Las conversaciones** — responder clientes por WhatsApp, incluido en el plan.
4. **Mirar todo** — score, votos, porqués, bitácora, informes ya generados, artefactos.
5. **Escribir el brief** — decirle al motor qué querés.
6. **La primera ronda de cada cuenta** — 1 sola vez, 120 créditos de regalo. Es la mejor demo del
   producto y cuesta menos que un experimento de adquisición.

### 8.4 Cuánto sale, en plata

El crédito vale **US$ 0,020 a US$ 0,030** según el paquete (los 4 paquetes de la vista: 500/$15,
1.000/$25, 1.760/$39 y 5.000/$99).

| | Créditos | En plata |
|---|---|---|
| Una ronda completa | 160 | US$ 3,2 – 4,8 |
| Una variante | 16 | US$ 0,32 – 0,48 |
| Evaluar una pieza tuya | 8 | US$ 0,16 – 0,24 |
| Un día de motor (el ritmo medido) | 150 | US$ 3,0 – 4,5 |
| Un mes de trabajo | 3.240 | US$ 65 – 97 |

**La autonomía se calcula con tu consumo real, no con un número fijo.** «Días de autonomía» = saldo ÷
consumo promedio de los últimos 7 días. Los 150/día de la vista son el ritmo **medido** de esta cuenta,
no una constante del sistema. Si el usuario sube el dial a Automático, su consumo sube y sus días bajan:
tiene que verlo antes, no después.

### 8.5 El mes de ejemplo, reconciliado con la vista Créditos

La vista Créditos ya dice: saldo 1.760, plan de 5.000, **3.240 usados este mes**, 150 por día. Hoy el
desglose de la tarjeta «En qué se van» **suma 316 y no cierra con los 3.240**. Con la tarifa de §8.2, sí
cierra:

| Qué | Cómo se compone | Créditos |
|---|---|---|
| **Campañas activas** | 3 campañas × 60/mes | **180** |
| **Creación del motor** | 10 rondas × 120 + 25 variantes × 16 | **1.600** |
| **Evaluación en MiroFish** | 10 rondas × 40 + 20 piezas tuyas × 8 | **560** |
| **Análisis de mercado** | 5 informes profundos × 40 + 70 lecturas × 10 | **900** |
| **Conversaciones** | incluidas en el plan | **0** |
| **Total del mes** | 3.240 ÷ 21,6 días = **150 por día** ✔ | **3.240** |

Y de ahí sale todo lo demás, sin números sueltos:
`1.760 ÷ 150 = 12 días de autonomía` ✔ · `1.760 cr = paquete Pro de US$39` ✔ ·
`1760 / 39 → 1 crédito ≈ US$ 0,022` ✔

### 8.6 Cómo se cobra (para que no haya sorpresas)

- **El precio se muestra antes de ejecutar.** El botón dice cuánto va a costar, no solo qué va a hacer.
  Ej.: `Iniciar · 160 créditos` / `Mandarlas a MiroFish · 40 créditos`.
- **Reserva previa** (doc 00 §5.3): se reserva el costo antes de la acción cara; si falla, se libera
  entero. Nunca se cobra por un fallo.
- **Sin saldo, no arranca.** El motor no empieza una acción cara sin saldo y se frena solo al llegar a
  cero, con `CREDITS_INSUFFICIENT` como error tipado para ofrecer la recarga en el momento.
- **Libro de doble entrada** y cada movimiento trazable a la acción que lo generó (ya está prometido en
  la vista: *«si ves un consumo que no reconocés, abrí la bitácora y mirá qué lo generó»*).
- **Auto-recarga:** hoy dispara al bajar de 500 créditos, que son **3,3 días de autonomía**. Con 4–5
  días de margen el usuario evita quedarse sin motor un fin de semana: **recomiendo subir el umbral a
  750 créditos** (5 días al ritmo medido).

### 8.7 Inconsistencias del código que este modelo deja al descubierto

| Dónde | Qué dice hoy | Qué tiene que decir |
|---|---|---|
| `views/Creditos.tsx` → `CONSUMO` | Suma **316** y la vista muestra **3.240 usados** | El desglose de §8.5, que suma 3.240 |
| `views/Creditos.tsx` → nota | «10 por informe profundo» | «40 el informe profundo · 10 la lectura» |
| `views/Creditos.tsx` → nota | «16 por pieza con video» | «16 por variante, con la re-evaluación incluida» |
| `views/Campanas.tsx` | «31 piezas puntuadas · 18 aprobadas · 13 frenadas» | Saliendo del lote real: **70 piezas** evaluadas (50 del motor + 20 tuyas). 31 no es múltiplo de un lote de 5 |
| `views/Hoy.tsx` | «el promedio del panel de 5 expertos» | «el promedio de las 500 personas del público, resumido en 5 jueces» |
| `data/demo.ts` | `1 de 5 vendedores dudó` | `1 de 5 jueces dudó` |

---

## 9. Qué cambia en la interfaz (pantalla por pantalla, sin código)

1. **Campañas · paso 1 — los dos caminos.** Los dos botones ya existen, pero tienen que decir qué
   hacen y cuánto cuestan: `Iniciar · 160 cr (5 opciones + juicio)` y `Ya tengo todo listo · 8 cr por
   pieza`. En el camino del motor, elegir **mejorar lo mío** o **crear de cero**, con la aclaración de
   que la pieza original compite sin modificarse. En el camino manual, **agregar el bloque de
   descripción obligatorio de la pieza** (gancho, texto, botón) — hoy `IngestaManual` solo deja subir
   archivos: sin descripción no hay camino manual completo. Y la frase explícita: *«acá el motor no
   escribe nada, solo evalúa»*.

2. **Campañas · paso 2 — MiroFish.** El título de la sección dice hoy `5 perfiles` y tiene que decir
   **`5 jueces + 500 del público`**. Una línea que explique la jerarquía en criollo: *«500 personas del
   público miran tu pieza. Los 5 jueces agrupan sus votos y te dicen por qué.»* El bloque «el motor
   andando» (`MotorEnVivo`) sale de «mercado secundario predictivo» y pasa a **«el público
   reaccionando»**: cada reacción con su lente, su estado con la marca y el motivo — trazable, nunca
   una frase al azar. Y el costo de la corrida a la vista, con el sentimiento y la confianza.

3. **Campañas · paso 3 — la galería.** El score se explica: **«83 = promedio de las 500 personas»**,
   con los 5 votos de juez desglosados y expandibles a los 100 votos de cada uno. El ranking tiene que
   mostrar la regla de §6.3 en algún lado: *«el puesto es del lote; el veredicto es absoluto»*. Y el
   botón de la objeción más útil: cruzar el ganador con la prueba social del que premió al más
   desconfiado → **«hacer una variante · 16 cr»**.

4. **Campañas · paso 5 — el panel de la última pieza.** `El panel de expertos · 5 perfiles` pasa a
   **`Los 5 jueces de MiroFish`**, con **los 5 jueces canónicos** de §3.1 (hoy la tarjeta usa los
   `votantes` de `demo.ts`, que son el equipo disfrazado: hay que reemplazarlos) y con *«el juez más
   duro te puso 74: falta prueba social»* como instrucción, no como número.

5. **Hoy (Tu día).** «La calidad de tus piezas» y el botón de las decisiones dicen «panel de 5
   expertos» → **«los 5 jueces»** + el detalle del público. Las decisiones que mueven plata (lanzar,
   subir presupuesto, mandar un link de pago) muestran el voto de **los 5 jueces** (8 cr), sin público:
   no hay pieza que mirar.

6. **Créditos.** El desglose «en qué se van» con las 5 filas de §8.5 que suman 3.240, las notas de
   precio unitario corregidas, y la línea más importante de la pantalla: **«los 500 agentes del
   público no consumen créditos»**. Más el precio por ronda/variante/evaluación, y los días de
   autonomía calculados con el consumo real de los últimos 7 días.

7. **Cuenta y autonomía.** Aclarar que el dial **no cambia precios, cambia frecuencia**: Automático
   gasta más por mes porque trabaja más veces, no porque cada acción cueste más. Y que el umbral de
   auto-recarga son días de motor (500 cr = 3,3 días).

8. **Vocabulario transversal.** Los textos comerciales, la bitácora, los toasts y los emails usan
   **solo** las palabras de §1. Cada aparición de `bot`, `observador`, `perfil`, `experto`,
   `inteligencia` o `vendedor` es un bug de lenguaje.

---

## 10. Resumen para aprobar

1. **Tres capas, tres números: 6 · 5 · 500.** Se acabaron las 12 inteligencias, los 11 expertos, los 5
   perfiles, los bots y los 500 observadores como entidades distintas.
2. **Los 6 producen y actúan; no votan.** Los 5 jueces definen la lente y firman el voto de sus 100.
   Los 500 reaccionan y **son los que producen el número**.
3. **Los 5 guían, pero guiar es decidir qué se mira, no cómo se vota.** El criterio baja, el voto sube.
   Si un juez pudiera corregir a sus 100, MiroFish dejaría de medir.
4. **El 500 sale de 5 lentes × 4 estados con la marca × 25 réplicas** — no es un número de marketing.
5. **Score 0–100 = promedio de los 500, agregado en 5 votos de juez.** Se puede rehacer a mano con los
   5 números que la pantalla muestra.
6. **El puesto es relativo al lote; el veredicto es absoluto.** Una pieza puede ser la 1ª y no publicarse.
7. **Dos caminos, un jurado.** El motor crea o mejora; o el usuario sube y escribe él. **Los dos pasan
   por MiroFish y se evalúan igual.**
8. **Se cobra por producir y evaluar; atender y mirar son gratis.** Ronda 160 · variante 16 · evaluar una
   pieza tuya 8 · los 500 del público 0 · conversaciones 0.
9. **El desglose del mes cierra en 3.240** y con él los días de autonomía, el paquete Pro y el precio de
   un día de motor. Lo que hoy no cierra en `Creditos.tsx` es un bug de la vista, no del modelo.
10. **Sin trazabilidad no vale.** Cada voto del público sale de un atributo medible de la pieza, el
    score se muestra con su confianza, y los vetos no esconden puntos: frenan.

---

## 11. Decisiones que quedan abiertas (cortas)

1. **¿La primera ronda gratis (120 cr) se ofrece a todas las cuentas nuevas o solo a las que llegan por
   referido?** Recomiendo todas: es la demo que vende el producto.
2. **¿El umbral de auto-recarga sube de 500 a 750 créditos** (5 días de motor en lugar de 3,3)?
3. **¿El detalle de los 100 votos por juez se muestra siempre o solo cuando la confianza es baja?**
   Recomiendo solo con confianza baja: con confianza alta alcanza el resumen y no queremos volver a
   llenar la pantalla de telemetría.

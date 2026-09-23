# Sinkroo — Simplificación del modelo

**Versión:** 1.0 · **Fecha:** 2026-09-23
**Objetivo:** hacer el producto radicalmente más simple para el usuario, sin perder lo que lo hace único.
**Método:** medir la fricción real en el código, no opinar sobre impresiones.

---

## 0. El diagnóstico en un número

Medí la superficie de fricción del dashboard. Lo que encontré:

| Superficie | Hoy |
|---|---|
| Casillas a llenar en los formularios de ingesta (15 tipos de campaña) | **218** |
| Campos únicos definidos | **64** |
| Veces que cada campo se repite en distintos tipos | **3.4x** |
| Tipos de campaña | **15** |
| Vistas en la barra lateral | **12** |
| **Bloques funcionales** dentro de "Inteligencia Predictiva" | **12** |
| Integraciones externas propuestas | **11** |
| Taxonomías distintas para "qué tipo de negocio sos" | **3** |
| Pasos del onboarding | **7** |

**La lectura:** Sinkroo tiene hoy la forma de un producto que quiere *impresionar* en vez de un
producto que quiere *ser usado*. 218 casillas y 12 vistas es la clase de complejidad que se
diseña pensando "todo lo que podríamos hacer" — y que hace que el usuario real cierre la pestaña
en el segundo formulario.

**El síntoma más claro:** el onboarding pide fotos de producto, descripción, precios, diferencial
y tono. Y después, al crear **cada campaña**, los vuelve a pedir. El logo se pide en **14 de los
15 tipos de campaña**. No es que el usuario tenga que hacer trabajo: es que lo hace **3,4 veces**.

**La prueba del usuario:** si María Paula —dueña de una tienda de skincare, el caso que el propio
dashboard modela— abre la app 30 segundos en el celular, la respuesta correcta es:

> *"Hoy vendiste 47. Tu campaña va bien. Hay 3 conversaciones esperándote.
> Aprobá estas 2 piezas y seguimos."*

Hoy recibiría: 12 módulos, 7 pantallas antes de entrar, y un panel que le dice que su stack está
"subutilizado" porque no conectó 6 herramientas.

---

## 1. LO QUE SALE

### 1.1 La ingesta por tipo de campaña — **218 casillas → 0**

El bloque `INGESTA_CAMPANA` define campos distintos para cada uno de los 15 tipos de campaña.
Sumado: **218 casillas**, sobre **64 campos únicos** que se repiten 3,4 veces.

**Qué se hace en su lugar:** una **biblioteca de material del negocio**. El material pertenece al
negocio, no a cada campaña.

```
Antes:  crear campaña  →  llenar 14.5 campos  (y el logo por 14ª vez)
Ahora:  crear campaña  →  elegir de tu biblioteca  →  listo
                        (+ opcional: "agregar algo nuevo solo para esta")
```

**Por qué está bien sacarlo:** no elimina capacidad, elimina **repetición**. Todo lo que el
sistema necesita sigue existiendo — se pide una vez y se reutiliza. Y arquitectónicamente es más
correcto: los assets son del negocio (con su propio ciclo de vida), no de la campaña.

### 1.2 Diez de los quince tipos de campaña

| Tipo | Veredicto | Por qué |
|---|---|---|
| `reventa` | ❌ sale de Campañas | No es una campaña: es una **automatización** de WhatsApp |
| `recuperacion` | ❌ sale de Campañas | Idem: es un flujo que corre solo |
| `lealtad` | ❌ sale de Campañas | Idem: programa recurrente, no campaña |
| `referidos` | ❌ sale de Campañas | Es una función de cuenta (ya tiene su propia vista) |
| `upsell` | ❌ se fusiona | Es reventa con otro producto |
| `seguidores` | ❌ se fusiona | Es "ventas" con otro KPI |
| `trafico` | ❌ se fusiona | Es "ventas" con otro destino |
| `leads` | ❌ se fusiona | Es "ventas" con otro destino |
| `lanzamientoMarca` | ❌ se fusiona | Es "marca" con fecha |
| `temporada` | ❌ sale | Es una **etiqueta de calendario**, no un tipo |

**Quedan 5: `Ventas` · `Mensajes (WhatsApp)` · `Marca` · `Retargeting` · `Lanzamiento`.**

**La distinción que ordena todo:** *una campaña tiene presupuesto y fecha de fin. Una
automatización corre para siempre.* Mezclarlas obliga al usuario a elegir entre 15 puertas cuando
en realidad son dos habitaciones.

**Dónde van las 4 que salen:** a **Conversaciones**, que ya tiene el editor de flujos más maduro
del dashboard (pasos con delay, condiciones, pausar). Es su lugar natural y refuerza una vista
que hoy está subutilizada.

### 1.3 Los 6 agentes con nombre y toda su parafernalia

Sale del producto: los nombres (Lux, Rex, Nia, Kai, Sol, Rumi), el "mapa de agentes" con % de
carga, el "historial de 5 tareas por agente", la "tormenta colectiva", los "votos emitidos hoy",
las "12 inteligencias", los "500 observadores", la "votación del momento".

**Por qué está bien sacarlo:** al usuario no le importa *cómo* trabaja el sistema. Le importa
**su resultado**. Un panel que muestra 6 personas ficticias trabajando con 82% de carga es
infraestructura de la IA expuesta como producto: le pide al usuario entender el mecanismo para
confiar en el resultado.

**Qué se queda:** el resultado, en lenguaje humano. *"Analicé 50 anuncios de tu nicho. Tu
audiencia responde mejor al ángulo de resultado, no al de precio. Estas 3 piezas lo usan."*

> **Nota:** los nombres son un activo de marca ("tu equipo de marketing autónomo"). Se pueden
> conservar en el marketing y en la landing, y sacarlos de la interfaz operativa. Es una decisión
> de identidad, no de UX — ver §5.

### 1.4 "Inteligencia Predictiva" como vista propia — **12 bloques → 0**

Es la vista más grande del dashboard (1.090 líneas, el 22% de todo el front). Contiene: mapa de
agentes, historial, tormenta colectiva, evaluación con 12 votos, opciones de imagen, opciones de
video, el podio + guion del Reel, mercado secundario predictivo, simulación MiroFish, análisis de
ángulos GAIA, diferenciación pHash, y un panel de créditos.

**Qué se hace en su lugar:** la pre-validación **se disuelve donde el usuario decide**.
- El **score y el veredicto** van dentro de **Campañas**, en el momento de aprobar una pieza.
- Los **créditos** van a **Cuenta**.
- Las **"opciones de imagen/video"** son simplemente las variantes de una creatividad, dentro de
  Campañas. No necesitan una vista que las explique.

**Por qué está bien sacarlo:** la pregunta del usuario es una sola — *"¿esto va a funcionar antes
de que lo publique?"*. Una respuesta de una línea. No requiere 12 bloques ni una vista dedicada.

### 1.5 Las duplicaciones (features que existen dos veces)

| Feature | Dónde está duplicado | Se queda en |
|---|---|---|
| Bandeja de conversaciones + chat | Dashboard **y** WhatsApp | **Conversaciones** |
| "Qué está haciendo la IA" (6 agentes en vivo) | Dashboard **y** Predictiva | **Hoy** (una sola vez) |
| Créditos | Dashboard, Predictiva, sidebar **y** vista Créditos | **Cuenta** |
| Datos de competencia / tendencias / hallazgos IA | Mercado **y** Estrategia | **Mercado** |
| Campañas activas | Dashboard **y** Campañas | **Campañas** (en Hoy solo el resumen) |

**Por qué está bien sacarlo:** cada duplicación es una pregunta que el usuario se hace dos veces
("¿esto es lo mismo que vi allá?") y dos lugares que mantener sincronizados. Cinco duplicaciones
menos es una app que se siente coherente.

### 1.6 Google Maps en v1 — **la dependencia más caras del plan**

Sale. La competencia real se obtiene de la **Meta Ad Library API**: oficial, gratuita, sin API
key, sin cuenta de Google Cloud, sin billing, sin scraping.

**Qué se elimina de un saque:** Google Cloud + billing habilitado, Places API (con costo por
llamada), Geocoding, el mapa de calor, las coordenadas por ciudad, y los competidores por
`dlat`/`dlng` hardcodeados.

**Por qué está bien sacarlo:** el mapa es la parte más vistosa y la menos accionable. Saber que
hay 4 competidores en un radio de 2,9 km no cambia ninguna decisión del usuario. Saber **qué
anuncios están corriendo y con qué mensaje** sí — y eso viene gratis y oficial de Meta.

### 1.7 Los 7 pasos del onboarding → 3

| Hoy | Qué pasa |
|---|---|
| 1. Bienvenida | Se conserva el mensaje, se elimina el paso |
| 2. Tu negocio (nombre, rubro, fotos) | → **Paso 1** |
| 3. Modelo de negocio (qué vendés, modelo, precio, **margen**, frecuencia, dolor) | Se parte |
| 4. Tus productos | → **Paso 2** |
| 5. Tu historia (4 textos libres + subir documentos) | Se parte |
| 6. Presupuesto | Se elimina del onboarding |
| 7. Conexión de canales (5 canales) | → **Paso 3** (solo WhatsApp) |

**Qué sale específicamente y por qué:**
- **`margen de ganancia`** — el emprendedor no lo sabe. Preguntarlo temprano genera abandono y da
  un dato inventado. Se **infiere** de precios y costos cuando existan, o se pregunta mucho
  después, cuando ya hay valor entregado.
- **`frecuencia de compra`** y **`dolor principal`** — se infieren de las conversaciones y las
  ventas reales. El sistema tiene los datos; preguntarlos es tercerizar trabajo al usuario.
- **Subir documentos (PDF/Word/Excel) → "la IA lo lee y extrae todo"** — es un pipeline completo
  de parseo y OCR (y de ahí en adelante, una fuente de errores) para un beneficio marginal cuando
  ya se pide el pitch en texto. **Fuera de v1.**
- **Presupuesto** — no es un dato de alta, es una decisión de campaña. Se pregunta al crear la
  primera campaña, donde el usuario ya entiende por qué se lo preguntan.
- **4 de los 5 canales** — pedir "conectá tus 5 canales" antes de mostrar valor es el error
  clásico. Se conecta **uno** (el que más valor da), y los demás aparecen cuando el sistema
  realmente los necesita.

**Resultado: 3 pasos.**
```
1. Tu negocio      →  nombre, rubro, qué vendés
2. Tu oferta       →  un producto, sus fotos, precio, y qué te hace distinto
3. Tu WhatsApp     →  conectá y ya
```
Ese es el mínimo con el que la IA puede trabajar. Todo lo demás es **just-in-time**.

### 1.8 La culpa en Herramientas

Sale: *"Tu stack está subutilizado: con 2 de 6 conectadas, dejás de recuperar carritos..."*,
los "% de uso", *"Concentración de tráfico: riesgo a diversificar"*, y la lista de 6 herramientas
como deber pendiente.

**Por qué está bien sacarlo:** un producto que reta al usuario por no haber hecho algo que no
entendía es un producto que se abandona. Además está mal el orden: no se conecta Klaviyo porque
alguien te avisó, se conecta cuando **el sistema te muestra que estás perdiendo carritos**.

**Qué se hace en su lugar:** no mostrar un catálogo. Mostrar **una** propuesta contextual en el
momento exacto: *"Detecté 12 carritos abandonados este mes. Conectá tu email y los recupero."*

### 1.9 Las tres taxonomías → una

| Dónde | Cuántas |
|---|---|
| Back (`schema.ts`): `Industry` | 21 industrias |
| Back (`schema.ts`): `Category` | 15 categorías |
| Onboarding (dashboard): `CATEGORIAS` | 12 categorías |
| Tipos de campaña | 15 |

Son cuatro listas para decir "qué tipo de negocio sos", con criterios distintos y solapados.
**Se queda una:** las 12 del onboarding, que son las que el usuario ya vio y entiende.

### 1.10 Complejidad de facturación (a decidir)

3 planes **+** 4 paquetes de crédito **+** auto-recarga **+** facturas **+** referidos
multinivel. Para v1 sobra la mitad. **Recomendación:** 3 planes + auto-recarga. Los paquetes
sueltos se agregan cuando haya datos de que la gente los pide.

---

## 2. LO QUE SE QUEDA (y por qué es bueno)

### 2.1 La pre-validación pre-gasto ⭐
**Es el producto.** "No lances y veas: te digo si va a funcionar antes de que gastes." El score
0-100 con veredicto `go / review / rework` es simple, es entendible, y es defendible. Todo lo demás
es decorado alrededor de esta idea. **No se toca.**

### 2.2 El modo demo determinista ⭐
**Es el activo de ingeniería más valioso que tienen hoy** y probablemente no está valorado como
tal. El `LocalProvider` y el `HeuristicEvaluator` hacen que el sistema funcione **sin una sola
credencial**. Eso permite:
- que la app nunca se vea vacía ni rota (el problema #1 de todo SaaS en su primer día);
- vender una demo que funciona sin pedir tokens;
- migrar vista por vista a datos reales sin romper nada.

**Se queda, se refuerza y se hace explícito** con `source: "demo" | "live" | "simulated"`.

### 2.3 La capa BYO por capacidades ⭐
Es el **habilitador de la simplicidad**: permite agregar o sacar proveedores sin tocar el core.
Un usuario que solo quiere WhatsApp no debería ver un catálogo de 11 integraciones — y con esta
capa, no lo ve: el sistema simplemente pide la capacidad que necesita y resuelve con lo que haya.

### 2.4 El agente conversacional de WhatsApp ⭐
Es lo más concreto, lo más medible y lo que llega más rápido a valor real. "Un vendedor que
responde en 0,8 segundos y no duerme" es una promesa que el usuario entiende sin explicación.
**Es por acá donde hay que llegar primero a producción.**

### 2.5 El flujo campaña: crear → pre-validar → lanzar → medir → recalibrar
El ciclo está bien pensado y es la razón de ser del enjambre y del `performance-analyst`. Se
mantiene entero.

### 2.6 El motor de enjambre con veredicto
N agentes votan 0-100, se agrega ponderado, sale un veredicto. Es **simple y potente a la vez** —
elegante. Se queda tal cual, sin exponerle al usuario la mecánica de votos.

### 2.7 La promesa del onboarding
*"No necesitás saber de marketing. Sinkroo lo hace todo por vos."* El mensaje está **muy bien**.
El problema nunca fue el mensaje: fueron los 7 formularios que venían después.

### 2.8 El design system
Dark, morado, premium, coherente, 12 vistas sin una costura visible. Es un activo real y no hay
que tocarlo en esta simplificación.

### 2.9 El editor de flujos de Conversaciones
Es el componente más maduro del dashboard (pasos con delay, condiciones, pausar, editar). **Se
refuerza**: recibe las 4 automatizaciones que sacamos de Campañas. Pasa de estar escondido a ser
el centro de una de las 5 secciones.

### 2.10 Multi-marca (Sinkroo Agency, 8 marcas)
Diferenciador real de negocio. Se queda, pero en fase tardía — no en el camino crítico.

### 2.11 Los 4 KPIs del Dashboard principal
Ventas hoy, ROAS, score, alcance. Es exactamente lo que el usuario quiere ver al abrir. **Se
queda como núcleo de "Hoy".**

---

## 3. El modelo simplificado

### Barra lateral: 12 → 5

| Antes (12) | Después (5) | Absorbe |
|---|---|---|
| Dashboard + Predictiva + parte de WhatsApp | **Hoy** | KPIs, agentes trabajando, qué hacer hoy |
| Campañas + Creatividades + pre-validación | **Campañas** | crear, validar, lanzar, medir |
| WhatsApp + inbox del Dashboard + reventa/recuperación/lealtad/referidos | **Conversaciones** | bandeja + automatizaciones |
| Mercado + Estrategia | **Mercado** | competencia real, tendencias, qué hacer |
| Config + Herramientas + Créditos + Referidos + KYC | **Cuenta** | todo lo administrativo |

### Y el paso que importa más que la fusión: **no mostrar las 5 desde el día 1**

Un usuario nuevo ve **`Hoy`** y **`Campañas`**. Nada más.
`Conversaciones` aparece cuando conecta WhatsApp. `Mercado` cuando hay campaña corriendo.
`Cuenta` existe desde el principio pero no ocupa espacio.

**Por qué:** 5 secciones siguen siendo mucho para alguien que abre la app por primera vez. La
simplicidad no está en fusionar vistas, está en **no mostrar lo que todavía no sirve**.

### El antes / después

| | Antes | Después | Reducción |
|---|---|---|---|
| Vistas visibles al inicio | 12 | 2 | **−83%** |
| Pasos del onboarding | 7 | 3 | −57% |
| Campos del onboarding | ~20 | ~6 | **−70%** |
| Casillas de ingesta (15 tipos) | 218 | 0 (biblioteca) | **−100%** |
| Tipos de campaña | 15 | 5 | −67% |
| Bloques en Predictiva | 12 | 0 (disuelto) | −100% |
| Taxonomías de negocio | 3 | 1 | −67% |
| Integraciones a la vista | 6 (con culpa) | 1 contextual | −83% |
| Dependencias externas críticas | Google Maps + 10 más | WhatsApp + Meta | — |

---

## 4. Lo que NO hay que simplificar

Tentación a evitar: **sacar profundidad del motor para simplificar la interfaz.** El enjambre,
la predicción, la calibración, los 6 agentes — todo eso puede quedarse entero. La simplificación
es de **exposición**, no de capacidad.

La regla: **complejidad hacia adentro, simplicidad hacia afuera.** El usuario ve una respuesta de
una línea; detrás hay 6 agentes y 11 dimensiones. Eso es bueno. Lo que está mal hoy es que el
usuario *ve* los 6 agentes y los 11 votos.

---

## 5. Decisiones que necesito

1. **Los nombres de los agentes** (Lux, Rex, Nia, Kai, Sol, Rumi): ¿salen de la interfaz y se
   quedan solo en el marketing, o los querés visibles como identidad del producto?
   *Mi recomendación: fuera de la interfaz operativa, dentro de la marca.*
2. **Los 4 paquetes de crédito sueltos**: ¿salen de v1? *Recomiendo sí.*
3. **Google Maps**: ¿confirmás sacarlo de v1 y usar Meta Ad Library para competencia?
   *Recomiendo sí — elimina la dependencia más caras y el mapa no cambia ninguna decisión.*
4. **Subir documentos en el onboarding**: ¿sale de v1? *Recomiendo sí.*
5. **El mapa de calor** como feature "wow" de marketing: si querés conservarlo **solo visual** en
   la landing (una imagen), se puede — sin la integración viva detrás.

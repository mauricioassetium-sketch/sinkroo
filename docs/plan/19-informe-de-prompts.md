# 19 · Informe: la cadena de prompts, quién le habla a cada modelo y con qué orden

Escrito a pedido del dueño: «*definitivamente el problema es el prompt que se le da al sistema, no está bien
configurado… revisá qué sistemas están usando ese prompt generado, cómo se le están dando las órdenes a los
modelos de generación*».

Todo lo que sigue está sacado del código y de lo que quedó guardado de corridas reales: no es teoría.

---

## 1. La cadena completa, de punta a punta

```
material del negocio (web, archivos, descripción que escribió el dueño)
    │
    ├─► VERA (lee el negocio)                    → qué hace, a quién le vende, en qué idioma
    ├─► LUX (lee el mercado)                     → avisos reales, el hueco que nadie llena, el ángulo
    ├─► REX (demanda y precios) / KAI / SOL / RUMI / NOVA / IRIS / TINO
    │
    ▼
NIA — escribe el copy         [escritor.ts · escribirLaPieza · DeepSeek]
    │  devuelve: título, gancho, 4-6 líneas, cierre
    ▼
PENSHOT — desglosa el guion en planos   [planos.ts → servicio local 8077 · DeepSeek]
    │  ADENTRO suyo hay 6 agentes con SUS PROPIOS prompts:
    │  script_parser → shot_segmenter → video_splitter → prompt_converter → quality_auditor → continuity_guardian
    │  devuelve por plano: prompt (inglés), prompt_negativo, duración, audio
    ▼
escenaEnIngles — traduce la escena     [escritor.ts · DeepSeek]
    ▼
FLUX.1-dev — pinta la foto             [imagenes.ts · conLaGpuAlquilada → ComfyUI 8188]
    ▼
Wan 2.1 I2V — anima la foto            [video-animado.ts · animarFoto → ComfyUI 8189]
    ▼
edge-tts — la voz + ffmpeg — subtítulos   [video-animado.ts · armarPieza]
```

**Quién manda en el prompt visual (hoy):** el texto que llega al motor de imagen es una mezcla de **tres
manos distintas**, y ahí está el problema de fondo:

| mano | qué aporta | dónde |
|---|---|---|
| PenShot (`prompt_converter`) | la escena y el estilo | servicio `story-shot-agent` |
| nuestro traductor (`escenaEnIngles`) | la escena **en inglés** | `escritor.ts` |
| el motor (`promptDeImagen`) | el oficio fotográfico, la luz, la paleta, el formato | `prompts-por-motor.ts` |

---

## 2. La orden exacta que recibe cada modelo

### 2.1 Nia — el copy (`escritor.ts → elEncargo`)

Lo que se le pide, textual: escribir el copy de UNA pieza; frases cortas con punto; una idea por frase; 4-6
líneas si es video («**cada línea es una escena del video: tiene que poder verse algo distinto en cada
una**»); nada de cifras, promesas ni «el mejor»; se le habla al cliente de usted.
Reglas del sistema: «*Es un redactor publicitario que escribe anuncios cortos y concretos para negocios
reales. Devuelve sólo JSON.*»

### 2.2 PenShot — los planos (adentro del servicio `story-shot-agent`)

Sus prompts están en `src/penshot/neopen/prompts/v1.x/en/*.yaml`, con DeepSeek (`deepseek-chat`) como modelo.

- **`shot_segmenter_prompt.yaml`** (corta el guion en planos) — bueno: «*world-class storyboard/shot
  designer… descripciones visuales concretas y vivas, incluyendo **composición, iluminación, ambiente**,
  estado del personaje*» + duraciones por tipo de plano.
- **`prompt_converter_prompt.yaml`** (escribe el prompt final de cada plano) — **acá está el techo**:
  - «*Avoid highly technical jargon; keep prompts accessible and model-friendly*»
  - «*Keep prompts concise and avoid overly long or complex sentences*»
  - «*Prefer concrete visual elements over abstract concepts*»
  - Largo recomendado: **{min_length}-{max_length} palabras** (20-200 en la configuración).
  - Sus requisitos de "video prompt" son de **continuidad** (diálogo literal, colores de ropa, props):
    **no hay una sola regla sobre cámara, óptica, movimiento, luz o etalonaje**.
- **`shot_config.py`**: fragmentos de 1 a 5 s, se corta arriba de 5,5 s, prompt de 20-200 palabras.

**Conclusión de esta parte:** ese motor está diseñado para **no cambiar entre planos** (continuidad para
Sora/Veo/Kling), no para dirigir fotografía. Pedirle "cine con especificación en profundidad" va **contra su
propia orden**: por eso devuelve «cinematic lighting» y poco más.

### 2.3 Nuestro traductor (`escritor.ts → escenaEnIngles`)

Regla del sistema, textual: «*You turn a Spanish description of a real photo scene into ONE line of plain
English for an image generator. Describe only what is visible: who does what, where, with which objects. No
selling words, no quality words, **no camera talk**, no text in the image, no brands, no logos…*»

### 2.4 El motor de imagen (`prompts-por-motor.ts → promptDeImagen` + `imagenes.ts`)

- FLUX: una frase en inglés, en positivo, con el oficio fotográfico (`shot on a full-frame camera with a 50mm
  lens at f/2.0…`), la paleta y el formato. **Sin negativo** (es de guía destilada: cfg 1).
- SDXL: etiquetas separadas por comas + un negativo de 241 caracteres, y **el sujeto primero**.
- El grafo de ComfyUI: `KSampler` (pasos y cfg según el modelo), `EmptyLatentImage`, `FluxGuidance` para el
  dev, `VAEDecode`, `SaveImage`.

### 2.5 El motor de video (`video-animado.ts`)

- Grafo Wan 2.1 I2V: 20 pasos, cfg 5, shift 5, unipc, ruido de arranque 0,05, LoRA destilado en 0.
- **El texto que recibe es el del plano** (la descripción de la foto), o sea una escena quieta: el movimiento
  solo entra si el plano lo nombró de casualidad («camera slowly pans»).

### 2.6 La voz y los subtítulos

- La voz la elige `vozSegunCaso` por **tono + lengua de la pieza** (inglés institucional → `en-GB-RyanNeural`;
  español → voces colombianas), a ritmo -8% (`ritmoParaEdge`).
- Los subtítulos salen del **mismo texto que lee la voz**, repartidos por la duración real del audio.

---

## 3. La evidencia dura: el prompt real de la última corrida

**El guion que escribió Nia** (pieza «El hueco que nadie está midiendo…»):

> Usted ya sabe que sus activos del mundo real no se verifican igual en todas partes. / El problema no es la
> tokenizacion. / El problema es que no hay una forma común de verificar el grado de soberanía de cada
> activo. / Sin esa verificación, la trazabilidad se rompe y la custodia de activos queda en duda. / Con
> verificación de grado soberano, los gemelos digitales y los contratos inteligentes operan sobre una base
> confiable. / Escriba por WhatsApp

**El plano que escribió PenShot** para eso (1 de 7):

> «*vertical 9:16 full shot, real-life interior space, afternoon natural light, slightly worn tabletop,
> casually placed everyday objects, no staged arrangement, **no people present**, quiet and authentic
> atmosphere, camera slowly pans horizontally…*»

**El prompt que llegó al motor de imagen** (sacado de la pieza, `generacion.prompt_visual`):

> «*editorial commercial photograph, vertical 9:16 framing, subject slightly off-centre, **showing a desk
> surface and wall textures in an everyday room**, lit by afternoon sunlight through a side window, **with no
> people**, in a real workplace, in use, with everyday objects around, … **clean tidy surfaces, clear
> uncluttered background, plain unbranded containers and plain packaging, empty walls**»*

Resultado: una mesa con frascos. El dueño tenía razón y ahora se ve por qué, paso por paso.

---

## 4. Los siete hallazgos

| # | hallazgo | evidencia | estado |
|---|---|---|---|
| 1 | **El traductor borra la especificación de cámara.** `escenaEnIngles` tiene la orden «no camera talk» y el plano es justamente donde vive la cámara. | Probado: de 412 caracteres con «medium shot, golden hour side light, fine grain, Kodak 2383» quedan 298 **sin ninguna palabra de cámara**. | **PENDIENTE** (el hallazgo más grande) |
| 2 | **El motor de planos aplana a propósito**: «evitá la jerga técnica», «sé conciso», 20-200 palabras, y sus requisitos son de continuidad, no de fotografía. | `prompt_converter_prompt.yaml` (textual arriba) | **PENDIENTE** — decisión: o se le cambia su prompt, o el motor deja de pedirle el prompt visual y solo le pide los planos |
| 3 | **El prompt de imagen se cortaba a 300 caracteres** y el oficio genérico iba delante de la escena. | `promptDeImagen`: `.slice(0, 300)`; el genérico `editorial commercial photograph…` iba primero | **MEDIO**: ya puse la escena primero y saqué el genérico; **el corte de 300 sigue** |
| 4 | **La línea «paredes vacías / envases lisos / fondo despejado» vaciaba la foto.** Era mi truco contra las letras inventadas. | Está en el prompt real de arriba | **ARREGLADO** (hoy) |
| 5 | **El guion es abstracto y sin sujeto visible**: «soberanía», «trazabilidad», «gemelos digitales». Ninguna línea exige algo que se pueda filmar. | El guion real de arriba | **PENDIENTE** — es la raíz: si el guion no tiene sujeto, el plano no puede tenerlo |
| 6 | **El motor de video recibe la descripción de la foto, no el movimiento.** | `agentes.ts` le pasa `escenaIngles` como prompt positivo | **PENDIENTE** |
| 7 | **Los negativos de FLUX son letra muerta** (guía destilada, cfg 1): todo lo que no se quiere hay que pedirlo en positivo. | `NECESIDADES['imagen-flux']` y la muestra de cfg 3,5 quemada | **ARREGLADO** (hoy, documentado) |
| 9 | **La dirección de fotografía la improvisaba el motor de planos, plano por plano.** Su instrucción es de continuidad, no de cine (ver hallazgo 2), así que en la misma pieza convivían «natural overcast» y «Kodak 2383», la óptica cambiaba sin criterio y la luz no tenía que ver con la línea del guion. | Corrida seca: los seis prompts traían «cinematic, sunny morning, Fujifilm ETERNA grading, natural overcast, 35mm lens, static camera, motion blur 0.3, frame rate 24». PenShot **ignoró** la orden de no escribir estética. | **ARREGLADO**: el motor decide el cine de toda la pieza (`cineDeLaPieza`) y lo que el plano diga de luz/óptica/acabado se descarta (`soloVariablesDuras`). Verificado: general 24mm hora dorada → medio 35mm → medio corto 85mm luz pareja → medio → general 24mm hora azul → primer plano 85mm, **un solo etalonaje (ETERNA) en los seis**, cero restos de la estética de PenShot |
| 8 | **El motor de planos devuelve muchos más planos de los que entran y NO obedece al número que se le pide.** Y el nuestro se quedaba con los primeros: las últimas líneas del guion se quedaban sin imagen. | Medido tres veces con el mismo guion: **15 planos / 47,68 s**, **12 / 39,5 s** y **8 / 24,15 s** para una pieza de 30 s. El motor usa 6 (≈20 s). Al pedirle «devolvé exactamente 6», devolvió 12: **no lo respeta**. | **ARREGLADO de nuestro lado**: los planos se toman **repartidos** a lo largo del guion (no los primeros) y los que no entran quedan guardados con la pieza |

---

## 5. Qué propongo, en orden

1. **Un solo dueño del prompt visual: el motor.** Que PenShot siga cortando el guion en planos (duración,
  sujeto, continuidad: eso lo hace bien) pero que **el prompt de imagen y de video lo escriba nuestro motor**
  con una orden de dirección de fotografía de verdad (tamaño de plano, óptica, movimiento, luz, hora,
  etalonaje, textura). Es la única forma de que la especificación no se pierda en dos traducciones.
2. **El traductor debe traducir, no recortar**: cambiar su orden a «conservá los términos de cámara, luz y
  composición: son parte de la escena» y subir el corte de 300 caracteres.
3. **El guion necesita sujeto visible**: agregar a la orden de Nia una regla dura — *cada línea tiene que
  poder filmarse con alguien haciendo algo concreto* — y declarar en la pieza cuando no se pudo.
4. **Al motor de video, el movimiento explícito**: un campo propio (qué se mueve, qué hace la cámara) escrito
  por el mismo paso que escribe el prompt visual.
5. **Medir antes de gastar**: un comando de prueba que escriba el guion + los planos + los prompts **sin
  encender la GPU**, para revisar el texto de punta a punta antes de pagar una sola hora de máquina.

Los cinco puntos son de texto: no gastan GPU hasta que el texto esté bien.

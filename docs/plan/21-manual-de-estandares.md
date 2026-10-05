# 21 · Manual de estándares de ingeniería de prompts y orquestación audiovisual

Este es el estándar del proyecto, y **así está el sistema contra él** (todo comprobado con el protocolo de
validación en seco, sin encender la GPU). Cada norma dice dónde vive y qué la sostiene.

## Módulo 1 · Principios

| Principio | Estado | Dónde vive |
|---|---|---|
| **Separación estricta de responsabilidades** — los modelos de texto piensan y escriben; el motor de planos estructura; los motores generativos ejecutan lo que el núcleo decide | ✓ | `escritor.ts` (texto), `planos.ts`→PenShot (estructura), `prompts-por-motor.ts` (la decisión), `imagenes.ts`/`video-animado.ts` (ejecución) |
| **Cero ambigüedad conceptual** — cada línea con representación física filmable | ✓ | `tangibilidad.ts` + la regla 4 del encargo de Nia + la reparación automática |
| **Control centralizado de la estética** — la dirección de fotografía no se delega | ✓ | `cineDeLaPieza()`: un etalonaje por pieza, ópticas y tamaños que rotan, luz que avanza |
| **Validación pre-ejecución obligatoria (modo seco)** | ✓ | `pruebas/validar-en-seco.ts` — cuatro controles y veredicto APTO / NO APTO |

## Módulo 2 · Las cinco capas

| Capa | Norma | Estado | Dónde |
|---|---|---|---|
| 1 · Copy (Nia) | Frases cortas, una idea, 4-6 líneas, usted, sin promesas vacías, **cada línea filmable**, y que entre en 30 s (~330 caracteres) | ✓ | `escritor.ts` → `elEncargo`, reglas 1 a 8 |
| 2 · Planos (PenShot) | Sólo variables duras (quién hace qué, dónde, con qué, duración ≤5 s). **No** decide luz, óptica, cámara ni etalonaje | ✓ | `entradaDePlanos()` pide sólo eso; `soloVariablesDuras()` descarta lo demás |
| 3 · Traducción | Sin «no camera talk»; conserva cada término de cámara, luz y encuadre; sin cortes a 300 caracteres | ✓ | `escritor.escenaEnIngles` (términos conservados, corte en 900) |
| 4 · Imagen (FLUX.1-dev) | Cero negativos (guía destilada); todo en positivo; **un etalonaje maestro** por pieza; óptica por tamaño de plano (24 mm general, 35 mm medio, 85 mm primer plano) | ✓ | `promptDeImagen()` + `cineDeLaPieza()` |
| 5 · Video (Wan 2.1 I2V) | Campo de movimiento independiente de la foto; vectores de animación y de cámara explícitos | ✓ | `textoDeMovimiento()` (recibe el movimiento del motor y reserva su lugar antes de recortar) |

## Módulo 3 · Protocolo de validación en seco

`npx tsx pruebas/validar-en-seco.ts "<guion>" [tono] [lengua] [zona]` — y decide APTO o NO APTO.

| Control | Qué comprueba | Estado |
|---|---|---|
| 1 · Integridad del guion | Que cada línea nombre una acción o un lugar real (el botón no se revisa: no es una escena) | ✓ |
| 2 · Coherencia de planos | Que la cantidad y las duraciones entren en la pieza y que la fila cubra a la voz (la normalización de tiempos frente a los bloques de audio) | ✓ |
| 3 · Limpieza estética | Que los 6 prompts traigan los descriptores del motor, que la óptica corresponda a cada tamaño de plano, que haya **un solo etalonaje** y **ni un resto** de la estética del motor de planos | ✓ |
| 4 · Validez de las estructuras | Que el cuerpo que se manda al 8077 sea JSON válido y que de su respuesta se lean los 4 campos que el motor usa | ✓ |

## El recorrido de una pieza que cumplió todo (medido)

```
guion (Nia, con tangibilidad y reparación)      → 5 líneas, todas filmables
planos (PenShot)                                → 11 devueltos; el motor usa 6 repartidos
traducción                                      → conserva los términos de cámara
imagen (FLUX dev)                               → general 24mm · medio 35mm · medio corto 85mm · medio · general 24mm · primer plano 85mm
etalonaje                                       → uno solo: Fujifilm ETERNA
luz                                             → hora dorada → luz pareja → hora azul
video (Wan)                                     → 6 de 6 planos piden movimiento real
voz (edge-tts)                                  → 26,5 s; las tomas fijas se estiran para cubrirla
veredicto                                       → APTO PARA GASTAR GPU
```

## Los dos defectos que el protocolo destapó y quedaron arreglados

1. **La pieza se cortaba al tramo más corto.** Las tomas fijas duraban 3 s y el corte final usaba `-shortest`:
   con una voz de 26,5 s y 17 s de imagen, **se perdía el final de la voz**. Ahora el largo de cada toma fija
   se calcula para que la fila dure exactamente lo que dura la voz.
2. **El guion no entraba en la pieza.** Nia escribía 430 caracteres para una pieza de 30 s (33 s de voz). El
   encargo ahora declara el presupuesto de tiempo, y el protocolo lo controla antes de gastar GPU.

## Lo que queda (decisión del dueño)

- **Publicar la pieza de prueba** en la GPU con el estándar ya cumplido, para verlo con los ojos.
- **Borrar `promptDePieza`** (`prompts.ts`): no lo usa nadie, es ruido puro.

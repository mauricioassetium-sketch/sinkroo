# 18 · El motor de video: los planos animados

## Por qué existe

El dueño vio el primer video y lo dijo sin vueltas: «*el video es una mierda… no imágenes con zoom que ni
siquiera representan lo que dice el texto*». Tenía razón en las dos partes:

1. **Lo que se veía no hablaba de la frase.** Los planos que se le pedían a PenShot decían «lugar real, en
   uso, **sin gente posando**» y «**no agregues personas**». Resultado: una mesa con frascos en un cuarto
   con luz de tarde, en una pieza sobre soberanía de activos. Arreglado en
   `prompts-por-motor.ts → entradaDePlanos` (la especificación de cámara está ahí).
2. **No había movimiento.** El video era un pase de fotos fijas con zoom y paneo (Ken Burns) encima.

Este documento es la segunda mitad: de dónde sale el movimiento.

## Cómo se genera ahora

```
plano (PenShot) → foto (FLUX.1-dev en la GPU) → ANIMACIÓN (Wan 2.1 I2V) → fila de clips
                                                                          ↓
                          voz (edge-tts, en la lengua de la pieza) + subtítulos (ffmpeg) → pieza final
```

- **El motor de video** es un ComfyUI aparte (`/workspace/ComfyUI-video`, puerto 8189) en la misma GPU
  alquilada que pinta las imágenes. Los dos comparten la tarjeta: **antes de cambiar de tarea, el motor que
  termina suelta su memoria** (`POST /free`), o el que arranca se queda sin VRAM y falla el muestreo (pasó:
  el de imágenes tenía 28 GB de los 40 y el de video murió a los 10 GB).
- **La configuración** (en `apps/api/src/services/video-animado.ts → grafo`): 480×832, `num_frames` 4n+1,
  20 pasos, `cfg 5.0`, `shift 5.0`, `scheduler unipc`, `noise_aug_strength 0.05` y **el LoRA destilado
  apagado** (fuerza 0).
- **Por qué esa y no la del talking-head**: con el LoRA destilado y 6 pasos (cfg 1) el clip queda **pegado a
  la foto** —medido: los cinco fotogramas son la misma imagen—. Se ve movimiento de verdad con 20 pasos y
  guía real. El precio es el tiempo: 100 s la versión quieta contra ~9-10 minutos la que se mueve.
- **El texto de cada plano tiene que pedir MOVIMIENTO**, no describir la escena quieta: «*el operario camina
  hacia adelante, la mirada recorriendo las filas, la cámara lo acompaña de costado*». Los planos de PenShot
  ya traen el movimiento de cámara en su descripción.

## Tiempos y costo

| | valor |
|---|---|
| un plano de 5 s | ~9-10 minutos de GPU |
| una pieza de 30 s (6 planos) | ~1 hora de GPU ≈ **$0,56** |
| el armado (voz + subtítulos + fila) | ~1 minuto en el servidor (sin GPU) |

**Todos los planos se animan** (decisión del dueño: «para todo»). El tope `VIDEO_PLANOS_MAX` existe solo
para pruebas cortas; por defecto son 6, que es el máximo de una pieza de 30 s.

## El armado (`armarPieza`)

- **La voz la elige el motor** según el tono del negocio **y la lengua de la pieza** (`vozSegunCaso`): un
  negocio que vende en inglés no puede sonar doblado. Para inglés institucional usa `en-GB-RyanNeural`; para
  español, las voces colombianas de siempre.
- **Los subtítulos** salen del **mismo texto que lee la voz** (`guionParaLaVoz` + `textoParaLaVoz`),
  repartidos por el tiempo real del audio y quemados con ffmpeg.
- **La salida** es 1080×1920 (o el formato de la pieza: 1:1 y 16:9 también), con la voz en AAC.
- Dos trampas de formato que dejaban la pieza **muda en silencio**: el ritmo que guarda el motor («0.92») no
  es el que pide Edge TTS («-8%», `ritmoParaEdge`), y ese valor, suelto en la línea de comandos, empieza con
  guion y la herramienta lo lee como una opción más (va pegado: `--rate=-8%`).

## Los límites, dichos sin maquillar

1. **Objetos chicos en la mano se caen**: un escáner, un teléfono, una llave se agrandan, cambian de forma y
   desaparecen al animarse. Por eso los planos no se apoyan en ellos (regla en `entradaDePlanos`).
2. **Las letras del lugar salen inventadas y encima se deforman** (contenedores con códigos, carteles,
   placas). Esas letras vienen ya pintadas en la foto y FLUX no tiene negativo que las prohíba. Se esquivan
   eligiendo lugares de superficies limpias.
3. **Un primer plano de manos manipulando un aparato** es lo que peor resuelve cualquier generador: los
   dedos se funden con el objeto. Los planos van a cuerpo entero.
4. **480×832 es la resolución del clip**: la pieza final se reescala a 1080×1920 y se nota suave. Subir la
   resolución del video multiplica el tiempo de GPU.

## Dónde está cada cosa

- **El motor**: `apps/api/src/services/video-animado.ts` — `motorDeVideo`, `hayMotorDeVideo`, `animarFoto`
  (sube la foto, manda el grafo, espera y baja el clip), `armarPieza` (voz + subtítulos + fila).
- **El enganche**: `apps/api/src/services/agentes.ts` — los planos se anotan al pintarse y se animan en
  segundo plano (la corrida no espera); el montaje viejo (fotos en fila) queda solo como respaldo cuando no
  hay motor de video.
- **El entorno**: `IMAGENES_API_URL`/`IMAGENES_MODELO` (imágenes) y `VIDEO_API_URL`/`VIDEO_MODELO`/
  `VIDEO_PLANOS_MAX` (video), en el env del servicio.
- **La GPU**: `sinkroo-gpu encender [intentos]` / `sinkroo-gpu apagar` (ver `17-gpu-alquilada-y-apagado.md`).
- **La página del motor de video (Wan)**: `comfyui-wan-infinitetalk-talking-head` en las habilidades, con la
  sección del I2V y las trampas de las dos ComfyUI en una sola tarjeta.

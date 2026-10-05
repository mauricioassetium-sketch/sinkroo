# 17 · La GPU alquilada: el comando del sistema y su apagado

**Estado**: hecho y en el servidor (`/usr/local/bin/sinkroo-gpu`).
**Fecha**: 30 de septiembre de 2026.

## Por qué existe

El motor pinta las imágenes de las piezas con un **modelo pago**, y el modelo gratis quedó apagado por decisión
del dueño («no uses el modelo gratis para las imágenes: usa el modelo pago así no hay errores ni detenciones»).
El camino pago hoy es la **GPU alquilada por hora** (Vast.ai): una A100 con SDXL y FLUX.1-schnell en su disco.

Ese camino tiene una consecuencia que hay que decir sin adornos: **con la máquina apagada el motor NO pinta**. La
pieza sale igual —con fondo liso y el motivo escrito en su ficha—, pero sin foto. Encenderla era una receta de
cuatro pasos a mano (pedir la máquina, esperar, levantar ComfyUI, abrir el túnel) y en esa receta se pierde
tiempo y, peor, se dejan máquinas encendidas facturando.

## El comando

```
sinkroo-gpu encender [intentos]   # arranca la máquina, levanta ComfyUI y abre el túnel del motor
sinkroo-gpu apagar                # la apaga y cierra el túnel (SIEMPRE al terminar el lote)
sinkroo-gpu estado                # qué está encendido, cuánto se gasta y con qué modelo pinta
```

- `encender` **insiste sola** cuando el anfitrión no tiene GPU libre (`Required resources are currently
  unavailable`): la capacidad va y viene, y esperar a que se libere era lo que se hacía a mano. Por defecto 3
  intentos, cinco minutos entre uno y otro; `sinkroo-gpu encender 6` = media hora de paciencia. Pedirla no se
  cobra: el reloj arranca cuando la máquina **arranca**.
- Si algo falla en el camino (SSH, ComfyUI, el túnel), el comando **apaga la máquina antes de salir**: no se
  queda nada facturando sola por un fallo a mitad de camino.
- `estado` es el que se mira antes de generar y después de terminar: dice el estado, el coste por hora, el
  crédito y si el motor está viendo la GPU (la misma dirección que usa el back).
- La dirección SSH **se lee de nuevo en cada encendido** (Vast la reasigna) y el túnel se abre en
  `127.0.0.1:18188`, que es lo que el back tiene en `IMAGENES_API_URL`.

## Lo que se cobra (para no decidir a ciegas)

- **GPU**: $0,564/h en la A100 mientras está encendida.
- **Disco**: ~$0,43/día por los 120 GB donde viven SDXL y FLUX — **se cobra aunque la máquina esté apagada**,
  mientras la instancia exista.
- Medido en esta sesión: un lote de verificación (encender, pintar, apagar) costó entre **$0,05 y $0,10**; la
  sesión completa de trabajo de un día (35 min de máquina, dos modelos bajados, ~20 imágenes) costó **$0,34**.

## PENDIENTE — del dueño, para el panel de administración

> «Recuerda agregar un apagado manual cuando construyamos el dashboard de admin.»

**Apagado manual de la GPU en el panel de administración.** Es el único gasto del sistema que sigue corriendo si
alguien se olvida, así que el panel tiene que poder:

1. **Ver el estado** de la máquina (encendida / apagada / en cola), desde cuándo está encendida y el gasto
   acumulado de esa sesión.
2. **Apagarla de un botón** (`sinkroo-gpu apagar` por debajo), con confirmación y con la respuesta de qué quedó
   apagado.
3. **Avisar**: si la máquina lleva encendida más de X horas sin trabajo (o sin que nadie haya generado nada), un
   aviso al dueño — es exactamente el olvido que cuesta plata.

El comando ya deja el camino listo: el panel no tiene que hablar con Vast ni con SSH, solo ejecutar el mismo
comando del sistema y leer lo que devuelve.

## Otra cosa que hay que arreglar (no es de este bloque, pero se descubre acá)

El back toma su entorno de `/root/.hermes/cache/scratch/sinkroo-back.env` (`EnvironmentFile` del servicio
`sinkroo-api`). Esa carpeta es de **trabajo temporal y se limpia sola**: si se limpia, el back se queda sin
`DATABASE_URL`. Lo correcto es moverlo a `/etc/sinkroo/api.env` (solo root) y apuntar la unidad ahí.

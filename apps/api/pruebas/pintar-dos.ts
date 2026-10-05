import { generarImagen, motorDeImagenEnUso } from '/root/work/sinkroo-a/apps/api/src/services/imagenes.js';
import { promptDeImagen } from '/root/work/sinkroo-a/apps/api/src/services/prompts-por-motor.js';
const escenas = [
  { nombre: 'control', queHace: 'medium shot, cinematic, cool white light mixed with blue screen glow, interior verification control room, walls covered with surveillance screens showing maps and abstract data panels without readable text, a female auditor in a dark suit jacket and white shirt wearing an ID badge standing at the console, back turned to the screens, warm desk lamp in the foreground, shallow depth of field, fine grain, teal and orange grade' },
  { nombre: 'antena', queHace: 'wide shot, overcast gray daylight, outdoor communication base station on open ground, tall metal antenna tower with weathered surface, dishes and cables, scattered low shrubs and gravel, a lone engineer in a light gray work jacket and white hard hat walking toward the tower from the left of the frame, distant clouds, muted palette, fine grain, Kodak 2383 grade' },
];
const elegido = motorDeImagenEnUso();
const motor = (elegido as unknown as { motor: ReturnType<typeof motorDeImagenEnUso>['motor'] }).motor ?? elegido;
for (const e of escenas) {
  const visual = promptDeImagen(motor, { queHace: e.queHace, formato: 'video vertical 9:16', lugar: 'Dubái, Emiratos Árabes Unidos (DIFC)' });
  const img = await generarImagen({ businessId: 'prueba-video', piezaId: `plano-${e.nombre}`, formato: 'video vertical 9:16', prompt: visual.prompt, negativo: visual.negativo, semilla: 8181 });
  console.log(e.nombre, img ? `OK ${img.archivo}` : 'FALLÓ');
}

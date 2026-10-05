// Pinta las fotos de los planos nuevos con el camino real del motor, listas para animar con Wan.
import { generarImagen, motorDeImagenEnUso } from '../src/services/imagenes.js';
import { promptDeImagen } from '../src/services/prompts-por-motor.js';

// Los dos planos que salieron del motor con el material real de Verysset (obra, topógrafo, puerto).
const escenas: Array<{ nombre: string; queHace: string; negativo: string }> = [
  {
    nombre: 'topografo',
    queHace: 'medium shot, cinematic lighting, golden hour side light, a surveyor standing behind a theodolite on a dusty access road, both hands resting on the instrument, right hand slowly turning the eyepiece knob, high-visibility vest and scratched helmet, a concrete tower under construction with scaffolding rising behind him, warm orange light through floating dust, shallow depth of field, fine grain, Kodak 2383 grade',
    negativo: 'blurry hands, text, watermark, logo, cartoon style, modern clean equipment, no dust, smiling, blue holograms, floating icons',
  },
  {
    nombre: 'puerto',
    queHace: 'medium shot, cinematic, blue hour, a port operator in a dirty yellow reflective vest, scratched white safety helmet, thick work gloves, walking between stacked shipping containers holding a ruggedized handheld scanner with abstract graphics and no readable text, rust and wear marks on the containers, wet concrete reflecting the sky, distant harbor cranes, shallow depth of field, fine grain, teal and orange grade',
    negativo: 'blurry, text on screen, readable words, watermark, logo, cartoon style, clean vest, no helmet, bright sunny, blue holograms',
  },
];

const elegido = motorDeImagenEnUso();
const motor = (elegido as unknown as { motor: typeof elegido }).motor ?? elegido;
console.log('motor:', JSON.stringify(elegido));

for (const e of escenas) {
  const visual = promptDeImagen(motor, { queHace: e.queHace, formato: 'video vertical 9:16', lugar: 'Dubái, Emiratos Árabes Unidos (DIFC)' });
  console.log(`\n${e.nombre} · prompt:`, visual.prompt.slice(0, 150));
  const img = await generarImagen({
    businessId: 'prueba-video', piezaId: `plano-${e.nombre}`, formato: 'video vertical 9:16',
    prompt: visual.prompt, negativo: [visual.negativo, e.negativo].filter(Boolean).join(', '), semilla: 4242,
  });
  console.log(img ? `OK · ${img.archivo} · ${img.peso} bytes · ${img.fuente}` : 'FALLÓ');
}

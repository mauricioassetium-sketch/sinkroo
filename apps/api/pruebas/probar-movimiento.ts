// Comprueba el texto de video de un plano real, con el vector de acción (sin GPU).
import { movimientoDeLaEscena } from '../src/services/escritor.js';
import { textoDeMovimiento, cineDeLaPieza } from '../src/services/prompts-por-motor.js';

const escenas = [
  'worker wearing an orange reflective vest, hard hat, standing center dock, holding a white paper log folder, signing a document, stacked shipping containers, static., natural',
  'warehouse entrance with half-open metal door, male inspector wearing dark work jacket, reflective safety vest, safety helmet, standing in front of warehouse door, holding black tablet, scanning',
];
for (const [i, e] of escenas.entries()) {
  const cine = cineDeLaPieza({ tono: 'Profesional y formal', n: i + 1, total: 6 });
  const accion = await movimientoDeLaEscena(e, cine.movimiento);
  const t = textoDeMovimiento(e, cine.movimiento, accion ?? undefined);
  console.log(`\n=== PLANO ${i + 1} (${cine.movimiento.split(',')[0]}) ===`);
  console.log('acción que escribió el modelo:', accion ?? '(no respondió)');
  console.log('TEXTO FINAL AL MOTOR DE VIDEO:'); console.log(t.prompt);
  const malo = ['static', 'no camera movement', 'locked-off'].filter(x => t.prompt.toLowerCase().includes(x));
  console.log('¿quedó algo que congela el clip?', malo.length ? malo.join(', ') + ' ✗' : 'nada ✓');
}

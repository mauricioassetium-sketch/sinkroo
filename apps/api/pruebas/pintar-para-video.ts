// Pinta UNA foto con el camino real del motor (su prompt por motor) usando el plano nuevo de PenShot.
// Es la mitad del experimento: la foto que después se anima con Wan.
import { generarImagen, motorDeImagenEnUso } from '../src/services/imagenes.js';
import { promptDeImagen } from '../src/services/prompts-por-motor.js';

const prompt = 'close-up shot, morning sunlight filtering through venetian blinds casting soft striped shadows on light wood desk, blurred background showing modern open-plan office, male professional in dark navy business casual attire holding dark gray tablet with abstract data visualization graphics on screen, fingers lightly touching screen to verify information, focused expression';
const negativo = 'blurry hands, text on screen, readable words, brand logo, cartoon style, distorted fingers';

const motor = motorDeImagenEnUso();
console.log('motor:', JSON.stringify(motor));
const visual = promptDeImagen(motor, {
  queHace: prompt, formato: 'video vertical 9:16', lugar: 'Medellín',
});
console.log('prompt que se manda:', visual.prompt.slice(0, 200));
console.log('negativo:', String(visual.negativo).slice(0, 120));

const img = await generarImagen({
  businessId: 'prueba-video', piezaId: 'prueba-video-1', formato: 'video vertical 9:16',
  prompt: visual.prompt, negativo: [visual.negativo, negativo].filter(Boolean).join(', '), semilla: 777,
});
console.log(img ? `OK · ${img.archivo} · ${img.peso} bytes · ${img.fuente}` : 'FALLÓ');

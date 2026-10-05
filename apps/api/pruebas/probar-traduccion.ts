// La prueba del traductor: qué le queda a la escena después de pasar por `escenaEnIngles`.
import { escenaEnIngles } from '../src/services/escritor.js';
const plano = 'medium shot, cinematic lighting, golden hour side light, a surveyor standing behind a theodolite on a dusty access road, both hands resting on the instrument, right hand slowly turning the eyepiece knob, high-visibility vest and scratched helmet, a concrete tower under construction with scaffolding rising behind him, warm orange light through floating dust, shallow depth of field, fine grain, Kodak 2383 grade';
console.log('LO QUE ESCRIBE EL PLANO:', plano.length, 'caracteres\n');
console.log(plano);
const en = await escenaEnIngles(plano);
console.log('\nLO QUE LE LLEGA AL MOTOR DE IMAGEN:', String(en).length, 'caracteres\n');
console.log(en);

import { hayMotorDeVideo, motorDeVideo } from '../src/services/video-animado.js';
import { motorDeImagenEnUso } from '../src/services/imagenes.js';
console.log('imágenes:', JSON.stringify(motorDeImagenEnUso()));
console.log('video:', JSON.stringify(motorDeVideo()), '· disponible:', hayMotorDeVideo());

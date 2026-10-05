// UNA IMAGEN, POR EL MISMO CAMINO DEL MOTOR (`generarImagen` con el entorno real del back).
// Es la prueba de que el túnel que abre `sinkroo-gpu` sirve para PINTAR, no solo para consultar el estado.
import { generarImagen, motivoDelUltimoFalloDeImagen, motorDeImagenEnUso } from '../src/services/imagenes.js';

console.log('motor:', JSON.stringify(motorDeImagenEnUso()));

const t0 = Date.now();
const img = await generarImagen({
  businessId: 'prueba-del-tunel',
  piezaId: 'prueba-del-tunel-1',
  formato: 'video',
  prompt: 'a photo of a groomer washing a small dog in a stainless steel tub, editorial commercial photograph, vertical 9:16 framing, warm natural window light',
  negativo: 'text, letters, logo, watermark, deformed hands',
  semilla: 424242,
});

console.log('segundos:', ((Date.now() - t0) / 1000).toFixed(1));
if (img) {
  console.log('OK · archivo:', img.archivo);
  console.log('     fuente:', img.fuente);
  console.log('     medida:', img.ancho + 'x' + img.alto, '·', img.peso, 'bytes · semilla', img.semilla);
} else {
  console.log('FALLÓ:', motivoDelUltimoFalloDeImagen());
}

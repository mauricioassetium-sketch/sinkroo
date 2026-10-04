// ¿Qué está conectado en el motor ahora mismo? Imágenes, videos y con qué proveedor.
// Sirve como foto rápida antes de una corrida: si algo está desconectado a propósito, se ve acá.
import { motorDeImagenEnUso, proveedoresDeImagenes, hayProveedorDeImagenes } from '../src/services/imagenes.js';
import { motorDeVideo, hayMotorDeVideo } from '../src/services/video-animado.js';

const img = motorDeImagenEnUso();
const vid = motorDeVideo();
console.log('IMÁGENES:', hayProveedorDeImagenes() ? `conectadas · ${img.proveedor}` : `DESCONECTADAS · ${img.proveedor}`);
console.log('  detalle:', JSON.stringify(proveedoresDeImagenes()));
console.log('VIDEOS  :', hayMotorDeVideo() ? `conectados · ${vid.proveedor}` : `DESCONECTADOS · ${vid.proveedor}`);
console.log('  modelo :', vid.modelo);
process.exit(0);

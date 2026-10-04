// Qué motor de imagen está pintando el motor del producto, y con qué proveedor.
// Sirve para comprobar, en una línea, que el camino pago (FLUX en la GPU) es el que está puesto: si el
// archivo de entorno pierde `IMAGENES_MODELO`, esto dice «sdxl» y hay que arreglarlo antes de gastar GPU.
import { motorDeImagenEnUso, proveedoresDeImagenes } from '../src/services/imagenes.js';

console.log('motor en uso:', JSON.stringify(motorDeImagenEnUso(), null, 0));
console.log('proveedores :', JSON.stringify(proveedoresDeImagenes(), null, 0));
process.exit(0);

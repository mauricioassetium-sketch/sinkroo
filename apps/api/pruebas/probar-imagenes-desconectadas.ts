// ¿Qué hace el motor cuando le piden una imagen con las imágenes desconectadas?
// Tiene que decirlo en el momento (y no intentar contra la GPU ni esperar cinco minutos por un fallo anunciado).
import { generarImagen, motivoDelUltimoFalloDeImagen, hayProveedorDeImagenes, motorDeImagenEnUso } from '../src/services/imagenes.js';

console.log('¿hay proveedor?', hayProveedorDeImagenes());
console.log('motor:', JSON.stringify(motorDeImagenEnUso()));
const t0 = Date.now();
const r = await generarImagen({ prompt: 'a concierge opening a door in a luxury hotel lobby', formato: 'video vertical 9:16' });
console.log('imagen:', r ? `${r.length} bytes` : 'ninguna');
console.log('motivo :', motivoDelUltimoFalloDeImagen());
console.log('tardó  :', Date.now() - t0, 'ms');
process.exit(0);


import { sePuedeFilmar, lineasInfilmables } from '../src/services/tangibilidad.js';
const lineas = [
  'Un hombre sostiene un pasaporte junto a una ventana con vistas a una ciudad.',
  'Su historia verificable queda custodiada con un score de confianza.',
  'Un conserje recibe a un cliente en el lobby del hotel y le entrega una tarjeta llave.',
  'La soberanía y la trazabilidad del activo digital.',
  'Un helicóptero despega de la plataforma y vuela hacia la costa.',
];
for (const l of lineas) console.log(`${sePuedeFilmar(l) ? '✓ filmable  ' : '✗ INFILMABLE'} · ${l}`);
console.log('\ninfilmables del guion de prueba:', JSON.stringify(lineasInfilmables(lineas.join('\n'))));
process.exit(0);

import { paisesDeLaZona, zonaDeLugares } from '../src/lib/paises.js';
const casos = ['Dubai, Emiratos Árabes Unidos', 'Dubái, Emiratos Árabes Unidos', 'Cali, Colombia', 'Medellín', 'Madrid, España', 'Bogotá, CO', 'Ciudad de México, México'];
for (const z of casos) console.log(`  ${z.padEnd(34)} → país: ${JSON.stringify(paisesDeLaZona(z))}`);
console.log('\n  lo que deduce del material:');
for (const l of [['Dubai'], ['Dubai', 'Singapur'], ['Ciudad de México'], []]) console.log(`  ${JSON.stringify(l).padEnd(34)} → zona: ${JSON.stringify(zonaDeLugares(l))}`);

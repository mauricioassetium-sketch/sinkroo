// ¿Con qué término busca el motor la categoría de su negocio, después del arreglo?
// Se prueba el camino real: las palabras del material → los candidatos → la enciclopedia abierta.
import { palabrasClave, leerWikipedia, categoriaPertinente } from '../src/services/vera.js';
import { query } from '../src/lib/db.js';

const id = process.argv[2] || 'f3edbcef-bafb-4129-9a69-d5fd3e402c6c';
const b = await query<{ name: string; description: string; rubro: string | null }>(
  'SELECT name, description, rubro FROM businesses WHERE id = $1', [id]);
const n = b[0];
const claves = palabrasClave([n?.name, n?.description, n?.rubro].join(' '), 12);
const delVocabulario = claves.filter(c => c.de === 'el vocabulario del rubro').map(c => c.palabra);
const delMaterial = claves.filter(c => c.de === 'el material del negocio').map(c => c.palabra);
const candidatos = [...new Set([...delVocabulario, ...delMaterial])]
  .sort((a, c) => c.split(' ').length - a.split(' ').length || c.length - a.length).slice(0, 10);
console.log(`negocio: ${n?.name}`);
console.log(`candidatos (vocabulario primero, después el material): ${candidatos.join(' · ')}\n`);
for (const t of candidatos) {
  const cat = await leerWikipedia(t);
  const sirve = cat.ok && categoriaPertinente(cat.resumen, t);
  console.log(`${sirve ? '✓' : '·'} ${t.padEnd(22)} ${cat.ok ? `«${cat.titulo}»` : cat.nota}`);
  if (sirve) { console.log(`   → SE QUEDA CON ESTE. resumen: ${String(cat.resumen).slice(0, 150)}\n`); break; }
}

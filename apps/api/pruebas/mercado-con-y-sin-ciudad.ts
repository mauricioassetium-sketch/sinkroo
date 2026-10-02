// El estudio del mercado, antes (sin ciudad) y después (con la ciudad que el cliente declaró).
// No gasta GPU: el motor ubica el lugar en OpenStreetMap y cuenta los negocios del rubro que hay alrededor.
import { leerMapaReal } from '../src/services/agentes.js';
import { query } from '../src/lib/db.js';

const id = process.argv[2] || '43263040-f304-42de-9d4f-45ca93b860cd';
const b = await query<{ name: string; rubro: string | null; zona: string | null }>(
  'SELECT name, rubro, zona FROM businesses WHERE id = $1', [id]);
const negocio = b[0];
console.log(`negocio: ${negocio?.name} · rubro: ${negocio?.rubro ?? '(sin rubro)'} · zona: ${negocio?.zona ?? '(VACÍA)'}\n`);

// El rubro de este negocio es una frase larga (lo deduce Vera del material) y el mapa busca categorías:
// se prueba también con una categoría simple para ver el conteo real con la misma ciudad.
const casos: [string, string, string][] = [
  ['SIN la ciudad (como estaba hasta hoy)', '', String(negocio?.rubro ?? 'RWA')],
  ['CON la ciudad que declaró, con su rubro tal como quedó', String(negocio?.zona ?? ''), String(negocio?.rubro ?? 'RWA')],
  ['CON la ciudad y una categoría simple (restaurantes)', String(negocio?.zona ?? ''), 'restaurantes'],
];
for (const [titulo, zona, rubro] of casos) {
  const r = await leerMapaReal(rubro, zona);
  console.log(`── ${titulo}`);
  if (!r.ok) { console.log(`   no se pudo: ${r.falta}\n`); continue; }
  console.log(`   ciudad ubicada: ${r.ciudad} ${r.pais ? `(${r.pais})` : ''} · busca: ${r.oficio}`);
  console.log(`   lugares del rubro en la zona: ${r.lugares} (${r.conNombre} con nombre)`);
  if (r.nombres.length) console.log(`   algunos: ${r.nombres.slice(0, 6).join(' · ')}`);
  console.log(`   dónde se concentran: ${r.zonas.slice(0, 4).map(z => `${z.z} (${z.n})`).join(' · ') || '(sin datos)'}`);
  console.log(`   la consulta quedó guardada (${r.url.length} caracteres)\n`);
}

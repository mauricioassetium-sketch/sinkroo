// ¿Qué categoría nombra el modelo para cada negocio, y con qué término saldría a buscar su mercado?
import { categoriaDelNegocio } from '../src/services/escritor.js';
import { leerWikipedia, categoriaPertinente } from '../src/services/vera.js';
import { query } from '../src/lib/db.js';

for (const id of ['f3edbcef-bafb-4129-9a69-d5fd3e402c6c', '43263040-f304-42de-9d4f-45ca93b860cd']) {
  const b = await query<{ name: string; description: string; rubro: string | null }>(
    'SELECT name, description, rubro FROM businesses WHERE id = $1', [id]);
  const n = b[0];
  if (!n) continue;
  console.log(`\n══ ${n.name}`);
  const cat = await categoriaDelNegocio({ nombre: n.name, descripcion: n.description, queHace: n.rubro || '' });
  if (!cat) { console.log('   el modelo no respondió (se sigue con el camino viejo)'); continue; }
  console.log(`   categoría: «${cat.es}» / «${cat.en}»   · ${cat.porque}`);
  const aProbar = [...new Set([cat.es, cat.en].flatMap(t => {
    const suyas = String(t).split(/\s+/).filter(w => w.length >= 5);
    return [String(t), ...[...suyas].reverse()];
  }))];
  for (const t of aProbar) {
    const w = await leerWikipedia(t);
    const sirve = w.ok && categoriaPertinente(w.resumen, t);
    console.log(`   ${sirve ? '✓' : '·'} ${t} → ${w.ok ? `«${w.titulo}»: ${String(w.resumen).slice(0, 110)}` : w.nota}`);
  }
}

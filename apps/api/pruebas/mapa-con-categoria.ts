// El mapa con la categoría: ¿aparecen los negocios parecidos que el motor no veía?
import { leerMapaReal } from '../src/services/agentes.js';

const zona = 'Dubai, Emiratos Árabes Unidos';
for (const rubro of ['We redefine luxury management through the exclusive Key Credit System', 'luxury concierge', 'concierge']) {
  const r = await leerMapaReal(rubro, zona);
  console.log(`\n── con «${rubro.slice(0, 60)}${rubro.length > 60 ? '…' : ''}»`);
  if (!r.ok) { console.log(`   NO: ${r.falta}`); continue; }
  console.log(`   ciudad: ${r.ciudad} (${r.pais}) · busca: ${r.oficio}${r.porNombre ? ' [por nombre]' : ''}`);
  console.log(`   lugares: ${r.lugares} (${r.conNombre} con nombre)`);
  console.log(`   nombres: ${r.nombres.slice(0, 8).join(' · ')}`);
}

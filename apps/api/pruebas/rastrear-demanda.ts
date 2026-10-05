// ¿De dónde dice el mundo que viene la demanda de este negocio? Con fuente, no supuesto.
import { query } from '../src/lib/db.js';
import { rastrearLaDemanda } from '../src/services/buscador.js';

const id = process.argv[2] || 'f3edbcef-bafb-4129-9a69-d5fd3e402c6c';
const r = await query(
  `SELECT b.name AS nombre, b.rubro, b.categoria, b.zona, b.industry, b.description, b.audience, o.datos
     FROM businesses b LEFT JOIN onboarding o ON o.business_id = b.id WHERE b.id = $1`, [id]);
const fila = (r[0] ?? {}) as Record<string, string | null>;
const d = (fila.datos ?? {}) as Record<string, string>;
const n = {
  nombre: fila.nombre, rubro: fila.rubro || fila.industry, categoria: fila.categoria, zona: fila.zona,
  ofrece: d.ofrece || fila.description, le_vende_a: d.le_vende_a || fila.audience,
};
console.log(`Negocio: ${n.nombre} · ${n.rubro} (${n.categoria}) · ${[d.ciudad, fila.zona].filter(Boolean).join(', ')}`);
const t = await rastrearLaDemanda(id, n);
if (!t) { console.log('SIN RASTREO (ni el modelo ni la búsqueda dejaron nada)'); process.exit(0); }
console.log(`\nConsultas que armó (${t.segundos} s · ${t.resultados} resultados):`);
for (const c of t.consultas) console.log(`  · ${c}`);
console.log(`\nDe dónde viene la demanda (${t.paises.length}):`);
for (const p of t.paises) console.log(`  · ${p.pais} — ${p.porque}\n      fuente: ${p.fuente.slice(0, 90)}`);
console.log(`\n${t.resumen}`);
process.exit(0);

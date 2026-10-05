// ¿Qué mercados quedan para trabajar en un negocio global, con la plaza adelante?
import { pool } from '../src/lib/db.js';
import { paisesDeclarados } from '../src/services/programador.js';
import { nombreDePais } from '../src/lib/paises.js';

const r = await pool.query("SELECT id, name FROM businesses WHERE name ILIKE '%World Key%' LIMIT 1");
const b = r.rows[0];
const paises = await paisesDeclarados(pool, b.id);
console.log(`${b.name}: ${paises.length} mercados para trabajar`);
console.log(paises.map((p, i) => `  ${i + 1}. ${nombreDePais(p)} (${p})`).join("\n"));
console.log(`plan de lectura: ${paises.length} paises x 2 palabras = ${paises.length * 2} consultas, ~${Math.round(paises.length * 2 * 3)} min`);
await pool.end();

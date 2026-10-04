// ¿La respuesta del cliente queda guardada como la lee el motor?
import { guardarRespuesta } from '../src/services/preguntas.js';
import { pool } from '../src/lib/db.js';
import { paisesDeclarados } from '../src/services/programador.js';
const id = 'f3edbcef-bafb-4129-9a69-d5fd3e402c6c';
console.log('queda:', await guardarRespuesta(pool, id, 'mercados', 'Medio Oriente, Europa, Estados Unidos, Japón'));
const d = (await pool.query('SELECT datos FROM onboarding WHERE business_id = $1', [id])).rows[0].datos;
console.log('continentes:', JSON.stringify(d.continentes));
console.log('paises:', JSON.stringify(d.paises));
console.log('lo que el motor va a leer (códigos expandidos):', JSON.stringify(await paisesDeclarados(pool, id)));
process.exit(0);

// El insert del informe profundo, con el dato real del investigador y SIN tragarme el error.
import { pool } from '../src/lib/db.js';
import { aJson, sinSueltos } from '../src/lib/json-seguro.js';
import { readFileSync } from 'node:fs';

const d = JSON.parse(readFileSync('/tmp/profundo-f3edbcef.json', 'utf8'));
const r = await pool.query('SELECT id FROM businesses LIMIT 1');
const biz = r.rows[0].id;
try {
  const g = await pool.query(
    `INSERT INTO informes_profundos (business_id, pregunta, informe, fuentes, segundos, corrida_id)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6) RETURNING id`,
    [biz, sinSueltos(d.pregunta).slice(0, 600), sinSueltos(d.informe), aJson(d.fuentes), Math.round(d.segundos), null]);
  console.log('GUARDADO · id', g.rows[0].id, '· informe', d.informe.length, 'caracteres · fuentes', d.fuentes.length);
} catch (e) {
  console.log('EL ERROR DE VERDAD:', String(e).slice(0, 700));
}
await pool.end();

// ¿Se nota la regla de los tres segundos? Se llama al escritor con datos reales y se compara el título con la
// primera línea: si dicen lo mismo, la pieza está desperdiciando uno de los dos.
import { pool } from '../src/lib/db.js';
import { escribirLaPieza } from '../src/services/escritor.js';
import { readFileSync } from 'node:fs';

const r = await pool.query("SELECT * FROM businesses WHERE name ILIKE '%World Key%' LIMIT 1");
const b: any = r.rows[0];

const escrita = await escribirLaPieza({
  negocio: { nombre: b.name, queHace: b.description || '', ofrece: [], zona: b.zona || '' },
  angulo: 'el hueco medido: nadie de su mercado dice de dónde viene el cliente que lo puede pagar',
  huecoDelMercado: 'ninguno de los comparables habla de precios ni de origen del cliente',
  formato: 'imagen', esVideo: false,
  aQuien: 'quien tiene el capital y quiere entrar a este mercado', objetivo: 'que pida su lugar',
  boton: 'Conocer el programa', tono: 'elegante', idioma: 'español',
  terminosDelMercado: ['conserjería de lujo'], referencia: '', material: '',
});
if (!escrita) { console.log('el escritor no devolvió nada'); await pool.end(); process.exit(0); }
const titulo = String((escrita as any).titulo || '');
const gancho = String((escrita as any).gancho || '');
const lineas = ((escrita as any).lineas || []) as string[];
console.log('TÍTULO  :', titulo);
console.log('GANCHO  :', gancho);
console.log('LÍNEAS  :');
for (const l of lineas) console.log('   ·', l);
console.log('CIERRE  :', (escrita as any).cierre);
console.log('\n¿el título y la primera línea dicen lo mismo? (1 = idénticos)');
const iguales = titulo.toLowerCase().trim() === gancho.toLowerCase().trim();
const palabrasCompartidas = titulo.toLowerCase().split(/\W+/).filter(w => w.length > 3 && gancho.toLowerCase().includes(w));
console.log('  idénticos:', iguales, '· palabras que se repiten:', palabrasCompartidas.length ? palabrasCompartidas.join(', ') : 'ninguna');
await pool.end();

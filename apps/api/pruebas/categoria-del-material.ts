// La categoría, sacada del material que subió el cliente (su página web y sus documentos).
import { categoriaDelNegocio } from '../src/services/escritor.js';
import { leerPagina, leerArchivos } from '../src/services/vera.js';
import { query } from '../src/lib/db.js';

const id = process.argv[2] || 'f3edbcef-bafb-4129-9a69-d5fd3e402c6c';
const b = await query<{ name: string; description: string }>('SELECT name, description FROM businesses WHERE id = $1', [id]);
const onb = await query<{ datos: Record<string, unknown> }>('SELECT datos FROM onboarding WHERE business_id = $1', [id]);
const links = (Array.isArray(onb[0]?.datos?.negocio_links) ? onb[0].datos.negocio_links : []) as string[];

const paginas = [];
for (const url of links.slice(0, 3)) {
  const p = await leerPagina(String(url));
  if (p) paginas.push(p);
  console.log(`página ${url}: ${p ? `leída (${String(p.texto || '').length} caracteres)` : 'no se pudo leer'}`);
}
const material = paginas.map(p => `${p.titulo} ${p.descripcion} ${p.texto}`).join('\n');
console.log(`material que se le pasa al modelo: ${material.replace(/\s+/g, ' ').trim().length} caracteres\n`);

const conMaterial = await categoriaDelNegocio({
  nombre: b[0]?.name || '', descripcion: b[0]?.description || '', material,
});
const sinMaterial = await categoriaDelNegocio({ nombre: b[0]?.name || '', descripcion: b[0]?.description || '' });
console.log('CON el material :', JSON.stringify(conMaterial, null, 0));
console.log('SIN el material :', JSON.stringify(sinMaterial, null, 0));

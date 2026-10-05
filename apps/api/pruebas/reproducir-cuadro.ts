// Reproduce el fallo del motor de cuadros con los datos REALES de la pieza, para ver la causa.
import pg from 'pg';
import { generarContenido, motivoDelUltimoFalloDeContenido } from '../src/services/contenido.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const { rows } = await pool.query(`
    SELECT p.id, p.formato, p.titulo, p.generacion, p.business_id
      FROM piezas p JOIN businesses b ON b.id = p.business_id
     WHERE b.name = 'Peluquería canina de prueba' AND p.ronda = 6 AND p.generacion->>'tipo_de_contenido' = 'imagen con texto'
     LIMIT 1`);
  const p = rows[0];
  if (!p) { console.log('no encontré la pieza'); return; }
  const g = typeof p.generacion === 'string' ? JSON.parse(p.generacion) : p.generacion;
  const textos = [String(g.texto_sobre_la_imagen || '')];
  console.log('pieza:', p.id, '· formato:', p.formato, '· titulo:', JSON.stringify(p.titulo));
  console.log('texto que recibe el motor:', JSON.stringify(textos));

  const salida = await generarContenido({
    businessId: p.business_id, piezaId: p.id, tipoDeContenido: 'imagen con texto',
    formato: p.formato, titulo: p.titulo, textos, materiales: [], colores: [],
    motivoSinImagen: 'sin imágenes del proveedor (la GPU estaba apagada)',
  });
  console.log('\nresultado:', salida ? JSON.stringify(salida).slice(0, 400) : 'null');
  console.log('motivo del último fallo:', JSON.stringify(motivoDelUltimoFalloDeContenido()));
  await pool.end();
}

void main().catch(e => { console.error('el guion falló:', e); process.exit(1); });

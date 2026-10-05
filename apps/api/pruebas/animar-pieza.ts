// =====================================================================================================
// ANIMA LOS PLANOS DE UNA PIEZA REAL (camino del motor, sin la ronda del producto).
//
// Por qué existe: la ronda del producto encadena el pintado y la animación y, cuando el motor de imágenes
// vuelve a cargar FLUX, el de video se queda sin memoria (medido: 6 OOM y clips congelados). Acá se hace lo
// mismo que hace el motor —los mismos servicios, los mismos prompts de `prompts-por-motor`— pero liberando la
// memoria antes de animar y eligiendo los planos que se animan.
//
//   uso:  npx tsx pruebas/animar-pieza.ts <piezaId> <businessId> [planos a animar, ej. 1,2,5]
// =====================================================================================================
import fs from 'node:fs';
import path from 'node:path';
import { animarFoto, armarPieza, liberarElMotorDeImagen, motorDeVideo } from '../src/services/video-animado.js';
import { escenaEnIngles, movimientoDeLaEscena } from '../src/services/escritor.js';
import { textoDeMovimiento, cineDeLaPieza } from '../src/services/prompts-por-motor.js';
import { query } from '../src/lib/db.js';

const piezaId = process.argv[2] || '';
const negocioId = process.argv[3] || '';
const aAnimar = (process.argv[4] || '1,2,5').split(',').map(x => Number(x.trim())).filter(Boolean);
if (!piezaId || !negocioId) { console.log('faltan la pieza y el negocio'); process.exit(1); }

const RAIZ_IMAGENES = process.env.IMAGENES_DIR || '/root/work/sinkroo-a/datos/imagenes';
const RAIZ_VIDEOS = process.env.VIDEOS_DIR || '/root/work/sinkroo-a/datos/videos';
const carpetaFotos = path.join(RAIZ_IMAGENES, negocioId);
const carpetaClips = path.join(RAIZ_VIDEOS, negocioId);
fs.mkdirSync(carpetaClips, { recursive: true });

// La pieza y sus planos, tal como quedaron guardados por el motor.
const filas = await query<{ titulo: string; texto: string; formato: string; planos: { planos?: { n: number; prompt: string; prompt_negativo?: string }[] } | null }>(
  `SELECT titulo, texto, formato, generacion->'planos' AS planos FROM piezas WHERE id = $1`, [piezaId],
);
const pz = filas[0];
if (!pz) { console.log('esa pieza no existe'); process.exit(1); }
const planos = (pz.planos?.planos ?? []).filter((p: { n?: number }) => p?.n);
const negocio = await query<{ tone: string | null; zona: string | null }>(`SELECT tone, zona FROM businesses WHERE id = $1`, [negocioId]);
const tono = negocio[0]?.tone || 'Profesional y formal';
const formato = String(pz.formato || 'video vertical 9:16');
const esVertical = !/1:1|cuadrad/i.test(formato);
console.log(`pieza: ${pz.titulo} · ${formato} · ${planos.length} planos · se animan: ${aAnimar.join(', ')}`);

// Se libera el motor de imágenes ANTES de animar: los dos viven en la misma tarjeta.
await liberarElMotorDeImagen();
await new Promise(r => setTimeout(r, 3000));

const elegidos = planos.filter((p: { n: number }) => aAnimar.includes(p.n));
const clips = new Map<number, string>();
for (const p of elegidos) {
  const foto = p.n === 1 ? path.join(carpetaFotos, `${piezaId}.png`) : path.join(carpetaFotos, `${piezaId}-p${p.n}.png`);
  if (!fs.existsSync(foto)) { console.log(`plano ${p.n}: la foto no está en disco, se saltea`); continue; }
  const cine = cineDeLaPieza({ tono, n: p.n, total: planos.length });
  const en = (await escenaEnIngles(p.prompt)) || p.prompt;
  const accion = await movimientoDeLaEscena(en, cine.movimiento);
  const texto = textoDeMovimiento(en, cine.movimiento, accion ?? undefined);
  console.log(`\n▌plano ${p.n} · ${cine.movimiento.split(',')[0]}`);
  console.log(`  acción: ${accion ?? '(el modelo no respondió)'}`);
  const t0 = Date.now();
  const r = await animarFoto({ foto: fs.readFileSync(foto), nombre: `p${p.n}`, prompt: texto.prompt, negativo: p.prompt_negativo, segundos: 5 });
  if (!r.ok) { console.log(`  ✗ no se animó: ${r.motivo}`); continue; }
  const destino = path.join(carpetaClips, `${piezaId}-p${p.n}.mp4`);
  fs.writeFileSync(destino, r.clip);
  clips.set(p.n, destino);
  console.log(`  ✓ clip listo en ${Math.round((Date.now() - t0) / 1000)}s → ${destino}`);
}

if (!clips.size) { console.log('\nno se animó ningún plano: no hay pieza que armar'); process.exit(1); }

// LA PIEZA: los clips animados en su lugar y los demás planos como toma fija (no se anima todo).
const segmentos: { tipo: 'clip' | 'foto'; archivo: string }[] = [];
for (const p of planos.slice(0, 6)) {
  const clip = clips.get(p.n);
  if (clip) { segmentos.push({ tipo: 'clip', archivo: clip }); continue; }
  const foto = p.n === 1 ? path.join(carpetaFotos, `${piezaId}.png`) : path.join(carpetaFotos, `${piezaId}-p${p.n}.png`);
  if (fs.existsSync(foto)) segmentos.push({ tipo: 'foto', archivo: foto });
}
console.log(`\nse arma la pieza: ${segmentos.filter(s => s.tipo === 'clip').length} clips + ${segmentos.filter(s => s.tipo === 'foto').length} tomas fijas`);
const armado = armarPieza({
  segmentos, carpeta: path.join(carpetaClips, `${piezaId}-armado`),
  titulo: pz.titulo, copy: pz.texto, tono, pais: negocio[0]?.zona || undefined,
  lengua: /ingl/i.test(String(process.env.IDIOMA_DE_LA_PIEZA || '')) ? 'inglés' : undefined,
  formato,
});
if (!armado) { console.log('no se pudo armar la pieza'); process.exit(1); }
const final = path.join(carpetaClips, `${piezaId}-animada.mp4`);
fs.copyFileSync(armado.archivo, final);
console.log(`\nPIEZA LISTA: ${final} · ${Math.round(armado.segundos * 10) / 10}s · ${armado.animados} planos animados · voz ${armado.voz}`);
console.log(`motor de video: ${motorDeVideo().modelo}`);

// Arma la pieza final con los clips que ya están en disco (el armado del motor, sin volver a animar).
import fs from 'node:fs';
import path from 'node:path';
import { armarPieza } from '../src/services/video-animado.js';
import { query } from '../src/lib/db.js';

const piezaId = process.argv[2] || '';
const negocioId = process.argv[3] || '';
const conClip = (process.argv[4] || '2,5').split(',').map(x => Number(x.trim())).filter(Boolean);
const RAIZ_IMAGENES = '/root/work/sinkroo-a/datos/imagenes';
const RAIZ_VIDEOS = '/root/work/sinkroo-a/datos/videos';
const carpetaFotos = path.join(RAIZ_IMAGENES, negocioId);
const carpetaClips = path.join(RAIZ_VIDEOS, negocioId);

const filas = await query<{ titulo: string; texto: string; formato: string; planos: { planos?: { n: number }[] } | null }>(
  `SELECT titulo, texto, formato, generacion->'planos' AS planos FROM piezas WHERE id = $1`, [piezaId]);
const pz = filas[0];
if (!pz) { console.log('no existe la pieza'); process.exit(1); }
const planos = (pz.planos?.planos ?? []).filter((p: { n?: number }) => p?.n).slice(0, 6);
const negocio = await query<{ tone: string | null; zona: string | null }>(`SELECT tone, zona FROM businesses WHERE id = $1`, [negocioId]);

const segmentos: { tipo: 'clip' | 'foto'; archivo: string }[] = [];
for (const p of planos) {
  const foto = p.n === 1 ? path.join(carpetaFotos, `${piezaId}.png`) : path.join(carpetaFotos, `${piezaId}-p${p.n}.png`);
  const clip = path.join(carpetaClips, `${piezaId}-p${p.n}.mp4`);
  // Los clips animados entran como clip; el resto, como toma fija (el motor sostiene esos planos con un
  // movimiento mínimo y estira su duración para que la fila dure lo mismo que la voz).
  if (conClip.includes(p.n) && fs.existsSync(clip) && fs.statSync(clip).size > 200_000) segmentos.push({ tipo: 'clip', archivo: clip });
  else if (fs.existsSync(foto)) segmentos.push({ tipo: 'foto', archivo: foto });
}
console.log(`tramos: ${segmentos.filter(s => s.tipo === 'clip').length} clips + ${segmentos.filter(s => s.tipo === 'foto').length} tomas fijas`);
const carpeta = path.join(carpetaClips, `${piezaId}-final`);
const r = armarPieza({
  segmentos, carpeta, titulo: pz.titulo, copy: pz.texto,
  tono: negocio[0]?.tone || 'Profesional y formal', pais: negocio[0]?.zona || undefined, formato: pz.formato,
});
if (!r) { console.log('no se pudo armar'); process.exit(1); }
const final = `/root/work/sinkroo-a/datos/videos/pieza-real-${piezaId.slice(0, 8)}.mp4`;
fs.copyFileSync(r.archivo, final);
console.log(`LISTO: ${final} · ${Math.round(r.segundos * 10) / 10}s · ${r.animados} planos animados · voz ${r.voz}`);

// EL ARMADO DEL VIDEO ANIMADO: los clips que devuelve el motor de video + la voz del motor + subtítulos.
// Reemplaza el pase de fotos con zoom: acá el video lo arman clips con movimiento, y la voz y los subtítulos
// salen de las mismas funciones que ya usa el motor (guionParaLaVoz, textoParaLaVoz, vozSegunCaso).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { guionParaLaVoz, ritmoParaEdge, vozSegunCaso } from '../src/services/video.js';
import { textoParaLaVoz } from '../src/services/prompts-por-motor.js';

const DIR = process.argv[2] || '/root/.hermes/cache/scratch/armado';
const COPY = process.argv[3] || 'Verysset verifica activos del mundo real de forma continua, no con una foto del momento. Cada activo se barre por satélite, se revisa con inteligencia artificial y queda anclado con su historia. Los bancos y los reguladores reciben una sola capa de verdad que pueden auditar.';
const TITULO = process.argv[4] || 'El hueco que nadie está midiendo';
const TONO = process.argv[5] || 'Profesional y formal';
const PAIS = process.argv[6] || 'Emiratos Árabes Unidos';
const LENGUA = process.argv[7] || 'inglés';
const SALIDA = path.join(DIR, 'pieza-animada.mp4');

fs.mkdirSync(DIR, { recursive: true });
const clips = fs.readdirSync(DIR).filter(f => /\.mp4$/.test(f) && !f.startsWith('pieza') && !f.startsWith('mudo')).sort();
if (!clips.length) { console.log('no hay clips en', DIR); process.exit(1); }
console.log('clips:', clips.join(', '));

// 1) LA VOZ, con las funciones del motor (no se inventa el texto ni la voz).
const paraVoz = textoParaLaVoz(guionParaLaVoz(COPY, TITULO)).texto;
const { voz, porque, ritmo } = vozSegunCaso(TONO, PAIS, LENGUA);
const ritmoEdge = ritmoParaEdge(ritmo);
console.log('voz:', voz, '· ritmo del motor', ritmo, '→', ritmoEdge, '·', porque);
const mp3 = path.join(DIR, 'voz.mp3');
// El ritmo va pegado con «=»: empieza con guion («-8%») y suelto lo lee como una opción más y falla.
execFileSync('edge-tts', ['--voice', voz, `--rate=${ritmoEdge}`, '--text', paraVoz, '--write-media', mp3], { stdio: 'inherit' });
const dur = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp3]).toString().trim());
console.log('voz:', dur.toFixed(2), 's ·', Buffer.byteLength(paraVoz), 'caracteres');

// 2) LOS SUBTÍTULOS: se reparte la voz en renglones cortos y se les da tiempo según lo que ocupan.
//    Se corta por frase y, si la frase es larga, por coma: nadie lee un renglón de 90 caracteres.
const renglones: string[] = [];
for (const frase of paraVoz.split(/(?<=[.!?…])\s+/)) {
  let resto = frase.trim();
  while (resto.length > 64) {
    const corte = resto.lastIndexOf(',', 64) > 20 ? resto.lastIndexOf(',', 64) + 1 : resto.lastIndexOf(' ', 64);
    renglones.push(resto.slice(0, corte).trim());
    resto = resto.slice(corte).trim();
  }
  if (resto) renglones.push(resto);
}
const esHora = (s: number) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), seg = (s % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${seg.toFixed(3).padStart(6, '0').replace('.', ',')}`;
};
const total = renglones.reduce((n, r) => n + r.length, 0);
let t = 0;
const srt = renglones.map((r, i) => {
  const d = (r.length / total) * dur;
  const desde = t, hasta = Math.min(dur, t + d);
  t = hasta;
  return `${i + 1}\n${esHora(desde)} --> ${esHora(hasta)}\n${r}\n`;
}).join('\n');
fs.writeFileSync(path.join(DIR, 'subs.srt'), srt, 'utf8');
console.log('renglones de subtítulo:', renglones.length);

// 3) EL VIDEO MUDO: los clips en fila, todos al mismo tamaño y ritmo.
const lista = path.join(DIR, 'lista.txt');
fs.writeFileSync(lista, clips.map(c => `file '${path.join(DIR, c)}'`).join('\n'), 'utf8');
const mudo = path.join(DIR, 'mudo.mp4');
execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lista,
  '-vf', 'fps=24,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920', '-c:v', 'libx264', '-crf', '20', '-preset', 'medium', '-pix_fmt', 'yuv420p', mudo], { stdio: 'inherit' });

// 4) EL VIDEO FINAL: el mudo + la voz, cortado a lo que dura la voz, con los subtítulos quemados.
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', mudo, '-i', mp3,
  '-vf', `subtitles=${path.join(DIR, 'subs.srt')}:force_style='FontName=DejaVu Sans,FontSize=15,Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H80000000,BorderStyle=3,Outline=2,Shadow=0,MarginV=120'`,
  '-map', '0:v', '-map', '1:a', '-shortest', '-c:v', 'libx264', '-crf', '20', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', SALIDA], { stdio: 'inherit' });
const info = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,size', '-show_entries', 'stream=codec_type,width,height', '-of', 'default=nw=1', SALIDA]).toString();
console.log('LISTO ·', SALIDA, '\n', info);


// ¿Qué prompt de imagen sale con los planos REALES, y qué le falta de la decisión de cine?
import { planosDelGuion } from '../src/services/planos.js';
import { promptDeImagen, cineDeLaPieza } from '../src/services/prompts-por-motor.js';
import { motorDeImagenEnUso } from '../src/services/imagenes.js';
import { escenaEnIngles } from '../src/services/escritor.js';
import { query } from '../src/lib/db.js';

const g = (await query<{ texto: string }>("select texto from piezas where business_id='f3edbcef-bafb-4129-9a69-d5fd3e402c6c' order by created_at desc limit 1"))[0].texto;
const tono = 'Premium y sobrio';
const zona = 'Dubai, Emiratos Árabes Unidos';
const planos = await planosDelGuion({ guion: g, formato: 'video vertical 9:16', segundos: 30, tono, pais: zona, queHace: 'conserjería de lujo' });
const motor = motorDeImagenEnUso();
const todos = planos?.planos ?? [];
const total = Math.min(6, todos.length);
console.log(`planos que devolvió el motor: ${todos.length} · se usan ${total}\n`);
for (const p of todos.slice(0, 2)) {
  const en = await escenaEnIngles(p.prompt);
  const visual = promptDeImagen(motor.motor, { queHace: p.prompt, queHaceEn: en ?? undefined, formato: 'video vertical 9:16', lugar: zona, tono, n: p.n, total });
  const busca = (re: RegExp) => re.exec(visual.prompt)?.[0] ?? '—';
  const cine = cineDeLaPieza({ tono, n: p.n, total });
  console.log(`── plano ${p.n} · el cine que corresponde: plano=${cine.plano} lente=${cine.optica.slice(0, 22)}`);
  console.log(`   en el prompt: plano=${busca(/wide establishing shot|medium close-up|medium shot|close-up|wide shot/)} lente=${busca(/\d+mm (?:wide )?lens/)} luz=${busca(/golden hour|flat overcast daylight|late blue hour/)} etalonaje=${busca(/Kodak \d+ print emulation|Fujifilm ETERNA emulation|Kodak Portra emulation/)}`);
  const sucio = ['cinematic', 'commercial photograph', 'commercial', 'speaking', 'static camera'].filter(x => visual.prompt.toLowerCase().includes(x));
  console.log(`   restos: ${sucio.join(', ') || 'ninguno'} · largo: ${visual.prompt.length}`);
  console.log(`   PROMPT: ${visual.prompt.slice(0, 300)}\n`);
}
process.exit(0);

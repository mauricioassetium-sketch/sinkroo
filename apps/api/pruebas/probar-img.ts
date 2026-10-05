import { promptDeImagen } from '../src/services/prompts-por-motor.js';
for (const n of [1,2,3,5]) {
  const r = promptDeImagen('flux-dev', { queHace: 'an auditor walks the dock with a tablet', formato: 'video vertical 9:16', lugar: 'DIFC', tono: 'Profesional y formal', n, total: 6 });
  const p = r.prompt;
  console.log(`n=${n}: ${/\b(wide establishing shot|medium close-up|medium shot|close-up|wide shot)\b/.exec(p)?.[1]} · ${/(\d+mm (?:wide )?lens)/.exec(p)?.[1]} · ${/(golden hour|flat overcast daylight|late blue hour)/.exec(p)?.[1]} · ${/(locked-off tripod|slow steady push in|slow lateral dolly with the subject|gentle handheld follow|slow pull back)/.exec(p)?.[1]}`);
  console.log(`   primeros 200: ${p.slice(0,200)}`);
}

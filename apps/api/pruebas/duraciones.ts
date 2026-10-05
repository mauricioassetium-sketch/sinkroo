import { planosDelGuion } from '../src/services/planos.js';
const g = process.argv[2] || '';
const p = await planosDelGuion({ guion: g, formato: 'video vertical 9:16', segundos: 30, tono: 'Profesional y formal', pais: 'Emiratos Árabes Unidos', queHace: 'verificación de activos del mundo real' });
if (!p) { console.log('sin planos'); process.exit(1); }
const seis = p.planos.slice(0, 6);
console.log('planos que devuelve:', p.planos.length, '· duración total', p.duracion_total_s, 's');
console.log('los primeros 6 (los que usa el motor):', seis.map(x => x.duracion_s + 's').join(' + '), '=', Math.round(seis.reduce((s,x)=>s+x.duracion_s,0)*100)/100, 's');

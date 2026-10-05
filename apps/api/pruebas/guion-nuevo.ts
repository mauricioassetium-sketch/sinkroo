// Pide un guion nuevo al escritor (Nia) con los datos reales del negocio, para comprobar si la regla de
// tangibilidad que se agregó al encargo produce líneas filmables. Sólo texto: no toca la GPU.
import { escribirLaPieza } from '../src/services/escritor.js';

const negocio = {
  nombre: 'verysser',
  queHace: 'Verificación continua de activos del mundo real (RWA) para instituciones y estados soberanos: satélite, sensores de campo y auditoría en sitio.',
  ofrece: ['Verificación de grado soberano para activos del mundo real', 'Historia verificable con score de confianza'],
  zona: 'Dubái, Emiratos Árabes Unidos (DIFC)',
};
const material = 'Torres del DIFC de Dubái, puertos y cadenas de custodia en Singapur, oro en Gauteng, litio y agua en Atacama, bonos de carbono en la Amazonía, plantas industriales en el Ruhr, energía offshore en Bergen, campo en la Pampa, tierras raras en el Gobi, madera en la Columbia Británica. Verificación por satélite, sensores de campo y auditoría en sitio. El material cargado viene de verysset.com.';

const r = await escribirLaPieza({
  negocio, material,
  angulo: 'Nadie está midiendo si el activo sigue existiendo: se verifica por satélite, sensores de campo y auditoría en sitio, y queda una historia que no se puede reescribir.',
  huecoDelMercado: 'Todos hablan de tokenizar; nadie habla de verificar que el activo siga ahí.',
  formato: 'video vertical 9:16', esVideo: true,
  aQuien: 'Bancos, fondos y gestores institucionales, reguladores y estados soberanos',
  objetivo: 'que pidan la verificación de un activo', boton: 'Escriba por WhatsApp',
  tono: 'Profesional y formal', idioma: 'español',
  terminosDelMercado: ['RWA', 'activos del mundo real'],
  referencia: '',
});
if (!r) { console.log('el escritor no respondió'); process.exit(1); }
console.log('TÍTULO:', r.titulo);
console.log('GANCHO:', r.gancho);
console.log('LÍNEAS:');
for (const l of r.lineas) console.log('  ·', l);
console.log('CIERRE:', r.cierre);
if (r.reparadas?.length) { console.log('\nLÍNEAS QUE HUBO QUE REPARAR (no se podían filmar):'); r.reparadas.forEach(x => console.log('  → ', x)); }
console.log('\n--- GUION COMPLETO (lo que se pasa al protocolo) ---');
const guion = [r.gancho, ...r.lineas, r.cierre].filter(Boolean).join('\n');
console.log(guion);
// Se guarda para que el protocolo de validación en seco lo pueda leer sin copiar y pegar.
import fs from 'node:fs';
fs.writeFileSync('/root/.hermes/cache/scratch/guion-nuevo.txt', guion);
console.log('\nguardado en /root/.hermes/cache/scratch/guion-nuevo.txt (' + guion.length + ' caracteres)');

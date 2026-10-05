// Los planos del motor con el material REAL de Verysset (el que sale de su web).
import { planosDelGuion } from '../src/services/planos.js';

const guion = `Verysset verifies real world assets continuously, not with a snapshot.
Every asset is swept by satellite, checked by AI and anchored with its lineage.
Banks and regulators get one verifiable truth layer they can audit.`;

const planos = await planosDelGuion({
  guion, formato: 'video vertical 9:16', segundos: 30, tono: 'Profesional y formal',
  pais: 'Emiratos Árabes Unidos',
  queHace: 'Infraestructura neutral de verificación continua para activos del mundo real (RWA), para instituciones y estados. Tres motores: Geo Sentinel (verificación física, geoespacial y temporal con barrido satelital y sensores de campo), Aura Verification Engine (verificación continua con IA de la integridad y coherencia de la información del activo) y Pedigree Engine (custodia de la historia verificable del activo, que genera un score de confianza dinámico). Más de 4.276 millones de dólares en activos verificados, verificación 24/7, alineada con ISO 20022, ISO 27001 y 22301, MiCA, MAS, VARA y FATF. Licencia su marco a naciones e instituciones para que operen su propio ecosistema de tokenización. No custodia fondos, no emite instrumentos ni asume riesgo fiduciario: es la capa de verificación y de custodia de evidencia.',
});
if (!planos) { console.log('sin planos'); process.exit(1); }
console.log('planos:', planos.planos.length, '· duración total:', planos.duracion_total_s, 's · motor:', planos.motor);
for (const [i, p] of planos.planos.entries()) {
  console.log(`\nPLANO ${i+1} (${p.duracion_s}s)`);
  console.log('  se ve:', String(p.prompt || '').slice(0, 230));
  console.log('  no sale:', String(p.prompt_negativo || '').slice(0, 110));
}

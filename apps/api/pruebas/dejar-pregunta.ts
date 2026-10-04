// Deja la pregunta del motor como la deja una corrida (para que el cliente la vea en el panel).
import { pedirDato } from '../src/services/preguntas.js';
import { pool } from '../src/lib/db.js';
await pedirDato(pool, { businessId: 'f3edbcef-bafb-4129-9a69-d5fd3e402c6c', clave: 'mercados',
  pregunta: '¿En qué países o regiones están sus clientes?',
  porque: 'El motor sale a leer su rubro —y a contar quién pauta— en los mercados donde están sus clientes. Si vende a gente de varios países, dígalos: apuntar al lugar donde está la empresa le traería el público equivocado.',
  ejemplo: 'Emiratos Árabes Unidos, Europa, Estados Unidos',
  opciones: ['Su ciudad o su país', 'Medio Oriente', 'Europa', 'Estados Unidos', 'Latinoamérica', 'Asia', 'Global'] });
console.log('pregunta dejada en el panel');
process.exit(0);

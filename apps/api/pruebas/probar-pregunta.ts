
import { pedirDato, preguntasAbiertas } from '../src/services/preguntas.js';
import { pool } from '../src/lib/db.js';
const id = 'f3edbcef-bafb-4129-9a69-d5fd3e402c6c';
await pedirDato(pool, { businessId: id, clave: 'mercados',
  pregunta: '¿En qué países o regiones están sus clientes?',
  porque: 'El motor sale a leer su rubro donde están sus clientes.', ejemplo: 'Emiratos Árabes Unidos, Europa',
  opciones: ['Medio Oriente', 'Europa', 'Global'] });
console.log('abiertas:', JSON.stringify(await preguntasAbiertas(pool, id)).slice(0, 400));
process.exit(0);

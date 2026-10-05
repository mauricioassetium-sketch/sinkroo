// Vuelve a armar los montajes que quedaron cortados, POR FUERA DEL SERVIDOR (sin recargas que los maten).
import { Pool } from 'pg';
import { recuperarMontajes } from '../src/services/video.js';

const db = new Pool({ connectionString: process.env.DATABASE_URL });
const n = await recuperarMontajes(db, (m) => console.log(new Date().toISOString().slice(11, 19), m));
console.log('montajes recuperados:', n);
await db.end();

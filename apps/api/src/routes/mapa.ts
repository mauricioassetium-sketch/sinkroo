// =====================================================================================================
// EL MAPA DEL MOTOR — qué ciudades o países está verificando AHORA, para pintarlos en el mapa del panel.
//
// POR QUÉ EXISTE
//
// El dueño lo pidió así: «al lado de Tino crea un mapa en SVG y que un punto iluminándose indique con nombre
// qué ciudad o país está verificando el motor en ese momento; si son múltiples, que lo muestre igual, para que
// el usuario sepa si su búsqueda es global o es local».
//
// DE DÓNDE SALE CADA COSA (nada estimado)
//
//   · VERIFICANDO AHORA: la lectura de anuncios abierta (la que el trabajador anotó al empezar y todavía no
//     cerró). Son los mercados que se están mirando en este momento.
//   · YA VERIFICADO: los países de donde el motor tiene anuncios leídos, con su cantidad y la última vez.
//   · LA PLAZA: el lugar donde está el negocio (`zona`), que es lo que el estudio del mapa geocodifica.
//
// El alcance sale de lo que declaró el negocio (Primeros pasos) y de cuántos mercados hay en juego: con uno
// solo la búsqueda es local; con varios, global.
// =====================================================================================================
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { exigirSesion } from '../lib/auth.js';
import { coordenadasDe, nombreDePais, paisesDeLaZona } from '../lib/paises.js';

type Lugar = {
  codigo: string; nombre: string; ciudad: string;
  lat: number; lon: number;
  verificando: boolean;
  anuncios: number;
  cuando: string;
  deDonde: string;
};

export async function mapaRoutes(app: FastifyInstance, db: Pool) {
  /** Los lugares que el motor está verificando (o verificó), con su punto en el mapa. */
  app.get('/api/mapa', async (req, reply) => {
    const u = await exigirSesion(req, reply);
    if (!u || !u.business_id) return;

    const negocio = (await db.query<{ zona: string; name: string }>(
      'SELECT coalesce(zona, \'\') AS zona, name FROM businesses WHERE id = $1', [u.business_id]).catch(() => ({ rows: [] }))).rows[0];
    const zona = String(negocio?.zona || '');
    const ciudadDeLaPlaza = zona.split(',')[0].trim();

    // 1) LO QUE SE ESTÁ LEYENDO AHORA: la lectura abierta de los últimos 40 minutos (más vieja que eso es una
    //    lectura que se cortó sin cerrar, y decir «verificando» sería mentir).
    const abierta = (await db.query<{ mercados: string[]; empezada_at: Date }>(
      `SELECT mercados, empezada_at FROM lecturas_de_anuncios
        WHERE business_id = $1 AND terminada_at IS NULL AND empezada_at > now() - interval '40 minutes'
        ORDER BY empezada_at DESC LIMIT 1`, [u.business_id]).catch(() => ({ rows: [] }))).rows[0];
    const verificando = new Set((abierta?.mercados ?? []).map(m => String(m).toUpperCase()));

    // 2) LO YA LEÍDO: de dónde tiene anuncios el motor, cuántos y cuándo fue la última vez.
    const leidos = (await db.query<{ pais: string; n: number; ultimo: Date }>(
      `SELECT pais, count(*)::int AS n, max(leido_at) AS ultimo FROM anuncios_leidos
        WHERE business_id = $1 AND pais <> '' GROUP BY pais ORDER BY n DESC LIMIT 12`,
      [u.business_id]).catch(() => ({ rows: [] }))).rows;

    const lugares: Lugar[] = [];
    const vistos = new Set<string>();

    const agregar = (codigoCrudo: string, ciudad: string, opciones: { verificando: boolean; anuncios: number; cuando: string; deDonde: string }) => {
      const codigo = String(codigoCrudo || '').toUpperCase();
      if (!codigo || codigo.length !== 2) return;
      const clave = `${codigo}|${ciudad.toLowerCase()}`;
      if (vistos.has(clave)) return;
      const punto = coordenadasDe(codigo, ciudad);
      if (!punto) return; // sin coordenadas no se pinta: mejor nada que un punto en el lugar equivocado
      vistos.add(clave);
      lugares.push({
        codigo, nombre: nombreDePais(codigo), ciudad,
        lat: punto[0], lon: punto[1],
        verificando: opciones.verificando, anuncios: opciones.anuncios,
        cuando: opciones.cuando, deDonde: opciones.deDonde,
      });
    };

    // Los que se están leyendo ahora: con la ciudad de la plaza cuando el mercado es su propio país.
    for (const codigo of verificando) {
      agregar(codigo, codigo === paisesDeLaZona(zona)[0] ? ciudadDeLaPlaza : '', {
        verificando: true, anuncios: 0, cuando: 'ahora', deDonde: 'la lectura que está corriendo',
      });
    }
    // Los ya leídos, con su cantidad y su fecha.
    const fecha = (d: Date | null) => {
      if (!d) return '';
      const f = new Date(d);
      return `${String(f.getDate()).padStart(2, '0')}/${String(f.getMonth() + 1).padStart(2, '0')} ${String(f.getHours()).padStart(2, '0')}:${String(f.getMinutes()).padStart(2, '0')}`;
    };
    for (const l of leidos) {
      agregar(l.pais, String(l.pais).toUpperCase() === paisesDeLaZona(zona)[0] ? ciudadDeLaPlaza : '', {
        verificando: verificando.has(String(l.pais).toUpperCase()), anuncios: l.n,
        cuando: fecha(l.ultimo), deDonde: 'los anuncios ya leídos de su mercado',
      });
    }
    // La plaza, aunque todavía no tenga anuncios leídos: es donde está el negocio.
    const codigoPlaza = paisesDeLaZona(zona)[0] || '';
    if (codigoPlaza) {
      agregar(codigoPlaza, ciudadDeLaPlaza, {
        verificando: verificando.has(codigoPlaza), anuncios: 0, cuando: '', deDonde: 'la plaza del negocio (Primeros pasos)',
      });
    }

    // 3) EL ALCANCE: local o global, según lo que declaró el negocio y cuántos mercados hay en juego.
    const onb = (await db.query<{ datos: Record<string, unknown> }>(
      'SELECT datos FROM onboarding WHERE business_id = $1', [u.business_id]).catch(() => ({ rows: [] }))).rows[0];
    const datos = onb?.datos ?? {};
    const declarado = String(datos.alcance_comercial ?? '').trim();
    const mercados = [...new Set([...verificando, ...leidos.map(l => String(l.pais).toUpperCase())])].filter(Boolean);
    const esGlobal = /global/i.test(declarado) || mercados.length > 1;
    const alcance = esGlobal
      ? { tipo: 'global' as const, porque: mercados.length > 1
          ? `está verificando ${mercados.length} mercados a la vez`
          : 'su negocio se declaró global en Primeros pasos' }
      : { tipo: 'local' as const, porque: 'está verificando un solo mercado: el de su plaza' };

    const nombres = lugares.filter(l => l.verificando).map(l => l.ciudad || l.nombre);
    return {
      lugares,
      alcance,
      plaza: zona || null,
      // El resumen en una línea, para el título del mapa: qué se está verificando y si es global o local.
      resumen: nombres.length
        ? `Verificando ahora: ${nombres.join(', ')} · búsqueda ${alcance.tipo} (${alcance.porque})`
        : lugares.length
          ? `Verificó: ${lugares.map(l => l.ciudad || l.nombre).slice(0, 4).join(', ')} · búsqueda ${alcance.tipo}`
          : 'Todavía no verificó ningún mercado',
      generado_at: new Date().toISOString(),
    };
  });
}

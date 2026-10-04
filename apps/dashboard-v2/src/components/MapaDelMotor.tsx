// =====================================================================================================
// EL MAPA DEL MOTOR — qué ciudades o países está verificando, con un punto que se ilumina.
//
// El dueño lo pidió así: «al lado de Tino crea un mapa en SVG, y que un punto iluminándose indique con nombre
// qué ciudad o país está verificando el motor en ese momento; si son múltiples que lo muestre igual, para que
// el usuario sepa si su búsqueda es global o es local».
//
// DE DÓNDE SALE: de `/api/mapa`, que lee la lectura de anuncios abierta (lo que se está mirando AHORA), los
// países donde ya hay anuncios leídos y la plaza del negocio. Un lugar sin coordenadas no se pinta: mejor
// nada que un punto en el lugar equivocado.
//
// CÓMO SE VE: el mundo en un solo camino (Natural Earth, dominio público), y encima los puntos. El que se
// está verificando ahora late y lleva su nombre; los ya verificados quedan fijos, con su nombre cuando hay
// pocos. Arriba de todo, el alcance: global o local, con el motivo.
// =====================================================================================================
import { useEffect, useState } from 'react';
import { Badge } from './ui';
import { I_Globe } from './icons';
import { MUNDO_ALTO, MUNDO_ANCHO, MUNDO_SVG } from '../data/mundo';
import { baseApi, token } from '../api/cliente';

type Lugar = {
  codigo: string; nombre: string; ciudad: string;
  lat: number; lon: number; verificando: boolean;
  anuncios: number; cuando: string; deDonde: string;
};
type Mapa = {
  lugares: Lugar[];
  alcance: { tipo: 'global' | 'local'; porque: string };
  plaza: string | null;
  resumen: string;
};

/** La longitud y la latitud a un punto del mapa: la misma proyección que usa el camino del mundo. */
const aPunto = (lon: number, lat: number) => ({
  x: Math.round(((lon + 180) / 360) * MUNDO_ANCHO * 10) / 10,
  y: Math.round(((90 - lat) / 180) * MUNDO_ALTO * 10) / 10,
});

export function MapaDelMotor() {
  const [mapa, setMapa] = useState<Mapa | null>(null);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    let vivo = true;
    const traer = async () => {
      try {
        const r = await fetch(baseApi() + '/api/mapa', {
          headers: token() ? { Authorization: 'Bearer ' + token() } : {},
        });
        if (!r.ok) return;
        const j = (await r.json()) as Mapa;
        if (vivo) { setMapa(j); setFallo(false); }
      } catch { if (vivo) setFallo(true); }
    };
    void traer();
    // Cada 6 segundos: lo que importa es ver el punto encenderse cuando el motor sale a leer.
    const reloj = setInterval(() => void traer(), 6000);
    return () => { vivo = false; clearInterval(reloj); };
  }, []);

  if (!mapa && !fallo) return null; // mientras no haya nada que mostrar, no ocupa lugar

  const lugares = mapa?.lugares ?? [];
  const verificando = lugares.filter(l => l.verificando);
  // Los nombres de los que están encendidos siempre; los ya verificados sólo si son pocos (si no, tapan el mapa).
  const conNombre = verificando.length
    ? verificando
    : (lugares.length <= 4 ? lugares : lugares.slice(0, 4));

  return (
    <div className="mapa-motor">
      <div className="mapa-head">
        <span className="row" style={{ gap: 8 }}>
          <I_Globe size={14} style={{ color: 'var(--purple3)' }} />
          <b>Dónde está verificando</b>
        </span>
        <Badge tone={verificando.length ? 'green' : 'muted'}>
          {verificando.length
            ? `${verificando.length} ${verificando.length === 1 ? 'mercado' : 'mercados'} ahora`
            : lugares.length ? `${lugares.length} verificados` : 'sin verificar'}
        </Badge>
      </div>

      <svg className="mapa-svg" viewBox={`0 0 ${MUNDO_ANCHO} ${MUNDO_ALTO}`} role="img"
        aria-label={mapa?.resumen ?? 'mapa del motor'}>
        <path d={MUNDO_SVG} className="mapa-tierra" />
        {lugares.map(l => {
          const p = aPunto(l.lon, l.lat);
          return (
            <g key={`${l.codigo}-${l.ciudad}`} className={l.verificando ? 'mapa-lugar activo' : 'mapa-lugar'}>
              {l.verificando && <circle className="mapa-halo" cx={p.x} cy={p.y} r="2.2" />}
              <circle className="mapa-punto" cx={p.x} cy={p.y} r={l.verificando ? 1.7 : 1.2} />
              <title>{`${l.ciudad || l.nombre}${l.ciudad ? ` (${l.nombre})` : ''}${l.verificando ? ' · verificando ahora' : l.anuncios ? ` · ${l.anuncios} anuncios leídos` : ''}${l.cuando && !l.verificando ? ` · ${l.cuando}` : ''} — ${l.deDonde}`}</title>
            </g>
          );
        })}
        {conNombre.map(l => {
          const p = aPunto(l.lon, l.lat);
          return (
            <text key={`t-${l.codigo}-${l.ciudad}`} className={l.verificando ? 'mapa-nombre activo' : 'mapa-nombre'}
              x={Math.min(p.x + 2.6, MUNDO_ANCHO - 2)} y={p.y + 1.1}>
              {l.ciudad || l.nombre}
            </text>
          );
        })}
      </svg>

      <div className="mapa-pie">
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <span className={`badge ${mapa?.alcance.tipo === 'global' ? 'badge-purple' : 'badge-muted'}`}
            title={mapa?.alcance.porque}>
            Búsqueda {mapa?.alcance.tipo === 'global' ? 'global' : 'local'}
          </span>
          <span className="tiny muted">{mapa?.resumen}</span>
        </div>
        <div className="acc-why" style={{ marginTop: 6 }}>
          {verificando.length
            ? <>Se está mirando <b>{verificando.map(l => l.ciudad || l.nombre).join(', ')}</b> en este momento: son los mercados donde el motor sale a leer los anuncios de su rubro.</>
            : lugares.length
              ? <>El motor ya verificó <b>{lugares.map(l => l.ciudad || l.nombre).join(', ')}</b>. El punto se enciende cuando sale a leer de nuevo.</>
              : 'Todavía no salió a verificar ningún mercado: lo hace cuando corre el motor.'}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Card, Badge, Button } from './ui';
import { I_Zap, I_Check, I_ArrowRight, I_Refresh } from './icons';
import { ETAPAS_MOTOR, CHAT_MOTOR, VOTOS_MOTOR } from '../data/demo';
import {
  PERFILES, rankingDe, puntaje, objecion, CUANTAS_PASAN, CUANTAS_VARIANTES,
  TARIFA, costoMejora, variantesDe, type Opcion,
} from '../data/mirofish';
import { useDetalle, type Bloque } from './Detalle';

// =============================================================================================
// EL MOTOR ANDANDO — mercado secundario predictivo (portado del dashboard original)
//
// Es el vidrio del motor: la propuesta se prueba en un mercado simulado ANTES de gastar un peso.
// Se ve la etapa, el sentimiento, el score, los votos y las reacciones.
//
// Las piezas del filtro son las 5 de la ronda y su puntaje es el promedio de los 5 jueces: es el
// mismo veredicto que ya está en el paso de MiroFish, así que acá no hay números sueltos.
// =============================================================================================

const COLOR: Record<string, string> = { positivo: '#34d399', negativo: '#f87171', analisis: '#a855f7' };

/** El lote del motor: las 5 piezas de la ronda, ordenadas del 1 al 5 por el promedio de los jueces. */
const LOTE = rankingDe();
/** El puntaje de cada pieza, en el orden del ranking: es lo que dibuja el score. */
const PUNTAJES = LOTE.map(puntaje);
const EMOJI: Record<string, string> = { 'Video vertical': '📹', Imagen: '🖼️', Carrusel: '🎞️', Reel: '🎬' };

/** La etapa 4 hablaba de un voto por bot: en el modelo del producto los que votan son los 5 jueces. */
const ETAPAS = ETAPAS_MOTOR.map(e => e.t === 'Votación'
  ? { ...e, d: 'Los 5 jueces puntúan cada pieza y su promedio define el puesto en el lote.' }
  : e);

/** Lo que decidiste sobre una pieza. Queda a la vista: mueve el contador y tiñe la pieza. */
type EstadoPieza = 'aprobada' | 'correccion';

export function MotorEnVivo({ setToast }: { setToast: (t: string) => void }) {
  const detalle = useDetalle();
  const [pos, setPos] = useState(0);
  const [paso, setPaso] = useState(4); // arranca en Ranking (etapa 5/6) para que se vea trabajando
  const [chat, setChat] = useState<{ id: number; t: string; m: string }[]>(
    CHAT_MOTOR.slice(0, 8).map((c, i) => ({ id: 120 + i * 37, ...c })),
  );
  const [votos, setVotos] = useState<{ id: number; v: string }[]>([
    { id: 349, v: 'Aprueba' }, { id: 412, v: 'Aprueba con reserva' },
    { id: 178, v: 'Rechaza' }, { id: 265, v: 'Aprueba' }, { id: 490, v: 'Neutro' },
  ]);
  const [sent, setSent] = useState({ pos: 19, neg: 5, ana: 3 });

  // Lo que ya decidiste, pieza por pieza: no se va solo, queda en la pantalla con su contador.
  const [estado, setEstado] = useState<Record<string, EstadoPieza>>({});
  // La línea con lo que va a pasar después de cada botón.
  const [consecuencia, setConsecuencia] = useState<{ ok: boolean; texto: string } | null>(null);

  useEffect(() => {
    let n = 0;
    let etapa = 4;
    const id = setInterval(() => {
      n++;
      const cuantos = Math.random() < 0.5 ? 1 : 2;
      const nuevos: { id: number; t: string; m: string }[] = [];
      for (let k = 0; k < cuantos; k++) {
        const c = CHAT_MOTOR[Math.floor(Math.random() * CHAT_MOTOR.length)];
        nuevos.push({ id: 100 + Math.floor(Math.random() * 400), t: c.t, m: c.m });
      }
      setChat(prev => [...nuevos, ...prev].slice(0, 14));
      setSent(s => {
        let { pos: p, neg: g, ana: a } = s;
        nuevos.forEach(c => { if (c.t === 'positivo') p++; else if (c.t === 'negativo') g++; else a++; });
        return { pos: p, neg: g, ana: a };
      });
      if (n % 4 === 0) {
        etapa = etapa < 5 ? etapa + 1 : 0; // recorre las 6 etapas
        setPaso(etapa);
        if (etapa === 0) { // cerró la vuelta: la pieza siguiente entra al filtro
          setPos(x => (x + 1) % LOTE.length);
          setVotos([0, 1, 2, 3, 4].map(() => ({ id: 100 + Math.floor(Math.random() * 400), v: VOTOS_MOTOR[Math.floor(Math.random() * VOTOS_MOTOR.length)] })));
        }
      }
    }, 1100);
    return () => clearInterval(id);
  }, []);

  const pieza = LOTE[pos];
  const score = PUNTAJES[pos]; // el promedio de los 5 jueces: es el puntaje real de la pieza
  const aprueba = score >= 80;
  const total = sent.pos + sent.neg + sent.ana;
  const pctPublico = Math.round((sent.pos / total) * 100);
  const deLos500 = Math.round((pctPublico / 100) * 500);
  const oj = objecion(pieza); // la objeción que manda: el juez que votó más bajo
  const estadoPieza = estado[pieza.id];
  const aprobadas = LOTE.filter(o => estado[o.id] === 'aprobada').length;
  const enCorreccion = LOTE.filter(o => estado[o.id] === 'correccion').length;

  const cuentaVotos: Record<string, number> = {};
  votos.forEach(v => { cuentaVotos[v.v] = (cuentaVotos[v.v] || 0) + 1; });
  const filasVoto: [string, string][] = [['Aprueba', '#34d399'], ['Con reserva', '#a855f7'], ['Neutro', '#9ca3af'], ['Rechaza', '#f87171']];

  /** El voto de cada juez sobre una pieza, del que votó más bajo al que votó más alto. */
  const juecesDe = (o: Opcion) => PERFILES
    .map(p => ({ nombre: p.nombre, mira: p.mira, voto: o.votos[p.k], opinion: o.opiniones[p.k] }))
    .sort((a, b) => a.voto - b.voto);

  /** Deja la decisión a la vista: cambia el estado de la pieza, sube el contador y escribe qué pasa. */
  const marcar = (nuevo: EstadoPieza, texto: string, aviso: string) => {
    setEstado(prev => ({ ...prev, [pieza.id]: nuevo }));
    setConsecuencia({ ok: nuevo === 'aprobada', texto });
    setToast(aviso);
  };

  /** Botón 1: saca la pieza del filtro. Si no llega al mínimo, vuelve al motor con la objeción. */
  const sacarDelFiltro = () => {
    if (aprueba) {
      marcar('aprobada',
        `«${pieza.titulo}» queda aprobada y sale a tus redes con el texto que ya aprobaron los 5 jueces (${score}/100). Se mide el costo por venta y lo que no rinde se frena.`,
        `«${pieza.titulo}» aprobada: ${score}/100`);
    } else {
      marcar('correccion',
        `«${pieza.titulo}» no llega al mínimo (${score}/100): vuelve al motor con la objeción de ${oj.juez} y Nia la reescribe. No se publica ni se gasta un peso en publicidad.`,
        `«${pieza.titulo}» vuelve al motor: ${score}/100`);
    }
  };

  /** Corrige la pieza con la objeción que manda: es lo que hace el botón 3 y el detalle del veredicto. */
  const corregir = () => marcar('correccion',
    `«${pieza.titulo}» queda en corrección: Nia la reescribe contestando la objeción de ${oj.juez} y los 5 jueces la vuelven a votar. Son ${costoMejora().total} créditos y la pieza de ahora queda intacta.`,
    `«${pieza.titulo}» en corrección: Nia la reescribe`);

  // -------------------------------------------------------------------------------------------
  // BOTÓN 2 · POR QUÉ VOTARON ASÍ — el veredicto real: los 5 jueces, el público y el orden final
  // -------------------------------------------------------------------------------------------
  const bloquesVeredicto: Bloque[] = [
    { tipo: 'texto', texto: `Cada uno mira algo distinto y puntúa de 0 a 100. El promedio de los 5 es el puntaje de la pieza (${score}/100) y define el puesto en el lote.` },
    { tipo: 'filas', items: juecesDe(pieza).map(j => ({
      t: `${j.nombre} · ${j.mira}`,
      s: `«${j.opinion}»`,
      etiqueta: `${j.voto}/100`,
      tono: j.voto >= 85 ? 'green' : j.voto >= 70 ? 'amber' : 'red',
    })) },
    { tipo: 'datos', filas: [
      { k: 'La objeción que manda', v: `${oj.juez} · ${oj.voto}/100`, tono: 'amber', s: `«${oj.texto}»` },
      { k: 'El público de 500, en vivo', v: `${pctPublico}% a favor`, s: `de las ${total} reacciones que leyó el motor: ${sent.pos} a favor, ${sent.neg} en contra y ${sent.ana} pidiendo más información` },
      { k: 'Si la reacción se sostiene', v: `${deLos500} de los 500`, s: 'los 500 reaccionan en vivo y nunca se cobran: la publicidad se paga recién cuando la pieza sale' },
      { k: 'Puntaje de los 5 jueces', v: `${score}/100`, s: aprueba ? 'arriba del mínimo de 80: la pieza se puede publicar' : 'abajo del mínimo de 80: vuelve al motor con esa objeción' },
    ] },
    { tipo: 'filas', items: LOTE.map((o, i) => ({
      t: `${i + 1}º · ${o.titulo}${o.id === pieza.id ? ' (la que está en el filtro)' : ''}`,
      s: `${o.formato} · ${o.medida} · los 5 votos: ${PERFILES.map(p => o.votos[p.k]).join(' · ')}`,
      etiqueta: `${puntaje(o)} · ${i < CUANTAS_PASAN ? 'pasa' : 'queda'}`,
      tono: i < CUANTAS_PASAN ? 'green' : 'muted',
    })) },
    { tipo: 'texto', texto: `Se ordenan del 1 al ${LOTE.length} por el promedio: las ${CUANTAS_PASAN} primeras pasan a producción y las otras quedan guardadas con el voto de cada juez, así se ve qué les faltó.` },
    aprueba
      ? { tipo: 'aviso', tono: 'green', texto: `Con ${score}/100 la pieza pasa el mínimo: se puede publicar y no vuelve al motor.` }
      : { tipo: 'aviso', tono: 'amber', texto: `Con ${score}/100 la pieza no llega al mínimo: no se publica y vuelve con la objeción de ${oj.juez}.` },
  ];

  const abrirVeredicto = () => detalle({
    titulo: `Por qué votaron así: «${pieza.titulo}»`,
    sub: `${pieza.formato} · ${pieza.medida}. Acá está el voto de cada juez, la reacción de los 500 del público y cómo quedaron las ${LOTE.length} piezas del lote.`,
    bloques: bloquesVeredicto,
    fuente: 'Es el mismo veredicto que ya está en el paso de MiroFish: los 5 jueces y los 500 del público sobre las 5 piezas de la ronda. Acá no se gasta un peso.',
    acciones: [
      { label: 'Corregir la objeción más dura', variante: 'primary', onClick: corregir },
      { label: 'No hacer nada por ahora', onClick: () => setToast('Sin cambios: la pieza sigue en el filtro') },
    ],
  });

  // -------------------------------------------------------------------------------------------
  // BOTÓN 3 · CORREGIR LO QUE OBJETARON — qué cambia Nia y cuánto cuesta, antes de pedirlo
  // -------------------------------------------------------------------------------------------
  const abrirCorreccion = () => detalle({
    titulo: `Corregir lo que objetaron en «${pieza.titulo}»`,
    sub: 'Nia reescribe la pieza contestando la objeción del juez que votó más bajo y los 5 jueces la vuelven a votar. La pieza que ves ahora no se toca.',
    bloques: [
      { tipo: 'datos', filas: [
        { k: 'La objeción que manda', v: `${oj.juez} · ${oj.voto}/100`, tono: 'amber', s: `«${oj.texto}»` },
        { k: 'Puntaje de hoy', v: `${score}/100`, s: `los 5 votos: ${PERFILES.map(p => pieza.votos[p.k]).join(' · ')}` },
        { k: 'Variantes que escribe', v: String(CUANTAS_VARIANTES), s: 'cada una cambia una sola cosa, así se sabe qué la mejora' },
        { k: 'Lo que cuesta', v: `${costoMejora().total} créditos`, s: `${CUANTAS_VARIANTES} × ${TARIFA.crearVariante} por escribirla + ${CUANTAS_VARIANTES} × ${TARIFA.evaluarPieza} por votarla` },
        { k: 'Dónde las ves', v: 'Campañas, en la galería', s: 'con el voto nuevo al lado del anterior' },
      ] },
      { tipo: 'filas', items: variantesDe(pieza).map(v => ({
        t: v.titulo,
        s: `Qué cambia: ${v.queCambia}`,
        etiqueta: `${puntaje(v)} · vuelve al filtro`,
        tono: puntaje(v) >= 80 ? 'green' : 'amber',
      })) },
      { tipo: 'pasos', items: [
        `Nia contesta la objeción de ${oj.juez} sin tocar el resto de la pieza.`,
        'Los 5 jueces vuelven a puntuar cada variante y las ordenan.',
        `Las ${CUANTAS_PASAN} mejores quedan listas para publicar.`,
      ] },
      { tipo: 'aviso', tono: 'amber', texto: 'Esto no gasta publicidad: se paga en créditos. Y la pieza de hoy queda guardada con su voto, así podés volver a ella si te gustaba más.' },
    ],
    fuente: `Sale del veredicto de los 5 jueces sobre «${pieza.titulo}» y de la objeción del que votó más bajo.`,
    acciones: [
      { label: 'Que Nia la corrija', variante: 'primary', onClick: corregir },
      { label: 'Dejarla como está', onClick: () => setToast('Sin cambios: la pieza queda como está') },
    ],
  });

  return (
    <Card
      title={<><I_Zap size={15} style={{ marginRight: 8, color: 'var(--purple4)' }} /> El motor andando: mercado secundario predictivo</>}
      action={<span className="badge badge-green" style={{ fontSize: 10 }}>en vivo</span>}
    >
      <div className="small muted" style={{ marginBottom: 14, lineHeight: 1.5 }}>
        Tu propuesta se prueba acá antes de salir a internet. Esto es lo que pasa <b>ahora mismo</b>:
      </div>

      <div className="motor-split">
        {/* ============ IZQUIERDA: el proceso ============ */}
        <div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(168,85,247,.35)', background: 'rgba(124,58,237,.08)' }}>
            <span style={{ fontSize: 22 }}>{EMOJI[pieza.formato]}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="small" style={{ fontWeight: 700 }}>En el filtro: {pieza.titulo}</div>
              <div className="tiny muted">{pieza.formato} · {pieza.medida} · los 5 jueces le pusieron {score}/100</div>
            </div>
            {estadoPieza && (
              <Badge tone={estadoPieza === 'aprobada' ? 'green' : 'amber'}>
                {estadoPieza === 'aprobada' ? 'aprobada' : 'en corrección'}
              </Badge>
            )}
            <Badge tone="purple">Etapa {paso + 1}/6</Badge>
          </div>

          <div className="motor-kpis">
            {/* sentimiento */}
            <div style={{ padding: 10, borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--bg2)' }}
              title={`La reacción de los 500 del público en vivo: ${sent.pos} a favor, ${sent.neg} en contra y ${sent.ana} pidiendo más información.`}>
              <div className="tiny muted" style={{ fontWeight: 700, marginBottom: 6 }}>Sentimiento del mercado</div>
              <div style={{ display: 'flex', height: 44, borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ width: (sent.pos / total) * 100 + '%', background: 'linear-gradient(180deg,#34d399,#059669)', transition: 'width .5s ease' }} />
                <div style={{ width: (sent.neg / total) * 100 + '%', background: 'linear-gradient(180deg,#f87171,#dc2626)', transition: 'width .5s ease' }} />
                <div style={{ width: (sent.ana / total) * 100 + '%', background: 'linear-gradient(180deg,#a855f7,#7c3aed)', transition: 'width .5s ease' }} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                <span className="tiny" style={{ color: '#34d399' }}>▲ {sent.pos}</span>
                <span className="tiny" style={{ color: '#f87171' }}>▼ {sent.neg}</span>
                <span className="tiny" style={{ color: '#a855f7' }}>● {sent.ana}</span>
              </div>
            </div>

            {/* score por pieza */}
            <div style={{ padding: 10, borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--bg2)' }}
              title={`El promedio de los 5 jueces para cada pieza del lote, en el orden del ranking. El punto marca la que está en el filtro: «${pieza.titulo}», ${score}/100.`}>
              <div className="tiny muted" style={{ fontWeight: 700, marginBottom: 6 }}>Score, pieza por pieza</div>
              <svg width="100%" height="44" viewBox="0 0 100 40" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="v2spark" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {(() => {
                  const datos = PUNTAJES;
                  const min = 70, max = 90;
                  const pts = datos.map((v, i) => [8 + (i / Math.max(1, datos.length - 1)) * 84, 36 - ((v - min) / (max - min)) * 32]);
                  const line = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
                  const area = line + ' L ' + pts[pts.length - 1][0].toFixed(1) + ' 38 L ' + pts[0][0].toFixed(1) + ' 38 Z';
                  const actual = pts[pos];
                  return (<g>
                    <path d={area} fill="url(#v2spark)" />
                    <path d={line} fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx={actual[0]} cy={actual[1]} r="3" fill="#a855f7" />
                  </g>);
                })()}
              </svg>
              <div className="tiny" style={{ color: '#a855f7', fontWeight: 800, marginTop: 2 }}>{score}/100 · la del filtro</div>
            </div>

            {/* distribución de votos */}
            <div style={{ padding: 10, borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--bg2)' }}
              title="Lo que está diciendo el público en este momento: de cada 5 reacciones, cuántas aprueban, cuántas dudan y cuántas rechazan.">
              <div className="tiny muted" style={{ fontWeight: 700, marginBottom: 6 }}>Distribución de votos</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {filasVoto.map(([lab, col]) => {
                  const n = cuentaVotos[lab] || 0;
                  return (
                    <div key={lab} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="tiny" style={{ width: 58, color: col, flexShrink: 0, fontSize: 10 }}>{lab}</span>
                      <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--bg3)', overflow: 'hidden' }}>
                        <div style={{ width: (n / (votos.length || 1)) * 100 + '%', height: '100%', background: col, transition: 'width .5s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* las 6 etapas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ETAPAS.map((f, i) => {
              const fase = paso > i ? 'hecho' : paso === i ? 'activo' : 'pendiente';
              return (
                <div key={i} style={{
                  display: 'flex', gap: 10, alignItems: 'center', padding: '9px 12px', borderRadius: 10, transition: 'all .3s ease',
                  border: '1px solid ' + (fase === 'activo' ? '#a855f7' : fase === 'hecho' ? 'rgba(52,211,153,.4)' : 'var(--border2)'),
                  background: fase === 'activo' ? 'rgba(124,58,237,.10)' : fase === 'hecho' ? 'rgba(52,211,153,.06)' : 'var(--bg2)',
                }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 800, flexShrink: 0, color: '#fff',
                    background: fase === 'pendiente' ? 'var(--bg3)' : fase === 'activo' ? 'linear-gradient(90deg,#7c3aed,#a855f7)' : '#34d399',
                    boxShadow: fase === 'activo' ? '0 0 14px rgba(168,85,247,.55)' : 'none',
                  }}>
                    {fase === 'hecho' ? <I_Check size={15} /> : i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="small" style={{ fontWeight: 700, color: fase === 'activo' ? '#a855f7' : 'inherit' }}>{f.t}</div>
                    {fase === 'activo' && <div className="tiny muted" style={{ marginTop: 1 }}>{f.d}</div>}
                  </div>
                  {fase === 'activo' && <span className="tiny" style={{ color: '#a855f7', fontWeight: 700 }}>● ahora</span>}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center', padding: '12px 14px', borderRadius: 12, background: 'rgba(124,58,237,.10)', border: '1px solid rgba(124,58,237,.25)' }}>
            <div style={{ fontSize: 26 }}>🧠</div>
            <div style={{ flex: 1 }}>
              <div className="small" style={{ fontWeight: 700 }}>Score: {score}/100</div>
              <div className="tiny muted">{aprueba ? 'Los 5 jueces sugieren PUBLICAR esta pieza.' : 'Los 5 jueces todavía no la aprueban: vuelve con la objeción.'}</div>
            </div>
            <Badge tone={aprueba ? 'green' : 'amber'}>{aprueba ? 'Pasa el mínimo' : 'Vuelve con la objeción'}</Badge>
          </div>
        </div>

        {/* ============ DERECHA: el mercado reaccionando ============ */}
        <div style={{ border: '1px solid var(--border2)', borderRadius: 12, background: 'var(--bg2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '10px 12px', borderBottom: '1px solid var(--border2)', background: 'var(--bg3)' }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: '#ef4444', boxShadow: '0 0 0 3px rgba(239,68,68,.25)', animation: 'livepulse 1.5s infinite' }} />
            <span className="small" style={{ fontWeight: 700 }}>El público, reacción en vivo</span>
            <span className="tiny muted" style={{ marginLeft: 'auto' }}>500 personas del público</span>
          </div>
          <div style={{ flex: 1, maxHeight: 380, overflowY: 'auto', padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 7 }}>
            {chat.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', fontSize: 11.5, lineHeight: 1.35 }}>
                <span style={{ fontWeight: 800, color: COLOR[m.t], flexShrink: 0 }}>#{m.id}</span>
                <span style={{ color: 'var(--txt)', overflowWrap: 'anywhere' }}>{m.m}</span>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid var(--border2)', padding: '8px 10px', background: 'var(--bg3)' }}>
            <div className="tiny" style={{ fontWeight: 700, marginBottom: 4 }}>Lo que está reaccionando ahora</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {votos.map((v, i) => (
                <span key={i} className="tiny" style={{
                  padding: '2px 8px', borderRadius: 999,
                  background: v.v === 'Aprueba' ? 'rgba(52,211,153,.16)' : v.v === 'Rechaza' ? 'rgba(248,113,113,.16)' : 'rgba(168,85,247,.16)',
                  color: v.v === 'Aprueba' ? '#34d399' : v.v === 'Rechaza' ? '#f87171' : '#a855f7',
                }}>
                  #{v.id} · {v.v}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ============ CIERRE: el filtro + qué hace cada botón ============ */}
      <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 12, background: 'rgba(34,211,238,.08)', border: '1px solid rgba(34,211,238,.25)' }}>
        <div className="tiny muted"><b style={{ color: '#22d3ee' }}>🔒 El filtro antes de salir live:</b> solo lo que convence acá se publica; lo que no, se descarta y enseña al sistema.</div>
      </div>

      <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
        <div className="dato" title="Las piezas que sacaste del filtro: ya salen a tus redes con el texto que aprobaron los 5 jueces">
          <span className="dato-l">Aprobadas por vos</span>
          <span className="dato-v" style={{ color: 'var(--green)' }}>{aprobadas}</span>
        </div>
        <div className="dato" title="Las que volvieron al motor con la objeción del juez que votó más bajo: Nia las reescribe y se votan de nuevo">
          <span className="dato-l">En corrección</span>
          <span className="dato-v" style={{ color: 'var(--amber)' }}>{enCorreccion}</span>
        </div>
        <div className="dato" title="Las 5 piezas de esta ronda: se ordenan del 1 al 5 por el promedio de los jueces y las 3 primeras pasan">
          <span className="dato-l">Piezas del lote</span>
          <span className="dato-v">{LOTE.length}</span>
        </div>
      </div>

      <div className="row" style={{ gap: 9, marginTop: 12, flexWrap: 'wrap' }}>
        {estadoPieza === 'aprobada' ? (
          <div className="tiny" style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--green)', fontWeight: 700 }}>
            <I_Check size={13} /> Aprobada: queda lista para salir a tus redes con el texto que ya aprobaron los 5 jueces.
          </div>
        ) : (
          <Button variant={aprueba ? 'primary' : 'outline'} className="btn-sm"
            title={aprueba
              ? `Publica «${pieza.titulo}» con el texto que ya aprobaron los 5 jueces (${score}/100) y el ${pctPublico}% de los 500 del público a favor. Queda aprobada en esta pantalla: pasa al contador de arriba.`
              : `El puntaje es ${score}/100 y no llega al mínimo de 80: la pieza no se publica, vuelve al motor con la objeción de ${oj.juez} y queda en corrección. No se gasta un peso.`}
            onClick={sacarDelFiltro}>
            <I_Check size={13} /> {aprueba ? 'Sacar del filtro y publicar' : 'Pedir otra ronda al motor'}
          </Button>
        )}
        <Button variant="ghost" className="btn-sm"
          title="Abre el voto de los 5 jueces sobre esta pieza, la reacción en vivo de los 500 del público y cómo quedaron las 5 piezas del lote ordenadas del 1 al 5. No publica nada."
          onClick={abrirVeredicto}>
          <I_ArrowRight size={13} /> Ver por qué votaron así
        </Button>
        {estadoPieza === 'correccion' ? (
          <div className="tiny" style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--amber)', fontWeight: 700 }}>
            <I_Refresh size={13} /> En corrección: Nia la reescribe con la objeción de {oj.juez} y los 5 jueces la vuelven a votar.
          </div>
        ) : (
          <Button variant="ghost" className="btn-sm"
            title={estadoPieza === 'aprobada'
              ? `La pieza ya está aprobada y sale a tus redes: si la corregís con Nia, vuelve al motor en corrección y el contador de aprobadas baja en uno. La versión que aprobaste queda guardada con su voto.`
              : `Muestra cómo la corrige Nia: contesta la objeción de ${oj.juez} (${oj.voto}/100) y los 5 jueces la vuelven a votar. La pieza de ahora queda intacta.`}
            onClick={abrirCorreccion}>
            {estadoPieza === 'aprobada' ? 'Corregirla igual (vuelve al motor)' : 'Corregir lo que objetaron'}
          </Button>
        )}
      </div>

      {consecuencia && (
        <div className="tiny" style={{ marginTop: 9, color: consecuencia.ok ? 'var(--green)' : 'var(--amber)', fontWeight: 700, lineHeight: 1.5 }}>
          {consecuencia.ok ? '✓' : '↺'} {consecuencia.texto}
        </div>
      )}

      <div className="acc-why">
        <b>Publicar</b> es lo único que gasta dinero y necesita tu OK si estás en modo Compartido.{' '}
        <b>Ver por qué votaron así</b> abre el voto de los 5 jueces y la reacción de los 500 del público, sin cambiar nada.{' '}
        <b>Corregir</b> pone la pieza en corrección: Nia la reescribe y la pieza de ahora queda intacta. Los contadores de arriba quedan con lo que decidiste.
      </div>
    </Card>
  );
}

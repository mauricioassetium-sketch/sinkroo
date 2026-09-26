import { useMemo, useState } from 'react';
import { Card, Badge, Button } from './ui';
import { I_Zap, I_Check, I_ArrowRight, I_Refresh, I_Vote } from './icons';
import { ETAPAS_MOTOR } from '../data/demo';
import { CUANTAS_PASAN, TARIFA } from '../data/mirofish';
import { useDetalle, type Bloque } from './Detalle';
import { useDatos, type Evaluacion } from '../api/datos';
import { EstadoVacio } from './EstadoVacio';
import { useEvaluacion, etiquetaReaccion, colorReaccion } from './mirofishDatos';
import type { PasoCampana } from './CampanaPasos';

// =============================================================================================
// EL MOTOR ANDANDO — mercado secundario predictivo
//
// Es el vidrio del motor: la propuesta se prueba en un mercado predictivo ANTES de gastar un peso.
//
// DE DÓNDE SALE CADA COSA (la regla de la casa):
//   · El lote son las evaluaciones que este negocio ya tiene en MiroFish, y el detalle de cada pieza
//     —sus 5 votos, la reacción de su público y su predicción— se pide a `GET /api/mirofish/:id`.
//   · Aquí no hay un solo número que el back no haya producido: si un dato no existe, no se muestra.
//     No se simula, no se inventa y no hay lote de ejemplo: en este archivo no hay azar ni sorteos.
//   · Sin evaluaciones no hay filtro: en vez de rellenarlo con un ejemplo, se dice qué hacer para
//     tener la primera. Lo único que queda fijo es la explicación del producto (las etapas del motor
//     y el precio en créditos), que no es dato de ningún negocio.
// =============================================================================================

const EMOJI: Record<string, string> = { 'Video vertical': '📹', Imagen: '🖼️', Carrusel: '🎞️', Reel: '🎬' };

/** La etapa 4 hablaba de un voto por bot: en el modelo del producto los que votan son los 5 jueces. */
const ETAPAS = ETAPAS_MOTOR.map(e => e.t === 'Votación'
  ? { ...e, d: 'Los 5 jueces puntúan cada pieza y su promedio define el puesto en el lote.' }
  : e);

/** Lo que el negocio decidió sobre una pieza. Queda a la vista: mueve el contador y tiñe la pieza. */
type EstadoPieza = 'aprobada' | 'correccion';

/** Una pieza del lote: la evaluación guardada y, cuando se pide, el detalle de sus jueces y su público. */
type Pieza = {
  id: string;
  titulo: string;
  puntaje: number;
  orden: number | null;
  formato: string;
  medida: string;
  jueces: { juez: string; criterio: string; voto: number; opinion: string }[];
  reacciones: { reaccion: string; n: number }[];
  comentarios: { n: number | null; texto: string; reaccion: string }[];
  totalPublico: number | null;
  predicho: number | null;
  observado: number | null;
  desvio: number | null;
};

/** Una evaluación del back, todavía sin su detalle: el detalle se pide al elegirla. */
const piezaDelBack = (e: Evaluacion): Pieza => ({
  id: e.id, titulo: e.titulo, puntaje: Number(e.puntaje) || 0, orden: e.orden ?? null,
  formato: '', medida: '',
  jueces: [], reacciones: [], comentarios: [],
  totalPublico: e.total_publico ?? null, predicho: null, observado: null, desvio: null,
});

const colorScore = (s: number) => (s >= 80 ? 'var(--green)' : s >= 60 ? 'var(--amber)' : 'var(--red)');
const palabraVeredicto = (s: number) => (s >= 80 ? 'Pasa el mínimo' : s >= 60 ? 'Vuelve con la objeción' : 'No se lanza');

export function MotorEnVivo({ setToast, ir }: { setToast: (t: string) => void; ir?: (p: PasoCampana) => void }) {
  const detalle = useDetalle();
  const d = useDatos();

  // --- El lote: las evaluaciones de este negocio, ordenadas por el puesto que les dio MiroFish.
  const lote = useMemo<Pieza[]>(() => [...d.evaluaciones]
    .sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999) || (Number(b.puntaje) || 0) - (Number(a.puntaje) || 0))
    .map(piezaDelBack), [d.evaluaciones]);

  const [elegida, setElegida] = useState<string | null>(null);
  const base = lote.find(o => o.id === elegida) ?? lote[0] ?? null;
  // El detalle de la pieza elegida: sus 5 votos, las reacciones del público y la predicción.
  const { dato, cargando } = useEvaluacion(base ? base.id : null);

  const pieza = useMemo<Pieza | null>(() => {
    if (!base) return null;
    if (!dato) return base;
    return {
      ...base,
      puntaje: dato.evaluacion.puntaje ?? base.puntaje,
      orden: dato.evaluacion.orden ?? base.orden,
      totalPublico: dato.evaluacion.total_publico ?? base.totalPublico,
      jueces: dato.votos,
      reacciones: dato.reacciones,
      comentarios: dato.opiniones.map(o => ({ n: o.agente_numero, texto: o.comentario, reaccion: o.reaccion })),
      predicho: dato.prediccion?.predicho ?? null,
      observado: dato.prediccion?.observado ?? null,
      desvio: dato.prediccion?.desvio_pct ?? null,
    };
  }, [base, dato]);

  // Lo que el negocio ya decidió, pieza por pieza: no se va solo, queda en la pantalla con su contador.
  const [estado, setEstado] = useState<Record<string, EstadoPieza>>({});
  const [consecuencia, setConsecuencia] = useState<{ ok: boolean; texto: string } | null>(null);

  // --- El panel está trayendo lo que hay evaluado: mientras lee no se afirma nada.
  if (d.cargando && lote.length === 0) {
    return (
      <Card title={<><I_Zap size={15} style={{ marginRight: 8, color: 'var(--purple4)' }} /> El motor en marcha: mercado secundario predictivo</>}
        action={<Badge tone="muted">leyendo</Badge>}>
        <EstadoVacio
          icono={<I_Vote size={22} />}
          titulo="Leyendo lo que hay en MiroFish…"
          texto="Un segundo: el panel está trayendo del servidor las piezas que este negocio ya evaluó, con el voto de los 5 jueces y la reacción de su público."
        />
      </Card>
    );
  }

  // --- Sin nada evaluado no hay filtro: aquí no va ni una pieza de ejemplo. Dice qué hacer para
  // llenarlo, que es lo único que le sirve al dueño.
  if (!pieza) {
    return (
      <Card title={<><I_Zap size={15} style={{ marginRight: 8, color: 'var(--purple4)' }} /> El motor en marcha: mercado secundario predictivo</>}
        action={<Badge tone="muted">sin piezas en el filtro</Badge>}>
        <EstadoVacio
          icono={<I_Vote size={22} />}
          titulo="Aquí se ve el mercado trabajando"
          texto="Todavía no hay nada suyo en el filtro: mande sus piezas a MiroFish y esto se llena. Cada pieza evaluada aparece aquí con el voto de los 5 jueces, la reacción de los 500 del público y la predicción del modelo."
          {...(ir ? { accion: 'Ir al paso 1', onAccion: () => ir(1) } : {})}
        />
      </Card>
    );
  }

  const aprueba = pieza.puntaje >= 80;
  const jueces = [...pieza.jueces].sort((a, b) => a.voto - b.voto);   // del que votó más bajo al más alto
  const masDuro = jueces.length ? jueces[0] : null;
  const reacciones = [...pieza.reacciones].sort((a, b) => b.n - a.n);
  const totalReacciones = pieza.reacciones.reduce((s, r) => s + r.n, 0);
  const publicoTotal = pieza.totalPublico ?? (totalReacciones || null);
  const puntajes = lote.map(o => o.puntaje);
  const minP = Math.min(...puntajes);
  const maxP = Math.max(...puntajes);
  const rangoP = Math.max(1, maxP - minP);
  const pos = Math.max(0, lote.findIndex(o => o.id === pieza.id));
  const estadoPieza = estado[pieza.id];
  const listas = lote.filter(o => estado[o.id] === 'aprobada').length;
  const enCorreccion = lote.filter(o => estado[o.id] === 'correccion').length;

  /** La línea con la reacción del público, en palabras: es lo que hace el detalle del veredicto. */
  const reaccionDicha = reacciones.length
    ? reacciones.map(r => `${r.n} ${etiquetaReaccion(r.reaccion).toLowerCase()}`).join(' · ')
    : '';

  /** Deja la decisión a la vista: cambia el estado de la pieza, sube el contador y escribe qué pasa. */
  const marcar = (nuevo: EstadoPieza, texto: string, aviso: string) => {
    setEstado(prev => ({ ...prev, [pieza.id]: nuevo }));
    setConsecuencia({ ok: nuevo === 'aprobada', texto });
    setToast(aviso);
  };

  /** Botón 1: saca la pieza del filtro. Si no llega al mínimo, queda marcada para corrección. */
  const sacarDelFiltro = () => {
    if (aprueba) {
      marcar('aprobada',
        `«${pieza.titulo}» queda marcada como lista en esta pantalla (${pieza.puntaje}/100). No sale a sus redes desde aquí: la publicación en sus cuentas es un paso aparte, y esta marca no lo adelanta.`,
        `«${pieza.titulo}» marcada como lista: ${pieza.puntaje}/100`);
    } else {
      marcar('correccion',
        `«${pieza.titulo}» no llega al mínimo (${pieza.puntaje}/100):${masDuro ? ` lo que hay que contestar es la objeción de ${masDuro.juez}.` : ''} No se publica ni se gasta un peso en publicidad, y pedirle la corrección al motor todavía no sale de esta pantalla.`,
        `«${pieza.titulo}» marcada para corrección: ${pieza.puntaje}/100`);
    }
  };

  /** Corrige la pieza con la objeción que manda: es lo que hace el botón 3 y el detalle del veredicto. */
  const corregir = () => marcar('correccion',
    `«${pieza.titulo}» queda marcada para corrección en esta pantalla: lo que hay que contestar es la objeción de ${masDuro?.juez ?? 'el juez que votó más bajo'}. Pedirle la corrección al motor es un paso aparte y todavía no sale de aquí.`,
    `«${pieza.titulo}» en corrección: queda marcada en el contador`);

  // -------------------------------------------------------------------------------------------
  // BOTÓN 2 · POR QUÉ VOTARON ASÍ — el veredicto real: los 5 jueces, el público y el orden del lote
  // -------------------------------------------------------------------------------------------
  const filasVeredicto: { k: string; v: string; s?: string; tono?: 'green' | 'amber' | 'red' | 'muted' }[] = [];
  if (masDuro) {
    filasVeredicto.push({ k: 'El juez que votó más bajo', v: `${masDuro.juez} · ${masDuro.voto}/100`, tono: 'amber', s: `«${masDuro.opinion}»` });
  }
  if (reaccionDicha) {
    filasVeredicto.push({
      k: `La reacción de los ${publicoTotal ?? 0} del público`,
      v: `${totalReacciones} reacciones guardadas`,
      s: reaccionDicha,
    });
  }
  if (pieza.predicho !== null) {
    filasVeredicto.push({
      k: 'Lo que el modelo predijo',
      v: `predijo ${pieza.predicho} · el público hizo ${pieza.observado ?? 0}`,
      s: pieza.desvio === null ? 'la comparación queda guardada con la pieza' : `desvío de ${pieza.desvio}% entre lo uno y lo otro`,
    });
  }
  filasVeredicto.push({
    k: 'Puntaje de la pieza',
    v: `${pieza.puntaje}/100`,
    s: aprueba ? 'arriba del mínimo de 80: la pieza se puede publicar' : 'abajo del mínimo de 80: no se publica hasta corregir eso',
  });

  const bloquesVeredicto: Bloque[] = [
    {
      tipo: 'texto',
      texto: 'Cada juez mira algo distinto y puntúa de 0 a 100. El puntaje de la pieza es el que quedó guardado en MiroFish, y es el que define su puesto en el lote.',
    },
    jueces.length
      ? { tipo: 'filas', items: jueces.map(j => ({
        t: `${j.juez}${j.criterio ? ` · ${j.criterio}` : ''}`,
        s: `«${j.opinion}»`,
        etiqueta: `${j.voto}/100`,
        tono: j.voto >= 85 ? 'green' as const : j.voto >= 70 ? 'amber' as const : 'red' as const,
      })) }
      : { tipo: 'aviso', texto: cargando ? 'Leyendo el voto de los 5 jueces…' : 'El servidor no devolvió el voto de los jueces para esta pieza.' },
    { tipo: 'datos', filas: filasVeredicto },
    { tipo: 'filas', items: lote.map((o, i) => ({
      t: `${i + 1}º · ${o.titulo}${o.id === pieza.id ? ' (la que está en el filtro)' : ''}`,
      s: o.jueces.length
        ? `los 5 votos: ${o.jueces.map(j => j.voto).join(' · ')}`
        : 'el detalle de sus votos está en su propia pieza',
      etiqueta: `${o.puntaje} · ${i < CUANTAS_PASAN ? 'pasa' : 'queda'}`,
      tono: i < CUANTAS_PASAN ? 'green' as const : 'muted' as const,
    })) },
    { tipo: 'texto', texto: `Se ordenan del 1 al ${lote.length} por el puntaje: las ${CUANTAS_PASAN} primeras pasan a producción y las otras quedan guardadas con el voto de cada juez, así se ve qué les faltó.` },
    aprueba
      ? { tipo: 'aviso', tono: 'green', texto: `Con ${pieza.puntaje}/100 la pieza pasa el mínimo: se puede publicar.` }
      : { tipo: 'aviso', tono: 'amber', texto: `Con ${pieza.puntaje}/100 la pieza no llega al mínimo: no se publica hasta contestar la objeción de ${masDuro?.juez ?? 'el juez que votó más bajo'}.` },
  ];

  const abrirVeredicto = () => detalle({
    titulo: `Por qué votaron así: «${pieza.titulo}»`,
    sub: `${pieza.formato ? `${pieza.formato} · ` : ''}Aquí está el voto de cada juez${publicoTotal ? `, la reacción de los ${publicoTotal} del público` : ''} y cómo quedaron las ${lote.length} piezas del lote.`,
    bloques: bloquesVeredicto,
    fuente: 'Los votos y las reacciones que quedaron guardadas en MiroFish para esta pieza. Aquí no se gasta un peso.',
    acciones: [
      { label: 'Marcar para corrección', variante: 'primary', onClick: corregir },
      { label: 'No hacer nada por ahora', onClick: () => setToast('Sin cambios: la pieza sigue en el filtro') },
    ],
  });

  // -------------------------------------------------------------------------------------------
  // BOTÓN 3 · CORREGIR LO QUE OBJETARON — qué hay que contestar y cuánto costaría, antes de pedirlo
  // -------------------------------------------------------------------------------------------
  const abrirCorreccion = () => detalle({
    titulo: `Corregir lo que objetaron en «${pieza.titulo}»`,
    sub: 'Lo que hay que contestarle a la objeción del juez que votó más bajo. Nada de esto se ejecuta solo ni gasta un crédito: primero mira qué es y cuánto costaría.',
    bloques: [
      masDuro
        ? { tipo: 'datos', filas: [
          { k: 'La objeción que manda', v: `${masDuro.juez} · ${masDuro.voto}/100`, tono: 'amber', s: `«${masDuro.opinion}»` },
          { k: 'Puntaje de hoy', v: `${pieza.puntaje}/100`, s: jueces.length ? `los 5 votos: ${jueces.map(j => j.voto).join(' · ')}` : undefined },
        ] }
        : { tipo: 'texto', texto: 'El servidor no devolvió el voto de los jueces para esta pieza: no hay objeción que mostrar.' },
      { tipo: 'pasos', items: [
        `Nia contestaría la objeción de ${masDuro?.juez ?? 'el juez que votó más bajo'} sin tocar el resto de la pieza.`,
        'Los 5 jueces volverían a puntuar la versión nueva y la ordenarían contra el lote.',
        `Las ${CUANTAS_PASAN} mejores quedarían listas para publicar.`,
      ] },
      { tipo: 'aviso', tono: 'amber', texto: `Esto no gasta publicidad: se paga en créditos, ${TARIFA.crearVariante} por la corrección más ${TARIFA.evaluarPieza} por volver a juzgarla, y todavía no sale de esta pantalla. La pieza de hoy queda guardada con su voto.` },
    ],
    fuente: 'Sale del veredicto de los 5 jueces sobre esta pieza, tal como quedó guardado en MiroFish.',
    acciones: [
      { label: 'Marcar para corrección', variante: 'primary', onClick: corregir },
      { label: 'Dejarla como está', onClick: () => setToast('Sin cambios: la pieza queda como está') },
    ],
  });

  return (
    <Card
      title={<><I_Zap size={15} style={{ marginRight: 8, color: 'var(--purple4)' }} /> El motor en marcha: mercado secundario predictivo</>}
      action={<span className="badge badge-green" style={{ fontSize: 10 }}>datos de su negocio</span>}
    >
      <div className="small muted" style={{ marginBottom: 14, lineHeight: 1.5 }}>
        Esto es lo que quedó guardado de cada pieza que su negocio mandó a MiroFish: <b>el voto de los 5 jueces, la reacción de su público y la predicción del modelo</b>. Elija una y véala.
      </div>

      {/* El lote: lo que hay en el filtro. */}
      <div className="row" style={{ gap: 7, flexWrap: 'wrap', marginBottom: 12 }}>
        <span className="tiny muted" style={{ fontWeight: 700, marginRight: 2 }}>
          El lote: {lote.length} {lote.length === 1 ? 'pieza evaluada' : 'piezas evaluadas'}
        </span>
        {lote.map((o, i) => (
          <button key={o.id}
            className={`badge ${o.id === pieza.id ? 'badge-purple' : 'badge-muted'}`}
            style={{ fontSize: 10, cursor: 'pointer', border: 'none' }}
            title={`Muestra «${o.titulo}» y todo lo que quedó guardado de ella: el voto de cada juez y la reacción del público. No cambia nada.`}
            onClick={() => setElegida(o.id)}>
            {i + 1}º · {o.puntaje}
          </button>
        ))}
      </div>

      <div className="motor-split">
        {/* ============ IZQUIERDA: el proceso ============ */}
        <div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(168,85,247,.35)', background: 'rgba(124,58,237,.08)' }}>
            <span style={{ fontSize: 22 }}>{pieza.formato ? EMOJI[pieza.formato] : '🗳️'}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="small" style={{ fontWeight: 700 }}>En el filtro: {pieza.titulo}</div>
              <div className="tiny muted">
                {pieza.formato ? `${pieza.formato} · ${pieza.medida} · ` : ''}los 5 jueces le pusieron {pieza.puntaje}/100
                {pieza.orden ? ` · puesto ${pieza.orden} del lote` : ''}
              </div>
            </div>
            {estadoPieza && (
              <Badge tone={estadoPieza === 'aprobada' ? 'green' : 'amber'}>
                {estadoPieza === 'aprobada' ? 'lista' : 'en corrección'}
              </Badge>
            )}
            {cargando && <Badge tone="muted">leyendo</Badge>}
          </div>

          <div className="motor-kpis">
            {/* el voto de cada juez: el dato que decide el puntaje */}
            <div style={{ padding: 10, borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--bg2)' }}
              title={jueces.length
                ? `El voto de cada juez sobre «${pieza.titulo}»: ${jueces.map(j => `${j.juez} ${j.voto}`).join(', ')}.`
                : 'Todavía no se leyó el voto de los jueces para esta pieza.'}>
              <div className="tiny muted" style={{ fontWeight: 700, marginBottom: 6 }}>El voto de cada juez</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {jueces.length === 0 && <span className="tiny muted">{cargando ? 'Leyendo los votos…' : 'Sin votos guardados'}</span>}
                {jueces.slice().reverse().map(j => (
                  <div key={j.juez} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="tiny" style={{ width: 74, flexShrink: 0, fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={j.juez}>{j.juez}</span>
                    <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--bg3)', overflow: 'hidden' }}>
                      <div style={{ width: j.voto + '%', height: '100%', background: colorScore(j.voto), transition: 'width .5s ease' }} />
                    </div>
                    <span className="tiny" style={{ width: 22, textAlign: 'right', fontSize: 10, fontWeight: 800, color: colorScore(j.voto) }}>{j.voto}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* puntaje por pieza del lote: las piezas del ranking, con el punto en la del filtro */}
            <div style={{ padding: 10, borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--bg2)' }}
              title={`El puntaje de cada pieza del lote, en el orden del ranking. El punto marca la que está en el filtro: «${pieza.titulo}», ${pieza.puntaje}/100.`}>
              <div className="tiny muted" style={{ fontWeight: 700, marginBottom: 6 }}>Puntaje, pieza por pieza</div>
              <svg width="100%" height="44" viewBox="0 0 100 40" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="v2spark" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {(() => {
                  const pts = puntajes.map((v, i) => [8 + (i / Math.max(1, puntajes.length - 1)) * 84, 36 - ((v - minP) / rangoP) * 32]);
                  const line = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
                  const area = line + ' L ' + pts[pts.length - 1][0].toFixed(1) + ' 38 L ' + pts[0][0].toFixed(1) + ' 38 Z';
                  const actual = pts[pos] ?? pts[0];
                  return (<g>
                    <path d={area} fill="url(#v2spark)" />
                    <path d={line} fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx={actual[0]} cy={actual[1]} r="3" fill="#a855f7" />
                  </g>);
                })()}
              </svg>
              <div className="tiny" style={{ color: '#a855f7', fontWeight: 800, marginTop: 2 }}>{pieza.puntaje}/100 · la del filtro</div>
            </div>

            {/* el público: las reacciones que quedaron guardadas, sin inventar un solo agente */}
            <div style={{ padding: 10, borderRadius: 10, border: '1px solid var(--border2)', background: 'var(--bg2)' }}
              title={reacciones.length
                ? `La reacción de los ${publicoTotal ?? 0} del público con esta pieza: ${reaccionDicha}.`
                : 'Todavía no hay reacciones del público guardadas para esta pieza.'}>
              <div className="tiny muted" style={{ fontWeight: 700, marginBottom: 6 }}>La reacción del público</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {reacciones.length === 0 && <span className="tiny muted">{cargando ? 'Leyendo las reacciones…' : 'Sin reacciones guardadas'}</span>}
                {reacciones.map(r => (
                  <div key={r.reaccion} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="tiny" style={{ width: 74, flexShrink: 0, fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{etiquetaReaccion(r.reaccion)}</span>
                    <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--bg3)', overflow: 'hidden' }}>
                      <div style={{ width: ((r.n / Math.max(1, totalReacciones)) * 100) + '%', height: '100%', background: colorReaccion(r.reaccion) }} />
                    </div>
                    <span className="tiny" style={{ width: 28, textAlign: 'right', fontSize: 10, fontWeight: 800, color: colorReaccion(r.reaccion) }}>{r.n}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* las etapas: lo que hace el filtro, en orden. Sin simular: es la explicación del paso. */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ETAPAS.map((f, i) => (
              <div key={i} style={{
                display: 'flex', gap: 10, alignItems: 'center', padding: '9px 12px', borderRadius: 10,
                border: '1px solid var(--border2)', background: 'var(--bg2)',
              }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 800, flexShrink: 0, color: '#fff', background: 'var(--bg3)',
                }}>{i + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="small" style={{ fontWeight: 700 }}>{f.t}</div>
                  <div className="tiny muted" style={{ marginTop: 1 }}>{f.d}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center', padding: '12px 14px', borderRadius: 12, background: 'rgba(124,58,237,.10)', border: '1px solid rgba(124,58,237,.25)' }}>
            <div style={{ fontSize: 26 }}>🧠</div>
            <div style={{ flex: 1 }}>
              <div className="small" style={{ fontWeight: 700 }}>Puntaje en MiroFish: {pieza.puntaje}/100</div>
              <div className="tiny muted">
                {aprueba ? 'Los 5 jueces la dejan pasar: arriba de 80 se publica.' : 'Los 5 jueces todavía no la aprueban: vuelve con la objeción.'}
                {pieza.predicho !== null && ` El modelo había predicho ${pieza.predicho} y el público hizo ${pieza.observado ?? 0}${pieza.desvio !== null ? `: ${pieza.desvio}% de desvío.` : '.'}`}
              </div>
            </div>
            <Badge tone={aprueba ? 'green' : 'amber'}>{palabraVeredicto(pieza.puntaje)}</Badge>
          </div>
        </div>

        {/* ============ DERECHA: el mercado reaccionando ============ */}
        <div style={{ border: '1px solid var(--border2)', borderRadius: 12, background: 'var(--bg2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '10px 12px', borderBottom: '1px solid var(--border2)', background: 'var(--bg3)' }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: '#a855f7', boxShadow: '0 0 0 3px rgba(168,85,247,.25)' }} />
            <span className="small" style={{ fontWeight: 700 }}>El público: lo que quedó guardado</span>
            <span className="tiny muted" style={{ marginLeft: 'auto' }}>
              {publicoTotal === null ? 'sin dato del público' : `${publicoTotal} personas del público`}
            </span>
          </div>
          <div style={{ flex: 1, maxHeight: 380, overflowY: 'auto', padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 7 }}>
            {pieza.comentarios.length === 0 && (
              <span className="tiny muted" style={{ padding: '0 6px' }}>
                {cargando ? 'Leyendo las reacciones del público…' : 'Todavía no hay comentarios del público guardados para esta pieza.'}
              </span>
            )}
            {pieza.comentarios.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', fontSize: 11.5, lineHeight: 1.35 }}>
                {m.n !== null
                  ? <span style={{ fontWeight: 800, color: colorReaccion(m.reaccion), flexShrink: 0 }}>#{m.n}</span>
                  : <span style={{ fontWeight: 800, color: colorReaccion(m.reaccion), flexShrink: 0 }}>•</span>}
                <span style={{ color: 'var(--txt)', overflowWrap: 'anywhere' }}>{m.texto}</span>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid var(--border2)', padding: '8px 10px', background: 'var(--bg3)' }}>
            <div className="tiny" style={{ fontWeight: 700, marginBottom: 4 }}>Cómo reaccionó su público</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {reacciones.length === 0 && <span className="tiny muted">Sin reacciones guardadas</span>}
              {reacciones.map(r => (
                <span key={r.reaccion} className="tiny" style={{
                  padding: '2px 8px', borderRadius: 999,
                  background: 'rgba(168,85,247,.14)', color: colorReaccion(r.reaccion),
                }}>
                  {etiquetaReaccion(r.reaccion)} · {r.n}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ============ CIERRE: el filtro + qué hace cada botón ============ */}
      <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 12, background: 'rgba(34,211,238,.08)', border: '1px solid rgba(34,211,238,.25)' }}>
        <div className="tiny muted"><b style={{ color: '#22d3ee' }}>🔒 El filtro antes de salir live:</b> solo lo que convence aquí se publica; lo que no, vuelve con la objeción.</div>
      </div>

      <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
        <div className="dato" title="Las piezas que usted marcó como listas para publicar: quedan en el contador de esta pantalla">
          <span className="dato-l">Marcadas como listas</span>
          <span className="dato-v" style={{ color: 'var(--green)' }}>{listas}</span>
        </div>
        <div className="dato" title="Las que marcó para corrección con la objeción del juez que votó más bajo: quedan en el contador">
          <span className="dato-l">En corrección</span>
          <span className="dato-v" style={{ color: 'var(--amber)' }}>{enCorreccion}</span>
        </div>
        <div className="dato" title="Las piezas que este negocio ya evaluó: están ordenadas del 1 al último por el puntaje de MiroFish">
          <span className="dato-l">Piezas del lote</span>
          <span className="dato-v">{lote.length}</span>
        </div>
      </div>

      <div className="row" style={{ gap: 9, marginTop: 12, flexWrap: 'wrap' }}>
        {estadoPieza === 'aprobada' ? (
          <div className="tiny" style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--green)', fontWeight: 700 }}>
            <I_Check size={13} /> Marcada como lista en esta pantalla: la publicación en sus cuentas es un paso aparte.
          </div>
        ) : (
          <Button variant={aprueba ? 'primary' : 'outline'} className="btn-sm"
            title={aprueba
              ? `Marca «${pieza.titulo}» como lista para publicar (${pieza.puntaje}/100) y sube el contador de abajo. No sale a sus redes desde aquí y no gasta nada. Es reversible: la puede volver a dejar como estaba.`
              : `El puntaje es ${pieza.puntaje}/100 y no llega al mínimo de 80: la pieza no se publica y queda marcada para corrección con la objeción de ${masDuro?.juez ?? 'el juez que votó más bajo'}. No se gasta un peso.`}
            onClick={sacarDelFiltro}>
            <I_Check size={13} /> {aprueba ? 'Marcar como lista' : 'Marcar para corrección'}
          </Button>
        )}
        <Button variant="ghost" className="btn-sm"
          title="Abre el voto de los 5 jueces sobre esta pieza, la reacción de su público y cómo quedaron las piezas del lote ordenadas. No cambia nada."
          onClick={abrirVeredicto}>
          <I_ArrowRight size={13} /> Ver por qué votaron así
        </Button>
        {estadoPieza === 'correccion' ? (
          <div className="tiny" style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--amber)', fontWeight: 700 }}>
            <I_Refresh size={13} /> En corrección: lo que hay que contestar es la objeción de {masDuro?.juez ?? 'el juez que votó más bajo'}.
          </div>
        ) : (
          <Button variant="ghost" className="btn-sm"
            title={estadoPieza === 'aprobada'
              ? 'La pieza ya está marcada como lista: si la manda a corrección, el contador de listas baja en uno. La versión de hoy queda guardada con su voto.'
              : `Muestra cómo se corrige: contesta la objeción de ${masDuro?.juez ?? 'el juez que votó más bajo'}${masDuro ? ` (${masDuro.voto}/100)` : ''} y los 5 jueces la vuelven a votar. La pieza de ahora queda intacta.`}
            onClick={abrirCorreccion}>
            {estadoPieza === 'aprobada' ? 'Corregirla igual' : 'Corregir lo que objetaron'}
          </Button>
        )}
      </div>

      {consecuencia && (
        <div className="tiny" style={{ marginTop: 9, color: consecuencia.ok ? 'var(--green)' : 'var(--amber)', fontWeight: 700, lineHeight: 1.5 }}>
          {consecuencia.ok ? '✓' : '↺'} {consecuencia.texto}
        </div>
      )}

      <div className="acc-why">
        <b>Marcar como lista</b> es una marca en esta pantalla: no mueve dinero ni publica nada en sus cuentas.{' '}
        <b>Ver por qué votaron así</b> abre el voto de los 5 jueces y la reacción del público, sin cambiar nada.{' '}
        <b>Corregir</b> marca la pieza para corrección con la objeción a la vista. Los contadores de arriba quedan con lo que decidió.
      </div>
    </Card>
  );
}

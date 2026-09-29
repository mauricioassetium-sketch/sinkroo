import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Badge, Button } from './ui';
import { I_Robot, I_Search, I_Sparkle, I_Vote, I_Rocket, I_Check, I_Target, I_File, I_Credit } from './icons';
import { COSTO_RONDA } from '../data/mirofish';
import type { Modo } from '../data/demo';
import { useDatos } from '../api/datos';
import { baseApi, token } from '../api/cliente';
import { EstadoVacio } from './EstadoVacio';
import { useEvaluacion, fechaCorta } from './mirofishDatos';
import type { PasoCampana } from './CampanaPasos';

// =============================================================================================
// EL FLUJO DE MIROFISH — la cadena completa de una pieza, etapa por etapa:
//   1. Sinkroo investiga el mercado y guarda los hallazgos.
//   2. Con eso crea el material: las piezas, con su formato y su prompt.
//   3. MiroFish las vota y quedan ordenadas por puntaje.
//   4. Las que pasan el mínimo de 80 quedan listas para publicar.
//
// DE DÓNDE SALE CADA COSA (la regla de la casa):
//   · Todo lo que se muestra acá sale del back: los hallazgos, las piezas creadas, las evaluaciones
//     ordenadas y cuáles pasan el mínimo. Si un dato no existe, no se muestra.
//   · Sin datos, cada tarjeta dice qué hacer para tenerlos. No hay ronda de ejemplo, ni piezas de
//     ejemplo, ni votos inventados: acá no vive un solo número que nadie haya producido.
//   · Lo único fijo es el catálogo del producto —las etapas del flujo y lo que cuesta una ronda en
//     créditos—, que no es dato de ningún negocio.
// =============================================================================================


/** El color del puntaje, con el mismo mínimo de 80 que usa todo el producto. */
const colorDePuntaje = (p: number) => (p >= 80 ? 'var(--green)' : p >= 60 ? 'var(--amber)' : 'var(--red)');

function FlujoReal({ modo, ir }: { modo: Modo; ir?: (p: PasoCampana) => void }) {
  const d = useDatos();

  // -----------------------------------------------------------------------------------------------
  // LAS RONDAS. Una ronda son cinco piezas distintas —otro ángulo, otro formato— y cada una se vota por
  // separado: queda la del puntaje más alto. Todo lo que se muestra sale de /api/rondas (el back manda
  // también el precio real de una ronda y el saldo): acá no hay una ronda de ejemplo ni un voto inventado.
  // -----------------------------------------------------------------------------------------------
  const [rondas, setRondas] = useState<{
    id: string; numero: number; piezas: number; evaluadas: number; creditos: number; ganadora_puntaje: number | null; created_at: string;
    candidatas: { id: string; angulo: string; formato: string; puntaje: number | null; orden: number | null; titulo: string }[];
  }[]>([]);
  const [pidiendo, setPidiendo] = useState(false);
  const [avisoRonda, setAvisoRonda] = useState('');
  const [saldoRondas, setSaldoRondas] = useState<number | null>(null);
  const [costoRonda, setCostoRonda] = useState<number>(COSTO_RONDA.total);
  const [cuantasPiezas, setCuantasPiezas] = useState<number>(COSTO_RONDA.piezas);

  const leerRondas = useCallback(async () => {
    try {
      const r = await fetch(baseApi() + '/api/rondas', { headers: token() ? { Authorization: 'Bearer ' + token() } : {} });
      if (!r.ok) return;
      const j = await r.json();
      setRondas(Array.isArray(j?.rondas) ? j.rondas : []);
      if (j?.tarifa?.costo_ronda?.total) setCostoRonda(Number(j.tarifa.costo_ronda.total));
      if (j?.cuantas_piezas) setCuantasPiezas(Number(j.cuantas_piezas));
      if (typeof j?.creditos === 'number') setSaldoRondas(j.creditos);
    } catch { /* sin rondas: la tarjeta lo dice */ }
  }, []);
  useEffect(() => { void leerRondas(); }, [leerRondas]);

  const pedirRonda = async () => {
    setPidiendo(true);
    setAvisoRonda('');
    try {
      const r = await fetch(baseApi() + '/api/agentes/correr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token() ? { Authorization: 'Bearer ' + token() } : {}) },
        body: JSON.stringify({ ronda: true }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setAvisoRonda(String(j?.detalle || j?.error || 'el back no dejó pedir la ronda'));
      } else {
        const sol = (j?.tareas ?? []).filter((t: { agente?: string }) => t.agente === 'sol');
        setAvisoRonda(String(sol[sol.length - 1]?.que || 'La ronda corrió: mirá abajo las cinco opciones con su puntaje.'));
        await leerRondas();
        await d.refrescar();
      }
    } catch {
      setAvisoRonda('no se pudo hablar con el back');
    }
    setPidiendo(false);
  };
  const evaluaciones = useMemo(() => [...d.evaluaciones]
    .sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999) || (Number(b.puntaje) || 0) - (Number(a.puntaje) || 0)),
  [d.evaluaciones]);
  const mejor = evaluaciones[0] ?? null;
  // El voto juez por juez se pide para la primera del ranking: es la que se está mirando.
  const { dato, cargando } = useEvaluacion(mejor ? mejor.id : null);
  const pasan = evaluaciones.filter(e => Number(e.puntaje) >= 80);
  const noPasan = evaluaciones.filter(e => Number(e.puntaje) < 80);
  const saldo = d.creditos ? d.creditos.saldo : null;
  const irAlPaso1 = ir ? { accion: 'Ir al paso 1', onAccion: () => ir(1) } : {};

  return (
    <>
      {/* ==================== CABECERA DEL FLUJO ==================== */}
      <Card className="flujo-head">
        <div className="row spread" style={{ alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
          <div className="row" style={{ gap: 11, flex: 1, minWidth: 240 }}>
            <span style={{ color: 'var(--purple3)', flexShrink: 0, marginTop: 2 }}><I_Robot size={20} /></span>
            <div style={{ minWidth: 0 }}>
              <div className="bt">El camino de una pieza, de la investigación al veredicto</div>
              <div className="bs">
                Esto es lo que su negocio tiene hoy en cada etapa, tal como está en el servidor: lo que
                encontró la investigación, las piezas que el motor creó y cómo las ordenaron los 5 jueces.
                <b> Nada de lo que se ve aquí es un ejemplo.</b>
              </div>
            </div>
          </div>
          <Badge tone="purple">
            {evaluaciones.length} {evaluaciones.length === 1 ? 'pieza evaluada' : 'piezas evaluadas'}
          </Badge>
        </div>

        <div className="flujo-pasos">
          {[
            { n: 1, t: 'Investiga', d: `${d.hallazgos.length} ${d.hallazgos.length === 1 ? 'hallazgo' : 'hallazgos'} del mercado` },
            { n: 2, t: 'Crea', d: `${d.piezas.length} ${d.piezas.length === 1 ? 'pieza guardada' : 'piezas guardadas'}` },
            { n: 3, t: 'Vota', d: `${evaluaciones.length} ${evaluaciones.length === 1 ? 'evaluación' : 'evaluaciones'} de MiroFish` },
            { n: 4, t: 'Queda lista', d: `${pasan.length} ${pasan.length === 1 ? 'pasa' : 'pasan'} el mínimo de 80` },
          ].map(p => (
            <div key={p.n} className="flujo-paso">
              <span className="flujo-paso-n">{p.n}</span>
              <span style={{ minWidth: 0 }}>
                <span className="flujo-paso-t">{p.t}</span>
                <span className="flujo-paso-d">{p.d}</span>
              </span>
            </div>
          ))}
        </div>

        {/* ---- EL COSTO: el precio de una ronda y el saldo que el servidor manda de verdad ---- */}
        <div className="flujo-costo">
          <span className="flujo-costo-ico"><I_Credit size={15} /></span>
          <span className="flujo-costo-tx">
            Una ronda cuesta <b>{COSTO_RONDA.total} créditos</b> — {COSTO_RONDA.crear} por crear las {COSTO_RONDA.piezas} opciones
            y {COSTO_RONDA.evaluar} por evaluarlas. <b>El público no cuesta.</b>{' '}
            {saldo === null
              ? 'Su saldo todavía no llegó del servidor.'
              : <>Su saldo hoy: <b>{saldo} créditos</b>.</>}
          </span>
        </div>
      </Card>

      {/* ==================== LAS RONDAS: el botón y lo que compitió ==================== */}
      <div style={{ marginTop: 16 }}>
      <Card
        title={<span className="row" style={{ gap: 8 }}><I_Vote size={14} style={{ color: 'var(--purple3)' }} /> Las rondas: cinco opciones que compiten entre sí</span>}
        action={rondas.length
          ? <Badge tone="purple">{rondas.length} {rondas.length === 1 ? 'ronda' : 'rondas'}</Badge>
          : <Badge tone="muted">sin rondas todavía</Badge>}
      >
        <div className="bs">
          Una ronda son <b>{cuantasPiezas} piezas distintas</b> —cada una entra por otro ángulo y en otro formato— y cada
          una se vota por separado: los 5 jueces y los 500 del público. Queda la del puntaje más alto. Cuesta{' '}
          <b>{costoRonda} créditos</b>{saldoRondas === null ? '.' : <> y su saldo hoy es <b>{saldoRondas}</b>.</>}
        </div>
        <div className="row" style={{ marginTop: 10, gap: 8, flexWrap: 'wrap' }}>
          <Button
            variant="primary"
            onClick={pedirRonda}
            disabled={pidiendo}
            title={`Pídale al motor una ronda nueva: ${cuantasPiezas} piezas distintas, cada una con su votación (${costoRonda} créditos)`}
          >
            {pidiendo ? 'El motor está escribiendo y votando…' : `Generar una ronda nueva (${cuantasPiezas} piezas · ${costoRonda} créditos)`}
          </Button>
          {avisoRonda ? <span className="tiny muted" style={{ alignSelf: 'center' }}>{avisoRonda}</span> : null}
        </div>
        {rondas.length === 0 ? (
          <div className="tiny muted" style={{ marginTop: 10 }}>
            Todavía no hay ninguna ronda guardada. Cuando la pida, acá quedan las {cuantasPiezas} opciones con su puntaje y cuál ganó.
          </div>
        ) : (
          rondas.map(r => (
            <div key={r.id} style={{ marginTop: 12 }}>
              <div className="row" style={{ alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <b>Ronda {r.numero}</b>
                <span className="tiny muted">
                  {fechaCorta(r.created_at)} · {r.evaluadas} de {r.piezas} votadas · {r.creditos} créditos
                  {r.ganadora_puntaje != null ? ` · ganó con ${r.ganadora_puntaje}` : ''}
                </span>
              </div>
              {r.candidatas.map((c, i) => (
                <div className="guard" key={c.id}>
                  <span className="guard-lb">
                    {i === 0 ? '★ ' : ''}{c.angulo || 'sin ángulo declarado'}
                    <small>{`${c.formato} · ${c.puntaje == null ? 'todavía sin votar' : `${c.puntaje} de 100 · puesto ${c.orden ?? '—'}`}`}</small>
                  </span>
                  <span className="guard-val" style={{ color: c.puntaje == null ? 'var(--muted)' : colorDePuntaje(Number(c.puntaje)) }}>
                    {c.puntaje == null ? '—' : c.puntaje}
                  </span>
                </div>
              ))}
            </div>
          ))
        )}
      </Card>
      </div>

      {/* ==================== FILA 1: INVESTIGACIÓN Y CREACIÓN ==================== */}
      <div className="duo" style={{ marginTop: 16 }}>
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Search size={14} style={{ color: 'var(--purple3)' }} /> 1 · Lo que investigó el motor</span>}
          action={d.hallazgos.length
            ? <Badge tone="purple">{d.hallazgos.length} {d.hallazgos.length === 1 ? 'hallazgo' : 'hallazgos'}</Badge>
            : <Badge tone="muted">sin hallazgos</Badge>}
        >
          {d.hallazgos.length === 0 ? (
            <EstadoVacio
              icono={<I_Search size={22} />}
              titulo="El motor todavía no investigó su mercado"
              texto="Cuando corra la investigación, cada hallazgo queda aquí con el dato, su porqué y de dónde salió. Todavía no hay ninguno guardado para este negocio."
              {...(d.cargando ? {} : irAlPaso1)}
            />
          ) : (
            <>
              <div className="bs">Lo que encontró la investigación sobre su mercado y su competencia, tal como quedó guardado:</div>
              <div className="guards">
                {d.hallazgos.map(h => (
                  <div key={h.id} className="guard">
                    <span style={{ color: 'var(--purple3)', flexShrink: 0 }}><I_Target size={14} /></span>
                    <span className="guard-lb">
                      {h.titulo} <span className="tiny muted">· {h.tipo}</span>
                      <small>{[h.dato, h.porque].filter(Boolean).join(' · ')}</small>
                      <small>De dónde salió: {h.fuente || 'el motor no dijo la fuente'}{h.created_at ? ` · ${fechaCorta(h.created_at)}` : ''}</small>
                    </span>
                  </div>
                ))}
              </div>
              <div className="acc-why">
                Esto no es una opinión del motor: cada línea puede decir <b>de dónde salió</b> y cuándo se
                encontró. Es la investigación, con su fuente.
              </div>
            </>
          )}
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Sparkle size={14} style={{ color: 'var(--purple3)' }} /> 2 · Lo que el motor creó</span>}
          action={d.piezas.length
            ? <Badge tone="purple">{d.piezas.length} {d.piezas.length === 1 ? 'pieza' : 'piezas'}</Badge>
            : <Badge tone="muted">sin crear</Badge>}
        >
          {d.piezas.length === 0 ? (
            <EstadoVacio
              icono={<I_Sparkle size={22} />}
              titulo="Todavía no hay piezas creadas"
              texto="Cuando el motor cree la primera, aparece aquí con su formato, su estado y el puntaje que le den los 5 jueces."
              {...(d.cargando ? {} : irAlPaso1)}
            />
          ) : (
            <>
              <div className="bs">Estas son las piezas de su negocio, tal como están guardadas en el servidor:</div>
              <div className="guards">
                {d.piezas.map(p => (
                  <div key={p.id} className="guard">
                    <span style={{ color: 'var(--purple3)', flexShrink: 0 }}><I_File size={14} /></span>
                    <span className="guard-lb">
                      {p.titulo} <span className="tiny muted">· {p.formato}</span>
                      <small>
                        {p.estado}{p.created_at ? ` · creada el ${fechaCorta(p.created_at)}` : ''}
                        {p.puntaje == null ? ' · todavía sin puntaje de MiroFish' : ` · puntaje ${Number(p.puntaje)} de 100`}
                      </small>
                    </span>
                    {p.puntaje != null && <Badge tone={Number(p.puntaje) >= 80 ? 'green' : 'amber'}>{Number(p.puntaje)}</Badge>}
                  </div>
                ))}
              </div>
              <div className="acc-why">
                De cada pieza, el servidor manda <b>su título, su formato, su estado y su puntaje</b>. El
                prompt y el texto del anuncio todavía no llegan: por eso no se muestran.
              </div>
            </>
          )}
        </Card>
      </div>

      {/* ==================== FILA 2: VOTACIÓN Y PRODUCCIÓN ==================== */}
      <div className="duo" style={{ marginTop: 16 }}>
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Vote size={14} style={{ color: 'var(--amber)' }} /> 3 · Los 5 jueces las votan y las ordenan</span>}
          action={evaluaciones.length
            ? <Badge tone="green">ordenadas 1 a {evaluaciones.length}</Badge>
            : <Badge tone="muted">sin votar</Badge>}
        >
          {evaluaciones.length === 0 ? (
            <EstadoVacio
              icono={<I_Vote size={22} />}
              titulo="Todavía no hay piezas evaluadas"
              texto="Mande sus piezas a MiroFish y vuelva: cada una queda aquí ordenada del 1 al último, con el voto de los 5 jueces y la reacción del público."
              {...(d.cargando ? {} : irAlPaso1)}
            />
          ) : (
            <>
              <div className="bs">
                Cada juez mira algo distinto. <b>El puntaje es el que quedó guardado en MiroFish</b> y define
                el puesto: la de arriba es la que más convence.
              </div>
              <div className="rank">
                {evaluaciones.map((e, i) => {
                  const p = Number(e.puntaje);
                  const pasa = p >= 80;
                  return (
                    <div key={e.id} className={`rank-row ${pasa ? 'pasa' : ''}`}>
                      <span className={`rank-pos ${pasa ? 'pasa' : ''}`}>{i + 1}</span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span className="rank-t">{e.titulo}</span>
                        <span className="rank-m">
                          {e.total_publico ? `los ${e.total_publico} del público` : 'sin público registrado'}
                          {e.created_at ? ` · ${fechaCorta(e.created_at)}` : ''}
                        </span>
                      </span>
                      <span className="rank-avg" style={{ color: colorDePuntaje(p) }}>{p}</span>
                    </div>
                  );
                })}
              </div>
              {mejor && (dato ? (
                <div className="guards">
                  {dato.votos.map(v => (
                    <div key={v.juez} className="guard">
                      <span style={{ width: 34, flexShrink: 0, textAlign: 'center', fontSize: 17, fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: colorDePuntaje(v.voto) }}>{v.voto}</span>
                      <span className="guard-lb">
                        {v.juez} <span className="tiny muted">· {v.criterio}</span>
                        <small>«{v.opinion}»</small>
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="tiny muted">
                  {cargando ? `Leyendo el voto de los 5 jueces de «${mejor.titulo}»…` : `El servidor no devolvió el voto de los 5 jueces de «${mejor.titulo}».`}
                </div>
              ))}
              <div className="acc-why">
                Arriba están el puesto y el puntaje de cada pieza evaluada; <b>el voto juez por juez de la
                primera</b> se ve aquí abajo. El de las demás se ve al elegirlas en el motor, en el paso 2.
              </div>
            </>
          )}
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Rocket size={14} style={{ color: 'var(--green)' }} /> 4 · Las que pasan el mínimo</span>}
          action={pasan.length
            ? <Badge tone="green">{pasan.length} {pasan.length === 1 ? 'seleccionada' : 'seleccionadas'}</Badge>
            : <Badge tone="muted">sin seleccionar</Badge>}
        >
          {evaluaciones.length === 0 ? (
            <EstadoVacio
              icono={<I_Rocket size={22} />}
              titulo="Todavía no hay nada que publicar"
              texto="Cuando MiroFish termine de votar, cada pieza que llegue al mínimo de 80 aparece aquí, lista para publicar."
              {...(d.cargando ? {} : irAlPaso1)}
            />
          ) : (
            <>
              {pasan.length === 0 && (
                <div className="bs">
                  <b>Ninguna de las {evaluaciones.length} evaluadas llega al mínimo de 80.</b> Así no se
                  publica: el motor las devuelve con la objeción del juez que votó más bajo.
                </div>
              )}
              {pasan.map((e, i) => (
                <div key={e.id} className="sale">
                  <span className="sale-pos">{i + 1}º</span>
                  <span className="sale-prev" style={{ background: 'var(--bg3)', borderColor: 'var(--border2)' }}>
                    <span style={{ color: 'var(--green)' }}><I_Check size={15} /></span>
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="rank-t">{e.titulo}</span>
                    <span className="rank-m">{Number(e.puntaje)} de 100 · pasa el mínimo</span>
                  </span>
                  <Badge tone="green">pasa</Badge>
                </div>
              ))}
              {noPasan.length > 0 && (
                <div className="bs" style={{ marginTop: 4 }}>
                  <b>Las {noPasan.length} que no llegan al mínimo:</b> {noPasan.map(e => `«${e.titulo}» (${Number(e.puntaje)})`).join(' y ')}.
                  Quedan guardadas con el voto de cada juez, así se ve qué les faltó.
                </div>
              )}
              <div className="acc-why">
                {modo === 'shared'
                  ? <><b>Está en Compartido:</b> el motor prepara todo y se frena esperando su OK.</>
                  : modo === 'auto'
                    ? <><b>Está en Automático:</b> las que pasan el mínimo quedan listas solas, en la bitácora y reversibles 24 h.</>
                    : <><b>Está en Manual:</b> el motor se las deja listas y usted decide qué sale.</>}
                {' '}Crear una ronda de {COSTO_RONDA.piezas} opciones cuesta {COSTO_RONDA.crear} créditos y
                evaluarlas {COSTO_RONDA.evaluar}. El público no cuesta. El sistema todavía no publica en sus
                redes: hasta entonces no gasta un peso en publicidad.
              </div>
            </>
          )}
        </Card>
      </div>
    </>
  );
}

/**
 * El flujo de MiroFish: la cadena de la pieza con los datos que el negocio tiene en el servidor.
 * Sin nada del negocio, cada etapa muestra su estado vacío. No hay una versión de ejemplo: el
 * mismo camino se muestra siempre, con sus datos o con la invitación a tenerlos.
 */
export function FlujoMiroFish({ modo, ir }: {
  modo: Modo; ir?: (p: PasoCampana) => void; setToast?: (t: string) => void; esAnuncio?: boolean;
}) {
  return <FlujoReal modo={modo} ir={ir} />;
}
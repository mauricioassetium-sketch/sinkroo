import { useState } from 'react';
import { Card, Badge } from '../components/ui';
import { ViewHead, Bars } from '../components/viz';
import { I_Globe, I_Trend, I_Zap, I_Users, I_Target } from '../components/icons';
import { useDatos } from '../api/datos';
import { baseApi, token } from '../api/cliente';
import { EstadoVacio } from '../components/EstadoVacio';
import type { Vista } from '../components/Layout';

// =============================================================================================
// MERCADO — lo que el motor encontró en el mercado de ESTE negocio
//
// Todo lo de esta pantalla sale del back: los hallazgos de la investigación (`d.hallazgos`), el
// público calibrado (`d.calibracion`), las corridas (`d.corridas`) y el acierto del modelo
// (`d.backtest`). No hay competidores con nombre propio ni tendencias de ejemplo: nadie midió eso
// para este negocio, así que mostrarlo sería inventarle un mercado. Sin nada que mostrar, la
// pantalla dice qué hacer para tenerlo.
// =============================================================================================

/** La fecha de un hallazgo o de una corrida, en corto («24 de sept»). Vacía si no se puede leer. */
const fechaCorta = (iso?: string) => {
  if (!iso) return '';
  const f = new Date(iso);
  return isNaN(+f) ? '' : f.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
};

/** El origen del dato en una palabra: el peso de un segmento se muestra siempre con su origen. */
const ORIGEN_TXT: Record<string, string> = {
  propia: 'Propia',
  inferida: 'Inferida',
  competencia: 'De la competencia',
};
const origenTexto = (o?: string | null) => (o ? ORIGEN_TXT[o] ?? o : 'Sin declarar');
/** El peso de un segmento, como porcentaje del público real (el back lo manda sobre 1). */
const pct = (peso: number) => `${Math.round((Number(peso) || 0) * 100)}%`;

export function ViewMercado({ setToast, setVista }: { setToast: (t: string) => void; setVista?: (v: Vista) => void }) {
  // De dónde salen los datos: del back. Sin back, el mismo contrato llega vacío y la pantalla invita
  // a conectar la cuenta. Nunca de los dos: mezclarlos sería inventarle un mercado al negocio.
  const d = useDatos();
  const hallazgos = d.hallazgos;
  // El motor saliendo a investigar de verdad, disparado desde los estados vacíos.
  const [investigando, setInvestigando] = useState(false);

  // ---------- SU PÚBLICO CALIBRADO Y EL ACIERTO DEL MODELO ----------
  // Los pesos se normalizan una sola vez: la base los puede devolver como número o como texto, y las
  // barras, la lista y los datos tienen que leer exactamente lo mismo.
  const segmentos = (d.calibracion?.por_segmento ?? []).map(s => ({
    segmento: s.segmento, agentes: Number(s.agentes) || 0, peso: Number(s.peso) || 0, origen: s.origen,
  }));
  const pesos = segmentos.map(s => s.peso);
  const etiquetas = segmentos.map(s => s.segmento);

  /**
   * Mientras el back está respondiendo NO se afirma que no hay nada: se dice que se está leyendo.
   * Un «todavía no hay» que dura un segundo es una afirmación falsa.
   */
  const vacio = (titulo: string, texto: string) => d.cargando
    ? { titulo: 'Leyendo el back…', texto: 'El panel está leyendo lo que hay en el servidor. Si no hay nada, lo dice enseguida; mientras tanto no se muestra ninguna cifra inventada.' }
    : { titulo, texto };

  /** Corre la investigación del mercado en el back (investigar no cuesta créditos) y relee los hallazgos. */
  const investigar = async () => {
    setInvestigando(true);
    try {
      const r = await fetch(baseApi() + '/api/agentes/correr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token() },
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({} as { error?: string; detalle?: string }));
        setToast(e?.detalle || e?.error || `No se pudo investigar (error ${r.status})`);
      } else {
        setToast('El equipo salió a investigar su mercado');
      }
    } catch {
      setToast('No se pudo investigar: el servidor no respondió');
    }
    await d.refrescar();
    setInvestigando(false);
  };

  /**
   * La invitación concreta de los estados vacíos: con el back encendido se le pide una investigación
   * al motor; sin back, lo que falta es conectar las cuentas (Primeros pasos). Ninguna gasta.
   */
  const invitar = () => d.real
    ? {
      accion: investigando ? 'El equipo salió a investigar…' : 'Que el motor investigue ahora',
      onAccion: () => { if (!investigando) void investigar(); },
    }
    : {
      accion: 'Conectar mis cuentas',
      onAccion: () => { if (setVista) setVista('onboarding'); setToast('Primeros pasos: conecte sus cuentas y el motor sale a investigar su mercado'); },
    };

  return (
    <div className="dash">
      <ViewHead
        icon={<I_Globe size={19} />}
        titulo="Mercado"
        sub="Lo que el motor encontró en su mercado, con el dato y de dónde salió. Todo sale del back de su negocio."
        nums={[
          { v: String(hallazgos.length), l: hallazgos.length === 1 ? 'hallazgo de su mercado' : 'hallazgos de su mercado' },
          { v: `${d.desvioPct.toLocaleString('es-CO')}%`, l: 'desvío del modelo predictivo', c: 'var(--purple3)' },
          { v: String(d.corridas.length), l: 'veces que el equipo investigó' },
          { v: fechaCorta(d.corridas[0]?.empezada_at) || 'todavía no', l: 'última investigación' },
        ]}
      />

      {/* ============ LOS HALLAZGOS Y EL PÚBLICO, LOS DOS DEL BACK ============ */}
      <div className="duo">
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Zap size={14} style={{ color: 'var(--purple3)' }} /> Lo que encontró el motor en su mercado</span>}
          action={<Badge tone="purple">{hallazgos.length === 1 ? '1 hallazgo' : `${hallazgos.length} hallazgos`}</Badge>}
        >
          {hallazgos.length === 0 ? (
            /* ---------- SIN HALLAZGOS: se dice, y se ofrece la investigación de verdad ----------
               Cada hallazgo trae su dato, su porqué y SU FUENTE a la vista: la fuente no se esconde. */
            investigando ? (
              <div className="tiny" style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--purple3)', fontWeight: 700 }}>
                <I_Zap size={13} /> El equipo salió a investigar su mercado: los hallazgos aparecen aquí en cuanto termine.
              </div>
            ) : d.cargando ? (
              <div className="tiny muted">Leyendo lo que investigó el motor…</div>
            ) : (
              <EstadoVacio
                titulo={d.real ? 'El motor todavía no investigó su mercado' : 'Su mercado todavía no se ha leído'}
                texto={d.real
                  ? 'Todavía no hay ningún hallazgo: el equipo sale a mirar qué está haciendo su competencia y qué está funcionando en su rubro. Lo que encuentra queda aquí con el dato, su porqué y de dónde salió.'
                  : 'El mercado se llena cuando los agentes investiguen: hoy no hay ni un hallazgo suyo. Conecte sus cuentas y el equipo sale a mirar qué está haciendo su competencia y qué está funcionando en su rubro.'}
                {...invitar()} />
            )
          ) : (
            <>
              {hallazgos.map(h => (
                <div key={h.id} className="alarm oportunidad">
                  <div className="alarm-head">
                    <span className="alarm-sev oportunidad">{h.tipo}</span>
                    <span className="tiny muted">{fechaCorta(h.created_at)}</span>
                  </div>
                  <div className="alarm-title" style={{ minWidth: 0 }}>{h.titulo}</div>
                  <div className="alarm-money">
                    <span className="ico" style={{ color: 'var(--purple3)' }}><I_Trend size={14} /></span>
                    <span><b style={{ color: 'var(--purple3)' }}>El dato: </b>{h.dato}</span>
                  </div>
                  <div className="alarm-sug"><b>Por qué importa: </b>{h.porque}</div>
                  <div className="acc-why"><b>Fuente: </b>{h.fuente}</div>
                </div>
              ))}
              <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
                <div className="dato"><span className="dato-l">Hallazgos de su mercado</span><span className="dato-v">{hallazgos.length}</span></div>
                <div className="dato"><span className="dato-l">El más reciente</span><span className="dato-v">{fechaCorta(hallazgos[0].created_at)}</span></div>
                <div className="dato"><span className="dato-l">Desvío del modelo</span><span className="dato-v" style={{ color: d.desvioPct <= 10 ? 'var(--green)' : 'var(--amber)' }}>{d.desvioPct.toLocaleString('es-CO')}%</span></div>
              </div>
              <div className="acc-why">
                Cada hallazgo sale de <b>una fuente concreta</b>: si la fuente no se puede mostrar, el hallazgo no se muestra.
                El desvío de <b>{d.desvioPct.toLocaleString('es-CO')}%</b> es la diferencia entre lo que predijo el modelo y lo que pasó de verdad: con eso corrige la próxima estimación.
              </div>
            </>
          )}
        </Card>

        {/* ---------- SU PÚBLICO CALIBRADO ----------
            Lo que el back sí sabe de su mercado es cómo está repartido su público, con el peso y el
            origen del dato de cada segmento: un peso sin origen no se muestra. */}
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Users size={14} style={{ color: 'var(--purple3)' }} /> Su público, calibrado</span>}
          action={<Badge tone={d.calibracion?.calibrada ? 'purple' : 'muted'}>
            {d.calibracion ? `${d.calibracion.total} agentes` : (d.real ? 'leyendo' : 'sin leer')}
          </Badge>}
        >
          {!d.real ? (
            <EstadoVacio
              titulo="Todavía no se ha leído su público"
              texto="Aquí se ve cómo está repartido su público: los agentes de cada segmento, cuánto pesa cada uno y de dónde salió el dato. Cuando el panel lea su cuenta, aparece en esta tarjeta." />
          ) : !d.calibracion ? (
            /* El back no respondió: se dice eso, no que no haya público. */
            <EstadoVacio
              {...vacio('Todavía no se pudo leer su público', 'Esta tarjeta muestra cómo está repartido su público en el back: los agentes de cada segmento, cuánto pesa cada uno y de dónde salió el dato. El servidor no respondió; vuelva a leerlo y aparece.')}
              accion="Volver a leer"
              onAccion={() => void d.refrescar()}
            />
          ) : !d.calibracion.calibrada ? (
            /* Sin calibrar, el panel entero pesa igual en todos los segmentos: hay que decirlo tal cual. */
            <EstadoVacio
              titulo="Sus 500 agentes trabajan con su propio criterio"
              texto={`Los ${d.calibracion.total} agentes del panel están repartidos en partes iguales: todavía no se calibró con su público real. Cuando el panel lea las proporciones de quienes interactúan con su cuenta, cada segmento empieza a pesar lo que pesa de verdad y esta tarjeta muestra su público, no un promedio.`}
            />
          ) : (
            /* ---------- EL PÚBLICO CALIBRADO, REAL ----------
               El peso va en la barra (se ve la proporción) y cada segmento queda con sus agentes, su
               peso y el origen del dato. */
            <>
              <div className="como-se-lee">
                <b>Cómo se lee:</b> cada barra es un segmento de su público y su altura, cuánto pesa
                dentro del panel. El número de arriba es ese peso como porcentaje de su público real.
                Abajo queda cada segmento con sus agentes, su peso y de dónde salió el dato.
              </div>
              <Bars data={pesos} labels={etiquetas} color="var(--purple2)" fmt={v => pct(v)} />
              <div className="guards">
                {segmentos.map(s => (
                  <div key={s.segmento} className="guard">
                    <I_Users size={14} style={{ color: 'var(--purple3)', flexShrink: 0 }} />
                    <span className="guard-lb">{s.segmento}
                      <small>{origenTexto(s.origen)} · {pct(s.peso)} de su público real</small>
                    </span>
                    <span className="guard-val">{s.agentes} {s.agentes === 1 ? 'agente' : 'agentes'}</span>
                  </div>
                ))}
              </div>
              <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
                <div className="dato"><span className="dato-l">Agentes en su público</span><span className="dato-v">{d.calibracion.total}</span></div>
                <div className="dato"><span className="dato-l">Segmentos</span><span className="dato-v">{segmentos.length}</span></div>
                <div className="dato"><span className="dato-l">Origen del dato</span><span className="dato-v">{origenTexto(d.calibracion.ultima?.origen)}</span></div>
                <div className="dato"><span className="dato-l">Calibrado el</span><span className="dato-v">{fechaCorta(d.calibracion.ultima?.created_at) || 'sin fecha'}</span></div>
              </div>
              <div className="acc-why">
                <b>Fuente: </b>{d.calibracion.ultima?.fuente || 'sin fuente declarada'}
                {d.calibracion.ultima?.created_at ? ` · calibrado el ${fechaCorta(d.calibracion.ultima.created_at)}` : ''}
              </div>
              <div className="acc-why"><b>Confianza: </b>{d.calibracion.confianza}</div>
            </>
          )}
        </Card>
      </div>

      {/* ============ LAS CORRIDAS Y EL ACIERTO DEL MODELO ============
          Cada corrida de la investigación y cada caso medido del modelo, tal como llegan del back:
          con su hora, su estado, su fuente y su fecha. Sin back, las dos tarjetas dicen qué hacer. */}
      <div className="duo" style={{ marginTop: 16 }}>
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Zap size={14} style={{ color: 'var(--purple3)' }} /> Las veces que el equipo investigó</span>}
          action={<Badge tone={d.corridas.length ? 'purple' : 'muted'}>
            {d.corridas.length === 1 ? '1 corrida' : `${d.corridas.length} corridas`}
          </Badge>}
        >
          {d.corridas.length === 0 ? (
            /* Sin corridas no se inventa una investigación: se invita a que los agentes salgan. */
            <EstadoVacio
              {...vacio(
                d.real ? 'El motor todavía no investigó su mercado' : 'El equipo todavía no ha investigado',
                d.real
                  ? 'Cada vez que el motor corre, deja una corrida con lo que hizo cada agente y aparece aquí. Todavía no hay ninguna: no hay ningún resultado de mercado que mostrarle.'
                  : 'El equipo investiga cuando el motor corre, y para eso necesita sus cuentas conectadas. Hasta entonces esta tarjeta no muestra ninguna investigación, porque no hay ninguna.',
              )}
              {...invitar()} />
          ) : (
            <>
              <div className="tl">
                {d.corridas.slice(0, 6).map(c => (
                  <div key={c.id} className="tl-item">
                    <span className="tl-dot" style={{ background: c.estado === 'ok' || c.estado === 'terminada' ? 'var(--green)' : 'var(--amber)' }} />
                    <span className="tl-time">{fechaCorta(c.empezada_at)}</span>
                    <div className="tl-body">
                      <div className="tl-text">
                        <b style={{ color: 'var(--purple3)' }}>El equipo</b> investigó {c.motivo || 'sin motivo cargado'}
                        <span className="tiny muted"> · {c.estado || 'en curso'}{typeof c.creditos === 'number' ? ` · ${c.creditos} créditos` : ''}{c.tareas?.length ? ` · ${c.tareas.length} ${c.tareas.length === 1 ? 'tarea' : 'tareas'}` : ''}</span>
                      </div>
                      {(c.tareas ?? []).slice().sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)).map((t, i) => (
                        <div key={i} className="tl-anchor" style={{ display: 'block' }}>
                          <b style={{ color: 'var(--purple3)' }}>{t.agente}</b> {t.que}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="acc-why">
                Cada línea es una corrida del back: la hora, el estado y los créditos son los que quedaron
                registrados, y cada tarea es de un agente con nombre.
              </div>
            </>
          )}
          <div className="acc-why">
            La investigación del mercado <b>no gasta presupuesto</b>: los agentes leen y comparan, no pautan.
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Target size={14} style={{ color: 'var(--purple3)' }} /> Qué tan cerca le pega el modelo</span>}
          action={<Badge tone={d.backtest && d.backtest.casos ? 'purple' : 'muted'}>
            {d.backtest ? `${d.backtest.casos} ${d.backtest.casos === 1 ? 'caso medido' : 'casos medidos'}` : (d.real ? 'leyendo' : 'sin medir')}
          </Badge>}
        >
          {!d.real ? (
            <EstadoVacio
              titulo="Todavía no hay ningún acierto medido"
              texto="Esta tarjeta mide la predicción contra lo que pasó de verdad: el error promedio y el error de cada caso. Se llena cuando una pieza publicada tenga su resultado real y el panel pueda leerlo del back." />
          ) : !d.backtest ? (
            <EstadoVacio
              {...vacio('Todavía no se pudo leer el acierto del modelo', 'Esta tarjeta mide la predicción contra lo que pasó de verdad: el error promedio y el error de cada caso. El servidor no respondió; vuelva a leerlo y aparece.')}
              accion="Volver a leer"
              onAccion={() => void d.refrescar()}
            />
          ) : d.backtest.casos === 0 ? (
            <EstadoVacio
              titulo="El modelo todavía no se midió contra la realidad"
              texto="Todavía no hay ninguna predicción comparada con lo que pasó. El modelo se corrige con el desvío, y ese desvío existe cuando una pieza publicada tiene su resultado real: en cuanto haya un caso, aquí queda su error y el promedio de todos."
            />
          ) : (
            /* ---------- EL BACKTEST, REAL ----------
               El error de cada caso contra el promedio del propio modelo: verde quedó en el promedio
               o mejor, ámbar se corrió más. La métrica y la fecha van en cada caso, siempre. */
            <>
              <div className="como-se-lee">
                <b>Cómo se lee:</b> el error promedio es la distancia entre lo que predijo el modelo y lo
                que pasó, en la unidad de la métrica. El porcentaje lo pone en relación a lo predicho, para
                poder comparar piezas de tamaños distintos. En la lista, <b style={{ color: 'var(--green)' }}>verde</b> es
                un caso que quedó en ese promedio o mejor, y <b style={{ color: 'var(--amber)' }}>ámbar</b> uno
                que se corrió más.
              </div>
              <div className="datos-row">
                <div className="dato"><span className="dato-l">Error promedio</span><span className="dato-v">{d.backtest.mae ?? '—'}</span></div>
                <div className="dato"><span className="dato-l">Error sobre lo predicho</span><span className="dato-v">{d.backtest.error_pct == null ? '—' : `${d.backtest.error_pct.toLocaleString('es-CO')}%`}</span></div>
                <div className="dato"><span className="dato-l">Casos medidos</span><span className="dato-v">{d.backtest.casos}</span></div>
                <div className="dato"><span className="dato-l">Con métrica real</span><span className="dato-v">{d.backtest.casos_con_metrica_real}</span></div>
              </div>
              <div className="acc-why"><b>Confianza: </b>{d.backtest.confianza}</div>
              <div className="bs" style={{ marginBottom: 8 }}>Caso por caso:</div>
              <div className="guards">
                {(d.backtest.detalle ?? []).length === 0 ? (
                  <div className="bs">
                    El back no mandó el caso por caso: el promedio de arriba es todo lo que hay medido.
                  </div>
                ) : null}
                {(d.backtest.detalle ?? []).map((c, i) => (
                  <div key={i} className="guard">
                    <I_Target size={14} style={{ color: c.error <= (d.backtest?.mae ?? c.error) ? 'var(--green)' : 'var(--amber)', flexShrink: 0 }} />
                    <span className="guard-lb">
                      Predijo {c.predicho.toLocaleString('es-CO')} · pasó {c.real.toLocaleString('es-CO')}
                      <small>{c.metrica || 'reacción del público'} · {c.con_metrica_real ? 'resultado real de su cuenta' : 'reacción de su público'} · {fechaCorta(c.cuando)}</small>
                    </span>
                    <span className="guard-val" style={{ color: c.error <= (d.backtest?.mae ?? c.error) ? 'var(--green)' : 'var(--amber)' }}>
                      error {c.error.toLocaleString('es-CO')}
                    </span>
                  </div>
                ))}
              </div>
              <div className="acc-why">
                <b>Predijo antes de publicar y pasó de verdad:</b> es la única medición que no depende
                del propio modelo. {d.backtest.casos_con_metrica_real === 0
                  ? 'Ninguno tiene todavía la métrica real de la plataforma: se miden contra la reacción de su público.'
                  : d.backtest.casos_con_metrica_real === d.backtest.casos
                    ? 'Todos tienen la métrica real de la plataforma.'
                    : `${d.backtest.casos_con_metrica_real} de ${d.backtest.casos} ${d.backtest.casos_con_metrica_real === 1 ? 'tiene' : 'tienen'} la métrica real de la plataforma; el resto se mide contra la reacción de su público.`}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

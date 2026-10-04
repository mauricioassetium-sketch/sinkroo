import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, Badge, Button } from './ui';
import { I_Robot, I_Search, I_Sparkle, I_Vote, I_Rocket, I_Check, I_Target, I_File, I_Credit } from './icons';
import {
  COSTO_RONDA, PRECIOS_POR_TIPO, QUE_ES_CADA_TIPO, TARIFA, TIPOS_DE_CONTENIDO,
  resumenDeMezcla, detalleDelCosto,
  type CostoRonda, type TipoDeContenido,
} from '../data/mirofish';
import type { Modo } from '../data/demo';
import { useDatos } from '../api/datos';
import { baseApi, token } from '../api/cliente';
import { EstadoVacio } from './EstadoVacio';
import { useEvaluacion, fechaCorta, relojDe, enPalabras, horaCorta } from './mirofishDatos';
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
    candidatas: {
      id: string; angulo: string; formato: string; puntaje: number | null; orden: number | null; titulo: string;
      /** El tipo de contenido que le tocó en la mezcla de la ronda, tal como lo mandó el back. */
      tipo_de_contenido?: TipoDeContenido | null;
    }[];
  }[]>([]);
  const [pidiendo, setPidiendo] = useState(false);
  const [avisoRonda, setAvisoRonda] = useState('');
  const [saldoRondas, setSaldoRondas] = useState<number | null>(null);
  // LO QUE CUESTA Y DE DÓNDE SALIÓ. Arranca con la copia del panel (la de `data/mirofish.ts`, para cuando el
  // back todavía no contestó) y en cuanto contesta /api/rondas se reemplaza por la tarifa DEL BACK: la tabla
  // por tipo y la suma por tipo de la próxima ronda de este negocio. El precio lo pone el back, no la pantalla.
  const [costo, setCosto] = useState<CostoRonda>(COSTO_RONDA);
  const [porTipo, setPorTipo] = useState<Record<string, number>>(PRECIOS_POR_TIPO);
  const [tarifaDelBack, setTarifaDelBack] = useState(false);

  const leerRondas = useCallback(async () => {
    try {
      const r = await fetch(baseApi() + '/api/rondas', { headers: token() ? { Authorization: 'Bearer ' + token() } : {} });
      if (!r.ok) return;
      const j = await r.json();
      setRondas(Array.isArray(j?.rondas) ? j.rondas : []);
      // LA TARIFA DEL BACK: la tabla por tipo y la ronda sumada por tipo (es lo mismo que cobra el libro).
      if (j?.tarifa?.por_tipo) setPorTipo({ ...j.tarifa.por_tipo });
      if (j?.tarifa?.costo_ronda?.total) {
        setCosto({
          piezas: Number(j.tarifa.costo_ronda.piezas),
          crear: Number(j.tarifa.costo_ronda.crear),
          evaluar: Number(j.tarifa.costo_ronda.evaluar),
          total: Number(j.tarifa.costo_ronda.total),
          por_tipo: Array.isArray(j.tarifa.costo_ronda.por_tipo) ? j.tarifa.costo_ronda.por_tipo : [],
          mezcla: Array.isArray(j.tarifa.mezcla) ? j.tarifa.mezcla : [],
        });
        setTarifaDelBack(true);
      }
      if (typeof j?.creditos === 'number') setSaldoRondas(j.creditos);
    } catch { /* sin rondas: la tarjeta lo dice */ }
  }, []);
  useEffect(() => { void leerRondas(); }, [leerRondas]);

  // =============================================================================================
  // LA RONDA EN VIVO: qué está pasando AHORA y cuánto falta.
  // El dueño lo pidió así: «cuando lanzo una ronda no sale en ningún lado que está corriendo, cargando
  // algo… solo toca esperar, no sé cuánto tiempo». El back publica en qué paso va con su detalle
  // (/api/agentes/corriendo) y acá se le pregunta cada 3 segundos MIENTRAS trabaja. También se pregunta al
  // entrar a la pantalla: si recargás la página con una ronda corriendo, la línea de carga sigue ahí.
  // =============================================================================================
  const [enVivo, setEnVivo] = useState<{
    corriendo: boolean;
    corrida: { estado: string; paso: string; detalle: string; paso_de: number; pasos: number; ronda: number;
               avance?: { paso: string; detalle?: string; cuando: string }[]; empezada_at: string; terminada_at?: string | null;
               segundos: number; sin_latido?: boolean; segundos_sin_latido?: number } | null;
    tareas: { agente?: string; que?: string; orden?: number; terminada_at?: string }[];
    pasos_nombres?: string[];
    estimado_seg: number | null;
  } | null>(null);

  const leerEnVivo = useCallback(async () => {
    try {
      const r = await fetch(baseApi() + '/api/agentes/corriendo', { headers: token() ? { Authorization: 'Bearer ' + token() } : {} });
      if (!r.ok) return null;
      const j = await r.json();
      setEnVivo(j);
      return j as { corriendo: boolean } | null;
    } catch { return null; }
  }, []);

  // El refresco de lo que ya está guardado, en una referencia: así el relojito no se rearma en cada render.
  const refrescar = useRef<() => Promise<void>>(async () => {});
  refrescar.current = async () => { await leerRondas(); await d.refrescar(); };

  // Al entrar: ¿hay una ronda corriendo? (esto es lo que faltaba cuando había que recargar la página a mano).
  useEffect(() => { void leerEnVivo(); }, [leerEnVivo]);

  // Mientras corre se pregunta cada 3 s; cuando termina, el relojito se apaga solo y se refresca la pantalla.
  useEffect(() => {
    if (!enVivo?.corriendo && !pidiendo) return;
    const t = setInterval(async () => {
      const j = await leerEnVivo();
      if (j && !j.corriendo) {
        clearInterval(t);
        setPidiendo(false);
        setAvisoRonda('La ronda terminó: abajo están las cinco opciones con su puntaje y cuál ganó.');
        void refrescar.current();
      }
    }, 3000);
    return () => clearInterval(t);
  }, [enVivo?.corriendo, pidiendo, leerEnVivo]);

  const pedirRonda = async () => {
    setPidiendo(true);
    setAvisoRonda('');
    // La petición queda EN VUELO y el panel no se queda esperándola: la respuesta del back llega recién
    // cuando la ronda terminó (minutos después). El avance lo muestra la línea de carga, no la respuesta.
    void leerEnVivo();
    void (async () => {
      try {
        const r = await fetch(baseApi() + '/api/agentes/correr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token() ? { Authorization: 'Bearer ' + token() } : {}) },
          body: JSON.stringify({ ronda: true }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) {
          setAvisoRonda(String(j?.detalle || j?.error || 'el back no dejó pedir la ronda'));
          setPidiendo(false);
        } else {
          await refrescar.current();
          setPidiendo(false);
        }
      } catch {
        setAvisoRonda('no se pudo hablar con el back');
        setPidiendo(false);
      }
      await leerEnVivo();
    })();
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

  // ---- Lo que necesita la línea de carga, ya resuelto ----
  const rv = enVivo?.corrida ?? null;
  const nombresDePasos = enVivo?.pasos_nombres ?? [];
  const pasoDe = rv?.paso_de || 0;
  const totalDePasos = rv?.pasos || nombresDePasos.length || 6;
  // La barra marca PASOS TERMINADOS, no una animación que finge avanzar: el movimiento real de esta línea es
  // el reloj, el detalle (imagen 4 de 6 · opción 2 de 5) y los pasos que se van marcando.
  const pctVivo = totalDePasos ? Math.round((100 * Math.max(0, pasoDe - 1)) / totalDePasos) : 0;
  const minutosDelCierre = rv?.terminada_at ? (Date.now() - new Date(rv.terminada_at).getTime()) / 60000 : null;
  const verLinea = Boolean(rv && (enVivo?.corriendo || pidiendo || (minutosDelCierre !== null && minutosDelCierre < 30)));

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

        {/* ---- EL COSTO: el precio de cada tipo y la ronda sumada por tipo, antes de gastar ---- */}
        <div className="flujo-costo">
          <span className="flujo-costo-ico"><I_Credit size={15} /></span>
          <span className="flujo-costo-tx">
            Una ronda son <b>{costo.piezas} contenidos</b> y cuesta <b>{costo.total} créditos</b>: {costo.crear} al
            crearlos y {costo.evaluar} al pasarlos por MiroFish ({TARIFA.evaluarPieza} por contenido). <b>Como máximo 2 son video</b> y los otros {Math.max(0, costo.piezas - 2)} se reparten entre
            los cuatro tipos que no son video. <b>El público no cuesta.</b>{' '}
            {saldo === null
              ? 'Su saldo todavía no llegó del servidor.'
              : <>Su saldo hoy: <b>{saldo} créditos</b>.</>}
            {' '}
            {tarifaDelBack
              ? 'Estos precios son los del servidor, los mismos que cobra el libro.'
              : 'El servidor todavía no mandó su tarifa: estos son los precios vigentes del proyecto.'}
          </span>
        </div>
        {/* ---- LA TABLA POR TIPO: lo que vale cada contenido, antes de gastar. Los números salen del back
             (`tarifa.por_tipo`); nunca están escritos en la pantalla. ---- */}
        <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {TIPOS_DE_CONTENIDO.map(t => (
            <span key={t} className="guard" style={{ flex: '1 1 46%', minWidth: 210, margin: 0 }}
              title={`${t}: ${QUE_ES_CADA_TIPO[t]}. Cuesta ${porTipo[t] ?? '—'} créditos.`}>
              <span className="guard-lb">
                {t}
                <small>{QUE_ES_CADA_TIPO[t]}</small>
              </span>
              <span className="guard-val" style={{ color: t === 'video' ? 'var(--purple3)' : 'var(--green)' }}>
                {porTipo[t] ?? '—'}
              </span>
            </span>
          ))}
        </div>
        <div className="tiny muted" style={{ marginTop: 8 }}>
          Los créditos son por contenido, según su tipo: el video {porTipo['video'] ?? '—'}, el reel con animación{' '}
          {porTipo['reel con animación'] ?? '—'}, el reel de imágenes {porTipo['reel de imágenes'] ?? '—'}, la imagen
          con texto {porTipo['imagen con texto'] ?? '—'} y el título animado {porTipo['título animado'] ?? '—'}.
          Evaluar cada uno con los 5 jueces y los 500 del público cuesta {TARIFA.evaluarPieza} créditos.
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
          Una ronda son <b>{costo.piezas} contenidos distintos</b> —cada uno entra por otro ángulo y con su tipo,
          y <b>como máximo 2 son video</b>— y cada uno se vota por separado: los 5 jueces y los 500 del público.
          Queda el del puntaje más alto. Cuesta <b>{costo.total} créditos</b>
          {saldoRondas === null ? '.' : <> y su saldo hoy es <b>{saldoRondas}</b>.</>}
          {costo.mezcla.length ? <> Esta ronda viene así: {resumenDeMezcla(costo.mezcla)}.</> : null}
        </div>
        <div className="row" style={{ marginTop: 10, gap: 8, flexWrap: 'wrap' }}>
          <Button
            variant="primary"
            onClick={pedirRonda}
            disabled={pidiendo}
            title={`Pídale al motor una ronda nueva: ${costo.piezas} contenidos, como máximo 2 videos, cada uno con su votación (${costo.total} créditos: ${detalleDelCosto(costo)})`}
          >
            {pidiendo ? 'El motor está escribiendo y votando…' : `Generar una ronda nueva (${costo.piezas} contenidos · ${costo.total} créditos)`}
          </Button>
          {avisoRonda ? <span className="tiny muted" style={{ alignSelf: 'center' }}>{avisoRonda}</span> : null}
        </div>
        {/* ==================== LA RONDA EN VIVO: qué está pasando y cuánto lleva ==================== */}
        {verLinea && rv ? (
          <div className={'mv' + (enVivo?.corriendo ? '' : ' mv-cerrada')}>
            <div className="row spread mv-cab" style={{ gap: 10, flexWrap: 'wrap' }}>
              <span className="row" style={{ gap: 8, alignItems: 'center', minWidth: 0 }}>
                {enVivo?.corriendo ? <span className="mv-pulso" title="el motor está trabajando ahora mismo" /> : <span className="mv-punto" />}
                <b className="mv-t">
                  {enVivo?.corriendo
                    ? `Ronda ${rv.ronda ? rv.ronda + ' en marcha' : 'en marcha'} · paso ${pasoDe} de ${totalDePasos}: ${rv.paso || 'trabajando'}`
                    : rv.estado === 'cortada' ? 'La última ronda se cortó: el servidor se reinició mientras trabajaba'
                      : rv.estado === 'fallida' ? 'La última ronda no terminó'
                        : 'La última ronda terminó'}
                </b>
              </span>
              <span className="tiny muted">
                {enVivo?.corriendo ? <>lleva <b>{relojDe(rv.segundos)}</b></> : null}
                {enVivo?.corriendo && enVivo.estimado_seg
                  ? <> · estimado {enPalabras(enVivo.estimado_seg)} (el promedio real de sus rondas)</>
                  : null}
                {enVivo?.corriendo && !enVivo.estimado_seg && !rv.sin_latido
                  ? <> · todavía sin estimado: no hay rondas terminadas de las que sacarlo</>
                  : null}
                {enVivo?.corriendo && rv.sin_latido
                  ? <> · <b>sin señales desde hace {relojDe(rv.segundos - (rv.segundos_sin_latido || 0))}</b>: puede haberse cortado</>
                  : null}
                {!enVivo?.corriendo && rv.empezada_at && rv.terminada_at
                  ? <>{fechaCorta(rv.empezada_at)} · duró {relojDe((new Date(rv.terminada_at).getTime() - new Date(rv.empezada_at).getTime()) / 1000)}</>
                  : null}
              </span>
            </div>

            {enVivo?.corriendo ? (
              <>
                <div className="mv-pista" title={`${pasoDe - 1} de ${totalDePasos} pasos terminados`}>
                  <i style={{ width: `${pctVivo}%` }} />
                </div>
                {rv.detalle ? <div className="mv-detalle">{rv.detalle}</div> : null}
              </>
            ) : null}

            <div className="mv-pasos">
              {(nombresDePasos.length ? nombresDePasos : []).map((nombre, i) => {
                const n = i + 1;
                const terminoLaCorrida = Boolean(rv.terminada_at) && rv.estado === 'terminada';
                const hecho = terminoLaCorrida || n < pasoDe;
                const ahora = Boolean(enVivo?.corriendo) && n === pasoDe;
                const delRecorrido = (rv.avance ?? []).find(a => a.paso === nombre);
                return (
                  <div key={nombre} className={'mv-paso' + (ahora ? ' mv-on' : '') + (hecho ? ' mv-done' : '')}>
                    <span className="mv-paso-n">{hecho ? '✓' : ahora ? '⟳' : n}</span>
                    <span style={{ minWidth: 0 }}>
                      <span className="mv-paso-t">{nombre}</span>
                      <span className="mv-paso-d">
                        {delRecorrido
                          ? `${delRecorrido.detalle || 'hecho'}${delRecorrido.cuando ? ` · ${horaCorta(delRecorrido.cuando)}` : ''}`
                          : ahora ? 'en esto está ahora' : 'pendiente'}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mv-pie">
              <div className="tiny muted">
                {enVivo?.tareas?.length
                  ? <>{enVivo.tareas.length} {enVivo.tareas.length === 1 ? 'proceso anotado' : 'procesos anotados'} — los últimos:</>
                  : 'Todavía no anotó ningún proceso.'}
              </div>
              {/* LOS ÚLTIMOS PROCESOS, uno por línea: el dueño pidió «indicar lo que está pasando en esa
                  ronda, cada proceso». Van del más nuevo al más viejo y se quedan los 5 últimos. */}
              {(enVivo?.tareas ?? []).slice(-5).reverse().map((t, i) => (
                <div className="mv-proc" key={`${t.orden}-${i}`}>
                  <span className="mv-proc-h">{t.terminada_at ? horaCorta(t.terminada_at) : ''}</span>
                  <span className="mv-proc-q" title={t.que}>{t.que}</span>
                  <span className="mv-proc-a">{t.agente}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {rondas.length === 0 ? (
          <div className="tiny muted" style={{ marginTop: 10 }}>
            Todavía no hay ninguna ronda guardada. Cuando la pida, acá quedan los {costo.piezas} contenidos con su tipo, su puntaje y cuál ganó.
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
                    {c.tipo_de_contenido ? <b className="tag-tipo">{c.tipo_de_contenido}</b> : null}
                    <small>{`${c.formato} · ${c.puntaje == null ? 'todavía sin votar' : `${c.puntaje} de 100 · puesto ${c.orden ?? '—'}`}${c.tipo_de_contenido ? ` · vale ${porTipo[c.tipo_de_contenido] ?? '—'} créditos` : ''}`}</small>
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
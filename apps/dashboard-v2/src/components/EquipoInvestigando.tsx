import { useState } from 'react';
import { Card, Badge, Button } from './ui';
import { I_Zap, I_ArrowRight, I_Users, I_Eye } from './icons';
/**
 * Los seis agentes son el catálogo del equipo: sus nombres, su color y qué hace cada uno son del
 * producto, no del negocio de nadie. No traen ni una tarea, ni un resultado, ni una hora: eso sólo
 * puede venir del back (`d.corridas`).
 */
import { AGENTES, type Agente } from '../data/demo';
import { useDetalle, type Detalle } from './Detalle';
// La capa de datos del panel: con el back encendido (`d.real`) este bloque lee las corridas del
// servidor; sin back el mismo contrato llega vacío y el bloque invita a conectar la cuenta. No hay
// una versión «de ejemplo» de este bloque: simular trabajo sería inventar resultados.
import { useDatos, type Corrida, type TareaCorrida } from '../api/datos';
import { EstadoVacio } from './EstadoVacio';
import { baseApi, token } from '../api/cliente';

// =============================================================================================
// EL EQUIPO TRABAJANDO — las corridas de los 6 agentes, tal como quedaron escritas en el back
//
// Cada línea sale de `d.corridas` (GET /api/agentes/corridas): la corrida con su motivo, su estado,
// sus créditos y una tarea por agente (qué hizo, en qué terminó y en qué orden). Si el negocio
// todavía no corrió el motor NO se simula trabajo: se dice que no hay nada corriendo y se ofrece
// correrlo de verdad (POST /api/agentes/correr), o conectar las cuentas si el panel no está leyendo
// todavía. Un agente sin tarea registrada queda dicho como tal, no pintado trabajando.
//
// Esto NO es la evaluación de una pieza: eso es MiroFish (los 5 jueces + 500 del público) y entra
// cuando hay una pieza que verificar. Aquí se ve la otra mitad: la investigación del mercado.
// =============================================================================================

/** El agente, por id: cada tarea del back dice a quién pertenece. */
const AGENTE_POR_ID: Record<string, Agente> = AGENTES.reduce(
  (m, a) => { m[a.id] = a; return m; }, {} as Record<string, Agente>,
);

/** La hora del back, en corto: día, mes y hora. Se calcula, no se escribe a mano. */
const horaDe = (iso?: string | null) => {
  if (!iso) return '';
  const f = new Date(iso);
  return isNaN(f.getTime())
    ? String(iso)
    : f.toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

/** El resultado que dejó una tarea, en una línea: «clave: valor · clave: valor». Sin detalle, lo dice. */
const resultadoEnLinea = (r?: Record<string, unknown>) => {
  try {
    const partes = Object.entries(r || {})
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`);
    return partes.length ? partes.slice(0, 4).join(' · ') : 'sin detalle cargado';
  } catch { return 'sin detalle cargado'; }
};

/** ¿Esa corrida sigue en curso? Lo dice el estado que devolvió el back, no el panel. */
const enCurso = (estado?: string) => /corriendo|en_curso|en curso|pendiente|abierta/i.test(estado || '');

/** El estado de una corrida, como se lee. Un estado que el panel no conoce se muestra tal como vino. */
const estadoTxt = (estado?: string) => {
  const e = (estado || '').trim();
  if (!e) return 'sin estado';
  if (enCurso(e)) return 'en curso';
  if (/terminad|complet|^ok$/i.test(e)) return 'terminada';
  return e;
};

type PropsEquipo = {
  setToast: (t: string) => void;
  irAGaleria?: () => void;
};

export function EquipoInvestigando({ setToast, irAGaleria }: PropsEquipo) {
  const d = useDatos();
  const detalle = useDetalle();
  // El motor corriendo ahora mismo, pedido desde acá: mientras responde, el botón lo dice.
  const [corriendo, setCorriendo] = useState(false);
  const corridas = d.corridas;
  const ultima = corridas[0] ?? null;
  /**
   * La última tarea registrada de cada agente. Se recorre de la corrida más nueva a la más vieja
   * (el back las devuelve así), y el primer registro que aparece es el más reciente: el agente que
   * no tiene ninguno NO se pinta como si hubiera trabajado.
   */
  const porAgente = new Map<string, { t: TareaCorrida; c: Corrida }>();
  for (const c of corridas) for (const t of c.tareas ?? []) if (!porAgente.has(t.agente)) porAgente.set(t.agente, { t, c });
  const enMarcha = corridas.some(c => enCurso(c.estado));
  const tareasTotales = corridas.reduce((s, c) => s + (c.tareas?.length ?? 0), 0);

  /** Pide una corrida de verdad y vuelve a leer el back: lo que aparezca después es lo que hay. */
  const correr = async () => {
    setCorriendo(true);
    try {
      const r = await fetch(baseApi() + '/api/agentes/correr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token() },
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({} as { error?: string; detalle?: string }));
        setToast(e?.detalle || e?.error || `No se pudo correr el motor (error ${r.status})`);
      } else {
        setToast('El equipo salió a investigar su mercado');
      }
    } catch {
      setToast('No se pudo correr el motor: el servidor no respondió');
    }
    await d.refrescar();
    setCorriendo(false);
  };

  /**
   * La invitación del estado vacío: con el back encendido se le pide una corrida al motor; sin back,
   * lo que falta es conectar las cuentas (Primeros pasos). Ninguna de las dos publica ni gasta.
   */
  const invitar = () => d.real
    ? {
      accion: corriendo ? 'Corriendo el motor…' : 'Correr el motor ahora',
      onAccion: () => { if (!corriendo) void correr(); },
    }
    : {
      accion: 'Conectar mis cuentas',
      onAccion: () => setToast('Primeros pasos: conecte sus cuentas y el equipo empieza a trabajar'),
    };

  /** La galería de MiroFish, sin cifras de la demostración: lo único que dice es lo que el back tiene. */
  const detalleGaleria = (): Detalle => ({
    titulo: 'Dónde quedan las piezas que MiroFish puntuó',
    sub: 'La galería de Campañas es donde viven las piezas que ya pasaron por el panel, cada una con su puntaje.',
    bloques: [
      { tipo: 'datos', filas: [
        { k: 'Dónde está', v: 'Campañas → Galería' },
        { k: 'Quién le pone el número', v: '5 jueces + 500 del público', s: 'dan el veredicto antes de que la pieza se publique' },
        { k: 'Quién investiga el mercado', v: 'Los 6 agentes', s: 'Lux, Rex, Nia, Kai, Sol y Rumi: trabajan y no votan' },
        { k: 'Piezas evaluadas en este negocio', v: String(d.evaluaciones.length), s: d.evaluaciones.length > 0 ? 'tal como están en el back' : 'todavía no hay ninguna' },
      ] },
      { tipo: 'texto', texto: 'Son dos cosas distintas: aquí los 6 agentes investigan su mercado y corren cuando el motor corre; MiroFish entra solo cuando hay una pieza concreta que verificar.' },
    ],
    fuente: 'El back de Sinkroo: las corridas de los agentes y las evaluaciones de MiroFish.',
    acciones: [{ label: 'Cerrar', onClick: () => {} }],
  });
  const verGaleria = () => {
    if (irAGaleria) irAGaleria();
    else detalle(detalleGaleria());
  };

  return (
    <div className="eq-wrap">
      {/* ==================== ENCABEZADO: lo que hay hoy en el back, sin adornos ==================== */}
      <div className="eq-head">
        <div className="eq-head-top">
          <span className="eq-live"><span className="dot-live" /> {d.real ? 'CORRIDAS DEL BACK' : 'SIN LEER TODAVÍA'}</span>
          <span className="eq-head-t">El equipo trabajando: la investigación de su mercado</span>
          <Badge tone={enMarcha ? 'green' : 'muted'}>
            {enMarcha ? 'una corrida en curso' : 'ninguna corrida corriendo'}
          </Badge>
          {d.error ? <Badge tone="red">{d.error}</Badge> : null}
        </div>
        <div className="eq-arranque">
          {d.real ? (
            <>
              Los 6 agentes trabajan cuando el motor corre{d.negocio ? <> en <b>{d.negocio.name}</b></> : null}, y cada
              corrida queda escrita en el servidor. Todo lo de abajo sale de ahí: <b>no hay ninguna línea simulada</b> —
              lo que el back no tiene, esta tarjeta no lo muestra.
            </>
          ) : (
            <>
              Los 6 agentes —Lux, Rex, Nia, Kai, Sol y Rumi— trabajan cuando el motor corre, y cada corrida queda
              escrita en el servidor. Todavía no está leyendo ninguna cuenta suya, así que no hay corridas que
              mostrar: conéctela en Primeros pasos y el equipo empieza. <b>Mientras tanto no hay ninguna línea simulada.</b>
            </>
          )}
        </div>
        <div className="eq-estado">
          <span title="La corrida más reciente que quedó registrada en el back.">
            última corrida: <b>{ultima ? horaDe(ultima.empezada_at) : 'ninguna todavía'}</b></span>
          <span className="eq-sep">·</span>
          <span title="Cuántas corridas devolvió el back para este negocio.">
            corridas registradas: <b>{corridas.length}</b>{corridas.length >= 20 ? ' (las últimas 20)' : ''}</span>
          <span className="eq-sep">·</span>
          <span title="Una tarea por agente y por corrida: el back guarda qué hizo cada uno.">
            tareas registradas: <b>{tareasTotales}</b></span>
          <span className="eq-count">de la corrida más nueva a la más vieja</span>
        </div>
      </div>

      {d.cargando ? (
        <Card action={<Badge tone="purple">leyendo</Badge>}>
          <EstadoVacio
            titulo="Leyendo el back…"
            texto="El panel está leyendo las corridas del servidor. En un momento dice qué hay: si no hay ninguna, lo dice, y si hay, muestra lo que hizo cada agente." />
        </Card>
      ) : corridas.length === 0 ? (
        /* ============ SIN CORRIDAS: no se simula trabajo, se dice lo que pasa y qué hacer ============ */
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Eye size={14} style={{ color: '#22d3ee' }} /> Ahora mismo no hay nada corriendo</span>}
          action={<Badge tone="muted">sin corridas</Badge>}>
          <EstadoVacio
            titulo={d.real ? 'El equipo todavía no dejó ninguna corrida' : 'El equipo todavía no ha corrido'}
            texto={d.real
              ? 'Los 6 agentes —Lux, Rex, Nia, Kai, Sol y Rumi— no están corriendo ahora mismo: el motor corre cuando usted lo pide y, mientras espera, no se simula ningún trabajo. Cada corrida queda escrita en el servidor con lo que hizo cada agente, y aparece aquí con su hora.'
              : 'Los 6 agentes —Lux, Rex, Nia, Kai, Sol y Rumi— no están corriendo: el motor necesita sus cuentas conectadas y su negocio, que es lo que se pone en Primeros pasos. Hasta entonces esta tarjeta no muestra ningún trabajo, porque no lo hay.'}
            {...invitar()} />
        </Card>
      ) : (
        <>
          <div className="duo">
            {/* ============ AGENTE POR AGENTE: su última tarea registrada, con su corrida ============ */}
            <Card className="eq-card"
              title={<span className="row" style={{ gap: 8 }}><I_Users size={14} style={{ color: 'var(--purple3)' }} /> El equipo, agente por agente</span>}
              action={<Badge tone={enMarcha ? 'green' : 'muted'}>{AGENTES.length} agentes</Badge>}>
              <div className="eq-agentes">
                {AGENTES.map(a => {
                  const reg = porAgente.get(a.id);
                  const curso = !!reg && enCurso(reg.c.estado);
                  const clase = curso ? 'working' : 'idle';
                  return (
                    <div key={a.id} className={`eq-ag ${clase}`}>
                      <div className="eq-ag-top">
                        <span className="eq-av" style={{ background: a.color }}>{a.nombre[0]}</span>
                        <span className="eq-nm">{a.nombre}</span>
                        <span className={`eq-est ${clase}`}
                          title={curso
                            ? 'Su tarea está en una corrida que el back todavía tiene en curso.'
                            : reg
                              ? 'Su última tarea quedó registrada con la corrida terminada: no tiene trabajo pendiente.'
                              : 'El back no tiene ninguna tarea de este agente: no se pinta como si hubiera trabajado.'}>
                          {curso ? 'trabajando' : reg ? 'terminó su tarea' : 'sin registro'}
                        </span>
                      </div>
                      <div className="eq-rol" title={a.rol}>{a.rol}</div>
                      <div className="eq-ahora" title={reg ? `${reg.t.que} · corrida del ${horaDe(reg.c.empezada_at)}` : undefined}>
                        <b>Qué hizo: </b>{reg ? reg.t.que : 'Todavía no dejó ninguna tarea en una corrida.'}
                      </div>
                      {reg && (
                        <div className="eq-res" title={resultadoEnLinea(reg.t.resultado)}>
                          <b>→ </b>{resultadoEnLinea(reg.t.resultado)}
                        </div>
                      )}
                      <div className="eq-cz" style={{ marginTop: 6 }}>
                        {reg
                          ? `Corrida del ${horaDe(reg.c.empezada_at)} · ${estadoTxt(reg.c.estado)}`
                          : 'Cuando el motor corra, su tarea aparece aquí.'}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="acc-why">
                Cada agente con <b>la última tarea que dejó escrita en el back</b>, con su resultado y la corrida
                de la que salió. Un agente sin registro queda dicho como tal: no se pinta trabajando.
              </div>
            </Card>

            {/* ============ LA ÚLTIMA CORRIDA, TAREA POR TAREA, Y LAS ANTERIORES ============ */}
            <Card className="eq-card"
              title={<span className="row" style={{ gap: 8 }}><I_Zap size={14} style={{ color: 'var(--purple3)' }} /> La última corrida, tarea por tarea</span>}
              action={<Badge tone={enCurso(ultima.estado) ? 'green' : 'muted'}>{estadoTxt(ultima.estado)}</Badge>}>
              <div className="datos-row">
                <div className="dato"><span className="dato-l">Cuándo</span><span className="dato-v">{horaDe(ultima.empezada_at)}</span></div>
                <div className="dato"><span className="dato-l">Motivo</span><span className="dato-v">{ultima.motivo || 'sin motivo cargado'}</span></div>
                <div className="dato"><span className="dato-l">Agentes que dejaron tarea</span><span className="dato-v">{(ultima.tareas ?? []).length}</span></div>
                <div className="dato"><span className="dato-l">Créditos que usó</span>
                  <span className="dato-v">{typeof ultima.creditos === 'number' ? ultima.creditos : '—'}</span></div>
              </div>
              {(ultima.tareas ?? []).length === 0 ? (
                <div className="bs" style={{ marginTop: 12 }}>Esta corrida no dejó tareas cargadas en el back.</div>
              ) : (
                <div className="tl" style={{ marginTop: 12 }}>
                  {(ultima.tareas ?? []).slice().sort((x, y) => (x.orden ?? 0) - (y.orden ?? 0)).map((t, i) => {
                    const ag = AGENTE_POR_ID[t.agente];
                    return (
                      <div key={i} className="tl-item">
                        <span className="tl-dot" style={{ background: ag?.color ?? 'var(--purple2)' }} />
                        <span className="tl-time">{horaDe(ultima.empezada_at)}</span>
                        <div className="tl-body">
                          <div className="tl-text">
                            <b style={{ color: ag?.color ?? 'var(--purple3)' }}>{ag?.nombre ?? t.agente}</b> {t.que}
                          </div>
                          <div className="tl-anchor">{resultadoEnLinea(t.resultado)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {corridas.length > 1 && (
                <>
                  <div className="bs" style={{ marginTop: 14, marginBottom: 8 }}>
                    {corridas.length === 2
                      ? 'La corrida anterior que devolvió el back:'
                      : `Las ${corridas.length - 1} corridas anteriores que devolvió el back:`}
                  </div>
                  <div className="col-stack">
                    {corridas.slice(1).map(c => (
                      <div key={c.id} className="tiny" style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'baseline' }}>
                        <b>{horaDe(c.empezada_at)}</b>
                        <span className="muted">
                          {c.motivo || 'sin motivo cargado'} · {estadoTxt(c.estado)} · {(c.tareas ?? []).length}{(c.tareas ?? []).length === 1 ? ' tarea' : ' tareas'}
                          {typeof c.creditos === 'number' ? ` · ${c.creditos} créditos` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <div className="acc-why">
                Esto es lo que quedó <b>escrito en el servidor</b> en la última corrida: la hora, el motivo, el
                estado y los créditos son los de la corrida, y las tareas van en el orden en que el motor las hizo.
              </div>
            </Card>
          </div>

          {/* La corrida a mano: el trabajo pendiente de verdad se dispara desde acá, cuando haga falta. */}
          <div className="row" style={{ gap: 9, marginTop: 14, flexWrap: 'wrap' }}>
            <Button className="btn-sm" disabled={corriendo}
              title="Pídale una corrida al motor ahora (POST /api/agentes/correr). Cuando termina, esta tarjeta vuelve a leer el back. No cambia nada del negocio."
              onClick={() => { if (!corriendo) void correr(); }}>
              <I_Zap size={13} /> {corriendo ? 'Corriendo el motor…' : 'Correr el motor ahora'}
            </Button>
            <Button variant="ghost" className="btn-sm" disabled={corriendo}
              title="Vuelva a leer el back: lo que haya ahora es lo que se muestra. No cambia nada del negocio."
              onClick={() => void d.refrescar()}>
              <I_Eye size={13} /> Volver a leer el back
            </Button>
          </div>
        </>
      )}

      {/* ==================== EL PUENTE A MIROFISH ==================== */}
      <div className="eq-puente">
        <span className="eq-puente-t">
          Esto es la <b>investigación del mercado</b>: es de los 6 agentes y no gasta presupuesto.
          Cuando hay una <b>pieza para evaluar</b> (un aviso, un video, una imagen), entra <b>MiroFish</b>:
          los 5 jueces y 500 del público la votan antes de que salga a internet.{' '}
          {d.evaluaciones.length > 0
            ? <>Este negocio ya tiene <b>{d.evaluaciones.length}</b> {d.evaluaciones.length === 1 ? 'pieza evaluada' : 'piezas evaluadas'}.</>
            : <>Este negocio todavía no tiene ninguna pieza evaluada.</>}
        </span>
        <Button variant="ghost" className="btn-sm"
          title="Le lleva a la galería de Campañas, donde están las piezas que MiroFish ya puntuó. No publica nada."
          onClick={verGaleria}>
          <I_Zap size={13} /> Ver la galería de MiroFish <I_ArrowRight size={13} />
        </Button>
      </div>
    </div>
  );
}

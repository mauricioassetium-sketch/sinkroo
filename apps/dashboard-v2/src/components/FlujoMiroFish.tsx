import { useState, useEffect, useRef } from 'react';
import { Card, Badge, Button } from './ui';
import {
  I_Robot, I_Search, I_Sparkle, I_Vote, I_Rocket, I_Check, I_Refresh,
  I_ChevDn, I_ChevUp, I_Film, I_Image, I_File, I_Target, I_Camera,
  I_Credit, I_X, I_Plus, I_Trophy,
} from './icons';
import {
  INVESTIGACION, OPCIONES, PERFILES, rankingDe, puntaje, objeciones, CUANTAS_PASAN,
  CUANTAS_VARIANTES, COSTO_RONDA, TARIFA, costoMejora, variantesDe,
  type Opcion, type CostoRonda, type Objecion,
} from '../data/mirofish';
import type { Modo } from '../data/demo';

// =============================================================================================
// EL FLUJO DE MIROFISH — la cadena completa, en 4 etapas encadenadas:
//   1. Sinkroo investiga el mercado y detecta los colores del competidor que mejor convierte.
//   2. Con eso crea el material: 5 opciones, cada una con su prompt de imagen o video.
//   3. MiroFish las vota y quedan ordenadas del 1 al 5.
//   4. Las 3 primeras pasan a producción: se publican o esperan tu aprobación, según el modo.
//
// Y encima de eso, las dos cosas que el dueño pidió ver:
//   · EL COSTO DE LA RONDA, en el encabezado y con su desglose (160 = 120 crear + 40 evaluar), más
//     el acumulado cuando ya hubo más de una ronda. El público no cuesta: eso se dice siempre.
//   · «OTRA RONDA» NO ARRANCA SOLA: abre un panel chico que pregunta qué mejorar o sumar de la
//     ronda anterior, con opciones para tocar (nunca campos obligatorios) y con una ronda de mejora
//     MÁS BARATA: 3 variantes de la que ganó = 48 de creación + 24 de evaluación = 72 créditos.
// =============================================================================================

type Etapa = 'inicio' | 'investiga' | 'crea' | 'vota' | 'listo';
const NIVEL: Record<Etapa, number> = { inicio: 0, investiga: 1, crea: 2, vota: 3, listo: 4 };
const PASOS = [
  { n: 1, t: 'Investiga', d: 'Mercado y colores que convierten' },
  { n: 2, t: 'Crea', d: '5 opciones con sus prompts' },
  { n: 3, t: 'Vota', d: 'MiroFish las ordena 1 a 5' },
  { n: 4, t: 'Publica', d: 'Las 3 primeras salen' },
];

function IconoFormato({ f }: { f: Opcion['formato'] }) {
  if (f === 'Video vertical') return <I_Film size={15} />;
  if (f === 'Reel') return <I_Camera size={15} />;
  if (f === 'Carrusel') return <I_File size={15} />;
  return <I_Image size={15} />;
}

// Las mejoras que se pueden pedir para la ronda nueva. NO son piezas sueltas: son INSTRUCCIONES
// que llevan las 3 variantes. Por eso elegir varias no cambia el precio: la ronda sale 72 igual.
interface ChipMejora { k: string; t: string; d: string; cr?: number; sub?: Objecion[]; }

export function FlujoMiroFish({ modo, setToast, esAnuncio }: {
  modo: Modo; setToast: (t: string) => void; esAnuncio: boolean;
}) {
  const [etapa, setEtapa] = useState<Etapa>('inicio');
  const [abierta, setAbierta] = useState<string | null>('op1');
  const [publicado, setPublicado] = useState(false);

  // ---- La ronda y su costo: es lo que hay que poder ver antes de gastar ----
  const [lote, setLote] = useState<Opcion[]>(OPCIONES);
  const [costo, setCosto] = useState<CostoRonda>(COSTO_RONDA);
  const [historial, setHistorial] = useState<CostoRonda[]>([COSTO_RONDA]);
  const [mejoraRonda, setMejoraRonda] = useState(false);
  const [base, setBase] = useState<string | null>(null);
  const [pedidos, setPedidos] = useState<string[]>([]);

  // ---- El panel de la ronda nueva: se abre al apretar «Otra ronda», no arranca nada solo ----
  const [panel, setPanel] = useState(false);
  const [elegidas, setElegidas] = useState<string[]>([]);
  const [ojElegidas, setOjElegidas] = useState<string[]>([]);
  const [otra, setOtra] = useState('');

  const nivel = NIVEL[etapa];
  const orden = rankingDe(lote);
  const pasan = orden.slice(0, CUANTAS_PASAN);
  const quedan = orden.slice(CUANTAS_PASAN);

  const mejor = orden[0];                              // la 1ª del ranking: de acá sale la mejora
  const ojs = objeciones(mejor);                       // lo que dejó el panel, de la más dura a la más blanda
  const oj = ojs[0];
  const rondaMejora = costoMejora(CUANTAS_VARIANTES);   // 48 + 24 = 72
  const rondas = historial.length;
  const gastado = historial.reduce((a, r) => a + r.total, 0);

  const timers = useRef<number[]>([]);
  const limpiarTimers = () => {
    timers.current.forEach(t => window.clearTimeout(t));
    timers.current = [];
  };

  // La corrida del flujo: los mismos 4 tiempos para una ronda de cero y para una de mejora.
  const correr = (msgs: [string, string, string, string]) => {
    limpiarTimers();
    setPublicado(false);
    setEtapa('investiga');
    setToast(msgs[0]);
    timers.current = [
      window.setTimeout(() => { setEtapa('crea'); setToast(msgs[1]); }, 1200),
      window.setTimeout(() => { setEtapa('vota'); setToast(msgs[2]); }, 2500),
      window.setTimeout(() => { setEtapa('listo'); setToast(msgs[3]); }, 3900),
    ];
  };

  // Al llegar acá el trabajo ya arrancó solo: en el paso 1 el usuario apretó Iniciar.
  // No hay botón para empezar en esta pantalla: eso era lo que confundía.
  useEffect(() => {
    correr([
      'Sinkroo está investigando el mercado…',
      'Ahora está creando las 5 opciones y sus prompts…',
      'Las 5 entraron a MiroFish: los agentes están votando…',
      'MiroFish las ordenó del 1 al 5: las 3 primeras quedaron seleccionadas',
    ]);
    return limpiarTimers;
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  // Las opciones del panel, con los datos reales de la ronda anterior adentro: la pieza que ganó,
  // su objeción y el costo de la ronda de mejora con el desglose.
  const chips: ChipMejora[] = [
    {
      k: 'ganadora', t: 'Seguir con la que ganó', cr: rondaMejora.total,
      d: `${rondaMejora.piezas} variantes de «${mejor.titulo}»: ${rondaMejora.crear} por crearlas (${TARIFA.crearVariante} cada una) + ${rondaMejora.evaluar} por evaluarlas (${TARIFA.evaluarPieza} cada una) = ${rondaMejora.total} créditos. Salen ${rondaMejora.piezas} en vez de ${TARIFA.piezasRonda}.`,
    },
    {
      k: 'objecion', t: 'Resolver lo que objetaron',
      d: `Que las variantes contesten lo que objetó ${oj.juez} (le puso ${oj.voto}): «${oj.texto}»`,
      sub: ojs,
    },
    { k: 'angulo', t: 'Cambiar el ángulo', d: 'Mismo producto y mismo formato, otro gancho: la variante arranca por otra razón y se vota contra las otras dos.' },
    { k: 'formato', t: 'Cambiar el formato', d: 'Más video o más imagen: cambia cómo se ve la pieza, no lo que dice.' },
    { k: 'prueba', t: 'Sumar prueba social', d: 'Que entren reseñas y clientes reales: es lo que sube el voto del desconfiado.' },
    { k: 'otra', t: 'Otra cosa', d: 'La contás vos en una línea y el motor la suma como instrucción. Es opcional: podés dejarla vacía.' },
  ];

  const pedidosTxt = [
    ...chips.filter(c => elegidas.includes(c.k)).map(c => c.t),
    ...(otra.trim() ? [`«${otra.trim()}»`] : []),
  ];
  const soloOtra = elegidas.length === 1 && elegidas[0] === 'otra' && !otra.trim();
  const listoParaCrear = elegidas.length > 0 && !soloOtra;

  const toggleChip = (k: string) => {
    const ya = elegidas.includes(k);
    setElegidas(ya ? elegidas.filter(x => x !== k) : [...elegidas, k]);
    if (!ya && k === 'objecion' && ojElegidas.length === 0) setOjElegidas([oj.k]);
  };

  const toggleObjecion = (k: string) => {
    setOjElegidas(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]);
  };

  const titleChip = (c: ChipMejora, sel: boolean) =>
    `${c.t}: ${c.d} ${sel
      ? 'Ya está elegida: tocala de nuevo para sacarla y no cambia nada.'
      : 'Tocala para sumarla a la ronda nueva.'} No se gasta nada hasta que aprietes «Crear la ronda nueva», y la ronda anterior queda guardada y sin tocar.`;

  // La ronda nueva: 3 variantes de la que ganó. Reusa la corrida completa, mostrando su costo.
  const crearRonda = () => {
    const pieza = mejor;
    const nueva = costoMejora(CUANTAS_VARIANTES);
    const loteNuevo = variantesDe(pieza);
    setLote(loteNuevo);
    setAbierta(rankingDe(loteNuevo)[0].id);
    setCosto(nueva);
    setMejoraRonda(true);
    setBase(pieza.titulo);
    setPedidos(pedidosTxt);
    setHistorial(h => [...h, nueva]);
    setPanel(false);
    setElegidas([]);
    setOjElegidas([]);
    setOtra('');
    correr([
      `Sinkroo reusa la investigación y agarra «${pieza.titulo}» (${puntaje(pieza)})…`,
      `Ahora escribe las ${nueva.piezas} variantes y sus prompts, con lo que pediste…`,
      `Las ${nueva.piezas} variantes entraron a MiroFish: los agentes están votando…`,
      `Listo: las ${nueva.piezas} variantes quedaron ordenadas y la ronda salió ${nueva.total} créditos`,
    ]);
  };

  const accionDice = modo === 'auto'
    ? 'Se publican solas y quedan en la bitácora, reversibles 24 h'
    : modo === 'shared'
      ? 'Kai te va a pedir el OK antes de publicarlas'
      : 'Quedan listas para que las publiques vos';

  const espera = (n: number, icono: React.ReactNode, t: string, d: string) => (
    <div className="flujo-espera">
      {nivel >= n ? null : <span className="flujo-espera-ico">{icono}</span>}
      {nivel < n ? (<><div className="bt">{t}</div><div className="bs">{d}</div></>) : null}
    </div>
  );

  const trabajando = (n: number, t: string) => nivel === n && n < 4
    ? <div className="flujo-work"><span className="dot-live" /> {t}<span className="flujo-puntos"><i /><i /><i /></span></div>
    : null;

  // Lo que dice la línea del costo: en curso muestra el precio antes de gastarlo, y cuando la ronda
  // terminó confirma lo gastado. Las dos partes suman siempre el total (160 = 120 + 40 · 72 = 48 + 24).
  const enCurso = nivel < 4;
  const creaTx = mejoraRonda
    ? `las ${costo.piezas} variantes de «${base}»`
    : `las ${costo.piezas} opciones`;
  const pasos = PASOS.map(p => {
    if (!mejoraRonda) return p;
    if (p.n === 2) return { ...p, t: 'Crea', d: `${costo.piezas} variantes de la que ganó` };
    if (p.n === 3) return { ...p, d: `MiroFish las ordena 1 a ${costo.piezas}` };
    return p;
  });

  return (
    <>
      {/* ==================== CABECERA DEL FLUJO ==================== */}
      <Card className="flujo-head">
        <div className="row spread" style={{ alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
          <div className="row" style={{ gap: 11, flex: 1, minWidth: 240 }}>
            <span style={{ color: 'var(--purple3)', flexShrink: 0, marginTop: 2 }}><I_Robot size={20} /></span>
            <div style={{ minWidth: 0 }}>
              <div className="bt">Un solo gatillo: <b>Iniciar</b>, en el paso 1</div>
              <div className="bs">
                Subís la info y apretás <b>Iniciar</b>. Ahí no hay nada que tocar: Sinkroo investiga
                quién trae más leads y <b>con qué colores</b>, escribe los prompts de cada imagen y video,
                arma <b>5 opciones</b> y MiroFish las vota y las ordena <b>del 1 al 5</b>.
                Vos decidís después, en la galería.
              </div>
            </div>
          </div>
          <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
            {nivel === 4
              ? <Button variant={panel ? 'ghost' : 'outline'} className="btn-sm"
                  title={panel
                    ? 'Cierra el panel sin crear ninguna ronda: no se gasta un crédito y queda todo como está'
                    : 'Abre el panel para decir qué mejorar o sumar de la ronda anterior. No arranca nada ni gasta nada hasta que aprietes «Crear la ronda nueva»'}
                  onClick={() => setPanel(p => !p)}>
                  {panel ? <><I_X size={13} /> Cancelar</> : <><I_Refresh size={13} /> Otra ronda</>}
                </Button>
              : <Badge tone="purple">{nivel === 0 ? 'arrancando…' : 'trabajando solo…'}</Badge>}
          </div>
        </div>

        <div className="flujo-pasos">
          {pasos.map(p => (
            <div key={p.n} className={`flujo-paso ${nivel > p.n ? 'done' : nivel === p.n ? 'on' : ''}`}>
              <span className="flujo-paso-n">{nivel > p.n ? <I_Check size={13} /> : p.n}</span>
              <span style={{ minWidth: 0 }}>
                <span className="flujo-paso-t">{p.t}</span>
                <span className="flujo-paso-d">{p.d}</span>
              </span>
            </div>
          ))}
        </div>

        {/* ---- EL COSTO DE LA RONDA: visible, con su desglose, y la suma acumulada ---- */}
        <div className="flujo-costo">
          <span className="flujo-costo-ico"><I_Credit size={15} /></span>
          <span className="flujo-costo-tx">
            {enCurso ? 'Esta ronda:' : 'Esta ronda gastó'} <b>{costo.total} créditos</b> — {costo.crear} por crear
            {' '}{creaTx} y {costo.evaluar} por evaluarlas. <b>El público no cuesta.</b>
          </span>
          {rondas > 1 && (
            <span className="flujo-costo-acum"
              title={`Van ${rondas} rondas desde que arrancó la campaña: ${historial.map(r => r.total).join(' + ')} = ${gastado} créditos. Se gasta una sola vez por ronda, y publicar es lo único que gasta dinero.`}>
              <I_Trophy size={13} /> {rondas} rondas: {gastado} créditos
            </span>
          )}
        </div>

        {/* ---- EL PANEL DE LA RONDA NUEVA: chico, adentro del flujo, con opciones para tocar ---- */}
        {panel && (
          <div className="ronda-panel">
            <div className="ronda-panel-h">
              <span className="ronda-panel-t"><I_Sparkle size={14} /> ¿Qué querés mejorar o sumar de la ronda anterior?</span>
              <button className="icon-btn" title="Cierra el panel sin crear ninguna ronda: no se gasta nada"
                onClick={() => setPanel(false)}><I_X size={15} /></button>
            </div>

            <div className="ronda-dejo">
              La ronda anterior dejó <b>«{mejor.titulo}»</b> como la mejor ({puntaje(mejor)}) y una objeción
              de {oj.juez} ({oj.voto}): «{oj.texto}» Por eso la ronda nueva no arranca de cero: sale de acá.
            </div>

            <div className="ronda-chips">
              {chips.map(c => {
                const sel = elegidas.includes(c.k);
                return (
                  <div key={c.k} className={`ronda-chip ${sel ? 'sel' : ''}`}>
                    <button className="ronda-chip-btn" title={titleChip(c, sel)} onClick={() => toggleChip(c.k)}>
                      <span className="ronda-chip-t">
                        <span className="ronda-chip-ico">{sel ? <I_Check size={13} /> : <I_Plus size={13} />}</span>
                        {c.t}
                        {c.cr !== undefined && (
                          <span className={`ronda-chip-cr ${sel ? '' : 'off'}`} title={`${c.cr} créditos por la ronda completa: ${rondaMejora.crear} de creación + ${rondaMejora.evaluar} de evaluación`}>
                            {c.cr} créditos
                          </span>
                        )}
                      </span>
                      <span className="ronda-chip-d">{c.d}</span>
                    </button>

                    {c.k === 'objecion' && sel && c.sub && (
                      <div className="ronda-sub">
                        {c.sub.map(o => {
                          const on = ojElegidas.includes(o.k);
                          return (
                            <button key={o.k} className={`ronda-sub-chip ${on ? 'on' : ''}`}
                              title={`Objeción de ${o.juez}, que le puso ${o.voto}: «${o.texto}» ${on ? 'Ya está adentro de la ronda: tocala para sacarla.' : 'Tocala para que la variante la conteste.'}`}
                              onClick={() => toggleObjecion(o.k)}>
                              <I_Target size={12} /> {o.juez} · {o.voto}: «{o.texto}»
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {c.k === 'otra' && sel && (
                      <input className="ronda-input" value={otra}
                        placeholder="Opcional: en una línea, qué querés cambiar o sumar…"
                        title="Es opcional: si la dejás vacía no pasa nada, la ronda igual se crea con lo demás que elegiste"
                        onChange={e => setOtra(e.target.value)} />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="ronda-foot">
              <span className="ronda-costo">
                Ronda de mejora: <b>{rondaMejora.total} créditos</b> — {rondaMejora.crear} por crear
                {' '}las {rondaMejora.piezas} variantes de «{mejor.titulo}» ({TARIFA.crearVariante} cada una) y
                {' '}{rondaMejora.evaluar} por evaluarlas ({TARIFA.evaluarPieza} cada una). <b>El público no cuesta.</b>
                <small>Sumar más pedidos no sube el precio: son las mismas {rondaMejora.piezas} variantes, con todas las instrucciones adentro. Contra {COSTO_RONDA.total} de empezar de cero, esta ronda sale {COSTO_RONDA.total - rondaMejora.total} créditos menos.</small>
              </span>
              {listoParaCrear ? (
                <Button className="btn-sm"
                  title={`Crea la ronda de mejora por ${rondaMejora.total} créditos: ${rondaMejora.piezas} variantes de «${mejor.titulo}» (${rondaMejora.crear} de creación + ${rondaMejora.evaluar} de evaluación). Se gasta una sola vez y la ronda anterior queda guardada sin tocar: podés volver a mirarla cuando quieras.`}
                  onClick={crearRonda}>
                  <I_Refresh size={13} /> Crear la ronda nueva · {rondaMejora.total} créditos
                </Button>
              ) : (
                <span className="ronda-hint">
                  {soloOtra
                    ? 'Escribí en una línea qué querés cambiar, o destildá «Otra cosa»: no se gasta nada por tocar las opciones.'
                    : 'Elegí una opción para armar la ronda nueva. No se gasta nada hasta que aprietes el botón.'}
                </span>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* ==================== FILA 1: INVESTIGACIÓN Y CREACIÓN ==================== */}
      <div className="duo" style={{ marginTop: 16 }}>
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Search size={14} style={{ color: 'var(--purple3)' }} /> 1 · Lo que investigaron los 6 agentes</span>}
          action={nivel >= 1 ? <Badge tone="purple">{INVESTIGACION.colores.length} colores detectados</Badge> : <Badge tone="muted">sin empezar</Badge>}
        >
          {nivel < 1
            ? espera(1, <I_Search size={22} />, 'Acá aparece la investigación', 'Quién trae más leads, con qué colores y por qué. Tocá «Que Sinkroo lo haga».')
            : (
              <>
                {trabajando(1, 'Leyendo la biblioteca de anuncios de tus competidores')}
                <div>
                  <div className="paleta">
                    {INVESTIGACION.colores.map(c => (
                      <div key={c.hex} className="swatch">
                        <span className="swatch-color" style={{ background: c.hex }} />
                        <span style={{ minWidth: 0 }}>
                          <span className="swatch-n">{c.nombre}</span>
                          <span className="swatch-hex">{c.hex}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="bs" style={{ marginTop: 10 }}>
                    Son los colores de <b>{INVESTIGACION.competidor.nombre}</b>, el competidor que mejor convierte.
                    {INVESTIGACION.competidor.detalle} El motor los usa como base: no para copiar, para parecerse
                    a lo que el mercado ya demostró que funciona.
                  </div>
                </div>
                <div className="guards">
                  {INVESTIGACION.hallazgos.map(h => (
                    <div key={h.t} className="guard">
                      <span style={{ color: 'var(--purple3)', flexShrink: 0 }}><I_Target size={14} /></span>
                      <span className="guard-lb">{h.t}<small>{h.d}</small></span>
                    </div>
                  ))}
                </div>
                <div className="acc-why">
                  Esto no es una opinión del motor: sale de <b>anuncios reales que están corriendo ahora</b>.
                  Los colores que más leads traen se detectan del anuncio con más tiempo activo del competidor que mejor convierte.
                </div>
              </>
            )}
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Sparkle size={14} style={{ color: 'var(--purple3)' }} /> 2 · Lo que crearon los 6 agentes</span>}
          action={nivel >= 2
            ? <Badge tone="purple">{lote.length} {mejoraRonda ? 'variantes' : 'opciones'}</Badge>
            : <Badge tone="muted">sin crear</Badge>}
        >
          {nivel < 2
            ? espera(2, <I_Sparkle size={22} />, mejoraRonda ? `Acá aparecen las ${costo.piezas} variantes` : 'Acá aparecen las 5 opciones',
                'Cada una con su prompt de imagen o video, escrito por el motor, usando los colores que mejor convierten.')
            : (
              <>
                {trabajando(2, mejoraRonda ? 'Escribiendo los cambios en los prompts de las variantes' : 'Escribiendo los prompts y armando las opciones')}
                {mejoraRonda ? (
                  <div className="bs">
                    <b>{lote.length} variantes de «{base}», no {TARIFA.piezasRonda} opciones nuevas:</b> cada una
                    cambia una sola cosa de la que ganó y se vota contra las otras, así ves si la mejora valió
                    la pena. No se vuelve a investigar el mercado: se reusa lo que ya sabés del competidor.
                    {pedidos.length > 0 && <> Lo que pediste: <b>{pedidos.join(' · ')}</b>.</>}
                  </div>
                ) : (
                  <div className="bs">
                    <b>5 opciones distintas, no 5 versiones de lo mismo:</b> cambia el formato y el ángulo.
                    Tocá cualquiera para ver el prompt que escribió el motor.
                  </div>
                )}
                <div className="ops">
                  {lote.map(o => {
                    const on = abierta === o.id;
                    return (
                      <div key={o.id} className={`op ${on ? 'on' : ''}`}>
                        <div className="op-head" onClick={() => setAbierta(on ? null : o.id)}>
                          <span className="op-color" style={{ background: o.color }} />
                          <span className="op-ico" style={{ color: o.color }}><IconoFormato f={o.formato} /></span>
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <span className="op-t">{o.titulo}</span>
                            <span className="op-m">{o.formato} · {o.medida}</span>
                          </span>
                          <span className="op-chevron">{on ? <I_ChevUp size={14} /> : <I_ChevDn size={14} />}</span>
                        </div>
                        {on && (
                          <div className="op-body">
                            <div className="op-gancho">{o.gancho}</div>
                            {o.queCambia && (
                              <div className="op-row"><span className="op-k">Qué le cambia a la que ganó</span><span className="bs">{o.queCambia}</span></div>
                            )}
                            <div className="op-label">El prompt que escribió el motor</div>
                            <div className="op-prompt">{o.prompt}</div>
                            <div className="op-row"><span className="op-k">Texto del anuncio</span><span className="bs">{o.copy}</span></div>
                            <div className="op-row"><span className="op-k">Botón</span><span className="bs">{o.cta}</span></div>
                            <div className="op-tags">
                              <span className="badge badge-purple" style={{ fontSize: 9 }}>usa {o.usaCompetidor}</span>
                              <span className="badge badge-muted" style={{ fontSize: 9 }}>{o.formato}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="acc-why">
                  {mejoraRonda
                    ? <>Cada variante sale <b>{TARIFA.crearVariante} créditos</b> y su evaluación <b>{TARIFA.evaluarPieza}</b>:
                      {' '}esta ronda costó {costo.total} en total, contra {COSTO_RONDA.total} de empezar de cero.
                      La ronda anterior <b>no se toca</b>: queda guardada con sus votos.</>
                    : <>El motor <b>no inventa de cero</b>: parte de tus fotos reales y de lo que encontró en el mercado.
                      Cada opción tiene su prompt guardado, así que podés pedir que la rehaga o que cambie solo el color.</>}
                </div>
              </>
            )}
        </Card>
      </div>

      {/* ==================== FILA 2: VOTACIÓN Y PRODUCCIÓN ==================== */}
      <div className="duo" style={{ marginTop: 16 }}>
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Vote size={14} style={{ color: 'var(--amber)' }} /> 3 · Los 5 jueces las votan y las ordenan</span>}
          action={nivel >= 4
            ? <Badge tone="green">ordenadas 1 a {orden.length}</Badge>
            : <Badge tone="muted">sin votar</Badge>}
        >
          {nivel < 3
            ? espera(3, <I_Vote size={22} />, 'Acá votan los 5 jueces', `Cinco perfiles distintos puntúan cada opción. El promedio define el puesto, del 1 al ${lote.length}.`)
            : (
              <>
                {trabajando(3, 'Los 5 jueces están votando cada opción')}
                <div className="bs">
                  Cada perfil mira algo distinto. El <b>promedio de los 5 votos</b> es el puntaje final y define
                  el puesto: la de arriba es la que más convence.
                </div>
                <div className="rank-votos-head">
                  {PERFILES.map(p => (
                    <span key={p.k} className="rank-voto-h" title={`${p.nombre}: ${p.mira}`}>{p.nombre.split(' ')[0].slice(0, 6)}</span>
                  ))}
                  <span className="rank-voto-h" style={{ color: 'var(--purple3)' }}>prom.</span>
                </div>
                <div className="rank">
                  {orden.map((o, i) => {
                    const pasa = i < CUANTAS_PASAN;
                    return (
                      <div key={o.id} className={`rank-row ${pasa ? 'pasa' : ''}`}>
                        <span className={`rank-pos ${pasa ? 'pasa' : ''}`}>{i + 1}</span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span className="rank-t">{o.titulo}</span>
                          <span className="rank-m">{o.formato} · {o.medida}</span>
                        </span>
                        <span className="rank-votos">
                          {PERFILES.map(p => (
                            <span key={p.k} className={`rank-voto ${o.votos[p.k] >= 85 ? 'hi' : o.votos[p.k] < 70 ? 'lo' : ''}`}
                              title={`${p.nombre}: ${o.votos[p.k]}`}>{o.votos[p.k]}</span>
                          ))}
                        </span>
                        <span className="rank-avg">{puntaje(o)}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="acc-why">
                  {quedan.length > 0
                    ? <>Del 1 al {orden.length}: <b>las {CUANTAS_PASAN} primeras pasan</b>, las otras {quedan.length} quedan guardadas con el voto de cada perfil,
                      así sabés exactamente qué les faltó.</>
                    : <>Las {orden.length} variantes van del 1 al {orden.length} y pasan las {pasan.length}: son la misma pieza que ganó, mejorada.
                      La 1ª es la que más convenció con los cambios que pediste, y las tres quedan con el voto de cada juez.</>}
                </div>
              </>
            )}
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Rocket size={14} style={{ color: 'var(--green)' }} /> 4 · Las {pasan.length} que salen</span>}
          action={nivel >= 4 ? <Badge tone="green">{pasan.length} seleccionadas</Badge> : <Badge tone="muted">sin seleccionar</Badge>}
        >
          {nivel < 4
            ? espera(4, <I_Rocket size={22} />, 'Acá salen las 3 mejores', 'Cuando MiroFish termina de votar, las 3 primeras quedan listas para publicar.')
            : (
              <>
                {pasan.map((o, i) => (
                  <div key={o.id} className="sale">
                    <span className="sale-pos">{i + 1}º</span>
                    <span className="sale-prev" style={{ background: `${o.color}22`, borderColor: `${o.color}66` }}>
                      <span style={{ color: o.color }}><IconoFormato f={o.formato} /></span>
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className="rank-t">{o.titulo}</span>
                      <span className="rank-m">{o.formato} · {o.medida} · {puntaje(o)} puntos</span>
                    </span>
                    <Badge tone="green">sale</Badge>
                  </div>
                ))}

                {quedan.length > 0 && (
                  <div className="bs" style={{ marginTop: 4 }}>
                    <b>Las {quedan.length} que no pasaron:</b> {quedan.map(o => `«${o.titulo}» (${puntaje(o)})`).join(' y ')}.
                    Quedan guardadas, no se pierden.
                  </div>
                )}

                <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
                  {publicado ? (
                    <Badge tone="green">
                      {modo === 'auto' ? 'Publicadas y en la bitácora' : modo === 'shared' ? 'Esperando tu OK en la bitácora' : 'Listas para que las publiques'}
                    </Badge>
                  ) : (
                    <Button className="btn-sm" title={accionDice}
                      onClick={() => { setPublicado(true); setToast(`${accionDice} (demo)`); }}>
                      <I_Rocket size={13} /> {esAnuncio ? 'Publicar las 3' : 'Programar las 3'}
                    </Button>
                  )}
                  {quedan.length > 0 && (
                    <Button variant="ghost" className="btn-sm" title="Le pide al motor que rehaga solo la opción 4 y 5 con lo que objetaron los perfiles"
                      onClick={() => setToast('El motor rehace las 2 que no pasaron (demo)')}>Rehacer las 2 que no pasaron</Button>
                  )}
                </div>

                <div className="acc-why">
                  {modo === 'manual'
                    ? <><b>Estás en Manual:</b> el motor te deja las 3 listas y las publicás vos cuando quieras.</>
                    : modo === 'auto'
                      ? <><b>Estás en Automático:</b> las 3 salen solas y quedan en la bitácora, reversibles 24 h.</>
                      : <><b>Estás en Compartido:</b> el motor prepara todo y te pide el OK antes de publicarlas.</>}
                  {' '}{mejoraRonda
                    ? <>Esta ronda costó <b>{costo.total} créditos</b>: {costo.crear} por crear las {costo.piezas} variantes y {costo.evaluar} por evaluarlas.</>
                    : <>Crear las {costo.piezas} opciones costó {costo.crear} créditos y evaluarlas {costo.evaluar}.</>}
                  {' '}El público no cuesta. Publicar es lo único que gasta dinero.
                </div>
              </>
            )}
        </Card>
      </div>
    </>
  );
}

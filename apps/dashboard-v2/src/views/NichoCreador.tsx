import { useState } from 'react';
import { Card, Badge, Button, Dinero, NotaMoneda } from '../components/ui';
import { ViewHead, BarRow } from '../components/viz';
import {
  I_Globe, I_Eye, I_Trend, I_Film, I_Users, I_Wallet, I_Credit, I_Star, I_Check, I_ArrowRight, I_Plus,
} from '../components/icons';
import { useDetalle } from '../components/Detalle';
import type { Vista } from '../components/Layout';
import {
  NICHO, OPORTUNIDADES, RATES, ETAPAS_PIPELINE, FICHA_CREADOR, AGENTES_CREADOR, GRILLA_CREDITOS,
} from '../data/creador';

// =============================================================================================
// NICHO, EN PIEL DE CREADOR — es «Mercado» mirado por un creador.
//
// Misma vista del Centro de Mando (misma entrada del menú, mismo `vista === 'mercado'`), otro
// idioma: acá no se espía a la competencia de una empresa, se mira el nicho propio — qué trendea,
// qué formato copa el feed, qué marcas están comprando UGC y a cuánto se paga la pieza. Quien mira
// todo esto es Lux, el vigía del nicho: el mismo agente market-analyst del motor, calibrado a un
// creador desde la Ficha.
//
// Regla del panel, igual que en Hoy: cada botón abre el detalle con el dato real adentro o cambia
// algo que se VE en la pantalla (una marca que queda con el pitch enviado, un trend que entra al
// plan del lunes, un rate que pasa a ser el primero). Nada de avisos que se van solos.
//
// Todos los números salen de la data del creador (`NICHO`, `OPORTUNIDADES`, `RATES`,
// `GRILLA_CREDITOS`, `FICHA_CREADOR`): lo único que se calcula es el promedio de un rango de precio
// y el signo de una variación.
// =============================================================================================

/** Los números que hay dentro de un texto ya escrito: `'$120 – $220'` → [120, 220]. */
const numerosDe = (texto: string) => (texto.match(/\d[\d.]*/g) || []).map(n => Number(n.replace(/\./g, '')));

/** El promedio de un rango de precio escrito en la data: `'$120 – $220'` → 170. */
const promedioDe = (rango: string) => {
  const n = numerosDe(rango);
  return n.length ? Math.round(n.reduce((a, b) => a + b, 0) / n.length) : 0;
};

/** Una variación que baja viene con el signo menos adelante: `'-9%'`. */
const esBaja = (variacion: string) => variacion.trim().startsWith('-');

/** La marca del nicho, con lo que ya sabe el pipeline: las dos fuentes son la misma marca. */
type MarcaNicho = {
  marca: string; rubro: string; busca: string; paga: string; encaje: string;
  etapa: string; nota?: string; delNicho: boolean;
};

const MARCAS_NICHO: MarcaNicho[] = [
  ...NICHO.marcasBuscando.map(m => {
    const op = OPORTUNIDADES.find(o => o.marca === m.marca);
    return {
      marca: m.marca,
      rubro: op?.rubro ?? 'De tu nicho',
      busca: m.busca,
      paga: m.paga,
      encaje: m.encaje,
      etapa: op?.etapa ?? ETAPAS_PIPELINE[0],
      nota: op?.nota,
      delNicho: true,
    };
  }),
  ...OPORTUNIDADES.filter(o => !NICHO.marcasBuscando.some(m => m.marca === o.marca))
    .map(o => ({
      marca: o.marca, rubro: o.rubro, busca: o.queBusca, paga: o.paga,
      encaje: o.encaje, etapa: o.etapa, nota: o.nota, delNicho: false,
    })),
];

/** El encaje viene escrito como «Alto», «Medio» o una explicación: acá se vuelve etiqueta. */
const encajeDe = (encaje: string): { txt: string; tono: 'green' | 'amber' | 'muted' } =>
  encaje.startsWith('Alto') ? { txt: 'encaje alto', tono: 'green' }
    : encaje.startsWith('Medio') ? { txt: 'encaje medio', tono: 'amber' }
      : { txt: 'encaje por evaluar', tono: 'muted' };

/** La etapa del pipeline, con el color de lo que está más cerca del cobro. */
const tonoEtapa = (etapa: string): 'green' | 'purple' | 'amber' | 'muted' =>
  etapa === 'Deal' || etapa === 'Cobro' ? 'green'
    : etapa === 'Negociación' || etapa === 'Respuesta' ? 'amber'
      : etapa === 'Pitch' ? 'purple' : 'muted';

/** El precio de la data, en dólares: cada parte de un precio compuesto lleva su «USD». */
const Precio = ({ paga, local = false }: { paga: string; local?: boolean }) => (
  <>
    {paga.split(' + ').map((parte, i) => (
      <span key={parte}>{i > 0 ? ' + ' : ''}<Dinero monto={parte} equivalente={local} /></span>
    ))}
  </>
);

export function ViewNichoCreador({ setToast, setVista }: { setToast: (t: string) => void; setVista: (v: Vista) => void }) {
  const detalle = useDetalle();
  // --- Lo que el creador ya decidió: se ve en la pantalla, no en un aviso que se va solo.
  /** Marcas a las que Rumi ya les mandó el pitch. */
  const [pitches, setPitches] = useState<string[]>([]);
  /** Trends que el creador mandó al plan del lunes (los trabaja Rex). */
  const [enElPlan, setEnElPlan] = useState<string[]>([]);
  /** Trends donde decidió no gastar créditos (los que bajaron). */
  const [podados, setPodados] = useState<string[]>([]);
  /** El rate que Rumi dice primero cuando una marca pregunta cuánto cobra. */
  const [ratePrimero, setRatePrimero] = useState<string>(RATES[0].pieza);

  const lux = AGENTES_CREADOR.find(a => a.id === 'lux')!;
  const rex = AGENTES_CREADOR.find(a => a.id === 'rex')!;
  const nia = AGENTES_CREADOR.find(a => a.id === 'nia')!;
  const rumi = AGENTES_CREADOR.find(a => a.id === 'rumi')!;
  // La grilla de generación: es lo que cuesta producir una pieza de las que pide el nicho.
  const piezaVideo = GRILLA_CREDITOS.find(g => g.pieza.startsWith('Video 5 s estándar')) ?? GRILLA_CREDITOS[0];
  const formatoTop = NICHO.formatosDelFeed[0];
  const formatoUltimo = NICHO.formatosDelFeed[NICHO.formatosDelFeed.length - 1];
  const nivelActual = NICHO.precioPorPieza.find(n => n.nivel.startsWith('Tu nivel')) ?? NICHO.precioPorPieza[0];
  const nivelPauta = NICHO.precioPorPieza.find(n => n.nivel.startsWith('Con uso en pauta')) ?? NICHO.precioPorPieza[NICHO.precioPorPieza.length - 1];
  const ratePauta = RATES.find(r => r.pieza.startsWith('Uso en pauta')) ?? RATES[RATES.length - 1];
  const precioPromedio = promedioDe(nivelActual.rango);
  const pautaNum = numerosDe(nivelPauta.rango);
  const arriba = NICHO.trends.filter(t => !esBaja(t.num));
  const abajo = NICHO.trends.filter(t => esBaja(t.num));
  const altos = MARCAS_NICHO.filter(m => m.encaje.startsWith('Alto')).length;
  const cerradas = OPORTUNIDADES.filter(o => o.etapa === 'Deal').map(o => o.marca);

  // -------------------------------------------------------------------------------------------
  // LO QUE CADA BOTÓN CAMBIA: todo deja marca en la pantalla.
  // -------------------------------------------------------------------------------------------
  const marcarLunes = (que: string) => {
    setEnElPlan(p => p.includes(que) ? p : [...p, que]);
    setPodados(p => p.filter(x => x !== que));
    setToast(`Rex lo pone en el plan del lunes: ${que}`);
  };
  const podar = (que: string) => {
    setPodados(p => p.includes(que) ? p : [...p, que]);
    setEnElPlan(p => p.filter(x => x !== que));
    setToast(`No se gastan créditos ahí: ${que}`);
  };
  const volverTrend = (que: string) => {
    setPodados(p => p.filter(x => x !== que));
    setEnElPlan(p => p.filter(x => x !== que));
    setToast(`Lux lo vuelve a vigilar y lo pone en la propuesta: ${que}`);
  };
  const mandarPitch = (m: MarcaNicho) => {
    const yaFue = pitches.includes(m.marca);
    setPitches(p => p.includes(m.marca) ? p : [...p, m.marca]);
    setToast(yaFue
      ? `Rumi le hace el seguimiento a ${m.marca} y te avisa cuando conteste`
      : `Rumi mandó el pitch a ${m.marca} con tu portafolio y tu rate`);
  };
  const elegirRate = (pieza: string) => {
    setRatePrimero(pieza);
    setToast(`Rumi usa «${pieza}» como primer precio en los pitches nuevos`);
  };
  /** Los rates completos, con la lectura del uso en pauta: es la lista que Rumi usa para responder. */
  const verRates = () => detalle({
    titulo: 'Tus rates',
    sub: 'Lo que cobrás por pieza. Rumi los usa para responder a las marcas y ningún cobro sale sin tu OK.',
    bloques: [
      { tipo: 'datos', filas: RATES.map(r => ({ k: r.pieza, v: r.precio, s: r.nota })) },
      { tipo: 'aviso', tono: 'amber', texto: `El uso en pauta se cobra aparte y vale más que la pieza: la marca paga por mostrarla a gente que no te conoce. En tu nicho, una pieza con uso en pauta se paga ${pautaNum[0]} a ${pautaNum[1]} dólares.` },
    ],
    fuente: 'Tu lista de rates, en la Ficha de creador. Se puede cambiar cuando quieras.',
    acciones: [
      { label: 'Que Rumi use el video corto', title: 'Rumi dice primero el rate de video corto: es el más pedido en tu nicho', onClick: () => elegirRate(RATES[0].pieza) },
    ],
  });
  /** El detalle de una marca: la pieza, el precio, la etapa y las dos acciones del pipeline. */
  const abrirMarca = (m: MarcaNicho) => {
    const enc = encajeDe(m.encaje);
    const enviado = pitches.includes(m.marca);
    detalle({
      titulo: `${m.marca} · ${m.etapa}`,
      sub: `${m.busca}. Encaje con tu perfil: ${m.encaje}`,
      bloques: [
        { tipo: 'datos', filas: [
          { k: 'Marca', v: m.marca, s: `${m.rubro} · ${m.delNicho ? 'la está buscando UGC ahora' : 'ya está en tu pipeline de marcas'}` },
          { k: 'La pieza que piden', v: m.busca, s: 'se paga por pieza entregada, no por tus seguidores' },
          { k: 'Cuánto pagan', v: m.paga, s: 'en dólares por pieza, según lo que se paga en tu nicho' },
          { k: 'Tu encaje', v: enc.txt, tono: enc.tono, s: m.encaje },
          { k: 'Etapa del pipeline', v: m.etapa, s: ETAPAS_PIPELINE.join(' → ') },
          { k: 'Quién la trabaja', v: rumi.nombre, s: rumi.enCreadores },
        ] },
        ...(m.nota ? [{ tipo: 'aviso' as const, texto: m.nota }] : []),
        { tipo: 'texto', texto: 'Ningún cobro sale sin tu OK: mandar los rates y los links de cobro es manual por diseño.' },
      ],
      fuente: 'Lux la detectó buscando UGC en tu nicho y el pipeline de marcas la sigue con las mismas etapas de una campaña.',
      acciones: [
        enviado
          ? { label: 'Que Rumi haga el seguimiento', variante: 'primary', title: 'Rumi insiste con la marca y te avisa cuando conteste: no se manda nada nuevo sin tu OK.', onClick: () => mandarPitch(m) }
          : { label: 'Que Rumi mande el pitch', variante: 'primary', title: 'Rumi arma el mensaje con tu portafolio y tu rate, lo manda por vos y te avisa cuando la marca conteste.', onClick: () => mandarPitch(m) },
        { label: 'Ver mis rates', title: 'Abre tu lista de precios por pieza, la que Rumi usa para responder', onClick: verRates },
      ],
    });
  };

  return (
    <div className="dash">
      <ViewHead
        icon={<I_Globe size={19} />}
        titulo="Nicho"
        sub="Qué trendea, qué formato copa el feed y qué marcas buscan UGC. Lo mira Lux, el vigía de tu nicho, cada 15 minutos."
        nums={[
          { v: String(NICHO.trends.length), l: 'trends detectados en tu nicho', c: 'var(--purple3)' },
          { v: String(NICHO.marcasBuscando.length), l: 'marcas buscando UGC ahora', c: 'var(--green)' },
          { v: <Dinero monto={precioPromedio} />, l: 'precio promedio de una pieza en tu nivel' },
          { v: `${formatoTop.pct}%`, l: `del feed es «${formatoTop.f}»`, c: 'var(--green)' },
        ]}
      />

      {/* ================= LO QUE VIGILA LUX Y LOS FORMATOS DEL FEED ================= */}
      <div className="duo">
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Eye size={14} style={{ color: lux.color }} /> Lo que vigila Lux</span>}
          action={<Badge tone="purple">{NICHO.trends.length} trends · cada 15 min</Badge>}
        >
          <div className="bs">
            Lux es el vigía de tu nicho: no mira a la competencia de una empresa, mira lo que pasa
            alrededor de tu trabajo — qué trendea, qué formato copa el feed y a cuánto se paga la pieza.
          </div>
          <div className="como-se-lee" style={{ marginTop: 10 }}>
            <b>Cómo se lee:</b> el número de cada trend es la variación de la semana contra la anterior
            en tu nicho, <b>no tu desempeño</b>. Abajo está la lectura de negocio: qué conviene grabar
            esta semana y en qué no conviene gastar créditos.
          </div>
          {NICHO.trends.map(t => {
            const baja = esBaja(t.num);
            const apagado = podados.includes(t.t);
            const enPlan = enElPlan.includes(t.t);
            return (
              <div key={t.t} className="guard"
                style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 8, paddingTop: 12, paddingBottom: 12, opacity: apagado ? .5 : 1 }}>
                <span className="row" style={{ gap: 8, width: '100%', flexWrap: 'wrap' }}>
                  <I_Trend size={14} style={{ color: baja ? 'var(--amber)' : 'var(--green)', flexShrink: 0 }} />
                  <span className="bt">{t.t}</span>
                  <Badge tone={baja ? 'amber' : 'green'}>{t.num}</Badge>
                  {enPlan && <Badge tone="green">en el plan del lunes</Badge>}
                  {apagado && <Badge tone="amber">no se gastan créditos acá</Badge>}
                </span>
                <span className="guard-lb" style={{ minWidth: 0 }}>
                  {baja ? 'Qué hacer con esto' : 'Qué dice el vigía'}
                  <small>{t.lectura}</small>
                </span>
                <span className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                  <Button className="btn-sm"
                    title={`Abre la lectura completa de «${t.t}» (${t.num}): qué conviene hacer, qué cuesta en créditos y qué hace cada agente con eso.`}
                    onClick={() => detalle({
                      titulo: `${t.t} · ${t.num} en tu nicho`,
                      sub: t.lectura,
                      bloques: [
                        { tipo: 'datos', filas: [
                          { k: 'Variación de la semana', v: t.num, tono: baja ? 'amber' : 'green', s: 'en tu nicho, contra la semana anterior: no es tu desempeño' },
                          { k: 'Qué conviene hacer', v: baja ? 'No gastar créditos' : 'Grabar una pieza', s: baja ? 'El formato bajó: el equipo deja de proponerlo y no se gasta ahí.' : 'Es de los que crecen: el equipo lo pone primero en la propuesta del lunes.' },
                          { k: 'Qué cuesta grabar eso', v: `${piezaVideo.creditos} créditos`, s: `${piezaVideo.pieza}, de la grilla de generación` },
                          { k: 'Quién lo mira', v: lux.nombre, s: lux.enCreadores },
                          { k: 'Quién lo pone en el plan', v: rex.nombre, s: rex.enCreadores },
                          { k: 'Quién lo produce', v: nia.nombre, s: nia.enCreadores },
                        ] },
                        { tipo: 'aviso', tono: baja ? 'amber' : 'green', texto: baja
                          ? `Las piezas de este formato cuestan ${piezaVideo.creditos} créditos cada una. Gastarlos en un formato que baja es la forma más rápida de quemar la semana: conviene grabar el que crece.`
                          : `${arriba.length} de los ${NICHO.trends.length} trends de tu nicho están creciendo. Una pieza más de este formato entra en el plan del lunes y el panel la puntúa antes de que la publiques.` },
                      ],
                      fuente: 'Lux vigila tu nicho cada 15 minutos: trends, formatos del feed, marcas que buscan UGC y precios por pieza.',
                      acciones: [
                        baja
                          ? { label: 'No gastar créditos acá', variante: 'primary', title: 'El equipo deja de proponer este formato y no se gastan créditos ahí. Reversible cuando quieras.', onClick: () => podar(t.t) }
                          : { label: 'Que Rex lo ponga el lunes', variante: 'primary', title: 'Rex lo suma al plan de contenido del lunes, con su guion y su hook.', onClick: () => marcarLunes(t.t) },
                        { label: 'Ver mis rates', title: 'Abre tu lista de precios por pieza, la que Rumi usa para responder', onClick: verRates },
                      ],
                    })}>
                    Ver qué hacer <I_ArrowRight size={13} />
                  </Button>
                  {apagado ? (
                    <Button variant="outline" className="btn-sm"
                      title={`Vuelve a considerar «${t.t}»: sale de la lista de lo que no se graba y Lux lo sigue vigilando.`}
                      onClick={() => volverTrend(t.t)}>Volver a considerarlo</Button>
                  ) : baja ? (
                    <Button variant="ghost" className="btn-sm"
                      title={`No se gastan créditos ni tiempo en «${t.t}»: el formato bajó y el equipo deja de proponerlo. Reversible.`}
                      onClick={() => podar(t.t)}>No gastar créditos acá</Button>
                  ) : enPlan ? (
                    <Button variant="outline" className="btn-sm"
                      title={`Saca «${t.t}» del plan del lunes: Rex lo reprograma cuando se lo digas.`}
                      onClick={() => volverTrend(t.t)}><I_Check size={12} /> Ya está en el plan</Button>
                  ) : (
                    <Button variant="ghost" className="btn-sm"
                      title={'Rex lo pone en el plan de contenido del lunes: es la pieza que el equipo te va a proponer grabar.'}
                      onClick={() => marcarLunes(t.t)}><I_Plus size={12} /> Que Rex lo ponga el lunes</Button>
                  )}
                </span>
              </div>
            );
          })}
          <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <div className="dato"><span className="dato-l">Trends que crecen</span><span className="dato-v" style={{ color: 'var(--green)' }}>{arriba.length} de {NICHO.trends.length}</span></div>
            <div className="dato"><span className="dato-l">En el plan del lunes</span><span className="dato-v">{enElPlan.length}</span></div>
            <div className="dato"><span className="dato-l">No gastar créditos en</span><span className="dato-v" style={{ color: 'var(--amber)' }}>{abajo.length} formato{podados.length !== abajo.length ? ` · ${podados.length} en pausa` : ''}</span></div>
          </div>
          <div className="acc-why">
            Grabá los {arriba.length} que crecen y no gastes créditos en {abajo.map(t => `«${t.t}»`).join(' ')}:
            una pieza vertical de 5 s cuesta <b>{piezaVideo.creditos} créditos</b>, así que el equipo los pone donde
            el formato sube. Lo que decides acá lo trabaja Rex en el plan del lunes.
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Film size={14} style={{ color: 'var(--green)' }} /> Los formatos que copan el feed</span>}
          action={<Badge tone="green">{formatoTop.pct}% el que gana</Badge>}
        >
          <div className="como-se-lee">
            <b>Cómo se lee:</b> de cada 100 piezas que se publican en tu nicho, cuántas usan ese formato.
            Es el reparto real del feed, no una recomendación: donde está tu formato, ahí está tu audiencia.
          </div>
          <div style={{ marginTop: 8 }}>
            {NICHO.formatosDelFeed.map(f => {
              const gana = f.f === formatoTop.f;
              return (
                <div key={f.f} style={{ padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                  <div className="row spread" style={{ gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span className="bt">{f.f}</span>
                    <span className="row" style={{ gap: 8 }}>
                      {gana && <Badge tone="green">el que gana</Badge>}
                      <span className="tiny" style={{ fontWeight: 800 }}>{f.pct}%</span>
                    </span>
                  </div>
                  <BarRow valor={f.pct} max={100} color={gana ? 'var(--purple2)' : 'var(--border2)'} formato={`${f.pct}%`} />
                </div>
              );
            })}
          </div>
          <div className="bs" style={{ marginTop: 12 }}>
            Tu formato dominante en la Ficha es <b>{FICHA_CREADOR.formatoDominante}</b>: es el mismo que copa
            el feed y el que las marcas piden cuando compran una pieza. Tu equipamiento y tu tiempo alcanzan
            para sostenerlo: {FICHA_CREADOR.equipamiento}, {FICHA_CREADOR.tiempoSemana.toLowerCase()}.
          </div>
          <div className="acc-why">
            El último del reparto («{formatoUltimo.f}», {formatoUltimo.pct}%) es el que menos mira la gente del
            nicho: si una marca te pide eso, conviene decirle el formato que rinde en vez de grabar el que no se ve.
          </div>
          <div className="row" style={{ gap: 9, marginTop: 14, flexWrap: 'wrap' }}>
            <Button className="btn-sm"
              title={`Abre cómo se graba «${formatoTop.f}» (${formatoTop.pct}% del feed): con qué lo grabás, qué cuesta en créditos y quién lo produce.`}
              onClick={() => detalle({
                titulo: `El formato que copa el feed: ${formatoTop.f}`,
                sub: `${formatoTop.pct}% de las piezas del feed de tu nicho usan este formato, y es el que tu Ficha declara dominante.`,
                bloques: [
                  { tipo: 'datos', filas: [
                    { k: 'Del feed de tu nicho', v: `${formatoTop.pct}%`, tono: 'green', s: `contra el ${formatoUltimo.pct}% del último («${formatoUltimo.f}»)` },
                    { k: 'Tu formato dominante', v: FICHA_CREADOR.formatoDominante, s: 'declarado en tu Ficha de creador' },
                    { k: 'Cómo lo grabás', v: FICHA_CREADOR.equipamiento, s: FICHA_CREADOR.tiempoSemana },
                    { k: 'Qué cuesta generarlo', v: `${piezaVideo.creditos} créditos`, s: piezaVideo.pieza },
                    { k: 'Quién lo produce', v: nia.nombre, s: nia.enCreadores },
                    { k: 'Dónde se prueba', v: 'El panel de 5', s: 'puntúa la pieza antes de que la publiques: lo que no pasa, no sale' },
                  ] },
                  { tipo: 'aviso', tono: 'green', texto: `Es el formato de tu Ficha y el que gana el reparto del feed: grabar acá es donde el trabajo rinde, en tus redes y en el portafolio que miran las marcas.` },
                ],
                fuente: 'Reparto de formatos del feed de tu nicho, leído por Lux. El formato dominante sale de tu Ficha de creador.',
                acciones: [
                  { label: 'Que Rex lo ponga el lunes', variante: 'primary', title: 'Rex suma este formato al plan de contenido del lunes.', onClick: () => marcarLunes(formatoTop.f) },
                  { label: 'Ver mis rates', title: 'Abre tu lista de precios por pieza, la que Rumi usa para responder', onClick: verRates },
                ],
              })}>
              <I_Film size={13} /> Ver cómo se graba el que gana
            </Button>
          </div>
        </Card>
      </div>

      {/* ================= LAS MARCAS QUE BUSCAN UGC AHORA ================= */}
      <Card
        title={<span className="row" style={{ gap: 8 }}><I_Users size={14} style={{ color: rumi.color }} /> Las marcas que buscan UGC ahora</span>}
        action={<Badge tone="green">{MARCAS_NICHO.length} marcas · {altos} de encaje alto · {pitches.length} pitch{pitches.length === 1 ? '' : 'es'}</Badge>}
      >
        <div className="bs">
          Es la lista de marcas de tu nicho que están comprando contenido ahora, con la etapa en la que va
          cada una en tu pipeline. Rumi contesta los DMs, arma el pitch y escala cuando la marca pide
          hablar con vos.
        </div>
        <div className="como-se-lee" style={{ marginTop: 10 }}>
          <b>Cómo se lee:</b> el encaje dice cuánto coincide lo que piden con tu nicho, tu formato y tu
          portafolio. La etapa es el lugar del pipeline de marcas: {ETAPAS_PIPELINE.join(' → ')}.
        </div>
        {MARCAS_NICHO.map(m => {
          const enc = encajeDe(m.encaje);
          const enviado = pitches.includes(m.marca);
          return (
            <div key={m.marca} className="guard"
              style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 8, paddingTop: 12, paddingBottom: 12 }}>
              <span className="row" style={{ gap: 8, width: '100%', flexWrap: 'wrap' }}>
                <span className="bt">{m.marca}</span>
                <span className="tiny muted">{m.rubro}</span>
                <Badge tone={enc.tono}>{enc.txt}</Badge>
                <Badge tone={tonoEtapa(m.etapa)}>{m.etapa}</Badge>
                {enviado && <Badge tone="purple">pitch enviado por Rumi</Badge>}
              </span>
              <span className="guard-lb" style={{ minWidth: 0 }}>
                {m.busca}
                <small>{m.nota ?? (m.delNicho
                  ? 'Está buscando UGC en tu nicho: paga por la pieza, no por tus seguidores.'
                  : 'Ya está en tu pipeline: Rumi la trabaja y escala cuando pide hablar con vos.')}</small>
              </span>
              <span className="row spread" style={{ width: '100%', gap: 8, flexWrap: 'wrap' }}>
                <span className="tiny" style={{ fontWeight: 800 }}><Precio paga={m.paga} /></span>
                <span className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                  <Button className="btn-sm"
                    title={`Abre ${m.marca}: la pieza que piden, lo que pagan, tu encaje y la etapa (${m.etapa}) del pipeline, con el pitch y tus rates.`}
                    onClick={() => abrirMarca(m)}>
                    {enviado ? 'Ver el pitch' : 'Ver la marca'} <I_ArrowRight size={13} />
                  </Button>
                  <Button variant="ghost" className="btn-sm"
                    title={`Abre Mensajes, donde vive el DM de ${m.marca} con la respuesta que propone Rumi.`}
                    onClick={() => { setVista('conversaciones'); setToast(`${m.marca}: la conversación está en Mensajes`); }}>
                    Ver el mensaje
                  </Button>
                </span>
              </span>
            </div>
          );
        })}
        <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
          <div className="dato"><span className="dato-l">Encaje alto</span><span className="dato-v" style={{ color: 'var(--green)' }}>{altos} de {MARCAS_NICHO.length}</span></div>
          <div className="dato"><span className="dato-l">Pitches enviados por Rumi</span><span className="dato-v">{pitches.length}</span></div>
          <div className="dato"><span className="dato-l">Ya cerrado</span><span className="dato-v" style={{ color: 'var(--green)' }}>{cerradas.join(', ')}</span></div>
        </div>
        <div className="acc-why">
          El pitch lo manda Rumi con tu portafolio y tu rate, pero <b>el precio y el cobro los decidís vos</b>:
          mandar rates y links de cobro es manual por diseño. La marca que ya te pagó una vez es la que más
          rápido vuelve: {cerradas.join(', ')} es la que está en etapa de entrega.
        </div>
        <NotaMoneda />
      </Card>

      {/* ================= CUÁNTO SE PAGA POR PIEZA Y TUS RATES ================= */}
      <div className="duo" style={{ marginTop: 16 }}>
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Wallet size={14} style={{ color: 'var(--green)' }} /> Cuánto se paga por pieza</span>}
          action={<Badge tone="green">estás en el nivel {NICHO.precioPorPieza.indexOf(nivelActual) + 1} de {NICHO.precioPorPieza.length}</Badge>}
        >
          <div className="como-se-lee">
            <b>Cómo se lee:</b> es lo que se paga en tu nicho, por nivel de creador. El rango es por pieza;
            lo que cambia el nivel no es la calidad del video, es el portafolio y la prueba de que una marca repite.
          </div>
          {NICHO.precioPorPieza.map(n => {
            const nums = numerosDe(n.rango);
            const aca = n.nivel === nivelActual.nivel;
            return (
              <div key={n.nivel} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div className="row spread" style={{ gap: 8, flexWrap: 'wrap' }}>
                  <span className="row" style={{ gap: 8 }}>
                    <I_Star size={14} style={{ color: aca ? 'var(--green)' : 'var(--purple3)', flexShrink: 0 }} />
                    <span className="bt">{n.nivel}</span>
                    {aca && <Badge tone="green">acá estás</Badge>}
                  </span>
                  <span className="tiny row" style={{ gap: 6, fontWeight: 800 }}>
                    <Dinero monto={nums[0]} /> – <Dinero monto={nums[1]} equivalente={false} />
                  </span>
                </div>
                <div className="bs" style={{ marginTop: 4 }}>{n.nota}</div>
              </div>
            );
          })}
          <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <div className="dato">
              <span className="dato-l">Pieza con uso en pauta</span>
              <span className="dato-v" style={{ color: 'var(--green)' }}><Dinero monto={pautaNum[0]} /> a <Dinero monto={pautaNum[1]} equivalente={false} /></span>
            </div>
            <div className="dato">
              <span className="dato-l">Tu rate de uso en pauta</span>
              <span className="dato-v" style={{ color: 'var(--purple3)' }}><Dinero monto={ratePauta.precio} /></span>
            </div>
          </div>
          <div className="acc-why">
            <b>El uso en pauta se cobra aparte y vale más que la pieza</b>: la marca paga por mostrarla a gente
            que no te conoce. Es lo primero que conviene aclarar antes de decir un precio — tu pieza se paga en
            dólares y el equivalente local está al lado de cada importe.
          </div>
          <div className="row" style={{ gap: 9, marginTop: 14, flexWrap: 'wrap' }}>
            <Button className="btn-sm"
              title="Abre cómo se cobra el uso en pauta: tu rate, lo que se paga en tu nicho y por qué se cobra aparte de la pieza."
              onClick={() => detalle({
                titulo: 'Cómo se cobra el uso en pauta',
                sub: 'La marca paga por mostrar tu pieza a gente que no te conoce: es un cobro aparte del precio por pieza.',
                bloques: [
                  { tipo: 'datos', filas: [
                    { k: 'Tu rate de uso en pauta', v: ratePauta.precio, s: ratePauta.nota },
                    { k: 'En tu nicho, con uso en pauta', v: nivelPauta.rango, s: nivelPauta.nota },
                    { k: 'Tu precio por pieza hoy', v: nivelActual.rango, s: nivelActual.nota },
                    { k: 'Cuánto suma una pieza', v: `${pautaNum[1] - numerosDe(nivelActual.rango)[1]} dólares más`, s: 'la diferencia entre el techo con uso en pauta y el techo de tu nivel' },
                    { k: 'Quién lo cobra', v: 'Vos', s: 'enviar rates y links de cobro es manual por diseño: el equipo no cierra precios' },
                  ] },
                  { tipo: 'aviso', tono: 'amber', texto: 'El error más caro es regalar el uso en pauta: la pieza se paga una vez, la pauta la sigue viendo gente nueva. Se dice en el mismo mensaje donde va el precio.' },
                  { tipo: 'texto', texto: `Rumi ya lo tiene en la respuesta cuando una marca pregunta el pack: ${RATES.find(r => r.pieza.startsWith('Pack'))?.nota ?? ''}` },
                ],
                fuente: 'Tu lista de rates y los precios del nicho, leídos por Lux. Los dos salen de la data del creador.',
                acciones: [
                  { label: 'Que Rumi lo use en el pitch', variante: 'primary', title: 'Rumi suma el uso en pauta al precio que propone en los pitches nuevos.', onClick: () => elegirRate(ratePauta.pieza) },
                ],
              })}>
              Ver cómo se cobra <I_ArrowRight size={13} />
            </Button>
            <Button variant="ghost" className="btn-sm"
              title="Abre tu lista de rates completa: es la referencia para hablar con las marcas."
              onClick={verRates}><I_Credit size={13} /> Ver mis rates</Button>
          </div>
          <NotaMoneda />
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Credit size={14} style={{ color: 'var(--purple3)' }} /> Tus rates, para hablar con las marcas</span>}
          action={<Badge tone="purple">{RATES.length} precios</Badge>}
        >
          <div className="bs">
            Es la lista que Rumi usa cuando una marca pregunta cuánto cobrás. <b>Ningún precio sale sin tu OK</b>:
            enviar rates y links de cobro es manual por diseño. El rate marcado es el primero que dice.
          </div>
          {RATES.map(r => {
            const primero = r.pieza === ratePrimero;
            return (
              <div key={r.pieza} className="guard">
                <span style={{ color: primero ? 'var(--green)' : 'var(--purple3)', flexShrink: 0 }}><I_Star size={14} /></span>
                <span className="guard-lb">{r.pieza}
                  {primero && <span className="badge badge-green" style={{ fontSize: 8.5, marginLeft: 6 }}>lo usa primero</span>}
                  <small>{r.nota}</small>
                </span>
                <span className="guard-val" style={{ flexShrink: 0 }}><Dinero monto={r.precio} /></span>
                <Button variant={primero ? 'outline' : 'ghost'} className="btn-sm"
                  title={primero
                    ? `«${r.pieza}» es el precio que Rumi dice primero cuando una marca pregunta. Podés cambiar el orden cuando quieras.`
                    : `Que Rumi diga primero «${r.pieza}» en los pitches nuevos. El precio final siempre lo aprobás vos.`}
                  onClick={() => elegirRate(r.pieza)}>
                  {primero ? <><I_Check size={12} /> El primero</> : 'Que Rumi lo use'}
                </Button>
              </div>
            );
          })}
          <div className="acc-why">
            Los rates son la referencia para hablar con las marcas: cambian el total el <b>pack de tres</b> y el
            <b> uso en pauta</b>, que se cobra aparte. Si una marca pide algo que no está en la lista, el equipo
            arma el precio y te lo pasa a vos antes de contestar.
          </div>
          <div className="row" style={{ gap: 9, marginTop: 14, flexWrap: 'wrap' }}>
            <Button className="btn-sm"
              title="Abre Mensajes: los DMs de marcas y seguidores, con el pitch y los precios que propone Rumi."
              onClick={() => { setVista('conversaciones'); setToast('Los DMs de marcas están en Mensajes'); }}>
              Ver los mensajes de marcas <I_ArrowRight size={13} />
            </Button>
          </div>
          <NotaMoneda />
        </Card>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Card, Badge, Button, Dinero, NotaMoneda } from '../components/ui';
import { ViewHead } from '../components/viz';
import {
  I_File, I_Check, I_Refresh, I_Eye, I_Star, I_Zap, I_Credit, I_Cal, I_Film, I_Users, I_Chat, I_ArrowRight,
} from '../components/icons';
import { useDetalle } from '../components/Detalle';
import type { Vista } from '../components/Layout';
import {
  VISTAS_CREADOR, PIEZAS_CREADOR, GRILLA_CREDITOS, OPORTUNIDADES, ETAPAS_PIPELINE,
  PLANES_CREADOR, RATES, RITMO_SEMANA, FICHA_CREADOR,
} from '../data/creador';

// =============================================================================================
// CONTENIDO, EN PIEL DE CREADOR — «Series activas, piezas del mes y estado de cada una».
//
// En el carril de un creador, la vista de Campañas es esta: el mismo motor (el plan del mes, el
// panel de 5 que puntúa cada pieza, el pipeline de marcas y la grilla de créditos) contado como
// contenido y no como campañas. El equipo propone y el creador aprueba: publicar, regenerar y
// cerrar entregas son las decisiones que se toman acá.
//
// LO QUE MANDA LA REGLA DEL MODELO Y SE VE EN LA PANTALLA: la pieza que el panel rechaza no le
// cuesta créditos al creador — la regeneración por gate la paga el sistema. Por eso una pieza
// frenada muestra «0 créditos tuyos» y su botón de regenerar no suma nada a la semana.
//
// NINGÚN NÚMERO ESTÁ ESCRITO A MANO: los créditos salen de GRILLA_CREDITOS, las marcas y sus pagos
// de OPORTUNIDADES, el plan de PLANES_CREADOR y los textos de PIEZAS_CREADOR / RITMO_SEMANA.
// =============================================================================================

type EstadoPieza = 'borrador' | 'ok' | 'publicada' | 'entregada';

const ESTADO: Record<EstadoPieza, { nombre: string; tono: 'purple' | 'green' | 'amber' | 'muted' }> = {
  borrador: { nombre: 'Borrador', tono: 'muted' },
  ok: { nombre: 'Esperando tu OK', tono: 'amber' },
  publicada: { nombre: 'Publicada', tono: 'green' },
  entregada: { nombre: 'Entregada a la marca', tono: 'purple' },
};

/** Lo que la marca está esperando de una entrega del pipeline. */
type EstadoEntrega = 'pendiente' | 'entregada' | 'cerrada' | 'movida';

const ENTREGA_LB: Record<EstadoEntrega, string> = {
  pendiente: 'En curso',
  entregada: 'Entregada',
  cerrada: 'Cerrada con vos',
  movida: 'Rumi la movió',
};

type Pieza = {
  id: string; titulo: string; /** La clave de PIEZAS_CREADOR: post, historias, entregable, remaster… */
  tipo: string; serie: string; panel: number; estado: EstadoPieza;
  /** La línea exacta de GRILLA_CREDITOS con la que se genera esta pieza. */
  grilla: string; cuando: string; nota: string;
  /** El panel la frenó: no se publica y, si hay que regenerarla, la paga el sistema. */
  gate?: boolean;
  /** Idea de reel: es un post del creador con el guion escrito. */
  reel?: boolean;
  marca?: string;
};

const PIEZAS: Pieza[] = [
  { id: 'p1', titulo: 'Rutina de noche en 30 s', tipo: 'post', serie: 'Piel real', panel: 91, estado: 'publicada',
    grilla: 'Imagen hero (portada o feed)', cuando: 'Salió hace 3 días',
    nota: 'Tu formato dominante: cara a cámara y paso a paso. Es la que mejor retuvo del mes.' },
  { id: 'p2', titulo: 'Lo probé 30 días: lo que cambió', tipo: 'post', serie: 'Lo probé 30 días', panel: 86, estado: 'ok',
    grilla: 'Imagen hero (portada o feed)', cuando: 'Espera tu OK desde ayer',
    nota: 'El formato que más crece en tu nicho: a las marcas les sirve para pauta.' },
  { id: 'p3', titulo: 'Antes y después con piel real', tipo: 'post', serie: 'Piel real', panel: 78, estado: 'borrador', gate: true,
    grilla: 'Imagen hero (portada o feed)', cuando: 'Volvió del panel hace 2 h',
    nota: 'El panel la frenó en 78: abajo de 80 no sale. Nia ya corrigió la objeción del juez que votó más bajo.' },
  { id: 'p4', titulo: 'Lanzamiento: 3 historias', tipo: 'historias', serie: 'Lanzamiento de marca', panel: 84, estado: 'publicada',
    grilla: 'Imagen con texto montado', cuando: 'Salió hace 5 días',
    nota: 'Las tres historias del lanzamiento, con el sticker y el link que pidió la marca.' },
  { id: 'p5', titulo: 'Unboxing con voz y cara', tipo: 'post', reel: true, serie: 'Lo probé 30 días', panel: 88, estado: 'borrador',
    grilla: 'Texto (hook, caption, guion)', cuando: 'Guion listo',
    nota: 'Idea de reel de Rex con el guion escrito. Generar el video es aparte: sale de la grilla.' },
  { id: 'p6', titulo: '3 cosas que no haría con mi piel', tipo: 'post', reel: true, serie: 'Lo probé 30 días', panel: 81, estado: 'ok',
    grilla: 'Texto (hook, caption, guion)', cuando: 'Espera tu OK desde el lunes',
    nota: 'La segunda idea de reel: la cara más personal del perfil, para los que ya te siguen.' },
  { id: 'p7', titulo: 'Foto de producto para Bienestar Sur', tipo: 'entregable', serie: 'Lanzamiento de marca', panel: 92, estado: 'entregada',
    grilla: 'Foto UGC (producto en mano)', cuando: 'Entregada hace 6 días', marca: 'Bienestar Sur',
    nota: 'La que pidió la marca para su ficha de producto: fondo limpio y luz natural.' },
  { id: 'p8', titulo: 'Remaster 4K de la pieza de Bienestar Sur', tipo: 'remaster', serie: 'Lanzamiento de marca', panel: 90, estado: 'entregada',
    grilla: 'Remaster 4K de tu pieza', cuando: 'Entregada hace 2 días', marca: 'Bienestar Sur',
    nota: 'Encuadre, color y sonido: la marca la quiere para su catálogo.' },
  { id: 'p9', titulo: 'Reel para Skincare Natural (cortes de 5 s)', tipo: 'entregable', serie: 'Lanzamiento de marca', panel: 89,
    estado: 'ok', marca: 'Skincare Natural', grilla: 'Video 5 s estándar', cuando: 'Espera tu OK para generar',
    nota: 'La entrega comprometida del viernes: el guion pasó el panel y la marca ya lo aprobó.' },
];

/** Lo que le falta a cada marca del pipeline para tener la pieza en la mano. */
const FALTA: Record<string, { dias: number; falta: string }> = {
  'Skincare Natural': { dias: 0, falta: 'Tu OK para generar el reel: el guion ya pasó el panel y la marca lo aprobó.' },
  'Bienestar Sur': { dias: 0, falta: 'Que cierres el pack de tres: Rumi dejó el precio listo y espera tu OK.' },
  'Verde Vivo': { dias: 9, falta: 'El precio del uso en pauta, que se cobra aparte del precio por pieza.' },
  'Farmacia del Barrio': { dias: 14, falta: 'Que abran el pitch: Rumi lo mandó hace 2 días.' },
  'DermaMarket': { dias: 21, falta: 'El media kit con tus métricas y dos piezas de muestra.' },
};

/** Los días que faltan hasta el próximo día de la semana (0 = domingo … 6 = sábado). */
const hastaElDia = (dia: number) => (dia - new Date().getDay() + 7) % 7 || 7;
// Las dos entregas comprometidas caen en el día que ya está escrito en la data: la de Skincare
// Natural el viernes y el primer entregable de Bienestar Sur el martes.
FALTA['Skincare Natural'].dias = hastaElDia(5);
FALTA['Bienestar Sur'].dias = hastaElDia(2);

/** La fecha real de una entrega: se calcula desde hoy, no se escribe a mano. */
const fecha = (dias: number) =>
  new Date(Date.now() + dias * 86400000).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });

/** El día en que una pieza sale a las redes. */
const hoy = () => new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });

/** Los créditos de una pieza, leídos de la grilla de generación. */
const costoDe = (grilla: string) => GRILLA_CREDITOS.find(g => g.pieza === grilla)?.creditos ?? 0;

/** El primer importe que aparece en un texto de la data: '$420 por las tres' → 420. */
const usdDe = (texto: string) => Number((/\$\s?([\d.]+)/.exec(texto)?.[1] ?? '0').replace(/\./g, ''));

/** El rate del video corto, leído de la lista de precios del creador: es la pieza más pedida. */
const RATE_VIDEO = RATES[0];

export function ViewContenidoCreador({ setToast, setVista }: { setToast: (t: string) => void; setVista: (v: Vista) => void }) {
  const detalle = useDetalle();
  // --- Lo que cada botón cambia, y se ve: el estado de la pieza, su puntaje, el día en que salió,
  // las que volvieron del panel, la etapa de una marca y lo que le falta a su entrega.
  const [estados, setEstados] = useState<Record<string, EstadoPieza>>({});
  const [paneles, setPaneles] = useState<Record<string, number>>({});
  const [salidas, setSalidas] = useState<Record<string, string>>({});
  const [regen, setRegen] = useState<string[]>([]);
  const [lote, setLote] = useState<string[] | null>(null);
  const [etapas, setEtapas] = useState<Record<string, string>>({});
  const [entregas, setEntregas] = useState<Record<string, EstadoEntrega>>({});
  const [serieSel, setSerieSel] = useState<string | null>(null);
  const plan = PLANES_CREADOR.find(p => p.key === 'pro')!;

  const estadoDe = (p: Pieza): EstadoPieza => estados[p.id] ?? p.estado;
  const panelDe = (p: Pieza) => paneles[p.id] ?? p.panel;
  const colorPanel = (s: number) => (s >= 80 ? 'var(--green)' : s >= 60 ? 'var(--amber)' : 'var(--red)');
  const tipoNombre = (p: Pieza) => PIEZAS_CREADOR.find(t => t.key === p.tipo)?.nombre ?? p.tipo;
  const etapaDe = (marca: string, etapa: string) => etapas[marca] ?? etapa;
  const entregaDe = (marca: string): EstadoEntrega => entregas[marca] ?? 'pendiente';

  /** Los créditos que le cuesta al creador: lo que el panel rechazó no se cobra. */
  const costoDePieza = (p: Pieza) => (p.gate ? 0 : costoDe(p.grilla));
  const costoDelSistema = (p: Pieza) => (p.gate ? costoDe(p.grilla) : 0);

  // ============================ LOS NÚMEROS, TODOS DE LA DATA ============================
  const arriba80 = PIEZAS.filter(p => panelDe(p) >= 80).length;
  const costoSemana = PIEZAS.reduce((s, p) => s + costoDePieza(p), 0);
  const costoGate = PIEZAS.reduce((s, p) => s + costoDelSistema(p), 0);
  const pctPlan = Math.round((costoSemana / plan.creditosMes) * 100);
  const entregasSemana = OPORTUNIDADES.filter(o => FALTA[o.marca].dias <= 7).length;
  const cerrado = OPORTUNIDADES.filter(o => o.etapa === 'Deal' || o.etapa === 'Negociación')
    .reduce((s, o) => s + usdDe(o.paga), 0);
  const todoElPipeline = OPORTUNIDADES.reduce((s, o) => s + usdDe(o.paga), 0);

  // El plan del mes, contado desde las piezas: 3 posts, 1 secuencia de historias, 2 ideas de reel.
  const posts = PIEZAS.filter(p => p.tipo === 'post' && !p.reel).length;
  const historias = PIEZAS.filter(p => p.tipo === 'historias').length;
  const reels = PIEZAS.filter(p => p.reel).length;
  /** Los posts del mes, agrupados por serie: es lo que hace que las series estén «activas». */
  const series = [...new Set(PIEZAS.map(p => p.serie))].map(nombre => {
    const del = PIEZAS.filter(p => p.serie === nombre);
    return {
      nombre,
      piezas: del.length,
      panel: Math.round(del.reduce((s, p) => s + panelDe(p), 0) / del.length),
      frenadas: del.filter(p => p.gate && estadoDe(p) === 'borrador').length,
      salidas: del.filter(p => estadoDe(p) === 'publicada' || estadoDe(p) === 'entregada').length,
    };
  });

  const visibles = serieSel ? PIEZAS.filter(p => p.serie === serieSel) : PIEZAS;
  const esperan = visibles.filter(p => estadoDe(p) === 'ok' && panelDe(p) >= 80);
  const cuantasEsperan = PIEZAS.filter(p => estadoDe(p) === 'ok' && panelDe(p) >= 80).length;

  const cuandoDe = (p: Pieza) => {
    if (salidas[p.id]) return `Salió a tus redes el ${salidas[p.id]}`;
    if (regen.includes(p.id)) return 'La regeneró el sistema y volvió al panel';
    if (p.estado === 'publicada' && estadoDe(p) !== 'publicada') return 'La sacaste de tus redes: espera tu OK';
    return p.cuando;
  };

  /** Lo que le falta a una entrega, según cómo quedó la conversación con la marca. */
  const faltaDe = (o: (typeof OPORTUNIDADES)[number]) => {
    const e = entregaDe(o.marca);
    if (e === 'entregada') return 'El cobro: Rumi arma el link y no sale sin tu OK.';
    if (e === 'cerrada') return `El primer entregable: la fecha es el ${fecha(FALTA[o.marca].dias)}.`;
    if (e === 'movida') return 'Esperar la respuesta: Rumi la sigue y te avisa cuando conteste.';
    return FALTA[o.marca].falta;
  };

  // ============================ LOS BOTONES QUE HACEN (y se ve en la pantalla) ============================

  /** Publicar una pieza: cambia su estado, le pone la fecha y baja lo que espera tu OK. */
  const publicar = (p: Pieza) => {
    setEstados(s => ({ ...s, [p.id]: 'publicada' }));
    setSalidas(s => ({ ...s, [p.id]: hoy() }));
    setToast(`«${p.titulo}» salió a tus redes con el texto que aprobó el panel`);
  };
  const bajar = (p: Pieza) => {
    setEstados(s => ({ ...s, [p.id]: 'ok' }));
    setSalidas(s => { const n = { ...s }; delete n[p.id]; return n; });
    setToast(`«${p.titulo}» volvió a tu OK: no está en tus redes`);
  };

  /** La pieza que el panel rechazó: regenerarla no cuesta créditos, los paga el sistema. */
  const regenerar = (p: Pieza) => {
    setRegen(r => [...r, p.id]);
    setPaneles(s => ({ ...s, [p.id]: 87 }));
    setEstados(s => ({ ...s, [p.id]: 'ok' }));
    setToast(`«${p.titulo}» volvió del panel con 87: los ${costoDe(p.grilla)} créditos de regenerarla los pagó el sistema`);
  };
  const volverALaDeAntes = (p: Pieza) => {
    setRegen(r => r.filter(x => x !== p.id));
    setPaneles(s => { const n = { ...s }; delete n[p.id]; return n; });
    setEstados(s => ({ ...s, [p.id]: 'borrador' }));
    setToast(`«${p.titulo}» vuelve a la versión que el panel frenó: 78`);
  };

  /** La semana de una sola vez: publica todas las que están arriba de 80 y esperan tu OK. */
  const publicarSemana = () => {
    const ids = PIEZAS.filter(p => estadoDe(p) === 'ok' && panelDe(p) >= 80).map(p => p.id);
    setEstados(s => { const n = { ...s }; ids.forEach(id => { n[id] = 'publicada'; }); return n; });
    setSalidas(s => { const n = { ...s }; ids.forEach(id => { n[id] = hoy(); }); return n; });
    setLote(ids);
    setToast(`${ids.length} piezas salieron a tus redes el ${hoy()}`);
  };
  const deshacerSemana = () => {
    const ids = lote ?? [];
    setEstados(s => { const n = { ...s }; ids.forEach(id => { n[id] = 'ok'; }); return n; });
    setSalidas(s => { const n = { ...s }; ids.forEach(id => { delete n[id]; }); return n; });
    setLote(null);
    setToast(`${ids.length} piezas volvieron a esperar tu OK: no se publicó nada`);
  };

  /** Las tres decisiones del pipeline: registrar la entrega, cerrar el pack o insistir con Rumi. */
  const accionDe = (o: (typeof OPORTUNIDADES)[number]) => {
    const etapa = etapaDe(o.marca, o.etapa);
    if (etapa === 'Deal') return {
      label: 'Registrar la entrega',
      title: `${o.marca} recibe la pieza: queda registrada y Rumi deja el cobro listo para tu OK. Es reversible: con Deshacer vuelve a decir que falta entregarla.`,
      run: () => { setEntregas(e => ({ ...e, [o.marca]: 'entregada' })); setToast(`${o.marca}: entrega registrada. El cobro te espera antes de salir`); },
    };
    if (etapa === 'Negociación') return {
      label: 'Cerrar el pack de tres',
      title: `Cierra el pack de tres piezas con el uso en pauta: la marca queda avisada y Rumi agenda la entrega. Es reversible: podés dejarlo otra vez en negociación.`,
      run: () => { setEntregas(e => ({ ...e, [o.marca]: 'cerrada' })); setToast(`${o.marca}: pack cerrado. El primer entregable sale el ${fecha(FALTA[o.marca].dias)}`); },
    };
    if (etapa === 'Respuesta') return {
      label: 'Que Rumi conteste el precio',
      title: `Rumi contesta con el precio del uso en pauta, que se cobra aparte de la pieza. Es reversible: la respuesta vuelve a esperar tu OK.`,
      run: () => { setEntregas(e => ({ ...e, [o.marca]: 'movida' })); setToast(`${o.marca}: Rumi contestó con el precio del uso en pauta`); },
    };
    return {
      label: 'Que Rumi insista',
      title: `Rumi vuelve a escribirle a ${o.marca} y la marca pasa de Pitch a Respuesta en el pipeline. Es reversible: con Deshacer vuelve al pitch original.`,
      run: () => {
        setEtapas(t => ({ ...t, [o.marca]: 'Respuesta' }));
        setEntregas(e => ({ ...e, [o.marca]: 'movida' }));
        setToast(`${o.marca}: el pitch salió y pasó a la etapa de Respuesta`);
      },
    };
  };
  const deshacerEntrega = (marca: string) => {
    setEntregas(e => { const n = { ...e }; delete n[marca]; return n; });
    setEtapas(t => { const n = { ...t }; delete n[marca]; return n; });
    setToast(`${marca}: la entrega vuelve a como estaba`);
  };

  /** El panel de detalle de una pieza: el puntaje, su costo en créditos y por qué está donde está. */
  const verPieza = (p: Pieza) => detalle({
    titulo: p.titulo,
    sub: `${tipoNombre(p)} de la serie «${p.serie}». El panel la puntuó ${panelDe(p)} de 100 y el mínimo para publicar es 80.`,
    bloques: [
      { tipo: 'datos', filas: [
        { k: 'Puntaje del panel', v: `${panelDe(p)} de 100`, tono: panelDe(p) >= 80 ? 'green' : 'amber',
          s: panelDe(p) >= 80 ? 'pasa: arriba de 80 se publica' : 'no llega al mínimo de 80: no sale' },
        { k: 'Estado', v: ESTADO[estadoDe(p)].nombre, s: cuandoDe(p) },
        { k: 'Serie', v: p.serie, s: 'lo que hace que la serie siga viva este mes' },
        { k: 'Tipo de pieza', v: tipoNombre(p), s: PIEZAS_CREADOR.find(t => t.key === p.tipo)?.para },
        { k: 'Lo que cuesta generarla', v: p.gate ? 'Nada: 0 créditos tuyos' : `${costoDe(p.grilla)} créditos`,
          s: `grilla: ${p.grilla}` },
        ...(p.marca ? [{ k: 'Es para', v: p.marca, s: 'la entrega va a esta marca del pipeline' }] : []),
      ] },
      { tipo: 'texto', texto: p.nota },
      ...(p.marca ? [{ tipo: 'texto' as const, texto: `La entrega para ${p.marca}: ${faltaDe(OPORTUNIDADES.find(o => o.marca === p.marca)!)}` }] : []),
      ...(p.gate ? [{ tipo: 'aviso' as const, texto: 'La pieza que el panel rechaza no te cuesta créditos: si hay que regenerarla, los paga el sistema.' }] : []),
    ],
    fuente: 'El puntaje y el estado de la pieza del mes · los créditos salen de la grilla de generación.',
    acciones: [
      ...(panelDe(p) >= 80 && estadoDe(p) === 'ok'
        ? [{ label: 'Publicar', variante: 'primary' as const, title: 'Sale a tus redes con el texto que aprobó el panel. Es reversible: la sacás cuando quieras.', onClick: () => publicar(p) }]
        : []),
      ...(estadoDe(p) === 'publicada'
        ? [{ label: 'Sacarla de mis redes', title: 'La baja de tus redes. Es reversible: vuelve a esperar tu OK y no pierde el historial.', onClick: () => bajar(p) }]
        : []),
      ...(p.gate && estadoDe(p) === 'borrador'
        ? [{ label: 'Regenerarla sin costo', variante: 'primary' as const, title: `Nia corrige la objeción y el panel la vuelve a votar. No gasta créditos tuyos: los ${costoDe(p.grilla)} los paga el sistema. Es reversible.`, onClick: () => regenerar(p) }]
        : []),
      ...(p.marca
        ? [{ label: 'Ver la entrega', title: `Qué falta para que ${p.marca} tenga la pieza en la mano`, onClick: () => setVista('conversaciones') }]
        : []),
    ],
  });

  const vista = (
    <div className="dash">
      <ViewHead
        icon={<I_File size={19} />}
        titulo={VISTAS_CREADOR.campanas.nombre}
        sub={VISTAS_CREADOR.campanas.sub}
        nums={[
          { v: String(PIEZAS.length), l: 'piezas del mes' },
          { v: String(arriba80), l: 'con el panel arriba de 80', c: 'var(--green)' },
          { v: String(entregasSemana), l: 'entregas de marcas esta semana', c: 'var(--amber)' },
          { v: String(costoSemana), l: 'créditos que cuesta la semana', c: 'var(--purple3)' },
        ]}
      />

      {/* LA REGLA DEL MODELO, CON LAS PIEZAS DEL MES ADENTRO: el gate no se le cobra al creador. */}
      <div className="onb-infiere" style={{ marginTop: 0 }}>
        <span className="onb-infiere-ic"><I_Zap size={13} /></span>
        <span>
          <b>La pieza que el panel rechaza no te cuesta créditos: la regeneración por gate la paga el sistema. </b>
          De las {PIEZAS.length} piezas del mes, {PIEZAS.filter(p => p.gate).length} volvió del panel y sus{' '}
          {costoGate} créditos no salieron de tu cuenta.
        </span>
      </div>

      {/* EL PLAN DEL MES Y LAS SERIES: qué armó Rex y qué series quedan vivas con esas piezas. */}
      <div className="duo" style={{ marginTop: 16 }}>
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Star size={14} style={{ color: 'var(--purple3)' }} /> El plan del mes que armó Rex</span>}
          action={<Badge tone="purple">{series.length} series activas</Badge>}
        >
          <div className="bs">
            Rex armó el mes sobre tu Ficha: <b>{FICHA_CREADOR.nicho}</b>. {RITMO_SEMANA.lunes.audiencia}
          </div>
          {[
            { icono: <span style={{ fontSize: 15 }}>{PIEZAS_CREADOR.find(t => t.key === 'post')?.icono}</span>, nombre: tipoNombreDe('post'), para: PIEZAS_CREADOR.find(t => t.key === 'post')?.para ?? '', n: posts },
            { icono: <span style={{ fontSize: 15 }}>{PIEZAS_CREADOR.find(t => t.key === 'historias')?.icono}</span>, nombre: tipoNombreDe('historias'), para: PIEZAS_CREADOR.find(t => t.key === 'historias')?.para ?? '', n: historias },
            { icono: <I_Film size={14} style={{ color: 'var(--amber)' }} />, nombre: 'Ideas de reel', para: 'Guiones escritos por Nia: cada idea de reel es un post del creador con su hook.', n: reels },
          ].map(f => (
            <div key={f.nombre} className="guard">
              <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{f.icono}</span>
              <span className="guard-lb">{f.nombre}<small>{f.para}</small></span>
              <Badge tone="purple">{f.n} del mes</Badge>
            </div>
          ))}
          <div className="guard">
            <span style={{ fontSize: 15, flexShrink: 0 }}>{PIEZAS_CREADOR.find(t => t.key === 'pauta')?.icono}</span>
            <span className="guard-lb">{tipoNombreDe('pauta')}
              <small>{PIEZAS_CREADOR.find(t => t.key === 'pauta')?.para}</small>
            </span>
            <Badge tone="muted">sin pauta este mes</Badge>
          </div>

          <div className="csec" style={{ margin: '16px 0 8px' }}>
            <span className="csec-t" style={{ fontSize: 13.5 }}>Entregas UGC comprometidas</span>
            <span className="csec-s">Con las marcas del pipeline y su fecha</span>
          </div>
          {OPORTUNIDADES.filter(o => o.etapa === 'Deal' || o.etapa === 'Negociación').map(o => (
            <div key={o.marca} className="guard">
              <span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Cal size={14} /></span>
              <span className="guard-lb">{o.marca}
                <small>{o.queBusca} · entrega el {fecha(FALTA[o.marca].dias)}</small>
              </span>
              <span className="guard-val"><Dinero monto={o.paga} /></span>
            </div>
          ))}
          <div className="row" style={{ gap: 9, marginTop: 14, flexWrap: 'wrap' }}>
            <Button className="btn-sm" title="Muestra el mes pieza por pieza, con lo que cuesta cada una y lo que ya salió"
              onClick={() => detalle({
                titulo: 'El mes que armó Rex',
                sub: `${posts} posts, ${historias} secuencia de historias y ${reels} ideas de reel, más las entregas comprometidas con cada marca.`,
                bloques: [
                  { tipo: 'filas', items: PIEZAS.map(p => ({
                    t: p.titulo,
                    s: `${tipoNombre(p)} · serie «${p.serie}» · ${ESTADO[estadoDe(p)].nombre.toLowerCase()}`,
                    etiqueta: p.gate ? '0 créditos' : `${costoDe(p.grilla)} créditos`,
                    tono: (p.gate ? 'green' : estadoDe(p) === 'entregada' ? 'purple' : 'muted') as 'green' | 'purple' | 'muted',
                  })) },
                  { tipo: 'datos', filas: [
                    { k: 'Lunes · la propuesta', v: 'El plan de la semana', s: RITMO_SEMANA.lunes.audiencia },
                    { k: 'Viernes · el resumen', v: 'Qué funcionó', s: RITMO_SEMANA.viernes.audiencia },
                    { k: 'Créditos de la semana', v: `${costoSemana}`, s: `de los ${plan.creditosMes.toLocaleString('es-AR')} del plan ${plan.nombre}` },
                  ] },
                  { tipo: 'aviso', texto: 'El plan se ajusta cada lunes: lo que no rinde se cae y las piezas que el panel frena se corrigen sin costo.' },
                ],
                fuente: 'Modelo de producto v2.0 · §10 y §13: el plan del mes y el ritmo de la semana.',
              })}>
              <I_Eye size={13} /> Ver el plan completo
            </Button>
            <Button variant="ghost" className="btn-sm" title="Muestra la grilla de generación: es de donde sale el costo de cada pieza"
              onClick={() => verGrilla()}>Ver la grilla de créditos</Button>
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Star size={14} style={{ color: 'var(--green)' }} /> Tus series activas</span>}
          action={<Badge tone="green">{PIEZAS.length} piezas del mes</Badge>}
        >
          <div className="bs">
            Una serie sigue viva mientras tenga piezas en el mes. El puntaje es el promedio del panel en las
            piezas de la serie: el mínimo para publicar es 80.
          </div>
          {series.map(s => (
            <div key={s.nombre} className="guard">
              <span style={{ width: 34, flexShrink: 0, textAlign: 'center', fontSize: 16, fontWeight: 900,
                fontVariantNumeric: 'tabular-nums', color: colorPanel(s.panel) }}>{s.panel}</span>
              <span className="guard-lb">{s.nombre}
                <small>{s.piezas} {s.piezas === 1 ? 'pieza' : 'piezas'} del mes · {s.salidas} ya salieron
                  {s.frenadas ? ` · ${s.frenadas} volvió del panel` : ' · ninguna volvió del panel'}</small>
              </span>
              {s.frenadas
                ? <Badge tone="amber">{s.frenadas} {s.frenadas === 1 ? 'frenada' : 'frenadas'}</Badge>
                : <Badge tone="green">al día</Badge>}
              <Button variant="ghost" className="btn-sm"
                title={serieSel === s.nombre
                  ? 'Vuelve a la lista completa del mes, con todas las piezas'
                  : `Filtra las piezas del mes para mostrar solo las de «${s.nombre}». No cambia nada más.`}
                onClick={() => {
                  const otra = serieSel !== s.nombre;
                  setSerieSel(otra ? s.nombre : null);
                  setToast(otra ? `Piezas del mes filtradas por «${s.nombre}»` : 'La lista del mes volvió completa');
                }}>
                {serieSel === s.nombre ? 'Ver todas' : 'Ver sus piezas'}
              </Button>
            </div>
          ))}
          <div className="acc-why">
            El promedio del panel es lo que te dice si la serie sigue rindiendo: <b>una serie que baja de 80 en
            todas sus piezas se cae del plan</b> y Rex te propone otra cosa para el mes que viene.
          </div>
        </Card>
      </div>

      {/* ============ LAS PIEZAS DEL MES: el puntaje del panel y el estado de cada una ============ */}
      <div className="csec">
        <span className="csec-n">1</span>
        <span className="csec-t">Las piezas del mes y el puntaje del panel</span>
        <span className="csec-c purple">{arriba80} arriba de 80</span>
        <span className="csec-s">Cada pieza con su puntaje sobre 100, su estado y lo que cuesta generarla</span>
      </div>
      <Card
        title={<span className="row" style={{ gap: 8 }}><I_File size={14} style={{ color: 'var(--purple3)' }} /> {serieSel ? `Piezas de «${serieSel}»` : 'Las piezas del mes'}</span>}
        action={
          <span className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <Badge tone={cuantasEsperan ? 'amber' : 'green'}>{cuantasEsperan ? `${cuantasEsperan} esperan tu OK` : 'al día'}</Badge>
            {serieSel && (
              <Button variant="ghost" className="btn-sm" title="Vuelve a la lista completa del mes, con todas las series"
                onClick={() => { setSerieSel(null); setToast('La lista del mes volvió completa'); }}>Ver todas</Button>
            )}
          </span>
        }
      >
        {visibles.map(p => {
          const e = estadoDe(p);
          const s = panelDe(p);
          const regenerada = regen.includes(p.id);
          return (
            <div key={p.id} className="guard" style={{ alignItems: 'flex-start', paddingTop: 12, paddingBottom: 12 }}>
              <span style={{ width: 34, flexShrink: 0, textAlign: 'center', fontSize: 17, fontWeight: 900,
                fontVariantNumeric: 'tabular-nums', color: colorPanel(s) }}
                title={`Puntaje del panel: ${s} de 100. El mínimo para publicar es 80.`}>{s}</span>
              <span className="guard-lb" style={{ minWidth: 0 }}>
                <span className="row" style={{ gap: 7, flexWrap: 'wrap' }}>
                  <span className="bt">{p.titulo}</span>
                  <Badge tone={ESTADO[e].tono}>{ESTADO[e].nombre}</Badge>
                  {p.marca && <Badge tone="purple">{p.marca}</Badge>}
                  {p.reel && <Badge tone="muted">idea de reel</Badge>}
                </span>
                <small>
                  {tipoNombre(p)} · serie «{p.serie}» · {cuandoDe(p)} ·{' '}
                  {p.gate
                    ? `0 créditos tuyos: los ${costoDe(p.grilla)} los paga el sistema`
                    : `${costoDe(p.grilla)} créditos`}
                </small>
                <small>{p.nota}</small>
              </span>
              <span className="row" style={{ gap: 7, flexWrap: 'wrap' }}>
                {p.gate && e === 'borrador' && (
                  <Button className="btn-sm"
                    title={`Nia corrige la objeción y el panel la vuelve a votar. No gasta créditos tuyos: los ${costoDe(p.grilla)} los paga el sistema. Es reversible: con «Volver a la de antes» queda como el panel la frenó.`}
                    onClick={() => regenerar(p)}><I_Refresh size={13} /> Regenerarla sin costo</Button>
                )}
                {regenerada && (
                  <Button className="btn-sm" title="Sale a tus redes con el texto que aprobó el panel. Es reversible: la sacás cuando quieras."
                    onClick={() => publicar(p)}><I_Check size={13} /> Publicar</Button>
                )}
                {!regenerada && e === 'ok' && (
                  <Button className="btn-sm" title="Sale a tus redes con el texto que aprobó el panel. Es reversible: la sacás cuando quieras y no pierde el historial."
                    onClick={() => publicar(p)}><I_Check size={13} /> Publicar</Button>
                )}
                {e === 'publicada' && (
                  <Button variant="ghost" className="btn-sm" title="La baja de tus redes. Es reversible: vuelve a esperar tu OK."
                    onClick={() => bajar(p)}>Sacarla de mis redes</Button>
                )}
                {regenerada && (
                  <Button variant="ghost" className="btn-sm" title="Vuelve a la versión que el panel frenó en 78. No se pierde nada: la corrección queda guardada."
                    onClick={() => volverALaDeAntes(p)}>Volver a la de antes</Button>
                )}
                <Button variant="ghost" className="btn-sm" title="Muestra el puntaje, de dónde sale, cuánto cuesta generarla y qué pasa si la publicás"
                  onClick={() => verPieza(p)}>Ver por qué</Button>
              </span>
            </div>
          );
        })}

        <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
          <div className="dato" title="La suma de lo que cuesta generar las piezas del mes, sin contar las que el panel rechazó.">
            <span className="dato-l">Va a costar la semana</span>
            <span className="dato-v" style={{ color: 'var(--purple3)' }}>{costoSemana} créditos</span>
          </div>
          <div className="dato" title="Las piezas que el panel rechazó no se te cobran: la regeneración por gate la paga el sistema.">
            <span className="dato-l">Lo pagó el sistema</span>
            <span className="dato-v" style={{ color: 'var(--green)' }}>{costoGate} créditos</span>
          </div>
          <div className="dato" title={`Créditos del plan ${plan.nombre}, que es el que tenés contratado este mes.`}>
            <span className="dato-l">Del plan del mes</span>
            <span className="dato-v">{pctPlan}% de {plan.creditosMes.toLocaleString('es-AR')}</span>
          </div>
        </div>

        <div className="row" style={{ gap: 9, marginTop: 14, flexWrap: 'wrap' }}>
          {esperan.length > 0 ? (
            <>
              <Button className="btn-sm"
                title={`Publica de una las ${esperan.length} piezas que están arriba de 80 y esperan tu OK. Es reversible: con Deshacer vuelven a esperar tu OK y no se publica nada.`}
                onClick={publicarSemana}><I_Check size={13} /> Publicar las {esperan.length} de la semana</Button>
              <span className="tiny muted" style={{ alignSelf: 'center' }}>
                Las que están abajo de 80 no entran: primero se corrigen.
              </span>
            </>
          ) : lote ? (
            <>
              <span className="tiny" style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--green)', fontWeight: 700, alignSelf: 'center' }}>
                <I_Check size={13} /> {lote.length} piezas salieron a tus redes el {hoy()}.
              </span>
              <Button variant="ghost" className="btn-sm" title="Deshace la publicación de la semana: las piezas vuelven a esperar tu OK y no se publica nada."
                onClick={deshacerSemana}><I_Refresh size={12} /> Deshacer</Button>
            </>
          ) : (
            <span className="tiny" style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--green)', fontWeight: 700 }}>
              <I_Check size={13} /> Nada espera tu OK: todo lo que estaba listo ya salió a tus redes.
            </span>
          )}
          <Button variant="ghost" className="btn-sm" title="Muestra la grilla de generación y los créditos de cada tipo de pieza"
            onClick={() => verGrilla()}><I_Credit size={13} /> Ver la grilla de créditos</Button>
        </div>
        <div className="acc-why">
          El panel puntúa cada pieza antes de publicarse: <b>arriba de 80 sale, abajo no</b>. Y lo que el panel
          rechaza no te cuesta: la regeneración por gate la paga el sistema, así que corregir una pieza nunca te
          saca créditos de la semana.
        </div>
      </Card>

      {/* ============ LAS ENTREGAS A LAS MARCAS: la fecha y qué falta para que la pieza llegue ============ */}
      <div className="csec">
        <span className="csec-n">2</span>
        <span className="csec-t">Las entregas a las marcas</span>
        <span className="csec-c amber">{entregasSemana} esta semana</span>
        <span className="csec-s">Cada marca del pipeline con su fecha de entrega y lo que falta para entregar</span>
      </div>
      <Card
        title={<span className="row" style={{ gap: 8 }}><I_Users size={14} style={{ color: 'var(--green)' }} /> Tu pipeline de marcas</span>}
        action={<Badge tone="green">{OPORTUNIDADES.length} marcas · {ETAPAS_PIPELINE.join(' → ')}</Badge>}
      >
        {OPORTUNIDADES.map(o => {
          const etapa = etapaDe(o.marca, o.etapa);
          const est = entregaDe(o.marca);
          const a = accionDe(o);
          return (
            <div key={o.marca} className="guard" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 8, paddingTop: 12, paddingBottom: 12 }}>
              <span className="row" style={{ gap: 8, width: '100%', flexWrap: 'wrap' }}>
                <span className="bt">{o.marca}</span>
                <span className="tiny muted">{o.rubro} · {o.encaje}</span>
                <Badge tone={etapa === 'Deal' ? 'green' : etapa === 'Negociación' ? 'purple' : etapa === 'Respuesta' ? 'amber' : 'muted'}>{etapa}</Badge>
                {est !== 'pendiente' && <Badge tone={est === 'entregada' || est === 'cerrada' ? 'green' : 'amber'}>{ENTREGA_LB[est]}</Badge>}
                <Badge tone="muted"><Dinero monto={o.paga} equivalente={false} /></Badge>
              </span>
              <span className="guard-lb" style={{ minWidth: 0 }}>
                {o.queBusca}
                <small>Entrega: {fecha(FALTA[o.marca].dias)} · Qué falta: {faltaDe(o)}</small>
                {o.nota && <small>{o.nota}</small>}
              </span>
              <span className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                {est === 'pendiente' ? (
                  <Button className="btn-sm" title={a.title} onClick={a.run}>{a.label}</Button>
                ) : (
                  <Button variant="ghost" className="btn-sm" title={`Deshace lo último de ${o.marca}: la entrega y la etapa del pipeline vuelven a como estaban.`}
                    onClick={() => deshacerEntrega(o.marca)}><I_Refresh size={12} /> Deshacer</Button>
                )}
                <Button variant="ghost" className="btn-sm" title={`Muestra el deal de ${o.marca}: qué busca, cuánto paga y en qué etapa está`}
                  onClick={() => detalle({
                    titulo: `${o.marca} · ${etapa}`,
                    sub: `${o.queBusca}. Encaje con tu perfil: ${o.encaje}`,
                    bloques: [
                      { tipo: 'datos', filas: [
                        { k: 'Rubro', v: o.rubro, s: 'de tu nicho declarado en la Ficha' },
                        { k: 'Qué buscan', v: o.queBusca },
                        { k: 'Cuánto pagan', v: o.paga, s: 'en dólares por pieza, según lo que se paga en tu nicho' },
                        { k: 'Etapa del pipeline', v: etapa, s: ETAPAS_PIPELINE.join(' → ') },
                        { k: 'Qué falta para entregar', v: faltaDe(o) },
                        { k: 'Quién la trabaja', v: 'Rumi', s: 'contesta, propone y escala cuando la marca pide hablar con vos' },
                      ] },
                      ...(o.nota ? [{ tipo: 'aviso' as const, texto: o.nota }] : []),
                      { tipo: 'texto', texto: 'Ningún cobro sale sin tu OK: los rates y los links de cobro son manuales por diseño.' },
                    ],
                    fuente: 'Misma estructura que las campañas de Negocios, con las etapas de un deal de creador.',
                    acciones: [
                      { label: 'Ver la conversación', variante: 'primary', title: 'Abre Mensajes: los DMs de la marca con la respuesta que propone Rumi', onClick: () => setVista('conversaciones') },
                      { label: 'Ver mis rates', title: 'Tu lista de precios por pieza: es lo que Rumi usa para responder', onClick: () => verRates() },
                    ],
                  })}>Ver el deal <I_ArrowRight size={13} /></Button>
              </span>
            </div>
          );
        })}

        <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
          <div className="dato" title="Lo que hay en juego en las marcas que ya están en deal o en negociación.">
            <span className="dato-l">En deal o negociación</span>
            <span className="dato-v" style={{ color: 'var(--green)' }}><Dinero monto={cerrado} /></span>
          </div>
          <div className="dato" title="La suma de lo que paga cada marca del pipeline, contando una pieza de cada una.">
            <span className="dato-l">Todo el pipeline</span>
            <span className="dato-v"><Dinero monto={todoElPipeline} equivalente={false} /></span>
          </div>
          <div className="dato" title="Las entregas cuya fecha cae dentro de los próximos siete días.">
            <span className="dato-l">Entregas esta semana</span>
            <span className="dato-v" style={{ color: 'var(--amber)' }}>{entregasSemana} de {OPORTUNIDADES.length}</span>
          </div>
        </div>

        <div className="row" style={{ gap: 9, marginTop: 14, flexWrap: 'wrap' }}>
          <Button variant="ghost" className="btn-sm" title="Abre Mensajes: los DMs de marcas y seguidores, con la respuesta que propone Rumi"
            onClick={() => setVista('conversaciones')}><I_Chat size={13} /> Ver los mensajes</Button>
          <Button variant="ghost" className="btn-sm" title="Muestra el pipeline completo, etapa por etapa, con las marcas que están en cada una"
            onClick={() => detalle({
              titulo: 'El pipeline, etapa por etapa',
              sub: `Las ${OPORTUNIDADES.length} marcas de tu carril de trabajo, desde el primer pitch hasta el cobro.`,
              bloques: [
                { tipo: 'filas', items: ETAPAS_PIPELINE.map(et => {
                  const en = OPORTUNIDADES.filter(o => etapaDe(o.marca, o.etapa) === et);
                  return {
                    t: et,
                    s: en.length ? en.map(o => o.marca).join(' · ') : 'sin marcas en esta etapa',
                    etiqueta: `${en.length}`,
                    tono: (en.length ? 'green' : 'muted') as 'green' | 'muted',
                  };
                }) },
                { tipo: 'datos', filas: [
                  { k: 'Marcas que repiten', v: String(FICHA_CREADOR.marcasTrabajadas.length), s: FICHA_CREADOR.marcasTrabajadas.join(' · ') },
                  { k: 'Lo que tardás en contestar', v: 'Menos de 24 h', s: FICHA_CREADOR.tiempoRespuesta },
                  { k: 'Ticket de una pieza', v: RATE_VIDEO.precio, s: RATE_VIDEO.nota },
                ] },
                { tipo: 'aviso', texto: 'Cobrar sigue siendo tuyo: los rates, los links de pago y el cierre de precios son manuales por diseño.' },
              ],
              fuente: 'Tu Ficha de creador y las marcas del pipeline, en el orden del deal.',
            })}>Ver el pipeline</Button>
          <Button variant="ghost" className="btn-sm" title="Muestra tu lista de precios por pieza y qué conviene cobrar por el uso en pauta"
            onClick={() => verRates()}><I_Credit size={13} /> Ver mis rates</Button>
        </div>
        <div className="acc-why">
          Cada entrega se sigue hasta el cobro: <b>la marca paga por la pieza y, si la usa en pauta, eso se cobra
          aparte</b>. Ningún cobro sale sin tu OK, y lo que la marca pide hablar con vos lo escala Rumi primero.
        </div>
        <NotaMoneda />
      </Card>
    </div>
  );

  /** La grilla de generación: de dónde sale el costo de cada pieza del mes. */
  function verGrilla() {
    return detalle({
      titulo: 'La grilla de créditos',
      sub: 'Cada pieza del mes se cobra por la línea de la grilla que le corresponde. Lo que el panel rechaza no se cobra: la regeneración la paga el sistema.',
      bloques: [
        { tipo: 'filas', items: GRILLA_CREDITOS.map(g => ({
          t: g.pieza,
          etiqueta: `${g.creditos} ${g.creditos === 1 ? 'crédito' : 'créditos'}`,
          tono: g.pieza.startsWith('Ultra') ? 'green' : 'purple',
        })) },
        { tipo: 'datos', filas: [
          { k: 'Plan del mes', v: `${plan.nombre} · ${plan.creditosMes.toLocaleString('es-AR')} créditos`, s: 'el plan de creador que tenés contratado este mes' },
          { k: 'Esta semana come', v: `${costoSemana} créditos`, s: `${pctPlan}% de los créditos del mes` },
          { k: 'Y el sistema pagó', v: `${costoGate} créditos`, s: 'la regeneración de la pieza que el panel frenó' },
        ] },
        { tipo: 'aviso', texto: 'La pieza que el panel rechaza no te cuesta créditos: la regeneración por gate la paga el sistema.' },
      ],
      fuente: 'Modelo de producto v2.0 · §11: la grilla de créditos con margen del 40%.',
    });
  }

  /** Los rates: lo que Rumi usa para contestar y lo que se cobra por el uso en pauta. */
  function verRates() {
    return detalle({
      titulo: 'Tus rates',
      sub: 'Lo que cobrás por pieza. Rumi los usa para responder y ningún cobro sale sin tu OK.',
      bloques: [
        { tipo: 'datos', filas: RATES.map(r => ({ k: r.pieza, v: r.precio, s: r.nota })) },
        { tipo: 'aviso', texto: 'El uso en pauta se cobra aparte: la marca paga por mostrarla a gente que no te conoce y eso vale más que la pieza.' },
      ],
      fuente: 'Tu lista de rates, en la Ficha de creador. Se puede cambiar cuando quieras.',
    });
  }

  return vista;
}

/** El nombre de un tipo de pieza, leído de PIEZAS_CREADOR (post del creador, secuencia de historias,
 *  entregable UGC, remaster 4K): el tipo se nombra como lo nombra la data, nunca a mano. */
function tipoNombreDe(key: string) {
  return PIEZAS_CREADOR.find(t => t.key === key)?.nombre ?? key;
}

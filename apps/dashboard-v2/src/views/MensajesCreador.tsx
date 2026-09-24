import { useState, type ReactNode } from 'react';
import { Card, Badge, Button, Dinero, NotaMoneda } from '../components/ui';
import { ViewHead } from '../components/viz';
import {
  I_Chat, I_Send, I_Edit, I_Robot, I_Check, I_Clock, I_Shield, I_Bank, I_Link, I_Zap, I_Users,
  I_Camera, I_Heart, I_Eye, I_Wallet, I_Star, I_ArrowRight,
} from '../components/icons';
import { useDetalle } from '../components/Detalle';
import {
  MENSAJES_CREADOR, OPORTUNIDADES, ETAPAS_PIPELINE, AUTONOMIA_CREADOR, GUARDRAILS_CREADOR,
  RATES, FICHA_CREADOR, PIEZAS_CREADOR, RITMO_SEMANA,
} from '../data/creador';

// =============================================================================================
// MENSAJES, EN PIEL DE CREADOR — «DMs de marcas y seguidores, con Rumi proponiendo respuestas».
//
// Es la vista de Conversaciones con el idioma de un creador: la misma bandeja del motor, con los
// DMs que Rumi (el closer del equipo) ya tiene contestados. La marca no cae en un campo vacío: el
// mensaje llega con la respuesta escrita, con la etapa del pipeline y con la regla que decide si
// Rumi puede contestar sola o si el trabajo es tuyo.
//
// Las tres reglas que el creador ve en cada DM salen del dial de autonomía y de los guardrails,
// no del componente: responder DMs es SHARED (Rumi propone y vos mandás), enviar rates o cerrar
// precios es MANUAL (ningún cobro sale sin que lo mandes vos), los deals de más de $200 piden tu
// OK y de 22:00 a 08:00 no se molesta a las marcas. El componente sólo muestra esas reglas con
// los datos reales: qué respuesta se propone, a qué etapa del pipeline pertenece cada marca y qué
// botón puede ejecutar el equipo solo.
// =============================================================================================

/** El estado de cada DM, con el vocabulario de la piel de creador. */
type EstadoDM = 'espera' | 'mia' | 'rumi' | 'escalada';

type DM = {
  id: string;
  /** Quién escribe: una marca del pipeline o un seguidor. */
  de: string;
  tipo: 'marca' | 'seguidor';
  texto: string;
  /** La respuesta que Rumi ya escribió. Es lo que se manda, edite o no. */
  propuesta: string;
  /** El estado con el que llegó el DM desde la data (queda a la vista en el detalle). */
  estadoDato: string;
  estado: EstadoDM;
  hora: string | null;
  /** La etapa del pipeline de esa marca. Un seguidor no está en el pipeline. */
  etapa: string | null;
  paga: string | null;
  monto: number | null;
  /** La marca pidió hablar con una persona: Rumi escala en vez de contestar. */
  pideHumano: boolean;
  /** La respuesta lleva rates: enviarlos es manual, así que Rumi no la manda sola. */
  tienePrecio: boolean;
  /** El modelo le permite contestarla sin pasar por el creador. */
  puedeRumi: boolean;
  /** Por qué NO puede, cuando no puede. Es la regla que choca con este DM. */
  motivoRumi: string;
};

// ---------------------------------------------------------------------------------------------
// Las reglas, leídas del dial y de los guardrails. Nada de esto se escribe acá: se busca en la
// data para que la pantalla y el panel de Cuenta y autonomía digan siempre lo mismo.
// ---------------------------------------------------------------------------------------------

const REGLA_DMS = AUTONOMIA_CREADOR.find(a => a.accion.startsWith('Responder DMs'))!;
const REGLA_RATES = AUTONOMIA_CREADOR.find(a => a.accion.startsWith('Enviar rates'))!;
const GUARD_DEAL = GUARDRAILS_CREADOR.find(g => g.nombre.startsWith('Deals o cobros'))!;
const GUARD_HORARIO = GUARDRAILS_CREADOR.find(g => g.nombre === 'No molestar a marcas')!;

const NIVEL_TXT: Record<'auto' | 'shared' | 'manual', string> =
  { auto: 'automático', shared: 'compartido', manual: 'manual' };
const NIVEL_TONO: Record<'auto' | 'shared' | 'manual', 'green' | 'purple' | 'red'> =
  { auto: 'green', shared: 'purple', manual: 'red' };

/** El primer importe en dólares de un texto: '$420 por las tres' → 420. */
const numeroDe = (t?: string) => {
  const m = /\$\s?([\d.]+)/.exec(t ?? '');
  return m ? Number(m[1].replace(/\./g, '')) : null;
};

/** El umbral de OK de los deals y la ventana horaria: los dos salen del guardrail, no del código. */
const UMBRAL_OK = numeroDe(GUARD_DEAL.nombre) ?? 200;
const VENTANA_TXT = GUARD_HORARIO.valor.replace(/^De\s+/i, '');
const [DESDE_H, HASTA_H] = VENTANA_TXT.split(' a ').map(x => Number(x.split(':')[0]));

const horaAhora = () => new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
/** Los DMs salen dentro de la ventana de la marca: de 22:00 a 08:00 no se molesta a nadie. */
const dentroDeVentana = () => {
  const h = new Date().getHours();
  return h >= HASTA_H && h < DESDE_H;
};

const ESTADO_TXT: Record<EstadoDM, string> = {
  espera: 'Espera tu OK', mia: 'Contestada por vos', rumi: 'Contestada por Rumi', escalada: 'Escalada a vos',
};
const ESTADO_TONO: Record<EstadoDM, 'amber' | 'green' | 'purple' | 'red'> = {
  espera: 'amber', mia: 'green', rumi: 'purple', escalada: 'red',
};
/** La bandeja es una cola de trabajo: lo que espera a una persona va arriba y lo resuelto al final. */
const ORDEN: Record<EstadoDM, number> = { escalada: 0, espera: 1, mia: 2, rumi: 3 };

/** Una fila del panel de detalle. */
type ItemFila = { t: string; s?: string; etiqueta?: string; tono?: 'purple' | 'green' | 'amber' | 'red' | 'muted' };

/**
 * La bandeja, armada desde MENSAJES_CREADOR. Cada DM se cruza con el pipeline del creador
 * (OPORTUNIDADES) para saber en qué etapa está esa marca, cuánto paga y si pidió hablar con vos:
 * así el botón de Rumi se habilita o se explica con la regla que corresponde, no a mano.
 */
const DMS: DM[] = MENSAJES_CREADOR.map((m, i) => {
  const op = OPORTUNIDADES.find(o => o.marca === m.de);
  const monto = numeroDe(op?.paga);
  const pideHumano = !!op?.nota?.includes('pidió hablar con vos');
  const tienePrecio = /\$/.test(m.propuesta ?? '');
  const puedeRumi = !pideHumano && !tienePrecio && !(monto !== null && monto > UMBRAL_OK);
  return {
    id: `dm${i + 1}`,
    de: m.de,
    tipo: m.tipo,
    texto: m.texto,
    propuesta: m.propuesta ?? '',
    estadoDato: m.estado,
    // La seguidora ya tiene la respuesta de Rumi en la data: es el único DM que no toca plata
    // ni un deal, y por eso el modelo lo deja contestado sin pasar por el creador.
    estado: m.estado === 'Rumi contestó sola' ? 'rumi' : 'espera',
    hora: null,
    etapa: op?.etapa ?? null,
    paga: op?.paga ?? null,
    monto,
    pideHumano,
    tienePrecio,
    puedeRumi,
    motivoRumi: pideHumano
      ? 'La marca pidió hablar con una persona: Rumi escala la conversación en lugar de contestarla.'
      : tienePrecio
        ? `La respuesta lleva rates y precios: enviar rates o cerrar precios es manual, ningún cobro sale sin que lo mandes vos.`
        : monto !== null && monto > UMBRAL_OK
          ? `Es un deal que pasa los $${UMBRAL_OK}: los deals de ese tamaño piden tu OK.`
          : '',
  };
});

const porId = (f: (d: DM) => string) =>
  DMS.reduce<Record<string, string>>((o, d) => { o[d.id] = f(d); return o; }, {});

export function ViewMensajesCreador({ setToast }: { setToast: (t: string) => void }) {
  const detalle = useDetalle();
  // Los DMs de la bandeja: arrancan como en la data y cambian con lo que el creador hace.
  const [dms, setDms] = useState<DM[]>(() => DMS.map(d => ({ ...d })));
  // La respuesta de cada DM. Es la propuesta de Rumi y, si la edita, el texto que él guardó.
  const [respuestas, setRespuestas] = useState<Record<string, string>>(() => porId(d => d.propuesta));
  // El DM que se está editando y lo que hay escrito en el campo.
  const [editando, setEditando] = useState<string | null>(null);
  const [borrador, setBorrador] = useState('');
  // Lo que ya salió de la bandeja en esta sesión: queda a la vista al pie, no en un aviso.
  const [salidas, setSalidas] = useState<{ id: string; txt: string; hora: string }[]>([]);

  const esperando = dms.filter(d => d.estado === 'espera' || d.estado === 'escalada').length;
  const marcas = dms.filter(d => d.tipo === 'marca').length;
  const rumiSolas = dms.filter(d => d.estado === 'rumi').length;
  const puedenSolas = dms.filter(d => d.puedeRumi && d.estado === 'espera').length;
  const pidenPersona = dms.filter(d => d.pideHumano);
  const orden = [...dms].sort((a, b) => ORDEN[a.estado] - ORDEN[b.estado]);
  const ventanaAbierta = dentroDeVentana();

  const cambiar = (id: string, cambios: Partial<DM>) =>
    setDms(ds => ds.map(d => (d.id === id ? { ...d, ...cambios } : d)));
  const anotar = (f: DM, txt: string) =>
    setSalidas(s => [{ id: f.id, txt, hora: horaAhora() }, ...s]);

  /** El texto que se manda y que el DM muestra arriba: la propuesta o lo que el creador guardó. */
  const texto = (f: DM) => respuestas[f.id] ?? f.propuesta;

  // -------------------------------------------------------------------------------------------
  // LAS ACCIONES. Cada una deja la marca en la conversación: quién la contestó, a qué hora y con
  // qué regla del modelo. Ninguna abre un aviso que se va solo.
  // -------------------------------------------------------------------------------------------

  /** Mandar la respuesta: la conversación pasa a contestada, con su línea de hora, y el DM sale de la cola. */
  const mandar = (f: DM) => {
    const h = horaAhora();
    cambiar(f.id, { estado: 'mia', hora: h });
    anotar(f, `Le mandaste la respuesta a ${f.de}`);
    setToast(`Respuesta mandada a ${f.de}: sale por tu Instagram${dentroDeVentana() ? '' : ` y queda en cola hasta las 08:00`}`);
  };

  /** Editar la respuesta: abre el texto en un campo, lo guarda y sigue esperando tu OK para salir. */
  const abrirEdicion = (f: DM) => {
    setEditando(f.id);
    setBorrador(texto(f));
    setToast(`Editás la respuesta de ${f.de}: no sale hasta que la mandes vos`);
  };
  const guardarEdicion = (f: DM) => {
    const t = borrador.trim();
    if (!t) {
      setToast('La respuesta no puede quedar vacía: escribí algo antes de guardar');
      return;
    }
    setRespuestas(r => ({ ...r, [f.id]: t }));
    setEditando(null);
    setToast(`Respuesta a ${f.de} guardada: todavía no salió`);
  };

  /** Rumi la contesta sola, cuando el modelo lo permite: deja la marca de quién la contestó. */
  const contestarRumi = (f: DM) => {
    const h = horaAhora();
    cambiar(f.id, { estado: 'rumi', hora: h });
    anotar(f, `Rumi contestó sola a ${f.de}`);
    setToast(`Rumi contestó sola a ${f.de}: te avisa si la marca vuelve a escribir`);
  };

  /** Escalar a vos: la marca pidió una persona, así que la conversación queda en tus manos. */
  const escalar = (f: DM) => {
    cambiar(f.id, { estado: 'escalada', hora: horaAhora() });
    anotar(f, `${f.de} pidió una persona: quedó en tus manos`);
    setToast(`${f.de}: la conversación quedó en tus manos, Rumi no contesta hasta que la atiendas`);
  };

  /** La acción de la cabeza de la bandeja: contesta sola todas las que el modelo le permite. */
  const contestarLasQuePuede = () => {
    const lista = dms.filter(d => d.puedeRumi && d.estado === 'espera');
    if (lista.length === 0) {
      setToast('No hay ninguna que Rumi pueda contestar sola: todas tocan plata o piden hablar con vos');
      return;
    }
    const h = horaAhora();
    setDms(ds => ds.map(d => (lista.some(x => x.id === d.id) ? { ...d, estado: 'rumi', hora: h } : d)));
    setSalidas(s => [...lista.map(d => ({ id: d.id, txt: `Rumi contestó sola a ${d.de}`, hora: h })), ...s]);
    setToast(`Rumi contestó sola ${lista.length === 1 ? 'el mensaje' : `los ${lista.length} mensajes`} que el modelo le permite`);
  };

  // -------------------------------------------------------------------------------------------
  // LO QUE ABREN LOS BOTONES QUE INFORMAN. Todo sale de la data del creador: el dial por acción,
  // los guardrails, los rates y el pipeline.
  // -------------------------------------------------------------------------------------------

  const verDial = () => detalle({
    titulo: 'El dial de autonomía de tus mensajes',
    sub: 'Es el mismo dial por acción del panel, con sus números: cada cosa tiene su nivel y nada que mueva plata sube de nivel sin tu OK.',
    bloques: [
      { tipo: 'filas', items: AUTONOMIA_CREADOR.map(a => ({
        t: a.accion, s: a.nota, etiqueta: NIVEL_TXT[a.nivel], tono: NIVEL_TONO[a.nivel],
      })) },
      { tipo: 'datos', filas: GUARDRAILS_CREADOR.map(g => ({ k: g.nombre, v: g.valor, s: g.porQue })) },
      { tipo: 'aviso', texto: 'La vigilancia de tus conversaciones corre cada 15 minutos y no gasta créditos: por eso Rumi llega con la respuesta escrita antes de que la marca escriba de nuevo.' },
    ],
    fuente: 'Modelo de producto v2.0 · §7 y §8: el dial por acción y los guardrails del creador.',
  });

  const verRates = () => detalle({
    titulo: 'Tus rates',
    sub: 'Lo que Rumi usa para armar la respuesta. Los precios no salen solos: enviar rates, links de cobro o cerrar precios es manual.',
    bloques: [
      { tipo: 'datos', filas: RATES.map(r => ({ k: r.pieza, v: r.precio, s: r.nota })) },
      { tipo: 'aviso', tono: 'amber', texto: 'El uso en pauta se cobra aparte: la marca paga por mostrarla a gente que no te conoce y eso vale más que la pieza.' },
    ],
    fuente: 'Tu lista de rates, en la Ficha de creador. Se cambia en Cuenta y autonomía.',
  });

  /** El dial completo, en el detalle de cada regla: qué nivel tiene y cuántos DMs de la bandeja toca. */
  const verRegla = (regla: { titulo: string; que: string; por: string; nivel: string; cuantos: number; nota: string }) => detalle({
    titulo: regla.titulo,
    sub: regla.que,
    bloques: [
      { tipo: 'datos', filas: [
        { k: 'Nivel en el dial', v: regla.nivel },
        { k: 'Por qué está así', v: regla.por },
        { k: 'DMs de esta bandeja que toca', v: `${regla.cuantos} de ${dms.length}` },
      ] },
      { tipo: 'texto', texto: regla.nota },
      { tipo: 'aviso', texto: 'Se cambia en Cuenta y autonomía, no desde acá: el nivel de cada acción es el mismo en todas las pantallas.' },
    ],
    fuente: 'Modelo de producto v2.0 · §7 y §8, con la bandeja de mensajes de este creador.',
    acciones: [
      { label: 'Ver mis rates', title: 'Tu lista de precios por pieza: es lo que Rumi usa para responder', onClick: verRates },
      { label: 'Ver el dial completo', title: 'Todas las acciones del equipo con su nivel y los guardrails que las frenan', onClick: verDial },
    ],
  });

  /** Por qué Rumi no puede contestar sola este DM, con la regla que choca y lo que sí puede hacer. */
  const explicarRumi = (f: DM) => detalle({
    titulo: `Rumi no puede contestar sola a ${f.de}`,
    sub: f.motivoRumi,
    bloques: [
      { tipo: 'datos', filas: [
        { k: 'Regla del modelo', v: 'Responder DMs: compartido', s: REGLA_DMS.nota },
        { k: 'Por qué choca acá', v: f.pideHumano ? 'La marca pidió hablar con una persona' : f.tienePrecio ? 'La respuesta lleva rates y precios' : `El deal pasa los $${UMBRAL_OK}`, s: f.motivoRumi },
        { k: 'Qué sí hizo Rumi', v: 'La respuesta está escrita', s: 'Es la que ves en la bandeja: la mandás vos y sale con tu nombre.' },
        { k: 'Si no la mandás', v: 'Queda esperando', s: 'La marca no recibe nada: Rumi nunca contesta por vos lo que mueve plata.' },
      ] },
      { tipo: 'filas', items: reglasDe(f) },
      { tipo: 'aviso', tono: 'amber', texto: 'No hace falta que escribas nada: la respuesta ya está armada. Lo único que Rumi no hace sola es lo que cobra, lo que cierra un precio o lo que la marca pidió hablar con vos.' },
    ],
    fuente: 'Modelo de producto v2.0 · §7: responder DMs es compartido y escalar es una decisión del motor.',
    acciones: [
      { label: 'Mandar la respuesta vos', variante: 'primary', title: `Sale por tu Instagram con tu nombre. Ningún cobro sale sin que lo mandes vos.`, onClick: () => mandar(f) },
      ...(f.pideHumano && f.estado !== 'escalada'
        ? [{ label: 'Escalar a vos', title: 'La conversación queda en tus manos y Rumi deja de contestar', onClick: () => escalar(f) }]
        : []),
    ],
  });

  /** El detalle del DM: qué llegó, qué propone Rumi, en qué etapa está esa marca y qué reglas aplican. */
  const verDM = (f: DM) => detalle({
    titulo: `${f.de} · ${ESTADO_TXT[f.estado]}`,
    sub: f.texto,
    bloques: [
      { tipo: 'datos', filas: [
        { k: 'Quién escribe', v: f.tipo === 'marca' ? 'Una marca de tu pipeline' : 'Un seguidor', s: f.tipo === 'marca' ? 'Está en el pipeline: se le responde con los rates y el portafolio a mano.' : 'No compra ni contrata: es audiencia, y Rumi la contesta sola.' },
        ...(f.etapa
          ? [{ k: 'Etapa del pipeline', v: f.etapa, s: `Paso ${(ETAPAS_PIPELINE as readonly string[]).indexOf(f.etapa) + 1} de ${ETAPAS_PIPELINE.length}: ${ETAPAS_PIPELINE.join(' → ')}` }]
          : [{ k: 'Pipeline', v: 'No aplica', s: 'Un seguidor no entra al pipeline de marcas.' }]),
        ...(f.paga ? [{ k: 'Lo que paga', v: f.paga, s: 'en dólares por pieza, según lo que se paga en tu nicho' }] : []),
        { k: 'Estado del DM', v: ESTADO_TXT[f.estado], s: f.hora ? `quedó así a las ${f.hora}` : `llegó como «${f.estadoDato}»` },
        { k: 'Rumi sola', v: f.puedeRumi ? 'Sí puede' : 'No puede', s: f.puedeRumi ? 'No hay rates ni un deal grande de por medio: el modelo la deja contestar sola.' : f.motivoRumi },
      ] },
      { tipo: 'texto', texto: `La respuesta que Rumi dejó escrita: «${texto(f)}»` },
      { tipo: 'filas', items: reglasDe(f) },
    ],
    fuente: 'Bandeja de mensajes del creador, cruzada con el pipeline de marcas.',
    acciones: f.estado === 'espera' || f.estado === 'escalada'
      ? [
        { label: 'Mandar la respuesta', variante: 'primary', title: `Sale por tu Instagram al instante, con tu nombre.`, onClick: () => mandar(f) },
        { label: 'Editar la respuesta', title: 'La abre en un campo editable: guardás el texto y sigue esperando tu OK', onClick: () => abrirEdicion(f) },
      ]
      : undefined,
  });

  /** Las reglas del modelo que aplican a este DM, en filas: es la letra chica de cada botón. */
  function reglasDe(f: DM): ItemFila[] {
    return [
      { t: REGLA_DMS.accion, s: f.tipo === 'marca' ? 'Con una marca, Rumi propone y la mandás vos: la conversación nunca sale sola.' : 'Con un seguidor no hay plata de por medio: Rumi puede contestarla sola.', etiqueta: NIVEL_TXT[REGLA_DMS.nivel], tono: NIVEL_TONO[REGLA_DMS.nivel] },
      ...(f.tienePrecio ? [{ t: REGLA_RATES.accion, s: REGLA_RATES.nota, etiqueta: NIVEL_TXT[REGLA_RATES.nivel], tono: NIVEL_TONO[REGLA_RATES.nivel] as ItemFila['tono'] }] : []),
      ...(f.monto !== null && f.monto > UMBRAL_OK ? [{ t: GUARD_DEAL.nombre, s: GUARD_DEAL.porQue, etiqueta: GUARD_DEAL.valor, tono: 'amber' as const }] : []),
      ...(f.pideHumano ? [{ t: 'Escalar cuando la marca pide una persona', s: 'Rumi frena la conversación y te la pasa en vez de contestarla.', etiqueta: 'escalado', tono: 'red' as const }] : []),
      { t: GUARD_HORARIO.nombre, s: `${GUARD_HORARIO.porQue} Ningún DM sale antes de las 08:00.`, etiqueta: GUARD_HORARIO.valor, tono: 'amber' as const },
    ];
  }

  /** La marca del pipeline: qué busca, cuánto paga, en qué etapa está y qué está esperando de vos. */
  const verMarca = (o: typeof OPORTUNIDADES[number]) => {
    const f = dms.find(d => d.de === o.marca);
    const pitch = PIEZAS_CREADOR.find(p => p.key === 'pitch')!;
    detalle({
      titulo: `${o.marca} · ${o.etapa}`,
      sub: `${o.queBusca}. Encaje con tu perfil: ${o.encaje}`,
      bloques: [
        { tipo: 'datos', filas: [
          { k: 'Rubro', v: o.rubro, s: 'de tu nicho declarado en la Ficha' },
          { k: 'Qué buscan', v: o.queBusca },
          { k: 'Cuánto pagan', v: o.paga, s: 'en dólares por pieza, según lo que se paga en tu nicho' },
          { k: 'Etapa del pipeline', v: o.etapa, s: ETAPAS_PIPELINE.join(' → ') },
          { k: 'Quién la trabaja', v: 'Rumi', s: 'contesta, propone y escala cuando la marca pide hablar con vos' },
          ...(f ? [{ k: 'El DM que tenés abierto', v: ESTADO_TXT[f.estado], s: f.hora ? `a las ${f.hora}` : 'sigue en la bandeja esperando tu OK' }] : [{ k: 'DMs de esta marca', v: 'Ninguno abierto', s: 'No hay una conversación esperando respuesta: el próximo paso lo arranca Rumi.' }]),
        ] },
        ...(o.nota ? [{ tipo: 'aviso' as const, texto: o.nota }] : []),
        { tipo: 'texto', texto: 'Ningún cobro sale sin tu OK: los rates y los links de cobro son manuales por diseño, y los deals de más de $200 te esperan.' },
      ],
      fuente: 'Mismo pipeline que las campañas de Negocios, con las etapas de un deal de creador.',
      acciones: [
        ...(f && (f.estado === 'espera' || f.estado === 'escalada')
          ? [{ label: 'Mandar la respuesta que escribió Rumi', variante: 'primary' as const, title: `Sale por tu Instagram con tu nombre y la marca queda contestada.`, onClick: () => mandar(f) }]
          : []),
        ...(f && f.estado === 'espera' && f.puedeRumi
          ? [{ label: 'Que Rumi la conteste sola', title: 'El modelo lo permite en este DM: Rumi contesta y te avisa si la marca vuelve', onClick: () => contestarRumi(f) }]
          : []),
        { label: 'Ver mis rates', title: 'Tu lista de precios por pieza: es lo que Rumi usa para responder', onClick: verRates },
        { label: `Ver el ${pitch.nombre.toLowerCase()}`, title: `${pitch.para} ${pitch.creditos}.`, onClick: () => detalle({
          titulo: `${pitch.icono} ${pitch.nombre}`,
          sub: pitch.para,
          bloques: [
            { tipo: 'datos', filas: [
              { k: 'Para quién', v: `${o.marca} · ${o.rubro}`, s: 'es la marca de esta oportunidad' },
              { k: 'Qué busca', v: o.queBusca },
              { k: 'Cuánto paga', v: o.paga, s: 'en dólares, según lo que se paga en tu nicho' },
              { k: 'Qué gasta', v: pitch.creditos, s: 'un pitch no gasta créditos: es texto' },
            ] },
            { tipo: 'aviso', texto: 'El pitch sale con lo que ya está en tu portafolio y en tus rates: lo manda Rumi por vos y el precio lo confirmás vos.' },
          ],
          fuente: 'Piezas del creador y pipeline de marcas.',
        }) },
      ],
    });
  };

  return (
    <div className="dash">
      <ViewHead
        icon={<I_Chat size={19} />}
        titulo="Mensajes"
        sub={`DMs de marcas y seguidores, con Rumi proponiendo respuestas. Rumi escribe la respuesta y vos la mandás: es lo que dice el dial para responder DMs, y lo que mueve plata sale siempre de tus manos.`}
        nums={[
          { v: String(esperando), l: 'DMs esperando tu OK', c: esperando ? 'var(--amber)' : 'var(--green)' },
          { v: String(marcas), l: 'marcas en conversación', c: 'var(--purple4)' },
          { v: String(rumiSolas), l: 'mensajes que contestó Rumi sola', c: 'var(--purple3)' },
          { v: 'menos de 24 h', l: 'tu tiempo de respuesta', c: 'var(--green)' },
        ]}
      />

      {/* La regla madre de esta vista, con los datos que la sostienen. */}
      <div className="onb-infiere" style={{ marginTop: 0 }}>
        <span className="onb-infiere-ic"><I_Robot size={13} /></span>
        <span>
          <b>Responder DMs es compartido. </b>{REGLA_DMS.nota} De 22:00 a 08:00 no se molesta a las
          marcas: las respuestas quedan en cola hasta la mañana.
        </span>
      </div>

      {/* ============ LA BANDEJA DE DMs ============ */}
      <Card
        title={<span className="row" style={{ gap: 8 }}><I_Chat size={14} style={{ color: 'var(--purple3)' }} /> Tus DMs, con la respuesta ya escrita</span>}
        action={
          <span className="row" style={{ gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Badge tone={esperando ? 'amber' : 'green'}>{esperando ? `${esperando} esperan tu OK` : 'al día'}</Badge>
            {puedenSolas > 0 && (
              <Button variant="ghost" className="btn-sm"
                title={`Rumi contesta sola ${puedenSolas === 1 ? 'el mensaje' : `los ${puedenSolas} mensajes`} que el modelo le permite (una seguidora o una marca sin rates ni deal grande). Las que llevan precios o piden hablar con vos quedan esperándote.`}
                onClick={contestarLasQuePuede}>
                <I_Robot size={12} /> Las que puede, las contesta Rumi
              </Button>
            )}
          </span>
        }
      >
        <div className="bs" style={{ marginBottom: 10 }}>{FICHA_CREADOR.tiempoRespuesta}</div>

        {/* La ventana de la marca: se calcula con la hora real, no con un texto fijo. */}
        <div className="tiny muted" style={{ marginBottom: 14 }}>
          <I_Clock size={11} /> Ahora son las {horaAhora()}: {ventanaAbierta
            ? <>la ventana está abierta, las respuestas salen al instante y las marcas las reciben hoy.</>
            : <>fuera de la ventana ({VENTANA_TXT}): lo que mandes queda en cola y sale a las 08:00.</>}
        </div>

        {/* Una marca que pide una persona va arriba de todo: eso no lo contesta ningún agente. */}
        {pidenPersona.length > 0 && (
          <div className="alarm critico" style={{ marginBottom: 12, borderLeft: '3px solid var(--red)' }}>
            <div className="alarm-head">
              <span className="alarm-sev critico">PIDIÓ UNA PERSONA</span>
              <span className="alarm-when">la marca pidió hablar con vos</span>
            </div>
            <div className="alarm-title" style={{ minWidth: 0 }}>{pidenPersona.map(f => f.de).join(', ')}: con un deal en juego, Rumi no la contesta sola.</div>
            <div className="alarm-sug">{REGLA_DMS.nota}</div>
            <div className="alarm-acts">
              <Button variant="ghost" className="btn-sm" title="Abre el DM completo de esa marca: el mensaje, la etapa del pipeline, la respuesta de Rumi y las reglas que aplican"
                onClick={() => verDM(pidenPersona.find(x => x.estado !== 'escalada') ?? pidenPersona[0])}>
                <I_ArrowRight size={13} /> Ver la conversación
              </Button>
            </div>
          </div>
        )}

        {esperando === 0 && (
          <div className="onb-arrancado" style={{ marginTop: 0 }}>
            <I_Check size={15} />
            <span><b>Estás al día.</b> {RITMO_SEMANA.latidoMotor}</span>
          </div>
        )}

        {orden.map(f => {
          const enviada = f.estado === 'mia' || f.estado === 'rumi';
          return (
            <div key={f.id}
              className={`alarm ${f.estado === 'espera' ? 'oportunidad' : f.estado === 'escalada' ? 'atencion' : 'info'}`}
              style={{ marginBottom: 12 }}>
              <div className="alarm-head">
                <span className={`badge ${f.tipo === 'marca' ? 'tg-creador' : 'tg-cliente'}`}
                  title={f.tipo === 'marca'
                    ? 'Es una marca del pipeline: se le contesta con tus rates y tu portafolio a mano, y el precio lo confirmás vos.'
                    : 'Es un seguidor: no compra ni contrata. Rumi le contesta sola porque no hay plata ni deal de por medio.'}>
                  {f.tipo === 'marca' ? <I_Camera size={10} /> : <I_Heart size={10} />}
                  {' '}{f.tipo === 'marca' ? 'Marca' : 'Seguidor'}
                </span>
                <span className="alarm-title" style={{ minWidth: 0 }}>{f.de}</span>
                {f.etapa && (
                  <span className="badge badge-purple"
                    title={`Etapa del pipeline de marcas: ${f.etapa}, paso ${(ETAPAS_PIPELINE as readonly string[]).indexOf(f.etapa) + 1} de ${ETAPAS_PIPELINE.length}. El recorrido es ${ETAPAS_PIPELINE.join(' → ')}.`}>
                    <I_Star size={10} /> {f.etapa}
                  </span>
                )}
                {f.paga && <Badge tone="green"><Dinero monto={f.paga} equivalente={false} /></Badge>}
                <Badge tone={ESTADO_TONO[f.estado]}>{ESTADO_TXT[f.estado]}{f.hora ? ` · ${f.hora}` : ''}</Badge>
                {f.pideHumano && <Badge tone="red">pide hablar con vos</Badge>}
              </div>

              <div className="alarm-money">
                <span className="ico" style={{ color: 'var(--purple3)' }}><I_Chat size={14} /></span>
                <span><b>Lo que escribió: </b>«{f.texto}»</span>
              </div>

              {enviada ? (
                /* Ya salió: queda a la vista qué se mandó, quién lo mandó y a qué hora. */
                <div style={{ marginTop: 10 }}>
                  <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ color: 'var(--green)' }}><I_Check size={13} /></span>
                    <span className="bt">{f.estado === 'rumi' ? 'La contestó Rumi' : 'La mandaste vos'}</span>
                    <Badge tone="green">{f.hora ? `salió a las ${f.hora}` : 'contestada por Rumi'}</Badge>
                  </div>
                  <div className="alarm-sug" style={{ color: 'var(--txt)' }}>{texto(f)}</div>
                  <div className="tiny" style={{ color: 'var(--green)', fontWeight: 700, marginTop: 7, lineHeight: 1.5, display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                    <I_Check size={12} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>
                      {f.estado === 'rumi'
                        ? `Rumi la contestó sola${f.hora ? ` a las ${f.hora}` : ''}: no toca plata y no cierra ningún precio, así que el modelo la deja sola.`
                        : `Mandada a las ${f.hora} por vos: la marca la recibe y la conversación queda marcada como tuya.`}
                      {f.estado === 'mia' && f.tienePrecio ? ' Los rates salieron porque los mandás vos: enviar rates y cerrar precios es manual.' : ''}
                      {f.estado === 'mia' && f.monto !== null && f.monto > UMBRAL_OK ? ` Pasó por tu OK: los deals de más de $${UMBRAL_OK} lo piden.` : ''}
                      {f.estado === 'mia' && !ventanaAbierta ? ` Quedó en cola: sale a las 08:00, de ${VENTANA_TXT} no se molesta a las marcas.` : ''}
                    </span>
                  </div>
                  <div className="alarm-acts" style={{ marginTop: 9 }}>
                    <Button variant="ghost" className="btn-sm" title="Abre el DM con la etapa del pipeline, la regla que se aplicó y la respuesta completa"
                      onClick={() => verDM(f)}>
                      <I_Eye size={13} /> Ver por qué
                    </Button>
                  </div>
                </div>
              ) : (
                /* Esperando: la respuesta ya está escrita y los botones dicen qué hace cada uno. */
                <div style={{ marginTop: 10 }}>
                  <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ color: 'var(--purple3)' }}><I_Robot size={13} /></span>
                    <span className="bt">La respuesta que escribió Rumi</span>
                    {f.tienePrecio && <Badge tone="red">lleva rates: la mandás vos</Badge>}
                    <span className="tiny muted">sin mandar</span>
                  </div>
                  <div className="alarm-sug" style={{ color: 'var(--txt)' }}>{texto(f)}</div>

                  {editando === f.id ? (
                    /* Editar: la respuesta se abre en un campo, se guarda y sigue esperando tu OK. */
                    <div style={{ marginTop: 10 }}>
                      <input className="input" id={`dm-${f.id}`} value={borrador}
                        title="Escribí la respuesta como la querés mandar. Guardar no la manda: sale recién con Mandar la respuesta."
                        onChange={e => setBorrador(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') guardarEdicion(f); }} />
                      <div className="row" style={{ gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                        <Button className="btn-sm" title="Guarda tu texto como la respuesta de este DM. Todavía no sale: la mandás vos."
                          onClick={() => guardarEdicion(f)}><I_Check size={13} /> Guardar la respuesta</Button>
                        <Button variant="ghost" className="btn-sm" title="Cierra el campo sin cambiar nada: queda el texto que había escrito Rumi"
                          onClick={() => { setEditando(null); setToast('Sin cambios: queda la respuesta que escribió Rumi'); }}>Cancelar</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="alarm-acts" style={{ marginTop: 10 }}>
                      <Button className="btn-sm"
                        title={`Le manda esta respuesta a ${f.de} por tu Instagram, con tu nombre.${f.tienePrecio ? ' Los rates salen porque los mandás vos: ningún cobro sale sin tu OK.' : ''}${ventanaAbierta ? '' : ' Fuera de la ventana queda en cola hasta las 08:00.'}`}
                        onClick={() => mandar(f)}>
                        <I_Send size={13} /> Mandar la respuesta
                      </Button>
                      <Button variant="ghost" className="btn-sm"
                        title="Abre la respuesta de Rumi en un campo editable: la ajustás, la guardás y recién después la mandás"
                        onClick={() => abrirEdicion(f)}>
                        <I_Edit size={13} /> Editar
                      </Button>
                      <Button variant="ghost" className="btn-sm"
                        title={f.puedeRumi
                          ? `Rumi la contesta sola y queda marcada como contestada por Rumi (no toca plata). Te avisa si la marca vuelve a escribir.`
                          : `Acá no puede: ${f.motivoRumi} Tocalo y te muestro con qué regla choca y qué sí puede hacer.`}
                        onClick={() => (f.puedeRumi ? contestarRumi(f) : explicarRumi(f))}>
                        <I_Robot size={13} /> Rumi la contesta sola
                      </Button>
                      {f.pideHumano && (
                        <Button variant="ghost" className="btn-sm"
                          title="La marca pidió hablar con una persona: la conversación queda en tus manos y Rumi deja de contestar hasta que la atiendas."
                          onClick={() => escalar(f)}>
                          <I_Zap size={13} /> Escalar a vos
                        </Button>
                      )}
                      <Button variant="ghost" className="btn-sm"
                        title="Abre el DM con quién escribe, la etapa del pipeline, las reglas que aplican y la respuesta completa"
                        onClick={() => verDM(f)}>
                        <I_Eye size={13} /> Ver por qué
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {salidas.length > 0 && (
          <div style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <div className="bs" style={{ marginBottom: 8 }}>Lo que ya salió de tu bandeja:</div>
            {salidas.map((s, i) => (
              <div key={`${s.id}-${i}`} className="tiny" style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontWeight: 700, marginBottom: 6, lineHeight: 1.5 }}>
                <I_Check size={13} style={{ color: 'var(--green)', flexShrink: 0, marginTop: 2 }} />
                <span>{s.txt} · {s.hora}</span>
              </div>
            ))}
            <div className="tiny muted">
              Cada respuesta queda en la conversación con quién la mandó y a qué hora: Rumi no manda nada por vos
              sin que lo apruebes.
            </div>
          </div>
        )}
        <NotaMoneda />
      </Card>

      {/* ============ EL PIPELINE: en qué etapa está cada marca que te escribe ============ */}
      <Card
        title={<span className="row" style={{ gap: 8 }}><I_Users size={14} style={{ color: 'var(--green)' }} /> El pipeline de la conversación</span>}
        action={<Badge tone="green">{OPORTUNIDADES.length} marcas · {OPORTUNIDADES.filter(o => o.etapa === 'Deal').length} en deal</Badge>}
      >
        <div className="bs" style={{ marginBottom: 12 }}>
          La conversación de una marca vive en una de estas {ETAPAS_PIPELINE.length} etapas, y el DM que tenés
          abierto arriba es la etapa en la que está esa marca. Tocar una tarjeta muestra qué busca, cuánto paga
          y qué está esperando de vos.
        </div>
        <div className="pipeline">
          {ETAPAS_PIPELINE.map(etapa => {
            const enEtapa = OPORTUNIDADES.filter(o => o.etapa === etapa);
            return (
              <div key={etapa} className={`pl-col ${enEtapa.length ? 'con' : ''}`}>
                <div className="pl-t">{etapa}<span className="pl-n">{enEtapa.length}</span></div>
                {enEtapa.map(o => {
                  const f = dms.find(d => d.de === o.marca);
                  return (
                    <button key={o.marca} className="pl-card"
                      title={f
                        ? `${o.marca}: ${o.queBusca}. Paga ${o.paga}. El DM está ${ESTADO_TXT[f.estado].toLowerCase()}.`
                        : `${o.marca}: ${o.queBusca}. Paga ${o.paga}. Todavía no hay un DM abierto.`}
                      onClick={() => verMarca(o)}>
                      <span className="pl-m">{o.marca}</span>
                      <span className="pl-p"><Dinero monto={o.paga} equivalente={false} /></span>
                      {f && (
                        <span className={`badge ${f.estado === 'espera' || f.estado === 'escalada' ? 'badge-amber' : 'badge-green'}`} style={{ fontSize: 7.5, padding: '2px 6px' }}>
                          {f.estado === 'espera' ? 'DM sin mandar' : f.estado === 'escalada' ? 'en tus manos' : f.estado === 'mia' ? 'contestado por vos' : 'contestado por Rumi'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
        <div className="row" style={{ gap: 9, marginTop: 14, flexWrap: 'wrap' }}>
          <Button className="btn-sm" title="Muestra tu lista de precios por pieza: es lo que Rumi usa para responder, y ningún cobro sale sin tu OK"
            onClick={verRates}><I_Bank size={13} /> Mis rates</Button>
          <Button variant="ghost" className="btn-sm" title="Todas las acciones del equipo con su nivel de autonomía y los guardrails que las frenan"
            onClick={verDial}><I_Shield size={13} /> Ver el dial de autonomía</Button>
        </div>
        <div className="acc-why">
          El pipeline es el mismo de las campañas de Negocios, con las etapas de un deal: <b>la marca avanza de etapa
          cuando hay un acuerdo</b>, y cada avance sale de una conversación que aprobaste vos.
        </div>
      </Card>

      {/* ============ LO QUE PIDE UNA PERSONA Y LAS REGLAS QUE SE VEN ============ */}
      <div className="duo" style={{ marginTop: 16 }}>
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Zap size={14} style={{ color: 'var(--red)' }} /> Lo que pide hablar con vos</span>}
          action={<Badge tone={pidenPersona.length ? 'red' : 'green'}>{pidenPersona.length}</Badge>}
        >
          {pidenPersona.length === 0 ? (
            <div className="bs">
              Ninguna marca pidió hablar con una persona: Rumi contesta con la respuesta propuesta y vos
              sólo mandás.
            </div>
          ) : pidenPersona.map(f => (
            <div key={f.id} className="alarm critico" style={{ marginBottom: 10, borderLeft: '3px solid var(--red)' }}>
              <div className="alarm-head">
                <span className="alarm-sev critico">PIDIÓ UNA PERSONA</span>
                <span className="alarm-when">{f.estado === 'escalada' ? `en tus manos${f.hora ? ` desde las ${f.hora}` : ''}` : 'Rumi la frenó'}</span>
              </div>
              <div className="alarm-title" style={{ minWidth: 0 }}>{f.de}: «{f.texto}»</div>
              <div className="alarm-sug">{f.motivoRumi}</div>
              <div className="alarm-acts">
                {f.estado === 'escalada' ? (
                  <Button className="btn-sm" title={`Le manda la respuesta a ${f.de} con tu nombre: es la que ya escribió Rumi.`}
                    onClick={() => mandar(f)}><I_Send size={13} /> Mandar la respuesta</Button>
                ) : (
                  <Button className="btn-sm" title="La conversación queda en tus manos: Rumi deja de contestar hasta que la atiendas. No le manda nada a la marca."
                    onClick={() => escalar(f)}><I_Zap size={13} /> Escalar a vos</Button>
                )}
                <Button variant="ghost" className="btn-sm" title="Abre el DM completo, con la etapa del pipeline y las reglas que aplican"
                  onClick={() => verDM(f)}><I_Eye size={13} /> Ver por qué</Button>
              </div>
            </div>
          ))}
          <div className="acc-why">
            Rumi escala cuando la marca pide una persona o cuando hay un deal en juego: <b>no la deja esperando
            ni contesta por vos</b>. Es la misma decisión de la vista de conversaciones del negocio, con marcas.
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Shield size={14} style={{ color: 'var(--purple3)' }} /> Las reglas de tus mensajes</span>}
          action={<Badge tone="purple">4 reglas</Badge>}
        >
          <div className="bs" style={{ marginBottom: 6 }}>
            Son las mismas del dial de autonomía y de los guardrails: cambian de nivel en Cuenta y autonomía,
            no acá. Cada DM de arriba se contesta según estas cuatro.
          </div>

          {REGLAS.map(r => (
            <div key={r.titulo} className="guard">
              <span style={{ color: r.color, flexShrink: 0 }}>{r.icono}</span>
              <span className="guard-lb">{r.titulo}<small>{r.que}</small></span>
              <Badge tone={r.tono}>{r.nivel}</Badge>
              <Button variant="ghost" className="btn-sm"
                title={`${r.que} Cuántos DMs de tu bandeja toca esta regla: ${r.cuantos} de ${dms.length}.`}
                onClick={() => verRegla(r)}>Ver</Button>
            </div>
          ))}

          <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            {RATES.map(r => (
              <div key={r.pieza} className="dato">
                <span className="dato-l">{r.pieza}</span>
                <span className="dato-v"><Dinero monto={r.precio} /></span>
              </div>
            ))}
          </div>
          <div className="tiny muted" style={{ marginTop: 6 }}>
            Tus rates, en dólares por pieza. Rumi los usa para responder y <b>ninguno sale sin que lo mandes vos</b>.
          </div>

          <div className="row" style={{ gap: 9, marginTop: 14, flexWrap: 'wrap' }}>
            <Button className="btn-sm" title="Abre el detalle de cada regla: su nivel en el dial, por qué está así y qué DMs de tu bandeja toca"
              onClick={() => verRegla({
                titulo: REGLA_RATES.accion,
                que: REGLA_RATES.nota,
                por: 'Un cero de más en un precio o un link de cobro mal mandado no se puede deshacer: por eso es la única acción manual del creador.',
                nivel: NIVEL_TXT[REGLA_RATES.nivel],
                cuantos: dms.filter(d => d.tienePrecio).length,
                nota: 'La respuesta de Rumi puede llevar el precio escrito: lo que nunca hace sola es mandarlo. Cuando lo mandás vos, el cobro queda a tu nombre.',
              })}>
              <I_Link size={13} /> Por qué los cobros son manuales
            </Button>
            <Button variant="ghost" className="btn-sm" title="Todas las acciones del equipo con su nivel de autonomía y los guardrails que las frenan"
              onClick={verDial}><I_Shield size={13} /> Ver el dial completo</Button>
            <Button variant="ghost" className="btn-sm" title="La explicación del guardrail de horario y qué pasa con lo que mandás de noche"
              onClick={() => verRegla({
                titulo: `${GUARD_HORARIO.nombre}: ${VENTANA_TXT}`,
                que: GUARD_HORARIO.porQue,
                por: 'Es un guardrail, no una preferencia: no se puede desactivar.',
                nivel: GUARD_HORARIO.valor,
                cuantos: esperando,
                nota: 'Lo que mandes fuera de la ventana queda en cola y sale a las 08:00. El equipo tampoco le escribe a una marca a las 3 de la mañana.',
              })}>
              <I_Clock size={13} /> La ventana de las marcas
            </Button>
          </div>

          <div className="acc-why">Las reglas se ven acá y en Cuenta y autonomía: es el mismo dial, con los mismos números.</div>
        </Card>
      </div>
    </div>
  );
}

// =============================================================================================
// Las cuatro reglas, armadas desde el dial y los guardrails de la data. El nombre, el nivel y el
// motivo salen de ahí: si el dueño cambia el dial, la pantalla cambia con él.
// =============================================================================================
const REGLAS: { titulo: string; que: string; por: string; nivel: string; tono: 'purple' | 'amber' | 'red'; color: string; icono: ReactNode; cuantos: number; nota: string }[] = [
  {
    titulo: REGLA_DMS.accion, que: REGLA_DMS.nota, por: 'Sin esto, una respuesta armada por el equipo podría salir a tu nombre sin que la mandes.',
    nivel: NIVEL_TXT[REGLA_DMS.nivel], tono: 'purple', color: 'var(--purple3)', icono: <I_Robot size={14} />,
    cuantos: DMS.length,
    nota: 'Rumi escribe la respuesta de cada marca y de cada seguidor. En las marcas siempre espera tu OK; en un seguidor, donde no hay plata de por medio, puede mandarla sola.',
  },
  {
    titulo: REGLA_RATES.accion, que: REGLA_RATES.nota, por: 'Es la única acción manual de un creador: un precio mal mandado o un link de cobro abierto no se pueden deshacer.',
    nivel: NIVEL_TXT[REGLA_RATES.nivel], tono: 'red', color: 'var(--red)', icono: <I_Bank size={14} />,
    cuantos: DMS.filter(d => d.tienePrecio).length,
    nota: 'La propuesta puede traer el precio escrito, pero el envío es tuyo. En tu bandeja hay un DM así: el de la marca que preguntó cuánto sale el pack.',
  },
  {
    titulo: `${GUARD_DEAL.nombre}: ${GUARD_DEAL.valor}`, que: GUARD_DEAL.porQue, por: 'Un error de un dígito no tiene que convertirse en un cobro.',
    nivel: GUARD_DEAL.valor, tono: 'amber', color: 'var(--amber)', icono: <I_Wallet size={14} />,
    cuantos: DMS.filter(d => d.monto !== null && d.monto > UMBRAL_OK).length,
    nota: `El deal de $${UMBRAL_OK} para arriba no avanza ni se contesta solo: te espera. Los más chicos los sigue Rumi y los cierra contigo.`,
  },
  {
    titulo: `${GUARD_HORARIO.nombre}: ${VENTANA_TXT}`, que: GUARD_HORARIO.porQue, por: 'Es un guardrail, no una preferencia: no se puede desactivar.',
    nivel: GUARD_HORARIO.valor, tono: 'amber', color: 'var(--amber)', icono: <I_Clock size={14} />,
    cuantos: DMS.filter(d => d.estado === 'espera' || d.estado === 'escalada').length,
    nota: 'Una marca no recibe un pitch a las 3 de la mañana. Lo que quede para mandar de noche sale a las 08:00 del día siguiente.',
  },
];

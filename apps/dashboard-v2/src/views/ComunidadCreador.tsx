import { useState } from 'react';
import { Card, Badge, Button } from '../components/ui';
import { ViewHead, BarRow } from '../components/viz';
import {
  I_Chat, I_Question, I_Robot, I_Send, I_Edit, I_Check, I_Clock, I_User, I_Shield, I_Lock,
  I_Eye, I_Refresh, I_Plus, I_Trend, I_Globe,
} from '../components/icons';
import { useDetalle } from '../components/Detalle';
import {
  COMENTARIOS, NICHO, FICHA_CREADOR, AUTONOMIA_CREADOR, GUARDRAILS_CREADOR, VISTAS_CREADOR,
} from '../data/creador';

// =============================================================================================
// COMUNIDAD, EN PIEL DE CREADOR — los comentarios y mensajes de la AUDIENCIA.
//
// Es la vista de Conversaciones del motor, con el trabajo de un creador: acá no hay clientes ni
// acuerdos, hay gente que le escribe a la cuenta. Rumi (el agente de comunidad) deja la respuesta
// escrita y el creador decide: la manda, la edita, la deja que Rumi la conteste sola, o se la queda
// para contestarla él porque es una consulta personal.
//
// LAS TRES REGLAS QUE EL CREADOR VE EN CADA COMENTARIO salen del dial de autonomía y de los
// guardrails, no del componente: contestar comentarios y mensajes es SHARED (Rumi propone, vos
// mandás), lo personal o sensible te lo deja a vos, y borrar o cambiar algo ya publicado es MANUAL
// (nada de lo que salió con tu nombre se toca sin vos). La ventana horaria sale de la Ficha: fuera
// de la mejor franja de la audiencia la respuesta no se manda de madrugada, queda en cola.
//
// NINGÚN NÚMERO ESTÁ ESCRITO A MANO: el encabezado, las barras por red y los contadores se cuentan
// sobre COMENTARIOS y sobre lo que el creador hizo en esta visita. Lo que habla su gente sale de
// NICHO.temasQuePiden, y las redes y el tono, de FICHA_CREADOR.
// =============================================================================================

/** Un comentario de la data, tal como llega. */
type Comentario = (typeof COMENTARIOS)[number];
type TipoComentario = Comentario['tipo'];
type EstadoDato = Comentario['estado'];
/** Los estados de la vista: los de la data más el que produce Mandar la respuesta. */
type Estado = EstadoDato | 'contestado-por-vos';

/** El tipo, como se lee en la pantalla. */
const ETIQUETA: Record<TipoComentario, string> = {
  pregunta: 'Pregunta',
  elogio: 'Elogio',
  'consulta-personal': 'Consulta personal',
  critica: 'Crítica',
};

/** Cada tipo se pinta distinto: una crítica no se lee igual que un elogio. */
const TONO_TIPO: Record<TipoComentario, 'purple' | 'green' | 'amber' | 'red'> = {
  pregunta: 'purple', elogio: 'green', 'consulta-personal': 'amber', critica: 'red',
};

const ESTADO_TXT: Record<Estado, string> = {
  'espera-tu-ok': 'Espera tu OK',
  tuyo: 'Es tuyo',
  'contestado-por-rumi': 'Contestado por Rumi',
  'contestado-por-vos': 'Contestado por vos',
};

const ESTADO_TONO: Record<Estado, 'amber' | 'red' | 'purple' | 'green'> = {
  'espera-tu-ok': 'amber', tuyo: 'red', 'contestado-por-rumi': 'purple', 'contestado-por-vos': 'green',
};

/** Lo que se contesta primero: el comentario que espera una persona va arriba de todo. */
const ORDEN: Record<Estado, number> = {
  'espera-tu-ok': 0, tuyo: 1, 'contestado-por-vos': 2, 'contestado-por-rumi': 3,
};

/** Los niveles del dial, con el nombre y el color que tienen en Cuenta y autonomía. */
const NIVEL_TXT: Record<'auto' | 'shared' | 'manual', string> =
  { auto: 'Automático', shared: 'Compartido', manual: 'Manual' };
const NIVEL_TONO: Record<'auto' | 'shared' | 'manual', 'green' | 'purple' | 'amber'> =
  { auto: 'green', shared: 'purple', manual: 'amber' };

// ---------------------------------------------------------------------------------------------
// LAS REGLAS, LEÍDAS DEL DIAL Y DE LOS GUARDRAILS. Nada de esto se escribe acá: se busca en la
// data para que esta pantalla y Cuenta y autonomía digan siempre lo mismo.
// ---------------------------------------------------------------------------------------------

const REGLA_RESPUESTAS = AUTONOMIA_CREADOR.find(a => a.accion.startsWith('Contestar comentarios'))!;
const REGLA_BORRAR = AUTONOMIA_CREADOR.find(a => a.accion.startsWith('Borrar o cambiar'))!;
const GUARD_PUBLICACION = GUARDRAILS_CREADOR.find(g => g.nombre.startsWith('No se toca'))!;

/** La mejor ventana de la audiencia, escrita en la Ficha: «De 19:00 a 21:00, cuando…» → 19:00 a 21:00. */
const VENTANA = /(\d{1,2}:\d{2}\s*a\s*\d{1,2}:\d{2})/.exec(FICHA_CREADOR.mejorVentana)?.[1] ?? FICHA_CREADOR.mejorVentana;

/** El agente de comunidad: quién es y qué hace, leído del equipo. */
const RUMI = 'Rumi';

/**
 * El modelo sólo deja contestar sola una parte de lo que llega: los elogios y las preguntas
 * simples. Lo personal y lo que critica a la cuenta se contestan desde el creador.
 */
const puedeRumi = (t: TipoComentario) => t === 'elogio' || t === 'pregunta';

/** Por qué NO puede, cuando no puede: es la regla que choca con este comentario. */
const motivoNoPuede = (t: TipoComentario) =>
  t === 'consulta-personal'
    ? 'Es una consulta personal: conviene que la conteste el creador.'
    : t === 'critica'
      ? 'Es una crítica a tu contenido: lo sensible lo contestás vos.'
      : '';

export function ViewComunidadCreador({ setToast }: { setToast: (t: string) => void }) {
  const detalle = useDetalle();

  // =============================================================================================
  // LO QUE ESTA PANTALLA CAMBIA — cada botón deja su rastro en la tarjeta del comentario, con la
  // hora del momento. Nada de acá vive en un aviso que se va solo.
  // =============================================================================================

  /** En qué estado quedó cada comentario (arranca con el que trae la data). */
  const [estados, setEstados] = useState<Record<string, Estado>>(() => {
    const out: Record<string, Estado> = {};
    for (const c of COMENTARIOS) out[c.id] = c.estado;
    return out;
  });
  /** La hora en que salió o se contestó cada uno: es lo que hace que la línea no sea un texto fijo. */
  const [horas, setHoras] = useState<Record<string, string>>({});
  /** La respuesta de cada comentario: la propuesta de Rumi y, si la editás, la tuya. */
  const [respuestas, setRespuestas] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const c of COMENTARIOS) out[c.id] = c.propuesta;
    return out;
  });
  /** Las respuestas que editaste vos: queda marcado en la tarjeta de dónde salió el texto. */
  const [editadas, setEditadas] = useState<string[]>([]);
  /** El comentario que se está editando y lo que hay escrito en el campo. */
  const [editando, setEditando] = useState<string | null>(null);
  const [borrador, setBorrador] = useState('');
  /** Los temas de tu audiencia que ya están en el plan: se ve en el tema, con su etiqueta. */
  const [enElPlan, setEnElPlan] = useState<string[]>([]);
  /** Lo que hiciste en esta visita, con la hora: es el registro de abajo, no un aviso. */
  const [movs, setMovs] = useState<{ t: string; hora: string }[]>([]);

  const ahora = () => new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  const anotar = (t: string) => setMovs(m => [{ t, hora: ahora() }, ...m]);
  const estadoDe = (c: Comentario): Estado => estados[c.id];
  const respuestaDe = (c: Comentario) => respuestas[c.id] ?? c.propuesta;

  /** La ficha de la red donde llegó el comentario: es la que da los seguidores y el estado. */
  const redDe = (nombre: string) => FICHA_CREADOR.redes.find(r => r.red === nombre);
  /** El rótulo de la red, con lo real de la Ficha detrás: seguidores y si está conectada. */
  const ayudaRed = (c: Comentario) => {
    const r = redDe(c.red);
    return r
      ? `Llegó por ${r.red}: ${r.seguidores} seguidores · cuenta ${r.estado}`
      : `Llegó por ${c.red}`;
  };

  // ---------------------------------------------------------------------------------------------
  // LAS ACCIONES. Cada una deja el comentario en un estado distinto, a la vista, y baja o sube los
  // contadores del encabezado.
  // ---------------------------------------------------------------------------------------------

  const cambiar = (id: string, e: Estado, hora?: string) => {
    setEstados(s => ({ ...s, [id]: e }));
    if (hora) setHoras(o => ({ ...o, [id]: hora }));
  };

  /** Mandar la respuesta: sale con tu nombre, queda la hora y el comentario baja del contador. */
  const mandar = (c: Comentario) => {
    const h = ahora();
    cambiar(c.id, 'contestado-por-vos', h);
    anotar(`Le mandaste la respuesta a ${c.de}, por ${c.red}`);
    setToast(`Respuesta mandada a ${c.de} a las ${h}: quedó contestada por vos, no por Rumi`);
  };

  /** Editar la respuesta: se abre en un campo, se guarda y sigue esperando tu OK para salir. */
  const abrirEdicion = (c: Comentario) => {
    setEditando(c.id);
    setBorrador(respuestaDe(c));
    setToast(`Editás la respuesta a ${c.de}: lo que guardes queda a la vista y no sale hasta que la mandes vos`);
  };

  const guardarEdicion = (c: Comentario) => {
    const t = borrador.trim();
    if (!t) {
      setToast('La respuesta no puede quedar vacía: escribí algo antes de guardar');
      return;
    }
    setRespuestas(r => ({ ...r, [c.id]: t }));
    setEditadas(e => (e.includes(c.id) ? e : [...e, c.id]));
    setEditando(null);
    setToast(`Guardaste tu versión de la respuesta a ${c.de}: todavía no salió`);
  };

  /** Rumi la contesta sola, sólo donde el modelo lo permite (elogios y preguntas simples). */
  const contestarRumi = (c: Comentario) => {
    const h = ahora();
    cambiar(c.id, 'contestado-por-rumi', h);
    anotar(`${RUMI} contestó sola a ${c.de}, en ${c.red}`);
    setToast(`${RUMI} contestó sola a ${c.de} a las ${h}: te avisa si vuelve a escribir`);
  };

  /** Dejarlo para mí: las personales quedan marcadas como tuyas, con el motivo a la vista. */
  const dejarParaMi = (c: Comentario) => {
    cambiar(c.id, 'tuyo');
    anotar(`${c.de} quedó para vos: es una consulta personal`);
    setToast(`${c.de} queda para vos: es una consulta personal y la contestás cuando puedas`);
  };

  /** Devolverlo a la cola: deshace el «es tuyo» y el comentario vuelve a esperar tu OK. */
  const volverALaCola = (c: Comentario) => {
    cambiar(c.id, 'espera-tu-ok');
    setToast(`${c.de} vuelve a la cola: queda esperando tu OK como al principio`);
  };

  /** Que Nia arme una pieza: el tema que más te piden queda marcado en el plan, a la vista. */
  const alPlan = (tema: (typeof NICHO.temasQuePiden)[number]) => {
    setEnElPlan(p => (p.includes(tema.t) ? p : [...p, tema.t]));
    anotar(`Nia arma una pieza sobre «${tema.t}»`);
    setToast(`«${tema.t}» queda en el plan: Nia escribe la pieza con las ${tema.consultas} veces que te lo pidieron`);
  };
  const fueraDelPlan = (tema: (typeof NICHO.temasQuePiden)[number]) => {
    setEnElPlan(p => p.filter(x => x !== tema.t));
    setToast(`«${tema.t}» sale del plan: el tema queda solo como lectura de tu audiencia`);
  };

  // ---------------------------------------------------------------------------------------------
  // LOS PANELES DE DETALLE — el dato real de cada cosa, en el mismo lugar para todos los botones.
  // ---------------------------------------------------------------------------------------------

  /** Por qué Rumi NO puede contestar sola este comentario, y qué sí hizo. */
  const explicarRumi = (c: Comentario) => detalle({
    titulo: `${RUMI} no puede contestar sola a ${c.de}`,
    sub: motivoNoPuede(c.tipo),
    bloques: [
      { tipo: 'datos', filas: [
        { k: 'Qué llegó', v: ETIQUETA[c.tipo], s: `«${c.texto}»` },
        { k: 'Regla del modelo', v: `${REGLA_RESPUESTAS.accion}: ${NIVEL_TXT[REGLA_RESPUESTAS.nivel]}`, s: REGLA_RESPUESTAS.nota },
        { k: 'Por qué choca acá', v: ETIQUETA[c.tipo], s: motivoNoPuede(c.tipo) },
        { k: 'Qué sí hizo', v: 'La respuesta está escrita', s: 'Es la que ves en la tarjeta: la mandás vos y sale con tu nombre.' },
        { k: 'Si no la mandás', v: 'Queda esperando', s: `${c.de} no recibe nada, y el comentario sigue en tu cola.` },
      ] },
      { tipo: 'texto', texto: `La respuesta que dejó escrita: «${respuestaDe(c)}»` },
      { tipo: 'aviso', tono: 'amber', texto: `No hace falta que escribas nada: la respuesta ya está armada. Lo único que ${RUMI} no hace sola es lo personal o lo que te critica.` },
    ],
    fuente: 'Tu dial de autonomía (§Contestar comentarios y mensajes) y el comentario real de tu bandeja.',
    acciones: [
      { label: 'Mandar la respuesta vos', variante: 'primary', title: `Sale por tu ${c.red} con tu nombre y queda contestada por vos.`, onClick: () => mandar(c) },
      ...(!puedeRumi(c.tipo) && estadoDe(c) !== 'tuyo'
        ? [{ label: 'Dejarlo para mí', title: c.tipo === 'consulta-personal' ? 'El comentario queda marcado como tuyo, con el motivo a la vista: es una consulta personal y la contestás vos.' : 'El comentario queda marcado como tuyo: es una crítica a tu contenido y lo sensible lo contestás vos.', onClick: () => dejarParaMi(c) }]
        : []),
    ],
  });

  /** El comentario completo: qué llegó, qué propone Rumi, con qué regla y en qué estado está. */
  const verComentario = (c: Comentario) => detalle({
    titulo: `${c.de} · ${ESTADO_TXT[estadoDe(c)]}`,
    sub: `«${c.texto}»`,
    bloques: [
      { tipo: 'datos', filas: [
        { k: 'Tipo', v: ETIQUETA[c.tipo], s: 'lo lee el agente antes de escribir: no se contesta igual un elogio que una crítica' },
        { k: 'Red', v: c.red, s: ayudaRed(c) },
        { k: 'Estado', v: ESTADO_TXT[estadoDe(c)], s: horas[c.id] ? `quedó así a las ${horas[c.id]}` : 'es el estado con el que llegó' },
        { k: `${RUMI} sola`, v: puedeRumi(c.tipo) ? 'Sí puede' : 'No puede', s: puedeRumi(c.tipo) ? 'Es un elogio o una pregunta simple: el modelo la deja contestar sola.' : motivoNoPuede(c.tipo) },
        { k: 'La respuesta', v: editadas.includes(c.id) ? 'La escribiste vos' : `La escribió ${RUMI}`, s: 'es la que sale cuando la mandás' },
      ] },
      { tipo: 'texto', texto: `La respuesta lista para salir: «${respuestaDe(c)}»` },
      { tipo: 'texto', texto: `Se escribe con tu tono: ${FICHA_CREADOR.tono.toLowerCase()}.` },
    ],
    fuente: 'Bandeja de comentarios y mensajes del creador, con tu Ficha de creador.',
    acciones: estadoDe(c) === 'espera-tu-ok' || estadoDe(c) === 'tuyo'
      ? [
          { label: 'Mandar la respuesta', variante: 'primary', title: `Sale por tu ${c.red} con tu nombre.`, onClick: () => mandar(c) },
          { label: 'Editar la respuesta', title: 'La abre en un campo editable: guardás tu texto y sigue esperando tu OK', onClick: () => abrirEdicion(c) },
        ]
      : undefined,
  });

  /** Un tema de tu audiencia: de dónde sale la lectura y cuánto pesa sobre el total. */
  const verTema = (tema: (typeof NICHO.temasQuePiden)[number]) => detalle({
    titulo: tema.t,
    sub: tema.lectura,
    bloques: [
      { tipo: 'datos', filas: [
        { k: 'Cuántas veces te lo pidieron', v: `${tema.consultas}`, s: `sobre ${totalConsultas} consultas contadas en tus comentarios y mensajes` },
        { k: 'Cuánto pesa', v: `${Math.round((tema.consultas / totalConsultas) * 100)}%`, s: 'del total de lo que te pide tu gente' },
        { k: 'En el plan', v: enElPlan.includes(tema.t) ? 'Sí, Nia la arma' : 'Todavía no', tono: enElPlan.includes(tema.t) ? 'green' : 'muted' },
        { k: 'Quién lo lee', v: RUMI, s: 'cuenta las preguntas repetidas y te trae los temas, no los comentarios uno por uno' },
      ] },
      { tipo: 'texto', texto: 'Una serie sobre el tema que más te piden es la que más conversación genera: cada pieza que contesta una pregunta repetida trae los comentarios de la siguiente.' },
    ],
    fuente: 'Las preguntas más repetidas en tus comentarios y mensajes, contadas por el agente de comunidad.',
    acciones: enElPlan.includes(tema.t)
      ? [{ label: 'Sacarlo del plan', title: 'El tema deja de estar en el plan y queda solo como lectura de tu audiencia. Reversible.', onClick: () => fueraDelPlan(tema) }]
      : [{ label: 'Que Nia arme una pieza', variante: 'primary', title: `Nia escribe la pieza sobre «${tema.t}», con las ${tema.consultas} veces que te lo pidieron. Queda en el plan del lunes, a la vista.`, onClick: () => alPlan(tema) }],
  });

  /** Una regla de la comunidad: su nivel, por qué está así y qué comentarios de la bandeja toca. */
  const verRegla = (r: { titulo: string; que: string; por: string; nivel: string; tono: 'green' | 'purple' | 'amber'; cuantos: number; nota: string }) => detalle({
    titulo: r.titulo,
    sub: r.que,
    bloques: [
      { tipo: 'datos', filas: [
        { k: 'Nivel en el dial', v: r.nivel, s: 'es el mismo nivel que ves en Cuenta y autonomía' },
        { k: 'Por qué está así', v: r.por },
        { k: 'Comentarios de esta bandeja que toca', v: `${r.cuantos} de ${COMENTARIOS.length}` },
      ] },
      { tipo: 'texto', texto: r.nota },
      { tipo: 'aviso', texto: 'El nivel se cambia en Cuenta y autonomía, no desde acá: la misma acción tiene el mismo nivel en todas las pantallas.' },
    ],
    fuente: 'Tu dial de autonomía y tus guardrails, con la bandeja de esta cuenta.',
  });

  // ---------------------------------------------------------------------------------------------
  // LOS NÚMEROS — todos se cuentan sobre COMENTARIOS y sobre lo que hiciste en esta visita.
  // ---------------------------------------------------------------------------------------------

  const total = COMENTARIOS.length;
  const de = (e: Estado) => COMENTARIOS.filter(c => estadoDe(c) === e).length;
  const esperando = de('espera-tu-ok');
  const tuyos = de('tuyo');
  const rumiSolas = de('contestado-por-rumi');
  const porVos = de('contestado-por-vos');
  const ordenados = [...COMENTARIOS].sort((a, b) => ORDEN[estadoDe(a)] - ORDEN[estadoDe(b)]);
  const puedenSolas = COMENTARIOS.filter(c => puedeRumi(c.tipo) && estadoDe(c) === 'espera-tu-ok').length;
  /** En qué red pasa más: se cuenta por red sobre los comentarios que llegaron. */
  const porRed = [...new Set(COMENTARIOS.map(c => c.red))]
    .map(red => ({ red, cuantos: COMENTARIOS.filter(c => c.red === red).length }))
    .sort((a, b) => b.cuantos - a.cuantos);
  const redTop = porRed[0];
  const maxConsultas = Math.max(...NICHO.temasQuePiden.map(t => t.consultas));
  const totalConsultas = NICHO.temasQuePiden.reduce((s, t) => s + t.consultas, 0);
  /** Las reglas de la comunidad, armadas con el dial y los guardrails de la data. */
  const reglas = [
    {
      titulo: REGLA_RESPUESTAS.accion, que: REGLA_RESPUESTAS.nota,
      por: 'Sin esto, una respuesta escrita por el equipo podría salir a tu nombre sin que la mandes.',
      nivel: NIVEL_TXT[REGLA_RESPUESTAS.nivel], tono: NIVEL_TONO[REGLA_RESPUESTAS.nivel], cuantos: total,
      nota: `${RUMI} escribe la respuesta de cada comentario y de cada mensaje, y sale cuando la mandás vos. De los ${total} de tu bandeja, ${puedenSolas} son de las que además puede contestar sola.`,
      icono: <I_Robot size={14} />, color: 'var(--purple3)',
    },
    {
      titulo: 'Lo personal o sensible lo contestás vos', que: 'Rumi no contesta lo personal ni lo que te critica: te lo deja armado y con el motivo a la vista.',
      por: 'Una consulta personal pide tu voz, y una crítica pide tu decisión: el equipo no contesta por vos lo que te compromete.',
      nivel: `Dentro de «${REGLA_RESPUESTAS.accion}»`, tono: 'amber' as const,
      cuantos: COMENTARIOS.filter(c => !puedeRumi(c.tipo)).length,
      nota: `En tu bandeja hay ${COMENTARIOS.filter(c => !puedeRumi(c.tipo)).length} así: ${COMENTARIOS.filter(c => !puedeRumi(c.tipo)).map(c => c.de).join(', ')}. La respuesta ya está escrita: lo único que falta es tu OK.`,
      icono: <I_User size={14} />, color: 'var(--amber)',
    },
    {
      titulo: REGLA_BORRAR.accion, que: REGLA_BORRAR.nota,
      por: 'Lo que ya salió con tu nombre es tu palabra: no se edita ni se borra sin vos.',
      nivel: NIVEL_TXT[REGLA_BORRAR.nivel], tono: NIVEL_TONO[REGLA_BORRAR.nivel], cuantos: 0,
      nota: `También vale para un comentario ya contestado: si querés cambiar lo que se dijo, lo cambiás vos. ${GUARD_PUBLICACION.nombre}: ${GUARD_PUBLICACION.porQue}`,
      icono: <I_Lock size={14} />, color: 'var(--red)',
    },
    {
      titulo: `La ventana para contestar: ${VENTANA}`, que: FICHA_CREADOR.mejorVentana,
      por: `Es cuando tu audiencia está con el celular. ${FICHA_CREADOR.peorVentana}`,
      nivel: 'La mejor franja de tu audiencia', tono: 'purple' as const, cuantos: esperando,
      nota: `Fuera de esa franja ${RUMI} no manda: la respuesta queda en cola y sale cuando tu gente está mirando, no de madrugada.`,
      icono: <I_Clock size={14} />, color: 'var(--green)',
    },
  ];

  return (
    <div className="dash">
      <ViewHead
        icon={<I_Chat size={19} />}
        titulo={VISTAS_CREADOR.conversaciones.nombre}
        sub={`${VISTAS_CREADOR.conversaciones.sub}. ${RUMI} contesta lo repetido con tu tono —${FICHA_CREADOR.tono.toLowerCase()}— y lo personal te lo deja a vos: los ${total} comentarios de abajo llegaron con la respuesta ya escrita.`}
        nums={[
          { v: String(esperando), l: 'comentarios esperan tu OK', c: esperando ? 'var(--amber)' : 'var(--green)' },
          { v: String(rumiSolas), l: `los contestó ${RUMI} sola`, c: 'var(--purple3)' },
          { v: String(tuyos + porVos), l: 'son tuyos: personales o ya contestados por vos', c: 'var(--purple4)' },
          { v: redTop.red, l: `es donde pasa más: ${redTop.cuantos} de ${total} comentarios`, c: 'var(--green)' },
        ]}
      />

      {/* LA REGLA MADRE DE ESTA VISTA, CON LOS NÚMEROS QUE LA SOSTIENEN. */}
      <div className="onb-infiere" style={{ marginTop: 0 }}>
        <span className="onb-infiere-ic"><I_Robot size={13} /></span>
        <span>
          <b>{REGLA_RESPUESTAS.accion} es {NIVEL_TXT[REGLA_RESPUESTAS.nivel].toLowerCase()}. </b>
          {REGLA_RESPUESTAS.nota} {puedenSolas > 0
            ? `De tu bandeja, ${puedenSolas} ${puedenSolas === 1 ? 'es de las que' : 'son de las que'} además puede contestar sola: elogios y preguntas simples.`
            : `Hoy ninguna de las que esperan es de las que puede contestar sola: todas son personales o sensibles.`}
        </span>
      </div>

      {/* ============ LOS COMENTARIOS Y MENSAJES, CON LA RESPUESTA YA ESCRITA ============ */}
      <Card
        title={<span className="row" style={{ gap: 8 }}><I_Chat size={14} style={{ color: 'var(--purple3)' }} /> Lo que te escribió tu audiencia</span>}
        action={
          <span className="row" style={{ gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Badge tone={esperando ? 'amber' : 'green'}>{esperando ? `${esperando} esperan tu OK` : 'estás al día'}</Badge>
            {porVos > 0 && <Badge tone="green">{porVos} {porVos === 1 ? 'contestado' : 'contestados'} por vos</Badge>}
          </span>
        }
      >
        <div className="bs" style={{ marginBottom: 12 }}>
          Cada comentario o mensaje llega con la respuesta escrita por {RUMI}: la mandás vos, la editás,
          la dejás que la conteste sola cuando el modelo lo permite, o te la quedás para contestarla vos.
          El comentario que espera una persona va primero.
        </div>

        {ordenados.map(c => {
          const e = estadoDe(c);
          const enviado = e === 'contestado-por-vos' || e === 'contestado-por-rumi';
          const h = horas[c.id];
          const r = redDe(c.red);
          return (
            <div key={c.id} className={`alarm ${e === 'espera-tu-ok' ? 'oportunidad' : e === 'tuyo' ? 'atencion' : 'info'}`}
              style={{ marginBottom: 12 }}>
              <div className="alarm-head">
                <span className="badge badge-muted" style={{ fontSize: 9.5 }} title={ayudaRed(c)}>
                  <I_Globe size={10} /> {c.red}{r && r.estado !== 'conectada' ? ' · por conectar' : ''}
                </span>
                <span className="alarm-title" style={{ minWidth: 0 }}>{c.de}</span>
                <Badge tone={TONO_TIPO[c.tipo]}>{ETIQUETA[c.tipo]}</Badge>
                <Badge tone={ESTADO_TONO[e]}>{ESTADO_TXT[e]}{h ? ` · ${h}` : ''}</Badge>
              </div>

              <div className="alarm-money">
                <span className="ico" style={{ color: 'var(--purple3)' }}><I_Chat size={14} /></span>
                <span><b>Lo que escribió: </b>«{c.texto}»</span>
              </div>

              {enviado ? (
                /* Ya salió: queda a la vista qué se mandó, quién lo mandó y a qué hora. */
                <div style={{ marginTop: 10 }}>
                  <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ color: 'var(--green)' }}><I_Check size={13} /></span>
                    <span className="bt">{e === 'contestado-por-rumi' ? `La contestó ${RUMI}` : 'La mandaste vos'}</span>
                    <Badge tone="green">{h ? `salió a las ${h}` : `contestada por ${RUMI}`}</Badge>
                  </div>
                  <div className="alarm-sug" style={{ color: 'var(--txt)' }}>{respuestaDe(c)}</div>
                  <div className="tiny" style={{ color: 'var(--green)', fontWeight: 700, marginTop: 7, lineHeight: 1.5, display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                    <I_Check size={12} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>
                      {e === 'contestado-por-rumi'
                        ? `${RUMI} la contestó sola${h ? ` a las ${h}` : ''}: es ${ETIQUETA[c.tipo].toLowerCase()}, así que el modelo la deja sola. Te avisa si ${c.de} vuelve a escribir.`
                        : `Mandada por vos${h ? ` a las ${h}` : ''}: ${c.de} la recibe y el comentario queda como contestado por vos, no por ${RUMI}.`}
                      {editadas.includes(c.id) ? ' El texto es el que escribiste vos.' : ''}
                    </span>
                  </div>
                  <div className="alarm-acts" style={{ marginTop: 9 }}>
                    <Button variant="ghost" className="btn-sm"
                      title={`Abre el comentario completo: el tipo, la red, el estado y por qué se contestó así. No cambia nada.`}
                      onClick={() => verComentario(c)}><I_Eye size={13} /> Ver por qué</Button>
                  </div>
                </div>
              ) : (
                /* Esperando: la respuesta ya está escrita y cada botón dice qué hace. */
                <div style={{ marginTop: 10 }}>
                  <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ color: 'var(--purple3)' }}><I_Robot size={13} /></span>
                    <span className="bt">La respuesta que escribió {RUMI}</span>
                    {editadas.includes(c.id) && <Badge tone="purple">tu versión</Badge>}
                    {e === 'tuyo' && <Badge tone="red">es tuyo</Badge>}
                    <span className="tiny muted">sin mandar</span>
                  </div>
                  <div className="alarm-sug" style={{ color: 'var(--txt)' }}>{respuestaDe(c)}</div>

                  {e === 'tuyo' && (
                    <div className="tiny" style={{ color: 'var(--amber)', fontWeight: 700, marginTop: 7, lineHeight: 1.5, display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                      <I_User size={12} style={{ flexShrink: 0, marginTop: 2 }} />
                      <span>Es tuyo: {motivoNoPuede(c.tipo)} {RUMI} no lo contesta hasta que lo mandes vos.</span>
                    </div>
                  )}

                  {editando === c.id ? (
                    /* Editar: la respuesta se abre en un campo, se guarda y sigue esperando tu OK. */
                    <div style={{ marginTop: 10 }}>
                      <input className="input" id={`com-${c.id}`} value={borrador}
                        title="Escribí la respuesta como la querés mandar. Guardar no la manda: sale recién con Mandar la respuesta."
                        onChange={ev => setBorrador(ev.target.value)}
                        onKeyDown={ev => { if (ev.key === 'Enter') guardarEdicion(c); }} />
                      <div className="row" style={{ gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                        <Button className="btn-sm"
                          title={`Guarda tu texto como la respuesta de ${c.de}: queda a la vista en la tarjeta y todavía no sale.`}
                          onClick={() => guardarEdicion(c)}><I_Check size={13} /> Guardar la respuesta</Button>
                        <Button variant="ghost" className="btn-sm"
                          title={`Cierra el campo sin cambiar nada: queda el texto que había escrito ${RUMI}.`}
                          onClick={() => { setEditando(null); setToast(`Sin cambios: queda la respuesta que escribió ${RUMI}`); }}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="alarm-acts" style={{ marginTop: 10 }}>
                      <Button className="btn-sm"
                        title={`Le manda esta respuesta a ${c.de} por tu ${c.red}, con tu nombre: queda contestada por vos y baja el contador de los que esperan tu OK.`}
                        onClick={() => mandar(c)}><I_Send size={13} /> Mandar la respuesta</Button>
                      <Button variant="ghost" className="btn-sm"
                        title={`Abre la respuesta de ${RUMI} en un campo editable: la ajustás, la guardás y recién después la mandás.`}
                        onClick={() => abrirEdicion(c)}><I_Edit size={13} /> Editar</Button>
                      <Button variant="ghost" className="btn-sm"
                        title={puedeRumi(c.tipo)
                          ? `${RUMI} la contesta sola y queda marcada como contestada por ${RUMI}: es ${ETIQUETA[c.tipo].toLowerCase()} y el modelo lo permite. Te avisa si vuelve a escribir.`
                          : `Acá no puede: ${motivoNoPuede(c.tipo)} Tocalo y te muestro con qué regla choca y qué sí puede hacer.`}
                        onClick={() => (puedeRumi(c.tipo) ? contestarRumi(c) : explicarRumi(c))}>
                        <I_Robot size={13} /> {RUMI} la contesta sola
                      </Button>
                      {!puedeRumi(c.tipo) && (
                        e === 'tuyo' ? (
                          <Button variant="ghost" className="btn-sm"
                            title={`El comentario vuelve a la cola: deja de estar marcado como tuyo y espera tu OK otra vez. Reversible.`}
                            onClick={() => volverALaCola(c)}><I_Refresh size={13} /> Volver a la cola</Button>
                        ) : (
                          <Button variant="ghost" className="btn-sm"
                            title={c.tipo === 'consulta-personal'
                              ? `Lo deja marcado como tuyo, con el motivo a la vista: es una consulta personal, conviene que la conteste el creador. Reversible con «Volver a la cola».`
                              : `Lo deja marcado como tuyo: es una crítica a tu contenido y lo sensible lo contestás vos, con el motivo a la vista. Reversible con «Volver a la cola».`}
                            onClick={() => dejarParaMi(c)}><I_User size={13} /> Dejarlo para mí</Button>
                        )
                      )}
                      <Button variant="ghost" className="btn-sm"
                        title="Abre el comentario completo: el tipo, la red, el estado y la regla que decide quién lo contesta. No cambia nada."
                        onClick={() => verComentario(c)}><I_Eye size={13} /> Ver por qué</Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* DE DÓNDE LLEGAN: en qué red pasa más, contado sobre los comentarios reales. */}
        <div style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
          <div className="tiny muted" style={{ marginBottom: 7 }}>
            De dónde llegan los {total} comentarios de tu bandeja
          </div>
          {porRed.map(r => {
            const ficha = redDe(r.red);
            return (
              <div key={r.red}>
                <BarRow label={r.red} valor={r.cuantos} max={total}
                  color={r.red === redTop.red ? 'var(--purple2)' : 'var(--border2)'}
                  formato={`${r.cuantos} de ${total}`} />
                {ficha && (
                  <div className="tiny muted" style={{ marginTop: -4, paddingLeft: 2 }}>
                    {ficha.usuario} · {ficha.seguidores} seguidores · {ficha.interaccion} de interacción · cuenta {ficha.estado}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {movs.length > 0 && (
          <div style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <div className="bs" style={{ marginBottom: 8 }}>Lo que hiciste en esta visita:</div>
            {movs.map((m, i) => (
              <div key={`${m.hora}-${i}`} className="tiny" style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontWeight: 700, marginBottom: 6, lineHeight: 1.5 }}>
                <I_Clock size={13} style={{ color: 'var(--purple3)', flexShrink: 0, marginTop: 2 }} />
                <span>{m.t} · {m.hora}</span>
              </div>
            ))}
            <div className="tiny muted">
              Cada respuesta queda en la conversación con quién la mandó y a qué hora: {RUMI} no manda nada
              por vos sin que lo apruebes.
            </div>
          </div>
        )}

        <div className="acc-why">
          Contestar comentarios y mensajes es <b>{NIVEL_TXT[REGLA_RESPUESTAS.nivel].toLowerCase()}</b>: {RUMI} llega
          con la respuesta escrita y la decisión final es tuya. De los {total} de tu bandeja, {esperando} esperan
          tu OK, {tuyos} {tuyos === 1 ? 'quedó marcado como tuyo' : 'quedaron marcados como tuyos'}
          {' '}y {rumiSolas} {rumiSolas === 1 ? 'ya la contestó Rumi sola' : 'ya las contestó Rumi sola'}
          {porVos > 0 ? `, y ${porVos} ${porVos === 1 ? 'salió de tus manos' : 'salieron de tus manos'}` : ''}.
        </div>
      </Card>

      {/* ============ DE QUÉ HABLA TU GENTE Y LAS REGLAS DE TU COMUNIDAD ============ */}
      <div className="duo">
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Question size={14} style={{ color: 'var(--green)' }} /> De qué habla tu gente</span>}
          action={<Badge tone="green">{NICHO.temasQuePiden.length} temas · {totalConsultas} veces te lo pidieron</Badge>}
        >
          <div className="bs">
            Son las preguntas más repetidas en tus comentarios y mensajes: lo que tu audiencia te pide,
            contado por {RUMI}. Un tema que se repite no se contesta comentario por comentario: se contesta
            con una pieza.
          </div>
          <div className="como-se-lee" style={{ marginTop: 10 }}>
            <b>Cómo se lee:</b> el número es cuántas veces te lo pidieron tus seguidores, no cuánta gente
            te sigue. La barra muestra el peso de cada tema contra el que más te piden ({maxConsultas}).
          </div>
          {NICHO.temasQuePiden.map(t => {
            const enPlan = enElPlan.includes(t.t);
            return (
              <div key={t.t} className="guard"
                style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 8, paddingTop: 12, paddingBottom: 12 }}>
                <span className="row" style={{ gap: 8, width: '100%', flexWrap: 'wrap' }}>
                  <I_Trend size={14} style={{ color: 'var(--green)', flexShrink: 0 }} />
                  <span className="bt">{t.t}</span>
                  <Badge tone="green">{t.consultas} veces te lo pidieron</Badge>
                  {enPlan && <Badge tone="purple">en el plan</Badge>}
                </span>
                <span className="guard-lb" style={{ minWidth: 0 }}>
                  La lectura de tu audiencia
                  <small>{t.lectura}</small>
                </span>
                <BarRow valor={t.consultas} max={maxConsultas}
                  color={enPlan ? 'var(--purple2)' : 'var(--border2)'} formato={`${t.consultas}`} />
                <span className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                  {enPlan ? (
                    <Button variant="outline" className="btn-sm"
                      title={`«${t.t}» ya está en el plan: Nia escribe la pieza con las ${t.consultas} veces que te lo pidieron. Tocalo para sacarlo, queda solo como lectura. Reversible.`}
                      onClick={() => fueraDelPlan(t)}><I_Check size={12} /> Ya está en el plan</Button>
                  ) : (
                    <Button className="btn-sm"
                      title={`Nia escribe la pieza sobre «${t.t}»: queda marcada en el plan con las ${t.consultas} veces que te lo pidieron. Es la respuesta que tu audiencia ya está pidiendo.`}
                      onClick={() => alPlan(t)}><I_Plus size={12} /> Que Nia arme una pieza</Button>
                  )}
                  <Button variant="ghost" className="btn-sm"
                    title={`De dónde sale «${t.t}» y cuánto pesa sobre todo lo que te pide tu gente. No cambia nada.`}
                    onClick={() => verTema(t)}><I_Eye size={12} /> Ver de dónde sale</Button>
                </span>
              </div>
            );
          })}
          <div className="acc-why">
            El tema que más se repite es <b>«{NICHO.temasQuePiden.reduce((a, b) => (b.consultas > a.consultas ? b : a)).t}»</b>,
            con {maxConsultas} veces. Lo que entra al plan lo produce Nia y lo verifica el panel antes de
            publicarse: la pieza sale a tus redes con tu OK, igual que cualquier otra.
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Shield size={14} style={{ color: 'var(--purple3)' }} /> Las reglas de tu comunidad</span>}
          action={<Badge tone="purple">{reglas.length} reglas</Badge>}
        >
          <div className="bs" style={{ marginBottom: 6 }}>
            Salen de tu dial de autonomía y de tus guardrails: Rumi propone y vos mandás, lo personal lo
            contestás vos, y nada de lo que salió con tu nombre se toca sin vos. El nivel se cambia en
            Cuenta y autonomía, no acá.
          </div>
          {reglas.map(r => (
            <div key={r.titulo} className="guard">
              <span style={{ color: r.color, flexShrink: 0 }}>{r.icono}</span>
              <span className="guard-lb">{r.titulo}<small>{r.que}</small></span>
              <Badge tone={r.tono}>{r.nivel}</Badge>
              <Button variant="ghost" className="btn-sm"
                title={`${r.que} Cuántos comentarios de tu bandeja toca esta regla: ${r.cuantos} de ${total}. No cambia nada.`}
                onClick={() => verRegla(r)}>Ver</Button>
            </div>
          ))}

          <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <div className="dato" title="Tu mejor franja, escrita en tu Ficha: es cuando tu audiencia está con el celular.">
              <span className="dato-l">Tu ventana</span>
              <span className="dato-v" style={{ color: 'var(--green)' }}>{VENTANA}</span>
            </div>
            <div className="dato" title={`Los comentarios que esperan una respuesta tuya ahora mismo: fuera de tu ventana quedan en cola.`}>
              <span className="dato-l">En cola ahora</span>
              <span className="dato-v">{esperando}</span>
            </div>
            <div className="dato" title="De dónde salen estas respuestas: de lo que el equipo aprendió de tus piezas.">
              <span className="dato-l">Se escriben con tu tono</span>
              <span className="dato-v" style={{ color: 'var(--purple3)' }}>{FICHA_CREADOR.tono}</span>
            </div>
          </div>

          <div className="row" style={{ gap: 7, flexWrap: 'wrap', marginTop: 12 }}>
            <span className="tiny muted" style={{ flex: '1 1 220px', minWidth: 0 }}>
              Tu comunidad llega por estas redes:
            </span>
            {FICHA_CREADOR.redes.map(r => (
              <span key={r.red} className={`badge ${r.estado === 'conectada' ? 'badge-green' : 'badge-muted'}`}
                style={{ fontSize: 9.5 }}
                title={`${r.red} · ${r.usuario} · ${r.seguidores} seguidores · ${r.interaccion} de interacción · cuenta ${r.estado}`}>
                {r.red} · {r.seguidores}
              </span>
            ))}
          </div>

          <div className="row" style={{ gap: 9, marginTop: 14, flexWrap: 'wrap' }}>
            <Button className="btn-sm"
              title={`Abre las ${reglas.length} reglas con su nivel real, por qué están así y qué comentarios de tu bandeja toca cada una. No cambia nada.`}
              onClick={() => detalle({
                titulo: 'Las reglas de tu comunidad',
                sub: `${RUMI} escribe la respuesta y la decisión final es tuya. Estas son las reglas que ves en cada comentario, con su nivel del dial.`,
                bloques: [
                  { tipo: 'filas', items: reglas.map(r => ({
                    t: r.titulo, s: `${r.por} · toca ${r.cuantos} de ${total}`, etiqueta: r.nivel, tono: r.tono,
                  })) },
                  { tipo: 'datos', filas: [
                    { k: 'Acción del dial', v: `${REGLA_RESPUESTAS.accion}: ${NIVEL_TXT[REGLA_RESPUESTAS.nivel]}`, s: REGLA_RESPUESTAS.nota },
                    { k: 'Lo que ya salió', v: `${REGLA_BORRAR.accion}: ${NIVEL_TXT[REGLA_BORRAR.nivel]}`, s: REGLA_BORRAR.nota },
                    { k: 'Guardrail que lo refuerza', v: `${GUARD_PUBLICACION.nombre}: ${GUARD_PUBLICACION.valor}`, s: GUARD_PUBLICACION.porQue },
                    { k: 'Tu ventana', v: VENTANA, s: FICHA_CREADOR.mejorVentana },
                    { k: 'Cuándo no conviene', v: FICHA_CREADOR.peorVentana.split(':')[0], s: FICHA_CREADOR.peorVentana },
                  ] },
                  { tipo: 'texto', texto: `Con tu tono —${FICHA_CREADOR.tono.toLowerCase()}— y en tus redes: ${FICHA_CREADOR.redes.map(r => `${r.red} (${r.seguidores})`).join(' · ')}.` },
                ],
                fuente: 'Tu dial de autonomía, tus guardrails y tu Ficha de creador.',
              })}><I_Shield size={13} /> Ver las reglas juntas</Button>
          </div>

          <div className="acc-why">
            Ninguna de estas reglas se puede saltear desde acá: <b>Rumi propone y vos mandás</b>, lo personal
            queda para vos y nada de lo que salió con tu nombre se borra ni se cambia sin que lo hagas vos.
          </div>
        </Card>
      </div>
    </div>
  );
}

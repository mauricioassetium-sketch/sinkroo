import { useState, type ReactNode } from 'react';
import { Card, Badge, Button, Dinero, NotaMoneda, Avatar } from '../components/ui';
import { ViewHead } from '../components/viz';
import {
  I_Settings, I_Shield, I_Lock, I_Check, I_Clock, I_Edit, I_Eye, I_Refresh, I_Chat, I_Whatsapp,
  I_ArrowRight, I_User, I_Trend, I_Star, I_Camera, I_Globe, I_Film, I_File, I_Users, I_Zap,
} from '../components/icons';
import { useDetalle, type Bloque } from '../components/Detalle';
import { MODOS, type Modo } from '../data/demo';
import {
  AUTONOMIA_CREADOR, GUARDRAILS_CREADOR, FICHA_CREADOR, PERFILES_CREADOR, CARRILES, AGENTES_CREADOR,
  CANAL_AVISO, MENSAJES_CREADOR, NICHO, RITMO_SEMANA,
} from '../data/creador';

// =============================================================================================
// CUENTA Y AUTONOMÍA, EN PIEL DE CREADOR — la cuenta de quien vive de lo que graba.
//
// Arriba su Ficha (lo que el equipo necesita saber de ella), después el dial acción por acción,
// los guardrails que el motor trae puestos y el canal por el que aprueba sin entrar al panel.
//
// Es la misma pantalla de la cuenta de negocio, con otro idioma y otro orden de prioridades: acá
// el dinero que se mueve son sus créditos y sus deals, no el presupuesto de una empresa.
//
// Cada control hace algo que se ve: mover un nivel deja su línea con la hora y el nivel que venía,
// y cambiar un dato de la Ficha queda escrito en la fila, con la vuelta atrás a mano.
// =============================================================================================

const NOMBRE: Record<Modo, string> = { auto: 'Automático', shared: 'Compartido', manual: 'Manual' };

/** El comportamiento de cada nivel, tal como lo declara el motor (data/demo.ts). */
const DESC = Object.fromEntries(MODOS.map(m => [m.key, m.desc])) as Record<Modo, string>;

/** La hora real de cada cambio: es lo que hace que la línea de abajo no sea un texto fijo. */
const ahora = () => new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

/** La vigilancia del nicho: la única acción del dial que no tiene palanca. */
const FIJA = AUTONOMIA_CREADOR[0].accion;

/** El perfil declarado en la Ficha, con su carril: de ahí sale todo lo que el equipo produce. */
const perfilDe = (nombre: string) => PERFILES_CREADOR.find(p => p.nombre === nombre) ?? PERFILES_CREADOR[0];

/** Un importe escrito dentro de un texto del motor, con su «USD»: `≈ $3 de generación`. */
const MONTO = /\$\s?\d[\d.]*(?:,\d+)?/;

/**
 * Los textos que el motor ya trae escritos pasan por acá para que sus importes se lean como en el
 * resto del panel. En las filas compactas va sólo el monto en dólares (con el equivalente no entra)
 * y el equivalente completo aparece en el panel de detalle y al pie de la tarjeta, con la nota de
 * moneda.
 */
function ConDinero({ texto, equivalente = false }: { texto: string; equivalente?: boolean }) {
  const m = MONTO.exec(texto);
  if (!m) return <>{texto}</>;
  const i = texto.indexOf(m[0]);
  return (
    <>
      {texto.slice(0, i)}
      <Dinero monto={m[0]} equivalente={equivalente} />
      {texto.slice(i + m[0].length)}
    </>
  );
}

/** Una fila de la Ficha: lo que dice hoy, por qué se pide y quién lo usa. */
type Fila = {
  key: string;
  label: string;
  valor: string;
  porQue: string;
  /** De dónde salió el dato: se muestra en el panel, para que no quede un número sin origen. */
  fuente: string;
  /** El agente del equipo que trabaja con este dato. */
  agente: string;
  icono: ReactNode;
  /** Si tiene opciones, la fila se puede cambiar y el cambio queda a la vista. */
  opciones?: { v: string; d: string }[];
};

export function ViewCuentaCreador({ setToast, modo, setModo }: {
  setToast: (t: string) => void; modo: Modo; setModo: (m: Modo) => void;
}) {
  const detalle = useDetalle();

  // =============================================================================================
  // LO QUE ESTA PANTALLA CAMBIA — cada estado tiene su línea o su etiqueta a la vista, con la hora
  // del momento en que se produjo el cambio. Nada de acá vive en un aviso que se va solo.
  // =============================================================================================

  /** El nivel de cada una de las 7 acciones: arranca con el que trae la data de la piel. */
  const [niveles, setNiveles] = useState<Record<string, Modo>>(
    () => Object.fromEntries(AUTONOMIA_CREADOR.map(a => [a.accion, a.nivel])),
  );
  /** Lo que moviste en esta visita, con la hora y el nivel que la acción tenía antes. */
  const [movido, setMovido] = useState<Record<string, { hora: string; antes: Modo }>>({});
  /** Los movimientos de esta visita: es lo que abre «Ver el historial». */
  const [historial, setHistorial] = useState<{ hora: string; t: string; s: string }[]>([]);
  /** La hora en que cambió el nivel general: la línea de la pantalla la muestra, no una hora fija. */
  const [generalDesde, setGeneralDesde] = useState('');
  /** Los datos de la Ficha que se pueden cambiar, con lo escrito en cada uno. */
  const [ficha, setFicha] = useState({
    perfil: FICHA_CREADOR.perfil,
    nicho: FICHA_CREADOR.nicho,
    tono: FICHA_CREADOR.tono,
    tabues: FICHA_CREADOR.tabues,
    tiempo: FICHA_CREADOR.tiempoSemana,
    equipamiento: FICHA_CREADOR.equipamiento,
    formato: FICHA_CREADOR.formatoDominante,
  });
  /** Lo cambiado en la Ficha en esta visita: campo → la hora y lo que decía antes. */
  const [tocado, setTocado] = useState<Record<string, { hora: string; antes: string }>>({});
  /** El canal por el que llegan las decisiones: WhatsApp o Telegram. */
  const [canal, setCanal] = useState<'WhatsApp' | 'Telegram'>('WhatsApp');
  const [canalDesde, setCanalDesde] = useState('');

  const registrar = (t: string, s: string) => setHistorial(h => [...h, { hora: ahora(), t, s }]);

  const perfilActual = perfilDe(ficha.perfil);
  const carril = CARRILES[perfilActual.carril];

  // ---------------------------------------------------------------------------------------------
  // EL DIAL, ACCIÓN POR ACCIÓN — mover un nivel es lo que cambia la tarjeta y el encabezado.
  // ---------------------------------------------------------------------------------------------

  const mover = (accion: string, m: Modo) => {
    const antes = niveles[accion];
    if (antes === m) { setToast(`«${accion}» ya trabaja en ${NOMBRE[m]}`); return; }
    setNiveles(n => ({ ...n, [accion]: m }));
    setMovido(v => ({ ...v, [accion]: { hora: ahora(), antes } }));
    registrar(`«${accion}» pasa a ${NOMBRE[m]}`, `venía en ${NOMBRE[antes]}`);
    setToast(`«${accion}» ahora trabaja en ${NOMBRE[m]}: ${DESC[m]}`);
  };

  /** Devuelve una acción al nivel que tenía antes de moverla en esta visita. Reversible. */
  const volverAccion = (accion: string) => {
    const mv = movido[accion];
    if (!mv) return;
    setNiveles(n => ({ ...n, [accion]: mv.antes }));
    setMovido(v => { const c = { ...v }; delete c[accion]; return c; });
    registrar(`«${accion}» vuelve a ${NOMBRE[mv.antes]}`, `venía de ${NOMBRE[niveles[accion]]}`);
    setToast(`«${accion}» vuelve a ${NOMBRE[mv.antes]}: como estaba antes de que lo movieras`);
  };

  /** El nivel general: rige para lo que no tenga nivel propio. */
  const cambiarGeneral = (m: Modo) => {
    if (modo === m) { setToast(`El equipo ya viene trabajando en ${NOMBRE[m]} por defecto`); return; }
    registrar(`El nivel general del equipo pasa a ${NOMBRE[m]}`, `venía en ${NOMBRE[modo]}`);
    setModo(m);
    setGeneralDesde(ahora());
    setToast(`Nivel general en ${NOMBRE[m]}: ${DESC[m]}`);
  };

  /** Devuelve las 7 acciones al nivel con el que vienen y deja el historial de la visita. */
  const resetDial = () => {
    setNiveles(Object.fromEntries(AUTONOMIA_CREADOR.map(a => [a.accion, a.nivel])));
    setMovido({});
    registrar('Las 7 acciones vuelven a su nivel de siempre', 'el que trae el motor para tu perfil');
    setToast('El dial vuelve a como venía: las 7 acciones con el nivel de siempre');
  };

  /** «Volver a como venía» del encabezado: las acciones y el nivel general. */
  const resetTodo = () => {
    resetDial();
    if (modo !== 'shared') setModo('shared');
    setGeneralDesde('');
    setToast('Autonomía vuelta atrás: el equipo trabaja como venía');
  };

  // ---------------------------------------------------------------------------------------------
  // LA FICHA — los datos que alimentan todo lo que el equipo produce.
  // ---------------------------------------------------------------------------------------------

  const filas: Fila[] = [
    {
      key: 'perfil', label: 'Perfil y carril', icono: <I_User size={14} />,
      valor: `${perfilActual.nombre} · ${carril.nombre}`,
      porQue: 'Es la bifurcación de todo lo que hace el equipo: si persigue tu audiencia o las marcas, y con qué se mide tu mes.',
      fuente: 'Lo elegiste al entrar, con la primera pregunta: ¿ganás por tu audiencia o por tu trabajo?',
      agente: 'Rex',
      opciones: PERFILES_CREADOR.map(p => ({
        v: p.nombre,
        d: `${CARRILES[p.carril].nombre} · ${p.rolSinkroo} · gana por ${p.gana.toLowerCase()} · ${p.senales[0]}`,
      })),
    },
    {
      key: 'nicho', label: 'Nicho', icono: <I_Trend size={14} />,
      valor: ficha.nicho,
      porQue: 'Es lo que Lux vigila cada 15 minutos y el rubro de las marcas que te va a acercar.',
      fuente: 'Tus últimas 3 marcas y el formato de tus piezas: el perfil real coincide con lo declarado.',
      agente: 'Lux',
      opciones: [
        { v: FICHA_CREADOR.nicho, d: 'Tu nicho de siempre: es con el que el equipo ya viene trabajando.' },
        { v: 'UGC de bienestar y suplementos', d: 'Rubro donde ya tenés 2 piezas en el portafolio.' },
        { v: 'UGC de cosmética natural', d: 'Rubro de Verde Vivo, que te buscó para probar pauta.' },
      ],
    },
    {
      key: 'tono', label: 'Tono', icono: <I_Star size={14} />,
      valor: ficha.tono,
      porQue: 'Nia escribe los guiones, los hooks y los captions imitando tu voz: esto es lo que copia.',
      fuente: 'Sale de tus últimas piezas: así le hablás a cámara.',
      agente: 'Nia',
      opciones: [
        { v: FICHA_CREADOR.tono, d: 'Tu voz de siempre: la que el equipo ya tiene calibrada.' },
        { v: 'Cálido y explicativo', d: 'Para piezas que enseñan un paso a paso.' },
        { v: 'Sobrio y profesional', d: 'Para contenido de marca que pide tono institucional.' },
      ],
    },
    {
      key: 'tabues', label: 'Tabúes', icono: <I_Lock size={14} />,
      valor: ficha.tabues,
      porQue: 'Lo que el equipo nunca dice, nunca muestra y nunca promete en tu nombre, ni en un DM ni en una pieza.',
      fuente: 'Los pusiste vos en tus primeros pasos: valen para todo lo que el equipo escriba o publique.',
      agente: 'Rumi',
      opciones: [
        { v: FICHA_CREADOR.tabues, d: 'Tus tres límites de siempre.' },
        { v: 'No muestra su casa, no habla de política.', d: 'Sin el límite de resultados médicos: sirve para piezas no cosméticas.' },
        { v: 'No habla de política, no promete resultados médicos, no muestra a su familia.', d: 'Más cerrado: deja afuera lo que pase en su casa.' },
      ],
    },
    {
      key: 'tiempo', label: 'Tiempo por semana', icono: <I_Clock size={14} />,
      valor: ficha.tiempo,
      porQue: 'El plan del mes se arma con las horas que tenés de verdad: si no alcanzan, el equipo prioriza y te lo dice.',
      fuente: 'Lo declaraste al entrar y el equipo lo ajustó con los tiempos reales de tus entregas.',
      agente: 'Rex',
      opciones: [
        { v: FICHA_CREADOR.tiempoSemana, d: 'Tus horas de siempre: alcanza para 3 piezas y la respuesta de los DMs.' },
        { v: 'Poco: una hora por semana', d: 'El equipo se limita a una pieza y a los deals abiertos.' },
        { v: 'Bastante: todos los días un rato', d: 'Entra el calendario completo y las entregas de la semana.' },
      ],
    },
    {
      key: 'equipamiento', label: 'Equipamiento', icono: <I_Camera size={14} />,
      valor: ficha.equipamiento,
      porQue: 'Define qué formato te puede pedir el equipo sin que te falte algo para grabar.',
      fuente: 'Lo declaraste al entrar: es lo que el equipo mira antes de proponerte una idea.',
      agente: 'Nia',
      opciones: [
        { v: FICHA_CREADOR.equipamiento, d: 'Con esto grabás vertical, cara a cámara, con luz propia.' },
        { v: 'Celular solo', d: 'Sin aro de luz: las tomas dependen de la luz del lugar.' },
        { v: 'Celular + cámara y trípode', d: 'Habilita planos fijos y producto en mano sin temblor.' },
      ],
    },
    {
      key: 'redes', label: 'Redes y seguidores', icono: <I_Globe size={14} />,
      valor: `${FICHA_CREADOR.redes.join(' · ')} · ${FICHA_CREADOR.seguidores}`,
      porQue: `Es tu media kit: el ${FICHA_CREADOR.interaccion} de interacción es el número que usan las marcas para decidir.`,
      fuente: 'Sale de las cuentas que conectaste: el motor las lee cada 15 minutos junto con tus métricas.',
      agente: 'Sol',
    },
    {
      key: 'formato', label: 'Formato dominante', icono: <I_Film size={14} />,
      valor: ficha.formato,
      porQue: 'Los guiones y los hooks se escriben para ese formato: es el que tu público ya mira.',
      fuente: `Es el formato que copa tu feed: ${NICHO.formatosDelFeed[0].f} con ${NICHO.formatosDelFeed[0].pct}%.`,
      agente: 'Nia',
      opciones: NICHO.formatosDelFeed.map(f => ({
        v: f.f,
        d: `${f.pct}% del feed de tu nicho y de los que miran marcas del rubro.`,
      })),
    },
    {
      key: 'lectura', label: 'La lectura del perfil real', icono: <I_Eye size={14} />,
      valor: FICHA_CREADOR.lecturaDelPerfil,
      porQue: 'No sale de lo que declaraste: sale de lo que el motor leyó en tu perfil. Es lo que decide qué marcas te acerca.',
      fuente: 'Lectura del motor sobre tus últimas piezas, tus marcas y tus métricas.',
      agente: 'Sol',
    },
    {
      key: 'portafolio', label: 'Portafolio', icono: <I_File size={14} />,
      valor: FICHA_CREADOR.portafolio,
      porQue: 'Es lo que Rumi manda en cada pitch: sin portafolio, una marca no tiene con qué compararte.',
      fuente: 'Las piezas que subiste con permiso de uso de la marca.',
      agente: 'Rumi',
    },
    {
      key: 'marcas', label: 'Marcas trabajadas', icono: <I_Users size={14} />,
      valor: FICHA_CREADOR.marcasTrabajadas.join(' · '),
      porQue: 'Una marca que ya te pagó una vez pesa más en el pitch que diez contactos fríos.',
      fuente: 'Tus deal cerrados y entregados, con la pieza que hizo cada una.',
      agente: 'Rumi',
    },
    {
      key: 'respuesta', label: 'Tiempo de respuesta', icono: <I_Clock size={14} />,
      valor: 'Contesta en menos de 24 h',
      porQue: 'Es lo primero que mira una marca: si tardás, elige a otro. El equipo te avisa cuando un DM lleva medio día sin respuesta.',
      fuente: 'Sale de tus conversaciones: es el promedio de lo que tardás en contestar un DM de marca.',
      agente: 'Rumi',
    },
  ];

  const valorDe = (campo: string) => filas.find(f => f.key === campo)?.valor ?? '';

  const aplicarFicha = (campo: string, valor: string) => {
    const antes = valorDe(campo);
    if (antes === valor) { setToast(`«${filas.find(f => f.key === campo)?.label}» ya estaba así`); return; }
    setFicha(f => ({ ...f, [campo]: valor }));
    setTocado(t => ({ ...t, [campo]: { hora: ahora(), antes } }));
    setToast(`«${filas.find(f => f.key === campo)?.label}» ahora dice «${valor}»: el equipo trabaja con eso desde la próxima vuelta`);
  };

  /** Vuelve un dato de la Ficha a lo que decía antes. Reversible desde la misma fila. */
  const volverFicha = (campo: string) => {
    const t = tocado[campo];
    if (!t) return;
    setFicha(f => ({ ...f, [campo]: t.antes }));
    setTocado(x => { const c = { ...x }; delete c[campo]; return c; });
    setToast(`«${filas.find(f => f.key === campo)?.label}» vuelve a «${t.antes}»`);
  };

  const resetFicha = () => {
    setFicha({
      perfil: FICHA_CREADOR.perfil, nicho: FICHA_CREADOR.nicho, tono: FICHA_CREADOR.tono,
      tabues: FICHA_CREADOR.tabues, tiempo: FICHA_CREADOR.tiempoSemana,
      equipamiento: FICHA_CREADOR.equipamiento, formato: FICHA_CREADOR.formatoDominante,
    });
    setTocado({});
    setToast('Tu Ficha vuelve a como venía: el equipo trabaja otra vez con tus datos originales');
  };

  // ---------------------------------------------------------------------------------------------
  // LOS PANELES DE DETALLE — el dato real de cada cosa, en el mismo lugar para todos los botones.
  // ---------------------------------------------------------------------------------------------

  /** «La vigilancia no se puede bajar»: el por qué, con lo último que encontró en el nicho. */
  const abrirFija = () => detalle({
    titulo: 'La vigilancia del nicho no se puede bajar',
    sub: `${AUTONOMIA_CREADOR[0].nota} Es la única acción del dial que no tiene palanca.`,
    bloques: [
      { tipo: 'datos', filas: [
        { k: 'Cada cuánto mira', v: 'cada 15 minutos', s: RITMO_SEMANA.latidoMotor },
        { k: 'Qué mira', v: 'Tu nicho, tus métricas y tus conversaciones', s: 'de ahí salen las propuestas de Lux, Rex y Sol' },
        { k: 'Lo que cuesta', v: 'nada', s: 'no gasta créditos: sólo lee' },
        { k: 'Lo último que encontró', v: `${NICHO.trends.length} formatos`, s: NICHO.trends.map(t => `${t.t} (${t.num})`).join(' · ') },
        { k: 'Precio por pieza en tu nivel', v: NICHO.precioPorPieza[1].rango, s: NICHO.precioPorPieza[1].nota },
      ] },
      { tipo: 'aviso', texto: 'Si la vigilancia se pudiera apagar, el equipo dejaría de enterarse de qué se mueve en tu nicho y el resto del dial trabajaría a ciegas: sin eso no hay propuesta que valga. Todo lo demás sí lo decidís vos, acción por acción.' },
    ],
    fuente: 'Sale del ritmo real del motor y de lo último que encontró en tu nicho.',
    acciones: [
      { label: 'Entendido', variante: 'primary', title: 'Cierra este panel: la vigilancia sigue como está', onClick: () => setToast('La vigilancia sigue activa: es lo que mantiene al equipo al día con tu nicho') },
    ],
  });

  /** «Ver el historial»: lo que moviste en esta visita, con la hora y con qué nivel quedó cada cosa. */
  const abrirHistorial = () => {
    const propios = AUTONOMIA_CREADOR.filter(a => (niveles[a.accion] ?? a.nivel) !== 'auto');
    const bloques: Bloque[] = [
      historial.length > 0
        ? { tipo: 'filas', items: historial.slice().reverse().map(h => ({ t: h.t, s: h.s, etiqueta: h.hora, tono: 'purple' as const })) }
        : { tipo: 'texto', texto: 'Todavía no moviste nada en esta visita: el equipo viene trabajando como lo dejaste la última vez. En cuanto muevas un nivel o un dato de tu Ficha, el cambio queda acá con la hora.' },
      { tipo: 'datos', filas: [
        { k: 'Nivel general del equipo', v: NOMBRE[modo], s: 'rige para lo que no tenga nivel propio' },
        { k: 'Acciones en Automático', v: `${autos} de ${AUTONOMIA_CREADOR.length}`, s: 'las que el equipo hace y te cuenta en la bitácora' },
        { k: 'Acciones que te esperan', v: `${AUTONOMIA_CREADOR.length - autos} de ${AUTONOMIA_CREADOR.length}`, s: 'compartidas y manuales: no salen sin tu OK' },
        { k: 'Acciones sin palanca', v: '1', s: 'la vigilancia del nicho: es la que mantiene al equipo despierto' },
        { k: 'Frenos que valen siempre', v: String(GUARDRAILS_CREADOR.length), s: 'no dependen del dial: valen también en Automático' },
      ] },
      { tipo: 'filas', items: AUTONOMIA_CREADOR.map(a => {
        const n = niveles[a.accion] ?? a.nivel;
        return { t: a.accion, s: a.nota, etiqueta: NOMBRE[n], tono: (n === 'auto' ? 'green' : n === 'shared' ? 'purple' : 'amber') as 'green' | 'purple' | 'amber' };
      }) },
      { tipo: 'aviso', texto: 'Cambiar un nivel no borra nada de lo que el equipo ya hizo: la bitácora queda completa. Y la vigilancia del nicho sigue prendida: es lo que hace que el equipo nunca esté quieto.' },
    ];
    detalle({
      titulo: 'Historial de autonomía',
      sub: 'Lo que moviste en esta visita, con la hora, y con qué nivel viene trabajando cada acción.',
      bloques,
      fuente: 'Sale de esta misma pantalla: las 7 acciones de tu cuenta y los 7 frenos que tenés hoy. Se actualiza en cuanto cambiás algo.',
      acciones: propios.length > 0
        ? [{ label: 'Volver a como venía', variante: 'primary', title: 'Devuelve las 7 acciones al nivel con el que vienen. Reversible: lo volvés a mover cuando quieras.', onClick: resetTodo }]
        : [{ label: 'Cerrar', title: 'Cierra el panel sin cambiar nada', onClick: () => {} }],
    });
  };

  /** «Cambiar» de una fila de la Ficha: las opciones, con lo que implica cada una. */
  const abrirCambioFicha = (f: Fila) => detalle({
    titulo: `Cambiar ${f.label.toLowerCase()}`,
    sub: `${f.porQue} Elegí con qué trabaja el equipo: el cambio queda escrito en tu Ficha y se puede volver atrás desde la misma fila.`,
    bloques: [
      { tipo: 'datos', filas: [{ k: 'Hoy dice', v: f.valor, s: 'es con lo que el equipo trabaja ahora' }] },
      { tipo: 'filas', items: (f.opciones ?? []).map(o => ({
        t: o.v,
        s: o.v === f.valor ? 'el que está puesto hoy' : o.d,
        etiqueta: o.v === f.valor ? 'en uso' : 'elegir',
        tono: (o.v === f.valor ? 'green' : 'muted') as 'green' | 'muted',
      })) },
      { tipo: 'texto', texto: `Cambiar esto no toca nada de lo que el equipo ya hizo: se aplica desde la próxima vuelta. ${agenteTexto(f.agente)}` },
      { tipo: 'aviso', texto: 'Es reversible: después de elegir, en la misma fila de tu Ficha te queda el botón para volver a lo de antes.' },
    ],
    fuente: f.fuente,
    acciones: [
      ...(f.opciones ?? []).filter(o => o.v !== f.valor).map(o => ({
        label: o.v, title: `Deja «${f.label}» en «${o.v}» y el cambio se ve en tu Ficha al instante. Reversible.`,
        onClick: () => aplicarFicha(f.key, o.v),
      })),
      { label: 'Dejarlo como está', title: 'Cierra el panel sin cambiar nada', onClick: () => setToast(`«${f.label}» queda como está`) },
    ],
  });

  /** «Ver» de una fila que el equipo deduce solo: de dónde salió y qué hace con eso. */
  const abrirFichaInfo = (f: Fila) => detalle({
    titulo: f.label,
    sub: f.valor,
    bloques: [
      { tipo: 'datos', filas: [
        { k: 'Hoy dice', v: f.valor },
        { k: 'Por qué se pide', v: f.porQue },
        { k: 'De dónde sale', v: f.fuente },
        { k: 'Quién lo usa', v: agenteTexto(f.agente) },
        { k: 'Se puede cambiar', v: 'No: lo sostiene el motor', s: 'sale de lo que el sistema ya vio, no de lo que se declara' },
      ] },
      { tipo: 'aviso', texto: 'Los datos que el equipo deduce solo no se editan: son la lectura de tu perfil real. Lo que sí decidís vos es con qué se queda y cómo trabaja, acción por acción.' },
    ],
    fuente: f.fuente,
    acciones: [{ label: 'Cerrar', title: 'Cierra el panel sin cambiar nada', onClick: () => {} }],
  });

  /** La Ficha entera: qué cambió hoy y con qué está trabajando el equipo ahora. */
  const abrirFicha = () => detalle({
    titulo: 'Tu Ficha de creador',
    sub: 'Es la cuenta del motor, extendida: todo lo que el equipo produce sale de acá.',
    bloques: [
      { tipo: 'datos', filas: [
        { k: 'Perfil', v: perfilActual.nombre, s: carril.nombre },
        { k: 'Carril', v: carril.nombre, s: carril.promesa },
        { k: 'Se mide por', v: carril.kpi.join(' · ') },
        { k: 'Nicho', v: ficha.nicho },
        { k: 'Formato dominante', v: ficha.formato },
        { k: 'Redes', v: `${FICHA_CREADOR.redes.join(' · ')}`, s: `${FICHA_CREADOR.seguidores} · ${FICHA_CREADOR.interaccion} de interacción` },
        { k: 'Cambios de hoy', v: String(Object.keys(tocado).length), s: 'cada uno se revierte desde su fila' },
      ] },
      { tipo: 'filas', items: filas.map(f => ({
        t: f.label, s: f.valor, etiqueta: tocado[f.key] ? `cambiado ${tocado[f.key].hora}` : 'como venía',
        tono: (tocado[f.key] ? 'amber' : 'muted') as 'amber' | 'muted',
      })) },
      { tipo: 'aviso', texto: 'Con la Ficha al día, el equipo no te vuelve a preguntar lo mismo: es lo que hace que las propuestas lleguen listas para aprobar y no a medio escribir.' },
    ],
    fuente: 'Sale de tu Ficha de creador tal como está ahora, con los cambios que hiciste en esta visita.',
    acciones: Object.keys(tocado).length > 0
      ? [{ label: 'Volver todo a como venía', variante: 'primary', title: 'Devuelve los 7 datos cambiados a lo que decían antes. Reversible: los volvés a cambiar cuando quieras.', onClick: resetFicha }]
      : [{ label: 'Cerrar', title: 'Cierra el panel sin cambiar nada', onClick: () => {} }],
  });

  /** «Cómo te protegen»: los 7 frenos con su valor real y a qué acción del dial tocan. */
  const abrirGuardrails = () => detalle({
    titulo: 'Los guardrails de tu cuenta',
    sub: 'No los elegís vos: vienen puestos por el motor y valen siempre, también cuando el equipo trabaja solo.',
    bloques: [
      { tipo: 'filas', items: GUARDRAILS_CREADOR.map(g => ({
        t: g.nombre, s: `${g.porQue} · Hoy: ${g.valor}`, etiqueta: 'activo', tono: 'green' as const,
      })) },
      { tipo: 'datos', filas: [
        { k: 'Techo diario de generación', v: GUARDRAILS_CREADOR[0].valor, s: 'una idea cara no se quema los créditos de tu semana' },
        { k: 'Cobros que te esperan', v: 'Deals o cobros de más de $200', s: 'los rates y los links de cobro son tuyos: ningún cobro sale sin que lo mandes vos' },
        { k: 'Ventana de silencio', v: GUARDRAILS_CREADOR[5].valor, s: 'una marca no recibe un pitch tuyo a las 3 de la mañana' },
        { k: 'Publicar', v: GUARDRAILS_CREADOR[4].valor, s: 'sin verificación no se publica ni se pacta a tu nombre' },
      ] },
      { tipo: 'texto', texto: 'Un ejemplo con plata: un deal grande no se cierra solo, te espera. Y si el equipo se equivoca en un dígito, el freno lo agarra antes de que se convierta en un cobro. Lo que ya ves en la pantalla está en dólares, con su equivalente al lado.' },
      { tipo: 'aviso', tono: 'amber', texto: 'Estos frenos son los que te dejan tener el dial en Automático sin estar mirando el panel. Si se pudieran apagar, trabajar sin mirar no sería una opción.' },
    ],
    fuente: 'Sale de los guardrails que el motor aplica a tu cuenta, con su valor de hoy.',
    acciones: [
      { label: 'Ver mi dial', variante: 'primary', title: 'Cierra el panel y te deja en el dial, acción por acción', onClick: () => setToast('El dial está arriba: cada acción con su nivel') },
    ],
  });

  /** «Tu verificación»: por qué es obligatoria antes de publicar y en qué estado está. */
  const abrirVerificacion = () => detalle({
    titulo: 'Tu verificación (KYC)',
    sub: 'Es la que habilita publicar y cerrar deals a tu nombre. Sin ella, el equipo prepara todo pero no lo saca.',
    bloques: [
      { tipo: 'datos', filas: [
        { k: 'Estado', v: 'Pendiente', s: 'la hacés una sola vez, con la cámara, en el momento', tono: 'amber' },
        { k: 'Qué desbloquea', v: 'Publicar en tus redes y cerrar deals', s: 'con tu autonomía, publicar y cobrar te esperan igual: la verificación va antes' },
        { k: 'Por qué es obligatoria', v: GUARDRAILS_CREADOR[4].valor, s: GUARDRAILS_CREADOR[4].porQue },
        { k: 'Qué se pide', v: '3 pasos con la cámara', s: 'documento, comprobante de domicilio y selfie' },
      ] },
      { tipo: 'pasos', items: [
        'Sacás las fotos con la cámara, en el momento: no se suben archivos.',
        'Se comparan entre sí y con tu selfie.',
        'Cuando queda aprobada, el equipo puede publicar y cerrar deals en tu nombre.',
      ] },
      { tipo: 'aviso', tono: 'amber', texto: 'Mientras esté pendiente, el equipo sigue trabajando en todo lo que no toca publicar ni cobrar: mira tu nicho, escribe los guiones, contesta los DMs y arma los pitches para que los mandes vos.' },
    ],
    fuente: 'Sale del estado de tu verificación y del guardrail que la hace obligatoria para publicar.',
    acciones: [{ label: 'Entendido', title: 'Cierra este panel: tu verificación sigue pendiente', onClick: () => setToast('Tu verificación sigue pendiente: el equipo no publica ni cierra deals hasta que esté aprobada') }],
  });

  /** «Ver cómo llega una aprobación»: el canal, paso por paso, con un DM real de la bandeja. */
  const abrirCanal = () => {
    const dm = MENSAJES_CREADOR[0];
    detalle({
      titulo: `Cómo te llega una decisión por ${canal}`,
      sub: CANAL_AVISO.texto,
      bloques: [
        { tipo: 'pasos', items: [
          `El equipo se topa con algo que necesita tu OK y te escribe a ${canal}.`,
          'El mensaje llega con la propuesta ya escrita y el motivo: no tenés que abrir nada.',
          'Respondés desde el chat: lo aprobás, lo ajustás o lo dejás para después.',
          'Si no respondés cerca del horario ideal, se reprograma y te avisa. Nunca ejecuta sin tu sí.',
        ] },
        { tipo: 'datos', filas: [
          { k: 'Quién escribe', v: dm.de, s: dm.tipo === 'marca' ? 'marca del nicho' : 'seguidor' },
          { k: 'Qué pide', v: dm.texto },
          { k: 'Lo que propone Rumi', v: dm.propuesta ?? 'La respuesta, lista para mandar', s: 'vos la podés cambiar antes de que salga' },
          { k: 'Estado', v: dm.estado, s: 'es lo que ves en el chat y también en Mensajes', tono: 'amber' },
          { k: 'Por dónde te llega', v: canal, s: 'se cambia desde esta pantalla cuando quieras' },
        ] },
        { tipo: 'texto', texto: `Lo que no te llega por ${canal} es nada de una marca entre las 22:00 y las 08:00: ese guardrail vale para todo el equipo, también cuando trabaja solo.` },
        { tipo: 'aviso', texto: 'El panel es para ver el detalle cuando querés: aprobar no depende de entrar acá. Todo lo que apruebas desde el chat queda después en la bitácora.' },
      ],
      fuente: 'Sale del canal que tenés elegido y de un mensaje real de tu bandeja, con la respuesta que Rumi dejó lista.',
      acciones: [
        { label: `Marcar ${canal === 'WhatsApp' ? 'Telegram' : 'WhatsApp'}`, title: 'Cambia el canal por el que te llegan las decisiones. Reversible: se cambia de nuevo desde esta pantalla.', onClick: () => cambiarCanal(canal === 'WhatsApp' ? 'Telegram' : 'WhatsApp') },
      ],
    });
  };

  const cambiarCanal = (c: 'WhatsApp' | 'Telegram') => {
    if (canal === c) { setToast(`Las decisiones ya te llegan por ${c}`); return; }
    registrar(`Las decisiones pasan a llegarte por ${c}`, `venían por ${canal}`);
    setCanal(c);
    setCanalDesde(ahora());
    setToast(`Listo: las próximas decisiones que esperan tu OK te llegan por ${c}`);
  };

  /** El rol real del agente que trabaja con un dato de la Ficha. */
  const agenteTexto = (nombre: string) => {
    const a = AGENTES_CREADOR.find(x => x.nombre === nombre);
    return a ? `${a.nombre}: ${a.enCreadores}` : 'El equipo';
  };

  // ---------------------------------------------------------------------------------------------
  // LOS NÚMEROS DEL ENCABEZADO — todos salen de la data y del estado de esta pantalla.
  // ---------------------------------------------------------------------------------------------

  const autos = AUTONOMIA_CREADOR.filter(a => (niveles[a.accion] ?? a.nivel) === 'auto').length;
  const esperan = AUTONOMIA_CREADOR.length - autos;

  return (
    <div className="dash">
      <ViewHead
        icon={<I_Settings size={19} />}
        titulo="Cuenta y autonomía"
        sub="El dial por acción, los guardrails y tu Ficha de creador. Se cambia cuando quieras, sin perder nada."
        nums={[
          { v: NOMBRE[modo], l: 'modo de autonomía', c: 'var(--purple3)' },
          { v: `${autos}/${AUTONOMIA_CREADOR.length}`, l: 'acciones automáticas' },
          { v: String(GUARDRAILS_CREADOR.length), l: 'frenos activos', c: 'var(--green)' },
          { v: 'Pendiente', l: 'verificación (KYC)', c: 'var(--amber)' },
        ]}
      />

      {/* ================= TU FICHA DE CREADOR ================= */}
      <div className="csec" style={{ marginTop: 0 }}>
        <span className="csec-n">📋</span>
        <span className="csec-t">Tu Ficha de creador</span>
        <span className="csec-s">Lo que el equipo necesita saber de vos: de acá sale todo lo que produce</span>
      </div>
      <Card
        title={<span className="row" style={{ gap: 8 }}><I_User size={14} style={{ color: 'var(--purple3)' }} /> {FICHA_CREADOR.nombre} · {FICHA_CREADOR.usuario}</span>}
        action={<Badge tone="purple">{perfilActual.nombre}</Badge>}
      >
        <div className="row spread" style={{ gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
          <span className="row" style={{ gap: 11 }}>
            <Avatar name={FICHA_CREADOR.nombre} size={42} tone={4} />
            <span>
              <span className="bt" style={{ display: 'block' }}>{FICHA_CREADOR.pais} · {FICHA_CREADOR.idioma} · {FICHA_CREADOR.registro}</span>
              <span className="tiny muted">{FICHA_CREADOR.redes.join(' · ')} · {FICHA_CREADOR.seguidores} · {FICHA_CREADOR.interaccion} de interacción</span>
            </span>
          </span>
          <span className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            <Badge tone="green">{carril.nombre}</Badge>
            <Badge tone="muted">{FICHA_CREADOR.interaccion} de interacción</Badge>
          </span>
        </div>

        <div className="onb-infiere" style={{ marginTop: 0 }}>
          <span className="onb-infiere-ic"><I_Zap size={13} /></span>
          <span><b>{carril.promesa}</b> {carril.queHace}</span>
        </div>

        <div className="row" style={{ gap: 6, flexWrap: 'wrap', margin: '10px 0 14px' }}>
          {carril.kpi.map(k => <span key={k} className="badge badge-purple" style={{ fontSize: 9.5 }}>{k}</span>)}
        </div>

        <div className="exc">
          {filas.map(f => {
            const t = tocado[f.key];
            return (
              <div key={f.key} className="exc-row">
                <div className="exc-top">
                  <span className="row" style={{ gap: 8, flex: 1, minWidth: 190 }}>
                    <span style={{ color: 'var(--purple3)', flexShrink: 0 }}>{f.icono}</span>
                    <span className="exc-lb" style={{ minWidth: 0 }}>{f.label}</span>
                  </span>
                  {f.opciones ? (
                    <Button variant="ghost" className="btn-sm"
                      title={`Abre las opciones de ${f.label.toLowerCase()} y deja el cambio a la vista en tu Ficha. Reversible: después volvés a lo de antes desde esta misma fila.`}
                      onClick={() => abrirCambioFicha(f)}><I_Edit size={12} /> Cambiar</Button>
                  ) : (
                    <Button variant="ghost" className="btn-sm"
                      title={`Te muestra de dónde salió «${f.label}» y qué hace el equipo con eso. No cambia nada.`}
                      onClick={() => abrirFichaInfo(f)}><I_Eye size={12} /> Ver</Button>
                  )}
                </div>
                <div className="bt" style={{ fontWeight: 700 }}>{f.valor}</div>
                <div className="exc-nota"><b style={{ color: 'var(--muted)' }}>Por qué se pide:</b> {f.porQue}</div>
                {t && (
                  <div className="tiny row" style={{ gap: 8, color: 'var(--amber)', fontWeight: 700, flexWrap: 'wrap', alignItems: 'center' }}>
                    <I_Clock size={13} /> Cambiado hoy {t.hora}: venía «{t.antes}».
                    <Button variant="ghost" className="btn-sm"
                      title={`Devuelve «${f.label}» a «${t.antes}»: el equipo trabaja otra vez con lo de antes. Reversible las veces que quieras.`}
                      onClick={() => volverFicha(f.key)}><I_Refresh size={12} /> Volver a «{t.antes}»</Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="row" style={{ gap: 9, marginTop: 14, flexWrap: 'wrap' }}>
          <Button className="btn-sm" title="Abre tu Ficha completa: con qué está trabajando el equipo ahora y qué cambiaste hoy."
            onClick={abrirFicha}><I_Eye size={13} /> Ver mi Ficha completa</Button>
          {(Object.keys(tocado).length > 0) && (
            <Button variant="outline" className="btn-sm"
              title="Devuelve los datos que cambiaste hoy a lo que decían antes. Reversible: los volvés a cambiar cuando quieras."
              onClick={resetFicha}><I_Refresh size={13} /> Volver todo a como venía</Button>
          )}
        </div>
        {Object.keys(tocado).length > 0 && (
          <div className="tiny" style={{ marginTop: 11, color: 'var(--amber)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7 }}>
            <I_Clock size={13} /> Cambiaste {Object.keys(tocado).length === 1 ? 'un dato' : `${Object.keys(tocado).length} datos`} de tu Ficha hoy: el equipo trabaja con lo nuevo desde la próxima vuelta, y cada cambio se revierte desde su fila.
          </div>
        )}
        <div className="acc-why">
          La Ficha es lo que hace que las propuestas lleguen listas: <b>nicho, carril, tono y tabúes</b> son de dónde
          sale cada guion, cada pitch y cada respuesta que el equipo te deja para aprobar.
        </div>
      </Card>

      {/* ================= EL DIAL, ACCIÓN POR ACCIÓN ================= */}
      <div className="csec">
        <span className="csec-n">★</span>
        <span className="csec-t">El dial, acción por acción</span>
        <span className="csec-s">Siete acciones, siete niveles: cada una se cambia sola y el cambio se ve al instante</span>
      </div>
      <Card
        title={<span className="row" style={{ gap: 8 }}><I_Settings size={14} style={{ color: 'var(--purple3)' }} /> Cuánto decide el equipo en cada cosa</span>}
        action={<Badge tone={autos ? 'purple' : 'green'}>{autos} automáticas · {esperan} te esperan</Badge>}
      >
        <div className="row spread" style={{ gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <span className="bs" style={{ maxWidth: 430 }}>
            <b>Nivel general del equipo.</b> Es el que rige cuando una acción no tiene el suyo: las siete de
            abajo lo tienen puesto, así que hoy vale para lo que el equipo haga por primera vez.
          </span>
          <div className="seg-group">
            {(['auto', 'shared', 'manual'] as Modo[]).map(m => (
              <span key={m} className={`seg ${modo === m ? 'on' : ''}`}
                title={`Nivel general en ${NOMBRE[m]}: ${DESC[m]} Reversible: se cambia de nuevo acá.`}
                onClick={() => cambiarGeneral(m)}>{NOMBRE[m]}</span>
            ))}
          </div>
        </div>
        {generalDesde && (
          <div className="tiny" style={{ color: 'var(--purple3)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
            <I_Check size={13} /> El nivel general pasó a {NOMBRE[modo]} a las {generalDesde}: las acciones sin nivel propio lo siguen.
          </div>
        )}

        <div className="exc">
          {AUTONOMIA_CREADOR.map(a => {
            const n = niveles[a.accion] ?? a.nivel;
            const fija = a.accion === FIJA;
            const mv = movido[a.accion];
            return (
              <div key={a.accion} className="exc-row">
                <div className="exc-top">
                  <span className="exc-lb">{a.accion}</span>
                  {fija && <span className="exc-fijo">no se puede bajar</span>}
                  <div className="seg-group">
                    {(['auto', 'shared', 'manual'] as Modo[]).map(m => (
                      <span key={m} className={`seg ${n === m ? 'on' : ''} ${fija && m !== 'auto' ? 'locked' : ''}`}
                        title={fija
                          ? 'La vigilancia del nicho es automática y no se puede bajar: tocá para ver por qué y qué encontró.'
                          : `Poner «${a.accion}» en ${NOMBRE[m]}: ${DESC[m]} Reversible: lo cambiás de nuevo acá cuando quieras.`}
                        onClick={() => (fija ? abrirFija() : mover(a.accion, m))}>{NOMBRE[m]}</span>
                    ))}
                  </div>
                </div>
                <div className="exc-nota">{a.nota}</div>
                <div className="tiny muted">
                  En <b style={{ color: 'var(--purple3)' }}>{NOMBRE[n]}</b>: {DESC[n]}
                </div>
                {mv && (
                  <div className="tiny row" style={{ gap: 8, color: 'var(--amber)', fontWeight: 700, flexWrap: 'wrap', alignItems: 'center' }}>
                    <I_Clock size={13} /> Cambiado hoy {mv.hora}: venía en {NOMBRE[mv.antes]}.
                    <Button variant="ghost" className="btn-sm"
                      title={`Devuelve esta acción a ${NOMBRE[mv.antes]}, como estaba antes de que la movieras. Reversible.`}
                      onClick={() => volverAccion(a.accion)}><I_Refresh size={12} /> Volver a {NOMBRE[mv.antes]}</Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="row" style={{ gap: 9, marginTop: 14, flexWrap: 'wrap' }}>
          <Button className="btn-sm" title="Abre lo que moviste en esta visita, con la hora, y con qué nivel viene trabajando cada acción hoy."
            onClick={abrirHistorial}><I_Eye size={13} /> Ver el historial</Button>
          <Button variant="outline" className="btn-sm"
            title="Devuelve las 7 acciones al nivel con el que vienen. Reversible: las volvés a mover cuando quieras."
            onClick={resetDial}><I_Refresh size={13} /> Volver a como venía</Button>
        </div>
        {historial.length > 0 && (
          <div className="tiny" style={{ marginTop: 11, color: 'var(--purple3)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7 }}>
            <I_Clock size={13} /> En esta visita moviste {historial.length === 1 ? 'una cosa' : `${historial.length} cosas`}: el historial las tiene con la hora y el nivel que tenían antes (la última: {historial[historial.length - 1].hora}).
          </div>
        )}
        <div className="acc-why">
          No es una sola palanca: <b>publicar, responder y cobrar tienen su propio nivel</b>. Frenar algo que se quema
          va en Automático aunque todo lo demás te pregunte, porque una serie que no rinde no puede esperarte.
        </div>
      </Card>

      {/* ================= LOS GUARDRAILS ================= */}
      <div className="csec">
        <span className="csec-n">🛡</span>
        <span className="csec-t">Los guardrails</span>
        <span className="csec-s">Vienen puestos por el motor: son los que te dejan trabajar tranquilo</span>
      </div>
      <Card
        title={<span className="row" style={{ gap: 8 }}><I_Shield size={14} style={{ color: 'var(--green)' }} /> Lo que el motor no negocia</span>}
        action={<Badge tone="green">siempre activos</Badge>}
      >
        <div className="bs" style={{ marginBottom: 12 }}>
          No los elegís vos: el motor los aplica a tu cuenta y valen también cuando el equipo trabaja solo.
          Protegen tu plata, tu nombre y tus marcas.
        </div>
        <div className="guards">
          {GUARDRAILS_CREADOR.map(g => (
            <div key={g.nombre} className="guard">
              <I_Lock size={14} style={{ color: 'var(--purple3)', flexShrink: 0 }} />
              <span className="guard-lb"><ConDinero texto={g.nombre} /><small>{g.porQue}</small></span>
              <span className="guard-val"><ConDinero texto={g.valor} /></span>
            </div>
          ))}
        </div>

        <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
          <div className="dato"><span className="dato-l">Frenos activos</span><span className="dato-v" style={{ color: 'var(--green)' }}>{GUARDRAILS_CREADOR.length}</span></div>
          <div className="dato"><span className="dato-l">Acciones que te esperan</span><span className="dato-v">{esperan} de {AUTONOMIA_CREADOR.length}</span></div>
          <div className="dato"><span className="dato-l">Cobros de más de</span><span className="dato-v" style={{ color: 'var(--amber)' }}><Dinero monto={200} /></span></div>
        </div>

        <div className="bs" style={{ marginTop: 11 }}>
          Un cobro de más de <Dinero monto={200} /> pide tu OK: es el freno que hace que un error de un dígito
          no se convierta en un cobro. Y entre las 22:00 y las 08:00 no le llega nada a una marca, ni un pitch.
        </div>
        <NotaMoneda />
        <div className="row" style={{ gap: 9, marginTop: 12, flexWrap: 'wrap' }}>
          <Button variant="outline" className="btn-sm"
            title="Abre los 7 guardrails con su valor real, por qué están y a qué acción del dial tocan. No cambia nada."
            onClick={abrirGuardrails}><I_Eye size={13} /> Cómo te protegen</Button>
          <Button variant="ghost" className="btn-sm"
            title="Te muestra en qué estado está tu verificación, por qué es obligatoria antes de publicar y qué queda apagado mientras tanto."
            onClick={abrirVerificacion}><I_Shield size={13} /> Tu verificación</Button>
        </div>
        <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <Badge tone="green">La autonomía es un techo, no un piso</Badge>
          <Badge tone="purple">El equipo puede pedirte más control, nunca tomarlo</Badge>
        </div>
      </Card>

      {/* ================= EL CANAL DE AVISO ================= */}
      <div className="csec">
        <span className="csec-n">💬</span>
        <span className="csec-t">El canal de aviso</span>
        <span className="csec-s">Aprobás desde el chat: el panel es para ver el detalle cuando querés</span>
      </div>
      <Card
        title={<span className="row" style={{ gap: 8 }}><I_Whatsapp size={14} style={{ color: 'var(--green)' }} /> {CANAL_AVISO.titulo}</span>}
        action={<Badge tone="green">{canal}</Badge>}
      >
        <div className="bs">{CANAL_AVISO.texto}</div>
        <div className="row spread" style={{ gap: 12, flexWrap: 'wrap', marginTop: 14 }}>
          <span className="bs" style={{ maxWidth: 430 }}>
            Elegí por dónde te llegan las decisiones que esperan tu OK: las dos van al mismo equipo.
          </span>
          <div className="seg-group">
            {(['WhatsApp', 'Telegram'] as const).map(c => (
              <span key={c} className={`seg ${canal === c ? 'on' : ''}`}
                title={`Las decisiones que esperan tu OK te llegan por ${c}. Reversible: se cambia de nuevo acá.`}
                onClick={() => cambiarCanal(c)}>{c}</span>
            ))}
          </div>
        </div>
        {canalDesde && (
          <div className="tiny" style={{ marginTop: 12, color: 'var(--green)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7 }}>
            <I_Check size={13} /> Desde las {canalDesde} las decisiones te llegan por {canal}: mismo equipo, misma propuesta, otro chat.
          </div>
        )}
        <div className="row" style={{ gap: 9, marginTop: 14, flexWrap: 'wrap' }}>
          <Button className="btn-sm"
            title="Abre un mensaje real de tu bandeja, con la respuesta que Rumi dejó lista, y los 4 pasos de cómo lo aprobás desde el chat."
            onClick={abrirCanal}><I_Chat size={13} /> Ver cómo llega una aprobación <I_ArrowRight size={13} /></Button>
        </div>
        <div className="acc-why">
          De 22:00 a 08:00 no te llega nada de marcas: el equipo escribe cuando la marca puede leerlo.
          <b> Nada de lo que apruebes desde el chat se pierde</b>: queda en la bitácora como cualquier otra acción.
        </div>
      </Card>
    </div>
  );
}

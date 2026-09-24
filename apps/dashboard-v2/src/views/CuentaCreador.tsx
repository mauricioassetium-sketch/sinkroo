import { useState, type ReactNode } from 'react';
import { Card, Badge, Button, Avatar } from '../components/ui';
import { ViewHead } from '../components/viz';
import {
  I_Settings, I_Shield, I_Lock, I_Check, I_Clock, I_Edit, I_Eye, I_Refresh, I_Chat, I_Whatsapp,
  I_ArrowRight, I_User, I_Users, I_Trend, I_Star, I_Camera, I_Globe, I_Film, I_Target, I_Cal, I_Zap,
} from '../components/icons';
import { useDetalle, type Bloque } from '../components/Detalle';
import { MODOS, type Modo } from '../data/demo';
import {
  TIPOS_CREADOR, TIPO_DE_LA_CUENTA, OBJETIVOS_PERFIL, FICHA_CREADOR,
  AUTONOMIA_CREADOR, GUARDRAILS_CREADOR, CANAL_AVISO, AGENTES_CREADOR, NICHO, RITMO_SEMANA, PLAN_DEL_MES,
} from '../data/creador';

// =============================================================================================
// CUENTA Y AUTONOMÍA, EN PIEL DE CREADOR — el panel de quien crea contenido.
//
// MODELO NUEVO (manda sobre lo anterior): esta pantalla habla del creador, de su contenido y de su
// cuenta. La cuenta sirve para cuatro cosas y ninguna es vender: PRODUCIR (Nia y su avatar),
// VERIFICAR (el panel de 5), PUBLICAR (Kai) y CRECER (Rex y Sol), con Rumi contestando a la
// audiencia.
//
// Y es UNA herramienta para TODO tipo de creador de contenido: el que publica por gusto, el que
// hace crecer su audiencia, el que graba para otros, el que muestra su oficio y el que habla de su
// ciudad. El MOTOR ES EL MISMO para todos —los 6 agentes, el panel de 5, el dial y los guardrails—
// y lo que cambia con el tipo es qué se publica, qué se persigue y cada cuánto. Por eso el tipo de
// creador es lo PRIMERO de la pantalla y se puede cambiar: el plan se rearma, nada se pierde.
//
// Orden de la vista: el tipo → el objetivo del perfil → la Ficha (lo que el equipo necesita saber)
// → el dial acción por acción → los guardrails que el motor trae puestos → el canal de aviso.
//
// Cada control hace algo que se ve: mover un nivel o cambiar un dato deja su línea con la hora y lo
// que había antes, con la vuelta atrás a mano. La vigilancia del nicho es la única acción sin
// palanca: es automática y no se puede bajar (su `title` lo dice y el clic no la cambia).
//
// Todos los números y todos los textos salen de `src/data/creador.ts`: acá no se escribe un dato que
// no esté en la data.
// =============================================================================================

const NOMBRE: Record<Modo, string> = { auto: 'Automático', shared: 'Compartido', manual: 'Manual' };

/** El comportamiento de cada nivel, tal como lo declara el motor (data/demo.ts). */
const DESC = Object.fromEntries(MODOS.map(m => [m.key, m.desc])) as Record<Modo, string>;

/** La hora real de cada cambio: es lo que hace que la línea de abajo no sea un texto fijo. */
const ahora = () => new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

/** La vigilancia del nicho: la única acción del dial que no tiene palanca. */
const VIGILANCIA = AUTONOMIA_CREADOR.find(a => a.accion.startsWith('Vigilar'))!;

/** Los tres frenos que esta pantalla cita por nombre, para no depender de su posición. */
const FRENO_PANEL = GUARDRAILS_CREADOR.find(g => g.nombre.startsWith('Nada se publica'))!;
const FRENO_KYC = GUARDRAILS_CREADOR.find(g => g.nombre.startsWith('Publicar requiere'))!;
const FRENO_PUBLICADA = GUARDRAILS_CREADOR.find(g => g.nombre.startsWith('No se toca'))!;

/** El tipo de creador por su clave: si la clave no existe, cae en el primero (nunca queda vacío). */
const tipoDe = (key: string) => TIPOS_CREADOR.find(t => t.key === key) ?? TIPOS_CREADOR[0];

/** El objetivo de perfil por su clave. */
const objetivoDe = (key: string) => OBJETIVOS_PERFIL.find(o => o.key === key) ?? OBJETIVOS_PERFIL[0];

/** El objetivo que la Ficha ya declara: es el que la cuenta tiene puesto hoy. */
const OBJETIVO_DECLARADO = OBJETIVOS_PERFIL.find(o => o.nombre === FICHA_CREADOR.objetivo) ?? OBJETIVOS_PERFIL[0];

/** La franja horaria en la que Kai publica hoy: la que la data tiene por mejor para la audiencia. */
const VENTANA_EN_USO = NICHO.ventanas.find(v => v.usarla) ?? NICHO.ventanas[0];

/** Los seguidores de la Ficha sumados entre sus redes: '9.400' + '4.100' + '1.200' → 14.700. */
const SEGUIDORES = FICHA_CREADOR.redes.reduce((a, r) => a + Number(r.seguidores.replace(/\./g, '')), 0);
const CONECTADAS = FICHA_CREADOR.redes.filter(r => r.estado === 'conectada').length;

/**
 * Qué cambia cuando el creador cambia de tipo: el plan pasa a apuntar al norte del tipo nuevo, con
 * su ritmo. Es la línea que se ve después de elegir, por ejemplo «ahora el plan apunta a
 * constancia: 2 o 3 piezas por semana».
 */
const cambioDeTipo = (t: typeof TIPOS_CREADOR[number]) =>
  `el plan apunta a ${t.persigue.split(':')[0].toLowerCase()}: ${t.ritmo.toLowerCase()}`;

/** Un dato de la Ficha: lo que dice hoy, por qué se pide y quién lo usa. */
type Fila = {
  key: string;
  label: string;
  valor: string;
  porQue: string;
  /** De dónde salió el dato: se muestra en el panel, para que no quede un número sin origen. */
  fuente: string;
  /** El id del agente del equipo que trabaja con este dato. */
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

  /** El tipo de creador elegido: arranca con el que la cuenta ya tiene. */
  const [tipoKey, setTipoKey] = useState(TIPO_DE_LA_CUENTA.key);
  /** El tipo del que se viene, con la hora: sólo existe mientras haya un cambio sin volver atrás. */
  const [tipoAntes, setTipoAntes] = useState<{ key: string; hora: string } | null>(null);
  /** El objetivo del perfil: arranca con el que la Ficha declara. */
  const [objetivoKey, setObjetivoKey] = useState(OBJETIVO_DECLARADO.key);
  const [objetivoAntes, setObjetivoAntes] = useState<{ key: string; hora: string } | null>(null);
  /** Los datos de la Ficha que se pueden tocar, con lo que dicen ahora. */
  const [ficha, setFicha] = useState({ formato: FICHA_CREADOR.formatoDominante, ventana: VENTANA_EN_USO.franja });
  /** Lo cambiado en la Ficha en esta visita: campo → la hora y lo que decía antes. */
  const [tocado, setTocado] = useState<Record<string, { hora: string; antes: string }>>({});
  /** El nivel de cada una de las 8 acciones: arranca con el que trae la data de la piel. */
  const [niveles, setNiveles] = useState<Record<string, Modo>>(
    () => Object.fromEntries(AUTONOMIA_CREADOR.map(a => [a.accion, a.nivel])),
  );
  /** Lo que moviste en esta visita, con la hora y el nivel que la acción tenía antes. */
  const [movido, setMovido] = useState<Record<string, { hora: string; antes: Modo }>>({});
  /** Los movimientos de esta visita: es lo que abre «Ver el historial». */
  const [historial, setHistorial] = useState<{ hora: string; t: string; s: string }[]>([]);
  /** La hora en que cambió el nivel general: la línea de la pantalla la muestra, no una hora fija. */
  const [generalDesde, setGeneralDesde] = useState('');
  /** El canal por el que llegan las decisiones que esperan un OK. */
  const [canal, setCanal] = useState<'WhatsApp' | 'Telegram'>('WhatsApp');
  const [canalDesde, setCanalDesde] = useState('');

  const registrar = (t: string, s: string) => setHistorial(h => [...h, { hora: ahora(), t, s }]);

  const tipoActual = tipoDe(tipoKey);
  const objetivoActual = objetivoDe(objetivoKey);

  /** El rol real del agente que trabaja con un dato de la Ficha. */
  const agenteTexto = (id: string) => {
    const a = AGENTES_CREADOR.find(x => x.id === id);
    return a ? `${a.nombre}: ${a.enCreadores}` : 'El equipo';
  };

  // ---------------------------------------------------------------------------------------------
  // EL TIPO DE CREADOR — es lo primero porque es lo que hace que la herramienta sirva para todos.
  // ---------------------------------------------------------------------------------------------

  const cambiarTipo = (key: string) => {
    if (key === tipoKey) { setToast(`Tu cuenta ya trabaja como «${tipoDe(key).nombre}»`); return; }
    const t = tipoDe(key);
    setTipoAntes({ key: tipoKey, hora: ahora() });
    setTipoKey(key);
    registrar(`El tipo de creador pasa a «${t.nombre}»`, `venía de «${tipoDe(tipoKey).nombre}»`);
    setToast(`Listo: ${cambioDeTipo(t)}. Es reversible desde la misma tarjeta.`);
  };

  /** Vuelve al tipo de antes. Reversible: se puede volver a cambiar. */
  const volverTipo = () => {
    if (!tipoAntes) return;
    const antes = tipoDe(tipoAntes.key);
    registrar(`El tipo de creador vuelve a «${antes.nombre}»`, `venía de «${tipoActual.nombre}»`);
    setTipoKey(tipoAntes.key);
    setTipoAntes(null);
    setToast(`Volviste a «${antes.nombre}»: ${cambioDeTipo(antes)}`);
  };

  /** Los 5 tipos, con lo que publica, persigue y cada cuánto: elegir uno rearma el plan. */
  const abrirTipos = () => detalle({
    titulo: 'Cambiar mi tipo de creador',
    sub: `La herramienta sirve para cualquier tipo de creador de contenido: el motor es el mismo —los 6 agentes, el panel de 5, el dial y los ${GUARDRAILS_CREADOR.length} guardrails— y lo que cambia es qué publicás, qué perseguís y cada cuánto. ${TIPO_DE_LA_CUENTA.nota}`,
    bloques: [
      { tipo: 'datos', filas: [
        { k: 'Hoy tu cuenta trabaja como', v: `${tipoActual.icono} ${tipoActual.nombre}`, s: `${tipoActual.quien} · persigue ${tipoActual.persigue.toLowerCase()}` },
        { k: 'Su ritmo', v: tipoActual.ritmo, s: 'es lo que el plan del mes intenta sostener' },
      ] },
      { tipo: 'filas', items: TIPOS_CREADOR.map(t => ({
        t: `${t.icono} ${t.nombre}`,
        s: t.key === tipoActual.key
          ? 'el que está puesto hoy'
          : `Publica ${t.publica.toLowerCase()}. Persigue ${t.persigue.toLowerCase()} · ${t.ritmo.toLowerCase()}.`,
        etiqueta: t.key === tipoActual.key ? 'en uso' : 'elegir',
        tono: (t.key === tipoActual.key ? 'green' : 'muted') as 'green' | 'muted',
      })) },
      { tipo: 'texto', texto: 'El motor NO cambia con el tipo: los 6 agentes con su rol, el panel de 5 que verifica cada pieza, el dial acción por acción y los guardrails son los mismos para todos. Lo que cambia es el plan: qué se publica, qué métrica se persigue y con qué ritmo se sostiene.' },
      { tipo: 'aviso', texto: 'Es reversible: después de elegir, en la misma tarjeta te queda el botón para volver a tu tipo de antes. Nada de lo que el equipo ya produjo se pierde.' },
    ],
    fuente: `Sale de los ${TIPOS_CREADOR.length} tipos de creador de contenido y del que esta cuenta tiene puesto hoy.`,
    acciones: [
      ...TIPOS_CREADOR.filter(t => t.key !== tipoActual.key).map(t => ({
        label: `${t.icono} ${t.nombre}`,
        title: `Deja tu cuenta como «${t.nombre}»: ${cambioDeTipo(t)}. El cambio queda a la vista en tu Cuenta y es reversible.`,
        onClick: () => cambiarTipo(t.key),
      })),
      { label: 'Dejarlo como está', title: 'Cierra el panel sin cambiar de tipo', onClick: () => setToast(`Seguís como «${tipoActual.nombre}»: el plan no cambia`) },
    ],
  });

  // ---------------------------------------------------------------------------------------------
  // EL OBJETIVO DEL PERFIL — con qué se mide que la cuenta avanza.
  // ---------------------------------------------------------------------------------------------

  const cambiarObjetivo = (key: string) => {
    if (key === objetivoKey) { setToast(`Tu perfil ya persigue «${objetivoDe(key).nombre}»`); return; }
    const o = objetivoDe(key);
    setObjetivoAntes({ key: objetivoKey, hora: ahora() });
    setObjetivoKey(key);
    registrar(`El objetivo del perfil pasa a «${o.nombre}»`, `venía de «${objetivoDe(objetivoKey).nombre}»`);
    setToast(`Ahora tu perfil persigue «${o.nombre}»: se mide por ${o.kpi.join(', ').toLowerCase()}`);
  };

  /** Vuelve al objetivo de antes. Reversible desde la misma tarjeta. */
  const volverObjetivo = () => {
    if (!objetivoAntes) return;
    const antes = objetivoDe(objetivoAntes.key);
    registrar(`El objetivo del perfil vuelve a «${antes.nombre}»`, `venía de «${objetivoActual.nombre}»`);
    setObjetivoKey(objetivoAntes.key);
    setObjetivoAntes(null);
    setToast(`Tu perfil vuelve a perseguir «${antes.nombre}»`);
  };

  /** Los 4 objetivos de perfil, con sus KPI: elegir uno cambia qué mira el equipo. */
  const abrirObjetivos = () => detalle({
    titulo: 'Cambiar mi objetivo de perfil',
    sub: 'El objetivo define con qué se mide que tu cuenta avanza: el equipo prioriza contenido según esto.',
    bloques: [
      { tipo: 'datos', filas: [
        { k: 'Hoy perseguís', v: `${objetivoActual.icono} ${objetivoActual.nombre}`, s: objetivoActual.quien },
        { k: 'Se mide por', v: objetivoActual.kpi.join(' · '), s: 'son las métricas que el equipo mira cada semana' },
      ] },
      ...OBJETIVOS_PERFIL.map(o => ({
        tipo: 'filas' as const,
        items: [{
          t: `${o.icono} ${o.nombre}`,
          s: `${o.quien} ${o.paraQue}`,
          etiqueta: o.key === objetivoActual.key ? 'en uso' : 'elegir',
          tono: (o.key === objetivoActual.key ? 'green' : 'muted') as 'green' | 'muted',
        }],
      })),
      { tipo: 'texto', texto: 'Cambiar de objetivo no cambia lo que el equipo puede hacer: cambia qué contenido arma primero y contra qué número te cuenta el resultado del viernes.' },
      { tipo: 'aviso', texto: 'Es reversible: después de elegir, en la misma tarjeta te queda el botón para volver a lo que perseguías.' },
    ],
    fuente: `Sale de los ${OBJETIVOS_PERFIL.length} objetivos de perfil y del que tu cuenta persigue hoy.`,
    acciones: [
      ...OBJETIVOS_PERFIL.filter(o => o.key !== objetivoActual.key).map(o => ({
        label: `${o.icono} ${o.nombre}`,
        title: `Tu perfil pasa a perseguir «${o.nombre}» y el equipo se mide por ${o.kpi.join(', ').toLowerCase()}. Reversible desde la misma tarjeta.`,
        onClick: () => cambiarObjetivo(o.key),
      })),
      { label: 'Dejarlo como está', title: 'Cierra el panel sin cambiar el objetivo', onClick: () => setToast(`Tu perfil sigue persiguiendo «${objetivoActual.nombre}»`) },
    ],
  });

  // ---------------------------------------------------------------------------------------------
  // LA FICHA — los datos que alimentan todo lo que el equipo produce. De acá sale cada pieza.
  // ---------------------------------------------------------------------------------------------

  const filas: Fila[] = [
    {
      key: 'nicho', label: 'Nicho', icono: <I_Trend size={14} />, agente: 'lux',
      valor: FICHA_CREADOR.nicho,
      porQue: 'Es lo que Lux vigila cada 15 minutos: qué trendea en tu tema, qué formato retiene hoy y qué te pide tu audiencia.',
      fuente: 'Lo declaraste en tus primeros pasos, y el motor lo ajusta con lo que ve en tus piezas.',
    },
    {
      key: 'subtemas', label: 'Subtemas', icono: <I_Star size={14} />, agente: 'rex',
      valor: FICHA_CREADOR.subtemas.join(' · '),
      porQue: 'Son los temas que ya son tuyos: con esto el equipo arma las series y evita proponerte algo que no es tu contenido.',
      fuente: 'Sale de tus piezas con más alcance: son los temas que ya te funcionaron.',
    },
    {
      key: 'tono', label: 'Tono', icono: <I_Star size={14} />, agente: 'nia',
      valor: FICHA_CREADOR.tono,
      porQue: 'Nia escribe los guiones, los hooks y los captions con este tono: es lo que copia cuando escribe por vos.',
      fuente: 'Sale de tus últimas piezas: así le hablás a cámara.',
    },
    {
      key: 'tabues', label: 'Tabúes', icono: <I_Lock size={14} />, agente: 'nia',
      valor: FICHA_CREADOR.tabues,
      porQue: 'Lo que el equipo nunca dice, nunca muestra y nunca promete en tu nombre: vale para cada pieza y para cada respuesta a un comentario.',
      fuente: 'Los pusiste vos en tus primeros pasos y valen para todo lo que el equipo escriba o publique.',
    },
    {
      key: 'tiempo', label: 'Tiempo por semana', icono: <I_Clock size={14} />, agente: 'rex',
      valor: FICHA_CREADOR.tiempoSemana,
      porQue: 'El plan del mes se arma con las horas que tenés de verdad: si la semana viene corta, el equipo prioriza y te lo dice.',
      fuente: 'Lo declaraste al entrar y el motor lo ajusta con el tiempo real que tardás en grabar.',
    },
    {
      key: 'equipamiento', label: 'Equipamiento', icono: <I_Camera size={14} />, agente: 'nia',
      valor: FICHA_CREADOR.equipamiento,
      porQue: 'Define qué formato te puede proponer el equipo sin que te falte algo para grabar.',
      fuente: 'Lo declaraste al entrar: es lo que el motor mira antes de proponerte una idea.',
    },
    {
      key: 'formato', label: 'Formato dominante', icono: <I_Film size={14} />, agente: 'nia',
      valor: ficha.formato,
      porQue: 'Es el molde con el que Nia escribe los guiones y los hooks: apuntarlo al formato que hoy copa tu feed es lo que mantiene el alcance.',
      fuente: `Es el formato que copa el feed de tu nicho: ${NICHO.formatosDelFeed[0].f} con ${NICHO.formatosDelFeed[0].pct}%.`,
      opciones: [
        { v: FICHA_CREADOR.formatoDominante, d: 'Es el que tu Ficha declara: el molde con el que el equipo escribe hoy.' },
        ...NICHO.formatosDelFeed.map(f => ({ v: f.f, d: `${f.pct}% del feed de tu nicho hoy: es el reparto real, no una recomendación.` })),
      ],
    },
    {
      key: 'ventana', label: 'Ventana en la que publica Kai', icono: <I_Cal size={14} />, agente: 'kai',
      valor: ficha.ventana,
      porQue: `Es la franja en la que Kai programa tus piezas. La mejor de tu audiencia hoy: ${FICHA_CREADOR.mejorVentana.toLowerCase()}.`,
      fuente: `Sale de tus piezas publicadas: ${VENTANA_EN_USO.rendimiento.toLowerCase()}`,
      opciones: NICHO.ventanas.map(v => ({
        v: v.franja,
        d: `${v.rendimiento}${v.usarla ? ' Es la que Kai usa hoy.' : ''}`,
      })),
    },
    {
      key: 'peor', label: 'La peor ventana de tu audiencia', icono: <I_Clock size={14} />, agente: 'kai',
      valor: FICHA_CREADOR.peorVentana,
      porQue: 'Es la franja que el equipo evita: publicar ahí cuesta alcance, y el motor no programa nada en ese horario.',
      fuente: 'Sale de tus piezas publicadas: es la mitad del alcance que te da la mejor ventana.',
    },
    {
      key: 'redes', label: 'Redes y seguidores', icono: <I_Globe size={14} />, agente: 'sol',
      valor: `${CONECTADAS} de ${FICHA_CREADOR.redes.length} conectadas · ${SEGUIDORES.toLocaleString('es-AR')} seguidores`,
      porQue: 'Es de donde el motor lee seguidores, alcance e interacción cada 15 minutos: sin la red conectada, esa parte no se mide.',
      fuente: 'Sale de las cuentas que conectaste, con la interacción de cada una.',
    },
    {
      key: 'lectura', label: 'La lectura del perfil real', icono: <I_Eye size={14} />, agente: 'sol',
      valor: FICHA_CREADOR.lecturaDelPerfil,
      porQue: 'No sale de lo que declaraste: es lo que el motor leyó en tus piezas. Es lo que decide qué idea te propone primero.',
      fuente: 'Lectura del motor sobre tus últimas piezas, tus formatos y tus métricas.',
    },
    {
      key: 'ritmo', label: 'Ritmo actual y ritmo objetivo', icono: <I_Zap size={14} />, agente: 'rex',
      valor: `${FICHA_CREADOR.ritmoActual} · meta: ${FICHA_CREADOR.ritmoObjetivo}`,
      porQue: 'Es la distancia que el plan persigue. El equipo produce con el avatar lo que a vos no te da el tiempo.',
      fuente: `Sale del plan del mes: ${PLAN_DEL_MES.objetivo}`,
    },
  ];

  const valorDe = (campo: string) => filas.find(f => f.key === campo)?.valor ?? '';
  const labelDe = (campo: string) => filas.find(f => f.key === campo)?.label ?? '';

  const aplicarFicha = (campo: string, valor: string) => {
    const antes = valorDe(campo);
    if (antes === valor) { setToast(`«${labelDe(campo)}» ya estaba así`); return; }
    setFicha(f => ({ ...f, [campo]: valor }));
    setTocado(t => ({ ...t, [campo]: { hora: ahora(), antes } }));
    setToast(`«${labelDe(campo)}» ahora dice «${valor}»: el equipo trabaja con eso desde la próxima vuelta`);
  };

  /** Vuelve un dato de la Ficha a lo que decía antes. Reversible desde la misma fila. */
  const volverFicha = (campo: string) => {
    const t = tocado[campo];
    if (!t) return;
    setFicha(f => ({ ...f, [campo]: t.antes }));
    setTocado(x => { const c = { ...x }; delete c[campo]; return c; });
    setToast(`«${labelDe(campo)}» vuelve a «${t.antes}»`);
  };

  const resetFicha = () => {
    setFicha({ formato: FICHA_CREADOR.formatoDominante, ventana: VENTANA_EN_USO.franja });
    setTocado({});
    setToast('Tu Ficha vuelve a como venía: el equipo trabaja otra vez con tus datos originales');
  };

  // ---------------------------------------------------------------------------------------------
  // LOS PANELES DE DETALLE — el dato real de cada cosa, en el mismo lugar para todos los botones.
  // ---------------------------------------------------------------------------------------------

  /** «Cambiar» de una fila de la Ficha: las opciones, con lo que implica cada una. */
  const abrirCambioFicha = (f: Fila) => detalle({
    titulo: `Cambiar ${f.label.charAt(0).toLowerCase()}${f.label.slice(1)}`,
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
        label: o.v,
        title: `Deja «${f.label}» en «${o.v}» y el cambio se ve en tu Ficha al instante. Reversible.`,
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
        { k: 'Se puede cambiar', v: 'No: lo sostiene el motor', s: 'sale de lo que el sistema ya vio en tus piezas, no de lo que se declara' },
      ] },
      { tipo: 'aviso', texto: 'Los datos que el motor deduce solo no se editan: son la lectura de tu perfil y de tus números. Lo que sí decidís vos es el tipo, el objetivo, el formato con el que se escribe y en qué ventana se publica.' },
    ],
    fuente: f.fuente,
    acciones: [{ label: 'Cerrar', title: 'Cierra el panel sin cambiar nada', onClick: () => {} }],
  });

  /** Las redes de la Ficha, una por una: qué se mide en cada una y cuál falta conectar. */
  const abrirRedes = () => detalle({
    titulo: 'Tus redes y lo que se mide en cada una',
    sub: 'El motor las lee cada 15 minutos junto con tus métricas: de acá sale qué pieza retuvo y qué hizo crecer la cuenta.',
    bloques: [
      { tipo: 'filas', items: FICHA_CREADOR.redes.map(r => ({
        t: `${r.red} · ${r.usuario}`,
        s: `${r.seguidores} seguidores · ${r.interaccion} de interacción`,
        etiqueta: r.estado,
        tono: (r.estado === 'conectada' ? 'green' : 'amber') as 'green' | 'amber',
      })) },
      { tipo: 'datos', filas: [
        { k: 'Redes conectadas', v: `${CONECTADAS} de ${FICHA_CREADOR.redes.length}`, s: 'las que todavía no lo están no se publican ni se miden' },
        { k: 'Seguidores en total', v: SEGUIDORES.toLocaleString('es-AR') },
        { k: 'Qué mide el motor', v: 'Retención, alcance e interacción', s: 'por pieza y por red' },
      ] },
      { tipo: 'aviso', tono: 'amber', texto: 'La red que no está conectada no se mide: mientras siga así, el equipo no puede decirte qué funcionó ahí ni publicar en esa red.' },
    ],
    fuente: 'Sale de las redes de tu Ficha, con los seguidores y la interacción de cada una.',
    acciones: [{ label: 'Cerrar', title: 'Cierra el panel sin cambiar nada', onClick: () => {} }],
  });

  /** La Ficha entera: qué cambió hoy y con qué está trabajando el equipo ahora. */
  const abrirFicha = () => detalle({
    titulo: 'Tu Ficha de creador',
    sub: 'Es lo que el equipo necesita saber de vos: todo lo que produce sale de acá.',
    bloques: [
      { tipo: 'datos', filas: [
        { k: 'Tipo de creador', v: `${tipoActual.icono} ${tipoActual.nombre}`, s: `persigue ${tipoActual.persigue.toLowerCase()} · ${tipoActual.ritmo}` },
        { k: 'Objetivo del perfil', v: `${objetivoActual.icono} ${objetivoActual.nombre}`, s: `se mide por ${objetivoActual.kpi.join(' · ').toLowerCase()}` },
        { k: 'Nicho', v: FICHA_CREADOR.nicho, s: FICHA_CREADOR.subtemas.join(' · ') },
        { k: 'Redes', v: `${CONECTADAS} de ${FICHA_CREADOR.redes.length} conectadas`, s: `${SEGUIDORES.toLocaleString('es-AR')} seguidores en total` },
        { k: 'Cambios de hoy', v: String(Object.keys(tocado).length), s: 'cada uno se revierte desde su fila' },
      ] },
      { tipo: 'filas', items: filas.map(f => ({
        t: f.label, s: f.valor, etiqueta: tocado[f.key] ? `cambiado ${tocado[f.key].hora}` : 'como venía',
        tono: (tocado[f.key] ? 'amber' : 'muted') as 'amber' | 'muted',
      })) },
      { tipo: 'aviso', texto: 'Con la Ficha al día el equipo no te vuelve a preguntar lo mismo: es lo que hace que las ideas lleguen listas para grabar y no a medio escribir.' },
    ],
    fuente: 'Sale de tu Ficha tal como está ahora, con los cambios que hiciste en esta visita.',
    acciones: Object.keys(tocado).length > 0
      ? [{ label: 'Volver todo a como venía', variante: 'primary', title: 'Devuelve los datos que cambiaste a lo que decían antes. Reversible: los volvés a cambiar cuando quieras.', onClick: resetFicha }]
      : [{ label: 'Cerrar', title: 'Cierra el panel sin cambiar nada', onClick: () => {} }],
  });

  // ---------------------------------------------------------------------------------------------
  // EL DIAL, ACCIÓN POR ACCIÓN — mover un nivel es lo que cambia la tarjeta y el encabezado.
  // ---------------------------------------------------------------------------------------------

  const mover = (accion: string, m: Modo) => {
    const antes = niveles[accion] ?? 'auto';
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
    registrar(`«${accion}» vuelve a ${NOMBRE[mv.antes]}`, `venía de ${NOMBRE[niveles[accion] ?? 'auto']}`);
    setToast(`«${accion}» vuelve a ${NOMBRE[mv.antes]}: como estaba antes de que lo movieras`);
  };

  /** El nivel general: rige para lo que el equipo haga por primera vez, sin nivel propio. */
  const cambiarGeneral = (m: Modo) => {
    if (modo === m) { setToast(`El equipo ya viene trabajando en ${NOMBRE[m]} por defecto`); return; }
    registrar(`El nivel general del equipo pasa a ${NOMBRE[m]}`, `venía en ${NOMBRE[modo]}`);
    setModo(m);
    setGeneralDesde(ahora());
    setToast(`Nivel general en ${NOMBRE[m]}: ${DESC[m]}`);
  };

  /** Devuelve las 8 acciones al nivel con el que vienen. Reversible. */
  const resetDial = () => {
    setNiveles(Object.fromEntries(AUTONOMIA_CREADOR.map(a => [a.accion, a.nivel])));
    setMovido({});
    registrar('Las 8 acciones vuelven a su nivel de siempre', 'el que trae el motor para tu cuenta');
    setToast('El dial vuelve a como venía: las 8 acciones con el nivel de siempre');
  };

  /** «La vigilancia no se puede bajar»: el por qué, con lo último que encontró en el nicho. */
  const abrirFija = () => detalle({
    titulo: 'La vigilancia del nicho no se puede bajar',
    sub: `${VIGILANCIA.nota} Es la única acción del dial que no tiene palanca.`,
    bloques: [
      { tipo: 'datos', filas: [
        { k: 'Cada cuánto mira', v: 'Cada 15 minutos', s: RITMO_SEMANA.latido },
        { k: 'Qué mira', v: 'Tu nicho, tus métricas y tus comentarios', s: 'de ahí salen las ideas de Lux, el plan de Rex y el resumen de Sol' },
        { k: 'Lo que cuesta', v: 'Nada', s: 'no gasta créditos: sólo lee' },
        { k: 'Lo último que encontró', v: `${NICHO.trends.length} formatos`, s: NICHO.trends.map(t => `${t.t} (${t.num})`).join(' · ') },
        { k: 'Lo que más pide tu audiencia', v: `${NICHO.temasQuePiden[0].consultas} consultas`, s: NICHO.temasQuePiden[0].t },
      ] },
      { tipo: 'texto', texto: `Para que el motor no se quede quieto tiene que estar mirando: sin la vigilancia, el equipo no se enteraría de qué se mueve en tu nicho y el resto del dial trabajaría a ciegas. Con lo que encuentra, Lux deja las ideas con su por qué y Rex arma el plan del lunes.` },
      { tipo: 'aviso', texto: 'Todo lo demás sí lo decidís vos, acción por acción: la vigilancia es lo único que no tiene palanca porque es lo que mantiene despierto al equipo, y no cuesta créditos.' },
    ],
    fuente: 'Sale del ritmo real del motor y de lo último que encontró en tu nicho.',
    acciones: [
      { label: 'Entendido', variante: 'primary', title: 'Cierra este panel: la vigilancia sigue como está', onClick: () => setToast('La vigilancia sigue activa: es lo que mantiene al equipo al día con tu nicho') },
    ],
  });

  /** «Ver el historial»: lo que moviste en esta visita, con la hora y con qué nivel quedó cada cosa. */
  const abrirHistorial = () => {
    const bloques: Bloque[] = [
      historial.length > 0
        ? { tipo: 'filas', items: historial.slice().reverse().map(h => ({ t: h.t, s: h.s, etiqueta: h.hora, tono: 'purple' as const })) }
        : { tipo: 'texto', texto: 'Todavía no moviste nada en esta visita: el equipo viene trabajando como lo dejaste la última vez. En cuanto muevas un nivel, tu tipo, tu objetivo o un dato de tu Ficha, el cambio queda acá con la hora.' },
      { tipo: 'datos', filas: [
        { k: 'Nivel general del equipo', v: NOMBRE[modo], s: 'rige para lo que el equipo haga por primera vez' },
        { k: 'Acciones en Automático', v: `${autos} de ${AUTONOMIA_CREADOR.length}`, s: 'las que el equipo hace y te cuenta en la bitácora' },
        { k: 'Acciones que te esperan', v: `${esperan} de ${AUTONOMIA_CREADOR.length}`, s: 'compartidas y manuales: no salen sin tu OK' },
        { k: 'Acciones sin palanca', v: '1', s: `la vigilancia del nicho: ${VIGILANCIA.accion.toLowerCase()}` },
        { k: 'Frenos que valen siempre', v: String(GUARDRAILS_CREADOR.length), s: 'no dependen del dial: valen también en Automático' },
        { k: 'Tu tipo de creador', v: tipoActual.nombre, s: `${cambioDeTipo(tipoActual)}` },
        { k: 'Tu objetivo de perfil', v: objetivoActual.nombre, s: `se mide por ${objetivoActual.kpi.join(' · ').toLowerCase()}` },
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
      fuente: `Sale de esta misma pantalla: las ${AUTONOMIA_CREADOR.length} acciones de tu cuenta y los ${GUARDRAILS_CREADOR.length} frenos que tenés hoy. Se actualiza en cuanto cambiás algo.`,
      acciones: Object.keys(movido).length > 0
        ? [{ label: 'Volver a como venía', variante: 'primary', title: 'Devuelve las 8 acciones al nivel con el que vienen. Reversible: las volvés a mover cuando quieras.', onClick: resetDial }]
        : [{ label: 'Cerrar', title: 'Cierra el panel sin cambiar nada', onClick: () => {} }],
    });
  };

  // ---------------------------------------------------------------------------------------------
  // LOS GUARDRAILS Y EL CANAL — lo que el motor no negocia y por dónde te llegan las decisiones.
  // ---------------------------------------------------------------------------------------------

  /** «Cómo te protegen»: los 7 frenos con su valor real y con qué protege cada uno. */
  const abrirGuardrails = () => detalle({
    titulo: `Los ${GUARDRAILS_CREADOR.length} guardrails de tu cuenta`,
    sub: 'No los elegís vos: vienen puestos por el motor y valen siempre, también cuando el equipo trabaja solo.',
    bloques: [
      { tipo: 'filas', items: GUARDRAILS_CREADOR.map(g => ({
        t: g.nombre, s: g.porQue, etiqueta: g.valor, tono: 'green' as const,
      })) },
      { tipo: 'datos', filas: [
        { k: 'Nada se publica sin verificar', v: FRENO_PANEL.valor, s: FRENO_PANEL.porQue },
        { k: 'Publicar tu contenido', v: FRENO_KYC.valor, s: FRENO_KYC.porQue },
        { k: 'Una publicación que ya salió', v: FRENO_PUBLICADA.valor, s: FRENO_PUBLICADA.porQue },
        { k: 'Lo que se puede gastar por día', v: GUARDRAILS_CREADOR[0].valor, s: GUARDRAILS_CREADOR[0].porQue },
      ] },
      { tipo: 'texto', texto: 'Un ejemplo con el motor en Automático: el equipo puede escribir un guion, producir la pieza con tu avatar y programarla, pero no la publica sin que el panel de 5 la apruebe, y no toca una pieza que ya salió con tu nombre. Lo que decide solo es el trabajo; lo que sale publicado y lo que se borra siempre pasa por una regla o por vos.' },
      { tipo: 'aviso', tono: 'amber', texto: 'Estos frenos son los que te dejan tener el dial en Automático sin estar mirando el panel. Si se pudieran apagar, trabajar sin mirar no sería una opción.' },
    ],
    fuente: `Sale de los ${GUARDRAILS_CREADOR.length} guardrails que el motor aplica a tu cuenta, con su valor de hoy.`,
    acciones: [
      { label: 'Ver mi dial', variante: 'primary', title: 'Cierra el panel y te deja en el dial, acción por acción', onClick: () => setToast('El dial está arriba: cada acción con su nivel') },
    ],
  });

  /** «Tu verificación»: por qué es obligatoria antes de publicar y en qué estado está. */
  const abrirVerificacion = () => detalle({
    titulo: 'Tu verificación (KYC)',
    sub: 'Es la que habilita publicar en tus redes a tu nombre. Sin ella, el equipo prepara y verifica todo, pero no lo saca.',
    bloques: [
      { tipo: 'datos', filas: [
        { k: 'Estado', v: 'Pendiente', s: 'la hacés una sola vez, con la cámara, en el momento', tono: 'amber' },
        { k: 'Qué desbloquea', v: 'Publicar en tus redes', s: 'mientras esté pendiente, publicar te espera: la verificación va antes' },
        { k: 'Por qué es obligatoria', v: FRENO_KYC.valor, s: FRENO_KYC.porQue },
        { k: 'Qué se pide', v: '3 pasos con la cámara', s: 'documento, comprobante de domicilio y selfie' },
      ] },
      { tipo: 'pasos', items: [
        'Sacás las fotos con la cámara, en el momento: no se suben archivos guardados.',
        'Se comparan entre sí y con tu selfie.',
        'Cuando queda aprobada, el equipo puede publicar en tus redes.',
      ] },
      { tipo: 'texto', texto: 'Mientras esté pendiente, el equipo sigue con todo lo demás: mira tu nicho, escribe los guiones, produce con tu avatar, verifica cada pieza con el panel y contesta los comentarios de tu audiencia. Lo único que espera es publicar.' },
      { tipo: 'aviso', tono: 'amber', texto: `Es un freno del motor, no una decisión del equipo: ${FRENO_KYC.nombre.toLowerCase()} · ${FRENO_KYC.valor}. Nada se publica a nombre de alguien sin verificar.` },
    ],
    fuente: 'Sale del estado de tu verificación y del guardrail que la hace obligatoria para publicar.',
    acciones: [{ label: 'Entendido', title: 'Cierra este panel: tu verificación sigue pendiente', onClick: () => setToast('Tu verificación sigue pendiente: el equipo produce y verifica, pero no publica hasta que esté aprobada') }],
  });

  /** El canal: por dónde te llega cada decisión que espera tu OK, paso por paso. */
  const abrirCanal = () => detalle({
    titulo: `Cómo te llega una decisión por ${canal}`,
    sub: CANAL_AVISO.texto,
    bloques: [
      { tipo: 'pasos', items: [
        `El equipo se topa con algo que necesita tu OK y te escribe a ${canal}.`,
        'El mensaje llega con la pieza o la respuesta ya escrita y el motivo: no tenés que abrir nada.',
        'Respondés desde el chat: lo aprobás, lo ajustás o lo dejás para después.',
        'Si no respondés cerca de la mejor ventana, se reprograma y te avisa. Nunca publica sin tu sí.',
      ] },
      { tipo: 'datos', filas: [
        { k: 'Por dónde te llega', v: canal, s: 'se cambia desde esta pantalla cuando quieras' },
        { k: 'Decisiones que pueden esperarte', v: `${esperan} de ${AUTONOMIA_CREADOR.length}`, s: 'las acciones en Compartido y en Manual: no salen sin tu OK' },
        { k: 'Lo que nunca espera tu OK', v: 'Verificar y medir', s: 'el panel puntúa cada pieza y Sol mide el resultado: no cuesta créditos' },
        { k: 'Lo que sigue andando sin vos', v: `La vigilancia del nicho`, s: RITMO_SEMANA.latido },
      ] },
      { tipo: 'texto', texto: 'El panel es para ver el detalle cuando querés: aprobar no depende de entrar acá. Todo lo que apruebas desde el chat queda después en la bitácora.' },
      { tipo: 'aviso', texto: 'Nada de lo que el equipo decide solo sale publicado: lo que se publica, se contesta o se borra siempre pasa por tu OK, por una regla del motor o por las dos cosas.' },
    ],
    fuente: `Sale del canal que tenés elegido y de los niveles que tienen hoy las ${AUTONOMIA_CREADOR.length} acciones del dial.`,
    acciones: [
      { label: `Marcar ${canal === 'WhatsApp' ? 'Telegram' : 'WhatsApp'}`, title: `Cambia el canal por el que te llegan las decisiones. Reversible: se cambia de nuevo desde esta pantalla.`, onClick: () => cambiarCanal(canal === 'WhatsApp' ? 'Telegram' : 'WhatsApp') },
    ],
  });

  const cambiarCanal = (c: 'WhatsApp' | 'Telegram') => {
    if (canal === c) { setToast(`Las decisiones ya te llegan por ${c}`); return; }
    registrar(`Las decisiones pasan a llegarte por ${c}`, `venían por ${canal}`);
    setCanal(c);
    setCanalDesde(ahora());
    setToast(`Listo: las decisiones que esperan tu OK te llegan por ${c}`);
  };

  // ---------------------------------------------------------------------------------------------
  // LOS NÚMEROS DEL ENCABEZADO — todos salen de la data y del estado de esta pantalla.
  // ---------------------------------------------------------------------------------------------

  const autos = AUTONOMIA_CREADOR.filter(a => (niveles[a.accion] ?? a.nivel) === 'auto').length;
  const esperan = AUTONOMIA_CREADOR.length - autos;
  const cambios = Object.keys(tocado).length;

  return (
    <div className="dash">
      <ViewHead
        icon={<I_Settings size={19} />}
        titulo="Cuenta y autonomía"
        sub="Tu tipo de creador, el objetivo de tu perfil, tu Ficha, el dial por acción y los guardrails. Es la misma herramienta para cualquier tipo de creador: el motor no cambia, cambia lo que publicás y lo que perseguís."
        nums={[
          { v: tipoActual.nombre, l: 'tu tipo de creador', c: 'var(--purple3)' },
          { v: `${autos}/${AUTONOMIA_CREADOR.length}`, l: 'acciones automáticas' },
          { v: String(GUARDRAILS_CREADOR.length), l: 'frenos activos', c: 'var(--green)' },
          { v: 'Pendiente', l: 'verificación (KYC)', c: 'var(--amber)' },
        ]}
      />

      {/* ================= TU TIPO DE CREADOR ================= */}
      <div className="csec" style={{ marginTop: 0 }}>
        <span className="csec-n">🧑‍🎤</span>
        <span className="csec-t">Tu tipo de creador</span>
        <span className="csec-s">Para qué tipo de creador trabaja el equipo — se puede cambiar cuando quieras</span>
      </div>
      <Card
        title={<span className="row" style={{ gap: 8 }}><I_Users size={14} style={{ color: 'var(--purple3)' }} /> {tipoActual.icono} {tipoActual.nombre}</span>}
        action={<Badge tone="purple">el motor es el mismo para todos los tipos</Badge>}
      >
        <div className="bs" style={{ marginBottom: 12 }}>
          {tipoActual.quien} <b>El tipo define qué publica el equipo, qué métrica persigue y con qué ritmo;</b> el
          motor —los 6 agentes, el panel de 5, el dial y los {GUARDRAILS_CREADOR.length} guardrails— es el mismo
          para cualquier tipo de creador.
        </div>

        <div className="guards">
          <div className="guard">
            <span style={{ color: 'var(--purple3)', flexShrink: 0 }}><I_Film size={14} /></span>
            <span className="guard-lb">{tipoActual.publica}<small>Qué publica el equipo</small></span>
          </div>
          <div className="guard">
            <span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Target size={14} /></span>
            <span className="guard-lb">{tipoActual.persigue}<small>Qué persigue tu cuenta</small></span>
          </div>
          <div className="guard">
            <span style={{ color: 'var(--amber)', flexShrink: 0 }}><I_Cal size={14} /></span>
            <span className="guard-lb">{tipoActual.ritmo}<small>Cada cuánto, según tu tiempo</small></span>
          </div>
          <div className="guard">
            <span style={{ color: 'var(--purple3)', flexShrink: 0 }}><I_Star size={14} /></span>
            <span className="guard-lb">{tipoActual.ejemploNicho}<small>Nichos donde este tipo entra, por ejemplo</small></span>
          </div>
        </div>

        {tipoAntes && (
          <div className="tiny row" style={{ gap: 8, color: 'var(--amber)', fontWeight: 700, flexWrap: 'wrap', alignItems: 'center', marginTop: 12 }}>
            <I_Clock size={13} /> Cambiado hoy {tipoAntes.hora}: venía «{tipoDe(tipoAntes.key).nombre}». Ahora {cambioDeTipo(tipoActual)}.
            <Button variant="ghost" className="btn-sm"
              title={`Vuelve a «${tipoDe(tipoAntes.key).nombre}»: ${cambioDeTipo(tipoDe(tipoAntes.key))}. Reversible: lo volvés a cambiar cuando quieras.`}
              onClick={volverTipo}><I_Refresh size={12} /> Volver a «{tipoDe(tipoAntes.key).nombre}»</Button>
          </div>
        )}

        <div className="row" style={{ gap: 9, marginTop: 14, flexWrap: 'wrap' }}>
          <Button className="btn-sm"
            title={`Abre los ${TIPOS_CREADOR.length} tipos de creador con lo que publica y persigue cada uno: al elegir uno, el plan se rearma y el cambio queda a la vista en esta tarjeta. Reversible.`}
            onClick={abrirTipos}><I_Edit size={13} /> Cambiar mi tipo</Button>
          <Badge tone="muted">{TIPOS_CREADOR.length} tipos disponibles</Badge>
        </div>

        <div className="acc-why">
          Esto es lo que hace que la herramienta sirva para cualquiera: <b>no se asume un rubro ni un perfil</b>.
          Un creador que publica por gusto, uno que hace crecer su audiencia, uno que graba para otros, uno que
          muestra su oficio y uno que habla de su ciudad usan el mismo motor, con otro norte y otro ritmo.
        </div>
      </Card>

      {/* ================= TU OBJETIVO DE PERFIL ================= */}
      <div className="csec">
        <span className="csec-n">🎯</span>
        <span className="csec-t">Tu objetivo de perfil</span>
        <span className="csec-s">Con qué se mide que tu cuenta avanza</span>
      </div>
      <Card
        title={<span className="row" style={{ gap: 8 }}><I_Target size={14} style={{ color: 'var(--green)' }} /> {objetivoActual.icono} {objetivoActual.nombre}</span>}
        action={<Badge tone="green">{objetivoActual.kpi.length} métricas</Badge>}
      >
        <div className="bs" style={{ marginBottom: 10 }}>{objetivoActual.quien}</div>
        <div className="como-se-lee"><b>Qué hace el equipo con esto:</b> {objetivoActual.paraQue}</div>

        <div className="row" style={{ gap: 6, flexWrap: 'wrap', margin: '12px 0 4px' }}>
          {objetivoActual.kpi.map(k => <span key={k} className="badge badge-green" style={{ fontSize: 9.5 }}>{k}</span>)}
        </div>

        {objetivoAntes && (
          <div className="tiny row" style={{ gap: 8, color: 'var(--amber)', fontWeight: 700, flexWrap: 'wrap', alignItems: 'center', marginTop: 10 }}>
            <I_Clock size={13} /> Cambiado hoy {objetivoAntes.hora}: venía «{objetivoDe(objetivoAntes.key).nombre}». Ahora tu perfil persigue «{objetivoActual.nombre}» y el equipo se mide por {objetivoActual.kpi.join(', ').toLowerCase()}.
            <Button variant="ghost" className="btn-sm"
              title={`Vuelve a «${objetivoDe(objetivoAntes.key).nombre}»: el equipo se mide otra vez por ${objetivoDe(objetivoAntes.key).kpi.join(', ').toLowerCase()}. Reversible.`}
              onClick={volverObjetivo}><I_Refresh size={12} /> Volver a «{objetivoDe(objetivoAntes.key).nombre}»</Button>
          </div>
        )}

        <div className="row" style={{ gap: 9, marginTop: 14, flexWrap: 'wrap' }}>
          <Button className="btn-sm"
            title={`Abre los ${OBJETIVOS_PERFIL.length} objetivos de perfil con sus métricas: al elegir uno, el equipo prioriza otro contenido y el cambio queda a la vista. Reversible.`}
            onClick={abrirObjetivos}><I_Edit size={13} /> Cambiar mi objetivo</Button>
          <Badge tone="muted">{OBJETIVOS_PERFIL.length} objetivos disponibles</Badge>
        </div>

        <div className="acc-why">
          El objetivo no limita lo que el equipo puede hacer: <b>ordena qué produce primero</b> y contra qué número
          te cuenta el resultado del viernes. El que persigue autoridad recibe piezas que enseñan; el que busca
          constancia, el ritmo sostenido con su avatar.
        </div>
      </Card>

      {/* ================= TU FICHA ================= */}
      <div className="csec">
        <span className="csec-n">📋</span>
        <span className="csec-t">Tu Ficha</span>
        <span className="csec-s">Lo que el equipo necesita saber de vos: de acá sale cada pieza que produce</span>
      </div>
      <Card
        title={<span className="row" style={{ gap: 8 }}><I_User size={14} style={{ color: 'var(--purple3)' }} /> {FICHA_CREADOR.nombre} · {FICHA_CREADOR.usuario}</span>}
        action={<Badge tone="purple">{FICHA_CREADOR.nicho}</Badge>}
      >
        <div className="row spread" style={{ gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
          <span className="row" style={{ gap: 11 }}>
            <Avatar name={FICHA_CREADOR.nombre} size={42} tone={4} />
            <span>
              <span className="bt" style={{ display: 'block' }}>
                {FICHA_CREADOR.subtemas.length} subtemas · {FICHA_CREADOR.formatoDominante.toLowerCase()}
              </span>
              <span className="tiny muted">
                {FICHA_CREADOR.redes.map(r => r.red).join(' · ')} · {SEGUIDORES.toLocaleString('es-AR')} seguidores
              </span>
            </span>
          </span>
          <span className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            <Badge tone="green">{CONECTADAS} de {FICHA_CREADOR.redes.length} redes conectadas</Badge>
            <Badge tone="muted">{FICHA_CREADOR.ritmoActual} · meta: {FICHA_CREADOR.ritmoObjetivo}</Badge>
          </span>
        </div>

        <div className="onb-infiere" style={{ marginTop: 0 }}>
          <span className="onb-infiere-ic"><I_Eye size={13} /></span>
          <span><b>Lo que el motor leyó en tu perfil:</b> {FICHA_CREADOR.lecturaDelPerfil}</span>
        </div>

        <div className="exc" style={{ marginTop: 12 }}>
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
          <Button className="btn-sm" title="Abre tu Ficha completa: con qué está trabajando el equipo ahora, tus redes una por una y qué cambiaste hoy."
            onClick={abrirFicha}><I_Eye size={13} /> Ver mi Ficha completa</Button>
          <Button variant="ghost" className="btn-sm" title={`Abre tus redes con los seguidores y la interacción de cada una, y cuál falta conectar. No cambia nada.`}
            onClick={abrirRedes}><I_Globe size={13} /> Ver mis redes</Button>
          {cambios > 0 && (
            <Button variant="outline" className="btn-sm"
              title="Devuelve los datos que cambiaste hoy a lo que decían antes. Reversible: los volvés a cambiar cuando quieras."
              onClick={resetFicha}><I_Refresh size={13} /> Volver todo a como venía</Button>
          )}
        </div>
        {cambios > 0 && (
          <div className="tiny" style={{ marginTop: 11, color: 'var(--amber)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7 }}>
            <I_Clock size={13} /> Cambiaste {cambios === 1 ? 'un dato' : `${cambios} datos`} de tu Ficha hoy: el equipo trabaja con lo nuevo desde la próxima vuelta, y cada cambio se revierte desde su fila.
          </div>
        )}
        <div className="acc-why">
          La Ficha es lo que hace que las ideas lleguen listas: <b>nicho, subtemas, tono y tabúes</b> son de dónde sale
          cada guion, cada hook y cada respuesta que el equipo te deja para aprobar. Lo que el motor deduce solo
          —el ritmo, la lectura del perfil y las ventanas— se puede mirar pero no se edita: sale de tus números.
        </div>
      </Card>

      {/* ================= EL DIAL, ACCIÓN POR ACCIÓN ================= */}
      <div className="csec">
        <span className="csec-n">★</span>
        <span className="csec-t">El dial, acción por acción</span>
        <span className="csec-s">Ocho acciones, ocho niveles: cada una se cambia sola y el cambio se ve al instante</span>
      </div>
      <Card
        title={<span className="row" style={{ gap: 8 }}><I_Settings size={14} style={{ color: 'var(--purple3)' }} /> Cuánto decide el equipo en cada cosa</span>}
        action={<Badge tone={autos ? 'purple' : 'green'}>{autos} automáticas · {esperan} te esperan</Badge>}
      >
        <div className="row spread" style={{ gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <span className="bs" style={{ maxWidth: 430 }}>
            <b>Nivel general del equipo.</b> Es el que rige cuando una acción no tiene el suyo: las ocho de abajo
            lo tienen puesto, así que hoy vale para lo que el equipo haga por primera vez.
          </span>
          <div className="seg-group">
            {MODOS.map(m => (
              <span key={m.key} className={`seg ${modo === m.key ? 'on' : ''}`}
                title={`Nivel general en ${m.nombre}: ${m.desc} Reversible: se cambia de nuevo acá.`}
                onClick={() => cambiarGeneral(m.key)}>{m.nombre}</span>
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
            const fija = a.accion === VIGILANCIA.accion;
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
                          ? 'La vigilancia del nicho es automática y no se puede bajar ni apagar: tocá para ver por qué no tiene palanca y qué encontró en tu nicho.'
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
            title={`Devuelve las ${AUTONOMIA_CREADOR.length} acciones al nivel con el que vienen. Reversible: las volvés a mover cuando quieras.`}
            onClick={resetDial}><I_Refresh size={13} /> Volver a como venía</Button>
        </div>
        {historial.length > 0 && (
          <div className="tiny" style={{ marginTop: 11, color: 'var(--purple3)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7 }}>
            <I_Clock size={13} /> En esta visita moviste {historial.length === 1 ? 'una cosa' : `${historial.length} cosas`}: el historial las tiene con la hora y el nivel que tenían antes (la última: {historial[historial.length - 1].hora}).
          </div>
        )}
        <div className="acc-why">
          No es una sola palanca: <b>producir, publicar y contestar tienen su propio nivel</b>. Y hay dos verdades que
          no dependen del dial: el panel de 5 puntúa cada pieza antes de que salga, y la vigilancia del nicho no se
          puede bajar —es lo que hace que el equipo nunca esté quieto y no cuesta créditos.
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
          No los elegís vos: el motor los aplica a tu cuenta y valen también cuando el equipo trabaja solo. Protegen
          tu cuenta, tu contenido y tu nombre.
        </div>
        <div className="guards">
          {GUARDRAILS_CREADOR.map(g => (
            <div key={g.nombre} className="guard">
              <I_Lock size={14} style={{ color: 'var(--purple3)', flexShrink: 0 }} />
              <span className="guard-lb">{g.nombre}<small>{g.porQue}</small></span>
              <span className="guard-val">{g.valor}</span>
            </div>
          ))}
        </div>

        <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
          <div className="dato"><span className="dato-l">Frenos activos</span><span className="dato-v" style={{ color: 'var(--green)' }}>{GUARDRAILS_CREADOR.length}</span></div>
          <div className="dato"><span className="dato-l">Acciones que te esperan</span><span className="dato-v">{esperan} de {AUTONOMIA_CREADOR.length}</span></div>
          <div className="dato"><span className="dato-l">Publicar sin verificar</span><span className="dato-v" style={{ color: 'var(--amber)' }}>{FRENO_PANEL.valor}</span></div>
          <div className="dato"><span className="dato-l">Una publicación que ya salió</span><span className="dato-v" style={{ color: 'var(--purple3)' }}>{FRENO_PUBLICADA.valor}</span></div>
        </div>

        <div className="bs" style={{ marginTop: 11 }}>
          Dos ejemplos de lo que hacen: <b>{FRENO_PANEL.nombre.toLowerCase()}</b> ({FRENO_PANEL.valor.toLowerCase()}): una
          pieza que no llega al puntaje no sale, vuelve con la objeción y se vuelve a producir. Y <b>{FRENO_PUBLICADA.nombre.toLowerCase()}</b>:
          el equipo no edita ni borra una publicación que ya salió con tu nombre.
        </div>

        <div className="row" style={{ gap: 9, marginTop: 12, flexWrap: 'wrap' }}>
          <Button variant="outline" className="btn-sm"
            title={`Abre los ${GUARDRAILS_CREADOR.length} guardrails con su valor real y por qué protegen: no cambia nada, es para que sepas con qué trabaja tu cuenta.`}
            onClick={abrirGuardrails}><I_Eye size={13} /> Cómo te protegen</Button>
          <Button variant="ghost" className="btn-sm"
            title="Te muestra en qué estado está tu verificación, por qué es obligatoria antes de publicar y qué sigue andando mientras tanto."
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
            title={`Abre los 4 pasos de cómo te llega una decisión por ${canal}, con lo que el equipo puede preguntarte y por dónde. No cambia nada.`}
            onClick={abrirCanal}><I_Chat size={13} /> Ver cómo llega una aprobación <I_ArrowRight size={13} /></Button>
        </div>
        <div className="acc-why">
          <b>Lo que se publica nunca sale de un aviso:</b> llega al chat con la pieza ya escrita y su motivo, y recién
          sale cuando respondés. Lo que apruebes desde el chat queda en la bitácora como cualquier otra acción.
        </div>
      </Card>
    </div>
  );
}

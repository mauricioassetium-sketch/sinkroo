import { useEffect, useState } from 'react';
import { Card, Badge, Button, Dinero, NotaMoneda } from '../components/ui';
import { EquipoInvestigando } from '../components/EquipoInvestigando';
import { Bars, Ring, BarRow, MetricaAnillo } from '../components/viz';
import { usePerfil, nombreDePila } from '../lib/perfil';
import { SinkrooMark, I_Check, I_ArrowRight, I_Wallet, I_Eye, I_Vote, I_Star, I_Sun, I_Zap, I_Trend, I_Clock } from '../components/icons';
import type { Vista } from '../components/Layout';
import { useDetalle, type Bloque } from '../components/Detalle';
import {
  ALARMAS, DECISIONES, NUMEROS, MIENTRAS_NO_ESTABAS, BITACORA, MODOS, CONSECUENCIA,
  MES, PANEL_PIEZAS, INVESTIGACION_MERCADO,
  type Alarma, type Decision, type EntradaBitacora, type Modo, type Severidad,
} from '../data/demo';

const SEV_LB: Record<Severidad, string> = { critico: 'CRÍTICO', atencion: 'ATENCIÓN', oportunidad: 'OPORTUNIDAD', info: 'RESUELTO SOLO' };

// =============================================================================================
// LOS NÚMEROS DE LA META DEL MES
//
// Son los mismos que muestra el panel (NUMEROS · Ventas del mes, el cierre proyectado y los días
// que quedan). Los cálculos de abajo son todos consecuencia de estos: lo que falta, lo que hay que
// vender por día y el gasto que insume al ROAS de hoy. La meta la elige el dueño; el motor sólo
// dice si entra o no en los frenos que él mismo configuró (techo de $120/día y el gasto de hoy).
// =============================================================================================
const VENTAS_MES = 4280;
const META_MES = 6000;
const CIERRE_AL_RITMO = 5650;
const DIAS_RESTANTES = 8;
const ROAS_HOY = 3.8;
const TECHO_DIA = 120;
const GASTO_DIA = 88;
const MARGEN_TECHO = TECHO_DIA - GASTO_DIA;

/** Las metas que se pueden pedir: el cierre proyectado, la de hoy y una más exigente. */
const METAS = [CIERRE_AL_RITMO, META_MES, 7000];

/** Todo importe que se escribe en un texto sale de acá: los miles se muestran como en el resto del panel ($6.000). */
const money = (n: number) => '$' + n.toLocaleString('es-AR');
const faltaPara = (meta: number) => Math.max(0, meta - VENTAS_MES);
const porDiaPara = (meta: number) => Math.round(faltaPara(meta) / DIAS_RESTANTES);
/** El plan: el hueco que queda al ritmo de hoy, lo que hay que vender por día y el gasto que insume. */
const planPara = (meta: number) => {
  const hueco = Math.max(0, meta - CIERRE_AL_RITMO);
  const ventaDia = Math.round(hueco / DIAS_RESTANTES);
  const gastoDia = Math.round(ventaDia / ROAS_HOY);
  return { hueco, ventaDia, gastoDia, alcanza: gastoDia <= MARGEN_TECHO };
};
type Plan = { meta: number; hueco: number; ventaDia: number; gastoDia: number; alcanza: boolean };

/** El día en que vuelve una alarma silenciada: se calcula, no se escribe a mano. */
const enUnaSemana = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });

// =============================================================================================
// LO QUE HAY DETRÁS DE CADA BOTÓN
//
// Las alarmas y la bitácora traen el dato y el nombre del artefacto: acá está el contenido de ese
// artefacto, con los números que dejó la acción. Nada nuevo: lo que el motor ya calculó.
// =============================================================================================

/** El detalle de cada alarma: qué miró el motor para ponerla, con los números y su origen. */
const ALARMA_DETALLE: Record<string, Bloque[]> = {
  a1: [
    { tipo: 'datos', filas: [
      { k: 'CPA de «Lanzamiento D2C»', v: '$28', tono: 'red', s: 'era $20: $8 más por cada venta' },
      { k: 'Si no lo tocás esta semana', v: '$240', tono: 'amber', s: 'es lo que cuesta dejarlo así' },
      { k: 'Gasto del día', v: '$88 de $120', s: 'el techo diario está puesto y todavía hay margen' },
      { k: 'El conjunto que se pausa', v: '«lookalike frío»', s: 'gasta sin convertir' },
      { k: 'Cuánto se mueve', v: '$40/día', s: 'pasa al conjunto que sí convierte' },
    ] },
    { tipo: 'aviso', tono: 'green', texto: 'Pausar es reversible 24 h: si el conjunto vuelve a rendir, se reactiva con el mismo presupuesto desde la bitácora.' },
  ],
  a2: [
    { tipo: 'texto', texto: 'Valeria G. escribió por WhatsApp y quedó esperando: preguntó si hacés envíos a CABA. Rumi tiene la respuesta armada desde hace 4 h.' },
    { tipo: 'datos', filas: [
      { k: 'Esperando desde', v: '4 h', tono: 'red', s: 'te escribió a las 10:24' },
      { k: 'Si queda sin respuesta', v: '40% no vuelve', tono: 'amber', s: 'es un lead caliente que se enfría' },
      { k: 'La respuesta lista', v: '2 a 4 días hábiles', s: 'envío a CABA, sin cargo' },
      { k: 'Qué miró Rumi antes', v: 'Su conversación', s: 'quiere piel mixta y el serum le sirve' },
    ] },
  ],
  a3: [
    { tipo: 'datos', filas: [
      { k: 'Precio de Tienda Norte', v: '$29', tono: 'amber', s: 'bajó 15%: vos estás en $34' },
      { k: 'Anuncios que tiene corriendo', v: '14', s: 'contra 6 tuyos' },
      { k: 'Lo que no hay que hacer', v: 'Bajar el precio', tono: 'red', s: 'te deja sin margen y puede volver a bajar' },
      { k: 'Con qué se responde', v: 'Ingredientes limpios', s: 'Nia ya escribió 6 variantes con ese ángulo' },
    ] },
    { tipo: 'aviso', tono: 'amber', texto: 'Las 6 variantes ya están escritas y el panel ya las puntuó: se abren en Mercado sin gastar nada.' },
  ],
  a4: [
    { tipo: 'datos', filas: [
      { k: 'Créditos disponibles', v: '1.760', s: 'plan Pro: 5.000 por mes' },
      { k: 'Días de autonomía', v: '12', tono: 'amber', s: 'a este ritmo el motor se detiene el 5 de octubre' },
      { k: 'Auto-recarga', v: 'Al bajar de 500', s: 'ya la tenés configurada en el plan Pro' },
      { k: 'Qué se frena si se corta', v: 'La vigilancia', s: 'cada 15 minutos, y no gasta IA' },
    ] },
  ],
  a5: [
    { tipo: 'datos', filas: [
      { k: 'Búsquedas de «serum vitamina C»', v: '+32%', tono: 'green', s: 'últimos 30 días en tu zona' },
      { k: 'Formato que más crece', v: 'Before/after', s: 'genera 3,1x más clics' },
      { k: 'Quién lo está usando', v: '21 de 47 anuncios', s: 'de los 6 competidores que vigilás' },
      { k: 'Tus piezas con ese formato', v: '2', s: 'el serum (84) y el protector solar (88)' },
    ] },
  ],
  a6: [
    { tipo: 'datos', filas: [
      { k: 'Qué hizo', v: 'Pausó el conjunto', s: '«lookalike frío», a las 03:12' },
      { k: 'Gasto sin retorno que evitó', v: '$180', tono: 'green', s: 'lo que iba a quemar durante la noche' },
      { k: 'Ahora', v: 'Reversible 24 h', s: 'si vuelve a rendir, se reactiva con el mismo presupuesto' },
    ] },
  ],
};

/** Lo que pasa cuando la alarma se resuelve: la línea que queda a la vista en la tarjeta. */
const HACER_TXT: Record<string, string> = {
  'Aplicar sugerencia': 'el conjunto «lookalike frío» quedó pausado y sus $40/día pasaron al que sí convierte. Reversible 24 h desde la bitácora.',
  'Dejar que Rumi responda': 'Rumi le contestó a Valeria G. por tu WhatsApp: envío a CABA en 2 a 4 días hábiles. La conversación queda en tu bandeja.',
  'Activar auto-recarga': 'auto-recarga activa: el próximo paquete de créditos se paga solo cuando bajás de 500. La podés apagar cuando quieras.',
  'Crear campaña': 'borrador creado con el formato que sube (before/after: +41%): está en Campañas y todavía no gastó nada.',
  'Deshacer': '«lookalike frío» vuelve a estar activo, con el mismo presupuesto que tenía a las 03:12.',
};

/** El paso que sigue, al pie del panel de cada alarma. `vista` navega; `hacer` resuelve la alarma. */
const ALARMA_FOOTER: Record<string, { label: string; vista?: Vista; hacer?: string }[]> = {
  a1: [{ label: 'Pausar el conjunto «lookalike frío»', hacer: 'Aplicar sugerencia' }],
  a2: [{ label: 'Mandarle la respuesta de Rumi', hacer: 'Dejar que Rumi responda' }],
  a3: [{ label: 'Ver las 6 variantes en Mercado', vista: 'mercado' }],
  a4: [{ label: 'Ver el detalle de créditos', vista: 'creditos' }],
  a5: [{ label: 'Ver el mercado', vista: 'mercado' }],
  a6: [{ label: 'Reactivar el conjunto', hacer: 'Deshacer' }],
};

/** El contenido del artefacto que dejó cada línea de la bitácora. */
const BITACORA_ARTEFECTO: Record<string, Bloque[]> = {
  b1: [
    { tipo: 'texto', texto: 'Las 6 variantes salen del ángulo «resultado», el que el panel puntúa 12% mejor que «precio». Estas son las que pasaron el panel:' },
    { tipo: 'filas', items: PANEL_PIEZAS.filter(p => p.veredicto !== 'stop').slice(0, 4).map(p => ({
      t: `${p.titulo} (${p.tipo})`,
      s: p.score >= 80 ? 'pasa: se publica, está arriba de 80' : 'se revisa: está entre 60 y 80',
      etiqueta: String(p.score), tono: p.score >= 80 ? 'green' : 'amber',
    })) },
    { tipo: 'datos', filas: [
      { k: 'Variantes escritas', v: '6', s: 'las mismas de la galería de Campañas' },
      { k: 'Lo que costó', v: '96 créditos', s: '6 variantes × 16 créditos' },
      { k: 'Dónde está ahora', v: 'Campañas · la galería', s: 'con el puntaje de cada una' },
    ] },
  ],
  b2: [
    { tipo: 'datos', filas: [
      { k: 'CPA cuando lo pausó', v: '$28', tono: 'red', s: 'había subido 40%: arrancó en $20' },
      { k: 'Gasto sin retorno que evitó', v: '$180', tono: 'green', s: 'lo que iba a quemar durante la noche' },
      { k: 'Cuándo lo hizo', v: '11:18', s: 'sin preguntarte: es un freno que no puede esperar' },
      { k: 'Reversible', v: '24 h', s: 'desde la bitácora, con el mismo presupuesto' },
    ] },
  ],
  b3: [
    { tipo: 'datos', filas: [
      { k: 'Anuncios leídos', v: '47', s: 'de los 6 competidores de tu zona' },
      { k: 'El que más corre', v: 'Tienda Norte · 14', s: 'bajó el precio a $29' },
      { k: 'Formato que se impone', v: 'Before/after', s: 'lo usan 21 de esos 47' },
      { k: 'Cada cuánto mira', v: INVESTIGACION_MERCADO.cadencia, s: `la última lectura fue ${INVESTIGACION_MERCADO.ultimaRevision}` },
    ] },
  ],
  b5: [
    { tipo: 'datos', filas: [
      { k: 'Ventas cerradas por WhatsApp', v: '2', s: 'en la mañana, sin que intervinieras' },
      { k: 'Mensajes de hoy', v: '128', s: '94% los contestó la IA' },
      { k: 'Conversaciones atendidas', v: '12 de 15', s: 'de las que entraron hoy' },
    ] },
    { tipo: 'texto', texto: 'La que quedó esperando es Valeria G.: preguntó si hacés envíos a CABA y su respuesta está lista en «Tu decisión», acá arriba.' },
  ],
  b6: [
    { tipo: 'datos', filas: [
      { k: 'Lo que predijo', v: '84', s: 'antes de que la campaña saliera' },
      { k: 'Lo que pasó', v: '79', tono: 'amber', s: '5 puntos abajo: el modelo venía optimista' },
      { k: 'La corrección', v: '6% menos', tono: 'green', s: 'la próxima estimación se queda corta un 6% menos' },
    ] },
  ],
};

/** El recorrido de Tu día: cada parada apunta a una parte de la pantalla y la explica. */
const PASOS_TOUR: { sel: string; t: string; d: string }[] = [
  { sel: '[data-tour="hero"]', t: 'Tu día, en una línea',
    d: 'Lo de arriba es de hoy: 47 ventas concretadas, 3,8x de retorno por cada dólar invertido y 83 de calidad en la pieza aprobada. Todo sale de tus conexiones: Meta Ads, tu WhatsApp y tu tienda.' },
  { sel: '#motor', t: 'Tu equipo, trabajando ahora',
    d: `Los 6 agentes revisan tu mercado ${INVESTIGACION_MERCADO.cadencia} y no paran: ${INVESTIGACION_MERCADO.revisiones} revisiones desde que terminaste el onboarding, la última ${INVESTIGACION_MERCADO.ultimaRevision}. Miran ${INVESTIGACION_MERCADO.zona}.` },
  { sel: '[data-tour="alarmas"]', t: 'Lo que necesita tu atención',
    d: 'Cada alarma dice qué pasó, cuánto te cuesta si no actuás y qué sugiere el motor. Los botones trabajan sobre tu campaña de verdad y podés deshacer 24 h: por eso al lado está «Tu decisión», con lo que espera tu OK.' },
  { sel: '[data-tour="decisiones"]', t: 'Lo que espera tu OK',
    d: 'En modo Compartido el motor no publica ni gasta sin vos. Cada tarjeta trae el veredicto de los 5 jueces: tocá «Ver el veredicto» y te dice cuántos aprobaron y qué objetó el más duro.' },
  { sel: '[data-tour="metas"]', t: 'Cómo vas contra tus metas',
    d: `El mes va en $4.280 de $6.000: faltan $1.720 en 8 días, $215 por día. Con «Pedir un plan para llegar» el motor te dice cómo cerrar esa diferencia sin subir el gasto, y con «Ajustar la meta» la cambiás vos.` },
];

export function ViewHoy({ setToast, setVista, modo }: { setToast: (t: string) => void; setVista: (v: Vista) => void; modo: Modo }) {
  // Ve el perfil que se está editando (así el logo y el nombre se ven al instante al subirlos).
  const { perfilVisible: perfil } = usePerfil();
  const detalle = useDetalle();
  const [hechas, setHechas] = useState<string[]>([]);
  const [alarmasExtra, setAlarmasExtra] = useState(false);
  const [bitacoraCompleta, setBitacoraCompleta] = useState(false);
  // --- Lo que el dueño ya hizo, para que se vea en la pantalla y no en un aviso que se va solo.
  /** Alarmas resueltas: id → la acción que se ejecutó. Queda la línea verde en la tarjeta. */
  const [atendidas, setAtendidas] = useState<Record<string, string>>({});
  /** Alarmas que el dueño escondió: vuelven solas a los 7 días. */
  const [silenciadas, setSilenciadas] = useState<string[]>([]);
  /** Lo que ya decidió hoy: la lista que queda al pie de «Tu decisión». */
  const [resueltas, setResueltas] = useState<{ id: string; agente: string; color: string; titulo: string; accion: string }[]>([]);
  /** Líneas de la bitácora que se reactivaron (volver atrás una pausa). */
  const [reactivadas, setReactivadas] = useState<string[]>([]);
  // --- La meta del mes y el plan para llegar: los dos cambian la pantalla, no un aviso.
  const [metaVentas, setMetaVentas] = useState(META_MES);
  const [editandoMeta, setEditandoMeta] = useState(false);
  const [planActivo, setPlanActivo] = useState<Plan | null>(null);
  // --- El tour guiado: overlay con foco sobre cada parte de Tu día.
  const [paso, setPaso] = useState<number | null>(null);
  const [tourVisto, setTourVisto] = useState(false);

  const visibles = ALARMAS.filter(a => !silenciadas.includes(a.id));
  const alarmas = alarmasExtra ? visibles : visibles.slice(0, 3);
  const pendientes = DECISIONES.filter(d => !hechas.includes(d.id));
  const modoNombre = MODOS.find(m => m.key === modo)?.nombre ?? '';
  // Las críticas bajan a medida que se resuelven: el número del encabezado es el que queda vivo.
  const criticas = visibles.filter(a => a.severidad === 'critico' && !atendidas[a.id]).length;

  // --- La meta: todo lo que se muestra sale de acá.
  const P = planPara(metaVentas);
  const faltaVentas = faltaPara(metaVentas);
  const porDiaVentas = porDiaPara(metaVentas);
  const pctVentas = Math.min(100, Math.round(VENTAS_MES / metaVentas * 100));
  const metasOk = 2 + (P.alcanza ? 1 : 0);
  const cierreProyectado = planActivo && planActivo.alcanza ? Math.max(CIERRE_AL_RITMO, planActivo.meta) : CIERRE_AL_RITMO;

  // -------------------------------------------------------------------------------------------
  // ALARMAS: cada botón o abre el detalle, o resuelve la alarma, o la esconde. Nada de avisos.
  // -------------------------------------------------------------------------------------------
  const hacerAlarma = (a: Alarma, ac: string) => {
    setAtendidas({ ...atendidas, [a.id]: ac });
    setToast(`${ac} · ${a.titulo}`);
  };
  const silenciarAlarma = (a: Alarma) => {
    setSilenciadas([...silenciadas, a.id]);
    setToast(`«${a.titulo}» queda silenciada 7 días`);
  };
  const titleAlarma = (a: Alarma, ac: string) => {
    if (ac.startsWith('Silenciar')) return `Esconde esta alarma de la lista 7 días: vuelve sola el ${enUnaSemana()}. Reversible: la podés volver a mostrar cuando quieras.`;
    if (HACER_TXT[ac]) return `${CONSECUENCIA[a.id] ?? ac} Queda a la vista en la tarjeta.`;
    return 'Abre lo que el motor miró para ponerte esta alarma: los números, lo que cuesta y el paso que sigue. No cambia nada hasta que lo confirmes.';
  };
  const verAlarma = (a: Alarma, ac: string) => {
    const pie = ALARMA_FOOTER[a.id] ?? [];
    detalle({
      titulo: a.titulo,
      sub: a.impacto,
      bloques: [
        { tipo: 'texto', texto: `Qué sugiere el motor: ${a.sugerencia}` },
        ...(ALARMA_DETALLE[a.id] ?? []),
      ],
      fuente: `${a.origen} · ${a.cuando} · entró a la pantalla por «${ac}»`,
      acciones: pie.length > 0 ? pie.map(x => ({
        label: x.label,
        variante: 'primary' as const,
        onClick: () => x.vista ? setVista(x.vista) : hacerAlarma(a, x.hacer ?? ''),
      })) : undefined,
    });
  };
  const accionAlarma = (a: Alarma, ac: string) => {
    if (ac.startsWith('Silenciar')) { silenciarAlarma(a); return; }
    if (HACER_TXT[ac]) { hacerAlarma(a, ac); return; }
    verAlarma(a, ac);
  };

  // -------------------------------------------------------------------------------------------
  // DECISIONES: al resolver, la tarjeta sale del pendiente y queda la línea de lo decidido.
  // -------------------------------------------------------------------------------------------
  const resolver = (d: Decision, accion: string) => {
    if (hechas.includes(d.id)) return;
    setHechas([...hechas, d.id]);
    setResueltas([{ id: d.id, agente: d.agente, color: d.agenteColor, titulo: d.titulo, accion }, ...resueltas]);
    setToast(`${accion} · ${d.titulo}`);
  };

  // -------------------------------------------------------------------------------------------
  // BITÁCORA: el artefacto se abre, y lo que es reversible se deshace de verdad.
  // -------------------------------------------------------------------------------------------
  const verArtefacto = (b: EntradaBitacora) => {
    if (!b.artefacto) return;
    detalle({
      titulo: `${b.artefacto} · ${b.ancla}`,
      sub: `${b.agente} lo dejó a las ${b.cuando}: ${b.texto}.`,
      bloques: BITACORA_ARTEFECTO[b.id] ?? [{ tipo: 'texto', texto: `${b.texto}. El registro completo de ${b.ancla} queda en la bitácora.` }],
      fuente: `Bitácora de hoy · ${b.cuando} · ${b.agente} · todo lo que se hizo sobre ${b.ancla}`,
      acciones: b.undo && !reactivadas.includes(b.id)
        ? [{ label: 'Reactivar y que vuelva como estaba', variante: 'primary', onClick: () => { setReactivadas([...reactivadas, b.id]); setToast(`Reactivado: ${b.ancla} vuelve como estaba`); } }]
        : undefined,
    });
  };
  const toggleReactivar = (b: EntradaBitacora) => {
    const ya = reactivadas.includes(b.id);
    setReactivadas(ya ? reactivadas.filter(x => x !== b.id) : [...reactivadas, b.id]);
    setToast(ya ? `«${b.ancla}» vuelve a estar en pausa` : `«${b.ancla}» vuelve a estar activa con su presupuesto de $40/día`);
  };

  // -------------------------------------------------------------------------------------------
  // EL PLAN PARA LLEGAR Y LA META: los dos terminan en un cambio a la vista en la tarjeta.
  // -------------------------------------------------------------------------------------------
  const panelPlan = (meta: number, activo: boolean) => {
    const p = planPara(meta);
    const falta = faltaPara(meta);
    detalle({
      titulo: activo ? `Tu plan para llegar a ${money(meta)}` : 'El plan para llegar a la meta del mes',
      sub: `La meta está en ${money(meta)} y el mes va en ${money(VENTAS_MES)}: faltan ${money(falta)} en ${DIAS_RESTANTES} días. El motor no gasta más para llegar: reasigna lo que ya tenés.`,
      bloques: [
        { tipo: 'datos', filas: [
          { k: 'Acumulado del mes', v: `${money(VENTAS_MES)}`, s: `sobre una meta de ${money(meta)} (${pctVentas}%)` },
          { k: 'Falta por vender', v: `${money(falta)}`, s: `${money(porDiaPara(meta))}/día durante los ${DIAS_RESTANTES} días que quedan` },
          { k: 'Cierre al ritmo de hoy', v: `${money(CIERRE_AL_RITMO)}`, tono: p.hueco > 0 ? 'amber' : 'green', s: 'es lo que pasa si no se toca nada' },
          { k: 'El hueco a cerrar', v: `${money(p.hueco)}`, tono: p.hueco > 0 ? 'amber' : 'green', s: p.hueco > 0 ? `${money(p.ventaDia)}/día de venta` : 'el ritmo de hoy ya alcanza la meta' },
          { k: 'Gasto extra que insume', v: `${money(p.gastoDia)}/día`, tono: p.alcanza ? 'green' : 'red', s: `al ROAS de hoy (${ROAS_HOY}x): el gasto del día va en ${money(GASTO_DIA)} y quedan ${money(MARGEN_TECHO)} antes del techo de ${money(TECHO_DIA)}` },
        ] },
        { tipo: 'pasos', items: [
          'Mover los $40/día de TikTok a Meta: el clic pasa de $4,20 a $2,10 y el mismo gasto compra el doble de clics.',
          'Poner ese presupuesto detrás de las 2 piezas con score más alto: «Antes y Después — Protector solar» (88) y «Antes y Después — Serum Vitamina C» (84).',
          `Sostener el ROAS en ${ROAS_HOY}x, que hoy está arriba de la meta de 3,5x.`,
          'Revisar cada 3 días y avisarte si la meta deja de ser alcanzable con el presupuesto actual.',
        ] },
        { tipo: 'aviso', tono: p.alcanza ? 'green' : 'amber', texto: p.alcanza
          ? `Entra en tus frenos: el cambio de presupuesto es de ±20% por acción y el gasto del día (${money(GASTO_DIA)}) queda por debajo del techo de ${money(TECHO_DIA)}.`
          : `Con el techo de ${money(TECHO_DIA)}/día no alcanza: hacen falta ${money(p.gastoDia)}/día de gasto extra y sólo quedan ${money(MARGEN_TECHO)} antes del techo. O bajás la meta, o subís el techo.` },
      ],
      fuente: 'Sale de tus números del mes y del movimiento que ya hizo Kai: $40/día de TikTok a Meta, con el clic a $4,20 y a $2,10.',
      acciones: activo
        ? [
          { label: 'Quitarlo', variante: 'primary', onClick: () => { setPlanActivo(null); setToast('Plan quitado: la meta del mes queda como estaba'); } },
          { label: 'Dejarlo activo', onClick: () => setToast('El plan sigue activo: Kai lo revisa cada 3 días') },
        ]
        : p.hueco === 0
          ? [{ label: 'Cerrar', onClick: () => setToast('Sin cambios: el ritmo de hoy ya alcanza la meta') }]
          : [
            { label: 'Activar el plan', variante: 'primary', onClick: () => { setPlanActivo({ meta, ...p }); setToast(`Plan activo para llegar a ${money(meta)}`); } },
            { label: 'Dejarlo para después', onClick: () => setToast('Sin cambios: la meta del mes queda como está') },
          ],
    });
  };

  return (
    <div className="dash">
      {/* ============================== HERO ============================== */}
      <div className="hero card" data-tour="hero">
        <div className="hero-side">
          <div className="hero-greet">
            {/* El logo del cliente manda en el hero: es SU panel. El búho de Sinkroo queda como
                marca del producto en el sidebar y también acá mientras no haya logo propio. */}
            <span className={`hero-logo ${perfil.logo ? 'propio' : ''}`}
              title={perfil.logo
                ? `El logo de ${perfil.marca}: así se ve tu marca en tu panel`
                : 'Sinkroo. Cargá el logo de tu marca en «Hacé tuyo este panel» y aparece acá'}>
              {perfil.logo
                ? <img className="marca-logo" src={perfil.logo} alt={`Logo de ${perfil.marca}`} />
                : <SinkrooMark size={136} />}
              {perfil.logo ? <span className="hero-logo-lb">{perfil.marca}</span> : null}
            </span>
            <div className="hero-txt">
              <div className="hero-live" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="dot-live" /> TU AGENTE DE MARKETING ESTÁ ACTIVO
                <button className="tour-start-btn"
                  title={tourVisto
                    ? 'Volvés a recorrer Tu día desde la primera parada, con los números de hoy. Se cierra con Escape o tocando afuera.'
                    : 'Recorrido de 5 paradas por Tu día: qué mirar, en qué orden y con qué números. Se cierra con Escape o tocando afuera.'}
                  onClick={() => { setPaso(0); setTourVisto(true); }}>
                  {tourVisto ? '↻ Repetir el tour' : '▶ Iniciar tour'}
                </button>
              </div>
              <div className="hdr-t hero-title">
                Hola {nombreDePila(perfil.nombre)}, soy <span className="grad-text">Sinkroo</span> 👋
              </div>
              <div className="hdr-s hero-sub">
                <b>Tu marketing, en automático.</b><br />
                Pruebo cada publicación con <b>500 personas como tu audiencia</b>. Antes de que gastes.
              </div>
            </div>
          </div>
        </div>
        <div className="hero-metrics">
          <div className="hero-metric"><div className="metric" style={{ color: 'var(--green)' }}>47</div><div className="m-label">Ventas</div><div className="m-desc">concretadas hoy</div></div>
          <div className="hero-metric"><div className="metric" style={{ color: 'var(--green)' }}>3.8x</div><div className="m-label">ROAS</div><div className="m-desc">retorno por cada $1 invertido</div></div>
          <div className="hero-metric"><div className="metric grad-text">83</div><div className="m-label">Score</div><div className="m-desc">calidad del creativo aprobado</div></div>
        </div>
        <div className="hero-start">
          <div className="hero-ad-tag">EMPEZÁ ACÁ</div>
          <div className="hero-ad-title">Tu primera campaña</div>
          <div className="hero-ad-sub">
            Decís qué querés publicar y subís tu material: el motor la crea, el panel la aprueba
            y recién ahí sale a tus redes. <b>No gasta un peso antes.</b>
          </div>
          <button className="hero-ad-btn" title="Te lleva a «Qué querés publicar», el primer paso: ahí arranca el modelo"
            onClick={() => { setVista('campanas'); setToast('Arrancá por acá: decí qué querés publicar'); }}>
            Crear la primera →
          </button>
        </div>
      </div>

      {/* ============== LA INVESTIGACIÓN DEL MERCADO (los 6 agentes, en vivo) ============== */}
      <div id="motor">
        <EquipoInvestigando setToast={setToast}
          irAGaleria={() => {
            setVista('campanas');
            setToast('En Campañas, entrá al paso «Galería»: ahí están las piezas que MiroFish ya puntuó');
          }} />
      </div>

      {/* ====================== FILA 1: ACCIÓN ====================== */}
      <div className="csec">
        <span className="csec-n">1</span>
        <span className="csec-t">Lo que necesita tu atención</span>
        <span className="csec-c">{criticas}</span>
        <span className="csec-s">Cada botón dice qué hace antes de que lo toques</span>
      </div>
      <div className="duo">
        <Card tour="alarmas"
          title={<span className="row" style={{ gap: 8 }}><I_Zap size={14} style={{ color: 'var(--red)' }} /> Alarmas</span>}
          action={<Badge tone="red">{criticas === 1 ? '1 crítica' : `${criticas} críticas`}</Badge>}
        >
          <div className="col-stack">
            {alarmas.map(a => (
              <div key={a.id} className={`alarm ${a.severidad}`}>
                <div className="alarm-head">
                  <span className={`alarm-sev ${a.severidad}`}>{SEV_LB[a.severidad]}</span>
                  <span className="alarm-when">{a.cuando}</span>
                  {atendidas[a.id] ? <Badge tone="green">resuelta</Badge> : null}
                </div>
                <div className="alarm-title" style={{ minWidth: 0 }}>{a.titulo}</div>
                <div className="alarm-money">
                  <span className="ico" style={{ color: 'var(--amber)' }}><I_Wallet size={14} /></span>
                  <span><b style={{ color: 'var(--amber)' }}>Por qué importa: </b>{a.impacto}</span>
                </div>
                <div className="alarm-sug"><b>Qué sugiere la IA: </b>{a.sugerencia}</div>
                {atendidas[a.id] ? (
                  <div className="tiny" style={{ display: 'flex', alignItems: 'flex-start', gap: 7, color: 'var(--green)', fontWeight: 700, lineHeight: 1.5 }}>
                    <I_Check size={13} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>Listo: {HACER_TXT[atendidas[a.id]]}</span>
                  </div>
                ) : (
                  <div className="alarm-acts">
                    {a.acciones.map((ac, i) => (
                      <Button key={ac} variant={i === 0 ? 'primary' : 'ghost'} className="btn-sm"
                        title={titleAlarma(a, ac)}
                        onClick={() => accionAlarma(a, ac)}>
                        {i === 0 ? <I_Check size={13} /> : null} {ac}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {!alarmasExtra && visibles.length > 3 && (
              <Button variant="ghost" className="btn-sm" title={`Muestra las ${visibles.length - 3} alarmas restantes, incluidas las oportunidades`}
                onClick={() => setAlarmasExtra(true)}>
                Ver {visibles.length - 3} alarmas más <I_ArrowRight size={13} />
              </Button>
            )}
            {silenciadas.length > 0 && (
              <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
                <span className="tiny muted">
                  {silenciadas.length === 1 ? '1 alarma silenciada' : `${silenciadas.length} alarmas silenciadas`} hasta el {enUnaSemana()}: no cuentan como pendientes.
                </span>
                <Button variant="ghost" className="btn-sm" title="Vuelven ahora las alarmas que escondiste, sin esperar los 7 días"
                  onClick={() => { setSilenciadas([]); setToast('Las alarmas silenciadas vuelven a estar a la vista'); }}>
                  <I_Eye size={13} /> Volver a mostrarlas
                </Button>
              </div>
            )}
            <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
              <div className="dato"><span className="dato-l">Revisiones de hoy</span><span className="dato-v">14</span></div>
              <div className="dato"><span className="dato-l">En riesgo si no actuás</span><span className="dato-v" style={{ color: 'var(--amber)' }}><Dinero monto={180} /></span></div>
              <div className="dato"><span className="dato-l">Resueltas solas</span><span className="dato-v" style={{ color: 'var(--green)' }}>6</span></div>
            </div>
            <div className="acc-why">
              La vigilancia corre <b>cada 15 minutos</b> y no gasta IA: compara tus números contra los de ayer.
              Solo cuando algo se sale de lo normal entra un agente a mirarlo.
            </div>
          </div>
        </Card>

        <Card tour="decisiones"
          title={<span className="row" style={{ gap: 8 }}><I_Vote size={14} style={{ color: 'var(--amber)' }} /> Tu decisión</span>}
          action={pendientes.length > 0 ? <Badge tone="amber">{pendientes.length} esperan</Badge> : <Badge tone="green">al día</Badge>}
        >
          {pendientes.length === 0 ? (
            <div className="col-empty"><I_Check size={15} /> Nada te espera. El motor siguió trabajando solo.</div>
          ) : (
            <div className="col-stack">
              {pendientes.map(d => <Decision key={d.id} d={d} onResolver={resolver} />)}
            </div>
          )}
          {resueltas.length > 0 && (
            <div style={{ marginTop: 13, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <div className="bs" style={{ marginBottom: 8 }}>Lo que ya decidiste hoy:</div>
              {resueltas.map(r => (
                <div key={r.id} className="tiny" style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontWeight: 700, marginBottom: 6, lineHeight: 1.5 }}>
                  <I_Check size={13} style={{ color: 'var(--green)', flexShrink: 0, marginTop: 2 }} />
                  <span><b style={{ color: r.color }}>{r.agente}</b> · {r.accion} «{r.titulo}»</span>
                </div>
              ))}
              <div className="tiny muted">
                Lo aprobado salió a tus cuentas y lo descartado queda registrado en la bitácora, con la hora y quién lo decidió.
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* ====================== FILA 2: LOS NÚMEROS DEL MES Y LA CALIDAD ====================== */}
      <div className="csec">
        <span className="csec-n">2</span>
        <span className="csec-t">Los números del mes y la calidad de lo que produjo</span>
        <span className="csec-s">Cómo van las métricas del modelo y qué tan buenas salieron las piezas</span>
      </div>
      <div className="duo">
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Trend size={14} style={{ color: 'var(--green)' }} /> El modelo en números</span>}
          action={<Badge tone="purple">este mes</Badge>}
        >
          <div className="met-grid">
            {NUMEROS.map((n, i) => (
              <MetricaAnillo key={i} label={n.label} valor={<Dinero monto={n.valor} />} delta={n.delta} pct={n.pct}
                meta={<Dinero monto={n.meta} equivalente={false} />} color={n.color} up={n.up} />
            ))}
          </div>
          <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <div className="dato"><span className="dato-l">Acumulado del mes</span><span className="dato-v" style={{ color: 'var(--green)' }}><Dinero monto={MES.acumulado} /></span></div>
            <div className="dato"><span className="dato-l">Crecimiento mensual</span><span className="dato-v" style={{ color: 'var(--green)' }}>+28%</span></div>
            <div className="dato"><span className="dato-l">Dato más viejo</span><span className="dato-v">hace 12 meses</span></div>
          </div>
          <div>
            <div className="bs" style={{ marginBottom: 8 }}>Lo que más se movió este mes, contra el mes pasado:</div>
            <BarRow label="Ventas" valor={18} max={22} sufijo="%" color="var(--green)" formato="+18" />
            <BarRow label="Alcance" valor={22} max={22} sufijo="%" color="var(--purple2)" formato="+22" />
            <BarRow label="ROAS" valor={12} max={22} sufijo="%" color="var(--green)" formato="+12" />
            <BarRow label="Autonomía" valor={9} max={22} sufijo=" días" color="var(--amber)" formato="-9" />
          </div>
          <div className="acc-why">
            Todos salen de tus conexiones reales: Meta Ads, tu WhatsApp y tu tienda.{' '}
            <b>Días de autonomía</b> es cuánto puede seguir trabajando el motor con los créditos que tenés.
          </div>
          <NotaMoneda />
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Star size={14} style={{ color: 'var(--purple3)' }} /> La calidad de tus piezas</span>}
          action={<Badge tone="green">sobre 100</Badge>}
        >
          <div className="row" style={{ gap: 20, marginBottom: 16 }}>
            <Ring valor={83} label="SCORE" color="var(--green)" sub="la pieza aprobada" />
            <div className="dato" style={{ flex: 1 }}>
              <span className="dato-l">Qué significa</span>
              <span className="bs">
                Es el promedio de los 5 jueces de MiroFish. Arriba de <b style={{ color: 'var(--green)' }}>80</b> se publica,
                entre 60 y 80 se revisa, abajo de 60 se descarta.
              </span>
            </div>
          </div>
          {PANEL_PIEZAS.map(p => {
            const c = p.score >= 80 ? 'var(--green)' : p.score >= 60 ? 'var(--amber)' : 'var(--red)';
            return (
              <div key={p.titulo} style={{ padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                <div className="row spread" style={{ marginBottom: 6 }}>
                  <span className="bt" style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.titulo}</span>
                  <span style={{ fontWeight: 900, fontSize: 14, color: c, flexShrink: 0 }}>{p.score}</span>
                </div>
                <BarRow valor={p.score} max={100} color={c} />
              </div>
            );
          })}
          <div className="acc-why">
            <b>Una pieza que no pasa a los jueces nunca se publica.</b> Ahí está el ahorro: el dinero se gasta después de que el mercado la aprobó, no antes.
          </div>
        </Card>
      </div>

      {/* ====================== FILA 3: AUTONOMÍA Y MEMORIA ====================== */}
      <div className="csec">
        <span className="csec-n">3</span>
        <span className="csec-t">Cómo viene el mes y qué hizo solo</span>
        <span className="csec-s">El crecimiento y las acciones que tomó sin vos</span>
      </div>
      <div className="duo">
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Trend size={14} style={{ color: 'var(--green)' }} /> Ventas por mes</span>}
          action={<Badge tone="green"><Dinero monto={MES.acumulado} equivalente={false} /> acumulado</Badge>}
        >
          <Bars data={MES.ventas} labels={MES.labels} color="#22c55e" fmt={v => `${(v / 1000).toFixed(1)}K`} />
          <div className="datos-row" style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
            <div className="dato"><span className="dato-l">Promedio por mes</span><span className="dato-v"><Dinero monto={MES.promedio} /></span></div>
            <div className="dato"><span className="dato-l">Último mes</span><span className="dato-v" style={{ color: 'var(--green)' }}><Dinero monto={4280} /></span></div>
            <div className="dato"><span className="dato-l">Crecimiento</span><span className="dato-v" style={{ color: 'var(--green)' }}>+28%</span></div>
          </div>
          <div className="acc-why">Cada barra es un mes cerrado. <b>El crecimiento es real</b>: sale de las ventas que entraron por tus conexiones.</div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Sun size={14} style={{ color: 'var(--green)' }} /> Mientras no estabas</span>}
          action={<Badge tone="green">modo {modoNombre}</Badge>}
        >
          <MientrasNoEstabas modo={modo} />
        </Card>
      </div>

      {/* ====================== FILA 4: CIERRE ====================== */}
      <div className="csec">
        <span className="csec-n">4</span>
        <span className="csec-t">Memoria y cierre</span>
        <span className="csec-s">Todo lo que hizo el motor y cómo vas contra tus metas</span>
      </div>
      <div className="duo">
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Clock size={14} style={{ color: 'var(--purple3)' }} /> La bitácora</span>}
          action={
            <Button variant="ghost" className="btn-sm" title={`Muestra todo lo que hizo el motor en la semana (${BITACORA.length} líneas). No cambia nada.`}
              onClick={() => setBitacoraCompleta(!bitacoraCompleta)}>
              {bitacoraCompleta ? 'Ver menos' : 'Ver la semana'}
            </Button>
          }
        >
          <div className="tl">
            {(bitacoraCompleta ? BITACORA : BITACORA.slice(0, 5)).map(b => (
              <div key={b.id} className="tl-item">
                <span className="tl-dot" style={{ background: b.color }} />
                <span className="tl-time">{b.cuando}</span>
                <div className="tl-body">
                  <div className="tl-text"><b style={{ color: b.color }}>{b.agente}</b> {b.texto}</div>
                  <div className="tl-anchor">
                    <span>📎 {b.ancla}</span>
                    {b.artefacto && (b.artefacto === 'Deshacer'
                      ? <span className="tl-undo"
                        title={reactivadas.includes(b.id)
                          ? `Vuelve a pausar «${b.ancla}», tal como estaba a las 03:12`
                          : `Reactiva «${b.ancla}» con su presupuesto original ($40/día). Reversible las 24 h.`}
                        onClick={() => toggleReactivar(b)}>
                        {reactivadas.includes(b.id) ? 'Volver a pausar' : b.artefacto}
                      </span>
                      : <span className="tl-undo"
                        title={`Abre lo que dejó ${b.agente}: los números y de dónde salen. No cambia nada.`}
                        onClick={() => verArtefacto(b)}>{b.artefacto}</span>)}
                    {b.autonomia === 'auto' && <span className="tiny muted">decidido solo</span>}
                  </div>
                  {reactivadas.includes(b.id) && (
                    <div className="tiny" style={{ color: 'var(--green)', fontWeight: 700, marginTop: 6, lineHeight: 1.5 }}>
                      <I_Check size={12} /> Reactivado: {b.id === 'b7'
                        ? '«Lanzamiento D2C» vuelve a estar activa con su presupuesto original de $40/día.'
                        : 'el conjunto «lookalike frío» vuelve a estar activo; si el CPA se escapa otra vez a $28, el motor lo pausa solo.'}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="acc-why">
            <b>Deshacer</b> aparece solo en las acciones reversibles y dura 24 h. Es lo que hace seguro el modo Automático:
            si el motor se equivoca, el costo es un clic.
          </div>
        </Card>

        <Card tour="metas"
          title={<span className="row" style={{ gap: 8 }}><I_Star size={14} style={{ color: 'var(--green)' }} /> Tus metas del mes</span>}
          action={<Badge tone={P.alcanza ? 'green' : 'amber'}>{metasOk} de 3 en camino</Badge>}
        >
          <div>
            <div className="row spread" style={{ marginBottom: 6 }}>
              <span className="bt">Ventas</span>
              <span className="bs"><Dinero monto={VENTAS_MES} /> de <Dinero monto={metaVentas} equivalente={false} /> · faltan <Dinero monto={faltaVentas} equivalente={false} /></span>
            </div>
            <BarRow valor={pctVentas} max={100} formato={`${pctVentas}%`} color={P.alcanza ? 'var(--green)' : 'var(--amber)'} />
          </div>
          <div>
            <div className="row spread" style={{ marginBottom: 6 }}>
              <span className="bt">ROAS</span>
              <span className="bs">3,8x sobre una meta de 3,5x</span>
            </div>
            <BarRow valor={100} max={100} formato="108%" color="var(--green)" />
          </div>
          <div>
            <div className="row spread" style={{ marginBottom: 6 }}>
              <span className="bt">Responder en menos de 5 min</span>
              <span className="bs">92% sobre una meta de 90%</span>
            </div>
            <BarRow valor={92} max={100} formato="92%" color="var(--amber)" />
          </div>
          <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <div className="dato">
              <span className="dato-l">Cierre {planActivo && planActivo.alcanza ? 'con el plan' : 'proyectado'}</span>
              <span className="dato-v" style={{ color: 'var(--green)' }}><Dinero monto={cierreProyectado} /></span>
            </div>
            <div className="dato"><span className="dato-l">Días que quedan</span><span className="dato-v">{DIAS_RESTANTES}</span></div>
            <div className="dato"><span className="dato-l">Para llegar faltan</span><span className="dato-v" style={{ color: 'var(--amber)' }}><Dinero monto={`$${porDiaVentas}/día`} /></span></div>
          </div>

          {/* Ajustar la meta: se elige acá y toda la tarjeta se recalcula con lo que elige. */}
          {editandoMeta && (
            <div style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
              <div className="bs" style={{ marginBottom: 10 }}>
                Meta de ventas del mes. Cambiarla <b>no toca el presupuesto ni lo que ya se gastó</b>: sólo cambia el
                objetivo contra el que se mide el mes. El motor te avisa si deja de ser alcanzable.
              </div>
              {METAS.map(m => {
                const f = faltaPara(m);
                const pm = planPara(m);
                return (
                  <div key={m} className="row" style={{ gap: 10, marginBottom: 9, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Button variant={m === metaVentas ? 'primary' : 'outline'} className="btn-sm"
                      title={m === metaVentas
                        ? `La meta de ventas del mes ya está en ${money(m)}`
                        : `Pone la meta de ventas del mes en ${money(m)}. No cambia el presupuesto ni lo que ya se gastó: volvés a la de ${money(META_MES)} cuando quieras.`}
                      onClick={() => {
                        const antes = metaVentas;
                        setMetaVentas(m);
                        setToast(antes === m ? `La meta de ventas ya estaba en ${money(m)}` : `Meta de ventas del mes: ${money(m)}, antes ${money(antes)}`);
                      }}>
                      <Dinero monto={m} equivalente={false} />{m === META_MES ? ' · la de hoy' : m === CIERRE_AL_RITMO ? ' · tu cierre proyectado' : ' · más exigente'}
                    </Button>
                    <span className="tiny muted" style={{ flex: 1, minWidth: 190 }}>
                      {f === 0 ? 'Ya está alcanzada con lo que vendiste.' : `Faltan ${money(f)} en ${DIAS_RESTANTES} días: ${money(porDiaPara(m))}/día.`}
                      {pm.alcanza
                        ? ' Entra en el presupuesto de hoy.'
                        : ` Con el presupuesto de hoy no alcanza: necesita ${money(pm.gastoDia)}/día de gasto extra y bajo el techo de ${money(TECHO_DIA)}/día quedan ${money(MARGEN_TECHO)}.`}
                    </span>
                  </div>
                );
              })}
              <Button variant="ghost" className="btn-sm" title="Cierra el ajuste y deja a la vista los botones de siempre. No cambia la meta."
                onClick={() => setEditandoMeta(false)}>Listo, dejarlo así</Button>
            </div>
          )}

          {/* El plan activo: queda escrito en la tarjeta, con lo que va a hacer y cuándo avisa. */}
          {planActivo && (
            <div style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
              <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                <I_Check size={14} style={{ color: 'var(--green)' }} />
                <b style={{ fontSize: 13 }}>Plan activo para llegar a {money(planActivo.meta)}</b>
                <Badge tone={planActivo.alcanza ? 'green' : 'amber'}>{planActivo.alcanza ? 'entra en los frenos' : 'no alcanza con el techo de hoy'}</Badge>
              </div>
              <div className="bs" style={{ marginBottom: 7 }}>
                {planActivo.hueco === 0
                  ? 'El ritmo de hoy ya alcanza la meta: el plan deja el gasto quieto y Kai vigila que se sostenga.'
                  : `Cierra los ${money(planActivo.hueco)} que faltan sin subir el gasto: mueve $40/día de TikTok a Meta (el clic pasa de $4,20 a $2,10) y los pone detrás de las 2 piezas con score más alto.`}
              </div>
              <div className="tiny muted" style={{ marginBottom: 9 }}>
                Son {money(planActivo.ventaDia)}/día de venta ≈ {money(planActivo.gastoDia)}/día de gasto, contra el techo de {money(TECHO_DIA)}/día.
                Kai lo revisa cada 3 días y te avisa acá si deja de ser alcanzable.
              </div>
              {planActivo.meta !== metaVentas && (
                <div className="tiny" style={{ color: 'var(--amber)', fontWeight: 700, marginBottom: 9, lineHeight: 1.5 }}>
                  La meta del mes cambió a {money(metaVentas)}: este plan es para la de {money(planActivo.meta)}. Pedí uno nuevo o quitá este.
                </div>
              )}
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <Button variant="outline" className="btn-sm" title="Abre el plan activo con sus números y sus pasos. No cambia nada."
                  onClick={() => panelPlan(planActivo.meta, true)}>Ver el plan activo</Button>
                <Button variant="ghost" className="btn-sm" title="Quita el plan: la meta del mes queda como estaba y el presupuesto no se toca"
                  onClick={() => { setPlanActivo(null); setToast('Plan quitado: la meta del mes queda como estaba'); }}>Quitarlo</Button>
              </div>
            </div>
          )}

          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <Button className="btn-sm"
              title={`Le pide a Kai el plan para cerrar los ${money(faltaVentas)} que faltan sin subir el gasto. Te lo muestra antes de aplicarlo: nada cambia hasta que lo actives.`}
              onClick={() => panelPlan(metaVentas, false)}>
              <I_ArrowRight size={13} /> Pedir un plan para llegar
            </Button>
            <Button variant="ghost" className="btn-sm"
              title={editandoMeta
                ? 'Cierra el ajuste de la meta y deja la tarjeta como estaba'
                : 'Abre el ajuste de la meta de ventas del mes. No cambia el presupuesto ni lo que ya se gastó, y podés volver atrás cuando quieras.'}
              onClick={() => setEditandoMeta(!editandoMeta)}>
              {editandoMeta ? 'Cerrar el ajuste' : 'Ajustar la meta'}
            </Button>
          </div>
          <div className="acc-why">
            La meta la ponés vos. <b>El motor no gasta más para llegar</b>: reasigna lo que ya tenés
            y te avisa cuando el objetivo deja de ser alcanzable con el presupuesto actual.
          </div>
        </Card>
      </div>

      {/* ============== EL TOUR GUIADO: overlay con foco, parada por parada ============== */}
      {paso !== null && <Tour paso={paso} onPaso={setPaso} onCerrar={() => { setPaso(null); setTourVisto(true); }} />}
    </div>
  );
}

// =============================================================================================
// EL TOUR GUIADO — recorre Tu día con foco sobre cada bloque, con los números de hoy.
// =============================================================================================
function Tour({ paso, onPaso, onCerrar }: { paso: number; onPaso: (n: number) => void; onCerrar: () => void }) {
  const [caja, setCaja] = useState<{ t: number; l: number; w: number; h: number } | null>(null);
  const p = PASOS_TOUR[paso];
  const ultimo = paso === PASOS_TOUR.length - 1;

  // El foco sigue al bloque que se está explicando: se mide, se centra y se vuelve a medir al scrollear.
  useEffect(() => {
    const medir = () => {
      const el = document.querySelector(PASOS_TOUR[paso].sel) as HTMLElement | null;
      if (!el) { setCaja(null); return; }
      const r = el.getBoundingClientRect();
      setCaja({ t: r.top, l: r.left, w: r.width, h: r.height });
    };
    const el = document.querySelector(PASOS_TOUR[paso].sel) as HTMLElement | null;
    // Los bloques más altos que la pantalla no se pueden centrar: se alinean arriba para que el
    // foco se vea entero, y abajo se recorta contra el borde en lugar de irse fuera de cuadro.
    if (el) el.scrollIntoView({ block: el.getBoundingClientRect().height < window.innerHeight * 0.7 ? 'center' : 'start' });
    medir();
    window.addEventListener('resize', medir);
    window.addEventListener('scroll', medir, true);
    return () => {
      window.removeEventListener('resize', medir);
      window.removeEventListener('scroll', medir, true);
    };
  }, [paso]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onCerrar]);

  const vh = window.innerHeight, vw = window.innerWidth;
  const alto = 214;
  const foco = caja
    ? { top: Math.max(6, caja.t - 6), left: Math.max(6, caja.l - 6), w: Math.min(caja.w + 12, vw - Math.max(6, caja.l - 6) - 8), h: Math.min(caja.h + 12, vh - Math.max(6, caja.t - 6) - 8) }
    : null;
  const abajo = !foco || foco.top + foco.h + alto + 12 < vh;
  const top = !foco ? 90 : abajo ? foco.top + foco.h + 14 : (foco.h > vh * 0.6 ? Math.max(14, vh - alto - 16) : Math.max(14, foco.top - alto - 14));
  const left = !foco ? 24 : Math.min(Math.max(14, foco.left), Math.max(14, vw - 296));

  return (
    <>
      <div className="tour-overlay" onClick={onCerrar} />
      {foco && <div className="tour-spot" style={{ position: 'fixed', top: foco.top, left: foco.left, width: foco.w, height: foco.h }} />}
      <div className="tour-tip" style={{ position: 'fixed', top, left }} role="dialog" aria-label={p.t}>
        <div className="tour-step">Parada {paso + 1} de {PASOS_TOUR.length}</div>
        <div className="tour-title">{p.t}</div>
        <div className="tour-text">{p.d}</div>
        <div className="tour-btns">
          <div className="tour-dots">
            {PASOS_TOUR.map((_, i) => <span key={i} className={`t-dot ${i === paso ? 'on' : ''}`} />)}
          </div>
          {paso > 0 && (
            <button className="tour-btn-ghost" style={{ border: 'none', cursor: 'pointer' }} title="Volver a la parada anterior del tour"
              onClick={() => onPaso(paso - 1)}>Atrás</button>
          )}
          <button className="tour-btn-grad" style={{ border: 'none', cursor: 'pointer' }}
            title={ultimo ? 'Cerrar el tour: no cambia nada de tu panel' : 'Ir a la siguiente parada del tour'}
            onClick={() => ultimo ? onCerrar() : onPaso(paso + 1)}>
            {ultimo ? 'Terminar' : 'Siguiente'}
          </button>
          <button className="tour-btn-skip" style={{ border: 'none', cursor: 'pointer' }} title="Salir del tour ahora. Reversible: lo podés repetir cuando quieras." onClick={onCerrar}>Saltear</button>
        </div>
      </div>
    </>
  );
}

// =============================================================================================
function Decision({ d, onResolver }: { d: Decision; onResolver: (d: Decision, accion: string) => void }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="dec">
      <div className="dec-head">
        <span className="dec-av" style={{ background: d.agenteColor }}>{d.agente[0]}</span>
        <span className="dec-agent" style={{ color: d.agenteColor }}>{d.agente}</span>
        <Button variant="ghost" className="btn-sm" title="Muestra cómo votaron los 5 jueces sobre esta acción, con la objeción del más duro"
          onClick={() => setAbierto(!abierto)}>
          <I_Eye size={13} /> {abierto ? 'Ocultar el veredicto' : 'Ver el veredicto'}
        </Button>
      </div>
      <div className="dec-title">{d.titulo}</div>
      <div className="dec-det">{d.detalle}</div>
      <div className="dec-impact"><b style={{ color: 'var(--green)' }}>Si lo aprobás: </b>{d.impacto}</div>
      {abierto && (
        <div className="dec-panel">
          <div className="dec-panel-top">
            <I_Vote size={14} style={{ color: 'var(--purple3)' }} />
            <b>Los 5 jueces revisaron esta acción antes de proponértela</b>
            <Badge tone={d.panel.dudaron === 0 ? 'green' : 'amber'}>{d.panel.aprobaron} de {d.panel.total} a favor</Badge>
          </div>
          <div className="dec-obj">
            {d.panel.dudaron > 0 ? <><b>El más duro dijo:</b> «{d.panel.objeccion}»</> : d.panel.objeccion}
          </div>
        </div>
      )}
      <div className="dec-acts">
        {d.acciones.map((ac, i) => (
          <Button key={ac} variant={i === 0 ? 'primary' : 'ghost'} className="btn-sm"
            title={`${ac} · ${CONSECUENCIA[d.id] ?? 'Ejecuta la acción que propone el motor'}`}
            onClick={() => onResolver(d, ac)}>
            {i === 0 ? <I_Check size={13} /> : null} {ac}
          </Button>
        ))}
      </div>
      <div className="acc-why">{CONSECUENCIA[d.id]}</div>
    </div>
  );
}

// =============================================================================================
function MientrasNoEstabas({ modo }: { modo: Modo }) {
  const m = MIENTRAS_NO_ESTABAS;
  return (
    <>
      <div className="mwb-top">
        {modo === 'auto'
          ? <><I_Check size={15} style={{ color: 'var(--green)' }} /><b style={{ fontSize: 13.5 }}>Trabajó solo y te lo cuenta</b></>
          : <><I_Zap size={15} style={{ color: 'var(--amber)' }} /><b style={{ fontSize: 13.5 }}>Esto hizo solo desde {m.desde}</b></>}
      </div>
      <div className="mwb-grid">
        <div className="mwb-k"><div className="mwb-k-lb">Gasto que evitó</div><div className="mwb-k-v" style={{ color: 'var(--green)' }}><Dinero monto={180} /></div></div>
        <div className="mwb-k"><div className="mwb-k-lb">Gasto que hizo</div><div className="mwb-k-v"><Dinero monto={m.gasto} /></div></div>
        <div className="mwb-k"><div className="mwb-k-lb">Ventas</div><div className="mwb-k-v" style={{ color: 'var(--green)' }}><Dinero monto={m.ventas} /></div></div>
      </div>
      <div className="mwb-list">
        {m.acciones.map((ac, i) => (
          <div key={i} className="mwb-item">
            <span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Check size={14} /></span>
            <span className="tx">{ac.txt}<small>{ac.detalle}</small></span>
            <span className="hr">{ac.cuando}</span>
            {ac.undo && <span className="tl-undo">deshacer</span>}
          </div>
        ))}
      </div>
      <div className="acc-why">
        {modo === 'auto'
          ? <>Estás en <b>Automático</b>: el motor decide y ejecuta sin preguntarte. Todas las acciones de acá son reversibles 24 h.</>
          : modo === 'shared'
            ? <>Estás en <b>Compartido</b>: el motor decide, pero <b>te pide OK</b> antes de publicar o gastar.</>
            : <>Estás en <b>Manual</b>: el motor solo te <b>sugiere</b>. Publicás y gastás vos.</>}
      </div>
    </>
  );
}

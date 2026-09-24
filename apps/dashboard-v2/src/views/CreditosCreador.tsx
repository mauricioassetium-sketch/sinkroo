// =============================================================================================
// CRÉDITOS, EN PIEL DE CREADOR — el saldo, la grilla de producción y los planes del creador.
//
// QUÉ ES ESTE PANEL (corrección del dueño, que manda): es una herramienta para CREAR CONTENIDO,
// VERIFICARLO, PUBLICARLO y hacer crecer la cuenta. Acá no se venden cosas ni se habla de marcas:
// los créditos se gastan en producir piezas, y el trabajo es el mismo para cualquier tipo de
// creador —lo que cambia entre tipos es qué publica, nunca cómo se le cobra—.
//
// 1 crédito = $0,01. Los planes de creador traen los créditos del mes (1.500 el Creador, 4.000 el
// Pro), el pack extra de 1.000 no caduca, el techo del día son 300 créditos, y la pieza que el
// panel rechaza NO se le cobra al creador: la regeneración por gate la paga el sistema.
//
// NINGÚN NÚMERO ESTÁ ESCRITO DOS VECES: los créditos de cada pieza salen de GRILLA_CREDITOS (con
// quién la produce: Nia, tu avatar o Kai), los planes y sus créditos de usePlan() —el contexto ya
// elige el catálogo de la piel, así que acá no se traduce nada—, el techo diario del guardrail y
// el costo del avatar de AVATAR.gasto. La tabla, el anillo, el saldo y los movimientos son la
// misma cuenta, así que no pueden decir cosas distintas.
//
// EL PLAN VIVE EN lib/plan: la píldora del menú, la barra del mes y esta pantalla leen el mismo
// dato, así que cambiar de plan acá se ve en el menú en el mismo render.
// =============================================================================================

import { useState, type CSSProperties } from 'react';
import { Card, Badge, Button, Dinero, NotaMoneda } from '../components/ui';
import { ViewHead, Gauge } from '../components/viz';
import {
  I_Credit, I_Wallet, I_Zap, I_Shield, I_Plus, I_ArrowRight, I_Refresh, I_Check, I_Clock, I_Robot,
} from '../components/icons';
import { useDetalle } from '../components/Detalle';
import { usePlan } from '../lib/plan';
import { usePerfil } from '../lib/perfil';
import { importe } from '../lib/moneda';
import {
  GRILLA_CREDITOS, GUARDRAILS_CREADOR, VISTAS_CREADOR, AVATAR, AGENTES_CREADOR, NICHO, CRECIMIENTO,
} from '../data/creador';

// ---------------------------------------------------------------------------------------------
// LAS CUENTAS, EN UN SOLO LUGAR
// ---------------------------------------------------------------------------------------------

/** 1 crédito = $0,01: es lo que convierte créditos en plata en toda la pantalla. */
const USD_POR_CREDITO = 0.01;

/** Los créditos, en dólares: sin ruido de coma flotante, porque el importe lo pinta <Dinero>. */
const enPlata = (creditos: number) => Math.round(creditos * USD_POR_CREDITO * 100) / 100;

/** El guardrail del techo diario, leído del dato: es el ritmo con el que se miden los días. */
const TECHO_DIARIO = Number(
  /(\d+)/.exec(GUARDRAILS_CREADOR.find(g => g.nombre === 'Techo de gasto diario')?.valor ?? '')?.[1] ?? 300,
);

/** Cuando el saldo baja de acá, la auto-recarga compra el pack sola y el equipo no se frena. */
const AUTO_RECARGA_DESDE = 500;

/** Los días, en texto: con un día suelto el plural se lee mal («1 días»). */
const diasTxt = (n: number) => (n === 1 ? '1 día' : `${n.toLocaleString('es-AR')} días`);

/** El que produce cada pieza, tal como lo declara la grilla. */
const AVATAR_EN_GRILLA = 'Avatar';

const guardrailDe = (nombre: string) => GUARDRAILS_CREADOR.find(g => g.nombre === nombre);
const creditosDe = (pieza: string) => GRILLA_CREDITOS.find(g => g.pieza === pieza)?.creditos ?? 0;

/**
 * El color de quien produce: el del agente si la pieza la hace un agente (Nia, Kai) y el del avatar
 * si la crea el avatar. Sale de los mismos datos que la tabla, así que la fila y su puntito no se
 * pueden contradecir.
 */
const colorDeQuien = (quien: string) =>
  quien === AVATAR_EN_GRILLA
    ? 'var(--purple2)'
    : AGENTES_CREADOR.find(a => a.nombre === quien)?.color ?? 'var(--muted)';

// ---------------------------------------------------------------------------------------------
// LO QUE PRODUJO EL EQUIPO ESTE MES — cada línea apunta a una fila de GRILLA_CREDITOS, así que
// los créditos son cantidad × grilla y no hay ningún precio inventado acá.
// ---------------------------------------------------------------------------------------------

type Linea = { pieza: string; cant: number };
type Rubro = { rubro: string; color: string; nota: string; fecha: string; lineas: Linea[] };

const MES: Rubro[] = [
  {
    rubro: 'Videos del avatar', color: 'var(--purple2)', fecha: 'del 1 al 24 de septiembre',
    nota: 'tu cara y tu voz con el guion de Nia: es lo que más retiene',
    lineas: [
      { pieza: 'Video del avatar (5 s)', cant: 8 },
      { pieza: 'Video del avatar premium (5 s)', cant: 2 },
    ],
  },
  {
    rubro: 'Reels con tu material', color: '#ec4899', fecha: 'del 3 al 23 de septiembre',
    nota: 'lo que ya tenías grabado, con guion, portada y caption',
    lineas: [
      { pieza: 'Imagen con texto montado', cant: 8 },
      { pieza: 'Texto (hook, caption, guion)', cant: 12 },
    ],
  },
  {
    rubro: 'Fotos e historias', color: '#6366f1', fecha: 'del 2 al 22 de septiembre',
    nota: 'tu cara, tus placas y las historias del día',
    lineas: [
      { pieza: 'Foto con tu cara', cant: 10 },
      { pieza: 'Imagen hero', cant: 4 },
      { pieza: 'Imagen simple', cant: 8 },
    ],
  },
  {
    rubro: 'Clips cortos', color: 'var(--green)', fecha: 'del 5 al 24 de septiembre',
    nota: 'los mejores segundos de tus videos largos',
    lineas: [{ pieza: 'Clips de un video tuyo', cant: 20 }],
  },
];

const creditosDeRubro = (r: Rubro) => r.lineas.reduce((a, l) => a + creditosDe(l.pieza) * l.cant, 0);
const piezasDeRubro = (r: Rubro) => r.lineas.reduce((a, l) => a + l.cant, 0);

/** Lo que consumió el mes, en créditos: la suma de los cuatro rubros. */
const CONSUMIDO_MES = MES.reduce((a, r) => a + creditosDeRubro(r), 0);

/** Cuántas piezas produjo el equipo: es el «qué» que hay atrás de los créditos del mes. */
const PIEZAS_MES = MES.reduce((a, r) => a + piezasDeRubro(r), 0);

// Lo que el sistema NO le cobra al creador: la regeneración de una pieza que el panel rechazó. Va
// en cero y se muestra igual, porque es la parte del gasto que no aparece en ninguna factura.
const REPARTO: { l: string; v: number; c: string; nota: string }[] = [
  ...MES.map(r => ({ l: r.rubro, v: creditosDeRubro(r), c: r.color, nota: `${piezasDeRubro(r)} piezas de la grilla` })),
  { l: 'Regeneraciones por panel', v: 0, c: 'var(--muted)', nota: 'las paga el sistema' },
];

const REPARTO_TOTAL = REPARTO.reduce((a, r) => a + r.v, 0);

// Las porciones del anillo, en grados: arranca arriba (-90deg) y cierra en 360. Las porciones en
// cero no se dibujan (no son un color más del anillo), pero sí se explican en la leyenda.
const PORCIONES = (() => {
  let acum = 0;
  return REPARTO.filter(r => r.v > 0).map(r => {
    const desde = (acum / REPARTO_TOTAL) * 360;
    acum += r.v;
    return `${r.c} ${desde.toFixed(3)}deg ${((acum / REPARTO_TOTAL) * 360).toFixed(3)}deg`;
  }).join(', ');
})();

// La tabla de la grilla, con el aire de las columnas.
const TH: CSSProperties = {
  textAlign: 'left', padding: '8px 10px', fontSize: 10.5, letterSpacing: '.4px',
  textTransform: 'uppercase', color: 'var(--muted)', borderBottom: '1px solid var(--border2)', fontWeight: 700,
};
const TD: CSSProperties = { padding: '9px 10px', borderTop: '1px solid var(--border)', verticalAlign: 'middle' };

type Mov = { detalle: string; fecha: string; cantidad: number; nota?: string };

// ---------------------------------------------------------------------------------------------

export function ViewCreditosCreador({ setToast }: { setToast: (t: string) => void }) {
  const detalle = useDetalle();
  const { perfil } = usePerfil();
  const { plan, planes, cambiarPlan } = usePlan();

  // Los packs que cargó el creador: no caducan y se suman al mes. El resto del saldo es aritmética
  // (lo que trajo el plan menos lo que consumió el equipo), no un número guardado aparte.
  const [extra, setExtra] = useState(0);
  const [recargas, setRecargas] = useState<Mov[]>([]);
  const [autoRecarga, setAutoRecarga] = useState(true);
  const [avisoPlan, setAvisoPlan] = useState<{ de: string; a: string; creditos: number; precio: number; volver: string } | null>(null);

  // El plan de la cuenta ES el plan del creador: el catálogo lo elige la piel desde lib/plan.
  const planActual = plan;
  const topup = planes.find(p => p.key === 'topup')!;
  /** Los planes que se contratan de verdad: la bienvenida es de una sola vez y el pack se compra aparte. */
  const contratables = planes.filter(p => p.key !== 'topup' && p.key !== 'bienvenida');
  const saldo = Math.max(0, planActual.creditosMes - CONSUMIDO_MES + extra);
  const dias = Math.max(0, Math.round(saldo / TECHO_DIARIO));
  const pct = Math.min(100, Math.round((saldo / planActual.creditosMes) * 100));
  const consumidoUsd = enPlata(CONSUMIDO_MES);
  /** Lo que costó el avatar este mes: es el rubro que se lleva la mayor parte del gasto. */
  const avatarMes = creditosDeRubro(MES[0]);
  /** La pieza más barata que produce el avatar: sale de su propia tabla de costos. */
  const avatarMasBarato = Math.min(...AVATAR.gasto.map(g => g.creditos));
  /** Los días de motor que trae el plan al techo del día. */
  const diasDelPlan = Math.floor(planActual.creditosMes / TECHO_DIARIO);

  const movs: Mov[] = [
    ...recargas,
    { detalle: `Créditos del plan ${planActual.nombre}`, fecha: '1º de septiembre', cantidad: planActual.creditosMes, nota: 'entran completos el primer día del mes' },
    ...MES.map(r => ({ detalle: r.rubro, fecha: r.fecha, cantidad: -creditosDeRubro(r), nota: `${piezasDeRubro(r)} piezas de la grilla` })),
    { detalle: 'Regeneraciones por panel', fecha: 'este mes', cantidad: 0, nota: 'las piezas que rechazó el panel: las paga el sistema' },
  ];
  const entradas = movs.filter(m => m.cantidad > 0).reduce((a, m) => a + m.cantidad, 0);
  const salidas = movs.filter(m => m.cantidad < 0).reduce((a, m) => a + Math.abs(m.cantidad), 0);

  /** El importe en sus dos textos (dólar y equivalente), para los textos que no admiten <Dinero>. */
  const plata = (monto: number) => {
    const t = importe(monto, perfil.moneda);
    return `${t.principal}${t.equivalente ? ` ${t.equivalente}` : ''}`;
  };

  /** Cargar el pack: sube el saldo, queda el movimiento a la vista y no se toca el plan. */
  const cargar = () => {
    setExtra(e => e + topup.creditosMes);
    setRecargas(r => [{ detalle: `Pack extra de ${topup.creditosMes.toLocaleString('es-AR')} créditos`, fecha: 'Hoy', cantidad: topup.creditosMes, nota: 'no caduca: se suma al plan del mes' }, ...r]);
    setToast(`${topup.creditosMes.toLocaleString('es-AR')} créditos cargados por ${plata(topup.precio)}: no caducan`);
  };

  /** Aplica el plan nuevo. El mismo dato mueve el menú y esta pantalla: no hay dos verdades. */
  const aplicarPlan = (key: string) => {
    const nuevo = planes.find(p => p.key === key);
    const anterior = planActual;
    if (!nuevo || nuevo.key === anterior.key) {
      setToast(`Ya estás en el plan ${anterior.nombre}: ${anterior.creditosMes.toLocaleString('es-AR')} créditos por mes`);
      return;
    }
    cambiarPlan(key);
    setAvisoPlan({ de: anterior.nombre, a: nuevo.nombre, creditos: nuevo.creditosMes, precio: nuevo.precio, volver: anterior.key });
    setToast(`Ahora estás en el plan ${nuevo.nombre}: ${nuevo.creditosMes.toLocaleString('es-AR')} créditos por mes`);
  };

  // =========================================================================================
  // LOS PANELES DE DETALLE — todo botón que informa abre uno de estos, con el dato real.
  // =========================================================================================

  /** Los cuatro planes del creador: los dos que se contratan, la bienvenida y el pack extra. */
  const verPlanes = () => detalle({
    titulo: 'Elegir plan',
    sub: 'Los planes de creador cambian cuántos créditos entran por mes y hasta dónde llega el equipo: con Pro entran el avatar entrenado, la publicación en todas tus redes y los clips de tus videos. El pack extra se suma sin cambiar de plan y no caduca.',
    bloques: [
      ...planes.map(p => ({
        tipo: 'filas' as const,
        items: [
          {
            t: `${p.nombre} · ${p.precio === 0 ? 'gratis' : `${plata(p.precio)}${p.key === 'topup' ? '' : ' por mes'}`}`,
            s: `${p.creditosMes.toLocaleString('es-AR')} créditos · ${p.habilita}`,
            etiqueta: p.key === planActual.key ? 'el tuyo' : p.key === 'bienvenida' ? 'ya la usaste' : p.key === 'topup' ? 'se compra aparte' : 'elegilo abajo',
            tono: p.key === planActual.key ? 'purple' as const : 'muted' as const,
          },
          ...p.incluye.map(i => ({ t: i, etiqueta: 'incluido', tono: 'green' as const })),
        ],
      })),
      { tipo: 'texto', texto: `${planActual.paraQuien} La bienvenida son ${planes.find(p => p.key === 'bienvenida')?.creditosMes.toLocaleString('es-AR')} créditos de regalo, una sola vez: ya la usaste cuando arrancaste.` },
      { tipo: 'aviso', tono: 'amber', texto: 'Al cambiar de plan los créditos del mes se recalculan desde hoy y la diferencia se prorratea en la factura del 1º de octubre: a favor si bajás, a cobrar si subís. Reversible: podés volver a tu plan desde esta misma pantalla.' },
    ],
    fuente: 'Planes del creador y grilla de créditos: los precios son los del plan, en dólares, y los créditos entran completos el primer día del mes.',
    acciones: [
      ...contratables.filter(p => p.key !== planActual.key).map(p => ({
        label: `Pasar al plan ${p.nombre} · ${plata(p.precio)}/mes`,
        variante: p.precio > planActual.precio ? 'primary' as const : 'outline' as const,
        title: `Cambia tu plan al ${p.nombre}: ${p.creditosMes.toLocaleString('es-AR')} créditos por mes por ${plata(p.precio)}. El menú y esta pantalla lo muestran al instante, y podés volver al ${planActual.nombre}.`,
        onClick: () => aplicarPlan(p.key),
      })),
      {
        label: `Cargar el pack de ${topup.creditosMes.toLocaleString('es-AR')} · ${plata(topup.precio)}`,
        variante: 'outline' as const,
        title: `Suma el pack extra de ${topup.creditosMes.toLocaleString('es-AR')} créditos por ${plata(topup.precio)} sin cambiar de plan: sube el saldo y queda el movimiento a la vista`,
        onClick: cargar,
      },
      { label: 'Dejarlo como está', title: 'Cierra el panel sin cambiar el plan', onClick: () => setToast(`Seguís en el plan ${planActual.nombre}`) },
    ],
  });

  /** El plan que tiene hoy: qué incluye, cuántos días de motor son sus créditos y qué costó el mes. */
  const verMiPlan = () => detalle({
    titulo: `Tu plan: ${planActual.nombre}`,
    sub: `${planActual.paraQuien} ${plata(planActual.precio)} por mes con ${planActual.creditosMes.toLocaleString('es-AR')} créditos incluidos.`,
    bloques: [
      { tipo: 'datos', filas: [
        { k: 'Precio por mes', v: plata(planActual.precio), s: 'se cobra el 1º de cada mes y se cancela cuando quieras' },
        { k: 'Créditos que incluye', v: planActual.creditosMes.toLocaleString('es-AR'), s: `${diasDelPlan} días de equipo al techo del día (${TECHO_DIARIO.toLocaleString('es-AR')} créditos)` },
        { k: 'Saldo que te queda hoy', v: saldo.toLocaleString('es-AR'), s: extra > 0 ? `${planActual.creditosMes.toLocaleString('es-AR')} del plan menos ${CONSUMIDO_MES.toLocaleString('es-AR')} consumidos, más ${extra.toLocaleString('es-AR')} del pack` : `el del plan menos los ${CONSUMIDO_MES.toLocaleString('es-AR')} créditos que consumió el equipo` },
        { k: 'Lo que costó el trabajo del mes', v: plata(consumidoUsd), s: `${CONSUMIDO_MES.toLocaleString('es-AR')} créditos en ${PIEZAS_MES} piezas, con un crédito = ${plata(USD_POR_CREDITO)}` },
        { k: 'Lo que se llevó el avatar', v: plata(enPlata(avatarMes)), s: `${avatarMes.toLocaleString('es-AR')} créditos: es lo más caro de producir y lo que más retiene` },
        { k: 'Próximo cobro', v: '1º de octubre', s: 'con septiembre ya cobrado' },
      ] },
      { tipo: 'filas', items: planActual.incluye.map(i => ({ t: i, etiqueta: 'incluido', tono: 'green' as const })) },
      { tipo: 'aviso', tono: 'green', texto: 'El plan cambia cuánto puede hacer el equipo por mes y hasta dónde llega: el avatar entrenado y publicar en todas tus redes entran con Pro. Lo que no cambia nunca es el panel de 5: cada pieza se verifica igual en todos los planes, y la que el panel rechaza no te cuesta créditos.' },
    ],
    fuente: 'Tu plan, con los créditos que entran por mes y lo que consumió el equipo. El gasto real del mes sale de la grilla de producción.',
  });

  /** La grilla, pieza por pieza: cuánto cuesta, quién la produce y qué significa en plata. */
  const verGrilla = () => detalle({
    titulo: 'Cómo se cobra cada pieza',
    sub: `La grilla de producción: cada pieza cuesta lo que dice la tabla, la produce alguien del equipo y un crédito son ${plata(USD_POR_CREDITO)}.`,
    bloques: [
      { tipo: 'filas', items: GRILLA_CREDITOS.map(g => ({
        t: g.pieza,
        s: `la produce ${g.quien} · ${plata(enPlata(g.creditos))} por pieza`,
        etiqueta: `${g.creditos.toLocaleString('es-AR')} créditos`,
        tono: g.quien === AVATAR_EN_GRILLA ? 'purple' as const : 'muted' as const,
      })) },
      { tipo: 'texto', texto: `Las más baratas son las que sostienen el ritmo: el clip de un video tuyo y el texto salen ${creditosDe('Clips de un video tuyo')} crédito cada uno. La más cara es el video premium del avatar (${creditosDe('Video del avatar premium (5 s)')} créditos): se usa para la pieza principal de la semana.` },
      { tipo: 'aviso', tono: 'green', texto: 'La verificación del panel de 5 no cuesta créditos, y la regeneración de una pieza que el panel rechaza tampoco: la paga el sistema. La vigilancia del nicho, las métricas y los comentarios también van por cuenta del sistema.' },
    ],
    fuente: 'Grilla de producción del creador: cada pieza cuesta los créditos de la tabla y el equivalente se calcula con el tipo de cambio de muestra del día.',
  });

  /** Qué salió este mes: cada línea de la grilla, con su cantidad y su cuenta. */
  const verMes = () => detalle({
    titulo: `Qué salió este mes · ${CONSUMIDO_MES.toLocaleString('es-AR')} créditos`,
    sub: `Lo que produjo el equipo desde el 1º de septiembre: ${PIEZAS_MES} piezas, ${plata(consumidoUsd)} de generación, repartidos en ${MES.length} tipos de pieza.`,
    bloques: [
      { tipo: 'datos', filas: [
        { k: 'Créditos consumidos', v: CONSUMIDO_MES.toLocaleString('es-AR'), s: `sobre los ${planActual.creditosMes.toLocaleString('es-AR')} del plan ${planActual.nombre}` },
        { k: 'En plata', v: plata(consumidoUsd), s: `a un crédito = ${plata(USD_POR_CREDITO)}` },
        { k: 'Piezas producidas', v: PIEZAS_MES.toLocaleString('es-AR'), s: `con ${creditosDe('Clips de un video tuyo')} crédito salen las más baratas y ${creditosDe('Video del avatar premium (5 s)')} la más cara` },
        { k: 'Regeneraciones por panel', v: '0 créditos', s: 'las piezas rechazadas no se cobran: las paga el sistema' },
      ] },
      ...MES.map(r => ({
        tipo: 'filas' as const,
        items: [
          { t: r.rubro, s: `${piezasDeRubro(r)} piezas · ${plata(enPlata(creditosDeRubro(r)))} · ${r.fecha}`, etiqueta: `${creditosDeRubro(r).toLocaleString('es-AR')} créditos`, tono: 'purple' as const },
          ...r.lineas.map(l => ({
            t: `${l.cant}× ${l.pieza}`,
            s: `${creditosDe(l.pieza).toLocaleString('es-AR')} créditos cada una · la produce ${GRILLA_CREDITOS.find(g => g.pieza === l.pieza)?.quien} · ${plata(enPlata(l.cant * creditosDe(l.pieza)))}`,
            etiqueta: `${(l.cant * creditosDe(l.pieza)).toLocaleString('es-AR')}`,
            tono: 'muted' as const,
          })),
        ],
      })),
      { tipo: 'texto', texto: `Los ${MES[0].lineas[0].cant} videos del avatar y la foto con tu cara son lo que más créditos se llevó; los clips y los textos, lo que menos. Cada línea apunta a una fila de la grilla: la cuenta se puede rehacer a mano.` },
    ],
    fuente: 'Consumo del equipo, con la grilla de producción como precio unitario. El mismo dato alimenta el anillo de reparto de la pantalla.',
  });

  /** El avatar: lo más caro de producir y lo que más rinde. */
  const verAvatar = () => detalle({
    titulo: `Lo que produce ${AVATAR.nombre.toLowerCase()}`,
    sub: `${AVATAR.entrenadoCon} · ${AVATAR.parecido}% de parecido. ${AVATAR.voz}.`,
    bloques: [
      { tipo: 'filas', items: AVATAR.quePuede.map(q => ({ t: q.t, s: q.s, etiqueta: 'lo hace', tono: 'green' as const })) },
      { tipo: 'filas', items: AVATAR.gasto.map(g => ({
        t: g.pieza,
        s: `${plata(enPlata(g.creditos))} por pieza`,
        etiqueta: `${g.creditos.toLocaleString('es-AR')} créditos`,
        tono: 'purple' as const,
      })) },
      { tipo: 'pasos', items: AVATAR.limites },
      { tipo: 'aviso', tono: 'green', texto: 'Nada de lo que crea el avatar sale sin pasar por el panel de 5 y por tu OK: con 80 o más se publica y, si no llega, vuelve con la objeción y la regeneración la paga el sistema.' },
    ],
    fuente: 'Lo que el avatar puede producir y lo que cuesta cada pieza, con los límites que trae puestos.',
    acciones: [
      { label: `Cargar ${topup.creditosMes.toLocaleString('es-AR')} créditos`, variante: 'primary' as const, title: `Si el mes viene cargado de avatar, el pack de ${topup.creditosMes.toLocaleString('es-AR')} por ${plata(topup.precio)} se suma al saldo sin tocar el plan`, onClick: cargar },
      { label: 'Volver', title: 'Cierra el panel sin cargar nada', onClick: () => {} },
    ],
  });

  /** El historial: lo que entró y lo que salió, sin ningún crédito sin explicar. */
  const verHistorial = () => detalle({
    titulo: `Historial de créditos · ${movs.length} movimientos`,
    sub: 'Todo lo que entró y todo lo que consumió el equipo, uno por uno. El saldo de la pantalla es la suma de esta lista: ningún crédito queda sin explicar.',
    bloques: [
      { tipo: 'datos', filas: [
        { k: 'Créditos que entraron', v: `+${entradas.toLocaleString('es-AR')}`, tono: 'green', s: `el plan ${planActual.nombre}${extra > 0 ? ` y ${extra.toLocaleString('es-AR')} del pack extra` : ''}` },
        { k: 'Créditos que consumió el equipo', v: `−${salidas.toLocaleString('es-AR')}`, tono: 'amber', s: `${PIEZAS_MES} piezas producidas: trabajo hecho, no tiempo de uso` },
        { k: 'Regeneraciones por panel', v: '0', s: 'las piezas que rechazó el panel: las paga el sistema' },
        { k: 'Saldo disponible hoy', v: saldo.toLocaleString('es-AR'), s: 'el mismo número de la tarjeta de arriba' },
        { k: 'Autonomía al techo del día', v: diasTxt(dias), s: `a ${TECHO_DIARIO.toLocaleString('es-AR')} créditos por día` },
      ] },
      { tipo: 'filas', items: movs.map(m => ({
        t: m.detalle,
        s: `${m.fecha}${m.nota ? ` · ${m.nota}` : ''}`,
        etiqueta: m.cantidad === 0 ? 'no se cobra' : `${m.cantidad > 0 ? '+' : '−'}${Math.abs(m.cantidad).toLocaleString('es-AR')}`,
        tono: m.cantidad > 0 ? 'green' as const : m.cantidad === 0 ? 'muted' as const : 'amber' as const,
      })) },
      { tipo: 'aviso' as const, tono: autoRecarga ? 'green' as const : 'amber' as const, texto: autoRecarga
        ? `Tenés la auto-recarga encendida: cuando el saldo baja de ${AUTO_RECARGA_DESDE.toLocaleString('es-AR')} créditos entra solo el pack de ${topup.creditosMes.toLocaleString('es-AR')} por ${plata(topup.precio)} y el equipo no se frena.`
        : 'Tenés la auto-recarga apagada: cuando se te acaben los créditos el equipo frena solo y te avisa por WhatsApp, aunque tenga piezas a medio hacer.' },
    ],
    fuente: 'Movimientos del motor de créditos: cada carga y cada consumo quedan con la fecha y el trabajo que los generó.',
    acciones: [
      { label: `Cargar ${topup.creditosMes.toLocaleString('es-AR')} por ${plata(topup.precio)}`, variante: 'primary', title: `Suma el pack extra de ${topup.creditosMes.toLocaleString('es-AR')} créditos: sube el saldo y queda el movimiento`, onClick: cargar },
      { label: 'Cerrar', title: 'Cierra el panel sin cargar nada', onClick: () => {} },
    ],
  });

  /** Los guardrails del creador, con su valor y su por qué. */
  const verGuardrails = () => detalle({
    titulo: `Los ${GUARDRAILS_CREADOR.length} guardrails de créditos`,
    sub: 'Los límites que el equipo no cruza solo, ni cuando tiene una idea buena. Son los mismos del motor, con los valores de un creador.',
    bloques: [
      { tipo: 'filas', items: GUARDRAILS_CREADOR.map(g => ({ t: g.nombre, s: g.porQue, etiqueta: g.valor, tono: 'purple' as const })) },
      { tipo: 'aviso', tono: 'green', texto: `Hoy el más importante es el que protege tu cuenta: la pieza que el panel rechaza no se cobra. Este mes fueron ${REPARTO[REPARTO.length - 1].v.toLocaleString('es-AR')} créditos de tu saldo, con las regeneraciones a cargo del sistema.` },
    ],
    fuente: 'Los guardrails del motor con los valores del creador: techo del día, techo del plan, verificación obligatoria y nada publicado sin tu OK.',
  });

  return (
    <div className="dash">
      <ViewHead
        icon={<I_Credit size={19} />}
        titulo={VISTAS_CREADOR.creditos.nombre}
        sub={VISTAS_CREADOR.creditos.sub}
        nums={[
          { v: saldo.toLocaleString('es-AR'), l: 'créditos disponibles' },
          { v: `Plan ${planActual.nombre}`, l: `${planActual.creditosMes.toLocaleString('es-AR')} por mes`, c: 'var(--purple3)' },
          { v: diasTxt(dias), l: `de autonomía al techo del día (${TECHO_DIARIO.toLocaleString('es-AR')})`, c: dias < 5 ? 'var(--amber)' : 'var(--green)' },
          { v: <Dinero monto={consumidoUsd} />, l: `consumido este mes en ${PIEZAS_MES} piezas` },
        ]}
      />

      {/* ============ EL SALDO Y EL PLAN: el bloque del motor, con los valores del creador ============ */}
      <div className="duo">
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Wallet size={14} style={{ color: 'var(--purple3)' }} /> Tu saldo</span>}
          action={<Badge tone="purple">Plan {planActual.nombre}</Badge>}
        >
          <div>
            <div style={{ fontSize: 38, fontWeight: 900, letterSpacing: -1.4, lineHeight: 1 }}>
              {saldo.toLocaleString('es-AR')} <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--muted)' }}>créditos</span>
            </div>
            <div className="bs" style={{ marginTop: 5 }}>
              Alcanzan para <b style={{ color: 'var(--purple3)' }}>{diasTxt(dias)}</b> de producción al techo del día
              ({TECHO_DIARIO.toLocaleString('es-AR')} créditos): ahí el equipo para, no sigue gastando.
            </div>
          </div>

          <div>
            <Gauge pct={pct} label="Disponible del plan del mes" detalle={`${saldo.toLocaleString('es-AR')} de ${planActual.creditosMes.toLocaleString('es-AR')}`} />
          </div>

          <div className="guard" style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <span style={{ color: 'var(--amber)', flexShrink: 0 }}><I_Zap size={15} /></span>
            <span className="guard-lb">Auto-recarga
              <small>{autoRecarga
                ? `Cuando el saldo baja de ${AUTO_RECARGA_DESDE.toLocaleString('es-AR')} créditos (${plata(enPlata(AUTO_RECARGA_DESDE))}) entra solo el pack de ${topup.creditosMes.toLocaleString('es-AR')} por ${plata(topup.precio)}`
                : 'Apagada: cuando se te acaben los créditos el equipo frena solo y te avisa por WhatsApp'}</small>
            </span>
            <button className={`toggle ${autoRecarga ? 'on' : ''}`}
              title={autoRecarga
                ? 'Desactivar la carga automática: el equipo frena cuando se te acaben los créditos y te avisa por WhatsApp'
                : `Activar la carga automática: cuando bajes de ${AUTO_RECARGA_DESDE.toLocaleString('es-AR')} créditos entra el pack de ${topup.creditosMes.toLocaleString('es-AR')} por ${plata(topup.precio)}`}
              onClick={() => {
                setAutoRecarga(!autoRecarga);
                setToast(autoRecarga
                  ? 'Auto-recarga apagada: el equipo frena cuando se te acaben los créditos y te avisa'
                  : `Auto-recarga encendida: cuando bajes de ${AUTO_RECARGA_DESDE.toLocaleString('es-AR')} créditos entra el pack de ${topup.creditosMes.toLocaleString('es-AR')}`);
              }} />
          </div>

          <div className="guard">
            <span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Plus size={15} /></span>
            <span className="guard-lb">Los packs no caducan
              <small>Lo que cargás de más queda en el saldo: no vence ni se pierde al cambiar de mes</small>
            </span>
            <span className="guard-val" style={{ color: extra > 0 ? 'var(--green)' : 'var(--muted)' }}>{extra.toLocaleString('es-AR')} cargados</span>
          </div>

          <div className="guard">
            <span style={{ color: 'var(--amber)', flexShrink: 0 }}><I_Shield size={15} /></span>
            <span className="guard-lb">Si se te acaban
              <small>El equipo frena solo y no publica nada sin saldo: no gasta de más ni deja una pieza a medio publicar</small>
            </span>
            <span className="guard-val" style={{ color: 'var(--green)' }}>freno</span>
          </div>

          <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <div className="dato"><span className="dato-l">Techo del día</span><span className="dato-v">{TECHO_DIARIO.toLocaleString('es-AR')}</span></div>
            <div className="dato"><span className="dato-l">Consumido este mes</span><span className="dato-v">{CONSUMIDO_MES.toLocaleString('es-AR')}</span></div>
            <div className="dato"><span className="dato-l">Del mes</span><span className="dato-v">{pct}%</span></div>
          </div>

          <div className="acc-why">
            Lo que gastás son <b>créditos de producción</b>: la vigilancia del nicho, las métricas, los
            comentarios y la verificación del panel no cuestan nada. Con la cuenta en cero se apaga
            producir: el equipo frena y no publica nada hasta que cargues.
          </div>
          <NotaMoneda />
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Shield size={14} style={{ color: 'var(--purple3)' }} /> Cambiar de plan</span>}
          action={<Badge tone="purple">Plan {planActual.nombre}</Badge>}
        >
          <div className="datos-row">
            <div className="dato"><span className="dato-l">Plan</span><span className="dato-v" style={{ color: 'var(--purple3)' }}>{planActual.nombre}</span></div>
            <div className="dato"><span className="dato-l">Precio por mes</span><span className="dato-v"><Dinero monto={planActual.precio} /></span></div>
            <div className="dato"><span className="dato-l">Créditos por mes</span><span className="dato-v">{planActual.creditosMes.toLocaleString('es-AR')}</span></div>
            <div className="dato"><span className="dato-l">Días de equipo</span><span className="dato-v">{diasDelPlan}</span></div>
          </div>

          <div className="bs" style={{ marginTop: 12 }}>
            {planActual.paraQuien} <b>{planActual.habilita}</b>.
          </div>

          <div className="guards" style={{ marginTop: 12 }}>
            {planActual.incluye.map(i => (
              <div key={i} className="guard">
                <span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Check size={14} /></span>
                <span className="guard-lb">{i}</span>
              </div>
            ))}
          </div>

          <div className="row" style={{ gap: 9, marginTop: 12, flexWrap: 'wrap' }}>
            <Button className="btn-sm"
              title={`Abre los cuatro planes con lo que habilita cada uno —avatar, publicación en tus redes y el panel en cada pieza— y cambia el tuyo desde ahí. Reversible: podés volver al plan ${planActual.nombre}.`}
              onClick={verPlanes}><I_ArrowRight size={13} /> Cambiar de plan</Button>
            <Button variant="ghost" className="btn-sm"
              title="Qué incluye tu plan hoy, cuántos días de equipo son sus créditos y cuánto te costó de verdad el trabajo del mes"
              onClick={verMiPlan}>Qué incluye el mío</Button>
          </div>

          {avisoPlan && (
            <div className="tiny" style={{ marginTop: 10, color: 'var(--green)', fontWeight: 700 }}>
              <I_Zap size={12} /> Pasaste del plan {avisoPlan.de} al {avisoPlan.a}: ahora entran {avisoPlan.creditos.toLocaleString('es-AR')} créditos
              por mes por <Dinero monto={avisoPlan.precio} />. El plan de la cuenta es uno solo, así que la píldora del
              menú cambió con vos. La diferencia se prorratea en la factura del 1º de octubre.
              <div style={{ marginTop: 8 }}>
                <Button variant="ghost" className="btn-sm"
                  title={`Vuelve al plan ${avisoPlan.de}: ${planes.find(p => p.key === avisoPlan.volver)?.creditosMes.toLocaleString('es-AR')} créditos por mes. El cambio se ve en el acto acá y en el menú.`}
                  onClick={() => aplicarPlan(avisoPlan.volver)}><I_Refresh size={12} /> Volver al plan {avisoPlan.de}</Button>
              </div>
            </div>
          )}

          <div className="acc-why">
            El plan cambia <b>cuántos créditos entran por mes</b> y hasta dónde llega el equipo: con Pro entran el
            avatar entrenado, la publicación en todas tus redes y los clips de tus videos. Lo que no cambia es el
            panel de 5: cada pieza se verifica igual en todos los planes.
          </div>
          <NotaMoneda />
        </Card>
      </div>

      {/* ============ LA GRILLA DE PRODUCCIÓN: qué cuesta cada pieza, quién la hace y en plata ============ */}
      <Card
        title={<span className="row" style={{ gap: 8 }}><I_Credit size={14} style={{ color: 'var(--purple3)' }} /> La grilla de producción</span>}
        action={<Badge tone="purple">{GRILLA_CREDITOS.length} piezas</Badge>}
      >
        <div className="como-se-lee">
          <b>Cómo se lee:</b> cada pieza que produce el equipo cuesta los créditos de esta tabla y un crédito
          son <b><Dinero monto={USD_POR_CREDITO} /></b>. Todo lo que ves en plata —el saldo, el mes, una pieza
          suelta— sale de esta misma multiplicación, y la columna de quién dice qué parte del equipo la produce.
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: 460 }}>
            <thead>
              <tr>
                <th style={TH}>Pieza</th>
                <th style={TH}>La produce</th>
                <th style={{ ...TH, textAlign: 'right' }}>Créditos</th>
                <th style={{ ...TH, textAlign: 'right' }}>En plata</th>
              </tr>
            </thead>
            <tbody>
              {GRILLA_CREDITOS.map(g => (
                <tr key={g.pieza} title={`${g.pieza}: ${g.creditos.toLocaleString('es-AR')} créditos = ${plata(enPlata(g.creditos))}. La produce ${g.quien}.`}>
                  <td style={{ ...TD, fontWeight: 600 }}>{g.pieza}</td>
                  <td style={TD}>
                    <span className="row" style={{ gap: 7, alignItems: 'center' }}>
                      <span className="reparto-dot" style={{ background: colorDeQuien(g.quien) }} />
                      <span style={{ fontWeight: 700 }}>{g.quien}</span>
                    </span>
                  </td>
                  <td style={{ ...TD, textAlign: 'right', fontWeight: 800, color: 'var(--purple3)', fontVariantNumeric: 'tabular-nums' }}>
                    {g.creditos.toLocaleString('es-AR')}
                  </td>
                  <td style={{ ...TD, textAlign: 'right' }}><Dinero monto={enPlata(g.creditos)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="row" style={{ gap: 9, marginTop: 12, flexWrap: 'wrap' }}>
          <Button variant="outline" className="btn-sm"
            title="Abre la grilla pieza por pieza, con quién la produce, lo que cuesta en dólares y cuál es la más barata y la más cara del equipo"
            onClick={verGrilla}><I_Credit size={13} /> Ver la grilla en detalle</Button>
          <Button variant="ghost" className="btn-sm"
            title={`Abre lo que produjo el equipo este mes: ${PIEZAS_MES} piezas, cuántas de cada una y cuántos créditos costaron`}
            onClick={verMes}>Ver qué salió este mes</Button>
        </div>

        <div className="acc-why">
          Las que sostienen el ritmo son las más baratas: <b>{creditosDe('Clips de un video tuyo')} crédito</b> el clip de
          un video tuyo y el texto. La más cara es el <b>video premium del avatar ({creditosDe('Video del avatar premium (5 s)')} créditos)</b>,
          para la pieza principal de la semana. La verificación del panel no se cobra: nunca pagás por producir algo que queda afuera.
        </div>
        <NotaMoneda />
      </Card>

      {/* ============ EL AVATAR Y EL REPARTO DEL MES ============ */}
      <div className="duo" style={{ marginTop: 16 }}>
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Robot size={14} style={{ color: 'var(--purple2)' }} /> Lo que cuesta el avatar</span>}
          action={<Badge tone="purple">{avatarMes.toLocaleString('es-AR')} créditos este mes</Badge>}
        >
          <div className="como-se-lee">
            <b>Cómo se lee:</b> el avatar es <b>lo más caro de producir</b> y <b>lo que más rinde</b>: crea con tu cara
            y tu voz cuando no tenés tiempo de grabar, y es el formato que más retiene en tu cuenta
            ({CRECIMIENTO.retencion.a3s} a los 3 s, con la meta en {CRECIMIENTO.retencion.meta}). Este mes se llevó{' '}
            <b>{Math.round((avatarMes / CONSUMIDO_MES) * 100)}%</b> de lo que consumiste: {plata(enPlata(avatarMes))}.
          </div>

          <div className="guards">
            {AVATAR.gasto.map(g => (
              <div key={g.pieza} className="guard" title={`${g.pieza}: ${g.creditos.toLocaleString('es-AR')} créditos = ${plata(enPlata(g.creditos))} por pieza`}>
                <span style={{ color: 'var(--purple2)', flexShrink: 0 }}><I_Robot size={14} /></span>
                <span className="guard-lb">{g.pieza}<small>{plata(enPlata(g.creditos))} por pieza{g.creditos === avatarMasBarato ? ' · lo más barato que produce' : ''}</small></span>
                <span className="guard-val">{g.creditos.toLocaleString('es-AR')}</span>
              </div>
            ))}
          </div>

          <div className="bs" style={{ marginTop: 12 }}>
            {NICHO.precioProduccion.map(p => (
              <div key={p.nivel} style={{ marginTop: 4 }}>
                <b>{p.nivel}:</b> {p.rango} · {p.nota}
              </div>
            ))}
          </div>

          <div className="row" style={{ gap: 9, marginTop: 12, flexWrap: 'wrap' }}>
            <Button variant="outline" className="btn-sm"
              title={`Abre lo que puede producir el avatar (${AVATAR.quePuede.length} tipos de pieza), lo que cuesta cada uno y los límites que trae puestos`}
              onClick={verAvatar}><I_Robot size={13} /> Ver qué produce el avatar</Button>
          </div>

          <div className="acc-why">
            Lo caro no es el capricho: el <b>video del avatar</b> es lo que mejor retiene y lo que hace crecer la
            cuenta. Por eso el mes se arma con dos videos del avatar por semana y el resto con tu material,
            que sale casi nada.
          </div>
          <NotaMoneda />
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Credit size={14} style={{ color: 'var(--purple3)' }} /> En qué se van este mes</span>}
          action={<Badge tone="purple">{REPARTO_TOTAL.toLocaleString('es-AR')} usados este mes</Badge>}
        >
          <div className="como-se-lee">
            <b>Cómo se lee:</b> el anillo es <b>todo lo que consumió el equipo este mes</b> en producir tus piezas,
            y cada porción es un tipo de pieza: los videos del avatar, los reels con tu material, las fotos y
            las historias, y los clips cortos.
          </div>

          <div className="reparto">
            <div className="reparto-ring" style={{ background: `conic-gradient(from -90deg, ${PORCIONES})` }}
              title={`Reparto de los ${REPARTO_TOTAL.toLocaleString('es-AR')} créditos que consumió el equipo este mes: ${plata(consumidoUsd)} de producción en ${PIEZAS_MES} piezas`}>
              <div className="reparto-hole">
                <div>
                  <div className="reparto-v">{REPARTO_TOTAL.toLocaleString('es-AR')}</div>
                  <div className="reparto-l">créditos del mes</div>
                </div>
              </div>
            </div>

            <div className="reparto-leyenda">
              {REPARTO.map(r => (
                <div key={r.l} className="reparto-item">
                  <span className="reparto-dot" style={{ background: r.c }} />
                  <span className="reparto-lb">
                    {r.l}<span className="reparto-pct">{Math.round((r.v / REPARTO_TOTAL) * 100)}%</span>
                    <small><b><Dinero monto={enPlata(r.v)} /></b> · {r.nota}</small>
                  </span>
                  <span className="reparto-num" style={{ color: r.c }}>{r.v.toLocaleString('es-AR')}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="acc-why">
            Cada porción es <b>trabajo hecho, no una tarifa</b>: {piezasDeRubro(MES[1])} reels con tu material y{' '}
            {piezasDeRubro(MES[3])} clips salen casi nada, y los {piezasDeRubro(MES[0])} videos del avatar se llevan
            la mayor parte. Las regeneraciones que rechazó el panel no aparecen en el anillo: las paga el sistema.
          </div>
          <div className="row" style={{ gap: 9, marginTop: 12, flexWrap: 'wrap' }}>
            <Button variant="outline" className="btn-sm"
              title={`Abre qué generó cada porción del anillo: los ${MES.length} tipos de pieza, cuántas salieron y cuántos créditos costó cada una`}
              onClick={verMes}>Ver qué lo generó</Button>
          </div>
        </Card>
      </div>

      {/* ============ CARGAR CRÉDITOS Y LOS MOVIMIENTOS ============ */}
      <div className="duo" style={{ marginTop: 16 }}>
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Plus size={14} style={{ color: 'var(--green)' }} /> Cargar créditos</span>}
          action={<Badge tone="green">{extra > 0 ? `${extra.toLocaleString('es-AR')} cargados` : '1 pack'}</Badge>}
        >
          <div className="bs">
            El pack extra se compra cuando querés y <b>no caduca</b>: se suma al plan del mes, que sigue igual.
            Sirve cuando el mes viene cargado de videos del avatar y no querés cambiar de plan.
          </div>

          <div className="guard" style={{ marginTop: 10 }}>
            <span className="guard-val" style={{ color: 'var(--purple3)', width: 52, textAlign: 'left', flexShrink: 0 }}>
              {topup.creditosMes.toLocaleString('es-AR')}
            </span>
            <span className="guard-lb">Pack extra de créditos
              <small><Dinero monto={USD_POR_CREDITO} /> por crédito · rinde ~{Math.round(topup.creditosMes / TECHO_DIARIO)} días al techo del día</small>
            </span>
            <span className="guard-val" style={{ flexShrink: 0 }}><Dinero monto={topup.precio} /></span>
            <Button className="btn-sm"
              title={`Carga ${topup.creditosMes.toLocaleString('es-AR')} créditos por ${plata(topup.precio)}: el saldo sube en el acto, queda el movimiento a la vista y no te cambia el plan`}
              onClick={cargar}>Cargar</Button>
          </div>

          <div className="bs" style={{ marginTop: 12, marginBottom: 6 }}>Los movimientos del mes:</div>
          <div className="guards">
            {movs.map((m, i) => (
              <div key={i} className="guard">
                <span style={{ color: m.cantidad > 0 ? 'var(--green)' : 'var(--muted)', flexShrink: 0 }}>
                  <I_ArrowRight size={14} style={{ transform: m.cantidad > 0 ? 'rotate(90deg)' : m.cantidad < 0 ? 'rotate(-90deg)' : 'none' }} />
                </span>
                <span className="guard-lb">{m.detalle}<small>{m.fecha}{m.nota ? ` · ${m.nota}` : ''}</small></span>
                {m.cantidad === 0
                  ? <Badge tone="green">no se cobra</Badge>
                  : <span className="guard-val" style={{ color: m.cantidad > 0 ? 'var(--green)' : 'var(--muted)' }}>
                      {m.cantidad > 0 ? '+' : '−'}{Math.abs(m.cantidad).toLocaleString('es-AR')}
                    </span>}
              </div>
            ))}
          </div>

          <div className="row" style={{ gap: 9, marginTop: 12, flexWrap: 'wrap' }}>
            <Button variant="ghost" className="btn-sm"
              title="Abre el historial completo: cada movimiento con su fecha y qué lo generó, más lo que entró y lo que salió. Se actualiza solo cuando cargás."
              onClick={verHistorial}>Ver el historial completo</Button>
          </div>

          <div className="acc-why">
            Lo que se cobra es <b>trabajo hecho, no tiempo de uso</b>: el mes que producís menos piezas, consumís
            menos. Y el pack que cargaste no se pierde: queda en el saldo para el mes que viene.
          </div>
          <NotaMoneda />
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Shield size={14} style={{ color: 'var(--green)' }} /> Los guardrails de créditos</span>}
          action={<Badge tone="green">3 activos</Badge>}
        >
          <div className="bs">
            El equipo no puede pasarse de estos límites, ni cuando tiene una idea buena. Son los mismos del
            motor, con los valores de un creador.
          </div>

          <div className="guards" style={{ marginTop: 10 }}>
            <div className="guard">
              <span style={{ color: 'var(--amber)', flexShrink: 0 }}><I_Zap size={14} /></span>
              <span className="guard-lb">{guardrailDe('Techo de gasto diario')?.nombre}
                <small>{guardrailDe('Techo de gasto diario')?.porQue} Son {Math.floor(TECHO_DIARIO / creditosDe('Video del avatar (5 s)'))} videos del avatar de 5 s por día,
                o {Math.floor(TECHO_DIARIO / creditosDe('Clips de un video tuyo')).toLocaleString('es-AR')} clips: el equipo elige dónde ponerlos.</small>
              </span>
              <span className="guard-val"><Dinero monto={enPlata(TECHO_DIARIO)} /></span>
              <Badge tone="amber">{TECHO_DIARIO.toLocaleString('es-AR')} por día</Badge>
            </div>

            <div className="guard">
              <span style={{ color: 'var(--purple3)', flexShrink: 0 }}><I_Clock size={14} /></span>
              <span className="guard-lb">{guardrailDe('Techo mensual')?.nombre}
                <small>Con tu plan {planActual.nombre} el tope son {planActual.creditosMes.toLocaleString('es-AR')} créditos al mes: {diasDelPlan} días de equipo al techo del día. El mes siguiente se renueva solo.</small>
              </span>
              <Badge tone="purple">{planActual.creditosMes.toLocaleString('es-AR')} al mes</Badge>
            </div>

            <div className="guard">
              <span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Check size={14} /></span>
              <span className="guard-lb">La pieza que el panel rechaza no se cobra
                <small>El panel de 5 la puntúa antes de publicarse y, si no llega a 80, vuelve con la objeción: la regeneración la paga el sistema.</small>
              </span>
              <Badge tone="green">no se cobra</Badge>
            </div>
          </div>

          <div className="row" style={{ gap: 9, marginTop: 14, flexWrap: 'wrap' }}>
            <Button variant="outline" className="btn-sm"
              title={`Abre los ${GUARDRAILS_CREADOR.length} guardrails del creador, con su valor y por qué existe cada uno`}
              onClick={verGuardrails}><I_Shield size={13} /> Ver los {GUARDRAILS_CREADOR.length} guardrails</Button>
            <Button variant="ghost" className="btn-sm"
              title="Abre tu plan con lo que incluye, los días de equipo de sus créditos y lo que costó el trabajo del mes"
              onClick={verMiPlan}>Qué incluye mi plan</Button>
          </div>

          <div className="acc-why">
            Un solo techo diario protege <b>los créditos de la semana</b>: sin él, una idea del equipo a las 2 de
            la mañana se llevaría lo que tenías para grabar el viernes. Y nada sale publicado sin pasar por la
            verificación y por tu OK.
          </div>
          <NotaMoneda />
        </Card>
      </div>
    </div>
  );
}

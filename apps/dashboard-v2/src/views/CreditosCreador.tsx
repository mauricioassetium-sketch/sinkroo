// =============================================================================================
// CRÉDITOS, EN PIEL DE CREADOR — el mismo bloque del motor, con la grilla y los planes del §11.
//
// 1 crédito = $0,01, con el margen del 40% del modelo. Los planes de creador traen 1.500 o 4.000
// créditos por mes, el pack extra de 1.000 no caduca, el techo del día son 300 créditos y la pieza
// que el panel rechaza NO se le cobra al creador: la regeneración por gate la paga el sistema.
//
// NINGÚN NÚMERO ESTÁ ESCRITO DOS VECES: los créditos de cada pieza salen de GRILLA_CREDITOS, los
// planes de PLANES_CREADOR y el techo diario del guardrail del §8. El anillo, la tabla del mes y el
// saldo son la misma cuenta, así que no pueden decir cosas distintas.
//
// El plan de la cuenta vive en lib/plan y lo leen la píldora del menú, la barra del mes y esta
// pantalla: cambiar de plan acá se ve en los tres lados en el mismo render.
// =============================================================================================

import { useState, type CSSProperties } from 'react';
import { Card, Badge, Button, Dinero, NotaMoneda } from '../components/ui';
import { ViewHead, Gauge } from '../components/viz';
import { I_Credit, I_Wallet, I_Zap, I_Shield, I_Plus, I_ArrowRight, I_Refresh, I_Check, I_Clock } from '../components/icons';
import { useDetalle } from '../components/Detalle';
import { usePlan } from '../lib/plan';
import { usePerfil } from '../lib/perfil';
import { importe } from '../lib/moneda';
import { GRILLA_CREDITOS, GUARDRAILS_CREADOR, PLANES_CREADOR, VISTAS_CREADOR } from '../data/creador';

// ---------------------------------------------------------------------------------------------
// LAS CUENTAS DEL §11, EN UN SOLO LUGAR
// ---------------------------------------------------------------------------------------------

/** 1 crédito = $0,01 (con el margen del 40% del modelo): es lo que convierte créditos en plata. */
const USD_POR_CREDITO = 0.01;

/** Los créditos, en dólares: sin ruido de coma flotante, porque el importe lo pinta <Dinero>. */
const enPlata = (creditos: number) => Math.round(creditos * USD_POR_CREDITO * 100) / 100;

/** El guardrail del techo diario, leído del dato: es el ritmo con el que se miden los días. */
const TECHO_DIARIO = Number(
  /(\d+)/.exec(GUARDRAILS_CREADOR.find(g => g.nombre === 'Techo de gasto diario')?.valor ?? '')?.[1] ?? 300,
);

/** Cuando el saldo baja de acá, la auto-recarga compra el pack sola. */
const AUTO_RECARGA_DESDE = 500;

/** El plan de la cuenta (lib/plan) y los escalones del creador, traducidos en los dos sentidos. */
const PLAN_DE_CUENTA: Record<string, string> = { creador: 'base', pro: 'pro' };
const PLAN_DE_CREADOR: Record<string, string> = { base: 'creador', pro: 'pro', estudio: 'pro' };

const guardrailDe = (nombre: string) => GUARDRAILS_CREADOR.find(g => g.nombre === nombre);
const creditosDe = (pieza: string) => GRILLA_CREDITOS.find(g => g.pieza === pieza)?.creditos ?? 0;

// ---------------------------------------------------------------------------------------------
// LO QUE PRODUJO EL EQUIPO ESTE MES — por rubro, y con la grilla como única fuente de créditos.
// Cada línea dice QUÉ pieza y CUÁNTAS veces salió: los créditos son cantidad × grilla.
// ---------------------------------------------------------------------------------------------

type Linea = { pieza: string; cant: number };
type Rubro = { rubro: string; color: string; nota: string; fecha: string; lineas: Linea[] };

const MES: Rubro[] = [
  {
    rubro: 'Piezas de contenido', color: 'var(--purple2)', fecha: 'del 1 al 12 de septiembre',
    nota: 'lo que sale a tu feed y a tus historias',
    lineas: [
      { pieza: 'Texto (hook, caption, guion)', cant: 6 },
      { pieza: 'Imagen simple', cant: 2 },
      { pieza: 'Foto UGC (producto en mano)', cant: 3 },
      { pieza: 'Imagen hero (portada o feed)', cant: 2 },
      { pieza: 'Video 5 s estándar', cant: 1 },
    ],
  },
  {
    rubro: 'Entregables de marcas', color: '#ec4899', fecha: 'del 8 al 21 de septiembre',
    nota: 'las piezas que le entregás a una marca, con sus indicaciones',
    lineas: [
      { pieza: 'Video 5 s estándar', cant: 2 },
      { pieza: 'Video 5 s premium', cant: 1 },
      { pieza: 'Foto UGC (producto en mano)', cant: 2 },
    ],
  },
  {
    rubro: 'Remasters 4K', color: 'var(--green)', fecha: 'del 15 al 23 de septiembre',
    nota: 'tus propias piezas, mejoradas: encuadre, color y sonido',
    lineas: [{ pieza: 'Remaster 4K de tu pieza', cant: 4 }],
  },
];

const creditosDeRubro = (r: Rubro) => r.lineas.reduce((a, l) => a + creditosDe(l.pieza) * l.cant, 0);
const piezasDeRubro = (r: Rubro) => r.lineas.reduce((a, l) => a + l.cant, 0);

/** Lo que consumió el mes, en créditos: la suma de los tres rubros. */
const CONSUMIDO_MES = MES.reduce((a, r) => a + creditosDeRubro(r), 0);

// El anillo del reparto, con la porción que el sistema NO le cobra al creador: la regeneración de
// una pieza rechazada por el panel. Va en cero y se muestra igual, porque es la parte del gasto
// que el creador no ve en ninguna factura.
const REPARTO: { l: string; v: number; c: string; nota: string }[] = [
  ...MES.map(r => ({ l: r.rubro, v: creditosDeRubro(r), c: r.color, nota: `${piezasDeRubro(r)} piezas de la grilla` })),
  { l: 'Regeneraciones por panel', v: 0, c: 'var(--muted)', nota: 'las paga el sistema' },
];

const REPARTO_TOTAL = REPARTO.reduce((a, r) => a + r.v, 0);

// Las porciones del anillo, en grados: arranca arriba (-90deg) y cierra en 360.
const PORCIONES = (() => {
  let acum = 0;
  return REPARTO.filter(r => r.v > 0).map(r => {
    const desde = (acum / REPARTO_TOTAL) * 360;
    acum += r.v;
    return `${r.c} ${desde.toFixed(3)}deg ${((acum / REPARTO_TOTAL) * 360).toFixed(3)}deg`;
  }).join(', ');
})();

// La tabla de la grilla, con la grilla que dejó el largo de las columnas.
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
  const { plan, cambiarPlan } = usePlan();

  // Los packs que compró el creador: no caducan y se suman al mes. El resto del saldo es
  // aritmética (lo que trajo el plan menos lo que consumió el equipo), no un número guardado.
  const [extra, setExtra] = useState(0);
  const [recargas, setRecargas] = useState<Mov[]>([]);
  const [autoRecarga, setAutoRecarga] = useState(true);
  const [avisoPlan, setAvisoPlan] = useState<{ de: string; a: string; creditos: number; precio: number; volver: string } | null>(null);

  const planActual = PLANES_CREADOR.find(p => p.key === PLAN_DE_CREADOR[plan.key]) ?? PLANES_CREADOR[1];
  const topup = PLANES_CREADOR.find(p => p.key === 'topup')!;
  const saldo = Math.max(0, planActual.creditosMes - CONSUMIDO_MES + extra);
  const dias = Math.max(0, Math.round(saldo / TECHO_DIARIO));
  const pct = Math.min(100, Math.round((saldo / planActual.creditosMes) * 100));
  const consumidoUsd = enPlata(CONSUMIDO_MES);

  const movs: Mov[] = [
    ...recargas,
    { detalle: `Créditos del plan ${planActual.nombre}`, fecha: '1º de septiembre', cantidad: planActual.creditosMes, nota: 'entran completos el primer día del mes' },
    ...MES.map(r => ({ detalle: r.rubro, fecha: r.fecha, cantidad: -creditosDeRubro(r), nota: `${piezasDeRubro(r)} piezas de la grilla` })),
    { detalle: 'Regeneraciones por panel', fecha: 'este mes', cantidad: 0, nota: 'las piezas que rechazó el panel: las paga el sistema' },
  ];
  const entradas = movs.filter(m => m.cantidad > 0).reduce((a, m) => a + m.cantidad, 0);
  const salidas = movs.filter(m => m.cantidad < 0).reduce((a, m) => a + Math.abs(m.cantidad), 0);

  /** El importe en sus dos textos (dólar y equivalente), para los paneles de detalle: ahí entran textos. */
  const plata = (monto: number) => {
    const t = importe(monto, perfil.moneda);
    return `${t.principal}${t.equivalente ? ` ${t.equivalente}` : ''}`;
  };

  /** Cargar el pack: sube el saldo, queda el movimiento y no se toca el plan. */
  const cargar = () => {
    setExtra(e => e + topup.creditosMes);
    setRecargas(r => [{ detalle: `Pack extra de ${topup.creditosMes.toLocaleString('es-AR')} créditos`, fecha: 'Hoy', cantidad: topup.creditosMes, nota: 'no caduca: se suma al plan del mes' }, ...r]);
    setToast(`${topup.creditosMes.toLocaleString('es-AR')} créditos cargados por ${plata(topup.precio)}: no caducan`);
  };

  /** Aplica el plan nuevo. El mismo dato mueve el menú y esta pantalla: no hay dos verdades. */
  const aplicarPlan = (key: string) => {
    const nuevo = PLANES_CREADOR.find(p => p.key === key);
    const anterior = planActual;
    if (!nuevo || nuevo.key === anterior.key) {
      setToast(`Ya estás en el plan ${anterior.nombre}: ${anterior.creditosMes.toLocaleString('es-AR')} créditos por mes`);
      return;
    }
    cambiarPlan(PLAN_DE_CUENTA[key]);
    setAvisoPlan({ de: anterior.nombre, a: nuevo.nombre, creditos: nuevo.creditosMes, precio: nuevo.precio, volver: anterior.key });
    setToast(`Ahora estás en el plan ${nuevo.nombre}: ${nuevo.creditosMes.toLocaleString('es-AR')} créditos por mes`);
  };

  // =========================================================================================
  // LOS PANELES DE DETALLE — todo botón que informa abre uno de estos, con el dato real.
  // =========================================================================================

  /** Los cuatro planes del creador: los dos que se contratan, la bienvenida y el pack extra. */
  const verPlanes = () => detalle({
    titulo: 'Elegir plan',
    sub: `Los planes de creador cambian cuántos créditos entran por mes: los seis agentes son los mismos en todos. El pack extra se suma sin cambiar de plan y no caduca.`,
    bloques: [
      ...PLANES_CREADOR.map(p => ({
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
      { tipo: 'texto', texto: `${planActual.paraQuien} La bienvenida son ${PLANES_CREADOR[0].creditosMes} créditos de regalo, una sola vez: ya la usaste cuando arrancaste.` },
      { tipo: 'aviso', tono: 'amber', texto: `Al cambiar de plan los créditos del mes se recalculan desde hoy y la diferencia se prorratea en la factura del 1º de octubre: a favor si bajás, a cobrar si subís. Reversible: podés volver al plan ${planActual.nombre} desde esta misma pantalla.` },
    ],
    fuente: 'Modelo de producto v2.0 · §11: grilla de créditos y planes de creador. Los precios son los del plan, en dólares.',
    acciones: [
      ...PLANES_CREADOR.filter(p => PLAN_DE_CUENTA[p.key] && p.key !== planActual.key).map(p => ({
        label: `Pasar al plan ${p.nombre} · ${plata(p.precio)}/mes`,
        variante: p.precio > planActual.precio ? 'primary' as const : 'outline' as const,
        title: `Cambia tu plan al ${p.nombre}: ${p.creditosMes.toLocaleString('es-AR')} créditos por mes por ${plata(p.precio)}. Reversible: podés volver al ${planActual.nombre}.`,
        onClick: () => aplicarPlan(p.key),
      })),
      { label: 'Dejarlo como está', title: 'Cierra el panel sin cambiar el plan', onClick: () => setToast(`Seguís en el plan ${planActual.nombre}`) },
    ],
  });

  /** El plan que tiene hoy: qué incluye y cuánto le costó de verdad el mes. */
  const verMiPlan = () => detalle({
    titulo: `Tu plan: ${planActual.nombre}`,
    sub: `${planActual.paraQuien} ${plata(planActual.precio)} por mes con ${planActual.creditosMes.toLocaleString('es-AR')} créditos incluidos.`,
    bloques: [
      { tipo: 'datos', filas: [
        { k: 'Precio por mes', v: plata(planActual.precio), s: 'se cobra el 1º de cada mes y se cancela cuando quieras' },
        { k: 'Créditos que incluye', v: planActual.creditosMes.toLocaleString('es-AR'), s: `${Math.floor(planActual.creditosMes / TECHO_DIARIO)} días de motor al techo del día (${TECHO_DIARIO.toLocaleString('es-AR')} créditos)` },
        { k: 'Saldo que te queda hoy', v: saldo.toLocaleString('es-AR'), s: extra > 0 ? `${planActual.creditosMes.toLocaleString('es-AR')} del plan menos ${CONSUMIDO_MES.toLocaleString('es-AR')} consumidos, más ${extra.toLocaleString('es-AR')} del pack` : `el del plan menos los ${CONSUMIDO_MES.toLocaleString('es-AR')} créditos que consumió el equipo` },
        { k: 'Lo que costó el trabajo del mes', v: plata(consumidoUsd), s: `${CONSUMIDO_MES.toLocaleString('es-AR')} créditos a un crédito = ${plata(USD_POR_CREDITO)}` },
        { k: 'Próximo cobro', v: '1º de octubre', s: 'con septiembre ya cobrado' },
      ] },
      { tipo: 'filas', items: planActual.incluye.map(i => ({ t: i, etiqueta: 'incluido', tono: 'green' as const })) },
      { tipo: 'aviso', tono: 'green', texto: 'La pieza que el panel rechaza no te cuesta créditos: la regeneración por gate la paga el sistema. El plan cambia cuánto puede hacer el equipo por mes, nunca cómo trabaja.' },
    ],
    fuente: 'Tu plan, con los créditos que entran por mes y lo que consumió el equipo. El gasto real del mes sale de la grilla de generación.',
  });

  /** La grilla del §11, pieza por pieza, con su precio en plata. */
  const verGrilla = () => detalle({
    titulo: 'Cómo se cobra cada pieza',
    sub: `La grilla de generación del creador: cada pieza cuesta lo que dice la tabla y un crédito son ${plata(USD_POR_CREDITO)}. Los precios ya incluyen el margen del 40% del modelo.`,
    bloques: [
      { tipo: 'filas', items: GRILLA_CREDITOS.map(g => ({
        t: g.pieza,
        s: `${plata(enPlata(g.creditos))} por pieza`,
        etiqueta: `${g.creditos.toLocaleString('es-AR')} créditos`,
        tono: g.pieza.startsWith('Ultra') ? 'purple' as const : 'muted' as const,
      })) },
      { tipo: 'texto', texto: `El remaster de una pieza tuya cuesta ${creditosDe('Remaster 4K de tu pieza')} crédito: es el trabajo más barato del equipo. La imagen con texto montado y el video premium son los que más cuestan, y son los que el panel puntúa antes de que salgan.` },
      { tipo: 'aviso', tono: 'green', texto: 'La regeneración de una pieza que el panel rechaza no se te cobra: la paga el sistema. Tampoco gastan créditos los pitches a marcas, los DMs ni la vigilancia del nicho.' },
    ],
    fuente: 'Modelo de producto v2.0 · §11: grilla de consumo. 1 crédito = $0,01 y el equivalente se calcula con el tipo de cambio de muestra del día.',
  });

  /** Qué salió este mes: cada línea de la grilla, con su cantidad y su cuenta. */
  const verMes = () => detalle({
    titulo: `Qué salió este mes · ${CONSUMIDO_MES.toLocaleString('es-AR')} créditos`,
    sub: `Lo que produjo el equipo desde el 1º de septiembre, pieza por pieza. ${plata(consumidoUsd)} de generación, repartidos en ${REPARTO.filter(r => r.v > 0).length} rubros.`,
    bloques: [
      { tipo: 'datos', filas: [
        { k: 'Créditos consumidos', v: CONSUMIDO_MES.toLocaleString('es-AR'), s: `sobre los ${planActual.creditosMes.toLocaleString('es-AR')} del plan ${planActual.nombre}` },
        { k: 'En plata', v: plata(consumidoUsd), s: `a un crédito = ${plata(USD_POR_CREDITO)}` },
        { k: 'Regeneraciones por panel', v: '0 créditos', s: 'las piezas rechazadas no se cobran: las paga el sistema' },
      ] },
      ...MES.map(r => ({
        tipo: 'filas' as const,
        items: [
          { t: r.rubro, s: `${piezasDeRubro(r)} piezas · ${plata(enPlata(creditosDeRubro(r)))} · ${r.fecha}`, etiqueta: `${creditosDeRubro(r).toLocaleString('es-AR')} créditos`, tono: 'purple' as const },
          ...r.lineas.map(l => ({
            t: `${l.cant}× ${l.pieza}`,
            s: `${creditosDe(l.pieza).toLocaleString('es-AR')} créditos cada una · ${plata(enPlata(l.cant * creditosDe(l.pieza)))}`,
            etiqueta: `${(l.cant * creditosDe(l.pieza)).toLocaleString('es-AR')}`,
            tono: 'muted' as const,
          })),
        ],
      })),
      { tipo: 'texto', texto: `Cada cantidad es una pieza que existe: ${MES[1].lineas[0].cant} videos de 5 s estándar y 1 premium son los entregables de Skincare Natural y Bienestar Sur, y los remasters son tus propias piezas mejoradas a 4K.` },
    ],
    fuente: 'Consumo del motor, con la grilla del §11 como precio unitario. El mismo dato alimenta el anillo de reparto de la pantalla.',
  });

  /** El historial: lo que entró y lo que salió, sin ningún crédito sin explicar. */
  const verHistorial = () => detalle({
    titulo: `Historial de créditos · ${movs.length} movimientos`,
    sub: 'Todo lo que entró y todo lo que consumió el equipo, uno por uno. El saldo de la pantalla es la suma de esta lista: ningún crédito queda sin explicar.',
    bloques: [
      { tipo: 'datos', filas: [
        { k: 'Créditos que entraron', v: `+${entradas.toLocaleString('es-AR')}`, tono: 'green', s: `el plan ${planActual.nombre}${extra > 0 ? ` y ${extra.toLocaleString('es-AR')} del pack extra` : ''}` },
        { k: 'Créditos que consumió el equipo', v: `−${salidas.toLocaleString('es-AR')}`, tono: 'amber', s: 'piezas de contenido, entregables y remasters: trabajo hecho, no tiempo de uso' },
        { k: 'Regeneraciones por panel', v: '0', s: 'las piezas que rechazó el panel: las paga el sistema' },
        { k: 'Saldo disponible hoy', v: saldo.toLocaleString('es-AR'), s: 'el mismo número de la tarjeta de arriba' },
        { k: 'Autonomía al techo del día', v: `${dias} días`, s: `a ${TECHO_DIARIO.toLocaleString('es-AR')} créditos por día` },
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

  /** Los siete guardrails del creador, con su por qué. */
  const verGuardrails = () => detalle({
    titulo: `Los ${GUARDRAILS_CREADOR.length} guardrails de créditos`,
    sub: 'Los límites que el equipo no cruza solo, ni cuando tiene una idea buena. Son los mismos del motor, con los valores de un creador.',
    bloques: [
      { tipo: 'filas', items: GUARDRAILS_CREADOR.map(g => ({ t: g.nombre, s: g.porQue, etiqueta: g.valor, tono: 'purple' as const })) },
      { tipo: 'aviso', tono: 'green', texto: `Hoy el más importante es el último: la pieza que el panel rechaza no se te cobra. Este mes fueron 0 créditos de tu saldo, con ${REPARTO[REPARTO.length - 1].v.toLocaleString('es-AR')} de regeneraciones que pagó el sistema.` },
    ],
    fuente: 'Modelo de producto v2.0 · §8 y §11: los guardrails del motor, con los valores del creador.',
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
          { v: `${dias} días`, l: `de autonomía al techo del día (${TECHO_DIARIO.toLocaleString('es-AR')})`, c: dias < 5 ? 'var(--amber)' : 'var(--green)' },
          { v: <Dinero monto={consumidoUsd} />, l: 'consumido este mes' },
        ]}
      />

      {/* ============ EL SALDO Y EL PLAN: acá se cargan los créditos y se cambia el plan ============ */}
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
              Alcanzan para <b style={{ color: 'var(--purple3)' }}>{dias} días</b> al techo del día
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
                ? `Cuando el saldo baja de ${AUTO_RECARGA_DESDE.toLocaleString('es-AR')} créditos entra solo el pack de ${topup.creditosMes.toLocaleString('es-AR')} por ${plata(topup.precio)}`
                : 'Apagada: cuando se te acaben los créditos el equipo frena solo y te avisa por WhatsApp'}</small>
            </span>
            <button className={`toggle ${autoRecarga ? 'on' : ''}`}
              title={autoRecarga
                ? `Desactivar la carga automática: el equipo frena cuando se te acaben los créditos y te avisa por WhatsApp`
                : `Activar la carga automática: cuando bajes de ${AUTO_RECARGA_DESDE.toLocaleString('es-AR')} créditos entra el pack de ${topup.creditosMes.toLocaleString('es-AR')} por ${plata(topup.precio)}`}
              onClick={() => {
                setAutoRecarga(!autoRecarga);
                setToast(autoRecarga
                  ? 'Auto-recarga apagada: el equipo frena cuando se te acaben los créditos'
                  : `Auto-recarga encendida: cuando bajes de ${AUTO_RECARGA_DESDE.toLocaleString('es-AR')} créditos entra el pack de ${topup.creditosMes.toLocaleString('es-AR')}`);
              }} />
          </div>

          <div className="guard">
            <span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Plus size={15} /></span>
            <span className="guard-lb">Los packs no caducan
              <small>Lo que comprás de más se queda en el saldo: no vence ni se pierde al cambiar de mes</small>
            </span>
            <span className="guard-val" style={{ color: extra > 0 ? 'var(--green)' : 'var(--muted)' }}>{extra.toLocaleString('es-AR')} cargados</span>
          </div>

          <div className="guard">
            <span style={{ color: 'var(--amber)', flexShrink: 0 }}><I_Shield size={15} /></span>
            <span className="guard-lb">Si se te acaban
              <small>El equipo frena solo y no publica nada sin saldo: nunca gasta de más ni deja una entrega a medias</small>
            </span>
            <span className="guard-val" style={{ color: 'var(--green)' }}>freno</span>
          </div>

          <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <div className="dato"><span className="dato-l">Techo del día</span><span className="dato-v">{TECHO_DIARIO.toLocaleString('es-AR')}</span></div>
            <div className="dato"><span className="dato-l">Consumido este mes</span><span className="dato-v">{CONSUMIDO_MES.toLocaleString('es-AR')}</span></div>
            <div className="dato"><span className="dato-l">Del mes</span><span className="dato-v">{pct}%</span></div>
          </div>

          <div className="acc-why">
            Lo que gastás son <b>créditos de generación</b>: la pauta va aparte y la vigilancia del nicho no
            cuesta nada. Con la cuenta en cero, lo único que se apaga es generar: los mensajes y los pitches siguen.
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
            <div className="dato"><span className="dato-l">Próximo cobro</span><span className="dato-v">1º de octubre</span></div>
          </div>

          <div className="guards" style={{ marginTop: 12 }}>
            {planActual.incluye.map(i => (
              <div key={i} className="guard">
                <span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Check size={14} /></span>
                <span className="guard-lb">{i}</span>
              </div>
            ))}
          </div>

          <div className="bs" style={{ marginTop: 12 }}>
            {planActual.paraQuien} <b>{planActual.habilita}</b>.
          </div>

          <div className="row" style={{ gap: 9, marginTop: 12, flexWrap: 'wrap' }}>
            <Button className="btn-sm"
              title={`Abre los planes de creador con lo que incluye cada uno y cambia el tuyo desde ahí. Reversible: podés volver al plan ${planActual.nombre}.`}
              onClick={verPlanes}><I_ArrowRight size={13} /> Cambiar de plan</Button>
            <Button variant="ghost" className="btn-sm"
              title="Qué incluye tu plan hoy, cuántos días de motor son sus créditos y cuánto te costó de verdad el trabajo del mes"
              onClick={verMiPlan}>Qué incluye el mío</Button>
          </div>

          {avisoPlan && (
            <div className="tiny" style={{ marginTop: 10, color: 'var(--green)', fontWeight: 700 }}>
              <I_Zap size={12} /> Pasaste del plan {avisoPlan.de} al {avisoPlan.a}: ahora entran {avisoPlan.creditos.toLocaleString('es-AR')} créditos
              por mes por <Dinero monto={avisoPlan.precio} />. El plan de la cuenta es uno solo, así que el menú de la
              izquierda cambió con vos. La diferencia se prorratea en la factura del 1º de octubre.
              <div style={{ marginTop: 8 }}>
                <Button variant="ghost" className="btn-sm"
                  title={`Vuelve al plan ${avisoPlan.de}: ${PLANES_CREADOR.find(p => p.key === avisoPlan.volver)?.creditosMes.toLocaleString('es-AR')} créditos por mes. El cambio se ve en el acto acá y en el menú.`}
                  onClick={() => aplicarPlan(avisoPlan.volver)}><I_Refresh size={12} /> Volver al plan {avisoPlan.de}</Button>
              </div>
            </div>
          )}

          <div className="acc-why">
            El plan cambia <b>cuántos créditos entran por mes</b>, nunca cómo trabaja el equipo: los seis agentes
            son los mismos en los tres planes. Lo que agrega Pro es el cazador de marcas, que sale a buscar deals.
          </div>
          <NotaMoneda />
        </Card>
      </div>

      {/* ============ LA GRILLA DEL §11: qué cuesta cada pieza y qué significa en plata ============ */}
      <Card
        title={<span className="row" style={{ gap: 8 }}><I_Credit size={14} style={{ color: 'var(--purple3)' }} /> La grilla de consumo</span>}
        action={<Badge tone="purple">{GRILLA_CREDITOS.length} piezas</Badge>}
      >
        <div className="como-se-lee">
          <b>Cómo se lee:</b> cada pieza del equipo cuesta los créditos de esta tabla y un crédito
          son <b><Dinero monto={USD_POR_CREDITO} /></b>. Todo lo que el creador ve en plata —el saldo, el
          mes, una pieza suelta— sale de esta misma multiplicación.
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: 420 }}>
            <thead>
              <tr>
                <th style={TH}>Pieza</th>
                <th style={{ ...TH, textAlign: 'right' }}>Créditos</th>
                <th style={{ ...TH, textAlign: 'right' }}>En plata</th>
              </tr>
            </thead>
            <tbody>
              {GRILLA_CREDITOS.map(g => (
                <tr key={g.pieza} title={`${g.pieza}: ${g.creditos.toLocaleString('es-AR')} créditos = ${plata(enPlata(g.creditos))} por pieza`}>
                  <td style={{ ...TD, fontWeight: 600 }}>{g.pieza}</td>
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
            title="Abre la grilla pieza por pieza, con lo que cuesta cada una en dólares y por qué el remaster es la más barata"
            onClick={verGrilla}><I_Credit size={13} /> Ver la grilla en detalle</Button>
          <Button variant="ghost" className="btn-sm"
            title="Abre qué pieza salió este mes, cuántas veces y cuántos créditos costó cada una"
            onClick={verMes}>Ver qué salió este mes</Button>
        </div>

        <div className="acc-why">
          La única que no pagás es la <b>Ultra (275 créditos)</b>: la paga Sinkroo. Y la pieza que el panel
          rechaza tampoco se te cobra: la regeneración por gate la paga el sistema, no tu saldo.
        </div>
        <NotaMoneda />
      </Card>

      {/* ============ EN QUÉ SE VAN Y CÓMO SE CARGA ============ */}
      <div className="duo" style={{ marginTop: 16 }}>
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Credit size={14} style={{ color: 'var(--purple3)' }} /> En qué se van este mes</span>}
          action={<Badge tone="purple">{REPARTO_TOTAL.toLocaleString('es-AR')} usados este mes</Badge>}
        >
          <div className="como-se-lee">
            <b>Cómo se lee:</b> el anillo es <b>todo lo que consumió el equipo este mes</b>, y cada porción
            es un rubro de tu trabajo: las piezas de tu feed, los entregables de una marca y los remasters.
          </div>

          <div className="reparto">
            <div className="reparto-ring" style={{ background: `conic-gradient(from -90deg, ${PORCIONES})` }}
              title={`Reparto de los ${REPARTO_TOTAL.toLocaleString('es-AR')} créditos que consumió el equipo este mes: ${plata(consumidoUsd)} de generación`}>
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
            Cada porción es <b>trabajo real, no una tarifa</b>: «piezas de contenido» son {piezasDeRubro(MES[0])} piezas
            del equipo y «entregables de marcas» son los {piezasDeRubro(MES[1])} que van a una marca, con sus
            indicaciones. Las regeneraciones que el panel rechazó no aparecen acá: las paga el sistema.
          </div>
          <div className="row" style={{ gap: 9, marginTop: 12, flexWrap: 'wrap' }}>
            <Button variant="outline" className="btn-sm"
              title="Abre qué generó cada porción del anillo: la pieza, cuántas veces salió y cuántos créditos costó"
              onClick={verMes}>Ver qué lo generó</Button>
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Plus size={14} style={{ color: 'var(--green)' }} /> Cargar créditos</span>}
          action={<Badge tone="green">{extra > 0 ? `${extra.toLocaleString('es-AR')} cargados` : '1 pack'}</Badge>}
        >
          <div className="bs">
            El pack extra se compra cuando querés y <b>no caduca</b>: se suma al plan del mes, que sigue igual.
          </div>

          <div className="guard">
            <span className="guard-val" style={{ color: 'var(--purple3)', width: 52, textAlign: 'left', flexShrink: 0 }}>
              {topup.creditosMes.toLocaleString('es-AR')}
            </span>
            <span className="guard-lb">Pack extra de créditos
              <small><Dinero monto={USD_POR_CREDITO} /> por crédito · rinde ~{Math.round(topup.creditosMes / TECHO_DIARIO)} días al techo del día</small>
            </span>
            <span className="guard-val" style={{ flexShrink: 0 }}><Dinero monto={topup.precio} /></span>
            <Button className="btn-sm"
              title={`Carga ${topup.creditosMes.toLocaleString('es-AR')} créditos por ${plata(topup.precio)}: sube el saldo en el acto, queda el movimiento y no te cambia el plan`}
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

          <div className="acc-why">
            Lo que se cobra es <b>trabajo hecho, no tiempo de uso</b>: el mes que hacés menos piezas, consumís
            menos. Y el pack que compraste no se pierde: queda en el saldo para el mes que viene.
          </div>
          <div className="row" style={{ gap: 9, marginTop: 12, flexWrap: 'wrap' }}>
            <Button variant="ghost" className="btn-sm"
              title="Abre el historial completo: cada movimiento con su fecha y qué lo generó, más lo que entró y lo que salió. Se actualiza solo cuando cargás."
              onClick={verHistorial}>Ver el historial completo</Button>
          </div>
          <NotaMoneda />
        </Card>
      </div>

      {/* ============ LOS GUARDRAILS DE CRÉDITOS ============ */}
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
              <small>{guardrailDe('Techo de gasto diario')?.porQue} Son {Math.floor(TECHO_DIARIO / creditosDe('Video 5 s estándar'))} videos de 5 s estándar ({creditosDe('Video 5 s estándar')} créditos cada uno) por día, y el equipo elige dónde ponerlos.</small>
            </span>
            <span className="guard-val"><Dinero monto={enPlata(TECHO_DIARIO)} /></span>
            <Badge tone="amber">{TECHO_DIARIO.toLocaleString('es-AR')} por día</Badge>
          </div>

          <div className="guard">
            <span style={{ color: 'var(--purple3)', flexShrink: 0 }}><I_Clock size={14} /></span>
            <span className="guard-lb">{guardrailDe('Techo mensual')?.nombre}
              <small>Con tu plan {planActual.nombre} el tope son {planActual.creditosMes.toLocaleString('es-AR')} créditos al mes: {Math.floor(planActual.creditosMes / TECHO_DIARIO)} días al techo del día. El mes siguiente se renueva solo.</small>
            </span>
            <Badge tone="purple">{planActual.creditosMes.toLocaleString('es-AR')} al mes</Badge>
          </div>

          <div className="guard">
            <span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Check size={14} /></span>
            <span className="guard-lb">La pieza que el panel rechaza no se cobra
              <small>La regeneración por gate la paga el sistema: este mes fueron 0 créditos de tu saldo, y la pieza se vuelve a generar hasta que el panel la apruebe.</small>
            </span>
            <Badge tone="green">no se cobra</Badge>
          </div>
        </div>

        <div className="row" style={{ gap: 9, marginTop: 14, flexWrap: 'wrap' }}>
          <Button variant="outline" className="btn-sm"
            title={`Abre los ${GUARDRAILS_CREADOR.length} guardrails del creador, con su valor y por qué existe cada uno`}
            onClick={verGuardrails}><I_Shield size={13} /> Ver los {GUARDRAILS_CREADOR.length} guardrails</Button>
          <Button variant="ghost" className="btn-sm"
            title="Abre tu plan con lo que incluye, los días de motor de sus créditos y lo que costó el trabajo del mes"
            onClick={verMiPlan}>Qué incluye mi plan</Button>
        </div>

        <div className="acc-why">
          Un solo techo diario protege <b>los créditos de la semana</b>: sin él, una idea del equipo a las 2 de
          la mañana se llevaría lo que tenías para grabar el viernes. Los pedidos de plata y los cobros
          siguen siendo tuyos, siempre.
        </div>
      </Card>
    </div>
  );
}

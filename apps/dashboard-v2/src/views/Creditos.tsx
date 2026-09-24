import { useState } from 'react';
import { Card, Badge, Button, Dinero, NotaMoneda } from '../components/ui';
import { ViewHead, Gauge } from '../components/viz';
import { I_Credit, I_Wallet, I_Zap, I_Download, I_Shield, I_Plus, I_ArrowRight } from '../components/icons';
import { TENANT, CREDITOS_MOV, PLANES } from '../data/demo';
import { useDetalle } from '../components/Detalle';
import { usePlan } from '../lib/plan';

// Paquetes de recarga. El precio por crédito baja cuanto más grande el paquete.
const PAQUETES = [
  { nombre: 'Mini', creditos: 500, precio: 15, unidad: '0,030', popular: false },
  { nombre: 'Estándar', creditos: 1000, precio: 25, unidad: '0,025', popular: false },
  { nombre: 'Pro', creditos: 1760, precio: 39, unidad: '0,022', popular: true },
  { nombre: 'Máximo', creditos: 5000, precio: 99, unidad: '0,020', popular: false },
];

const FACTURAS = [
  { id: 'INV-2041', fecha: '01 Sep 2026', concepto: 'Plan Pro · septiembre', monto: 79, estado: 'Pagada' },
  { id: 'INV-1987', fecha: '01 Ago 2026', concepto: 'Plan Pro · agosto', monto: 79, estado: 'Pagada' },
  { id: 'INV-1822', fecha: '15 Sep 2026', concepto: 'Recarga · paquete Pro', monto: 39, estado: 'Pendiente' },
];

// Qué generó cada movimiento: es el «en qué» que la lista de la tarjeta no dice. Los que carga el
// usuario desde acá (una recarga, por ejemplo) no están en la tabla y caen en el texto por defecto,
// que explica de dónde salen los créditos según el signo del movimiento.
const ORIGEN_MOV: Record<string, string> = {
  'Recarga de plan Pro': 'la carga del plan Pro del mes: entra completa y no se descuenta de a poco',
  'Campaña: Lanzamiento D2C': 'los días que estuvo publicando la campaña Lanzamiento D2C',
  'Análisis IA: competencia': 'el análisis de competencia que abriste el 16 de Sep',
  'Referido: Valeria Gómez': 'el premio por referida: 250 créditos por cada una que paga su primer mes',
  'Campaña: Retargeting': 'los anuncios para los que te miraron y no compraron',
};

// En qué se van los créditos del mes. Cada rubro es una porción del anillo y su `costo` es el
// precio por unidad: es el dato que permite decidir si el rubro vale la pena, así que va visible
// en la leyenda y no como nota al pie.
const CONSUMO = [
  { l: 'Campañas', v: 180, c: 'var(--purple2)', costo: '$60', detalle: 'por campaña activa al mes' },
  { l: 'Piezas y videos', v: 96, c: '#ec4899', costo: '16', detalle: 'por pieza con video' },
  { l: 'Análisis de mercado', v: 40, c: 'var(--green)', costo: '10', detalle: 'por informe profundo' },
  { l: 'Conversaciones', v: 0, c: 'var(--muted)', costo: '0', detalle: 'por conversación: incluidas en tu plan' },
];

// El número que cierra la tarjeta: el anillo, la leyenda y el título muestran ESTE total. Los rubros
// de arriba están anclados a cargos reales (2 campañas de 120 y 60, un análisis de 40 en Movimientos;
// 6 videos × 16), así que el total es su suma y no el plan menos el saldo.
const CONSUMO_TOTAL = CONSUMO.reduce((a, c) => a + c.v, 0);

// Las porciones del anillo, en grados. El anillo arranca arriba (-90deg) y cierra en 360.
const PORCIONES = (() => {
  let acum = 0;
  return CONSUMO.map(c => {
    const desde = (acum / CONSUMO_TOTAL) * 360;
    acum += c.v;
    return `${c.c} ${desde.toFixed(3)}deg ${(acum / CONSUMO_TOTAL * 360).toFixed(3)}deg`;
  }).join(', ');
})();

// =============================================================================================
// CRÉDITOS, SEGÚN LA PIEL DE LA CUENTA — el mismo bloque del motor, con dos idiomas.
//
// La decisión se toma EN ESTE componente, que no tiene estado: así el cambio de piel se resuelve
// antes de montar nada. Si el `if` viviera adentro de la pantalla de negocio (después de sus
// useState), cambiar de piel con Créditos abierto cambiaría la cantidad de hooks del mismo
// componente y React cortaría el render; acá el único hook es leer la piel, y se lee siempre.
//
// La pantalla de negocio queda tal cual estaba: sólo cambia el nombre de la función.
// =============================================================================================

export function ViewCreditos({ setToast }: { setToast: (t: string) => void }) {
  return <ViewCreditosNegocio setToast={setToast} />;
}

function ViewCreditosNegocio({ setToast }: { setToast: (t: string) => void }) {
  const detalle = useDetalle();
  const { plan, cambiarPlan } = usePlan();
  // El plan recién cambiado: la tarjeta lo deja a la vista con lo que cambió, no en un aviso.
  const [avisoPlan, setAvisoPlan] = useState<{ de: string; a: string; creditos: number } | null>(null);
  const [saldo, setSaldo] = useState(TENANT.creditos);
  const [autoRecarga, setAutoRecarga] = useState(true);
  const [metodo, setMetodo] = useState('Visa ···· 4242');
  const [movs, setMovs] = useState(CREDITOS_MOV);
  const [facturas, setFacturas] = useState(FACTURAS);

  const pct = Math.min(100, Math.round((saldo / plan.creditosMes) * 100));
  const usados = Math.max(0, plan.creditosMes - saldo);
  const dias = Math.max(0, Math.round(saldo / 150));

  const recargar = (p: typeof PAQUETES[number]) => {
    setSaldo(s => s + p.creditos);
    setMovs(prev => [{ detalle: `Recarga · paquete ${p.nombre}`, fecha: 'Hoy', cantidad: p.creditos, tipo: 'entrada' as const }, ...prev]);
    setToast(`${p.creditos.toLocaleString('es-AR')} créditos cargados con ${metodo}`);
  };

  const entradas = movs.filter(m => m.tipo === 'entrada').reduce((a, b) => a + b.cantidad, 0);
  const salidas = movs.filter(m => m.tipo === 'salida').reduce((a, b) => a + Math.abs(b.cantidad), 0);

  // =========================================================================================
  // LOS DOS BOTONES QUE MUESTRAN DATOS — no un aviso que se va solo.
  // Las facturas y el historial se abren en el panel de detalle con los datos de la pantalla,
  // uno por uno: período, monto en dólares y estado en el primer caso; qué se gastó, cuándo y en
  // qué en el segundo. Los totales salen de la propia lista, así que nunca dicen otra cosa.
  // =========================================================================================
  const pagadas = facturas.filter(f => f.estado === 'Pagada');
  const porCobrar = facturas.filter(f => f.estado !== 'Pagada');
  const totalFacturado = facturas.reduce((a, f) => a + f.monto, 0);
  const cobrado = pagadas.reduce((a, f) => a + f.monto, 0);
  const aCobrar = porCobrar.reduce((a, f) => a + f.monto, 0);

  // Cobrarla y volverla a pendiente son las dos reversibles, y lo que cambian se ve en el acto en
  // la tarjeta: el estado de la factura pasa a «Pagada» / vuelve a «Pendiente».
  const cobrarPendiente = () => {
    setFacturas(fs => fs.map(f => (f.estado === 'Pagada' ? f : { ...f, estado: 'Pagada' })));
    setToast(`Factura ${porCobrar[0].id} cobrada con ${metodo}: $${aCobrar}`);
  };
  const volverAPendiente = () => {
    setFacturas(FACTURAS);
    setToast('La factura vuelve a «Pendiente»: no se cobró nada');
  };

  const verFacturas = () => detalle({
    titulo: 'Facturas emitidas · las 3 últimas',
    sub: `Cada cobro de un plan o de un paquete deja su factura, con el período que cubre, el monto en dólares y su estado. Estas son las tres últimas: las de agosto y septiembre son del plan Pro, el que tenías entonces.`,
    bloques: [
      { tipo: 'datos', filas: [
        { k: 'Período que cubren', v: '01 Ago – 15 Sep 2026', s: 'agosto el plan completo; septiembre, el plan y una recarga' },
        { k: 'Facturas emitidas', v: String(facturas.length), s: `${pagadas.length} cobradas y ${porCobrar.length} por cobrar` },
        { k: 'Total facturado', v: `$${totalFacturado}`, s: 'lo que suman las tres, en dólares' },
        { k: 'Cobrado', v: `$${cobrado}`, tono: 'green', s: 'ya salió de tu tarjeta' },
        { k: 'Por cobrar', v: `$${aCobrar}`, tono: 'amber', s: `se cobra con ${metodo}` },
      ] },
      { tipo: 'filas', items: facturas.map(f => ({
        t: `${f.concepto} · $${f.monto}`,
        s: `período: emitida el ${f.fecha} · ${f.id}`,
        etiqueta: f.estado,
        tono: f.estado === 'Pagada' ? 'green' as const : 'amber' as const,
      })) },
      { tipo: 'texto', texto: `Las cobradas salieron de ${metodo}: el plan se cobra el primer día del mes y las recargas en el momento. El mes que viene aparece la de octubre con este mismo formato.` },
      porCobrar.length > 0
        ? { tipo: 'aviso' as const, tono: 'amber' as const, texto: `La ${porCobrar[0].id} quedó pendiente por la recarga del paquete Pro: son $${aCobrar} que se cobran en el próximo vencimiento, no dos veces.` }
        : { tipo: 'aviso' as const, tono: 'green' as const, texto: 'No queda nada por cobrar: las tres facturas están pagadas.' },
    ],
    fuente: 'Facturación de Sinkroo: cada cobro del plan o de un paquete deja su factura con ID, período y estado. Es el mismo dato que se ve en la tarjeta Movimientos.',
    acciones: porCobrar.length > 0
      ? [
          { label: `Cobrar la pendiente ($${aCobrar})`, variante: 'primary' as const, onClick: cobrarPendiente },
          { label: 'Ver los movimientos', onClick: verHistorial },
        ]
      : [
          { label: 'Volver a pendiente', onClick: volverAPendiente },
          { label: 'Ver los movimientos', onClick: verHistorial },
        ],
  });

  const verHistorial = () => detalle({
    titulo: `Historial completo de créditos · ${movs.length} movimientos`,
    sub: 'Todo lo que entró y todo lo que consumió el motor, uno por uno, con la fecha y qué lo generó. El saldo de arriba es la suma de esta lista: ningún crédito queda sin explicar.',
    bloques: [
      { tipo: 'datos', filas: [
        { k: 'Movimientos registrados', v: String(movs.length), s: `el más viejo es del ${movs[movs.length - 1].fecha}` },
        { k: 'Créditos que entraron', v: `+${entradas.toLocaleString('es-AR')}`, tono: 'green', s: 'el plan, los referidos y las recargas que hagas desde acá' },
        { k: 'Créditos que consumió el motor', v: `−${salidas.toLocaleString('es-AR')}`, tono: 'amber', s: 'campañas y análisis: trabajo hecho, no tiempo de uso' },
        { k: 'Saldo disponible hoy', v: saldo.toLocaleString('es-AR'), s: 'el mismo número de la tarjeta de arriba' },
        { k: 'Autonomía al ritmo de hoy', v: `${dias} días`, s: 'a 150 créditos por día' },
      ] },
      { tipo: 'filas', items: movs.map(m => ({
        t: m.detalle,
        s: `${m.fecha} · ${ORIGEN_MOV[m.detalle] || (m.tipo === 'entrada' ? 'créditos que entraron a tu saldo' : 'créditos que consumió el motor')}`,
        etiqueta: `${m.cantidad > 0 ? '+' : '−'}${Math.abs(m.cantidad).toLocaleString('es-AR')}`,
        tono: m.tipo === 'entrada' ? 'green' as const : 'muted' as const,
      })) },
      { tipo: 'texto', texto: 'Cada movimiento sale de un cargo real: los de campaña son los días que estuvo publicando y los de análisis, el informe que abriste. Las conversaciones con tus clientes no figuran acá porque están incluidas en el plan: no gastan créditos.' },
      { tipo: 'aviso' as const, tono: autoRecarga ? 'green' as const : 'amber' as const, texto: autoRecarga
        ? 'Tenés la auto-recarga activa: cuando bajás de 500 créditos se cargan 1.760 solos y el motor no se frena.'
        : 'Tenés la auto-recarga apagada: cuando se terminen los créditos el motor se frena solo, aunque tengas campañas andando.' },
    ],
    fuente: 'Movimientos del motor de créditos: se registra cada carga y cada consumo, con la fecha y el trabajo que lo generó.',
    acciones: [
      { label: `Recargar ${PAQUETES[2].creditos.toLocaleString('es-AR')} por $${PAQUETES[2].precio}`, variante: 'primary' as const, onClick: () => recargar(PAQUETES[2]) },
      { label: 'Cerrar', onClick: () => {} },
    ],
  });

  /** Aplica el plan nuevo: el menú y esta pantalla lo reflejan en el acto. */
  const aplicarPlan = (key: string) => {
    const antes = cambiarPlan(key);
    const nuevo = PLANES.find(p => p.key === key);
    if (nuevo && nuevo.key !== antes.key) {
      setAvisoPlan({ de: antes.nombre, a: nuevo.nombre, creditos: nuevo.creditosMes });
      setToast(`Ahora estás en el plan ${nuevo.nombre}: ${nuevo.creditosMes.toLocaleString('es-AR')} créditos por mes`);
    }
  };

  /** Elegir plan: los tres, con lo que incluye cada uno, y el cambio aplicado desde acá. */
  const verPlanes = () => detalle({
    titulo: 'Elegir plan',
    sub: 'Los tres planes hacen lo mismo: cambian cuántos créditos entran por mes y cuántas campañas pueden correr a la vez. Se cambia acá y vale desde ahora.',
    bloques: [
      ...PLANES.map(p => ({
        tipo: 'filas' as const,
        items: [
          { t: `Plan ${p.nombre} · $${p.precio} por mes`, s: `${p.creditosMes.toLocaleString('es-AR')} créditos · ${p.paraQuien}`,
            etiqueta: p.key === plan.key ? 'el tuyo' : 'elegilo abajo', tono: p.key === plan.key ? 'purple' as const : 'muted' as const },
          ...p.incluye.map(i => ({ t: i, etiqueta: 'incluido', tono: 'green' as const })),
          ...(p.falta || []).map(f => ({ t: f, etiqueta: 'no entra', tono: 'muted' as const })),
        ],
      })),
      { tipo: 'aviso', tono: 'amber', texto: 'Al cambiar, los créditos del mes se recalculan desde hoy y la diferencia entra prorrateada en la próxima factura: a favor si bajás de plan, a cobrar si subís. Reversible: podés volver al plan anterior desde esta misma pantalla.' },
    ],
    fuente: 'Precio por mes en dólares, con los créditos que incluye cada plan. El consumo no cambia con el plan: cambia cuánto entra por mes.',
    acciones: [
      ...PLANES.filter(p => p.key !== plan.key).map(p => ({
        label: `Pasar al plan ${p.nombre} · $${p.precio}/mes`,
        variante: p.precio > plan.precio ? 'primary' as const : 'outline' as const,
        title: `Cambia tu plan al ${p.nombre}: ${p.creditosMes.toLocaleString('es-AR')} créditos por mes por $${p.precio}. Reversible: podés volver al ${plan.nombre}.`,
        onClick: () => aplicarPlan(p.key),
      })),
      { label: 'Dejarlo como está', title: 'Cierra el panel sin cambiar el plan', onClick: () => {} },
    ],
  });

  /** El plan que tiene hoy: qué incluye, qué no, y cuánto le cuesta de verdad. */
  const verMiPlan = () => detalle({
    titulo: `Tu plan: ${plan.nombre}`,
    sub: `${plan.paraQuien} $${plan.precio} por mes con ${plan.creditosMes.toLocaleString('es-AR')} créditos incluidos.`,
    bloques: [
      { tipo: 'datos', filas: [
        { k: 'Precio por mes', v: `$${plan.precio}`, s: 'se cobra el 1º de cada mes y se cancela cuando quieras' },
        { k: 'Créditos que incluye', v: plan.creditosMes.toLocaleString('es-AR'), s: `unos ${Math.round(plan.creditosMes / 150)} días de motor al consumo de hoy (150 por día)` },
        { k: 'Saldo que te queda hoy', v: saldo.toLocaleString('es-AR'), s: 'el mismo número de la tarjeta de arriba' },
        { k: 'Lo que consumió el motor este mes', v: `${usados.toLocaleString('es-AR')} créditos`, s: `equivale a $${(usados * 0.022).toFixed(0)} de trabajo hecho` },
        { k: 'Próximo cobro', v: '1º de octubre', s: 'con agosto y septiembre ya cobrados' },
      ] },
      { tipo: 'filas', items: plan.incluye.map(i => ({ t: i, etiqueta: 'incluido', tono: 'green' as const })) },
      ...(plan.falta && plan.falta.length
        ? [{ tipo: 'pasos' as const, items: plan.falta.map(f => `En ${plan.nombre} no entra: ${f}`) }]
        : []),
      { tipo: 'aviso', texto: 'El plan no cambia cómo trabaja el motor: cambia cuánto puede hacer por mes. Bajar de plan no frena nada de lo que ya está corriendo.' },
    ],
    fuente: 'Cada pieza, análisis o campaña consume créditos: ronda 120, variante 16, imagen 12, video 60 y evaluación 8 por pieza. El plan define cuántos entran por mes.',
    acciones: [
      { label: 'Ver los otros planes', title: 'Abre la comparación de los tres planes para cambiar el tuyo', onClick: verPlanes },
      { label: 'Cerrar', title: 'Cierra el panel sin cambiar nada', onClick: () => {} },
    ],
  });

  return (
    <div className="dash">
      <ViewHead
        icon={<I_Credit size={19} />}
        titulo="Créditos"
        sub="Un crédito es una unidad de trabajo del motor: cada análisis, pieza o campaña consume. Acá cargás, ves en qué se va y cambiás de plan."
        nums={[
          { v: saldo.toLocaleString('es-AR'), l: 'créditos disponibles' },
          { v: `Plan ${plan.nombre}`, l: `${plan.creditosMes.toLocaleString('es-AR')} por mes`, c: 'var(--purple3)' },
          { v: `${dias} días`, l: 'de autonomía al ritmo de hoy', c: dias < 10 ? 'var(--amber)' : 'var(--green)' },
          { v: <Dinero monto={Number((usados * 0.022).toFixed(0))} />, l: 'consumido este mes' },
        ]}
      />

      {/* ============ TU PLAN: acá se cambia ============
          El dueño lo pidió porque no había dónde: el plan se veía en la píldora del menú pero no
          se podía tocar. La tarjeta muestra el plan, lo que cuesta y lo que incluye, y el cambio
          se aplica al instante: el menú y esta pantalla dicen lo mismo. */}
      <Card
        title={<span className="row" style={{ gap: 8 }}><I_Shield size={14} style={{ color: 'var(--purple3)' }} /> Tu plan</span>}
        action={<Badge tone="purple">Plan {plan.nombre}</Badge>}
      >
        <div className="datos-row">
          <div className="dato"><span className="dato-l">Plan</span><span className="dato-v" style={{ color: 'var(--purple3)' }}>{plan.nombre}</span></div>
          <div className="dato"><span className="dato-l">Precio por mes</span><span className="dato-v"><Dinero monto={plan.precio} /></span></div>
          <div className="dato"><span className="dato-l">Créditos por mes</span><span className="dato-v">{plan.creditosMes.toLocaleString('es-AR')}</span></div>
          <div className="dato"><span className="dato-l">Próximo cobro</span><span className="dato-v">1º de octubre</span></div>
        </div>
        <div className="bs" style={{ marginTop: 12 }}>
          {plan.paraQuien} El plan define <b>cuántos créditos entran por mes</b>: cambiar de plan cambia el techo,
          no la forma en que trabaja el motor.
        </div>
        <div className="row" style={{ gap: 9, marginTop: 12, flexWrap: 'wrap' }}>
          <Button className="btn-sm" title="Abre los tres planes con lo que incluye cada uno y cambia el tuyo desde ahí. Reversible: podés volver al que tenés."
            onClick={verPlanes}><I_ArrowRight size={13} /> Cambiar de plan</Button>
          <Button variant="ghost" className="btn-sm" title="Qué incluye tu plan hoy, qué no entra y cuánto te costó de verdad el trabajo de este mes"
            onClick={verMiPlan}>Qué incluye el mío</Button>
        </div>
        {avisoPlan && (
          <div className="tiny" style={{ marginTop: 10, color: 'var(--green)', fontWeight: 700 }}>
            <I_Zap size={12} /> Pasaste del plan {avisoPlan.de} al {avisoPlan.a}: ahora entran {avisoPlan.creditos.toLocaleString('es-AR')} créditos
            por mes y el menú de la izquierda ya dice {avisoPlan.a}. La diferencia se prorratea en la factura del 1º de octubre.
            {' '}Reversible: podés volver al {avisoPlan.de} desde acá.
          </div>
        )}
        <NotaMoneda />
      </Card>

      {/* ============ EL SALDO Y CÓMO CARGARLO ============ */}
      <div className="duo">
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Wallet size={14} style={{ color: 'var(--purple3)' }} /> Tu saldo</span>}
          action={<Badge tone="purple">Plan {plan.nombre}</Badge>}
        >
          <div>
            <div style={{ fontSize: 38, fontWeight: 900, letterSpacing: -1.4, lineHeight: 1 }}>
              {saldo.toLocaleString('es-AR')} <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--muted)' }}>créditos</span>
            </div>
            <div className="bs" style={{ marginTop: 5 }}>
              Alcanzan para <b style={{ color: 'var(--purple3)' }}>{dias} días</b> más con el consumo actual.
            </div>
          </div>

          <div>
            <Gauge pct={pct} label="Disponible del plan del mes" detalle={`${saldo.toLocaleString('es-AR')} de ${plan.creditosMes.toLocaleString('es-AR')}`} />
          </div>

          <div className="guard" style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <span style={{ color: 'var(--amber)', flexShrink: 0 }}><I_Zap size={15} /></span>
            <span className="guard-lb">Auto-recarga
              <small>Cuando bajás de 500 créditos, se cargan 1.760 solos</small>
            </span>
            <button className={`toggle ${autoRecarga ? 'on' : ''}`} title={autoRecarga ? 'Desactivar la carga automática' : 'Activar la carga automática'}
              onClick={() => { setAutoRecarga(!autoRecarga); setToast(autoRecarga ? 'Auto-recarga desactivada' : 'Auto-recarga activada'); }} />
          </div>

          <div className="guard">
            <span style={{ color: '#818cf8', flexShrink: 0 }}><I_Credit size={15} /></span>
            <span className="guard-lb">Método de pago
              <small>{metodo} · se cobra el 1º de cada mes</small>
            </span>
            <Button variant="ghost" className="btn-sm" title="Cambiás la tarjeta con la que se paga el plan y las recargas"
              onClick={() => { setMetodo(m => m.startsWith('Visa') ? 'Mastercard ···· 8801' : 'Visa ···· 4242'); setToast('Método de pago cambiado'); }}>Cambiar</Button>
          </div>

          <div className="guard">
            <span style={{ color: 'var(--amber)', flexShrink: 0 }}><I_Shield size={15} /></span>
            <span className="guard-lb">Si se te acaban
              <small>El motor se frena solo y te avisa antes: nunca gasta de más ni publica sin saldo</small>
            </span>
            <span className="guard-val" style={{ color: 'var(--green)' }}>freno</span>
          </div>

          <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <div className="dato"><span className="dato-l">Consumo por día</span><span className="dato-v">150</span></div>
            <div className="dato"><span className="dato-l">Última recarga</span><span className="dato-v">hace 12 días</span></div>
            <div className="dato"><span className="dato-l">Vencen</span><span className="dato-v">a los 12 meses</span></div>
          </div>

          <div className="acc-why">
            El motor <b>se frena solo cuando te quedás sin créditos</b>: no sigue gastando ni publicando.
            Por eso la auto-recarga existe: para que no se detenga justo cuando una campaña está funcionando.
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Plus size={14} style={{ color: 'var(--green)' }} /> Cargar el motor</span>}
          action={<Badge tone="green">4 paquetes</Badge>}
        >
          <div className="bs">
            Se paga con {metodo}. <b>Cuanto más grande el paquete, menos sale cada crédito</b> y más tiempo trabaja solo.
          </div>
          {PAQUETES.map(p => (
            <div key={p.nombre} className="guard">
              <span className="guard-val" style={{ color: 'var(--purple3)', width: 52, textAlign: 'left', flexShrink: 0 }}>
                {p.creditos.toLocaleString('es-AR')}
              </span>
              <span className="guard-lb">{p.nombre}{p.popular && <span className="badge badge-purple" style={{ fontSize: 8.5, marginLeft: 6 }}>el más elegido</span>}
                <small><Dinero monto={`$${p.unidad}`} equivalente={false} /> por crédito · rinde ~{Math.round(p.creditos / 150)} días</small>
              </span>
              <span className="guard-val" style={{ flexShrink: 0 }}><Dinero monto={p.precio} /></span>
              <Button className="btn-sm" title={`Carga ${p.creditos.toLocaleString('es-AR')} créditos por $${p.precio} con ${metodo}`}
                onClick={() => recargar(p)}>Recargar</Button>
            </div>
          ))}
          <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <div className="dato"><span className="dato-l">Formas de pago</span><span className="dato-v">Tarjeta y transferencia</span></div>
            <div className="dato"><span className="dato-l">Los créditos vencen</span><span className="dato-v">a los 12 meses</span></div>
          </div>
          <div className="acc-why">
            Lo que se cobra es <b>trabajo hecho, no tiempo de uso</b>: si un mes no publicás nada,
            casi no consumís. Las conversaciones con tus clientes están incluidas y nunca gastan créditos.
          </div>
          <NotaMoneda />
        </Card>
      </div>

      {/* ============ EN QUÉ SE VA Y LOS MOVIMIENTOS ============ */}
      <div className="duo" style={{ marginTop: 16 }}>
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Credit size={14} style={{ color: 'var(--purple3)' }} /> En qué se van</span>}
          action={<Badge tone="purple">{CONSUMO_TOTAL.toLocaleString('es-AR')} usados este mes</Badge>}
        >
          <div className="como-se-lee">
            <b>Cómo se lee:</b> el anillo es <b>el total de lo que consumió el motor este mes</b>, y cada
            porción es un rubro. Si un rubro te sorprende, podés abrir la bitácora y ver qué lo generó.
          </div>

          <div className="reparto">
            <div className="reparto-ring" style={{ background: `conic-gradient(from -90deg, ${PORCIONES})` }}
              title={`Reparto de los ${CONSUMO_TOTAL.toLocaleString('es-AR')} créditos que consumió el motor este mes`}>
              <div className="reparto-hole">
                <div>
                  <div className="reparto-v">{CONSUMO_TOTAL.toLocaleString('es-AR')}</div>
                  <div className="reparto-l">créditos del mes</div>
                </div>
              </div>
            </div>

            <div className="reparto-leyenda">
              {CONSUMO.map(c => (
                <div key={c.l} className="reparto-item">
                  <span className="reparto-dot" style={{ background: c.c }} />
                  <span className="reparto-lb">
                    {c.l}<span className="reparto-pct">{Math.round((c.v / CONSUMO_TOTAL) * 100)}%</span>
                    <small><b><Dinero monto={c.costo} equivalente={false} /></b> {c.detalle}</small>
                  </span>
                  <span className="reparto-num" style={{ color: c.c }}>{c.v.toLocaleString('es-AR')}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="acc-why">
            Cada porción es <b>trabajo real, no una tarifa</b>: "piezas y videos" son 6 videos producidos
            este mes. Las conversaciones con tus clientes están incluidas en el plan, por eso no gastan créditos.
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Credit size={14} style={{ color: 'var(--green)' }} /> Movimientos</span>}
          action={<Badge tone="green">+{entradas.toLocaleString('es-AR')} · −{salidas.toLocaleString('es-AR')}</Badge>}
        >
          <div className="guards">
            {movs.map((m, i) => (
              <div key={i} className="guard">
                <span style={{ color: m.tipo === 'entrada' ? 'var(--green)' : 'var(--muted)', flexShrink: 0 }}>
                  <I_ArrowRight size={14} style={{ transform: m.tipo === 'entrada' ? 'rotate(90deg)' : 'rotate(-90deg)' }} />
                </span>
                <span className="guard-lb">{m.detalle}<small>{m.fecha}</small></span>
                <span className="guard-val" style={{ color: m.tipo === 'entrada' ? 'var(--green)' : 'var(--muted)' }}>
                  {m.cantidad > 0 ? '+' : ''}{m.cantidad.toLocaleString('es-AR')}
                </span>
              </div>
            ))}
          </div>
          <div>
            <div className="bs" style={{ marginBottom: 9 }}>Facturas del plan:</div>
            <div className="guards">
              {facturas.map(f => (
                <div key={f.id} className="guard">
                  <span style={{ color: 'var(--muted)', flexShrink: 0 }}><I_Shield size={14} /></span>
                  <span className="guard-lb">{f.concepto}<small>{f.fecha} · {f.id}</small></span>
                  <Badge tone={f.estado === 'Pagada' ? 'green' : 'amber'}>{f.estado}</Badge>
                  <span className="guard-val"><Dinero monto={f.monto} /></span>
                </div>
              ))}
            </div>
          </div>
          <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
            <Button variant="outline" className="btn-sm" title="Abre las 3 facturas emitidas: qué período cubre cada una, cuánto sale en dólares y si está cobrada. Desde el panel se cobra la pendiente con el método del plan, y eso se puede volver atrás."
              onClick={verFacturas}><I_Download size={13} /> Descargar facturas</Button>
            <Button variant="ghost" className="btn-sm" title="Abre el historial completo de créditos: cada movimiento con la fecha y qué lo generó, más lo que entró y lo que salió. Se actualiza solo cuando recargás."
              onClick={verHistorial}>Ver todo el historial</Button>
          </div>
          <div className="acc-why">
            Los datos de tu tarjeta <b>los maneja la pasarela de pago, no Sinkroo</b>:
            acá solo guardamos los últimos 4 dígitos para que sepas con qué se cobra.
          </div>
        </Card>
      </div>
    </div>
  );
}

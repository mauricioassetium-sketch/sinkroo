import { useState } from 'react';
import { Card, Badge, Button, Dinero, NotaMoneda } from '../components/ui';
import { ViewHead, Gauge } from '../components/viz';
import { I_Credit, I_Wallet, I_Zap, I_Download, I_Shield, I_Plus, I_ArrowRight } from '../components/icons';
import { TENANT, CREDITOS_MOV } from '../data/demo';
import { useDetalle } from '../components/Detalle';

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

export function ViewCreditos({ setToast }: { setToast: (t: string) => void }) {
  const detalle = useDetalle();
  const [saldo, setSaldo] = useState(TENANT.creditos);
  const [autoRecarga, setAutoRecarga] = useState(true);
  const [metodo, setMetodo] = useState('Visa ···· 4242');
  const [movs, setMovs] = useState(CREDITOS_MOV);
  const [facturas, setFacturas] = useState(FACTURAS);

  const pct = Math.min(100, Math.round((saldo / TENANT.creditosMes) * 100));
  const usados = Math.max(0, TENANT.creditosMes - saldo);
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
    sub: `Cada cobro de tu plan ${TENANT.plan} o de un paquete deja su factura, con el período que cubre, el monto en dólares y su estado. Estas son las tres últimas.`,
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

  return (
    <div className="dash">
      <ViewHead
        icon={<I_Credit size={19} />}
        titulo="Créditos"
        sub="Un crédito es una unidad de trabajo del motor: cada análisis, pieza o campaña consume. Acá cargás y ves en qué se va."
        nums={[
          { v: saldo.toLocaleString('es-AR'), l: 'créditos disponibles' },
          { v: `Plan ${TENANT.plan}`, l: `${TENANT.creditosMes.toLocaleString('es-AR')} por mes`, c: 'var(--purple3)' },
          { v: `${dias} días`, l: 'de autonomía al ritmo de hoy', c: dias < 10 ? 'var(--amber)' : 'var(--green)' },
          { v: <Dinero monto={Number((usados * 0.022).toFixed(0))} />, l: 'consumido este mes' },
        ]}
      />

      {/* ============ EL SALDO Y CÓMO CARGARLO ============ */}
      <div className="duo">
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Wallet size={14} style={{ color: 'var(--purple3)' }} /> Tu saldo</span>}
          action={<Badge tone="purple">Plan {TENANT.plan}</Badge>}
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
            <Gauge pct={pct} label="Disponible del plan del mes" detalle={`${saldo.toLocaleString('es-AR')} de ${TENANT.creditosMes.toLocaleString('es-AR')}`} />
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

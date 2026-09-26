import { useState } from 'react';
import { Card, Badge, Button, Dinero, NotaMoneda } from '../components/ui';
import { ViewHead, Gauge } from '../components/viz';
import { I_Credit, I_Wallet, I_Zap, I_Shield, I_Plus, I_ArrowRight } from '../components/icons';
import { PLANES } from '../data/demo';
import { useDetalle } from '../components/Detalle';
import { useDatos } from '../api/datos';
import { baseApi, token } from '../api/cliente';
import { EstadoVacio } from '../components/EstadoVacio';

// =============================================================================================
// CRÉDITOS — con el back encendido, TODO sale de su cuenta: el saldo y el libro de movimientos
// (`d.creditos`), y el plan, del negocio (`d.negocio.plan`). Lo que el back todavía no manda va en
// «—» con la línea que lo explica: nunca se rellena con un número de ejemplo.
//
// Sin back (modo demostración) no hay cuenta que leer, así que la pantalla es la misma: el estado
// vacío honesto, sin saldo, sin movimientos y sin consumo de ejemplo.
//
// LO ÚNICO QUE NO ES DATO SUYO es el catálogo del producto, y va como tal: los paquetes de recarga
// con su precio por crédito y los planes con lo que incluye cada uno, sin marcar ninguno como el
// suyo (el suyo sale del back).
// =============================================================================================

// Paquetes de recarga. El precio por crédito baja cuanto más grande el paquete: es la lista de
// precios de lo que se puede contratar, no lo que este negocio tenga contratado.
const PAQUETES = [
  { nombre: 'Mini', creditos: 500, precio: 15, unidad: '0,030', popular: false },
  { nombre: 'Estándar', creditos: 1000, precio: 25, unidad: '0,025', popular: false },
  { nombre: 'Pro', creditos: 1760, precio: 39, unidad: '0,022', popular: true },
  { nombre: 'Máximo', creditos: 5000, precio: 99, unidad: '0,020', popular: false },
];

// Qué es cada movimiento que llega del back: su nombre para la lista y qué lo generó para el
// historial. Los motivos son los códigos que escribe el back (`plan`, `evaluacion`, `recarga`…),
// no texto para mostrar.
const MOTIVOS: Record<string, { nombre: string; origen: string }> = {
  plan: { nombre: 'plan del mes', origen: 'la carga de su plan del mes: entra completa y el motor la descuenta a medida que trabaja' },
  evaluacion: { nombre: 'evaluación', origen: 'cada pieza que pasa por los 5 jueces y los 500 del público cuesta 48 créditos' },
  campana: { nombre: 'campaña', origen: 'los días que estuvieron publicando sus campañas' },
  recarga: { nombre: 'recarga', origen: 'una recarga de créditos que se cargó desde esta pantalla' },
  referido: { nombre: 'referido', origen: 'el premio por un referido que pagó su primer mes' },
  ajuste: { nombre: 'ajuste', origen: 'un ajuste del saldo hecho por Sinkroo' },
};

// Un movimiento con la forma que muestra la pantalla: qué fue, cuándo, cuánto sumó (o restó) y su motivo.
type MovCredito = { detalle: string; fecha: string; cantidad: number; tipo: 'entrada' | 'salida'; motivo?: string };

/** La fecha del libro del back, en corto y en hora local («24 de sept»). */
const fechaCorta = (iso: string) => {
  const f = new Date(iso);
  return isNaN(+f) ? '' : f.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
};

/** La primera letra en mayúscula: los motivos del back vienen en minúscula («campaña»). */
const capitalizar = (t: string) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : '');

const movsDelBack = (movs: { delta: number; motivo: string; detalle: string; created_at: string }[]): MovCredito[] =>
  movs.map(m => ({
    detalle: m.detalle || m.motivo,
    fecha: fechaCorta(m.created_at),
    cantidad: m.delta,
    tipo: m.delta >= 0 ? 'entrada' as const : 'salida' as const,
    motivo: m.motivo,
  }));

/** Un rubro del anillo: qué se consumió, cuánto y de cuántos movimientos sale. */
type Rubro = { l: string; v: number; c: string; detalle: string };

/** Los colores del anillo, en orden: los rubros se arman con el libro, así que el color se reparte. */
const PALETA_RUBROS = ['var(--purple2)', '#ec4899', 'var(--green)', '#06b6d4', '#f59e0b', '#8b5cf6'];

// Las porciones del anillo, en grados. El anillo arranca arriba (-90deg) y cierra en 360. Se arma
// con los rubros que se estén mostrando, y el anillo, la leyenda y el título usan el MISMO total:
// así el reparto nunca dice una cosa distinta de los números de al lado.
const porcionesDe = (rubros: Rubro[], total: number) => {
  let acum = 0;
  return rubros.filter(r => r.v > 0).map(r => {
    const desde = (acum / (total || 1)) * 360;
    acum += r.v;
    return `${r.c} ${desde.toFixed(3)}deg ${(acum / (total || 1) * 360).toFixed(3)}deg`;
  }).join(', ');
};

// =============================================================================================
// CRÉDITOS, SEGÚN LA PIEL DE LA CUENTA — el mismo bloque del motor, con dos idiomas.
//
// La decisión se toma EN ESTE componente, que no tiene estado: así el cambio de piel se resuelve
// antes de montar nada. Si el `if` viviera adentro de la pantalla de negocio (después de sus
// useState), cambiar de piel con Créditos abierto cambiaría la cantidad de hooks del mismo
// componente y React cortaría el render; aquí el único hook es leer la piel, y se lee siempre.
// =============================================================================================

export function ViewCreditos({ setToast }: { setToast: (t: string) => void }) {
  return <ViewCreditosNegocio setToast={setToast} />;
}

function ViewCreditosNegocio({ setToast }: { setToast: (t: string) => void }) {
  const detalle = useDetalle();
  // De dónde sale todo: del back. Sin back no hay cuenta, así que la pantalla es el estado vacío.
  const d = useDatos();
  const esReal = d.real;
  // EL PLAN DEL NEGOCIO ES EL QUE MANDA EL BACK (`d.negocio.plan`). El catálogo de planes —precio,
  // créditos por mes y qué incluye— es del producto, no de la cuenta: se usa para explicar lo que
  // hay contratado y para mostrar la lista de precios, y NUNCA para decir que el suyo es uno de
  // ejemplo. Si el plan del back no está en el catálogo, lo que no se sabe va en «—».
  const planDelBack = esReal ? PLANES.find(p => p.key === d.negocio?.plan) : undefined;
  const planNombre = planDelBack?.nombre ?? (esReal ? (d.negocio?.plan || null) : null);
  const creditosMes: number | null = planDelBack?.creditosMes ?? null;

  // La auto-recarga: una decisión de esta visita. El back todavía no la guarda, así que ni el
  // estado ni lo que se encienda desde acá se presentan como algo que ya esté puesto en la cuenta.
  const [autoRecarga, setAutoRecarga] = useState(false);

  // El saldo y el libro: los del back cuando hay back; sin back no se sabe, y va en «—».
  const saldo: number | null = esReal ? (d.creditos?.saldo ?? 0) : null;
  const movs: MovCredito[] = esReal ? movsDelBack(d.creditos?.movimientos ?? []) : [];
  // Mientras lee no se afirma nada; con el libro vacío, la tarjeta dice qué va a quedar acá.
  const leyendo = d.cargando && movs.length === 0;
  const sinMovimientos = !d.cargando && movs.length === 0;

  const entradas = movs.filter(m => m.tipo === 'entrada').reduce((a, b) => a + b.cantidad, 0);
  const salidas = movs.filter(m => m.tipo === 'salida').reduce((a, b) => a + Math.abs(b.cantidad), 0);
  // Lo consumido: la suma de las salidas REALES del libro. No es el plan menos el saldo: eso
  // supondría que todo lo que falta se gastó.
  const usados = salidas;

  const pct = creditosMes && saldo !== null ? Math.min(100, Math.round((saldo / creditosMes) * 100)) : 0;
  const dias: number | null = saldo === null ? null : Math.max(0, Math.round(saldo / 150));

  const recargar = (p: typeof PAQUETES[number]) => {
    // Sin back no hay cuenta a la que cargarle créditos: se dice, no se suma nada a ninguna parte.
    if (!esReal) {
      setToast('El panel todavía no está conectado a su cuenta: cuando la conecte, la recarga entra a su saldo');
      return;
    }
    // Con el back encendido la recarga se escribe en el libro del negocio y el saldo se vuelve a leer
    // del servidor: el número que queda en pantalla es el del back, no uno de esta tarjeta.
    void fetch(baseApi() + '/api/creditos/cargar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token() },
      body: JSON.stringify({ monto: p.creditos, motivo: 'recarga' }),
    })
      .then(r => (r.ok ? d.refrescar() : Promise.reject(new Error(`error ${r.status}`))))
      .then(() => setToast(`${p.creditos.toLocaleString('es-CO')} créditos cargados a su cuenta`))
      .catch(() => setToast('No se pudo cargar: el servidor no respondió'));
  };

  // =========================================================================================
  // EN QUÉ SE VAN — los rubros del anillo, armados con los movimientos REALES del libro
  // agrupados por su motivo: cada porción es un cargo que de verdad existió y el total es la
  // suma de su propia lista. Sin consumo, no hay anillo: va el estado vacío.
  // =========================================================================================
  const rubros: Rubro[] = (() => {
    const porMotivo = new Map<string, { v: number; n: number }>();
    for (const m of movs) {
      if (m.tipo !== 'salida') continue;
      const k = m.motivo || 'otro';
      const antes = porMotivo.get(k) ?? { v: 0, n: 0 };
      porMotivo.set(k, { v: antes.v + Math.abs(m.cantidad), n: antes.n + 1 });
    }
    return [...porMotivo.entries()]
      .sort((a, b) => b[1].v - a[1].v)
      .map(([k, x], i) => ({
        l: capitalizar(MOTIVOS[k]?.nombre ?? k),
        v: x.v,
        c: PALETA_RUBROS[i % PALETA_RUBROS.length],
        detalle: `${x.n} movimiento${x.n === 1 ? '' : 's'} de su libro de créditos`,
      }));
  })();
  const totalRubros = rubros.reduce((a, r) => a + r.v, 0);
  const porciones = porcionesDe(rubros, totalRubros);

  // =========================================================================================
  // LOS DOS BOTONES QUE MUESTRAN DATOS — no un aviso que se va solo.
  // El historial se abre con los movimientos de la pantalla, uno por uno, y los planes con la
  // lista de precios del producto. Los totales salen de la propia lista, así que nunca dicen otra cosa.
  // =========================================================================================
  const verHistorial = () => detalle({
    titulo: `Historial completo de créditos · ${movs.length} movimiento${movs.length === 1 ? '' : 's'}`,
    sub: 'Todo lo que entró y todo lo que consumió el motor, uno por uno, con la fecha y qué lo generó. El saldo de arriba es la suma de esta lista: ningún crédito queda sin explicar.',
    bloques: [
      { tipo: 'datos', filas: [
        { k: 'Movimientos registrados', v: String(movs.length), s: movs.length ? `el más viejo es del ${movs[movs.length - 1].fecha}` : 'el libro todavía no tiene movimientos' },
        { k: 'Créditos que entraron', v: `+${entradas.toLocaleString('es-CO')}`, tono: 'green', s: 'el plan, los referidos y las recargas que haga desde aquí' },
        { k: 'Créditos que consumió el motor', v: `−${salidas.toLocaleString('es-CO')}`, tono: 'amber', s: 'campañas y análisis: trabajo hecho, no tiempo de uso' },
        { k: 'Saldo disponible hoy', v: saldo === null ? '—' : saldo.toLocaleString('es-CO'), s: saldo === null ? 'todavía no se leyó su cuenta' : 'el mismo número de la tarjeta de arriba' },
        { k: 'Autonomía al ritmo de hoy', v: dias === null ? '—' : `${dias} días`, s: 'a 150 créditos por día' },
      ] },
      { tipo: 'filas', items: movs.map(m => ({
        t: `${m.detalle}${m.motivo ? ` · ${MOTIVOS[m.motivo]?.nombre ?? m.motivo}` : ''}`,
        s: `${m.fecha} · ${MOTIVOS[m.motivo ?? '']?.origen || (m.tipo === 'entrada' ? 'créditos que entraron a su saldo' : 'créditos que consumió el motor')}`,
        etiqueta: `${m.cantidad > 0 ? '+' : '−'}${Math.abs(m.cantidad).toLocaleString('es-CO')}`,
        tono: m.tipo === 'entrada' ? 'green' as const : 'muted' as const,
      })) },
      { tipo: 'texto', texto: 'Cada movimiento sale de un cargo real: los de campaña son los días que estuvo publicando y los de análisis, el informe que abrió. Las conversaciones con sus clientes no figuran aquí porque están incluidas en el plan: no gastan créditos.' },
      { tipo: 'aviso' as const, tono: autoRecarga ? 'green' as const : 'amber' as const, texto: autoRecarga
        ? 'Tiene la auto-recarga encendida en esta visita: cuando baja de 500 créditos se carga el próximo paquete solo y el motor no se frena. Todavía no queda guardada en su cuenta.'
        : 'Tiene la auto-recarga apagada: cuando se terminen los créditos el motor se frena solo, aunque tenga campañas corriendo.' },
    ],
    fuente: 'Movimientos del motor de créditos: se registra cada carga y cada consumo, con la fecha y el trabajo que lo generó. Lo que su cuenta todavía no tiene, no aparece acá.',
    acciones: [
      { label: `Recargar ${PAQUETES[2].creditos.toLocaleString('es-CO')} por $${PAQUETES[2].precio}`, variante: 'primary' as const, onClick: () => recargar(PAQUETES[2]) },
      { label: 'Cerrar', onClick: () => {} },
    ],
  });

  /** La lista de precios del producto: los tres planes, lo que incluye cada uno y lo que cuesta. */
  const verPlanes = () => detalle({
    titulo: 'Planes y precios',
    sub: 'Los tres planes hacen lo mismo: cambian cuántos créditos entran por mes y cuántas campañas pueden correr a la vez. Acá están los precios; el plan que su cuenta tiene hoy sale de su cuenta.',
    bloques: [
      ...PLANES.map(p => ({
        tipo: 'filas' as const,
        items: [
          { t: `Plan ${p.nombre} · $${p.precio} por mes`, s: `${p.creditosMes.toLocaleString('es-CO')} créditos · ${p.paraQuien}`,
            etiqueta: p.key === planDelBack?.key ? 'el de su cuenta' : 'disponible',
            tono: p.key === planDelBack?.key ? 'purple' as const : 'muted' as const },
          ...p.incluye.map(i => ({ t: i, etiqueta: 'incluido', tono: 'green' as const })),
          ...(p.falta || []).map(f => ({ t: f, etiqueta: 'no entra', tono: 'muted' as const })),
        ],
      })),
      { tipo: 'texto', texto: 'El plan define cuántos créditos entran por mes, no cómo trabaja el motor: bajar de plan no frena nada de lo que ya está corriendo.' },
    ],
    fuente: 'Precio por mes en dólares y los créditos que incluye cada plan. El consumo no cambia con el plan: cambia cuánto entra por mes.',
    acciones: [
      { label: 'Cerrar', title: 'Cierra el panel sin cambiar nada', onClick: () => {} },
    ],
  });

  return (
    <div className="dash">
      <ViewHead
        icon={<I_Credit size={19} />}
        titulo="Créditos"
        sub="Un crédito es una unidad de trabajo del motor: cada análisis, pieza o campaña consume. Acá ve qué tiene, en qué se va y cómo cargarlo."
        nums={[
          { v: saldo === null ? '—' : saldo.toLocaleString('es-CO'), l: 'créditos disponibles' },
          { v: planNombre ? `Plan ${planNombre}` : 'Sin plan cargado', l: creditosMes ? `${creditosMes.toLocaleString('es-CO')} por mes` : 'créditos por mes: sin dato', c: 'var(--purple3)' },
          { v: dias === null ? '—' : `${dias} días`, l: 'de autonomía al ritmo de hoy', c: dias !== null && dias < 10 ? 'var(--amber)' : 'var(--green)' },
          { v: usados ? `${usados.toLocaleString('es-CO')} créditos` : '—', l: 'consumido este mes' },
        ]}
      />

      {/* ============ SU PLAN: el que manda el back ============
          El plan de la cuenta es el del back; lo que el catálogo del producto sabe de él (precio y
          créditos por mes) se muestra sólo si el back lo mandó. Sin ese dato, «—». */}
      <Card
        title={<span className="row" style={{ gap: 8 }}><I_Shield size={14} style={{ color: 'var(--purple3)' }} /> Su plan</span>}
        action={<Badge tone="purple">{planNombre ? `Plan ${planNombre}` : 'sin plan cargado'}</Badge>}
      >
        <div className="datos-row">
          <div className="dato"><span className="dato-l">Plan</span><span className="dato-v" style={{ color: 'var(--purple3)' }}>{planNombre ?? '—'}</span></div>
          <div className="dato"><span className="dato-l">Precio por mes</span><span className="dato-v">{planDelBack ? <Dinero monto={planDelBack.precio} /> : '—'}</span></div>
          <div className="dato"><span className="dato-l">Créditos por mes</span><span className="dato-v">{creditosMes ? creditosMes.toLocaleString('es-CO') : '—'}</span></div>
          <div className="dato"><span className="dato-l">Próximo cobro</span><span className="dato-v">—</span></div>
        </div>
        <div className="bs" style={{ marginTop: 12 }}>
          {planDelBack
            ? <>{planDelBack.paraQuien} El plan define <b>cuántos créditos entran por mes</b>: cambiar de plan cambia el techo, no la forma en que trabaja el motor.</>
            : <>El precio, los créditos por mes y lo que incluye su plan todavía no están cargados: cuando lo estén, quedan a la vista acá. Los planes disponibles y sus precios se ven en «Ver los planes».</>}
        </div>
        <div className="row" style={{ gap: 9, marginTop: 12, flexWrap: 'wrap' }}>
          <Button variant="ghost" className="btn-sm"
            title="Abre la lista de planes con lo que incluye cada uno y su precio por mes. No cambia nada de su cuenta."
            onClick={verPlanes}><I_ArrowRight size={13} /> Ver los planes</Button>
          {esReal && (
            <Button variant="ghost" className="btn-sm" title="Vuelve a leer su cuenta: si el detalle de su plan ya está cargado, esta tarjeta lo muestra tal como quedó."
              onClick={() => void d.refrescar()}>Volver a leer mi plan</Button>
          )}
        </div>
        {planDelBack && <NotaMoneda />}
      </Card>

      {/* ============ EL SALDO Y CÓMO CARGARLO ============ */}
      <div className="duo">
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Wallet size={14} style={{ color: 'var(--purple3)' }} /> Su saldo</span>}
          action={<Badge tone="purple">{planNombre ? `Plan ${planNombre}` : 'sin plan cargado'}</Badge>}
        >
          <div>
            <div style={{ fontSize: 38, fontWeight: 900, letterSpacing: -1.4, lineHeight: 1 }}>
              {saldo === null ? '—' : saldo.toLocaleString('es-CO')} <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--muted)' }}>créditos</span>
            </div>
            <div className="bs" style={{ marginTop: 5 }}>
              {saldo === null
                ? <>El saldo sale de su cuenta: cuando el panel la lea, aparece acá con los créditos que le quedan.</>
                : <>Alcanzan para <b style={{ color: 'var(--purple3)' }}>{dias} días</b> más con el consumo actual.</>}
            </div>
          </div>

          <div>
            {creditosMes && saldo !== null ? (
              <Gauge pct={pct} label="Disponible del plan del mes" detalle={`${saldo.toLocaleString('es-CO')} de ${creditosMes.toLocaleString('es-CO')}`} />
            ) : (
              <div className="bs">
                El tope de créditos del mes todavía no está cargado: sin ese dato el panel no dibuja la barra
                del mes ni calcula un porcentaje contra un número que no conoce.
              </div>
            )}
          </div>

          <div className="guard" style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <span style={{ color: 'var(--amber)', flexShrink: 0 }}><I_Zap size={15} /></span>
            <span className="guard-lb">Auto-recarga
              <small>Cuando baja de 500 créditos, se carga el próximo paquete solo (lo enciende en esta visita: todavía no queda guardado en su cuenta)</small>
            </span>
            <button className={`toggle ${autoRecarga ? 'on' : ''}`}
              title={autoRecarga
                ? 'Apaga la auto-recarga: el motor vuelve a detenerse cuando se agoten los créditos. Reversible: la puede volver a encender.'
                : 'Carga el próximo paquete solo cuando los créditos bajen de 500, sin que el motor se detenga. Reversible: se apaga cuando quiera.'}
              onClick={() => { setAutoRecarga(!autoRecarga); setToast(autoRecarga ? 'Auto-recarga desactivada' : 'Auto-recarga activada'); }} />
          </div>

          <div className="guard">
            <span style={{ color: '#818cf8', flexShrink: 0 }}><I_Credit size={15} /></span>
            <span className="guard-lb">Método de pago
              <small>con qué se cobra su plan: todavía no está cargado</small>
            </span>
            <span className="guard-val" style={{ color: 'var(--muted)' }}>—</span>
          </div>

          <div className="guard">
            <span style={{ color: 'var(--amber)', flexShrink: 0 }}><I_Shield size={15} /></span>
            <span className="guard-lb">Si se le acaban
              <small>El motor se frena solo y le avisa antes: nunca gasta de más ni publica sin saldo</small>
            </span>
            <span className="guard-val" style={{ color: 'var(--green)' }}>freno</span>
          </div>

          <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <div className="dato"><span className="dato-l">Consumo por día</span><span className="dato-v">150</span></div>
            <div className="dato"><span className="dato-l">Última recarga</span><span className="dato-v">{movs.find(m => m.tipo === 'entrada')?.fecha || '—'}</span></div>
            <div className="dato"><span className="dato-l">Vencen</span><span className="dato-v">a los 12 meses</span></div>
          </div>

          <div className="acc-why">
            El motor <b>se frena solo cuando se le acaban los créditos</b>: no sigue gastando ni publicando.
            Por eso la auto-recarga existe: para que no se detenga justo cuando una campaña está funcionando.
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Plus size={14} style={{ color: 'var(--green)' }} /> Cargar el motor</span>}
          action={<Badge tone="green">{PAQUETES.length} paquetes</Badge>}
        >
          <div className="bs">
            Se paga con el método de pago de su cuenta. <b>Cuanto más grande el paquete, menos sale cada crédito</b> y más tiempo trabaja solo.
          </div>
          {PAQUETES.map(p => (
            <div key={p.nombre} className="guard">
              <span className="guard-val" style={{ color: 'var(--purple3)', width: 52, textAlign: 'left', flexShrink: 0 }}>
                {p.creditos.toLocaleString('es-CO')}
              </span>
              <span className="guard-lb">{p.nombre}{p.popular && <span className="badge badge-purple" style={{ fontSize: 8.5, marginLeft: 6 }}>el más elegido</span>}
                <small><Dinero monto={`$${p.unidad}`} equivalente={false} /> por crédito · rinde ~{Math.round(p.creditos / 150)} días</small>
              </span>
              <span className="guard-val" style={{ flexShrink: 0 }}><Dinero monto={p.precio} /></span>
              <Button className="btn-sm" title={`Carga ${p.creditos.toLocaleString('es-CO')} créditos por $${p.precio} con el método de pago de su cuenta. Entran al saldo de su cuenta.`}
                onClick={() => recargar(p)}>Recargar</Button>
            </div>
          ))}
          <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <div className="dato"><span className="dato-l">Formas de pago</span><span className="dato-v">Tarjeta y transferencia</span></div>
            <div className="dato"><span className="dato-l">Los créditos vencen</span><span className="dato-v">a los 12 meses</span></div>
          </div>
          <div className="acc-why">
            Lo que se cobra es <b>trabajo hecho, no tiempo de uso</b>: si un mes no publica nada,
            casi no consume. Las conversaciones con sus clientes están incluidas y nunca gastan créditos.
          </div>
          <NotaMoneda />
        </Card>
      </div>

      {/* ============ EN QUÉ SE VA Y LOS MOVIMIENTOS ============ */}
      <div className="duo" style={{ marginTop: 16 }}>
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Credit size={14} style={{ color: 'var(--purple3)' }} /> En qué se van</span>}
          action={<Badge tone="purple">{totalRubros ? `${totalRubros.toLocaleString('es-CO')} usados` : 'sin consumo todavía'}</Badge>}
        >
          {leyendo && movs.length === 0 && totalRubros === 0 ? (
            <EstadoVacio
              titulo="Leyendo su libro de créditos…"
              texto="El panel está leyendo el libro de créditos de su cuenta. Mientras lee no muestra ninguna cifra: en un momento dice qué hay."
            />
          ) : totalRubros === 0 ? (
            /* No hay de dónde sacar el reparto: el anillo se arma con los movimientos del libro y
               todavía no hay ninguno que haya consumido. Se dice, no se dibuja un anillo en cero. */
            <EstadoVacio
              titulo="Todavía no hay consumo que repartir"
              texto="Este anillo se arma con los movimientos de su libro de créditos: cada porción es lo que consumió un trabajo del motor. Mientras no haya ninguno, no hay nada que repartir."
            />
          ) : (
          <>
          <div className="como-se-lee">
            <b>Cómo se lee:</b> el anillo es <b>el total de lo que consumió el motor</b>, y cada
            porción es un rubro. Si un rubro le sorprende, puede abrir el historial y ver qué lo generó.
          </div>

          <div className="reparto">
            <div className="reparto-ring" style={{ background: `conic-gradient(from -90deg, ${porciones})` }}
              title={`Reparto de los ${totalRubros.toLocaleString('es-CO')} créditos que consumió el motor`}>
              <div className="reparto-hole">
                <div>
                  <div className="reparto-v">{totalRubros.toLocaleString('es-CO')}</div>
                  <div className="reparto-l">créditos consumidos</div>
                </div>
              </div>
            </div>

            <div className="reparto-leyenda">
              {rubros.map(c => (
                <div key={c.l} className="reparto-item">
                  <span className="reparto-dot" style={{ background: c.c }} />
                  <span className="reparto-lb">
                    {c.l}<span className="reparto-pct">{Math.round((c.v / totalRubros) * 100)}%</span>
                    <small>{c.detalle}</small>
                  </span>
                  <span className="reparto-num" style={{ color: c.c }}>{c.v.toLocaleString('es-CO')}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="acc-why">
            Cada porción sale de un cargo real de su libro de créditos, agrupado por su motivo:
            <b> ninguna cifra de este anillo está escrita a mano</b>.
          </div>
          </>
          )}
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Credit size={14} style={{ color: 'var(--green)' }} /> Movimientos</span>}
          action={movs.length
            ? <Badge tone="green">+{entradas.toLocaleString('es-CO')} · −{salidas.toLocaleString('es-CO')}</Badge>
            : <Badge tone="muted">sin movimientos</Badge>}
        >
          <div className="guards">
            {movs.map((m, i) => (
              <div key={i} className="guard">
                <span style={{ color: m.tipo === 'entrada' ? 'var(--green)' : 'var(--muted)', flexShrink: 0 }}>
                  <I_ArrowRight size={14} style={{ transform: m.tipo === 'entrada' ? 'rotate(90deg)' : 'rotate(-90deg)' }} />
                </span>
                <span className="guard-lb">{m.detalle}<small>{m.fecha}{m.motivo ? ` · ${MOTIVOS[m.motivo]?.nombre ?? m.motivo}` : ''}</small></span>
                <span className="guard-val" style={{ color: m.tipo === 'entrada' ? 'var(--green)' : 'var(--muted)' }}>
                  {m.cantidad > 0 ? '+' : ''}{m.cantidad.toLocaleString('es-CO')}
                </span>
              </div>
            ))}
          </div>
          {/* Mientras lee no se afirma nada; con el libro vacío, la tarjeta dice qué va a quedar acá
              y cuál es el paso siguiente, en vez de quedar con la lista pelada. */}
          {leyendo && (
            <EstadoVacio
              titulo="Leyendo su libro de créditos…"
              texto="El panel está leyendo el libro de créditos de su cuenta. Mientras lee no muestra ninguna cifra: en un momento dice qué hay."
            />
          )}
          {sinMovimientos && (
            <EstadoVacio
              titulo="Su cuenta entra con el arranque"
              texto={`Aquí va a quedar cada movimiento, con su motivo, su delta y el saldo que quedó después. Su cuenta todavía no tiene ninguno${saldo ? `: los ${saldo.toLocaleString('es-CO')} créditos con los que arrancó son el primer asiento del libro` : ''}, y cada trabajo del motor va a sumar el suyo.`}
              accion={`Recargar ${PAQUETES[2].creditos.toLocaleString('es-CO')} créditos`}
              onAccion={() => recargar(PAQUETES[2])}
            />
          )}
          <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
            <Button variant="ghost" className="btn-sm" title="Abre el historial completo de créditos: cada movimiento con la fecha y qué lo generó, más lo que entró y lo que salió. Se actualiza solo cuando recarga."
              onClick={verHistorial}>Ver todo el historial</Button>
            {esReal && (
              <Button variant="ghost" className="btn-sm" title="Vuelve a leer el libro de créditos del servidor: el saldo y los movimientos se actualizan con lo que hay guardado. No cambia nada ni gasta créditos."
                onClick={() => void d.refrescar()}>Volver a leer el libro</Button>
            )}
          </div>
          <div className="acc-why">
            Los datos de su tarjeta <b>los maneja la pasarela de pago, no Sinkroo</b>:
            aquí solo guardamos los últimos 4 dígitos para que sepa con qué se cobra.
          </div>
        </Card>
      </div>
    </div>
  );
}

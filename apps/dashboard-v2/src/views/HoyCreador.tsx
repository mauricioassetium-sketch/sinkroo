import { useState } from 'react';
import { Card, Badge, Button } from '../components/ui';
import { ViewHead } from '../components/viz';
import {
  I_ArrowRight, I_Check, I_Zap, I_Users, I_Credit, I_Clock, I_Trend, I_Refresh, I_Eye, I_Star, I_Thumb,
} from '../components/icons';
import { useDetalle } from '../components/Detalle';
import type { Vista } from '../components/Layout';
import { usePlan } from '../lib/plan';
import {
  FICHA_CREADOR, AGENTES_CREADOR, OPORTUNIDADES, ETAPAS_PIPELINE, RITMO_SEMANA, TRANSVERSALES,
  CARRILES, CANAL_AVISO, RATES, PLANES_CREADOR,
} from '../data/creador';

// =============================================================================================
// HOY, EN PIEL DE CREADOR — «Lo que tu equipo hizo mientras no estabas».
//
// Es el mismo motor de Negocios, con el idioma de un creador: el equipo propone y el creador
// aprueba. Cada botón hace algo y se ve (regla del panel): aprobar saca la decisión de la lista y
// baja el contador, deshacer devuelve la acción del equipo, y lo que informa abre el panel.
// =============================================================================================

type Decision = { id: string; quien: string; que: string; por: string; plata?: string; tipo: 'marca' | 'contenido' | 'respuesta' };

const DECISIONES: Decision[] = [
  { id: 'd1', quien: 'Rumi', que: 'Mandar el pitch a DermaMarket con tu portafolio', plata: '$220 por pieza',
    por: 'Buscan creadores de belleza para su catálogo y tu formato coincide. Es el mismo rubro de tu mejor cliente.', tipo: 'marca' },
  { id: 'd2', quien: 'Rumi', que: 'Responderle a Bienestar Sur el pack de tres con uso en pauta', plata: '$420 + $60',
    por: 'Pidieron presupuesto de nuevo después de la primera pieza: es la marca que ya te pagó una vez.', tipo: 'respuesta' },
  { id: 'd3', quien: 'Nia', que: 'Publicar el reel «antes y después» con el hook B', 
    por: 'El panel le dio 87 y el hook B retuvo 12% mejor que el A en la prueba con el público.', tipo: 'contenido' },
];

const BITACORA = [
  { id: 'b1', quien: 'Lux', que: 'detectó que el antes y después creció 41% en tu nicho y dejó 2 ideas listas', cuando: 'hace 2 h', reversible: false },
  { id: 'b2', quien: 'Rex', que: 'movió el calendario de la semana: el martes va el antes y después y el jueves tu rutina', cuando: 'hace 3 h', reversible: true },
  { id: 'b3', quien: 'Nia', que: 'escribió 6 de 8 captions de la semana, con el hook B en las tres primeras', cuando: 'hace 4 h', reversible: false },
  { id: 'b4', quien: 'Rumi', que: 'contestó sola a Valeria G. con tu código de descuento y derivó 2 DMs de marcas a tu OK', cuando: 'ayer 19:40', reversible: true },
  { id: 'b5', quien: 'Sol', que: 'cerró el resumen del viernes: el hook B retuvo 12% mejor y el miércoles trajo 2 consultas', cuando: 'ayer 18:00', reversible: false },
];

export function ViewHoyCreador({ setToast, setVista }: { setToast: (t: string) => void; setVista: (v: Vista) => void }) {
  const detalle = useDetalle();
  const { plan } = usePlan();
  const [aprobadas, setAprobadas] = useState<string[]>([]);
  const [deshechas, setDeshechas] = useState<string[]>([]);
  const carril = CARRILES[FICHA_CREADOR.carril];
  const perfil = PLANES_CREADOR.find(p => p.key === 'pro')!;

  const aprobar = (d: Decision) => {
    setAprobadas(a => [...a, d.id]);
    setToast(`${d.que}: sale en la próxima vuelta del equipo${d.plata ? ` · ${d.plata}` : ''}`);
  };

  const pendientes = DECISIONES.filter(d => !aprobadas.includes(d.id));
  const enPipeline = OPORTUNIDADES.filter(o => o.etapa !== 'Cobro').length;

  return (
    <div className="dash">
      <ViewHead
        icon={<I_Star size={19} />}
        titulo="Hoy"
        sub={`${FICHA_CREADOR.perfil} · ${carril.promesa}`}
        nums={[
          { v: String(pendientes.length), l: 'decisiones esperan tu OK', c: pendientes.length ? 'var(--amber)' : 'var(--green)' },
          { v: String(enPipeline), l: 'marcas en el pipeline' },
          { v: '$570', l: 'en deals cerrados este mes', c: 'var(--green)' },
          { v: `${plan.creditosMes.toLocaleString('es-AR')}`, l: `créditos del plan ${plan.nombre}` },
        ]}
      />

      {/* El canal: es la forma real en que el creador aprueba. */}
      <div className="onb-infiere" style={{ marginTop: 0 }}>
        <span className="onb-infiere-ic"><I_Zap size={13} /></span>
        <span><b>{CANAL_AVISO.titulo}. </b>{CANAL_AVISO.texto}</span>
      </div>

      {/* LAS DECISIONES: una por propuesta, con su motivo y sus botones. */}
      <div className="duo" style={{ marginTop: 16 }}>
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Eye size={14} style={{ color: 'var(--amber)' }} /> Esperan tu OK</span>}
          action={<Badge tone={pendientes.length ? 'amber' : 'green'}>{pendientes.length ? `${pendientes.length} decisiones` : 'al día'}</Badge>}
        >
          {pendientes.length === 0 ? (
            <div className="onb-arrancado" style={{ marginTop: 0 }}>
              <I_Check size={15} />
              <span><b>Estás al día.</b> El equipo sigue trabajando: la próxima propuesta te llega por WhatsApp cuando esté lista.</span>
            </div>
          ) : pendientes.map(d => (
            <div key={d.id} className="guard" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 8, paddingTop: 12, paddingBottom: 12 }}>
              <span className="row" style={{ gap: 8, width: '100%', flexWrap: 'wrap' }}>
                <span className="bt">{d.quien}</span>
                <span className="tiny muted">{d.tipo === 'marca' ? 'oportunidad de marca' : d.tipo === 'respuesta' ? 'respuesta a una marca' : 'pieza para publicar'}</span>
                {d.plata && <Badge tone="green">{d.plata}</Badge>}
              </span>
              <span className="guard-lb" style={{ minWidth: 0 }}>
                {d.que}
                <small>{d.por}</small>
              </span>
              <span className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <Button className="btn-sm" title={`Aprueba que el equipo ${d.que.toLowerCase()}. ${d.tipo === 'contenido' ? 'Sale a tus redes con tu OK: es reversible desde Contenido.' : 'Rumi lo manda por vos y sigue la conversación.'}`}
                  onClick={() => aprobar(d)}><I_Check size={13} /> Aprobar</Button>
                <Button variant="ghost" className="btn-sm" title="Te muestra el motivo real de la propuesta, en qué se basó el equipo y qué pasa si la apruebas"
                  onClick={() => detalle({
                    titulo: d.que,
                    sub: d.por,
                    bloques: [
                      { tipo: 'filas', items: [
                        { t: 'Quién lo propone', s: `${d.quien} · ${AGENTES_CREADOR.find(a => a.nombre === d.quien)?.enCreadores.slice(0, 90)}`, etiqueta: 'agente', tono: 'purple' },
                        { t: 'En qué se basa', s: d.tipo === 'marca' ? 'Lux leyó el nicho hoy y vio que esa marca busca este formato.' : d.tipo === 'contenido' ? 'La prueba con el público: el hook B retuvo 12% mejor que el A.' : 'El historial de la marca: ya te pagó una pieza y volvió a preguntar.', etiqueta: d.tipo, tono: 'green' },
                        { t: 'Qué pasa si lo aprobás', s: d.tipo === 'contenido' ? 'Sale a tus redes en la próxima franja; podés bajarla cuando quieras.' : 'Rumi lo manda y te avisa cuando la marca conteste.', etiqueta: 'siguiente paso', tono: 'amber' },
                        ...(d.plata ? [{ t: 'Plata en juego', s: 'Deals o cobros de más de $200 piden tu OK: este también.', etiqueta: d.plata, tono: 'green' as const }] : []),
                      ] },
                      { tipo: 'aviso', texto: 'El equipo nunca ejecuta sin tu OK: con la autonomía que tenés, lo que gasta o sale a tu nombre siempre te espera.' },
                    ],
                    fuente: 'Propuesta del equipo · panel de 5 cuando es una pieza, lectura del nicho cuando es una marca.',
                    acciones: [
                      { label: 'Aprobar', variante: 'primary', title: 'Sale en la próxima vuelta del equipo', onClick: () => aprobar(d) },
                      { label: 'Dejarla para después', title: 'Queda esperando, sin cambiar nada', onClick: () => setToast('Queda esperando tu OK') },
                    ],
                  })}>Ver por qué <I_ArrowRight size={13} /></Button>
                <Button variant="ghost" className="btn-sm" title="Abre el mensaje para que lo ajustes vos antes de mandarlo"
                  onClick={() => { setVista('conversaciones'); setToast(`Ajustá el mensaje de ${d.quien} en Mensajes`); }}>Ajustar</Button>
              </span>
            </div>
          ))}
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Zap size={14} style={{ color: 'var(--purple3)' }} /> Lo que hizo el equipo</span>}
          action={<Badge tone="purple">5 acciones</Badge>}
        >
          {BITACORA.map(b => {
            const deshecha = deshechas.includes(b.id);
            return (
              <div key={b.id} className="guard" style={{ opacity: deshecha ? .5 : 1 }}>
                <span style={{ color: 'var(--purple3)', flexShrink: 0 }}><I_Check size={14} /></span>
                <span className="guard-lb" style={{ minWidth: 0 }}>
                  <b>{b.quien}</b> {b.que}
                  <small>{b.cuando}{deshecha ? ' · deshecho' : ''}</small>
                </span>
                {b.reversible && !deshecha && (
                  <Button variant="ghost" className="btn-sm" title={`Deshace esta acción de ${b.quien}: vuelve todo como estaba. Es reversible hasta 24 horas después.`}
                    onClick={() => { setDeshechas(d => [...d, b.id]); setToast(`Deshecho: ${b.quien} vuelve atrás lo que hizo`); }}>
                    <I_Refresh size={12} /> Deshacer
                  </Button>
                )}
                {deshecha && (
                  <Button variant="ghost" className="btn-sm" title="Vuelve a hacerlo como estaba"
                    onClick={() => { setDeshechas(d => d.filter(x => x !== b.id)); setToast('Vuelto a hacer: el equipo retoma esa acción'); }}>
                    Volver a hacerlo
                  </Button>
                )}
              </div>
            );
          })}
          <div className="acc-why">
            Todo lo que el equipo hace queda acá, <b>a la vista y reversible 24 horas</b>. Lo que gasta plata o sale
            a tu nombre te espera antes de pasar.
          </div>
          <div className="asist-reglas" style={{ marginTop: 12 }}>
            {[
              'Nunca te espera: siempre propone. Cada propuesta llega con su motivo en una línea.',
              'Una sola decisión por mensaje, con sus botones: no te manda una lista para que la ordenes vos.',
              'Nunca repite una idea que rechazaste, ni vuelve a ofrecerte una marca que no te interesó.',
              'Sigue funcionando si desaparecés: junta las propuestas y sólo te recuerda las entregas con fecha.',
            ].map((r, i) => (
              <div key={i} className="asist-regla"><I_Check size={12} /> {r}</div>
            ))}
          </div>
        </Card>
      </div>

      {/* EL PIPELINE: la estructura de las campañas de Negocios, con las etapas de un deal. */}
      <Card
        title={<span className="row" style={{ gap: 8 }}><I_Users size={14} style={{ color: 'var(--green)' }} /> El pipeline de marcas</span>}
        action={<Badge tone="green">{OPORTUNIDADES.length} marcas · 1 deal cerrado</Badge>}
      >
        <div className="pipeline">
          {ETAPAS_PIPELINE.map(etapa => {
            const enEtapa = OPORTUNIDADES.filter(o => o.etapa === etapa);
            return (
              <div key={etapa} className={`pl-col ${enEtapa.length ? 'con' : ''}`}>
                <div className="pl-t">{etapa}<span className="pl-n">{enEtapa.length}</span></div>
                {enEtapa.map(o => (
                  <button key={o.marca} className="pl-card"
                    title={`${o.marca}: ${o.queBusca}. Paga ${o.paga}. Encaje: ${o.encaje}`}
                    onClick={() => detalle({
                      titulo: `${o.marca} · ${o.etapa}`,
                      sub: `${o.queBusca}. Encaje con tu perfil: ${o.encaje}`,
                      bloques: [
                        { tipo: 'datos', filas: [
                          { k: 'Rubro', v: o.rubro, s: 'de tu nicho declarado en la Ficha' },
                          { k: 'Qué buscan', v: o.queBusca },
                          { k: 'Cuánto pagan', v: o.paga, s: 'en dólares por pieza, según lo que se paga en tu nicho' },
                          { k: 'Etapa del pipeline', v: o.etapa, s: ETAPAS_PIPELINE.join(' → ') },
                          { k: 'Quién la trabaja', v: 'Rumi', s: 'contesta, propone y escala cuando la marca pide hablar con vos' },
                        ] },
                        ...(o.nota ? [{ tipo: 'aviso' as const, texto: o.nota }] : []),
                        { tipo: 'texto', texto: 'Ningún cobro sale sin tu OK: los rates y los links de cobro son manuales por diseño.' },
                      ],
                      fuente: 'Misma estructura que las campañas de Negocios, con las etapas de un deal de creador.',
                      acciones: [
                        { label: o.etapa === 'Pitch' ? 'Que Rumi mande el pitch' : 'Ver la conversación', variante: 'primary', title: 'Rumi lo manda por vos y te avisa cuando contesten', onClick: () => { setVista('conversaciones'); setToast(`${o.marca}: la conversación está en Mensajes`); } },
                        { label: 'Ver mis rates', title: 'Tu lista de precios por pieza: es lo que Rumi usa para responder', onClick: () => setVista('cuenta') },
                      ],
                    })}>
                    <span className="pl-m">{o.marca}</span>
                    <span className="pl-p">{o.paga}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
        <div className="row" style={{ gap: 9, marginTop: 14, flexWrap: 'wrap' }}>
          <Button className="btn-sm" title="Abre Contenido: las piezas del mes y las entregas de las marcas"
            onClick={() => setVista('campanas')}>Ver mi contenido <I_ArrowRight size={13} /></Button>
          <Button variant="ghost" className="btn-sm" title="Abre Mensajes: los DMs de marcas y seguidores, con la respuesta que propone Rumi"
            onClick={() => setVista('conversaciones')}>Ver los mensajes</Button>
          <Button variant="ghost" className="btn-sm" title="Muestra tu lista de precios por pieza y qué conviene cobrar por el uso en pauta"
            onClick={() => detalle({
              titulo: 'Tus rates',
              sub: 'Lo que cobrás por pieza. Rumi los usa para responder y ningún cobro sale sin tu OK.',
              bloques: [
                { tipo: 'datos', filas: RATES.map(r => ({ k: r.pieza, v: r.precio, s: r.nota })) },
                { tipo: 'aviso', tono: 'amber', texto: 'El uso en pauta se cobra aparte: la marca paga por mostrarla a gente que no te conoce y eso vale más que la pieza.' },
              ],
              fuente: 'Tu lista de rates, en la Ficha de creador. Se puede cambiar cuando quieras.',
            })}>Ver mis rates</Button>
        </div>
      </Card>

      {/* EL EQUIPO Y EL RITMO */}
      <div className="duo" style={{ marginTop: 16 }}>
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Users size={14} style={{ color: 'var(--purple3)' }} /> Tu equipo</span>}
          action={<Badge tone="purple">6 agentes</Badge>}
        >
          <div className="bs">
            Los mismos seis del Centro de Mando, calibrados a tu nicho. Conservan nombre, color y rol técnico:
            lo que cambia es qué miran y qué producen, y eso sale de tu Ficha.
          </div>
          {AGENTES_CREADOR.map(a => (
            <div key={a.id} className="guard">
              <span style={{ color: a.color, flexShrink: 0 }}><I_Star size={14} /></span>
              <span className="guard-lb" style={{ minWidth: 0 }}>{a.nombre}
                <small>{a.enCreadores}</small>
              </span>
              <Button variant="ghost" className="btn-sm" title={`Qué hace ${a.nombre} en un panel de negocio y qué hace en el tuyo`}
                onClick={() => detalle({
                  titulo: `${a.nombre} · ${a.tecnico}`,
                  sub: a.enCreadores,
                  bloques: [
                    { tipo: 'texto', texto: `En un panel de negocio: ${a.enNegocios}` },
                    { tipo: 'texto', texto: `En el tuyo: ${a.enCreadores}` },
                    { tipo: 'aviso', texto: 'Es el mismo agente del motor: no hay dos versiones del equipo, hay dos formas de contarlo.' },
                  ],
                  fuente: 'Modelo de producto v2.0 · §6: los 6 agentes, calibrados.',
                })}>Ver</Button>
            </div>
          ))}
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Clock size={14} style={{ color: 'var(--green)' }} /> El ritmo de la semana</span>}
          action={<Badge tone="green">lunes y viernes</Badge>}
        >
          <div className="bs">{RITMO_SEMANA.latidoMotor}</div>
          <div className="guard">
            <span style={{ color: 'var(--purple3)', flexShrink: 0 }}><I_Clock size={14} /></span>
            <span className="guard-lb">Lunes · la propuesta<small>{RITMO_SEMANA.lunes[FICHA_CREADOR.carril]}</small></span>
            <Badge tone="purple">lunes</Badge>
          </div>
          <div className="guard">
            <span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Trend size={14} /></span>
            <span className="guard-lb">Viernes · el resumen<small>{RITMO_SEMANA.viernes[FICHA_CREADOR.carril]}</small></span>
            <Badge tone="green">viernes</Badge>
          </div>
          <div className="bs" style={{ marginTop: 4 }}>Tu carril: <b>{carril.nombre}</b>. {carril.queHace}</div>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
            {carril.kpi.map(k => <span key={k} className="badge badge-purple" style={{ fontSize: 9.5 }}>{k}</span>)}
          </div>
          <div className="acc-why">
            Se mide por {carril.kpi.join(', ').toLowerCase()} — <b>no por ventas del negocio</b>: el equipo sabe qué
            persigue un creador.
          </div>
        </Card>
      </div>

      {/* LO QUE HACE DISTINTO A ESTE PANEL */}
      <Card
        title={<span className="row" style={{ gap: 8 }}><I_Thumb size={14} style={{ color: 'var(--green)' }} /> Lo que podés pedirle al equipo</span>}
        action={<Badge tone="green">4 funciones</Badge>}
        className="graf-ancho"
      >
        <div className="transv">
          {TRANSVERSALES.map(t => (
            <button key={t.nombre} className="transv-item"
              title={`${t.nombre}: ${t.que}`}
              onClick={() => detalle({
                titulo: `${t.icono} ${t.nombre}`,
                sub: t.que,
                bloques: [
                  { tipo: 'filas', items: [
                    { t: 'Cómo se usa', s: 'Desde el chat o desde acá: mandás el audio, el video o la foto y el equipo devuelve el trabajo armado.' },
                    { t: 'Qué gasta', s: 'Lo que genere el Generador: la grilla de créditos va de 1 (texto) a 208 (video premium).' },
                    { t: 'Qué aprobás vos', s: 'Todo lo que se publique. Las aprobaciones vencen: si no respondés, se reprograma.' },
                  ] },
                  { tipo: 'aviso', texto: 'Nada de esto te obliga a entrar al panel: el equipo te escribe por WhatsApp o Telegram cuando tiene algo listo.' },
                ],
                fuente: 'Modelo de producto v2.0 · §13: funciones transversales.',
                acciones: [{ label: 'Ver mis créditos', title: 'Saldo, grilla y días de autonomía', onClick: () => setVista('creditos') }],
              })}>
              <span className="transv-ic">{t.icono}</span>
              <span className="transv-t">{t.nombre}</span>
              <span className="transv-q">{t.que}</span>
            </button>
          ))}
        </div>
        <div className="row" style={{ gap: 9, marginTop: 14, flexWrap: 'wrap' }}>
          <Button className="btn-sm" title="Abre el Nicho: los trends, los formatos que copan el feed y las marcas que buscan UGC"
            onClick={() => setVista('mercado')}><I_Trend size={13} /> Ver qué trendea en mi nicho</Button>
          <Button variant="ghost" className="btn-sm" title="Muestra el saldo, la grilla de generación y los días de autonomía"
            onClick={() => setVista('creditos')}><I_Credit size={13} /> Mis créditos</Button>
          <Button variant="ghost" className="btn-sm" title={`Plan ${perfil.nombre}: ${perfil.habilita}`}
            onClick={() => detalle({
              titulo: `Tu plan: ${perfil.nombre}`,
              sub: `${perfil.paraQuien} $${perfil.precio} por mes con ${perfil.creditosMes.toLocaleString('es-AR')} créditos.`,
              bloques: [
                { tipo: 'filas', items: perfil.incluye.map(i => ({ t: i, etiqueta: 'incluido', tono: 'green' as const })) },
                { tipo: 'aviso', texto: 'La pieza que el panel rechaza no te cuesta créditos: la regeneración por gate la paga el sistema.' },
              ],
              fuente: 'Modelo de producto v2.0 · §11: planes de creador.',
              acciones: [{ label: 'Ver los planes', title: 'Creador, Pro y el pack extra', onClick: () => setVista('creditos') }],
            })}>Mi plan</Button>
        </div>
      </Card>
    </div>
  );
}

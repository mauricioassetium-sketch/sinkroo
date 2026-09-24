import { useState } from 'react';
import { Card, Badge, Button } from '../components/ui';
import { ViewHead } from '../components/viz';
import {
  I_Star, I_Check, I_ArrowRight, I_Zap, I_Camera, I_Send, I_Credit, I_Clock, I_Trend, I_Refresh, I_Eye, I_Thumb,
} from '../components/icons';
import { useDetalle } from '../components/Detalle';
import type { Vista } from '../components/Layout';
import { usePlan } from '../lib/plan';
import {
  CICLO_PASOS, AVATAR, FICHA_CREADOR, TIPO_DE_LA_CUENTA, AGENTES_CREADOR, CRECIMIENTO,
  PLAN_DEL_MES, CANAL_AVISO, TRANSVERSALES, PIEZAS_DEL_MES, COMENTARIOS, PIEZAS_CREADOR,
} from '../data/creador';

// =============================================================================================
// HOY, EN PIEL DE CREADOR — lo que el equipo hizo y lo que espera tu OK.
//
// La herramienta sirve para crear contenido, verificarlo y publicarlo, y para hacer crecer la
// cuenta según el nicho. El equipo propone y el creador aprueba: cada botón cambia algo visible
// (regla del panel) y lo que informa abre el panel de detalle.
// =============================================================================================

type Decision = {
  id: string; quien: string; que: string; por: string; tipo: 'publicar' | 'avatar' | 'comunidad';
  detalle: string[]; va: Vista; vaTxt: string;
};

const DECISIONES: Decision[] = [
  { id: 'd1', quien: 'Kai', que: 'Publicar «Antes y después de 14 días» en Instagram', tipo: 'publicar', va: 'publicacion', vaTxt: 'Ver la publicación',
    por: 'El panel le dio 91 y es el formato que más retiene en tu nicho. La franja de las 19 es tu mejor ventana.',
    detalle: ['Puntaje del panel: 91 sobre 100 (el mínimo para publicar es 80).', 'Formato: reel con tu material. No gasta créditos nuevos.', 'Sale en Instagram a las 19:00, tu mejor franja.'] },
  { id: 'd2', quien: 'Tu avatar', que: 'Terminar el video «¿Sirve el serum de vitamina C?» para el jueves', tipo: 'avatar', va: 'avatar', vaTxt: 'Ver el avatar',
    por: 'Es el formato que más retiene en tu nicho y ya tenés el guion de Nia. Cuesta 75 créditos.',
    detalle: ['Guion escrito por Nia, con tu tono.', 'El avatar lo produce con tu cara y tu voz: 75 créditos.', 'Antes de salir pasa por el panel de 5 y por tu OK.'] },
  { id: 'd3', quien: 'Rumi', que: 'Contestarle a valen.rq la pregunta del sérum', tipo: 'comunidad', va: 'conversaciones', vaTxt: 'Ver el comentario',
    por: 'Es una pregunta simple, Rumi ya la tiene escrita, y contestar rápido sube la conversación de la pieza.',
    detalle: ['Comentario en Instagram: «¿Ese sérum sirve para piel mixta o solo para seca?»', 'Rumi propone: «Sirve para las dos: es liviano. Si tenés la zona T grasa, usalo solo de noche.»', 'Responder tus comentarios es compartido: Rumi propone y vos mandás.'] },
];

const BITACORA = [
  { id: 'b1', quien: 'Lux', que: 'detectó que el antes y después creció 41% en tu nicho y dejó 2 ideas listas', cuando: 'hace 2 h', reversible: false },
  { id: 'b2', quien: 'Rex', que: 'armó la semana: 5 piezas, 2 con el avatar, y el tema que más te piden', cuando: 'hace 3 h', reversible: true },
  { id: 'b3', quien: 'Nia', que: 'escribió 4 guiones con el hook del problema antes que el producto', cuando: 'hace 4 h', reversible: false },
  { id: 'b4', quien: 'Tu avatar', que: 'produjo 2 videos con tu cara y tu voz, listos como borrador', cuando: 'hace 5 h', reversible: true },
  { id: 'b5', quien: 'Sol', que: 'cerró el resumen: el hook B retuvo 12% mejor y la retención subió a 58%', cuando: 'ayer 18:00', reversible: false },
];

export function ViewHoyCreador({ setToast, setVista }: { setToast: (t: string) => void; setVista: (v: Vista) => void }) {
  const detalle = useDetalle();
  const { plan } = usePlan();
  const [hechas, setHechas] = useState<string[]>([]);
  const [deshechas, setDeshechas] = useState<string[]>([]);
  const [avatarOn, setAvatarOn] = useState(AVATAR.estado === 'listo');

  const pendientes = DECISIONES.filter(d => !hechas.includes(d.id));
  const publicadas = PIEZAS_DEL_MES.filter(p => p.estado === 'Publicada').length;

  const aprobar = (d: Decision) => {
    setHechas(h => [...h, d.id]);
    setToast(d.tipo === 'publicar' ? '«Antes y después de 14 días» sale en la franja de las 19'
      : d.tipo === 'avatar' ? 'El avatar arranca el video del jueves: queda como borrador hasta tu OK'
        : 'Respuesta mandada a valen.rq en Instagram');
  };

  return (
    <div className="dash">
      <ViewHead
        icon={<I_Star size={19} />}
        titulo="Hoy"
        sub={`${TIPO_DE_LA_CUENTA.icono} ${TIPO_DE_LA_CUENTA.nombre} · ${FICHA_CREADOR.nicho}`}
        nums={[
          { v: String(pendientes.length), l: 'decisiones esperan tu OK', c: pendientes.length ? 'var(--amber)' : 'var(--green)' },
          { v: String(publicadas), l: 'piezas publicadas esta semana' },
          { v: CRECIMIENTO.seguidores.nuevosSemana, l: 'seguidores nuevos', c: 'var(--green)' },
          { v: plan.creditosMes.toLocaleString('es-AR'), l: `créditos del plan ${plan.nombre}` },
        ]}
      />

      {/* El canal: es la forma real en que el creador aprueba, sin entrar al panel. */}
      <div className="onb-infiere" style={{ marginTop: 0 }}>
        <span className="onb-infiere-ic"><I_Zap size={13} /></span>
        <span><b>{CANAL_AVISO.titulo}. </b>{CANAL_AVISO.texto}</span>
      </div>

      <div className="duo" style={{ marginTop: 16 }}>
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Eye size={14} style={{ color: 'var(--amber)' }} /> Esperan tu OK</span>}
          action={<Badge tone={pendientes.length ? 'amber' : 'green'}>{pendientes.length ? `${pendientes.length} decisiones` : 'al día'}</Badge>}
        >
          {pendientes.length === 0 ? (
            <div className="onb-arrancado" style={{ marginTop: 0 }}>
              <I_Check size={15} />
              <span><b>Estás al día.</b> El equipo sigue produciendo: la próxima pieza te llega por WhatsApp cuando esté lista.</span>
            </div>
          ) : pendientes.map(d => (
            <div key={d.id} className="guard" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 8, paddingTop: 12, paddingBottom: 12 }}>
              <span className="row" style={{ gap: 8, width: '100%', flexWrap: 'wrap' }}>
                <span className="bt">{d.quien}</span>
                <span className="tiny muted">{d.tipo === 'publicar' ? 'listo para salir' : d.tipo === 'avatar' ? 'para producir' : 'para contestar'}</span>
              </span>
              <span className="guard-lb" style={{ minWidth: 0 }}>
                {d.que}
                <small>{d.por}</small>
              </span>
              <span className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <Button className="btn-sm"
                  title={d.tipo === 'publicar' ? 'Sale a tu red en la mejor franja: el panel ya la aprobó y es reversible desde Publicación.'
                    : d.tipo === 'avatar' ? 'El avatar produce la pieza: queda como borrador hasta que la apruebes.'
                      : 'Manda la respuesta que escribió Rumi y sigue la conversación.'}
                  onClick={() => aprobar(d)}><I_Check size={13} /> Aprobar</Button>
                <Button variant="ghost" className="btn-sm" title="Te muestra el motivo real de la propuesta y qué pasa cuando la aprobás"
                  onClick={() => detalle({
                    titulo: d.que,
                    sub: d.por,
                    bloques: [
                      { tipo: 'pasos', items: d.detalle },
                      { tipo: 'aviso', texto: 'El equipo nunca publica ni contesta sin tu OK: con la autonomía que tenés, lo que sale a tu nombre te espera.' },
                    ],
                    fuente: 'Propuesta del equipo · el panel de 5 verifica cada pieza antes de publicarse.',
                    acciones: [
                      { label: 'Aprobar', variante: 'primary', title: 'Se hace ahora y queda a la vista', onClick: () => aprobar(d) },
                      { label: 'Dejarla para después', title: 'Queda esperando, sin cambiar nada', onClick: () => setToast('Queda esperando tu OK') },
                    ],
                  })}>Ver por qué <I_ArrowRight size={13} /></Button>
                <Button variant="ghost" className="btn-sm" title={d.vaTxt}
                  onClick={() => { setVista(d.va); setToast(d.vaTxt); }}>{d.vaTxt}</Button>
              </span>
            </div>
          ))}
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Zap size={14} style={{ color: 'var(--purple3)' }} /> Lo que hizo el equipo</span>}
          action={<Badge tone="purple">{BITACORA.length} acciones</Badge>}
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
                  <Button variant="ghost" className="btn-sm" title={`Deshace esta acción de ${b.quien}: vuelve todo como estaba. Reversible hasta 24 horas después.`}
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
            Todo lo que el equipo hace queda acá, <b>a la vista y reversible 24 horas</b>. Lo que se publica
            en tus redes o se contesta en tu nombre te espera antes de pasar.
          </div>
          <div className="asist-reglas" style={{ marginTop: 12 }}>
            {[
              'Nunca te espera: siempre propone. Cada propuesta llega con su motivo en una línea.',
              'Una sola decisión por mensaje, con sus botones.',
              'Nunca repite una idea que rechazaste: cambia el ángulo o lo deja.',
              'Sigue produciendo si desaparecés: junta las piezas y sólo te recuerda lo que tiene fecha.',
            ].map((r, i) => <div key={i} className="asist-regla"><I_Check size={12} /> {r}</div>)}
          </div>
        </Card>
      </div>

      {/* EL CICLO: producir, verificar, publicar, crecer. */}
      <Card
        title={<span className="row" style={{ gap: 8 }}><I_Check size={14} style={{ color: 'var(--green)' }} /> Cómo trabaja tu equipo</span>}
        action={<Badge tone="green">4 pasos</Badge>}
      >
        <div className="transv">
          {CICLO_PASOS.map((c, i) => (
            <button key={c.nombre} className="transv-item"
              title={`${c.nombre}: ${c.que}`}
              onClick={() => detalle({
                titulo: `${i + 1} · ${c.nombre}`,
                sub: c.que,
                bloques: [
                  { tipo: 'datos', filas: [
                    { k: 'Quién lo hace', v: c.quien },
                    { k: 'Dónde se ve', v: c.nombre === 'Producir' ? 'en Contenido y en Avatar' : c.nombre === 'Verificar' ? 'en Contenido: el puntaje de cada pieza' : c.nombre === 'Publicar' ? 'en Publicación' : 'en Crecimiento' },
                    { k: 'Qué se aprueba', v: c.nombre === 'Producir' ? 'nada: son borradores' : 'todo lo que sale a tus redes y todo lo que se contesta en tu nombre' },
                  ] },
                ],
                fuente: 'Ciclo de una pieza: producir, verificar, publicar y crecer.',
                acciones: [{
                  label: 'Ir a ' + c.nombre, title: 'Abre el módulo donde se ve este paso',
                  onClick: () => setVista(c.nombre === 'Producir' || c.nombre === 'Verificar' ? 'campanas' : c.nombre === 'Publicar' ? 'publicacion' : 'crecimiento'),
                }],
              })}>
              <span className="transv-ic">{i + 1}</span>
              <span className="transv-t">{c.nombre}</span>
              <span className="transv-q">{c.quien}: {c.que}</span>
            </button>
          ))}
        </div>
        <div className="row" style={{ gap: 9, marginTop: 14, flexWrap: 'wrap' }}>
          <Button className="btn-sm" title="Abre Contenido: las piezas del mes con su puntaje del panel" onClick={() => setVista('campanas')}>Ver mi contenido <I_ArrowRight size={13} /></Button>
          <Button variant="ghost" className="btn-sm" title="Abre tu avatar: lo que crea por vos y lo que ya creó" onClick={() => setVista('avatar')}><I_Camera size={13} /> Ver mi avatar</Button>
          <Button variant="ghost" className="btn-sm" title="Abre Publicación: qué sale, en qué red y a qué hora" onClick={() => setVista('publicacion')}><I_Send size={13} /> Ver la publicación</Button>
        </div>
      </Card>

      <div className="duo" style={{ marginTop: 16 }}>
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Trend size={14} style={{ color: 'var(--green)' }} /> Cómo va tu cuenta</span>}
          action={<Badge tone="green">{CRECIMIENTO.seguidores.nuevosSemana} esta semana</Badge>}
        >
          <div className="onb-datos">
            <div className="dato"><span className="dato-l">Seguidores</span><span className="dato-v">{CRECIMIENTO.seguidores.total} · {CRECIMIENTO.seguidores.nuevosSemana}</span></div>
            <div className="dato"><span className="dato-l">Alcance por pieza</span><span className="dato-v" style={{ color: 'var(--green)' }}>{CRECIMIENTO.alcance.promedio}</span></div>
            <div className="dato"><span className="dato-l">Retención a los 3 s</span><span className="dato-v" style={{ color: 'var(--amber)' }}>{CRECIMIENTO.retencion.a3s} · meta {CRECIMIENTO.retencion.meta}</span></div>
            <div className="dato"><span className="dato-l">Interacción</span><span className="dato-v">{CRECIMIENTO.interaccion.valor}</span></div>
          </div>
          <div className="bs" style={{ marginTop: 12 }}>{CRECIMIENTO.retencion.nota}</div>
          <div className="guard">
            <span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Trend size={14} /></span>
            <span className="guard-lb">Lo que hizo crecer la cuenta
              <small>{CRECIMIENTO.queFunciono[0].t}: {CRECIMIENTO.queFunciono[0].s}</small>
            </span>
            <Badge tone="green">{CRECIMIENTO.queFunciono[0].etiqueta}</Badge>
          </div>
          <div className="row" style={{ gap: 9, marginTop: 12, flexWrap: 'wrap' }}>
            <Button className="btn-sm" title="Abre Crecimiento: los números de la semana, cómo va cada red y el plan" onClick={() => setVista('crecimiento')}>Ver el crecimiento <I_ArrowRight size={13} /></Button>
            <Button variant="ghost" className="btn-sm" title="Muestra tu ritmo ideal y por qué conviene sostenerlo"
              onClick={() => detalle({
                titulo: 'Tu ritmo: de 3 a 5 publicaciones por semana',
                sub: `${FICHA_CREADOR.ritmoActual} hoy · ${FICHA_CREADOR.ritmoObjetivo} es el objetivo del plan.`,
                bloques: [
                  { tipo: 'pasos', items: PLAN_DEL_MES.mezcla.map(m => `${m.cuantas} ${m.tipo}: ${m.para}`) },
                  { tipo: 'texto', texto: `Objetivo del mes: ${PLAN_DEL_MES.objetivo}` },
                  { tipo: 'aviso', texto: 'Publicar más de 3 piezas por día no ayuda: cansa a tu audiencia y baja el alcance. El equipo no lo hace.' },
                ],
                fuente: 'Rex arma la semana con tu ritmo y el formato que retiene en tu nicho.',
                acciones: [{ label: 'Ver el contenido', variante: 'primary', title: 'Las piezas del mes y su estado', onClick: () => setVista('campanas') }],
              })}>Ver mi ritmo</Button>
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Credit size={14} style={{ color: 'var(--purple3)' }} /> Tu equipo y tu avatar</span>}
          action={<Badge tone={avatarOn ? 'green' : 'amber'}>{avatarOn ? 'avatar activo' : 'avatar pausado'}</Badge>}
        >
          <div className="bs">Los mismos seis agentes del motor, calibrados a tu contenido. Lo que miran y producen sale de tu Ficha.</div>
          {AGENTES_CREADOR.map(a => (
            <div key={a.id} className="guard">
              <span style={{ color: a.color, flexShrink: 0 }}><I_Star size={14} /></span>
              <span className="guard-lb" style={{ minWidth: 0 }}>{a.nombre}<small>{a.que}</small></span>
              <Button variant="ghost" className="btn-sm" title={`Qué hace ${a.nombre} en tu panel y qué hacía en uno de negocio`}
                onClick={() => detalle({
                  titulo: `${a.nombre} · ${a.tecnico}`,
                  sub: a.enCreadores,
                  bloques: [
                    { tipo: 'texto', texto: `En un panel de negocio: ${a.enNegocios}` },
                    { tipo: 'texto', texto: `En el tuyo: ${a.enCreadores}` },
                    { tipo: 'aviso', texto: 'Es el mismo agente del motor: no hay dos versiones del equipo, hay dos formas de contarlo.' },
                  ],
                  fuente: 'Modelo de producto v2.0 · los 6 agentes, calibrados a contenido.',
                })}>Ver</Button>
            </div>
          ))}
          <div className="guard" style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <span style={{ flexShrink: 0 }}><I_Camera size={14} /></span>
            <span className="guard-lb">Tu avatar
              <small>{avatarOn ? `${AVATAR.entrenadoCon} · ${AVATAR.parecido}% de parecido` : 'pausado: lo que ya creó queda como borrador'}</small>
            </span>
            <Button variant={avatarOn ? 'outline' : 'primary'} className="btn-sm"
              title={avatarOn ? 'Pausa el avatar: deja de producir. Lo que ya creó queda como borrador y no se pierde. Reversible.' : 'Lo vuelve a encender: sigue produciendo con tu cara y tu voz.'}
              onClick={() => { setAvatarOn(!avatarOn); setToast(avatarOn ? 'Avatar pausado: no va a producir hasta que lo enciendas' : 'Avatar encendido: vuelve a crear con tu cara y tu voz'); }}>
              {avatarOn ? 'Pausarlo' : 'Encenderlo'}
            </Button>
          </div>
        </Card>
      </div>

      {/* LO QUE PODÉS PEDIRLE AL EQUIPO */}
      <Card
        className="graf-ancho"
        title={<span className="row" style={{ gap: 8 }}><I_Thumb size={14} style={{ color: 'var(--green)' }} /> Lo que podés pedirle al equipo</span>}
        action={<Badge tone="green">4 funciones</Badge>}
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
                    { t: 'Qué gasta', s: 'Lo que produzca el equipo: desde 1 crédito un texto hasta 208 un video premium del avatar.' },
                    { t: 'Qué aprobás vos', s: 'Todo lo que se publique y todo lo que se conteste en tu nombre.' },
                  ] },
                  { tipo: 'aviso', texto: 'Nada de esto te obliga a entrar al panel: el equipo te escribe por WhatsApp o Telegram cuando tiene algo listo.' },
                ],
                fuente: 'Funciones de contenido del equipo.',
                acciones: [{ label: 'Ver mis créditos', title: 'Saldo, grilla de producción y días de autonomía', onClick: () => setVista('creditos') }],
              })}>
              <span className="transv-ic">{t.icono}</span>
              <span className="transv-t">{t.nombre}</span>
              <span className="transv-q">{t.que}</span>
            </button>
          ))}
        </div>
        <div className="row" style={{ gap: 9, marginTop: 14, flexWrap: 'wrap' }}>
          <Button className="btn-sm" title="Abre Comunidad: los comentarios y mensajes de tu audiencia con la respuesta propuesta" onClick={() => setVista('conversaciones')}>
            Ver los comentarios <Badge tone="amber">{COMENTARIOS.filter(c => c.estado === 'espera-tu-ok').length}</Badge>
          </Button>
          <Button variant="ghost" className="btn-sm" title="Abre Nicho: qué trendea en tu tema y qué te pide tu gente" onClick={() => setVista('mercado')}><I_Trend size={13} /> Ver mi nicho</Button>
          <Button variant="ghost" className="btn-sm" title="Muestra tu tipo de creador y qué cambia si lo cambiás"
            onClick={() => detalle({
              titulo: `${TIPO_DE_LA_CUENTA.icono} ${TIPO_DE_LA_CUENTA.nombre}`,
              sub: TIPO_DE_LA_CUENTA.nota,
              bloques: [
                { tipo: 'texto', texto: 'La herramienta es la misma para cualquier tipo de creador: cambia qué publicás, qué métrica perseguís y cada cuánto podés.' },
                { tipo: 'filas', items: PIEZAS_CREADOR.slice(0, 4).map(p => ({ t: p.nombre, s: p.para, etiqueta: p.creditos, tono: 'muted' as const })) },
              ],
              fuente: 'Tu tipo de creador se elige en el onboarding y se puede cambiar en Cuenta y autonomía.',
              acciones: [{ label: 'Cambiar mi tipo', variante: 'primary', title: 'Los 5 tipos de creador y qué cambia con cada uno', onClick: () => setVista('cuenta') }],
            })}>{TIPO_DE_LA_CUENTA.icono} Mi tipo de creador</Button>
          <Button variant="ghost" className="btn-sm" title="Muestra el plan de la semana y el ritmo que busca el equipo" onClick={() => setVista('campanas')}>
            <I_Clock size={13} /> El plan de la semana
          </Button>
        </div>
      </Card>
    </div>
  );
}

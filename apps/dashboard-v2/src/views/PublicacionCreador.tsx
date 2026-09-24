import { useState } from 'react';
import { Card, Badge, Button } from '../components/ui';
import { ViewHead } from '../components/viz';
import {
  I_Send, I_Check, I_Refresh, I_Clock, I_Globe, I_Zap, I_ArrowRight, I_Camera,
} from '../components/icons';
import { useDetalle } from '../components/Detalle';
import type { Vista } from '../components/Layout';
import {
  PUBLICACIONES, FICHA_CREADOR, NICHO, GUARDRAILS_CREADOR, CANAL_AVISO, CICLO_PASOS, CICLO_PIEZA,
} from '../data/creador';

// =============================================================================================
// PUBLICACIÓN — qué sale, en qué red y a qué hora.
//
// Es el paso «Publicar» del ciclo: Kai programa cada pieza aprobada por el panel en la ventana que
// le conviene a la audiencia del creador. Nada sale sin el panel y sin el OK del creador, y lo que
// ya salió no se toca: editar o borrar en sus redes es siempre suyo.
// =============================================================================================

export function ViewPublicacionCreador({ setToast, setVista }: { setToast: (t: string) => void; setVista: (v: Vista) => void }) {
  const detalle = useDetalle();
  const [salidas, setSalidas] = useState<Record<string, string>>({});
  const [redes, setRedes] = useState(() => FICHA_CREADOR.redes.map(r => ({ ...r })));
  const [ventanaFija, setVentanaFija] = useState(false);
  const [reintentos, setReintentos] = useState(0);

  const estado = (p: typeof PUBLICACIONES[number]) => salidas[p.id] || p.estado;
  const programadas = PUBLICACIONES.filter(p => estado(p) === 'programada').length;
  const publicadas = PUBLICACIONES.filter(p => estado(p) === 'publicada').length;
  const enCola = PUBLICACIONES.filter(p => estado(p) === 'en cola').length;

  const publicar = (p: typeof PUBLICACIONES[number]) => {
    setSalidas(s => ({ ...s, [p.id]: 'publicada' }));
    setToast(`«${p.pieza}» salió en ${p.red} · ${p.cuando}. El panel ya la había aprobado.`);
  };
  const reintentar = (p: typeof PUBLICACIONES[number]) => {
    setSalidas(s => ({ ...s, [p.id]: 'programada' }));
    setReintentos(n => n + 1);
    setToast(`Kai la reintenta en ${p.red}: la pieza vuelve a la cola de mañana`);
  };
  const conectar = (red: string) => {
    setRedes(rs => rs.map(r => r.red === red ? { ...r, estado: 'conectada' } : r));
    setToast(`${red} conectada: Kai ya puede publicar ahí. Reversible desde acá o desde Cuenta y autonomía.`);
  };

  return (
    <div className="dash">
      <ViewHead
        icon={<I_Send size={19} />}
        titulo="Publicación"
        sub="Qué sale, en qué red y a qué hora. Kai publica por vos en la ventana que le conviene a tu audiencia."
        nums={[
          { v: String(programadas), l: 'programadas esta semana', c: 'var(--purple3)' },
          { v: String(publicadas), l: 'ya publicadas' },
          { v: String(enCola), l: 'esperando el panel', c: 'var(--amber)' },
          { v: FICHA_CREADOR.mejorVentana.split(',')[0], l: 'tu mejor franja', c: 'var(--green)' },
        ]}
      />

      <div className="onb-infiere" style={{ marginTop: 0 }}>
        <span className="onb-infiere-ic"><I_Zap size={13} /></span>
        <span><b>{CANAL_AVISO.titulo}. </b>{CANAL_AVISO.texto}</span>
      </div>

      {/* LAS PUBLICACIONES: el calendario, con su estado real y sus botones. */}
      <Card
        title={<span className="row" style={{ gap: 8 }}><I_Clock size={14} style={{ color: 'var(--purple3)' }} /> Lo que sale esta semana</span>}
        action={<Badge tone={enCola ? 'amber' : 'green'}>{reintentos ? `${reintentos} reintentada${reintentos > 1 ? 's' : ''}` : `${PUBLICACIONES.length} movimientos`}</Badge>}
      >
        {PUBLICACIONES.map(p => {
          const e = estado(p);
          return (
            <div key={p.id} className="guard">
              <span style={{ flexShrink: 0, color: e === 'publicada' ? 'var(--green)' : e === 'falló' ? 'var(--red)' : 'var(--purple3)' }}>
                {e === 'publicada' ? <I_Check size={15} /> : e === 'falló' ? <I_Refresh size={15} /> : <I_Clock size={15} />}
              </span>
              <span className="guard-lb" style={{ minWidth: 0 }}>
                <b>{p.pieza}</b>
                <small>{p.red} · {p.cuando} · {p.ventana}</small>
              </span>
              <Badge tone={e === 'publicada' ? 'green' : e === 'programada' ? 'purple' : e === 'en cola' ? 'amber' : 'red'}>
                {e === 'publicada' ? 'publicada' : e === 'programada' ? 'programada' : e === 'en cola' ? 'espera el panel' : 'no salió'}
              </Badge>
              {e === 'programada' && (
                <Button className="btn-sm" title={`Publica «${p.pieza}» ahora en ${p.red}, sin esperar la franja programada. Salió el panel y ya está aprobada.`}
                  onClick={() => publicar(p)}><I_Send size={13} /> Publicar ahora</Button>
              )}
              {e === 'falló' && (
                <Button className="btn-sm" title={`Kai la reintenta: ${p.ventana}. Si la red no está conectada, primero hay que conectarla.`}
                  onClick={() => reintentar(p)}><I_Refresh size={13} /> Reintentar</Button>
              )}
              <Button variant="ghost" className="btn-sm" title="Te muestra la pieza, su puntaje del panel, la red y por qué Kai eligió esa hora"
                onClick={() => detalle({
                  titulo: p.pieza,
                  sub: `${p.red} · ${p.cuando}. ${p.ventana}.`,
                  bloques: [
                    { tipo: 'datos', filas: [
                      { k: 'Estado', v: e, s: e === 'en cola' ? 'todavía no pasó el panel de 5: no sale hasta que la apruebe' : 'aprobada por el panel' },
                      { k: 'Por qué esa hora', v: 'Tu mejor franja', s: `${FICHA_CREADOR.mejorVentana}. Fuera de esa franja el alcance cae.` },
                      { k: 'Quién la publica', v: 'Kai', s: 'publica por vos y reintenta si la red falla' },
                      { k: 'Qué se toca si algo sale mal', v: 'Nada automático', s: 'editar o borrar algo ya publicado es siempre tuyo: el equipo no toca tus redes' },
                    ] },
                    { tipo: 'aviso', texto: 'Nada sale sin pasar por el panel de 5 y sin tu OK. Es la regla que sostiene tu cuenta.' },
                  ],
                  fuente: 'Ciclo de una pieza · Publicar: Kai programa y publica en la mejor ventana.',
                  acciones: e === 'programada'
                    ? [{ label: 'Publicar ahora', variante: 'primary', title: 'Sale en la próxima ventana abierta', onClick: () => publicar(p) },
                       { label: 'Ver mi mejor franja', title: 'Las franjas de tu audiencia', onClick: () => setVista('mercado') }]
                    : [{ label: 'Ver el calendario', title: 'Todas las salidas de la semana', onClick: () => setToast('Ya estás en Publicación') }],
                })}>Ver</Button>
            </div>
          );
        })}
        <div className="acc-why">
          Las piezas aparecen acá <b>sólo cuando el panel las aprobó</b>. Si una queda esperando, no es un
          problema de Publicación: falta la verificación.
        </div>
      </Card>

      <div className="duo" style={{ marginTop: 16 }}>
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Globe size={14} style={{ color: 'var(--purple3)' }} /> Tus redes</span>}
          action={<Badge tone="purple">{redes.filter(r => r.estado === 'conectada').length} conectadas</Badge>}
        >
          <div className="bs">Kai publica <b>en tus cuentas, no en las nuestras</b>. Podés revocar cualquier conexión cuando quieras.</div>
          {redes.map(r => (
            <div key={r.red} className="guard">
              <span style={{ fontSize: 17, flexShrink: 0 }}>{r.red === 'Instagram' ? '📸' : r.red === 'TikTok' ? '🎵' : '▶️'}</span>
              <span className="guard-lb">{r.red}<small>{r.usuario} · {r.seguidores} seguidores · {r.interaccion} de interacción</small></span>
              <Badge tone={r.estado === 'conectada' ? 'green' : 'amber'}>{r.estado}</Badge>
              {r.estado === 'conectada' ? (
                <Button variant="outline" className="btn-sm" title={`Desconecta ${r.red}: el equipo deja de publicar ahí. Reversible.`}
                  onClick={() => { setRedes(rs => rs.map(x => x.red === r.red ? { ...x, estado: 'por conectar' } : x)); setToast(`${r.red} desconectada: el equipo ya no publica ahí`); }}>Desconectar</Button>
              ) : (
                <Button className="btn-sm" title={`Conecta ${r.red} para que el equipo pueda publicar ahí. Reversible.`}
                  onClick={() => conectar(r.red)}>Conectar</Button>
              )}
            </div>
          ))}
          <div className="acc-why">
            Una red sin conectar es alcance que no se usa: {redes.find(r => r.estado !== 'conectada')
              ? `${redes.find(r => r.estado !== 'conectada')!.red} todavía no publica nada.`
              : 'todas tus redes están publicando.'}
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Camera size={14} style={{ color: 'var(--green)' }} /> Cuándo publica tu audiencia</span>}
          action={<Badge tone={ventanaFija ? 'green' : 'purple'}>{ventanaFija ? 'franja fijada' : 'automática'}</Badge>}
        >
          <div className="bs">El equipo publica en la franja donde tu gente está con el celular. Se puede fijar una y desfijarla cuando quieras.</div>
          {NICHO.ventanas.map(v => (
            <div key={v.franja} className="guard">
              <span style={{ flexShrink: 0, color: v.usarla ? 'var(--green)' : 'var(--muted2)' }}><I_Clock size={14} /></span>
              <span className="guard-lb">{v.franja}<small>{v.rendimiento}</small></span>
              {v.usarla && (ventanaFija
                ? <Button variant="outline" className="btn-sm" title="Vuelve a dejar que Kai elija la franja según el rendimiento de cada día"
                    onClick={() => { setVentanaFija(false); setToast('Kai vuelve a elegir la franja por día'); }}>Volver a automático</Button>
                : <Button className="btn-sm" title="Fija esta franja para todas las publicaciones. Reversible."
                    onClick={() => { setVentanaFija(true); setToast(`Kai publica siempre entre ${v.franja}`); }}>Publicar siempre acá</Button>)}
            </div>
          ))}
          <div className="onb-infiere" style={{ marginTop: 12 }}>
            <span className="onb-infiere-ic"><I_Clock size={13} /></span>
            <span><b>Tu peor franja: </b>{FICHA_CREADOR.peorVentana}. El equipo no publica ahí salvo que se lo pidas.</span>
          </div>
        </Card>
      </div>

      <Card
        className="graf-ancho"
        title={<span className="row" style={{ gap: 8 }}><I_Check size={14} style={{ color: 'var(--green)' }} /> Las reglas de tu publicación</span>}
        action={<Badge tone="green">3 de 3 activas</Badge>}
      >
        <div className="transv">
          {CICLO_PASOS.map((c, i) => (
            <button key={c.nombre} className="transv-item"
              title={`${c.nombre}: ${c.que}`}
              onClick={() => detalle({
                titulo: `${i + 1}. ${c.nombre}`,
                sub: c.que,
                bloques: [
                  { tipo: 'datos', filas: [
                    { k: 'Quién', v: c.quien },
                    { k: 'Dónde se ve', v: c.nombre === 'Publicar' ? 'en esta pantalla' : 'en Contenido y en Hoy' },
                    { k: 'Estados de una pieza', v: CICLO_PIEZA.join(' → '), s: 'así se sigue una pieza de punta a punta' },
                  ] },
                ],
                fuente: 'Ciclo de una pieza: producir, verificar, publicar y crecer.',
              })}>
              <span className="transv-ic">{i + 1}</span>
              <span className="transv-t">{c.nombre}</span>
              <span className="transv-q">{c.quien}: {c.que}</span>
            </button>
          ))}
        </div>
        <div className="row" style={{ gap: 9, marginTop: 14, flexWrap: 'wrap' }}>
          <Button className="btn-sm" title="Abre Contenido: las piezas y su puntaje del panel antes de salir"
            onClick={() => setVista('campanas')}>Ver el contenido <I_ArrowRight size={13} /></Button>
          <Button variant="ghost" className="btn-sm" title="Muestra los frenos que el equipo respeta al publicar"
            onClick={() => detalle({
              titulo: 'Lo que el equipo no hace al publicar',
              sub: 'Estos frenos protegen tu cuenta y salen de los guardrails del motor.',
              bloques: [
                { tipo: 'filas', items: GUARDRAILS_CREADOR.map(g => ({ t: g.nombre, s: g.porQue, etiqueta: g.valor, tono: 'muted' as const })) },
                { tipo: 'aviso', texto: 'El equipo no edita ni borra lo que ya salió con tu nombre: eso siempre lo hacés vos.' },
              ],
              fuente: 'Guardrails del creador: los mismos del motor, con sus valores.',
            })}>Ver los frenos</Button>
        </div>
      </Card>
    </div>
  );
}

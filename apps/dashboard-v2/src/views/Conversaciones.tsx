import { useState } from 'react';
import { Card, Badge, Button, Avatar } from '../components/ui';
import { ViewHead, BarRow } from '../components/viz';
import { I_Whatsapp, I_Chat, I_Send, I_Zap, I_Check, I_Plus, I_Users } from '../components/icons';
import { CONVERSACIONES, FLUJOS, type Modo } from '../data/demo';

export function ViewConversaciones({ setToast, modo }: { setToast: (t: string) => void; modo: Modo }) {
  const [sel, setSel] = useState(CONVERSACIONES[0].id);
  const conv = CONVERSACIONES.find(c => c.id === sel) ?? CONVERSACIONES[0];
  const pendientesHumanas = CONVERSACIONES.filter(c => c.cola === 'humano');

  return (
    <div className="dash">
      <ViewHead
        icon={<I_Whatsapp size={19} />}
        titulo="Conversaciones"
        sub="Todo tu WhatsApp y Messenger en un solo lugar. Vos intervenís sólo cuando hace falta."
        nums={[
          { v: '128', l: 'mensajes hoy' },
          { v: '94%', l: 'resueltos por la IA', c: 'var(--green)' },
          { v: String(pendientesHumanas.length), l: 'esperan a un humano', c: 'var(--red)' },
          { v: String(FLUJOS.length), l: 'automatizaciones activas', c: 'var(--purple3)' },
        ]}
      />

      {/* ============ LA BANDEJA Y EL CHAT ============ */}
      <div className="duo">
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Chat size={14} style={{ color: 'var(--purple3)' }} /> La bandeja</span>}
          action={<Badge tone="red">{pendientesHumanas.length} esperan</Badge>}
        >
          {CONVERSACIONES.map(c => (
            <div key={c.id} className="notif" onClick={() => setSel(c.id)}
              style={{ cursor: 'pointer', background: c.id === sel ? 'var(--bg3)' : 'transparent', borderRadius: 10 }}>
              <div className="pv-av" style={{ background: c.color, width: 34, height: 34, fontSize: 12 }}>
                {c.nombre.split(' ').map(w => w[0]).slice(0, 2).join('')}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row spread">
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{c.nombre}</span>
                  <span className="tiny muted">{c.hora}</span>
                </div>
                <div className="tiny muted" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {c.msgs[c.msgs.length - 1].txt}
                </div>
                <div className="row" style={{ gap: 6, marginTop: 6 }}>
                  <span className={`badge ${c.canal === 'wa' ? 'badge-green' : 'badge-purple'}`} style={{ fontSize: 9 }}>
                    {c.canal === 'wa' ? 'WhatsApp' : 'Messenger'}
                  </span>
                  <span className={`badge ${c.cola === 'ia' ? 'badge-green' : 'badge-red'}`} style={{ fontSize: 9 }}>
                    {c.cola === 'ia' ? 'IA' : `Humano · ${c.esperando}`}
                  </span>
                  <span className="badge badge-muted" style={{ fontSize: 9 }}>{c.tag}</span>
                </div>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <div className="tiny muted" style={{ marginBottom: 7 }}>De dónde vinieron los 128 mensajes de hoy</div>
            <BarRow label="WhatsApp" valor={78} max={128} color="var(--green)" />
            <BarRow label="Messenger" valor={34} max={128} color="var(--purple2)" />
            <BarRow label="Instagram" valor={16} max={128} color="#e11d48" />
          </div>
          <div className="acc-why">
            El motor no escribe de <b>22:00 a 08:00</b>: es un freno duro que no se puede desactivar.
          </div>
        </Card>

        <Card
          title={
            <span className="row" style={{ gap: 10 }}>
              <Avatar name={conv.nombre} size={30} />{conv.nombre}
            </span>
          }
          action={<Badge tone={conv.cola === 'ia' ? 'green' : 'red'}>{conv.cola === 'ia' ? 'atendido por IA' : 'necesita un humano'}</Badge>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {conv.msgs.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.de === 'ellos' ? 'flex-start' : 'flex-end', maxWidth: '86%',
                background: m.de === 'ellos' ? 'var(--bg3)' : 'rgba(168,85,247,.16)',
                border: `1px solid ${m.de === 'ellos' ? 'var(--border)' : 'rgba(168,85,247,.35)'}`,
                borderRadius: 13, padding: '10px 13px',
              }}>
                <div style={{ fontSize: 13, lineHeight: 1.45 }}>{m.txt}</div>
                <div className="tiny muted" style={{ marginTop: 4, textAlign: 'right' }}>
                  {m.de === 'ia' ? 'Rumi · IA · ' : ''}{m.hora}
                </div>
              </div>
            ))}
          </div>

          <div className="alarm" style={{ marginTop: 14, borderLeft: '3px solid var(--purple2)', background: 'rgba(168,85,247,.05)' }}>
            <div className="alarm-head">
              <span className="alarm-sev oportunidad">LO QUE PROPONE EL AGENTE</span>
              <span className="alarm-when">generado hace instantes</span>
            </div>
            <div className="alarm-sug" style={{ color: 'var(--txt)' }}>
              {conv.id === 'v1'
                ? '«Sí, llegamos a CABA. Llega en 2 a 4 días hábiles y podés pagar en 3 cuotas sin interés. ¿Te reservo uno?»'
                : conv.id === 'v4'
                  ? '«Lamento el problema. Te paso con una persona del equipo para resolver la cancelación en el momento.»'
                  : '«¡Gracias por escribir! ¿Te ayudo con algo más?»'}
            </div>
            <div className="alarm-acts">
              <Button className="btn-sm" title="Manda esta respuesta por tu WhatsApp real"
                onClick={() => setToast('Respuesta enviada por WhatsApp (demo)')}><I_Send size={13} /> Enviar tal cual</Button>
              <Button variant="outline" className="btn-sm" title="Abre la respuesta para que la edites antes de mandarla"
                onClick={() => setToast('Editando la respuesta (demo)')}>Editar antes</Button>
              <Button variant="ghost" className="btn-sm" title="Saca la conversación de la IA y la deja para tu equipo"
                onClick={() => setToast('Escalado a tu equipo (demo)')}>Lo atiendo yo</Button>
            </div>
            <div className="tiny muted" style={{ marginTop: 9 }}>
              {modo === 'auto' ? 'Estás en Automático: Rumi responde sola y te avisa en la bitácora.'
                : modo === 'shared' ? 'Estás en Compartido: Rumi prepara la respuesta y espera tu OK.'
                : 'Estás en Manual: Rumi sólo sugiere, vos escribís.'}
            </div>
          </div>
        </Card>
      </div>

      {/* ============ ESCALADOS Y CANAL ============ */}
      <div className="duo" style={{ marginTop: 16 }}>
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Zap size={14} style={{ color: 'var(--red)' }} /> Lo que escaló solo</span>}
          action={<Badge tone="red">{pendientesHumanas.length}</Badge>}
        >
          {pendientesHumanas.map(c => (
            <div key={c.id} className="alarm critico" style={{ marginBottom: 10, borderLeft: '3px solid var(--red)' }}>
              <div className="alarm-head">
                <span className="alarm-sev critico">ESCALÓ SOLO</span>
                <span className="alarm-when">espera {c.esperando}</span>
              </div>
              <div className="alarm-title" style={{ minWidth: 0 }}>{c.nombre}: {c.tag}</div>
              <div className="alarm-sug">{c.msgs[c.msgs.length - 1].txt.slice(0, 110)}</div>
              <div className="alarm-acts">
                <Button className="btn-sm" title="Abre la conversación en el panel de al lado"
                  onClick={() => setSel(c.id)}><I_Chat size={13} /> Abrir</Button>
              </div>
            </div>
          ))}
          <div className="acc-why">
            El agente <b>no intenta retener a un cliente enojado</b>: cuando detecta intención de cancelar,
            frena y te lo pasa. Escalar solo también es una decisión, y es la correcta.
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Users size={14} style={{ color: 'var(--green)' }} /> Tu propia API de WhatsApp</span>}
          action={<Badge tone="green">conectada</Badge>}
        >
          <div className="bs">
            Sinkroo no te da un número: conecta el tuyo. Pegás tu token de WhatsApp Business y el motor trabaja
            sobre tu línea real, con tus plantillas y tu historial.
          </div>
          <div className="datos-row" style={{ marginTop: 15 }}>
            <div className="dato"><span className="dato-l">Número</span><span className="dato-v">+54 9 11 5555-2341</span></div>
            <div className="dato"><span className="dato-l">Mensajes hoy</span><span className="dato-v">128</span></div>
            <div className="dato"><span className="dato-l">Tiempo de respuesta</span><span className="dato-v" style={{ color: 'var(--green)' }}>4 s</span></div>
          </div>
          <div className="row" style={{ gap: 9, marginTop: 15, flexWrap: 'wrap' }}>
            <Button variant="outline" className="btn-sm" title="Prueba que el token siga vivo sin guardarlo de nuevo"
              onClick={() => setToast('Token probado ahora: sigue funcionando (demo)')}><I_Check size={13} /> Probar conexión</Button>
            <Button variant="ghost" className="btn-sm" title="Reemplaza el token por uno nuevo"
              onClick={() => setToast('Reemplazar token (demo)')}><I_Plus size={13} /> Reemplazar token</Button>
          </div>
          <div className="acc-why">
            Tu token se guarda cifrado y <b>se prueba antes de guardarse</b>. Ninguna pantalla de Sinkroo lo vuelve a mostrar.
          </div>
        </Card>
      </div>

      {/* ============ AUTOMATIZACIONES ============ */}
      <div className="csec">
        <span className="csec-n">1</span>
        <span className="csec-t">Automatizaciones</span>
        <span className="csec-s">Lo que antes era un "tipo de campaña" y no debía serlo: esto trabaja solo</span>
      </div>
      <div className="duo">
        {FLUJOS.map(f => (
          <Card key={f.id}
            title={<span className="row" style={{ gap: 8 }}><I_Zap size={14} style={{ color: 'var(--purple3)' }} />{f.nombre}</span>}
            action={<Badge tone={f.estado === 'Activo' ? 'green' : 'muted'}>{f.estado}</Badge>}>
            <div className="tl">
              {f.pasos.map((p, i) => (
                <div key={i} className="tl-item">
                  <span className="tl-dot" style={{ background: p.condicion ? 'var(--amber)' : 'var(--purple2)' }} />
                  <span className="tl-time" style={{ color: p.condicion ? 'var(--amber)' : undefined }}>
                    {p.condicion ? 'SI' : ''} {p.delay.replace(' después', '')}
                  </span>
                  <div className="tl-body"><div className="tl-text" style={{ fontSize: 12.5 }}>{p.txt}</div></div>
                </div>
              ))}
            </div>
            <div className="row" style={{ gap: 8, marginTop: 11, flexWrap: 'wrap' }}>
              <Button variant="ghost" className="btn-sm" title="Abre el editor de pasos de este flujo"
                onClick={() => setToast(`Editando "${f.nombre}" (demo)`)}>Editar</Button>
              <Button variant="ghost" className="btn-sm" title={f.estado === 'Activo' ? 'Lo apaga: deja de enviar mensajes' : 'Lo enciende'}
                onClick={() => setToast('Pausar flujo (demo)')}>{f.estado === 'Activo' ? 'Pausar' : 'Activar'}</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

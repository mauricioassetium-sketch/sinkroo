import { useState } from 'react';
import { Card, Badge, Button, Avatar } from '../components/ui';
import { I_Chat, I_Send, I_Zap, I_Clock, I_Check, I_Plus, I_Users } from '../components/icons';
import { CONVERSACIONES, FLUJOS, type Modo } from '../data/demo';

export function ViewConversaciones({ setToast, modo }: { setToast: (t: string) => void; modo: Modo }) {
  const [sel, setSel] = useState(CONVERSACIONES[0].id);
  const conv = CONVERSACIONES.find(c => c.id === sel) ?? CONVERSACIONES[0];
  const respondidas = Math.round(128 * 0.94);

  return (
    <>
      {/* ============ CABECERA ============ */}
      <div className="card" style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <div className="ttl" style={{ fontSize: 20 }}>Todo tu WhatsApp y Messenger en un solo lugar</div>
          <div className="sub" style={{ marginTop: 4, lineHeight: 1.5 }}>
            Los 6 agentes atienden, venden y hacen seguimiento. Vos intervenís sólo cuando hace falta:
            <b style={{ color: 'var(--green)' }}> {respondidas} de 128 mensajes</b> los contestó la IA hoy.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Badge tone="green">94% resuelto por IA</Badge>
          <Badge tone="amber">2 esperan a un humano</Badge>
          <Badge tone="purple">Tu propio número</Badge>
        </div>
      </div>

      {/* ============ ALERTA DE ESCALADO ============ */}
      <div className="alarm critico" style={{ marginTop: 14 }}>
        <div className="alarm-head">
          <span className="alarm-sev critico">ESCALÓ SOLO</span>
          <span className="alarm-title">Martín R. quiere cancelar y Rumi no pudo resolverlo</span>
          <span className="alarm-when">espera hace 11 h</span>
        </div>
        <div className="alarm-money">
          <span className="ico" style={{ color: 'var(--amber)' }}><I_Zap size={14} /></span>
          <span><b style={{ color: 'var(--amber)' }}>Por qué importa: </b>es un cliente activo con un problema de facturación.
            Rumi escaló sólo cuando detectó intención de cancelar — no intentó retenerlo sin tu permiso.</span>
        </div>
        <div className="alarm-sug"><b>Qué hace el motor: </b>dejó la conversación marcada, resumió el motivo y no volvió a escribir. Te espera.</div>
        <div className="alarm-acts">
          <Button className="btn-sm" onClick={() => setSel('v4')}><I_Chat size={13} /> Abrir la conversación</Button>
          <Button variant="ghost" className="btn-sm" onClick={() => setToast('Rumi retoma el caso (demo)')}>Dejar que Rumi retome</Button>
        </div>
      </div>

      {/* ============ BANDEJA ============ */}
      <div className="csec">
        <span className="csec-n">1</span>
        <span className="csec-t">La bandeja</span>
        <span className="csec-s">Con el contexto de cada cliente, no un chat suelto</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) 1fr', gap: 14, alignItems: 'start' }}>
        <Card title="Conversaciones">
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
        </Card>

        <Card
          title={
            <span className="row" style={{ gap: 10 }}>
              <Avatar name={conv.nombre} size={30} />
              {conv.nombre}
              <Badge tone={conv.cola === 'ia' ? 'green' : 'red'}>{conv.cola === 'ia' ? 'atendido por IA' : 'necesita un humano'}</Badge>
            </span>
          }
          action={<span className="tiny muted">{conv.canal === 'wa' ? 'WhatsApp' : 'Messenger'} · tu número</span>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11, minHeight: 240 }}>
            {conv.msgs.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.de === 'ellos' ? 'flex-start' : 'flex-end',
                maxWidth: '78%', background: m.de === 'ellos' ? 'var(--bg3)' : 'rgba(168,85,247,.16)',
                border: `1px solid ${m.de === 'ellos' ? 'var(--border)' : 'rgba(168,85,247,.35)'}`,
                borderRadius: 13, padding: '10px 13px',
              }}>
                <div style={{ fontSize: 13, lineHeight: 1.45 }}>{m.txt}</div>
                <div className="tiny muted" style={{ marginTop: 5, textAlign: 'right' }}>
                  {m.de === 'ia' ? 'Rumi · IA · ' : m.de === 'yo' ? 'Vos · ' : ''}{m.hora}
                </div>
              </div>
            ))}
          </div>

          <div className="alarm" style={{ marginTop: 15, background: 'var(--bg2)' }}>
            <div className="alarm-head">
              <span className="alarm-sev atencion">LO QUE EL AGENTE PROPONE</span>
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
              <Button className="btn-sm" onClick={() => setToast('Respuesta enviada por WhatsApp (demo)')}>
                <I_Send size={13} /> Enviar tal cual
              </Button>
              <Button variant="outline" className="btn-sm" onClick={() => setToast('Editando la respuesta (demo)')}>Editar antes</Button>
              <Button variant="ghost" className="btn-sm" onClick={() => setToast('Escalado a tu equipo (demo)')}>Lo atiendo yo</Button>
            </div>
            <div className="tiny muted" style={{ marginTop: 9 }}>
              {modo === 'auto'
                ? 'Estás en Automático: Rumi responde sola y te avisa en la bitácora.'
                : modo === 'shared'
                  ? 'Estás en Compartido: Rumi prepara la respuesta y espera tu OK.'
                  : 'Estás en Manual: Rumi sólo sugiere, vos escribís.'}
            </div>
          </div>
        </Card>
      </div>

      {/* ============ FLUJOS ============ */}
      <div className="csec">
        <span className="csec-n">2</span>
        <span className="csec-t">Automatizaciones</span>
        <span className="csec-s">Lo que antes era un "tipo de campaña" y no debía serlo: esto trabaja solo</span>
      </div>
      <div className="duo">
        {FLUJOS.map(f => (
          <Card key={f.id}
            title={<span className="row" style={{ gap: 8 }}><I_Zap size={14} style={{ color: 'var(--purple3)' }} />{f.nombre}</span>}
            action={<Badge tone={f.estado === 'Activo' ? 'green' : 'muted'}>{f.estado}</Badge>}>
            <div className="tiny muted" style={{ marginBottom: 10 }}>Grupo: {f.grupo}</div>
            <div className="tl">
              {f.pasos.map((p, i) => (
                <div key={i} className="tl-item">
                  <span className="tl-dot" style={{ background: p.condicion ? 'var(--amber)' : 'var(--purple2)' }} />
                  <span className="tl-time" style={{ color: p.condicion ? 'var(--amber)' : undefined }}>
                    {p.condicion ? 'SI' : ''} {p.delay.replace(' después', '')}
                  </span>
                  <div className="tl-body">
                    <div className="tl-text" style={{ fontSize: 12.5 }}>{p.txt}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="row" style={{ gap: 8, marginTop: 11 }}>
              <Button variant="ghost" className="btn-sm" onClick={() => setToast(`Editando "${f.nombre}" (demo)`)}>Editar</Button>
              <Button variant="ghost" className="btn-sm" onClick={() => setToast('Pausar flujo (demo)')}>
                {f.estado === 'Activo' ? 'Pausar' : 'Activar'}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <div className="card" style={{ marginTop: 14, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <I_Users size={18} style={{ color: 'var(--purple3)' }} />
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontWeight: 800, fontSize: 13.5 }}>Tu propia API de WhatsApp</div>
          <div className="tiny muted" style={{ marginTop: 3, lineHeight: 1.5 }}>
            Sinkroo no te da un número: conecta el tuyo. Pegás tu token de WhatsApp Business y el motor trabaja sobre tu línea real.
          </div>
        </div>
        <Button variant="outline" className="btn-sm" onClick={() => setToast('Ir a Cuenta → Conexiones (demo)')}>
          <I_Plus size={13} /> Conectar mi API
        </Button>
      </div>

      <div className="tiny muted" style={{ marginTop: 14, display: 'flex', gap: 7, alignItems: 'center' }}>
        <I_Clock size={13} /> El motor no escribe de 22:00 a 08:00: es un freno duro que no se puede desactivar.
        <I_Check size={13} style={{ marginLeft: 6 }} /> Nunca se guarda una credencial sin probar que funciona.
      </div>
    </>
  );
}

import { useState } from 'react';
import { Card, Badge, Button, Toast } from '../components/sinkroo/ui';
import { CAMPANAS } from '../components/sinkroo/data';
import { I_Send, I_Play, I_Plus, I_Check, I_ChevDn, I_Pause, I_User, I_Edit } from '../components/sinkroo/icons';

const CAMPANAS_WA = CAMPANAS.filter(c => c.modulo === 'M5' || c.estado === 'Activa' || c.estado === 'Borrador');

const WA_LOGO = 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z';
const MSGR_LOGO = 'M12 0C5.24 0 0 4.952 0 11.64c0 3.499 1.434 6.521 3.769 8.61a.96.96 0 0 1 .323.683l.065 2.135a.96.96 0 0 0 1.347.85l2.381-1.053a.96.96 0 0 1 .641-.046A13 13 0 0 0 12 23.28c6.76 0 12-4.952 12-11.64S18.76 0 12 0m6.806 7.44c.522-.03.971.567.63 1.094l-4.178 6.457a.707.707 0 0 1-.977.208l-3.87-2.504a.44.44 0 0 0-.49.007l-4.363 3.01c-.637.438-1.415-.317-.995-.966l4.179-6.457a.706.706 0 0 1 .977-.21l3.87 2.505c.15.097.344.094.491-.007l4.362-3.008a.7.7 0 0 1 .364-.13';
const CanalSvg = ({ d, color }: { d: string; color: string }) => (
  <svg viewBox="0 0 24 24" className="wa-chan-logo" fill={color} aria-hidden="true"><path d={d} /></svg>
);


const FLUJOS: Record<string, { nombre: string; estado: 'Activo' | 'En pausa'; pasos: { delay: string; tipo: 'auto' | 'condición'; txt: string }[] }> = {
  c3: { nombre: 'Secuencia de Bienvenida', estado: 'Activo', pasos: [
    { delay: 'Al instante', tipo: 'auto', txt: '👋 ¡Hola {nombre}! Gracias por escribirnos. Soy Sinkro, el asistente de la tienda.' },
    { delay: '2 min después', tipo: 'auto', txt: 'Veo que te interesan productos de skincare. ¿Qué tipo de piel tenés? 🤔' },
    { delay: 'Si responde', tipo: 'condición', txt: '→ Recomiendo productos según su tipo de piel (seca / mixta / grasa).' },
    { delay: '1 día después', tipo: 'auto', txt: 'Solo pasé a recordarte: tenemos envío gratis en compras +$59. ¿Te ayudo con algo más?' },
    { delay: '3 días después', tipo: 'auto', txt: 'Último mensaje 🙏 Si querés un 10% extra, usá el código BIENVENIDO10.' },
  ]},
  c2: { nombre: 'Carrito Abandonado', estado: 'Activo', pasos: [
    { delay: '1 h después', tipo: 'auto', txt: '🛒 ¡Hola! Quedó algo en tu carrito. ¿Te ayudo a terminar la compra?' },
    { delay: '24 h después', tipo: 'auto', txt: 'Tu carrito sigue guardado. Te dejé un cupón de 15%: VOLVE15 ⏳' },
    { delay: 'Si no responde', tipo: 'condición', txt: '→ Marcar lead como "frío" y pausar secuencia.' },
  ]},
  c1: { nombre: 'Lanzamiento D2C', estado: 'En pausa', pasos: [
    { delay: 'Al instante', tipo: 'auto', txt: '🌟 ¡Lanzamos! Nuevo serum natural con 30% off de lanzamiento.' },
    { delay: '6 h después', tipo: 'auto', txt: 'Stock limitado de la primera tanda. ¿Te reservo el tuyo?' },
  ]},
};

type Mensaje = { de: 'ellos' | 'yo' | 'ia'; txt: string; quien?: 'humano' | 'ia' };

type Conversacion = {
  nombre: string; tag: string; color: string; noLeidos: number; hora: string;
  requiereHumano: boolean; // true = la IA no puede resolverlo sola, necesita un humano
  canal: 'wa' | 'msgr'; // sesion a la que pertenece
  msgs: Mensaje[];
  ideas?: string[]; // ideas de respuesta para el humano
};

const CONVERSACIONES: Conversacion[] = [
  {
    nombre: 'Valeria G.', tag: 'Leads', color: '#22c55e', noLeidos: 2, hora: '10:24', requiereHumano: false, canal: 'wa',
    msgs: [
      { de: 'ellos', txt: '¡Hola! Quería saber si el serum sirve para piel mixta' },
      { de: 'ia', txt: '¡Sí! Es ideal para piel mixta: hidrata sin generar grasa en la zona T. Te dejo el link 👇', quien: 'ia' },
      { de: 'ellos', txt: 'Perfecto, ¿hacen envío a CABA?' },
    ],
    ideas: ['Confirmar envío a CABA · 2-4 días hábiles · $X', 'Ofrecer envío gratis por primera compra'],
  },
  {
    nombre: 'Julián D.', tag: 'Post-venta', color: '#c084fc', noLeidos: 0, hora: '09:12', requiereHumano: false, canal: 'wa',
    msgs: [
      { de: 'ellos', txt: 'Mi pedido llegó, gracias 🙏' },
      { de: 'ia', txt: '¡Nos alegra! ¿Podés dejarnos una reseña de 5⭐? Nos ayuda un montón.', quien: 'ia' },
    ],
  },
  {
    nombre: 'Camila T.', tag: 'Leads', color: '#22c55e', noLeidos: 1, hora: 'Ayer', requiereHumano: true, canal: 'msgr',
    msgs: [
      { de: 'ellos', txt: '¿Hacen envíos a Córdoba? Y quería saber opciones de pago en cuotas 🙏' },
    ],
    ideas: ['Confirmar cobertura en Córdoba + tiempo estimado', 'Opciones de pago: contado 10% off · 3 y 6 cuotas sin interés'],
  },
  {
    nombre: 'Martín R.', tag: 'Soporte', color: '#ef4444', noLeidos: 0, hora: 'Ayer', requiereHumano: true, canal: 'msgr',
    msgs: [
      { de: 'ellos', txt: 'Quiero cancelar mi suscripción, no me está funcionando el producto' },
      { de: 'ia', txt: '¡Lamento escucharlo! ¿Podés contarme el motivo? Quizás lo solucionamos.', quien: 'ia' },
      { de: 'ellos', txt: 'No, directamente quiero cancelar. Es un tema de mi banco, necesito que alguien me lo resuelva.' },
    ],
    ideas: ['Escalar a soporte con protocolo de reembolso (revisar política ⏱️)', 'Ofrecer retención: 1 mes gratis a cambio de feedback'],
  },
];


const NUEVAS_IDEAS_SUGERIDAS = ['¡Claro! Enseguida te confirmo la info y los métodos de pago.', 'Podés comprarlo con envío gratis a todo el país. ¿Te lo reservo?', 'Te dejo el link directo al producto 👉', 'Si tenés dudas de qué te sirve, contame tu tipo de piel y te recomiendo.'];

export default function Whatsapp() {
  const [canal, setCanal] = useState<'wa' | 'msgr'>('wa');
  const [campId, setCampId] = useState('c3');
  const [chatIdx, setChatIdx] = useState(0);
  const [input, setInput] = useState('');
  const [mensajes, setMensajes] = useState<Mensaje[][]>(CONVERSACIONES.map(c => c.msgs));
  const [toast, setToast] = useState('');
  const [leidos, setLeidos] = useState<Record<number, boolean>>({});
  const [flujoEstado, setFlujoEstado] = useState<Record<string, 'Activo' | 'En pausa'>>(
    Object.fromEntries(Object.entries(FLUJOS).map(([k, v]) => [k, v.estado]))
  );
  const [flujosEdit, setFlujosEdit] = useState(FLUJOS);
  const [editPaso, setEditPaso] = useState<number | null>(null);
  const [editTxt, setEditTxt] = useState('');

  const flujo = flujosEdit[campId] ?? flujosEdit.c3;
  const delCanal = CONVERSACIONES.filter(c => c.canal === canal);
  const nWa = CONVERSACIONES.filter(c => c.canal === 'wa').reduce((a, c) => a + c.msgs.length, 0);
  const nMsgr = CONVERSACIONES.filter(c => c.canal === 'msgr').reduce((a, c) => a + c.msgs.length, 0);
  const chatIdxSeguro = delCanal.some(c => CONVERSACIONES.indexOf(c) === chatIdx) ? chatIdx : CONVERSACIONES.indexOf(delCanal[0]);
  const chat = CONVERSACIONES[chatIdxSeguro];
  const camp = CAMPANAS_WA.find(c => c.id === campId)!;
  const estado = flujoEstado[campId] ?? flujo.estado;

  const avisar = (t: string) => { setToast(t); setTimeout(() => setToast(''), 2800); };

  const responderCount = mensajes.reduce((a, m) => a + m.filter(x => x.de === 'yo' || x.de === 'ia').length, 0);
  const leadsActivos = CONVERSACIONES.filter(c => c.tag === 'Leads').length;
  const tasaIa = Math.round((mensajes.reduce((a, m) => a + m.filter(x => x.de === 'ia').length, 0) / Math.max(1, responderCount)) * 100);
  const pendientesHumano = CONVERSACIONES.filter(c => c.requiereHumano && !leidos[CONVERSACIONES.indexOf(c)]).length;

  const marcarAtendida = (i: number) => {
    setLeidos(prev => ({ ...prev, [i]: true }));
    avisar(`✓ "${CONVERSACIONES[i].nombre}" marcada como atendida.`);
  };

  const toggleFlujo = () => {
    const nuevo = estado === 'Activo' ? 'En pausa' : 'Activo';
    setFlujoEstado(prev => ({ ...prev, [campId]: nuevo }));
    avisar(nuevo === 'Activo' ? `▶️ Flujo "${flujo.nombre}" reactivado.` : `⏸️ Flujo "${flujo.nombre}" pausado.`);
  };

  const empezarEditar = (i: number) => {
    setEditPaso(i);
    setEditTxt(flujo.pasos[i].txt);
  };

  const guardarEditar = () => {
    if (editPaso === null) return;
    setFlujosEdit(prev => {
      const f = { ...prev[campId] };
      f.pasos = f.pasos.map((p, i) => (i === editPaso ? { ...p, txt: editTxt } : p));
      return { ...prev, [campId]: f };
    });
    setEditPaso(null);
    avisar('✏️ Paso del flujo actualizado.');
  };


  const enviar = (manual = false) => {
    const t = input.trim();
    if (!t) return;
    setMensajes(prev => prev.map((m, i) => (i === chatIdx ? [...m, { de: 'yo' as const, txt: t }] : m)));
    setInput('');
    if (manual) avisar('✍️ Respuesta manual enviada.')
  };

  const usarIdea = (idea: string) => {
    setInput(idea);
    avisar('💡 Idea cargada en el campo de respuesta.');
  };

  const responderConIA = () => {
    const ideas = chat.ideas && chat.ideas.length ? chat.ideas[0] : '¡Claro! Enseguida te ayudo con eso.';
    setMensajes(prev => prev.map((m, i) => (i === chatIdx ? [...m, { de: 'ia', txt: ideas, quien: 'ia' }] : m)));
    setLeidos(prev => ({ ...prev, [chatIdx]: true }));
    avisar('🤖 IA respondió la conversación.');
  };

  return (
    <>
      <div className="hdr">
        <div><div className="hdr-t">WhatsApp</div><div className="hdr-s">Flujo automático + bandeja con mensajes para humano e IA.</div></div>
        <Badge tone="green">Conectado</Badge>
      </div>

      {/* Métricas */}
      <div className="herr-stats" style={{ marginBottom: 16 }}>
        <div className="herr-stat"><div className="tiny muted" style={{ fontWeight: 600 }}>Respuestas IA</div><div className="herr-stat-v" style={{ color: 'var(--purple4)' }}>{tasaIa}%</div><div className="tiny muted">de {responderCount} enviadas</div></div>
        <div className="herr-stat"><div className="tiny muted" style={{ fontWeight: 600 }}>Pendientes de humano</div><div className="herr-stat-v" style={{ color: pendientesHumano > 0 ? 'var(--red)' : 'var(--green)' }}>{pendientesHumano}</div><div className="tiny muted">requieren tu respuesta</div></div>
        <div className="herr-stat"><div className="tiny muted" style={{ fontWeight: 600 }}>Leads activos</div><div className="herr-stat-v">{leadsActivos}</div><div className="tiny muted">en secuencia</div></div>
      </div>

      {/* Selector de canal: WhatsApp / Messenger */}
      <div className="wa-chans">
        <button type="button" className={`wa-chan ${canal === 'wa' ? 'active' : ''}`} onClick={() => setCanal('wa')}>
          <CanalSvg d={WA_LOGO} color="#25D366" />
          <span className="wa-chan-name">WhatsApp</span>
          <span className="wa-chan-count">{nWa}</span>
        </button>
        <button type="button" className={`wa-chan ${canal === 'msgr' ? 'active' : ''}`} onClick={() => setCanal('msgr')}>
          <CanalSvg d={MSGR_LOGO} color="#0866FF" />
          <span className="wa-chan-name">Messenger</span>
          <span className="wa-chan-count">{nMsgr}</span>
        </button>
      </div>

      <Card className="mb-16">
        <div className="wf-top">
          <div className="wf-selectwrap">
            <label className="wf-label">Campaña</label>
            <div className="wf-select">
              <span className="wf-select-emoji">{camp.emoji}</span>
              <select value={campId} onChange={e => setCampId(e.target.value)} className="wf-native">
                {CAMPANAS_WA.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <I_ChevDn size={16} className="chev" />
            </div>
          </div>
          <div className="wf-state">
            <span className="dot-live" style={{ background: estado === 'Activo' ? '#4ade80' : '#f59e0b' }} />
            <div><div className="small" style={{ fontWeight: 700 }}>{flujo.nombre}</div><div className="tiny muted">{estado === 'Activo' ? 'Flujo ejecutándose' : 'Flujo en pausa'}</div></div>
            <Badge tone={estado === 'Activo' ? 'green' : 'amber'}>{estado}</Badge>
            <button className="icon-btn" style={{ color: 'var(--txt2)' }} onClick={toggleFlujo} title={estado === 'Activo' ? 'Pausar flujo' : 'Reactivar flujo'}>
              {estado === 'Activo' ? <I_Pause size={17} /> : <I_Play size={17} />}
            </button>
          </div>
        </div>
      </Card>

      <div className="grid-2" style={{ gridTemplateColumns: '300px 1fr', alignItems: 'start' }}>
        <Card title="Flujo automático" action={<Badge tone="purple">IA</Badge>}>
          <div className="wf-flow">
            <button className="wf-node wf-node-start"><I_Play size={14} /> Inicio: nuevo mensaje</button>
            {flujo.pasos.map((p, i) => (
              <div key={i} className="wf-node-wrap">
                <div className="wf-line" />
                <div className="wf-node" style={{ opacity: p.tipo === 'condición' ? .85 : 1 }}>
                  <div className="wf-node-head"><span className="wf-delay">{p.delay}</span>{p.tipo === 'condición' ? <Badge tone="amber">Condición</Badge> : <Badge tone="green">Auto</Badge>}</div>
                  {editPaso === i ? (
                    <div style={{ marginTop: 4 }}>
                      <textarea className="input" style={{ width: '100%', minHeight: 54, fontSize: 12 }} value={editTxt} onChange={e => setEditTxt(e.target.value)} autoFocus />
                      <div className="row" style={{ gap: 6, marginTop: 6 }}>
                        <Button className="btn-sm" onClick={guardarEditar}>Guardar</Button>
                        <Button variant="ghost" className="btn-sm" onClick={() => setEditPaso(null)}>Cancelar</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="row" style={{ alignItems: 'flex-start', gap: 6 }}>
                      <div className="wf-node-txt" style={{ flex: 1 }}>{p.txt}</div>
                      <button className="icon-btn" style={{ color: 'var(--purple4)', marginTop: 2 }} onClick={() => empezarEditar(i)} title="Editar texto"><I_Edit size={14} /></button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div className="wf-line" />
            <button className="wf-node wf-node-add" onClick={() => avisar('➕ Paso nuevo: elegí tipo (mensaje / condición / espera).')}><I_Plus size={14} /> Agregar paso</button>
          </div>
          <div className="tiny muted" style={{ marginTop: 12, lineHeight: 1.5 }}>
            <I_Check size={12} style={{ verticalAlign: '-1px' }} /> Los pasos "Condición" escalan al humano cuando la IA no puede resolver.
          </div>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Bandeja */}
          <Card title="Conversaciones">
            <div className="tiny muted" style={{ marginBottom: 10 }}>Dos colas: la IA responde sola arriba; abajo las que necesitan un humano.</div>

            {/* Cola IA */}
            <div className="wa-cola-label" style={{ color: 'var(--purple4)' }}>🤖 Responde la IA ({delCanal.filter(c => !c.requiereHumano).length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {delCanal.filter(c => !c.requiereHumano).map((c) => {
                const origIdx = CONVERSACIONES.indexOf(c);
                return (
                  <div key={c.nombre} className={`wa-item wa-item-row ${origIdx === chatIdxSeguro ? 'sel' : ''}`} onClick={() => setChatIdx(origIdx)} title="Abrir y responder">
                    <div className="av" style={{ width: 34, height: 34, fontSize: 12, background: `linear-gradient(135deg,${c.color},${c.color})`, flexShrink: 0 }}>{c.nombre.split(' ')[0][0]}{c.nombre.split(' ')[1]?.[0]}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="spread small"><span style={{ fontWeight: 700 }}>{c.nombre}</span><span className="tiny muted">{c.hora}</span></div>
                      <div className="tiny muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.msgs[c.msgs.length - 1].txt}</div>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => setChatIdx(origIdx)}>Responder</button>
                  </div>
                );
              })}
            </div>

            {/* Cola humano */}
            <div className="wa-cola-label" style={{ color: '#ef4444', marginTop: 16 }}>👤 Requiere humano ({delCanal.filter(c => c.requiereHumano).length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {delCanal.filter(c => c.requiereHumano).map((c) => {
                const origIdx = CONVERSACIONES.indexOf(c);
                return (
                  <div key={c.nombre} className={`wa-item wa-item-row wa-item-human ${origIdx === chatIdxSeguro ? 'sel' : ''}`} onClick={() => setChatIdx(origIdx)}>
                    <div className="av" style={{ width: 34, height: 34, fontSize: 12, background: `linear-gradient(135deg,${c.color},${c.color})`, flexShrink: 0 }}>{c.nombre.split(' ')[0][0]}{c.nombre.split(' ')[1]?.[0]}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="spread small"><span style={{ fontWeight: 700 }}>{c.nombre}</span><span className="tiny muted">{c.hora}</span></div>
                      <div className="tiny muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.msgs[c.msgs.length - 1].txt}</div>
                    </div>
                    <Badge tone="amber">Requiere humano</Badge>
                    <button className="btn btn-primary btn-sm" onClick={() => setChatIdx(origIdx)}>Responder</button>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Chat activo */}
          <Card>
            <div className="spread" style={{ marginBottom: 12 }}>
              <div className="row">
                <div className="av" style={{ width: 34, height: 34, fontSize: 12, background: `linear-gradient(135deg,${chat.color},${chat.color})` }}>{chat.nombre.split(' ')[0][0]}{chat.nombre.split(' ')[1]?.[0]}</div>
                <div>
                  <div className="small" style={{ fontWeight: 700 }}>{chat.nombre}</div>
                  <div className="tiny muted" style={{ color: chat.color }}>{chat.tag}</div>
                </div>
              </div>
              {chat.requiereHumano && !leidos[chatIdxSeguro]
                ? <div className="row" style={{ gap: 8 }}>
                    <Badge tone="amber"><I_User size={11} style={{ marginRight: 4 }} /> Requiere humano</Badge>
                    <Button variant="ghost" className="btn-sm" onClick={() => marcarAtendida(chatIdxSeguro)}>Marcar atendida</Button>
                  </div>
                : <Badge tone={chat.noLeidos > 0 ? 'purple' : 'muted'}>{chat.noLeidos > 0 ? 'Requiere respuesta' : 'Atendido'}</Badge>}
            </div>

            <div className="wa-chat">
              {mensajes[chatIdxSeguro].map((m, i) => (
                <div key={i} className={`wa-msg ${m.de === 'yo' ? 'yo' : m.de === 'ia' ? 'ia' : 'ellos'}`}>
                  {m.de === 'ia' && <span className="wa-msg-tag">🤖 IA</span>}
                  {m.txt}
                </div>
              ))}
            </div>

            {/* Ideas de respuesta */}
            {chat.ideas && chat.ideas.length > 0 && (
              <div className="wa-ideas">
                <div className="tiny muted" style={{ fontWeight: 700, marginBottom: 6 }}>💡 Ideas de respuesta:</div>
                {chat.ideas.map(idea => (
                  <button key={idea} className="wa-idea" onClick={() => usarIdea(idea)}>{idea}</button>
                ))}
              </div>
            )}

            {/* Intervención: disponible en TODAS las conversaciones */}
            <div className="wa-intervene">
              <div className="tiny muted" style={{ fontWeight: 700, marginBottom: 8 }}>
                {chat.requiereHumano ? '⚠️ Esta conversación necesita tu respuesta.' : '🤖 La IA puede responder esto, pero podés intervenir igual.'}
              </div>
              <div className="wa-input-row">
                <input className="input" placeholder="Escribí tu respuesta manual…" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && enviar(true)} />
                <button className="btn btn-primary" style={{ padding: '10px 16px', whiteSpace: 'nowrap' }} onClick={() => enviar(true)}><I_Send size={15} style={{ marginRight: 6 }} />Enviar</button>
              </div>
              <div className="row" style={{ gap: 8, marginTop: 8 }}>
                <Button variant="ghost" onClick={responderConIA}><I_Play size={14} style={{ marginRight: 5 }} /> Dejar que la IA responda</Button>
                <Button variant="outline" onClick={() => usarIdea(NUEVAS_IDEAS_SUGERIDAS[0])}>💡 Usar idea</Button>
              </div>
            </div>
            <div className="tiny muted" style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
              <I_Check size={12} /> Podés intervenir en cualquier conversación, tu mensaje manual pisa el automático.
            </div>
          </Card>
        </div>
      </div>

      <Toast show={!!toast} text={toast} />
    </>
  );
}

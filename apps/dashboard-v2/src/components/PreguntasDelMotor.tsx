// =====================================================================================================
// LO QUE EL MOTOR NECESITA SABER — el pop up con el que el cliente le responde.
//
// POR QUÉ EXISTE
//
// El motor no puede inventar lo que no está en el material del cliente: si le falta su ciudad, o no sabe en
// qué mercados están sus clientes, antes se quedaba callado o medía el mercado equivocado. El dueño lo pidió
// así: «si la información no es suficiente el sistema debe ser inteligente y preguntar directo algo que no
// tenga; el usuario debe poder responder para resolverlo».
//
// CÓMO SE VE
//
// Una tarjeta por pregunta abierta, arriba de «Su día», con: qué necesita, para qué (en términos del
// negocio), un ejemplo de cómo se responde y el campo para escribir. Al responder dice QUÉ QUEDÓ escrito (no
// un «listo» a secas) y la pregunta desaparece.
//
// Sin preguntas abiertas no dibuja nada: no ocupa lugar en la pantalla.
// =====================================================================================================
import { useEffect, useState } from 'react';
import { Card, Badge, Button } from './ui';
import { I_Sparkle, I_Check } from './icons';
import { leerPreguntas, responderPregunta, type PreguntaDelMotor } from '../api/cliente';

export function PreguntasDelMotor({ setToast }: { setToast?: (m: string) => void }) {
  const [abiertas, setAbiertas] = useState<PreguntaDelMotor[]>([]);
  const [texto, setTexto] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState('');
  const [quedo, setQuedo] = useState('');

  const traer = async () => {
    try {
      const r = await leerPreguntas();
      setAbiertas(r.abiertas || []);
    } catch { /* sin back no hay preguntas que mostrar: la pantalla sigue como está */ }
  };
  useEffect(() => { void traer(); }, []);

  const responder = async (p: PreguntaDelMotor) => {
    const valor = String(texto[p.id] || '').trim();
    if (!valor) { setToast?.('Escriba la respuesta antes de enviarla'); return; }
    setEnviando(p.id);
    try {
      const r = await responderPregunta(p.id, valor);
      setQuedo(r.que_quedo || 'quedó guardado');
      setAbiertas(a => a.filter(x => x.id !== p.id));
      setToast?.(r.que_quedo || 'Respuesta guardada');
    } catch {
      setToast?.('No se pudo guardar la respuesta: pruebe otra vez');
    } finally { setEnviando(''); }
  };

  if (!abiertas.length && !quedo) return null;

  return (
    <Card
      title={<span className="row" style={{ gap: 8 }}><I_Sparkle size={14} style={{ color: 'var(--purple3)' }} /> El motor necesita un dato suyo</span>}
      action={<Badge tone="amber">{abiertas.length + (quedo ? 1 : 0)}</Badge>}>
      {quedo && (
        <div className="acc-why" style={{ marginBottom: 10 }}>
          <I_Check size={12} style={{ color: 'var(--green)' }} /> <b>Quedó guardado:</b> {quedo}
        </div>
      )}
      {abiertas.map(p => (
        <div key={p.id} className="col-stack" style={{ marginBottom: 12 }}>
          <div className="alarm-title">{p.pregunta}</div>
          {p.porque && <div className="alarm-sug"><b>Para qué: </b>{p.porque}</div>}
          {Array.isArray(p.opciones) && p.opciones.length > 0 && (
            <div className="onb-chips">
              {p.opciones.map(op => (
                <button key={op} type="button" className={`tipo-chip ${texto[p.id] === op ? 'sel' : ''}`}
                  title={`Responder «${op}»`}
                  onClick={() => setTexto(t => ({ ...t, [p.id]: t[p.id] === op ? '' : op }))}>
                  {texto[p.id] === op ? '✓ ' : ''}{op}
                </button>
              ))}
            </div>
          )}
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <input className="input" style={{ flex: 1, minWidth: 220 }}
              placeholder={p.ejemplo ? `Ejemplo: ${p.ejemplo}` : 'Escriba su respuesta'}
              value={texto[p.id] || ''}
              onChange={e => setTexto(t => ({ ...t, [p.id]: e.target.value }))} />
            <Button variant="primary" className="btn-sm" disabled={enviando === p.id}
              title="Guarda su respuesta donde el motor la lee: la próxima corrida ya trabaja con ella."
              onClick={() => void responder(p)}>
              {enviando === p.id ? 'Guardando…' : 'Responder'}
            </Button>
          </div>
        </div>
      ))}
      <div className="acc-why">
        Cada respuesta queda guardada en su negocio y el motor la usa en la próxima vuelta. No hace falta
        tocar ningún botón más.
      </div>
    </Card>
  );
}

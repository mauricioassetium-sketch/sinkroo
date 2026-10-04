// =====================================================================================================
// LO QUE EL MOTOR NECESITA SABER — el bloque con el que el cliente le responde.
//
// POR QUÉ EXISTE
//
// El motor no puede inventar lo que no está en el material del cliente: si le falta su ciudad, o no sabe en
// qué mercados están sus clientes, antes se quedaba callado o medía el mercado equivocado. El dueño lo pidió
// así: «si la información no es suficiente el sistema debe ser inteligente y preguntar directo algo que no
// tenga; el usuario debe poder responder para resolverlo».
//
// LAS OPCIONES NO SON UNA LISTA FIJA: salen del estudio del mercado que el motor ya hizo (los países donde
// leyó anuncios de su rubro y los lugares que nombra su material). Por eso van primero las suyas y por eso
// siempre está el bloque para ESCRIBIR Y AGREGAR la que falte: quien sabe dónde están sus clientes es el
// cliente, no el sistema.
//
// Se pueden marcar varias y agregar las que quiera: se guardan todas juntas en la misma respuesta.
//
// Sin preguntas abiertas no dibuja nada: no ocupa lugar en la pantalla.
// =====================================================================================================
import { useEffect, useState } from 'react';
import { Card, Badge, Button } from './ui';
import { I_Sparkle, I_Check, I_Plus, I_X } from './icons';
import { leerPreguntas, responderPregunta, type PreguntaDelMotor } from '../api/cliente';

export function PreguntasDelMotor({ setToast }: { setToast?: (m: string) => void }) {
  const [abiertas, setAbiertas] = useState<PreguntaDelMotor[]>([]);
  // Lo que se arma por pregunta: lo marcado de la lista del estudio y lo que se agrega escribiendo.
  const [marcadas, setMarcadas] = useState<Record<string, string[]>>({});
  const [agregadas, setAgregadas] = useState<Record<string, string[]>>({});
  const [borrador, setBorrador] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState('');
  const [quedo, setQuedo] = useState('');

  const traer = async () => {
    try {
      const r = await leerPreguntas();
      setAbiertas(r.abiertas || []);
    } catch { /* sin back no hay preguntas que mostrar: la pantalla sigue como está */ }
  };
  useEffect(() => { void traer(); }, []);

  const alternar = (id: string, op: string) =>
    setMarcadas(m => {
      const suyas = m[id] || [];
      return { ...m, [id]: suyas.includes(op) ? suyas.filter(x => x !== op) : [...suyas, op] };
    });

  const agregar = (id: string) => {
    const t = String(borrador[id] || '').trim();
    if (!t) { setToast?.('Escriba el país o la región antes de agregarla'); return; }
    setAgregadas(a => {
      const suyas = a[id] || [];
      return suyas.some(x => x.toLowerCase() === t.toLowerCase()) ? a : { ...a, [id]: [...suyas, t] };
    });
    setBorrador(b => ({ ...b, [id]: '' }));
  };

  const quitar = (id: string, cual: string) =>
    setAgregadas(a => ({ ...a, [id]: (a[id] || []).filter(x => x !== cual) }));

  const responder = async (p: PreguntaDelMotor) => {
    const todas = [...(marcadas[p.id] || []), ...(agregadas[p.id] || [])];
    if (!todas.length) { setToast?.('Marque una opción del estudio o escriba la suya antes de enviar'); return; }
    setEnviando(p.id);
    try {
      const r = await responderPregunta(p.id, todas.join(', '));
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
      {abiertas.map(p => {
        const suyas = marcadas[p.id] || [];
        const extras = agregadas[p.id] || [];
        return (
          <div key={p.id} className="col-stack" style={{ marginBottom: 14 }}>
            <div className="alarm-title">{p.pregunta}</div>
            {p.porque && <div className="alarm-sug"><b>Para qué: </b>{p.porque}</div>}

            {Array.isArray(p.opciones) && p.opciones.length > 0 && (
              <>
                <div className="tiny muted">Lo que ya le salió en el estudio de su mercado: marque las que correspondan.</div>
                <div className="onb-chips">
                  {p.opciones.map(op => (
                    <button key={op} type="button" className={`tipo-chip ${suyas.includes(op) ? 'sel' : ''}`}
                      title={`Marcar «${op}» como uno de sus mercados`}
                      onClick={() => alternar(p.id, op)}>
                      {suyas.includes(op) ? '✓ ' : ''}{op}
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="tiny muted">¿Falta alguno? Escríbalo y agréguelo:</div>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <input className="input" style={{ flex: 1, minWidth: 200 }}
                placeholder={p.ejemplo ? `Ejemplo: ${p.ejemplo}` : 'Escriba el país o la región'}
                value={borrador[p.id] || ''}
                onChange={e => setBorrador(b => ({ ...b, [p.id]: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); agregar(p.id); } }} />
              <Button variant="ghost" className="btn-sm" title="Lo agrega a su respuesta"
                onClick={() => agregar(p.id)}>
                <I_Plus size={12} /> Agregar
              </Button>
            </div>

            {extras.length > 0 && (
              <div className="onb-chips">
                {extras.map(x => (
                  <button key={x} type="button" className="tipo-chip sel" title="Quitarlo de la respuesta"
                    onClick={() => quitar(p.id, x)}>
                    {x} <I_X size={11} />
                  </button>
                ))}
              </div>
            )}

            <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <Button variant="primary" className="btn-sm" disabled={enviando === p.id}
                title="Guarda su respuesta donde el motor la lee: la próxima corrida ya trabaja con ella."
                onClick={() => void responder(p)}>
                {enviando === p.id ? 'Guardando…' : 'Responder'}
              </Button>
              {(suyas.length + extras.length) > 0 && (
                <span className="tiny muted">Va a responder: {[...suyas, ...extras].join(', ')}</span>
              )}
            </div>
          </div>
        );
      })}
      <div className="acc-why">
        Cada respuesta queda guardada en su negocio y el motor la usa en la próxima vuelta: los mercados que
        marque son los que va a leer para buscar a sus clientes.
      </div>
    </Card>
  );
}

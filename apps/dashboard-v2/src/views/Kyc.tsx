import { useState, useRef, useEffect } from 'react';
import { Card, Badge, Button } from '../components/ui';
import { ViewHead } from '../components/viz';
import { I_Shield, I_Check, I_ArrowRight, I_Camera, I_Lock, I_Zap, I_Credit, I_Globe, I_Eye, I_Qr, I_Refresh, I_Sun, I_User } from '../components/icons';
import { usePerfil } from '../lib/perfil';

// =============================================================================================
// MODELO DE KYC — todo se captura con la cámara, en el momento.
// No hay subida de archivos en ningún paso: no se puede usar una foto guardada, ni de la
// galería, ni de otra persona. Si estás en una computadora sin cámara, se ofrece hacerlo
// desde el celular escaneando un código.
// =============================================================================================

type Captura = { k: string; lb: string; ayuda: string; espejo?: boolean };

const PASOS: { id: number; nombre: string; desc: string; pide: string; capturas: Captura[]; desbloquea: string }[] = [
  {
    id: 1, nombre: 'Identidad', desc: 'Documento con la cámara',
    pide: 'Sacale una foto al documento con la cámara, en el momento: primero el frente y después el dorso. Tiene que verse entero y con buena luz.',
    capturas: [
      { k: 'doc_frente', lb: 'Frente del documento', ayuda: 'Que se vean nítidos tus datos y tu foto.' },
      { k: 'doc_dorso', lb: 'Dorso del documento', ayuda: 'Donde está el código de barras o el número de trámite.' },
    ],
    desbloquea: 'Confirmar que hay una persona real detrás de la cuenta',
  },
  {
    id: 2, nombre: 'Domicilio', desc: 'Comprobante con la cámara',
    pide: 'Sacale una foto al comprobante completo (un servicio o resumen a tu nombre, de los últimos 3 meses), de modo que se lea la dirección.',
    capturas: [{ k: 'domicilio', lb: 'Comprobante de domicilio', ayuda: 'Que entre la hoja completa en la foto.' }],
    desbloquea: 'Facturar y cobrar desde tu país',
  },
  {
    id: 3, nombre: 'Selfie', desc: 'Tu cara, en vivo',
    pide: 'Mirá de frente y sacate la selfie con la cámara frontal. Sin gorra ni lentes, y con buena luz.',
    capturas: [{ k: 'selfie', lb: 'Tu selfie', ayuda: 'Se compara con la foto del documento.', espejo: true }],
    desbloquea: 'Mover presupuesto y publicar sin límites',
  },
];

// ---------------------------------------------------------------------------------------------
// Una captura: abre la cámara de verdad, muestra el video en vivo y guarda el cuadro.
// No expone ningún input de archivo.
// ---------------------------------------------------------------------------------------------
function CapturaCamara({ captura, foto, setFoto }: { captura: Captura; foto: string | null; setFoto: (f: string | null) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [activa, setActiva] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (activa && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [activa]);

  useEffect(() => () => { streamRef.current?.getTracks().forEach(t => t.stop()); }, []);

  const apagar = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setActiva(false);
  };

  const activar = async () => {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Este navegador no puede usar la cámara. Probá con otro, o hacelo desde el celular con el código de abajo.');
      return;
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: captura.espejo ? 'user' : 'environment', width: { ideal: 1280 }, height: { ideal: 960 } },
      });
      streamRef.current = s;
      setActiva(true);
    } catch {
      setError('No pudimos abrir la cámara. Fijate que el navegador tenga permiso para usarla y que ninguna otra app la esté usando.');
    }
  };

  const disparar = () => {
    const v = videoRef.current;
    if (!v) return;
    const c = document.createElement('canvas');
    c.width = v.videoWidth || 960;
    c.height = v.videoHeight || 720;
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.drawImage(v, 0, 0, c.width, c.height);
      setFoto(c.toDataURL('image/jpeg', 0.9));
    }
    apagar();
  };

  if (foto) {
    return (
      <div className="cam-wrap">
        <img src={foto} alt={captura.lb} className="cam-foto" />
        <div className="row" style={{ gap: 9, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button variant="outline" className="btn-sm" title="Borra esta foto y volvés a abrir la cámara"
            onClick={() => setFoto(null)}><I_Refresh size={13} /> Sacarla de nuevo</Button>
          <span className="tiny" style={{ color: 'var(--green)', fontWeight: 700 }}>{captura.lb} ✓</span>
        </div>
      </div>
    );
  }

  return (
    <div className="cam-wrap">
      {activa ? (
        <>
          <video ref={videoRef} className="cam-video" playsInline muted />
          <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
            <Button className="btn-sm" title="Guarda la foto con lo que la cámara está viendo ahora"
              onClick={disparar}><I_Camera size={13} /> Sacar la foto</Button>
            <Button variant="ghost" className="btn-sm" title="Cierra la cámara sin sacar nada" onClick={apagar}>Cancelar</Button>
          </div>
          <div className="tiny muted">{captura.ayuda}</div>
        </>
      ) : (
        <>
          <div className="cam-off">
            <span style={{ color: 'var(--purple3)' }}>{captura.espejo ? <I_User size={28} /> : <I_Camera size={28} />}</span>
            <span className="small" style={{ fontWeight: 700 }}>{captura.lb}</span>
            <span className="tiny muted">Se saca con la cámara, en el momento. No se puede subir una foto guardada.</span>
          </div>
          <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
            <Button className="btn-sm" title="El navegador te pide permiso y se abre la cámara"
              onClick={activar}><I_Camera size={13} /> Activar la cámara</Button>
          </div>
          {error && (
            <div className="alarm" style={{ borderLeft: '3px solid var(--amber)', background: 'rgba(245,158,11,.06)' }}>
              <div className="alarm-head"><span className="alarm-sev atencion">NO SE PUDO ABRIR</span></div>
              <div className="alarm-sug">{error}</div>
            </div>
          )}
          <div className="cam-qr">
            <span className="cam-qr-code"><I_Qr size={40} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="bt">¿Estás en la computadora?</div>
              <div className="bs">Escaneá el código con el celular y hacelo desde ahí: se abre esta misma pantalla y las fotos salen con la cámara del teléfono.</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function ViewKyc({ setToast }: { setToast: (t: string) => void }) {
  const { perfil } = usePerfil();
  const [paso, setPaso] = useState(1);
  const [fotos, setFotos] = useState<Record<string, string>>({});
  const [nombre, setNombre] = useState('');
  const [domicilio, setDomicilio] = useState('');
  const [enviada, setEnviada] = useState(false);

  const actual = PASOS[paso - 1];
  const pasoHecho = (p: typeof PASOS[number]) => p.capturas.every(c => fotos[c.k]);
  const listo = pasoHecho(actual);
  const hechos = PASOS.filter(pasoHecho).length;
  const faltanFotos = actual.capturas.filter(c => !fotos[c.k]).length;

  const setFotoDe = (k: string) => (f: string | null) => {
    setFotos(prev => { const b = { ...prev }; if (f) b[k] = f; else delete b[k]; return b; });
  };

  const siguiente = () => {
    if (!listo) return;
    if (paso < 3) { setPaso(paso + 1); setToast(`Paso ${paso + 1}: ${PASOS[paso].nombre}`); }
    else { setEnviada(true); setToast('Verificación enviada: la revisamos en menos de 24 h'); }
  };

  return (
    <div className="dash">
      <ViewHead
        icon={<I_Shield size={19} />}
        titulo="Verificación de identidad"
        sub="Es un requisito legal para publicar anuncios y mover dinero. Todo se hace con la cámara, en el momento: no se suben archivos."
        nums={[
          { v: enviada ? 'En revisión' : `${hechos}/3`, l: enviada ? 'la estamos revisando' : 'pasos completados', c: enviada ? 'var(--amber)' : 'var(--purple3)' },
          { v: enviada ? '24 h' : `Paso ${paso}`, l: enviada ? 'demora estimada' : actual.nombre, c: 'var(--green)' },
          { v: '4 fotos', l: 'documento, comprobante y selfie' },
          { v: '1 vez', l: 'y no se repite' },
        ]}
      />

      {enviada ? (
        <Card>
          <div className="row" style={{ gap: 14, alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Check size={26} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="bt">Ya está enviada. La revisamos en menos de 24 h.</div>
              <div className="bs" style={{ marginTop: 5 }}>
                Mientras tanto podés seguir usando todo lo que no toca dinero: el panel puntúa piezas,
                el motor vigila el mercado y Rumi contesta tus chats. <b>Publicar y mover presupuesto se
                desbloquea cuando esté aprobada.</b> Te avisamos por WhatsApp y por mail.
              </div>
            </div>
            <Badge tone="amber">en revisión</Badge>
          </div>
          <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <div className="dato"><span className="dato-l">Enviada</span><span className="dato-v">hoy 14:20</span></div>
            <div className="dato"><span className="dato-l">Fotos capturadas</span><span className="dato-v">4</span></div>
            <div className="dato"><span className="dato-l">Se puede rehacer</span><span className="dato-v" style={{ color: 'var(--green)' }}>sí, cuando quieras</span></div>
          </div>
          <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
            <Button variant="outline" className="btn-sm" title="Volvés a empezar la verificación si algo salió mal"
              onClick={() => { setEnviada(false); setPaso(1); setToast('Podés rehacer la verificación'); }}>Rehacerla</Button>
          </div>
        </Card>
      ) : (
        <div className="duo">
          <Card
            title={<span className="row" style={{ gap: 8 }}><I_Shield size={14} style={{ color: 'var(--purple3)' }} /> Paso {paso} de 3 · {actual.nombre}</span>}
            action={<Badge tone={hechos === 3 ? 'green' : 'amber'}>{hechos} de 3</Badge>}
          >
            <div className="bs">{actual.pide}</div>

            {actual.capturas.map(c => (
              <CapturaCamara key={c.k} captura={c} foto={fotos[c.k] || null} setFoto={setFotoDe(c.k)} />
            ))}

            {paso === 1 && (
              <div>
                <label className="label">Nombre completo, como figura en el documento</label>
                <input className="input" placeholder="Mauricio Assettium" value={nombre} onChange={e => setNombre(e.target.value)} />
              </div>
            )}

            {paso === 2 && (
              <div>
                <label className="label">Dirección que figura en el comprobante</label>
                <input className="input" placeholder="Av. Corrientes 1234, CABA" value={domicilio} onChange={e => setDomicilio(e.target.value)} />
              </div>
            )}

            {paso === 3 && (
              <div className="alarm" style={{ borderLeft: '3px solid var(--purple2)', background: 'rgba(168,85,247,.05)' }}>
                <div className="alarm-head"><span className="alarm-sev oportunidad">ANTES DE SACARTE LA FOTO</span></div>
                <div className="alarm-sug">
                  <b>Buena luz, sin gorra ni lentes.</b> La foto se compara con la del documento:
                  si no coincide, se rechaza. Se hace una sola vez.
                </div>
              </div>
            )}

            <div className="row" style={{ gap: 9, flexWrap: 'wrap', alignItems: 'center' }}>
              <Button variant="ghost" className="btn-sm" disabled={paso === 1}
                title={paso === 1 ? 'Estás en el primer paso' : 'Volvés al paso anterior, no se pierde ninguna foto'}
                onClick={() => setPaso(paso - 1)}>Atrás</Button>
              <Button className="btn-sm" disabled={!listo}
                title={listo
                  ? (paso < 3 ? 'Pasa al siguiente paso' : 'Envía las 4 fotos para que las revisemos')
                  : `Faltan ${faltanFotos} foto${faltanFotos === 1 ? '' : 's'} de este paso: se sacan con la cámara`}
                onClick={siguiente}>
                {paso < 3 ? 'Continuar' : 'Enviar a revisión'} <I_ArrowRight size={13} />
              </Button>
              {!listo && <span className="tiny muted">Falta{faltanFotos === 1 ? '' : 'n'} {faltanFotos} foto{faltanFotos === 1 ? '' : 's'}</span>}
            </div>
            <div className="acc-why">
              Podés cerrar esto y volver después: <b>las fotos quedan guardadas</b>. Nada de lo que saques acá
              se publica ni se usa para nada más que verificar quién sos.
            </div>
          </Card>

          <Card
            title={<span className="row" style={{ gap: 8 }}><I_Eye size={14} style={{ color: 'var(--green)' }} /> Qué desbloquea cada paso</span>}
            action={<Badge tone="purple">3 pasos</Badge>}
          >
            {PASOS.map(p => {
              const hecho = pasoHecho(p);
              const activo = paso === p.id;
              return (
                <div key={p.id} className="guard" style={{ borderBottom: '1px solid var(--border)', padding: '12px 0' }}>
                  <span style={{ color: hecho ? 'var(--green)' : activo ? 'var(--purple3)' : 'var(--muted)', flexShrink: 0 }}>
                    {hecho ? <I_Check size={15} /> : <span style={{ fontWeight: 900, fontSize: 13 }}>{p.id}</span>}
                  </span>
                  <span className="guard-lb">{p.nombre} · {p.desc}
                    <small>{p.desbloquea}</small>
                  </span>
                  <Badge tone={hecho ? 'green' : activo ? 'amber' : 'muted'}>{hecho ? 'listo' : activo ? 'ahora' : 'falta'}</Badge>
                </div>
              );
            })}
            <div>
              <div className="bs" style={{ marginBottom: 9 }}>Lo que se habilita cuando esté aprobada:</div>
              <div className="guards">
                <div className="guard"><span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Zap size={14} /></span>
                  <span className="guard-lb">Publicar en tus redes<small>Anuncios, posts e historias salen con tu cuenta</small></span></div>
                <div className="guard"><span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Credit size={14} /></span>
                  <span className="guard-lb">El motor puede mover presupuesto<small>Dentro de los frenos que ya tenés puestos</small></span></div>
                <div className="guard"><span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Globe size={14} /></span>
                  <span className="guard-lb">Cobrar y facturar<small>Tu plan y tus recargas con factura a tu nombre</small></span></div>
              </div>
            </div>
            <div>
              <div className="bs" style={{ marginBottom: 9 }}>Cuánto tarda todo esto:</div>
              <div className="guards">
                <div className="guard"><span style={{ color: 'var(--purple3)', flexShrink: 0 }}><I_Camera size={14} /></span>
                  <span className="guard-lb">Sacar las 4 fotos<small>Son 2 minutos si tenés el documento a mano</small></span>
                  <span className="guard-val">2 min</span></div>
                <div className="guard"><span style={{ color: 'var(--purple3)', flexShrink: 0 }}><I_Eye size={14} /></span>
                  <span className="guard-lb">La revisión<small>Es automática; si algo no cierra, lo mira una persona</small></span>
                  <span className="guard-val">&lt; 24 h</span></div>
                <div className="guard"><span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Check size={14} /></span>
                  <span className="guard-lb">Si te falta algo<small>Te lo pedimos ese mismo día, con el detalle</small></span>
                  <span className="guard-val">el mismo día</span></div>
              </div>
            </div>
            <div className="acc-why">
              Todo se captura <b>con la cámara en el momento</b>: no se puede subir una foto guardada, ni de tu
              galería, ni de otra persona. Es lo que hace que la verificación valga.
            </div>
          </Card>
        </div>
      )}

      {/* ============ QUÉ HACEMOS CON TUS DATOS ============ */}
      <div className="duo" style={{ marginTop: 16 }}>
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Lock size={14} style={{ color: 'var(--purple3)' }} /> Qué pasa con tus fotos</span>}
          action={<Badge tone="green">cifradas</Badge>}
        >
          <div className="guards">
            <div className="guard"><span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Check size={14} /></span>
              <span className="guard-lb">Se guardan cifradas<small>Nadie de Sinkroo puede abrirlas desde el panel.</small></span></div>
            <div className="guard"><span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Check size={14} /></span>
              <span className="guard-lb">Solo se usan para verificar<small>No se usan para publicidad ni se comparten con terceros.</small></span></div>
            <div className="guard"><span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Check size={14} /></span>
              <span className="guard-lb">Se borran solas<small>A los 90 días de aprobada la verificación.</small></span></div>
          </div>
          <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <div className="dato"><span className="dato-l">Cuenta</span><span className="dato-v">{perfil.marca}</span></div>
            <div className="dato"><span className="dato-l">Titular</span><span className="dato-v">{perfil.nombre}</span></div>
            <div className="dato"><span className="dato-l">Estado</span><span className="dato-v" style={{ color: 'var(--amber)' }}>sin verificar</span></div>
          </div>
          <div className="acc-why">
            Te lo pedimos <b>una sola vez</b> y queda para siempre. Si cambia algo de tus datos,
            se vuelve a pedir solo la foto de lo que cambió.
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Sun size={14} style={{ color: 'var(--amber)' }} /> Si la cámara no abre o algo no coincide</span>}
          action={<Badge tone="muted">por si acaso</Badge>}
        >
          <div className="bs">
            Son los dos problemas reales de una verificación. Así se resuelven:
          </div>
          <div className="guards">
            <div className="guard"><span style={{ color: 'var(--amber)', flexShrink: 0 }}><span style={{ fontWeight: 900, fontSize: 13 }}>1</span></span>
              <span className="guard-lb">La cámara no abre<small>Se hace desde el celular con el código: no hay forma de subir una foto aunque quieras.</small></span></div>
            <div className="guard"><span style={{ color: 'var(--amber)', flexShrink: 0 }}><span style={{ fontWeight: 900, fontSize: 13 }}>2</span></span>
              <span className="guard-lb">El nombre no coincide<small>Te decimos qué no coincidió, con el detalle exacto y no un "rechazado" a secas.</small></span></div>
            <div className="guard"><span style={{ color: 'var(--amber)', flexShrink: 0 }}><span style={{ fontWeight: 900, fontSize: 13 }}>3</span></span>
              <span className="guard-lb">Volvés a sacar solo esa foto<small>No hay que rehacer los 3 pasos. Las correcciones pasan adelante.</small></span></div>
          </div>
          <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
            <Button variant="ghost" className="btn-sm" title="Te explica con tus palabras qué pide cada paso y por qué"
              onClick={() => setToast('Ayuda con la verificación (demo)')}>No entiendo qué me piden</Button>
            <Button variant="ghost" className="btn-sm" title="Hablás con una persona del equipo"
              onClick={() => setToast('Abriendo el chat con soporte (demo)')}>Hablar con una persona</Button>
          </div>
          <div className="acc-why">
            Mientras la verificación está pendiente <b>el motor no se detiene</b>: sigue produciendo piezas
            y dejándolas listas para el momento en que se apruebe.
          </div>
        </Card>
      </div>
    </div>
  );
}

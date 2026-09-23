import { useState } from 'react';
import { Card, Badge, Button } from '../components/ui';
import { ViewHead } from '../components/viz';
import { I_Shield, I_Upload, I_Check, I_ArrowRight, I_Doc, I_Camera, I_Lock, I_Zap, I_Credit, I_Globe, I_Eye } from '../components/icons';
import { TENANT } from '../data/demo';

const PASOS = [
  { id: 1, nombre: 'Identidad', desc: 'Tu documento', pide: 'DNI o pasaporte, frente y dorso. PNG, JPG o PDF, hasta 10 MB.', desbloquea: 'Confirmar que hay una persona real detrás de la cuenta' },
  { id: 2, nombre: 'Domicilio', desc: 'Comprobante', pide: 'Un servicio o resumen a tu nombre, de los últimos 3 meses.', desbloquea: 'Facturar y cobrar desde tu país' },
  { id: 3, nombre: 'Selfie', desc: 'Verificación facial', pide: 'Una selfie tuya, con buena luz y sin lentes de sol.', desbloquea: 'Mover presupuesto y publicar sin límites' },
];

export function ViewKyc({ setToast }: { setToast: (t: string) => void }) {
  const [paso, setPaso] = useState(1);
  const [archivos, setArchivos] = useState<Record<number, string>>({});
  const [nombre, setNombre] = useState('');
  const [documento, setDocumento] = useState('');
  const [enviada, setEnviada] = useState(false);

  const subir = (id: number, files: FileList | null) => {
    if (!files || !files.length) return;
    setArchivos(a => ({ ...a, [id]: files[0].name }));
    setToast(`Archivo cargado: ${files[0].name}`);
  };

  const siguiente = () => {
    if (paso < 3) setPaso(paso + 1);
    else { setEnviada(true); setToast('Verificación enviada: la revisamos en menos de 24 h'); }
  };

  const hechos = Object.keys(archivos).length;

  return (
    <div className="dash">
      <ViewHead
        icon={<I_Shield size={19} />}
        titulo="Verificación de identidad"
        sub="Es un requisito legal para publicar anuncios y mover dinero. Se hace una vez y no se repite."
        nums={[
          { v: enviada ? 'En revisión' : `${hechos}/3`, l: enviada ? 'la estamos revisando' : 'pasos completados', c: enviada ? 'var(--amber)' : 'var(--purple3)' },
          { v: enviada ? '24 h' : `Paso ${paso}`, l: enviada ? 'demora estimada' : PASOS[paso - 1].nombre, c: 'var(--green)' },
          { v: '1 vez', l: 'nada más' },
          { v: '3 datos', l: 'documento, domicilio y selfie' },
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
            <div className="dato"><span className="dato-l">Documento</span><span className="dato-v">DNI ···· 678</span></div>
            <div className="dato"><span className="dato-l">Se puede rehacer</span><span className="dato-v" style={{ color: 'var(--green)' }}>sí, cuando quieras</span></div>
          </div>
          <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
            <Button variant="outline" className="btn-sm" title="Podés volver a subir un documento si te equivocaste"
              onClick={() => { setEnviada(false); setPaso(1); setToast('Podés corregir lo que cargaste'); }}>Corregir algo</Button>
          </div>
        </Card>
      ) : (
        <div className="duo">
          <Card
            title={<span className="row" style={{ gap: 8 }}><I_Shield size={14} style={{ color: 'var(--purple3)' }} /> Paso {paso} de 3 · {PASOS[paso - 1].nombre}</span>}
            action={<Badge tone={hechos === 3 ? 'green' : 'amber'}>{hechos} de 3</Badge>}
          >
            <div className="bs">{PASOS[paso - 1].pide}</div>

            <label className={`kyc-drop ${archivos[paso] ? 'has-file' : ''}`} style={{ cursor: 'pointer' }}>
              {archivos[paso] ? (
                <>
                  <span style={{ color: 'var(--green)' }}><I_Doc size={26} /></span>
                  <span className="small" style={{ fontWeight: 700 }}>{archivos[paso]}</span>
                  <span className="tiny muted">Archivo cargado ✓</span>
                </>
              ) : (
                <>
                  <span style={{ color: 'var(--purple3)' }}>{paso === 3 ? <I_Camera size={26} /> : <I_Upload size={26} />}</span>
                  <span className="small" style={{ fontWeight: 700 }}>{paso === 3 ? 'Activar la cámara o subir una foto' : 'Arrastrá o hacé clic para subir'}</span>
                  <span className="tiny muted">{paso === 3 ? 'JPG o PNG · hasta 10 MB' : 'PNG, JPG o PDF · hasta 10 MB'}</span>
                </>
              )}
              <input type="file" style={{ display: 'none' }}
                accept={paso === 3 ? 'image/*' : 'image/*,application/pdf'}
                onChange={e => subir(paso, e.target.files)} />
            </label>

            {paso === 1 && (
              <div>
                <label className="label">Nombre completo, como figura en el documento</label>
                <input className="input" placeholder="Mauricio Assettium" value={nombre} onChange={e => setNombre(e.target.value)} />
                <label className="label" style={{ marginTop: 10 }}>Número de documento</label>
                <input className="input" placeholder="12.345.678" value={documento} onChange={e => setDocumento(e.target.value)} />
              </div>
            )}

            {paso === 2 && (
              <div>
                <label className="label">Dirección que figura en el comprobante</label>
                <input className="input" placeholder="Av. Corrientes 1234, CABA" />
              </div>
            )}

            {paso === 3 && (
              <div className="alarm" style={{ borderLeft: '3px solid var(--purple2)', background: 'rgba(168,85,247,.05)' }}>
                <div className="alarm-head"><span className="alarm-sev oportunidad">ANTES DE SACARTE LA FOTO</span></div>
                <div className="alarm-sug">
                  <b>Buena luz, sin gorra ni lentes.</b> La foto se compara con la del documento:
                  si no coincide, se rechaza y tenés que empezar de nuevo. Se hace una sola vez.
                </div>
              </div>
            )}

            <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
              <Button variant="ghost" className="btn-sm" disabled={paso === 1}
                title={paso === 1 ? 'Estás en el primer paso' : 'Volvés al paso anterior, no se pierde nada de lo cargado'}
                onClick={() => setPaso(paso - 1)}>Atrás</Button>
              <Button className="btn-sm" disabled={!archivos[paso]}
                title={archivos[paso] ? (paso < 3 ? 'Pasa al siguiente paso' : 'Envía todo para que lo revisemos') : 'Primero subí el archivo de este paso'}
                onClick={siguiente}>
                {paso < 3 ? 'Continuar' : 'Enviar a revisión'} <I_ArrowRight size={13} />
              </Button>
            </div>
            <div className="acc-why">
              Podés cerrar esto y volver después: <b>lo que cargaste queda guardado</b>. Nada de lo que
              subas acá se publica ni se usa para nada más que verificar quién sos.
            </div>
          </Card>

          <Card
            title={<span className="row" style={{ gap: 8 }}><I_Eye size={14} style={{ color: 'var(--green)' }} /> Qué desbloquea cada paso</span>}
            action={<Badge tone="purple">3 pasos</Badge>}
          >
            {PASOS.map(p => {
              const hecho = !!archivos[p.id] || enviada || paso > p.id;
              const activo = paso === p.id;
              return (
                <div key={p.id} className="guard" style={{ borderColor: activo ? 'var(--purple2)' : undefined, borderBottom: '1px solid var(--border)', padding: '12px 0' }}>
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
            <div className="acc-why">
              Sin la verificación el motor <b>igual trabaja</b>: puntúa, analiza el mercado y contesta
              mensajes. Lo único que no puede es gastar plata ni publicar. Es una traba legal, no nuestra.
            </div>
          </Card>
        </div>
      )}

      {/* ============ QUÉ HACEMOS CON TUS DATOS ============ */}
      <div className="duo" style={{ marginTop: 16 }}>
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Lock size={14} style={{ color: 'var(--purple3)' }} /> Qué pasa con tus documentos</span>}
          action={<Badge tone="green">cifrados</Badge>}
        >
          <div className="guards">
            <div className="guard"><span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Check size={14} /></span>
              <span className="guard-lb">Se guardan cifrados<small>Nadie de Sinkroo puede abrirlos desde el panel.</small></span></div>
            <div className="guard"><span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Check size={14} /></span>
              <span className="guard-lb">Solo se usan para verificar<small>No se usan para publicidad ni se comparten con terceros.</small></span></div>
            <div className="guard"><span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Check size={14} /></span>
              <span className="guard-lb">Los podés borrar cuando quieras<small>Se borran a los 90 días de aprobada la verificación.</small></span></div>
          </div>
          <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <div className="dato"><span className="dato-l">Cuenta</span><span className="dato-v">{TENANT.cuenta}</span></div>
            <div className="dato"><span className="dato-l">Titular</span><span className="dato-v">{TENANT.usuario}</span></div>
            <div className="dato"><span className="dato-l">Estado</span><span className="dato-v" style={{ color: 'var(--amber)' }}>sin verificar</span></div>
          </div>
          <div className="acc-why">
            Te lo pedimos <b>una sola vez</b> y queda para siempre. Si cambia algo de tus datos,
            se pide de nuevo solo el documento que cambió.
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Shield size={14} style={{ color: 'var(--amber)' }} /> Si algo no coincide</span>}
          action={<Badge tone="muted">por si acaso</Badge>}
        >
          <div className="bs">
            El caso más común es que <b>el nombre del documento no sea exactamente igual</b> al del titular
            de la cuenta de anuncios. Se arregla así:
          </div>
          <div className="guards">
            <div className="guard"><span style={{ color: 'var(--amber)', flexShrink: 0 }}><span style={{ fontWeight: 900, fontSize: 13 }}>1</span></span>
              <span className="guard-lb">Te avisamos qué no coincidió<small>Con el detalle exacto, no un "rechazado" a secas.</small></span></div>
            <div className="guard"><span style={{ color: 'var(--amber)', flexShrink: 0 }}><span style={{ fontWeight: 900, fontSize: 13 }}>2</span></span>
              <span className="guard-lb">Corregís solo ese paso<small>No hay que volver a subir todo de nuevo.</small></span></div>
            <div className="guard"><span style={{ color: 'var(--amber)', flexShrink: 0 }}><span style={{ fontWeight: 900, fontSize: 13 }}>3</span></span>
              <span className="guard-lb">Se revisa otra vez, sin fila<small>Las correcciones tienen prioridad sobre los envíos nuevos.</small></span></div>
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

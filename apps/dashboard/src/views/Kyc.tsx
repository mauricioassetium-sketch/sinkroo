import { useState } from 'react';
import { Card, Badge, Button } from '../components/sinkroo/ui';
import { I_Shield, I_Upload, I_Check, I_ArrowRight, I_Doc, I_Camera } from '../components/sinkroo/icons';

const PASOS = [
  { id: 1, nombre: 'Identidad', desc: 'Cargá tu documento' },
  { id: 2, nombre: 'Domicilio', desc: 'Comprobante de residencia' },
  { id: 3, nombre: 'Selfie', desc: 'Verificación facial' },
];

export default function Kyc({ onDone }: { onDone: () => void }) {
  const [paso, setPaso] = useState(1);
  const [archivos, setArchivos] = useState<Record<number, string>>({});
  const [enviada, setEnviada] = useState(false);

  const subir = (id: number) => {
    setArchivos(a => ({ ...a, [id]: 'documento_frontal.pdf' }));
  };

  const siguiente = () => {
    if (paso < 3) setPaso(paso + 1);
    else setEnviada(true);
  };

  return (
    <div className="kyc-shell">
      <Card className="kyc-card" title="Verificación de identidad (KYC)" action={<Badge tone="purple"><I_Shield size={13} /> Verificación</Badge>}>
        {enviada ? (
          <div className="kyc-success">
            <div className="kyc-check"><I_Check size={34} /></div>
            <div className="h3">¡Verificación enviada!</div>
            <p className="muted">Tu documentación está en revisión. Te avisaremos cuando esté aprobada (suele tardar menos de 24 h).</p>
            <div className="row" style={{ gap: 10, justifyContent: 'center' }}>
              <Badge tone="green">Estado: en revisión</Badge>
            </div>
            <Button onClick={onDone} style={{ marginTop: 18 }}>Ir al dashboard <I_ArrowRight size={15} /></Button>
          </div>
        ) : (
          <>
            {/* progreso */}
            <div className="kyc-steps">
              {PASOS.map(p => {
                const hecho = archivos[p.id];
                const activo = paso === p.id;
                const pasado = paso > p.id;
                return (
                  <div key={p.id} className={`kyc-step ${activo ? 'active' : ''} ${hecho || pasado ? 'done' : ''}`}>
                    <div className="kyc-step-num">{hecho || pasado ? <I_Check size={14} /> : p.id}</div>
                    <div className="small" style={{ fontWeight: 700 }}>{p.nombre}</div>
                    <div className="tiny muted">{p.desc}</div>
                  </div>
                );
              })}
            </div>

            {/* cuerpo según paso */}
            <div className="kyc-body">
              <div className="h3" style={{ marginBottom: 6 }}>Paso {paso} de 3</div>
              <p className="muted" style={{ marginBottom: 18 }}>
                {paso === 1 && 'Subí una foto de tu DNI o pasaporte (frente).'}
                {paso === 2 && 'Subí un comprobante de domicilio (servicio a tu nombre).'}
                {paso === 3 && 'Sacate una selfie para verificar que sos vos.'}
              </p>

              <div className={`kyc-drop ${archivos[paso] ? 'has-file' : ''}`} onClick={() => subir(paso)}>
                {archivos[paso] ? (
                  <><I_Doc size={26} /><div className="small" style={{ fontWeight: 600 }}>{archivos[paso]}</div><div className="tiny muted">Archivo cargado ✓</div></>
                ) : (
                  <><I_Upload size={26} /><div className="small" style={{ fontWeight: 600 }}>{paso === 3 ? 'Activar cámara' : 'Arrastrá o hacé clic para subir'}</div><div className="tiny muted">{paso === 3 ? <I_Camera size={14} /> : 'PNG, JPG o PDF · máx 10 MB'}</div></>
                )}
              </div>

              {paso === 1 && (
                <div className="kyc-fields">
                  <label className="small muted">Nombre completo</label>
                  <input className="input" placeholder="Mauricio Assettium" style={{ width: '100%' }} />
                  <label className="small muted" style={{ marginTop: 10 }}>Número de documento</label>
                  <input className="input" placeholder="12.345.678" style={{ width: '100%' }} />
                </div>
              )}
            </div>

            <div className="row" style={{ justifyContent: 'space-between', marginTop: 20 }}>
              <Button variant="ghost" disabled={paso === 1} onClick={() => setPaso(paso - 1)}>Atrás</Button>
              <Button onClick={siguiente} disabled={!archivos[paso]}>
                {paso < 3 ? 'Continuar' : 'Enviar verificación'} <I_ArrowRight size={15} />
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

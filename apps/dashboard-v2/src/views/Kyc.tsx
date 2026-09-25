import { useState, useRef, useEffect } from 'react';
import { Card, Badge, Button } from '../components/ui';
import { ViewHead } from '../components/viz';
import { I_Shield, I_Check, I_ArrowRight, I_Camera, I_Lock, I_Zap, I_Credit, I_Globe, I_Eye, I_Qr, I_Refresh, I_Sun, I_User } from '../components/icons';
import { usePerfil } from '../lib/perfil';
import { useDetalle } from '../components/Detalle';
import { FRENOS } from '../data/demo';

// =============================================================================================
// MODELO DE KYC — todo se captura con la cámara, en el momento.
// No hay subida de archivos en ningún paso: no se puede usar una foto guardada, ni de la
// galería, ni de otra persona. Si está en un computador sin cámara, se ofrece hacerlo
// desde el celular escaneando un código.
// =============================================================================================

type Captura = { k: string; lb: string; ayuda: string; espejo?: boolean };

const PASOS: { id: number; nombre: string; desc: string; pide: string; capturas: Captura[]; desbloquea: string }[] = [
  {
    id: 1, nombre: 'Identidad', desc: 'Documento con la cámara',
    pide: 'Tome una foto del documento con la cámara, en el momento: primero el frente y después el dorso. Tiene que verse entero y con buena luz.',
    capturas: [
      { k: 'doc_frente', lb: 'Frente del documento', ayuda: 'Que se vean nítidos sus datos y su foto.' },
      { k: 'doc_dorso', lb: 'Dorso del documento', ayuda: 'Donde aparecen el número del documento y el código de barras.' },
    ],
    desbloquea: 'Confirmar que hay una persona real detrás de la cuenta',
  },
  {
    id: 2, nombre: 'Domicilio', desc: 'Comprobante con la cámara',
    pide: 'Tome una foto del comprobante completo (un recibo de servicio o un extracto a su nombre, de los últimos 3 meses), de modo que se lea la dirección.',
    capturas: [{ k: 'domicilio', lb: 'Comprobante de domicilio', ayuda: 'Que entre la hoja completa en la foto.' }],
    desbloquea: 'Facturar y cobrar desde su país',
  },
  {
    id: 3, nombre: 'Selfie', desc: 'Su cara, en vivo',
    pide: 'Mire de frente y tómese la selfie con la cámara frontal. Sin gorra ni gafas, y con buena luz.',
    capturas: [{ k: 'selfie', lb: 'Su selfie', ayuda: 'Se compara con la foto del documento.', espejo: true }],
    desbloquea: 'Mover presupuesto y publicar sin límites',
  },
];

/**
 * El freno del plan que hace obligatoria la verificación. Es el dato que explica POR QUÉ se pide
 * y qué queda apagado mientras no esté aprobada (vive en `src/data/demo.ts`, key `kyc`).
 */
const FRENO_KYC = FRENOS.find(f => f.key === 'kyc');

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
      setError('Este navegador no puede usar la cámara. Pruebe con otro, o hágalo desde el celular con el código de abajo.');
      return;
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: captura.espejo ? 'user' : 'environment', width: { ideal: 1280 }, height: { ideal: 960 } },
      });
      streamRef.current = s;
      setActiva(true);
    } catch {
      setError('No pudimos abrir la cámara. Revise que el navegador tenga permiso para usarla y que ninguna otra app la esté usando.');
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
          <Button variant="outline" className="btn-sm" title="Borre esta foto y vuelva a abrir la cámara"
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
            <Button className="btn-sm" title="Tome la foto con lo que la cámara está viendo ahora"
              onClick={disparar}><I_Camera size={13} /> Sacar la foto</Button>
            <Button variant="ghost" className="btn-sm" title="Cierre la cámara sin tomar nada" onClick={apagar}>Cancelar</Button>
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
            <Button className="btn-sm" title="El navegador le pide permiso y se abre la cámara"
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
              <div className="bt">¿Está en un computador?</div>
              <div className="bs">Escanee el código con el celular y hágalo desde ahí: se abre esta misma pantalla y las fotos salen con la cámara del teléfono.</div>
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

  // =============================================================================================
  // LOS DOS BOTONES DE AYUDA — «No entiendo qué me piden» y «Hablar con una persona».
  //
  // Ninguno avisa algo que se va solo: los dos abren el panel de detalle con el estado REAL de
  // esta verificación. El primero dice qué foto falta —con el nombre que tiene en pantalla—, por
  // qué le la pedimos y qué queda apagado hasta que esté aprobada. El segundo dice por dónde y en
  // qué horario le contesta una persona del equipo, y qué conviene tener a mano antes de escribir.
  // =============================================================================================
  const detalle = useDetalle();

  /** El paso que falta completar: es lo primero que hay que decir cuando alguien no entiende. */
  const pendiente = PASOS.find(p => !pasoHecho(p));
  const totalFotos = PASOS.reduce((n, p) => n + p.capturas.length, 0);
  const capturadas = Object.keys(fotos).length;
  /** Qué falta para poder enviarla, con el nombre exacto que aparece en pantalla. */
  const loQueFalta = pendiente
    ? `Paso ${pendiente.id} · ${pendiente.nombre} — le falta tomar ${pendiente.capturas.filter(c => !fotos[c.k]).map(c => `«${c.lb}»`).join(' y ')}.`
    : 'Nada: las 4 fotos están completas y puede enviarla a revisión.';

  const explicarQuePiden = () => detalle({
    titulo: pendiente ? `Qué le pide el paso ${pendiente.id}: ${pendiente.nombre}` : 'Qué le pide cada paso, con el detalle',
    sub: 'No hay que entender de documentos ni subir ningún archivo: cada paso es una foto que saca con la cámara, en el momento, y ve al instante si quedó bien.',
    bloques: [
      { tipo: 'texto', texto: 'Dicho simple: Identidad es su documento, frente y dorso. Domicilio es un recibo de servicio o un extracto a su nombre, de los últimos 3 meses. Selfie es usted, en vivo. Son 3 pasos y 4 fotos, y se hacen una sola vez.' },
      { tipo: 'filas', items: PASOS.map(p => {
          const hecho = pasoHecho(p);
          const esElQueFalta = pendiente?.id === p.id;
          return {
            t: `Paso ${p.id} · ${p.nombre} · ${p.desc}`,
            s: `${p.pide} Con esto se desbloquea: ${p.desbloquea.toLowerCase()}.`,
            etiqueta: hecho ? 'ya está' : esElQueFalta ? 'le falta este' : 'viene después',
            tono: hecho ? 'green' as const : esElQueFalta ? 'amber' as const : 'muted' as const,
          };
        }) },
      { tipo: 'datos', filas: [
        { k: 'Lo que falta ahora', v: loQueFalta, tono: pendiente ? 'amber' as const : 'green' as const },
        { k: 'Fotos capturadas', v: `${capturadas} de ${totalFotos}`, s: 'las que ya tomó quedan guardadas, aunque cierre el panel' },
        { k: 'Cuánto tarda', v: '2 min', s: 'con el documento a mano. Si no lo tiene cerca, déjelo para cuando lo tenga: nada se pierde' },
        { k: 'Por qué se lo pedimos', v: FRENO_KYC?.valor ?? 'Obligatorio', s: FRENO_KYC?.porQue ?? 'Riesgo legal: no se publica a nombre de alguien sin verificar.' },
        { k: 'Qué sigue funcionando mientras tanto', v: 'Todo menos el dinero', s: 'el panel puntúa piezas, el motor vigila el mercado y Rumi contesta sus chats: eso no depende de la verificación' },
      ] },
      { tipo: 'aviso', tono: 'amber', texto: 'Si no la envía: publicar y mover presupuesto quedan apagados, porque no se publica a nombre de alguien sin verificar. El motor no se detiene por eso y no hay ningún plazo: lo único que falta es que usted la envíe.' },
      { tipo: 'pasos', items: [
        pendiente
          ? `Vaya al paso ${pendiente.id} y saque lo que falta: ${pendiente.capturas.filter(c => !fotos[c.k]).map(c => c.lb).join(' y ')}.`
          : 'Ya están las 4 fotos: envíela a revisión y se resuelve en menos de 24 h.',
        'Si la cámara no abre, escanee el código y hágalo desde el celular: se abre esta misma pantalla.',
        'Si el nombre no coincide, le decimos qué no coincidió, con el detalle exacto, y vuelve a tomar sólo esa foto.',
        'Puede cerrar y volver después: las fotos hechas quedan guardadas.',
      ] },
    ],
    fuente: `Sale del estado de su verificación (${capturadas} de ${totalFotos} fotos) y de los frenos de su plan: para publicar, la verificación es obligatoria.`,
    acciones: pendiente
      ? [
          { label: `Ir al paso ${pendiente.id}`, variante: 'primary' as const, onClick: () => { if (!pendiente) return; setPaso(pendiente.id); setToast(`Paso ${pendiente.id}: ${pendiente.nombre}`); } },
          { label: 'Cerrar', onClick: () => {} },
        ]
      : [
          { label: 'Enviar a revisión', variante: 'primary' as const, onClick: () => { setEnviada(true); setToast('Verificación enviada: la revisamos en menos de 24 h'); } },
          { label: 'Cerrar', onClick: () => {} },
        ],
  });

  const hablarConPersona = () => detalle({
    titulo: 'Hablar con una persona del equipo',
    sub: 'No hay un robot dando vueltas: usted escribe y alguien del equipo le contesta, con su verificación abierta en la pantalla.',
    bloques: [
      { tipo: 'datos', filas: [
        { k: 'Por dónde', v: 'WhatsApp', s: 'El mismo WhatsApp Business que ya tiene conectado: no hay un número nuevo que aprender ni un formulario que llenar.' },
        { k: 'Horario de atención', v: '8:00 a 22:00', s: `En su zona: ${perfil.zona}. Es la misma franja en la que el motor escribe solo.` },
        { k: 'Fuera de ese horario', v: 'el motor sigue', s: 'De 22:00 a 08:00 no hay gente del equipo, pero el motor no se detiene: sigue produciendo piezas y vigilando el mercado.' },
        { k: 'Quién le contesta', v: 'Una persona', s: 'La misma que mira las verificaciones cuando la revisión automática no cierra.' },
        { k: 'Cuándo le contesta', v: 'el mismo día', s: 'Y si le falta algo, se lo pedimos ese mismo día, con el detalle.' },
      ] },
      { tipo: 'texto', texto: 'Antes de escribir, tenga esto a mano: se resuelve en un solo mensaje.' },
      { tipo: 'pasos', items: [
        `El paso en el que está: ${paso} de 3 · ${actual.nombre}.`,
        loQueFalta,
        `El nombre completo, como figura en el documento${nombre ? ` (ya lo escribió: ${nombre})` : ': todavía no lo ha escrito, y hace falta en el paso 1'}.`,
        'Si algo se rechazó: el detalle exacto que le dimos, así no empezamos el diagnóstico de cero.',
        'Las fotos ya sacadas: quedan guardadas, no hay que volver a hacerlas mientras hablamos.',
      ] },
      { tipo: 'aviso', tono: 'green', texto: 'La persona ve su verificación mientras le responde: no le tiene que explicar de nuevo qué es cada documento ni mandar nada por otro lado.' },
    ],
    fuente: 'Sale de su verificación y de la conexión de WhatsApp Business que ya tiene activa.',
    acciones: [
      { label: 'Ver qué me falta exactamente', variante: 'primary' as const, onClick: explicarQuePiden },
      { label: 'Cerrar', onClick: () => {} },
    ],
  });

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
                Mientras tanto puede seguir usando todo lo que no toca dinero: el panel puntúa piezas,
                el motor vigila el mercado y Rumi contesta sus chats. <b>Publicar y mover presupuesto se
                desbloquea cuando esté aprobada.</b> Le avisamos por WhatsApp y por correo.
              </div>
            </div>
            <Badge tone="amber">en revisión</Badge>
          </div>
          <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <div className="dato"><span className="dato-l">Enviada</span><span className="dato-v">hoy 14:20</span></div>
            <div className="dato"><span className="dato-l">Fotos capturadas</span><span className="dato-v">4</span></div>
            <div className="dato"><span className="dato-l">Se puede rehacer</span><span className="dato-v" style={{ color: 'var(--green)' }}>sí, cuando quiera</span></div>
          </div>
          <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
            <Button variant="outline" className="btn-sm" title="Vuelva a empezar la verificación si algo salió mal"
              onClick={() => { setEnviada(false); setPaso(1); setToast('Puede rehacer la verificación'); }}>Rehacerla</Button>
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
                <input className="input" placeholder="María Paula" value={nombre} onChange={e => setNombre(e.target.value)} />
              </div>
            )}

            {paso === 2 && (
              <div>
                <label className="label">Dirección que figura en el comprobante</label>
                <input className="input" placeholder="Carrera 43A # 1-50, El Poblado, Medellín" value={domicilio} onChange={e => setDomicilio(e.target.value)} />
              </div>
            )}

            {paso === 3 && (
              <div className="alarm" style={{ borderLeft: '3px solid var(--purple2)', background: 'rgba(168,85,247,.05)' }}>
                <div className="alarm-head"><span className="alarm-sev oportunidad">ANTES DE TOMAR LA FOTO</span></div>
                <div className="alarm-sug">
                  <b>Buena luz, sin gorra ni gafas.</b> La foto se compara con la del documento:
                  si no coincide, se rechaza. Se hace una sola vez.
                </div>
              </div>
            )}

            <div className="row" style={{ gap: 9, flexWrap: 'wrap', alignItems: 'center' }}>
              <Button variant="ghost" className="btn-sm" disabled={paso === 1}
                title={paso === 1 ? 'Está en el primer paso' : 'Vuelve al paso anterior: no se pierde ninguna foto'}
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
              Puede cerrar esto y volver después: <b>las fotos quedan guardadas</b>. Nada de lo que tome aquí
              se publica ni se usa para nada más que verificar quién es.
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
                  <span className="guard-lb">Publicar en sus redes<small>Anuncios, posts e historias salen con su cuenta</small></span></div>
                <div className="guard"><span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Credit size={14} /></span>
                  <span className="guard-lb">El motor puede mover presupuesto<small>Dentro de los frenos que ya tiene puestos</small></span></div>
                <div className="guard"><span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Globe size={14} /></span>
                  <span className="guard-lb">Cobrar y facturar<small>Su plan y sus recargas con factura a su nombre</small></span></div>
              </div>
            </div>
            <div>
              <div className="bs" style={{ marginBottom: 9 }}>Cuánto tarda todo esto:</div>
              <div className="guards">
                <div className="guard"><span style={{ color: 'var(--purple3)', flexShrink: 0 }}><I_Camera size={14} /></span>
                  <span className="guard-lb">Tomar las 4 fotos<small>Son 2 minutos si tiene el documento a mano</small></span>
                  <span className="guard-val">2 min</span></div>
                <div className="guard"><span style={{ color: 'var(--purple3)', flexShrink: 0 }}><I_Eye size={14} /></span>
                  <span className="guard-lb">La revisión<small>Es automática; si algo no cierra, lo mira una persona</small></span>
                  <span className="guard-val">&lt; 24 h</span></div>
                <div className="guard"><span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Check size={14} /></span>
                  <span className="guard-lb">Si le falta algo<small>Se lo pedimos ese mismo día, con el detalle</small></span>
                  <span className="guard-val">el mismo día</span></div>
              </div>
            </div>
            <div className="acc-why">
              Todo se captura <b>con la cámara en el momento</b>: no se puede subir una foto guardada, ni de su
              galería, ni de otra persona. Es lo que hace que la verificación valga.
            </div>
          </Card>
        </div>
      )}

      {/* ============ QUÉ HACEMOS CON SUS DATOS ============ */}
      <div className="duo" style={{ marginTop: 16 }}>
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Lock size={14} style={{ color: 'var(--purple3)' }} /> Qué pasa con sus fotos</span>}
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
            Se lo pedimos <b>una sola vez</b> y queda para siempre. Si cambia algo de sus datos,
            se vuelve a pedir sólo la foto de lo que cambió.
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Sun size={14} style={{ color: 'var(--amber)' }} /> Si la cámara no abre o algo no coincide</span>}
          action={<Badge tone="muted">por si acaso</Badge>}
        >
          <div className="bs">
            Son los problemas reales de una verificación. Así se resuelven y así se corrigen:
          </div>
          <div className="guards">
            <div className="guard"><span style={{ color: 'var(--amber)', flexShrink: 0 }}><span style={{ fontWeight: 900, fontSize: 13 }}>1</span></span>
              <span className="guard-lb">La cámara no abre<small>Se hace desde el celular con el código: no hay forma de subir una foto aunque quiera.</small></span></div>
            <div className="guard"><span style={{ color: 'var(--amber)', flexShrink: 0 }}><span style={{ fontWeight: 900, fontSize: 13 }}>2</span></span>
              <span className="guard-lb">El nombre no coincide<small>Le decimos qué no coincidió, con el detalle exacto y no un "rechazado" a secas.</small></span></div>
            <div className="guard"><span style={{ color: 'var(--amber)', flexShrink: 0 }}><span style={{ fontWeight: 900, fontSize: 13 }}>3</span></span>
              <span className="guard-lb">Vuelve a tomar sólo esa foto<small>No hay que rehacer los 3 pasos. Las correcciones pasan adelante.</small></span></div>
          </div>
          <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
            <Button variant="ghost" className="btn-sm"
              title="Le muestra, paso por paso, qué foto le falta ahora, por qué se la pedimos y qué queda apagado hasta que la verificación esté aprobada"
              onClick={explicarQuePiden}>No entiendo qué me piden</Button>
            <Button variant="ghost" className="btn-sm"
              title="Le muestra por dónde y en qué horario le contesta una persona del equipo, y qué conviene tener a mano antes de escribir"
              onClick={hablarConPersona}>Hablar con una persona</Button>
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

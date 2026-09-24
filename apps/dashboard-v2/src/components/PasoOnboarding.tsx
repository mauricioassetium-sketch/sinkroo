import { useState } from 'react';
import { Badge, Button } from '../components/ui';
import {
  I_Check, I_Upload, I_Image, I_Film, I_File, I_Shield, I_Rocket, I_ArrowRight,
} from '../components/icons';
import { MATERIAL, type CampoPublicacion } from '../data/publicaciones';
import { CARPETA } from '../data/demo';
import { useOnboarding } from '../lib/onboarding';
import { usePlan } from '../lib/plan';
import {
  CONEXIONES_ONB, PRIMERA_SEMANA, COSTO_PRIMERA_SEMANA, type CampoOnb, type PasoOnb,
} from '../data/onboarding';

// =============================================================================================
// LOS CONTROLES DE UN PASO — un solo lugar para los dos lados del onboarding.
//
// El mismo paso se llena en dos lugares: en el asistente que aparece al entrar y en «Primeros
// pasos» dentro del panel. Si cada uno tuviera su versión del mismo control, cualquier cambio se
// haría dos veces y una quedaría vieja. Acá viven los campos, el bloque de conexiones y el arranque.
// =============================================================================================

const IconoMaterial = ({ tipo }: { tipo: CampoPublicacion['tipo'] }) =>
  tipo === 'videos' ? <I_Film size={16} /> : tipo === 'archivos' ? <I_File size={16} /> : <I_Image size={16} />;

/** Los campos del paso, según su tipo. Se dibujan desde la data: agregar un dato es una línea. */
export function CamposPaso({ paso }: { paso: PasoOnb }) {
  const onb = useOnboarding();
  const [pegado, setPegado] = useState('');

  const elegir = (campo: CampoOnb, op: string) => {
    const actual = onb.datos[campo.id];
    if (campo.tipo === 'chips-multi') {
      const lista = (actual as string[] | undefined) || [];
      onb.escribir(campo.id, lista.includes(op) ? lista.filter(x => x !== op) : [...lista, op]);
    } else {
      onb.escribir(campo.id, actual === op ? '' : op);
    }
  };

  const control = (campo: CampoOnb) => {
    const v = onb.datos[campo.id];

    if (campo.tipo === 'texto' || campo.tipo === 'numero') {
      return (
        <input className="input" style={campo.ancho ? { maxWidth: campo.ancho } : undefined}
          placeholder={campo.ayuda} value={(v as string) || ''}
          onChange={e => onb.escribir(campo.id, e.target.value)}
          onPaste={e => {
            const txt = e.clipboardData?.getData('text') || '';
            // Pegar un link en el panel de Sinkroo significa una sola cosa: que lo lea.
            if (/^https?:\/\//.test(txt.trim())) { setPegado(txt.trim()); }
          }} />
      );
    }

    if (campo.tipo === 'chips' || campo.tipo === 'chips-multi') {
      const lista = campo.tipo === 'chips-multi' ? ((v as string[]) || []) : [];
      const activo = (op: string) => (campo.tipo === 'chips-multi' ? lista.includes(op) : v === op);
      const marcadas = campo.tipo === 'chips-multi' ? lista : (v ? [v as string] : []);
      return (
        <div className="onb-chips">
          {(campo.opciones || []).map(op => (
            <button key={op} type="button" className={`tipo-chip ${activo(op) ? 'sel' : ''}`}
              title={campo.detalle?.[op] || `${op}: elegilo para que el motor trabaje con eso`}
              onClick={() => elegir(campo, op)}>
              {activo(op) ? '✓ ' : ''}{op}
            </button>
          ))}
          {marcadas.map(op => (
            <div key={op} className="tiny onb-elegido">
              <I_Check size={11} /> <b>{op}</b>{campo.detalle?.[op] ? ` — ${campo.detalle[op]}` : ''}
            </div>
          ))}
        </div>
      );
    }

    if (campo.tipo === 'material') {
      return (
        <div className="onb-mat">
          {MATERIAL.map(m => {
            const carpeta = CARPETA[m.id] || [];
            const puestos = onb.material[m.id] || [];
            const subidos = puestos.filter(p => !carpeta.some(c => c.nombre === p));
            return (
              <div key={m.id} className="onb-mat-fila">
                <div className="onb-mat-lb">
                  <span className="onb-mat-ic"><IconoMaterial tipo={m.tipo} /></span>
                  <span style={{ minWidth: 0 }}>
                    <b>{m.etiqueta.replace(/^\S+\s/, '')}</b>
                    <small>{puestos.length ? `${puestos.length} elegido${puestos.length > 1 ? 's' : ''}` : m.ayuda}</small>
                  </span>
                  <label className="onb-mat-up" title={`Subir algo nuevo a «${m.etiqueta.replace(/^\S+\s/, '')}»: queda en tu carpeta`}>
                    <I_Upload size={13} />
                    <input type="file" multiple style={{ display: 'none' }}
                      onChange={e => Array.from(e.target.files || []).forEach(f => onb.alternarMaterial(m.id, f.name))} />
                  </label>
                </div>
                <div className="onb-mat-chips">
                  {carpeta.map(c => {
                    const puesto = puestos.includes(c.nombre);
                    return (
                      <button key={c.nombre} type="button" className={`tipo-chip onb-chip-arch ${puesto ? 'sel' : ''}`}
                        title={puesto ? `Ya está elegido (${c.peso}). Tocá para sacarlo.` : `Sumar «${c.nombre}» (${c.peso}) sin volver a subirlo.`}
                        onClick={() => onb.alternarMaterial(m.id, c.nombre)}>
                        {puesto ? '✓ ' : ''}{c.nombre}
                      </button>
                    );
                  })}
                  {subidos.map(nombre => (
                    <button key={nombre} type="button" className="tipo-chip onb-chip-arch sel"
                      title="Lo subiste recién: queda en tu carpeta para la próxima campaña."
                      onClick={() => onb.alternarMaterial(m.id, nombre)}>✓ {nombre}</button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="onb-campos">
      {paso.campos.map(c => (
        <div key={c.id} className="onb-campo">
          <label className="label">{c.etiqueta}</label>
          {control(c)}
        </div>
      ))}
      {pegado && (
        <div className="tiny muted">Pegaste un link: el motor lo lee solo y no hace falta que lo escribas.</div>
      )}
    </div>
  );
}

/** Las cuentas y la verificación: es el paso 5, y se usa igual en los dos lados. */
export function BloqueConexiones() {
  const onb = useOnboarding();
  const conectadas = (onb.datos['conectadas'] as string[] | undefined) || [];

  const alternar = (key: string) => {
    const c = CONEXIONES_ONB.find(x => x.key === key)!;
    const nuevas = conectadas.includes(key) ? conectadas.filter(k => k !== key) : [...conectadas, key];
    onb.escribir('conectadas', nuevas);
    onb.avisar(nuevas.includes(key) ? `${c.nombre} conectada: ${c.detalle}` : `${c.nombre} desconectada: el motor ya no publica ahí`);
  };

  return (
    <div className="onb-conexiones">
      {CONEXIONES_ONB.map(c => {
        const activo = conectadas.includes(c.key);
        return (
          <div key={c.key} className="guard">
            <span style={{ fontSize: 17, flexShrink: 0 }}>{c.icono}</span>
            <span className="guard-lb">{c.nombre}
              <small>{activo && c.habilitadoHoy ? `${c.detalle} Ya estaba conectada cuando entraste: si la dejás, el motor sigue publicando ahí.` : c.detalle}</small>
            </span>
            <Badge tone={activo ? 'green' : 'muted'}>{activo ? 'conectada' : 'sin conectar'}</Badge>
            <Button variant={activo ? 'outline' : 'ghost'} className="btn-sm"
              title={activo ? `Desconecta ${c.nombre}: el motor deja de publicar ahí al instante. Reversible desde acá mismo.` : `Conecta ${c.nombre}: ${c.detalle}`}
              onClick={() => alternar(c.key)}>
              {activo ? 'Desconectar' : 'Conectar'}
            </Button>
          </div>
        );
      })}
    </div>
  );
}

/** El arranque: el botón, la línea de estado y el plan de la primera semana. */
export function BloqueArranque({ enAsistente, alCerrar }: { enAsistente?: boolean; alCerrar?: () => void }) {
  const onb = useOnboarding();
  const { plan } = usePlan();
  const creador = onb.tipo === 'creador';
  const listo = creador ? onb.publicado : onb.arrancado;

  // El creador no arranca campañas: publica su perfil para que las marcas lo encuentren.
  if (creador && listo) {
    return (
      <>
        <div className="onb-arrancado">
          <I_Check size={15} />
          <span><b>Tu perfil está visible para las marcas.</b> Lo ven las marcas que están publicando en Sinkroo,
            filtradas por rubro, idioma y formato. Cuando les sirvas, te escriben: <b>el trabajo lo decidís vos</b>.</span>
        </div>
        <div className="onb-semana">
          {[
            { t: 'Qué ven de vos', s: 'tus muestras, los rubros para los que grabás, tu audiencia, tus idiomas y tu precio por pieza.' },
            { t: 'Cómo te contactan', s: 'por el mismo canal que ya tenés conectado: el mensaje llega a Conversaciones con el pedido concreto.' },
            { t: 'Cuándo se cobra', s: 'lo acuerdan con la marca. Sinkroo no intermedia el pago ni cobra comisión por pieza.' },
            { t: 'Qué podés cambiar', s: 'el precio, los plazos y la disponibilidad, en cualquier momento desde Primeros pasos.' },
          ].map(d => (
            <div key={d.t} className="onb-dia" style={{ gridTemplateColumns: '150px minmax(0,1fr)' }}>
              <span className="onb-dia-n">{d.t}</span>
              <span className="onb-dia-que">{d.s}</span>
            </div>
          ))}
        </div>
        {enAsistente && (
          <div className="row" style={{ gap: 9, marginTop: 14, flexWrap: 'wrap' }}>
            <Button className="btn-sm" title="Cierra el asistente y te deja en el panel, con tu perfil ya publicado"
              onClick={alCerrar}><I_ArrowRight size={13} /> Ir a mi panel</Button>
          </div>
        )}
      </>
    );
  }

  if (onb.arrancado) {
    return (
      <>
        <div className="onb-arrancado">
          <I_Rocket size={15} />
          <span><b>El motor está trabajando.</b> Arrancó por el mercado: en unas horas vas a ver el primer informe
            y las piezas de la semana. Nada de esto gasta plata hasta que la pieza pasa el panel.</span>
        </div>
        <div className="onb-semana">
          {PRIMERA_SEMANA.map(d => (
            <div key={d.dia} className="onb-dia">
              <span className="onb-dia-n">{d.dia}</span>
              <span className="onb-dia-quien">{d.quien}</span>
              <span className="onb-dia-que">{d.que}</span>
              <span className="onb-dia-cr">{d.creditos}</span>
            </div>
          ))}
          <div className="onb-dia-total">
            <span>Total de la primera semana</span>
            <span><b>{COSTO_PRIMERA_SEMANA} créditos</b> de los {plan.creditosMes.toLocaleString('es-AR')} del plan {plan.nombre} · publicar es aparte</span>
          </div>
        </div>
        {enAsistente && (
          <div className="row" style={{ gap: 9, marginTop: 14, flexWrap: 'wrap' }}>
            <Button className="btn-sm" title="Cierra el asistente y te deja en el panel, con el motor ya trabajando"
              onClick={alCerrar}><I_ArrowRight size={13} /> Ir a mi panel</Button>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="row" style={{ gap: 9, marginTop: 14, flexWrap: 'wrap' }}>
      <Button className="btn-sm"
        title={creador
          ? 'Publica tu perfil en el mercado de creadores: las marcas te ven por lo que hacés y te contactan. No publica nada en tus redes.'
          : `Arranca el motor ahora: investiga tu mercado y prepara las piezas de la semana. Cuesta ${COSTO_PRIMERA_SEMANA} créditos y no gasta plata hasta que las piezas pasan el panel.`}
        onClick={() => {
          if (creador) { onb.publicar(); onb.marcar(5); onb.avisar('Tu perfil quedó publicado: las marcas te van a poder encontrar'); }
          else { onb.arrancar(); onb.marcar(5); onb.avisar('El motor arrancó: empieza por el mercado, no gasta nada hasta publicar'); }
        }}>
        {creador ? <><I_Check size={13} /> Publicar mi perfil</> : <><I_Rocket size={13} /> Arrancar el motor</>}
      </Button>
      {!enAsistente && (
        <Button variant="ghost" className="btn-sm" title="Guarda lo que pusiste y te deja seguir después desde Hoy"
          onClick={() => { onb.desmarcar(5); onb.avisar('Guardado: seguís cuando quieras desde Hoy'); }}>
          Dejarlo para después
        </Button>
      )}
    </div>
  );
}

/** El aviso de la verificación: es legal, va aparte y no se resuelve acá. */
export function AvisoVerificacion({ ir }: { ir: () => void }) {
  return (
    <div className="onb-infiere" style={{ borderColor: 'rgba(245,158,11,.32)' }}>
      <span className="onb-infiere-ic" style={{ color: 'var(--amber)' }}><I_Shield size={13} /></span>
      <span><b>Falta la verificación de identidad: </b>es obligatoria para publicar y se resuelve en
        {' '}<button className="onb-link" title="Abre Verificación, donde se suben los documentos"
          onClick={ir}>Verificación</button>.
        Hasta que esté, el motor prepara todo y no publica nada.</span>
    </div>
  );
}

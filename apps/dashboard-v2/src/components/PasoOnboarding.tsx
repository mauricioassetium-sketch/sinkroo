import { useState } from 'react';
import { Badge, Button } from '../components/ui';
import {
  I_Check, I_Upload, I_Image, I_Film, I_File, I_Shield, I_Rocket, I_ArrowRight, I_X,
} from '../components/icons';
import { useOnboarding } from '../lib/onboarding';
import { usePlan } from '../lib/plan';
import {
  CONEXIONES_ONB, PRIMERA_SEMANA, COSTO_PRIMERA_SEMANA, TIPOS_ARCHIVO, ARCHIVOS_ACEPTADOS,
  type CampoOnb, type PasoOnb,
} from '../data/onboarding';

// =============================================================================================
// LOS CONTROLES DE UN PASO — un solo lugar para los dos lados del onboarding.
//
// El mismo paso se llena en dos lugares: en el asistente que aparece al entrar y en «Primeros
// pasos» dentro del panel. Si cada uno tuviera su versión del mismo control, cualquier cambio se
// haría dos veces y una quedaría vieja. Acá viven los campos, el bloque de conexiones y el arranque.
// =============================================================================================

/** El ícono de un archivo subido: por el tipo que el motor le va a dar, no por el nombre. */
const IconoArchivo = ({ tipo }: { tipo: 'doc' | 'imagen' | 'video' | 'audio' | 'otro' }) =>
  tipo === 'imagen' ? <I_Image size={16} /> : tipo === 'video' ? <I_Film size={16} />
    : tipo === 'audio' ? <I_Film size={16} /> : <I_File size={16} />;

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

    if (campo.tipo === 'texto-largo') {
      const largo = ((v as string) || '').length;
      return (
        <>
          <textarea className="input" rows={largo > 260 ? 8 : 5} placeholder={campo.ayuda}
            value={(v as string) || ''}
            onChange={e => onb.escribir(campo.id, e.target.value)} />
          <div className="tiny muted">
            {largo === 0
              ? 'Podés escribirlo como te salga: el motor ordena el resto.'
              : `${largo} caracteres escritos · el motor lo lee y te devuelve qué entendió antes de escribir nada.`}
          </div>
        </>
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

    if (campo.tipo === 'docs') {
      const arrastrando = onb.archivos.length > 0;
      return (
        <div className="onb-docs">
          <label className="onb-drop"
            title="Soltá tus archivos acá: PDF, Word, Excel, PowerPoint, fotos, videos o audios. El motor lee el texto de los documentos y usa las imágenes y los videos en las piezas.">
            <span className="onb-drop-ic"><I_Upload size={22} /></span>
            <span className="onb-drop-t">Soltá tus archivos acá</span>
            <span className="onb-drop-s">o tocá para elegirlos · todos los formatos</span>
            <input type="file" multiple accept={ARCHIVOS_ACEPTADOS} style={{ display: 'none' }}
              onChange={e => { const n = onb.subirArchivos(e.target.files); if (n) onb.avisar(`${n} archivo${n > 1 ? 's' : ''} subido${n > 1 ? 's' : ''}: el motor los lee`); }} />
          </label>

          {onb.archivos.length > 0 && (
            <div className="onb-archivos">
              {onb.archivos.map(a => (
                <div key={a.nombre} className="onb-arch">
                  <span className="onb-arch-ic"><IconoArchivo tipo={a.tipo} /></span>
                  <span className="onb-arch-n" title={a.nombre}>{a.nombre}</span>
                  <span className="onb-arch-p">{a.peso}</span>
                  <button className="onb-arch-x" title="Sacar este archivo de la ingesta"
                    onClick={() => { onb.quitarArchivo(a.nombre); onb.avisar('Archivo sacado de la ingesta'); }}><I_X size={12} /></button>
                </div>
              ))}
            </div>
          )}

          {/* Qué hace el motor con cada formato: sin esto, subir un PDF sería una apuesta. */}
          <div className="onb-tipos">
            <div className="onb-tipos-t">Qué hace el motor con lo que subas</div>
            {TIPOS_ARCHIVO.map(x => (
              <div key={x.para} className="onb-tipo-fila">
                <span className="onb-tipo-para">{x.para}</span>
                <span className="onb-tipo-lect">{x.lectura}</span>
              </div>
            ))}
          </div>
          {arrastrando && (
            <div className="tiny onb-ok">
              <I_Check size={12} /> {onb.archivos.length} archivo{onb.archivos.length > 1 ? 's' : ''} en la ingesta. Podés seguir sumando o pasar al paso siguiente.
            </div>
          )}
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
        title={`Arranca el motor ahora: investiga tu mercado y prepara las piezas de la semana. Cuesta ${COSTO_PRIMERA_SEMANA} créditos y no gasta plata hasta que las piezas pasan el panel.`}
        onClick={() => { onb.arrancar(); onb.marcar(5); onb.avisar('El motor arrancó: empieza por el mercado, no gasta nada hasta publicar'); }}>
        <I_Rocket size={13} /> Arrancar el motor
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

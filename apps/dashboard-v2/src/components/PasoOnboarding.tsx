import { useState } from 'react';
import { Badge, Button } from '../components/ui';
import {
  I_Check, I_Upload, I_Image, I_Film, I_File, I_Shield, I_Rocket, I_ArrowRight, I_X, I_Link, I_Plus,
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
// haría dos veces y una quedaría vieja. Aquí viven los campos, el bloque de conexiones y el arranque.
// =============================================================================================

/** El ícono de un archivo subido: por el tipo que el motor le va a dar, no por el nombre. */
const IconoArchivo = ({ tipo }: { tipo: 'doc' | 'imagen' | 'video' | 'audio' | 'otro' }) =>
  tipo === 'imagen' ? <I_Image size={16} /> : tipo === 'video' ? <I_Film size={16} />
    : tipo === 'audio' ? <I_Film size={16} /> : <I_File size={16} />;

/** Los campos del paso, según su tipo. Se dibujan desde la data: agregar un dato es una línea. */
export function CamposPaso({ paso }: { paso: PasoOnb }) {
  const onb = useOnboarding();
  const [pegado, setPegado] = useState('');
  // Lo que se está escribiendo en cada campo de enlaces, antes de agregarlo a la lista.
  const [texto, setTexto] = useState<Record<string, string>>({});

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
        <input className="input" style={campo.ancho && !campo.fila ? { maxWidth: campo.ancho } : undefined}
          placeholder={campo.tipo === 'numero' ? '$' : 'Escriba aquí'} value={(v as string) || ''}
          onChange={e => onb.escribir(campo.id, e.target.value)}
          onPaste={e => {
            const txt = e.clipboardData?.getData('text') || '';
            // Pegar un enlace en el panel de Sinkroo significa una sola cosa: que lo lea.
            if (/^https?:\/\//.test(txt.trim())) { setPegado(txt.trim()); }
          }} />
      );
    }

    if (campo.tipo === 'texto-largo') {
      const largo = ((v as string) || '').length;
      return (
        <>
          <textarea className="input" rows={largo > 260 ? 5 : 2} placeholder="Escriba aquí, con sus palabras"
            value={(v as string) || ''}
            onChange={e => onb.escribir(campo.id, e.target.value)} />
          {/* Sin texto no se dice nada: la ayuda del campo ya explica qué escribir. Con texto, se
              muestra cuánto lleva, que es lo único que le falta saber. */}
          {largo > 0 && (
            <div className="tiny muted">
              {largo} caracteres escritos · el motor lo lee y le devuelve qué entendió antes de escribir nada.
            </div>
          )}
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
              title={campo.detalle?.[op] || `${op}: elíjalo para que el motor trabaje con eso`}
              onClick={() => elegir(campo, op)}>
              {activo(op) ? '✓ ' : ''}{op}
            </button>
          ))}
          {marcadas.filter(op => campo.detalle?.[op]).map(op => (
            <div key={op} className="tiny onb-elegido">
              <I_Check size={11} /> <b>{op}</b> — {campo.detalle?.[op]}
            </div>
          ))}
        </div>
      );
    }

    if (campo.tipo === 'links') {
      const lista = ((v as string[]) || []);
      const borrador = texto[campo.id] || '';
      const agregar = () => {
        const t = borrador.trim();
        if (!t) { onb.avisar('Pegue el enlace antes de agregarlo'); return; }
        onb.escribir(campo.id, [...lista, t]);
        setTexto(s => ({ ...s, [campo.id]: '' }));
        onb.avisar(`Enlace agregado (${lista.length + 1}): el motor lo lee`);
      };
      return (
        <div className="onb-links">
          {lista.length > 0 && (
            <div className="onb-links-lista">
              {lista.map((l, i) => (
                <div key={l + i} className="onb-link">
                  <I_Link size={13} />
                  <span className="onb-link-t" title={l}>{l}</span>
                  <button type="button" className="onb-arch-x" title="Sacar este enlace de la lista"
                    onClick={() => { onb.escribir(campo.id, lista.filter((_, j) => j !== i)); onb.avisar('Enlace sacado'); }}>
                    <I_X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="onb-links-in">
            <input className="input" value={borrador}
              placeholder={lista.length ? 'Pegue otro enlace' : 'Pegue el primero (Instagram, web, ficha…)'}
              onChange={e => setTexto(s => ({ ...s, [campo.id]: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); agregar(); } }} />
            <Button variant="outline" className="btn-sm" title="Suma este enlace a la lista: puede cargar todos los que tenga"
              onClick={agregar}><I_Plus size={13} /> Agregar</Button>
          </div>
          <div className="tiny muted">
            {lista.length === 0
              ? 'Puede cargar varias: Instagram, web, Facebook, TikTok, la ficha de Google.'
              : `${lista.length} enlace${lista.length > 1 ? 's' : ''} cargado${lista.length > 1 ? 's' : ''} · puede sumar todos los que tenga.`}
          </div>
        </div>
      );
    }

    if (campo.tipo === 'docs') {
      const arrastrando = onb.archivos.length > 0;
      return (
        <div className="onb-docs">
          <label className="onb-drop"
            title="Suelte sus archivos aquí: PDF, Word, Excel, PowerPoint, fotos, videos o audios. El motor lee el texto de los documentos y usa las imágenes y los videos en las piezas.">
            <span className="onb-drop-ic"><I_Upload size={22} /></span>
            <span className="onb-drop-t">Suelte sus archivos aquí</span>
            <span className="onb-drop-s">o toque para elegirlos · todos los formatos</span>
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
            <div className="onb-tipos-t">Qué hace el motor con lo que suba</div>
            {TIPOS_ARCHIVO.map(x => (
              <div key={x.para} className="onb-tipo-fila">
                <span className="onb-tipo-para">{x.para}</span>
                <span className="onb-tipo-lect">{x.lectura}</span>
              </div>
            ))}
          </div>
          {arrastrando && (
            <div className="tiny onb-ok">
              <I_Check size={12} /> {onb.archivos.length} archivo{onb.archivos.length > 1 ? 's' : ''} en la ingesta. Puede seguir sumando o pasar al paso siguiente.
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  /**
   * Dibuja un campo con su nombre, su ayuda y su control.
   * La ayuda va a la vista y no en el placeholder: en el teléfono el placeholder desaparece al primer
   * toque, y es justo lo que hay que leer cuando el motor todavía no sabe nada del negocio.
   */
  const campo = (c: CampoOnb) => (
    <div key={c.id} className="onb-campo">
      <div className="onb-campo-head">
        <label className="label">{c.etiqueta}</label>
        {/* La ayuda corta va al lado del nombre; la larga, en su propio renglón: al lado se cortaba y
            no se alcanzaba a leer. */}
        {c.ayuda && c.ayuda.length <= 44 && c.tipo !== 'docs' && c.tipo !== 'material' && (
          <span className="onb-ayuda-inline">{c.ayuda}</span>
        )}
      </div>
      {c.ayuda && c.ayuda.length > 44 && c.tipo !== 'docs' && c.tipo !== 'material' && (
        <div className="onb-ayuda">{c.ayuda}</div>
      )}
      {control(c)}
    </div>
  );

  // Los campos que comparten `fila` van en la misma línea: el producto y su precio se leen juntos y el
  // precio deja de quedar como una cajita suelta al final de una línea larga.
  const filas: CampoOnb[][] = [];
  paso.campos.forEach(c => {
    const ult = filas[filas.length - 1];
    if (c.fila && ult && ult[0].fila === c.fila) ult.push(c);
    else filas.push([c]);
  });

  // Los grupos de opciones van de a dos por fila: se elige más rápido y la pantalla entra sin
  // desplazarse. Se separan en tandas para no mezclar dos preguntas distintas en la misma línea.
  const filasFinales: ({ tipo: 'fila'; campos: CampoOnb[] } | { tipo: 'opciones'; campos: CampoOnb[] } | { tipo: 'suelto'; campos: CampoOnb[] })[] = [];
  const esOpciones = (c: CampoOnb) => (c.tipo === 'chips' || c.tipo === 'chips-multi') && !c.fila;
  filas.forEach(f => {
    if (f.length > 1) { filasFinales.push({ tipo: 'fila', campos: f }); return; }
    const c = f[0];
    const ult = filasFinales[filasFinales.length - 1];
    if (esOpciones(c) && ult && ult.tipo === 'opciones' && ult.campos.length < 2) ult.campos.push(c);
    else filasFinales.push({ tipo: esOpciones(c) ? 'opciones' : 'suelto', campos: [c] });
  });

  return (
    <div className="onb-campos">
      {filasFinales.map(g => g.tipo === 'fila'
        ? <div key={g.campos[0].id} className="onb-fila">{g.campos.map(campo)}</div>
        : g.tipo === 'opciones'
          ? <div key={g.campos[0].id} className={`onb-opciones ${g.campos.length > 1 ? 'dos' : ''}`}>{g.campos.map(campo)}</div>
          : campo(g.campos[0]))}
      {pegado && (
        <div className="tiny muted">Pegó un enlace: el motor lo lee solo y no hace falta que lo escriba.</div>
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
              <small>{activo && c.habilitadoHoy ? `${c.detalle} Ya estaba conectada cuando entró: si la deja, el motor sigue publicando ahí.` : c.detalle}</small>
            </span>
            <Badge tone={activo ? 'green' : 'muted'}>{activo ? 'conectada' : 'sin conectar'}</Badge>
            <Button variant={activo ? 'outline' : 'ghost'} className="btn-sm"
              title={activo ? `Desconecta ${c.nombre}: el motor deja de publicar ahí al instante. Reversible desde aquí mismo.` : `Conecta ${c.nombre}: ${c.detalle}`}
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
          <span><b>El motor está trabajando.</b> Arrancó por el mercado: en unas horas va a ver el primer informe
            y las piezas de la semana. Nada de esto gasta dinero hasta que la pieza pasa el panel.</span>
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
            <span><b>{COSTO_PRIMERA_SEMANA} créditos</b> de los {plan.creditosMes.toLocaleString('es-CO')} del plan {plan.nombre} · publicar es aparte</span>
          </div>
        </div>
        {enAsistente && (
          <div className="row" style={{ gap: 9, marginTop: 14, flexWrap: 'wrap' }}>
            <Button className="btn-sm" title="Cierra el asistente y le deja en el panel, con el motor ya trabajando"
              onClick={alCerrar}><I_ArrowRight size={13} /> Ir a mi panel</Button>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="row" style={{ gap: 9, marginTop: 14, flexWrap: 'wrap' }}>
      <Button className="btn-sm"
        title={`Arranca el motor ahora: investiga su mercado y prepara las piezas de la semana. Cuesta ${COSTO_PRIMERA_SEMANA} créditos y no gasta dinero hasta que las piezas pasan el panel.`}
        onClick={() => { onb.arrancar(); onb.marcar(5); onb.avisar('El motor arrancó: empieza por el mercado, no gasta nada hasta publicar'); }}>
        <I_Rocket size={13} /> Arrancar el motor
      </Button>
      {!enAsistente && (
        <Button variant="ghost" className="btn-sm" title="Guarda lo que puso y le deja seguir después desde Hoy"
          onClick={() => { onb.desmarcar(5); onb.avisar('Guardado: sigue cuando quiera desde Hoy'); }}>
          Dejarlo para después
        </Button>
      )}
    </div>
  );
}

/** El aviso de la verificación: es legal, va aparte y no se resuelve aquí. */
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

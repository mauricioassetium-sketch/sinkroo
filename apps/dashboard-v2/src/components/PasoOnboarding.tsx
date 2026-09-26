import { useState } from 'react';
import { Badge, Button } from '../components/ui';
import { EstadoVacio } from '../components/EstadoVacio';
import {
  I_Check, I_Upload, I_Image, I_Film, I_File, I_Shield, I_ArrowRight, I_X, I_Link, I_Plus, I_Play, I_Zap, I_Lock,
} from '../components/icons';
import { useOnboarding } from '../lib/onboarding';
import { usePlan } from '../lib/plan';
import { useDatos, type IntegracionRed } from '../api/datos';
import { baseApi, recordarRed, token } from '../api/cliente';
import {
  CONEXIONES_ONB, CONEXIONES_BACK, ARRANQUE, COSTO_ARRANQUE, TIPOS_ARCHIVO, ARCHIVOS_ACEPTADOS,
  ARCHIVOS_ACEPTADOS_BACK, MAX_ARCHIVO_MB,
  type CampoOnb, type ConexionOnb, type PasoOnb,
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
      // Con el servidor encendido, esta lista ES la del servidor (se lee al abrir el panel y se
      // refresca al subir o al borrar). Sin servidor, los archivos sólo viven en esta visita y la
      // pantalla lo dice: no se puede afirmar que quedaron guardados en ninguna parte.
      const hay = onb.conBack;
      const subiendo = onb.subiendo;
      const n = onb.archivos.length;
      return (
        <div className="onb-docs">
          <label className="onb-drop"
            title={hay
              ? `Elija o suelte sus archivos: documentos, fotos, videos o audios, hasta ${MAX_ARCHIVO_MB} MB cada uno. Quedan en su carpeta del servidor y el motor los lee. Se pueden sacar y volver a subir cuando quiera.`
              : 'Suelte sus archivos aquí: PDF, Word, Excel, PowerPoint, fotos, videos o audios. El motor lee el texto de los documentos y usa las imágenes y los videos en las piezas.'}>
            <span className="onb-drop-ic"><I_Upload size={22} /></span>
            <span className="onb-drop-t">{subiendo ? 'Subiendo sus archivos…' : 'Suelte sus archivos aquí'}</span>
            <span className="onb-drop-s">{hay
              ? `o toque para elegirlos · hasta ${MAX_ARCHIVO_MB} MB cada uno`
              : 'o toque para elegirlos · todos los formatos'}</span>
            <input type="file" multiple accept={hay ? ARCHIVOS_ACEPTADOS_BACK : ARCHIVOS_ACEPTADOS}
              disabled={!!subiendo} style={{ display: 'none' }}
              onChange={e => {
                // Los archivos se copian ANTES de limpiar el campo: si no, el mismo archivo no se
                // puede volver a elegir después de un error (el campo queda apuntando a lo mismo).
                const elegidos = Array.from(e.target.files || []);
                e.target.value = '';
                void onb.subirArchivos(elegidos);
              }} />
          </label>

          {/* El avance: sube uno por uno y el negocio ve por dónde va. */}
          {subiendo && (
            <div className="tiny muted" style={{ marginTop: 8 }}>
              Subiendo {subiendo.hechos} de {subiendo.total}… no cierre esta pantalla hasta que termine.
            </div>
          )}

          {n > 0 && (
            <div className="onb-archivos">
              {onb.archivos.map(a => (
                <div key={a.id || a.nombre} className="onb-arch">
                  <span className="onb-arch-ic"><IconoArchivo tipo={a.tipo} /></span>
                  <span className="onb-arch-n" title={a.nombre}>{a.nombre}</span>
                  <span className="onb-arch-p">{a.peso}</span>
                  <button className="onb-arch-x" disabled={!!subiendo}
                    title={hay
                      ? `Saca ${a.nombre} de su carpeta: el motor deja de leerlo. Se puede volver a subir cuando quiera.`
                      : `Saca ${a.nombre} de la lista de esta visita.`}
                    onClick={() => void onb.quitarArchivo(a)}><I_X size={12} /></button>
                </div>
              ))}
            </div>
          )}

          {/* Lo que no se pudo subir, con su motivo, y sin perder lo que sí subió. */}
          {onb.errorArchivos && (
            <div className="tiny" style={{ color: 'var(--amber)', marginTop: 8 }}>{onb.errorArchivos}</div>
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
          {n > 0 && (hay ? (
            <div className="tiny onb-ok">
              <I_Check size={12} /> {n} archivo{n > 1 ? 's' : ''} en su carpeta del servidor: el motor los lee para escribir sus piezas. Puede seguir sumando o sacar los que no quiera.
            </div>
          ) : (
            <div className="tiny muted" style={{ marginTop: 10 }}>
              {n} archivo{n > 1 ? 's' : ''} en la lista. Esta visita es la demostración: no se sube nada ni queda guardado.
            </div>
          ))}
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

/**
 * CÓMO SE VE UNA FILA DEL PASO 5 CON EL BACK ENCENDIDO — el estado REAL de esa red, nunca el del ejemplo.
 *
 * El back es el único que sabe: `conectada` sólo cuando devuelve la cuenta de esa red; `sin conectar`
 * cuando la red se puede conectar y todavía no hay cuenta; y `falta configurar` —nombrando las variables
 * que faltan— sólo cuando la red no se puede conectar por NINGUNA vía: ni app propia en el servidor ni
 * bundle.social. `habilitadoHoy` es del ejemplo y aquí NO se usa: decir «ya estaba conectada» sin que el
 * back lo diga es lo que esta pantalla corregía.
 */
/** ¿Esta red se puede conectar hoy? Con su app propia cargada en el servidor, o por bundle.social. */
const sePuedeConectar = (r: { configurado: boolean; viaBundle?: string }) => r.configurado || !!r.viaBundle;

function estadoFila(c: ConexionOnb, r: IntegracionRed | null): {
  tono: 'green' | 'amber' | 'red' | 'muted'; rotulo: string; texto: string;
} {
  const cuenta = r?.cuenta ?? null;
  const ultima = r?.ultima_sincronizacion ?? null;
  const falta = r?.falta?.length ? r.falta : [];

  if (cuenta) return {
    tono: 'green', rotulo: 'conectada',
    texto: `Su cuenta está conectada: ${cuenta.nombre || cuenta.external_id || 'sin nombre'}. ${ultima
      ? `Última sincronización (${ultima.que || 'datos'}): ${ultima.ok ? 'salió bien' : 'no salió'}${ultima.detalle ? ` · ${ultima.detalle}` : ''}.`
      : 'Todavía no se sincronizó ninguna vez.'}`,
  };

  // La fila que no tiene red propia en el back: lo dice y no ofrece conectar, porque conectar ahí
  // conectaría otra cosa. Sin estado no se afirma nada de ella.
  if (!c.red) return {
    tono: 'muted', rotulo: 'sin conectar',
    texto: `No hay una conexión de ${c.nombre} aparte: la de Meta es la misma cuenta que Instagram, y aquí se ve el estado de esa fila.`,
  };

  // El back respondió, pero no mandó esta red: no se afirma nada de ella.
  if (!r) return {
    tono: 'muted', rotulo: 'sin conectar',
    texto: `El back no mandó el estado de ${c.nombre}: esa red no vino en su lista, así que aquí no se puede decir si está conectada.`,
  };

  // No hay ninguna vía para conectar esta red: ni app propia en el servidor, ni bundle.social. Se
  // nombran las variables que faltan y no se ofrece un botón que no puede funcionar.
  if (!sePuedeConectar(r)) return {
    tono: 'red', rotulo: 'falta configurar',
    texto: `${c.nombre} todavía no tiene su app configurada en el servidor y bundle.social tampoco la cubre${falta.length
      ? `: falta cargar ${falta.length === 1 ? 'esta variable' : 'estas variables'} ${falta.join(', ')}` : ''}. Mientras falte, no hay permiso que pedir ni conexión que ofrecer.`,
  };

  // Las redes que van por clave no tienen pantalla de autorización: su clave ya está en el servidor.
  if (r.tipo === 'token') return {
    tono: 'muted', rotulo: 'sin conectar',
    texto: 'Su clave ya está cargada en el servidor: no hay permiso que pedir, sólo falta la primera lectura para que sus datos entren al motor. El panel nunca la pide ni la muestra.',
  };

  // Se puede conectar y todavía no hay cuenta: el permiso se le pide al dueño de la cuenta.
  return {
    tono: 'muted', rotulo: 'sin conectar',
    texto: r.viaBundle
      ? `Su cuenta todavía no está conectada. Al conectar se abre la pantalla de bundle.social, donde el permiso lo da el dueño de la cuenta (${r.nombre} · ${r.viaBundle}); el token queda guardado del lado del servidor y el panel nunca lo pide ni lo muestra.`
      : `Su cuenta todavía no está conectada. Al conectar se le pide el permiso al dueño de la cuenta en ${r.nombre}, y el token queda guardado del lado del servidor: el panel nunca lo pide ni lo muestra.`,
  };
}

/** Las cuentas y la verificación: es el paso 5, y se usa igual en los dos lados. */
export function BloqueConexiones() {
  const onb = useOnboarding();
  const datos = useDatos();
  // La red que está trabajando: mientras el back responde, las filas se apagan para no disparar dos veces.
  const [trabajando, setTrabajando] = useState<{ red: string; accion: string } | null>(null);
  const conectadas = (onb.datos['conectadas'] as string[] | undefined) || [];

  const alternar = (key: string) => {
    const c = CONEXIONES_ONB.find(x => x.key === key)!;
    const nuevas = conectadas.includes(key) ? conectadas.filter(k => k !== key) : [...conectadas, key];
    onb.escribir('conectadas', nuevas);
    onb.avisar(nuevas.includes(key) ? `${c.nombre} conectada: ${c.detalle}` : `${c.nombre} desconectada: el motor ya no publica ahí`);
  };

  // ---------------------------------------------------------------------------------------------
  // LAS ACCIONES REALES — el mismo camino que usa Cuenta.tsx, sin inventar otro: el POST va con el
  // token de la sesión y conectar manda el navegador a la dirección que devuelve el back.
  // ---------------------------------------------------------------------------------------------

  /** Una llamada al back con el token de la sesión, siempre la misma forma de leer el error. */
  const accionRed = async (red: string, accion: 'empezar' | 'sincronizar') => {
    const r = await fetch(baseApi() + `/api/integraciones/${encodeURIComponent(red)}/${accion}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token() },
    });
    const cuerpo = await r.json().catch(() => ({})) as { url?: string; error?: string; detalle?: string; que_hizo?: string };
    return { ok: r.ok, cuerpo };
  };

  /** Conectar una red: el back devuelve la dirección del proveedor y el navegador se va para allá. */
  const conectarRed = async (red: string, nombre: string) => {
    setTrabajando({ red, accion: 'conectar' });
    try {
      const { ok, cuerpo } = await accionRed(red, 'empezar');
      if (ok && cuerpo.url) {
        // La red queda anotada: es lo que hace que el paso de vuelta sepa a qué red pertenece el código.
        recordarRed(red);
        onb.avisar(`${nombre} le va a pedir el permiso: cuando autorice, su cuenta queda conectada`);
        window.location.href = cuerpo.url;
      } else {
        onb.avisar(cuerpo.error || `No se pudo empezar la conexión con ${nombre}: el servidor respondió con un error`);
      }
    } catch { onb.avisar(`No se pudo hablar con el servidor: la conexión con ${nombre} no arrancó`); }
    setTrabajando(null);
  };

  /** Sincronizar ahora: el back lee los datos de esa red y dice qué hizo. Después se relee el estado. */
  const sincronizarRed = async (red: string, nombre: string) => {
    setTrabajando({ red, accion: 'sincronizar' });
    try {
      const { ok, cuerpo } = await accionRed(red, 'sincronizar');
      if (ok) onb.avisar([cuerpo.que_hizo, cuerpo.detalle].filter(Boolean).join(': ') || `${nombre} sincronizó con el servidor`);
      else onb.avisar(cuerpo.error || `No se pudo sincronizar ${nombre}: el servidor respondió con un error`);
    } catch { onb.avisar('No se pudo sincronizar: el servidor no respondió'); }
    await datos.refrescar();
    setTrabajando(null);
  };

  // ---------------------------------------------------------------------------------------------
  // SIN BACK (el modo demostración): el bloque queda EXACTAMENTE como estaba —mismo HTML,
  // `habilitadoHoy` incluido— porque es lo que se ve en el link de revisión. No se toca.
  // ---------------------------------------------------------------------------------------------
  if (!datos.real) {
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

  // ---------------------------------------------------------------------------------------------
  // CON EL BACK ENCENDIDO: las mismas filas del diseño, cada una con el estado real de SU red.
  // ---------------------------------------------------------------------------------------------
  const ig = datos.integraciones;
  const porRed = new Map((ig?.redes ?? []).map(r => [r.red, r]));

  // Lo que se dice cuando no hay nada que mostrar: mientras lee, lo dice; y si el servidor no
  // respondió, lo dice con la puerta para volver a intentar. Nunca afirma que no haya conexiones.
  const sinLeer = datos.cargando
    ? { titulo: 'Leyendo sus conexiones en el servidor…', texto: 'El panel está leyendo, red por red, qué tiene configurado el servidor y qué cuentas hay conectadas. Mientras lee no afirma nada.' }
    : !ig
      ? { titulo: 'No se pudo leer el estado de sus conexiones', texto: 'Aquí se ve, canal por canal, si el servidor tiene configurada la app de esa red, si hay una cuenta conectada y cuándo se sincronizó. El servidor no respondió: vuelva a leerlo y aparece tal como está.' }
      : { titulo: 'El servidor todavía no mandó las redes para conectar', texto: 'Cuando el back devuelva sus redes conectables, cada canal aparece aquí con su estado real. Devolvió la lista vacía.' };

  return (
    <div className="onb-conexiones">
      {!ig || ig.redes.length === 0 ? (
        <EstadoVacio {...sinLeer}
          {...(datos.cargando ? {} : { accion: 'Volver a leer', onAccion: () => void datos.refrescar() })} />
      ) : (
        CONEXIONES_BACK.map(c => {
          const r = c.red ? porRed.get(c.red) ?? null : null;
          const { tono, rotulo, texto } = estadoFila(c, r);
          const cuenta = r?.cuenta ?? null;
          const enCurso = r && trabajando?.red === r.red ? trabajando.accion : '';
          // Un botón por fila, como en el diseño: conectar (permiso del proveedor), probar la clave
          // (las redes que van por token, que no tienen pantalla de autorización) o sincronizar (la
          // que ya está conectada, que no vuelve a ofrecer conectar).
          return (
            <div key={c.key} className="guard">
              <span style={{ fontSize: 17, flexShrink: 0 }}>{c.icono}</span>
              <span className="guard-lb">{c.nombre}
                <small>{texto}</small>
              </span>
              <Badge tone={tono}>{rotulo}</Badge>
              {r && sePuedeConectar(r) && !cuenta && r.tipo !== 'token' && (
                <Button variant="ghost" className="btn-sm" disabled={trabajando !== null}
                  title={r.viaBundle
                    ? `Conecta ${r.nombre}: abre la pantalla de bundle.social, donde el permiso lo da el dueño de la cuenta (POST /api/integraciones/${r.red}/empezar). El token queda guardado en el servidor: esta pantalla nunca lo ve. Reversible: se desconecta desde Cuenta.`
                    : `Conecta ${r.nombre}: el permiso se le pide al dueño de la cuenta en ${r.nombre} (POST /api/integraciones/${r.red}/empezar) y el token queda guardado en el servidor: esta pantalla nunca lo ve. Reversible: se desconecta desde Cuenta.`}
                  onClick={() => void conectarRed(r.red, r.nombre)}>
                  {enCurso === 'conectar' ? 'Abriendo…' : 'Conectar'}
                </Button>
              )}
              {r && sePuedeConectar(r) && !cuenta && r.tipo === 'token' && (
                <Button variant="ghost" className="btn-sm" disabled={trabajando !== null}
                  title={`Lee los datos de ${r.nombre} con la clave que ya está cargada en el servidor. Si la clave no sirve, lo dice: no inventa datos.`}
                  onClick={() => void sincronizarRed(r.red, r.nombre)}>
                  {enCurso === 'sincronizar' ? 'Leyendo…' : 'Probar y sincronizar'}
                </Button>
              )}
              {r && cuenta && (
                <Button variant="outline" className="btn-sm" disabled={trabajando !== null}
                  title={`Lee los datos de ${r.nombre} y con ellos calibra su público solo. No frena nada de lo que ya corre: al terminar dice qué hizo.`}
                  onClick={() => void sincronizarRed(r.red, r.nombre)}>
                  {enCurso === 'sincronizar' ? 'Sincronizando…' : 'Sincronizar ahora'}
                </Button>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

/**
 * EL CÓDIGO DE ENTRADA — el freno de la entrada, en un solo lugar.
 *
 * Sinkroo se entrega por invitación: el negocio recibe un código de quien le instaló el sistema y el
 * asistente no avanza sin él. El bloque vive en la bienvenida del asistente y, con el servidor
 * encendido, se repite al lado del botón de arranque cuando el código falta: el negocio que ya cerró
 * el asistente tiene que poder validarlo sin quedar encerrado.
 *
 * SIN SERVIDOR NO SE DIBUJA NADA: la demostración queda igual que siempre.
 * El código no se guarda en el navegador ni se vuelve a mostrar: se manda una vez y lo único que
 * queda es si el back lo dio por registrado.
 */
export function BloqueCodigoDeEntrada() {
  const onb = useOnboarding();
  const [codigo, setCodigo] = useState('');
  const e = onb.entrada;
  // Sin servidor encendido no hay código que pedir: el asistente queda tal como está hoy.
  if (!onb.conBack) return null;

  const validar = () => { void onb.reclamarCodigo(codigo); };

  return (
    <div className="asist-caja"
      style={{ borderColor: e.registrado ? 'rgba(34,197,94,.32)' : 'rgba(245,158,11,.36)' }}>
      <b style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        {e.registrado ? <I_Check size={13} /> : <I_Lock size={13} />}
        {e.registrado ? 'Su código de entrada quedó aceptado' : 'Sinkroo está en entrada por invitación'}
      </b>
      <small>
        {e.registrado
          ? (e.nota || 'Su cuenta ya quedó registrada: puede seguir, y el motor trabaja con su negocio.')
          : 'El código lo recibe de quien le instaló el sistema. Sin él, el asistente no avanza y el motor no arranca.'}
      </small>

      {!e.registrado && (
        <>
          <div className="onb-links-in" style={{ marginTop: 10 }}>
            <input className="input" type="text" autoComplete="off" value={codigo}
              placeholder="Código de entrada" aria-label="Código de entrada"
              disabled={e.cargando}
              title="Escriba el código que le entregaron. Sólo sirve para dejar su cuenta registrada: no se guarda en este navegador ni se vuelve a mostrar."
              onChange={ev => setCodigo(ev.target.value)}
              onKeyDown={ev => { if (ev.key === 'Enter') { ev.preventDefault(); validar(); } }} />
            <Button variant="outline" className="btn-sm" disabled={e.cargando}
              title="Revisa el código contra el servidor. Si sirve, su cuenta queda registrada y el asistente avanza; cada código sirve una sola vez. Se puede intentar las veces que haga falta."
              onClick={validar}>{e.cargando ? 'Revisando…' : 'Validar el código'}</Button>
          </div>
          {e.error && <div className="tiny" style={{ color: 'var(--red)', marginTop: 7 }}>{e.error}</div>}
          {e.errorLectura && <div className="tiny" style={{ color: 'var(--amber)', marginTop: 7 }}>{e.errorLectura}</div>}
          {e.errorLectura && (
            <div style={{ marginTop: 8 }}>
              <Button variant="ghost" className="btn-sm"
                title="Vuelve a preguntarle al servidor si su código ya quedó registrado. No cambia nada de lo que ya puso."
                onClick={() => void onb.recargarEntrada()}>Volver a leer</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** El arranque: el botón, la línea de estado y lo que hace el motor, paso por paso. */
export function BloqueArranque({ enAsistente, alCerrar }: { enAsistente?: boolean; alCerrar?: () => void }) {
  const onb = useOnboarding();
  const { plan } = usePlan();
  if (onb.arrancado) {
    return (
      <>
        <div className="onb-arrancado">
          <I_Zap size={15} />
          <span><b>El motor está trabajando.</b> Ya quedaron sus 500 del público y arrancó por el mercado: en unas
            horas va a tener el primer informe y las primeras piezas listas. Nada de esto gasta dinero hasta que
            la pieza pasa el panel.</span>
        </div>
        <div className="onb-semana">
          {ARRANQUE.map(d => (
            <div key={d.paso} className="onb-etapa">
              <span className="onb-etapa-n">{d.paso}</span>
              <span className="onb-etapa-quien">{d.quien}</span>
              <span className="onb-etapa-que">{d.que}</span>
              <span className="onb-etapa-cr">{d.creditos}</span>
            </div>
          ))}
          <div className="onb-etapa-total">
            <span>Total del arranque</span>
            <span><b>{COSTO_ARRANQUE} créditos</b> {plan
              ? <>de los {plan.creditosMes.toLocaleString('es-CO')} del plan {plan.nombre}</>
              : 'de los créditos de su plan'} · publicar es aparte</span>
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

  // El freno: con el servidor encendido y sin código de entrada, el motor NO se arranca. El botón queda
  // apagado y explica qué falta y dónde se consigue; al lado va el mismo bloque de la bienvenida, para
  // que el negocio que ya cerró el asistente lo pueda validar acá mismo.
  const faltaCodigo = !onb.puedeArrancar;

  return (
    <>
      {faltaCodigo && (
        <>
          <div className="bs" style={{ marginTop: 12 }}>
            <b style={{ color: 'var(--txt)' }}>Para arrancar falta el código de entrada. </b>
            El asistente lo pide en la bienvenida y sin él el motor no arranca: es la entrada por invitación.
          </div>
          <BloqueCodigoDeEntrada />
        </>
      )}
      <div className="row" style={{ gap: 9, marginTop: 14, flexWrap: 'wrap' }}>
        <Button className="btn-sm" disabled={faltaCodigo || onb.arrancando}
          title={faltaCodigo
            ? 'Apagado: falta el código de entrada, que entrega quien le instaló Sinkroo. Se valida acá arriba y queda registrado en su cuenta.'
            : `Arranca el motor ahora: arma su público de 500 personas, investiga su mercado y prepara las primeras piezas. Cuesta ${COSTO_ARRANQUE} créditos y no gasta dinero hasta que las piezas pasan el panel.`}
          onClick={() => void onb.arrancar()}>
          <I_Play size={13} /> {onb.arrancando ? 'Arrancando…' : 'Arrancar el motor'}
        </Button>
        {!enAsistente && (
          <Button variant="ghost" className="btn-sm" title="Guarda lo que puso y le deja seguir después desde Hoy"
            onClick={() => { onb.desmarcar(5); onb.avisar('Guardado: sigue cuando quiera desde Hoy'); }}>
            Dejarlo para después
          </Button>
        )}
      </div>
      {/* Lo que dijo el back cuando el arranque no salió: el motor NO queda arrancado y se dice así. */}
      {onb.errorArranque && (
        <div className="tiny" style={{ color: 'var(--red)', marginTop: 9, flexBasis: '100%' }}>{onb.errorArranque}</div>
      )}
    </>
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

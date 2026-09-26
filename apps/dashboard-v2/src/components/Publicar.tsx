import { useMemo, useState } from 'react';
import { Card, Badge, Button } from './ui';
import {
  I_Megaphone, I_Upload, I_Image, I_Film, I_File, I_Link, I_Check, I_ArrowRight, I_Trash,
  I_ChevDn, I_ChevUp, I_Users, I_Chat,
  I_Cal, I_Refresh, I_X, I_Lock,
} from './icons';
import { FlujoMiroFish } from './FlujoMiroFish';
import { TIPOS_CAMPANA, type ObjetivoCampana } from '../data/campana';
import { FORMATOS, MATERIAL, NO_SE_PUBLICA, type CampoPublicacion, type FormatoKey } from '../data/publicaciones';
import type { Modo } from '../data/demo';
// LA CUENTA DEL NEGOCIO Y SUS CONEXIONES: las cuentas que se muestran en «Con qué cuentas lo publica»
// salen de acá (el back las devuelve en GET /api/integraciones), no de una lista escrita a mano acá.
import { useDatos, type IntegracionRed } from '../api/datos';
// Las acciones de conectar, sincronizar y desconectar van a las rutas REALES de esa red, con el token de
// la sesión: es el mismo cliente que usa la capa de datos, no una puerta nueva.
import { baseApi, recordarRed, token } from '../api/cliente';
// El PIN de seguridad: desconectar una cuenta es una acción sensible y el back lo pide antes de dejarla
// pasar. El aviso que lo pide es el mismo que usa Cuenta y autonomía.
import { useSeguridad } from '../lib/seguridad';
import { EstadoVacio } from './EstadoVacio';
import { useDetalle } from './Detalle';

type Archivo = { nombre: string; peso: string; url: string | null; esImagen: boolean; deCarpeta?: boolean };
type Valor = string | string[];

/** El ícono de una miniatura que no se puede ver: por la extensión, no por adivinanza. */
const iconoDe = (nombre: string) =>
  /\.(pdf|xls|xlsx|csv|docx?|pptx?|txt)$/i.test(nombre) ? <I_File size={18} />
    : /\.(mp4|mov|webm|avi|mkv|m4v)$/i.test(nombre) ? <I_Film size={18} />
      : <I_Image size={18} />;

// LA HORA EXACTA DEL MENSAJE: 48 medias horas en formato de 24 h (00:00 … 23:30). Lo que se guarda
// en el campo es el texto 'A las 15:30', así la hora que elige el usuario y las opciones de la
// lista ('Hoy', 'A la tarde', 'Que lo elija el motor') son UN SOLO dato: nunca pueden contradecirse
// ni quedar dos horarios activos a la vez.
const HORAS_24 = Array.from({ length: 48 }, (_, i) =>
  `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`);
const HORA_PREFIJO = 'A las ';
const HORA_POR_DEFECTO = '10:00';
/** ¿La hora elegida cae fuera de la ventana en la que el motor escribe solo (8:00 a 22:00)? */
const fueraDeVentana = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  const min = h * 60 + m;
  return min < 8 * 60 || min > 22 * 60;
};

// EL DÍA Y LA HORA: los próximos 30 días con la etiqueta escrita entera («Hoy · miércoles 24»,
// «Mañana · jueves 25», «Viernes 26 de septiembre») y la fecha en formato ISO como valor, para poder
// volver a leer lo elegido sin adivinar. Debajo del selector se arma el resumen en palabras.
const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = Array.from({ length: 30 }, (_, i) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + i);
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const dia = `${DIAS_SEMANA[d.getDay()][0].toUpperCase()}${DIAS_SEMANA[d.getDay()].slice(1)} ${d.getDate()}`;
  return { iso, fecha: `${dia} de ${MESES[d.getMonth()]}`, etiqueta: i === 0 ? `Hoy · ${dia}` : i === 1 ? `Mañana · ${dia}` : `${dia} de ${MESES[d.getMonth()]}` };
});
/** '2026-09-26' → 'el sábado 26 de septiembre'. */
const fechaLarga = (iso: string) => {
  const [a, m, dd] = iso.split('-').map(Number);
  const d = new Date(a, m - 1, dd);
  return `el ${DIAS_SEMANA[d.getDay()]} ${dd} de ${MESES[m - 1]}`;
};
/** El momento con el que nace el selector: la próxima hora redonda, o mañana 9:00 si ya es tarde. */
const momentoPorDefecto = () => {
  const h = new Date().getHours();
  if (h < 8 || h >= 21) return { diaIdx: 1, hora: '09:00' };
  return { diaIdx: 0, hora: `${String(h + 1).padStart(2, '0')}:00` };
};

function IconoCampo({ tipo }: { tipo: CampoPublicacion['tipo'] }) {
  if (tipo === 'imagenes') return <I_Image size={17} />;
  if (tipo === 'videos') return <I_Film size={17} />;
  if (tipo === 'media') return <I_Upload size={17} />;
  if (tipo === 'link') return <I_Link size={17} />;
  return <I_File size={17} />;
}

export function Publicar({ setToast, modo, irAConversaciones, soloIngesta }: {
  setToast: (t: string) => void; modo: Modo; irAConversaciones: () => void; soloIngesta?: boolean;
}) {
  // LO QUE SALE DEL BACK, y nada más: su carpeta de archivos, sus conexiones (cada red con la cuenta
  // que el negocio conectó de verdad) y el resumen de su negocio. En esta pantalla no vive ningún dato
  // de ejemplo: lo que no produjo el back, no se muestra.
  const datos = useDatos();
  const archivos = datos.archivos;
  const integraciones = datos.integraciones;
  // La seguridad de la cuenta: el back pide el PIN antes de desconectar una cuenta y el aviso se abre
  // desde acá, igual que desde Cuenta y autonomía.
  const seguridad = useSeguridad();
  const [formatoKey, setFormatoKey] = useState<FormatoKey>('anuncio');
  const [objetivo, setObjetivo] = useState<ObjetivoCampana>('ventas');
  const [valores, setValores] = useState<Record<string, Valor>>({});
  const [material, setMaterial] = useState<Record<string, Archivo[]>>({});
  const [avanzados, setAvanzados] = useState(false);
  /** La acción de una red que está corriendo (conectar, sincronizar, desconectar). null = nada en curso. */
  const [trabajando, setTrabajando] = useState<{ red: string; accion: string } | null>(null);
  const detalle = useDetalle();

  const formato = FORMATOS.find(f => f.key === formatoKey)!;
  const tipo = TIPOS_CAMPANA.find(t => t.key === objetivo)!;

  const set = (id: string, v: Valor) => setValores(prev => ({ ...prev, [id]: v }));

  // La selección múltiple se calcula DENTRO del setter: con `valores[id]` leído del render, dos
  // toques seguidos (o un doble toque) parten del mismo estado viejo y uno de los dos se pierde.
  const toggle = (id: string, op: string) =>
    setValores(prev => {
      const actual = (prev[id] as string[]) || [];
      return { ...prev, [id]: actual.includes(op) ? actual.filter(x => x !== op) : [...actual, op] };
    });

  const totalCampos = formato.campos.length + MATERIAL.length;
  const cargados = useMemo(() => {
    let n = 0;
    formato.campos.forEach(c => {
      const v = valores[c.id];
      if (Array.isArray(v) ? v.length : (v || '').trim()) n++;
    });
    Object.values(material).forEach(a => { n += a.length; });
    return n;
  }, [valores, material, formato]);

  const subir = (campo: CampoPublicacion, files: FileList | File[] | null) => {
    if (!files || !files.length) return;
    const items: Archivo[] = Array.from(files).map(f => ({
      // Lo que se pega desde el portapapeles (Ctrl+V) no trae nombre: se le pone uno legible.
      nombre: f.name || 'Captura pegada',
      peso: f.size > 1048576 ? (f.size / 1048576).toFixed(1) + ' MB' : Math.round(f.size / 1024) + ' KB',
      url: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
      esImagen: f.type.startsWith('image/'),
    }));
    setMaterial(m => ({ ...m, [campo.id]: [...(m[campo.id] || []), ...items] }));
    setToast(`${items.length} archivo${items.length > 1 ? 's' : ''} subido${items.length > 1 ? 's' : ''} a «${campo.etiqueta.replace(/^[^\p{L}\p{N}]+\s*/u, '')}»`);
  };

  /** El cargador de archivos de un campo. Vive aquí porque se usa en dos lados: en «Su material real»
      y adentro de los campos que, además de texto, aceptan pantallazos (las reseñas de clientes). */
  const cargador = (campo: CampoPublicacion, tipo: 'imagenes' | 'videos' | 'media' | 'archivos', ayuda: string) => {
    const archivos = material[campo.id] || [];
    return (
      <>
        <label className="dropzone">
          <span style={{ color: 'var(--purple3)' }}><IconoCampo tipo={tipo} /></span>
          <span className="small" style={{ fontWeight: 700 }}>
            {tipo === 'imagenes' ? 'Subir imágenes'
              : tipo === 'videos' ? 'Subir videos'
              : tipo === 'media' ? 'Subir el contenido' : 'Subir archivos'}
          </span>
          <span className="tiny muted">{ayuda}</span>
          <input type="file" multiple
            accept={tipo === 'imagenes' ? 'image/*' : tipo === 'videos' ? 'video/*' : tipo === 'media' ? 'video/*,image/*' : '*/*'}
            style={{ display: 'none' }} onChange={e => subir(campo, e.target.files)} />
        </label>
        {archivos.length > 0 && (
          <div className="mat-thumbs">
            {archivos.map((f, i) => (
              <div key={i} className="mat-thumb">
                {f.esImagen && f.url
                  ? <img src={f.url} alt={f.nombre} />
                  : <span className="mat-thumb-ico">{iconoDe(f.nombre)}</span>}
                <span className="mat-thumb-n" title={f.deCarpeta ? `${f.nombre} · ya estaba en su carpeta` : f.nombre}>{f.nombre}</span>
                <span className="mat-thumb-p">{f.peso}</span>
                <button className="mat-thumb-x" title="Quitar" onClick={() => quitar(campo.id, i)}><I_Trash size={12} /></button>
              </div>
            ))}
          </div>
        )}
      </>
    );
  };

  /**
   * La carpeta del negocio: lo que YA subió a su carpeta del servidor (GET /api/archivos), para sumarlo a
   * esta campaña sin volver a subirlo. Antes esta lista salía de una carpeta de ejemplo: archivos de un
   * negocio ajeno, ofrecidos como si fueran suyos. Sin archivos —o sin back— no se muestra el bloque.
   * El back todavía no dice a qué campo de la publicación pertenece cada archivo, así que se ofrecen los
   * que el negocio subió, sin atribuirle a ninguno un campo que no consta.
   */
  const carpetaDe = (campo: CampoPublicacion) => {
    const yaEsta = archivos.map(a => ({
      nombre: a.nombre,
      peso: a.tamano > 1048576 ? (a.tamano / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(a.tamano / 1024)) + ' KB',
    }));
    if (!yaEsta.length) return null;
    const puestos = material[campo.id] || [];
    return (
      <div className="carpeta">
        <div className="carpeta-lb">Ya lo tiene subido <span className="tiny muted">— toque para sumarlo a esta campaña</span></div>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {yaEsta.map(f => {
            const puesto = puestos.some(a => a.nombre === f.nombre);
            return (
              <button key={f.nombre} type="button" className={`tipo-chip carpeta-chip ${puesto ? 'sel' : ''}`}
                title={puesto
                  ? `Ya está en esta campaña: ${f.peso}. Toque para sacarlo.`
                  : `Sumar «${f.nombre}» (${f.peso}) a esta campaña, sin volver a subirlo.`}
                onClick={() => setMaterial(m => {
                  const actuales = m[campo.id] || [];
                  const esta = actuales.some(a => a.nombre === f.nombre);
                  return { ...m, [campo.id]: esta
                    ? actuales.filter(a => a.nombre !== f.nombre)
                    : [...actuales, { nombre: f.nombre, peso: f.peso, url: null, esImagen: /\.(jpe?g|png|webp|gif|avif|heic)$/i.test(f.nombre), deCarpeta: true }] };
                })}>
                {puesto ? '✓ ' : ''}{f.nombre}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const quitar = (id: string, i: number) =>
    setMaterial(m => ({ ...m, [id]: (m[id] || []).filter((_, ix) => ix !== i) }));

  const camposFormato = (campos: CampoPublicacion[]) => campos.map(campo => {
    const v = valores[campo.id];
    // El día y la hora elegidos por el usuario: un solo valor 'El 2026-09-26 a las 19:30'.
    const elegido = campo.diaHora && typeof v === 'string'
      ? /^El (\d{4}-\d{2}-\d{2}) a las (\d{2}:\d{2})$/.exec(v) : null;
    const diaElegido = elegido ? elegido[1] : '';
    const horaDiaElegida = elegido ? elegido[2] : '';
    // La hora exacta suelta (solo la hora, sin día): un solo valor 'A las 19:30'.
    const horaElegida = campo.horaLibre && typeof v === 'string' && v.startsWith(HORA_PREFIJO)
      ? v.slice(HORA_PREFIJO.length) : '';
    return (
      <div key={campo.id} className="mat-campo">
        <label className="label">{campo.etiqueta}</label>
        {campo.tipo === 'texto' ? (
          <>
            <textarea className="input" rows={((v as string) || '').length > 60 ? 3 : 2} placeholder={campo.ayuda}
              value={(v as string) || ''} onChange={e => set(campo.id, e.target.value)}
              onPaste={campo.conImagenes ? e => {
                // Pegar un pantallazo con Ctrl+V: se toma la imagen del portapapeles en vez del texto.
                const imgs = Array.from(e.clipboardData?.files || []).filter(f => f.type.startsWith('image/'));
                if (imgs.length) { e.preventDefault(); subir(campo, imgs); }
              } : undefined} />
            {campo.conImagenes && (
              <div style={{ marginTop: 10 }}>
                {cargador(campo, 'imagenes', 'Pantallazos del celular, capturas de WhatsApp o fotos de reseñas. También puede pegarlos con Ctrl+V.')}
              </div>
            )}
          </>
        ) : campo.tipo === 'link' ? (
          <input className="input" placeholder={campo.ayuda} value={(v as string) || ''} onChange={e => set(campo.id, e.target.value)} />
        ) : campo.tipo === 'numero' ? (
          <input className="input" style={{ maxWidth: 140 }} placeholder="0" value={(v as string) || ''} onChange={e => set(campo.id, e.target.value)} />
        ) : campo.tipo === 'videos' || campo.tipo === 'imagenes' || campo.tipo === 'media' || campo.tipo === 'archivos' ? (
          // Un campo de material dentro de la lista de campos: el contenido del colaborador es del
          // negocio, no del motor, así que se sube aquí como cualquier otro material.
          cargador(campo, campo.tipo, campo.ayuda)
        ) : (
          <>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              {/* EL DÍA Y LA HORA, elegidos por el usuario: una sola pastilla que abre los dos
                  selectores (30 días + 48 medias horas). El valor guardado es el mismo campo:
                  'El 2026-09-26 a las 19:30'. */}
              {campo.diaHora && (
                <button type="button" className={`tipo-chip ${diaElegido ? 'sel' : ''}`}
                  title={diaElegido
                    ? `Sale ${fechaLarga(diaElegido)} a las ${horaDiaElegida}. Toque para cambiarlo.`
                    : 'Elija usted el día y la hora a la que sale, en formato de 24 horas.'}
                  onClick={() => {
                    if (diaElegido) { set(campo.id, ''); return; }
                    const d = momentoPorDefecto();
                    set(campo.id, `El ${DIAS[d.diaIdx].iso} a las ${d.hora}`);
                  }}>
                  📅 {diaElegido
                    ? `${diaElegido.slice(8, 10)}/${diaElegido.slice(5, 7)} · ${horaDiaElegida}`
                    : (campo.opcionDiaHora || 'Elija el día y la hora')}
                </button>
              )}
              {(campo.opciones || []).map(op => {
                const activo = campo.multi ? ((v as string[]) || []).includes(op) : v === op;
                return (
                  <button key={op} type="button" className={`tipo-chip ${activo ? 'sel' : ''}`}
                    title={campo.detalle?.[op]}
                    onClick={() => campo.multi ? toggle(campo.id, op) : set(campo.id, activo ? '' : op)}>
                    {activo ? '✓ ' : ''}{op}
                  </button>
                );
              })}
              {/* LA HORA LA ELIGE EL USUARIO: una opción más de la misma lista. Al elegirla se abre
                  el selector de 24 h y el valor del campo pasa a ser 'A las 15:30', así se apaga
                  sola cualquier opción anterior de la lista. */}
              {campo.horaLibre && (
                <button type="button" className={`tipo-chip ${horaElegida ? 'sel' : ''}`}
                  title={horaElegida
                    ? `Sale a las ${horaElegida}. Toque para elegir otra hora.`
                    : 'Elija usted la hora exacta a la que sale, en formato de 24 horas (00:00 a 23:30).'}
                  onClick={() => set(campo.id, horaElegida ? '' : HORA_PREFIJO + HORA_POR_DEFECTO)}>
                  🕒 {horaElegida || 'Elija la hora'}
                </button>
              )}
            </div>
            {/* Lo elegido, con su historia a la vista: en el celular no hay globito que mostrar. */}
            {campo.detalleVisible && Array.isArray(v) && v.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {v.map(op => (
                  <div key={op} className="tiny row" style={{ gap: 7, alignItems: 'flex-start' }}>
                    <I_Check size={12} style={{ color: 'var(--green)', flexShrink: 0, marginTop: 2 }} />
                    <span style={{ flex: 1, minWidth: 0, color: 'var(--muted2)' }}>
                      <b style={{ color: 'var(--txt)' }}>{op}</b> — {campo.detalle?.[op]}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {campo.diaHora && diaElegido && (
              <>
                <div className="row" style={{ gap: 9, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <select className="input" style={{ maxWidth: 200 }} value={diaElegido}
                    title="Elija el día en que sale."
                    onChange={e => set(campo.id, `El ${e.target.value} a las ${horaDiaElegida || HORA_POR_DEFECTO}`)}>
                    {DIAS.map(d => <option key={d.iso} value={d.iso}>{d.etiqueta}</option>)}
                  </select>
                  <select className="input" style={{ maxWidth: 122 }} value={horaDiaElegida}
                    title="Elija la hora exacta, en formato de 24 horas."
                    onChange={e => set(campo.id, `El ${diaElegido} a las ${e.target.value}`)}>
                    {HORAS_24.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div className="tiny muted" style={{ marginTop: 6 }}>
                  Sale {fechaLarga(diaElegido)} a las <b>{horaDiaElegida}</b>.
                </div>
              </>
            )}
            {campo.diaHora && !diaElegido && v === 'Que lo recomiende el motor' && (
              <div className="tiny muted" style={{ marginTop: 8 }}>
                El motor elige la franja con más gente de su público conectada, y después le dice a qué
                hora salió y por qué.
              </div>
            )}
            {campo.horaLibre && horaElegida && (
              <div className="row" style={{ gap: 9, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <select className="input" style={{ maxWidth: 132 }} value={horaElegida}
                  title="Hora exacta a la que sale, en formato de 24 horas."
                  onChange={e => set(campo.id, HORA_PREFIJO + e.target.value)}>
                  {HORAS_24.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <span className="tiny muted">Hora exacta, en formato de 24 horas (00:00 a 23:30).</span>
              </div>
            )}
            {(campo.ventanaEnvio && (horaElegida || horaDiaElegida) && fueraDeVentana(horaElegida || horaDiaElegida)) && (
              <div className="tiny row" style={{ gap: 7, marginTop: 8, alignItems: 'flex-start', color: 'var(--amber)' }}>
                <I_Cal size={14} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  Las <b>{horaElegida || horaDiaElegida}</b> quedan fuera de la ventana de 8:00 a 22:00 que
                  usa el motor cuando elige él. Como la eligió usted, sale a esa hora.
                </span>
              </div>
            )}
            <div className="tiny muted" style={{ marginTop: 6 }}>{campo.ayuda}</div>
          </>
        )}
      </div>
    );
  });

  // ---------------------------------------------------------------------------------------------
  // LAS CUENTAS DEL NEGOCIO — la lista, su estado y sus acciones, todo contra el back.
  //
  // La lista sale de GET /api/integraciones (una sola consulta para todas las redes): acá se recorre tal
  // cual llega, sin fijar a mano cuántas son, cuáles están conectadas ni con qué nombre. El nombre y el
  // identificador que se ven en cada fila son los que devolvió el back: si un identificador no viene, se
  // muestra el nombre de la red y su estado, y no se inventa nada. Las acciones llaman a la ruta REAL de
  // esa red (empezar / sincronizar / desconectar); una red que no se puede conectar por ninguna vía no
  // recibe el botón, porque no habría ruta que llamar.
  // ---------------------------------------------------------------------------------------------
  const redes: IntegracionRed[] = integraciones?.redes ?? [];
  const conectadas = redes.filter(r => !!r.cuenta);

  /** El ícono de cada red, por su nombre técnico. Una red que no esté en la lista sale con el ícono de
   *  enlace: nunca sin ícono y nunca con el de otra red. */
  const ICONO_RED: Record<string, string> = {
    instagram: '📸', facebook: '👍', meta_ads: '📣', whatsapp: '💬', tiktok: '🎵',
    youtube: '📺', email: '✉️', tienda: '🛒', google: '🔎', pixel: '📊', bundle: '🔗',
  };
  const emojiDeRed = (red: string) => ICONO_RED[red] || '🔗';

  /** ¿Esta red se puede conectar hoy? Con su app propia cargada en el servidor, o por bundle.social. */
  const sePuedeConectar = (r: IntegracionRed) => r.configurado || !!r.viaBundle;

  /** Una llamada a las rutas reales de una red, con el token de la sesión. El PIN va en el cuerpo sólo
   *  cuando la acción es sensible y el back lo pide. */
  const accionRed = async (red: string, accion: 'empezar' | 'sincronizar' | 'desconectar', pin?: string) => {
    const r = await fetch(baseApi() + `/api/integraciones/${encodeURIComponent(red)}/${accion}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token() },
      ...(pin ? { body: JSON.stringify({ pin }) } : {}),
    });
    const cuerpo = await r.json().catch(() => ({})) as {
      url?: string; error?: string; detalle?: string; codigo?: string; que_hizo?: string; pin_requerido?: boolean;
    };
    return { ok: r.ok, cuerpo };
  };

  /** ¿El back está pidiendo el PIN de seguridad para dejar pasar esta acción? */
  const pideElPin = (cuerpo: { codigo?: string; pin_requerido?: boolean }) =>
    cuerpo.pin_requerido === true || cuerpo.codigo === 'pin_necesario';

  /** Conectar: el back devuelve la dirección del proveedor y el navegador se va para allá. La red queda
   *  anotada para que la vuelta sepa a cuál pertenece el código. Acá no se marca nada «conectado»: eso lo
   *  dice el back cuando la cuenta quedó guardada. */
  const conectarRed = async (red: string, nombre: string) => {
    setTrabajando({ red, accion: 'conectar' });
    try {
      const { ok, cuerpo } = await accionRed(red, 'empezar');
      if (ok && cuerpo.url) {
        recordarRed(red);
        setToast(`${nombre} le va a pedir el permiso: cuando autorice, su cuenta queda conectada y aparece acá con su nombre real`);
        window.location.href = cuerpo.url;
      } else {
        setToast(cuerpo.error || `No se pudo empezar la conexión con ${nombre}: el servidor respondió con un error`);
      }
    } catch { setToast(`No se pudo hablar con el servidor: la conexión con ${nombre} no arrancó`); }
    setTrabajando(null);
  };

  /** Sincronizar: el back lee los datos de esa red y calibra el público. Después se relee todo para que
   *  la pantalla muestre lo que quedó en el servidor. */
  const sincronizarRed = async (red: string, nombre: string) => {
    setTrabajando({ red, accion: 'sincronizar' });
    try {
      const { ok, cuerpo } = await accionRed(red, 'sincronizar');
      if (ok) setToast([cuerpo.que_hizo, cuerpo.detalle].filter(Boolean).join(': ') || `${nombre} sincronizó con el servidor`);
      else setToast(cuerpo.error || `No se pudo sincronizar ${nombre}: el servidor respondió con un error`);
    } catch { setToast('No se pudo sincronizar: el servidor no respondió'); }
    await datos.refrescar();
    setTrabajando(null);
  };

  /** Desconectar: el back borra la conexión guardada. Es una acción sensible: si el negocio tiene PIN, el
   *  back lo pide, se pide acá y se reintenta sola con el PIN ya verificado. */
  const desconectarRed = async (red: string, nombre: string) => {
    setTrabajando({ red, accion: 'desconectar' });
    try {
      const primero = await accionRed(red, 'desconectar');
      let salio = primero;
      let cancelado = false;
      if (!primero.ok && pideElPin(primero.cuerpo)) {
        const pin = await seguridad.pedirPin(`Para desconectar una cuenta le pedimos su PIN de seguridad. ${nombre} va a quedar desconectado del motor.`);
        if (pin) salio = await accionRed(red, 'desconectar', pin);
        else cancelado = true;
      }
      if (cancelado) setToast(`${nombre} sigue conectado: no se desconectó nada`);
      else if (salio.ok) setToast(`${nombre} quedó desconectado: el back lo dice y no se frena nada de lo que ya corre`);
      else setToast(salio.cuerpo.error || `No se pudo desconectar ${nombre}: el servidor respondió con un error`);
    } catch { setToast('No se pudo desconectar: el servidor no respondió'); }
    await datos.refrescar();
    setTrabajando(null);
  };

  /** Un conteo del back, tal cual llegó; «sin leer» cuando esa lectura no trajo nada. Un cero no es lo
   *  mismo que no haber leído: acá no se reemplaza uno por el otro. */
  const conteo = (n: number | undefined) => (typeof n === 'number' ? String(n) : 'sin leer');

  /** El freno de las cuentas, con el número que devolvió el back. Sin esa lectura no se afirma ninguna
   *  cifra: se dice lo único que consta. */
  const frenoDeCuentas = typeof integraciones?.resumen?.conectadas === 'number'
    ? `Hoy tiene ${integraciones.resumen.conectadas} ${integraciones.resumen.conectadas === 1 ? 'cuenta conectada' : 'cuentas conectadas'} y el sistema todavía no publica en las redes: cuando eso funcione, en las que falten no va a salir nada.`
    : 'El sistema todavía no publica en las redes. Sólo va a trabajar con las cuentas que usted conecte: en las que falten, no va a salir nada.';

  return (
    <>
      {/* ==================== FILA 1: QUÉ PUBLICAR Y CON QUÉ MATERIAL ==================== */}
      <div className="duo">
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Megaphone size={14} style={{ color: 'var(--purple3)' }} /> 1 · ¿Qué quiere publicar?</span>}
          action={<Badge tone="purple">{formato.icono} {formato.nombre}</Badge>}
        >
          <div className="fmt-grid">
            {FORMATOS.map(f => (
              <button key={f.key} type="button" className={`fmt-card ${formatoKey === f.key ? 'sel' : ''}`}
                title={`Publicar como «${f.nombre}»: ${f.resumen}`}
                style={formatoKey === f.key ? { borderColor: f.color + '99' } : undefined}
                onClick={() => setFormatoKey(f.key)}>
                <span className="fmt-ico" style={{ color: f.color }}>{f.icono}</span>
                <span className="fmt-nm">{f.nombre}</span>
                <span className="fmt-rs">{f.resumen}</span>
              </button>
            ))}
          </div>

          <div className="bs">{formato.paraQue}</div>

          {formato.conObjetivo && (
            <div>
              <label className="label">Objetivo <span style={{ opacity: .55, fontWeight: 400 }}>(define la estrategia y cómo se mide)</span></label>
              <div className="tipo-chips">
                {TIPOS_CAMPANA.map(t => (
                  <button key={t.key} type="button" title={`Se mide por ${t.kpi}`}
                    className={`tipo-chip ${objetivo === t.key ? 'sel' : ''}`}
                    onClick={() => setObjetivo(t.key)}>
                    <span>{t.icono}</span>{t.nombre.replace('Campaña de ', '').replace(' / ', '/')}
                  </button>
                ))}
              </div>
              <div className="tipo-preview" style={{ borderColor: tipo.color + '55', marginTop: 10 }}>
                <div className="tipo-preview-head"><span>{tipo.icono}</span><b>{tipo.nombre}</b></div>
                <div className="tiny muted" style={{ lineHeight: 1.6 }}>
                  <b style={{ color: 'var(--txt)' }}>Estrategia:</b> {tipo.estrategia}<br />
                  <b style={{ color: 'var(--txt)' }}>Audiencia:</b> {tipo.audiencia}<br />
                  <b style={{ color: 'var(--txt)' }}>Tono:</b> {tipo.tono}<br />
                  <b style={{ color: 'var(--txt)' }}>Formatos:</b> {tipo.formato}<br />
                  <b style={{ color: 'var(--txt)' }}>Se mide por:</b> {tipo.kpi}
                </div>
              </div>
              {/* La aclaración va DENTRO del bloque del objetivo: explica el control que está en
                  pantalla. Antes estaba al pie de la tarjeta y se mostraba también en las 6 formas
                  de publicar que NO tienen objetivo, donde hablaba de un «tipo» que no existía. */}
              <div className="acc-why">
                El <b>objetivo define el mensaje y la audiencia</b>: una campaña de recuperación de
                carrito y una de posicionamiento de marca requieren mensajes distintos, aunque el
                producto sea el mismo.
              </div>
            </div>
          )}

          {camposFormato(formato.campos)}

          {/* La letra chica del modelo, cuando la forma de publicar la necesita. Va aquí, pegada a
              los campos que la explican, y no en el pie de la tarjeta. */}
          {formato.nota && <div className="acc-why">{formato.nota}</div>}

          {formato.avanzados && (
            <div className="mat-sec">
              <div className="mat-sec-head" onClick={() => setAvanzados(!avanzados)}>
                <span className="mat-sec-t">Opcional: mientras más sepa, mejor sale</span>
                <span className="row" style={{ gap: 8 }}>
                  <span className="tiny muted">{formato.avanzados.length} campos</span>
                  {avanzados ? <I_ChevUp size={14} /> : <I_ChevDn size={14} />}
                </span>
              </div>
              {avanzados && <div className="mat-sec-body">{camposFormato(formato.avanzados)}</div>}
            </div>
          )}

        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Upload size={14} style={{ color: 'var(--purple3)' }} /> 2 · Su material real</span>}
          action={<Badge tone={cargados > 0 ? 'green' : 'amber'}>{cargados} de {totalCampos} cargados</Badge>}
        >
          <div className="bs">
            Esto es lo que hace la diferencia: el motor <b>usa sus fotos, sus videos y sus precios de verdad</b>,
            no inventa. Puede subir lo que tenga y después sumar más.
          </div>
          <div className="grow-list">
          {MATERIAL.map(campo => (
            <div key={campo.id} className="mat-campo">
              <label className="label">{campo.etiqueta}</label>
              {cargador(campo, campo.tipo as 'imagenes' | 'videos' | 'media' | 'archivos', campo.ayuda)}
              {carpetaDe(campo)}
            </div>
          ))}
          </div>
          {/* Los conteos salen del back: la carpeta (GET /api/archivos) y el resumen de su negocio
              (GET /api/negocio). Antes acá había tres cifras escritas a mano —24, 31 y «listo»— que no
              las había producido nadie. Sin back no hay nada que contar, y el bloque no se dibuja. */}
          {datos.real && (
            <div>
              <div className="bs" style={{ marginBottom: 9 }}>Lo que el motor ya tiene de su negocio:</div>
              <div className="guards">
                <div className="guard"><I_Check size={14} style={{ color: 'var(--green)', flexShrink: 0 }} /><span className="guard-lb">Archivos suyos en su carpeta<small>los que subió y siguen en el servidor</small></span><span className="guard-val">{archivos.length}</span></div>
                <div className="guard"><I_Check size={14} style={{ color: 'var(--green)', flexShrink: 0 }} /><span className="guard-lb">Piezas que el motor ya evaluó<small>de las corridas guardadas en su cuenta</small></span><span className="guard-val">{conteo(datos.resumen?.evaluaciones)}</span></div>
                <div className="guard"><I_Check size={14} style={{ color: 'var(--green)', flexShrink: 0 }} /><span className="guard-lb">Conversaciones que ya leyó<small>las que están en su cuenta, no un ejemplo</small></span><span className="guard-val">{conteo(datos.resumen?.conversaciones)}</span></div>
              </div>
            </div>
          )}
          <div className="acc-why">
            Si no sube nada, el motor <b>igual arranca</b>: usa lo que aprendió de su negocio en el onboarding
            y lo que encontró en el mercado. Pero con material real el resultado es otro.
          </div>
        </Card>
      </div>

      {/* ==================== FILA 2: EL FLUJO DE MIROFISH ==================== */}
      {/* El flujo (investigar/crear/votar) NO va aquí: vive en el paso de MiroFish.
          Si esto se renderiza en la pantalla de ingesta, el usuario ve el proceso dos veces. */}
      {!soloIngesta && (
        <FlujoMiroFish modo={modo} setToast={setToast} esAnuncio={formato.key === 'anuncio'} />
      )}

      {/* ==================== LO QUE NO SE PUBLICA ==================== */}
      {!soloIngesta && (
      <div className="duo" style={{ marginTop: 16 }}>
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Chat size={14} style={{ color: 'var(--green)' }} /> Esto no se publica: trabaja solo</span>}
          action={<Badge tone="green">automático</Badge>}
        >
          <div className="bs">
            No todo lo que hace el motor es una publicación. Esto se dispara solo cuando el cliente hace algo,
            por eso no se "crea": se activa una vez y queda funcionando.
          </div>
          {NO_SE_PUBLICA.map(t => (
            <div key={t} className="nrow">
              <span style={{ color: 'var(--green)', display: 'flex', flexShrink: 0 }}><I_Check size={15} /></span>
              <span className="nrow-lb">{t}</span>
            </div>
          ))}
          <div className="row" style={{ gap: 9, marginTop: 4, flexWrap: 'wrap' }}>
            <Button variant="outline" className="btn-sm" title="Abre Conversaciones, donde viven y se ajustan estas automatizaciones"
              onClick={irAConversaciones}><I_ArrowRight size={13} /> Ver mis automatizaciones</Button>
          </div>
          <div className="acc-why">
            Se separan a propósito: si esto viviera en campañas, tendría que "crear" algo que en realidad
            <b> se configura una vez y trabaja para siempre</b>.
          </div>
        </Card>

        {/* ==================== CON QUÉ CUENTAS TRABAJA ====================
            Todo lo que se ve acá sale del back (GET /api/integraciones): su nombre, su identificador, su
            estado y la ruta real que ejecuta cada botón. Acá no hay ninguna cuenta escrita a mano. */}
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Users size={14} style={{ color: 'var(--purple3)' }} /> Con qué cuentas lo publica</span>}
          action={<Badge tone={integraciones && integraciones.resumen.conectadas > 0 ? 'green' : 'muted'}>
            {integraciones ? `${integraciones.resumen.conectadas} de ${integraciones.resumen.total} conectadas` : 'sin leer'}
          </Badge>}
        >
          <div className="bs">
            El motor <b>trabaja con sus cuentas, no con las nuestras</b>: conectarlas es lo que le deja leer
            sus datos —lo que le va a servir para armar las piezas— y cada conexión es suya, revocable desde
            Cuenta y autonomía. <b>Conectar una cuenta no publica nada:</b> el sistema todavía no publica en
            las redes, y cuando eso funcione nada va a salir sin su OK. Acá abajo se ve lo que el back tiene
            guardado, no una lista de ejemplo.
          </div>

          {!integraciones ? (
            /* Sin back no hay cuenta que leer, y si el back está encendido pero no respondió se dice eso:
               en los dos casos se nombra lo que pasa, no se dibuja ninguna cuenta inventada. */
            datos.real ? (
              <EstadoVacio
                {...(datos.cargando
                  ? { titulo: 'Leyendo sus conexiones…', texto: 'El panel está leyendo el estado de sus conexiones en su cuenta. Mientras lee no afirma nada: si no hay ninguna conectada, lo dice enseguida.' }
                  : { titulo: 'No se pudo leer el estado de las conexiones', texto: 'El servidor no respondió a la lectura de sus cuentas. Vuelva a leerlo y aparece tal como está: esta pantalla no dibuja una cuenta que nadie conectó.' })}
                {...(datos.cargando ? {} : { accion: 'Volver a leer', onAccion: () => void datos.refrescar() })} />
            ) : (
              <EstadoVacio
                titulo="Todavía no hay conexiones que leer"
                texto="Acá aparecen las cuentas de su negocio con el nombre y el dato que devuelva el back, cada una con sus botones de sincronizar y desconectar. Todavía no se leyó su cuenta, así que no hay ninguna fila que mostrar." />
            )
          ) : redes.length === 0 ? (
            /* El back respondió y no mandó ninguna red: se dice eso, sin dibujar filas inventadas. */
            <EstadoVacio
              titulo="El servidor todavía no mandó redes para conectar"
              texto="Cuando el back devuelva sus redes conectables, cada una aparece acá con su nombre, su estado y —si está conectada— su cuenta. Devolvió la lista vacía."
              accion="Volver a leer" onAccion={() => void datos.refrescar()} />
          ) : (
            <>
              {conectadas.length === 0 && (
                <EstadoVacio
                  titulo="Ninguna cuenta conectada todavía"
                  texto={`El back trae ${redes.length} redes conectables y ninguna cuenta conectada a su nombre: el motor no tiene de dónde leer sus datos. Conecte la que necesite —acá abajo está el botón de las que se pueden conectar hoy— y aparece con el nombre real que devuelva el back.`} />
              )}
              {redes.map(r => {
                const cuenta = r.cuenta;
                const enCurso = trabajando?.red === r.red ? trabajando.accion : '';
                const falta = r.falta?.length ? r.falta : [];
                // El identificador es el que devolvió el back (su nombre de cuenta o su id externo). Si no
                // vino ninguno, NO se inventa: queda el nombre de la red con su estado y nada más.
                const identificador = cuenta ? (cuenta.nombre || cuenta.external_id || '') : '';
                return (
                  <div key={r.red} className="guard">
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{emojiDeRed(r.red)}</span>
                    <span className="guard-lb">
                      {r.nombre}
                      <small>{cuenta
                        ? (identificador
                          ? `${identificador} · ${cuenta.estado || 'conectada'}`
                          : `sin identificador en el back · ${cuenta.estado || 'conectada'}`)
                        : r.rol}</small>
                    </span>
                    <Badge tone={cuenta ? 'green' : sePuedeConectar(r) ? 'muted' : 'red'}>
                      {cuenta ? 'conectada' : sePuedeConectar(r) ? 'sin conectar' : 'falta configurar'}
                    </Badge>
                    {/* Los botones son las rutas reales de ESA red. Una red que no se puede conectar por
                        ninguna vía no recibe el botón: no habría ruta a la que llamar. */}
                    {cuenta ? (
                      <>
                        <Button variant="ghost" className="btn-sm" disabled={trabajando !== null}
                          title={`Lee los datos de ${r.nombre} con el permiso que ya está guardado en el servidor (POST /api/integraciones/${r.red}/sincronizar). Al terminar dice qué hizo; si la red no devuelve nada, lo dice.`}
                          onClick={() => void sincronizarRed(r.red, r.nombre)}>
                          <I_Refresh size={13} /> {enCurso === 'sincronizar' ? 'Leyendo…' : 'Sincronizar'}
                        </Button>
                        <Button variant="ghost" className="btn-sm" disabled={trabajando !== null}
                          title={`Borra la conexión de ${r.nombre} guardada en el servidor (POST /api/integraciones/${r.red}/desconectar). Es reversible: se vuelve a conectar con el mismo paso. Si su negocio tiene PIN, el back lo pide.`}
                          onClick={() => void desconectarRed(r.red, r.nombre)}>
                          <I_X size={13} /> {enCurso === 'desconectar' ? 'Desconectando…' : 'Desconectar'}
                        </Button>
                      </>
                    ) : !sePuedeConectar(r) ? (
                      /* Ni su app propia en el servidor ni bundle.social: acá se nombra lo que falta y no
                         se ofrece un botón que no puede funcionar. */
                      <span className="tiny" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--amber)', fontWeight: 700 }}>
                        <I_Lock size={12} /> no se puede conectar todavía{falta.length ? `: falta ${falta.join(', ')}` : ''}
                      </span>
                    ) : r.tipo === 'token' ? (
                      /* Las redes por clave (WhatsApp, correo, tienda, píxel) ya tienen su clave en el
                         servidor: no hay permiso que pedir, sólo falta la primera lectura. */
                      <Button variant="ghost" className="btn-sm" disabled={trabajando !== null}
                        title={`Lee los datos de ${r.nombre} con la clave que ya está cargada en el servidor (POST /api/integraciones/${r.red}/sincronizar). El panel nunca muestra ni pide esa clave.`}
                        onClick={() => void sincronizarRed(r.red, r.nombre)}>
                        <I_Refresh size={13} /> {enCurso === 'sincronizar' ? 'Leyendo…' : 'Probar y sincronizar'}
                      </Button>
                    ) : (
                      <Button variant="ghost" className="btn-sm" disabled={trabajando !== null}
                        title={r.viaBundle
                          ? `Conecta ${r.nombre}: abre la pantalla de bundle.social, donde el dueño de la cuenta da el permiso (POST /api/integraciones/${r.red}/empezar). El token queda en el servidor: esta pantalla nunca lo ve.`
                          : `Conecta ${r.nombre}: el permiso lo da el dueño de la cuenta en ${r.nombre} (POST /api/integraciones/${r.red}/empezar). El token queda en el servidor: esta pantalla nunca lo ve.`}
                        onClick={() => void conectarRed(r.red, r.nombre)}>
                        <I_Link size={13} /> {enCurso === 'conectar' ? 'Abriendo…' : 'Conectar'}
                      </Button>
                    )}
                  </div>
                );
              })}
              <div className="row" style={{ gap: 9, marginTop: 10, flexWrap: 'wrap' }}>
                <Button variant="ghost" className="btn-sm" title="Le muestra los frenos con los que trabaja el motor, uno por uno"
                  onClick={() => detalle({
                    titulo: 'Los límites con los que trabaja el motor',
                    sub: 'Son frenos que el motor respeta siempre, aunque su recomendación sea otra. No se desactivan desde aquí: se cambian en Cuenta y autonomía.',
                    bloques: [
                      { tipo: 'filas', items: [
                        { t: 'No trabaja de noche', s: 'Escribe entre las 8:00 y las 22:00. Si usted elige una hora de madrugada, se respeta la suya igual.', etiqueta: 'activo', tono: 'green' },
                        { t: 'Un mensaje por persona por día', s: 'Nadie recibe dos mensajes el mismo día, aunque se crucen dos automatizaciones.', etiqueta: 'activo', tono: 'green' },
                        { t: 'No toca su presupuesto sin permiso', s: 'Puede sugerir subirlo o bajarlo, pero no lo mueve solo.', etiqueta: 'activo', tono: 'green' },
                        { t: 'No trabaja sin las cuentas conectadas', s: frenoDeCuentas, etiqueta: 'activo', tono: 'green' },
                        { t: 'No gasta sin pasar el panel', s: 'Cada pieza pasa por los 5 jueces y los 500 del público antes de que usted la apruebe.', etiqueta: 'activo', tono: 'green' },
                      ] },
                      { tipo: 'aviso', texto: 'Estos frenos son lo que hace que pueda dejarlo trabajando sin mirarlo. Si uno se puede desactivar, la pantalla se lo dice antes de que lo haga.' },
                    ],
                    fuente: 'Cuenta y autonomía. Se aplican a todas las campañas, no a una sola.',
                  })}>Ver los límites</Button>
              </div>
              <div className="acc-why">
                El motor respeta sus frenos: <b>no trabaja de noche</b>, no manda más de un mensaje por persona
                por día y no toca el presupuesto sin permiso. Y el número de cuentas conectadas de arriba es
                el que devolvió el back, no un ejemplo.
              </div>
            </>
          )}
        </Card>
      </div>
      )}
    </>
  );
}

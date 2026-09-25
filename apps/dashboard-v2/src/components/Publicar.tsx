import { useMemo, useState } from 'react';
import { Card, Badge, Button } from './ui';
import {
  I_Megaphone, I_Upload, I_Image, I_Film, I_File, I_Link, I_Check, I_ArrowRight, I_Trash,
  I_ChevDn, I_ChevUp, I_Users, I_Chat,
  I_Cal,
} from './icons';
import { FlujoMiroFish } from './FlujoMiroFish';
import { TIPOS_CAMPANA, type ObjetivoCampana } from '../data/campana';
import { FORMATOS, MATERIAL, NO_SE_PUBLICA, type CampoPublicacion, type FormatoKey } from '../data/publicaciones';
import type { Modo } from '../data/demo';
import { CARPETA } from '../data/demo';
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
  const [formatoKey, setFormatoKey] = useState<FormatoKey>('anuncio');
  const [objetivo, setObjetivo] = useState<ObjetivoCampana>('ventas');
  const [valores, setValores] = useState<Record<string, Valor>>({});
  const [material, setMaterial] = useState<Record<string, Archivo[]>>({});
  const [avanzados, setAvanzados] = useState(false);
  const detalle = useDetalle();
  // Conectar una red se ve en la lista de abajo y se puede deshacer: es su cuenta, no la nuestra.
  const [tiktokConectado, setTiktokConectado] = useState(false);

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

  /** La carpeta del negocio: lo que ya subió antes, para sumarlo a esta campaña sin volver a subirlo. */
  const carpetaDe = (campo: CampoPublicacion) => {
    const yaEsta = CARPETA[campo.id] || [];
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
          <div>
            <div className="bs" style={{ marginBottom: 9 }}>Lo que el motor ya tiene de su negocio:</div>
            <div className="guards">
              <div className="guard"><I_Check size={14} style={{ color: 'var(--green)', flexShrink: 0 }} /><span className="guard-lb">Su catálogo y sus precios<small>leídos del onboarding y de su tienda conectada</small></span><span className="guard-val">24</span></div>
              <div className="guard"><I_Check size={14} style={{ color: 'var(--green)', flexShrink: 0 }} /><span className="guard-lb">Fotos y videos que ya subió<small>de las piezas que el motor publicó antes</small></span><span className="guard-val">31</span></div>
              <div className="guard"><I_Check size={14} style={{ color: 'var(--green)', flexShrink: 0 }} /><span className="guard-lb">Su tono y su público<small>aprendido de sus conversaciones reales, no de un formulario</small></span><span className="guard-val">listo</span></div>
            </div>
          </div>
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

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Users size={14} style={{ color: 'var(--purple3)' }} /> Con qué cuentas lo publica</span>}
          action={<Badge tone="green">{tiktokConectado ? 4 : 3} conectadas</Badge>}
        >
          <div className="bs">
            El motor publica <b>en sus cuentas, no en las nuestras</b>. Cada conexión es suya y la puede revocar
            cuando quiera desde Cuenta y autonomía.
          </div>
          {[
            { n: 'Instagram', c: '@skincare.natural', e: '📸', ok: true },
            { n: 'Facebook', c: 'Skincare Natural', e: '👍', ok: true },
            { n: 'WhatsApp', c: '+57 300 555 2341', e: '💬', ok: true },
            { n: 'TikTok', c: tiktokConectado ? '@skincare.natural' : 'sin conectar', e: '🎵', ok: tiktokConectado },
          ].map(x => (
            <div key={x.n} className="guard">
              <span style={{ fontSize: 16, flexShrink: 0 }}>{x.e}</span>
              <span className="guard-lb">{x.n}<small>{x.c}</small></span>
              <Badge tone={x.ok ? 'green' : 'muted'}>{x.ok ? 'conectada' : 'por conectar'}</Badge>
            </div>
          ))}
          <div className="row" style={{ gap: 9, marginTop: 4, flexWrap: 'wrap' }}>
            {tiktokConectado ? (
              <Button variant="outline" className="btn-sm" title="Desconecta TikTok de este panel. Reversible: la puede volver a conectar cuando quiera, y el motor deja de publicar ahí al instante."
                onClick={() => { setTiktokConectado(false); setToast('TikTok desconectado: el motor ya no publica ahí'); }}>
                Desconectar TikTok
              </Button>
            ) : (
              <Button variant="ghost" className="btn-sm" title="Conecta TikTok con su cuenta: el motor va a poder publicar ahí. Reversible desde aquí mismo o desde Cuenta y autonomía."
                onClick={() => { setTiktokConectado(true); setToast('TikTok conectado: ahora el motor publica en 4 redes'); }}>
                Conectar otra red
              </Button>
            )}
            <Button variant="ghost" className="btn-sm" title="Le muestra los frenos con los que publica el motor, uno por uno"
              onClick={() => detalle({
                titulo: 'Los límites con los que publica el motor',
                sub: 'Son frenos que el motor respeta siempre, aunque su recomendación sea otra. No se desactivan desde aquí: se cambian en Cuenta y autonomía.',
                bloques: [
                  { tipo: 'filas', items: [
                    { t: 'No publica de noche', s: 'Escribe entre las 8:00 y las 22:00. Si usted elige una hora de madrugada, sale igual: su hora manda.', etiqueta: 'activo', tono: 'green' },
                    { t: 'Un mensaje por persona por día', s: 'Nadie recibe dos mensajes el mismo día, aunque se crucen dos automatizaciones.', etiqueta: 'activo', tono: 'green' },
                    { t: 'No toca su presupuesto sin permiso', s: 'Puede sugerir subirlo o bajarlo, pero no lo mueve solo.', etiqueta: 'activo', tono: 'green' },
                    { t: 'No publica sin las cuentas conectadas', s: `Hoy hay ${tiktokConectado ? 4 : 3} redes conectadas: en las que faltan, no publica.`, etiqueta: 'activo', tono: 'green' },
                    { t: 'No gasta sin pasar el panel', s: 'Cada pieza pasa por los 5 jueces y los 500 del público antes de salir.', etiqueta: 'activo', tono: 'green' },
                  ] },
                  { tipo: 'aviso', texto: 'Estos frenos son lo que hace que pueda dejarlo trabajando sin mirarlo. Si uno se puede desactivar, la pantalla se lo dice antes de que lo haga.' },
                ],
                fuente: 'Cuenta y autonomía → Frenos de publicación. Se aplican a todas las campañas, no a una sola.',
              })}>Ver los límites</Button>
          </div>
          <div className="acc-why">
            El motor respeta sus frenos: <b>no publica de noche</b>, no manda más de un mensaje por persona por día
            y no toca el presupuesto sin permiso.
          </div>
        </Card>
      </div>
      )}
    </>
  );
}

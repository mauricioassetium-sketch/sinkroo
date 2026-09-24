import { useMemo, useState } from 'react';
import { Card, Badge, Button, Avatar } from './ui';
import {
  I_Megaphone, I_Upload, I_Image, I_Film, I_File, I_Link, I_Check, I_ArrowRight, I_Trash,
  I_ChevDn, I_ChevUp, I_Users, I_Chat, I_Search, I_Filter, I_Robot, I_Star, I_Globe, I_Refresh, I_User,
} from './icons';
import { FlujoMiroFish } from './FlujoMiroFish';
import { TIPOS_CAMPANA, type ObjetivoCampana } from '../data/campana';
import { FORMATOS, MATERIAL, NO_SE_PUBLICA, type CampoPublicacion, type FormatoKey } from '../data/publicaciones';
import { CREADORES, RUBROS_CREADOR, CONTENIDOS_CREADOR, OPCIONES_IDIOMA, TENANT, type Creador, type Modo } from '../data/demo';

type Archivo = { nombre: string; peso: string; url: string | null; esImagen: boolean };
type Valor = string | string[];

function IconoCampo({ tipo }: { tipo: CampoPublicacion['tipo'] }) {
  if (tipo === 'imagenes') return <I_Image size={17} />;
  if (tipo === 'videos') return <I_Film size={17} />;
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

  const formato = FORMATOS.find(f => f.key === formatoKey)!;
  const tipo = TIPOS_CAMPANA.find(t => t.key === objetivo)!;

  const set = (id: string, v: Valor) => setValores(prev => ({ ...prev, [id]: v }));

  const toggle = (id: string, op: string) => {
    const actual = (valores[id] as string[]) || [];
    set(id, actual.includes(op) ? actual.filter(x => x !== op) : [...actual, op]);
  };

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

  const subir = (campo: CampoPublicacion, files: FileList | null) => {
    if (!files || !files.length) return;
    const items: Archivo[] = Array.from(files).map(f => ({
      nombre: f.name,
      peso: f.size > 1048576 ? (f.size / 1048576).toFixed(1) + ' MB' : Math.round(f.size / 1024) + ' KB',
      url: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
      esImagen: f.type.startsWith('image/'),
    }));
    setMaterial(m => ({ ...m, [campo.id]: [...(m[campo.id] || []), ...items] }));
    setToast(`${items.length} archivo${items.length > 1 ? 's' : ''} subido${items.length > 1 ? 's' : ''} a «${campo.etiqueta.replace(/^\S+\s/, '')}»`);
  };

  const quitar = (id: string, i: number) =>
    setMaterial(m => ({ ...m, [id]: (m[id] || []).filter((_, ix) => ix !== i) }));

  const camposFormato = (campos: CampoPublicacion[]) => campos.map(campo => {
    const v = valores[campo.id];
    return (
      <div key={campo.id} className="mat-campo">
        <label className="label">{campo.etiqueta}</label>
        {campo.tipo === 'texto' ? (
          <textarea className="input" rows={((v as string) || '').length > 60 ? 3 : 2} placeholder={campo.ayuda}
            value={(v as string) || ''} onChange={e => set(campo.id, e.target.value)} />
        ) : campo.tipo === 'link' ? (
          <input className="input" placeholder={campo.ayuda} value={(v as string) || ''} onChange={e => set(campo.id, e.target.value)} />
        ) : campo.tipo === 'numero' ? (
          <input className="input" style={{ maxWidth: 140 }} placeholder="0" value={(v as string) || ''} onChange={e => set(campo.id, e.target.value)} />
        ) : (
          <>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              {(campo.opciones || []).map(op => {
                const activo = campo.multi ? ((v as string[]) || []).includes(op) : v === op;
                return (
                  <button key={op} type="button" className={`tipo-chip ${activo ? 'sel' : ''}`}
                    onClick={() => campo.multi ? toggle(campo.id, op) : set(campo.id, activo ? '' : op)}>
                    {activo ? '✓ ' : ''}{op}
                  </button>
                );
              })}
            </div>
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
          title={<span className="row" style={{ gap: 8 }}><I_Megaphone size={14} style={{ color: 'var(--purple3)' }} /> 1 · ¿Qué querés publicar?</span>}
          action={<Badge tone="purple">{formato.icono} {formato.nombre}</Badge>}
        >
          <div className="fmt-grid">
            {FORMATOS.map(f => (
              <button key={f.key} type="button" className={`fmt-card ${formatoKey === f.key ? 'sel' : ''}`}
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

          {formato.avanzados && (
            <div className="mat-sec">
              <div className="mat-sec-head" onClick={() => setAvanzados(!avanzados)}>
                <span className="mat-sec-t">Opcional: mientras más sepas, mejor sale</span>
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
          title={<span className="row" style={{ gap: 8 }}><I_Upload size={14} style={{ color: 'var(--purple3)' }} /> 2 · Tu material real</span>}
          action={<Badge tone={cargados > 0 ? 'green' : 'amber'}>{cargados} de {totalCampos} cargados</Badge>}
        >
          <div className="bs">
            Esto es lo que hace la diferencia: el motor <b>usa tus fotos, tus videos y tus precios de verdad</b>,
            no inventa. Podés subir lo que tengas y después sumar más.
          </div>
          <div className="grow-list">
          {MATERIAL.map(campo => {
            const archivos = material[campo.id] || [];
            return (
              <div key={campo.id} className="mat-campo">
                <label className="label">{campo.etiqueta}</label>
                <label className="dropzone">
                  <span style={{ color: 'var(--purple3)' }}><IconoCampo tipo={campo.tipo} /></span>
                  <span className="small" style={{ fontWeight: 700 }}>
                    {campo.tipo === 'imagenes' ? 'Subir imágenes' : campo.tipo === 'videos' ? 'Subir videos' : 'Subir archivos'}
                  </span>
                  <span className="tiny muted">{campo.ayuda}</span>
                  <input type="file" multiple
                    accept={campo.tipo === 'imagenes' ? 'image/*' : campo.tipo === 'videos' ? 'video/*' : '*/*'}
                    style={{ display: 'none' }} onChange={e => subir(campo, e.target.files)} />
                </label>
                {archivos.length > 0 && (
                  <div className="mat-thumbs">
                    {archivos.map((f, i) => (
                      <div key={i} className="mat-thumb">
                        {f.esImagen && f.url
                          ? <img src={f.url} alt={f.nombre} />
                          : <span className="mat-thumb-ico">{f.esImagen ? <I_Image size={18} /> : <I_Film size={18} />}</span>}
                        <span className="mat-thumb-n" title={f.nombre}>{f.nombre}</span>
                        <span className="mat-thumb-p">{f.peso}</span>
                        <button className="mat-thumb-x" title="Quitar" onClick={() => quitar(campo.id, i)}><I_Trash size={12} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          </div>
          <div>
            <div className="bs" style={{ marginBottom: 9 }}>Lo que el motor ya tiene de tu negocio:</div>
            <div className="guards">
              <div className="guard"><I_Check size={14} style={{ color: 'var(--green)', flexShrink: 0 }} /><span className="guard-lb">Tu catálogo y tus precios<small>leídos del onboarding y de tu tienda conectada</small></span><span className="guard-val">24</span></div>
              <div className="guard"><I_Check size={14} style={{ color: 'var(--green)', flexShrink: 0 }} /><span className="guard-lb">Fotos y videos que ya subiste<small>de las piezas que el motor publicó antes</small></span><span className="guard-val">31</span></div>
              <div className="guard"><I_Check size={14} style={{ color: 'var(--green)', flexShrink: 0 }} /><span className="guard-lb">Tu tono y tu público<small>aprendido de tus conversaciones reales, no de un formulario</small></span><span className="guard-val">listo</span></div>
            </div>
          </div>
          <div className="acc-why">
            Si no subís nada, el motor <b>igual arranca</b>: usa lo que aprendió de tu negocio en el onboarding
            y lo que encontró en el mercado. Pero con material real el resultado es otro.
          </div>
        </Card>
      </div>

      {/* ==================== EL MERCADO DE CREADORES ====================
          Solo en la forma de publicar «Colaboración con creador»: ahí el dueño no tiene que
          saber un nombre, tiene que ELEGIR a alguien de una lista que el motor ya trajo. */}
      {formato.key === 'creador' && (
        <div style={{ marginTop: 16 }}>
          <BuscadorCreadores setToast={setToast} irAConversaciones={irAConversaciones} />
        </div>
      )}

      {/* ==================== FILA 2: EL FLUJO DE MIROFISH ==================== */}
      {/* El flujo (investigar/crear/votar) NO va acá: vive en el paso de MiroFish.
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
            por eso no se "crea": se activa una vez y queda andando.
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
            Se separan a propósito: si esto viviera en campañas, tendrías que "crear" algo que en realidad
            <b> se configura una vez y trabaja para siempre</b>.
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Users size={14} style={{ color: 'var(--purple3)' }} /> Con qué cuenta lo publicás</span>}
          action={<Badge tone="green">3 conectadas</Badge>}
        >
          <div className="bs">
            El motor publica <b>en tus cuentas, no en las nuestras</b>. Cada conexión es tuya y la podés revocar
            cuando quieras desde Cuenta y autonomía.
          </div>
          {[
            { n: 'Instagram', c: '@skincare.natural', e: '📸', ok: true },
            { n: 'Facebook', c: 'Skincare Natural', e: '👍', ok: true },
            { n: 'WhatsApp', c: '+54 9 11 5555-2341', e: '💬', ok: true },
            { n: 'TikTok', c: 'sin conectar', e: '🎵', ok: false },
          ].map(x => (
            <div key={x.n} className="guard">
              <span style={{ fontSize: 16, flexShrink: 0 }}>{x.e}</span>
              <span className="guard-lb">{x.n}<small>{x.c}</small></span>
              <Badge tone={x.ok ? 'green' : 'muted'}>{x.ok ? 'conectada' : 'por conectar'}</Badge>
            </div>
          ))}
          <div className="row" style={{ gap: 9, marginTop: 4, flexWrap: 'wrap' }}>
            <Button variant="ghost" className="btn-sm" title="Conectás una red más para que el motor pueda publicar ahí"
              onClick={() => setToast('Conectar TikTok (demo)')}>Conectar otra red</Button>
            <Button variant="ghost" className="btn-sm" title="Te muestra el horario y los límites con los que el motor puede publicar"
              onClick={() => setToast('Frenos de publicación (demo)')}>Ver los límites</Button>
          </div>
          <div className="acc-why">
            El motor respeta tus frenos: <b>no publica de noche</b>, no manda más de un mensaje por persona por día
            y no toca el presupuesto sin permiso.
          </div>
        </Card>
      </div>
      )}
    </>
  );
}

// =============================================================================================
// EL MERCADO DE CREADORES — el buscador del formato «Colaboración con creador».
//
// La idea del dueño, textual: «en este punto Sinkroo va a tener una sección de creadores…
// existirá un MERCADO entre creadores que pueden prestar sus servicios de contenido a las
// empresas que están publicando… agrega buscar creadores cercanos a tu posición, idioma, rubro,
// etc. Si vendés cremas, que salga un creador de ese índole, o UGC».
//
// Por eso, en este formato, el motor trabaja primero y el usuario elige después:
//   1. el motor ya buscó y armó una lista, con el por qué de cada candidato;
//   2. los filtros que importan —rubro, distancia, idioma, tipo de contenido, audiencia y precio—
//      son CHIPS predefinidos, nunca campos de texto libre (escribir a mano confunde), y al tocar
//      uno la lista se filtra de verdad;
//   3. cada creador viene en una tarjeta con lo que hace falta para decidir sin preguntar nada;
//   4. el círculo se cierra en Conversaciones: ahí Rumi negocia el precio, los plazos y qué se
//      entrega. La marca le paga a Sinkroo y Sinkroo le paga al creador EN DINERO, no en créditos.
//      Lo que produce el creador no pasa por ningún filtro previo: es su pieza, en su cuenta.
// =============================================================================================

type FiltroAudiencia = 'nano' | 'micro' | 'macro' | 'todas';

// Distancia desde tu local. 0 = sin límite, que es el estado con el que arranca el buscador.
const DISTANCIAS: { km: number; label: string; title: string }[] = [
  { km: 5, label: 'Hasta 5 km', title: 'Solo creadores a menos de 5 km de tu local: pueden pasar a buscar el producto y grabar en el día.' },
  { km: 15, label: 'Hasta 15 km', title: 'Creadores de CABA y del primer cordón del GBA: el producto les llega en el día.' },
  { km: 50, label: 'Hasta 50 km', title: 'Creadores de CABA y de todo el GBA: el envío llega en el día o al día siguiente.' },
  { km: 0, label: 'Todo el país', title: 'Cualquier creador del país. Si vive lejos, el producto va por envío y graba desde donde está.' },
];

const AUDIENCIAS: { v: FiltroAudiencia; label: string; title: string }[] = [
  { v: 'nano', label: 'Nano · hasta 10K', title: 'Cuentas chicas y muy de barrio: cobran menos por pieza y suelen tener el engagement más alto.' },
  { v: 'micro', label: 'Micro · 10K a 100K', title: 'El rango que mejor rinde para una tienda de barrio: alcance real a un precio razonable.' },
  { v: 'macro', label: 'Macro · más de 100K', title: 'Cuentas grandes: mucha más gente las ve, pero la pieza sale bastante más cara.' },
  { v: 'todas', label: 'Cualquier tamaño', title: 'No filtrar por tamaño: entran las cuentas chicas, las medianas y las grandes.' },
];

const PRECIOS: { max: number; label: string; title: string }[] = [
  { max: 10000, label: 'Hasta $10.000', title: 'Piezas de hasta $10.000: lo que cobran las cuentas chicas que recién arrancan.' },
  { max: 20000, label: 'Hasta $20.000', title: 'Hasta $20.000 por pieza: entra la mayoría de los perfiles de tu zona.' },
  { max: 35000, label: 'Hasta $35.000', title: 'Hasta $35.000 por pieza: ya entran creadores con más audiencia y varios formatos.' },
  { max: 45000, label: 'Hasta $45.000', title: 'Hasta $45.000 por pieza: es el techo del mercado para tu rubro.' },
  { max: 0, label: 'Sin límite', title: 'No filtrar por precio: ves todos los candidatos, del más barato al más caro.' },
];

const TITLE_RUBRO: Record<string, string> = {
  'Belleza y skincare': 'Creadores que hablan de cremas y cuidado de la piel: es tu rubro, el que más importa.',
  'Bienestar': 'Creadores de rutinas y bienestar: hablan de autocuidado y hábitos, y ahí entra el cuidado de la piel.',
  'UGC de producto': 'Creadores que graban el producto en uso, con guion propio y cara de cliente real, no de aviso.',
  'Lifestyle': 'Creadores que muestran su día a día: el producto aparece dentro de una escena, no como publicidad.',
};

const TITLE_IDIOMA: Record<string, string> = {
  'Cualquier idioma': 'No filtrar por idioma: entran todos los candidatos, hable lo que hable.',
  'Español': 'Habla español: le puede hablar a tus clientes de Buenos Aires y del GBA sin traducir nada.',
  'Español e inglés': 'Habla español e inglés: sirve si querés que la pieza también la vea público de afuera.',
  'Portugués': 'Habla portugués: sirve si vendés a Brasil, a turistas o a clientes de la frontera.',
};

const TITLE_CONTENIDO: Record<string, string> = {
  'UGC': 'Graba el producto como un cliente real, con guion propio y sin look de aviso.',
  'Reseña': 'Muestra el producto ya probado y cuenta qué le pareció, con su palabra.',
  'Video corto': 'Reel o TikTok de menos de 30 segundos: el formato que más gente nueva trae.',
  'Unboxing': 'Abre el paquete en cámara: sirve para mostrar el packaging y la sorpresa del envío.',
  'Historia': 'Historias de 24 horas con encuesta y sticker de link: las que más respuestas traen.',
  'Foto de producto': 'Fotos del producto en uso, prolijas, que después sirven para tus propios anuncios.',
};

// El por qué de la coincidencia, en una línea: es lo que hace que la búsqueda se entienda.
function porQue(c: Creador): string {
  const rubro = c.rubros[0].toLowerCase().replace('belleza y skincare', 'belleza');
  const habla = c.idiomas.map(i => i.toLowerCase()).join(' y ');
  return `Coincide en rubro: ${rubro} · a ${c.distancia} km · habla ${habla} · hace ${c.nicho.toLowerCase()}`;
}

// Cómo se lee la distancia en la tarjeta. El que vive lejos trabaja con envío, y se dice.
function zonaTexto(c: Creador): string {
  return c.distancia > 50 ? `${c.zona} · a ${c.distancia} km (trabaja con envío)` : `${c.zona} · a ${c.distancia} km`;
}

// 32000 → '32K' · 9400 → '9,4K' · 140000 → '140K'
function audiencia(n: number): string {
  return n >= 1000 ? `${(n / 1000).toLocaleString('es-AR', { maximumFractionDigits: 1 })}K` : String(n);
}

const miles = (n: number) => `$${n.toLocaleString('es-AR')}`;

export function BuscadorCreadores({ setToast, irAConversaciones }: { setToast: (t: string) => void; irAConversaciones: () => void }) {
  const [rubros, setRubros] = useState<string[]>([]);
  const [tipos, setTipos] = useState<string[]>([]);
  const [km, setKm] = useState(0);
  const [idioma, setIdioma] = useState('Cualquier idioma');
  const [tamano, setTamano] = useState<FiltroAudiencia>('todas');
  const [precio, setPrecio] = useState(0);
  const [buscando, setBuscando] = useState(false);
  const [sello, setSello] = useState('hace 2 minutos');
  const [invitados, setInvitados] = useState<string[]>([]);

  const alternar = (lista: string[], set: (v: string[]) => void, v: string) =>
    set(lista.includes(v) ? lista.filter(x => x !== v) : [...lista, v]);

  // Los seis filtros, aplicados de verdad sobre la lista que trajo el motor.
  const filtrados = useMemo(() => CREADORES.filter(c => {
    if (rubros.length && !c.rubros.some(r => rubros.includes(r))) return false;
    if (km !== 0 && c.distancia > km) return false;
    if (idioma !== 'Cualquier idioma') {
      const necesita = OPCIONES_IDIOMA.find(o => o.label === idioma)?.necesita ?? [];
      if (!necesita.every(i => c.idiomas.includes(i))) return false;
    }
    if (tipos.length && !c.contenidos.some(t => tipos.includes(t))) return false;
    if (tamano === 'nano' && c.seguidores > 10000) return false;
    if (tamano === 'micro' && (c.seguidores <= 10000 || c.seguidores > 100000)) return false;
    if (tamano === 'macro' && c.seguidores <= 100000) return false;
    if (precio !== 0 && c.precio > precio) return false;
    return true;
  }).sort((a, b) => b.puntaje - a.puntaje), [rubros, tipos, km, idioma, tamano, precio]);

  const hayFiltros = rubros.length > 0 || tipos.length > 0 || km !== 0 || idioma !== 'Cualquier idioma'
    || tamano !== 'todas' || precio !== 0;

  const limpiar = () => {
    setRubros([]); setTipos([]); setKm(0); setIdioma('Cualquier idioma'); setTamano('todas'); setPrecio(0);
  };

  const buscar = () => {
    if (buscando) return;
    const n = filtrados.length;
    setBuscando(true);
    setToast('El motor está buscando creadores para tu negocio (demo)');
    window.setTimeout(() => {
      setBuscando(false);
      setSello('recién');
      setToast(`El motor encontró ${n} candidatos: cada uno trae su por qué (demo)`);
    }, 900);
  };

  const invitar = (c: Creador) => {
    setInvitados(prev => (prev.includes(c.id) ? prev : [...prev, c.id]));
    setToast(`Invitación enviada a ${c.nombre.split(' ')[0]}: la conversación se abrió en Conversaciones (demo)`);
  };

  return (
    <Card
      title={<span className="row" style={{ gap: 8 }}><I_Search size={14} style={{ color: 'var(--purple3)' }} /> Buscar creadores</span>}
      action={<Badge tone={filtrados.length ? 'purple' : 'muted'}>{filtrados.length} {filtrados.length === 1 ? 'candidato' : 'candidatos'}</Badge>}
    >
      <div className="cre">

        {/* ---------------- 1 · EL MOTOR LOS BUSCA POR VOS ---------------- */}
        <div className="cre-motor">
          <span className="cre-motor-ic"><I_Robot size={18} /></span>
          <div className="cre-motor-tx">
            <div className="cre-paso">1 · El motor los busca por vos</div>
            <div className="bt">Un mercado de creadores que prestan su servicio de contenido a las marcas que publican.</div>
            <div className="bs" style={{ marginTop: 5 }}>
              El motor ya armó la lista para <b>{TENANT.cuenta}</b>: cruzó tu rubro (cremas y cuidado de la piel), los
              idiomas y la zona de tus clientes, y el precio que manejás por pieza. Cada candidato viene con el por qué
              de la coincidencia, así no necesitás saber el nombre de nadie.
            </div>
          </div>
          <div className="cre-motor-btn">
            <Button className="btn-sm"
              title="El motor vuelve a buscar en el mercado de creadores con los filtros que elegiste acá abajo. No invita a nadie y no gasta plata: solo trae candidatos."
              onClick={buscar}><I_Search size={13} /> Buscar candidatos</Button>
            <span className="cre-sello">
              {buscando
                ? <span className="cre-buscando"><I_Refresh size={12} /> El motor está buscando…</span>
                : `Última búsqueda: ${sello}`}
            </span>
          </div>
        </div>

        {/* ---------------- 2 · LOS FILTROS QUE IMPORTAN, EN ORDEN ----------------
            Todos son chips predefinidos: acá no se escribe nada a mano. */}
        <div className="cre-filtros">
          <div className="cre-paso">2 · Los filtros que importan</div>

          <div className="cre-f">
            <span className="cre-f-lb">Rubro / nicho<small>el que más importa: si no habla de lo tuyo, no sirve</small></span>
            <span className="cre-f-chips">
              {RUBROS_CREADOR.map(r => (
                <button key={r} type="button" className={`cre-chip ${rubros.includes(r) ? 'sel' : ''}`}
                  title={`${TITLE_RUBRO[r]} Podés elegir más de uno.`}
                  onClick={() => alternar(rubros, setRubros, r)}>{rubros.includes(r) ? '✓ ' : ''}{r}</button>
              ))}
            </span>
          </div>

          <div className="cre-f">
            <span className="cre-f-lb">Distancia desde tu local<small>tu tienda está en Buenos Aires</small></span>
            <span className="cre-f-chips">
              {DISTANCIAS.map(d => (
                <button key={d.label} type="button" className={`cre-chip ${km === d.km ? 'sel' : ''}`}
                  title={d.title} onClick={() => setKm(d.km)}>{km === d.km ? '✓ ' : ''}{d.label}</button>
              ))}
            </span>
          </div>

          <div className="cre-f">
            <span className="cre-f-lb">Idioma<small>en el que graba la pieza</small></span>
            <span className="cre-f-chips">
              {['Cualquier idioma', ...OPCIONES_IDIOMA.map(o => o.label)].map(i => (
                <button key={i} type="button" className={`cre-chip ${idioma === i ? 'sel' : ''}`}
                  title={TITLE_IDIOMA[i]} onClick={() => setIdioma(i)}>{idioma === i ? '✓ ' : ''}{i}</button>
              ))}
            </span>
          </div>

          <div className="cre-f">
            <span className="cre-f-lb">Tipo de contenido<small>sin elegir, entran todos los formatos</small></span>
            <span className="cre-f-chips">
              {CONTENIDOS_CREADOR.map(t => (
                <button key={t} type="button" className={`cre-chip ${tipos.includes(t) ? 'sel' : ''}`}
                  title={`${TITLE_CONTENIDO[t]} Podés elegir más de uno.`}
                  onClick={() => alternar(tipos, setTipos, t)}>{tipos.includes(t) ? '✓ ' : ''}{t}</button>
              ))}
            </span>
          </div>

          <div className="cre-f">
            <span className="cre-f-lb">Tamaño de audiencia<small>cuánta gente ve lo que publica</small></span>
            <span className="cre-f-chips">
              {AUDIENCIAS.map(a => (
                <button key={a.label} type="button" className={`cre-chip ${tamano === a.v ? 'sel' : ''}`}
                  title={a.title} onClick={() => setTamano(a.v)}>{tamano === a.v ? '✓ ' : ''}{a.label}</button>
              ))}
            </span>
          </div>

          <div className="cre-f">
            <span className="cre-f-lb">Precio por pieza<small>lo máximo que querés pagar por cada contenido</small></span>
            <span className="cre-f-chips">
              {PRECIOS.map(p => (
                <button key={p.label} type="button" className={`cre-chip ${precio === p.max ? 'sel' : ''}`}
                  title={p.title} onClick={() => setPrecio(p.max)}>{precio === p.max ? '✓ ' : ''}{p.label}</button>
              ))}
            </span>
          </div>
        </div>

        {/* ---------------- 3 · LOS CANDIDATOS ---------------- */}
        <div className="cre-res">
          <span className="cre-paso">3 · Los candidatos</span>
          <span className="cre-res-tx">
            Mostrando <b>{filtrados.length}</b> de {CREADORES.length} candidatos · ordenados por puntaje
          </span>
          <Button variant="ghost" className="btn-sm" disabled={!hayFiltros}
            title="Borra todos los filtros y vuelve a mostrar todos los candidatos de tu zona."
            onClick={limpiar}><I_Filter size={13} /> Limpiar filtros</Button>
        </div>

        {filtrados.length === 0 ? (
          <div className="cre-vacio">
            <span>
              Con estos filtros no queda ningún creador de tu zona. Probá con otro rubro, un radio más grande o un
              precio máximo más alto: el mercado tiene gente para todas las combinaciones.
            </span>
            <Button variant="outline" className="btn-sm"
              title={`Borra los filtros y vuelve a mostrar los ${CREADORES.length} candidatos.`}
              onClick={limpiar}>Limpiar los filtros</Button>
          </div>
        ) : (
          <div className="cre-grid">
            {filtrados.map((c, i) => {
              const pt = c.puntaje.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
              const ancha = filtrados.length % 2 === 1 && i === filtrados.length - 1;
              return (
                <div key={c.id} className={`cre-card${ancha ? ' ancha' : ''}`}>
                  <div className="cre-card-top">
                    <Avatar name={c.nombre} size={38} tone={i} />
                    <div style={{ minWidth: 0 }}>
                      <div className="cre-nm">{c.nombre}</div>
                      <div className="cre-zona"><I_Globe size={11} /> {zonaTexto(c)}</div>
                    </div>
                    <span className="cre-pt" title={`Puntaje del creador: ${pt} sobre 5, según cómo cumplió las colaboraciones anteriores.`}>
                      <I_Star size={12} /> {pt} <small>sobre 5</small>
                    </span>
                  </div>

                  <div className="cre-tags">
                    <span className="cre-tag" title="Los idiomas en los que puede grabar la pieza.">{c.idiomas.join(' e ')}</span>
                    <span className="cre-tag" title="Su nicho y el formato en el que trabaja.">{c.nicho} · {c.formato}</span>
                    <span className="cre-tag" title="Cuánta gente lo sigue y qué porcentaje reacciona a lo que publica.">{audiencia(c.seguidores)} seguidores · {c.engagement}</span>
                    <span className="cre-tag cre-precio" title="Lo que cobra por cada pieza que entrega. El precio final se acuerda en la conversación.">{miles(c.precio)} por pieza</span>
                  </div>

                  <div className="cre-porque">{porQue(c)}</div>

                  <div className="cre-muestras">
                    <span className="cre-m-lb">Muestras de su trabajo:</span>
                    {c.muestras.map(m => (
                      <button key={m} type="button" className="cre-m"
                        title={`Ver «${m}»: es una pieza que ya publicó, con el formato y el alcance que tuvo.`}
                        onClick={() => setToast(`${c.nombre.split(' ')[0]} · muestra «${m}» (demo)`)}>{m}</button>
                    ))}
                  </div>

                  <div className="cre-acc">
                    <Button variant="outline" className="btn-sm"
                      title={`Le manda la invitación a ${c.nombre.split(' ')[0]} y abre una conversación en Conversaciones, donde Rumi acuerda el precio, los plazos y qué tiene que entregar. La marca le paga a Sinkroo, y Sinkroo le paga al creador en dinero.`}
                      onClick={() => invitar(c)}>
                      <I_Chat size={13} /> Invitar a colaborar
                    </Button>
                    <span className="cre-acc-tx">
                      {invitados.includes(c.id)
                        ? 'Invitación enviada: seguí la respuesta en Conversaciones.'
                        : 'Rumi negocia el precio y la fecha por vos.'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ---------------- 4 · EL CIERRE DEL CÍRCULO: la conversación y el dinero ---------------- */}
        <div className="cre-cierre">
          <span className="cre-cierre-ic"><I_Chat size={15} /></span>
          <div className="cre-cierre-t">
            Al invitar a un creador se abre una <b>conversación en Conversaciones</b>: ahí Rumi negocia el precio, los
            plazos y qué se entrega, y cierra el acuerdo. La marca le paga a <b>Sinkroo</b>, y Sinkroo le paga al creador
            <b> en dinero</b>, no en créditos.
            {invitados.length > 0 && <> Ya enviaste <b>{invitados.length}</b> {invitados.length === 1 ? 'invitación' : 'invitaciones'}.</>}
          </div>
          <div className="cre-cierre-btn">
            <Button variant="outline" className="btn-sm"
              title="Abre Conversaciones: la conversación con el creador queda ahí, con Rumi negociando el precio, los plazos y qué se entrega."
              onClick={irAConversaciones}><I_ArrowRight size={13} /> Ver la conversación</Button>
          </div>
        </div>

        {/* El creador no vive adentro de tu panel: tiene su lado, y ese lado se define aparte. */}
        <div className="cre-nota">
          <I_User size={13} />
          <span>El creador tiene su propio lado: su perfil y su panel para seguir lo que acordó. El registro de
          creadores se hace en un onboarding aparte, que se define próximamente.</span>
        </div>
      </div>
    </Card>
  );
}

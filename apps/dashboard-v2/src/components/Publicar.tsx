import { useMemo, useState } from 'react';
import { Card, Badge, Button } from './ui';
import {
  I_Megaphone, I_Upload, I_Image, I_Film, I_File, I_Link, I_Check, I_ArrowRight, I_Trash,
  I_ChevDn, I_ChevUp, I_Users, I_Chat,
} from './icons';
import { FlujoMiroFish } from './FlujoMiroFish';
import { TIPOS_CAMPANA, type ObjetivoCampana } from '../data/campana';
import { FORMATOS, MATERIAL, NO_SE_PUBLICA, type CampoPublicacion, type FormatoKey } from '../data/publicaciones';
import type { Modo } from '../data/demo';

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

          <div className="acc-why">
            El tipo <b>cambia lo que el motor escribe y a quién le muestra la pieza</b>. Un anuncio de
            retargeting y uno de marca no dicen lo mismo aunque sea el mismo producto.
          </div>
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

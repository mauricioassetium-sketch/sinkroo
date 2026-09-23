import { useMemo, useState } from 'react';
import { Card, Badge, Button } from './ui';
import {
  I_Megaphone, I_Upload, I_Image, I_Film, I_File, I_Link, I_Check, I_ArrowRight, I_Trash,
  I_Robot, I_Vote, I_Rocket, I_Target, I_Search, I_Sparkle, I_ChevDn, I_ChevUp,
  I_Users, I_Play, I_Eye, I_X, I_Chat,
} from './icons';
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

export function Publicar({ setToast, modo, irAConversaciones }: {
  setToast: (t: string) => void; modo: Modo; irAConversaciones: () => void;
}) {
  const [formatoKey, setFormatoKey] = useState<FormatoKey>('anuncio');
  const [objetivo, setObjetivo] = useState<ObjetivoCampana>('ventas');
  const [valores, setValores] = useState<Record<string, Valor>>({});
  const [material, setMaterial] = useState<Record<string, Archivo[]>>({});
  const [avanzados, setAvanzados] = useState(false);
  const [enviado, setEnviado] = useState(false);

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

  const nombreDe = () => {
    const a = (valores['productos_foco'] as string) || (valores['idea'] as string) || (valores['idea_hist'] as string)
      || (valores['que_decir'] as string) || (valores['que_lanzas'] as string) || (valores['premio'] as string)
      || (valores['que_le_pedis'] as string) || '';
    return a.trim().slice(0, 70) || formato.nombre;
  };

  const accionDice = modo === 'auto'
    ? 'Se publica solo y te queda en la bitácora'
    : modo === 'shared'
      ? 'Kai te pide el OK antes de publicar'
      : 'Queda lista para que la publiques vos';

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
                onClick={() => { setFormatoKey(f.key); setEnviado(false); }}>
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
                    onClick={() => { setObjetivo(t.key); setEnviado(false); }}>
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

      {/* ==================== FILA 2: EL MOTOR Y LA VOTACIÓN ==================== */}
      <div className="duo" style={{ marginTop: 16 }}>
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Robot size={14} style={{ color: 'var(--purple3)' }} /> 3 · Lo que hace el motor</span>}
          action={<Badge tone="purple">4 pasos</Badge>}
        >
          <div className="guards">
            <div className="guard">
              <span style={{ color: 'var(--purple3)', flexShrink: 0 }}><I_Search size={14} /></span>
              <span className="guard-lb">Revisa el mercado y tu negocio
                <small>Lee los anuncios activos de tus competidores y cruza lo que ya sabe de tu tienda desde el onboarding.</small>
              </span>
              <span className="guard-val">47 ads</span>
            </div>
            <div className="guard">
              <span style={{ color: 'var(--purple3)', flexShrink: 0 }}><I_Sparkle size={14} /></span>
              <span className="guard-lb">Crea las piezas
                <small>Escribe los textos, arma las imágenes con tus fotos y produce los videos verticales con los prompts de cada escena.</small>
              </span>
              <span className="guard-val">6 piezas</span>
            </div>
            <div className="guard">
              <span style={{ color: 'var(--purple3)', flexShrink: 0 }}><I_File size={14} /></span>
              <span className="guard-lb">Te muestra todo antes de publicar
                <small>Cada pieza con su texto, su público y —si es anuncio— su presupuesto.</small>
              </span>
              <span className="guard-val">revisable</span>
            </div>
            <div className="guard">
              <span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Rocket size={14} /></span>
              <span className="guard-lb">{formato.key === 'anuncio' ? 'Las mejores salen a producción' : 'Las mejores se publican'}
                <small>Solo pasa lo que el panel aprueba. Lo que no pasa queda guardado con el motivo.</small>
              </span>
              <span className="guard-val">top 3</span>
            </div>
          </div>
          <div className="bs">
            {formato.key === 'anuncio'
              ? <>Mientras crea, el motor <b>no gasta nada</b>: el dinero se mueve recién cuando una pieza pasa el panel.</>
              : <>Acá <b>no se gasta nada</b>: {formato.nombre.toLowerCase()} es contenido propio. El motor solo pone el trabajo.</>}
          </div>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <Button className="btn-sm" title={`Arranca: revisa el mercado y crea las piezas de «${nombreDe()}»`}
              onClick={() => setToast(`El motor está creando «${nombreDe()}» (demo)`)}>
              <I_Play size={13} /> Empezar a crear
            </Button>
            <Button variant="ghost" className="btn-sm" title="Guarda lo cargado como borrador, sin crear nada todavía"
              onClick={() => setToast('Guardado como borrador (demo)')}>Guardar borrador</Button>
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Vote size={14} style={{ color: 'var(--amber)' }} /> 4 · El panel vota</span>}
          action={enviado ? <Badge tone="green">aprobada</Badge> : <Badge tone="muted">sin enviar</Badge>}
        >
          {!enviado ? (
            <>
              <div className="bs">
                Antes de publicar o gastar, tu propuesta pasa por <b>el panel de expertos de MiroFish</b>:
                cinco perfiles distintos votan si convence. <b>Solo las mejores votadas salen a producción.</b>
              </div>
              <div className="dec">
                <div className="dec-head">
                  <span className="dec-av" style={{ background: 'var(--purple2)' }}>M</span>
                  <span className="dec-agent" style={{ color: 'var(--purple3)' }}>Así vota el panel</span>
                  <Badge tone="purple">5 perfiles</Badge>
                </div>
                <div className="dec-det">
                  Comprador impulsivo, comprador que compara, cliente desconfiado, experto del rubro y
                  alguien que nunca te vio. Cada uno con su objeción.
                </div>
                <div className="dec-panel">
                  <div className="dec-panel-top">
                    <I_Target size={14} style={{ color: 'var(--purple3)' }} />
                    <b>Votación sobre mercado simulado</b>
                  </div>
                  <div className="dec-obj">
                    Es un filtro: si no convence a nadie, no se publica y no te cuesta nada.
                  </div>
                </div>
              </div>
              <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
                <Button title={`Manda «${nombreDe()}» al panel de agentes para que la voten`}
                  onClick={() => { setEnviado(true); setToast('Tu propuesta entró al panel: 4 de 5 a favor (demo)'); }}>
                  <I_Vote size={13} /> Pasarla por los agentes
                </Button>
                <Button variant="ghost" className="btn-sm" title="Abre el motor andando, con las etapas de la votación en vivo"
                  onClick={() => setToast('Ver el motor andando (demo)')}>
                  <I_Eye size={13} /> Ver el motor andando
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="row spread" style={{ alignItems: 'flex-start' }}>
                <span className="row" style={{ gap: 10 }}>
                  <I_Check size={18} style={{ color: 'var(--green)' }} />
                  <span>
                    <b style={{ fontSize: 13.5 }}>«{nombreDe()}» pasó el panel</b>
                    <span className="tiny muted" style={{ display: 'block' }}>4 de 5 a favor · 1 con reserva</span>
                  </span>
                </span>
                <span className="row" style={{ gap: 8 }}>
                  <span style={{ fontSize: 26, fontWeight: 900, color: 'var(--green)' }}>84</span>
                  <span className="tiny muted">/100</span>
                </span>
              </div>
              <div className="bs">
                <b style={{ color: 'var(--amber)' }}>Lo que objetaron:</b> «le falta prueba social: ningún
                testimonio con nombre». Se arregla sumando una reseña real.
              </div>
              <div className="guards">
                <div className="guard"><span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Check size={14} /></span>
                  <span className="guard-lb">«Antes y Después — el pack»
                    <small>Video vertical 15 s · 88 puntos</small></span>
                  <Badge tone="green">sale</Badge></div>
                <div className="guard"><span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Check size={14} /></span>
                  <span className="guard-lb">«La rutina de 3 pasos»
                    <small>Carrusel de 5 placas · 85 puntos</small></span>
                  <Badge tone="green">sale</Badge></div>
                <div className="guard"><span style={{ color: 'var(--green)', flexShrink: 0 }}><I_Check size={14} /></span>
                  <span className="guard-lb">«Testimonio de Valeria»
                    <small>Imagen + texto · 81 puntos</small></span>
                  <Badge tone="green">sale</Badge></div>
                <div className="guard"><span style={{ color: 'var(--muted)', flexShrink: 0 }}><I_X size={14} /></span>
                  <span className="guard-lb">«Oferta 2x1 sin contexto»
                    <small>64 puntos · no llegó al mínimo de 80</small></span>
                  <Badge tone="muted">guardada</Badge></div>
              </div>
              <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
                <Button className="btn-sm" title={accionDice}
                  onClick={() => setToast(`${accionDice} (demo)`)}>
                  <I_Rocket size={13} /> {formato.key === 'anuncio' ? 'Publicar las 3 mejores' : 'Programar las 3 mejores'}
                </Button>
                <Button variant="ghost" className="btn-sm" title="Suma una reseña real y vuelve a puntuar la que no pasó"
                  onClick={() => setToast('Suma la prueba social y la vuelve a puntuar (demo)')}>Arreglar la que no pasó</Button>
                <Button variant="ghost" className="btn-sm" title="Vuelve al borrador: no se publica nada"
                  onClick={() => { setEnviado(false); setToast('Vuelve al borrador: no se publica nada'); }}>Volver al borrador</Button>
              </div>
              <div className="acc-why">
                {modo === 'manual'
                  ? <><b>Estás en Manual:</b> el motor te las deja listas y las publicás vos.</>
                  : modo === 'auto'
                    ? <><b>Estás en Automático:</b> salen solas y quedan en la bitácora, reversibles 24 h.</>
                    : <><b>Estás en Compartido:</b> el motor prepara todo y te pide el OK acá mismo.</>}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* ==================== LO QUE NO SE PUBLICA ==================== */}
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
    </>
  );
}

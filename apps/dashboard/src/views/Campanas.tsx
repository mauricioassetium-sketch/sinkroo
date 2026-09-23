import { useState } from 'react';
import { Card, Badge, Progress, Button, Modal, Toast } from '../components/sinkroo/ui';
import { CAMPANAS, TIPOS_CAMPANA, type TipoCampana } from '../components/sinkroo/data';
import { INGESTA_CAMPANA, type CampoIngesta, type MaterialItem } from '../components/sinkroo/ingesta';
import { I_Edit, I_Trash, I_Copy, I_Play } from '../components/sinkroo/icons';

type Campana = typeof CAMPANAS[number];
const TONO: Record<string, 'green'|'amber'|'red'|'muted'> = { Activa: 'green', 'En pausa': 'amber', Borrador: 'muted', Finalizada: 'muted' };

export default function Campanas() {
  const [filtro, setFiltro] = useState('Todas');
  const [lista, setLista] = useState<Campana[]>(CAMPANAS);
  const [toast, setToast] = useState('');
  const [nueva, setNueva] = useState(false);
  const [nombre, setNombre] = useState('');
  const [objetivo, setObjetivo] = useState<Campana['objetivo']>('ventas');
  const [estrat, setEstrat] = useState<TipoCampana | null>(null);
  const [edit, setEdit] = useState<Campana | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [borrar, setBorrar] = useState<Campana | null>(null);
  const [reporte, setReporte] = useState<Campana | null>(null);
  const [material, setMaterial] = useState<Record<string, MaterialItem[]>>({});
  const [matTexto, setMatTexto] = useState<Record<string, string>>({});

  const estados = ['Todas', 'Activa', 'En pausa', 'Borrador', 'Finalizada'];
  const visibles = lista.filter(c => filtro === 'Todas' || c.estado === filtro);

  const avisar = (t: string) => { setToast(t); setTimeout(() => setToast(''), 2600); };
  const nextId = () => 'c' + (Date.now() % 100000);

  const specIngesta = INGESTA_CAMPANA[objetivo];

  const contarMaterial = () => {
    let n = 0;
    Object.values(material).forEach(arr => { n += arr.length; });
    Object.values(matTexto).forEach(t => { if (t.trim()) n++; });
    return n;
  };

  const agregarArchivos = (campo: CampoIngesta, archivos: FileList | null) => {
    if (!archivos || !archivos.length) return;
    const items: MaterialItem[] = Array.from(archivos).map(f => ({ etiqueta: f.name, tipo: 'archivo', valor: Math.round(f.size / 1024) + ' KB' }));
    setMaterial(m => ({ ...m, [campo.id]: [...(m[campo.id] || []), ...items] }));
    avisar(`📎 ${archivos.length} archivo${archivos.length > 1 ? 's' : ''} agregado${archivos.length > 1 ? 's' : ''} a «${campo.etiqueta}»`);
  };

  const quitarMaterial = (campoId: string, i: number) => {
    setMaterial(m => ({ ...m, [campoId]: (m[campoId] || []).filter((_, ix) => ix !== i) }));
  };

  const cambiarEstado = (c: Campana, nuevo: string) => {
    setLista(ls => ls.map(x => x.id === c.id ? { ...x, estado: nuevo } : x));
    avisar(nuevo === 'Activa' ? `✅ "${c.nombre}" activada` : `⏸ "${c.nombre}" pausada`);
  };

  const duplicar = (c: Campana) => {
    const copia: Campana = { ...c, id: nextId(), nombre: `${c.nombre} (copia)`, estado: 'Borrador', campPct: 0, roas: '—', alcance: '—', costo: '$0', conversiones: '0' };
    setLista(ls => [...ls, copia]);
    avisar(`📋 Duplicada como borrador: "${copia.nombre}"`);
  };

  const eliminar = () => {
    if (!borrar) return;
    setLista(ls => ls.filter(x => x.id !== borrar.id));
    avisar(`🗑 "${borrar.nombre}" eliminada`);
    setBorrar(null);
  };

  const tipoDe = (o: Campana['objetivo']) => TIPOS_CAMPANA.find(t => t.key === o)!;

  const crear = () => {
    const nm = nombre.trim();
    if (!nm) { avisar('Escribí un nombre para la campaña'); return; }
    const tp = tipoDe(objetivo);
    const nc: Campana = { id: nextId(), nombre: nm, emoji: tp.icono, modulo: 'M4', objetivo, estado: 'Borrador', campPct: 0, roas: '—', presupuesto: '$0', alcance: '—', costo: '$0', conversiones: '0' };
    setLista(ls => [...ls, nc]);
    setNombre(''); setNueva(false); setObjetivo('ventas');
    setMaterial({}); setMatTexto({});
    avisar(`✅ Campaña "${nm}" creada (${tp.nombre})`);
  };

  const guardarEdit = () => {
    if (!edit) return;
    const nm = editNombre.trim();
    if (!nm) { avisar('El nombre no puede quedar vacío'); return; }
    setLista(ls => ls.map(x => x.id === edit.id ? { ...x, nombre: nm } : x));
    avisar(`✏️ Renombrada a "${nm}"`);
    setEdit(null);
  };

  return (
    <>
      <div className="hdr"><div><div className="hdr-t">Campañas</div><div className="hdr-s">Módulo M4: ejecución y publicidad.</div></div><Button onClick={() => setNueva(true)}>+ Nueva campaña</Button></div>

      <div className="tabbar" style={{ width: 'fit-content', marginBottom: 20 }}>
        {estados.map(e => <div key={e} className={`tab ${filtro === e ? 'sel' : ''}`} onClick={() => setFiltro(e)}>{e}</div>)}
      </div>

      {visibles.length === 0 && <div className="muted" style={{ padding: '40px 0', textAlign: 'center' }}>No hay campañas con el estado «{filtro}».</div>}

      <div className="grid-2">
        {visibles.map(c => (
          <Card key={c.id}>
            <div className="spread">
              <div className="row"><span className="camp-mod-ico" style={{ fontSize: 20 }}>{c.emoji}</span><div><div className="small" style={{ fontWeight: 700 }}>{c.nombre}</div><div className="row" style={{ gap: 6 }}><Badge tone={TONO[c.estado]}>{c.estado}</Badge><Badge tone="purple">{tipoDe(c.objetivo).icono} {tipoDe(c.objetivo).nombre}</Badge></div></div></div>
              <div className="row" style={{ gap: 6 }}>
                <button className="icon-btn" title="Editar" onClick={() => { setEdit(c); setEditNombre(c.nombre); }}><I_Edit size={15} /></button>
                <button className="icon-btn" title="Duplicar" onClick={() => duplicar(c)}><I_Copy size={15} /></button>
                <button className="icon-btn" title="Eliminar" onClick={() => setBorrar(c)}><I_Trash size={15} /></button>
              </div>
            </div>
            <div className="divider" />
            <div className="spread small mb-16"><span className="muted">Progreso</span><span style={{ fontWeight: 700 }}>{c.campPct}%</span></div>
            <Progress pct={c.campPct} color={c.estado === 'En pausa' ? 'amber' : 'purple'} />
            <div className="row small mt-16" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <span className="muted">ROAS <b style={{ color: 'var(--txt)' }}>{c.roas}</b></span>
              <span className="muted">Presupuesto <b style={{ color: 'var(--txt)' }}>{c.presupuesto}</b></span>
              <span className="muted">Alcance <b style={{ color: 'var(--txt)' }}>{c.alcance}</b></span>
              <span className="muted">Conversiones <b style={{ color: 'var(--txt)' }}>{c.conversiones}</b></span>
            </div>
            <div className="mt-16" style={{ display: 'flex', gap: 8 }}>
              {c.estado === 'Activa' && <Button variant="ghost" className="btn-sm" onClick={() => cambiarEstado(c, 'En pausa')}>⏸ Pausar</Button>}
              {(c.estado === 'En pausa' || c.estado === 'Borrador') && <Button className="btn-sm" onClick={() => cambiarEstado(c, 'Activa')}><I_Play size={13} /> Activar</Button>}
              {c.estado === 'Finalizada' && <Button className="btn-sm" onClick={() => cambiarEstado(c, 'Activa')}><I_Play size={13} /> Reactivar</Button>}
              <Button variant="ghost" className="btn-sm" onClick={() => setReporte(c)}>Ver reporte</Button>
              <Button variant="ghost" className="btn-sm" onClick={() => setEstrat(tipoDe(c.objetivo))}>Ver estrategia</Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={nueva} onClose={() => setNueva(false)} title="Nueva campaña">
        <div className="ob-fields">
          <div><label className="label">Nombre de campaña</label><input className="input" placeholder="Ej. Retargeting. Audiencia web 30 días" value={nombre} onChange={e => setNombre(e.target.value)} autoFocus /></div>
          <div><label className="label">Tipo de campaña, define la estrategia</label>
            <div className="tipos-grid">
              {TIPOS_CAMPANA.map(t => (
                <button key={t.key} type="button" className={`tipo-card ${objetivo === t.key ? 'sel' : ''}`} onClick={() => setObjetivo(t.key)}>
                  <span className="tipo-ico" style={{ color: t.color }}>{t.icono}</span>
                  <span className="tipo-nombre">{t.nombre}</span>
                  <span className="tipo-kpi">Optimiza: {t.kpi}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="tipo-preview" style={{ borderColor: tipoDe(objetivo).color + '55' }}>
            <div className="tipo-preview-head"><span>{tipoDe(objetivo).icono}</span><b>{tipoDe(objetivo).nombre}</b></div>
            <div className="tiny muted" style={{ lineHeight: 1.6 }}>
              <b style={{ color: 'var(--txt)' }}>Estrategia:</b> {tipoDe(objetivo).estrategia}<br />
              <b style={{ color: 'var(--txt)' }}>Audiencia:</b> {tipoDe(objetivo).audiencia}<br />
              <b style={{ color: 'var(--txt)' }}>Formatos:</b> {tipoDe(objetivo).formato}
            </div>
          </div>
          <div className="divider" style={{ margin: '18px 0' }} />
          <div>
            <label className="label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>📦 Material para que la IA trabaje <span style={{ opacity: .55, fontWeight: 400 }}>({tipoDe(objetivo).nombre})</span></span>
              <span className="tiny muted">{contarMaterial()} cargado{contarMaterial() === 1 ? '' : 's'}</span>
            </label>
            <p className="tiny muted" style={{ margin: '2px 0 12px', lineHeight: 1.5 }}>{specIngesta.intro}</p>

            {specIngesta.secciones.map(sec => (
              <div key={sec.titulo} style={{ marginBottom: 16 }}>
                <div className="small" style={{ fontWeight: 800, letterSpacing: .3, textTransform: 'uppercase', fontSize: 11, color: 'var(--purple2)', marginBottom: 8 }}>{sec.titulo}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
                {sec.campos.map(campo => {
              const archivos = material[campo.id] || [];
              const texto = matTexto[campo.id] || '';
              if (campo.tipo === 'texto') {
                return (
                  <div key={campo.id} style={{ marginBottom: 12 }}>
                    <label className="label">{campo.etiqueta}</label>
                    <textarea className="input" rows={texto && texto.length > 40 ? 3 : 2} placeholder={campo.ayuda} value={texto} onChange={e => setMatTexto(t => ({ ...t, [campo.id]: e.target.value }))} />
                  </div>
                );
              }
              if (campo.tipo === 'link') {
                return (
                  <div key={campo.id} style={{ marginBottom: 12 }}>
                    <label className="label">{campo.etiqueta}</label>
                    <input className="input" placeholder={campo.ayuda} value={texto} onChange={e => setMatTexto(t => ({ ...t, [campo.id]: e.target.value }))} />
                  </div>
                );
              }
              // archivo o imagen o video -> uploader
              return (
                <div key={campo.id} style={{ marginBottom: 12 }}>
                  <label className="label">{campo.etiqueta}</label>
                  <label className="dropzone" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 16, border: '1.5px dashed var(--border2)', borderRadius: 10, cursor: 'pointer', textAlign: 'center', background: 'var(--bg2)' }}>
                    <span style={{ fontSize: 20 }}>{campo.tipo === 'imagenes' ? '🖼️' : campo.tipo === 'videos' ? '🎬' : '📎'}</span>
                    <span className="small" style={{ fontWeight: 700 }}>Arrastrá o hacé click para subir</span>
                    <span className="tiny muted">{campo.ayuda}</span>
                    <input type="file" multiple accept={campo.tipo === 'imagenes' ? 'image/*' : campo.tipo === 'videos' ? 'video/*' : '*/*'} style={{ display: 'none' }} onChange={e => agregarArchivos(campo, e.target.files)} />
                  </label>
                  {archivos.length > 0 && (
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {archivos.map((f, i) => (
                        <div key={i} className="row small" style={{ gap: 8, padding: '6px 10px', borderRadius: 8, background: 'var(--bg2)', justifyContent: 'space-between' }}>
                          <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📄 {f.etiqueta}</span>
                          <span className="row" style={{ gap: 8, alignItems: 'center' }}>
                            <span className="tiny muted" style={{ flexShrink: 0 }}>{f.valor}</span>
                            <button type="button" className="icon-btn" style={{ fontSize: 12 }} onClick={() => quitarMaterial(campo.id, i)}>✕</button>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
                })}
                </div>
              </div>
            ))}
          </div>
          <div className="ob-help">🤖 GAIA te sugerirá presupuesto y audiencia automáticamente al crear.</div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <Button variant="ghost" onClick={() => setNueva(false)}>Cancelar</Button>
          <Button onClick={crear}>Crear campaña</Button>
        </div>
      </Modal>

      <Modal open={!!edit} onClose={() => setEdit(null)} title="Editar campaña">
        <div className="ob-fields">
          <div><label className="label">Nombre de campaña</label><input className="input" value={editNombre} onChange={e => setEditNombre(e.target.value)} autoFocus /></div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <Button variant="ghost" onClick={() => setEdit(null)}>Cancelar</Button>
          <Button onClick={guardarEdit}>Guardar</Button>
        </div>
      </Modal>

      <Modal open={!!borrar} onClose={() => setBorrar(null)} title="Eliminar campaña">
        <p className="small" style={{ marginTop: 0 }}>¿Seguro que querés eliminar <b>{borrar?.nombre}</b>? Esta acción no se puede deshacer.</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <Button variant="ghost" onClick={() => setBorrar(null)}>Cancelar</Button>
          <Button variant="danger" onClick={eliminar}>Eliminar</Button>
        </div>
      </Modal>

      <Modal open={!!reporte} onClose={() => setReporte(null)} title={`Reporte: ${reporte?.nombre ?? ''}`}>
        {reporte && (
          <div className="ob-fields">
            <div className="row small" style={{ justifyContent: 'space-between' }}><span className="muted">Estado</span><Badge tone={TONO[reporte.estado]}>{reporte.estado}</Badge></div>
            <div className="row small" style={{ justifyContent: 'space-between' }}><span className="muted">Progreso</span><b>{reporte.campPct}%</b></div>
            <div className="row small" style={{ justifyContent: 'space-between' }}><span className="muted">ROAS</span><b>{reporte.roas}</b></div>
            <div className="row small" style={{ justifyContent: 'space-between' }}><span className="muted">Presupuesto</span><b>{reporte.presupuesto}</b></div>
            <div className="row small" style={{ justifyContent: 'space-between' }}><span className="muted">Costo</span><b>{reporte.costo}</b></div>
            <div className="row small" style={{ justifyContent: 'space-between' }}><span className="muted">Alcance</span><b>{reporte.alcance}</b></div>
            <div className="row small" style={{ justifyContent: 'space-between' }}><span className="muted">Conversiones</span><b>{reporte.conversiones}</b></div>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <Button variant="ghost" onClick={() => setReporte(null)}>Cerrar</Button>
        </div>
      </Modal>

      <Modal open={!!estrat} onClose={() => setEstrat(null)} title={estrat ? `${estrat.icono} ${estrat.nombre}: Estrategia` : ''}>
        {estrat && (
          <div className="ob-fields">
            <div className="tipo-preview" style={{ borderColor: estrat.color + '55' }}>
              <div className="tipo-preview-head"><span>{estrat.icono}</span><b>Resumen</b></div>
              <div className="tiny muted" style={{ lineHeight: 1.6 }}>{estrat.estrategia}</div>
            </div>
            <div className="row small" style={{ justifyContent: 'space-between' }}><span className="muted">KPI principal</span><b>{estrat.kpi}</b></div>
            <div className="row small" style={{ justifyContent: 'space-between' }}><span className="muted">Tono</span><b>{estrat.tono}</b></div>
            <div className="ob-fields">
              <div><label className="label">Audiencia objetivo</label><div className="tiny muted" style={{ lineHeight: 1.6 }}>{estrat.audiencia}</div></div>
              <div><label className="label">Formatos creativos</label><div className="tiny muted" style={{ lineHeight: 1.6 }}>{estrat.formato}</div></div>
            </div>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <Button variant="ghost" onClick={() => setEstrat(null)}>Cerrar</Button>
        </div>
      </Modal>

      <Toast show={!!toast} text={toast} />
    </>
  );
}

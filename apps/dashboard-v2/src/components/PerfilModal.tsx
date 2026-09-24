import { useEffect, useState } from 'react';
import { Modal, Button, Badge } from './ui';
import { I_User, I_Check, I_Upload, I_Trash, I_Palette, I_Image, SinkrooMark } from './icons';
import {
  usePerfil, inicialesDe, ZONAS, MONEDAS, COLORES_AVATAR,
  PALETAS, COLORES_MARCA, tieneMarca, leerLogo, semaforoQueChoca, brilloDe,
  gradienteMarca, textoDeGradiente, colorLegible, tripleDe, type Perfil,
} from '../lib/perfil';

// =============================================================================================
// Editar el perfil. Se abre desde el bloque de usuario del sidebar. Lo que se guarda acá
// cambia de verdad en todo el panel: el saludo del hero, el nombre del negocio, el avatar,
// EL LOGO DE LA MARCA y LOS COLORES de su paleta.
//
// Los colores se ven en vivo mientras elegís (el panel de atrás se repinta); si cancelás, vuelve
// a como estaba guardado. Los semáforos (verde / ámbar / rojo / gris) no se tocan: esta pantalla
// lo muestra con una alarma de verdad en la vista previa.
// =============================================================================================

export function PerfilModal({ abierto, cerrar, avisar }: { abierto: boolean; cerrar: () => void; avisar?: (t: string) => void }) {
  const { perfil, guardar, previsualizar, terminarPrevia } = usePerfil();
  const [borrador, setBorrador] = useState<Perfil>(perfil);
  const [guardado, setGuardado] = useState(false);
  const [errorLogo, setErrorLogo] = useState('');
  const [sinEspacio, setSinEspacio] = useState(false);

  // Cada vez que se abre, se parte de lo que hay guardado
  const [abiertoAntes, setAbiertoAntes] = useState(false);
  if (abierto && !abiertoAntes) { setAbiertoAntes(true); setBorrador(perfil); setGuardado(false); setErrorLogo(''); setSinEspacio(false); }
  if (!abierto && abiertoAntes) setAbiertoAntes(false);

  const set = (k: keyof Perfil, v: string) => { setBorrador(p => ({ ...p, [k]: v })); setGuardado(false); };

  // Vista previa en vivo: mientras el modal está abierto, el panel se pinta con lo que estás
  // eligiendo (colores, logo y nombre). Si cancelás, todo vuelve a lo que estaba guardado.
  useEffect(() => { if (abierto) previsualizar(borrador); }, [borrador, abierto]);
  useEffect(() => { if (!abierto) terminarPrevia(); }, [abierto]);

  const volverAlPerfil = () => { setBorrador(perfil); terminarPrevia(); };
  const hayCambios = JSON.stringify(borrador) !== JSON.stringify(perfil);
  const faltaNombre = !borrador.nombre.trim();
  const marcaPropia = tieneMarca(borrador);
  const choque = semaforoQueChoca(borrador.col1) || semaforoQueChoca(borrador.col2);
  const temaClaro = typeof document !== 'undefined' && document.documentElement.classList.contains('light');
  const grad = marcaPropia ? gradienteMarca(borrador.col1, borrador.col2) : undefined;
  const sobreGrad = marcaPropia ? textoDeGradiente(borrador.col1, borrador.col2) : '#ffffff';
  const acento = marcaPropia ? colorLegible(borrador.col1, temaClaro) : 'var(--purple2)';

  const subirLogo = (archivo?: File) => {
    if (!archivo) return;
    setErrorLogo('');
    leerLogo(archivo)
      .then(datos => { set('logo', datos); avisar?.(`Logo de ${borrador.marca || 'tu negocio'} cargado: se ve en el hero y arriba del título`); })
      .catch((e: Error) => setErrorLogo(e.message || 'No pudimos leer la imagen.'));
  };

  const salvar = () => {
    if (faltaNombre) return;
    const ok = guardar({ ...borrador, nombre: borrador.nombre.trim(), marca: borrador.marca.trim() || 'Tu negocio' });
    if (!ok) { setSinEspacio(true); return; }
    setGuardado(true);
    avisar?.('Perfil actualizado: se ve en todo el panel');
    cerrar();
  };

  const cancelar = () => { volverAlPerfil(); cerrar(); };

  return (
    <Modal open={abierto} onClose={cancelar} title="Tu perfil">
      <div className="perf-grid">
        <div className="perf-av">
          <div className="av" style={{ width: 62, height: 62, fontSize: 21, background: `linear-gradient(135deg, ${borrador.color}, ${borrador.color}bb)` }}>
            {inicialesDe(borrador.nombre)}
          </div>
          <div className="tiny muted" style={{ textAlign: 'center', marginTop: 7 }}>Tu avatar</div>
          <div className="row" style={{ gap: 6, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {COLORES_AVATAR.map(c => (
              <button key={c} className={`perf-color ${borrador.color === c ? 'sel' : ''}`} title="Cambiar el color del avatar"
                style={{ background: c }} onClick={() => set('color', c)} />
            ))}
          </div>
        </div>

        <div style={{ minWidth: 0, flex: 1 }}>
          <label className="label">Nombre y apellido</label>
          <input className="input" placeholder="María Paula" value={borrador.nombre} onChange={e => set('nombre', e.target.value)} />
          {faltaNombre && <div className="tiny" style={{ color: 'var(--amber)', marginTop: 5 }}>El nombre no puede quedar vacío: es con el que te saluda el panel.</div>}

          <label className="label" style={{ marginTop: 11 }}>Nombre del negocio o marca</label>
          <input className="input" placeholder="Skincare Natural" value={borrador.marca} onChange={e => set('marca', e.target.value)} />

          <label className="label" style={{ marginTop: 11 }}>Email de la cuenta</label>
          <input className="input" placeholder="hola@tunegocio.com" value={borrador.email} onChange={e => set('email', e.target.value)} />

          <label className="label" style={{ marginTop: 11 }}>WhatsApp o teléfono</label>
          <input className="input" placeholder="+54 9 11 5555-2341" value={borrador.telefono} onChange={e => set('telefono', e.target.value)} />
          <div className="tiny muted" style={{ marginTop: 5 }}>Es el número que el motor usa para avisarte y para que te escriban tus clientes.</div>
        </div>
      </div>

      {/* ===================== EL LOGO DE LA MARCA ===================== */}
      <div className="marca-sep" />
      <div className="marca-h"><I_Image size={15} /> <b>El logo de tu marca</b></div>
      <div className="tiny muted" style={{ marginBottom: 10 }}>
        Subilo y aparece en el hero de «Hoy» y arriba del título de cada sección. El búho de Sinkroo
        queda como la marca del producto, en el menú de la izquierda.
      </div>
      <div className="marca-logo-row">
        <span className="marca-logo-prev" title="Así se va a ver tu logo en el hero">
          {borrador.logo
            ? <img src={borrador.logo} alt={`Logo de ${borrador.marca || 'tu negocio'}`} />
            : <SinkrooMark size={54} />}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <label className="btn btn-ghost btn-sm marca-subir" title="Elegí la imagen de tu logo (PNG, JPG o SVG). Se achica sola antes de guardarse.">
              <I_Upload size={13} /> {borrador.logo ? 'Cambiar el logo' : 'Subir mi logo'}
              <input type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => { subirLogo(e.target.files?.[0] ?? undefined); e.target.value = ''; }} />
            </label>
            {borrador.logo && (
              <Button variant="ghost" className="btn-sm"
                title="Quita tu logo y vuelve al búho de Sinkroo. Podés volver al logo de Sinkroo cuando quieras: el archivo queda solo en este navegador."
                onClick={() => { set('logo', ''); setErrorLogo(''); }}>
                <I_Trash size={13} /> Quitar el logo
              </Button>
            )}
          </div>
          <div className="tiny muted" style={{ marginTop: 7 }}>
            {borrador.logo
              ? 'Tu logo se guarda en este navegador junto con el perfil. Podés quitarlo cuando quieras.'
              : 'Todavía no subiste un logo: se ve el de Sinkroo, como hasta ahora.'}
          </div>
          {errorLogo && <div className="tiny" style={{ color: 'var(--red)', marginTop: 5 }}>{errorLogo}</div>}
        </div>
      </div>

      {/* ===================== LOS COLORES DE LA MARCA ===================== */}
      <div className="marca-sep" />
      <div className="marca-h"><I_Palette size={15} /> <b>Los colores de tu negocio</b></div>
      <div className="tiny muted" style={{ marginBottom: 10 }}>
        Elegí los dos colores de tu paleta. Pintan la identidad del panel: los botones principales,
        el brillo del hero, la sección activa del menú y la serie principal del gráfico. Los avisos
        (verde, ámbar, rojo) no cambian: siguen diciendo lo mismo.
      </div>

      <div className="marca-col2">
        {([['col1', 'Color principal'], ['col2', 'Color de acento']] as const).map(([clave, etiqueta]) => (
          <div key={clave} className="marca-col-bloque">
            <label className="label" style={{ marginBottom: 8 }}>{etiqueta}</label>
            <div className="row" style={{ gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
              <label className="marca-picker" title={`Elegir un ${etiqueta.toLowerCase()} propio con el selector de color`}
                style={{ background: borrador[clave] || 'var(--bg3)' }}>
                <input type="color" value={borrador[clave] || '#4A7C59'}
                  onChange={e => set(clave, e.target.value)} />
              </label>
              <span className="marca-hex mono">{borrador[clave] || '— sin definir —'}</span>
              {borrador[clave] && (
                <button className="marca-x" title="Vaciar este color y volver a los colores de Sinkroo"
                  onClick={() => set(clave, '')}>✕</button>
              )}
            </div>
            <div className="row" style={{ gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
              {COLORES_MARCA.map(c => (
                <button key={c} className={`perf-color ${borrador[clave] === c ? 'sel' : ''}`}
                  title={`Usar ${c} como ${etiqueta.toLowerCase()}`}
                  style={{ background: c }} onClick={() => set(clave, c)} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <label className="label" style={{ marginTop: 14, marginBottom: 8 }}>Paletas armadas</label>
      <div className="marca-paletas">
        {PALETAS.map(p => {
          const on = borrador.col1 === p.col1 && borrador.col2 === p.col2;
          return (
            <button key={p.nombre + p.col1 + p.col2} type="button" className={`marca-paleta ${on ? 'sel' : ''}`}
              title={on ? `Ya estás usando ${p.nombre} ${p.detalle}` : `Usar la paleta ${p.nombre} ${p.detalle}`}
              onClick={() => { setBorrador(b => ({ ...b, col1: p.col1, col2: p.col2 })); setGuardado(false); }}>
              <span className="marca-paleta-pt" style={{ background: gradienteMarca(p.col1, p.col2) }} />
              <span className="marca-paleta-tx">{on ? '✓ ' : ''}{p.nombre}<small>{p.detalle}</small></span>
            </button>
          );
        })}
      </div>

      {marcaPropia && (
        <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <Button variant="ghost" className="btn-sm"
            title="Vuelve a los colores violetas de Sinkroo. Podés volver al logo de Sinkroo y a sus colores cuando quieras."
            onClick={() => setBorrador(b => ({ ...b, col1: '', col2: '' }))}>
            <I_Trash size={13} /> Volver a los colores de Sinkroo
          </Button>
        </div>
      )}

      {/* ===================== LA VISTA PREVIA ===================== */}
      <div className="marca-prev" style={{
        ['--prev-grad' as any]: grad ?? 'var(--grad)',
        ['--prev-sobre' as any]: sobreGrad,
        ['--prev-acento' as any]: acento,
        ['--prev-acento-rgb' as any]: marcaPropia ? tripleDe(colorLegible(borrador.col1, temaClaro)) : '168,85,247',
      }}>
        <div className="marca-prev-lb">Así queda tu panel con estos colores</div>
        <div className="marca-prev-nav" title="La sección activa del menú tomaría tu color de acento">
          <span className="mp-ico">🏠</span><span className="mp-lb">Hoy</span><span className="mp-pt" />
        </div>
        <div className="marca-prev-hero">
          <span className="mp-logo">
            {borrador.logo ? <img src={borrador.logo} alt={`Logo de ${borrador.marca || 'tu negocio'}`} /> : <SinkrooMark size={34} />}
          </span>
          <span className="mp-hero-tx">Hola {borrador.nombre.trim().split(/\s+/)[0] || 'María Paula'}, soy <b>Sinkroo</b> 👋</span>
        </div>
        <div className="marca-prev-row">
          <button className="marca-prev-btn" type="button" title="Ejemplo del botón principal con tu degradado"
            onClick={() => avisar?.('Este botón es de la vista previa')}>Crear la primera →</button>
          <span className="badge badge-red" title="El rojo de «crítico» es un semáforo: no lo toca tu paleta">2 críticas</span>
          <span className="badge badge-amber" title="El ámbar de «revisar» es un semáforo: no lo toca tu paleta">3 para revisar</span>
        </div>
        <div className="marca-prev-bars" title="La serie principal del gráfico grande usa tu color principal">
          {[38, 56, 47, 74, 66, 92].map((v, i) => (
            <span key={i} className="mp-bar" style={{ height: `${v}%` }} />
          ))}
        </div>
        <div className="tiny muted">
          El rojo, el ámbar y el verde de la vista previa <b>no cambian nunca</b>: son semáforos, y con
          cualquier paleta siguen significando lo mismo.
        </div>
      </div>

      {choque && (
        <div className="tiny" style={{ color: 'var(--amber)', marginTop: 9 }}>
          Tu color se parece al {choque}. Los usás igual en los botones, el menú y el gráfico, pero en los
          avisos manda el semáforo: así el rojo nunca deja de querer decir crítico.
        </div>
      )}
      {marcaPropia && brilloDe(borrador.col1) > 0.72 && (
        <div className="tiny muted" style={{ marginTop: 6 }}>
          Tu color principal es clarito: en los botones uso una versión un poco más oscura para que el
          texto se lea bien. El tono sigue siendo el tuyo.
        </div>
      )}

      <label className="label" style={{ marginTop: 16 }}>Zona horaria</label>
      <div className="tipo-chips">
        {ZONAS.map(z => (
          <button key={z} type="button" className={`tipo-chip ${borrador.zona === z ? 'sel' : ''}`}
            onClick={() => set('zona', z)}>{borrador.zona === z ? '✓ ' : ''}{z}</button>
        ))}
      </div>
      <div className="tiny muted" style={{ marginTop: 6 }}>Define cuándo el motor publica y a qué hora puede mandar mensajes.</div>

      <label className="label" style={{ marginTop: 14 }}>Moneda</label>
      <div className="tipo-chips">
        {MONEDAS.map(m => (
          <button key={m} type="button" className={`tipo-chip ${borrador.moneda === m ? 'sel' : ''}`}
            onClick={() => set('moneda', m)}>{borrador.moneda === m ? '✓ ' : ''}{m}</button>
        ))}
      </div>
      <div className="tiny muted" style={{ marginTop: 6 }}>Con esta moneda se muestran los presupuestos y las ventas.</div>

      <div className="acc-why" style={{ marginTop: 16 }}>
        <b>Esto no es decorativo.</b> El nombre con el que te saluda el panel, el nombre de tu negocio,
        tu logo y tus colores son los que usa el motor para trabajar. Cambialos acá y cambian en todo el panel.
      </div>

      <div className="row" style={{ gap: 9, justifyContent: 'flex-end', marginTop: 16, flexWrap: 'wrap' }}>
        {guardado && <span className="tiny" style={{ color: 'var(--green)', fontWeight: 700, marginRight: 'auto' }}><I_Check size={12} /> Guardado</span>}
        {hayCambios && !guardado && <Badge tone="amber">tenés cambios sin guardar</Badge>}
        {sinEspacio && <span className="tiny" style={{ color: 'var(--red)', marginRight: 'auto' }}>El navegador no dejó guardar (¿modo privado o el logo pesa mucho?). Probá con un logo más chico.</span>}
        <Button variant="ghost" className="btn-sm" title="Cierra sin guardar nada: el panel vuelve a como estaba con tu logo y tus colores de antes"
          onClick={cancelar}>Cancelar</Button>
        <Button className="btn-sm" disabled={!hayCambios || faltaNombre}
          title={faltaNombre ? 'Poné tu nombre primero' : hayCambios ? 'Guarda tu logo y tus colores: se ven en todo el panel' : 'No cambiaste nada todavía'}
          onClick={salvar}><I_User size={13} /> Guardar cambios</Button>
      </div>
    </Modal>
  );
}

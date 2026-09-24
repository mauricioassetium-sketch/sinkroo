import { useState } from 'react';
import { Modal, Button, Badge } from './ui';
import { I_User, I_Check, I_Palette } from './icons';
import {
  usePerfil, inicialesDe, ZONAS, MONEDAS, COLORES_AVATAR, type Perfil,
} from '../lib/perfil';

// =============================================================================================
// TU PERFIL — los datos de la cuenta: cómo te llamás, tu negocio, tu email, tu WhatsApp, la zona
// horaria, la moneda y el color de tu avatar.
//
// EL LOGO Y LOS COLORES YA NO VIVEN ACÁ: se mudaron a «Hacé tuyo este panel», el pop-up de la
// personalización (el botón de la paleta, en la barra de arriba, y el bloque de usuario del menú).
// Así cada cosa tiene su lugar: acá los datos, allá tu marca.
// =============================================================================================

export function PerfilModal({ abierto, cerrar, avisar }: { abierto: boolean; cerrar: () => void; avisar?: (t: string) => void }) {
  const { perfil, guardar } = usePerfil();
  const [borrador, setBorrador] = useState<Perfil>(perfil);
  const [guardado, setGuardado] = useState(false);
  const [sinEspacio, setSinEspacio] = useState(false);

  // Cada vez que se abre, se parte de lo que hay guardado
  const [abiertoAntes, setAbiertoAntes] = useState(false);
  if (abierto && !abiertoAntes) { setAbiertoAntes(true); setBorrador(perfil); setGuardado(false); setSinEspacio(false); }
  if (!abierto && abiertoAntes) setAbiertoAntes(false);

  const set = (k: keyof Perfil, v: string) => { setBorrador(p => ({ ...p, [k]: v })); setGuardado(false); };

  const volverAlPerfil = () => setBorrador(perfil);
  const hayCambios = JSON.stringify(borrador) !== JSON.stringify(perfil);
  const faltaNombre = !borrador.nombre.trim();

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
              <button key={c} className={`perf-color ${borrador.color === c ? 'sel' : ''}`} title="Cambiar el color de las iniciales de tu avatar"
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

      <label className="label" style={{ marginTop: 16 }}>Zona horaria</label>
      <div className="tipo-chips">
        {ZONAS.map(z => (
          <button key={z} type="button" className={`tipo-chip ${borrador.zona === z ? 'sel' : ''}`}
            title={`Trabajar con la zona ${z}`}
            onClick={() => set('zona', z)}>{borrador.zona === z ? '✓ ' : ''}{z}</button>
        ))}
      </div>
      <div className="tiny muted" style={{ marginTop: 6 }}>Define cuándo el motor publica y a qué hora puede mandar mensajes.</div>

      <label className="label" style={{ marginTop: 14 }}>Moneda</label>
      <div className="tipo-chips">
        {MONEDAS.map(m => (
          <button key={m} type="button" className={`tipo-chip ${borrador.moneda === m ? 'sel' : ''}`}
            title={`Mostrar presupuestos y ventas en ${m}`}
            onClick={() => set('moneda', m)}>{borrador.moneda === m ? '✓ ' : ''}{m}</button>
        ))}
      </div>
      <div className="tiny muted" style={{ marginTop: 6 }}>Con esta moneda se muestran los presupuestos y las ventas.</div>

      {/* ---------- El puente a la personalización: el logo y los colores tienen su propio pop-up ---------- */}
      <div className="acc-why" style={{ marginTop: 16, display: 'flex', alignItems: 'flex-start', gap: 9 }}>
        <I_Palette size={16} />
        <span>
          <b>Tu logo y tus colores no están acá.</b> Se cambian en «Hacé tuyo este panel», el botón de la
          paleta que está arriba a la derecha (o el de tu nombre, abajo del menú): ahí los subís, los
          probás viendo el panel cambiar en vivo y quedan guardados en tu cuenta.
        </span>
      </div>

      <div className="row" style={{ gap: 9, justifyContent: 'flex-end', marginTop: 16, flexWrap: 'wrap' }}>
        {guardado && <span className="tiny" style={{ color: 'var(--green)', fontWeight: 700, marginRight: 'auto' }}><I_Check size={12} /> Guardado</span>}
        {hayCambios && !guardado && <Badge tone="amber">tenés cambios sin guardar</Badge>}
        {sinEspacio && <span className="tiny" style={{ color: 'var(--red)', marginRight: 'auto' }}>El navegador no dejó guardar (¿modo privado?). Probá de nuevo.</span>}
        <Button variant="ghost" className="btn-sm" title="Cierra sin guardar nada: tus datos vuelven a como estaban"
          onClick={cancelar}>Cancelar</Button>
        <Button className="btn-sm" disabled={!hayCambios || faltaNombre}
          title={faltaNombre ? 'Poné tu nombre primero' : hayCambios ? 'Guarda tus datos de cuenta: se ven en todo el panel' : 'No cambiaste nada todavía'}
          onClick={salvar}><I_User size={13} /> Guardar cambios</Button>
      </div>
    </Modal>
  );
}

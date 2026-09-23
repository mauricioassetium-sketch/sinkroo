import { useState } from 'react';
import { Modal, Button, Badge } from './ui';
import { I_User, I_Check } from './icons';
import { usePerfil, inicialesDe, ZONAS, MONEDAS, COLORES_AVATAR, type Perfil } from '../lib/perfil';

// =============================================================================================
// Editar el perfil. Se abre desde el bloque de usuario del sidebar. Lo que se guarda acá
// cambia de verdad en todo el panel: el saludo del hero, el nombre del negocio, el avatar.
// =============================================================================================

export function PerfilModal({ abierto, cerrar, avisar }: { abierto: boolean; cerrar: () => void; avisar?: (t: string) => void }) {
  const { perfil, guardar } = usePerfil();
  const [borrador, setBorrador] = useState<Perfil>(perfil);
  const [guardado, setGuardado] = useState(false);

  // Cada vez que se abre, se parte de lo que hay guardado
  const [abiertoAntes, setAbiertoAntes] = useState(false);
  if (abierto && !abiertoAntes) { setAbiertoAntes(true); setBorrador(perfil); setGuardado(false); }
  if (!abierto && abiertoAntes) setAbiertoAntes(false);

  const set = (k: keyof Perfil, v: string) => { setBorrador(p => ({ ...p, [k]: v })); setGuardado(false); };
  const hayCambios = JSON.stringify(borrador) !== JSON.stringify(perfil);
  const faltaNombre = !borrador.nombre.trim();

  const salvar = () => {
    if (faltaNombre) return;
    guardar({ ...borrador, nombre: borrador.nombre.trim(), marca: borrador.marca.trim() || 'Tu negocio' });
    setGuardado(true);
    avisar?.('Perfil actualizado: se ve en todo el panel');
    cerrar();
  };

  return (
    <Modal open={abierto} onClose={cerrar} title="Tu perfil">
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
        <b>Esto no es decorativo.</b> El nombre con el que te saluda el panel, el nombre de tu negocio
        y tu zona horaria son los que usa el motor para trabajar. Cambialos acá y cambian en todo el panel.
      </div>

      <div className="row" style={{ gap: 9, justifyContent: 'flex-end', marginTop: 16, flexWrap: 'wrap' }}>
        {guardado && <span className="tiny" style={{ color: 'var(--green)', fontWeight: 700, marginRight: 'auto' }}><I_Check size={12} /> Guardado</span>}
        {hayCambios && !guardado && <Badge tone="amber">tenés cambios sin guardar</Badge>}
        <Button variant="ghost" className="btn-sm" title="Cierra sin guardar nada de lo que escribiste"
          onClick={() => { setBorrador(perfil); cerrar(); }}>Cancelar</Button>
        <Button className="btn-sm" disabled={!hayCambios || faltaNombre}
          title={faltaNombre ? 'Poné tu nombre primero' : hayCambios ? 'Guarda y se ve en todo el panel' : 'No cambiaste nada todavía'}
          onClick={salvar}><I_User size={13} /> Guardar cambios</Button>
      </div>
    </Modal>
  );
}

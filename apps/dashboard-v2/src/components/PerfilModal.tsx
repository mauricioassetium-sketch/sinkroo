import { useState } from 'react';
import { Modal, Button, Badge } from './ui';
import { I_User, I_Check, I_Palette, I_Search, I_Globe, I_Bank } from './icons';
import {
  usePerfil, inicialesDe, ZONAS, MONEDAS, COLORES_AVATAR, buscarLugares, monedaDe, conversionDelDia,
  type Perfil, type Lugar,
} from '../lib/perfil';

// =============================================================================================
// Su PERFIL — los datos de la cuenta: cómo le llamás, su negocio, su email, su WhatsApp, la zona
// horaria, la moneda y el color de su avatar.
//
// LA UBICACIÓN MANDA: el buscador de aquí abajo es el atajo corto. El cliente escribe su ciudad
// —o su país— y de un solo clic quedan puestas las DOS cosas que salen de ese dato: la zona horaria
// con la que el motor publica y la moneda con la que se ven los presupuestos y las ventas. Al lado,
// la conversión del día de esa moneda contra el dólar, con el banco central que publica el número.
//
// EL LOGO Y LOS COLORES YA NO VIVEN Aquí: se mudaron a «Haga suyo este panel», el pop-up de la
// personalización (el botón de la paleta, en la barra de arriba, y el bloque de usuario del menú).
// Así cada cosa tiene su lugar: aquí los datos, allá su marca.
// =============================================================================================

export function PerfilModal({ abierto, cerrar, avisar }: { abierto: boolean; cerrar: () => void; avisar?: (t: string) => void }) {
  const { perfil, guardar } = usePerfil();
  const [borrador, setBorrador] = useState<Perfil>(perfil);
  const [guardado, setGuardado] = useState(false);
  const [sinEspacio, setSinEspacio] = useState(false);
  // El buscador de ubicación: lo que el cliente escribió, si ya tocó «Buscar» y el lugar que aplicó.
  const [busqueda, setBusqueda] = useState('');
  const [buscoAhora, setBuscoAhora] = useState(false);
  const [aplicado, setAplicado] = useState<Lugar | null>(null);

  // Cada vez que se abre, se parte de lo que hay guardado
  const [abiertoAntes, setAbiertoAntes] = useState(false);
  if (abierto && !abiertoAntes) {
    setAbiertoAntes(true); setBorrador(perfil); setGuardado(false); setSinEspacio(false);
    setBusqueda(''); setBuscoAhora(false); setAplicado(null);
  }
  if (!abierto && abiertoAntes) setAbiertoAntes(false);

  const set = (k: keyof Perfil, v: string) => { setBorrador(p => ({ ...p, [k]: v })); setGuardado(false); };

  // ---------- Ubicación → zona horaria + moneda ----------
  const consulta = busqueda.trim();
  const resultados = buscarLugares(consulta).slice(0, 6);
  const sinResultados = (consulta.length >= 2 && !resultados.length) || (buscoAhora && consulta.length < 2);

  /** Elegir un lugar aplica las dos cosas de una sola vez: su zona horaria y la moneda de su país. */
  const aplicarLugar = (l: Lugar) => {
    setBorrador(p => ({ ...p, zona: l.zona, moneda: l.moneda }));
    setGuardado(false);
    setAplicado(l);
    setBusqueda('');
    setBuscoAhora(false);
  };

  // ---------- La moneda y su conversión del día ----------
  const mon = monedaDe(borrador.moneda);
  const conv = conversionDelDia(borrador.moneda);

  const volverAlPerfil = () => setBorrador(perfil);
  const hayCambios = JSON.stringify(borrador) !== JSON.stringify(perfil);
  const faltaNombre = !borrador.nombre.trim();

  const salvar = () => {
    if (faltaNombre) return;
    const ok = guardar({ ...borrador, nombre: borrador.nombre.trim(), marca: borrador.marca.trim() || 'Su negocio' });
    if (!ok) { setSinEspacio(true); return; }
    setGuardado(true);
    avisar?.('Perfil actualizado: se ve en todo el panel');
    cerrar();
  };

  const cancelar = () => { volverAlPerfil(); cerrar(); };

  return (
    <Modal open={abierto} onClose={cancelar} title="Su perfil">
      <div className="perf-grid">
        <div className="perf-av">
          <div className="av" style={{ width: 62, height: 62, fontSize: 21, background: `linear-gradient(135deg, ${borrador.color}, ${borrador.color}bb)` }}>
            {inicialesDe(borrador.nombre)}
          </div>
          <div className="tiny muted" style={{ textAlign: 'center', marginTop: 7 }}>Su avatar</div>
          <div className="row" style={{ gap: 6, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {COLORES_AVATAR.map(c => (
              <button key={c} className={`perf-color ${borrador.color === c ? 'sel' : ''}`} title="Cambiar el color de las iniciales de su avatar"
                style={{ background: c }} onClick={() => set('color', c)} />
            ))}
          </div>
        </div>

        <div style={{ minWidth: 0, flex: 1 }}>
          <label className="label">Nombre y apellido</label>
          <input className="input" placeholder="María Paula" value={borrador.nombre} onChange={e => set('nombre', e.target.value)} />
          {faltaNombre && <div className="tiny" style={{ color: 'var(--amber)', marginTop: 5 }}>El nombre no puede quedar vacío: es con el que le saluda el panel.</div>}

          <label className="label" style={{ marginTop: 11 }}>Nombre del negocio o marca</label>
          <input className="input" placeholder="Skincare Natural" value={borrador.marca} onChange={e => set('marca', e.target.value)} />

          <label className="label" style={{ marginTop: 11 }}>Email de la cuenta</label>
          <input className="input" placeholder="hola@tunegocio.com" value={borrador.email} onChange={e => set('email', e.target.value)} />

          <label className="label" style={{ marginTop: 11 }}>WhatsApp o teléfono</label>
          <input className="input" placeholder="+57 300 555 2341" value={borrador.telefono} onChange={e => set('telefono', e.target.value)} />
          <div className="tiny muted" style={{ marginTop: 5 }}>Es el número que el motor usa para avisarle y para que le escriban sus clientes.</div>
        </div>
      </div>

      {/* ---------- EL RESUMEN: lo que el motor va a usar para publicar y para hablar de dinero ---------- */}
      <div className="perf-resumen">
        <span className="perf-resumen-lb"><I_Globe size={13} /> Cómo queda su cuenta</span>
        <span className="perf-resumen-txt">
          Zona horaria <b>{borrador.zona}</b> · Moneda <b>{mon.nombre} ({mon.codigo})</b>
        </span>
      </div>

      {/* ================= ZONA HORARIA ================= */}
      <label className="label" style={{ marginTop: 16 }}>Zona horaria</label>

      {/* ---------- BUSCADOR DE UBICACIÓN: de dónde es el negocio, y con eso ya se sabe la zona y la moneda ---------- */}
      <div className="ubic-buscador">
        <span className="ubic-lupa" aria-hidden="true"><I_Search size={14} /></span>
        <input className="input ubic-input" type="text" value={busqueda} placeholder="Busque su ciudad o país: Bogotá, Miami, Madrid…"
          title="Escriba su ciudad y el panel le propone la zona horaria y la moneda del país"
          onChange={e => { setBusqueda(e.target.value); setBuscoAhora(false); }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); setBuscoAhora(true); } }} />
        <Button variant="ghost" className="btn-sm ubic-btn"
          title="Buscar su ciudad entre los lugares que el panel conoce"
          onClick={() => setBuscoAhora(true)}><I_Search size={13} /> Buscar</Button>
      </div>
      <div className="tiny muted" style={{ marginTop: 6 }}>
        Elija su ubicación y se aplican las dos cosas de una sola vez: la zona horaria con la que el motor publica y la moneda con la que ve sus presupuestos y sus ventas.
      </div>

      {resultados.length > 0 && (
        <div className="ubic-res">
          <div className="ubic-res-lb">Lugares encontrados</div>
          {resultados.map(l => {
            const activo = borrador.zona === l.zona && borrador.moneda === l.moneda;
            return (
              <button key={`${l.pais}-${l.nombre}`} type="button" className={`ubic-res-item ${activo ? 'sel' : ''}`}
                title={`Usar la zona y la moneda de ${l.nombre}, ${l.pais}`}
                onClick={() => aplicarLugar(l)}>
                <span className="ubic-bandera" aria-hidden="true">{l.bandera}</span>
                <span className="ubic-ciudad">{l.nombre}</span>
                <span className="ubic-pais">{l.pais}</span>
                <span className="ubic-meta">{l.zona} · {l.moneda}</span>
              </button>
            );
          })}
        </div>
      )}

      {sinResultados && (
        <div className="ubic-vacio">
          No encontramos «{consulta || busqueda}» entre los lugares que el panel conoce. Pruebe con Medellín, Bogotá, Ciudad de México, Miami, Madrid, Santiago o São Paulo — o toque una de las zonas de abajo.
        </div>
      )}

      {aplicado && (
        <div className="ubic-aviso">
          <span className="ubic-bandera" aria-hidden="true">{aplicado.bandera}</span>
          <span>
            <b>{aplicado.nombre} → {aplicado.zona} y {aplicado.moneda}.</b>{' '}
            Se aplicaron las dos: así publica el motor y así se ven sus presupuestos y sus ventas.
          </span>
        </div>
      )}

      <div className="ubic-mano-lb">O elija la zona a mano</div>
      <div className="tipo-chips">
        {ZONAS.map(z => (
          <button key={z} type="button" className={`tipo-chip ${borrador.zona === z ? 'sel' : ''}`}
            title={`Trabajar con la zona ${z}`}
            onClick={() => set('zona', z)}>{borrador.zona === z ? '✓ ' : ''}{z}</button>
        ))}
      </div>
      <div className="tiny muted" style={{ marginTop: 6 }}>Define cuándo el motor publica y a qué hora puede mandar mensajes.</div>

      {/* ================= MONEDA ================= */}
      <label className="label" style={{ marginTop: 14 }}>Moneda</label>
      <div className="tipo-chips">
        {MONEDAS.map(m => (
          <button key={m.codigo} type="button" className={`tipo-chip mon-chip ${borrador.moneda === m.nombre ? 'sel' : ''}`}
            title={`Mostrar presupuestos y ventas en ${m.nombre} (${m.codigo})${m.codigo === 'USD' ? ' · el dólar es la base de comparación, siempre está en la lista' : ''}`}
            onClick={() => set('moneda', m.nombre)}>
            {borrador.moneda === m.nombre ? '✓ ' : ''}{m.nombre}
            <span className="mon-code">{m.codigo}</span>
            {m.codigo === 'USD' && <span className="mon-base">base</span>}
          </button>
        ))}
      </div>
      <div className="tiny muted" style={{ marginTop: 6 }}>Con esta moneda se muestran los presupuestos y las ventas.</div>

      {/* ================= LA CONVERSIÓN DEL DÍA ================= */}
      <div className={`conv-dia ${conv.esBase ? 'conv-base' : ''}`}>
        <div className="conv-top">
          <span className="conv-lb"><I_Bank size={13} /> Conversión al día</span>
          <span className="conv-fecha">tipo de cambio del {conv.fecha}</span>
        </div>
        <div className="conv-titulo">{conv.titulo}</div>
        <div className="conv-det">{conv.detalle} <span className="conv-banco">Publica el dato: {conv.banco}.</span></div>
        <div className="conv-disc">
          Los valores son los que publica el banco central del país al tipo de cambio del día. La conversión es informativa,
          puede variar y se actualiza todos los días.
        </div>
      </div>

      {/* ---------- El puente a la personalización: el logo y los colores tienen su propio pop-up ---------- */}
      <div className="acc-why" style={{ marginTop: 16, display: 'flex', alignItems: 'flex-start', gap: 9 }}>
        <I_Palette size={16} />
        <span>
          <b>Su logo y sus colores no están aquí.</b> Se cambian en «Haga suyo este panel», el botón de la
          paleta que está arriba a la derecha (o el de su nombre, al final del menú): ahí sube su logo, prueba
          los colores viendo el panel cambiar en vivo y todo queda guardado en su cuenta.
        </span>
      </div>

      <div className="row" style={{ gap: 9, justifyContent: 'flex-end', marginTop: 16, flexWrap: 'wrap' }}>
        {guardado && <span className="tiny" style={{ color: 'var(--green)', fontWeight: 700, marginRight: 'auto' }}><I_Check size={12} /> Guardado</span>}
        {hayCambios && !guardado && <Badge tone="amber">tiene cambios sin guardar</Badge>}
        {sinEspacio && <span className="tiny" style={{ color: 'var(--red)', marginRight: 'auto' }}>El navegador no permitió guardar (¿modo privado?). Pruebe de nuevo.</span>}
        <Button variant="ghost" className="btn-sm" title="Cierra sin guardar nada: sus datos vuelven a como estaban"
          onClick={cancelar}>Cancelar</Button>
        <Button className="btn-sm" disabled={!hayCambios || faltaNombre}
          title={faltaNombre ? 'Ponga su nombre primero' : hayCambios ? 'Guarde sus datos de cuenta: se ven en todo el panel' : 'Aún no ha cambiado nada'}
          onClick={salvar}><I_User size={13} /> Guardar cambios</Button>
      </div>
    </Modal>
  );
}

import { useState } from 'react';
import { Button, Badge } from '../components/ui';
import { SinkrooMark, I_Mail, I_Lock, I_Check, I_ArrowRight, I_User, I_Shield } from '../components/icons';
import { TENANT } from '../data/demo';

// =============================================================================================
// LA ENTRADA — la primera pantalla del producto.
//
// Va antes de todo: el panel no existe hasta que alguien entra. La cuenta de demostración viene
// cargada y lista, así que se entra con un toque; el resto (Google, crear cuenta, recuperar la
// contraseña) está para que el camino real se vea completo.
//
// Cada opción hace algo que se ve: entrar muestra el asistente de bienvenida; entrar con Google
// muestra por quién está entrando y después entra; crear cuenta cambia el formulario; recuperar la
// contraseña deja la línea de a dónde se mandó el link.
// =============================================================================================

export type Sesion = { nombre: string; email: string; via: 'email' | 'google' | 'nueva' };

// ---------------------------------------------------------------------------------------------
// LAS CUENTAS DE DEMOSTRACIÓN — una por tipo, cada una con SU correo. Es la regla del producto: un
// correo es un usuario y no se puede usar el mismo correo para dos cuentas.
// ---------------------------------------------------------------------------------------------
const CUENTAS_DEMO: { nombre: string; email: string; clave: string; etiqueta: string; quien: string }[] = [
  { nombre: 'María Paula', email: 'maria@skincarenatural.com', clave: 'demo2026',
    etiqueta: 'Cuenta de demostración', quien: 'Skincare Natural: productos, campañas, publicaciones y ventas.' },
];

/** El registro de correos que ya tienen cuenta. En producción esto lo responde el servidor. */
const CUENTAS_REGISTRADAS = CUENTAS_DEMO.map(c => ({ email: c.email, nombre: c.nombre }));

const cuentaDe = (email: string) =>
  CUENTAS_REGISTRADAS.find(c => c.email.toLowerCase() === email.trim().toLowerCase());


export function PantallaLogin({ onEntrar }: { onEntrar: (s: Sesion) => void }) {
  const [modo, setModo] = useState<'entrar' | 'crear'>('entrar');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [entrando, setEntrando] = useState<'' | 'email' | 'google' | 'nueva'>('');
  const [recuperar, setRecuperar] = useState('');
  const [error, setError] = useState('');

  /** Entrar se ve: el botón pasa a «Entrando…» y recién después aparece el panel con el asistente. */
  const entrarCon = (via: Sesion['via'], quien: { nombre: string; email: string }) => {
    setError('');
    setEntrando(via);
    window.setTimeout(() => onEntrar({ nombre: quien.nombre, email: quien.email, via }), via === 'google' ? 900 : 550);
  };

  const entrar = () => {
    if (!email.trim() || !clave.trim()) {
      setError('Necesitamos tu email y tu contraseña para entrar. Si querés ver un panel ya cargado, entrá con una de las dos cuentas de demostración.');
      return;
    }
    const cuenta = cuentaDe(email);

    // LA REGLA DEL PRODUCTO: un correo, una cuenta. Si el correo ya existe, no se registra de nuevo.
    if (modo === 'crear' && cuenta) {
      setError(`Ese correo ya tiene una cuenta (${cuenta.nombre}). Entrá con ese correo, o creá la cuenta con un correo distinto.`);
      return;
    }
    if (modo === 'entrar' && !cuenta) {
      setError('Ese correo todavía no tiene cuenta. Creala con «Crear una cuenta nueva».');
      return;
    }
    entrarCon(modo === 'crear' ? 'nueva' : 'email', { nombre: nombre.trim() || cuenta?.nombre || '', email });
  };

  /** Las dos puertas de demostración: una cuenta por tipo, cada una con su correo. */
  const entrarDemo = (c: typeof CUENTAS_DEMO[number]) => {
    setNombre(c.nombre); setEmail(c.email); setClave(c.clave);
    entrarCon('email', { nombre: c.nombre, email: c.email });
  };

  return (
    <div className="login">
      <div className="login-panel">
        {/* Lo que hay del otro lado, antes de entrar: sin promesas vagas. */}
        <div className="login-lado">
          <span className="login-logo"><SinkrooMark size={64} /></span>
          <div className="login-titulo">Tu equipo de marketing,<br />trabajando solo.</div>
          <div className="login-sub">
            Investiga tu mercado todos los días, arma las piezas, las pasa por un panel de 5 jueces y 500 personas
            del público, y publica sólo las que convencen. <b>Nada sale a tus cuentas sin pasar por ahí.</b>
          </div>
          <div className="login-puntos">
            {[
              'Investiga 47 anuncios de tus competidores por día',
              'Escribe y arma las piezas con tu material y tus precios',
              'Mide el costo por venta y frena lo que no rinde',
            ].map(t => (
              <div key={t} className="login-punto"><I_Check size={13} /> {t}</div>
            ))}
          </div>
          <div className="login-demo">
            <span className="login-demo-lb"><I_Shield size={12} /> Cuenta de demostración</span>
            <div className="login-demo-tx">
              Podés mirar el panel ya cargado con <b>{CUENTAS_DEMO[0].email}</b>: {TENANT.cuenta}, con productos,
              precios, campañas y ventas reales. Si querés arrancar de cero, creá tu cuenta con tu correo: el
              asistente te pide tu negocio, tu descripción y tus archivos. Un correo es una cuenta.
            </div>
          </div>
        </div>

        <div className="login-form">
          <div className="login-form-head">
            <div className="login-form-t">{modo === 'entrar' ? 'Entrá a tu panel' : 'Creá tu cuenta'}</div>
            <Badge tone="purple">{modo === 'entrar' ? 'tenés una cuenta' : 'nueva'}</Badge>
          </div>

          {modo === 'crear' && (
            <div className="login-campo">
              <label className="label">Tu nombre</label>
              <span className="login-inp">
                <I_User size={15} />
                <input className="input" value={nombre} placeholder="Cómo te llamás"
                  onChange={e => setNombre(e.target.value)} />
              </span>
            </div>
          )}

          <div className="login-campo">
            <label className="label">Email</label>
            <span className="login-inp">
              <I_Mail size={15} />
              <input className="input" type="email" value={email} placeholder="tu@email.com"
                onChange={e => setEmail(e.target.value)} />
            </span>
          </div>

          <div className="login-campo">
            <label className="label">Contraseña</label>
            <span className="login-inp">
              <I_Lock size={15} />
              <input className="input" type="password" value={clave} placeholder="••••••••"
                onChange={e => setClave(e.target.value)} />
            </span>
          </div>

          {error && <div className="login-error">{error}</div>}
          {recuperar && (
            <div className="login-ok">
              <I_Check size={13} /> Te mandamos el link para cambiar la contraseña a <b>{email}</b>. En la
              demostración no sale ningún mail: entrá con la cuenta que ya está cargada.
            </div>
          )}

          <Button className="login-btn" title="Entra al panel y abre el asistente de bienvenida: lo podés saltar y completarlo después."
            onClick={entrar}>
            {entrando && entrando !== 'google'
              ? 'Entrando…'
              : <>{modo === 'entrar' ? 'Entrar' : 'Crear la cuenta y entrar'} <I_ArrowRight size={14} /></>}
          </Button>

          <div className="login-o"><span>o</span></div>

          <Button variant="outline" className="login-btn" title="Entra con tu cuenta de Google y arranca el asistente con ese usuario"
            onClick={() => entrarCon('google', { nombre: nombre.trim() || 'María Paula', email: email.trim() || 'maria@gmail.com' })}>
            {entrando === 'google' ? 'Entrando con Google…' : <><span className="login-g">G</span> Entrar con Google</>}
          </Button>

          {/* Las dos puertas de demostración: una cuenta por tipo, cada una con su correo. */}
          {CUENTAS_DEMO.map(c => (
            <Button key={c.email} variant="ghost" className="login-btn"
              title={`${c.etiqueta}: ${c.quien} Entra con ${c.email} (correo propio de esta cuenta: no se comparte con la otra).`}
              onClick={() => entrarDemo(c)}>
              {entrando && email === c.email ? 'Entrando…' : `Ver el panel · ${c.etiqueta}`}
            </Button>
          ))}

          <div className="login-pie">
            <button className="login-link" title="Te manda el link para cambiar la contraseña al email que pusiste"
              onClick={() => { setRecuperar(email); setError(''); }}>Olvidé mi contraseña</button>
            <button className="login-link" title={modo === 'entrar' ? 'Cambia al formulario para crear una cuenta nueva' : 'Vuelve al formulario de siempre'}
              onClick={() => { setModo(modo === 'entrar' ? 'crear' : 'entrar'); setError(''); setRecuperar(''); }}>
              {modo === 'entrar' ? 'Crear una cuenta nueva' : 'Ya tengo cuenta'}
            </button>
          </div>

          <div className="login-legal">
            Al entrar aceptás que el motor publique en tus cuentas según la autonomía que le des.
            Podés revocar cada conexión cuando quieras desde Cuenta y autonomía.
          </div>
        </div>
      </div>
    </div>
  );
}

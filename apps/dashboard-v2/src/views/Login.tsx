import { useState } from 'react';
import { Button, Badge } from '../components/ui';
import {
  SinkrooMark, I_Mail, I_Lock, I_Check, I_ArrowRight, I_User, I_Eye, I_Megaphone, I_Vote,
  I_Upload, I_Chart, I_Chat, I_Shield,
} from '../components/icons';
import { TENANT } from '../data/demo';

// =============================================================================================
// LA ENTRADA — la primera pantalla del producto, y la primera impresión.
//
// Reglas que la mandan:
//   · FONDO BLANCO SIEMPRE: acá se fuerzan las variables del tema claro, así la entrada se ve igual
//     para todos y no depende de qué tema tenga el navegador.
//   · EL TEXTO ES PARA TODOS: nada de rubros ni de negocios de ejemplo. Dice qué hace Sinkroo y qué
//     va a poder hacer el que entra, con las capacidades una por una.
//   · SE HABLA EN SEGUNDA PERSONA Y EN PRESENTE: «mientras dormís», «imaginá abrir el panel el lunes».
//     Cada línea tiene que poder leerse sola y decir una verdad que se sostiene.
// =============================================================================================

export type Sesion = { nombre: string; email: string; via: 'email' | 'google' | 'nueva' };

// CAPACIDADES: lo que el que entra va a poder hacer. Cortas, concretas y con su consecuencia.
const CAPACIDADES: { icono: React.ReactNode; titulo: string; linea: string }[] = [
  { icono: <I_Eye size={17} />, titulo: 'Investiga tu mercado cada mañana',
    linea: 'Lee los anuncios de tus competidores y encuentra el ángulo que hoy gana en tu rubro, antes de que te levantes.' },
  { icono: <I_Megaphone size={17} />, titulo: 'Escribe y arma las piezas',
    linea: 'Con tu material, tu tono y tus precios. Nada de plantillas: cada pieza se parece a tu negocio.' },
  { icono: <I_Vote size={17} />, titulo: 'Las revisa antes de que gastes un peso',
    linea: '5 jueces las puntúan y 500 personas del público reaccionan. Si ninguna convence, no sale ninguna.' },
  { icono: <I_Upload size={17} />, titulo: 'Publica en tus cuentas',
    linea: 'Instagram, Facebook y WhatsApp: publica donde ya tenés tu gente, en la franja en la que te leen.' },
  { icono: <I_Chart size={17} />, titulo: 'Mide lo que rinde y frena lo que no',
    linea: 'Ve el costo por venta, mueve el presupuesto y frena solo lo que no funciona. Sin que se lo pidas.' },
  { icono: <I_Chat size={17} />, titulo: 'Te avisa sólo cuando hace falta',
    linea: 'Una decisión por mensaje, con sus botones. La respondés desde el chat, sin entrar a buscar nada.' },
];

const REGLAS = [
  'Nada se publica sin pasar por el panel.',
  'Nada sale a tus cuentas sin tu OK.',
  'Publicar es lo único que gasta plata: investigar no cuesta.',
];

const CUENTAS_DEMO: { nombre: string; email: string; clave: string; etiqueta: string; quien: string }[] = [
  { nombre: 'María Paula', email: 'maria@skincarenatural.com', clave: 'demo2026',
    etiqueta: 'Cuenta de demostración', quien: 'Un negocio real de ejemplo, con campañas y ventas cargadas.' },
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
      setError('Necesitamos tu email y tu contraseña para entrar. Si querés ver un panel ya cargado, entrá con la cuenta de demostración.');
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

  /** La puerta rápida: entra con la cuenta ya cargada, sin escribir nada. */
  const entrarDemo = (c: typeof CUENTAS_DEMO[number]) => {
    setNombre(c.nombre); setEmail(c.email); setClave(c.clave);
    entrarCon('email', { nombre: c.nombre, email: c.email });
  };

  return (
    <div className="login">
      <div className="login-panel">
        {/* ---------- LO QUE HACE SINKROO: para todos, sin rubros ni ejemplos ---------- */}
        <div className="login-lado">
          <div className="login-marca">
            <span className="login-logo"><SinkrooMark size={44} /></span>
            <span className="login-marca-tx">
              <b>Sinkroo</b>
              <small>Marketing que trabaja solo</small>
            </span>
          </div>

          <div className="login-eyebrow">Tu equipo de marketing, trabajando solo</div>
          <h1 className="login-titulo">
            Mientras dormís,<br />tu marketing sigue trabajando.
          </h1>
          <p className="login-sub">
            Sinkroo investiga tu mercado, escribe y arma las piezas, las hace revisar por un panel de 5 jueces
            y 500 personas del público, y las publica en tus cuentas. <b>Vos sólo aprobás.</b>
          </p>
          <p className="login-futuro">
            Imaginá abrir el panel el lunes y encontrar la semana ya armada: las piezas escritas, los números
            medidos y una sola decisión esperándote.
          </p>

          <div className="login-cap">
            {CAPACIDADES.map(c => (
              <div key={c.titulo} className="login-cap-fila">
                <span className="login-cap-ic">{c.icono}</span>
                <span style={{ minWidth: 0 }}>
                  <b>{c.titulo}</b>
                  <small>{c.linea}</small>
                </span>
              </div>
            ))}
          </div>

          <div className="login-reglas">
            {REGLAS.map(r => (
              <div key={r} className="login-regla"><I_Shield size={12} /> {r}</div>
            ))}
          </div>

          <div className="login-demo">
            <span className="login-demo-lb"><I_Check size={12} /> {CUENTAS_DEMO[0].etiqueta}</span>
            <div className="login-demo-tx">
              {CUENTAS_DEMO[0].quien} Entrá con <b>{CUENTAS_DEMO[0].email}</b> y mirá el panel trabajando, o creá
              tu cuenta con tu correo para arrancar de cero.
            </div>
          </div>
        </div>

        {/* ---------- ENTRAR ---------- */}
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

          {CUENTAS_DEMO.map(c => (
            <Button key={c.email} variant="ghost" className="login-btn"
              title={`${c.etiqueta}: ${c.quien} Entra con ${c.email}.`}
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
            Al entrar aceptás que el motor publique en tus cuentas según la autonomía que le des. Podés revocar
            cada conexión cuando quieras. Un correo es una cuenta.
          </div>
        </div>
      </div>

      <div className="login-pie-legal">
        {TENANT.cuenta} · el panel que vas a ver funciona con datos reales de un negocio de ejemplo.
      </div>
    </div>
  );
}

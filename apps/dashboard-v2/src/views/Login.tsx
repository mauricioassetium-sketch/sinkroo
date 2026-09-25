import { useState } from 'react';
import { Button, Badge } from '../components/ui';
import {
  SinkrooMark, I_Mail, I_Lock, I_Check, I_ArrowRight, I_User, I_Shield, I_Sparkle,
} from '../components/icons';
import { TENANT } from '../data/demo';
import { crearCuenta, entrar as entrarApi, hayApi } from '../api/cliente';

// =============================================================================================
// LA ENTRADA — la primera pantalla del producto, y la primera impresión.
//
// Reglas que la mandan:
//   · FONDO BLANCO SIEMPRE: aquí se fuerzan las variables del tema claro, así la entrada se ve igual
//     para todos y no depende de qué tema tenga el navegador.
//   · EL TEXTO ES PARA TODOS: nada de rubros ni de negocios de ejemplo. Dice qué hace Sinkroo y qué
//     va a poder hacer el que entra, con las capacidades una por una.
//   · SE HABLA EN SEGUNDA PERSONA Y EN PRESENTE: «mientras usted duerme», «imagine abrir el panel el lunes».
//     Cada línea tiene que poder leerse sola y decir una verdad que se sostiene.
// =============================================================================================

export type Sesion = { nombre: string; email: string; via: 'email' | 'google' | 'nueva' };

// LO QUE HACE, en cuatro líneas cortas: es lo único que se lee en la entrada.
const CAPACIDADES = [
  'Investiga el mercado cada mañana',
  'Escribe las piezas con el material y los precios del negocio',
  'Las revisa con 5 jueces y 500 personas del público',
  'Publica, mide el costo por venta y frena lo que no rinde',
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

  /** Entrar se ve: el botón pasa a «Entrando…» y sólo después aparece el panel con el asistente. */
  const entrarCon = (via: Sesion['via'], quien: { nombre: string; email: string }) => {
    setError('');
    setEntrando(via);
    window.setTimeout(() => onEntrar({ nombre: quien.nombre, email: quien.email, via }), via === 'google' ? 900 : 550);
  };

  /** Con el back encendido, entrar y crear cuenta se resuelven contra la API de verdad. */
  const entrarConBack = async (crear: boolean) => {
    setError(''); setEntrando(crear ? 'nueva' : 'email');
    try {
      const usuario = crear
        ? await crearCuenta(nombre.trim(), email.trim(), clave)
        : await entrarApi(email.trim(), clave);
      onEntrar({ nombre: usuario.nombre || nombre.trim(), email: usuario.email, via: crear ? 'nueva' : 'email' });
    } catch (e) {
      const err = e as Error & { codigo?: string };
      setError(
        err.codigo === 'correo_existe'
          ? 'Ese correo ya tiene una cuenta: entre con ese correo, o cree la cuenta con uno distinto.'
          : err.codigo === 'clave_mala'
            ? 'El correo o la clave no son correctos.'
            : `No se pudo conectar con el servidor (${err.message}). El panel sigue andando con los datos de demostración.`,
      );
    } finally {
      setEntrando('');
    }
  };

  const entrar = () => {
    if (hayApi()) {
      if (!email.trim() || !clave.trim()) { setError('Necesitamos su correo y su clave para entrar.'); return; }
      if (modo === 'crear' && clave.trim().length < 6) { setError('La clave necesita al menos 6 caracteres.'); return; }
      void entrarConBack(modo === 'crear');
      return;
    }
    if (!email.trim() || !clave.trim()) {
      setError('Necesitamos su correo y su contraseña para entrar. Si quiere ver un panel ya cargado, entre con la cuenta de demostración.');
      return;
    }
    const cuenta = cuentaDe(email);

    // LA REGLA DEL PRODUCTO: un correo, una cuenta. Si el correo ya existe, no se registra de nuevo.
    if (modo === 'crear' && cuenta) {
      setError(`Ese correo ya tiene una cuenta (${cuenta.nombre}). Entre con ese correo, o cree la cuenta con un correo distinto.`);
      return;
    }
    if (modo === 'entrar' && !cuenta) {
      setError('Ese correo todavía no tiene cuenta. Créela con «Crear una cuenta nueva».');
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
        {/* ---------- QUÉ ES SINKROO: cuatro líneas, nada más ----------
             El dueño fue claro: «nadie se va a quedar pegado viendo eso, debe ser muy corto y preciso
             para que se sepa a lo que el sistema [sirve] nada más». Acá no se explica el producto: se
             dice qué es, qué hace y qué lo hace distinto. Todo lo demás vive adentro del panel. */}
        <div className="login-lado">
          <div className="login-intro">
            <div className="login-marca">
              <span className="login-logo"><SinkrooMark size={42} /></span>
              <span className="login-marca-tx">
                <b>Sinkroo</b>
                <small>Marketing autónomo</small>
              </span>
            </div>

            <h1 className="login-titulo">
              Tu equipo de marketing,<br />trabajando solo <span className="login-247">24/7</span>
            </h1>
            <p className="login-linea">
              Investiga el mercado, escribe las piezas, las publica y mide cada peso.
              <b> Todo el trabajo queda hecho: sólo queda aprobar.</b>
            </p>

            <div className="login-pred">
              <div className="login-pred-lb"><I_Sparkle size={10} /> Análisis predictivo</div>
              <div className="login-pred-t">Predice cómo va a rendir antes de publicar.</div>
              <div className="login-pred-p">
                Cuántas personas la verán, cuántos clics traerá y cuánto costará cada venta.
                Predijo 84, pasó 79: la próxima estima 6% más cerca.
              </div>
            </div>
          </div>

          <div className="login-resto">
            <div className="login-hace">
              {CAPACIDADES.map(c => (
                <span key={c} className="login-hace-i"><I_Check size={12} /> {c}</span>
              ))}
            </div>
            <div className="login-ok-linea">
              <I_Shield size={12} /> Nada sale a las cuentas sin aprobación.
            </div>
            <div className="login-demo">
              <span className="login-demo-lb">{CUENTAS_DEMO[0].etiqueta}</span>
              <span className="login-demo-tx">{CUENTAS_DEMO[0].email}</span>
            </div>
          </div>
        </div>

        {/* ---------- ENTRAR ---------- */}
        <div className="login-form">
          <div className="login-form-head">
            <div className="login-form-t">{modo === 'entrar' ? 'Entre a su panel' : 'Cree su cuenta'}</div>
            <Badge tone="purple">{modo === 'entrar' ? 'tiene una cuenta' : 'nueva'}</Badge>
          </div>

          {modo === 'crear' && (
            <div className="login-campo">
              <label className="label">Su nombre</label>
              <span className="login-inp">
                <I_User size={15} />
                <input className="input" value={nombre} placeholder="Cómo le gusta que le digan"
                  onChange={e => setNombre(e.target.value)} />
              </span>
            </div>
          )}

          <div className="login-campo">
            <label className="label">Correo electrónico</label>
            <span className="login-inp">
              <I_Mail size={15} />
              <input className="input" type="email" value={email} placeholder="nombre@correo.com"
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
              <I_Check size={13} /> Le enviamos el enlace para cambiar la contraseña a <b>{email}</b>. En la
              demostración no se envía ningún correo: entre con la cuenta que ya está cargada.
            </div>
          )}

          <Button className="login-btn" title="Entre al panel y abra el asistente de bienvenida: lo puede omitir y completarlo después."
            onClick={entrar}>
            {entrando && entrando !== 'google'
              ? 'Entrando…'
              : <>{modo === 'entrar' ? 'Entrar' : 'Crear la cuenta y entrar'} <I_ArrowRight size={14} /></>}
          </Button>

          <div className="login-o"><span>o</span></div>

          <Button variant="outline" className="login-btn" title="Entre con su cuenta de Google y empiece el asistente con ese usuario"
            onClick={() => entrarCon('google', { nombre: nombre.trim() || 'María Paula', email: email.trim() || 'maria@gmail.com' })}>
            {entrando === 'google' ? 'Entrando con Google…' : <><span className="login-g">G</span> Entrar con Google</>}
          </Button>

          {CUENTAS_DEMO.map(c => (
            <Button key={c.email} variant="ghost" className="login-btn"
              title={`${c.etiqueta}: ${c.quien} Entre con ${c.email}.`}
              onClick={() => entrarDemo(c)}>
              {entrando && email === c.email ? 'Entrando…' : `Ver el panel · ${c.etiqueta}`}
            </Button>
          ))}

          <div className="login-pie">
            <button className="login-link" title="Le envía el enlace para cambiar la contraseña al correo que escribió"
              onClick={() => { setRecuperar(email); setError(''); }}>Olvidé mi contraseña</button>
            <button className="login-link" title={modo === 'entrar' ? 'Cambie al formulario para crear una cuenta nueva' : 'Vuelva al formulario de siempre'}
              onClick={() => { setModo(modo === 'entrar' ? 'crear' : 'entrar'); setError(''); setRecuperar(''); }}>
              {modo === 'entrar' ? 'Crear una cuenta nueva' : 'Ya tengo cuenta'}
            </button>
          </div>

          <div className="login-legal">
            Al entrar acepta que el motor publique en sus cuentas según la autonomía que le dé. Puede revocar
            cada conexión cuando quiera. Un correo es una cuenta.
          </div>
        </div>
      </div>

      <div className="login-pie-legal">
        {TENANT.cuenta} · el panel que va a ver funciona con datos reales de un negocio de ejemplo.
      </div>
    </div>
  );
}

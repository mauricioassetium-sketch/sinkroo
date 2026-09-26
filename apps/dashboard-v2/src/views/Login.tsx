import { useState } from 'react';
import { Button, Badge } from '../components/ui';
import {
  SinkrooMark, I_Mail, I_Lock, I_Check, I_ArrowRight, I_User, I_Shield, I_Sparkle, I_Clock,
} from '../components/icons';
import {
  crearCuenta, entrar as entrarApi, hayApi, leerSeguridad, guardarToken,
  correoConfigurado, faltaDeCorreo, faltaEnlaces,
  type AvisoDeCorreo, type ErrorApi, type EstadoSeguridad,
} from '../api/cliente';
// La vuelta del correo la atiende App.tsx con el mismo mecanismo de `VueltaDeConexion` (llamar al
// back una sola vez y dejar limpia la dirección). Aquí sólo se dice cómo salió, con `textoDeVuelta`.
import { textoDeVuelta, type VueltaCorreo } from '../lib/seguridad';

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

/**
 * `via` es por dónde se entró. Importa para una cosa sola, y es grande: `'demo'` es la demostración con
 * los datos del negocio de ejemplo, y en ese modo el panel NO lee el back aunque haya una sesión abierta
 * en el navegador. Mezclar las dos cosas mostraba los datos reales del negocio con el nombre de la
 * persona del ejemplo.
 */
export type Sesion = { nombre: string; email: string; via: 'email' | 'google' | 'nueva' | 'demo' };

// LO QUE HACE, en cuatro líneas cortas: es lo único que se lee en la entrada.
const CAPACIDADES = [
  'Investiga el mercado cada mañana',
  'Escribe las piezas con el material y los precios del negocio',
  'Las revisa con 5 jueces y 500 personas del público',
  'Publica, mide el costo por venta y frena lo que no rinde',
];


/**
 * La demostración, sin inventar nada: es el panel TAL COMO LO VE un negocio que acaba de entrar, con
 * todo vacío. No es un negocio de ejemplo con campañas y ventas cargadas (eso ya no existe en ninguna
 * parte del panel): lo que se ve ahí es lo mismo que ve alguien que se acaba de registrar, y sirve para
 * conocer el panel sin crear una cuenta.
 */
const CUENTAS_DEMO: { nombre: string; email: string; clave: string; etiqueta: string; quien: string }[] = [
  { nombre: '', email: 'demostracion@sinkroo.com', clave: 'demo2026',
    etiqueta: 'Entrar sin cuenta', quien: 'El panel tal como lo ve un negocio que acaba de entrar: sin datos cargados.' },
];

/** El registro de correos que ya tienen cuenta. En producción esto lo responde el servidor. */
const CUENTAS_REGISTRADAS = CUENTAS_DEMO.map(c => ({ email: c.email, nombre: c.nombre }));

const cuentaDe = (email: string) =>
  CUENTAS_REGISTRADAS.find(c => c.email.toLowerCase() === email.trim().toLowerCase());

export function PantallaLogin({ onEntrar, vuelta }: { onEntrar: (s: Sesion) => void; vuelta?: VueltaCorreo }) {
  const [modo, setModo] = useState<'entrar' | 'crear'>('entrar');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [entrando, setEntrando] = useState<'' | 'email' | 'google' | 'nueva' | 'demo'>('');
  const [recuperar, setRecuperar] = useState('');
  const [error, setError] = useState('');
  // LA ENTRADA CON EL BACK ENCENDIDO TIENE DOS PASOS: los datos y, después, el correo. Nada de esto
  // existe sin back: en la demostración el formulario es el de siempre, tal cual estaba.
  const conBack = hayApi();
  const [paso, setPaso] = useState<'form' | 'correo'>('form');
  const [cuentaCreada, setCuentaCreada] = useState<{ nombre: string; email: string } | null>(null);
  /** Lo que el back dice del correo recién creado, tal cual lo respondió el registro. */
  const [correoNuevo, setCorreoNuevo] = useState<{ leido: boolean; aviso: AvisoDeCorreo | null; estado: EstadoSeguridad | null; fallo: string } | null>(null);

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
      // El registro contesta, además del usuario, qué pasó con el correo de bienvenida (`correo`):
      // si salió, para dónde iba y qué falta cuando no salió. Es la respuesta más fresca que hay.
      let usuario: { nombre: string; email: string };
      let correoDelRegistro: AvisoDeCorreo | null = null;
      if (crear) {
        const r = await crearCuenta(nombre.trim(), email.trim(), clave);
        usuario = r.usuario; correoDelRegistro = r.correo;
      } else {
        usuario = await entrarApi(email.trim(), clave);
      }
      // CREAR CUENTA NO ENTRA DIRECTO: primero se dice qué pasó con el correo de bienvenida. Con el
      // correo sin configurar en el servidor, aquí NO se puede decir «le enviamos un correo»: se dice
      // lo que falta. La sesión ya quedó abierta (el token está guardado); el panel entra cuando la
      // persona toca «Entrar a mi panel».
      if (crear) {
        setCuentaCreada({ nombre: usuario.nombre || nombre.trim(), email: usuario.email });
        setCorreoNuevo({ leido: false, aviso: correoDelRegistro, estado: null, fallo: '' });
        setPaso('correo');
        // Y se pregunta el estado de seguridad para el resto del dato (el PIN y si la dirección quedó
        // confirmada). Si no responde, el aviso del registro sigue siendo válido: no se borra.
        leerSeguridad()
          .then(e => setCorreoNuevo({ leido: true, aviso: correoDelRegistro, estado: e, fallo: '' }))
          .catch((err: ErrorApi) => setCorreoNuevo({ leido: true, aviso: correoDelRegistro, estado: null, fallo: err.message }));
        return;
      }
      onEntrar({ nombre: usuario.nombre || nombre.trim(), email: usuario.email, via: 'email' });
    } catch (e) {
      const err = e as Error & { codigo?: string };
      setError(
        err.codigo === 'correo_existe'
          ? 'Ese correo ya tiene una cuenta: entre con ese correo, o cree la cuenta con uno distinto.'
          : err.codigo === 'clave_mala'
            ? 'El correo o la contraseña no son correctos.'
            : `No se pudo conectar con el servidor (${err.message}). Sin servidor no hay datos: el panel queda vacío hasta que responda.`,
      );
    } finally {
      setEntrando('');
    }
  };

  const entrar = () => {
    if (hayApi()) {
      if (!email.trim() || !clave.trim()) { setError('Necesitamos su correo y su contraseña para entrar.'); return; }
      if (modo === 'crear' && clave.trim().length < 6) { setError('La contraseña necesita al menos 6 caracteres.'); return; }
      void entrarConBack(modo === 'crear');
      return;
    }
    if (!email.trim() || !clave.trim()) {
      setError('Necesitamos su correo y su contraseña para entrar. Si quiere ver el panel sin cuenta, entre con la demostración.');
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

  /**
   * LA DEMOSTRACIÓN — el panel con los datos del negocio de ejemplo, sin escribir nada.
   *
   * Al entrar acá se cierra la sesión que hubiera abierta: la demostración no es su cuenta. Mezclar las
   * dos cosas era lo peor de todo —se veían los datos reales del negocio con el nombre de la persona del
   * ejemplo, y lo que se escribiera en el asistente se guardaba en la cuenta de verdad—. Volver a su
   * cuenta cuesta una sola cosa, y es reversible: entrar otra vez con su correo. No se borra nada.
   */
  const entrarDemo = (c: typeof CUENTAS_DEMO[number]) => {
    guardarToken('');
    setNombre(c.nombre); setEmail(c.email); setClave(c.clave);
    entrarCon('demo', { nombre: c.nombre, email: c.email });
  };

  return (
    <div className="login">
      <div className="login-panel">
        {/* ---------- QUÉ ES SINKROO: cuatro líneas, nada más ----------
             El dueño fue claro: «nadie se va a quedar pegado viendo eso, debe ser muy corto y preciso
             para que se sepa a lo que el sistema [sirve] nada más». Aquí no se explica el producto: se
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
          {/* LA VUELTA DEL CORREO DE BIENVENIDA: sólo aparece cuando esta dirección trae el enlace de
              confirmación. Sale con las palabras de `textoDeVuelta`, el mismo texto que usa el aviso
              del panel, y va arriba de todo porque es lo primero que hay que leer. */}
          {vuelta && <AvisoVueltaDeCorreo vuelta={vuelta} />}

          {paso === 'correo' && cuentaCreada ? (
            /* ---------- SEGUNDO PASO: QUÉ PASÓ CON EL CORREO DE BIENVENIDA ----------
               No se promete un correo: se dice lo que el servidor respondió sobre su correo apenas se
               creó la cuenta. Con el correo sin configurar, la pantalla dice qué falta. */
            <>
              <div className="login-form-head">
                <div className="login-form-t">Su cuenta quedó creada</div>
                <Badge tone="green">paso 1 de 2</Badge>
              </div>

              <AvisoCorreoDeBienvenida email={cuentaCreada.email} correo={correoNuevo} />

              <Button className="login-btn" title="Abre el panel con la cuenta que acaba de crear"
                onClick={() => onEntrar({ nombre: cuentaCreada.nombre, email: cuentaCreada.email, via: 'nueva' })}>
                Entrar a mi panel <I_ArrowRight size={14} />
              </Button>

              <div className="login-legal">
                Confirmar la dirección se puede hacer cuando quiera y desde donde quiera: el enlace lo
                trae de vuelta a este panel. El panel funciona igual mientras no esté confirmada.
              </div>
            </>
          ) : (<>
          <div className="login-form-head">
            <div className="login-form-t">{modo === 'entrar' ? 'Entre a su panel' : 'Cree su cuenta'}</div>
            <Badge tone="purple">{modo === 'entrar' ? 'tiene una cuenta' : 'nueva'}</Badge>
          </div>

          {/* QUÉ PASA DESPUÉS, dicho antes de crear nada. No se promete la entrega: se dice qué va a
              intentar el servidor y que la verdad sobre ese envío se dice en el paso siguiente, que es
              donde el registro contesta si el correo salió o no. */}
          {modo === 'crear' && conBack && (
            <div className="login-ok">
              <I_Shield size={13} /> Al crear la cuenta, el panel le pide al servidor el correo de bienvenida
              para confirmar su dirección. En el paso siguiente le dice si ese correo salió de verdad: si el
              servidor todavía no tiene el envío configurado, se lo dice tal cual — no se lo promete.
            </div>
          )}

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
            conBack ? (
              /* CON EL BACK ENCENDIDO NO HAY RUTA DE «OLVIDÉ MI CONTRASEÑA»: el servidor tiene el
                 restablecimiento del PIN, no el de la contraseña de la cuenta. Antes aquí se decía «le
                 enviamos el enlace» sin que saliera ningún correo; ahora se dice lo que pasa. */
              <div className="login-error">
                <b>Cambiar la contraseña todavía no se puede hacer desde el panel.</b> El servidor no tiene esa
                ruta, así que no se envió ningún correo y su contraseña sigue siendo la misma. Anote la que use
                para entrar: su correo <b>{email}</b> ya tiene el negocio adentro, no hace falta crear otra cuenta.
              </div>
            ) : (
              <div className="login-ok">
                <I_Check size={13} /> Anotado. Sin servidor no se envía ningún correo: la contraseña de
                <b> {email}</b> sigue siendo la misma.
              </div>
            )
          )}

          <Button className="login-btn" title="Entre al panel y abra el asistente de bienvenida: lo puede omitir y completarlo después."
            onClick={entrar}>
            {entrando && entrando !== 'google'
              ? 'Entrando…'
              : <>{modo === 'entrar' ? 'Entrar' : 'Crear la cuenta y entrar'} <I_ArrowRight size={14} /></>}
          </Button>

          <div className="login-o"><span>o</span></div>

          {/* ENTRAR CON GOOGLE — con el back encendido no hay por dónde: el servidor no tiene montada la
              entrada con Google. Antes este botón abría el panel con una sesión inventada («María Paula»)
              que no era la de nadie, y esa es una de las dos razones por las que el panel saludaba con el
              nombre del ejemplo. Ahora, con back, el botón está apagado y dice qué falta; sin back sigue
              siendo la puerta de la demostración, pero sin inventar ningún nombre. */}
          <Button variant="outline" className="login-btn" disabled={conBack}
            title={conBack
              ? 'Todavía no se puede: la entrada con Google no está configurada en el servidor, así que este botón no hace nada. Entre con su correo y su contraseña.'
              : 'Entre con su cuenta de Google y empiece el asistente con ese usuario'}
            onClick={() => entrarCon('google', { nombre: nombre.trim(), email: email.trim() })}>
            {entrando === 'google' ? 'Entrando con Google…' : <><span className="login-g">G</span> Entrar con Google</>}
          </Button>

          {conBack && (
            <div className="login-legal">
              Entrar con Google todavía no está configurado en el servidor: por eso el botón está apagado y no
              se envió nada. Su cuenta entra con el correo y la contraseña de arriba.
            </div>
          )}

          {CUENTAS_DEMO.map(c => (
            <Button key={c.email} variant="ghost" className="login-btn"
              title={`${c.etiqueta}: ${c.quien} Entre con ${c.email}. Al entrar acá se cierra la sesión de su cuenta (si tenía una abierta) y el panel pasa a mostrar los datos del negocio de ejemplo; para volver a su cuenta, entre otra vez con su correo: no se borra nada.`}
              onClick={() => entrarDemo(c)}>
              {entrando && email === c.email ? 'Entrando…' : `Ver el panel · ${c.etiqueta}`}
            </Button>
          ))}

          <div className="login-pie">
            <button className="login-link"
              title={conBack
                ? 'Cambiar la contraseña todavía no se puede hacer desde el panel: al tocarlo no se envía ningún correo'
                : 'Le envía el enlace para cambiar la contraseña al correo que escribió'}
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
          </>)}
        </div>
      </div>

      <div className="login-pie-legal">
        El panel arranca vacío: se va llenando con lo que su negocio haga, paso por paso.
      </div>
    </div>
  );
}

// =============================================================================================
// LA VUELTA DEL CORREO DE BIENVENIDA — cómo salió el enlace de confirmación que trajo esta dirección.
// Lo atiende App.tsx (la misma vuelta de siempre: se llama al back una sola vez y se limpia la
// dirección); aquí sólo se dice el resultado, con las palabras de `textoDeVuelta`.
// =============================================================================================
export function AvisoVueltaDeCorreo({ vuelta }: { vuelta: VueltaCorreo }) {
  const t = textoDeVuelta(vuelta);
  if (!t) return null;
  const esOk = t.tono === 'ok';
  return (
    <div className={esOk ? 'login-ok' : 'login-error'}>
      <span>
        {esOk ? <I_Check size={13} style={{ marginRight: 6, verticalAlign: -2 }} /> : <I_Shield size={13} style={{ marginRight: 6, verticalAlign: -2 }} />}
        <b>{t.titulo}</b> {t.detalle}
        {/* El enlace vencido o inválido no deja a nadie sin salida: se puede pedir otro, que es lo
            único que el panel puede hacer de verdad (llamar al back y decir cómo salió). */}
        {!esOk && vuelta.estado !== 'error' && (
          <button className="login-link" style={{ display: 'block', marginTop: 8 }}
            title="Vuelve a pedirle al servidor el correo de confirmación para la dirección de la cuenta"
            onClick={() => vuelta.pedirOtro()}>
            {vuelta.pidiendo ? 'Pidiendo otro correo…' : 'Pedir otro correo'}
          </button>
        )}
      </span>
    </div>
  );
}

// =============================================================================================
// QUÉ PASÓ CON EL CORREO DE BIENVENIDA, apenas se creó la cuenta.
//
// LA REGLA: aquí NO se escribe «le enviamos un correo» si el servidor no tiene el correo configurado.
// Se dice lo que el back respondió: si está configurado y si la dirección quedó confirmada; y si no
// está configurado, se nombra lo que falta cargar. Sin back o sin respuesta, se dice eso mismo.
// =============================================================================================
export function AvisoCorreoDeBienvenida({ email, correo }: {
  email: string;
  correo: { leido: boolean; aviso: AvisoDeCorreo | null; estado: EstadoSeguridad | null; fallo: string } | null;
}) {
  // Lo que el servidor contestó al crear la cuenta, si lo contestó. El estado de seguridad viene aparte
  // y sirve para el dato de la cuenta (configurado / confirmado) y para el listado de lo que falta.
  const aviso = correo?.aviso ?? null;
  const e = correo?.estado ?? null;
  const falta = (aviso?.falta?.length ? aviso.falta : null) || faltaDeCorreo(e);
  const configurado = aviso ? !!aviso.enviado || correoConfigurado(e) : correoConfigurado(e);

  if (!correo || (!correo.leido && !aviso)) {
    return (
      <div className="login-ok">
        <I_Clock size={13} /> Le estamos preguntando al servidor si el correo está configurado y si su
        dirección quedó confirmada. Hasta que responda, el panel no le dice ni que sí ni que no.
      </div>
    );
  }

  // NINGUNA DE LAS DOS RESPUESTAS LLEGÓ: no se puede decir ni que sí ni que no. Se dice eso mismo,
  // que es lo único cierto, y no se promete un correo que no se puede confirmar.
  if (!aviso && !e) {
    return (
      <div className="login-error">
        <b>No pudimos leer del servidor si el correo está configurado.</b> {correo.fallo || 'La consulta no respondió.'} Por eso no
        le decimos que le enviamos un correo: no lo podemos confirmar. Su cuenta ya está creada y puede entrar;
        el estado real del correo está en Cuenta y autonomía → Seguridad de la cuenta.
      </div>
    );
  }

  // SIN CORREO CONFIGURADO: ni el registro pudo mandarlo ni el servidor lo tiene montado. Aquí NO se
  // escribe «le enviamos un correo»: se dice lo que falta.
  if (!configurado) {
    return (
      <div className="login-error">
        <b>El correo todavía no está configurado en el servidor.</b> Por eso no le podemos decir que le
        enviamos un correo de bienvenida: no hay por dónde mandarlo todavía.
        {aviso?.motivo && <> El servidor respondió: «{aviso.motivo}».</>}
        {falta.length > 0 && <> Falta cargar {falta.join(', ')}.</>}
        {' '}Su cuenta ya está creada — su correo <b>{email}</b> quedó guardado — y el panel funciona
        completo: puede entrar y trabajar. Cuando el servidor tenga el envío configurado, en Cuenta y
        autonomía → Seguridad de la cuenta aparece el botón para pedir el enlace de confirmación: ese
        correo no se manda solo.
      </div>
    );
  }

  // CON EL CORREO CONFIGURADO: ahora sí se puede decir, con el estado real al lado. La cuenta puede
  // estar ya confirmada (entró desde el enlace) o pendiente.
  return (
    <div className="login-ok">
      <I_Check size={13} /> Le enviamos el correo de bienvenida a <b>{email}</b>
      {e?.correo_verificado
        ? ' y su dirección ya quedó confirmada: no tiene que hacer nada más.'
        : ' para confirmar su dirección. Ábralo y toque el enlace: lo trae de vuelta a este panel y ahí queda confirmada. Si no le llegó en unos minutos, revise la carpeta de correo no deseado.'}
      {faltaEnlaces(e).length > 0 && <> Ojo: los enlaces todavía no apuntan al panel; falta cargar {faltaEnlaces(e).join(', ')}.</>}
    </div>
  );
}

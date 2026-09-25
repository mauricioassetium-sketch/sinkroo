import { useEffect, useRef, useState } from 'react';
import { Layout, type Vista } from './components/Layout';
import { DetalleProvider } from './components/Detalle';
import { useTheme } from './lib/theme';
import { PerfilProvider } from './lib/perfil';
import { PlanProvider } from './lib/plan';
import { OnboardingProvider } from './lib/onboarding';
import { quitarDeLaDireccion, SeguridadAlDia, SeguridadProvider, useVueltaDeCorreo } from './lib/seguridad';
import { ViewOnboarding } from './views/Onboarding';
import { PantallaLogin, type Sesion } from './views/Login';
import { codigoDeMeta, confirmarRed, hayApi, olvidarRed, quienSoy, token, volverDeMeta } from './api/cliente';
import { ProveedorDatos, useDatos } from './api/datos';
import { Asistente } from './components/Asistente';
import { ViewHoy } from './views/Hoy';
import { ViewCampanas } from './views/Campanas';
import { ViewConversaciones } from './views/Conversaciones';
import { ViewMercado } from './views/Mercado';
import { ViewCuenta } from './views/Cuenta';
import { ViewCreditos } from './views/Creditos';
import { ViewReferidos } from './views/Referidos';
import { ViewKyc } from './views/Kyc';
import { TENANT, type Modo } from './data/demo';

/** El nombre de una red para los avisos, sin depender del catálogo del back: `instagram` → «Instagram». */
const redBonita = (red: string) => {
  const dicho = red.replace(/_/g, ' ');
  return dicho.charAt(0).toUpperCase() + dicho.slice(1);
};

/**
 * LA VUELTA DEL PROVEEDOR — vive dentro del proveedor de datos porque, después de conectar, hay que
 * volver a leer las conexiones (`datos.refrescar()`) y eso sólo se puede pedir desde adentro.
 *
 * Hay dos maneras de volver, y no se mezclan:
 *   · Con `code` (Meta, TikTok, Google, con la app propia cargada en el servidor): se canjea el código
 *     por el token del lado del servidor. Es lo que ya funcionaba y sigue igual.
 *   · Con la marca de éxito del proveedor que conecta en su propia pantalla (bundle.social), que no
 *     devuelve ningún código: se llama a `confirmar`, que es lo que deja constancia de que el negocio
 *     volvió y la cuenta quedó conectada. Después se relee, para que la fila muestre lo que hay.
 * Si la vuelta trae un error, se avisa con ese error y NO se confirma nada.
 */
function VueltaDeConexion({ avisar }: { avisar: (t: string) => void }) {
  const datos = useDatos();
  // La vuelta se atiende UNA sola vez: sin esto, el doble montaje de la vista previa en desarrollo
  // mandaba dos veces el canje (o la confirmación) con la misma marca. No cambia nada de lo que ve el
  // negocio; evita la llamada repetida.
  const atendida = useRef(false);

  useEffect(() => {
    if (atendida.current) return;
    const v = codigoDeMeta();
    if (!v || !hayApi() || !token()) return;
    atendida.current = true;

    const nombre = redBonita(v.red);
    // La dirección queda limpia en los tres casos (éxito, error y canje): recargar no vuelve a
    // mandar la misma marca. Es lo mismo que ya se hacía con `code` y `state`.
    const limpiarDireccion = () => {
      olvidarRed();
      // El mismo limpiado que ya se hacía con `code` y `state`, ahora compartido con la vuelta del correo.
      quitarDeLaDireccion(['code', 'state', 'red', 'error', 'error_description'], /-callback$|not-enough/);
    };

    // El error manda: no se confirma una conexión que el proveedor dijo que falló.
    if (!v.codigo && v.fallo) {
      const dicho = (new URLSearchParams(window.location.search).get(v.fallo) || '').trim();
      avisar(`No se pudo conectar ${nombre}: el proveedor devolvió «${dicho && dicho !== v.fallo ? `${dicho} (${v.fallo})` : v.fallo}»`);
      limpiarDireccion();
      return;
    }

    const vuelta = v.codigo ? volverDeMeta(v.codigo, v.state, v.red) : confirmarRed(v.red);
    void vuelta
      .then(() => {
        // Lo que cambia según la vía: con la app propia se empieza a leer; con bundle se empieza a publicar.
        avisar(v.codigo
          ? `${nombre} conectado: el motor ya puede leer sus datos reales`
          : `${nombre} conectado: ya puede publicar ahí`);
        return datos.refrescar();
      })
      .catch((e: Error) => { avisar(`No se pudo conectar ${nombre}: ${e.message}`); })
      .finally(limpiarDireccion);
  }, []);

  return null;
}

export default function App() {
  // La sesión arranca vacía: el panel no existe hasta que alguien entra.
  const [sesion, setSesion] = useState<Sesion | null>(null);

  // LA VUELTA DEL CORREO DE BIENVENIDA: si esta dirección llega con el token de la confirmación
  // (`?token=…`), se canjea contra el back una sola vez. Vive acá arriba, y no adentro del panel,
  // porque el enlace del correo se abre sin sesión: la persona cae en la entrada y tiene que ver cómo
  // salió. Adentro del panel el resultado se cuenta con el aviso de siempre.
  const vueltaDeCorreo = useVueltaDeCorreo();

  // Con el back encendido, al abrir el panel se pregunta quién es: si la sesión sigue viva, entra directo
  // y sigue donde estaba, sin volver a escribir la clave. Eso es lo que hace que «volver» no cueste nada.
  useEffect(() => {
    if (!hayApi() || !token()) return;
    let vivo = true;
    quienSoy().then(u => {
      if (vivo && u) setSesion({ nombre: u.nombre, email: u.email, via: 'email' });
    });
    return () => { vivo = false; };
  }, []);

  const [vista, setVista] = useState<Vista>('hoy');
  const [toast, setToast] = useState('');
  const [modo, setModo] = useState<Modo>(TENANT.modoActual);
  const { theme, cycle } = useTheme();

  const avisar = (t: string) => {
    setToast(t);
    window.setTimeout(() => setToast(''), 2600);
  };

  // Sin sesión, la única pantalla es la entrada. Ahí también se ve cómo salió la vuelta del correo.
  if (!sesion) return <PantallaLogin onEntrar={setSesion} vuelta={vueltaDeCorreo} />;

  // Desde acá para adentro, todo el panel tiene los datos del back (o los del demo si no hay back).

  return (
    // `modoDemo`: cuando se entra por la demostración (la cuenta de ejemplo), el panel no lee el back
    // aunque haya una sesión abierta en el navegador. Antes las dos cosas se mezclaban: se veían los
    // datos reales del negocio con el nombre de la persona del ejemplo, que es lo que hacía que el panel
    // dijera «Hola María».
    <ProveedorDatos modoDemo={sesion.via === 'demo'}>
    {/* La vuelta del proveedor: va dentro del proveedor de datos para poder releer las conexiones. */}
    <VueltaDeConexion avisar={avisar} />
    {/* La seguridad de la cuenta (el PIN y el correo) envuelve al panel: el aviso del PIN se abre desde
        cualquier acción sensible y la tarjeta de Cuenta lee el mismo estado. */}
    <SeguridadProvider>
    {/* Con sesión, la vuelta del correo se cuenta con el aviso del panel y la seguridad se relee. */}
    <SeguridadAlDia vuelta={vueltaDeCorreo} avisar={avisar} />
    <PerfilProvider cuenta={sesion} demo={sesion.via === 'demo'}>
    <OnboardingProvider avisar={avisar}>
    <PlanProvider>
    <DetalleProvider>
    <Layout vista={vista} setVista={setVista} theme={theme} cicloTema={cycle} toast={toast} modo={modo}>
      {vista === 'onboarding' && <ViewOnboarding setToast={avisar} setVista={setVista} />}
      {vista === 'hoy' && <ViewHoy setToast={avisar} setVista={setVista} modo={modo} />}
      {vista === 'campanas' && <ViewCampanas setToast={avisar} modo={modo} setVista={setVista} />}
      {vista === 'conversaciones' && <ViewConversaciones setToast={avisar} modo={modo} />}
      {vista === 'mercado' && <ViewMercado setToast={avisar} setVista={setVista} />}
      {vista === 'cuenta' && <ViewCuenta setToast={avisar} modo={modo} setModo={setModo} />}
      {vista === 'creditos' && <ViewCreditos setToast={avisar} />}
      {vista === 'referidos' && <ViewReferidos setToast={avisar} />}
      {vista === 'kyc' && <ViewKyc setToast={avisar} />}
    </Layout>
    {/* El asistente de entrada: se abre solo la primera vez que hay sesión. */}
    <Asistente sesion={sesion} setVista={setVista} />
    </DetalleProvider>
    </PlanProvider>
    </OnboardingProvider>
    </PerfilProvider>
    </SeguridadProvider>
    </ProveedorDatos>
  );
}

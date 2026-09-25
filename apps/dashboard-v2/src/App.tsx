import { useEffect, useState } from 'react';
import { Layout, type Vista } from './components/Layout';
import { DetalleProvider } from './components/Detalle';
import { useTheme } from './lib/theme';
import { PerfilProvider } from './lib/perfil';
import { PlanProvider } from './lib/plan';
import { OnboardingProvider } from './lib/onboarding';
import { ViewOnboarding } from './views/Onboarding';
import { PantallaLogin, type Sesion } from './views/Login';
import { codigoDeMeta, hayApi, olvidarRed, quienSoy, token, volverDeMeta } from './api/cliente';
import { ProveedorDatos } from './api/datos';
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

export default function App() {
  // La sesión arranca vacía: el panel no existe hasta que alguien entra.
  const [sesion, setSesion] = useState<Sesion | null>(null);

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

  // La vuelta de la autorización —Meta, o la red que sea: la ruta es por red, así el mismo flujo sirve
  // para todas—: si la dirección trae el código, se canjea acá y se limpia la dirección (para que
  // recargar no vuelva a mandarlo). Es lo que termina de conectar la cuenta.
  useEffect(() => {
    const v = codigoDeMeta();
    if (!v || !hayApi() || !token()) return;
    const nombre = redBonita(v.red);
    void volverDeMeta(v.codigo, v.state, v.red)
      .then(() => { avisar(`${nombre} conectado: el motor ya puede leer sus datos reales`); })
      .catch((e: Error) => { avisar(`No se pudo conectar ${nombre}: ${e.message}`); })
      .finally(() => {
        olvidarRed();
        try {
          const url = new URL(window.location.href);
          url.searchParams.delete('code'); url.searchParams.delete('state'); url.searchParams.delete('red');
          window.history.replaceState({}, '', url.toString());
        } catch { /* sin navegador */ }
      });
  }, []);
  const [vista, setVista] = useState<Vista>('hoy');
  const [toast, setToast] = useState('');
  const [modo, setModo] = useState<Modo>(TENANT.modoActual);
  const { theme, cycle } = useTheme();

  const avisar = (t: string) => {
    setToast(t);
    window.setTimeout(() => setToast(''), 2600);
  };

  // Sin sesión, la única pantalla es la entrada.
  if (!sesion) return <PantallaLogin onEntrar={setSesion} />;

  // Desde acá para adentro, todo el panel tiene los datos del back (o los del demo si no hay back).

  return (
    <ProveedorDatos>
    <PerfilProvider>
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
    </ProveedorDatos>
  );
}

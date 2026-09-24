import { useState } from 'react';
import { Layout, type Vista } from './components/Layout';
import { DetalleProvider } from './components/Detalle';
import { useTheme } from './lib/theme';
import { PerfilProvider } from './lib/perfil';
import { PlanProvider } from './lib/plan';
import { OnboardingProvider } from './lib/onboarding';
import { ViewOnboarding } from './views/Onboarding';
import { PantallaLogin, type Sesion } from './views/Login';
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

export default function App() {
  // La sesión arranca vacía: el panel no existe hasta que alguien entra.
  const [sesion, setSesion] = useState<Sesion | null>(null);
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

  return (
    <PerfilProvider>
    <PlanProvider>
    <OnboardingProvider avisar={avisar}>
    <DetalleProvider>
    <Layout vista={vista} setVista={setVista} theme={theme} cicloTema={cycle} toast={toast} modo={modo} avisar={avisar}>
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
    </OnboardingProvider>
    </PlanProvider>
    </PerfilProvider>
  );
}

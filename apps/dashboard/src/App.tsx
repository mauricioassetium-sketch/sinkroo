import { useState } from 'react';
import { useTheme } from './lib/theme';
import Login from './views/Login';
import Onboarding from './views/Onboarding';
import Layout from './components/Layout';
import Dashboard from './views/Dashboard';
import Mercado from './views/Mercado';
import Estrategia from './views/Estrategia';
import Herramientas from './views/Herramientas';
import Campanas from './views/Campanas';
import Whatsapp from './views/Whatsapp';
import Creatividades from './views/Creatividades';
import Referidos from './views/Referidos';
import Creditos from './views/Creditos';
import Config from './views/Config';
import Kyc from './views/Kyc';
import Predictiva from './views/Predictiva';
import type { ViewKey } from './components/sinkroo/data';

type Fase = 'login' | 'onboarding' | 'app';

export default function App() {
  const { theme, cycle } = useTheme();
  const [fase, setFase] = useState<Fase>('login');
  const [vista, setVista] = useState<ViewKey>('dashboard');
  const [showNotif, setShowNotif] = useState(false);

  const go = (v: ViewKey) => { setVista(v); };

  if (fase === 'login') return <><Login onEnter={() => setFase('onboarding')} /></>;
  if (fase === 'onboarding') return <><Onboarding onDone={() => setFase('app')} /></>;

  return (
    <>
      <Layout vista={vista} onNav={n => n.vista && go(n.vista as any)} theme={theme} onCycleTheme={cycle} showNotif={showNotif} onToggleNotif={() => setShowNotif(!showNotif)}>
        {vista === 'dashboard' && <Dashboard onNav={go} />}
        {vista === 'mercado' && <Mercado />}
        {vista === 'estrategia' && <Estrategia />}
        {vista === 'herramientas' && <Herramientas onNav={go} />}
        {vista === 'campanas' && <Campanas />}
        {vista === 'whatsapp' && <Whatsapp />}
        {vista === 'creatividades' && <Creatividades />}
        {vista === 'referidos' && <Referidos />}
        {vista === 'creditos' && <Creditos />}
        {vista === 'kyc' && <Kyc onDone={() => go('dashboard')} />}
        {vista === 'config' && <Config />}
        {vista === 'predictiva' && <Predictiva />}
      </Layout>
    </>
  );
}

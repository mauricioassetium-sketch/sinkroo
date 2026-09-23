import { useState } from 'react';
import { Layout, type Vista } from './components/Layout';
import { useTheme } from './lib/theme';
import { ViewHoy } from './views/Hoy';
import { ViewCampanas } from './views/Campanas';
import { ViewConversaciones } from './views/Conversaciones';
import { ViewMercado } from './views/Mercado';
import { ViewCuenta } from './views/Cuenta';
import { TENANT, type Modo } from './data/demo';

export default function App() {
  const [vista, setVista] = useState<Vista>('hoy');
  const [toast, setToast] = useState('');
  const [modo, setModo] = useState<Modo>(TENANT.modoActual);
  const { theme, cycle } = useTheme();

  const avisar = (t: string) => {
    setToast(t);
    window.setTimeout(() => setToast(''), 2600);
  };

  return (
    <Layout vista={vista} setVista={setVista} theme={theme} cicloTema={cycle} toast={toast} modo={modo}>
      {vista === 'hoy' && <ViewHoy setToast={avisar} setVista={setVista} modo={modo} />}
      {vista === 'campanas' && <ViewCampanas setToast={avisar} modo={modo} />}
      {vista === 'conversaciones' && <ViewConversaciones setToast={avisar} modo={modo} />}
      {vista === 'mercado' && <ViewMercado setToast={avisar} />}
      {vista === 'cuenta' && <ViewCuenta setToast={avisar} modo={modo} setModo={setModo} />}
    </Layout>
  );
}

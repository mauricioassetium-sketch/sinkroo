import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

// Sin trucos de arranque: no hay pantalla de carga, ni «watchdog anti-blank», ni nada que se
// destape por reloj. La página se pinta y ya.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

import { createContext, useContext, useState, type ReactNode } from 'react';

// =============================================================================================
// PERFIL — los datos del dueño de la cuenta. Es editable desde el sidebar y todo el panel los
// usa: el saludo del hero, el nombre del negocio, la inicial del avatar, etc.
// =============================================================================================

export interface Perfil {
  nombre: string;
  marca: string;
  email: string;
  telefono: string;
  zona: string;
  moneda: string;
  color: string;
}

export const PERFIL_INICIAL: Perfil = {
  nombre: 'María Paula',
  marca: 'Skincare Natural',
  email: 'hola@skincarenatural.com',
  telefono: '+54 9 11 5555-2341',
  zona: 'Buenos Aires · GMT-3',
  moneda: 'Peso argentino',
  color: '#a855f7',
};

export const ZONAS = ['Buenos Aires · GMT-3', 'Santiago · GMT-3', 'Bogotá · GMT-5', 'Ciudad de México · GMT-6', 'Madrid · GMT+2'];
export const MONEDAS = ['Peso argentino', 'Peso chileno', 'Peso colombiano', 'Peso mexicano', 'Dólar', 'Euro'];
export const COLORES_AVATAR = ['#a855f7', '#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4'];

/** Dos iniciales a partir del nombre, para el avatar. Si no hay nombre, cae en "TU". */
export function inicialesDe(nombre: string) {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return 'TU';
  const a = partes[0][0] ?? '';
  const b = partes.length > 1 ? partes[1][0] ?? '' : (partes[0][1] ?? '');
  return (a + b).toUpperCase();
}

/** El nombre de pila, para saludar. */
export function nombreDePila(nombre: string) {
  return nombre.trim().split(/\s+/)[0] || 'hola';
}

const Ctx = createContext<{ perfil: Perfil; guardar: (p: Perfil) => void }>({
  perfil: PERFIL_INICIAL,
  guardar: () => {},
});

const CLAVE = 'sinkroo-perfil';

export function PerfilProvider({ children }: { children: ReactNode }) {
  // Se guarda en el navegador: lo que editás sobrevive a recargar la página.
  const [perfil, setPerfil] = useState<Perfil>(() => {
    try {
      const guardado = localStorage.getItem(CLAVE);
      return guardado ? { ...PERFIL_INICIAL, ...JSON.parse(guardado) } : PERFIL_INICIAL;
    } catch { return PERFIL_INICIAL; }
  });

  const guardar = (p: Perfil) => {
    setPerfil(p);
    try { localStorage.setItem(CLAVE, JSON.stringify(p)); } catch { /* modo privado: queda en memoria */ }
  };

  return <Ctx.Provider value={{ perfil, guardar }}>{children}</Ctx.Provider>;
}

export const usePerfil = () => useContext(Ctx);

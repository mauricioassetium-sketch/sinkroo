import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// =============================================================================================
// LA LANDING SE SIRVE EN LA RAÍZ DEL DOMINIO — de ahí `base: '/'`.
//
//    · `base: '/'`      → las rutas del index.html salen absolutas (/assets/…, /67.png). Es lo que
//                         necesita un sitio propio; el panel v2 usa `base: './'` porque vive en un
//                         subcamino, y esa es la única diferencia entre los dos.
//    · `outDir: 'dist'` → el build cae siempre en apps/landing/dist.
//    · SIN variables de entorno → el mismo `dist` sirve tal cual en cualquier parte: no hay nada
//                         que configurar ni que reemplazar antes de publicar.
// =============================================================================================
export default defineConfig({
  base: '/',
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
});

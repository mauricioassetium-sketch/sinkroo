import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// =============================================================================================
// LA DIRECCIÓN DONDE VIVE EL PANEL
//
// El panel ya no está en la raíz del dominio: en sinkroo.com ahora está la landing y el panel vive en
// /panel/. Con `base` en './' el HTML pide sus archivos con rutas relativas, y eso sirve en las dos
// partes: en la raíz (la maqueta de revisión de GitHub Pages) pide ./assets/…, y en /panel/ termina
// pidiendo /panel/assets/… por el directorio donde está. Con una ruta absoluta, la maqueta de Pages
// pediría /panel/assets/… y se vería en blanco. Si algún día hace falta base absoluta, se pasa
// `BASE_PANEL` al construir.
// =============================================================================================
const base = process.env.BASE_PANEL || './';

export default defineConfig({
  base,
  plugins: [react()],
});

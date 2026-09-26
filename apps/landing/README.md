# apps/landing — la página de entrada

La landing pública de Sinkroo: la puerta de entrada del dominio. Está hecha con **Vite + React +
TypeScript**, igual que `apps/dashboard-v2`, pero es **independiente**: se compila y se publica por
su cuenta.

## Correr

```bash
cd apps/landing
npm run dev        # servidor de desarrollo
npm run build      # typecheck (tsc) + build a dist/
npm run preview    # sirve dist/ para revisarlo
```

Sin variables de entorno: el mismo `dist/` sirve tal cual en cualquier parte.

## Cómo está armada

```
apps/landing/
  index.html        el documento: título, descripción, favicons del búho, tipografía
  public/           los mismos iconos del panel, con los mismos nombres
                    67.png, favicon.ico, favicon-16x16.png, favicon-32x32.png,
                    favicon-48x48.png, apple-touch-icon.png
  src/main.tsx      arranca React (sin trucos: nada de «watchdog anti-blank»)
  src/App.tsx       los seis bloques y el texto, literal
  src/styles.css    los tokens del panel (violeta #a855f7, fondos oscuros, tarjetas con borde suave)
  vite.config.ts    base '/', build a dist/
  dist/             lo que se publica
```

## Las reglas que la mandan

1. **El texto es del dueño, literal.** No se reescribe ni se agrega una promesa más. Si hay que
   cambiar algo, se cambia en el contenido y de ahí para acá.
2. **Corta.** Seis bloques, cada uno de una pantalla de celular o menos, una idea por bloque.
   El titular y las líneas cortas van en una sola columna, sin párrafos largos.
3. **Se habla de usted**, español de Colombia.
4. **Nada se esconde por JavaScript.** No hay animaciones de entrada, ni `opacity: 0` de arranque,
   ni el «watchdog anti-blank» que tenía el sitio viejo. El texto se pinta de una vez.
5. **Los botones son enlaces a `/panel/`**, en la misma ventana. No hay formularios: no hay ningún
   campo que prometa enviar algo que todavía no se envía.
6. **Pensada para el celular**, que es como la va a ver el dueño: una columna, letra de 16px,
   botones de 56px de alto, sin scroll horizontal.
7. **Lo que no se promete**, no aparece: nada de publicar solo en las redes, nada de automatizar
   ventas, nada de cifras de clientes ni logos de terceros.

## Detalles que conviene saber

- `base: '/'` (no `'./'` como el panel): la landing vive en la raíz del dominio, el panel no.
- El build no depende de variables de entorno: no hay nada que reemplazar antes de publicar.
- La tipografía es la misma del panel (Inter), pero se carga aparte y con `media="print"`: si la
  fuente no llega, queda la del sistema y el texto se lee igual.
- El build NO toca el `index.html` ni la carpeta `assets/` de la raíz del repo (ese es el sitio
  viejo compilado, que sigue donde estaba hasta que alguien decida publicar esto).

# Sinkroo Dashboard

Dashboard React del ecosistema Sinkroo — panel de control con módulos de Mercado, Estrategia, Herramientas, WhatsApp (M5 con flujo automático por pasos, selector de canal WhatsApp/Messenger con logos y contadores, bandeja con colas IA/humano), Campañas, Creatividades, Referidos, Créditos, KYC e Inteligencia Predictiva.

## Stack

- React 18 + Vite + TypeScript
- CSS propio (dark morado/negro, design system Sinkroo)

## Scripts

```bash
npm install
npm run dev      # servidor de desarrollo
npm run build    # build de producción → dist/
npm run preview  # previsualizar el build
```

## Estructura

```
src/
  views/       Dashboard, Mercado, Estrategia, Herramientas, Whatsapp, ...
  components/
    sinkroo/   ui.tsx, icons.tsx, charts.tsx, data.ts
  css/         globals.css (design system)
  App.tsx      ruteo de vistas
```

## Notas

- UI 100% en español, montos en $, "cr" = créditos.
- El módulo WhatsApp (M5) filtra conversaciones por canal (WhatsApp/Messenger) y divide el flujo automático en un compartimento por respuesta.

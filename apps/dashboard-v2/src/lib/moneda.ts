// =============================================================================================
// EL DINERO DEL PANEL, SIEMPRE EN DÓLARES — la regla de formato vive acá y sólo acá.
//
// Lo que decidió el dueño: los importes del panel se muestran SIEMPRE en dólares, y el dólar es
// la base contra la que se compara la moneda del país elegido en el perfil. Al lado del monto en
// dólares va su equivalente en la moneda local, calculado con el tipo de cambio del día. Si la
// moneda elegida ES el dólar, no se repite «= USD» a la derecha: queda sólo el importe.
//
// LOS NÚMEROS DE LA MAQUETA SON DÓLARES. Los $4.280 de ventas del mes, los $34 del serum, los
// $8.400 de ticket promedio, los $6.000 de meta, los $109 por día de presupuesto y los $79 del
// plan ya estaban escritos así: no se reescriben. Lo único que cambia es CÓMO SE MUESTRAN (con su
// «USD» bien visible), así que este archivo no inventa valores ni los convierte.
//
// NADIE ARMA EL TEXTO DEL DINERO POR SU CUENTA: las vistas piden acá los dos textos y los pintan
// con `<Dinero>` (components/ui.tsx). Por eso el mismo monto se ve igual en todas las pantallas.
//
// EL TIPO DE CAMBIO ES DE MUESTRA, NO ES UN DATO EN VIVO. Sale de `CAMBIOS` (lib/perfil.tsx) y
// lleva la fecha del día y el banco que lo publica. En producción estos números NO se escriben en
// el código: se piden todos los días a la API del banco central del país —BCRA (Argentina),
// Banco Central de Chile, Banco de la República (Colombia), Banxico (México), Banco Central do
// Brasil, Banco Central Europeo— y se guardan con la fecha del día. El dólar sigue siendo la base.
// =============================================================================================

import { cambioDe, conversionDelDia, monedaDe, numeroConMiles } from './perfil';

/** Los dos textos de un importe: el principal en dólares y, si corresponde, su equivalente. */
export interface Importe {
  /** El monto en dólares, con su sufijo: `$4.280 USD`. Es lo que se ve siempre. */
  principal: string;
  /** El equivalente en la moneda del perfil: `≈ $6.364.360 ARS`. Null si la moneda elegida ya es el dólar. */
  equivalente: string | null;
}

/** Un monto con su símbolo: `$4.280`, `+$340/sem`, `$2,10`, `$120 / día`. */
const MONTO = /\$\s?\d[\d.]*(?:,\d+)?/;

/** El primer monto que aparece en un texto ya escrito, como número. `de $6.000` → 6000 · `$2,10` → 2,1. */
function numeroDeTexto(texto: string): number | null {
  const m = MONTO.exec(texto);
  if (!m) return null;
  const crudo = m[0].replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.');
  return crudo === '' ? null : Number(crudo);
}

/**
 * LOS DOS TEXTOS DE UN IMPORTE. Acepta un número (`4280`) o el texto que ya está escrito en la
 * pantalla (`'$4.280'`, `'de $6.000'`, `'+$340/sem'`): en el segundo caso NO reescribe el número
 * —lo deja tal cual y le pega su «USD» al lado—, así lo que está escrito se sigue leyendo igual.
 * Un texto sin dinero (`'3,8x'`, `'±20% por acción'`) vuelve sin tocar y sin equivalente.
 */
export function importe(montoUsd: number | string, nombreMoneda: string): Importe {
  const mon = monedaDe(nombreMoneda);
  const cambio = cambioDe(nombreMoneda);

  const principal = typeof montoUsd === 'number'
    ? `$${numeroConMiles(montoUsd)} USD`
    : montoUsd.replace(MONTO, m => `${m} USD`);
  const monto = typeof montoUsd === 'number' ? montoUsd : numeroDeTexto(montoUsd);

  // Sin monto (no había dinero en el texto) o con el dólar elegido, no hay equivalente que mostrar.
  // El «USD» del principal se muestra igual: el importe siempre tiene que verse en dólares.
  if (monto === null || mon.codigo === 'USD') {
    return { principal, equivalente: null };
  }
  return {
    principal,
    equivalente: `≈ ${mon.simbolo}${numeroConMiles(monto * cambio.porUsd)} ${mon.codigo}`,
  };
}

/**
 * La aclaración al pie: dice en qué moneda están los importes y de dónde sale el equivalente.
 * Es la misma línea en todas las pantallas, para que el cliente no tenga que adivinar.
 */
export function notaMoneda(nombreMoneda: string): string {
  const mon = monedaDe(nombreMoneda);
  if (mon.codigo === 'USD') {
    return 'Los importes están en dólares: es la moneda con la que el motor mide y cobra. No hay equivalente que mostrar.';
  }
  const c = conversionDelDia(nombreMoneda);
  return `Los importes están en dólares. El equivalente en ${mon.codigo} usa el tipo de cambio de muestra del día (${c.titulo}, del ${c.fecha}) y no un valor en vivo: en producción lo publica todos los días el banco central.`;
}

/** Lo mismo que `notaMoneda`, más corto: para el globito de ayuda de cada importe. */
export function ayudaMoneda(nombreMoneda: string): string {
  const mon = monedaDe(nombreMoneda);
  if (mon.codigo === 'USD') return 'El dinero del panel está en dólares.';
  const c = conversionDelDia(nombreMoneda);
  return `En dólares. El equivalente en ${mon.codigo} usa el tipo de cambio de muestra del día (${c.titulo}, del ${c.fecha}); en producción lo publica el banco central todos los días.`;
}

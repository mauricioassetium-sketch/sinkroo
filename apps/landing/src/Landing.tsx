/* =============================================================================================
   LA LANDING DE SINKROO — la puerta de entrada.
   Es EL MISMO ARMAZÓN de la landing anterior (mismos bloques, en el mismo orden, con las mismas
   clases y su mismo CSS: `viejo.css`), con la información de hoy adentro.

   LOS DIEZ BLOQUES, EN ORDEN (los mismos de la vieja):
     1. Cabecera fija · 2. Portada · 3. Dos párrafos · 4. Franja que se mueve · 5. Cómo funciona ·
     6. Los siete módulos · 7. La diferencia es el orden · 8. Bloque numerado (la investigación) ·
     9. Contacto · 10. Pie

   REGLAS QUE LA MANDAN:
     · EL TEXTO ES DEL DUEÑO, LITERAL. Vive en `contenido.ts` (español e inglés) y no se reescribe
       aquí: este archivo sólo lo pone en su bloque.
     · NADA PROMETE LO QUE EL SISTEMA NO HACE. El panel todavía no publica en las redes: las piezas
       quedan listas y usted aprueba. No se dice «publica solo», ni «en milisegundos», ni cifras
       que nadie midió.
     · NADA SE ESCONDE POR JAVASCRIPT: no hay animación de entrada ni estado invisible que alguien
       tenga que destapar. Lo único que se mueve es la franja del bloque 4, y se detiene sola para
       quien pidió menos movimiento en su sistema (`prefers-reduced-motion`).
     · SIN IMÁGENES REMOTAS: todo sale de public/.
   ============================================================================================= */

import { useEffect, useState } from 'react';

import './viejo.css';
import './landing-extra.css';
import { CONTENIDO, IDIOMA_INICIAL, PANEL, IMAGENES } from './contenido';
import type { Idioma } from './contenido';

/* Las 31 líneas verticales del fondo de la portada: son adorno, con la misma clase de la vieja.
   La posición es fija (no al azar) para que la página se pinte igual siempre. */
const LINEAS = Array.from({ length: 31 }, (_, i) => ({
  left: `${(i * 100) / 31}%`,
  retardo: `${(i % 7) * 1.4}s`,
}));

/** El triángulo de la esquina de los botones grandes (los mismos dibujos de la vieja). */
function FlechaDiagonal() {
  return (
    <svg
      className="transition-transform duration-300 group-hover:rotate-45"
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </svg>
  );
}

/** La flecha de los enlaces («→» dibujada, como en la vieja). */
function Flecha({ ancho = 18 }: { ancho?: number }) {
  return (
    <svg
      className="transition-transform duration-300 group-hover:translate-x-1"
      width={ancho}
      height={ancho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

export function Landing() {
  const [idioma, setIdioma] = useState<Idioma>(IDIOMA_INICIAL);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const t = CONTENIDO[idioma];

  /* El idioma de la página entera cambia con el selector: la etiqueta <html lang> incluida. */
  useEffect(() => {
    document.documentElement.lang = idioma;
  }, [idioma]);

  const correo = 'info@sinkroo.com';

  return (
    <div className="bg-primary flex flex-col min-h-screen">
      {/* ========================= 1 · CABECERA ========================= */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 md:h-20 flex items-center border-b border-white/10">
        <nav className="w-full max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 active">
            <img src={IMAGENES.buho} className="w-10 h-10 md:w-12 md:h-12" alt={t.cabecera.altBuho} />
            <h2 className="text-xl md:text-2xl font-black bg-gradient-to-r from-purple-500 to-purple-700 bg-clip-text text-transparent">
              {t.cabecera.marca}
            </h2>
          </a>

          <div className="hidden md:flex gap-8">
            <a href="#como-funciona" className="text-gray-400 hover:text-white transition">
              {t.cabecera.menu.comoFunciona}
            </a>
            <a href={PANEL} className="text-gray-400 hover:text-white transition">
              {t.cabecera.menu.planes}
            </a>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <div className="selector-idioma" role="group" aria-label={t.cabecera.idioma.etiqueta}>
              <button
                type="button"
                className={idioma === 'es' ? 'idioma-activo' : 'idioma-inactivo'}
                aria-pressed={idioma === 'es'}
                onClick={() => setIdioma('es')}
              >
                {t.cabecera.idioma.es}
              </button>
              <button
                type="button"
                className={idioma === 'en' ? 'idioma-activo' : 'idioma-inactivo'}
                aria-pressed={idioma === 'en'}
                onClick={() => setIdioma('en')}
              >
                {t.cabecera.idioma.en}
              </button>
            </div>
            <a
              href={PANEL}
              className="px-5 py-2 bg-white text-black rounded-full font-semibold hover:bg-gray-200 transition"
            >
              {t.cabecera.menu.entrar}
            </a>
          </div>

          <button
            type="button"
            className="md:hidden text-white text-2xl"
            aria-label={t.cabecera.abrirMenu}
            aria-expanded={menuAbierto}
            onClick={() => setMenuAbierto((abierto) => !abierto)}
          >
            ☰
          </button>
        </nav>
      </header>

      {/* El menú del celular: la misma lista, debajo de la cabecera. */}
      {menuAbierto ? (
        <div className="menu-movil">
          <a href="#como-funciona" onClick={() => setMenuAbierto(false)}>
            {t.cabecera.menu.comoFunciona}
          </a>
          <a href={PANEL} onClick={() => setMenuAbierto(false)}>
            {t.cabecera.menu.planes}
          </a>
          <a href={PANEL} onClick={() => setMenuAbierto(false)}>
            {t.cabecera.menu.entrar}
          </a>
          <div className="selector-idioma" role="group" aria-label={t.cabecera.idioma.etiqueta}>
            <button
              type="button"
              className={idioma === 'es' ? 'idioma-activo' : 'idioma-inactivo'}
              aria-pressed={idioma === 'es'}
              onClick={() => setIdioma('es')}
            >
              {t.cabecera.idioma.es}
            </button>
            <button
              type="button"
              className={idioma === 'en' ? 'idioma-activo' : 'idioma-inactivo'}
              aria-pressed={idioma === 'en'}
              onClick={() => setIdioma('en')}
            >
              {t.cabecera.idioma.en}
            </button>
          </div>
        </div>
      ) : null}

      <main className="flex-grow relative z-0">
        {/* ============ 2 · PORTADA · 3 · LOS DOS PÁRRAFOS · 4 · LA FRANJA ============ */}
        <div className="min-h-screen bg-black text-white overflow-hidden relative font-sans">
          <div className="absolute inset-0 z-0">
            <img
              src={IMAGENES.portada}
              className="w-full h-full object-cover grayscale-[0.5] object-[60%_center] sm:object-center md:object-center"
              alt={t.portada.altPortada}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black"></div>
          </div>

          <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
            {LINEAS.map((linea) => (
              <div
                key={linea.left}
                className="linea-que-cae absolute bg-purple-400/20 w-[1px] h-[100px]"
                style={{ left: linea.left, animationDelay: linea.retardo }}
              ></div>
            ))}
          </div>

          <div className="relative z-20 max-w-[1700px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 items-center min-h-screen px-6 py-20 md:px-16">
            <div className="md:col-span-7 flex flex-col gap-12">
              <div className="flex flex-col gap-6">
                <div className="text-xs tracking-widest text-purple-300 uppercase">{t.portada.linea}</div>
                <h1 className="text-[12vw] md:text-[3.5rem] leading-[0.85] tracking-tighter font-black uppercase">
                  {t.portada.titulo.uno}
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/40">
                    {t.portada.titulo.dos}
                  </span>
                </h1>
                <p className="text-white/60 text-lg max-w-xl leading-relaxed">{t.portada.bajada}</p>
              </div>

              <div className="flex flex-col md:flex-row gap-5">
                <a href={PANEL}>
                  <button className="flex items-center justify-between gap-4 px-8 py-4 rounded-xl text-sm font-bold transition-colors duration-300 group w-full md:w-auto min-w-[200px] border-2 bg-[#a78bfa] text-white border-[#a78bfa]">
                    <span className="tracking-tighter uppercase">{t.portada.accesos.panel}</span>
                    <FlechaDiagonal />
                  </button>
                </a>
                <a href="#como-funciona">
                  <button className="flex items-center justify-between gap-4 px-8 py-4 rounded-xl text-sm font-bold transition-colors duration-300 group w-full md:w-auto min-w-[200px] border-2 bg-white text-black border-white">
                    <span className="tracking-tighter uppercase">{t.portada.accesos.comoFunciona}</span>
                    <FlechaDiagonal />
                  </button>
                </a>
                <a href={PANEL}>
                  <button className="boton-fantasma flex items-center justify-between gap-4 px-8 py-4 rounded-xl text-sm font-bold transition-colors duration-300 group w-full md:w-auto min-w-[200px] border-2">
                    <span className="tracking-tighter uppercase">{t.portada.accesos.planes}</span>
                    <FlechaDiagonal />
                  </button>
                </a>
              </div>

              {/* Las tres cifras grandes de la portada. */}
              <div className="relative grid grid-cols-3 rounded-xl md:rounded-2xl overflow-hidden max-w-full md:max-w-2xl mt-4 md:mt-6 bg-black/50 backdrop-blur-xl border border-purple-900/20 shadow-[0_0_40px_rgba(167,139,250,0.2)] md:shadow-[0_0_60px_rgba(167,139,250,0.25)]">
                {t.portada.cifras.map((cifra, i) => (
                  <div className="relative p-3 sm:p-4 md:p-10 group cursor-pointer transition-all duration-500" key={cifra.etiqueta}>
                    {i < 2 ? (
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 h-2/3 w-[1px] bg-gradient-to-b from-transparent via-purple-400/40 to-transparent"></div>
                    ) : null}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-500 bg-gradient-to-br from-purple-400/10 via-transparent to-transparent"></div>
                    <div className="absolute inset-0 overflow-hidden">
                      <div className="absolute -left-20 top-0 h-full w-20 bg-white/10 blur-xl opacity-0 group-hover:opacity-100 group-hover:translate-x-[300%] transition-all duration-700"></div>
                    </div>
                    <div className="relative z-10">
                      <div className="text-[10px] sm:text-xs tracking-widest text-purple-300 uppercase mb-1 md:mb-2">
                        {cifra.etiqueta}
                      </div>
                      <div className="text-lg sm:text-2xl md:text-5xl font-light text-white group-hover:text-purple-200 transition duration-500">
                        {cifra.valor}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3 · LOS DOS PÁRRAFOS (la columna derecha de la portada, como en la vieja). */}
            <div className="md:col-span-5 flex items-center justify-end">
              <div className="relative">
                <div className="absolute -left-8 top-0 bottom-0 w-[1px] bg-gradient-to-b from-purple-400 to-transparent hidden md:block"></div>
                <p className="text-white/50 text-sm md:text-base max-w-xs md:max-w-sm mr-auto text-left leading-relaxed font-light">
                  {t.introduccion.uno}
                  <br />
                  <br />
                  {t.introduccion.dos}
                </p>
              </div>
            </div>
          </div>

          {/* 4 · LA FRANJA QUE SE MUEVE (en la vieja eran los logos de medios). */}
          <div className="absolute bottom-0 w-full bg-gradient-to-t from-black to-transparent pt-20 pb-10 z-50">
            <section className="bg-black py-2 overflow-hidden border-white/10">
              <div className="relative w-full overflow-hidden">
                <div className="marquesina flex gap-24">
                  {[0, 1].map((copia) => (
                    <div className="flex gap-24" key={copia}>
                      {t.franja.palabras.map((palabra) => (
                        <div className="flex items-center justify-center min-w-[180px]" key={palabra}>
                          <span className="px-6 py-3 rounded-full border border-purple-500/30 bg-purple-500/5 text-purple-300 text-[10px] font-bold tracking-[0.2em] uppercase whitespace-nowrap">
                            {palabra}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative w-full overflow-hidden mt-4">
                <div className="marquesina marquesina-al-reves flex gap-24">
                  {[0, 1].map((copia) => (
                    <div className="flex gap-24" key={copia}>
                      {t.franja.frases.map((frase) => (
                        <div className="flex items-center justify-center min-w-[180px]" key={frase}>
                          <span className="text-[10px] font-bold tracking-[0.2em] text-gray-500 uppercase whitespace-nowrap">
                            {frase}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* ========================= 5 · CÓMO FUNCIONA ========================= */}
        <section id="como-funciona" className="relative bg-[#050505] text-white min-h-screen px-6 py-32 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none"></div>
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none">
            <img src={IMAGENES.buho} className="w-[800px]" alt="" aria-hidden="true" />
          </div>

          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center relative z-10">
            <div className="relative grid grid-cols-2 gap-4 h-[600px]">
              <div className="space-y-4">
                <img
                  src={t.comoFunciona.tarjetas[0].imagen}
                  alt={t.comoFunciona.tarjetas[0].alt}
                  loading="lazy"
                  className="w-full h-[320px] object-cover object-top rounded-2xl border border-white/10 shadow-2xl transition-transform duration-300 ease-out hover:scale-[1.03]"
                />
                <img
                  src={t.comoFunciona.tarjetas[1].imagen}
                  alt={t.comoFunciona.tarjetas[1].alt}
                  loading="lazy"
                  className="w-full h-[220px] object-cover object-top rounded-2xl border border-white/10 transition-transform duration-300 ease-out hover:scale-[1.03]"
                />
              </div>
              <div className="space-y-4 pt-12">
                <img
                  src={t.comoFunciona.tarjetas[2].imagen}
                  alt={t.comoFunciona.tarjetas[2].alt}
                  loading="lazy"
                  className="w-full h-[220px] object-cover object-top rounded-2xl border border-white/10 transition-transform duration-300 ease-out hover:scale-[1.03]"
                />
                <img
                  src={IMAGENES.creditos}
                  alt={t.cifras.tarjetas[2].alt}
                  loading="lazy"
                  className="w-full h-[320px] object-cover object-top rounded-2xl border border-white/10 shadow-2xl transition-transform duration-300 ease-out hover:scale-[1.03]"
                />
              </div>
            </div>

            <div>
              <div className="inline-block px-4 py-1.5 mb-6 rounded-full border border-purple-500/30 bg-purple-500/5 backdrop-blur-md">
                <span className="text-[10px] font-bold tracking-[0.2em] text-purple-400 uppercase">
                  {t.comoFunciona.etiqueta}
                </span>
              </div>
              <h2 className="text-6xl md:text-8xl font-bold leading-[0.85] tracking-tighter mb-8">
                {t.comoFunciona.titulo.uno}
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-gray-600">
                  {t.comoFunciona.titulo.dos}
                </span>
              </h2>
              <div className="space-y-6 max-w-xl">
                <p className="text-xl text-gray-200 font-light leading-relaxed">{t.comoFunciona.parrafos.uno}</p>
                <p className="text-gray-400 leading-relaxed">{t.comoFunciona.parrafos.dos}</p>
                <div className="flex items-center gap-4 py-4">
                  <div className="h-[1px] w-12 bg-purple-500"></div>
                  <p className="text-[10px] tracking-[0.3em] text-gray-500 uppercase">{t.comoFunciona.linea}</p>
                </div>
                <div className="pt-4">
                  <a href={PANEL}>
                    <button className="group flex items-center gap-4 px-10 py-4 rounded-full text-sm font-bold uppercase tracking-widest border-2 transition-all duration-300 ease-out hover:scale-[1.03] active:scale-[0.97] bg-purple-600 text-white border-purple-600 shadow-[0_0_20px_rgba(168,85,247,0.4)]">
                      <span className="transition-transform group-hover:translate-x-1">{t.comoFunciona.boton}</span>
                      <Flecha />
                    </button>
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto mt-40 grid md:grid-cols-3 gap-8 relative z-10">
            {t.comoFunciona.tarjetas.map((tarjeta) => (
              <div
                className="group relative p-8 rounded-2xl border border-white/5 bg-gradient-to-b from-white/[0.05] to-transparent backdrop-blur-sm transition-all duration-300 hover:-translate-y-1"
                key={tarjeta.numero}
              >
                <div className="absolute inset-0 bg-purple-500/0 group-hover:bg-purple-500/[0.02] transition-colors rounded-2xl"></div>
                <p className="text-purple-500 text-[10px] font-black tracking-widest mb-6 opacity-70">{tarjeta.numero}</p>
                <h3 className="text-2xl font-bold mb-4 group-hover:text-purple-400 transition-colors">{tarjeta.titulo}</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-8">{tarjeta.texto}</p>
                <img
                  src={tarjeta.imagen}
                  alt={tarjeta.alt}
                  loading="lazy"
                  className="w-full h-[220px] object-cover object-top rounded-xl border border-white/10 mb-8"
                />
                <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-white group-hover:text-purple-400 transition-colors">
                  {tarjeta.enlace}
                  <span className="text-lg">→</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ========================= 6 · LOS SIETE MÓDULOS ========================= */}
        <div id="modulos" className="relative bg-black text-white py-28 md:py-36 px-5 md:px-8 overflow-hidden">
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="text-center mb-24 md:mb-32">
              <h1 className="text-5xl md:text-9xl font-bold leading-[0.9] tracking-tighter mb-6">
                {t.modulosTitulo.uno}{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-700">
                  {t.modulosTitulo.dos}
                </span>
              </h1>
            </div>

            <div className="space-y-28 md:space-y-36">
              {t.modulos.map((modulo, i) => {
                const alReves = i % 2 === 1;
                return (
                  <div
                    className={'grid lg:grid-cols-2 gap-12 md:gap-20 items-center' + (alReves ? ' lg:grid-flow-dense' : '')}
                    key={modulo.numero}
                  >
                    <div className={alReves ? 'lg:col-start-2' : ''}>
                      <div className="text-purple-400 text-5xl md:text-7xl font-mono font-bold mb-5 tracking-wider">
                        {modulo.numero}
                      </div>
                      <h3 className="text-2xl md:text-4xl font-bold mb-5 leading-tight">{modulo.titulo}</h3>
                      <p className="text-gray-400 leading-relaxed max-w-md text-sm md:text-base">{modulo.texto}</p>
                    </div>
                    <div className={alReves ? 'lg:col-start-1' : ''}>
                      <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#0b0b0b] shadow-[0_30px_80px_rgba(168,85,247,0.25)]">
                        <img
                          src={modulo.imagen}
                          alt={modulo.alt}
                          loading="lazy"
                          className="w-full h-[260px] md:h-[420px] object-cover object-top"
                        />
                        <div className="absolute inset-0 bg-gradient-to-tr from-black/70 via-transparent to-white/10"></div>
                        <div className="absolute inset-0 rounded-2xl border border-purple-400/20 pointer-events-none"></div>
                        <div className="absolute inset-0 opacity-0 hover:opacity-100 transition duration-500 bg-purple-400/10 blur-2xl"></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ================== 7 · LA DIFERENCIA ES EL ORDEN ================== */}
        <section id="cifras" className="relative bg-black text-white py-28 px-6 overflow-hidden">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-purple-600/10 blur-[140px] -z-10"></div>
          <div className="max-w-7xl mx-auto">
            <div className="mb-16">
              <div className="inline-block px-4 py-1.5 mb-6 rounded-full border border-purple-500/30 bg-purple-500/5 backdrop-blur-md">
                <span className="text-[10px] font-bold tracking-[0.2em] text-purple-400 uppercase">
                  {t.cifras.etiqueta}
                </span>
              </div>
              <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
                {t.cifras.titulo.uno}
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-600">
                  {t.cifras.titulo.dos}
                </span>
              </h2>
              <p className="text-gray-400 mt-6 max-w-xl">{t.cifras.parrafo}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-12">
              {/* Tarjeta 1 — el filtro */}
              <div className="group relative bg-[#0b0b0b] border border-white/10 rounded-3xl p-8 hover:border-purple-500/50 transition-all duration-300 md:col-span-7">
                <div className="flex justify-between items-start mb-10">
                  <div className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl group-hover:bg-purple-500 group-hover:text-black transition-all duration-300">
                    <svg
                      className="w-6 h-6"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="8" r="5" />
                      <path d="M8.5 12.6 7 21l5-3 5 3-1.5-8.4" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-white/30 uppercase tracking-widest border border-white/10 px-3 py-1 rounded-full">
                    {t.cifras.tarjetas[0].etiqueta}
                  </span>
                </div>
                <div>
                  <h3 className="text-4xl font-black text-white mb-2">{t.cifras.tarjetas[0].valor}</h3>
                  <h4 className="text-xl font-bold mb-3">{t.cifras.tarjetas[0].subtitulo}</h4>
                  <p className="text-gray-400 text-sm md:text-base leading-relaxed">{t.cifras.tarjetas[0].texto}</p>
                </div>
                <div className="absolute bottom-0 right-0 w-28 h-28 bg-purple-500/10 blur-[50px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>

              {/* Tarjeta 2 — el público */}
              <div className="group relative bg-[#0b0b0b] border border-white/10 rounded-3xl p-8 hover:border-purple-500/50 transition-all duration-300 md:col-span-5">
                <div className="flex justify-between items-start mb-10">
                  <div className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl group-hover:bg-purple-500 group-hover:text-black transition-all duration-300">
                    <svg
                      className="w-6 h-6"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-white/30 uppercase tracking-widest border border-white/10 px-3 py-1 rounded-full">
                    {t.cifras.tarjetas[1].etiqueta}
                  </span>
                </div>
                <div>
                  <h3 className="text-4xl font-black text-white mb-2">{t.cifras.tarjetas[1].valor}</h3>
                  <h4 className="text-xl font-bold mb-3">{t.cifras.tarjetas[1].subtitulo}</h4>
                  <p className="text-gray-400 text-sm md:text-base leading-relaxed">{t.cifras.tarjetas[1].texto}</p>
                </div>
                <div className="absolute bottom-0 right-0 w-28 h-28 bg-purple-500/10 blur-[50px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>

              {/* Tarjeta 3 — el gasto, con la pantalla de créditos al lado. */}
              <div className="group relative bg-[#0b0b0b] border border-white/10 rounded-3xl p-8 hover:border-purple-500/50 transition-all duration-300 md:col-span-5">
                <div className="flex justify-between items-start mb-10">
                  <div className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl group-hover:bg-purple-500 group-hover:text-black transition-all duration-300">
                    <svg
                      className="w-6 h-6"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5" />
                      <circle cx="16" cy="12" r="1" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-white/30 uppercase tracking-widest border border-white/10 px-3 py-1 rounded-full">
                    {t.cifras.tarjetas[2].etiqueta}
                  </span>
                </div>
                <div>
                  <h3 className="text-4xl font-black text-white mb-2">{t.cifras.tarjetas[2].valor}</h3>
                  <h4 className="text-xl font-bold mb-3">{t.cifras.tarjetas[2].subtitulo}</h4>
                  <p className="text-gray-400 text-sm md:text-base leading-relaxed mb-6">{t.cifras.tarjetas[2].texto}</p>
                  {t.cifras.tarjetas[2].imagen ? (
                    <img
                      src={t.cifras.tarjetas[2].imagen}
                      alt={t.cifras.tarjetas[2].alt}
                      loading="lazy"
                      className="w-full h-[260px] object-cover object-top rounded-2xl border border-white/10"
                    />
                  ) : null}
                </div>
                <div className="absolute bottom-0 right-0 w-28 h-28 bg-purple-500/10 blur-[50px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>

              {/* La línea grande, con el enlace. */}
              <div className="md:col-span-7 rounded-3xl p-8 flex flex-col justify-between group cursor-pointer overflow-hidden relative bg-gradient-to-br from-purple-500 to-purple-700">
                <div className="relative z-10">
                  <h3 className="text-3xl font-black text-black leading-tight mb-4">{t.cifras.linea1}</h3>
                  <p className="text-black/70 text-sm">{t.cifras.linea2}</p>
                </div>
                <div className="relative z-10 mt-6">
                  <a href="#como-funciona">
                    <button className="bg-black text-white px-8 py-4 rounded-full font-bold text-sm hover:scale-105 transition-transform flex items-center gap-3">
                      {t.cifras.enlace}
                    </button>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================== 8 · BLOQUE NUMERADO (LA INVESTIGACIÓN) ================== */}
        <div id="investigacion" className="px-6 md:px-10 py-32 bg-black selection:bg-purple-500/30 font-sans">
          <div className="max-w-7xl mx-auto rounded-[48px] bg-[#050505] border border-white/5 p-8 md:p-20 flex flex-col lg:flex-row items-center justify-between gap-16 relative overflow-hidden shadow-[0_0_80px_-20px_rgba(168,85,247,0.15)]">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute w-[600px] h-[600px] bg-purple-600/10 blur-[140px] -top-40 -left-40 rounded-full"></div>
              <div className="absolute w-[500px] h-[500px] bg-purple-900/10 blur-[120px] -bottom-40 -right-40 rounded-full"></div>
              <div className="absolute inset-0 opacity-[0.03] [background-image:linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] [background-size:40px_40px]"></div>
            </div>

            <div className="relative z-10 max-w-2xl">
              <div className="flex items-center gap-3 mb-8">
                <span className="text-purple-500 font-mono text-lg font-bold">{t.investigacion.numero}</span>
                <div className="px-4 py-1.5 rounded-full bg-purple-500/5 border border-purple-500/20 flex items-center gap-2">
                  <svg
                    className="text-purple-400"
                    width={16}
                    height={16}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M12 2l1.9 5.6L19.5 9l-5.6 1.9L12 16.5l-1.9-5.6L4.5 9l5.6-1.4z" />
                  </svg>
                  <span className="text-purple-300 text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase">
                    {t.investigacion.etiqueta}
                  </span>
                </div>
              </div>
              <h2 className="text-5xl md:text-7xl font-bold text-white leading-[1.05] mb-8 tracking-tight">
                {t.investigacion.titulo.uno}
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-purple-400 to-purple-800">
                  {t.investigacion.titulo.dos}
                </span>
              </h2>
              <div className="grid grid-cols-2 gap-6 mb-8 text-[10px] tracking-[0.3em] text-gray-500 uppercase">
                <span>{t.investigacion.subtitulo[0]}</span>
                <span>{t.investigacion.subtitulo[1]}</span>
              </div>
              <div className="space-y-6 mb-12">
                <p className="text-gray-400 text-base md:text-lg leading-relaxed font-light">{t.investigacion.texto}</p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <a href={PANEL}>
                  <button className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-gradient-to-r from-purple-500 to-purple-700 text-white font-bold flex items-center justify-center gap-3 transition-all group">
                    {t.investigacion.enlace}
                    <Flecha />
                  </button>
                </a>
              </div>
            </div>

            <div className="relative z-10 lg:w-1/2 flex justify-center items-center">
              <div className="relative w-full max-w-[450px] aspect-square flex items-center justify-center">
                <div className="absolute w-64 h-64 bg-purple-600/20 blur-[100px] animate-pulse"></div>
                <div className="absolute inset-0 border border-dashed border-purple-500/20 rounded-full"></div>
                <div className="absolute inset-12 border border-purple-500/10 rounded-full shadow-[inset_0_0_20px_rgba(168,85,247,0.1)]"></div>
                <img
                  src={IMAGENES.mercado}
                  alt={t.investigacion.alt}
                  loading="lazy"
                  className="relative w-[280px] md:w-[360px] rounded-2xl border border-purple-400/20 shadow-[0_30px_80px_rgba(168,85,247,0.25)]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ========================= 9 · CONTACTO ========================= */}
        <section id="contacto" className="relative bg-[#000] text-white py-16 md:py-24 lg:py-32 px-4 sm:px-6 overflow-hidden">
          <div className="absolute inset-0 opacity-[0.15] md:opacity-[0.2]"></div>
          <div className="absolute -top-[10%] -left-[10%] w-[70%] md:w-[50%] h-[50%] bg-purple-600/10 blur-[100px] md:blur-[140px] rounded-full"></div>
          <div className="absolute -bottom-[10%] -right-[10%] w-[60%] md:w-[40%] h-[40%] bg-fuchsia-600/10 blur-[80px] md:blur-[120px] rounded-full"></div>

          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-24 items-center relative z-10">
            <div className="space-y-8 md:space-y-10 text-center lg:text-left">
              <div>
                <h2 className="text-4xl sm:text-2xl lg:text-5xl font-extrabold tracking-tight leading-[1.1] mb-6 md:mb-8">
                  {t.contacto.titulo.uno}{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-purple-300 to-purple-600">
                    {t.contacto.titulo.dos}
                  </span>
                </h2>
                <p className="text-slate-400 text-base md:text-lg leading-relaxed max-w-lg mx-auto lg:mx-0 font-light">
                  {t.contacto.bajada}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row flex-wrap justify-center lg:justify-start gap-6 md:gap-8">
                <a href={`mailto:${correo}`} className="flex items-center gap-4 group justify-center lg:justify-start">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-purple-500/50 transition-colors">
                    <svg
                      className="text-slate-400 group-hover:text-white transition-colors"
                      width={18}
                      height={18}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="m2 7 10 6 10-6" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">{t.contacto.correo.etiqueta}</p>
                    <p className="text-sm font-medium text-slate-200">{t.contacto.correo.valor}</p>
                  </div>
                </a>
              </div>
            </div>

            <div className="relative w-full max-w-xl mx-auto lg:max-w-none">
              <div className="absolute inset-0 bg-purple-500/5 blur-3xl -z-10"></div>
              <form
                action="https://formsubmit.co/info@sinkroo.com"
                method="POST"
                className="bg-[#0D0D0D] border border-white/[0.08] p-6 sm:p-8 md:p-10 rounded-[1.5rem] md:rounded-[2rem] space-y-5 md:space-y-6 shadow-2xl backdrop-blur-sm"
              >
                <input type="hidden" name="_captcha" value="false" />
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="nombre" className="text-[10px] text-slate-400 uppercase ml-1">
                      {t.contacto.formulario.nombre}
                    </label>
                    <input
                      id="nombre"
                      type="text"
                      name="name"
                      required
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-purple-500/50 focus:bg-white/[0.05] outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="correo" className="text-[10px] text-slate-400 uppercase ml-1">
                      {t.contacto.formulario.correo}
                    </label>
                    <input
                      id="correo"
                      type="email"
                      name="email"
                      required
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-purple-500/50 focus:bg-white/[0.05] outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="negocio" className="text-[10px] text-slate-400 uppercase ml-1">
                    {t.contacto.formulario.negocio}
                  </label>
                  <input
                    id="negocio"
                    type="url"
                    name="business"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-purple-500/50 focus:bg-white/[0.05] outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="mensaje" className="text-[10px] text-slate-400 uppercase ml-1">
                    {t.contacto.formulario.mensaje}
                  </label>
                  <textarea
                    id="mensaje"
                    name="message"
                    rows={5}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-purple-500/50 focus:bg-white/[0.05] outline-none transition-all resize-none"
                  ></textarea>
                </div>
                <button
                  type="submit"
                  className="w-full py-4 bg-purple-700 hover:bg-purple-600 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 group shadow-lg shadow-purple-500/20 active:scale-[0.98]"
                >
                  {t.contacto.formulario.boton}
                  <Flecha ancho={20} />
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>

      {/* ========================= 10 · PIE ========================= */}
      <div className="bg-black pt-24">
        <footer className="relative bg-gradient-to-br from-white via-[#fafafa] to-[#f5f3ff] pt-20 pb-10 rounded-t-[60px] md:rounded-t-[100px] border-t border-purple-200">
          <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-start">
              <div className="lg:col-span-3">
                <div className="flex items-center gap-3 mb-6">
                  <img src={IMAGENES.buho} className="w-16 h-16 object-contain" alt={t.cabecera.altBuho} />
                  <h2 className="text-2xl font-black tracking-tight bg-gradient-to-r from-purple-500 to-purple-700 bg-clip-text text-transparent">
                    {t.pie.marca}
                  </h2>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed max-w-[260px]">{t.pie.frase}</p>
              </div>

              <div className="lg:col-span-4 flex justify-center">
                <div className="text-center">
                  <h4 className="text-black font-semibold mb-6">{t.pie.enlacesTitulo}</h4>
                  <ul className="space-y-4 text-gray-600 text-sm flex flex-col items-center">
                    {t.pie.enlaces.map((enlace) => (
                      <li key={enlace.texto}>
                        <a href={enlace.href} className="hover:text-purple-500 transition">
                          {enlace.texto}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="lg:col-span-5">
                <p className="text-gray-600 text-sm mb-6 max-w-md">
                  {t.pie.escribir}{' '}
                  <a href={`mailto:${correo}`} className="text-black font-semibold hover:text-purple-500 transition">
                    {correo}
                  </a>
                </p>
                <div className="flex flex-col gap-6">
                  <div className="flex gap-4">
                    <a href={`mailto:${correo}`} aria-label="Correo">
                      <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white hover:scale-110 transition shadow-md">
                        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="m22 2-7 20-4-9-9-4z" />
                          <path d="M22 2 11 13" />
                        </svg>
                      </div>
                    </a>
                    <a href="https://www.facebook.com/profile.php?id=61587663698703" aria-label="Facebook">
                      <div className="w-10 h-10 rounded-full border border-purple-200 flex items-center justify-center text-gray-700 hover:bg-purple-50 transition">
                        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                        </svg>
                      </div>
                    </a>
                  </div>
                  <div className="flex gap-4">
                    <a href="https://www.instagram.com/sinkroo.oficial" aria-label="Instagram">
                      <div className="w-10 h-10 rounded-full border border-purple-200 flex items-center justify-center text-gray-700 hover:bg-purple-50 transition">
                        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <rect x="2" y="2" width="20" height="20" rx="5" />
                          <circle cx="12" cy="12" r="4" />
                          <path d="M17.5 6.5h.01" />
                        </svg>
                      </div>
                    </a>
                    <a href="https://www.linkedin.com/company/sinkroo/" aria-label="LinkedIn">
                      <div className="w-10 h-10 rounded-full border border-purple-200 flex items-center justify-center text-gray-700 hover:bg-purple-50 transition">
                        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
                          <rect x="2" y="9" width="4" height="12" />
                          <circle cx="4" cy="4" r="2" />
                        </svg>
                      </div>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-20 pt-8 border-t border-purple-200 flex flex-col md:flex-row justify-center items-center gap-4">
              <p className="text-gray-500 text-xs text-center">
                {t.pie.derechos}
                <br />
                {t.pie.direccion.map((linea) => (
                  <span key={linea}>
                    {linea}
                    <br />
                  </span>
                ))}
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

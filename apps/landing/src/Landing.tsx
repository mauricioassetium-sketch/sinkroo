/* =============================================================================================
   LA LANDING DE SINKROO — la puerta de entrada.
   Es EL MISMO ARMAZÓN de la landing anterior (las mismas clases y su mismo CSS: `viejo.css`), con
   la información de hoy adentro.

   LOS DIEZ BLOQUES, EN ORDEN:
     1. Cabecera · 2. Portada (con el título que se cambia solo) · 3. Franja que se mueve ·
     4. Qué hacemos · 5. Cómo lo hacemos (el flujo animado + las siete etapas) ·
     6. Con qué trabaja (cinco herramientas) · 7. Con quién se conecta (las 14) · 8. Planes ·
     9. Contacto · 10. Pie

   REGLAS QUE LA MANDAN:
     · EL TEXTO ES DEL DUEÑO, LITERAL. Vive en `contenido.ts` (español e inglés) y no se reescribe
       aquí: este archivo sólo lo pone en su bloque.
     · NADA SE REPITE. Cada bloque dice algo nuevo y cada bloque con imagen muestra una pantalla
       DISTINTA del panel (ninguna captura se usa dos veces).
     · NADA PROMETE LO QUE EL SISTEMA NO HACE. El panel todavía no publica en las redes: las piezas
       quedan listas y usted aprueba. El bloque 7 lo dice con todas las letras.
     · NADA SE ESCONDE POR JAVASCRIPT: no hay animación de entrada ni estado invisible que alguien
       tenga que destapar. Lo que se mueve (el título de la portada, la franja, la marquesina de
       redes y el flujo) va en CSS y se detiene solo para quien pidió menos movimiento en su
       sistema (`prefers-reduced-motion`). El título que se cambia solo NO usa relojes de
       JavaScript: son las cuatro frases en el HTML y una animación de CSS.
     · SIN IMÁGENES REMOTAS: todo sale de public/.
   ============================================================================================= */

import { useEffect, useState } from 'react';

import './viejo.css';
import './landing-extra.css';
import { CONTENIDO, IDIOMA_INICIAL, PANEL, IMAGENES } from './contenido';
import type { Idioma } from './contenido';
import { FlujoAnimado } from './FlujoAnimado';
import { MarquesinaRedes } from './MarquesinaRedes';

/* Las 31 líneas verticales del fondo de la portada: son adorno, con la misma clase de la vieja.
   La posición es fija (no al azar) para que la página se pinte igual siempre. Va con UN decimal a
   propósito: así ninguna posición cae en un número que se pueda leer como una cifra del negocio
   (la revisión de frases prohibidas mira también el HTML). */
const LINEAS = Array.from({ length: 31 }, (_, i) => ({
  left: `${((i * 100) / 31).toFixed(1)}%`,
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

/** El selector ES | EN: dos letras, ninguna bandera de afuera. Va en la cabecera y en el celular. */
function SelectorIdioma({
  idioma,
  cambiar,
  etiqueta,
  textoEs,
  textoEn,
}: {
  idioma: Idioma;
  cambiar: (idioma: Idioma) => void;
  etiqueta: string;
  textoEs: string;
  textoEn: string;
}) {
  return (
    <div className="selector-idioma" role="group" aria-label={etiqueta}>
      <button
        type="button"
        className={idioma === 'es' ? 'idioma-activo' : 'idioma-inactivo'}
        aria-pressed={idioma === 'es'}
        onClick={() => cambiar('es')}
      >
        {textoEs}
      </button>
      <button
        type="button"
        className={idioma === 'en' ? 'idioma-activo' : 'idioma-inactivo'}
        aria-pressed={idioma === 'en'}
        onClick={() => cambiar('en')}
      >
        {textoEn}
      </button>
    </div>
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
        <nav className="w-full max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-2 active">
            <img src={IMAGENES.buho} className="w-10 h-10 md:w-12 md:h-12" alt={t.cabecera.altBuho} />
            <h2 className="text-xl md:text-2xl font-black bg-gradient-to-r from-purple-500 to-purple-700 bg-clip-text text-transparent">
              {t.cabecera.marca}
            </h2>
          </a>

          <div className="hidden lg:flex gap-6 xl:gap-8">
            {t.cabecera.enlaces.map((enlace) => (
              <a
                href={enlace.href}
                className="text-gray-400 hover:text-white transition text-sm xl:text-base whitespace-nowrap"
                key={enlace.href}
              >
                {enlace.texto}
              </a>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-4">
            <SelectorIdioma
              idioma={idioma}
              cambiar={setIdioma}
              etiqueta={t.cabecera.idioma.etiqueta}
              textoEs={t.cabecera.idioma.es}
              textoEn={t.cabecera.idioma.en}
            />
            <a
              href={PANEL}
              className="px-5 py-2 bg-white text-black rounded-full font-semibold hover:bg-gray-200 transition whitespace-nowrap"
            >
              {t.cabecera.entrar}
            </a>
          </div>

          <button
            type="button"
            className="lg:hidden text-white text-2xl"
            aria-label={t.cabecera.abrirMenu}
            aria-expanded={menuAbierto}
            onClick={() => setMenuAbierto((abierto) => !abierto)}
          >
            ☰
          </button>
        </nav>
      </header>

      {/* El menú del celular y de la tableta: la misma lista, debajo de la cabecera. */}
      {menuAbierto ? (
        <div className="menu-movil">
          {t.cabecera.enlaces.map((enlace) => (
            <a href={enlace.href} onClick={() => setMenuAbierto(false)} key={enlace.href}>
              {enlace.texto}
            </a>
          ))}
          <a href={PANEL} onClick={() => setMenuAbierto(false)}>
            {t.cabecera.entrar}
          </a>
          <SelectorIdioma
            idioma={idioma}
            cambiar={setIdioma}
            etiqueta={t.cabecera.idioma.etiqueta}
            textoEs={t.cabecera.idioma.es}
            textoEn={t.cabecera.idioma.en}
          />
        </div>
      ) : null}

      <main className="flex-grow relative z-0">
        {/* ============ 2 · PORTADA (y 3 · la franja que se mueve, abajo) ============ */}
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

                {/* EL TÍTULO QUE SE CAMBIA SOLO — cuatro frases, las cuatro en el HTML, en CSS:
                    con `prefers-reduced-motion: reduce` se ve la primera y nada se mueve. */}
                <h1 className="titulo-cambia text-[12vw] md:text-[3.5rem] leading-[0.85] tracking-tighter font-black uppercase">
                  {t.portada.titulos.map((frase, i) => (
                    <span className="titulo-cambia-frase" style={{ animationDelay: `${i * 3.5}s` }} key={frase}>
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/40">
                        {frase}
                      </span>
                    </span>
                  ))}
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
                <a href="#conexiones">
                  <button className="boton-fantasma flex items-center justify-between gap-4 px-8 py-4 rounded-xl text-sm font-bold transition-colors duration-300 group w-full md:w-auto min-w-[200px] border-2">
                    <span className="tracking-tighter uppercase">{t.portada.accesos.conexiones}</span>
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

            {/* La columna derecha de la portada: el índice de la página (los mismos nombres del
                menú). No repite ninguna promesa: sólo dice qué hay más abajo. */}
            <div className="md:col-span-5 flex items-center justify-end">
              <div className="relative">
                <div className="absolute -left-8 top-0 bottom-0 w-[1px] bg-gradient-to-b from-purple-400 to-transparent hidden md:block"></div>
                <p className="text-[10px] font-bold tracking-[0.3em] text-purple-300 uppercase mb-6">
                  {t.portada.indiceTitulo}
                </p>
                <ul className="space-y-4">
                  {t.portada.indice.map((enlace) => (
                    <li key={enlace.href}>
                      <a
                        href={enlace.href}
                        className="group flex items-center gap-3 text-white/50 hover:text-white text-sm md:text-base font-light transition-colors"
                      >
                        <span>{enlace.texto}</span>
                        <span className="text-purple-400 transition-transform group-hover:translate-x-1">→</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* 3 · LA FRANJA QUE SE MUEVE: las seis palabras del trabajo del motor. */}
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
            </section>
          </div>
        </div>

        {/* ========================= 4 · QUÉ HACEMOS ========================= */}
        <section id="que-hacemos" className="relative bg-black text-white py-28 px-6 overflow-hidden">
          <div className="absolute top-0 right-0 w-1/3 h-full bg-purple-600/10 blur-[140px] -z-10"></div>
          <div className="max-w-7xl mx-auto">
            <div className="mb-14 md:mb-20">
              <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">{t.queHacemos.titulo}</h2>
              <p className="text-gray-400 mt-6 max-w-3xl leading-relaxed">{t.queHacemos.parrafo}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {t.queHacemos.tarjetas.map((tarjeta) => (
                <div
                  className="group relative bg-[#0b0b0b] border border-white/10 rounded-3xl p-8 hover:border-purple-500/50 transition-all duration-300"
                  key={tarjeta.numero}
                >
                  <p className="text-purple-500 text-[10px] font-black tracking-widest mb-5 opacity-70">{tarjeta.numero}</p>
                  <h3 className="text-2xl font-bold mb-4 group-hover:text-purple-400 transition-colors">{tarjeta.titulo}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed mb-6">{tarjeta.texto}</p>
                  <img
                    src={tarjeta.imagen}
                    alt={tarjeta.alt}
                    loading="lazy"
                    className="w-full h-[240px] md:h-[300px] object-cover object-top rounded-xl border border-white/10"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========================= 5 · CÓMO LO HACEMOS ========================= */}
        <section id="como-funciona" className="relative bg-[#050505] text-white min-h-screen px-6 py-32 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none"></div>
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none">
            <img src={IMAGENES.buho} className="w-[800px]" alt="" aria-hidden="true" />
          </div>

          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 md:gap-20 items-center relative z-10">
            {/* El modelo animado del flujo: doce segundos en bucle (el búho por las siete etapas). */}
            <div className="relative w-full">
              <FlujoAnimado />
            </div>

            <div>
              <h2 className="text-4xl md:text-6xl font-bold leading-[0.95] tracking-tighter mb-10">
                {t.comoLoHacemos.titulo.uno}
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-gray-600">
                  {t.comoLoHacemos.titulo.dos}
                </span>
              </h2>

              <ol className="space-y-6 max-w-xl">
                {t.comoLoHacemos.etapas.map((etapa) => (
                  <li className="flex gap-4 items-baseline" key={etapa.numero}>
                    <span className="text-purple-400 text-2xl font-mono font-bold leading-none">{etapa.numero}</span>
                    <p className="text-gray-400 text-sm md:text-base leading-relaxed">
                      <span className="text-white font-bold tracking-wide">{etapa.titulo}</span> — {etapa.texto}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Las fotos del trabajo: son imágenes del trabajo, y el rótulo lo dice. No se afirma
              quiénes son ni que sean el equipo del negocio. */}
          <div className="max-w-7xl mx-auto mt-24 md:mt-32 relative z-10">
            <div className="grid sm:grid-cols-2 gap-6 md:gap-8">
              {t.comoLoHacemos.gente.map((foto) => (
                <img
                  src={foto.imagen}
                  alt={foto.alt}
                  loading="lazy"
                  className="w-full h-[240px] md:h-[340px] object-cover rounded-2xl border border-white/10"
                  key={foto.imagen}
                />
              ))}
            </div>
            <p className="mt-5 text-[10px] font-bold tracking-[0.3em] text-gray-500 uppercase">
              {t.comoLoHacemos.genteEtiqueta}
            </p>
          </div>
        </section>

        {/* ========================= 6 · CON QUÉ TRABAJA ========================= */}
        <div id="con-que-trabaja" className="relative bg-black text-white py-28 md:py-36 px-5 md:px-8 overflow-hidden">
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="text-center mb-20 md:mb-28">
              <h2 className="text-5xl md:text-8xl font-bold leading-[0.9] tracking-tighter">
                {t.conQueTrabaja.titulo.uno}{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-700">
                  {t.conQueTrabaja.titulo.dos}
                </span>
              </h2>
            </div>

            <div className="space-y-24 md:space-y-32">
              {t.conQueTrabaja.herramientas.map((herramienta, i) => {
                const alReves = i % 2 === 1;
                return (
                  <div
                    className={'grid lg:grid-cols-2 gap-12 md:gap-20 items-center' + (alReves ? ' lg:grid-flow-dense' : '')}
                    key={herramienta.numero}
                  >
                    <div className={alReves ? 'lg:col-start-2' : ''}>
                      <div className="text-purple-400 text-4xl md:text-6xl font-mono font-bold mb-5 tracking-wider">
                        {herramienta.numero}
                      </div>
                      <h3 className="text-2xl md:text-4xl font-bold mb-5 leading-tight">{herramienta.nombre}</h3>
                      <p className="text-gray-400 leading-relaxed max-w-md text-sm md:text-base">{herramienta.texto}</p>
                    </div>
                    <div className={alReves ? 'lg:col-start-1' : ''}>
                      <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#0b0b0b] shadow-[0_30px_80px_rgba(168,85,247,0.25)]">
                        <img
                          src={herramienta.imagen}
                          alt={herramienta.alt}
                          loading="lazy"
                          className="w-full h-[300px] md:h-[460px] object-cover object-top"
                        />
                        <div className="absolute inset-0 bg-gradient-to-tr from-black/70 via-transparent to-white/10"></div>
                        <div className="absolute inset-0 rounded-2xl border border-purple-400/20 pointer-events-none"></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ========================= 7 · CON QUIÉN SE CONECTA ========================= */}
        <section id="conexiones" className="relative bg-[#050505] text-white py-28 px-5 md:px-8 overflow-hidden">
          <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-purple-600/10 blur-[140px] rounded-full"></div>
          <div className="max-w-7xl mx-auto relative z-10">
            <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-tight mb-6">{t.conexiones.titulo}</h2>
            <p className="text-gray-400 max-w-3xl leading-relaxed mb-14 md:mb-20">{t.conexiones.bajada}</p>

            {/* Las 14 conexiones, en dos filas que se deslizan en lados opuestos. */}
            <MarquesinaRedes />

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 mt-16 md:mt-20">
              {t.conexiones.lista.map((conexion) => (
                <div
                  className="bg-[#0b0b0b] border border-white/10 rounded-2xl p-6 hover:border-purple-500/40 transition-colors"
                  key={conexion.nombre}
                >
                  <h3 className="text-white font-bold mb-2">{conexion.nombre}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{conexion.texto}</p>
                </div>
              ))}
            </div>

            <div className="mt-12 md:mt-16 rounded-2xl border border-purple-500/30 bg-purple-500/5 p-6 md:p-8">
              <p className="text-purple-200 text-sm md:text-base leading-relaxed">{t.conexiones.honestidad}</p>
            </div>
          </div>
        </section>

        {/* ========================= 8 · PLANES ========================= */}
        <div id="planes" className="px-6 md:px-10 py-28 md:py-32 bg-black selection:bg-purple-500/30 font-sans">
          <div className="max-w-7xl mx-auto rounded-[48px] bg-[#050505] border border-white/5 p-8 md:p-20 flex flex-col lg:flex-row items-center justify-between gap-16 relative overflow-hidden shadow-[0_0_80px_-20px_rgba(168,85,247,0.15)]">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute w-[600px] h-[600px] bg-purple-600/10 blur-[140px] -top-40 -left-40 rounded-full"></div>
              <div className="absolute w-[500px] h-[500px] bg-purple-900/10 blur-[120px] -bottom-40 -right-40 rounded-full"></div>
              <div className="absolute inset-0 opacity-[0.03] [background-image:linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] [background-size:40px_40px]"></div>
            </div>

            <div className="relative z-10 w-full max-w-2xl">
              <h2 className="text-4xl md:text-6xl font-bold text-white leading-[1.05] mb-10 tracking-tight">
                {t.planes.titulo}
              </h2>

              <div className="grid sm:grid-cols-3 gap-4 md:gap-5 mb-10">
                {t.planes.lista.map((plan) => (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6" key={plan.nombre}>
                    <p className="text-[10px] font-bold tracking-[0.2em] text-purple-300 uppercase mb-3">{plan.nombre}</p>
                    <p className="text-3xl md:text-4xl font-black text-white mb-2">{plan.precio}</p>
                    <p className="text-gray-400 text-sm">{plan.creditos}</p>
                  </div>
                ))}
              </div>

              <p className="text-gray-300 leading-relaxed mb-4">{t.planes.incluye}</p>
              <p className="text-gray-500 text-sm leading-relaxed mb-10">{t.planes.nota}</p>

              <a href={PANEL}>
                <button className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-gradient-to-r from-purple-500 to-purple-700 text-white font-bold flex items-center justify-center gap-3 transition-all group">
                  {t.planes.boton}
                  <Flecha />
                </button>
              </a>
            </div>

            <div className="relative z-10 lg:w-1/2 flex justify-center items-center">
              <div className="relative w-full max-w-[450px] aspect-square flex items-center justify-center">
                <div className="absolute w-64 h-64 bg-purple-600/20 blur-[100px] animate-pulse"></div>
                <div className="absolute inset-0 border border-dashed border-purple-500/20 rounded-full"></div>
                <div className="absolute inset-12 border border-purple-500/10 rounded-full shadow-[inset_0_0_20px_rgba(168,85,247,0.1)]"></div>
                <img
                  src={IMAGENES.primerosPasos}
                  alt={t.planes.alt}
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

# 24 · El buscador profundo (Lux)

Lux tiene dos formas de salir a internet. Una es liviana y va en todas las corridas; la otra es un estudio de
verdad y se pide cuando hace falta. Las dos existen porque resuelven cosas distintas.

---

## 1. El rastreo (va en todas las corridas)

- **Qué hace:** el modelo escribe cuatro consultas a partir del negocio (rubro, categoría, zona, qué vende, a
  quién), un navegador de la flota las corre y de los resultados salen los **países** con la fuente que los
  sostiene.
- **Cuánto tarda:** ~40 segundos.
- **Qué deja:** los países, guardados en `mercados_rastreados`. **Cuentan como declarados**: el mapa los muestra
  y la lectura de anuncios los busca en la vuelta siguiente.
- **Por qué es liviano a propósito:** va dentro de la corrida de minuto y medio. Leer titulares y extractos
  alcanza para saber de dónde viene la demanda de un negocio global.

## 2. El estudio profundo (a pedido, de Lux)

- **Qué es:** [gpt-researcher](https://github.com/assafelovic/gpt-researcher) — 30.000 estrellas, licencia MIT.
  Un investigador que **arma sus propias sub-preguntas**, **lee las páginas enteras** y escribe un **informe con
  citas**.
- **Cuánto tarda:** ~30 segundos medidos (14 fuentes, 16.000 caracteres de informe, en español).
- **Qué deja:** el informe en `informes_profundos`, con sus fuentes y su pregunta. De ahí se puede citar un dato
  con su origen: por ejemplo que **los inversores indios son el 22 % de la compra extranjera en Dubái**, según el
  Departamento de Tierras de Dubái.
- **Por qué no va en todas las corridas:** es un servicio Python aparte y carga ~400 MB de memoria (el modelo de
  embeddings). La corrida de todos los días no lo necesita; el estudio que se le muestra a un cliente, sí.

## Las tres decisiones que lo hacen entrar en este servidor

1. **DuckDuckGo en vez de Tavily.** El proyecto pide Tavily por defecto, que es una API paga. Medido en este
   servidor: la librería de DuckDuckGo **pasa el muro anti-robot** (un `curl` directo recibe un 202 y no trae
   nada). Si algún día esa librería deja de pasar, el camino alterno es el navegador de la flota, que ya se usa
   para leer anuncios.
2. **DeepSeek en vez de OpenAI.** Los tres modelos (rápido, inteligente y estratégico) apuntan al mismo
   `deepseek-chat` con `OPENAI_BASE_URL`. Es la llave que el producto ya paga.
3. **Embeddings locales y en CPU.** DeepSeek no ofrece servicio de embeddings y los de OpenAI son pagos. Se usa
   `sentence-transformers/all-MiniLM-L6-v2` (384 dimensiones, ~400 MB) con `torch` en versión CPU — la de CUDA
   pesa más de 2 GB y acá no hay GPU para esto.

## Cómo se instala y cómo se llama

- **Instalar (o reinstalar) en un servidor limpio:** `bash scripts/instalar-buscador-profundo.sh`. Deja el código
  en `/opt/gpt-researcher`, arma su Python propio, configura el `.env` leyendo la llave del proyecto (permisos
  600) y termina corriendo una investigación corta de prueba para probar que quedó vivo.
- **Llamarlo a mano:**
  `/opt/gpt-researcher/.venv/bin/python apps/api/workers/buscador-profundo.py --pregunta "..." --salida /tmp/i.json`
- **Desde el motor:** `investigarProfundo()` en `services/buscador.ts`. Si el servicio no está instalado, o no
  responde, o el informe sale muy corto, **devuelve null y la corrida sigue**: el estudio profundo es un lujo,
  no un requisito.

## Lo que hay que cuidar

- **Memoria.** El servidor tiene 7 GB. El investigador carga ~400 MB y el motor de imágenes necesita los suyos:
  no conviene tenerlos trabajando al mismo tiempo. Medido en la prueba: quedaron 3,5 GB disponibles con el
  embeddings cargado.
- **Es Python dentro de un producto Node.** Por eso vive aparte, con su entorno propio y sin dependencias
  compartidas: si se rompe, el motor no se enteró.

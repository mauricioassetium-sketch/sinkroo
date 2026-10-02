#!/usr/bin/env bash
# =====================================================================================================
# EL NAVEGADOR DEL MOTOR — el Chrome que usan las lecturas que se repiten solas.
#
# POR QUÉ EXISTE
#
# El lector de la Biblioteca de Anuncios de Meta (`apps/api/workers/lector-anuncios.mjs`) no hace fetch:
# conduce un navegador de verdad por CDP, porque esa página sólo se ve navegando. Sin navegador, el
# lector falla con «fetch failed» y el motor se queda sin leer un solo anuncio —medido: 0 filas en
# `anuncios_leidos` y 0 hallazgos— aunque el negocio tenga su mercado lleno de competidores.
#
# El binario es el Chromium que ya viene con Playwright: no hay que instalar nada.
#
#   uso:  bash scripts/navegador-del-motor.sh          (levanta si no está)
#         bash scripts/navegador-del-motor.sh estado   (dice si responde)
# =====================================================================================================
set -euo pipefail

PUERTO="${CDP_PUERTO:-9222}"
PERFIL="${PERFIL_NAVEGADOR:-/var/lib/sinkroo-navegador}"
LOG=/var/log/sinkroo-navegador.log
BIN="$(find /root/.cache/ms-playwright -maxdepth 3 -name chrome -type f 2>/dev/null | head -1)"
[ -n "$BIN" ] || BIN="$(find /root/.cache/ms-playwright -maxdepth 4 -name headless_shell -type f 2>/dev/null | head -1)"

responde() { curl -s --max-time 4 "http://127.0.0.1:${PUERTO}/json/version" >/dev/null 2>&1; }

case "${1:-arrancar}" in
  estado)
    if responde; then
      echo "el navegador responde en el ${PUERTO}"
      curl -s --max-time 4 "http://127.0.0.1:${PUERTO}/json/version" | head -c 200; echo
    else
      echo "el navegador NO responde en el ${PUERTO}"
    fi
    exit 0
    ;;
esac

if responde; then
  echo "el navegador ya estaba arriba en el ${PUERTO}"
  exit 0
fi

[ -n "$BIN" ] || { echo "no encontré el Chromium de Playwright (¿se borró /root/.cache/ms-playwright?)"; exit 1; }

mkdir -p "$PERFIL"

# Sin `--no-sandbox` no arranca como root; sin el User-Agent de escritorio, Meta sirve la versión
# degenerada de la página y la lectura sale vacía aunque el navegador funcione.
setsid nohup "$BIN" \
  --headless=new --no-sandbox --disable-dev-shm-usage --disable-gpu \
  --disable-background-timer-throttling --disable-renderer-backgrounding \
  --user-agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36" \
  --remote-debugging-port="$PUERTO" --remote-allow-origins='*' \
  --user-data-dir="$PERFIL" about:blank \
  >> "$LOG" 2>&1 < /dev/null &

for _ in $(seq 1 20); do
  sleep 1
  if responde; then echo "navegador arriba en el ${PUERTO} (perfil: $PERFIL)"; exit 0; fi
done

echo "el navegador no respondió en 20 segundos: mirá $LOG"
tail -12 "$LOG" 2>/dev/null || true
exit 1

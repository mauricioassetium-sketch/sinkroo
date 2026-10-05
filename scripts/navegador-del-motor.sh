#!/usr/bin/env bash
# =====================================================================================================
# EL NAVEGADOR DEL MOTOR — la flota de Chromes que usan las lecturas que se repiten solas.
#
# POR QUÉ UNA FLOTA Y NO UNO
#
# El lector de la Biblioteca de Anuncios de Meta (`apps/api/workers/lector-anuncios.mjs`) no hace `fetch`:
# conduce un Chrome de verdad por CDP. Con UN solo navegador, dos lecturas a la vez se pisan —se quedan las dos
# en «0 fichas» y ninguna termina (medido: tres corridas seguidas lanzaron tres lecturas y se apilaron)—.
# El dueño lo pidió así: «deja abierto 10 navegadores diferentes para que cada uno, si lo necesita, use su
# propio navegador».
#
# CÓMO FUNCIONA
#
#   · Hay 10 PUESTOS (puertos 9222 a 9231), cada uno con su perfil y su archivo de cerrojo en /run.
#   · Un lector toma el primer puesto libre, lo ocupa y lo libera al terminar.
#   · El Chrome de cada puesto ARRANCA CUANDO SE PIDE: esta máquina tiene 8 GB y diez Chromes vivos son ~3 GB.
#     Con `calentar 4` quedan cuatro listos; el resto arranca si hace falta.
#
#   uso:  bash scripts/navegador-del-motor.sh                 (levanta el primero)
#         bash scripts/navegador-del-motor.sh estado          (qué puestos están arriba y cuáles ocupados)
#         bash scripts/navegador-del-motor.sh calentar <n>    (deja n puestos listos)
#         bash scripts/navegador-del-motor.sh arrancar <n>    (levanta el puesto n si no está)
# =====================================================================================================
set -euo pipefail

PUESTO_BASE="${CDP_PUERTO_BASE:-9222}"
PUESTOS="${NAVEGADORES:-10}"
PERFIL_BASE="${PERFIL_NAVEGADOR:-/var/lib/sinkroo-navegador}"
# Los cerrojos de los puestos: en /var/lib y no en /run, porque /run es memoria y se borra al reiniciar
# (con la carpeta vacía, cada lector cree que los diez puestos están libres y se apilan).
CERROJOS=/var/lib/sinkroo/puestos
LOG=/var/log/sinkroo-navegador.log
BIN="$(find /root/.cache/ms-playwright -maxdepth 3 -name chrome -type f 2>/dev/null | head -1)"
[ -n "$BIN" ] || BIN="$(find /root/.cache/ms-playwright -maxdepth 4 -name headless_shell -type f 2>/dev/null | head -1)"

puerto_de() { echo $((PUESTO_BASE + $1 - 1)); }
responde() { curl -s --max-time 3 "http://127.0.0.1:$(puerto_de "$1")/json/version" >/dev/null 2>&1; }

arrancar() {
  local n="$1"
  if responde "$n"; then echo "puesto $n: ya estaba arriba (puerto $(puerto_de "$n"))"; return 0; fi
  [ -n "$BIN" ] || { echo "no encontré el Chromium de Playwright"; return 1; }
  mkdir -p "${PERFIL_BASE}-${n}" "$CERROJOS"
  # Sin `--no-sandbox` no arranca como root; sin el User-Agent de escritorio, Meta sirve la versión degenerada
  # de la página y la lectura sale vacía aunque el navegador funcione.
  setsid nohup "$BIN" \
    --headless=new --no-sandbox --disable-dev-shm-usage --disable-gpu \
    --disable-background-timer-throttling --disable-renderer-backgrounding \
    --user-agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36" \
    --remote-debugging-port="$(puerto_de "$n")" --remote-allow-origins='*' \
    --user-data-dir="${PERFIL_BASE}-${n}" about:blank \
    >> "$LOG" 2>&1 < /dev/null &
  for _ in $(seq 1 20); do
    sleep 1
    responde "$n" && { echo "puesto $n: arriba (puerto $(puerto_de "$n"))"; return 0; }
  done
  echo "puesto $n: no respondió en 20 segundos (mirá $LOG)"; return 1
}

case "${1:-arrancar}" in
  estado)
    arriba=0
    for n in $(seq 1 "$PUESTOS"); do
      if responde "$n"; then
        ocupado="libre"
        [ -f "$CERROJOS/$n.pid" ] && ocupado="OCUPADO por $(cat "$CERROJOS/$n.pid" 2>/dev/null || echo '?')"
        echo "puesto $n (puerto $(puerto_de "$n")): arriba · $ocupado"
        arriba=$((arriba + 1))
      fi
    done
    echo "total: $arriba de $PUESTOS puestos arriba"
    exit 0
    ;;
  calentar)
    for n in $(seq 1 "${2:-4}"); do arrancar "$n" || true; done
    exit 0
    ;;
  arrancar)
    if [ -n "${2:-}" ]; then arrancar "$2"; exit $?; fi
    arrancar 1
    exit $?
    ;;
  *)
    echo "uso: navegador-del-motor.sh [estado|calentar <n>|arrancar <n>]"; exit 2
    ;;
esac

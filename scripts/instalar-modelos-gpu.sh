#!/usr/bin/env bash
# =====================================================================================================
# LOS MODELOS DE IMAGEN DE LA GPU ALQUILADA — se instalan de una corrida, sin depender de ninguna llave
#
# Por qué existe: el motor pinta con un modelo PAGO (por hora de GPU, no por imagen). Los pesos no van al
# repositorio —son 24 GB—, van al disco de la máquina alquilada, y esto los deja ahí siempre igual:
# la próxima máquina arranca de algo que ya salió en vez de repetir el armado a mano.
#
# Qué instala (los dos en `models/checkpoints/`, que es lo que lee el nodo «Load Checkpoint» de ComfyUI):
#   · SDXL base 1.0       6,94 GB · openrail++    · 768×1344 · el que pinta el volumen (12 s por imagen)
#   · FLUX.1-schnell fp8 17,24 GB · Apache-2.0    · el «mejorado» (4 pasos, más fotorrealista)
#
# Los dos son de descarga LIBRE: no piden aceptar licencia ni llave. (FLUX.1-dev, SD 3.5 oficial y FLUX
# desde el repo de Black Forest están cerrados (`gated`): sin llave contestan 401 y frenan el armado.)
#
# Uso, en la máquina alquilada:
#   bash instalar-modelos-gpu.sh                 # los dos
#   bash instalar-modelos-gpu.sh sdxl            # solo SDXL (para probar rápido)
#   bash instalar-modelos-gpu.sh flux            # solo FLUX
#
# Se baja con `curl -L` (sigue la redirección de Hugging Face; sin -L vuelve 1 KB y parece que bajó) y se
# verifica el TAMAÑO de lo que llegó: una descarga cortada deja un archivo que ComfyUI rechaza al cargar.
# =====================================================================================================
set -euo pipefail

DESTINO="${DESTINO:-/workspace/ComfyUI/models/checkpoints}"
CUAL="${1:-todos}"

declare -A URL=(
  [sdxl]="https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors"
  [flux]="https://huggingface.co/Comfy-Org/flux1-schnell/resolve/main/flux1-schnell-fp8.safetensors"
)
declare -A NOMBRE=( [sdxl]="sd_xl_base_1.0.safetensors" [flux]="flux1-schnell-fp8.safetensors" )
# Tamaños esperados, medidos en la API de Hugging Face (bytes): con menos de esto, la bajada está cortada.
declare -A BYTES=( [sdxl]="6938078334" [flux]="17236328572" )

mkdir -p "$DESTINO"
cd "$DESTINO"

bajar() {
  local clave="$1" archivo="${NOMBRE[$1]}" esperado="${BYTES[$1]}"
  if [[ -f "$archivo" ]]; then
    local real; real=$(stat -c%s "$archivo")
    if [[ "$real" -ge "$esperado" ]]; then echo "ya está: $archivo ($real bytes)"; return 0; fi
    echo "incompleto ($real de $esperado bytes): se vuelve a bajar"; rm -f "$archivo"
  fi
  echo "bajando $archivo …"
  curl -L --fail --retry 3 --retry-delay 5 -o "$archivo" "${URL[$clave]}"
  local real; real=$(stat -c%s "$archivo")
  if [[ "$real" -lt "$esperado" ]]; then echo "QUEDÓ CORTO: $real < $esperado bytes"; rm -f "$archivo"; exit 1; fi
  echo "listo: $archivo ($real bytes)"
}

case "$CUAL" in
  sdxl|flux) bajar "$CUAL" ;;
  todos) bajar sdxl; bajar flux ;;
  *) echo "uso: $0 [sdxl|flux|todos]"; exit 2 ;;
esac

echo
echo "en el disco quedó:"
du -h "$DESTINO"/*.safetensors 2>/dev/null || true
echo
echo "para que el motor los use, en el servidor propio:"
echo "  IMAGENES_API_URL=http://127.0.0.1:<puerto del túnel>   # la API de ComfyUI de esta máquina"
echo "  IMAGENES_MODELO=flux1-schnell-fp8.safetensors          # o sd_xl_base_1.0.safetensors"
echo "y los pasos y el cfg los pone el motor según la familia (FLUX: 4 pasos, cfg 1 · SDXL: 30, cfg 5,5)."

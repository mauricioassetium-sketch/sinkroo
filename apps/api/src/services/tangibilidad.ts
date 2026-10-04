// =====================================================================================================
// LA TANGIBILIDAD DEL GUION (manual de estándares, capa 1).
//
// Una línea sirve si se puede FILMAR: alguien haciendo algo, o un lugar/cosa del mundo real. No sirve si habla
// de una idea sin nombrar nada que exista. Medido: el guion decía «su historia verificable queda custodiada
// con un score de confianza» y el motor de imagen terminaba pintando una mesa con frascos — no había nada que
// filmar.
//
// Esto lo usan DOS lugares, y por eso vive acá y no dentro de uno: el escritor, para pedir que se reescriban
// las líneas que no se filman, y el protocolo de validación en seco, para certificarlo antes de gastar GPU.
// =====================================================================================================

/**
 * Lo que hace filmable una línea: una acción en curso.
 *
 * La lista se amplió con las acciones que usa el guion de SERVICIO —el que no habla de máquinas—: medido, una
 * línea como «Un hombre sostiene un pasaporte junto a una ventana con vistas a una ciudad» salía «infilmable»
 * aunque se filma en un plano, y el motor pedía reescribirla sin motivo (una llamada al modelo y una ronda
 * perdidas por línea). Un verbo de acción es un verbo de acción en cualquier rubro.
 */
const ACCIONES = /\b(mide|medir|revisa|revisar|verifica|verificar|comprueba|confirma|audita|camina|recorre|carga|descarga|sube|baja|ajusta|opera|controla|inspecciona|vigila|detecta|escanea|toma|coloca|entrega|firma|mira|señala|trabaja|guarda|viaja|sigue|cuenta|pesa|riega|siembra|extrae|perfora|suelda|monta|instala|repara|pilota|sobrevuela|pasa|pasa sobre|sobrevuela|marca|registra|captura|abre|cierra|llena|vacía|transporta|mueve|levanta|sostiene|sostener|lleva|llevar|muestra|mostrar|presenta|presentar|recibe|recibir|saluda|saludar|conversa|conversar|habla|hablar|escribe|escribir|lee|leer|entra|entrar|sale|salir|espera|esperar|observa|observar|contempla|sonríe|sonreír|conduce|conducir|maneja|sirve|servir|atiende|atender|prepara|preparar|organiza|organizar|selecciona|empaca|empacar|descansa|almuerza|cena|brinda|celebra|baila|corre|nada|entrena|juega|aparca|espera)\b/i;
/** Lo que también la hace filmable: un lugar o una cosa del mundo real. */
const COSAS = /\b(torre|muelle|puerto|mina|cantera|campo|cultivo|bodega|planta|obra|andamio|contenedor|camión|excavadora|grúa|antena|satélite|sensor|dron|radar|boya|tubería|válvula|panel|lingote|oro|litio|agua|bosque|ganado|pozo|báscula|cámara|escáner|tableta|teodolito|instrumento|casco|chaleco|almacén|oficina|laboratorio|sala de control|estación|riel|barco|avión|helicóptero|turbina|molino|silo|depósito|plataforma|mina|registro|sellado|sello|cadena de custodia|carretera|vía|carga|contenedores|terraplén|zanja|pozo|pasaporte|documento|papel|contrato|carpeta|maletín|maleta|llave|tarjeta|reloj|teléfono|celular|computador|computadora|laptop|pantalla|mesa|silla|sala|salón|hotel|lobby|recepción|mostrador|ventana|puerta|ascensor|terraza|balcón|piscina|playa|mar|montaña|ciudad|barrio|casa|apartamento|edificio|rascacielos|calle|auto|coche|yate|velero|bote|equipaje|traje|vestido|joya|anillo|libro|revista|cuadro|copa|plato|café|comida|flor|jardín|parque)\b/i;
/** Las palabras de idea: sin una acción ni una cosa al lado, la línea no se puede filmar. */
const IDEAS = /\b(soberanía|trazabilidad|eficiencia|transparencia|confianza|innovación|tecnología|digital|tokeniz\w+|activo\w*|datos|información|seguridad|calidad|sostenibilidad|escalabilidad|interoperabilidad|estrategia|solución|plataforma|ecosistema|sinergia|optimización|competitividad|valor|futuro|grado|evidencia|historia)\b/gi;

/** El llamado a la acción no es una escena: no se le pide que se pueda filmar. */
export function esElBoton(linea: string): boolean {
  return /^(escriba|escríbanos|escribanos|hable|llame|pida|solicite|contacte|agende|visite|entre|reserve|descargue|conozca|empiece|comience)\b/i.test(String(linea || '').trim());
}

/** Parte el guion en líneas de verdad (por salto y por punto), sin la basura de espacios. */
export function lineasDelGuion(guion: string): string[] {
  const t = String(guion || '');
  // Una «línea» es una línea: se corta por salto, no por punto. Cortar por punto partía el gancho en dos
  // («Usted tokenizó el activo.» / «¿Quién mide que todavía existe?») y la primera mitad salía infilmable
  // mientras el escritor —que evalúa la línea entera— la daba por buena: dos criterios para lo mismo.
  const crudo = t.includes('\n') ? t.split(/\n+/) : t.split(/(?<=[.?!])\s+/);
  return crudo.map(l => l.replace(/\s+/g, ' ').trim()).filter(l => l.length > 8);
}

/** ¿Esta línea se puede filmar? */
export function sePuedeFilmar(linea: string): boolean {
  const l = String(linea || '');
  const acciones = (l.match(ACCIONES) || []).length;
  const cosas = (l.match(COSAS) || []).length;
  return acciones + cosas > 0;
}

/** Las líneas que NO se pueden filmar, con la cuenta de ideas que traen (para poder explicarlo). */
export function lineasInfilmables(guion: string): { linea: string; ideas: number }[] {
  const salida: { linea: string; ideas: number }[] = [];
  for (const l of lineasDelGuion(guion)) {
    if (esElBoton(l)) continue;
    if (sePuedeFilmar(l)) continue;
    salida.push({ linea: l, ideas: (l.match(IDEAS) || []).length });
  }
  return salida;
}

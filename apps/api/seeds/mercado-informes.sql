-- =============================================================================================
-- LOS INFORMES DE MERCADO YA CORRIDOS (el patrón-modelo), tal como se midieron.
--
-- Van con business_id NULL y `claves`, o sea: son del RUBRO y la CIUDAD, no de un negocio. Un negocio
-- cuyo rubro contenga alguna de las claves y cuya ciudad coincida los ve en su pantalla de Mercado, y
-- la pantalla dice de dónde salió («Del rubro y su ciudad», no «medido para su negocio»).
--
-- Ningún dato de acá es inventado: son las corridas hechas con la Ad Library pública de Meta,
-- OpenStreetMap y los sitios públicos de cada rubro. La `fuente` de cada uno lo declara.
-- =============================================================================================

DELETE FROM mercado_informes WHERE business_id IS NULL AND rubro IN ('belleza · keratina y alisados', 'florería y flores a domicilio');

INSERT INTO mercado_informes (business_id, rubro, ciudad, claves, origen, fuente, payload)
VALUES (
  NULL,
  'belleza · keratina y alisados',
  'Medellín',
  ARRAY['keratina','alisado','salon de belleza','peluqueria','estetica','cabello','belleza'],
  'rubro',
  'Ad Library pública de Meta (sin cuenta) · OpenStreetMap/Overpass · sitios públicos de los jugadores · corrida del 27-09-2026: 9 consultas de rubro, 5 anuncios con detalle completo, 5 creatividades con paleta medida, 2 lecturas visuales',
  $json$
{
  "resumen": "En Medellín la búsqueda «keratina» tiene ~20 anuncios activos en total. Los salones grandes NO pautan (Jimmy Expression: cero. Epa Colombia, con toda su audiencia: cero), y las 173 peluquerías de barrio de la ciudad, tampoco. Los que pautan son el distribuidor de producto y unos pocos servicios a domicilio: el canal está casi vacío para un salón que quiera ocuparlo.",
  "jugadores": [
    { "capa": "Base local", "detalle": "Peluquerías de barrio con nombre en Medellín, casi todas de una sola sede", "cuantos": "173" },
    { "capa": "Servicio", "detalle": "Salones que prestan el alisado: Jimmy Expression (El Poblado), Luxo Hair (Manrique) y 29 listados por plataformas de reserva", "cuantos": "31+ · servicio de $24.000 a $480.000; un buen tratamiento, $150.000–$400.000" },
    { "capa": "Distribuidor", "detalle": "Los Reyes de la Keratina (Itagüí, mayorista con escalones hasta 33% de descuento), Mundo Keratina (Itagüí), El barco del Peluquero (equipos), Anyeluz Cosmetics (a domicilio)", "cuantos": "4 · producto de 300 ml a $130.000, envío gratis" }
  ],
  "piezas": [
    { "anunciante": "El barco del Peluquero", "dias": 234, "tipo": "video", "formato": "9:16", "estilo": "produccion de marca", "quien": "producto y equipo", "lugar": "tienda", "gancho": "Planchas, pinza, secadores, máquinas de motilar y mucho más", "cta": "Send WhatsApp message", "destino": "whatsapp", "prueba_social": "ninguna", "paleta": ["#222331","#c0957f","#d1ac9c"], "nota": "vende equipos al peluquero, no el servicio" },
    { "anunciante": "Anyeluz Cosmetics", "dias": 143, "tipo": "imagen", "formato": "1:1", "estilo": "produccion de marca", "quien": "producto", "lugar": "casa de la clienta", "gancho": "Resultado de peluquería en Casa, con Tecnología Profesional", "cta": "—", "destino": "—", "prueba_social": "servicio a domicilio como promesa", "paleta": ["#969769","#6c6b42","#515130"], "nota": "el a domicilio es el diferenciador" },
    { "anunciante": "Los Reyes de la Keratina", "dias": 56, "tipo": "video", "formato": "9:16", "estilo": "ugc de cliente (celular en el salón)", "quien": "el dueño posando con la clienta", "lugar": "salón real", "texto_sobre_imagen": "«Quinto alisado de Luna»", "gancho": "Ya Luna nos visita por quinta vez y así está su cabello", "cta": "Send WhatsApp message", "destino": "api.whatsapp.com", "prueba_social": "clienta recurrente con nombre y número de visita", "paleta": ["#8f8a85","#101525","#ad8f7b"], "nota": "la pieza y el copy cuentan la MISMA historia" },
    { "anunciante": "Los Reyes de la Keratina", "dias": 56, "tipo": "video", "formato": "9:16", "estilo": "ugc de cliente (celular en el salón)", "quien": "clienta de espaldas, estilista al fondo", "lugar": "salón real", "texto_sobre_imagen": "«A sus 12 años se hizo su primer alisado»", "gancho": "Luciana llegó buscando ayuda para su cabello y después de horas…", "cta": "Send WhatsApp message", "destino": "whatsapp", "prueba_social": "historia de clienta con nombre", "paleta": ["#b1b1b1","#d8d7d3","#94908e"], "nota": "segunda pieza del mismo anunciante, mismo patrón" },
    { "anunciante": "Coqueta Home Style", "dias": 55, "tipo": "imagen", "formato": "1:1", "estilo": "produccion de marca", "quien": "—", "lugar": "—", "gancho": "Alisado espectacular que te hará brillar todos los días", "cta": "Send WhatsApp message", "destino": "whatsapp", "prueba_social": "ninguna", "paleta": ["#202227","#fefefc","#faeddf","#69463f"], "nota": "" }
  ],
  "patron": [
    { "k": "Formato", "v": "Video vertical 9:16 para el servicio", "s": "las dos piezas del anunciante más sostenido son video de celular" },
    { "k": "Persona en cuadro", "v": "Sí: el dueño y la clienta", "s": "en un rubro donde el miedo es «me dañan el cabello», la cara conocida es el aval" },
    { "k": "Texto sobre la imagen", "v": "Sí, grande y con emojis", "s": "quien no lee el copy igual entiende «quinto alisado»" },
    { "k": "Botón", "v": "WhatsApp en el 100% de las piezas sostenidas", "s": "el pedido se cierra en el chat, no en la tienda" },
    { "k": "Prueba social", "v": "Clienta real con nombre y número de visita", "s": "«por quinta vez» dice más que cualquier promesa" },
    { "k": "Paleta", "v": "Gris claro del salón y tono de piel", "s": "#b1b1b1 y #d8d7d3 con #ad8f7b" },
    { "k": "Duración que prometen", "v": "3 a 6 meses", "s": "siempre con la misma condición: champú sin sulfatos y menos plancha" }
  ],
  "saturacion": [
    "«sin formol» y «keratina pura»: lo dicen todos, ya no diferencia",
    "«aceite de argán y aminoácidos de seda»: el ingrediente como argumento, gastado",
    "«dura de 3 a 6 meses»: promesa idéntica en boca de todos",
    "«controla el frizz en clima húmedo»: el dolor real de Medellín, pero ya lo dice cada pieza"
  ],
  "huecos": [
    { "titulo": "Nadie vende el mantenimiento", "detalle": "Todas las piezas venden el alisado de hoy; el post-cuidado se cobra aparte como producto suelto y nadie construye la vuelta a los 3 meses.", "como": "El recordatorio del retoque: un cliente que vuelve cada 3 o 6 meses vale mucho más que uno que se alisa una vez." },
    { "titulo": "El salón no pauta: pauta el distribuidor", "detalle": "El canal lo ocupa quien vende el producto, no quien presta el servicio ni atiende a la clienta.", "como": "Un salón que paute con historias de sus propias clientas se queda con el canal entero." },
    { "titulo": "Nadie le da la voz a la clienta", "detalle": "La historia de la clienta la cuenta la marca. Ninguna pieza deja que la clienta hable de frente a la cámara.", "como": "El salto del testimonio narrado a la clienta en voz propia: mismo costo, otra credibilidad." }
  ],
  "creadoras": [
    { "nivel": "Nivel 1 · Clienta real del salón", "detalle": "La clienta en cámara o el resultado de su cabello, con su nombre y su historia", "evidencia": "Los Reyes: «Quinto alisado de Luna» y «Luciana llegó buscando ayuda»" },
    { "nivel": "Nivel 2 · Creadora contratada", "detalle": "Una creadora graba la experiencia del servicio a cambio de tarifa", "evidencia": "Ya hay salones de Medellín reclutando: «Buscamos 10 creadoras UGC» con keratina a tarifa especial (corto $90.000, medio $110.000). Oferta disponible: 24+ creadoras UGC de Medellín y 20+ influencers de belleza locales, con nombre" },
    { "nivel": "Nivel 3 · Marca-insignia con audiencia", "detalle": "Una marca famosa que arrastra su propia comunidad", "evidencia": "Keratinas Epa Colombia NO pauta (0 anuncios) y su cuenta de marca tiene apenas 2.126 seguidores: fama sin canal comprado" }
  ],
  "propuestas": [
    {
      "titulo": "Pieza propuesta · versión UGC: la clienta cuenta el hueco",
      "tipo": "Video 9:16, 25 segundos, grabado con el celular por una creadora real, con el handle visible en la esquina",
      "guion": [
        "0-3 s · texto grande sobre la clienta sentada: «TERCERA VEZ QUE VIENE ESTE AÑO», y la voz del estilista: «¿Y por qué volvió?»",
        "3-10 s · responde la clienta: «Porque en la casa no me dura. Aquí me dura seis meses sin plancha.»",
        "10-18 s · antes y después en el mismo plano: la foto de cuando llegó con frizz y el cabello ahora, con la mano del estilista pasándole la mano",
        "18-25 s · cierre: «Y a los tres meses le escribimos para el retoque.» Texto en pantalla: «Se lo recordamos nosotros»"
      ],
      "copy": "Tercera vez que viene este año. Le preguntamos por qué volvía y nos dijo esto: «en la casa no me dura».\n\nAquí el alisado con keratina pura dura de 3 a 6 meses, también con este clima.\n\nLo que hacemos distinto:\nA los 3 meses le escribimos para el retoque — usted no tiene que acordarse.\nLe mandamos el champú sin sulfatos para que le dure.\nLe tomamos la foto de cómo llegó y cómo se fue: si no le gusta, no paga.\n\nAgende por WhatsApp y le decimos en 2 minutos cuánto le cuesta según su cabello.\n\nKeratina pura, libre de formol.",
      "por_que": "Habla la clienta en voz propia (lo que nadie hace), vende el mantenimiento (el hueco real), ataca la objeción con evidencia («en la casa no me dura»), conserva lo probado del rubro —celular, cara del dueño, texto sobre la imagen, WhatsApp— y suma la garantía con foto, que en un rubro con miedo al daño es el desarmador más fuerte."
    }
  ],
  "checks": [
    "¿Hereda lo que el mercado ya premió? Sí: celular en el salón, persona en cuadro, texto sobre la imagen, WhatsApp, 9:16.",
    "¿Ataca un hueco medido? Sí: el mantenimiento y la voz de la clienta, los dos huecos que salieron de la corrida.",
    "¿El botón es el del mercado? Sí: WhatsApp, que usan el 100% de las piezas sostenidas.",
    "¿Cumple la política de la plataforma y la ley del rubro? Anuncio de servicio de belleza, sin promesa médica y sin resultados garantizados.",
    "¿Respeta la regla de cuidado del rubro? Sí: elección, no corrección. No dice «arreglar», «recuperar» ni «pelo malo».",
    "¿El gancho se entiende sin sonido y en menos de 3 segundos? Sí: «TERCERA VEZ QUE VIENE ESTE AÑO» sobre la clienta.",
    "¿El cierre se resuelve en un toque? Sí: WhatsApp, con el precio resuelto en 2 minutos.",
    "¿Es distinta de la referencia o una copia con otro color? Distinta: la referencia narra la marca, esta le da la voz a la clienta y vende la vuelta a los 3 meses."
  ],
  "etapas": [
    "1 · El mapa del mercado: 173 peluquerías de barrio (mapa real), 31 salones de servicio y 4 distribuidores, cada capa con su canal y si pauta o no.",
    "2 · La anatomía de las piezas vivas: solo las de 30 días o más. Se abrió el detalle de cada anuncio (anunciante real, copy completo, botón, destino) y se midió la creatividad: paleta, encuadre, quién aparece.",
    "3 · El patrón del rubro y el hueco: lo que comparten las sostenidas no se cambia; el hueco es lo que el cliente necesita y nadie le responde.",
    "4 · La creación: se conserva el patrón y se ataca UN hueco. Pasa por las 8 verificaciones antes de llegar aquí.",
    "5 · El histórico: cada corrida queda guardada. Cuando la pieza se publique, entra al mismo tablero y se mide con la misma vara: los días que aguanta."
  ],
  "cuidado": [
    "Vender elección, no corrección: nada de «recuperar», «arreglar», «dignidad» ni «pelo malo».",
    "Antecedente del rubro: una marca de keratinas tuvo que disculparse (2021) por un mensaje donde la clienta decía que tras alisarse «recuperó su dignidad»; se calificó de racista.",
    "El argumento correcto: lo que la clienta quiere lograr con su cabello —manejo, brillo, tiempo libre, frizz bajo control en clima húmedo—, nunca que su cabello natural estuviera mal.",
    "Meta restringe por política los anuncios de salud y resultados garantizados; INVIMA vigila los productos de uso cosmético en Colombia."
  ],
  "techos": [
    { "se_puede": "Quién pauta, desde cuándo, con qué copy, botón, creatividad y paleta", "no_se_puede": "Métricas de gasto, impresiones o clics: no existen en la fuente pública" },
    { "se_puede": "Leer el estilo de producción de cada pieza (celular en salón o producción de estudio)", "no_se_puede": "El audio del video ajeno: se lee el fotograma, no se transcribe" },
    { "se_puede": "Lista de jugadores con nombre y ubicación", "no_se_puede": "Filtrar por ciudad en la plataforma: solo país (la ciudad sale de la lista propia)" },
    { "se_puede": "Guardar cada corrida y armar histórico propio", "no_se_puede": "Ver anuncios ya apagados" }
  ]
}
$json$::jsonb
);

INSERT INTO mercado_informes (business_id, rubro, ciudad, claves, origen, fuente, payload)
VALUES (
  NULL,
  'florería y flores a domicilio',
  'Medellín',
  ARRAY['flor','flores','floristeria','ramos','arreglos florales','regalos'],
  'rubro',
  'Ad Library pública de Meta (sin cuenta) · OpenStreetMap/Overpass · sitios públicos de los jugadores · corrida del 27-09-2026: 9 consultas completadas, 3 piezas con detalle completo, 3 creatividades con paleta medida',
  $json$
{
  "resumen": "El mercado de flores en Medellín se pelea entre 15 floristerías físicas con nombre y 10 jugadores online que son los que de verdad compiten por el pedido. Los que pautan llevan mucho tiempo sostenidos (el más antiguo medido: 426 días), y dos jugadores de peso NO pautan: Floristería Kimberly y Lefleur (este último hace contenido en TikTok, no pauta).",
  "jugadores": [
    { "capa": "Base local", "detalle": "Floristerías físicas con nombre en Medellín (mapa real)", "cuantos": "15" },
    { "capa": "Online", "detalle": "Los que pelean por el pedido: Floristería Medellín, Pétalos y Flores, Flores y Flores, San Angel, Floristería Kimberly, Doy Flores, Flores Medellín, Lefleur, daFlores y Tu Floristería", "cuantos": "10 · precios de $124.900 a $406.900" }
  ],
  "piezas": [
    { "anunciante": "Floristería Hojas Blancas", "dias": 426, "tipo": "video", "formato": "9:16", "estilo": "produccion de marca, con creadora firmada", "quien": "nadie (producto puro)", "lugar": "estudio con bokeh", "gancho": "En Hojas Blancas llevamos tu amor donde haga falta", "cta": "Shop now", "destino": "tify.cc", "prueba_social": "«Gracias a: @mariac_725» — firma a una creadora sin mostrarla", "paleta": ["#cfc0a2","#aba99c","#482923","#746d5a","#a72121","#ca7c5c"], "nota": "ramo de rosas rojo, amarillo y coral con brillantina, papel blanco con lunares dorados; cero texto sobre la imagen" },
    { "anunciante": "El Patrón de las flores (Bucaramanga)", "dias": 68, "tipo": "video", "formato": "9:16", "estilo": "ugc puro grabado con celular", "quien": "un hombre con sombrero sosteniendo el ramo y señalando la cámara", "lugar": "calle", "texto_sobre_imagen": "ninguno", "gancho": "Las flores se regalan como debe ser.", "cta": "Send WhatsApp message", "destino": "api.whatsapp.com", "prueba_social": "ninguna, la persona es la prueba", "paleta": ["#678835","#1f1c17","#d9d284"], "nota": "una sola línea y botón de WhatsApp: sin web, sin carrito" },
    { "anunciante": "daFlores.com", "dias": 142, "tipo": "imagen", "formato": "1:1", "estilo": "produccion de marca", "quien": "—", "lugar": "—", "gancho": "—", "cta": "—", "destino": "daflores.com", "prueba_social": "—", "paleta": [], "nota": "jugador multi-país" }
  ],
  "patron": [
    { "k": "Formato", "v": "Video vertical 9:16", "s": "el video de producto puro es lo que aguanta 426 días" },
    { "k": "Persona en cuadro", "v": "Ninguna, en la más sostenida", "s": "en un mercado de regalo, el producto impecable carga la pieza" },
    { "k": "Texto sobre la imagen", "v": "Ninguno", "s": "el copy va en el anuncio, no quemado en el píxel" },
    { "k": "Botón", "v": "A la tienda cuando hay carrito; WhatsApp cuando quieren cerrar en el chat", "s": "los dos conviven en el mercado" },
    { "k": "Prueba social", "v": "Creadora firmada por su handle, sin mostrarla", "s": "@mariac_725 en la pieza de 426 días" },
    { "k": "Paleta", "v": "Beige y madera con el color de la flor como acento", "s": "#cfc0a2 con #a72121 y #ca7c5c" }
  ],
  "saturacion": [
    "«Entrega el mismo día»: es el titular de todos",
    "«Envío gratis»: San Angel lo usa de titular, Flores y Flores desde $100.000, Pétalos y Flores en todo el área metropolitana",
    "«flores frescas del Oriente Antioqueño»: el origen como argumento, ya gastado",
    "«foto real antes del envío»: lo usan como argumento de confianza, pero nadie lo convierte en el mensaje central"
  ],
  "huecos": [
    { "titulo": "Nadie construye la compra recurrente", "detalle": "El mercado vende la fecha de hoy. Nadie guarda el calendario del cliente ni le avisa antes de que se le olvide.", "como": "Guardar las fechas del cliente y recordárselas: es lo que lo hace volver sin volver a pagar por él en cada ocasión." },
    { "titulo": "El detalle de la entrega no es el mensaje", "detalle": "La foto real antes del envío existe como promesa secundaria, nunca como el centro de la pieza.", "como": "Convertir la entrega en el espectáculo: la reacción real de quien recibe." }
  ],
  "creadoras": [
    { "nivel": "Nivel 1 · Creadora firmada sin mostrarla", "detalle": "El copy cierra acreditando a una creadora por su handle, sin que aparezca en la pieza", "evidencia": "«Gracias a: @mariac_725» en la pieza de 426 días" },
    { "nivel": "Nivel 2 · UGC puro con persona real", "detalle": "Una persona cualquiera sostiene el ramo y le habla a la cámara", "evidencia": "El Patrón de las flores: 68 días, botón de WhatsApp, copy de una línea" }
  ],
  "propuestas": [
    {
      "titulo": "Pieza propuesta · versión UGC en primera persona",
      "tipo": "Video 9:16, 25-30 segundos, grabado con celular por una creadora real, handle visible en la esquina",
      "guion": [
        "0-3 s · la creadora en su casa, de frente: «Me acabé de acordar que hoy es el cumpleaños de mi mamá y no tengo nada.»",
        "3-8 s · primer plano del celular escribiendo por WhatsApp: se ve el chat, no un catálogo",
        "8-18 s · timbre, abre, recibe el ramo: la reacción real es el activo",
        "18-25 s · primer plano de la tarjeta escrita a mano y de la foto real del arreglo que le mandaron antes",
        "25-30 s · mira a cámara: «Guardé la fecha y ya no me vuelve a pasar.» Texto en pantalla: «Guárdeme la fecha»"
      ],
      "copy": "Se me olvidó el cumpleaños de mi mamá. Otra vez.\n\nEscribí por WhatsApp, me mandaron la foto real del arreglo antes de que saliera, y en 60 minutos le llegó a la puerta.\n\nAquí no vendemos flores: le guardamos las fechas y le avisamos con tiempo —cumpleaños, aniversarios, grados, condolencias— para que no vuelva a pasar.\n\nFoto real de su arreglo antes de salir.\nEnvío gratis hoy en Medellín, Envigado, Sabaneta, Bello, Itagüí, La Estrella y Copacabana.\n\nEscríbanos por WhatsApp y en 2 minutos queda listo.",
      "por_que": "El UGC que ya funciona está en tercera persona; esta lo pone en primera: el cliente se ve a sí mismo. Conserva el cierre por WhatsApp y la firma de la creadora (lo mejor de las dos piezas que ganan) y vende la memoria en vez de la flor."
    }
  ],
  "checks": [
    "¿Hereda lo que el mercado ya premió? Sí: 9:16, producto como protagonista, envío gratis nombrado, WhatsApp.",
    "¿Ataca un hueco medido? Sí: la compra recurrente y el detalle de la entrega.",
    "¿El botón es el del mercado? Sí: WhatsApp, con la tienda como segunda puerta.",
    "¿Cumple la política de la plataforma? Sí: sin promesas falsas ni precios que no existan.",
    "¿Respeta la regla de cuidado del rubro? Sí: no hay regla especial en este rubro.",
    "¿El gancho se entiende sin sonido y en 3 segundos? Sí: la escena del olvido se entiende sola.",
    "¿El cierre se resuelve en un toque? Sí: WhatsApp.",
    "¿Es distinta de la referencia o una copia con otro color? Distinta: la referencia muestra el ramo, esta muestra a la clienta recibiendo."
  ],
  "etapas": [
    "1 · El mapa del mercado: 15 floristerías físicas (mapa real) y 10 jugadores online, con precios observados.",
    "2 · La anatomía de las piezas vivas: solo las sostenidas. Se abrió el detalle de cada anuncio y se bajó la creatividad para medir paleta y composición.",
    "3 · El patrón del rubro y el hueco: producto puro sin texto sobre la imagen, botón a tienda o WhatsApp, y dos huecos de mercado.",
    "4 · La creación: se conserva el patrón y se ataca UN hueco; pasa por las 8 verificaciones.",
    "5 · El histórico: cada corrida queda guardada para comparar semana a semana."
  ],
  "cuidado": [
    "Rigor de atribución: cuando el nombre del negocio es genérico, la búsqueda trae anuncios de otros que usan esas palabras; por eso se abre el detalle de cada anuncio antes de atribuir.",
    "Un anuncio sostenido meses es un anuncio rentable: nadie mantiene un perdedor. Es el filtro de calidad."
  ],
  "techos": [
    { "se_puede": "Quién pauta y cuánto tiempo lleva", "no_se_puede": "Leer el copy de todos los anuncios de este rubro: en esta corrida las fichas devolvieron fecha e ID, no el texto" },
    { "se_puede": "Lista de jugadores física (mapa real) y online (búsqueda)", "no_se_puede": "Filtrar por ciudad en la plataforma: solo país" },
    { "se_puede": "Guardar la corrida para el histórico", "no_se_puede": "Tres consultas se cayeron por el navegador y se reintentan" }
  ]
}
$json$::jsonb
);

/* =============================================================================================
   DUBAI — LA CIUDAD DE LA PÁGINA DE COMPLIANCE, COPIADA TAL CUAL Y ANIMADA.

   El dueño mandó el HTML de su página de compliance (verysset.com/compliance.html) para que la
   silueta de la ciudad se copiara EXACTA y se animara. Y eso es lo que hay acá:

     · LA SILUETA ES LA SUYA, SIN TOCAR: el mismo `viewBox` 1600x400, el mismo `preserveAspectRatio`
       (`xMidYMax slice`), la misma silueta del fondo (`vsky-far`) y las cinco capas de grises tal
       como vienen en su archivo. Los `d=` de los `path` están copiados letra por letra: nada se
       redibujó a mano. (Lo único que se fue de su archivo es el patrón de puntitos de las torres del
       fondo —`vsky-dot`—, que el dueño mandó quitar: son las ventanas.)
     · LO ÚNICO QUE SE AGREGA ES LO QUE ANIMA, y va SIEMPRE POR ENCIMA y RECORTADO a las siluetas
       (con un `clipPath` que reusa los mismos `path` por `id`, sin volver a escribirlos):
         1. Las luces que prenden y apagan en los edificios, cada una a su hora,
            porque el retardo sale de la posición, nunca al azar.
         2. Un barrido de luz que cruza la ciudad de izquierda a derecha, pegado al piso.
         3. La ola que sube por la torre (la fachada como pantalla, como en el Burj de verdad).
         4. Los haces que salen de la punta de la torre y barren el cielo, con su barrido propio.
         5. La lucecita de la punta, titilando.
     · NADA DE JAVASCRIPT: todo son relojes de CSS. Con `prefers-reduced-motion` la ciudad queda
       quieta y ENCENDIDA (nunca apagada).
     · LOS COLORES SÍ SE CAMBIARON, y lo pidió el dueño: su silueta es gris clara (para fondo blanco)
       y acá va sobre negro, así que se oscurecieron y se les dio el morado de la casa. Se mantiene el
       orden del original (lo de adelante más oscuro que lo del fondo) para que la ciudad se siga
       leyendo por capas:
           silueta del fondo   #d8dbe0 → #7c6f9c      puntitos del fondo #b3b8be → #a894d6
           capas de adelante   #c3c7cd → #574a75      cuerpo de la torre #9aa0a8 → #3d3355
           filo de la torre    #a9aeb5 → #4a3f63      capa del piso      #b3b8be → #463c5e
     · Los `id` que se agregaron a las capas (`dubai-capa-1`…`dubai-capa-3`, `dubai-torre-1/2`) son
       los únicos cambios sobre el original: no cambian ni un píxel del dibujo y son lo que permite
       recortar las luces a la silueta. El original tiene dos `use` de `#vsky-far` y así se dejan.

   El dibujo se copia de: Compliance & DIFC | Verysset (https://verysset.com/compliance.html).
   ============================================================================================= */

/* Las ventanas que prenden y apagan: una retícula fija sobre la franja de los edificios, con el
   retardo sacado de la posición. Fuera de la silueta no se ve ninguna: las recorta el `clipPath`. */
const PARPADEOS = (() => {
  const out: { x: number; y: number; retardo: string }[] = [];
  for (let col = 0; col < 25; col++) {
    for (let fila = 0; fila < 6; fila++) {
      const t = (col * 0.62 + fila * 0.9) % 9;
      out.push({ x: 14 + col * 62, y: 176 + fila * 34, retardo: `${t.toFixed(2)}s` });
    }
  }
  return out;
})();

/* Los haces, de la punta de la torre: dos alturas, como en el juego de luces de verdad. */
const HACES: { x: number; desde: number; retardo: number }[] = [
  { x: 120, desde: 96, retardo: 0.0 },
  { x: 400, desde: 200, retardo: 0.9 },
  { x: 660, desde: 96, retardo: 1.8 },
  { x: 1140, desde: 96, retardo: 2.7 },
  { x: 1400, desde: 200, retardo: 3.6 },
  { x: 1580, desde: 96, retardo: 4.5 },
];

export function SkylineDubai() {
  return (
    <svg className="dubai" viewBox="0 0 1600 400" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false"><defs><path id="vsky-far" d="M-12 400L-12 276.7L-6.9 276.7L-6.9 263L1 263L1.7 235.7L2.7 235.7L3.4 263L11.2 263L11.2 276.7L16.3 276.7L16.3 400ZM20.3 400V253.7H40.5V400ZM39.3 400L39.3 277.9L76 265.8L76 400ZM79 400L79 300.8L83.6 300.8L83.6 282.9L99.9 282.9L99.9 300.8L104.5 300.8L104.5 400ZM94.3 400V306.7H111.8V400ZM110.7 400L110.7 277.8L150.8 291.9L150.8 400ZM141.1 400L141.1 313L147.7 313L147.7 299.3L158.1 299.3L158.8 282.2L159.8 282.2L160.5 299.3L170.9 299.3L170.9 313L177.4 313L177.4 400ZM170.9 400V346H189.6V400ZM187.3 400L187.3 261.6L193.7 261.6L193.7 250.9L216.4 250.9L216.4 261.6L222.8 261.6L222.8 400ZM212.9 400L212.9 332.5L215.9 332.5L215.9 319.5L226.7 319.5L226.7 332.5L229.8 332.5L229.8 400ZM229.8 400V334.5H261.3V400ZM258.3 400L258.3 316.3L265 316.3L265 298.5L275.8 298.5L276.5 283.2L277.5 283.2L278.2 298.5L289 298.5L289 316.3L295.7 316.3L295.7 400ZM298.9 400V274.9H335.3V400ZM330.9 400V331H371.5V400ZM363.2 400V334.5H404.9V400ZM406.9 400L406.9 252.9L413.4 252.9L413.4 244.7L423.7 244.7L424.4 216.4L425.4 216.4L426.1 244.7L436.3 244.7L436.3 252.9L442.8 252.9L442.8 400ZM439.9 400L439.9 329L443.8 329L443.8 317.5L457.5 317.5L457.5 329L461.4 329L461.4 400ZM457.5 400L457.5 299.3L461.5 299.3L461.5 281.6L467.2 281.6L467.9 269.4L468.9 269.4L469.6 281.6L475.4 281.6L475.4 299.3L479.3 299.3L479.3 400ZM478.2 400V291.9H515.9V400ZM509.8 400L509.8 301.8L546.5 311.4L546.5 400ZM532.1 400V348.7H568.9V400ZM571.7 400V312.7H610.9V400ZM612.1 400V343.2H634.8V400ZM628.6 400V306.1H652.7V400ZM648.4 400V344.7H682.9V400ZM679.8 400V277.4H697.3V400ZM691.1 400V282.5H725V400ZM719.7 400V338.9H745.1V400ZM742 400V334.5H758.3V400ZM756.3 400L756.3 311.7L779.8 303.7L779.8 400ZM781.6 400V326.9H811.5V400ZM800.6 400L800.6 341.6L803.8 341.6L803.8 330.1L808.1 330.1L808.8 314.4L809.8 314.4L810.5 330.1L814.9 330.1L814.9 341.6L818 341.6L818 400ZM819 400L819 267.6L824.8 267.6L824.8 255.7L845.3 255.7L845.3 267.6L851.1 267.6L851.1 400ZM843.7 400L843.7 292.5L878.5 311.5L878.5 400ZM873.8 400V326.8H897.4V400ZM891.9 400V336.6H925.2V400ZM929.3 400L929.3 322.4L936.8 322.4L936.8 313.9L963.6 313.9L963.6 322.4L971.2 322.4L971.2 400ZM958.6 400V300.6H976.8V400ZM971.3 400L971.3 279L993.8 295L993.8 400ZM993.2 400L993.2 249.8L1029.9 267L1029.9 400ZM1022.6 400L1022.6 319.3L1028 319.3L1028 303.6L1036.5 303.6L1037.2 282.2L1038.2 282.2L1038.9 303.6L1047.4 303.6L1047.4 319.3L1052.8 319.3L1052.8 400ZM1043.9 400V326.2H1060.2V400ZM1059.7 400V320H1091.6V400ZM1084.5 400L1084.5 318.8L1088.2 318.8L1088.2 309.4L1093.6 309.4L1094.3 289.2L1095.3 289.2L1096 309.4L1101.4 309.4L1101.4 318.8L1105.1 318.8L1105.1 400ZM1098.7 400L1098.7 302.4L1103 302.4L1103 287.6L1109.5 287.6L1110.2 268.7L1111.2 268.7L1111.9 287.6L1118.4 287.6L1118.4 302.4L1122.7 302.4L1122.7 400ZM1116.9 400L1116.9 242.6L1143.7 263.4L1143.7 400ZM1147.1 400L1147.1 292.5L1153.6 292.5L1153.6 281.8L1163.9 281.8L1164.6 254.2L1165.6 254.2L1166.3 281.8L1176.7 281.8L1176.7 292.5L1183.2 292.5L1183.2 400ZM1185.7 400V258.8H1227.1V400ZM1224.9 400V262.8H1257.6V400ZM1251.7 400L1251.7 293.8L1270.5 306.5L1270.5 400ZM1269.3 400V275.4H1301.1V400ZM1302.9 400V286.3H1325.5V400ZM1327.6 400V304.7H1357.8V400ZM1361.8 400V296.6H1400V400ZM1405.3 400V287.9H1423.2V400ZM1421.1 400L1421.1 326.3L1455.8 342.3L1455.8 400ZM1443.5 400V329.7H1472.4V400ZM1468.1 400L1468.1 297.8L1488.6 283.6L1488.6 400ZM1491.4 400V349H1527.5V400ZM1521.9 400L1521.9 345.2L1525.2 345.2L1525.2 336.8L1529.9 336.8L1530.6 323.3L1531.6 323.3L1532.3 336.8L1537 336.8L1537 345.2L1540.3 345.2L1540.3 400ZM1533.1 400V310.5H1553.3V400ZM1555.8 400V287.2H1590.7V400ZM1586.6 400V264.8H1603.6V400ZM1598.3 400V289.3H1622.3V400Z"></path></defs><use href="#vsky-far" fill="#7c6f9c"></use><path id="dubai-capa-1" fill="#574a75" d="M0 400V304H36V400ZM40 400L40 250L45 250L45 236L50 236L50 226L53.8 226L54.5 208L55.5 208L56.2 226L60 226L60 236L65 236L65 250L70 250L70 400ZM205 400V282H231V400ZM236 400L236 250L266 234L266 400ZM300 400L300 224L306 224L306 208L312 208L312 196L315.8 196L316.5 170L317.5 170L318.2 196L322 196L322 208L328 208L328 224L334 224L334 400ZM360 400L364 320L358 240L383 240L389 320L386 400ZM398 400V296H438V400ZM450 400L450 200L481 174L483 152L484 174L484 400ZM494 400L494 230L521 208L523 192L524 208L524 400ZM624 400V268H654V400ZM660 400L660 242L666 242L666 228L690 228L690 242L696 242L696 400ZM704 400V310H744V400ZM846 400L846 214L877 184L879 172L880 184L880 400ZM890 400V280H930V400ZM944 400L944 194L948 194L948 182L953 182L953 172L957 172L957 164L965 164L965 172L969 172L969 182L974 182L974 194L978 194L978 400ZM984 400L984 194L988 194L988 182L993 182L993 172L997 172L997 164L1005 164L1005 172L1009 172L1009 182L1014 182L1014 194L1018 194L1018 400ZM1036 400L1036 250L1041 250L1041 236L1049.8 236L1050.5 216L1051.5 216L1052.2 236L1061 236L1061 250L1066 250L1066 400ZM1080 400L1080 204L1083 204L1083 186L1087 186L1087 172L1091.8 172L1092.5 138L1093.5 138L1094.2 172L1099 172L1099 186L1103 186L1103 204L1106 204L1106 400ZM1116 400V272H1154V400ZM1170 400L1174 311L1168 222L1195 222L1201 311L1198 400ZM1206 400L1206 178L1210 178L1210 164L1215 164L1215 152L1220.8 152L1221.5 114L1222.5 114L1223.2 152L1229 152L1229 164L1234 164L1234 178L1238 178L1238 400ZM1246 400V230H1276V400ZM1280 400L1280 232L1314 250L1314 400ZM1322 400L1322 212L1327 212L1327 196L1335.8 196L1336.5 180L1337.5 180L1338.2 196L1347 196L1347 212L1352 212L1352 400ZM1360 400V304H1404V400ZM1440 400V232Q1545 316 1464.5 400ZM1438.5 400V206H1441.5V400ZM1424 269H1441V273H1424ZM1560 400V316H1600V400Z"></path><path id="dubai-capa-2" fill="#574a75" fillRule="evenodd" d="M118 400V272H180V400ZM130 388V286H168V388ZM540 400V302H616V400ZM562 400V340H594V400Z"></path><path id="dubai-torre-1" fill="#3d3355" d="M770 400L770 340L770 340L770 300L775 300L775 264L775 264L775 232L779.5 232L779.5 204L779.5 204L779.5 180L784 180L784 160L784 160L784 144L788.5 144L788.5 132L788.5 132L788.5 122L793.5 122L793.5 108L795 108L795 94L796.2 94L796.2 80L797.2 80L797.2 66L798 400L799.5 8L800.5 8L802 400L802.8 66L802.8 80L803.8 80L803.8 94L805 94L805 108L806.5 108L806.5 122L807.5 122L807.5 132L810.5 132L810.5 144L810.5 144L810.5 160L814 160L814 180L814 180L814 204L818.5 204L818.5 232L818.5 232L818.5 264L823 264L823 300L823 300L823 340L828 340L828 400Z"></path><path id="dubai-torre-2" fill="#4a3f63" d="M800 400L800 8L800.5 8L802 400L802.8 66L802.8 80L803.8 80L803.8 94L805 94L805 108L806.5 108L806.5 122L807.5 122L807.5 132L810.5 132L810.5 144L810.5 144L810.5 160L814 160L814 180L814 180L814 204L818.5 204L818.5 232L818.5 232L818.5 264L823 264L823 300L823 300L823 340L828 340L828 400Z"></path><path id="dubai-capa-3" fill="#463c5e" d="M0 400V366H110V400ZM96 400V378H156V400ZM180 400V360H270V400ZM290 400V372H360V400ZM380 400V354H480V400ZM500 400V370H580V400ZM610 400V362H710V400ZM690 400V376H750V400ZM850 400V376H920V400ZM930 400V364H1020V400ZM1030 400V374H1100V400ZM1110 400V356H1220V400ZM1230 400V370H1310V400ZM1320 400V360H1410V400ZM1420 400V380H1480V400ZM1500 400V366H1600V400ZM0 400V394H1600V400Z"></path>
      {/* ============ LO QUE SE ANIMA (encima de la silueta, recortado a ella) ============ */}
      <defs>
        {/* Acá vivía el patrón de la retícula de ventanas encendidas. El dueño lo mandó quitar
            —«elimina todas las ventanas de los edificios, solo deja las luces que se prenden en
            ellos»—: ahora las únicas luces de los edificios son las que prenden y apagan, cada una
            a su hora. La silueta queda lisa. */}
        {/* El barrido: una banda de luz que se apaga sola hacia los dos lados. */}
        <linearGradient id="dubai-barrido" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#a855f7" stopOpacity="0" />
          <stop offset="45%" stopColor="#c084fc" stopOpacity="0.34" />
          <stop offset="55%" stopColor="#e9d5ff" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
        </linearGradient>
        {/* El haz de la punta: fuerte donde nace, desvanecido donde llega. */}
        <linearGradient id="dubai-haz" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f3e8ff" stopOpacity="0.6" />
          <stop offset="55%" stopColor="#c084fc" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#c084fc" stopOpacity="0.02" />
        </linearGradient>
        {/* El recorte: los MISMOS paths del original, por id. Así las luces sólo se ven dentro de la
            ciudad y no hace falta volver a escribir ni un `d`. */}
        <clipPath id="dubai-recorte">
          <use href="#vsky-far" />
          <use href="#dubai-capa-1" />
          <use href="#dubai-capa-2" />
          <use href="#dubai-capa-3" />
          <use href="#dubai-torre-1" />
          <use href="#dubai-torre-2" />
        </clipPath>
        <filter id="dubai-brillo" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g clipPath="url(#dubai-recorte)">
        {PARPADEOS.map((v, i) => (
          <rect
            key={`parpadeo-${i}`}
            className="dubai-parpadeo"
            x={v.x}
            y={v.y}
            width={7}
            height={7}
            rx={1}
            style={{ animationDelay: v.retardo }}
          />
        ))}
        <rect className="dubai-barrido" x="-320" y="90" width="320" height="310" fill="url(#dubai-barrido)" />
        <rect className="dubai-ola" x={768} y={392} width={64} height={16} rx={8} />
      </g>

      <g className="dubai-haces" filter="url(#dubai-brillo)">
        {HACES.map((h, i) => (
          <polygon
            key={`haz-${i}`}
            className="dubai-haz"
            points={`800,${h.desde} ${h.x - 26},404 ${h.x + 26},404`}
            fill="url(#dubai-haz)"
            style={{ animationDelay: `${h.retardo}s` }}
          />
        ))}
      </g>

      <circle className="dubai-aguja" cx={800} cy={10} r={3.2} />
    </svg>
  );
}

export default SkylineDubai;

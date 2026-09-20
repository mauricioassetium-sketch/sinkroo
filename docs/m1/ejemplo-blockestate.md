# M1 — Ejemplo vivo: BlockEstate

Así se cargaría BlockEstate en la sección de ingesta (M1).
Todo lo que sigue es un ejemplo de datos, listo para que lo veas y ajustes.

---

## 🏢 Business (el negocio principal)

```json
{
  "id": "biz_blockestate",
  "name": "BlockEstate",
  "industry": "inmobiliario",
  "description": "Marketplace B2B de real estate en UAE que conecta desarrolladores con compradores B2C. Compra propiedad en Dubái y pagá en cripto (convertido a AED via UPay), con KYC NDC.",
  "audience": "Inversores internacionales (35-60) que quieren entrar al real estate de Dubái sin fricción bancaria; expats UAE y holders de cripto.",
  "tone": "premium",
  "channels": ["meta", "whatsapp", "google"],
  "logo": "https://blockestate.ae/logo.png"
}
```

---

## 🏠 Producto principal (el que resalta)

```json
{
  "id": "prod_downtown_1br",
  "businessId": "biz_blockestate",
  "name": "Apartamento 1BR — Downtown Dubái",
  "category": "propiedad",
  "price": 850000,
  "priceUnit": "AED",
  "offer": "Compra en cripto, cerramos en AED. Sin espera bancaria.",
  "usp": "Pagar una propiedad en Dubái directamente con tu cripto, convertido a dirhams al instante.",
  "cta": "Reservar visita virtual",
  "imageUrl": "https://blockestate.ae/downtown-1br.png",
  "isPrimary": true
}
```

## 🏙️ Productos secundarios (misma sección de "agregar")

```json
[
  {
    "id": "prod_marina_2br",
    "businessId": "biz_blockestate",
    "name": "Apartamento 2BR — Dubai Marina",
    "category": "propiedad",
    "price": 1450000,
    "priceUnit": "AED",
    "offer": "Vista al mar, pago fraccionado en cripto.",
    "usp": "Vista waterfront + financiamiento flexible en stablecoins.",
    "cta": "Reservar visita",
    "imageUrl": "https://blockestate.ae/marina-2br.png",
    "isPrimary": false
  },
  {
    "id": "prod_offplan_jvc",
    "businessId": "biz_blockestate",
    "name": "Off-plan — JVC (studio)",
    "category": "promocion",
    "offer": "Entrega 2027, desde 15% de entrada.",
    "usp": "Entrada baja y apreciación temprana en zona en crecimiento.",
    "cta": "Ver proyecto",
    "imageUrl": "https://blockestate.ae/jvc-offplan.png",
    "isPrimary": false
  }
]
```

---

## ✅ Por qué este diseño captura lo importante (y nada más)

- **`usp` es el diferencial:** "pagar en cripto, cerrar en AED" — esto es lo que hace a BlockEstate *distinto* de cualquier otra inmobiliaria. Es exactamente lo que alimenta la dimensión `diferenciacion` del enjambre.
- **Producto principal marcado (`isPrimary: true`):** el enjambre prioriza el 1BR Downtown y genera creativos para él primero; el resto quedan en cola.
- **Las imágenes son URLs propias:** cada producto trae su visual actualizado. En M1 el cliente pega el link; la subida real de imagen la dejamos para M4 (más infra).

---

## Flujo de uso (para que sea simple)

1. El cliente entra → crea su **Business** (un formulario corto).
2. En la misma pantalla → **marca un producto como principal** y agrega los demás.
3. El sistema guarda todo y queda listo para que GAIA genere creativos (M4).

Nada de esto se publica ni se conecta a producción todavía — es solo el diseño de datos para que lo apruebes.

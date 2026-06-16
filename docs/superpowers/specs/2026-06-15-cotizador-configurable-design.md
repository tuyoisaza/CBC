# Cotizador Configurable — Coffee Bunn Cafe

## Resumen

Reemplazar el CTA directo a WhatsApp por un cotizador web configurable que permita al usuario armar su pedido (caja predefinida o combinación libre de métodos), añadir extras, seleccionar zona de entrega y fecha, y recibir un desglose de precio automático. Admin configura métodos, extras, zonas, descuentos y reglas de negocio.

## Cambios específicos

- Botón "Cotizar por WhatsApp" → "Cotizar" en toda la app
- "Cotizar" abre el cotizador general (con preselección si viene desde un producto)
- Formulario `/cotizar` actual pasa a ser página de contacto genérico

## Modelo de datos

### Nuevos modelos Prisma

```
Method {
  id          String   @id @default(cuid())
  name        String
  description String?
  unitPrice   Float
  active      Boolean  @default(true)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

Extra {
  id          String   @id @default(cuid())
  name        String   // "Tapografía", "Personalización de caja", "Tarjeta", "QR + curso personalizado"
  description String?
  unitPrice   Float
  active      Boolean  @default(true)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

ShippingZone {
  id          String   @id @default(cuid())
  name        String   // "CDMX", "Interior", "Recolección"
  baseFee     Float
  feePerUnit  Float
  active      Boolean  @default(true)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

VolumeDiscount {
  id          String   @id @default(cuid())
  minQty      Int
  maxQty      Int?
  discountPct Float    // ej. 5 = 5%
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Modelos modificados

**Product** — se añade campo opcional:
- `methodId String?` — relación opcional al método que esta caja incluye

**Quote** — se expande para almacenar la configuración completa:
- `items Json` — array normalizado: `[{ methodId, methodName, qty, unitPrice, lineTotal }]`
- `extraItems Json` — array: `[{ extraId, name, qty, unitPrice, lineTotal }]`
- `shippingZoneId String?` — FK a ShippingZone
- `deliveryDate DateTime?`
- `rush Boolean @default(false)`
- `subtotal Float`
- `discount Float` — monto total de descuento por volumen
- `discountPct Float` — porcentaje aplicado
- `shippingFee Float @default(0)`
- `rushFee Float @default(0)`
- `iva Float`
- `total Float`
- `advancePct Float @default(50)`
- `advanceAmount Float`

### Config (Settings)

Llaves a agregar en `Setting`:
- `MIN_PRODUCTION_DAYS` → "15"
- `RUSH_DAYS_THRESHOLD` → "8"
- `RUSH_FEE_PCT` → "40"
- `ADVANCE_PCT` → "50"
- `MIN_QTY_PER_METHOD` → "10"

## Reglas de negocio

| Regla | Default | Configurable |
|---|---|---|
| Días mínimos producción | 15 | Sí |
| Rush (<8 días) | +40% | Sí |
| Anticipo requerido | 50% | Sí |
| Mínimo por método | 10 uds | Sí |
| IVA | 16% | Fijo |

Shipping se calcula como: `baseFee + (feePerUnit × totalUnits)` de la zona seleccionada.
Rush fee: `subtotal × rushFeePct / 100`.

## API

### Públicas (sin auth)

| Método | Ruta | Propósito |
|---|---|---|
| GET | `/api/methods` | Listar métodos activos |
| GET | `/api/extras` | Listar extras activos |
| GET | `/api/shipping-zones` | Listar zonas activas |
| GET | `/api/volume-discounts` | Listar descuentos (ordenados por minQty) |
| GET | `/api/settings/public` | Obtener settings públicos (días mínimos, rush, etc.) |
| POST | `/api/quote/calculate` | Calcular precio total (body: métodos[], extras[], zona, rush, deliveryDate) |
| POST | `/api/quote/submit` | Crear Lead + Quote (body: contacto + configuración completa) |

### Admin CRUDs (auth requerida)

| Método | Ruta |
|---|---|
| GET/POST | `/api/admin/methods` |
| GET/PATCH/DELETE | `/api/admin/methods/[id]` |
| GET/POST | `/api/admin/extras` |
| GET/PATCH/DELETE | `/api/admin/extras/[id]` |
| GET/POST | `/api/admin/shipping-zones` |
| GET/PATCH/DELETE | `/api/admin/shipping-zones/[id]` |
| GET/POST | `/api/admin/volume-discounts` |
| GET/PATCH/DELETE | `/api/admin/volume-discounts/[id]` |

## Frontend Público

### Cotizador (`/cotizar`)

Wizard en una sola página con pasos:

1. **Tipo de pedido** — "Caja predefinida" o "Armar pedido"
   - Si "Caja": seleccionar de lista de productos activos → se precargan métodos y cantidades
   - Si "Armar": seleccionar métodos, definir cantidades (mín. 10 c/u)
2. **Extras** — checkboxes con cantidad opcional (tapografía, personalización caja, tarjeta, QR + curso)
3. **Entrega** — seleccionar zona, fecha deseada, toggle rush
4. **Resumen + Contacto** — desglose de precios, formulario con nombre, empresa, email, whatsapp
5. **Confirmación** — mensaje de éxito + instrucciones de anticipo

Preselección vía query param: `/cotizar?product=slug` salta directo al paso 2 con esa caja seleccionada.

### Botones "Cotizar"

Reemplazar "Cotizar por WhatsApp" en:
- `page.tsx` (home) → link a `/cotizar?product=slug`
- `productos/[slug]/page.tsx` → link a `/cotizar?product=slug`
- `PublicFooter.tsx` → link a `/cotizar`

### Página de contacto

El formulario actual de `/cotizar` se simplifica y pasa a ser `/contacto` (nombre, email, whatsapp, mensaje).

## Frontend Admin

### CRUDs

Cuatro páginas nuevas siguiendo el patrón de `ProductForm`:
- `/admin/sales/methods` — tabla + form
- `/admin/sales/extras` — tabla + form
- `/admin/sales/shipping-zones` — tabla + form
- `/admin/sales/volume-discounts` — tabla + form

Cada una sigue el mismo patrón: server component con listado, client component para create/edit.

### Edición de Producto (`ProductForm`)

Se añade selector de `Method` (opcional) para vincular una caja predefinida a su método.

### Quotes existentes

Se actualiza el admin de quotes para mostrar la configuración expandida (métodos, extras, envío, etc.).

## Estados de cotización/orden

| Estado | Descripción |
|---|---|
| Cotización creada | Lead + Quote creados, pendiente de acción |
| Pendiente de pago | Cotización enviada, esperando anticipo |
| Anticipo pagado | 50% recibido, en cola de producción |
| En producción | Fabricación iniciada |
| Lista para entrega | Producto terminado, listo para enviar |
| Entregada | Pedido completado |
| Cancelada | Pedido cancelado |

## Migración

1. Crear nuevos modelos (Method, Extra, ShippingZone, VolumeDiscount)
2. Seed con datos iniciales (métodos actuales, zona CDMX básica)
3. Expandir Quote con campos adicionales
4. Migrar Product existente: añadir `methodId` nullable
5. Data: insertar métodos y vincular a products según su tipo (prensa → método Prensa Francesa, etc.)
6. Actualizar Setting con defaults de negocio

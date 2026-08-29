# Auditoría de Sistema de Pagos Stripe — CBC

**Fecha**: 2026-08-29  
**Responsable**: Claude Code  
**Estado**: Diagnóstico Completo + Plan de Corrección

---

## 1. Problema Identificado

### Error Reportado
```
Unique constraint failed on the fields: (`whatsapp`)
```

**Contexto**: Al intentar pagar un producto en el checkout, el cliente recibe este error cuando intenta realizar una compra.

### Causa Raíz

El endpoint `/api/single-checkout` intenta **crear un Cliente nuevo en la BD sin verificar si ya existe**:

**Archivo**: `apps/web/src/app/api/single-checkout/route.ts` (líneas 28-35)
```typescript
const customer = await db.customer.create({
  data: {
    companyName: body.name,
    contactName: body.name,
    email: body.email || null,
    whatsapp: body.whatsapp,  // ← Sin verificar si ya existe
  },
})
```

**Esquema Prisma** (`packages/db/schema.prisma`, línea 17):
```prisma
whatsapp String? @unique
```

### Escenario de Fallo
1. Cliente A intenta comprar → Se crea en BD con WhatsApp `+52 555 ...`
2. Cliente A intenta comprar nuevamente (o mismo WhatsApp) → Falla con restricción única
3. El flujo asume "nuevo cliente" siempre, sin reutilizar existentes

---

## 2. Análisis de Arquitectura de Pagos

### 2.1 Esquema de Base de Datos

#### Modelo `Customer`
```prisma
model Customer {
  id                  String   @id @default(cuid())
  companyName         String
  contactName         String
  email               String?
  whatsapp            String?   @unique    ← RESTRICCIÓN ÚNICA
  // ... más campos ...
  stripeCustomerId    String?   @unique    ← Para sincronía con Stripe
  leads               Lead[]
  orders              Order[]
  quotes              Quote[]
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}
```

**Observaciones**:
- `whatsapp` es único pero nullable → permite `NULL` pero no duplicados
- `stripeCustomerId` es único → sincronía 1:1 con Stripe
- Relacionado con `Lead`, `Order`, `Quote`

#### Modelo `Payment`
```prisma
model Payment {
  id               String    @id @default(cuid())
  order            Order     @relation(fields: [orderId], references: [id])
  orderId          String
  stripePaymentId  String?   @unique
  stripeCustomerId String?   // ← NO es FK, solo texto
  paymentLinkId    String?
  paymentLinkUrl   String?
  amount           Float
  currency         String    @default("MXN")
  method           String    @default("card") // card | oxxo | spei | manual
  type             String    // deposit | balance | full
  status           String    @default("pending")
  paidAt           DateTime?
  createdAt        DateTime  @default(now())
}
```

**Problemas identificados**:
- `stripeCustomerId` en `Payment` es redundante (no FK a Customer)
- Mejor almacenar en `Customer` o en `Order`

---

### 2.2 Flujos de Pago Actuales

#### Flujo A: Compra Única (Single Purchase) — **PROBLÉMÁTICO**
**Archivo**: `apps/web/src/app/api/single-checkout/route.ts`

```
POST /api/single-checkout
│
├─ 1. Valida datos (slug, name, email, whatsapp)
├─ 2. Busca producto por slug ✓
├─ 3. Calcula precio final (con markup)
├─ 4. CREA CUSTOMER NUEVO ✗ (sin verificar si existe)
│      ↓ ERROR: Unique constraint si whatsapp ya existe
├─ 5. Crea Lead
├─ 6. Crea Quote (estado: "Pagado")
├─ 7. Crea Order (estado: "confirmed")
├─ 8. Genera preferencia de MercadoPago
└─ 9. Retorna init_point (enlace de pago)
```

**Estado**: MercadoPago (no Stripe)  
**Claves faltantes**: Sin integración real de Stripe aquí

---

#### Flujo B: Orden desde Cotización — Parcialmente Correcto
**Archivo**: `apps/web/src/app/api/admin/orders/route.ts`

```
POST /api/admin/orders
│
├─ 1. Valida quoteId
├─ 2. Busca Quote + Customer existente ✓
├─ 3. Llama getOrCreateStripeCustomer() ✓
│      ├─ Si stripeCustomerId existe → Recupera de Stripe
│      └─ Si no existe → Crea en Stripe
├─ 4. Actualiza Customer con stripeCustomerId ✓
├─ 5. Crea Order
├─ 6. Genera Payment Link de Stripe (50% depósito)
└─ 7. Envía enlace al cliente
```

**Estado**: Stripe (correcto para órdenes B2B)  
**Límite**: Solo funciona desde cotizaciones, no desde checkout simple

---

### 2.3 Integración Stripe

**Archivo**: `apps/web/src/lib/stripe.ts`

#### Función: `getOrCreateStripeCustomer()`
```typescript
export async function getOrCreateStripeCustomer(opts: {
  email: string
  name: string
  whatsapp?: string
  stripeCustomerId?: string
}) {
  if (opts.stripeCustomerId) {
    return stripe.customers.retrieve(opts.stripeCustomerId)
  }

  return stripe.customers.create({
    email: opts.email,
    name: opts.name,
    phone: opts.whatsapp,
    metadata: { source: 'cbc-platform' },
  })
}
```

**Observaciones**:
- ✓ Recupera si ya existe stripeCustomerId
- ✗ NO busca por email/whatsapp si no existe ID local
- ✗ Asume "si no tenemos ID local = crear nuevo"
- Riesgo: Clientes duplicados en Stripe si se pierden IDs locales

#### Función: `createPaymentLink()`
```typescript
export async function createPaymentLink(opts: {
  amount: number
  description: string
  customerId?: string   // Stripe customer ID (NOT USED)
  metadata?: Record<string, string>
  allowOxxo?: boolean
}) {
  const price = await stripe.prices.create({...})
  const paymentLink = await stripe.paymentLinks.create({...})
  return paymentLink
}
```

**Observaciones**:
- ✓ Acepta `customerId` parameter pero NO lo usa
- ✗ Debería vincular customer al payment link
- ✗ No actualiza Payment record con stripeCustomerId

---

### 2.4 Webhooks de Pago

#### Stripe Webhook: `/api/webhooks/stripe`
- Evento: `checkout.session.completed`
- Actualiza Payment status → `paid`
- Actualiza Order status según tipo (deposit/balance)
- Genera balance payment link después de depósito
- Notifica a Lorena (propietaria)

**Problemas**:
- ✓ Funcional para órdenes
- ✗ No maneja errores de pago fallido
- ✗ No reintentos automáticos
- ✗ No logging detallado de metadatos

#### MercadoPago Webhook: `/api/webhooks/mercadopago`
- Evento: `payment` (tipo payment)
- Busca orden por `external_reference`
- Actualiza Payment status → `paid`
- Cambia Order status → `in_production`

**Problemas**:
- ✗ Guarda `paymentId` en `stripePaymentId` (naming incorrecto)
- ✓ Funcional pero confuso

---

### 2.5 Flujo de Clientes

#### Estado Actual
```
Cotización (CRM)
├─ Customer (creado manualmente o desde formulario)
├─ Lead (origen, contexto)
└─ Quote (items, precios)

Compra Simple (Web)
├─ Customer (creado en checkout SIN verificar existencia)
├─ Lead (source: "single-purchase")
└─ Quote + Order (auto-procesado)

Pago
├─ NO busca customer existente por whatsapp
├─ Crea nuevo SIEMPRE → Falla si duplicate
└─ Stripe desincronizado de BD local
```

#### Problemas
1. **Sin búsqueda de cliente existente**: No hay lógica para "¿Ya existe?"
2. **Sin reutilización**: Cada compra = nuevo customer
3. **Desincronización**: BD local ≠ Stripe
4. **Sin manejo de errores**: Unique constraint error sale al usuario

---

## 3. Configuración de Stripe

### Claves de API (Estado)
```env
STRIPE_SECRET_KEY=sk_test_... o sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_test_... o pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Recomendación**:
- [ ] Verificar que está en `sk_test_` (sandbox) antes de go-live
- [ ] Configurar webhook en Stripe Dashboard:
  - Endpoint: `https://coffeebunncafe.com/api/webhooks/stripe`
  - Eventos: `checkout.session.completed` (+ agregar `payment_intent.succeeded`)

### Webhooks Registrados
**En código**:
- `checkout.session.completed` → Maneja órdenes

**Recomendado agregar**:
- `payment_intent.succeeded` → Confirmación extra
- `payment_intent.payment_failed` → Manejo de fallos
- `charge.refunded` → Para reembolsos

---

## 4. Productos y Precios

**Archivo**: Modelos `Product`, `Method`, `Extra` en Prisma

```prisma
model Product {
  id          String   @id @default(cuid())
  slug        String   @unique
  name        String
  price       Float
  active      Boolean  @default(true)
  // ...
}
```

**Integración con Stripe**: NINGUNA
- Precios en BD local
- Stripe crea precios ad-hoc en `createPaymentLink()`
- Sin sincronización bidireccional

**Recomendación**: Mantener así (simple y local)

---

## 5. Análisis de Errores y Edge Cases

### Error 1: Unique Constraint (Actual)
```
Unique constraint failed on the fields: (`whatsapp`)
```
**Causa**: `single-checkout` crea Customer sin verificar existencia  
**Impacto**: Cliente no puede comprar 2 veces  
**Solución**: Implementar `getOrCreateCustomer()` con búsqueda por whatsapp

---

### Error 2: Duplicados en Stripe
**Causa**: `getOrCreateStripeCustomer()` no busca por email/whatsapp  
**Impacto**: Si se pierden IDs locales, se crean duplicados en Stripe  
**Solución**: Agregar búsqueda `stripe.customers.search()` por email

---

### Error 3: Desincronización BD ↔ Stripe
**Causa**: Stripe ID se guarda a veces, a veces no  
**Impacto**: Webhook no sabe si fue Stripe o MercadoPago  
**Solución**: Siempre almacenar stripeCustomerId en Order o Payment

---

### Error 4: MercadoPago usa `stripePaymentId`
```typescript
stripePaymentId: String(paymentId), // En webhook MercadoPago
```
**Impacto**: Campo name confunde (no es Stripe)  
**Solución**: Renombrar a `paymentId` genérico o `externalPaymentId`

---

## 6. Plan de Corrección

### FASE 1: Corregir Single Checkout (CRÍTICA)

**Objetivo**: Permitir que clientes compren múltiples veces sin error de duplicate whatsapp

**Cambios**:

#### 1.1 Crear helper `getOrCreateCustomer()` en Prisma
**Archivo**: `apps/web/src/lib/db-helpers.ts` (nuevo)

```typescript
export async function getOrCreateCustomer(opts: {
  whatsapp: string
  email?: string
  companyName: string
  contactName?: string
}) {
  // Buscar por whatsapp primero (principal identifier)
  let customer = await db.customer.findUnique({
    where: { whatsapp: opts.whatsapp }
  })

  if (customer) {
    // Actualizar campos si vinieron nuevos
    if (opts.email && !customer.email) {
      customer = await db.customer.update({
        where: { id: customer.id },
        data: { email: opts.email }
      })
    }
    return customer
  }

  // No existe → crear
  return await db.customer.create({
    data: {
      whatsapp: opts.whatsapp,
      email: opts.email || null,
      companyName: opts.companyName,
      contactName: opts.contactName || opts.companyName,
    }
  })
}
```

#### 1.2 Refactorizar `/api/single-checkout`
**Cambios**:
- Usar `getOrCreateCustomer()` en lugar de `db.customer.create()`
- Agregar try-catch específico para constraint errors
- Responder con error descriptivo

```typescript
// Línea 28-35 → Cambiar a:
const customer = await getOrCreateCustomer({
  whatsapp: body.whatsapp,
  email: body.email,
  companyName: body.name,
  contactName: body.name,
})
```

#### 1.3 Considerar: ¿Usar Stripe o MercadoPago?
**Contexto actual**: Single-checkout usa MercadoPago, órdenes usan Stripe

**Recomendación**:
- [ ] Unificar a Stripe (mejor para B2B + checkout)
- [ ] Si mantener MP: agregar `stripeCustomerId` a Payment para trazabilidad

---

### FASE 2: Mejorar Sincronización Stripe ↔ BD

**Objetivo**: Garantizar que Customer local ↔ Stripe siempre estén sincronizados

#### 2.1 Mejorar `getOrCreateStripeCustomer()`
**Archivo**: `apps/web/src/lib/stripe.ts`

```typescript
export async function getOrCreateStripeCustomer(opts: {
  email: string
  name: string
  whatsapp?: string
  stripeCustomerId?: string
}) {
  // 1. Si tenemos ID local → recuperar
  if (opts.stripeCustomerId) {
    try {
      return await stripe.customers.retrieve(opts.stripeCustomerId)
    } catch (err) {
      console.error(`Stripe customer not found: ${opts.stripeCustomerId}`)
      // Continuar para crear nuevo
    }
  }

  // 2. Buscar por email en Stripe (si no tenemos ID local)
  if (opts.email) {
    const existing = await stripe.customers.search({
      query: `email:"${opts.email}"`,
      limit: 1,
    })

    if (existing.data.length > 0) {
      return existing.data[0]
    }
  }

  // 3. Crear nuevo en Stripe
  return await stripe.customers.create({
    email: opts.email,
    name: opts.name,
    phone: opts.whatsapp,
    metadata: { 
      source: 'cbc-platform',
      whatsapp: opts.whatsapp || '',
    },
  })
}
```

#### 2.2 Actualizar `/api/admin/orders` para guardar stripeCustomerId

```typescript
// Después de línea 44:
await db.payment.update({
  where: { id: payment.id },
  data: { stripeCustomerId: stripeCustomer.id }
})
```

---

### FASE 3: Mejorar Manejo de Webhooks

#### 3.1 Agregar eventos a Stripe Webhook
**En Stripe Dashboard → Webhooks**:
- ✓ `checkout.session.completed`
- ✓ `payment_intent.succeeded`
- ✓ `payment_intent.payment_failed`
- ✓ `charge.refunded`

#### 3.2 Expandir webhook handler
**Archivo**: `apps/web/src/app/api/webhooks/stripe/route.ts`

Agregar manejo de:
- `payment_intent.payment_failed` → Notificar al cliente
- `charge.refunded` → Actualizar estado a "refunded"
- Logging detallado de all events

---

### FASE 4: Limpiar Naming & Estructura

#### 4.1 En Modelo Payment
Cambiar `stripePaymentId` a ser genérico:

```prisma
model Payment {
  // ... 
  externalPaymentId String? @unique  // Cualquier payment processor
  externalCustomerId String?          // Customer ID del processor
  processor String @default("stripe") // stripe | mercadopago
  // ...
}
```

#### 4.2 En Webhook MercadoPago
```typescript
// Guardar con processor identificado
await db.payment.update({
  where: { orderId },
  data: { 
    processor: 'mercadopago',
    externalPaymentId: String(paymentId),
  }
})
```

---

## 7. Checklist de Implementación

### CRÍTICO (Hacer ahora)
- [ ] Crear `getOrCreateCustomer()` helper
- [ ] Refactorizar `/api/single-checkout` para usar helper
- [ ] Testear compra 2× con mismo WhatsApp

### ALTO (Próxima semana)
- [ ] Mejorar `getOrCreateStripeCustomer()` con search
- [ ] Guardar stripeCustomerId en Payment
- [ ] Auditar Stripe webhook events registrados

### MEDIO (Próximas 2 semanas)
- [ ] Considerar unificar a Stripe (vs MercadoPago)
- [ ] Expandir webhook handlers
- [ ] Renombrar `stripePaymentId` a `externalPaymentId`

### BAJO (Técnica deuda)
- [ ] Logging centralizado de pagos
- [ ] Dashboard de reconciliación BD ↔ Stripe
- [ ] Tests de integración Stripe

---

## 8. Ambiente: ¿Sandbox o Producción?

### Estado Actual
```
STRIPE_SECRET_KEY=sk_test_...  (si empieza con "test")
                    o sk_live_... (si empieza con "live")
```

**Recomendación**:
- [ ] Confirmar que es `sk_test_` mientras no esté listo go-live
- [ ] Cambiar a `sk_live_` solo después de:
  - [ ] Pasar tests de checkout 2×
  - [ ] Confirmación de Lorena en producción
  - [ ] Stripe webhook verificado en dashboard

---

## 9. Próximos Pasos

1. **Hoy**: Revisar este documento con el equipo
2. **Mañana**: Implementar FASE 1 (getOrCreateCustomer + single-checkout)
3. **QA**: Testear compra 2× mismo cliente
4. **Deploy staging**: Verificar en Railway
5. **Go-live**: Cambiar a sk_live_ cuando todo OK

---

## Anexo A: Archivos Afectados

```
packages/db/schema.prisma
├─ Modelo Customer (línea 12)
└─ Modelo Payment (línea 119)

apps/web/src/
├─ lib/stripe.ts (funciones de Stripe)
├─ lib/db-helpers.ts (crear nuevo)
├─ app/api/single-checkout/route.ts (PRINCIPAL)
├─ app/api/admin/orders/route.ts (actualizar)
├─ app/api/webhooks/stripe/route.ts (expandir)
└─ app/api/webhooks/mercadopago/route.ts (naming fix)
```

---

## Anexo B: SQL para Auditoría BD

```sql
-- Ver clientes sin stripeCustomerId
SELECT id, companyName, whatsapp, stripeCustomerId, createdAt
FROM "Customer"
WHERE "stripeCustomerId" IS NULL
ORDER BY "createdAt" DESC;

-- Ver pagos sin procesar
SELECT p.id, p.status, p.type, p.method, o."orderCode", c.companyName
FROM "Payment" p
JOIN "Order" o ON p."orderId" = o.id
JOIN "Customer" c ON o."customerId" = c.id
WHERE p.status = 'pending'
ORDER BY p."createdAt" DESC;

-- Ver Stripe ID duplicados (si los hay)
SELECT "stripeCustomerId", COUNT(*) as cnt
FROM "Customer"
WHERE "stripeCustomerId" IS NOT NULL
GROUP BY "stripeCustomerId"
HAVING COUNT(*) > 1;
```

---

**Documento preparado por**: Claude Code  
**Última actualización**: 2026-08-29  
**Revisores pendientes**: Tuyo Isaza, Lorena

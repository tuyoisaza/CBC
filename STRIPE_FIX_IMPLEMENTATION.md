# Fix de Stripe: Plan de Implementación

**Tiempo estimado**: 30 minutos  
**Dificultad**: Baja  
**Riesgo**: Bajo (solo cambia lógica de búsqueda de cliente)

---

## PASO 1: Crear Helper de Cliente (5 min)

**Archivo**: Crear `apps/web/src/lib/db-helpers.ts`

```typescript
import { db } from './db'

/**
 * Busca un cliente existente por WhatsApp, o crea uno nuevo.
 * Evita duplicados en la BD cuando el mismo cliente intenta comprar 2×.
 */
export async function getOrCreateCustomer(opts: {
  whatsapp: string
  email?: string
  companyName: string
  contactName?: string
}) {
  // Buscar cliente existente por WhatsApp (es el ID único del cliente)
  const existingCustomer = await db.customer.findUnique({
    where: { whatsapp: opts.whatsapp },
  })

  if (existingCustomer) {
    // Cliente existe: actualizar email si falta
    if (opts.email && !existingCustomer.email) {
      return await db.customer.update({
        where: { id: existingCustomer.id },
        data: { email: opts.email },
      })
    }
    return existingCustomer
  }

  // No existe: crear nuevo cliente
  return await db.customer.create({
    data: {
      whatsapp: opts.whatsapp,
      email: opts.email || null,
      companyName: opts.companyName,
      contactName: opts.contactName || opts.companyName,
    },
  })
}
```

---

## PASO 2: Refactorizar Single Checkout (10 min)

**Archivo**: `apps/web/src/app/api/single-checkout/route.ts`

**Cambios**:

### 2.1 Agregar import
En línea 2 (después de imports actuales):
```typescript
import { getOrCreateCustomer } from '@/lib/db-helpers'
```

### 2.2 Reemplazar líneas 28-35

**ANTES**:
```typescript
const customer = await db.customer.create({
  data: {
    companyName: body.name,
    contactName: body.name,
    email: body.email || null,
    whatsapp: body.whatsapp,
  },
})
```

**DESPUÉS**:
```typescript
const customer = await getOrCreateCustomer({
  whatsapp: body.whatsapp,
  email: body.email,
  companyName: body.name,
  contactName: body.name,
})
```

---

## PASO 3: Mejorar Manejo de Errores (5 min)

**Archivo**: `apps/web/src/app/api/single-checkout/route.ts`

### 3.1 Mejorar el catch block
En línea 100-116, cambiar el catch block a:

```typescript
} catch (err) {
  console.error('[single-checkout] error', err)

  if (err instanceof z.ZodError) {
    return NextResponse.json(
      { 
        error: 'Datos de compra inválidos. Revisa el formulario.', 
        code: 'VALIDATION_ERROR', 
        details: err.flatten().fieldErrors 
      },
      { status: 400 },
    )
  }

  // Detectar errores específicos de BD
  if (err instanceof Error) {
    if (err.message.includes('Unique constraint')) {
      return NextResponse.json(
        { 
          error: 'Ya existe una compra con este WhatsApp. Contacta a soporte.',
          code: 'CUSTOMER_EXISTS',
        },
        { status: 409 },
      )
    }

    const message = err.message
    console.error('[single-checkout] error details:', message)
    return NextResponse.json(
      { 
        error: `No se pudo iniciar el pago: ${message}`, 
        code: 'CHECKOUT_ERROR' 
      },
      { status: 500 },
    )
  }

  return NextResponse.json(
    { 
      error: 'Error desconocido al procesar el pago', 
      code: 'CHECKOUT_ERROR' 
    },
    { status: 500 },
  )
}
```

---

## PASO 4: Testear (10 min)

### 4.1 Test Local

1. Inicia dev server:
```bash
cd apps/web
pnpm dev
```

2. Ve a `http://localhost:3000/productos/[product-slug]`

3. Completa checkout CON UN NUEVO WHATSAPP → Debe funcionar ✓

4. Intenta comprar NUEVAMENTE con el MISMO WHATSAPP → Debe funcionar (reutilizar cliente) ✓

### 4.2 Test en Railway

1. Pushea cambios a GitHub
2. Railway auto-deploya
3. Ve a `https://coffeebunncafe.com/productos/[slug]`
4. Repite steps 3-4

---

## PASO 5: Validar en BD (5 min)

Después de ambos checkouts, ejecuta en psql:

```sql
SELECT id, companyName, whatsapp, email, createdAt, updatedAt
FROM "Customer"
WHERE whatsapp = '+52XXXXX'  -- el WhatsApp de tu test
ORDER BY updatedAt DESC
LIMIT 2;
```

**Esperado**: 1 fila (mismo cliente reutilizado), con `updatedAt` actualizado en segundo checkout

---

## PASO 6: Agregar Stripe (OPCIONAL, pero recomendado)

Si quieres usar Stripe en single-checkout (vs MercadoPago actual):

### 6.1 Crear funciones de pago en Stripe
**Archivo**: `apps/web/src/lib/stripe.ts`

```typescript
export async function createStripeCheckoutSession(opts: {
  customerId: string  // Stripe customer ID
  amount: number      // En pesos MXN
  description: string
  successUrl: string
  cancelUrl: string
  orderCode: string
  orderId: string
}) {
  const session = await stripe.checkout.sessions.create({
    customer: opts.customerId,
    line_items: [
      {
        price_data: {
          currency: 'mxn',
          unit_amount: Math.round(opts.amount * 100),
          product_data: {
            name: opts.description,
          },
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    metadata: {
      orderId: opts.orderId,
      orderCode: opts.orderCode,
      type: 'full',
    },
  })

  return session
}
```

### 6.2 Usar en single-checkout (línea 69)

**ANTES** (MercadoPago):
```typescript
const preference = await new Preference(mercadopagoClient).create({...})
return NextResponse.json({ url: preference.init_point })
```

**DESPUÉS** (Stripe):
```typescript
const stripeCustomer = await getOrCreateStripeCustomer({
  email: customer.email || '',
  name: customer.companyName,
  whatsapp: customer.whatsapp,
  stripeCustomerId: customer.stripeCustomerId || undefined,
})

if (!customer.stripeCustomerId) {
  await db.customer.update({
    where: { id: customer.id },
    data: { stripeCustomerId: stripeCustomer.id },
  })
}

const session = await createStripeCheckoutSession({
  customerId: stripeCustomer.id,
  amount: finalPrice,
  description: `Compra: ${product.name}`,
  successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/pago/gracias?orderCode=${orderCode}`,
  cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/productos/${body.slug}`,
  orderCode,
  orderId: order.id,
})

return NextResponse.json({ url: session.url })
```

---

## PASO 7: Deploy & Monitoreo

```bash
# 1. Commit cambios
git add apps/web/src/lib/db-helpers.ts apps/web/src/app/api/single-checkout/route.ts
git commit -m "fix: use getOrCreateCustomer to prevent duplicate whatsapp constraint error"

# 2. Push a main
git push origin main

# 3. Railway auto-deploya

# 4. Monitorea logs
# Railway → Project → Deployments → View → Logs
```

---

## Rollback Plan

Si algo falla después de deploy:

```bash
# Volver a commit anterior
git revert HEAD

git push origin main
# Railway auto-redeploya versión anterior
```

---

## Validación Post-Deploy

**En producción** (`https://coffeebunncafe.com`):

1. Checkout 1× con WhatsApp `+52 1234567890`
2. Checkout 2× mismo WhatsApp → debe funcionar
3. Revisa BD:
   ```sql
   SELECT * FROM "Customer" 
   WHERE whatsapp = '+52 1234567890'
   ORDER BY createdAt DESC;
   ```
   → Debe haber 1 fila (no 2)

4. Revisa logs de Railway → No debe haber errores de constraint

---

## Troubleshooting

### "Unique constraint failed" después de deploy

**Causa**: Cambio no sincronizó  
**Solución**: 
```bash
git pull origin main
cd apps/web
pnpm install
# Si en desarrollo: restart dev server
```

### Stripe 404 "Customer not found"

**Causa**: `stripeCustomerId` no guardado  
**Solución**: Ver PASO 2.2 (asegurar que actualiza Customer)

### MercadoPago vs Stripe Conflict

**Causa**: Migrando de MP a Stripe  
**Solución**: Mantener MP por ahora, agregar Stripe después (ver PASO 6)

---

## Monitoreo Post-Fix

**Ejecutar regularmente**:
```sql
-- Clientes sin Stripe ID (para single-checkout)
SELECT id, companyName, whatsapp, createdAt
FROM "Customer"
WHERE "stripeCustomerId" IS NULL
  AND createdAt > NOW() - INTERVAL '1 day';

-- Errores de pago en últimas 24h
SELECT p.id, p.status, o."orderCode", c.whatsapp, p."createdAt"
FROM "Payment" p
JOIN "Order" o ON p."orderId" = o.id
JOIN "Customer" c ON o."customerId" = c.id
WHERE p."createdAt" > NOW() - INTERVAL '1 day'
  AND p.status != 'paid'
ORDER BY p."createdAt" DESC;
```

---

## Checksum Post-Deploy

Después de cada deploy, run:

```bash
# Verificar no hay duplicados de whatsapp
pnpm db:sql "SELECT whatsapp, COUNT(*) FROM Customer GROUP BY whatsapp HAVING COUNT(*) > 1;"

# Verificar pagos pendientes inconsistentes
pnpm db:sql "SELECT COUNT(*) FROM Payment WHERE status='pending' AND createdAt < NOW() - INTERVAL '7 days';"
```

---

**Documento preparado por**: Claude  
**Tiempo total estimado**: 30-45 minutos  
**Riesgo de rollback**: Bajo (solo lógica de búsqueda)

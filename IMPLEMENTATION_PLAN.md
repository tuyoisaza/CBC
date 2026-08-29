# Plan de Implementación Integral: Pagos Funcionales + Admin Reportes

**Objetivo**: Dejar el sistema de pagos completamente funcional con reportes en el admin en tiempo real.

**Timeline Total**: 3-4 horas  
**Riesgo**: Bajo-Medio  
**Dependencias**: BD, Stripe, MercadoPago, NextAuth

---

## 🎯 Visión General

```
ANTES (Estado actual)
├─ ❌ Checkout falla en 2da compra (unique constraint)
├─ ❌ Admin no muestra pagos de single-checkout
├─ ❌ Sin reportes de ventas
└─ ❌ Sin visibilidad de ingresos reales

DESPUÉS (Después de este plan)
├─ ✅ Checkout funciona 2+ veces
├─ ✅ Admin muestra TODAS las ventas (cotizaciones + single-checkout)
├─ ✅ Reportes de ingresos por período
├─ ✅ Ver pagos en tiempo real
└─ ✅ Alertas cuando llega dinero
```

---

## PHASE 1: Fijar Checkout (30 min) ⭐ CRÍTICO

### Objetivo
Permitir que clientes compren 2+ veces sin error de duplicate whatsapp

### Cambios

#### 1.1 Crear helper de cliente
**Archivo**: Crear `apps/web/src/lib/db-helpers.ts`

```typescript
import { db } from './db'

export async function getOrCreateCustomer(opts: {
  whatsapp: string
  email?: string
  companyName: string
  contactName?: string
}) {
  // Buscar existente por whatsapp
  const existing = await db.customer.findUnique({
    where: { whatsapp: opts.whatsapp },
  })

  if (existing) {
    // Actualizar email si falta
    if (opts.email && !existing.email) {
      return await db.customer.update({
        where: { id: existing.id },
        data: { email: opts.email },
      })
    }
    return existing
  }

  // Crear nuevo
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

#### 1.2 Refactorizar single-checkout
**Archivo**: `apps/web/src/app/api/single-checkout/route.ts`

**Cambio 1**: Agregar import (línea 2)
```typescript
import { getOrCreateCustomer } from '@/lib/db-helpers'
```

**Cambio 2**: Reemplazar líneas 28-35

ANTES:
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

DESPUÉS:
```typescript
const customer = await getOrCreateCustomer({
  whatsapp: body.whatsapp,
  email: body.email,
  companyName: body.name,
  contactName: body.name,
})
```

#### 1.3 Test
```bash
# Test en local
cd apps/web && pnpm dev
# Ir a /productos/[slug] → compra 2× mismo WhatsApp → ✅ debe funcionar

# Test en staging/prod
# Ir a https://coffeebunncafe.com/productos/[slug] → compra 2× → ✅ debe funcionar
```

#### 1.4 Validation
```sql
-- Verificar clientes sin duplicados de whatsapp
SELECT whatsapp, COUNT(*) as cnt FROM "Customer" 
GROUP BY whatsapp HAVING COUNT(*) > 1;
-- Resultado esperado: 0 filas
```

---

## PHASE 2: Mejorar Admin Dashboard (45 min) ⭐ IMPORTANTE

### Objetivo
Mostrar visibilidad completa de ventas, pagos y clientes

### 2.1 Extender Dashboard
**Archivo**: Modificar `apps/web/src/app/admin/(protected)/dashboard/page.tsx`

**Agregar después de `getDashboardData()` function (línea 30)**:

```typescript
async function getPaymentsData() {
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  
  const [
    totalRevenue,      // Ingresos totales este mes
    paidPayments,      // Pagos completados
    pendingPayments,   // Pagos pendientes
    paymentsByMethod,  // Por método (Stripe/MercadoPago)
  ] = await Promise.all([
    db.payment.aggregate({
      where: { 
        status: 'paid',
        createdAt: { gte: startOfMonth }
      },
      _sum: { amount: true }
    }),
    db.payment.count({
      where: {
        status: 'paid',
        createdAt: { gte: startOfMonth }
      }
    }),
    db.payment.count({
      where: {
        status: 'pending',
        createdAt: { gte: startOfMonth }
      }
    }),
    db.payment.groupBy({
      by: ['method'],
      where: {
        status: 'paid',
        createdAt: { gte: startOfMonth }
      },
      _sum: { amount: true },
      _count: { id: true },
    })
  ])

  return {
    totalRevenue: totalRevenue._sum.amount || 0,
    paidPayments,
    pendingPayments,
    paymentsByMethod,
  }
}
```

**Modificar `getDashboardData()` para incluir pagos**:

```typescript
async function getDashboardData() {
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)

  const [
    openLeads,
    activeOrders,
    unreadMessages,
    monthOrders,
    paymentsData,  // ← Agregar
  ] = await Promise.all([
    db.lead.count({ where: { status: { in: ['new', 'contacted', 'quoted'] } } }),
    db.order.count({ where: { status: { in: ['confirmed', 'in_production', 'ready', 'shipped'] } } }),
    db.message.count({ where: { direction: 'inbound', status: 'unread' } }),
    db.order.findMany({
      where: { createdAt: { gte: startOfMonth }, status: { not: 'cancelled' } },
      include: { quote: true },
    }),
    getPaymentsData(),  // ← Agregar
  ])

  const mrr = monthOrders.reduce((sum, o) => sum + o.quote.total, 0)
  return { 
    openLeads, 
    activeOrders, 
    unreadMessages, 
    mrr,
    paymentsData,  // ← Agregar
  }
}
```

**Reemplazar las stat cards (línea 35-40)**:

```typescript
  const statCards = [
    { 
      label: 'Ingresos pagados', 
      value: `$${data.paymentsData.totalRevenue.toLocaleString('es-MX')}`, 
      sub: 'este mes',         
      icon: TrendingUp,    
      color: 'text-green-500',  
      bg: 'bg-green-500/10',  
      href: '/admin/sales/payments' // ← NEW PAGE
    },
    { 
      label: 'Pagos pendientes',   
      value: data.paymentsData.pendingPayments,                          
      sub: 'a confirmar',  
      icon: Clock,   // ← Import Clock from lucide-react
      color: 'text-amber-500',   
      bg: 'bg-amber-500/10',   
      href: '/admin/sales/payments' 
    },
    { 
      label: 'Leads abiertos',   
      value: data.openLeads,                          
      sub: 'por cerrar',  
      icon: ShoppingBag,   
      color: 'text-blue-500',   
      bg: 'bg-blue-500/10',   
      href: '/admin/sales/leads' 
    },
    { 
      label: 'Pedidos activos',  
      value: data.activeOrders,                       
      sub: 'en proceso',  
      icon: Coffee,        
      color: 'text-primary',    
      bg: 'bg-primary/10',    
      href: '/admin/sales/orders' 
    },
    { 
      label: 'Sin leer',         
      value: data.unreadMessages,                     
      sub: 'mensajes',    
      icon: MessageSquare, 
      color: data.unreadMessages > 0 ? 'text-red-500' : 'text-muted-foreground', 
      bg: data.unreadMessages > 0 ? 'bg-red-500/10' : 'bg-muted', 
      href: '/admin/service' 
    },
  ]
```

**Agregar mini-widget de pagos por método (antes del cierre del return)**:

```typescript
      {/* Payment breakdown */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">Pagos por método</h2>
        <div className="space-y-2">
          {data.paymentsData.paymentsByMethod.map((m) => (
            <div key={m.method} className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground capitalize">{m.method || 'Manual'}</span>
              <div className="text-right">
                <p className="font-semibold text-foreground">${m._sum.amount?.toLocaleString('es-MX')} MXN</p>
                <p className="text-xs text-muted-foreground">{m._count.id} transacciones</p>
              </div>
            </div>
          ))}
        </div>
      </div>
```

---

### 2.2 Crear página de Pagos
**Archivo**: Crear `apps/web/src/app/admin/(protected)/sales/payments/page.tsx`

```typescript
import { db } from '@/lib/db'
import Link from 'next/link'
import { CheckCircle, Clock, XCircle } from 'lucide-react'

export const metadata = { title: 'Pagos' }

const STATUS_ICON: Record<string, typeof CheckCircle> = {
  paid: CheckCircle,
  pending: Clock,
  failed: XCircle,
}

const STATUS_COLOR: Record<string, string> = {
  paid: 'text-green-600 dark:text-green-400',
  pending: 'text-amber-600 dark:text-amber-400',
  failed: 'text-red-600 dark:text-red-400',
}

const METHOD_LABEL: Record<string, string> = {
  card: 'Tarjeta',
  oxxo: 'OXXO',
  spei: 'SPEI',
  manual: 'Manual',
  '': 'MercadoPago',
}

export default async function PaymentsPage() {
  const payments = await db.payment.findMany({
    include: {
      order: {
        include: { customer: true }
      }
    },
    orderBy: { createdAt: 'desc' },
  })

  const typeLabel = (type: string) => type === 'deposit' ? 'Anticipo' : 'Saldo'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pagos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {payments.length} transacciones registradas
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {['Orden','Cliente','Monto','Tipo','Método','Estado','Fecha'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {payments.map(p => {
              const Icon = STATUS_ICON[p.status]
              return (
                <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <Link 
                      href={`/admin/sales/orders/${p.order.id}`}
                      className="font-mono text-xs text-primary hover:underline"
                    >
                      {p.order.orderCode}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {p.order.customer.companyName}
                  </td>
                  <td className="px-4 py-3 font-semibold text-foreground">
                    ${p.amount.toLocaleString('es-MX')}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {typeLabel(p.type)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">
                    {METHOD_LABEL[p.method] || p.method}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${STATUS_COLOR[p.status]}`} />
                      <span className={`capitalize font-medium ${STATUS_COLOR[p.status]}`}>
                        {p.status === 'paid' ? 'Pagado' : p.status === 'pending' ? 'Pendiente' : 'Fallido'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(p.createdAt).toLocaleDateString('es-MX')}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

---

## PHASE 3: Integración en Tiempo Real (45 min) ⭐ IDEAL EXPERIENCE

### Objetivo
Ver pagos aparecer en el admin cuando llegan (webhooks activos)

### 3.1 Mejorar webhook de Stripe
**Archivo**: `apps/web/src/app/api/webhooks/stripe/route.ts`

**Problema actual**: El webhook solo maneja `checkout.session.completed`, no `payment_intent.succeeded`

**Solución**: Agregar más eventos

En Stripe Dashboard:
1. Ir a Developers → Webhooks
2. Editar endpoint `https://coffeebunncafe.com/api/webhooks/stripe`
3. Agregar eventos:
   - ✅ `checkout.session.completed`
   - ✅ `payment_intent.payment_failed` (NEW)
   - ✅ `charge.refunded` (NEW)

**Expandir webhook handler** (después de línea 45):

```typescript
  if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent
    const metadata = paymentIntent.metadata ?? {}

    if (metadata.orderId) {
      // Marcar pago como fallido
      await db.payment.updateMany({
        where: {
          orderId: metadata.orderId,
          status: 'pending'
        },
        data: {
          status: 'failed',
        }
      })

      // Notificar a Lorena
      const order = await db.order.findUnique({
        where: { id: metadata.orderId },
        include: { customer: true }
      })

      if (order) {
        await notifyLorenaPayment({
          companyName: order.customer.companyName,
          orderCode: order.orderCode,
          amount: (paymentIntent.amount ?? 0) / 100,
          type: metadata.type || 'full',
          status: 'FAILED',
        })
      }
    }
  }

  if (event.type === 'charge.refunded') {
    const charge = event.data.object as Stripe.Charge
    const paymentIntentId = charge.payment_intent as string

    // Encontrar pago por payment intent
    const payment = await db.payment.findUnique({
      where: { stripePaymentId: paymentIntentId }
    })

    if (payment) {
      await db.payment.update({
        where: { id: payment.id },
        data: { status: 'refunded' }
      })
    }
  }
```

### 3.2 Mejorar webhooks de MercadoPago
**Archivo**: `apps/web/src/app/api/webhooks/mercadopago/route.ts`

**Problema**: Campo `stripePaymentId` usado para guardar MercadoPago ID

**Solución** (para futuro, no crítico ahora):
```typescript
// Renombrar a campo genérico (próxima migración de BD):
// stripePaymentId → externalPaymentId
// processor: 'mercadopago' | 'stripe'
```

Por ahora, dejar como está.

### 3.3 Agregar logging centralizado
**Archivo**: Crear `apps/web/src/lib/payment-logger.ts`

```typescript
import { db } from './db'

export async function logPaymentEvent(event: {
  paymentId?: string
  orderId?: string
  type: 'checkout' | 'webhook' | 'error'
  status: string
  method?: string
  amount?: number
  message?: string
}) {
  console.log('[PAYMENT EVENT]', {
    timestamp: new Date().toISOString(),
    ...event,
  })

  // Opcional: guardar en BD para auditoría
  // await db.auditLog.create({ ... })
}
```

---

## PHASE 4: Crear Reportes (30 min) ⭐ NICE TO HAVE

### Objetivo
Ver ingresos por período, método de pago, etc.

### 4.1 Crear página de Reportes
**Archivo**: Crear `apps/web/src/app/admin/(protected)/sales/reports/page.tsx`

```typescript
'use client'
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function ReportsPage() {
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month')

  // Agregar logic de filtros y gráficos aquí
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reportes</h1>
      </div>

      <div className="flex gap-2">
        {(['week', 'month', 'quarter', 'year'] as const).map(p => (
          <Button
            key={p}
            variant={period === p ? 'default' : 'outline'}
            onClick={() => setPeriod(p)}
            className="capitalize"
          >
            {p === 'week' ? 'Última semana' : 
             p === 'month' ? 'Este mes' :
             p === 'quarter' ? 'Este trimestre' :
             'Este año'}
          </Button>
        ))}
      </div>

      {/* Agregar gráficos con Recharts o similar */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">
          Ingresos {period === 'week' ? 'última semana' : 'este ' + period}
        </h2>
        <p className="text-muted-foreground">Gráfico aquí...</p>
      </div>
    </div>
  )
}
```

---

## 🔄 Orden de Implementación

### Day 1 (3 horas)

**Morning (30 min)**:
```bash
1. ✅ PHASE 1: Crear db-helpers.ts
2. ✅ PHASE 1: Refactorizar single-checkout
3. ✅ PHASE 1: Test local + Railway
```

**Midday (45 min)**:
```bash
4. ✅ PHASE 2: Extender dashboard
5. ✅ PHASE 2: Crear página de pagos
6. ✅ Test en navegador
```

**Afternoon (45 min)**:
```bash
7. ✅ PHASE 3: Registrar webhooks en Stripe
8. ✅ PHASE 3: Expandir webhook handler
9. ✅ Test webhook (compra de prueba)
```

**Optional (30 min)**:
```bash
10. ⭐ PHASE 4: Crear página de reportes
```

---

## 📊 Estado Esperado Después de Implementación

### Admin Dashboard
```
┌─────────────────────────────────────────────┐
│ Buenos días ☕                               │
├─────────────────────────────────────────────┤
│ ┌──────────────┐  ┌──────────────┐          │
│ │ $45,230 MXN  │  │ 8 pendientes │          │
│ │ Ingresos     │  │ Pagos        │          │
│ └──────────────┘  └──────────────┘          │
│                                              │
│ ┌──────────────┐  ┌──────────────┐          │
│ │ 12 leads     │  │ 5 pedidos    │          │
│ │ Abiertos     │  │ En proceso   │          │
│ └──────────────┘  └──────────────┘          │
│                                              │
│ Pagos por método:                           │
│ • Stripe:      $25,500 (15 transacciones) │
│ • MercadoPago: $19,730 (8 transacciones)  │
└─────────────────────────────────────────────┘
```

### Página de Pagos
```
┌─────────────────────────────────────────────┐
│ Pagos (47 transacciones)                    │
├─────────────────────────────────────────────┤
│ CBC-2025-001  │ ABC Corp    │ $5,000 │...  │
│ CBC-S-0045    │ XYZ Ltd     │ $2,100 │...  │
│ CBC-2025-002  │ 123 Inc     │ $8,500 │...  │
│ ...                                         │
└─────────────────────────────────────────────┘
```

---

## ✅ Validación Checklist

### PHASE 1
- [ ] `db-helpers.ts` creado con `getOrCreateCustomer()`
- [ ] `single-checkout` usa helper (no `db.customer.create()`)
- [ ] Test local: compra 2× mismo WhatsApp = ✅
- [ ] Test Railway: compra 2× mismo WhatsApp = ✅
- [ ] BD: sin duplicados de whatsapp

### PHASE 2
- [ ] Dashboard muestra ingresos pagados este mes
- [ ] Dashboard muestra pagos pendientes
- [ ] Dashboard muestra desglose por método
- [ ] Página `/admin/sales/payments` existe
- [ ] Página de pagos muestra todas las transacciones

### PHASE 3
- [ ] Webhook de Stripe registrado con eventos correctos
- [ ] Webhook handler expande para `payment_intent.payment_failed`
- [ ] Test webhook: realizar pago de prueba, aparece en admin
- [ ] Logs de pago funcionales

### PHASE 4
- [ ] Página de reportes creada
- [ ] Filtros por período funcionan
- [ ] Gráficos muestran ingresos (OPCIONAL)

---

## 🚀 Deployment

```bash
# Commit PHASE 1
git add apps/web/src/lib/db-helpers.ts apps/web/src/app/api/single-checkout/route.ts
git commit -m "fix: implement getOrCreateCustomer to prevent duplicate whatsapp errors"
git push origin main

# Commit PHASE 2
git add apps/web/src/app/admin/\(protected\)/dashboard/page.tsx
git add apps/web/src/app/admin/\(protected\)/sales/payments/page.tsx
git commit -m "feat: add payments dashboard and payment tracking page"
git push origin main

# Commit PHASE 3
git add apps/web/src/app/api/webhooks/stripe/route.ts
git commit -m "feat: expand stripe webhook handlers for payment failures and refunds"
git push origin main

# Railway auto-deploya en cada push
```

---

## 🔒 Seguridad & Best Practices

### Stripe API Key
- [ ] Verificar es `sk_test_` antes de go-live
- [ ] NO commit de keys en código (usar `.env`)
- [ ] Rotar keys regularmente

### Webhook Secret
- [ ] Verificar firma con `stripe.webhooks.constructEvent()`
- [ ] Validar metadata
- [ ] Logging de eventos sospechosos

### BD
- [ ] No exponer IDs directamente en URLs (usar Next.js server-side)
- [ ] Validar permisos en admin (solo Lorena)
- [ ] Auditar cambios de payment status

---

## 📝 Documentación Necesaria

Actualizar en el repo:
- [ ] README.md: explicar flujo de pagos
- [ ] DEPLOYMENT.md: claves de Stripe
- [ ] MONITORING.md: qué ver en admin para detectar problemas

---

## 🐛 Troubleshooting

### "Unique constraint error" después de deploy
```bash
git pull origin main
cd apps/web && pnpm install
# Restart en Railway o dev server
```

### Webhook no dispara
```bash
# 1. Verificar webhook en Stripe Dashboard
# 2. Verificar logs en Railway → Logs
# 3. Hacer test payment en Stripe
```

### Dashboard no muestra pagos
```bash
# 1. Verificar BD tiene payments
select * from "Payment" order by "createdAt" desc limit 5;
# 2. Verificar query en dashboard
# 3. Hardcodo datos de test
```

---

**Próximo paso**: ¿Implementamos PHASE 1 ahora?

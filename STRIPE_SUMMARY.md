# Stripe Payment Audit — Summary

## Problem

**Error**: `Unique constraint failed on the fields: (whatsapp)`

**When**: Customer tries to buy the same product twice

**Root Cause**: `/api/single-checkout` creates a NEW Customer every time, without checking if one already exists with the same WhatsApp

**File**: `apps/web/src/app/api/single-checkout/route.ts` (line 28-35)

```typescript
// ❌ WRONG: Creates customer without checking if exists
const customer = await db.customer.create({
  data: {
    companyName: body.name,
    contactName: body.name,
    email: body.email || null,
    whatsapp: body.whatsapp,  // ← If WhatsApp already exists → CRASH
  },
})
```

---

## Solution

Create a helper that checks if customer exists first:

```typescript
// ✅ CORRECT: Reuse existing customer
const customer = await getOrCreateCustomer({
  whatsapp: body.whatsapp,
  email: body.email,
  companyName: body.name,
  contactName: body.name,
})
```

---

## Implementation

3 simple files to change:

1. **Create**: `apps/web/src/lib/db-helpers.ts` (new helper function)
2. **Edit**: `apps/web/src/app/api/single-checkout/route.ts` (use helper + better errors)
3. **Test**: Buy 2× with same WhatsApp → should work ✓

**Time**: 30 minutes  
**Risk**: Low (only adds a search before create)

---

## Current System Status

### Payment Processors
- **Single Checkout**: MercadoPago (compra rápida)
- **Orders**: Stripe (órdenes B2B)
- **Mix**: Confusing, not unified

### Database Issues
- ✓ Schema is correct (`whatsapp @unique`)
- ✗ No check before creating customer
- ✗ Stripe customer IDs not always saved locally
- ✗ Payment records use wrong field names (`stripePaymentId` for MercadoPago)

### Stripe Integration Status
- ✓ Webhook configured (`checkout.session.completed`)
- ✗ Could improve with search by email (if Stripe ID lost)
- ✗ Payment method optimization (currently payment links, not checkout)
- ✗ Missing: `payment_intent.payment_failed` handler

---

## Deliverables

### 1. STRIPE_AUDIT.md (Full Audit)
Detailed analysis of:
- Problem root cause
- Database schema review
- Payment flow analysis
- Stripe integration gaps
- 7 actionable phases
- SQL queries for validation

### 2. STRIPE_FIX_IMPLEMENTATION.md (Step-by-Step)
Ready-to-copy code for:
- Helper function
- Updated checkout endpoint
- Better error handling
- Test steps
- Rollback plan

### 3. This Summary
Quick overview for decision-makers

---

## Next Steps

### Immediate (Today)
- [ ] Review this summary with Tuyo
- [ ] Decide on timeline

### Short-term (This week)
- [ ] Implement fix (PHASE 1)
- [ ] Test in staging
- [ ] Deploy to production

### Medium-term (Next 2 weeks)
- [ ] Improve Stripe sync (PHASE 2)
- [ ] Unify to single payment processor

---

## Go / No-Go for Production

### Current State: 🔴 BLOCKED
- Customers can't buy 2×
- Error message confuses users
- Risk: Lost sales

### After PHASE 1: 🟡 PARTIAL
- Customers can buy 2×
- Single checkout improved
- Still 2 payment processors (MercadoPago + Stripe)

### After PHASE 2: 🟢 READY
- Unified payment system
- Stripe fully integrated
- Production-ready

---

## Architecture Decision

**Question**: Should we unify to Stripe (vs keeping MercadoPago)?

**Recommendation**: Yes, migrate to Stripe
- Cleaner integration
- Better customer management
- Webhook is already ready
- Supports OXXO + credit card

**Timeline**: After PHASE 1 passes tests

---

**Repository**: github.com/...
**Documents**: 
- STRIPE_AUDIT.md (comprehensive)
- STRIPE_FIX_IMPLEMENTATION.md (actionable)
- STRIPE_SUMMARY.md (this file)

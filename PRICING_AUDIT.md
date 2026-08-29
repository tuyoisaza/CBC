# Pricing System Audit

## Issues Found

### 1. Missing `/api/quote/calculate` Endpoint
- The CotizadorWizard calls this endpoint but it doesn't exist
- This causes price calculations to fail silently in the quotation wizard
- Result: Quotation page shows incorrect/no prices

### 2. Inconsistent Pricing Models
- **Single Purchase**: base_price → marked_up_price → price_with_tax
- **Bulk Order (Quotation)**: method.unitPrice (unclear if includes tax)
- **Admin**: No clear pricing display/management

### 3. Price Display Inconsistency
- Product page: Shows price with tax ✓
- Homepage: Shows price with tax ✓
- Quotation page: Shows prices WITHOUT tax (for methods) ❌
- Admin: No pricing UI visible

### 4. Quotation Calculation Logic Missing
- What is the base price for methods in quotation?
- Does method.unitPrice include tax or not?
- How are discounts, shipping, rush fees calculated?
- What's the final formula?

## Data Model

### Product (Single Purchase)
```
base_price (from DB)
  ↓ apply markup %
marked_up_price
  ↓ apply 16% tax
final_price_with_tax
```

### Method (Bulk Order in Quotation)
```
unitPrice (from DB) — ambiguous: with or without tax?
  ↓ qty
subtotal
  ↓ add shipping, rush fee, etc.
  ↓ apply 16% tax
total
```

## Required Fixes

1. **Create `/api/quote/calculate` endpoint**
   - Takes: items[], extras[], shippingZoneId, rush
   - Returns: subtotal, tax, total, etc.
   - Ensures tax is applied consistently

2. **Clarify method.unitPrice semantics**
   - Should it include tax or not?
   - Update all method prices in DB if needed
   - Document in code

3. **Add admin pricing management**
   - Product base prices
   - Method unit prices
   - Display with tax for clarity

4. **Test pricing across all flows**
   - Single product purchase
   - Quotation with one method
   - Quotation with multiple methods + extras + shipping
   - Verify tax calculation at each step

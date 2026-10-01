import { z } from 'zod'

export const quoteSelectionSchema = z.object({
  items: z.array(z.object({ methodId: z.string().min(1), qty: z.number().int().positive() })).min(1),
  extras: z.array(z.object({ extraId: z.string().min(1), qty: z.number().int().positive() })).default([]),
  shippingZoneId: z.string().min(1),
  deliveryDate: z.string().optional(),
  rush: z.boolean(),
})

/** Rebuild quote prices and line descriptions from current server-side catalog data. */
export async function calculateQuoteForSave(db: any, input: z.infer<typeof quoteSelectionSchema>) {
  const methodIds = input.items.map((item) => item.methodId)
  const extraIds = input.extras.map((item) => item.extraId)
  const [methods, extras, zone, discounts, settings] = await Promise.all([
    db.method.findMany({ where: { id: { in: methodIds }, active: true } }),
    db.extra.findMany({ where: { id: { in: extraIds }, active: true } }),
    db.shippingZone.findFirst({ where: { id: input.shippingZoneId, active: true, name: { in: ['CDMX / Área Metropolitana', 'Recolección (sin envío)'] } } }),
    db.volumeDiscount.findMany({ orderBy: { minQty: 'asc' } }),
    db.setting.findMany({ where: { key: { in: ['MIN_QTY_PER_METHOD', 'MIN_PRODUCTION_DAYS', 'RUSH_MIN_PRODUCTION_DAYS', 'RUSH_FEE_PCT', 'ADVANCE_PCT', 'IVA_PCT', 'wholesale_markup_pct'] } } }),
  ])
  const methodMap = new Map(methods.map((row: any) => [row.id, row]))
  const extraMap = new Map(extras.map((row: any) => [row.id, row]))
  if (input.items.some((item) => !methodMap.has(item.methodId))) throw new Error('Invalid or inactive method')
  if (input.extras.some((item) => !extraMap.has(item.extraId))) throw new Error('Invalid or inactive extra')
  if (!zone || !zone.active || !['CDMX / Área Metropolitana', 'Recolección (sin envío)'].includes(zone.name)) throw new Error('Invalid or inactive shipping zone')
  if (input.rush && input.extras.some((item) => !(extraMap.get(item.extraId) as any).allowedForRush)) {
    throw new Error('An extra is not allowed for rush orders')
  }

  const config = Object.fromEntries(settings.map((s: any) => [s.key, s.value])) as Record<string, string>
  const numberSetting = (key: string, fallback: number) => {
    const parsed = Number(config[key] ?? fallback)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  const minQty = numberSetting('MIN_QTY_PER_METHOD', 10)
  if (input.items.some((item) => item.qty < minQty)) throw new Error(`Each method requires at least ${minQty} units`)

  if (input.deliveryDate) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.deliveryDate)
    if (!match) throw new Error('Invalid delivery date')
    const requested = new Date(`${input.deliveryDate}T00:00:00.000Z`)
    if (!Number.isFinite(requested.getTime()) || requested.toISOString().slice(0, 10) !== input.deliveryDate) throw new Error('Invalid delivery date')
    const todayParts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
    const todayDate = `${todayParts.find((part) => part.type === 'year')!.value}-${todayParts.find((part) => part.type === 'month')!.value}-${todayParts.find((part) => part.type === 'day')!.value}`
    const todayUtc = new Date(`${todayDate}T00:00:00.000Z`).getTime()
    const minimumDays = numberSetting(input.rush ? 'RUSH_MIN_PRODUCTION_DAYS' : 'MIN_PRODUCTION_DAYS', input.rush ? 5 : 15)
    const minDate = todayUtc + minimumDays * 86400000
    if (requested.getTime() < minDate) throw new Error(input.rush ? 'Rush delivery requires at least 5 days' : 'Normal delivery requires at least 15 days')
  }

  const markup = numberSetting('wholesale_markup_pct', 0)
  const price = (base: number) => base * (1 + markup / 100)
  const subtotal = input.items.reduce((sum, item) => sum + price((methodMap.get(item.methodId) as any).unitPrice) * item.qty, 0)
  const totalUnits = input.items.reduce((sum, item) => sum + item.qty, 0)
  const tier = discounts.filter((d: any) => d.minQty <= totalUnits && (d.maxQty === null || d.maxQty >= totalUnits)).at(-1)
  const discountPct = tier?.discountPct ?? 0
  const discount = subtotal * discountPct / 100
  const extrasTotal = input.extras.reduce((sum, item) => sum + price((extraMap.get(item.extraId) as any).unitPrice) * item.qty, 0)
  const shippingFee = zone.name === 'CDMX / Área Metropolitana' && totalUnits >= 15
    ? 0
    : zone.baseFee + zone.feePerUnit * totalUnits
  const rushFee = input.rush ? (subtotal - discount) * numberSetting('RUSH_FEE_PCT', 40) / 100 : 0
  const iva = (subtotal - discount + extrasTotal + shippingFee + rushFee) * numberSetting('IVA_PCT', 16) / 100
  const total = subtotal - discount + extrasTotal + shippingFee + rushFee + iva
  const advancePct = numberSetting('ADVANCE_PCT', 50)
  const advanceAmount = total * advancePct / 100

  return {
    items: input.items.map((item) => {
      const method = methodMap.get(item.methodId) as any
      const unitPrice = method.unitPrice
      return { methodId: method.id, methodName: method.name, qty: item.qty, unitPrice, lineTotal: unitPrice * item.qty }
    }),
    extras: input.extras.map((item) => {
      const extra = extraMap.get(item.extraId) as any
      const unitPrice = price(extra.unitPrice)
      return { extraId: extra.id, name: extra.name, qty: item.qty, unitPrice, lineTotal: unitPrice * item.qty }
    }),
    shippingZoneId: zone.id,
    deliveryDate: input.deliveryDate ? new Date(`${input.deliveryDate}T00:00:00.000Z`) : null,
    rush: input.rush,
    subtotal, discount, discountPct, extrasTotal, shippingFee, rushFee, iva, total, advancePct, advanceAmount,
  }
}

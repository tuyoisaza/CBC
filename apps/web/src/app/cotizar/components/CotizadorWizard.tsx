'use client'

import { useState, useEffect, useCallback } from 'react'
import { Check, ChevronLeft, ChevronRight, Plus, X, Package, Sparkles, Truck, FileText, CheckCircle, Minus } from 'lucide-react'
import { catalogImages, saleUnit, requestedQuantity, deliveryDateAfter } from '@/lib/extra-catalog'
import { submitQuote } from '../actions/submitQuote'

interface Method {
  id: string; name: string; unitPrice: number; imageUrl?: string | null
}
interface Extra {
  id: string; name: string; unitPrice: number; imageUrl?: string | null; images?: string[]; description?: string | null; shortDescription?: string | null; slug?: string | null; unitLabel?: string; unitsPerPack?: number; minQty?: number; sellableStandalone?: boolean; allowedForRush?: boolean
}
interface ShippingZone {
  id: string; name: string; baseFee: number; feePerUnit: number
}
interface VolumeDiscount {
  minQty: number; maxQty: number | null; discountPct: number
}
interface Product {
  id: string; slug: string; name: string; subtitle: string | null; price: number; images: string[]; methodId: string | null
}
interface CalcResult {
  subtotal: number; discount: number; discountPct: number; extrasTotal: number
  shippingFee: number; rushFee: number; iva: number; total: number
  advancePct: number; advanceAmount: number
}

interface WizardProps {
  methods: Method[]
  extras: Extra[]
  shippingZones: ShippingZone[]
  volumeDiscounts: VolumeDiscount[]
  products: Product[]
  settings: Record<string, string>
  preselectedExtra?: string
  preselectedMethod?: string
  initialQuantity?: number
  preselectedProduct?: string
}

interface QuoteItem {
  methodId: string
  methodName: string
  qty: number
  unitPrice: number
  lineTotal: number
}

interface QuoteExtra {
  extraId: string
  name: string
  qty: number
  unitPrice: number
  lineTotal: number
}

const fmt = (n: number) => '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const isValidEmail = (v: string) => EMAIL_RE.test(v.trim())
// Accepts an optional leading + plus 10–15 digits (spaces/dashes/parens stripped).
const isValidWhatsapp = (v: string) => {
  const digits = v.replace(/[^\d]/g, '')
  return digits.length >= 10 && digits.length <= 15
}

const TAX_RATE = 0.16 // 16% IVA

// Single-purchase retail price: base + markup + tax (matches homepage / product page)
const calcPriceWithTax = (basePrice: number, markupPct: number) => {
  const withMarkup = Math.round(basePrice * (1 + markupPct / 100) * 100) / 100
  return Math.round(withMarkup * (1 + TAX_RATE) * 100) / 100
}

// Bulk/wholesale display price: base + configurable wholesale markup + tax.
// Mirrors exactly what /api/quote/calculate computes server-side, so the unit
// price shown here always matches the real subtotal math (just for display —
// items[].unitPrice in state always stays the raw base rate).
const wholesalePrice = (basePrice: number, wholesaleMarkupPct: number, ivaPct: number) => {
  const withMarkup = basePrice * (1 + wholesaleMarkupPct / 100)
  return Math.round(withMarkup * (1 + ivaPct / 100) * 100) / 100
}

const STEPS = [
  { id: 0, label: 'Productos', icon: Package },
  { id: 1, label: 'Accesorios y extras', icon: Sparkles },
  { id: 2, label: 'Envío', icon: Truck },
  { id: 3, label: 'Resumen', icon: FileText },
  { id: 4, label: 'Listo', icon: CheckCircle },
]

export function CotizadorWizard({ methods, extras, shippingZones, volumeDiscounts, products, settings, preselectedProduct, preselectedExtra, preselectedMethod, initialQuantity }: WizardProps) {
  const minQty = Number(settings.MIN_QTY_PER_METHOD ?? 10)
  const markupPct = Number(settings.SINGLE_PURCHASE_MARKUP_PCT ?? 20)
  const wholesaleMarkupPct = Number(settings.WHOLESALE_MARKUP_PCT ?? 0)
  const ivaPct = Number(settings.IVA_PCT ?? 16)
  const tiers = [...volumeDiscounts].sort((a, b) => a.minQty - b.minQty)

  const [step, setStep] = useState(preselectedExtra && extras.find(extra => extra.id === preselectedExtra)?.sellableStandalone !== false ? 1 : 0)
  const [lightbox, setLightbox] = useState<string | null>(null)

  // Clickable thumbnail — opens the image full-size in an overlay.
  const thumb = (src: string, cls: string) => (
    <button
      type="button"
      onClick={() => setLightbox(src)}
      className={`shrink-0 overflow-hidden rounded-md border border-gray-700 cursor-zoom-in transition-opacity hover:opacity-80 ${cls}`}
      aria-label="Ver imagen más grande"
    >
      <img src={src} alt="" className="h-full w-full object-cover" />
    </button>
  )
  // Item unitPrice/lineTotal are always the raw wholesale rate (method.unitPrice) —
  // matching what /api/quote/calculate actually uses. Tax and retail markup are only
  // applied at display time, never stored in state, so numbers never drift apart.
  const [items, setItems] = useState<QuoteItem[]>(() => {
    const directMethod = methods.find(method => method.id === preselectedMethod)
    if (directMethod) {
      const qty = requestedQuantity(String(initialQuantity), minQty)
      return [{ methodId: directMethod.id, methodName: directMethod.name, qty, unitPrice: directMethod.unitPrice, lineTotal: directMethod.unitPrice * qty }]
    }
    if (preselectedProduct) {
      const prod = products.find((p) => p.slug === preselectedProduct || p.id === preselectedProduct)
      if (prod && prod.methodId) {
        const method = methods.find((m) => m.id === prod.methodId)
        if (method) {
          return [{ methodId: method.id, methodName: method.name, qty: requestedQuantity(String(initialQuantity), minQty), unitPrice: method.unitPrice, lineTotal: method.unitPrice * requestedQuantity(String(initialQuantity), minQty) }]
        }
      }
    }
    return []
  })
  const [selectedExtras, setSelectedExtras] = useState<QuoteExtra[]>(() => {
    const extra = extras.find(item => item.id === preselectedExtra)
    if (!extra) return []
    const qty = requestedQuantity(String(initialQuantity), extra.minQty ?? 1)
    return [{ extraId: extra.id, name: extra.name, qty, unitPrice: extra.unitPrice, lineTotal: extra.unitPrice * qty }]
  })
  const [shippingZoneId, setShippingZoneId] = useState(shippingZones.length > 0 ? shippingZones[0].id : '')
  const [deliveryDate, setDeliveryDate] = useState(() => deliveryDateAfter(Number(settings.MIN_PRODUCTION_DAYS ?? 15)))
  const [rush, setRush] = useState(false)
  const rushExtras = extras.filter((extra) => !rush || extra.allowedForRush !== false)
  const minDeliveryDateString = deliveryDateAfter(Number(rush ? settings.RUSH_MIN_PRODUCTION_DAYS ?? 5 : settings.MIN_PRODUCTION_DAYS ?? 15))
  const [companyName, setCompanyName] = useState('')
  const [contactName, setContactName] = useState('')
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [calc, setCalc] = useState<CalcResult | null>(null)
  const [calcLoading, setCalcLoading] = useState(false)
  const [calcError, setCalcError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [result, setResult] = useState<{ quoteId: string; quoteCode: string } | null>(null)

  // Volume discount is keyed off the TOTAL units across every method in the
  // order — same rule as /api/quote/calculate. Recomputed live as qty changes.
  const totalUnits = items.reduce((s, i) => s + i.qty, 0)
  const currentTier = tiers
    .filter((d) => d.minQty <= totalUnits && (d.maxQty == null || d.maxQty >= totalUnits))
    .at(-1) ?? null
  const nextTier = tiers.find((d) => d.minQty > totalUnits) ?? null

  const calcPayload = useCallback(() => {
    return {
      items: items.map((i) => ({ methodId: i.methodId, qty: i.qty })),
      extras: selectedExtras.map((e) => ({ extraId: e.extraId, qty: e.qty })),
      shippingZoneId,
      deliveryDate: deliveryDate || undefined,
      rush,
    }
  }, [items, selectedExtras, shippingZoneId, rush, deliveryDate])

  useEffect(() => {
    let current = true
    const controller = new AbortController()
    setCalc(null); setCalcError('')
    if ((!items.length && !selectedExtras.length) || !shippingZoneId) { setCalcLoading(false); return }
    setCalcLoading(true)
    fetch('/api/quote/calculate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(calcPayload()), signal: controller.signal,
    })
      .then(async response => {
        const data = await response.json()
        if (response.ok === false || data.error) throw new Error(data.error || 'No se pudo calcular la cotización.')
        if (current) setCalc(data)
      })
      .catch(error => { if (current) setCalcError(error instanceof Error ? error.message : 'Error al calcular.') })
      .finally(() => { if (current) setCalcLoading(false) })
    return () => { current = false; controller.abort() }
  }, [calcPayload])

  function addItem() {
    const method = methods.find(candidate => !items.some(item => item.methodId === candidate.id))
    if (!method) {
      if (items[0]) updateItem(0, 'qty', items[0].qty + minQty)
      return
    }
    setItems([...items, { methodId: method.id, methodName: method.name, qty: minQty, unitPrice: method.unitPrice, lineTotal: method.unitPrice * minQty }])
  }

  function removeItem(i: number) {
    setItems(items.filter((_, idx) => idx !== i))
  }

  function updateItem(i: number, field: 'methodId' | 'qty', value: string | number) {
    const copy = [...items]
    if (field === 'methodId') {
      const existing = copy.findIndex((item, index) => index !== i && item.methodId === value)
      if (existing >= 0) {
        copy[existing] = { ...copy[existing], qty: copy[existing].qty + copy[i].qty }
        copy[existing].lineTotal = copy[existing].unitPrice * copy[existing].qty
        setItems(copy.filter((_, index) => index !== i))
        return
      }
      const method = methods.find((m) => m.id === value)
      if (method) {
        copy[i] = { ...copy[i], methodId: method.id, methodName: method.name, unitPrice: method.unitPrice, lineTotal: method.unitPrice * copy[i].qty }
      }
    } else {
      copy[i] = { ...copy[i], qty: value as number, lineTotal: copy[i].unitPrice * (value as number) }
    }
    setItems(copy)
  }

  function toggleExtra(extra: Extra) {
    const existing = selectedExtras.find((e) => e.extraId === extra.id)
    if (existing) {
      setSelectedExtras(selectedExtras.filter((e) => e.extraId !== extra.id))
    } else {
      setSelectedExtras([...selectedExtras, { extraId: extra.id, name: extra.name, qty: extra.minQty ?? 1, unitPrice: extra.unitPrice, lineTotal: extra.unitPrice * (extra.minQty ?? 1) }])
    }
  }

  function toggleRush(enabled: boolean) {
    setRush(enabled)
    if (enabled) {
      const removed = selectedExtras.filter((extra) => extras.find((item) => item.id === extra.extraId)?.allowedForRush === false)
      if (removed.length) {
        setSelectedExtras((current) => current.filter((extra) => !removed.some((item) => item.extraId === extra.extraId)))
        window.alert('Se quitaron los complementos no disponibles para pedidos urgentes.')
      }
    }
    const nextMinimumString = deliveryDateAfter(Number(enabled ? settings.RUSH_MIN_PRODUCTION_DAYS ?? 5 : settings.MIN_PRODUCTION_DAYS ?? 15))
    if (!deliveryDate || deliveryDate < nextMinimumString) setDeliveryDate(nextMinimumString)
  }

  function updateExtraQty(extraId: string, qty: number) {
    setSelectedExtras(selectedExtras.map((e) => e.extraId === extraId ? { ...e, qty, lineTotal: e.unitPrice * qty } : e))
  }

  const validSelection = (items.length > 0 || selectedExtras.length > 0)
    && items.every(item => Number.isSafeInteger(item.qty) && item.qty >= minQty && item.qty <= 100000)
    && selectedExtras.every(item => {
      const extra = extras.find(candidate => candidate.id === item.extraId)
      return !!extra && Number.isSafeInteger(item.qty) && item.qty >= (extra.minQty ?? 1) && item.qty <= 100000
        && (items.length > 0 || extra.sellableStandalone !== false) && (!rush || extra.allowedForRush !== false)
    })
  const canContinue = (() => {
    if (step === 0) return items.every(item => item.qty >= minQty && item.qty <= 100000)
    if (step === 1) return validSelection
    if (step === 2) return validSelection && !!shippingZoneId && !!deliveryDate && deliveryDate >= minDeliveryDateString
    if (step === 3) return validSelection && !!(companyName.trim() && contactName.trim() && isValidEmail(email) && isValidWhatsapp(whatsapp))
    return true
  })()

  async function handleSubmit() {
    if (!calc || calcLoading || calcError || !validSelection) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await submitQuote({
        companyName,
        contactName,
        email,
        whatsapp,
        items: items.map(({ methodId, qty }) => ({ methodId, qty })),
        extras: selectedExtras.map(({ extraId, qty }) => ({ extraId, qty })),
        shippingZoneId,
        deliveryDate: deliveryDate || undefined,
        rush,
      })
      setResult(res)
      setStep(4)
    } catch (err: any) {
      setSubmitError(err.message || 'Error al enviar cotización')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 shadow-xl">
      {/* Steps indicator */}
      <div className="flex items-center justify-center gap-0 border-b border-gray-800 px-6 py-4">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              i === step ? 'bg-cbc-yellow/20 text-cbc-yellow' : i < step ? 'text-green-400' : 'text-gray-500'
            }`}>
              {i < step ? <Check className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && <div className="w-6 h-px bg-gray-700 mx-1" />}
          </div>
        ))}
      </div>

      <div className="p-6 sm:p-8">
        {calcError && <p role="alert" className="mb-4 rounded-lg border border-red-800 p-3 text-sm text-red-300">{calcError}</p>}
        {step < 4 && (
          <h2 className="text-xl font-bold text-cbc-cream mb-6">{STEPS[step].label}</h2>
        )}

        {/* Step 0: Products */}
        {step === 0 && (
          <div className="space-y-6">
            <div className="rounded-lg border border-gray-700 p-4 text-sm text-gray-300">
              <p>¿Solo necesitas filtros, accesorios o piezas sueltas?</p>
              <button type="button" onClick={() => setStep(1)} className="mt-2 text-cbc-yellow underline">Cotizar accesorios sin un kit</button>
            </div>
            {/* Predefined boxes */}
            {products.length > 0 && (
              <div>
                <p className="text-sm text-gray-400 mb-3">Cajas predefinidas:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {products.map((prod) => {
                    const isSelected = items.some((i) => {
                      const m = methods.find((m) => m.id === i.methodId)
                      return prod.methodId === i.methodId || (m && prod.name.toLowerCase().includes(m.name.toLowerCase()))
                    })
                    return (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => {
                          const method = methods.find((m) => m.id === prod.methodId)
                          if (!method) return
                          const existing = items.find((i) => i.methodId === method.id)
                          if (existing) {
                            removeItem(items.indexOf(existing))
                          } else {
                            setItems([...items, { methodId: method.id, methodName: method.name, qty: minQty, unitPrice: method.unitPrice, lineTotal: method.unitPrice * minQty }])
                          }
                        }}
                        className={`text-left rounded-xl border p-4 transition-colors ${
                          isSelected ? 'border-cbc-yellow bg-cbc-yellow/10' : 'border-gray-700 bg-cbc-black hover:border-gray-500'
                        }`}
                      >
                        <h3 className="font-semibold text-cbc-cream">{prod.name}</h3>
                        {prod.subtitle && <p className="text-sm text-gray-400 mt-0.5">{prod.subtitle}</p>}
                        <p className="text-sm text-cbc-yellow mt-2">{fmt(calcPriceWithTax(prod.price, markupPct))} <span className="text-gray-500 text-xs">precio unitario (con IVA)</span></p>
                      </button>
                    )
                  })}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Precio de pieza única con IVA. Para pedidos de {minQty}+ cajas usa el pedido personalizado: precio de mayoreo y descuento por volumen.
                </p>
              </div>
            )}

            {/* Custom items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-400">Pedido personalizado:</p>
                <button type="button" onClick={addItem}
                  className="flex items-center gap-1 text-sm text-cbc-yellow hover:underline">
                  <Plus className="h-3.5 w-3.5" /> Agregar método
                </button>
              </div>

              {items.length === 0 && (
                <p className="text-sm text-gray-500 py-4 text-center">Selecciona una caja o agrega métodos para comenzar.</p>
              )}

              <div className="space-y-3">
                {items.map((item, i) => {
                  const itemMethod = methods.find((m) => m.id === item.methodId)
                  return (
                  <div key={i} className="flex items-center gap-3 rounded-xl border border-gray-700 bg-cbc-black p-3">
                    {itemMethod?.imageUrl && thumb(itemMethod.imageUrl, 'h-10 w-10')}
                    <select value={item.methodId} onChange={(e) => updateItem(i, 'methodId', e.target.value)}
                      className="flex-1 bg-cbc-black border border-gray-700 rounded-md px-3 py-2 text-white text-sm focus:ring-2 focus:ring-cbc-yellow focus:border-transparent outline-none">
                      {methods.map((m) => (
                        <option key={m.id} value={m.id}>{m.name} — {fmt(wholesalePrice(m.unitPrice, wholesaleMarkupPct, ivaPct))} c/u mayoreo (con IVA)</option>
                      ))}
                    </select>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => updateItem(i, 'qty', Math.max(minQty, item.qty - 1))}
                        className="p-1.5 text-gray-400 hover:text-cbc-cream transition-colors">
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="text-white font-medium w-8 text-center text-sm">{item.qty}</span>
                      <button type="button" onClick={() => updateItem(i, 'qty', item.qty + 1)}
                        className="p-1.5 text-gray-400 hover:text-cbc-cream transition-colors">
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <span className="text-sm text-cbc-yellow w-24 text-right">{fmt(wholesalePrice(item.unitPrice, wholesaleMarkupPct, ivaPct) * item.qty)}</span>
                    <button type="button" onClick={() => removeItem(i)}
                      className="p-1.5 text-gray-500 hover:text-red-400 transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  )
                })}
              </div>

              <p className="text-xs text-gray-500 mt-2">Mínimo {minQty} unidades por método.</p>

              {items.length > 0 && tiers.length > 0 && (
                <div className="mt-3 rounded-lg border border-gray-800 bg-cbc-black/60 p-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-gray-400">{totalUnits} {totalUnits === 1 ? 'unidad' : 'unidades'} en total</span>
                    {currentTier ? (
                      <span className="text-green-400 font-medium">✓ {currentTier.discountPct}% de descuento por volumen</span>
                    ) : (
                      <span className="text-gray-500">Sin descuento por volumen todavía</span>
                    )}
                  </div>
                  {currentTier && (
                    <p className="text-gray-500 mt-1">
                      Aplica a pedidos de {currentTier.minQty}+ unidades{currentTier.maxQty ? ` (hasta ${currentTier.maxQty})` : ''}. Se resta del subtotal en el resumen.
                    </p>
                  )}
                  {nextTier && (
                    <p className="text-cbc-yellow/80 mt-1">
                      Sube a {nextTier.minQty}+ unidades para {nextTier.discountPct}% de descuento.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 1: Extras */}
        {step === 1 && (
          <div className="space-y-3">
            {rushExtras.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No hay extras disponibles.</p>}
            {rushExtras.map((extra) => {
              const isSelected = selectedExtras.some((e) => e.extraId === extra.id)
              return (
                <div key={extra.id}
                  className={`flex flex-wrap items-center gap-4 rounded-xl border p-4 transition-colors ${
                    isSelected ? 'border-cbc-yellow bg-cbc-yellow/10' : 'border-gray-700 bg-cbc-black'
                  }`}>
                  <button type="button" aria-label={`Seleccionar ${extra.name}`} disabled={!items.length && extra.sellableStandalone === false && !isSelected} onClick={() => toggleExtra(extra)}
                    className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                      isSelected ? 'bg-cbc-yellow border-cbc-yellow' : 'border-gray-500'
                    }`}>
                    {isSelected && <Check className="h-3 w-3 text-black" />}
                  </button>
                  {catalogImages(extra)[0] && thumb(catalogImages(extra)[0], 'h-10 w-10')}
                  <div className="flex-1">
                    <span className="text-sm font-medium text-cbc-cream">{extra.name}</span>
                    <span className="text-xs text-gray-400 ml-2">{extra.unitPrice === 0 ? 'Gratis' : `+${fmt(wholesalePrice(extra.unitPrice, wholesaleMarkupPct, ivaPct))} c/u (con IVA)`}</span>
                    <p className="mt-1 text-xs text-gray-400">{saleUnit(extra)} · Mínimo {extra.minQty ?? 1}</p>
                    {(extra.shortDescription || extra.description) && <p className="mt-2 whitespace-pre-wrap text-xs text-gray-400">{extra.shortDescription || extra.description}</p>}
                    {!items.length && extra.sellableStandalone === false && <p className="mt-1 text-xs text-amber-300">Este complemento requiere agregar un kit.</p>}
                    {isSelected && (extra.unitsPerPack ?? 1) > 1 && <p className="mt-1 text-xs text-cbc-yellow">{selectedExtras.find(item => item.extraId === extra.id)?.qty} × {extra.unitsPerPack} = {((selectedExtras.find(item => item.extraId === extra.id)?.qty ?? 0) * (extra.unitsPerPack ?? 1)).toLocaleString('es-MX')} piezas en total</p>}
                  </div>
                  {isSelected && (
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => updateExtraQty(extra.id, Math.max(extra.minQty ?? 1, (selectedExtras.find((e) => e.extraId === extra.id)?.qty ?? 1) - 1))}
                        className="p-1 text-gray-400 hover:text-cbc-cream">
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <input type="number" aria-label={`Cantidad de ${extra.name}`} min={extra.minQty ?? 1} max={100000} step={1} value={selectedExtras.find(e => e.extraId === extra.id)?.qty || ''} onChange={event => updateExtraQty(extra.id, Number(event.target.value))} className="w-20 rounded border border-gray-700 bg-cbc-black px-2 py-1 text-center text-sm text-white" />
                      <button type="button" onClick={() => updateExtraQty(extra.id, (selectedExtras.find((e) => e.extraId === extra.id)?.qty ?? 1) + 1)}
                        className="p-1 text-gray-400 hover:text-cbc-cream">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Step 2: Delivery */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">Zona de envío</label>
              <div className="space-y-2">
                {shippingZones.map((zone) => (
                  <button
                    key={zone.id}
                    type="button"
                    onClick={() => setShippingZoneId(zone.id)}
                    className={`w-full text-left rounded-xl border p-4 transition-colors ${
                      shippingZoneId === zone.id ? 'border-cbc-yellow bg-cbc-yellow/10' : 'border-gray-700 bg-cbc-black hover:border-gray-500'
                    }`}
                  >
                    <span className="text-sm font-medium text-cbc-cream">{zone.name}</span>
                    <span className="text-xs text-gray-400 ml-2">
                      {zone.name === 'CDMX / Área Metropolitana' && totalUnits >= 15
                        ? 'Envío gratis desde 15 kits'
                        : zone.baseFee > 0 ? `Base ${fmt(zone.baseFee)} + ${fmt(zone.feePerUnit)}/unidad` : `${fmt(zone.feePerUnit)}/unidad`}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="delivery-date" className="block text-sm font-medium text-gray-300 mb-2">Fecha de entrega deseada</label>
              <input id="delivery-date" type="date" min={minDeliveryDateString} value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full bg-cbc-black border border-gray-700 rounded-md px-4 py-3 text-white focus:ring-2 focus:ring-cbc-yellow focus:border-transparent outline-none" />
              <p className="mt-2 text-xs text-gray-400">{rush ? 'Disponible desde 5 días después de realizar tu pedido. Aplican restricciones de personalización y recargo.' : 'Primera fecha disponible: 15 días después de realizar tu pedido.'}</p>
            </div>

            <div className="flex items-center gap-3">
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" checked={rush} onChange={(e) => toggleRush(e.target.checked)}
                  className="sr-only peer" />
                <div className="h-6 w-11 rounded-full bg-gray-700 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-cbc-yellow peer-checked:after:translate-x-full" />
              </label>
              <div>
                <span className="text-sm text-cbc-cream font-medium">Pedido urgente</span>
                <p className="text-xs text-gray-400">Recargo del {settings.RUSH_FEE_PCT ?? 40}% {items.length ? 'sobre el subtotal de kits con descuento' : 'sobre los accesorios'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Summary + Contact */}
        {step === 3 && (
          <div className="space-y-8">
            {/* Line-item detail */}
            <div className="rounded-xl border border-gray-700 bg-cbc-black p-5">
              <h3 className="text-sm font-semibold text-cbc-cream mb-3">Detalle de la cotización</h3>
              <div className="space-y-3">
                {items.map((item, i) => {
                  const m = methods.find((mm) => mm.id === item.methodId)
                  const unit = wholesalePrice(item.unitPrice, wholesaleMarkupPct, ivaPct)
                  return (
                    <div key={`m-${i}`} className="flex items-center gap-3">
                      {m?.imageUrl
                        ? thumb(m.imageUrl, 'h-11 w-11')
                        : <div className="h-11 w-11 rounded-md border border-gray-800 bg-gray-900 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-cbc-cream truncate">{item.methodName}</p>
                        <p className="text-xs text-gray-400">{item.qty} × {fmt(unit)} (con IVA)</p>
                      </div>
                      <span className="text-sm text-cbc-cream">{fmt(unit * item.qty)}</span>
                    </div>
                  )
                })}
                {selectedExtras.map((ex, i) => {
                  const e = extras.find((ee) => ee.id === ex.extraId)
                  const unit = wholesalePrice(ex.unitPrice, wholesaleMarkupPct, ivaPct)
                  return (
                    <div key={`e-${i}`} className="flex items-center gap-3">
                      {e && catalogImages(e)[0]
                        ? thumb(catalogImages(e)[0], 'h-11 w-11')
                        : <div className="h-11 w-11 rounded-md border border-gray-800 bg-gray-900 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-cbc-cream truncate">{ex.name}</p>
                        <p className="text-xs text-gray-400">{ex.qty} × {fmt(unit)} (con IVA) · {saleUnit(e ?? {})}</p>
                      </div>
                      <span className="text-sm text-cbc-cream">{fmt(unit * ex.qty)}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Price breakdown */}
            <div className="rounded-xl border border-gray-700 bg-cbc-black p-5">
              <h3 className="text-sm font-semibold text-cbc-cream mb-3">Resumen de precios</h3>
              {calcLoading ? (
                <p className="text-sm text-gray-400">Calculando...</p>
              ) : calc ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-300">
                    <span>Subtotal</span><span>{fmt(calc.subtotal)}</span>
                  </div>
                  {calc.discountPct > 0 && (
                    <div className="flex justify-between text-green-400">
                      <span>Descuento por volumen ({calc.discountPct}%)</span><span>-{fmt(calc.discount)}</span>
                    </div>
                  )}
                  {calc.extrasTotal > 0 && (
                    <div className="flex justify-between text-gray-300">
                      <span>Extras</span><span>{fmt(calc.extrasTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-300">
                    <span>Envío</span><span>{fmt(calc.shippingFee)}</span>
                  </div>
                  {calc.rushFee > 0 && (
                    <div className="flex justify-between text-amber-400">
                      <span>Recargo urgente</span><span>{fmt(calc.rushFee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-300">
                    <span>IVA ({ivaPct}%)</span><span>{fmt(calc.iva)}</span>
                  </div>
                  <div className="border-t border-gray-700 pt-2 flex justify-between font-bold text-cbc-cream text-base">
                    <span>Total</span><span>{fmt(calc.total)}</span>
                  </div>
                  <div className="flex justify-between text-cbc-yellow text-sm pt-1">
                    <span>Anticipo ({calc.advancePct}%)</span><span>{fmt(calc.advanceAmount)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Agrega productos para ver el precio.</p>
              )}
            </div>

            {/* Contact form */}
            <div className="rounded-xl border border-gray-700 bg-cbc-black p-5">
              <h3 className="text-sm font-semibold text-cbc-cream mb-3">Tus datos</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Empresa *</label>
                  <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required
                    className="w-full bg-cbc-black border border-gray-700 rounded-md px-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-cbc-yellow focus:border-transparent outline-none" placeholder="Tu empresa" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Nombre *</label>
                  <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} required
                    className="w-full bg-cbc-black border border-gray-700 rounded-md px-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-cbc-yellow focus:border-transparent outline-none" placeholder="Tu nombre" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Email *</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                    className={`w-full bg-cbc-black border rounded-md px-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-cbc-yellow focus:border-transparent outline-none ${
                      email.trim() && !isValidEmail(email) ? 'border-red-500' : 'border-gray-700'
                    }`} placeholder="correo@ejemplo.com" />
                  {email.trim() && !isValidEmail(email) && (
                    <p className="mt-1 text-xs text-red-400">Ingresa un correo válido, ej. nombre@dominio.com</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">WhatsApp *</label>
                  <input type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} required
                    className={`w-full bg-cbc-black border rounded-md px-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-cbc-yellow focus:border-transparent outline-none ${
                      whatsapp.trim() && !isValidWhatsapp(whatsapp) ? 'border-red-500' : 'border-gray-700'
                    }`} placeholder="+52 555 123 4567" />
                  {whatsapp.trim() && !isValidWhatsapp(whatsapp) && (
                    <p className="mt-1 text-xs text-red-400">Ingresa un número válido (10 a 15 dígitos), ej. +52 555 123 4567</p>
                  )}
                </div>
              </div>
            </div>

            {submitError && (
              <div className="rounded-lg bg-red-500/20 border border-red-500/50 px-4 py-3 text-sm text-red-400">
                {submitError}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && result && (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-500/20 mb-6">
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-cbc-cream mb-2">¡Cotización enviada!</h2>
            <p className="text-gray-400 mb-2">Tu código de cotización es:</p>
            <p className="text-3xl font-bold text-cbc-yellow mb-6">{result.quoteCode}</p>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Recibirás una confirmación en tu correo electrónico. Nos pondremos en contacto pronto para confirmar los detalles.
            </p>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      {step < 4 && (
        <div className="flex items-center justify-between border-t border-gray-800 px-6 py-4">
          <button
            type="button"
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="flex items-center gap-1 px-4 py-2 text-sm text-gray-300 hover:text-cbc-cream disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Anterior
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              disabled={!canContinue}
              className="flex items-center gap-1 rounded-lg bg-cbc-yellow text-black font-semibold px-6 py-2.5 text-sm hover:bg-cbc-yellow/90 disabled:opacity-50 transition-colors"
            >
              Siguiente <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canContinue || submitting || !calc || calcLoading || !!calcError}
              className="flex items-center gap-2 rounded-lg bg-cbc-yellow text-black font-semibold px-6 py-2.5 text-sm hover:bg-cbc-yellow/90 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Enviando...' : <Check className="h-4 w-4" />}
              {submitting ? 'Enviando...' : 'Enviar cotización'}
            </button>
          )}
        </div>
      )}

      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 cursor-zoom-out"
          role="dialog"
          aria-modal="true"
        >
          <img src={lightbox} alt="" className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain shadow-2xl" />
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  )
}

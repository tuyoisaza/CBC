'use client'

import { useState, useEffect, useCallback } from 'react'
import { Check, ChevronLeft, ChevronRight, Plus, X, Package, Sparkles, Truck, FileText, CheckCircle, Minus } from 'lucide-react'
import { submitQuote } from '../actions/submitQuote'

interface Method {
  id: string; name: string; unitPrice: number
}
interface Extra {
  id: string; name: string; unitPrice: number
}
interface ShippingZone {
  id: string; name: string; baseFee: number; feePerUnit: number
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
  products: Product[]
  settings: Record<string, string>
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

const STEPS = [
  { id: 0, label: 'Productos', icon: Package },
  { id: 1, label: 'Extras', icon: Sparkles },
  { id: 2, label: 'Envío', icon: Truck },
  { id: 3, label: 'Resumen', icon: FileText },
  { id: 4, label: 'Listo', icon: CheckCircle },
]

export function CotizadorWizard({ methods, extras, shippingZones, products, settings, preselectedProduct }: WizardProps) {
  const minQty = Number(settings.MIN_QTY_PER_METHOD ?? 10)

  const [step, setStep] = useState(0)
  const [items, setItems] = useState<QuoteItem[]>(() => {
    if (preselectedProduct) {
      const prod = products.find((p) => p.slug === preselectedProduct || p.id === preselectedProduct)
      if (prod && prod.methodId) {
        const method = methods.find((m) => m.id === prod.methodId)
        if (method) {
          return [{ methodId: method.id, methodName: method.name, qty: minQty, unitPrice: method.unitPrice, lineTotal: method.unitPrice * minQty }]
        }
      }
    }
    return []
  })
  const [selectedExtras, setSelectedExtras] = useState<QuoteExtra[]>([])
  const [shippingZoneId, setShippingZoneId] = useState(shippingZones.length > 0 ? shippingZones[0].id : '')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [rush, setRush] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const [contactName, setContactName] = useState('')
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [calc, setCalc] = useState<CalcResult | null>(null)
  const [calcLoading, setCalcLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [result, setResult] = useState<{ quoteId: string; quoteCode: string } | null>(null)

  const calcPayload = useCallback(() => {
    return {
      items: items.map((i) => ({ methodId: i.methodId, qty: i.qty })),
      extras: selectedExtras.map((e) => ({ extraId: e.extraId, qty: e.qty })),
      shippingZoneId,
      rush,
    }
  }, [items, selectedExtras, shippingZoneId, rush])

  useEffect(() => {
    if (items.length === 0 || !shippingZoneId) return
    setCalcLoading(true)
    fetch('/api/quote/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(calcPayload()),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) return
        setCalc(data)
      })
      .catch(() => {})
      .finally(() => setCalcLoading(false))
  }, [calcPayload])

  function addItem() {
    const method = methods[0]
    if (!method) return
    setItems([...items, { methodId: method.id, methodName: method.name, qty: minQty, unitPrice: method.unitPrice, lineTotal: method.unitPrice * minQty }])
  }

  function removeItem(i: number) {
    setItems(items.filter((_, idx) => idx !== i))
  }

  function updateItem(i: number, field: 'methodId' | 'qty', value: string | number) {
    const copy = [...items]
    if (field === 'methodId') {
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
      setSelectedExtras([...selectedExtras, { extraId: extra.id, name: extra.name, qty: 1, unitPrice: extra.unitPrice, lineTotal: extra.unitPrice }])
    }
  }

  function updateExtraQty(extraId: string, qty: number) {
    setSelectedExtras(selectedExtras.map((e) => e.extraId === extraId ? { ...e, qty, lineTotal: e.unitPrice * qty } : e))
  }

  const canContinue = (() => {
    if (step === 0) return items.length > 0 && items.every((i) => i.qty >= minQty)
    if (step === 3) return companyName.trim() && contactName.trim() && email.trim() && whatsapp.trim()
    return true
  })()

  async function handleSubmit() {
    if (!calc) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await submitQuote({
        companyName,
        contactName,
        email,
        whatsapp,
        items: items.map((i) => ({ ...i, lineTotal: i.unitPrice * i.qty })),
        extras: selectedExtras,
        shippingZoneId,
        deliveryDate: deliveryDate || undefined,
        rush,
        subtotal: calc.subtotal,
        discount: calc.discount,
        discountPct: calc.discountPct,
        extrasTotal: calc.extrasTotal,
        shippingFee: calc.shippingFee,
        rushFee: calc.rushFee,
        iva: calc.iva,
        total: calc.total,
        advancePct: calc.advancePct,
        advanceAmount: calc.advanceAmount,
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
        {step < 4 && (
          <h2 className="text-xl font-bold text-cbc-cream mb-6">{STEPS[step].label}</h2>
        )}

        {/* Step 0: Products */}
        {step === 0 && (
          <div className="space-y-6">
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
                        <p className="text-sm text-cbc-yellow mt-2">{fmt(prod.price)} <span className="text-gray-500">/ caja</span></p>
                      </button>
                    )
                  })}
                </div>
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
                {items.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl border border-gray-700 bg-cbc-black p-3">
                    <select value={item.methodId} onChange={(e) => updateItem(i, 'methodId', e.target.value)}
                      className="flex-1 bg-cbc-black border border-gray-700 rounded-md px-3 py-2 text-white text-sm focus:ring-2 focus:ring-cbc-yellow focus:border-transparent outline-none">
                      {methods.map((m) => (
                        <option key={m.id} value={m.id}>{m.name} — {fmt(m.unitPrice)} c/u</option>
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
                    <span className="text-sm text-cbc-yellow w-20 text-right">{fmt(item.unitPrice * item.qty)}</span>
                    <button type="button" onClick={() => removeItem(i)}
                      className="p-1.5 text-gray-500 hover:text-red-400 transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-500 mt-2">Mínimo {minQty} unidades por método.</p>
            </div>
          </div>
        )}

        {/* Step 1: Extras */}
        {step === 1 && (
          <div className="space-y-3">
            {extras.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No hay extras disponibles.</p>}
            {extras.map((extra) => {
              const isSelected = selectedExtras.some((e) => e.extraId === extra.id)
              return (
                <div key={extra.id}
                  className={`flex items-center gap-4 rounded-xl border p-4 transition-colors ${
                    isSelected ? 'border-cbc-yellow bg-cbc-yellow/10' : 'border-gray-700 bg-cbc-black'
                  }`}>
                  <button type="button" onClick={() => toggleExtra(extra)}
                    className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                      isSelected ? 'bg-cbc-yellow border-cbc-yellow' : 'border-gray-500'
                    }`}>
                    {isSelected && <Check className="h-3 w-3 text-black" />}
                  </button>
                  <div className="flex-1">
                    <span className="text-sm font-medium text-cbc-cream">{extra.name}</span>
                    <span className="text-xs text-gray-400 ml-2">+{fmt(extra.unitPrice)} c/u</span>
                  </div>
                  {isSelected && (
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => updateExtraQty(extra.id, Math.max(1, (selectedExtras.find((e) => e.extraId === extra.id)?.qty ?? 1) - 1))}
                        className="p-1 text-gray-400 hover:text-cbc-cream">
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="text-white text-sm w-6 text-center">{selectedExtras.find((e) => e.extraId === extra.id)?.qty ?? 1}</span>
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
                      {zone.baseFee > 0 ? `Base ${fmt(zone.baseFee)} + ` : ''}{fmt(zone.feePerUnit)}/unidad
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Fecha de entrega deseada</label>
              <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full bg-cbc-black border border-gray-700 rounded-md px-4 py-3 text-white focus:ring-2 focus:ring-cbc-yellow focus:border-transparent outline-none" />
            </div>

            <div className="flex items-center gap-3">
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" checked={rush} onChange={(e) => setRush(e.target.checked)}
                  className="sr-only peer" />
                <div className="h-6 w-11 rounded-full bg-gray-700 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-cbc-yellow peer-checked:after:translate-x-full" />
              </label>
              <div>
                <span className="text-sm text-cbc-cream font-medium">Pedido urgente</span>
                <p className="text-xs text-gray-400">Recargo del {settings.RUSH_FEE_PCT ?? 40}% sobre el subtotal con descuento</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Summary + Contact */}
        {step === 3 && (
          <div className="space-y-8">
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
                    <span>IVA (16%)</span><span>{fmt(calc.iva)}</span>
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
                    className="w-full bg-cbc-black border border-gray-700 rounded-md px-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-cbc-yellow focus:border-transparent outline-none" placeholder="correo@ejemplo.com" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">WhatsApp *</label>
                  <input type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} required
                    className="w-full bg-cbc-black border border-gray-700 rounded-md px-3 py-2.5 text-white text-sm focus:ring-2 focus:ring-cbc-yellow focus:border-transparent outline-none" placeholder="+52 555 123 4567" />
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
              disabled={!canContinue || submitting || !calc}
              className="flex items-center gap-2 rounded-lg bg-cbc-yellow text-black font-semibold px-6 py-2.5 text-sm hover:bg-cbc-yellow/90 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Enviando...' : <Check className="h-4 w-4" />}
              {submitting ? 'Enviando...' : 'Enviar cotización'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

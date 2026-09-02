'use client'

import { useState } from 'react'

type Provider = 'stripe' | 'mercadopago'

const PROVIDER_TITLE: Record<Provider, string> = {
  stripe: 'Tarjeta',
  mercadopago: 'Mercado Pago',
}
const PROVIDER_DESC: Record<Provider, string> = {
  stripe: 'Visa, Mastercard, American Express',
  mercadopago: 'Tarjetas, OXXO y meses sin intereses',
}

// SAT c_RegimenFiscal — subconjunto común para personas físicas / empresas chicas.
const REGIMENES = [
  ['626', 'Régimen Simplificado de Confianza (RESICO)'],
  ['612', 'Actividades empresariales y profesionales'],
  ['605', 'Sueldos y salarios'],
  ['621', 'Incorporación Fiscal'],
  ['606', 'Arrendamiento'],
  ['625', 'Actividades con plataformas tecnológicas'],
  ['616', 'Sin obligaciones fiscales'],
  ['601', 'General de Ley Personas Morales'],
  ['603', 'Personas Morales con Fines no Lucrativos'],
] as const

const USOS_CFDI = [
  ['G03', 'Gastos en general'],
  ['G01', 'Adquisición de mercancías'],
  ['S01', 'Sin efectos fiscales'],
  ['CP01', 'Pagos'],
] as const

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const isValidEmail = (v: string) => EMAIL_RE.test(v.trim())
const isValidWhatsapp = (v: string) => {
  const d = v.replace(/[^\d]/g, '')
  return d.length >= 10 && d.length <= 15
}
const isCP = (v: string) => /^\d{5}$/.test(v.trim())
const money = (n: number) => `$${n.toLocaleString('es-MX')}`

const EMPTY_ADDR = { street: '', extNo: '', intNo: '', colonia: '', cp: '', city: '', state: '', references: '' }
const EMPTY_CFDI = { rfc: '', razonSocial: '', regimenFiscal: '', usoCfdi: 'G03', cpFiscal: '' }

export function ComprarUnoButton({
  slug,
  markedUpPrice,
  providers = ['mercadopago'],
  shipping = { cost: 150, freeThreshold: 800 },
}: {
  slug: string
  markedUpPrice: number
  providers?: Provider[]
  shipping?: { cost: number; freeThreshold: number }
}) {
  const options = providers.length ? providers : (['mercadopago'] as Provider[])

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [addr, setAddr] = useState({ ...EMPTY_ADDR })
  const [isGift, setIsGift] = useState(false)
  const [giftMessage, setGiftMessage] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [needsCfdi, setNeedsCfdi] = useState(false)
  const [cfdi, setCfdi] = useState({ ...EMPTY_CFDI })
  const [provider, setProvider] = useState<Provider>(options[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const setA = (k: keyof typeof EMPTY_ADDR) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setAddr((s) => ({ ...s, [k]: e.target.value }))
  const setC = (k: keyof typeof EMPTY_CFDI) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setCfdi((s) => ({ ...s, [k]: e.target.value }))

  const shipCost = shipping.freeThreshold > 0 && markedUpPrice >= shipping.freeThreshold ? 0 : shipping.cost
  const total = markedUpPrice + shipCost

  const emailOk = email.trim() === '' || isValidEmail(email)
  const addrOk = !!addr.street.trim() && !!addr.extNo.trim() && !!addr.colonia.trim() && isCP(addr.cp) && !!addr.city.trim() && !!addr.state.trim()
  const cfdiOk = !needsCfdi || (cfdi.rfc.trim().length >= 12 && !!cfdi.razonSocial.trim() && !!cfdi.regimenFiscal && !!cfdi.usoCfdi && isCP(cfdi.cpFiscal))
  const canSubmit = !!name.trim() && isValidWhatsapp(whatsapp) && emailOk && addrOk && cfdiOk

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/single-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          name,
          email,
          whatsapp,
          provider,
          address: addr,
          isGift,
          giftMessage: isGift ? giftMessage : '',
          recipientName: isGift ? recipientName : '',
          needsCfdi,
          cfdi: needsCfdi ? cfdi : undefined,
        }),
      })
      const raw = await res.text()
      let body: any = null
      try {
        body = raw ? JSON.parse(raw) : null
      } catch {
        throw new Error(`El servidor respondió ${res.status}. Intenta de nuevo en un momento.`)
      }
      // The API always answers 200 with { ok }. Anything else is infra.
      if (!res.ok || !body) {
        throw new Error(`El servidor respondió ${res.status}. Intenta de nuevo en un momento.`)
      }
      if (body.ok === false || !body.url) {
        const detail = body.code ? ` (${body.code})` : ''
        throw new Error(`${body.error || 'No se pudo procesar el pago'}${detail}`)
      }
      window.location.href = body.url
    } catch (err: any) {
      setError(err.message || 'Error al procesar')
      setLoading(false)
    }
  }

  const field = 'input-field w-full'
  const lbl = 'block text-sm text-gray-400 mb-1'

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-md bg-green-600 px-8 py-4 text-base font-semibold text-white hover:bg-green-700 transition-all"
      >
        Comprar 1 — {money(markedUpPrice)} MXN
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 py-10">
          <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-[#1e1e1e] p-6">
            <h2 className="mb-1 text-xl font-bold text-white">Comprar 1 unidad</h2>
            <div className="mb-4 space-y-0.5 text-sm text-gray-400">
              <p>Producto: <span className="text-white">{money(markedUpPrice)}</span></p>
              <p>
                Envío:{' '}
                <span className="text-white">{shipCost === 0 ? 'Gratis' : money(shipCost)}</span>
                {shipCost > 0 && shipping.freeThreshold > 0 && (
                  <span className="text-gray-500"> · gratis desde {money(shipping.freeThreshold)}</span>
                )}
              </p>
              <p className="text-white font-semibold">Total: {money(total)} MXN</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Contacto */}
              <div className="space-y-3">
                <div>
                  <label className={lbl}>Nombre *</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} required className={field} placeholder="Tu nombre" />
                </div>
                <div>
                  <label className={lbl}>WhatsApp *</label>
                  <input
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    required
                    className={`${field} ${whatsapp.trim() && !isValidWhatsapp(whatsapp) ? 'border-red-500' : ''}`}
                    placeholder="+52 55 1234 5678"
                  />
                </div>
                <div>
                  <label className={lbl}>Email {needsCfdi ? '*' : ''}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`${field} ${!emailOk ? 'border-red-500' : ''}`}
                    placeholder="correo@ejemplo.com"
                  />
                  <p className="mt-1 text-xs text-gray-500">Para el comprobante y avisos de entrega.</p>
                </div>
              </div>

              {/* Dirección */}
              <div className="space-y-3 border-t border-gray-700 pt-4">
                <p className="text-sm font-semibold text-white">Dirección de envío</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Código postal *</label>
                    <input
                      value={addr.cp}
                      onChange={setA('cp')}
                      inputMode="numeric"
                      maxLength={5}
                      className={`${field} ${addr.cp && !isCP(addr.cp) ? 'border-red-500' : ''}`}
                      placeholder="06700"
                    />
                  </div>
                  <div>
                    <label className={lbl}>Colonia *</label>
                    <input value={addr.colonia} onChange={setA('colonia')} className={field} placeholder="Roma Norte" />
                  </div>
                </div>
                <div>
                  <label className={lbl}>Calle *</label>
                  <input value={addr.street} onChange={setA('street')} className={field} placeholder="Av. Álvaro Obregón" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Núm. exterior *</label>
                    <input value={addr.extNo} onChange={setA('extNo')} className={field} placeholder="123" />
                  </div>
                  <div>
                    <label className={lbl}>Núm. interior</label>
                    <input value={addr.intNo} onChange={setA('intNo')} className={field} placeholder="4B" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Ciudad *</label>
                    <input value={addr.city} onChange={setA('city')} className={field} placeholder="Ciudad de México" />
                  </div>
                  <div>
                    <label className={lbl}>Estado *</label>
                    <input value={addr.state} onChange={setA('state')} className={field} placeholder="CDMX" />
                  </div>
                </div>
                <div>
                  <label className={lbl}>Referencias</label>
                  <input value={addr.references} onChange={setA('references')} className={field} placeholder="Entre calles, color de fachada…" />
                </div>
              </div>

              {/* Regalo */}
              <div className="border-t border-gray-700 pt-4">
                <label className="flex items-center gap-3 text-sm text-white">
                  <input type="checkbox" checked={isGift} onChange={(e) => setIsGift(e.target.checked)} className="h-4 w-4" />
                  Es un regalo
                </label>
                {isGift && (
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className={lbl}>Nombre de quien recibe</label>
                      <input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} className={field} placeholder="Para: …" />
                    </div>
                    <div>
                      <label className={lbl}>Mensaje de regalo</label>
                      <textarea
                        value={giftMessage}
                        onChange={(e) => setGiftMessage(e.target.value)}
                        rows={3}
                        maxLength={500}
                        className={field}
                        placeholder="Se incluye impreso en el paquete. No se muestra el precio."
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Factura */}
              <div className="border-t border-gray-700 pt-4">
                <label className="flex items-center gap-3 text-sm text-white">
                  <input type="checkbox" checked={needsCfdi} onChange={(e) => setNeedsCfdi(e.target.checked)} className="h-4 w-4" />
                  Necesito factura (CFDI)
                </label>
                {needsCfdi && (
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={lbl}>RFC *</label>
                        <input value={cfdi.rfc} onChange={setC('rfc')} className={`${field} uppercase`} placeholder="XAXX010101000" />
                      </div>
                      <div>
                        <label className={lbl}>CP fiscal *</label>
                        <input value={cfdi.cpFiscal} onChange={setC('cpFiscal')} inputMode="numeric" maxLength={5} className={field} placeholder="06700" />
                      </div>
                    </div>
                    <div>
                      <label className={lbl}>Razón social *</label>
                      <input value={cfdi.razonSocial} onChange={setC('razonSocial')} className={field} placeholder="Nombre o razón social" />
                    </div>
                    <div>
                      <label className={lbl}>Régimen fiscal *</label>
                      <select value={cfdi.regimenFiscal} onChange={setC('regimenFiscal')} className={field}>
                        <option value="">Selecciona…</option>
                        {REGIMENES.map(([code, name]) => (
                          <option key={code} value={code}>{code} — {name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={lbl}>Uso de CFDI *</label>
                      <select value={cfdi.usoCfdi} onChange={setC('usoCfdi')} className={field}>
                        {USOS_CFDI.map(([code, name]) => (
                          <option key={code} value={code}>{code} — {name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Método de pago */}
              <div className="border-t border-gray-700 pt-4">
                <p className="mb-2 text-sm font-semibold text-white">¿Cómo quieres pagar?</p>
                {options.length === 1 ? (
                  <div className="rounded-lg border border-green-500 bg-green-500/10 px-3 py-3 text-sm text-white">
                    <span className="font-semibold">{PROVIDER_TITLE[options[0]]}</span>
                    <span className="block text-xs text-gray-300">{PROVIDER_DESC[options[0]]}</span>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {options.map((p) => (
                      <button
                        type="button"
                        key={p}
                        onClick={() => setProvider(p)}
                        aria-pressed={provider === p}
                        className={`flex items-start gap-3 rounded-lg border px-3 py-3 text-left text-sm transition-colors ${
                          provider === p
                            ? 'border-green-500 bg-green-500/10 text-white'
                            : 'border-gray-600 text-gray-300 hover:bg-gray-800'
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                            provider === p ? 'border-green-500 bg-green-500' : 'border-gray-500'
                          }`}
                        >
                          {provider === p && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </span>
                        <span>
                          <span className="font-semibold">{PROVIDER_TITLE[p]}</span>
                          <span className="block text-xs text-gray-400">{PROVIDER_DESC[p]}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-lg border border-gray-600 px-4 py-3 text-sm text-gray-300 transition-colors hover:bg-gray-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !canSubmit}
                  className="flex-1 rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Procesando…' : `Pagar ${money(total)}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

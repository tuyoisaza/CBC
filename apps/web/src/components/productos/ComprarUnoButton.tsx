'use client'

import { useState } from 'react'

export function ComprarUnoButton({ slug, markedUpPrice }: { slug: string; markedUpPrice: number }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !whatsapp) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/single-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, name, email, whatsapp }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Error')
      window.location.href = body.url
    } catch (err: any) {
      setError(err.message || 'Error al procesar')
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-md bg-green-600 px-8 py-4 text-base font-semibold text-white hover:bg-green-700 transition-all"
      >
        Comprar 1 — ${markedUpPrice.toLocaleString('es-MX')} MXN
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#1e1e1e] border border-gray-700 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Comprar 1 unidad</h2>
            <p className="text-sm text-gray-400 mb-4">
              Precio: <span className="text-white font-semibold">${markedUpPrice.toLocaleString('es-MX')} MXN</span>
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nombre *</label>
                <input value={name} onChange={e => setName(e.target.value)} required className="input-field w-full" placeholder="Tu nombre" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">WhatsApp *</label>
                <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} required className="input-field w-full" placeholder="+52 55 1234 5678" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-field w-full" placeholder="correo@ejemplo.com" />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-lg border border-gray-600 px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={loading} className="flex-1 rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-all">
                  {loading ? 'Redirigiendo...' : `Pagar $${markedUpPrice.toLocaleString('es-MX')}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

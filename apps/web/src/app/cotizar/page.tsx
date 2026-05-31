'use client'

import { useState, FormEvent } from 'react'
import { PublicFooter } from '@/components/public/PublicFooter'

export default function CotizarPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('loading')
    const form = new FormData(e.currentTarget)
    const data = Object.fromEntries(form.entries())
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Error al enviar')
      setStatus('success')
      setMessage('¡Solicitud enviada con éxito! Nos pondremos en contacto pronto.')
      ;(e.target as HTMLFormElement).reset()
    } catch {
      setStatus('error')
      setMessage('Ocurrió un error. Por favor intenta de nuevo o contáctanos por WhatsApp.')
    }
  }

  return (
    <main className="min-h-screen bg-cbc-black py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-cbc-cream mb-4">Cotiza tus Regalos</h1>
          <p className="text-gray-400">Déjanos tus datos y nos pondremos en contacto contigo en menos de 24 horas con una propuesta personalizada.</p>
        </div>
        <div className="bg-[#1a1a1a] rounded-xl p-8 border border-gray-800 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Nombre de la Empresa *</label>
                <input required type="text" name="companyName" className="w-full bg-cbc-black border border-gray-700 rounded-md px-4 py-3 text-white focus:ring-2 focus:ring-cbc-yellow focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Tu Nombre *</label>
                <input required type="text" name="contactName" className="w-full bg-cbc-black border border-gray-700 rounded-md px-4 py-3 text-white focus:ring-2 focus:ring-cbc-yellow focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email *</label>
                <input required type="email" name="email" className="w-full bg-cbc-black border border-gray-700 rounded-md px-4 py-3 text-white focus:ring-2 focus:ring-cbc-yellow focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">WhatsApp *</label>
                <input required type="tel" name="whatsapp" className="w-full bg-cbc-black border border-gray-700 rounded-md px-4 py-3 text-white focus:ring-2 focus:ring-cbc-yellow focus:border-transparent outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Tipo de Caja *</label>
                <select required name="boxType" className="w-full bg-cbc-black border border-gray-700 rounded-md px-4 py-3 text-white focus:ring-2 focus:ring-cbc-yellow focus:border-transparent outline-none">
                  <option value="prensa">Kit Prensa Francesa</option>
                  <option value="moka">Kit Moka Italiana</option>
                  <option value="mix">Mix de ambos</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Cantidad Estimada *</label>
                <select required name="quantity" className="w-full bg-cbc-black border border-gray-700 rounded-md px-4 py-3 text-white focus:ring-2 focus:ring-cbc-yellow focus:border-transparent outline-none">
                  <option value="10-14">10 a 14 cajas</option>
                  <option value="15-30">15 a 30 cajas</option>
                  <option value="31-50">31 a 50 cajas</option>
                  <option value="50+">Más de 50 cajas</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Ocasión *</label>
              <select required name="occasion" className="w-full bg-cbc-black border border-gray-700 rounded-md px-4 py-3 text-white focus:ring-2 focus:ring-cbc-yellow focus:border-transparent outline-none">
                <option value="cliente">Regalo para Clientes</option>
                <option value="onboarding">Onboarding de Empleados</option>
                <option value="fin-de-ano">Fin de Año</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            {message && (
              <div className={`rounded-md p-4 mb-4 ${status === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-red-500/20 text-red-400 border border-red-500/50'}`}>
                {message}
              </div>
            )}
            <button type="submit" disabled={status === 'loading'}
              className="w-full bg-cbc-yellow text-black font-bold py-4 rounded-md hover:bg-cbc-yellow/90 transition-colors disabled:opacity-50">
              {status === 'loading' ? 'Enviando...' : 'Enviar Solicitud'}
            </button>
          </form>
        </div>
      </div>
      <PublicFooter lang="es" />
    </main>
  )
}

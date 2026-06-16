'use client'

import { useState, FormEvent } from 'react'
import { PublicFooter } from '@/components/public/PublicFooter'
import { Send } from 'lucide-react'

export default function ContactoPage() {
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
        body: JSON.stringify({ ...data, boxType: 'prensa', quantity: '10-14', occasion: 'otro' }),
      })
      if (!res.ok) throw new Error('Error al enviar')
      setStatus('success')
      setMessage('¡Mensaje enviado con éxito! Nos pondremos en contacto pronto.')
      ;(e.target as HTMLFormElement).reset()
    } catch {
      setStatus('error')
      setMessage('Ocurrió un error. Por favor intenta de nuevo.')
    }
  }

  return (
    <main className="min-h-screen bg-cbc-black py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-cbc-cream mb-4">Contacto</h1>
          <p className="text-gray-400">Déjanos tus datos y nos pondremos en contacto contigo.</p>
        </div>
        <div className="bg-[#1a1a1a] rounded-xl p-8 border border-gray-800 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Empresa</label>
                <input required type="text" name="companyName"
                  className="w-full bg-cbc-black border border-gray-700 rounded-md px-4 py-3 text-white focus:ring-2 focus:ring-cbc-yellow focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Nombre *</label>
                <input required type="text" name="contactName"
                  className="w-full bg-cbc-black border border-gray-700 rounded-md px-4 py-3 text-white focus:ring-2 focus:ring-cbc-yellow focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email *</label>
                <input required type="email" name="email"
                  className="w-full bg-cbc-black border border-gray-700 rounded-md px-4 py-3 text-white focus:ring-2 focus:ring-cbc-yellow focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">WhatsApp</label>
                <input type="tel" name="whatsapp"
                  className="w-full bg-cbc-black border border-gray-700 rounded-md px-4 py-3 text-white focus:ring-2 focus:ring-cbc-yellow focus:border-transparent outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Mensaje</label>
              <textarea name="message" rows={4}
                className="w-full bg-cbc-black border border-gray-700 rounded-md px-4 py-3 text-white focus:ring-2 focus:ring-cbc-yellow focus:border-transparent outline-none resize-y" />
            </div>
            {message && (
              <div className={`rounded-md p-4 ${status === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-red-500/20 text-red-400 border border-red-500/50'}`}>
                {message}
              </div>
            )}
            <button type="submit" disabled={status === 'loading'}
              className="w-full bg-cbc-yellow text-black font-bold py-4 rounded-md hover:bg-cbc-yellow/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {status === 'loading' ? 'Enviando...' : <Send className="h-4 w-4" />}
              {status === 'loading' ? 'Enviando...' : 'Enviar mensaje'}
            </button>
          </form>
        </div>
      </div>
      <PublicFooter lang="es" />
    </main>
  )
}

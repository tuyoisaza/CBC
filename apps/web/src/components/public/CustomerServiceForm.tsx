'use client'

import { useState, FormEvent } from 'react'
import { Send, Loader2, Check } from 'lucide-react'

const WA_SERVICE =
  'https://wa.me/5215572293512?text=Hola%2C%20necesito%20ayuda%20con%20un%20pedido%20de%20Coffee%20Bunn%20Caf%C3%A9'

type Status = 'idle' | 'loading' | 'success' | 'error'

const inputCls =
  'w-full bg-cbc-black border border-gray-700 rounded-md px-4 py-3 text-white text-sm ' +
  'focus:ring-2 focus:ring-cbc-yellow focus:border-transparent outline-none placeholder:text-gray-500'

export function CustomerServiceForm({ onDone }: { onDone?: () => void }) {
  const [status, setStatus] = useState<Status>('idle')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('loading')
    const form = e.currentTarget
    const payload = Object.fromEntries(new FormData(form).entries())
    try {
      const res = await fetch('/api/service/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('failed')
      form.reset()
      setStatus('success')
      onDone?.()
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/15 text-green-400">
          <Check className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold text-cbc-cream">¡Mensaje enviado!</p>
        <p className="text-xs text-gray-400">
          Lorena te responde por WhatsApp o correo lo antes posible.
        </p>
        <button
          type="button"
          onClick={() => setStatus('idle')}
          className="mt-1 text-xs text-cbc-yellow hover:underline"
        >
          Enviar otro mensaje
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Honeypot */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input required name="name" placeholder="Tu nombre *" className={inputCls} />
        <input type="email" name="email" placeholder="Email" className={inputCls} />
      </div>
      <input type="tel" name="phone" placeholder="WhatsApp (opcional)" className={inputCls} />
      <textarea
        required
        name="message"
        rows={4}
        placeholder="¿En qué te podemos ayudar? *"
        className={`${inputCls} resize-y`}
      />
      {status === 'error' && (
        <p className="rounded-md bg-red-500/15 border border-red-500/40 px-3 py-2 text-xs text-red-400">
          No se pudo enviar. Intenta de nuevo o escríbenos por WhatsApp.
        </p>
      )}
      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-cbc-yellow px-4 py-3 text-sm font-bold text-black hover:bg-cbc-yellow/90 transition-colors disabled:opacity-50"
      >
        {status === 'loading' ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Enviando…
          </>
        ) : (
          <>
            <Send className="h-4 w-4" /> Enviar mensaje
          </>
        )}
      </button>
      <a
        href={WA_SERVICE}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 rounded-md border border-gray-700 px-4 py-3 text-sm font-semibold text-cbc-cream hover:border-cbc-yellow/40 hover:bg-cbc-yellow/5 transition-colors"
      >
        <svg className="h-4 w-4 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.3-1.39c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.9-4.44 9.9-9.9S17.5 2 12.04 2zm0 18.13c-1.48 0-2.93-.4-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 01-1.26-4.39c0-4.54 3.7-8.23 8.24-8.23 4.54 0 8.23 3.69 8.23 8.23s-3.69 8.24-8.23 8.24zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.39.11-.51.11-.11.25-.29.37-.43.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43l-.48-.01c-.17 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.25 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29z" />
        </svg>
        Prefiero WhatsApp
      </a>
    </form>
  )
}

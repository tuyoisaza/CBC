'use client'

import { useState } from 'react'
import { MessageCircle, X } from 'lucide-react'
import { CustomerServiceForm } from './CustomerServiceForm'

export function CustomerServiceWidget() {
  const [open, setOpen] = useState(false)

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="w-[calc(100vw-2.5rem)] max-w-sm rounded-2xl border border-gray-800 bg-[#1a1a1a] shadow-2xl animate-fade-in">
          <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
            <div>
              <p className="text-sm font-bold text-cbc-cream">Servicio al cliente</p>
              <p className="text-xs text-gray-400">Te responde Lorena, normalmente el mismo día</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
              className="rounded-md p-1 text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="p-5">
            <CustomerServiceForm />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Cerrar servicio al cliente' : 'Abrir servicio al cliente'}
        aria-expanded={open}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-cbc-yellow text-black shadow-lg hover:bg-cbc-yellow/90 hover:shadow-xl transition-all focus-visible:ring-2 focus-visible:ring-cbc-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-cbc-black"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  )
}

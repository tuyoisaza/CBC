'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail } from 'lucide-react'

export function QuoteEmailButton({ quoteId, email, sentAt }: { quoteId: string; email: string | null; sentAt: string | null }) {
  const router = useRouter()
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  async function send() {
    if (sending || !email) return
    setSending(true); setStatus(''); setError('')
    try {
      const response = await fetch(`/api/admin/quotes/${encodeURIComponent(quoteId)}/email`, { method: 'POST' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo enviar la cotización.')
      setStatus(result.warning || `Cotización enviada a ${result.email}.`)
      router.refresh()
    } catch (error) { setError(error instanceof Error ? error.message : 'No se pudo enviar la cotización.') }
    finally { setSending(false) }
  }
  return <div className="mt-4 space-y-2 border-t border-border pt-3">
    <p className="text-xs text-muted-foreground">Destinatario: {email || 'Sin correo registrado'}</p>
    {sentAt && <p className="text-xs text-muted-foreground">Último envío: {new Date(sentAt).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}</p>}
    <button type="button" disabled={sending || !email} onClick={send} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"><Mail className="h-4 w-4" />{sending ? 'Enviando…' : sentAt ? 'Reenviar por correo' : 'Enviar por correo'}</button>
    {status && <p role="status" className="text-sm text-green-600 dark:text-green-400">{status}</p>}
    {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
  </div>
}

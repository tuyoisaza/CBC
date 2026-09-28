'use client'

import { useState } from 'react'
import { Copy, Mail } from 'lucide-react'

export function PaymentLinkActions({ paymentId, paymentUrl, customerEmail }: {
  paymentId: string
  paymentUrl: string
  customerEmail: string | null
}) {
  const [copyStatus, setCopyStatus] = useState('')
  const [sendStatus, setSendStatus] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [needsConfiguration, setNeedsConfiguration] = useState(false)

  async function copy() {
    setCopyStatus('')
    setError('')
    setNeedsConfiguration(false)
    try {
      await navigator.clipboard.writeText(paymentUrl)
      setCopyStatus('Vínculo copiado')
    } catch {
      setError('No se pudo copiar. Abre el vínculo y cópialo desde la barra del navegador.')
    }
  }

  async function send() {
    if (sending) return
    setSending(true)
    setSendStatus('')
    setError('')
    setNeedsConfiguration(false)
    try {
      const response = await fetch(`/api/admin/payments/${encodeURIComponent(paymentId)}/email`, { method: 'POST' })
      const result = await response.json()
      if (!response.ok) {
        setNeedsConfiguration(['EMAIL_NOT_CONFIGURED', 'EMAIL_CONFIGURATION_ERROR', 'EMAIL_PROVIDER_ERROR'].includes(result.code))
        throw new Error(result.error || 'No se pudo enviar el correo. Inténtalo de nuevo.')
      }
      setSendStatus(`Correo enviado a ${result.email}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el correo. Inténtalo de nuevo.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mt-3 space-y-2 text-left">
      <div className="flex flex-wrap items-center gap-2">
        <a href={paymentUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">Ver link de pago</a>
        <button type="button" onClick={copy} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted">
          <Copy className="h-3 w-3" /> Copiar
        </button>
        <button type="button" onClick={send} disabled={sending || !customerEmail}
          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50">
          <Mail className="h-3 w-3" /> {sending ? 'Enviando…' : 'Enviar por correo'}
        </button>
      </div>
      <p className="text-xs text-muted-foreground break-all">{customerEmail ? `Destinatario: ${customerEmail}` : 'El cliente no tiene correo registrado.'}</p>
      {copyStatus && <p role="status" className="text-xs text-green-600 dark:text-green-400">{copyStatus}</p>}
      {sendStatus && <p role="status" className="text-xs text-green-600 dark:text-green-400">{sendStatus}</p>}
      {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
      {needsConfiguration && <a href="/admin/configuration" className="inline-block text-xs text-primary underline">Configurar correo (superadministrador)</a>}
    </div>
  )
}

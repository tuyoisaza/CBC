'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Phone, Send, Sparkles, Check, ExternalLink, Trash2 } from 'lucide-react'

interface Message {
  id: string
  from: string
  body: string
  direction: string
  status: string
  aiDraft?: string
  createdAt: string
  lead?: {
    id: string
    customer: { companyName: string; contactName: string }
  }
}

const QUICK_REPLIES = [
  { label: 'Precio',      text: 'El precio es $799 MXN por caja. ¿Cuántas cajas estarías considerando?' },
  { label: 'Mínimo',      text: 'El pedido mínimo es de 10 cajas. ¿Cuántas necesitarías?' },
  { label: 'Lead time',   text: 'Con branding personalizado, el tiempo de producción es 7–10 días hábiles. ¿Cuál es tu fecha límite?' },
  { label: 'Branding',    text: 'El logo de tu empresa va en la caja de serie — sin costo adicional. Solo necesitamos el archivo en alta resolución.' },
  { label: 'Clase (+15)', text: 'Con 15 cajas o más, cada caja incluye una tarjeta QR para una clase en vivo con Lorena para todo tu equipo. 🎓' },
  { label: 'Catálogo',    text: 'Con gusto te enviamos el catálogo. ¿Me puedes dar tu nombre y el nombre de tu empresa?' },
]

export function InboxList({ messages, emptyMessage = 'Sin mensajes todavía.' }: { messages: Message[]; emptyMessage?: string }) {
  const [selected, setSelected]   = useState<Message | null>(null)
  const [error, setError] = useState('')
  const [reply, setReply]         = useState('')
  const [sending, setSending]     = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  function applyDraft() {
    if (selected?.aiDraft) setReply(selected.aiDraft)
  }

  function applyQuickReply(text: string) {
    setReply(text)
  }

  async function sendReply() {
    if (!reply.trim() || !selected) return
    setSending(true)
    setError('')

    try {
      const response = await fetch('/api/admin/messages', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to:      selected.from,
          body:    reply,
          leadId:  selected.lead?.id,
          inReplyToId: selected.id,
        }),
      })
      if (!response.ok) throw new Error('No se pudo enviar la respuesta. El mensaje sigue pendiente.')
      setReply('')
      // Mark message as replied
      const update = await fetch(`/api/admin/messages?id=${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'replied' }),
      })
      if (!update.ok) throw new Error('Respuesta enviada, pero no se pudo actualizar el estado del mensaje.')
      setSelected(current => current?.id === selected.id ? { ...current, status: 'replied' } : current)
      router.refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo enviar la respuesta.')
    } finally {
      setSending(false)
    }
  }

  async function deleteMessage() {
    if (!selected || selected.status === 'unread' || !window.confirm('¿Eliminar este mensaje?')) return
    setDeleting(true)
    setError('')
    try {
      const response = await fetch(`/api/admin/messages?id=${selected.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('No se pudo eliminar el mensaje')
      setSelected(null)
      router.refresh()
    } catch {
      setError('No se pudo eliminar el mensaje.')
    } finally {
      setDeleting(false)
    }
  }

  if (messages.length === 0 && !selected) {
    return (
      <div className="rounded-xl border border-dashed border-border p-12 text-center">
        <p className="text-muted-foreground">{emptyMessage}</p>
        <p className="text-sm text-muted-foreground mt-1">
          Los mensajes de WhatsApp aparecerán aquí cuando lleguen.
        </p>
      </div>
    )
  }

  return (
    <div>
      {error && <p role="alert" className="mb-3 text-sm text-red-500">{error}</p>}
    <div className="flex gap-4 h-[calc(100vh-12rem)]">
      {/* Message list */}
      <div className="w-72 shrink-0 overflow-y-auto space-y-2 pr-1">
        {messages.map((msg) => (
          <button
            key={msg.id}
            onClick={async () => {
              setError('')
              setSelected(msg)
              if (msg.status === 'unread') {
                try {
                  const response = await fetch(`/api/admin/messages?id=${msg.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'read' }) })
                  if (!response.ok) throw new Error('No se pudo marcar el mensaje como leído.')
                  setSelected(current => current?.id === msg.id ? { ...current, status: 'read' } : current)
                  router.refresh()
                } catch {
                  setError('No se pudo marcar el mensaje como leído.')
                }
              }
            }}
            className={`w-full text-left rounded-xl border p-4 transition-all ${
              selected?.id === msg.id
                ? 'border-primary bg-primary/10'
                : msg.status === 'unread'
                ? 'border-primary/30 bg-primary/5 hover:border-primary/40'
                : 'border-border bg-card hover:border-border/80'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <p className="font-semibold text-sm text-foreground truncate">
                {msg.lead?.customer.companyName || msg.from}
              </p>
              {msg.status === 'unread' && (
                <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
              )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{msg.body}</p>
            <p className="mt-1 text-xs text-muted-foreground">{msg.status === 'unread' ? 'Sin leer' : msg.status === 'replied' ? 'Respondido' : 'Leído'}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {new Date(msg.createdAt).toLocaleString('es-MX', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </button>
        ))}
      </div>

      {/* Message detail + reply */}
      {!selected && <p className="p-5 text-sm text-muted-foreground">Selecciona un mensaje para leerlo.</p>}
      {selected && (
        <div className="flex-1 flex flex-col rounded-xl border border-border bg-card overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <p className="font-semibold text-foreground">
                {selected.lead?.customer.companyName || selected.from}
              </p>
              <p className="text-xs text-muted-foreground">{selected.from}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!selected.lead && <Link href={`/admin/sales/leads/new?message=${encodeURIComponent(selected.id)}`} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90">Convertir en lead</Link>}
              {selected.lead && (
                <a
                  href={`/admin/sales/leads/${selected.lead.id}`}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Ver lead <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {selected.status !== 'unread' && <button type="button" onClick={deleteMessage} disabled={deleting} className="flex items-center gap-1 rounded-lg border border-red-900/50 px-3 py-1.5 text-xs text-red-400 hover:bg-red-950/30 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" />Eliminar</button>}
              <a
                href={`https://wa.me/${selected.from.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
              >
                <Phone className="h-3.5 w-3.5 text-[#25D366]" /> Abrir WhatsApp
              </a>
            </div>
          </div>

          {/* Message body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="max-w-sm rounded-2xl rounded-tl-none bg-muted px-4 py-3">
              <p className="text-sm text-foreground whitespace-pre-wrap">{selected.body}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(selected.createdAt).toLocaleString('es-MX')}
              </p>
            </div>

            {/* AI Draft */}
            {selected.aiDraft && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-primary">Borrador IA</span>
                </div>
                <p className="text-sm text-foreground">{selected.aiDraft}</p>
                <button
                  onClick={applyDraft}
                  className="mt-3 text-xs text-primary hover:underline"
                >
                  Usar este borrador →
                </button>
              </div>
            )}
          </div>

          {/* Quick replies */}
          <div className="border-t border-border px-5 py-3">
            <p className="text-xs text-muted-foreground mb-2">Respuestas rápidas:</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_REPLIES.map((qr) => (
                <button
                  key={qr.label}
                  onClick={() => applyQuickReply(qr.text)}
                  className="rounded-full border border-border px-3 py-1 text-xs text-foreground hover:bg-muted transition-colors"
                >
                  {qr.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reply input */}
          <div className="border-t border-border p-4 flex gap-3">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Escribe una respuesta..."
              rows={3}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendReply()
              }}
            />
            <button
              onClick={sendReply}
              disabled={!reply.trim() || sending}
              className="self-end rounded-lg bg-primary p-3 text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Enviar (Cmd+Enter)"
            >
              {sending ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}
    </div>
    </div>
  )
}

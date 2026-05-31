'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Phone, Send, Sparkles, Check, ExternalLink } from 'lucide-react'

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

export function InboxList({ messages }: { messages: Message[] }) {
  const [selected, setSelected]   = useState<Message | null>(messages[0] ?? null)
  const [reply, setReply]         = useState('')
  const [sending, setSending]     = useState(false)
  const router = useRouter()

  function useDraft() {
    if (selected?.aiDraft) setReply(selected.aiDraft)
  }

  function useQuickReply(text: string) {
    setReply(text)
  }

  async function sendReply() {
    if (!reply.trim() || !selected) return
    setSending(true)

    try {
      await fetch('/api/admin/messages', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to:      selected.from,
          body:    reply,
          leadId:  selected.lead?.id,
          inReplyToId: selected.id,
        }),
      })
      setReply('')
      // Mark message as replied
      await fetch(`/api/admin/messages?id=${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'replied' }),
      })
      router.refresh()
    } finally {
      setSending(false)
    }
  }

  if (messages.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-12 text-center">
        <p className="text-muted-foreground">Sin mensajes todavía.</p>
        <p className="text-sm text-muted-foreground mt-1">
          Los mensajes de WhatsApp aparecerán aquí cuando lleguen.
        </p>
      </div>
    )
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-12rem)]">
      {/* Message list */}
      <div className="w-72 shrink-0 overflow-y-auto space-y-2 pr-1">
        {messages.map((msg) => (
          <button
            key={msg.id}
            onClick={() => setSelected(msg)}
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
            <p className="text-xs text-muted-foreground mt-2">
              {new Date(msg.createdAt).toLocaleString('es-MX', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </button>
        ))}
      </div>

      {/* Message detail + reply */}
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
            <div className="flex items-center gap-2">
              {selected.lead && (
                <a
                  href={`/admin/sales/leads/${selected.lead.id}`}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Ver lead <ExternalLink className="h-3 w-3" />
                </a>
              )}
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
                  onClick={useDraft}
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
                  onClick={() => useQuickReply(qr.text)}
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
  )
}

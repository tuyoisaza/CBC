'use client'

import { useState } from 'react'
import { Send, Sparkles, Loader2, Trash2 } from 'lucide-react'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const WELCOME =
  'Soy el asistente de administración de Coffee Bunn Café. ' +
  'Puedo ayudarte a redactar respuestas a clientes, textos de catálogo, ideas de regalos corporativos y más. ' +
  '¿En qué te ayudo?'

export function AiAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'assistant', content: WELCOME }])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function send() {
    const prompt = input.trim()
    if (!prompt || busy) return
    const history = [...messages.filter((m) => m.role !== 'assistant' || m.content !== WELCOME), { role: 'user' as const, content: prompt }]
    setMessages([...history, { role: 'user', content: prompt }])
    setInput('')
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/admin/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || 'No se pudo generar la respuesta')
      setMessages((prev) => [...prev, { role: 'assistant', content: body.reply }])
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Error'
      setError(detail)
      setMessages((prev) => [...prev, { role: 'assistant', content: `⚠️ ${detail}` }])
    } finally {
      setBusy(false)
    }
  }

  function reset() {
    setMessages([{ role: 'assistant', content: WELCOME }])
    setError('')
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] max-w-3xl rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-lg p-2.5 bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Asistente IA</h2>
            <p className="text-xs text-muted-foreground">Claude / GPT — respuestas para administración</p>
          </div>
        </div>
        <button
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
          title="Reiniciar conversación"
        >
          <Trash2 className="h-3.5 w-3.5" /> Nueva
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm ${
                m.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-none'
                  : 'bg-muted text-foreground rounded-bl-none'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {error && !messages.some((m) => m.content.startsWith('⚠️')) && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </div>

      <div className="border-t border-border p-4 flex gap-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tu consulta..."
          rows={2}
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send()
          }}
          disabled={busy}
        />
        <button
          onClick={send}
          disabled={!input.trim() || busy}
          className="self-end rounded-lg bg-primary p-3 text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Enviar (Cmd+Enter)"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Sparkles, Send, RefreshCw, Instagram, Linkedin, Facebook } from 'lucide-react'

const POST_TYPES = [
  { value: 'product-post',  label: 'Post de producto',    desc: 'Muestra la caja y sus características', platforms: ['instagram', 'facebook'] },
  { value: 'coffee-story',  label: 'Historia del café',   desc: 'Lorena habla del micro-lote actual',    platforms: ['instagram', 'facebook'] },
  { value: 'social-proof',  label: 'Experiencia',         desc: 'El momento humano alrededor del regalo', platforms: ['instagram', 'facebook'] },
  { value: 'linkedin-post', label: 'Post de LinkedIn',    desc: 'Contenido para el perfil de Lorena',   platforms: ['linkedin'] },
  { value: 'seasonal',      label: 'Campaña temporal',    desc: 'Post de temporada activa',              platforms: ['instagram', 'facebook', 'linkedin'] },
]

const PLATFORM_ICONS: Record<string, typeof Instagram> = {
  instagram: Instagram,
  facebook:  Facebook,
  linkedin:  Linkedin,
}

export function ContentGenerator({
  coffee,
  engineOnline,
}: {
  coffee: { name: string; tastingNotes: string[] } | null
  engineOnline: boolean
}) {
  const [type, setType]         = useState('product-post')
  const [preview, setPreview]   = useState<{ caption: string; imageUrl: string } | null>(null)
  const [loading, setLoading]   = useState<'preview' | 'publish' | null>(null)
  const [published, setPublished] = useState(false)

  const selectedType = POST_TYPES.find((t) => t.value === type)!

  async function generate() {
    setLoading('preview')
    setPreview(null)
    setPublished(false)
    try {
      const res = await fetch('/api/admin/engine', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'preview', type }),
      })
      if (res.ok) setPreview(await res.json())
    } finally {
      setLoading(null)
    }
  }

  async function publish() {
    if (!preview) return
    setLoading('publish')
    try {
      const res = await fetch('/api/admin/engine', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action:    'publish',
          type,
          platforms: selectedType.platforms,
          caption:   preview.caption,
          imageUrl:  preview.imageUrl,
        }),
      })
      if (res.ok) setPublished(true)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Type selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {POST_TYPES.map((pt) => (
          <button
            key={pt.value}
            onClick={() => { setType(pt.value); setPreview(null); setPublished(false) }}
            className={`text-left rounded-xl border p-4 transition-all ${
              type === pt.value
                ? 'border-primary bg-primary/10'
                : 'border-border bg-card hover:border-primary/40'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <p className="font-semibold text-sm text-foreground">{pt.label}</p>
              <div className="flex gap-1">
                {pt.platforms.map((p) => {
                  const Icon = PLATFORM_ICONS[p]
                  return <Icon key={p} className="h-3.5 w-3.5 text-muted-foreground" />
                })}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{pt.desc}</p>
          </button>
        ))}
      </div>

      {/* Generate button */}
      <button
        onClick={generate}
        disabled={!engineOnline || loading !== null}
        className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading === 'preview'
          ? <><RefreshCw className="h-4 w-4 animate-spin" /> Generando...</>
          : <><Sparkles className="h-4 w-4" /> Generar vista previa</>}
      </button>

      {/* Preview */}
      {preview && !published && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {/* Image */}
          {preview.imageUrl && (
            <div className="relative aspect-square max-h-64 overflow-hidden bg-cbc-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview.imageUrl}
                alt="Vista previa del post"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Caption */}
          <div className="p-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Caption
            </p>
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {preview.caption}
            </p>

            {/* Platforms */}
            <div className="flex items-center gap-2 mt-4">
              <span className="text-xs text-muted-foreground">Publicar en:</span>
              {selectedType.platforms.map((p) => {
                const Icon = PLATFORM_ICONS[p]
                return (
                  <span key={p} className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground capitalize">
                    <Icon className="h-3 w-3" /> {p}
                  </span>
                )
              })}
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-5">
              <button
                onClick={publish}
                disabled={loading !== null}
                className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {loading === 'publish'
                  ? <><RefreshCw className="h-4 w-4 animate-spin" /> Publicando...</>
                  : <><Send className="h-4 w-4" /> Publicar ahora</>}
              </button>
              <button
                onClick={generate}
                disabled={loading !== null}
                className="flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
              >
                <RefreshCw className="h-4 w-4" /> Regenerar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Published confirmation */}
      {published && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-6 text-center">
          <p className="text-2xl mb-2">🎉</p>
          <p className="font-semibold text-foreground">¡Publicado!</p>
          <p className="text-sm text-muted-foreground mt-1">
            El post fue publicado en {selectedType.platforms.join(', ')}.
          </p>
          <button
            onClick={() => { setPreview(null); setPublished(false) }}
            className="mt-4 text-sm text-primary hover:underline"
          >
            Generar otro post
          </button>
        </div>
      )}
    </div>
  )
}

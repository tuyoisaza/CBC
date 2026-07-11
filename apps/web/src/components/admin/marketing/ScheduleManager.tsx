'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Instagram, Facebook, Linkedin, Check } from 'lucide-react'

const PLATFORM_ICONS: Record<string, typeof Instagram> = {
  instagram: Instagram, facebook: Facebook, linkedin: Linkedin,
}

interface ScheduleEntry {
  active: boolean
  cron: string
  label: string
  platforms: string[]
}

const POST_TYPE_LABELS: Record<string, string> = {
  productPost:  'Post de producto',
  coffeeStory:  'Historia del café',
  socialProof:  'Experiencia / social proof',
  linkedinPost: 'Post de LinkedIn',
}

export function ScheduleManager({
  schedule,
}: {
  schedule: Record<string, ScheduleEntry>
}) {
  const [local, setLocal] = useState(schedule)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved]   = useState<string | null>(null)
  const router = useRouter()

  async function toggleActive(key: string) {
    const updated = { ...local, [key]: { ...local[key], active: !local[key].active } }
    setLocal(updated)
    setSaving(key)

    await fetch('/api/admin/schedule', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ key, value: updated[key] }),
    })

    setSaving(null)
    setSaved(key)
    setTimeout(() => setSaved(null), 2000)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {Object.entries(local).map(([key, entry]) => (
        <div
          key={key}
          className={`rounded-xl border p-5 transition-all ${
            entry.active ? 'border-border bg-card' : 'border-dashed border-border/60 bg-muted/20 opacity-70'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Toggle */}
              <button
                onClick={() => toggleActive(key)}
                disabled={saving === key}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:ring-2 focus-visible:ring-primary ${
                  entry.active ? 'bg-primary' : 'bg-muted'
                }`}
                role="switch"
                aria-checked={entry.active}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${
                  entry.active ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>

              <div>
                <p className="font-semibold text-sm text-foreground">
                  {POST_TYPE_LABELS[key] || key}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{entry.label}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Platform icons */}
              <div className="flex gap-1">
                {entry.platforms.map((p) => {
                  const Icon = PLATFORM_ICONS[p]
                  return Icon ? <Icon key={p} className="h-4 w-4 text-muted-foreground" /> : null
                })}
              </div>

              {saved === key && (
                <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <Check className="h-3 w-3" /> Guardado
                </span>
              )}
            </div>
          </div>
        </div>
      ))}

      <p className="text-xs text-muted-foreground pt-2">
        💡 Los cambios al calendario se sincronizan con el motor en el próximo ciclo de ejecución.
      </p>
    </div>
  )
}

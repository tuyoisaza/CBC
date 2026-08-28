'use client'

import { useState } from 'react'
import { getDebugDump } from '@/lib/debug-capture'

export function VersionBadge({ version }: { version: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(getDebugDump())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard unavailable — ignore silently
    }
  }

  return (
    <button
      onClick={handleCopy}
      title="Copiar diagnóstico"
      className="fixed bottom-3 left-3 z-50 text-[10px] font-mono text-muted-foreground/70 hover:text-muted-foreground transition-colors select-none"
    >
      {copied ? 'OK ✓' : version}
    </button>
  )
}

'use client'

import { useEffect, useState, useCallback } from 'react'
import { Bug, Download, Trash2, Clipboard, RefreshCw, X } from 'lucide-react'
import { getDebugDump, downloadDebugDump, reportDebugDump } from '@/lib/debug-capture'

export function DebugPanel() {
  const [enabled, setEnabled] = useState(false)
  const [entries, setEntries] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const [reported, setReported] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('cbc-debug-mode')
    setEnabled(stored === 'true')
  }, [])

  const toggleDebug = useCallback(() => {
    const next = !enabled
    setEnabled(next)
    localStorage.setItem('cbc-debug-mode', String(next))
  }, [enabled])

  const refreshEntries = useCallback(() => {
    const dump = getDebugDump()
    const lines = dump.split('\n').filter((l) => l.startsWith('['))
    setEntries(lines.slice(-50))
  }, [])

  const handleCopy = useCallback(async () => {
    const dump = getDebugDump()
    await navigator.clipboard.writeText(dump)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [])

  const handleReport = useCallback(async () => {
    const result = await reportDebugDump()
    if (result.ok) setReported(true)
    setTimeout(() => setReported(false), 2000)
  }, [])

  const handleClear = useCallback(() => {
    setEntries([])
  }, [])

  useEffect(() => {
    if (!enabled) return
    const interval = setInterval(refreshEntries, 2000)
    return () => clearInterval(interval)
  }, [enabled, refreshEntries])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-lg p-2.5 bg-yellow-500/10">
            <Bug className="h-5 w-5 text-yellow-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Debug Mode</h2>
            <p className="text-xs text-muted-foreground">Captura de consola y diagnósticos</p>
          </div>
        </div>
        <button
          onClick={toggleDebug}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            enabled ? 'bg-primary' : 'bg-muted'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={handleCopy}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors">
          <Clipboard className="h-3.5 w-3.5" />
          {copied ? 'Copiado' : 'Copiar diagnósticos'}
        </button>
        <button onClick={() => downloadDebugDump()}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors">
          <Download className="h-3.5 w-3.5" />
          Descargar dump
        </button>
        <button onClick={handleReport}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors">
          <RefreshCw className="h-3.5 w-3.5" />
          {reported ? 'Enviado' : 'Reportar al servidor'}
        </button>
        <button onClick={handleClear}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
          <Trash2 className="h-3.5 w-3.5" />
          Limpiar
        </button>
      </div>

      {enabled && (
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <span className="text-xs font-semibold text-foreground">Console Log ({entries.length})</span>
            <button onClick={refreshEntries} className="text-muted-foreground hover:text-foreground">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed">
            {entries.length === 0 ? (
              <p className="text-muted-foreground/50">No hay entradas. Activa el debug mode y navega la app.</p>
            ) : (
              entries.map((line, i) => (
                <div key={i} className={`py-0.5 ${
                  line.startsWith('[error]') ? 'text-red-400' :
                  line.startsWith('[warn]') ? 'text-yellow-400' :
                  'text-muted-foreground'
                }`}>
                  {line}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

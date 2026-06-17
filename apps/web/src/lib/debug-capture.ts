type LogEntry = { type: string; args: unknown[]; timestamp: string }

const MAX = 200
const entries: LogEntry[] = []
let initialized = false
let lastReport = 0
const REPORT_COOLDOWN = 30_000

let origLog: (...args: unknown[]) => void
let origWarn: (...args: unknown[]) => void
let origError: (...args: unknown[]) => void

function capture(type: string, args: unknown[]) {
  entries.push({ type, args: args.map(a => a instanceof Error ? a.stack || a.message : a), timestamp: new Date().toISOString() })
  if (entries.length > MAX) entries.shift()
}

function getDumpPayload() {
  return {
    version: document.querySelector<HTMLMetaElement>('meta[name="app-version"]')?.content || '?',
    url: location.href,
    userAgent: navigator.userAgent,
    screen: `${screen.width}x${screen.height}`,
    theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
    entries: entries.slice(),
  }
}

export async function reportDebugDump(): Promise<{ ok: boolean; timestamp?: string; requestId?: string }> {
  try {
    const res = await fetch('/api/debug-dump', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(getDumpPayload()),
    })
    if (!res.ok) return { ok: false }
    return await res.json()
  } catch {
    const errLog = typeof origError === 'function' ? origError : console.error.bind(console)
    errLog('debug-capture report failed')
    return { ok: false }
  }
}

async function autoReport() {
  const now = Date.now()
  if ((now - lastReport) < REPORT_COOLDOWN) return
  lastReport = now
  reportDebugDump()
}

export function initDebugCapture() {
  if (initialized || typeof window === 'undefined') return
  initialized = true

  origLog = console.log.bind(console)
  origWarn = console.warn.bind(console)
  origError = console.error.bind(console)

  console.log = (...args) => { capture('log', args); origLog(...args) }
  console.warn = (...args) => { capture('warn', args); origWarn(...args) }
  console.error = (...args) => {
    capture('error', args)
    origError(...args)
    autoReport()
  }

  window.addEventListener('error', (e) => {
    capture('error', [`Uncaught: ${e.message}`, e.filename, `L${e.lineno}:${e.colno}`])
    autoReport()
  })

  window.addEventListener('unhandledrejection', (e) => {
    capture('error', [`Unhandled promise rejection: ${e.reason}`])
    autoReport()
  })
}

export function getDebugDump(): string {
  const version = document.querySelector<HTMLMetaElement>('meta[name="app-version"]')?.content || '?'

  const lines: string[] = [
    `Version: ${version}`,
    `Exported: ${new Date().toISOString()}`,
    `URL: ${location.href}`,
    `User-agent: ${navigator.userAgent}`,
    `Screen: ${screen.width}x${screen.height}`,
    `Theme: ${document.documentElement.classList.contains('dark') ? 'dark' : 'light'}`,
    '',
    '--- Console ---',
  ]

  for (const e of entries) {
    const msg = e.args.map(a => typeof a === 'string' ? a : JSON.stringify(a, null, 0)).join(' ')
    lines.push(`[${e.type}] ${e.timestamp.slice(11, 19)} ${msg}`)
  }

  return lines.join('\n')
}

export function downloadDebugDump() {
  const blob = new Blob([getDebugDump()], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `debug-dump-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

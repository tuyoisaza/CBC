type LogEntry = { type: string; args: unknown[]; timestamp: string }

const MAX = 50
const entries: LogEntry[] = []
let initialized = false

function capture(type: string, args: unknown[]) {
  entries.push({ type, args: args.map(a => a instanceof Error ? a.stack || a.message : a), timestamp: new Date().toISOString() })
  if (entries.length > MAX) entries.shift()
}

export function initDebugCapture() {
  if (initialized || typeof window === 'undefined') return
  initialized = true

  const origLog = console.log.bind(console)
  const origWarn = console.warn.bind(console)
  const origError = console.error.bind(console)

  console.log = (...args) => { capture('log', args); origLog(...args) }
  console.warn = (...args) => { capture('warn', args); origWarn(...args) }
  console.error = (...args) => { capture('error', args); origError(...args) }

  window.addEventListener('error', (e) => {
    capture('error', [`Uncaught: ${e.message}`, e.filename, `L${e.lineno}:${e.colno}`])
  })

  window.addEventListener('unhandledrejection', (e) => {
    capture('error', [`Unhandled promise rejection: ${e.reason}`])
  })
}

export function getDebugDump(): string {
  const now = new Date().toISOString()
  const version = typeof process !== 'undefined' && typeof process.env !== 'undefined'
    ? process.env.NEXT_PUBLIC_APP_VERSION || '?'
    : '?'

  const lines: string[] = [
    `Version: ${version}`,
    `Exported: ${now}`,
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

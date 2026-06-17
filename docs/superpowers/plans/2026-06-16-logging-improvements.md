# Logging Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add centralized server-side logging with error context and expand client-side debug capture (bigger buffer, download, auto-report, all pages).

**Architecture:** A zero-dependency `lib/logger.ts` utility replaces raw `console.error` in 20 API route files. `lib/debug-capture.ts` is expanded with download + auto-report, initialized from root layout. A new `POST /api/debug-dump` endpoint receives auto-reported client dumps.

**Tech Stack:** Next.js App Router, TypeScript, no new dependencies.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `apps/web/src/lib/logger.ts` | **Create** | Centralized logger: `createLogger(module)` → `{ info, warn, error }` with timestamp, level, module, structured context |
| `apps/web/src/lib/debug-capture.ts` | **Modify** | Expand buffer 50→200, add `downloadDebugDump()`, add `reportDebugDump()`, auto-report on error (rate-limited, no recursion) |
| `apps/web/src/app/api/debug-dump/route.ts` | **Create** | Accept POST with dump payload, log server-side, return `{ ok, timestamp, requestId }`. Max 100KB, rate-limited 1/30s per IP |
| `apps/web/src/app/layout.tsx` | **Modify** | Call `initDebugCapture()` (client component wrapper) |
| `apps/web/src/components/admin/AdminNav.tsx` | **Modify** | Remove `initDebugCapture()` call (now in root layout). Keep copy button, add download button |
| `apps/web/src/app/api/settings/public/route.ts` | **Modify** | Replace `console.error` with `logger.error` + context |
| `apps/web/src/app/api/volume-discounts/route.ts` | **Modify** | Same |
| `apps/web/src/app/api/shipping-zones/route.ts` | **Modify** | Same |
| `apps/web/src/app/api/extras/route.ts` | **Modify** | Same |
| `apps/web/src/app/api/methods/route.ts` | **Modify** | Same |
| `apps/web/src/app/api/tracking/[code]/route.ts` | **Modify** | Same |
| `apps/web/src/app/api/quote/submit/route.ts` | **Modify** | Same |
| `apps/web/src/app/api/quote/calculate/route.ts` | **Modify** | Same |
| `apps/web/src/app/api/leads/route.ts` | **Modify** | Same |
| `apps/web/src/app/api/admin/extras/route.ts` | **Modify** | Same |
| `apps/web/src/app/api/admin/extras/[id]/route.ts` | **Modify** | Same (includes `params.id` in context) |
| `apps/web/src/app/api/admin/methods/route.ts` | **Modify** | Same |
| `apps/web/src/app/api/admin/methods/[id]/route.ts` | **Modify** | Same |
| `apps/web/src/app/api/admin/volume-discounts/route.ts` | **Modify** | Same |
| `apps/web/src/app/api/admin/volume-discounts/[id]/route.ts` | **Modify** | Same |
| `apps/web/src/app/api/admin/shipping-zones/route.ts` | **Modify** | Same |
| `apps/web/src/app/api/admin/shipping-zones/[id]/route.ts` | **Modify** | Same |
| `apps/web/src/app/api/admin/quotes/route.ts` | **Modify** | Same |
| `apps/web/src/app/api/webhooks/whatsapp/route.ts` | **Modify** | Same (special: fire-and-forget `.catch(console.error)` pattern) |
| `apps/web/src/app/api/upload/route.ts` | **Modify** | Adopt logger (currently uses raw `console.log/error` with `[upload]` prefix) |

---

### Task 1: Create `lib/logger.ts`

**Files:**
- Create: `apps/web/src/lib/logger.ts`

- [ ] **Step 1: Write the file**

```typescript
function ts(): string {
  return new Date().toISOString()
}

function format(level: string, module: string, context: Record<string, unknown>, message: string): string {
  const ctx = Object.keys(context).length > 0
    ? ` ${JSON.stringify(context, jsonReplacer)}`
    : ''
  return `${ts()} [${level}] [${module}]${ctx} ${message}`
}

function jsonReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Error) {
    return { message: value.message, stack: value.stack?.split('\n').slice(0, 3).join('|') }
  }
  return value
}

export function createLogger(module: string) {
  return {
    info(context: Record<string, unknown>, message: string) {
      console.log(format('INFO', module, context, message))
    },
    warn(context: Record<string, unknown>, message: string) {
      console.warn(format('WARN', module, context, message))
    },
    error(context: Record<string, unknown>, message: string) {
      console.error(format('ERROR', module, context, message))
    },
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/lib/logger.ts
git commit -m "feat: add centralized logger utility"
```

---

### Task 2: Create `POST /api/debug-dump`

**Files:**
- Create: `apps/web/src/app/api/debug-dump/route.ts`

- [ ] **Step 1: Write the route**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'

const log = createLogger('debug-dump')

const MAX_PAYLOAD = 100 * 1024 // 100KB
const RATE_WINDOW = 30_000 // 30 seconds

const ipTimestamps = new Map<string, number>()

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  const last = ipTimestamps.get(ip)
  const now = Date.now()
  if (last && (now - last) < RATE_WINDOW) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
  }
  ipTimestamps.set(ip, now)

  try {
    const body = await req.json()
    const raw = JSON.stringify(body)
    if (raw.length > MAX_PAYLOAD) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
    }

    log.info({ ip, entryCount: body.entries?.length, url: body.url }, 'Client debug report')

    // Log each entry individually for searchability
    for (const entry of (body.entries || [])) {
      const args = (entry.args || []).join(' ')
      console.error(`[debug-dump] [${entry.type}] ${entry.timestamp} ${args}`)
    }

    return NextResponse.json({ ok: true, timestamp: new Date().toISOString(), requestId: crypto.randomUUID?.() || ts() })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    log.error({ error: msg }, 'Failed to process debug dump')
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
}

function ts() {
  return Date.now().toString(36)
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/api/debug-dump/route.ts
git commit -m "feat: add debug-dump endpoint for client error reports"
```

---

### Task 3: Expand `lib/debug-capture.ts`

**Files:**
- Modify: `apps/web/src/lib/debug-capture.ts`

- [ ] **Step 1: Write the expanded file**

```typescript
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
    origError('debug-capture report failed')
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
```

Key changes from current:
- `MAX`: 50 → 200
- Added `origLog`, `origWarn`, `origError` at module level (used by `autoReport` to avoid recursion)
- Added `autoReport()` with 30s cooldown, called from patched `console.error` + error handlers
- Added `downloadDebugDump()` — creates blob, triggers download
- `getDebugDump()` now uses `document.querySelector('meta[name="app-version"]')` instead of `process.env` (works in browser)

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/lib/debug-capture.ts
git commit -m "feat: expand debug-capture to 200 entries, add download + auto-report"
```

---

### Task 4: Move `initDebugCapture` to root layout, update AdminNav

**Files:**
- Modify: `apps/web/src/app/layout.tsx`
- Modify: `apps/web/src/components/admin/AdminNav.tsx`

**layout.tsx** — Need a client component wrapper since `initDebugCapture()` uses browser APIs:

- [ ] **Step 1: Create client wrapper**

```typescript
// apps/web/src/components/DebugCaptureInit.tsx
'use client'

import { useEffect } from 'react'
import { initDebugCapture } from '@/lib/debug-capture'

export function DebugCaptureInit() {
  useEffect(() => { initDebugCapture() }, [])
  return null
}
```

- [ ] **Step 2: Update root layout**

Add the `DebugCaptureInit` component inside `<body>` (before `{children}`):

```typescript
// In apps/web/src/app/layout.tsx
// Add import:
import { DebugCaptureInit } from '@/components/DebugCaptureInit'

// Add inside <ThemeProvider> before {children}:
<DebugCaptureInit />
```

- [ ] **Step 3: Update AdminNav**

Remove the `initDebugCapture()` import and useEffect call. Add a download button alongside the existing copy button:

```typescript
// Remove from imports:
import { getDebugDump, initDebugCapture } from '@/lib/debug-capture'
// Change to:
import { getDebugDump, downloadDebugDump } from '@/lib/debug-capture'

// Remove the useEffect initDebugCapture call (line 36)

// Add download button after the existing copy button:
<button
  onClick={downloadDebugDump}
  className="inline-flex items-center justify-center h-5 w-5 rounded text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted transition-colors"
  title="Descargar debug info"
>
  <span className="text-[9px] font-mono">DL</span>
</button>
```

- [ ] **Step 4: Add version meta tag to layout.tsx**

In `layout.tsx` `head`/`metadata`, add a meta tag so `getDebugDump()` can read the version client-side:

```typescript
// In the root layout's returned JSX, add inside <html> or <head>:
// Next.js App Router: use metadata export or viewport. For client-accessible version:
// Add to the <body> or a script tag. Simplest: add as a meta tag in layout.tsx

// Since layout.tsx is a server component, add in the body:
<meta name="app-version" content={process.env.NEXT_PUBLIC_APP_VERSION || '?'} />
```

Actually, in Next.js App Router, `metadata` is exported but doesn't render meta tags you can querySelector. Need to add it in the JSX directly:

```tsx
// In layout.tsx, inside <body>:
<meta name="app-version" content={process.env.NEXT_PUBLIC_APP_VERSION || '?'} />
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/DebugCaptureInit.tsx apps/web/src/app/layout.tsx apps/web/src/components/admin/AdminNav.tsx
git commit -m "feat: move debug-capture init to root layout, add download button to AdminNav"
```

---

### Task 5: Migrate public GET API routes (6 files)

**Files:**
- Modify: `apps/web/src/app/api/settings/public/route.ts`
- Modify: `apps/web/src/app/api/volume-discounts/route.ts`
- Modify: `apps/web/src/app/api/shipping-zones/route.ts`
- Modify: `apps/web/src/app/api/extras/route.ts`
- Modify: `apps/web/src/app/api/methods/route.ts`
- Modify: `apps/web/src/app/api/tracking/[code]/route.ts`

**Pattern for all 6 files:**

Add import at top:
```typescript
import { createLogger } from '@/lib/logger'
```

Add after imports:
```typescript
const log = createLogger('api/PATH')
```

Replace:
```typescript
console.error('GET /api/PATH error:', error)
```
With:
```typescript
log.error({ path: '/api/PATH', method: 'GET', error }, 'Failed to fetch')
```

For `tracking/[code]/route.ts`, also include params.code:
```typescript
log.error({ path: '/api/tracking/[code]', method: 'GET', code: params.code, error }, 'Failed to fetch tracking')
```

- [ ] **Step 1: Migrate `settings/public/route.ts`**

```typescript
// Add after imports
import { createLogger } from '@/lib/logger'
const log = createLogger('api/settings/public')

// In GET catch block, replace:
console.error('GET /api/settings/public error:', error)
// With:
log.error({ path: '/api/settings/public', method: 'GET', error }, 'Failed to fetch public settings')
```

- [ ] **Step 2: Migrate `volume-discounts/route.ts`**

```typescript
import { createLogger } from '@/lib/logger'
const log = createLogger('api/volume-discounts')

// In GET catch:
log.error({ path: '/api/volume-discounts', method: 'GET', error }, 'Failed to fetch volume discounts')
```

- [ ] **Step 3: Migrate `shipping-zones/route.ts`**

```typescript
import { createLogger } from '@/lib/logger'
const log = createLogger('api/shipping-zones')

// In GET catch:
log.error({ path: '/api/shipping-zones', method: 'GET', error }, 'Failed to fetch shipping zones')
```

- [ ] **Step 4: Migrate `extras/route.ts`**

```typescript
import { createLogger } from '@/lib/logger'
const log = createLogger('api/extras')

// In GET catch:
log.error({ path: '/api/extras', method: 'GET', error }, 'Failed to fetch extras')
```

- [ ] **Step 5: Migrate `methods/route.ts`**

```typescript
import { createLogger } from '@/lib/logger'
const log = createLogger('api/methods')

// In GET catch:
log.error({ path: '/api/methods', method: 'GET', error }, 'Failed to fetch methods')
```

- [ ] **Step 6: Migrate `tracking/[code]/route.ts`**

```typescript
import { createLogger } from '@/lib/logger'
const log = createLogger('api/tracking')

// In GET catch (has params.code):
log.error({ path: '/api/tracking/[code]', method: 'GET', code: params.code, error }, 'Failed to fetch tracking')
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/api/settings/public/route.ts apps/web/src/app/api/volume-discounts/route.ts apps/web/src/app/api/shipping-zones/route.ts apps/web/src/app/api/extras/route.ts apps/web/src/app/api/methods/route.ts apps/web/src/app/api/tracking/\[code\]/route.ts
git commit -m "feat: migrate public GET routes to centralized logger"
```

---

### Task 6: Migrate quote + leads routes (3 files)

**Files:**
- Modify: `apps/web/src/app/api/quote/submit/route.ts`
- Modify: `apps/web/src/app/api/quote/calculate/route.ts`
- Modify: `apps/web/src/app/api/leads/route.ts`

- [ ] **Step 1: Migrate `quote/submit/route.ts`**

Add import + logger:
```typescript
import { createLogger } from '@/lib/logger'
const log = createLogger('api/quote/submit')
```

Replace catch block:
```typescript
// Before:
console.error('POST /api/quote/submit error:', error)

// After:
log.error({ path: '/api/quote/submit', method: 'POST', error }, 'Failed to submit quote')
```

- [ ] **Step 2: Migrate `quote/calculate/route.ts`**

```typescript
import { createLogger } from '@/lib/logger'
const log = createLogger('api/quote/calculate')

// In catch:
log.error({ path: '/api/quote/calculate', method: 'POST', error }, 'Failed to calculate quote')
```

- [ ] **Step 3: Migrate `leads/route.ts`**

```typescript
import { createLogger } from '@/lib/logger'
const log = createLogger('api/leads')

// Replace:
console.error('Lead creation error:', err)
// With:
log.error({ path: '/api/leads', method: 'POST', error: err }, 'Failed to create lead')
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/api/quote/submit/route.ts apps/web/src/app/api/quote/calculate/route.ts apps/web/src/app/api/leads/route.ts
git commit -m "feat: migrate quote and leads routes to centralized logger"
```

---

### Task 7: Migrate admin CRUD — extras + methods (4 files)

**Files:**
- Modify: `apps/web/src/app/api/admin/extras/route.ts`
- Modify: `apps/web/src/app/api/admin/extras/[id]/route.ts`
- Modify: `apps/web/src/app/api/admin/methods/route.ts`
- Modify: `apps/web/src/app/api/admin/methods/[id]/route.ts`

- [ ] **Step 1: Migrate `admin/extras/route.ts`**

```typescript
import { createLogger } from '@/lib/logger'
const log = createLogger('admin/extras')

// In GET catch:
log.error({ path: '/api/admin/extras', method: 'GET', error }, 'Failed to fetch extras')

// In POST catch (after ZodError check):
log.error({ path: '/api/admin/extras', method: 'POST', error }, 'Failed to create extra')
```

- [ ] **Step 2: Migrate `admin/extras/[id]/route.ts`**

```typescript
import { createLogger } from '@/lib/logger'
const log = createLogger('admin/extras')

// In PATCH catch (after ZodError check):
log.error({ path: '/api/admin/extras/[id]', method: 'PATCH', id: params.id, error }, 'Failed to update extra')

// In DELETE catch:
log.error({ path: '/api/admin/extras/[id]', method: 'DELETE', id: params.id, error }, 'Failed to delete extra')
```

- [ ] **Step 3: Migrate `admin/methods/route.ts`**

```typescript
import { createLogger } from '@/lib/logger'
const log = createLogger('admin/methods')

// In GET catch:
log.error({ path: '/api/admin/methods', method: 'GET', error }, 'Failed to fetch methods')

// In POST catch (after ZodError check):
log.error({ path: '/api/admin/methods', method: 'POST', error }, 'Failed to create method')
```

- [ ] **Step 4: Migrate `admin/methods/[id]/route.ts`**

```typescript
import { createLogger } from '@/lib/logger'
const log = createLogger('admin/methods')

// In PATCH catch (after ZodError check):
log.error({ path: '/api/admin/methods/[id]', method: 'PATCH', id: params.id, error }, 'Failed to update method')

// In DELETE catch:
log.error({ path: '/api/admin/methods/[id]', method: 'DELETE', id: params.id, error }, 'Failed to delete method')
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/api/admin/extras/route.ts "apps/web/src/app/api/admin/extras/[id]/route.ts" apps/web/src/app/api/admin/methods/route.ts "apps/web/src/app/api/admin/methods/[id]/route.ts"
git commit -m "feat: migrate admin extras + methods routes to centralized logger"
```

---

### Task 8: Migrate admin CRUD — volume-discounts + shipping-zones (4 files)

**Files:**
- Modify: `apps/web/src/app/api/admin/volume-discounts/route.ts`
- Modify: `apps/web/src/app/api/admin/volume-discounts/[id]/route.ts`
- Modify: `apps/web/src/app/api/admin/shipping-zones/route.ts`
- Modify: `apps/web/src/app/api/admin/shipping-zones/[id]/route.ts`

- [ ] **Step 1: Migrate `admin/volume-discounts/route.ts`**

```typescript
import { createLogger } from '@/lib/logger'
const log = createLogger('admin/volume-discounts')

// In GET catch:
log.error({ path: '/api/admin/volume-discounts', method: 'GET', error }, 'Failed to fetch volume discounts')

// In POST catch (after ZodError check):
log.error({ path: '/api/admin/volume-discounts', method: 'POST', error }, 'Failed to create volume discount')
```

- [ ] **Step 2: Migrate `admin/volume-discounts/[id]/route.ts`**

```typescript
import { createLogger } from '@/lib/logger'
const log = createLogger('admin/volume-discounts')

// In PATCH catch:
log.error({ path: '/api/admin/volume-discounts/[id]', method: 'PATCH', id: params.id, error }, 'Failed to update volume discount')

// In DELETE catch:
log.error({ path: '/api/admin/volume-discounts/[id]', method: 'DELETE', id: params.id, error }, 'Failed to delete volume discount')
```

- [ ] **Step 3: Migrate `admin/shipping-zones/route.ts`**

```typescript
import { createLogger } from '@/lib/logger'
const log = createLogger('admin/shipping-zones')

// In GET catch:
log.error({ path: '/api/admin/shipping-zones', method: 'GET', error }, 'Failed to fetch shipping zones')

// In POST catch (after ZodError check):
log.error({ path: '/api/admin/shipping-zones', method: 'POST', error }, 'Failed to create shipping zone')
```

- [ ] **Step 4: Migrate `admin/shipping-zones/[id]/route.ts`**

```typescript
import { createLogger } from '@/lib/logger'
const log = createLogger('admin/shipping-zones')

// In PATCH catch:
log.error({ path: '/api/admin/shipping-zones/[id]', method: 'PATCH', id: params.id, error }, 'Failed to update shipping zone')

// In DELETE catch:
log.error({ path: '/api/admin/shipping-zones/[id]', method: 'DELETE', id: params.id, error }, 'Failed to delete shipping zone')
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/api/admin/volume-discounts/route.ts "apps/web/src/app/api/admin/volume-discounts/[id]/route.ts" apps/web/src/app/api/admin/shipping-zones/route.ts "apps/web/src/app/api/admin/shipping-zones/[id]/route.ts"
git commit -m "feat: migrate admin volume-discounts + shipping-zones routes to centralized logger"
```

---

### Task 9: Migrate remaining routes — admin/quotes + webhooks/whatsapp + upload

**Files:**
- Modify: `apps/web/src/app/api/admin/quotes/route.ts`
- Modify: `apps/web/src/app/api/webhooks/whatsapp/route.ts`
- Modify: `apps/web/src/app/api/upload/route.ts`

- [ ] **Step 1: Migrate `admin/quotes/route.ts`**

```typescript
import { createLogger } from '@/lib/logger'
const log = createLogger('admin/quotes')

// Replace:
console.error('PDF generation failed:', err)
// With:
log.error({ path: '/api/admin/quotes', method: 'POST', error: err }, 'PDF generation failed')
```

- [ ] **Step 2: Migrate `webhooks/whatsapp/route.ts`**

```typescript
import { createLogger } from '@/lib/logger'
const log = createLogger('webhooks/whatsapp')
```

Changes:
- `.catch(console.error)` → `.catch(err => log.error({ error: err }, 'WhatsApp webhook handler failed'))`
- `console.error('Coffee update failed:', err)` → `log.error({ error: err, from }, 'Coffee update failed')`

- [ ] **Step 3: Migrate `upload/route.ts`**

```typescript
import { createLogger } from '@/lib/logger'
const log = createLogger('api/upload')

// Replace:
console.log(`[upload] saved ${filePath} -> ${publicUrl}`)
// With:
log.info({ path: '/api/upload', method: 'POST', folder, filename: safeName }, 'File saved')

// Replace:
console.error(`[upload] error ${msg}`)
// With:
log.error({ path: '/api/upload', method: 'POST', error: msg }, 'Upload failed')
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/api/admin/quotes/route.ts apps/web/src/app/api/webhooks/whatsapp/route.ts apps/web/src/app/api/upload/route.ts
git commit -m "feat: migrate admin/quotes, webhooks/whatsapp, and upload routes to centralized logger"
```

---

### Task 10: Final verification

- [ ] **Step 1: Build check**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 2: Verify imports**

Run: `rg "from '@/lib/logger'" apps/web/src/app/api/` — should show 19+ files using the logger.
Run: `rg "console\.(error|log)\(.*error" apps/web/src/app/api/` — should show 0 remaining raw error logs (excluding the logger utility itself).

- [ ] **Step 3: Tag and push**

```bash
git tag v1.3.14
git push origin main --tags
```

# Logging Improvements Design

## Summary

Improve server-side error context and expand client-side debug capture across all pages.

## Server-side: Centralized Logger

### `lib/logger.ts`

A zero-dependency logger utility:

```
createLogger(module: string) → { info, warn, error }
```

Each method signature: `(context: Record<string, unknown>, message: string)`

Output format:
```
[2026-06-16T10:30:00.000Z] [ERROR] [admin/products] {requestId:"abc",productId:"123"} Failed to fetch product
```

### API Route Migration

All 24 API route files follow this pattern:

Before:
```typescript
console.error('GET /api/admin/extras error:', error)
```

After:
```typescript
const log = createLogger('admin/extras')
// in catch:
log.error({ path: '/api/admin/extras', method: 'GET', error }, 'Failed to fetch extras')
```

Context includes relevant IDs (from URL params), sanitized body summary for mutations (strip password/token/api-key fields), and error details.

Health endpoints (`/health`, `/api/health`) are left as-is.

## Client-side: Expanded Debug Capture

### Changes to `lib/debug-capture.ts`

- **Buffer:** 50 → 200 entries (FIFO ring buffer)
- **Initialization:** Moved to root `layout.tsx` (not just `AdminNav.tsx`). Function is idempotent.
- **New export `downloadDebugDump()`:** Serializes dump to `.txt` Blob, triggers browser download
- **New export `reportDebugDump()`:** POSTs dump to `/api/debug-dump`, returns `{ timestamp, requestId }`
- **Auto-report:** Monkey-patched `console.error` and `unhandledrejection` handler auto-POST dump to server. Protected against recursion: the POST fetch uses the original unpatched `console` methods (stored before patching). Rate-limited to 1 auto-report per 30 seconds per page session.
- **No recursion:** Store original `console.*` methods before patching. The auto-report POST uses originals for any internal logging, breaking the cycle.

### New API Route `POST /api/debug-dump`

Accepts `{ version, url, userAgent, screen, theme, entries }`, logs it server-side with the full payload. Returns `{ ok: true, timestamp, requestId }`.

**Guardrails:**
- **Payload size limit:** 100KB max
- **Rate limit:** In-memory, 1 request per 30 seconds per IP
- **No auth required** — endpoint only logs, returns no sensitive data

## Files Changed

| File | Change |
|---|---|
| `apps/web/src/lib/logger.ts` | New — centralized logger utility |
| `apps/web/src/lib/debug-capture.ts` | Expand buffer 50→200, add download/report exports, auto-report on error |
| `apps/web/src/app/api/debug-dump/route.ts` | New — accepts debug dump POST, logs server-side |
| `apps/web/src/app/layout.tsx` | Call `initDebugCapture()` |
| `apps/web/src/components/admin/AdminNav.tsx` | Remove `initDebugCapture()` call, add download button |
| 24 API route files in `apps/web/src/app/api/` | Replace `console.error` with `logger.error` + context |

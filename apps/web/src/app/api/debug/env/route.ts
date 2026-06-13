import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export function GET() {
  const keys = Object.keys(process.env).sort()
  const safe = keys.reduce<Record<string, string | null>>((acc, k) => {
    if (k.startsWith('NEXT_PUBLIC_') || k.startsWith('RAILWAY_')) {
      acc[k] = process.env[k] ?? null
    } else if (['PORT', 'NODE_ENV', 'DATABASE_URL', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL', 'ADMIN_EMAIL'].includes(k)) {
      const v = process.env[k]
      if (v && (k.includes('SECRET') || k.includes('PASSWORD') || k === 'DATABASE_URL')) {
        acc[k] = v.length > 0 ? `SET (${v.length} chars)` : 'EMPTY'
      } else {
        acc[k] = v ?? 'UNDEFINED'
      }
    }
    return acc
  }, {})

  return NextResponse.json({
    envCount: keys.length,
    vars: safe,
    sampleKeys: keys.slice(0, 30),
    NODE_ENV: process.env.NODE_ENV,
    hasDB: !!process.env.DATABASE_URL,
  })
}

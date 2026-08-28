'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Globe } from 'lucide-react'

export function LanguageSwitcher() {
  const pathname = usePathname()
  const isEn = pathname.startsWith('/en')

  const switchPath = isEn
    ? pathname.replace(/^\/en/, '') || '/'
    : `/en${pathname}`

  return (
    <Link
      href={switchPath}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
    >
      <Globe className="h-3.5 w-3.5" />
      {isEn ? 'ES' : 'EN'}
    </Link>
  )
}

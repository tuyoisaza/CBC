'use client'

import { useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'
import { Moon, Sun, Menu, X } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { useState, useEffect } from 'react'
import { LocaleSwitcher } from './LocaleSwitcher'

const WA_URL = 'https://wa.me/5215572293512?text=Hola%2C%20quiero%20cotizar%20cajas%20de%20regalo%20CBC'

export function PublicHeader() {
  const t = useTranslations('nav')
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch: next-themes can't read localStorage on the server.
  // Don't render theme-dependent UI until after the first client paint.
  useEffect(() => setMounted(true), [])

  // During SSR / initial hydration, default to dark (matches defaultTheme="dark")
  const isDark = mounted ? theme === 'dark' : true

  return (
    <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight">
              <span className="text-primary">Coffee</span>{' '}
              <span className="text-foreground">Bunn Café</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/cotizar"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('quote')}
            </Link>
            <a
              href="/tracking/search"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('tracking')}
            </a>
            <LocaleSwitcher />
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label={isDark ? t('toggleLight') : t('toggleDark')}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <a
              href={WA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {t('quote')}
            </a>
          </nav>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-muted-foreground"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden border-t border-border py-4 space-y-3">
            <Link href="/cotizar" className="block px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground">
              {t('quote')}
            </Link>
            <a href="/tracking/search" className="block px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground">
              {t('tracking')}
            </a>
            <div className="flex items-center gap-3 px-2 pt-2">
              <LocaleSwitcher />
              <button
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                className="p-2 text-muted-foreground hover:text-foreground"
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

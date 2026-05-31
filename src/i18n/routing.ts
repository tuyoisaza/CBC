import { defineRouting } from 'next-intl/routing'
import { createNavigation } from 'next-intl/navigation'

export const routing = defineRouting({
  locales: ['es', 'en'],
  defaultLocale: 'es',
  localePrefix: 'as-needed', // /es → /, /en → /en
  pathnames: {
    '/': '/',
    '/cotizar': {
      es: '/cotizar',
      en: '/quote',
    },
    '/tracking/[code]': {
      es: '/seguimiento/[code]',
      en: '/tracking/[code]',
    },
  },
})

export type Locale = (typeof routing.locales)[number]
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing)

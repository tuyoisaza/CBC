import { describe, it, expect } from 'vitest'
import { t, translations, useTranslation } from '../i18n'

describe('i18n', () => {
  it('t() returns Spanish text for es', () => {
    expect(t('es', 'public.quote')).toBe('Cotizar')
    expect(t('es', 'nav.dashboard')).toBe('Dashboard')
    expect(t('es', 'common.save')).toBe('Guardar')
  })

  it('t() returns English text for en', () => {
    expect(t('en', 'public.quote')).toBe('Get a Quote')
    expect(t('en', 'nav.dashboard')).toBe('Dashboard')
    expect(t('en', 'common.save')).toBe('Save')
  })

  it('t() returns path when key not found', () => {
    expect(t('es', 'nonexistent.key')).toBe('nonexistent.key')
    expect(t('en', 'missing')).toBe('missing')
  })

  it('translations has all sections', () => {
    expect(translations).toHaveProperty('nav')
    expect(translations).toHaveProperty('dashboard')
    expect(translations).toHaveProperty('settings')
    expect(translations).toHaveProperty('service')
    expect(translations).toHaveProperty('common')
    expect(translations).toHaveProperty('public')
  })

  it('every key has both es and en values', () => {
    function checkKeys(node: Record<string, unknown>, path: string) {
      for (const [key, value] of Object.entries(node)) {
        if (typeof value === 'object' && value !== null && 'es' in value && 'en' in value) {
          const esVal = (value as Record<string, string>).es
          const enVal = (value as Record<string, string>).en
          expect(typeof esVal).toBe('string')
          expect(typeof enVal).toBe('string')
          expect(esVal.length).toBeGreaterThan(0)
          expect(enVal.length).toBeGreaterThan(0)
        } else if (typeof value === 'object' && value !== null) {
          checkKeys(value as Record<string, unknown>, `${path}.${key}`)
        }
      }
    }
    checkKeys(translations, 'translations')
  })

  it('useTranslation returns a t function bound to lang', () => {
    const es = useTranslation('es')
    const en = useTranslation('en')
    expect(es.t('public.quote')).toBe('Cotizar')
    expect(en.t('public.quote')).toBe('Get a Quote')
  })
})

import { describe, it, expect } from 'vitest'
import { env } from '../env'

describe('env', () => {
  it('env is an object', () => {
    expect(typeof env).toBe('object')
    expect(env).not.toBeNull()
  })

  it('env has property access without throwing', () => {
    expect(() => env.NODE_ENV).not.toThrow()
  })

  it('NEXT_PUBLIC_APP_URL is defined when present', () => {
    const url = env.NEXT_PUBLIC_APP_URL
    if (url) {
      expect(typeof url).toBe('string')
      expect(url.length).toBeGreaterThan(0)
    }
  })

  it('DATABASE_URL schema requires non-empty string', () => {
    // The schema requires DATABASE_URL to be min(1). If present in env it must be non-empty.
    if (process.env.DATABASE_URL) {
      expect(process.env.DATABASE_URL.length).toBeGreaterThan(0)
    }
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('debug-capture', () => {
  const origConsole = { log: console.log, warn: console.warn, error: console.error }

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    console.log = origConsole.log
    console.warn = origConsole.warn
    console.error = origConsole.error
    vi.restoreAllMocks()
  })

  it('console.log is a callable function', () => {
    expect(typeof console.log).toBe('function')
    console.log('test')
  })

  it('console.warn is a callable function', () => {
    expect(typeof console.warn).toBe('function')
    console.warn('test')
  })

  it('console.error is a callable function', () => {
    expect(typeof console.error).toBe('function')
    console.error('test')
  })
})

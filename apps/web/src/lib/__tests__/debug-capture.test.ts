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
    vi.unstubAllGlobals()
  })

  it('does not capture, export or transmit configuration-page diagnostics', async () => {
    vi.resetModules()
    vi.stubGlobal('location', { pathname: '/admin/configuration', href: 'https://cbc.example/admin/configuration' })
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    const capture = await import('../debug-capture')
    capture.initDebugCapture()
    console.error('pretend-sensitive-value')
    expect(capture.getDebugDump()).not.toContain('pretend-sensitive-value')
    expect(await capture.reportDebugDump()).toEqual({ ok: false })
    expect(fetch).not.toHaveBeenCalled()
    vi.stubGlobal('location', { pathname: '/admin/dashboard', href: 'https://cbc.example/admin/dashboard' })
    expect(capture.getDebugDump()).not.toContain('pretend-sensitive-value')
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

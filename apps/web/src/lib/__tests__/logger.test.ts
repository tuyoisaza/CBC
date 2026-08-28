import { describe, it, expect, vi } from 'vitest'
import { createLogger } from '../logger'

describe('createLogger', () => {
  it('returns an object with info, warn, error methods', () => {
    const logger = createLogger('test-module')
    expect(typeof logger.info).toBe('function')
    expect(typeof logger.warn).toBe('function')
    expect(typeof logger.error).toBe('function')
  })

  it('info calls console.log with formatted message', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const logger = createLogger('auth')
    logger.info({ userId: '123' }, 'User logged in')
    expect(spy).toHaveBeenCalledOnce()
    const output = spy.mock.calls[0][0] as string
    expect(output).toContain('[INFO]')
    expect(output).toContain('[auth]')
    expect(output).toContain('User logged in')
    expect(output).toContain('"userId":"123"')
    spy.mockRestore()
  })

  it('warn calls console.warn with formatted message', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const logger = createLogger('db')
    logger.warn({ query: 'slow' }, 'Query took too long')
    expect(spy).toHaveBeenCalledOnce()
    const output = spy.mock.calls[0][0] as string
    expect(output).toContain('[WARN]')
    expect(output).toContain('[db]')
    expect(output).toContain('Query took too long')
    spy.mockRestore()
  })

  it('error calls console.error with formatted message', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const logger = createLogger('api')
    logger.error({ status: 500 }, 'Internal error')
    expect(spy).toHaveBeenCalledOnce()
    const output = spy.mock.calls[0][0] as string
    expect(output).toContain('[ERROR]')
    expect(output).toContain('[api]')
    expect(output).toContain('Internal error')
    spy.mockRestore()
  })

  it('handles Error objects in context', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const logger = createLogger('test')
    logger.error({ err: new Error('boom') }, 'failed')
    expect(spy).toHaveBeenCalledOnce()
    spy.mockRestore()
  })
})

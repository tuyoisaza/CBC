import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../integration-secrets', () => ({
  getIntegrationValues: vi.fn(async (keys: readonly string[]) => Object.fromEntries(keys.map(key => [key, process.env[key]]))),
}))

describe('email', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.restoreAllMocks()
  })

  it('sendEmail returns false when no provider configured', async () => {
    delete process.env.BREVO_API_KEY
    delete process.env.RESEND_API_KEY
    delete process.env.RESEND_FROM_EMAIL
    const { sendEmail } = await import('../email')
    const result = await sendEmail({ to: 'test@test.com', subject: 'Hi', html: '<p>Hi</p>' })
    expect(result).toBe(false)
  })

  it('sendEmail uses Brevo when BREVO_API_KEY is set', async () => {
    process.env.BREVO_API_KEY = 'test-brevo-key'
    delete process.env.RESEND_API_KEY
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal('fetch', mockFetch)
    const { sendEmail } = await import('../email')
    const result = await sendEmail({ to: 'a@b.com', subject: 'S', html: '<p>X</p>' })
    expect(result).toBe(true)
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.brevo.com/v3/smtp/email',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'api-key': 'test-brevo-key' }),
      }),
    )
    vi.unstubAllGlobals()
  })

  it('sendEmail returns false when Brevo returns non-ok', async () => {
    process.env.BREVO_API_KEY = 'test-brevo-key'
    delete process.env.RESEND_API_KEY
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => 'server error' })
    vi.stubGlobal('fetch', mockFetch)
    const { sendEmail } = await import('../email')
    const result = await sendEmail({ to: 'a@b.com', subject: 'S', html: '<p>X</p>' })
    expect(result).toBe(false)
    vi.unstubAllGlobals()
  })

  it('sendEmail catches fetch errors and returns false', async () => {
    process.env.BREVO_API_KEY = 'test-brevo-key'
    delete process.env.RESEND_API_KEY
    const mockFetch = vi.fn().mockRejectedValue(new Error('network down'))
    vi.stubGlobal('fetch', mockFetch)
    const { sendEmail } = await import('../email')
    const result = await sendEmail({ to: 'a@b.com', subject: 'S', html: '<p>X</p>' })
    expect(result).toBe(false)
    vi.unstubAllGlobals()
  })

  it('reads new credentials and honors disabled configuration on each call', async () => {
    process.env.BREVO_API_KEY = 'environment-key-must-not-return'
    const { getIntegrationValues } = await import('../integration-secrets')
    vi.mocked(getIntegrationValues)
      .mockResolvedValueOnce({ BREVO_API_KEY: 'vault-first', EMAIL_FROM: 'first@example.test' })
      .mockResolvedValueOnce({ BREVO_API_KEY: 'vault-second', EMAIL_FROM: 'second@example.test' })
      .mockResolvedValueOnce({ BREVO_API_KEY: undefined, RESEND_API_KEY: undefined })
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    const { sendEmail } = await import('../email')
    const email = { to: 'customer@example.test', subject: 'Receipt', html: '<p>Receipt</p>' }
    expect(await sendEmail(email)).toBe(true)
    expect(await sendEmail(email)).toBe(true)
    expect(await sendEmail(email)).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][1].headers['api-key']).toBe('vault-first')
    expect(fetchMock.mock.calls[1][1].headers['api-key']).toBe('vault-second')
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).sender.email).toBe('second@example.test')
    vi.unstubAllGlobals()
  })

  it('does not log provider errors that contain credentials', async () => {
    process.env.BREVO_API_KEY = 'test-brevo-key'
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue({ config: { headers: { Authorization: 'secret' } } }))
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { sendEmail } = await import('../email')
    expect(await sendEmail({ to: 'a@b.com', subject: 'S', html: 'X' })).toBe(false)
    expect(log).toHaveBeenCalledWith('Email delivery failed')
    vi.unstubAllGlobals()
  })
})

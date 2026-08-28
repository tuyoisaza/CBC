import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

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
})

// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ guard: vi.fn(), findMany: vi.fn(), save: vi.fn(), importEnvironment: vi.fn() }))
vi.mock('@/lib/superadmin', () => ({
  requireSuperadmin: mocks.guard,
  SuperadminAccessError: class extends Error { constructor(public readonly status: 401 | 403 | 503) { super('private authorization detail') } },
}))
vi.mock('@/lib/db', () => ({ db: { integrationCredential: { findMany: mocks.findMany } } }))
vi.mock('@/lib/integration-secrets', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/integration-secrets')>(),
  saveIntegrationConfiguration: mocks.save,
  importIntegrationEnvironment: mocks.importEnvironment,
}))
import { SuperadminAccessError } from '@/lib/superadmin'
import { IntegrationInputError } from '@/lib/integration-secrets'
import { encryptIntegrationValue } from '@/lib/integration-crypto'
import { INTEGRATION_KEYS } from '@/lib/integration-catalog'
import { GET } from './route'
import { PUT } from './[provider]/route'
import { POST as IMPORT } from './import/route'

const actor = { id: 'superadmin-1', email: 'admin@example.com' }
const request = (body = JSON.stringify({ values: { MERCADOPAGO_ACCESS_TOKEN: 'replacement-secret' } }), headers: Record<string, string> = {}) => new NextRequest('https://cbc.example/api/admin/configuration/mercadopago', {
  method: 'PUT', headers: { origin: 'https://cbc.example', 'content-type': 'application/json', ...headers }, body,
})
const put = (req = request()) => PUT(req, { params: { provider: 'mercadopago' } })
const importRequest = (body: unknown = { provider: 'mercadopago' }) => request(JSON.stringify(body))

beforeEach(() => {
  vi.resetAllMocks()
  for (const key of INTEGRATION_KEYS) vi.stubEnv(key, '')
  vi.stubEnv('INTEGRATION_ENCRYPTION_KEY', Buffer.alloc(32, 7).toString('base64'))
  vi.stubEnv('NEXTAUTH_URL', 'https://cbc.example')
  vi.stubEnv('NEXT_PUBLIC_APP_URL', '')
  vi.stubEnv('NEXT_PUBLIC_ADMIN_URL', '')
  mocks.guard.mockResolvedValue(actor)
  mocks.findMany.mockResolvedValue([])
  mocks.save.mockResolvedValue({ ignored: 'internal-vault-secret' })
  mocks.importEnvironment.mockResolvedValue({ ignored: 'internal-import-secret' })
})
afterEach(() => { vi.unstubAllEnvs() })

describe('configuration API security boundary', () => {
  it.each([401, 403, 503] as const)('rejects every route when fresh authorization fails with %s, before reading secrets/body', async status => {
    mocks.guard.mockRejectedValue(new SuperadminAccessError(status))
    for (const run of [() => GET(), () => put(request('not-json')), () => IMPORT(importRequest())]) {
      const response = await run()
      expect(response.status).toBe(status)
      expect(await response.json()).toEqual({ error: 'Acceso no autorizado.' })
      expect(response.headers.get('cache-control')).toContain('no-store')
    }
    expect(mocks.findMany).not.toHaveBeenCalled()
    expect(mocks.save).not.toHaveBeenCalled()
    expect(mocks.importEnvironment).not.toHaveBeenCalled()
  })

  it('returns metadata from the real projection without environment secrets, plaintext, or ciphertext', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'environment-private-key')
    const encryptedValue = encryptIntegrationValue('mercadopago', 'MERCADOPAGO_ACCESS_TOKEN', 'stored-private-key')
    mocks.findMany.mockResolvedValue([{ key: 'MERCADOPAGO_ACCESS_TOKEN', provider: 'mercadopago', encryptedValue, disabled: false, updatedAt: new Date('2026-09-24T12:00:00Z') }])
    const response = await GET()
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0')
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    const body = await response.json()
    const secretFields = body.providers.flatMap((provider: any) => provider.fields).filter((field: any) => field.kind === 'secret')
    expect(secretFields.every((field: any) => !('value' in field) && !('encryptedValue' in field))).toBe(true)
    expect(secretFields.find((field: any) => field.key === 'MERCADOPAGO_ACCESS_TOKEN')).toMatchObject({ configured: true, source: 'database' })
    expect(secretFields.find((field: any) => field.key === 'STRIPE_SECRET_KEY')).toMatchObject({ configured: true, source: 'environment' })
    const serialized = JSON.stringify(body)
    for (const secret of ['environment-private-key', 'stored-private-key', encryptedValue]) expect(serialized).not.toContain(secret)
  })

  it('passes authorized sparse writes to the vault and never echoes payload or vault results', async () => {
    const response = await put()
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(mocks.save).toHaveBeenCalledWith('mercadopago', { values: { MERCADOPAGO_ACCESS_TOKEN: 'replacement-secret' } }, actor)
    expect(response.headers.get('cache-control')).toContain('no-store')
    const imported = await IMPORT(importRequest())
    expect(await imported.json()).toEqual({ ok: true })
    expect(mocks.importEnvironment).toHaveBeenCalledWith('mercadopago', actor)
  })

  it.each([
    { origin: 'https://evil.example' },
    { origin: '' },
    { origin: 'https://cbc.example.evil.example' },
    { origin: 'https://cbc.example', 'sec-fetch-site': 'cross-site' },
    { origin: 'https://evil.example', 'x-forwarded-host': 'evil.example', host: 'evil.example' },
  ] as Record<string, string>[])('rejects unsafe origins/forwarded host hints %j', async headers => {
    expect((await put(request(undefined, headers))).status).toBe(403)
    expect((await IMPORT(request(JSON.stringify({ provider: 'mercadopago' }), headers))).status).toBe(403)
    expect(mocks.save).not.toHaveBeenCalled()
    expect(mocks.importEnvironment).not.toHaveBeenCalled()
  })

  it.each(['https://main.example', 'https://admin.example'])('allows explicitly configured main/admin origin %s', async origin => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://main.example')
    vi.stubEnv('NEXT_PUBLIC_ADMIN_URL', 'https://admin.example')
    expect((await put(request(undefined, { origin, 'sec-fetch-site': 'same-origin' }))).status).toBe(200)
  })

  it('rejects an actually missing Origin header', async () => {
    const req = request()
    req.headers.delete('origin')
    expect((await put(req)).status).toBe(403)
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it('fails closed in production when no trusted origin is configured', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXTAUTH_URL', '')
    expect((await put()).status).toBe(503)
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it('rejects non-JSON media types and malformed JSON without echoing body contents', async () => {
    expect((await put(request('replacement-secret', { 'content-type': 'text/plain' }))).status).toBe(415)
    const malformed = await put(request('replacement-secret'))
    expect(malformed.status).toBe(400)
    expect(await malformed.text()).not.toContain('replacement-secret')
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it('enforces both announced and actual body byte size without trusting content-length', async () => {
    expect((await put(request('{}', { 'content-length': '65537' }))).status).toBe(413)
    expect((await put(request('x'.repeat(65537), { 'content-length': '1' }))).status).toBe(413)
    expect((await put(request('é'.repeat(32769)))).status).toBe(413)
    expect((await IMPORT(request('x'.repeat(65537)))).status).toBe(413)
    expect(mocks.save).not.toHaveBeenCalled()
    expect(mocks.importEnvironment).not.toHaveBeenCalled()
  })

  it('uses bounded streaming for chunked bodies and cancels on overflow', async () => {
    const cancel = vi.fn()
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) { controller.enqueue(new Uint8Array(32768)) }, cancel,
    })
    const req = new NextRequest('https://cbc.example/api/admin/configuration/mercadopago', {
      method: 'PUT', headers: { origin: 'https://cbc.example', 'content-type': 'application/json' }, body: stream, duplex: 'half',
    } as ConstructorParameters<typeof NextRequest>[1])
    expect((await put(req)).status).toBe(413)
    expect(cancel).toHaveBeenCalled()
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it.each([null, [], {}, { provider: 1 }, { provider: 'mercadopago', secret: 'do-not-accept' }])('rejects malformed import payload %j', async body => {
    expect((await IMPORT(importRequest(body))).status).toBe(400)
    expect(mocks.importEnvironment).not.toHaveBeenCalled()
  })

  it('returns validation errors without exposing submitted values', async () => {
    mocks.save.mockRejectedValue(new IntegrationInputError())
    const response = await put()
    expect(response.status).toBe(400)
    expect(await response.text()).not.toContain('replacement-secret')
  })

  it('returns generic failures without logging or serializing Prisma/provider details', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const privateError = new Error('DB CONNECTION: password=never-expose-this')
    mocks.findMany.mockRejectedValue(privateError)
    mocks.save.mockRejectedValue(privateError)
    mocks.importEnvironment.mockRejectedValue(privateError)
    for (const run of [() => GET(), () => put(), () => IMPORT(importRequest())]) {
      const response = await run()
      expect(response.status).toBe(503)
      expect(await response.json()).toEqual({ error: 'La configuración segura no está disponible.' })
    }
    expect(log).not.toHaveBeenCalled()
    log.mockRestore()
  })
})

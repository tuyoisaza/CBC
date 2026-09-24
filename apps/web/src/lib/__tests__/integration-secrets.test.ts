import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { randomBytes } from 'node:crypto'

const mocks = vi.hoisted(() => ({ findMany: vi.fn(), upsert: vi.fn(), createMany: vi.fn(), audit: vi.fn(), transaction: vi.fn() }))
vi.mock('@/lib/db', () => ({ db: {
  integrationCredential: { findMany: mocks.findMany }, $transaction: mocks.transaction,
} }))
import { encryptIntegrationValue, decryptIntegrationValue, integrationEncryptionReady } from '../integration-crypto'
import { getIntegrationValue, getIntegrationConfiguration, saveIntegrationConfiguration, importIntegrationEnvironment } from '../integration-secrets'

const actor = { id: 'superadmin-id', email: 'admin@example.com' }
const key = 'MERCADOPAGO_ACCESS_TOKEN'
const provider = 'mercadopago'
function row(value = 'stored-token') {
  return { key, provider, encryptedValue: encryptIntegrationValue(provider, key, value), disabled: false, updatedAt: new Date('2026-09-24'), updatedBy: actor.id }
}
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('INTEGRATION_ENCRYPTION_KEY', randomBytes(32).toString('base64'))
  vi.stubEnv(key, 'env-token')
  mocks.findMany.mockResolvedValue([])
  mocks.upsert.mockResolvedValue({})
  mocks.audit.mockResolvedValue({})
  mocks.createMany.mockResolvedValue({ count: 1 })
  mocks.transaction.mockImplementation(async callback => callback({ integrationCredential: {
    findMany: mocks.findMany, upsert: mocks.upsert, createMany: mocks.createMany,
  }, auditLog: { create: mocks.audit } }))
})
afterEach(() => vi.unstubAllEnvs())

describe('authenticated credential encryption', () => {
  it('uses randomized ciphertext with a separate key and binds it to provider and field', () => {
    const a = encryptIntegrationValue(provider, key, 'very-private-token')
    const b = encryptIntegrationValue(provider, key, 'very-private-token')
    expect(a).not.toEqual(b)
    expect(a).not.toContain('very-private-token')
    expect(decryptIntegrationValue(provider, key, a)).toBe('very-private-token')
    expect(() => decryptIntegrationValue('stripe', key, a)).toThrow('no está disponible')
    expect(() => decryptIntegrationValue(provider, 'MERCADOPAGO_WEBHOOK_SECRET', a)).toThrow()
    const parts = a.split('.')
    const ciphertext = Buffer.from(parts[3], 'base64'); ciphertext[0] ^= 1
    parts[3] = ciphertext.toString('base64')
    expect(() => decryptIntegrationValue(provider, key, parts.join('.'))).toThrow()
    vi.stubEnv('INTEGRATION_ENCRYPTION_KEY', randomBytes(32).toString('base64'))
    expect(() => decryptIntegrationValue(provider, key, a)).toThrow()
  })
  it('refuses absent, short or password-like master keys', () => {
    for (const value of ['', 'password', randomBytes(16).toString('base64')]) {
      vi.stubEnv('INTEGRATION_ENCRYPTION_KEY', value)
      expect(integrationEncryptionReady()).toBe(false)
      expect(() => encryptIntegrationValue(provider, key, 'secret')).toThrow()
    }
  })
})

describe('credential storage and API projection', () => {
  it('uses environment only for absent records, and sees rotations without a cache', async () => {
    expect(await getIntegrationValue(key)).toBe('env-token')
    mocks.findMany.mockResolvedValue([row('new-token')])
    expect(await getIntegrationValue(key)).toBe('new-token')
    mocks.findMany.mockResolvedValue([{ ...row(), disabled: true, encryptedValue: null }])
    expect(await getIntegrationValue(key)).toBeUndefined()
  })
  it('fails closed for DB errors, corrupt ciphertext or provider mismatch', async () => {
    mocks.findMany.mockRejectedValueOnce(new Error('database details'))
    await expect(getIntegrationValue(key)).rejects.toThrow('no está disponible')
    mocks.findMany.mockResolvedValue([{ ...row(), encryptedValue: 'invalid' }])
    await expect(getIntegrationValue(key)).rejects.toThrow('no está disponible')
    mocks.findMany.mockResolvedValue([{ ...row(), provider: 'stripe' }])
    await expect(getIntegrationValue(key)).rejects.toThrow()
  })
  it('does not expose plaintext, ciphertext, suffixes or values for secret fields', async () => {
    const record = row('sensitive-token-ending123')
    mocks.findMany.mockResolvedValue([record])
    const result = await getIntegrationConfiguration()
    const field = result.providers.find(item => item.id === provider)!.fields.find(item => item.key === key)!
    expect(field.configured).toBe(true)
    expect(field).not.toHaveProperty('value')
    expect(JSON.stringify(result)).not.toContain('ending123')
    expect(JSON.stringify(result)).not.toContain(record.encryptedValue)
    expect(JSON.stringify(result)).not.toContain('env-token')
  })
  it('sends only ciphertext to persistence and only names to audit', async () => {
    await saveIntegrationConfiguration(provider, { values: { [key]: 'replacement-secret' } }, actor)
    expect(mocks.transaction).toHaveBeenCalledOnce()
    const record = mocks.upsert.mock.calls[0][0].create
    expect(decryptIntegrationValue(provider, key, record.encryptedValue)).toBe('replacement-secret')
    expect(JSON.stringify(mocks.upsert.mock.calls)).not.toContain('replacement-secret')
    expect(JSON.stringify(mocks.audit.mock.calls)).not.toContain('replacement-secret')
    expect(mocks.audit.mock.calls[0][0].data.metadata.replaced).toEqual([key])
  })
  it('requires audit to succeed and does not report saved on an audit failure', async () => {
    mocks.audit.mockRejectedValueOnce(new Error('audit failure'))
    await expect(saveIntegrationConfiguration(provider, { values: { [key]: 'new-secret' } }, actor)).rejects.toThrow('no está disponible')
  })
  it('blank values preserve existing credentials; explicit disable writes a tombstone', async () => {
    await saveIntegrationConfiguration(provider, { values: { [key]: '' }, disable: ['MERCADOPAGO_WEBHOOK_SECRET'] }, actor)
    expect(mocks.upsert).toHaveBeenCalledOnce()
    expect(mocks.upsert.mock.calls[0][0].create).toMatchObject({ key: 'MERCADOPAGO_WEBHOOK_SECRET', disabled: true, encryptedValue: null })
  })
  it('rejects keys for another provider, unknown fields and ambiguous changes', async () => {
    const invalid = [
      { values: { STRIPE_SECRET_KEY: 'secret' } }, { values: { INTEGRATION_ENCRYPTION_KEY: 'secret' } },
      { values: { [key]: 'secret' }, disable: [key] }, { values: { MERCADOPAGO_TEST_MODE: 'maybe' } },
      { values: { [key]: 'secret' }, reveal: true }, { values: { [key]: 'line\nbreak' } },
    ]
    for (const payload of invalid) await expect(saveIntegrationConfiguration(provider, payload, actor)).rejects.toThrow('inválida')
    expect(mocks.transaction).not.toHaveBeenCalled()
  })
  it('imports environment secrets server-side without overwriting overrides or disabled records', async () => {
    vi.stubEnv('MERCADOPAGO_WEBHOOK_SECRET', 'signature-secret')
    vi.stubEnv('MERCADOPAGO_TEST_MODE', '')
    mocks.findMany.mockResolvedValue([{ key }])
    await importIntegrationEnvironment(provider, actor)
    const records = mocks.createMany.mock.calls[0][0].data
    expect(records).toHaveLength(1)
    expect(records[0].key).toBe('MERCADOPAGO_WEBHOOK_SECRET')
    expect(decryptIntegrationValue(provider, records[0].key, records[0].encryptedValue)).toBe('signature-secret')
    expect(mocks.createMany.mock.calls[0][0].skipDuplicates).toBe(true)
    expect(JSON.stringify(mocks.audit.mock.calls)).not.toContain('signature-secret')
  })
})

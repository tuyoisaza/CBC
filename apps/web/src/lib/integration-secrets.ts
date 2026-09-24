import 'server-only'
import { db } from '@/lib/db'
import { INTEGRATION_PROVIDERS, findIntegrationField } from './integration-catalog'
import { decryptIntegrationValue, encryptIntegrationValue, integrationEncryptionReady, IntegrationSecretError } from './integration-crypto'

export { IntegrationSecretError } from './integration-crypto'
export class IntegrationInputError extends Error {
  constructor() { super('Configuración inválida. Revisa los campos del proveedor.'); this.name = 'IntegrationInputError' }
}

/** No cache: rotations and disabling apply to the next operation. DB errors never fall back. */
export async function getIntegrationValues(keys: readonly string[]): Promise<Record<string, string | undefined>> {
  const fields = keys.map(key => {
    const entry = findIntegrationField(key)
    if (!entry) throw new IntegrationInputError()
    return entry
  })
  try {
    const rows = await db.integrationCredential.findMany({ where: { key: { in: [...keys] } } })
    const byKey = new Map(rows.map(row => [row.key, row]))
    return Object.fromEntries(fields.map(({ provider, field }) => {
      const row = byKey.get(field.key)
      if (!row) return [field.key, process.env[field.key]?.trim() || undefined]
      if (row.provider !== provider.id) throw new IntegrationSecretError()
      if (row.disabled) return [field.key, undefined]
      if (!row.encryptedValue) throw new IntegrationSecretError()
      return [field.key, decryptIntegrationValue(provider.id, field.key, row.encryptedValue)]
    }))
  } catch { throw new IntegrationSecretError() }
}

export async function getIntegrationValue(key: string): Promise<string | undefined> {
  return (await getIntegrationValues([key]))[key]
}

/** This is the ONLY browser-facing projection. Secret fields have no value property. */
export async function getIntegrationConfiguration() {
  try {
    const rows = await db.integrationCredential.findMany()
    const byKey = new Map(rows.map(row => [row.key, row]))
    return {
      encryptionReady: integrationEncryptionReady(),
      providers: INTEGRATION_PROVIDERS.map(provider => ({ ...provider, fields: provider.fields.map(field => {
        const row = byKey.get(field.key)
        const envValue = process.env[field.key]?.trim()
        if (row && row.provider !== provider.id) throw new IntegrationSecretError()
        const source = row ? row.disabled ? 'disabled' : 'database' : envValue ? 'environment' : 'missing'
        const configured = row ? !row.disabled && !!row.encryptedValue : !!envValue
        // Never decrypt secrets for the management API, including on save/import.
        const value = field.kind === 'secret' || !configured ? undefined : row?.encryptedValue
          ? decryptIntegrationValue(provider.id, field.key, row.encryptedValue) : envValue
        return { ...field, configured, source, updatedAt: row?.updatedAt.toISOString() ?? null,
          ...(field.kind === 'secret' ? {} : { value }) }
      }) })),
    }
  } catch { throw new IntegrationSecretError() }
}

function providerFor(id: string) {
  const provider = INTEGRATION_PROVIDERS.find(item => item.id === id)
  if (!provider) throw new IntegrationInputError()
  return provider
}

function validateValue(key: string, value: unknown): string {
  const entry = findIntegrationField(key)
  if (!entry || typeof value !== 'string' || value.length > 8192 || /[\r\n\x00]/.test(value)) throw new IntegrationInputError()
  const trimmed = value.trim()
  if (entry.field.kind === 'boolean' && trimmed && !['true', 'false'].includes(trimmed)) throw new IntegrationInputError()
  if (key === 'CLOUDFLARE_R2_ACCOUNT_ID' && trimmed && !/^[a-fA-F0-9]{32}$/.test(trimmed)) throw new IntegrationInputError()
  if (key === 'CLOUDFLARE_R2_BUCKET' && trimmed && !/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(trimmed)) throw new IntegrationInputError()
  if (key === 'NEXT_PUBLIC_R2_PUBLIC_URL' && trimmed) {
    try { const url = new URL(trimmed); if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error() }
    catch { throw new IntegrationInputError() }
  }
  return trimmed
}

type Actor = { id: string; email: string }
export async function saveIntegrationConfiguration(providerId: string, payload: unknown, actor: Actor) {
  const provider = providerFor(providerId)
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new IntegrationInputError()
  const input = payload as Record<string, unknown>
  if (Object.keys(input).some(key => !['values', 'disable'].includes(key))) throw new IntegrationInputError()
  const values = input.values ?? {}
  const disable = input.disable ?? []
  if (!values || typeof values !== 'object' || Array.isArray(values) || !Array.isArray(disable)) throw new IntegrationInputError()
  const allowed = new Set(provider.fields.map(field => field.key))
  const changed = Object.entries(values).map(([key, value]) => {
    if (!allowed.has(key)) throw new IntegrationInputError()
    return [key, validateValue(key, value)] as const
  }).filter(([, value]) => value !== '')
  if (disable.some(key => typeof key !== 'string' || !allowed.has(key)) || new Set(disable).size !== disable.length || changed.some(([key]) => disable.includes(key))) throw new IntegrationInputError()
  if (!changed.length && !disable.length) throw new IntegrationInputError()
  if (!integrationEncryptionReady()) throw new IntegrationSecretError()
  // Encrypt before the transaction. Plaintext never enters Prisma query arguments.
  const records = [
    ...changed.map(([key, value]) => ({ key, provider: providerId, encryptedValue: encryptIntegrationValue(providerId, key, value), disabled: false, updatedBy: actor.id })),
    ...(disable as string[]).map(key => ({ key, provider: providerId, encryptedValue: null, disabled: true, updatedBy: actor.id })),
  ]
  try {
    await db.$transaction(async tx => {
      for (const record of records) await tx.integrationCredential.upsert({ where: { key: record.key }, create: record, update: record })
      await tx.auditLog.create({ data: { actorId: actor.id, actorEmail: actor.email, action: 'update', entity: 'integration', entityId: providerId,
        metadata: { replaced: changed.map(([key]) => key), disabled: disable as string[] } } })
    })
  } catch { throw new IntegrationSecretError() }
}

/** Imports server configuration without sending any credential through the browser. Existing overrides/tombstones win. */
export async function importIntegrationEnvironment(providerId: string, actor: Actor) {
  const provider = providerFor(providerId)
  if (!integrationEncryptionReady()) throw new IntegrationSecretError()
  try {
    await db.$transaction(async tx => {
      const existing = await tx.integrationCredential.findMany({ where: { provider: providerId }, select: { key: true } })
      const keys = new Set(existing.map(row => row.key))
      const records = provider.fields.filter(field => !keys.has(field.key) && process.env[field.key]?.trim()).map(field => ({
        key: field.key, provider: providerId, disabled: false, updatedBy: actor.id,
        encryptedValue: encryptIntegrationValue(providerId, field.key, validateValue(field.key, process.env[field.key])),
      }))
      if (!records.length) return
      const result = await tx.integrationCredential.createMany({ data: records, skipDuplicates: true })
      await tx.auditLog.create({ data: { actorId: actor.id, actorEmail: actor.email, action: 'create', entity: 'integration', entityId: providerId,
        metadata: { action: 'import_environment', requestedKeys: records.map(record => record.key), importedCount: result.count } } })
    })
  } catch (error) {
    if (error instanceof IntegrationInputError) throw error
    throw new IntegrationSecretError()
  }
}

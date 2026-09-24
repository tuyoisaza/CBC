import 'server-only'
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

export class IntegrationSecretError extends Error {
  constructor() { super('La configuración segura no está disponible.'); this.name = 'IntegrationSecretError' }
}

function masterKey(): Buffer {
  const raw = process.env.INTEGRATION_ENCRYPTION_KEY || ''
  // Exactly 32 random bytes in canonical base64. Never derive from a password.
  if (!/^[A-Za-z0-9+/]{43}=$/.test(raw)) throw new IntegrationSecretError()
  const key = Buffer.from(raw, 'base64')
  if (key.length !== 32 || key.toString('base64') !== raw) throw new IntegrationSecretError()
  return key
}
export function integrationEncryptionReady(): boolean {
  try { masterKey(); return true } catch { return false }
}
const aad = (provider: string, key: string) => Buffer.from(JSON.stringify(['cbc-integrations', 'v1', provider, key]))

export function encryptIntegrationValue(provider: string, key: string, value: string): string {
  try {
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', masterKey(), iv, { authTagLength: 16 })
    cipher.setAAD(aad(provider, key))
    const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
    return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), ciphertext.toString('base64')].join('.')
  } catch { throw new IntegrationSecretError() }
}

export function decryptIntegrationValue(provider: string, key: string, envelope: string): string {
  try {
    const parts = envelope.split('.')
    if (parts.length !== 4 || parts[0] !== 'v1') throw new IntegrationSecretError()
    const [, iv, tag, ciphertext] = parts.map((part, index) => index ? Buffer.from(part, 'base64') : Buffer.alloc(0))
    if (iv.length !== 12 || tag.length !== 16) throw new IntegrationSecretError()
    const decipher = createDecipheriv('aes-256-gcm', masterKey(), iv, { authTagLength: 16 })
    decipher.setAAD(aad(provider, key))
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
  } catch { throw new IntegrationSecretError() }
}

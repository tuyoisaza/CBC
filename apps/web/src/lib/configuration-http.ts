import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { SuperadminAccessError } from './superadmin'
import { IntegrationInputError } from './integration-secrets'

export function configurationResponse(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' } })
}
class ConfigurationRequestError extends Error {
  constructor(readonly status: number) { super('Solicitud inválida.') }
}
export async function readConfigurationBody(request: NextRequest) {
  // Cookie authentication must not permit cross-site writes. No forwarded-host trust.
  const origin = request.headers.get('origin')
  const configuredUrls = [process.env.NEXTAUTH_URL, process.env.NEXT_PUBLIC_APP_URL, process.env.NEXT_PUBLIC_ADMIN_URL].filter(Boolean) as string[]
  let trusted: string[]
  try {
    trusted = configuredUrls.map(url => new URL(url).origin)
    if (!trusted.length) {
      if (process.env.NODE_ENV === 'production') throw new Error()
      trusted = [new URL(request.url).origin]
    }
  } catch { throw new ConfigurationRequestError(503) }
  if (!origin || !trusted.includes(origin) || request.headers.get('sec-fetch-site') === 'cross-site') throw new ConfigurationRequestError(403)
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') throw new ConfigurationRequestError(415)
  if (Number(request.headers.get('content-length') || 0) > 65536) throw new ConfigurationRequestError(413)
  // Bounded streaming read also covers chunked requests without content-length.
  const reader = request.body?.getReader()
  if (!reader) throw new ConfigurationRequestError(400)
  let length = 0
  const chunks: Uint8Array[] = []
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    length += value.byteLength
    if (length > 65536) { await reader.cancel(); throw new ConfigurationRequestError(413) }
    chunks.push(value)
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown }
  catch { throw new ConfigurationRequestError(400) }
}
export function configurationError(error: unknown) {
  if (error instanceof SuperadminAccessError) return configurationResponse({ error: 'Acceso no autorizado.' }, error.status)
  if (error instanceof ConfigurationRequestError) return configurationResponse({ error: 'Solicitud inválida.' }, error.status)
  if (error instanceof IntegrationInputError) return configurationResponse({ error: error.message }, 400)
  // Never log or serialize payload, ciphertext, environment, Prisma or provider errors.
  return configurationResponse({ error: 'La configuración segura no está disponible.' }, 503)
}

import { NextRequest } from 'next/server'
import { requireSuperadmin } from '@/lib/superadmin'
import { importIntegrationEnvironment, IntegrationInputError } from '@/lib/integration-secrets'
import { configurationError, configurationResponse, readConfigurationBody } from '@/lib/configuration-http'

export async function POST(request: NextRequest) {
  try {
    const actor = await requireSuperadmin()
    const payload = await readConfigurationBody(request)
    if (!payload || typeof payload !== 'object' || Array.isArray(payload) || Object.keys(payload).length !== 1 || !('provider' in payload) || typeof payload.provider !== 'string') throw new IntegrationInputError()
    await importIntegrationEnvironment(payload.provider, actor)
    return configurationResponse({ ok: true })
  } catch (error) { return configurationError(error) }
}

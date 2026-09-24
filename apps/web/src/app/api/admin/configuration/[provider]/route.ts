import { NextRequest } from 'next/server'
import { requireSuperadmin } from '@/lib/superadmin'
import { saveIntegrationConfiguration } from '@/lib/integration-secrets'
import { configurationError, configurationResponse, readConfigurationBody } from '@/lib/configuration-http'

export async function PUT(request: NextRequest, { params }: { params: { provider: string } }) {
  try {
    const actor = await requireSuperadmin()
    const payload = await readConfigurationBody(request)
    await saveIntegrationConfiguration(params.provider, payload, actor)
    return configurationResponse({ ok: true })
  } catch (error) { return configurationError(error) }
}

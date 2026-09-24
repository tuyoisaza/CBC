import { requireSuperadmin } from '@/lib/superadmin'
import { getIntegrationConfiguration } from '@/lib/integration-secrets'
import { configurationError, configurationResponse } from '@/lib/configuration-http'

export const dynamic = 'force-dynamic'
export async function GET() {
  try {
    await requireSuperadmin()
    return configurationResponse(await getIntegrationConfiguration())
  } catch (error) { return configurationError(error) }
}

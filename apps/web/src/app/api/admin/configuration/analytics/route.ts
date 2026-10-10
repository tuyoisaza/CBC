import { requireSuperadmin } from '@/lib/superadmin'
import { AnalyticsSettingsError, getAnalyticsSettings, saveAnalyticsSettings } from '@/lib/analytics-settings'
import { configurationError, configurationResponse, readConfigurationBody } from '@/lib/configuration-http'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

function handleError(error: unknown) {
  if (error instanceof AnalyticsSettingsError) {
    const message = error.reason === 'invalid'
      ? 'Revisa el formato de los IDs de medición.'
      : 'No se pudo leer o guardar la configuración de medición.'
    return configurationResponse({ error: message }, error.reason === 'invalid' ? 400 : 503)
  }
  return configurationError(error)
}

export async function GET() {
  try {
    await requireSuperadmin()
    return configurationResponse(await getAnalyticsSettings())
  } catch (error) { return handleError(error) }
}

export async function PUT(request: NextRequest) {
  try {
    const actor = await requireSuperadmin()
    const payload = await readConfigurationBody(request)
    await saveAnalyticsSettings(payload, actor)
    return configurationResponse({ ok: true })
  } catch (error) { return handleError(error) }
}

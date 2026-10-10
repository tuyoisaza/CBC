import 'server-only'
import { z } from 'zod'
import { db } from '@/lib/db'

const GOOGLE_SETTING_KEY = 'analytics_google_measurement_id'
const CLARITY_SETTING_KEY = 'analytics_clarity_project_id'
const SETTING_KEYS = [GOOGLE_SETTING_KEY, CLARITY_SETTING_KEY] as const

const analyticsSettingsSchema = z.object({
  googleMeasurementId: z.string().trim().max(32).regex(/^(|G-[A-Z0-9]+)$/),
  clarityProjectId: z.string().trim().max(64).regex(/^(|[A-Za-z0-9]+)$/),
}).strict()

export type AnalyticsSettings = z.infer<typeof analyticsSettingsSchema>

export class AnalyticsSettingsError extends Error {
  constructor(readonly reason: 'invalid' | 'unavailable') {
    super(reason === 'invalid' ? 'Invalid analytics settings' : 'Analytics settings unavailable')
    this.name = 'AnalyticsSettingsError'
  }
}

function readValue(value: string | undefined, schema: z.ZodString) {
  const parsed = schema.safeParse(value ?? '')
  return parsed.success ? parsed.data : ''
}

/** Return only the two public provider IDs; never project arbitrary settings. */
export async function getAnalyticsSettings(): Promise<AnalyticsSettings> {
  try {
    const rows = await db.setting.findMany({ where: { key: { in: [...SETTING_KEYS] } } })
    if (rows.some(row => row.encrypted)) throw new AnalyticsSettingsError('unavailable')
    const byKey = new Map(rows.map(row => [row.key, row.value]))
    return {
      googleMeasurementId: readValue(byKey.get(GOOGLE_SETTING_KEY), z.string().trim().max(32).regex(/^(|G-[A-Z0-9]+)$/)),
      clarityProjectId: readValue(byKey.get(CLARITY_SETTING_KEY), z.string().trim().max(64).regex(/^(|[A-Za-z0-9]+)$/)),
    }
  } catch (error) {
    if (error instanceof AnalyticsSettingsError) throw error
    throw new AnalyticsSettingsError('unavailable')
  }
}

type Actor = { id: string; email: string }

export async function saveAnalyticsSettings(input: unknown, actor: Actor) {
  const parsed = analyticsSettingsSchema.safeParse(input)
  if (!parsed.success) throw new AnalyticsSettingsError('invalid')

  const fields = [
    { key: GOOGLE_SETTING_KEY, name: 'googleMeasurementId', value: parsed.data.googleMeasurementId },
    { key: CLARITY_SETTING_KEY, name: 'clarityProjectId', value: parsed.data.clarityProjectId },
  ] as const

  try {
    await db.$transaction(async tx => {
      const current = await tx.setting.findMany({ where: { key: { in: [...SETTING_KEYS] } } })
      if (current.some(row => row.encrypted)) throw new AnalyticsSettingsError('unavailable')
      const byKey = new Map(current.map(row => [row.key, row]))
      const changed: string[] = []

      for (const field of fields) {
        const existing = byKey.get(field.key)
        if (field.value === '') {
          if (existing) {
            await tx.setting.deleteMany({ where: { key: field.key } })
            changed.push(field.name)
          }
        } else if (existing?.value !== field.value) {
          await tx.setting.upsert({
            where: { key: field.key },
            create: { key: field.key, value: field.value, encrypted: false },
            update: { value: field.value, encrypted: false },
          })
          changed.push(field.name)
        }
      }

      if (changed.length) {
        await tx.auditLog.create({ data: {
          actorId: actor.id,
          actorEmail: actor.email,
          action: 'update',
          entity: 'settings',
          entityId: 'website-analytics',
          metadata: { changed },
        } })
      }
    })
  } catch (error) {
    if (error instanceof AnalyticsSettingsError) throw error
    throw new AnalyticsSettingsError('unavailable')
  }
}

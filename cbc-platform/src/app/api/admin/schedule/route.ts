import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { setEngineSchedule } from '@/lib/engine'
import { z } from 'zod'

const schema = z.object({
  key:   z.string(),
  value: z.object({
    active:    z.boolean(),
    cron:      z.string(),
    label:     z.string(),
    platforms: z.array(z.string()),
  }),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { key, value } = schema.parse(await req.json())

  await db.setting.upsert({
    where:  { key: `schedule.${key}` },
    update: { value: JSON.stringify(value) },
    create: { key: `schedule.${key}`, value: JSON.stringify(value) },
  })

  // Sync to engine (non-fatal if offline)
  try {
    const allSettings = await db.setting.findMany({
      where: { key: { startsWith: 'schedule.' } },
    })
    const schedule = Object.fromEntries(
      allSettings.map((s) => [s.key.replace('schedule.', ''), JSON.parse(s.value)])
    )
    await setEngineSchedule(schedule)
  } catch {
    // Engine offline — settings saved in DB, will sync on next restart
  }

  return NextResponse.json({ ok: true })
}

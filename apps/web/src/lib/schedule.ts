import { db } from '@/lib/db'

/**
 * Default posting schedule — plan-of-record cadence (IG/FB 3x/week, LinkedIn
 * weekly, approval-gated). The live schedule is these defaults merged with
 * Setting.schedule.* overrides; shared by the admin page and the engine GET.
 */
export const DEFAULT_SCHEDULE: Record<
  string,
  { active: boolean; cron: string; label: string; platforms: string[]; requireApproval?: boolean }
> = {
  productPost: {
    active: true,
    cron: '0 10 * * 1',
    label: 'Lunes 10am',
    platforms: ['instagram', 'facebook'],
  },
  coffeeStory: {
    active: true,
    cron: '0 10 * * 3',
    label: 'Miércoles 10am',
    platforms: ['instagram', 'facebook'],
  },
  socialProof: {
    active: true,
    cron: '0 10 * * 5',
    label: 'Viernes 10am',
    platforms: ['instagram', 'facebook'],
  },
  linkedinPost: {
    active: true,
    cron: '0 9 * * 2',
    label: 'Martes 9am (con aprobación)',
    platforms: ['linkedin'],
    requireApproval: true,
  },
}

/** Defaults merged with Setting.schedule.* overrides. */
export async function loadSchedule() {
  const settings = await db.setting.findMany({
    where: { key: { startsWith: 'schedule.' } },
  })
  const fromDb = Object.fromEntries(
    settings.map((s) => [s.key.replace('schedule.', ''), JSON.parse(s.value)])
  )
  return { ...DEFAULT_SCHEDULE, ...fromDb }
}

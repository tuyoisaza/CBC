import { ScheduleManager } from '@/components/admin/marketing/ScheduleManager'
import { db } from '@/lib/db'

export const metadata = { title: 'Calendario de posts' }

const DEFAULT_SCHEDULE = {
  productPost:  { active: true, cron: '0 10 * * 1', label: 'Lunes 10am', platforms: ['instagram','facebook'] },
  coffeeStory:  { active: true, cron: '0 10 * * 3', label: 'Miércoles 10am', platforms: ['instagram','facebook'] },
  linkedinPost: { active: true, cron: '0 9 1,15 * *', label: '1° y 15 de cada mes, 9am', platforms: ['linkedin'] },
}

export default async function SchedulePage() {
  // Load schedule from settings table
  const settings = await db.setting.findMany({
    where: { key: { startsWith: 'schedule.' } },
  })

  const scheduleFromDb = Object.fromEntries(
    settings.map((s) => [s.key.replace('schedule.', ''), JSON.parse(s.value)])
  )

  const schedule = { ...DEFAULT_SCHEDULE, ...scheduleFromDb }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Calendario de publicación</h1>
        <p className="text-sm text-muted-foreground mt-1">
          El motor publica automáticamente según este calendario. Todo en horario CDMX.
        </p>
      </div>
      <ScheduleManager schedule={schedule} />
    </div>
  )
}

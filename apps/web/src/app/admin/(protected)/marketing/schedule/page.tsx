import { ScheduleManager } from '@/components/admin/marketing/ScheduleManager'
import { loadSchedule } from '@/lib/schedule'

export const metadata = { title: 'Calendario de posts' }

export default async function SchedulePage() {
  // Defaults + Setting.schedule.* overrides (shared with the engine GET)
  const schedule = await loadSchedule()

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

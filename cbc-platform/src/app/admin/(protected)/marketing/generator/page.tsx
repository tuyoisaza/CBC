import { db } from '@/lib/db'
import { getEngineHealth } from '@/lib/engine'
import { ContentGenerator } from '@/components/admin/marketing/ContentGenerator'

export const metadata = { title: 'Generar contenido' }

export default async function GeneratorPage() {
  const [health, activeCoffee] = await Promise.all([
    getEngineHealth(),
    db.coffee.findFirst({ where: { active: true } }),
  ])

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Generar contenido</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Crea y publica un post manualmente, o genera una vista previa antes de publicar.
        </p>
      </div>

      {/* Engine status */}
      <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${
        health.status === 'running'
          ? 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400'
          : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
      }`}>
        <div className={`h-2 w-2 rounded-full ${
          health.status === 'running' ? 'bg-green-500 animate-pulse' : 'bg-amber-500'
        }`} />
        <span className="font-medium">
          Motor: {health.status === 'running' ? 'Activo' : 'Offline'}
        </span>
        {health.currentCoffee && health.currentCoffee !== '—' && (
          <span className="ml-auto text-muted-foreground">
            Café: {health.currentCoffee}
          </span>
        )}
      </div>

      {!activeCoffee && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-400">
          ⚠️ No hay café activo. El contenido generado usará la configuración anterior del motor.{' '}
          <a href="/admin/marketing/coffee" className="underline">Configura el café</a>
        </div>
      )}

      <ContentGenerator coffee={activeCoffee as any} engineOnline={health.status === 'running'} />
    </div>
  )
}

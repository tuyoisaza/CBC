import { DebugPanel } from '@/components/admin/DebugPanel'

export const metadata = { title: 'Debug' }

export default function DebugPage() {
  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Debug</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Herramientas de diagnóstico y captura de errores.
        </p>
      </div>
      <DebugPanel />
    </div>
  )
}

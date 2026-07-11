import { getConnectionStatus } from '@/lib/social'
import { SocialConnections } from '@/components/admin/marketing/SocialConnections'

export const metadata = { title: 'Conexiones' }
export const dynamic = 'force-dynamic'

export default async function ConnectionsPage() {
  const status = await getConnectionStatus()

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Conexiones de redes sociales</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Autoriza las cuentas donde el motor publica. Los tokens se guardan de forma segura
          y el motor los usa automáticamente — sin configuración manual.
        </p>
      </div>

      <SocialConnections status={status} />
    </div>
  )
}

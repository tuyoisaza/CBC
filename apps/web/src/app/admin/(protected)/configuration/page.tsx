import { unstable_noStore as noStore } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireSuperadmin, SuperadminAccessError } from '@/lib/superadmin'
import { ProviderConfiguration } from '@/components/admin/configuration/ProviderConfiguration'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Configuración de integraciones' }

export default async function ConfigurationPage() {
  noStore()
  try {
    await requireSuperadmin()
  } catch (error) {
    if (error instanceof SuperadminAccessError) {
      if (error.status === 401) redirect('/login')
      if (error.status === 403) redirect('/admin/dashboard')
    }
    throw error
  }
  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configuración</h1>
        <p className="mt-1 text-sm text-muted-foreground">Administra las credenciales e integraciones de CBC. Acceso exclusivo para superadministradores.</p>
      </div>
      <ProviderConfiguration />
    </div>
  )
}

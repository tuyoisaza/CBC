import Link from 'next/link'
import { NewLeadForm } from '@/components/admin/sales/NewLeadForm'

export const metadata = { title: 'Nuevo lead' }

export default function NewLeadPage() {
  return <div className="space-y-6">
    <Link href="/admin/sales/leads" className="text-sm text-primary hover:underline">← Leads</Link>
    <h1 className="text-2xl font-bold text-foreground">Nuevo lead</h1>
    <p className="text-sm text-muted-foreground">Agrega una oportunidad al pipeline de ventas.</p>
    <NewLeadForm />
  </div>
}

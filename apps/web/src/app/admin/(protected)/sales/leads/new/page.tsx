import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireAdminAccess } from '@/lib/superadmin'
import { db } from '@/lib/db'
import { messageLeadDraft } from '@/lib/message-lead-draft'
import { NewLeadForm } from '@/components/admin/sales/NewLeadForm'

export const metadata = { title: 'Nuevo lead' }

export default async function NewLeadPage({ searchParams }: { searchParams: { message?: string } }) {
  const denied = await requireAdminAccess(await getServerSession(authOptions))
  if (denied) redirect('/login')
  const message = searchParams.message ? await db.message.findFirst({
    where: { id: searchParams.message, direction: 'inbound', deletedAt: null },
    select: { id: true, from: true, body: true, platform: true, leadId: true },
  }) : null
  if (searchParams.message && !message) notFound()
  if (message?.leadId) redirect(`/admin/sales/leads/${message.leadId}`)
  return <div className="space-y-6">
    <Link href={message ? '/admin/service' : '/admin/sales/leads'} className="text-sm text-primary hover:underline">← {message ? 'Mensajes' : 'Leads'}</Link>
    <h1 className="text-2xl font-bold text-foreground">{message ? 'Convertir mensaje en lead' : 'Nuevo lead'}</h1>
    <p className="text-sm text-muted-foreground">{message ? 'Revisa los datos extraídos y completa los campos vacíos. El lead se crea solo al guardar y queda vinculado al mensaje original.' : 'Agrega una oportunidad al pipeline de ventas.'}</p>
    {message && <details className="max-w-2xl rounded-lg border border-border p-4"><summary className="cursor-pointer text-sm font-medium">Ver mensaje original</summary><p className="mt-3 whitespace-pre-wrap break-words text-sm text-muted-foreground">{message.body}</p></details>}
    <NewLeadForm key={message?.id ?? 'manual'} messageId={message?.id} initialValues={message ? messageLeadDraft(message) : undefined} />
  </div>
}

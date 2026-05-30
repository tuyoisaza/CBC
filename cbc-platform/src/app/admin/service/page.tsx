import { db } from '@/lib/db'
import { InboxList } from '@/components/admin/service/InboxList'

export const metadata = { title: 'Servicio al cliente' }

export default async function ServicePage() {
  const messages = await db.message.findMany({
    where:   { direction: 'inbound' },
    orderBy: { createdAt: 'desc' },
    take:    50,
    include: { lead: { include: { customer: true } } },
  })

  const unread = messages.filter((m) => m.status === 'unread').length

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-foreground">Servicio al cliente</h1>
        {unread > 0 && (
          <span className="rounded-full bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1">
            {unread} sin leer
          </span>
        )}
      </div>
      <InboxList messages={messages as any} />
    </div>
  )
}

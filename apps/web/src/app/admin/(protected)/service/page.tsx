import { db } from '@/lib/db'
import { InboxList } from '@/components/admin/service/InboxList'
import { inboxMessagesWhere, unreadMessagesWhere } from '@/lib/admin-filters'
import Link from 'next/link'

export const metadata = { title: 'Servicio al cliente' }

export default async function ServicePage({ searchParams }: { searchParams: { view?: string; page?: string } }) {
  const showUnread = searchParams.view === 'unread'
  const where = showUnread ? unreadMessagesWhere : inboxMessagesWhere
  const [total, unread] = await Promise.all([
    db.message.count({ where: inboxMessagesWhere }),
    db.message.count({ where: unreadMessagesWhere }),
  ])
  const count = showUnread ? unread : total
  const pages = Math.max(1, Math.ceil(count / 50))
  const requestedPage = Number(searchParams.page ?? 1)
  const page = Math.min(pages, Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1)
  const messages = await db.message.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    skip: (page - 1) * 50,
    take: 50,
    include: { lead: { include: { customer: true } } },
  })
  const pageHref = (value: number) => `/admin/service?view=${showUnread ? 'unread' : 'all'}&page=${value}`

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Servicio al cliente</h1>
      <p className="text-sm text-muted-foreground">{total} mensajes · {unread} sin leer. Abrir un mensaje lo marca como leído.</p>
      <div className="flex gap-4 text-sm text-primary">
        <Link href="/admin/service" aria-current={!showUnread ? 'page' : undefined}>Todos ({total})</Link>
        <Link href="/admin/service?view=unread" aria-current={showUnread ? 'page' : undefined}>Sin leer ({unread})</Link>
      </div>
      <InboxList key={`${showUnread}-${page}`} emptyMessage={showUnread ? 'No hay mensajes sin leer. Puedes consultar los leídos en Todos.' : 'Sin mensajes todavía.'} messages={messages.map(message => ({ ...message, createdAt: message.createdAt.toISOString(), aiDraft: message.aiDraft ?? undefined, lead: message.lead ?? undefined }))} />
      {pages > 1 && <nav aria-label="Páginas de mensajes" className="flex gap-4 text-sm">
        {page > 1 && <Link href={pageHref(page - 1)}>Anterior</Link>}
        <span>Página {page} de {pages}</span>
        {page < pages && <Link href={pageHref(page + 1)}>Siguiente</Link>}
      </nav>}
    </div>
  )
}

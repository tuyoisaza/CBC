import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Building2, User, Phone, Mail,
  Package, FileText, Plus, ExternalLink
} from 'lucide-react'
import { LeadStatusSelect } from '@/components/admin/sales/LeadStatusSelect'

export const metadata = { title: 'Lead' }

export default async function LeadDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const lead = await db.lead.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      quotes: { orderBy: { createdAt: 'desc' } },
      messages: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  })

  if (!lead) notFound()

  const { customer } = lead

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back + header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/sales/leads" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{customer.companyName}</h1>
          <p className="text-sm text-muted-foreground">{customer.contactName}</p>
        </div>
        <LeadStatusSelect leadId={lead.id} currentStatus={lead.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Contact card */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Contacto
            </h2>
            <div className="space-y-3">
              {[
                { icon: Building2, label: customer.companyName },
                { icon: User,      label: customer.contactName },
                { icon: Phone,     label: customer.whatsapp, href: `https://wa.me/${customer.whatsapp?.replace(/\D/g,'')}` },
                { icon: Mail,      label: customer.email },
              ].map(({ icon: Icon, label, href }) => (
                label ? (
                  <div key={label} className="flex items-center gap-3 text-sm">
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    {href ? (
                      <a href={href} target="_blank" rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1">
                        {label} <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-foreground">{label}</span>
                    )}
                  </div>
                ) : null
              ))}
            </div>
          </div>

          {/* Order intent */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Intención de pedido
            </h2>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Tipo</p>
                <p className="font-semibold text-foreground capitalize">{lead.boxType ?? '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Cajas</p>
                <p className="font-semibold text-foreground">{lead.quantity ?? '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Ocasión</p>
                <p className="font-semibold text-foreground capitalize">{lead.occasion?.replace(/-/g,' ') ?? '—'}</p>
              </div>
            </div>
            {lead.message && (
              <div className="mt-4 p-3 bg-muted/40 rounded-lg text-sm text-muted-foreground">
                {lead.message}
              </div>
            )}
          </div>

          {/* SAT fiscal data */}
          {customer.rfc && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                Datos fiscales (CFDI)
              </h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  { label: 'RFC', value: customer.rfc },
                  { label: 'Razón social', value: customer.razonSocial },
                  { label: 'CP Fiscal', value: customer.codigoPostalFiscal },
                  { label: 'Régimen', value: customer.regimenFiscal },
                  { label: 'Uso CFDI', value: customer.usoCfdi },
                  { label: 'Email facturación', value: customer.emailFacturacion },
                ].map(({ label, value }) => value ? (
                  <div key={label}>
                    <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                    <p className="font-medium text-foreground">{value}</p>
                  </div>
                ) : null)}
              </div>
            </div>
          )}
        </div>

        {/* Right: quotes + actions */}
        <div className="space-y-4">
          {/* Actions */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Acciones
            </h2>
            <div className="space-y-2">
              <Link
                href={`/admin/sales/quotes/new?leadId=${lead.id}`}
                className="flex items-center gap-2 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4" /> Nueva cotización
              </Link>
              {customer.whatsapp && (
                <a
                  href={`https://wa.me/${customer.whatsapp.replace(/\D/g,'')}?text=Hola%20${encodeURIComponent(customer.contactName)}%2C%20te%20escribo%20de%20Coffee%20Bunn%20Caf%C3%A9.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 w-full rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <Phone className="h-4 w-4 text-[#25D366]" /> WhatsApp
                </a>
              )}
            </div>
          </div>

          {/* Quotes */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Cotizaciones
            </h2>
            {lead.quotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin cotizaciones</p>
            ) : (
              <div className="space-y-2">
                {lead.quotes.map((q) => (
                  <Link
                    key={q.id}
                    href={`/admin/sales/quotes/${q.id}`}
                    className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted transition-colors"
                  >
                    <div>
                      <p className="text-xs font-medium text-foreground">{q.quoteCode}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        ${q.total.toLocaleString('es-MX')} MXN
                      </p>
                    </div>
                    <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${
                      q.status === 'accepted' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      q.status === 'sent'     ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      q.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {q.status === 'draft' ? 'Borrador' :
                       q.status === 'sent'  ? 'Enviada' :
                       q.status === 'accepted' ? 'Aceptada' :
                       q.status === 'rejected' ? 'Rechazada' : q.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

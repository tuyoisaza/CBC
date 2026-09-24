import Link from 'next/link'
import { CheckCircle2, Clock, XCircle, Info } from 'lucide-react'

export type CheckoutStatus = 'exito' | 'pendiente' | 'fallo' | 'cancelado'

type OrderSummary = {
  orderCode: string
  total: number
  shippingCity: string | null
  isGift: boolean
} | null

const money = (n: number) => `$${n.toLocaleString('es-MX')} MXN`

export function CheckoutResultBanner({ status, order }: { status: CheckoutStatus; order: OrderSummary }) {
  if (status === 'exito') {
    return (
      <Wrapper tone="ok" Icon={CheckCircle2} title="¡Pago confirmado!">
        {order ? (
          <>
            <p>
              Pedido <strong>{order.orderCode}</strong> por {money(order.total)}
              {order.shippingCity ? ` · envío a ${order.shippingCity}` : ''}.
            </p>
            <p className="mt-1">
              Tu pago está acreditado. Ya estamos preparando tu pedido.
              {order.isGift ? ' El paquete no incluye el precio.' : ''}
            </p>
            <Link
              href={`/tracking/${order.orderCode}`}
              className="mt-3 inline-block rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
            >
              Rastrear pedido
            </Link>
          </>
        ) : (
          <p>Tu pago está acreditado.</p>
        )}
      </Wrapper>
    )
  }

  if (status === 'pendiente') {
    return (
      <Wrapper tone="warn" Icon={Clock} title="Pago en proceso">
        <p>
          {order ? <>Pedido <strong>{order.orderCode}</strong>. </> : null}
          Estamos esperando la confirmación del proveedor de pago. Actualiza esta página en unos minutos.
          Los pagos en efectivo o por transferencia pueden tardar más en acreditarse.
        </p>
        {order && (
          <Link
            href={`/tracking/${order.orderCode}`}
            className="mt-3 inline-block rounded-md border border-amber-500 px-4 py-2 text-sm font-semibold text-amber-600 hover:bg-amber-500/10"
          >
            Ver estado del pedido
          </Link>
        )}
      </Wrapper>
    )
  }

  if (status === 'fallo') {
    return (
      <Wrapper tone="error" Icon={XCircle} title="El pago no se completó">
        <p>Este pago no está acreditado. Revisa su estado en el proveedor antes de volver a comprar.</p>
      </Wrapper>
    )
  }

  return (
    <Wrapper tone="muted" Icon={Info} title="Compra cancelada">
      <p>Cancelaste el pago. El producto sigue disponible cuando quieras.</p>
    </Wrapper>
  )
}

function Wrapper({
  tone,
  Icon,
  title,
  children,
}: {
  tone: 'ok' | 'warn' | 'error' | 'muted'
  Icon: typeof CheckCircle2
  title: string
  children: React.ReactNode
}) {
  const styles = {
    ok: 'border-green-600/40 bg-green-600/10 text-green-100',
    warn: 'border-amber-500/40 bg-amber-500/10 text-amber-100',
    error: 'border-red-600/40 bg-red-600/10 text-red-100',
    muted: 'border-gray-600/40 bg-gray-600/10 text-gray-200',
  }[tone]
  const iconColor = {
    ok: 'text-green-400',
    warn: 'text-amber-400',
    error: 'text-red-400',
    muted: 'text-gray-400',
  }[tone]

  return (
    <div className={`mb-8 flex gap-3 rounded-xl border p-4 text-sm ${styles}`}>
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconColor}`} />
      <div>
        <p className="font-semibold">{title}</p>
        <div className="mt-1 text-[13px] leading-relaxed opacity-90">{children}</div>
      </div>
    </div>
  )
}

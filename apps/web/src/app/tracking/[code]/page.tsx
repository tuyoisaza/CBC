'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { PublicFooter } from '@/components/public/PublicFooter'

interface Cfdi {
  id: string
  folio: string | null
  uuid: string | null
  status: string
  pdfUrl: string | null
  xmlUrl: string | null
  total: number
}

interface Customer {
  companyName: string
  contactName: string
}

interface Quote {
  total: number
}

interface Order {
  orderCode: string
  status: string
  trackingNumber: string | null
  carrier: string | null
  estimatedDate: string | null
  deliveredAt: string | null
  notes: string | null
  customer: Customer
  quote: Quote
  cfdis: Cfdi[]
  createdAt: string
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  confirmed: { label: 'Confirmado', color: 'bg-blue-500' },
  in_production: { label: 'En Producción', color: 'bg-yellow-500' },
  ready: { label: 'Listo para Envío', color: 'bg-purple-500' },
  shipped: { label: 'Enviado', color: 'bg-indigo-500' },
  delivered: { label: 'Entregado', color: 'bg-green-500' },
  cancelled: { label: 'Cancelado', color: 'bg-red-500' },
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount)
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { label: status, color: 'bg-gray-500' }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium text-white ${s.color}`}>
      <span className="h-2 w-2 rounded-full bg-white/60" />
      {s.label}
    </span>
  )
}

function TrackingTimeline({ status }: { status: string }) {
  const steps = ['confirmed', 'in_production', 'ready', 'shipped', 'delivered']
  const currentIdx = steps.indexOf(status)
  if (currentIdx === -1) return null

  return (
    <div className="flex items-center gap-1 py-4">
      {steps.map((step, i) => {
        const completed = i <= currentIdx
        return (
          <div key={step} className="flex items-center flex-1">
            <div className={`h-3 w-3 rounded-full ${completed ? 'bg-cbc-yellow' : 'bg-gray-700'}`} />
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 ${i < currentIdx ? 'bg-cbc-yellow' : 'bg-gray-700'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function TrackingSearch({ onSearch }: { onSearch: (code: string) => void }) {
  const [input, setInput] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (input.trim()) onSearch(input.trim().toUpperCase())
  }

  return (
    <main className="min-h-screen bg-cbc-black py-24">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl font-bold text-cbc-cream mb-4">Rastrear tu Pedido</h1>
        <p className="text-gray-400 mb-8">Ingresa el código de tu pedido para ver su estado actual.</p>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ej: CBC-2025-001"
            className="flex-1 bg-[#1a1a1a] border border-gray-700 rounded-md px-4 py-3 text-white focus:ring-2 focus:ring-cbc-yellow focus:border-transparent outline-none"
          />
          <button type="submit"
            className="bg-cbc-yellow text-black font-bold px-6 py-3 rounded-md hover:bg-cbc-yellow/90 transition-colors">
            Buscar
          </button>
        </form>
      </div>
      <PublicFooter lang="es" />
    </main>
  )
}

function TrackingResult({
  order,
  onBack,
}: {
  order: Order
  onBack: () => void
}) {
  const steps = ['confirmed', 'in_production', 'ready', 'shipped', 'delivered']
  const currentIdx = steps.indexOf(order.status)
  const isDelivered = order.status === 'delivered'

  return (
    <main className="min-h-screen bg-cbc-black py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <button onClick={onBack}
          className="text-gray-400 hover:text-cbc-yellow transition-colors mb-8 inline-flex items-center gap-2">
          &larr; Buscar otro pedido
        </button>

        <div className="bg-[#1a1a1a] rounded-xl p-8 border border-gray-800 shadow-xl space-y-8">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">Pedido</p>
              <h1 className="text-2xl font-bold text-cbc-cream">{order.orderCode}</h1>
              <p className="text-gray-400 mt-1">{order.customer.companyName}</p>
            </div>
            <StatusBadge status={order.status} />
          </div>

          {currentIdx >= 0 && (
            <div>
              <TrackingTimeline status={order.status} />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Confirmado</span>
                <span>Producción</span>
                <span>Listo</span>
                <span>Enviado</span>
                <span>Entregado</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-500">Fecha de Creación</p>
              <p className="text-white font-medium">{formatDate(order.createdAt)}</p>
            </div>
            {order.estimatedDate && (
              <div>
                <p className="text-sm text-gray-500">Fecha Estimada</p>
                <p className="text-white font-medium">{formatDate(order.estimatedDate)}</p>
              </div>
            )}
            {isDelivered && order.deliveredAt && (
              <div>
                <p className="text-sm text-gray-500">Fecha de Entrega</p>
                <p className="text-white font-medium">{formatDate(order.deliveredAt)}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-white font-medium">{formatCurrency(order.quote.total)}</p>
            </div>
            {order.carrier && (
              <div>
                <p className="text-sm text-gray-500">Paquetería</p>
                <p className="text-white font-medium">{order.carrier}</p>
              </div>
            )}
            {order.trackingNumber && (
              <div>
                <p className="text-sm text-gray-500">Número de Guía</p>
                <p className="text-white font-medium">{order.trackingNumber}</p>
              </div>
            )}
          </div>

          {order.cfdis.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-cbc-cream mb-4">Facturas / CFDI</h3>
              <div className="space-y-3">
                {order.cfdis.map((cfdi) => (
                  <div key={cfdi.id} className="flex items-center justify-between bg-cbc-black rounded-lg p-4 border border-gray-800">
                    <div>
                      <p className="text-white font-medium">{cfdi.folio || 'CFDI'}</p>
                      {cfdi.uuid && (
                        <p className="text-xs text-gray-500 font-mono truncate max-w-[200px]">{cfdi.uuid}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm ${cfdi.status === 'valid' ? 'text-green-400' : 'text-gray-500'}`}>
                        {cfdi.status === 'valid' ? 'Válido' : cfdi.status}
                      </span>
                      <div className="flex gap-2">
                        {cfdi.pdfUrl && (
                          <a href={cfdi.pdfUrl} target="_blank" rel="noopener noreferrer"
                            className="text-sm text-cbc-yellow hover:underline">
                            PDF
                          </a>
                        )}
                        {cfdi.xmlUrl && (
                          <a href={cfdi.xmlUrl} target="_blank" rel="noopener noreferrer"
                            className="text-sm text-cbc-yellow hover:underline">
                            XML
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {order.notes && (
            <div>
              <p className="text-sm text-gray-500">Notas</p>
              <p className="text-white mt-1">{order.notes}</p>
            </div>
          )}
        </div>
      </div>
      <PublicFooter lang="es" />
    </main>
  )
}

export default function TrackingPage() {
  const params = useParams()
  const codeParam = params.code as string | undefined
  const [searchCode, setSearchCode] = useState(codeParam || '')
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (codeParam && codeParam !== searchCode) {
      setSearchCode(codeParam)
    }
  }, [codeParam])

  useEffect(() => {
    if (!searchCode) return
    setLoading(true)
    setError('')
    fetch(`/api/tracking/${searchCode}`)
      .then((res) => {
        if (!res.ok) throw new Error('Pedido no encontrado')
        return res.json()
      })
      .then((data) => {
        setOrder(data)
      })
      .catch((err) => {
        setError(err.message)
        setOrder(null)
      })
      .finally(() => setLoading(false))
  }, [searchCode])

  if (!searchCode || error) {
    return <TrackingSearch onSearch={(code) => { setSearchCode(code); window.history.replaceState({}, '', `/tracking/${code}`) }} />
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-cbc-black py-24">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">Buscando pedido...</p>
        </div>
        <PublicFooter lang="es" />
      </main>
    )
  }

  if (error) {
    return <TrackingSearch onSearch={(code) => { setSearchCode(code); window.history.replaceState({}, '', `/tracking/${code}`) }} />
  }

  if (!order) return null

  return (
    <TrackingResult
      order={order}
      onBack={() => {
        setSearchCode('')
        setOrder(null)
        setError('')
        window.history.replaceState({}, '', '/tracking')
      }}
    />
  )
}

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { CatalogView } from '../catalog/CatalogView'
import { QuoteDetails } from '../admin/sales/QuoteDetails'
import { CatalogNav } from '../catalog/CatalogNav'
import { CatalogQuoteButton } from '../catalog/CatalogQuoteButton'
import { ExtraCatalogManager } from '../admin/sales/ExtraCatalogManager'
import { CotizadorWizard } from '@/app/cotizar/components/CotizadorWizard'
import { submitQuote } from '@/app/cotizar/actions/submitQuote'
import type { CatalogEntry } from '@/lib/extra-catalog'

vi.mock('@/app/cotizar/actions/submitQuote', () => ({ submitQuote: vi.fn().mockResolvedValue({ quoteId: 'q1', quoteCode: 'CBC-Q-1' }) }))
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks() })
const entry: CatalogEntry = { id: 'filters', slug: 'filtros-100', kind: 'extra', name: 'Filtros de café', shortDescription: 'Compatibles con V60', description: 'Descripción larga\nSegundo párrafo.', images: ['/one.jpg', '/two.jpg'], features: [], price: 139.2, unitLabel: 'paquete', unitsPerPack: 100, minQty: 5, sellableStandalone: true, allowedForRush: true }

it('separates catalog and quote navigation', () => {
  render(<CatalogNav />)
  expect(screen.getByRole('link', { name: 'Catálogo B2B' })).toHaveAttribute('href', '/catalogo-b2b')
  expect(screen.getByRole('link', { name: 'Cotizar' })).toHaveAttribute('href', '/cotizar')
})
it('shows a real catalog card and filters it without starting a quote', () => {
  render(<CatalogView entries={[entry]} />)
  expect(screen.getByRole('img', { name: entry.name })).toHaveAttribute('src', '/one.jpg')
  expect(screen.getByRole('link', { name: 'Ver detalles' })).toHaveAttribute('href', '/catalogo-b2b/extra/filtros-100')
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'inexistente' } })
  expect(screen.queryByRole('link', { name: 'Ver detalles' })).not.toBeInTheDocument()
})
it('carries package quantity and identity to the quote', () => {
  render(<CatalogQuoteButton entry={entry} />)
  fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '50' } })
  expect(screen.getByText('50 × 100 = 5,000 piezas en total')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Cotizar este producto' })).toHaveAttribute('href', '/cotizar?extra=filters&qty=50')
  fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '1' } })
  expect(screen.queryByRole('link', { name: 'Cotizar este producto' })).not.toBeInTheDocument()
})
it('quotes an existing method without duplicating it as an extra', () => {
  render(<CatalogQuoteButton entry={{ ...entry, kind: 'method' }} />)
  expect(screen.getByRole('link', { name: 'Cotizar este producto' })).toHaveAttribute('href', '/cotizar?method=filters&qty=5')
})
it('edits long copy, legacy photos, gallery order, and package settings', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [{ ...entry, unitPrice: 100, imageUrl: '/legacy.jpg', images: [], active: true, catalogVisible: true, sortOrder: 0 }] })
  vi.stubGlobal('fetch', fetchMock)
  render(<ExtraCatalogManager />)
  fireEvent.click(await screen.findByRole('button', { name: 'Editar' }))
  expect(screen.getByLabelText('Descripción completa')).toHaveValue(entry.description)
  expect(screen.getByRole('img', { name: 'Fotografía 1' })).toHaveAttribute('src', '/legacy.jpg')
  fireEvent.change(screen.getByLabelText('Descripción completa'), { target: { value: 'Primero\n\nSegundo párrafo con detalles.' } })
  expect(screen.getByLabelText('Costo unitario (sin IVA)')).toBeValid()
  expect(screen.getByRole('button', { name: 'Guardar cambios' }).closest('form')).toBeValid()
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/admin/extras/filters', expect.objectContaining({ method: 'PATCH', body: expect.stringContaining('Segundo párrafo') })))
})
it('reorders gallery covers and removes a photo before saving', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [{ ...entry, unitPrice: 100 }] }))
  render(<ExtraCatalogManager />)
  fireEvent.click(await screen.findByRole('button', { name: 'Editar' }))
  fireEvent.click(screen.getByRole('button', { name: 'Mover fotografía 2 antes' }))
  expect(screen.getByRole('img', { name: 'Fotografía 1' })).toHaveAttribute('src', '/two.jpg')
  fireEvent.click(screen.getByRole('button', { name: 'Quitar fotografía 2' }))
  expect(screen.queryByRole('img', { name: 'Fotografía 2' })).not.toBeInTheDocument()
})
it('submits an extras-only quote without trusting displayed prices', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ subtotal: 0, discount: 0, discountPct: 0, extrasTotal: 6000, shippingFee: 0, rushFee: 0, iva: 960, total: 6960, advancePct: 50, advanceAmount: 3480 }) }))
  render(<CotizadorWizard methods={[]} products={[]} extras={[{ ...entry, unitPrice: 100 }]} shippingZones={[{ id: 'zone', name: 'Recolección (sin envío)', baseFee: 0, feePerUnit: 0 }]} volumeDiscounts={[]} settings={{ WHOLESALE_MARKUP_PCT: '20' }} preselectedExtra="filters" initialQuantity={50} />)
  expect(screen.getByRole('spinbutton', { name: 'Cantidad de Filtros de café' })).toHaveValue(50)
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
  fireEvent.change(screen.getByPlaceholderText('Tu empresa'), { target: { value: 'Empresa' } })
  fireEvent.change(screen.getByPlaceholderText('Tu nombre'), { target: { value: 'Ana' } })
  fireEvent.change(screen.getByPlaceholderText('correo@ejemplo.com'), { target: { value: 'ana@example.com' } })
  fireEvent.change(screen.getByPlaceholderText('+52 555 123 4567'), { target: { value: '5551234567' } })
  await waitFor(() => expect(screen.getByRole('button', { name: 'Enviar cotización' })).toBeEnabled())
  fireEvent.click(screen.getByRole('button', { name: 'Enviar cotización' }))
  await waitFor(() => expect(submitQuote).toHaveBeenCalledWith(expect.objectContaining({ items: [], extras: [{ extraId: 'filters', qty: 50 }] })))
  const payload = vi.mocked(submitQuote).mock.calls[0][0]
  expect(payload).not.toHaveProperty('total')
})
it('allows an empty first step but blocks submission without a product', () => {
  render(<CotizadorWizard methods={[]} products={[]} extras={[]} shippingZones={[]} volumeDiscounts={[]} settings={{}} />)
  fireEvent.click(screen.getByRole('button', { name: 'Cotizar accesorios sin un kit' }))
  expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled()
})
it('shows calculation failures and never reuses the previous total', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'Producto inactivo' }) }))
  render(<CotizadorWizard methods={[]} products={[]} extras={[{ ...entry, unitPrice: 100 }]} shippingZones={[{ id: 'zone', name: 'CDMX', baseFee: 0, feePerUnit: 15 }]} volumeDiscounts={[]} settings={{}} preselectedExtra="filters" initialQuantity={50} />)
  expect(await screen.findByRole('alert')).toHaveTextContent('Producto inactivo')
})

it('renders an extras-only saved quote without reporting lost product details', () => {
  render(<QuoteDetails quote={{ items: [], extraItems: [{ name: 'Filtros', qty: 50, unitLabel: 'paquete', unitsPerPack: 100, unitPrice: 120, lineTotal: 6000 }], subtotal: 0, iva: 960, total: 6960 }} />)
  expect(screen.getByText('Sin kits ni métodos en esta cotización.')).toBeInTheDocument()
  expect(screen.getByText('paquete de 100 piezas')).toBeInTheDocument()
  expect(screen.queryByText('No se guardó el detalle de estos conceptos.')).not.toBeInTheDocument()
})

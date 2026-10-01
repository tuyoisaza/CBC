import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { CotizadorWizard } from '@/app/cotizar/components/CotizadorWizard'
import { submitQuote } from '@/app/cotizar/actions/submitQuote'

vi.mock('@/app/cotizar/actions/submitQuote', () => ({
  submitQuote: vi.fn().mockResolvedValue({ quoteId: 'quote', quoteCode: 'CBC-001' }),
}))

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks() })

it('shows extra prices with markup and IVA while submitting only catalog selections', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => ({
    subtotal: 120, discount: 0, discountPct: 0, extrasTotal: 240,
    shippingFee: 0, rushFee: 0, iva: 57.6, total: 417.6,
    advancePct: 50, advanceAmount: 208.8,
  }) }))
  render(<CotizadorWizard
    methods={[{ id: 'method', name: 'Café', unitPrice: 100 }]}
    extras={[{ id: 'paid', name: 'Empaque', unitPrice: 100, allowedForRush: true }, { id: 'free', name: 'Tarjeta', unitPrice: 0, allowedForRush: true }]}
    shippingZones={[{ id: 'zone', name: 'Local', baseFee: 0, feePerUnit: 0 }]}
    volumeDiscounts={[]}
    products={[{ id: 'product', slug: 'cafe', name: 'Café', subtitle: null, price: 100, images: [], methodId: 'method' }]}
    settings={{ MIN_QTY_PER_METHOD: '1', WHOLESALE_MARKUP_PCT: '20', IVA_PCT: '16' }}
    preselectedProduct="cafe"
  />)
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
  expect(screen.getByText('+$139.20 c/u (con IVA)')).toBeInTheDocument()
  expect(screen.getByText('Gratis')).toBeInTheDocument()

  const paidRow = screen.getByText('Empaque').parentElement!.parentElement!
  fireEvent.click(within(paidRow).getByRole('button'))
  fireEvent.click(within(paidRow).getAllByRole('button')[2])
  const freeRow = screen.getByText('Tarjeta').parentElement!.parentElement!
  fireEvent.click(within(freeRow).getByRole('button'))
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
  expect(screen.getByText('2 × $139.20 (con IVA)')).toBeInTheDocument()

  fireEvent.change(screen.getByPlaceholderText('Tu empresa'), { target: { value: 'CBC' } })
  fireEvent.change(screen.getByPlaceholderText('Tu nombre'), { target: { value: 'Cliente' } })
  fireEvent.change(screen.getByPlaceholderText('correo@ejemplo.com'), { target: { value: 'cliente@example.com' } })
  fireEvent.change(screen.getByPlaceholderText('+52 555 123 4567'), { target: { value: '5551234567' } })
  await waitFor(() => expect(screen.getByRole('button', { name: 'Enviar cotización' })).toBeEnabled())
  fireEvent.click(screen.getByRole('button', { name: 'Enviar cotización' }))
  await waitFor(() => expect(submitQuote).toHaveBeenCalledWith(expect.objectContaining({
    items: [{ methodId: 'method', qty: 1 }],
    extras: [{ extraId: 'paid', qty: 2 }, { extraId: 'free', qty: 1 }],
  })))
  expect(submitQuote).not.toHaveBeenCalledWith(expect.objectContaining({ total: expect.any(Number), subtotal: expect.any(Number) }))
})

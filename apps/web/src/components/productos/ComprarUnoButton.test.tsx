import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ComprarUnoButton } from './ComprarUnoButton'
import { CHECKOUT_DRAFT_KEY } from '@/lib/checkout-draft'

vi.mock('./AddressAutocomplete', () => ({ AddressAutocomplete: () => null }))
const fetchMock = vi.fn()
beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset()
  fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify({ ok: false, error: 'Reintenta' }) })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
function fill() {
  render(<ComprarUnoButton slug="coffee" markedUpPrice={300} providers={['mercadopago']} />)
  fireEvent.click(screen.getByRole('button', { name: /Comprar 1/ }))
  for (const [placeholder, value] of [
    ['Tu nombre', 'Ana'], ['+52 55 1234 5678', '5512345678'], ['06700', '06700'],
    ['Roma Norte', 'Centro'], ['Av. Álvaro Obregón', 'Calle Uno'], ['123', '1'],
    ['Ciudad de México', 'CDMX'], ['CDMX', 'CDMX'],
  ]) fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value } })
}
const send = async () => {
  fireEvent.click(screen.getByRole('button', { name: /^Pagar/ }))
  await waitFor(() => expect(screen.getByRole('button', { name: /^Pagar/ })).not.toBeDisabled())
}
const payload = (n: number) => JSON.parse(fetchMock.mock.calls[n][1].body)
describe('retail client retry identity', () => {
  it('retains its UUID after a failure and renews it when the purchase changes', async () => {
    fill()
    await send()
    await send()
    expect(payload(0).idempotencyKey).toMatch(/^[0-9a-f-]{36}$/i)
    expect(payload(1).idempotencyKey).toBe(payload(0).idempotencyKey)
    fireEvent.change(screen.getByPlaceholderText('123'), { target: { value: '2' } })
    await send()
    expect(payload(2).idempotencyKey).not.toBe(payload(0).idempotencyKey)
  })

  it('saves an opted-in draft through payment failure and restores it after remount', async () => {
    fill()
    expect(localStorage.getItem(CHECKOUT_DRAFT_KEY)).toBeNull()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Guardar mis datos en este navegador' }))
    await send()
    cleanup()
    render(<ComprarUnoButton slug="other-coffee" markedUpPrice={400} providers={['stripe', 'mercadopago']} />)
    fireEvent.click(screen.getByRole('button', { name: /Comprar 1/ }))
    expect(screen.getByPlaceholderText('Tu nombre')).toHaveValue('')
    fireEvent.click(screen.getByRole('button', { name: 'Rellenar con mis datos guardados' }))
    expect(screen.getByPlaceholderText('Tu nombre')).toHaveValue('Ana')
    expect(screen.getByPlaceholderText('Av. Álvaro Obregón')).toHaveValue('Calle Uno')
    expect(screen.getByRole('button', { name: /Tarjeta · Stripe/ })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Mercado Pago Paga con los métodos disponibles en Mercado Pago' }))
    await send()
    expect(payload(1)).toMatchObject({ slug: 'other-coffee', provider: 'mercadopago' })
    fireEvent.click(screen.getByRole('button', { name: 'Borrar datos guardados' }))
    expect(localStorage.getItem(CHECKOUT_DRAFT_KEY)).toBeNull()
    expect(screen.getByPlaceholderText('Tu nombre')).toHaveValue('Ana')
  })

  it('blocks an overlong RFC and explains the error before any payment request', () => {
    fill()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Necesito factura (CFDI)' }))
    fireEvent.change(screen.getByPlaceholderText('XAXX010101000'), { target: { value: 'AAAA0101010000' } })
    expect(screen.getByPlaceholderText('XAXX010101000')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('button', { name: /^Pagar/ })).toBeDisabled()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

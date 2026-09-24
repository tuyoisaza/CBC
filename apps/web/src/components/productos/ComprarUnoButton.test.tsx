import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ComprarUnoButton } from './ComprarUnoButton'

vi.mock('./AddressAutocomplete', () => ({ AddressAutocomplete: () => null }))
const fetchMock = vi.fn()
beforeEach(() => {
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
})

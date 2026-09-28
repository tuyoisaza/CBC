import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import ExtrasPage from '@/app/admin/(protected)/sales/extras/page'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

it('saves a new free extra as zero and lets the admin switch back to a paid price', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] })
  vi.stubGlobal('fetch', fetchMock)
  render(<ExtrasPage />)
  await screen.findByText('No hay extras aún')
  fireEvent.click(screen.getByRole('button', { name: 'Nuevo' }))
  const price = screen.getByRole('spinbutton', { name: 'Costo unitario (sin IVA)' })
  fireEvent.click(screen.getByRole('checkbox', { name: 'Gratis' }))
  expect(price).toHaveValue(0)
  fireEvent.click(screen.getByRole('checkbox', { name: 'Gratis' }))
  expect(price).toHaveValue(null)
  fireEvent.change(price, { target: { value: '25' } })
  expect(screen.getByRole('checkbox', { name: 'Gratis' })).not.toBeChecked()
  fireEvent.change(price, { target: { value: '0' } })
  expect(screen.getByRole('checkbox', { name: 'Gratis' })).toBeChecked()
  fireEvent.click(screen.getByRole('button', { name: 'Crear' }))
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/admin/extras', expect.objectContaining({ method: 'POST', body: JSON.stringify({ unitPrice: 0 }) })))
})

it('recognizes an existing free extra when editing', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [{ id: 'free', name: 'Tarjeta', unitPrice: 0 }] }))
  render(<ExtrasPage />)
  await screen.findByText('Tarjeta')
  expect(screen.getByText('Gratis')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
  expect(screen.getByRole('checkbox', { name: 'Gratis' })).toBeChecked()
  expect(screen.getByRole('spinbutton', { name: 'Costo unitario (sin IVA)' })).toHaveValue(0)
})

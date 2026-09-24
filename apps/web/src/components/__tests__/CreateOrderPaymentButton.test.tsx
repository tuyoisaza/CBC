import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CreateOrderPaymentButton } from '../admin/sales/CreateOrderPaymentButton'

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => router }))

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks() })

describe('CreateOrderPaymentButton', () => {
  it('submits the chosen provider and opens the order', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ order: { id: 'order1' } }) })
    vi.stubGlobal('fetch', fetchMock)
    render(<CreateOrderPaymentButton quoteId="quote1" defaultProvider="mercadopago" />)
    expect(screen.getByRole('combobox')).toHaveValue('mercadopago')
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'stripe' } })
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/admin/sales/orders/order1'))
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ quoteId: 'quote1', provider: 'stripe' })
  })

  it('keeps the persisted provider and displays a retryable API failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'Proveedor temporalmente no disponible' }) }))
    render(<CreateOrderPaymentButton quoteId="quote1" defaultProvider="stripe" existingProvider="mercadopago" />)
    expect(screen.getByRole('combobox')).toBeDisabled()
    expect(screen.getByRole('combobox')).toHaveValue('mercadopago')
    fireEvent.click(screen.getByRole('button'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Proveedor temporalmente no disponible')
    expect(screen.getByRole('button')).not.toBeDisabled()
    expect(router.push).not.toHaveBeenCalled()
  })
})
import React from 'react'

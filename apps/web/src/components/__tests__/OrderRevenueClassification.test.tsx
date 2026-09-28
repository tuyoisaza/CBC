import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { OrderRevenueClassification } from '../admin/sales/OrderRevenueClassification'

const router = vi.hoisted(() => ({ refresh: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => router }))
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks() })

it('can restore an excluded order without modifying its operational status', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true })
  vi.stubGlobal('fetch', fetchMock)
  render(<OrderRevenueClassification orderId="o1" reason="test" />)
  fireEvent.change(screen.getByRole('combobox'), { target: { value: '' } })
  await waitFor(() => expect(router.refresh).toHaveBeenCalled())
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ revenueExclusionReason: null })
})

it('keeps the saved classification and shows a retryable failure', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
  render(<OrderRevenueClassification orderId="o1" reason={null} />)
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'test' } })
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo guardar')
  expect(screen.getByRole('combobox')).toHaveValue('')
  expect(screen.getByRole('combobox')).not.toBeDisabled()
  expect(router.refresh).not.toHaveBeenCalled()
})

import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { PaymentLinkActions } from '../admin/sales/PaymentLinkActions'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })
const props = { paymentId: 'p1', paymentUrl: 'https://pay.example/link', customerEmail: 'cliente@example.com' }

it('copies the existing payment URL without contacting a provider', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined)
  vi.stubGlobal('navigator', { clipboard: { writeText } })
  const fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  render(<PaymentLinkActions {...props} />)
  fireEvent.click(screen.getByRole('button', { name: 'Copiar' }))
  expect(await screen.findByText('Vínculo copiado')).toBeInTheDocument()
  expect(writeText).toHaveBeenCalledWith(props.paymentUrl)
  expect(fetchMock).not.toHaveBeenCalled()
})

it('sends only the payment identity and prevents repeat clicks while sending', async () => {
  let complete!: (value: unknown) => void
  const fetchMock = vi.fn(() => new Promise(resolve => { complete = resolve }))
  vi.stubGlobal('fetch', fetchMock)
  render(<PaymentLinkActions {...props} />)
  expect(screen.getByText('Destinatario: cliente@example.com')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Enviar por correo' }))
  expect(screen.getByRole('button', { name: 'Enviando…' })).toBeDisabled()
  complete({ ok: true, json: async () => ({ email: props.customerEmail }) })
  expect(await screen.findByText('Correo enviado a cliente@example.com')).toBeInTheDocument()
  expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/api/admin/payments/p1/email', { method: 'POST' })
})

it('shows provider failure and allows retry without claiming success', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'No se pudo enviar el correo.' }) }))
  render(<PaymentLinkActions {...props} />)
  fireEvent.click(screen.getByRole('button', { name: 'Enviar por correo' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo enviar el correo.')
  expect(screen.queryByText(/Correo enviado a/)).not.toBeInTheDocument()
  await waitFor(() => expect(screen.getByRole('button', { name: 'Enviar por correo' })).not.toBeDisabled())
})

it('disables email when no recipient is saved but still allows copying', () => {
  render(<PaymentLinkActions {...props} customerEmail={null} />)
  expect(screen.getByRole('button', { name: 'Enviar por correo' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Copiar' })).not.toBeDisabled()
})

it('links to provider configuration when no usable email key is configured', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ code: 'EMAIL_NOT_CONFIGURED', error: 'Falta configurar el proveedor de correo.' }) }))
  render(<PaymentLinkActions {...props} />)
  fireEvent.click(screen.getByRole('button', { name: 'Enviar por correo' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Falta configurar')
  expect(screen.getByRole('link', { name: 'Configurar correo (superadministrador)' })).toHaveAttribute('href', '/admin/configuration')
  expect(screen.getByRole('button', { name: 'Copiar' })).not.toBeDisabled()
})

it('reports clipboard errors', async () => {
  vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })
  render(<PaymentLinkActions {...props} />)
  fireEvent.click(screen.getByRole('button', { name: 'Copiar' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo copiar')
})

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProviderConfiguration } from './ProviderConfiguration'

const fetchMock = vi.fn()
const token = { key: 'ACCESS_TOKEN', label: 'Access Token', kind: 'secret', help: 'Clave de cobro.', configured: true, source: 'environment', updatedAt: null, value: 'SERVER-SECRET-NEVER-SHOW' }
const data = { encryptionReady: true, providers: [
  { id: 'mercadopago', label: 'Mercado Pago', description: 'Pagos en línea.', fields: [token,
    { key: 'PUBLIC_URL', label: 'URL pública', kind: 'text', help: 'URL de retorno.', configured: true, source: 'database', value: 'https://cbc.example', updatedAt: null },
    { key: 'TEST_MODE', label: 'Modo de prueba', kind: 'boolean', help: 'Usar sandbox.', configured: true, source: 'database', value: 'false', updatedAt: null },
  ] },
  { id: 'stripe', label: 'Stripe', description: 'Tarjetas.', fields: [{ ...token, key: 'STRIPE_KEY', label: 'Clave Stripe', source: 'missing', configured: false }] },
] }
const response = (body: unknown = data) => ({ ok: true, json: async () => body })
const setup = async () => { render(<ProviderConfiguration />); await screen.findByLabelText('Access Token') }
const writes = () => fetchMock.mock.calls.filter(([, options]) => options.method)

beforeEach(() => { fetchMock.mockReset(); fetchMock.mockResolvedValue(response()); vi.stubGlobal('fetch', fetchMock) })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('provider credentials configuration', () => {
  it('never prefills or offers to reveal stored secrets, while displaying nonsecret values', async () => {
    await setup()
    const input = screen.getByLabelText('Access Token')
    expect(input).toHaveAttribute('type', 'password')
    expect(input).toHaveValue('')
    expect(document.body.innerHTML).not.toContain('SERVER-SECRET-NEVER-SHOW')
    expect(screen.getByLabelText('URL pública')).toHaveValue('https://cbc.example')
    expect(screen.queryByRole('button', { name: /revelar|mostrar|copiar/i })).toBeNull()
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled()
  })

  it('sends only changed values and clears the replacement secret after success', async () => {
    await setup()
    fireEvent.change(screen.getByLabelText('Access Token'), { target: { value: 'replacement-secret' } })
    fireEvent.change(screen.getByLabelText('Modo de prueba'), { target: { value: 'true' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await screen.findByText('Configuración guardada.')
    expect(writes()).toHaveLength(1)
    expect(writes()[0][0]).toBe('/api/admin/configuration/mercadopago')
    expect(JSON.parse(writes()[0][1].body)).toEqual({ values: { ACCESS_TOKEN: 'replacement-secret', TEST_MODE: 'true' } })
    expect(screen.getByLabelText('Access Token')).toHaveValue('')
    expect(document.body.innerHTML).not.toContain('SERVER-SECRET-NEVER-SHOW')
  })

  it('keeps empty input unchanged and never displays an error response body', async () => {
    await setup()
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'LEAKED-PROVIDER-SECRET' }) })
    fireEvent.change(screen.getByLabelText('Access Token'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('URL pública'), { target: { value: 'https://new.example' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await screen.findByRole('alert')
    expect(JSON.parse(writes()[0][1].body)).toEqual({ values: { PUBLIC_URL: 'https://new.example' } })
    expect(document.body.textContent).not.toContain('LEAKED-PROVIDER-SECRET')
  })

  it('requires inline confirmation before disabling a configured field', async () => {
    await setup()
    fireEvent.click(screen.getByRole('button', { name: 'Desactivar Access Token' }))
    expect(writes()).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('button', { name: 'Confirmar desactivación' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Desactivar Access Token' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar desactivación' }))
    await screen.findByText('Configuración guardada.')
    expect(JSON.parse(writes()[0][1].body)).toEqual({ values: {}, disable: ['ACCESS_TOKEN'] })
  })

  it('imports by provider without reading credentials into client state', async () => {
    await setup()
    fireEvent.click(screen.getByRole('button', { name: 'Importar desde servidor' }))
    await screen.findByText('Configuración importada desde el servidor.')
    expect(writes()[0][0]).toBe('/api/admin/configuration/import')
    expect(JSON.parse(writes()[0][1].body)).toEqual({ provider: 'mercadopago' })
    expect(screen.getByLabelText('Access Token')).toHaveValue('')
  })

  it('clears unsaved secret inputs when changing providers', async () => {
    await setup()
    fireEvent.change(screen.getByLabelText('Access Token'), { target: { value: 'unsaved-secret' } })
    fireEvent.click(screen.getByRole('button', { name: /^Stripe/ }))
    expect(screen.getByLabelText('Clave Stripe')).toHaveValue('')
    expect(screen.queryByRole('button', { name: 'Importar desde servidor' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /^Mercado Pago/ }))
    expect(screen.getByLabelText('Access Token')).toHaveValue('')
  })

  it('prevents writes until server encryption is ready', async () => {
    fetchMock.mockResolvedValue(response({ ...data, encryptionReady: false }))
    await setup()
    expect(screen.getByRole('alert')).toHaveTextContent('cifrado del servidor')
    expect(screen.getByLabelText('Access Token')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Importar desde servidor' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled()
    expect(writes()).toHaveLength(0)
  })

  it('clears successfully saved secrets even if refreshing status fails', async () => {
    await setup()
    fetchMock.mockResolvedValueOnce(response({ ok: true })).mockRejectedValueOnce(new Error('offline'))
    fireEvent.change(screen.getByLabelText('Access Token'), { target: { value: 'replacement-secret' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Se guardaron los cambios'))
    expect(screen.getByLabelText('Access Token')).toHaveValue('')
  })
})

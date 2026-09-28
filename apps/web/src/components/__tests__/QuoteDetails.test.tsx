import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { QuoteDetails } from '../admin/sales/QuoteDetails'

afterEach(cleanup)

const base = {
  items: [{ methodName: 'Caja prensa personalizada', qty: 20, unitPrice: 300, lineTotal: 6000 }],
  extraItems: [{ name: 'Tarjeta adicional', qty: 20, unitPrice: 10, lineTotal: 200 }],
  subtotal: 6000, discount: 600, discountPct: 10, shippingFee: 150, rushFee: 540,
  iva: 1006.4, total: 7296.4, advanceAmount: 3648.2, advancePct: 50,
  rush: true, deliveryDate: new Date('2026-10-03T00:00:00.000Z'), shippingZone: { name: 'Zona Centro' },
}

describe('QuoteDetails', () => {
  it('shows the saved customer selections, extras and amounts without repricing', () => {
    render(<QuoteDetails quote={{ ...base, notes: 'Entregar en recepción', messageCard: 'Gracias por acompañarnos', logoUrl: 'https://example.com/logo.png', pdfUrl: 'https://example.com/quote.pdf' }} />)
    const products = within(screen.getByRole('table', { name: 'Productos cotizados' }))
    expect(products.getByText('Caja prensa personalizada')).toBeInTheDocument()
    expect(products.getByText('20')).toBeInTheDocument()
    expect(products.getByText('$300.00 MXN')).toBeInTheDocument()
    expect(products.getByText('$6,000.00 MXN')).toBeInTheDocument()
    expect(within(screen.getByRole('table', { name: 'Extras' })).getByText('Tarjeta adicional')).toBeInTheDocument()
    for (const value of ['$600.00 MXN', '$150.00 MXN', '$540.00 MXN', '$1,006.40 MXN', '$7,296.40 MXN', '$3,648.20 MXN', 'Zona Centro', '3 de octubre de 2026', 'Entregar en recepción', 'Gracias por acompañarnos']) {
      expect(screen.getByText(value)).toBeInTheDocument()
    }
    expect(screen.getByRole('link', { name: 'Ver logo adjunto' })).toHaveAttribute('href', 'https://example.com/logo.png')
    expect(screen.getByRole('link', { name: 'Ver PDF de la cotización' })).toHaveAttribute('href', 'https://example.com/quote.pdf')
  })

  it('supports legacy, manual and retail quote rows and free extras', () => {
    render(<QuoteDetails quote={{ ...base, items: [
      { type: 'prensa', qty: 2, unitPrice: 500, subtotal: 1000 },
      { description: 'Caja manual', quantity: 3, unitPrice: 700, subtotal: 2100 },
      { type: 'single-product', name: 'Kit individual', qty: 1, unitPrice: 900, subtotal: 900 },
      { type: 'shipping', qty: 1, unitPrice: 99, subtotal: 99 },
    ], extraItems: [{ name: 'Tarjeta gratis', qty: 2, unitPrice: 0, lineTotal: 0 }], shippingFee: 0 }} />)
    expect(screen.getByText('Prensa francesa')).toBeInTheDocument()
    expect(screen.getByText('Caja manual')).toBeInTheDocument()
    expect(screen.getByText('Kit individual')).toBeInTheDocument()
    expect(screen.getAllByText('Envío')).toHaveLength(1)
    const extras = within(screen.getByRole('table', { name: 'Extras' }))
    expect(extras.getByText('Tarjeta gratis')).toBeInTheDocument()
    expect(extras.getAllByText('$0.00 MXN')).toHaveLength(2)
  })

  it('keeps unknown values visibly missing instead of inventing prices or failing on malformed rows', () => {
    const { container } = render(<QuoteDetails quote={{ ...base, items: [null, { name: 'Incompleto', qty: '5', unitPrice: NaN }, { name: 'Solo total', subtotal: 123 }], extraItems: { invalid: true }, deliveryDate: 'invalid', logoUrl: 'javascript:alert(1)', pdfUrl: 'data:text/html,unsafe' }} />)
    expect(screen.getByText('Producto sin descripción guardada')).toBeInTheDocument()
    expect(screen.getByText('Incompleto')).toBeInTheDocument()
    expect(screen.getByText('$123.00 MXN')).toBeInTheDocument()
    expect(screen.getByText('No se guardó el detalle de estos conceptos.')).toBeInTheDocument()
    expect(screen.getByText('No registrada')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(container.textContent).not.toMatch(/NaN|undefined|Invalid Date/)
    expect(screen.getAllByText('—').length).toBeGreaterThan(5)
  })

  it('renders a server snapshot even when no item details were saved', () => {
    const markup = renderToStaticMarkup(<QuoteDetails quote={{ ...base, items: null, extraItems: [] }} />)
    expect(markup).toContain('No se guardó el detalle de estos conceptos.')
    expect(markup).toContain('Sin extras')
    expect(markup).toContain('$7,296.40 MXN')
  })

  it('preserves internal upload attachments and rejects ambiguous relative URLs', () => {
    const { rerender } = render(<QuoteDetails quote={{ ...base, logoUrl: '/api/uploads/logos/logo.png', pdfUrl: '/api/uploads/quotes/quote.pdf' }} />)
    expect(screen.getByRole('link', { name: 'Ver logo adjunto' })).toHaveAttribute('href', '/api/uploads/logos/logo.png')
    expect(screen.getByRole('link', { name: 'Ver PDF de la cotización' })).toHaveAttribute('href', '/api/uploads/quotes/quote.pdf')
    rerender(<QuoteDetails quote={{ ...base, logoUrl: '//unknown.example/logo', pdfUrl: '/\\unknown.example/pdf' }} />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})

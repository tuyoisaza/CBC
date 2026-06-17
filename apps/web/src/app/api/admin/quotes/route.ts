import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { QuotePDF } from '@/lib/pdf/QuotePDF'
import { uploadBuffer, quoteKey } from '@/lib/r2'
import { createLogger } from '@/lib/logger'
const log = createLogger('admin/quotes')

const itemSchema = z.object({
  description: z.string(),
  quantity:    z.number().int().positive(),
  unitPrice:   z.number().positive(),
})

const quoteSchema = z.object({
  leadId:     z.string(),
  customerId: z.string(),
  items:      z.array(itemSchema).min(1),
  notes:      z.string().optional(),
  logoUrl:    z.string().url().optional(),
  messageCard: z.string().max(400).optional(),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const data = quoteSchema.parse(body)

  // Calculate totals
  const items = data.items.map((item) => ({
    ...item,
    subtotal: item.quantity * item.unitPrice,
  }))
  const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0)
  const iva      = Math.round(subtotal * 0.16 * 100) / 100
  const total    = Math.round((subtotal + iva) * 100) / 100

  // Get quote count for folio
  const count = await db.quote.count()
  const quoteCode = `CBC-Q-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`

  // Get customer info for PDF
  const customer = await db.customer.findUnique({ where: { id: data.customerId } })
  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

  // Validity date: 15 days from now
  const validUntil = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
    .toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })

  // Generate PDF
  let pdfUrl: string | undefined
  try {
    const pdfElement = createElement(QuotePDF, {
      quoteCode,
      companyName: customer.companyName,
      contactName: customer.contactName,
      email: customer.email || '',
      items,
      subtotal,
      iva,
      total,
      validUntil,
      notes: data.notes,
    })
    const pdfBuffer = await renderToBuffer(pdfElement as unknown as Parameters<typeof renderToBuffer>[0])
    pdfUrl = await uploadBuffer(
      quoteKey(quoteCode),
      Buffer.from(pdfBuffer),
      'application/pdf'
    )
  } catch (err) {
    log.error({ path: '/api/admin/quotes', method: 'POST', error: err }, 'PDF generation failed')
    // Continue without PDF — not fatal
  }

  const quote = await db.quote.create({
    data: {
      quoteCode,
      leadId:      data.leadId,
      customerId:  data.customerId,
      items:       items as any,
      subtotal,
      iva,
      total,
      logoUrl:     data.logoUrl,
      messageCard: data.messageCard,
      notes:       data.notes,
      pdfUrl,
      status:      'draft',
      expiresAt:   new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    },
  })

  // Update lead status to quoted
  await db.lead.update({
    where: { id: data.leadId },
    data:  { status: 'quoted' },
  })

  return NextResponse.json(quote, { status: 201 })
}

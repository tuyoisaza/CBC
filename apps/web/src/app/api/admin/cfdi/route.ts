import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { createCfdi, getCfdiPdfUrl, getCfdiXmlUrl, buildCfdiFromOrder } from '@/lib/facturapi'
import { uploadBuffer, cfdiKey } from '@/lib/r2'
import { sendCfdiToCustomer } from '@/lib/notifications'
import { z } from 'zod'

const schema = z.object({
  orderId:     z.string(),
  paymentForm: z.string().default('03'), // 03=transfer, 04=card, 99=TBD
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { orderId, paymentForm } = schema.parse(await req.json())

  const order = await db.order.findUnique({
    where:   { id: orderId },
    include: { customer: true, quote: true },
  })
  if (!order)             return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (!order.customer.rfc) return NextResponse.json({ error: 'Customer RFC missing' }, { status: 422 })

  // Check no CFDI already exists
  const existing = await db.cfdi.findFirst({ where: { orderId } })
  if (existing) return NextResponse.json({ error: 'CFDI already issued' }, { status: 409 })

  // Build CFDI folio
  const cfdiCount = await db.cfdi.count()
  const folioNumber = cfdiCount + 1

  // Parse order items from quote
  const quoteItems = order.quote.items as Array<{
    description: string
    quantity: number
    unitPrice: number
  }>

  const cfdiData = buildCfdiFromOrder({
    customer: {
      razonSocial:        order.customer.razonSocial!,
      rfc:                order.customer.rfc!,
      regimenFiscal:      order.customer.regimenFiscal || '601',
      codigoPostalFiscal: order.customer.codigoPostalFiscal!,
      emailFacturacion:   order.customer.emailFacturacion || order.customer.email || '',
      usoCfdi:            order.customer.usoCfdi || 'G03',
    },
    items: quoteItems,
    paymentForm,
    folioNumber,
  })

  // Create CFDI via Facturapi
  const facturaCfdi = await createCfdi(cfdiData)

  // Download PDF + XML and upload to R2
  const [pdfBase64, xmlBase64] = await Promise.all([
    getCfdiPdfUrl(facturaCfdi.id),
    getCfdiXmlUrl(facturaCfdi.id),
  ])

  const [pdfUrl, xmlUrl] = await Promise.all([
    uploadBuffer(cfdiKey(orderId, 'pdf'), Buffer.from(pdfBase64, 'base64'), 'application/pdf'),
    uploadBuffer(cfdiKey(orderId, 'xml'), Buffer.from(xmlBase64, 'base64'), 'application/xml'),
  ])

  // Save CFDI record
  const cfdi = await db.cfdi.create({
    data: {
      orderId,
      facturApiId:         facturaCfdi.id,
      folio:               `CBC-F-${String(folioNumber).padStart(3, '0')}`,
      serie:               'CBC',
      uuid:                facturaCfdi.uuid,
      rfcEmisor:           process.env.CBC_RFC,
      rfcReceptor:         order.customer.rfc,
      razonSocialReceptor: order.customer.razonSocial,
      subtotal:            order.quote.subtotal,
      iva:                 order.quote.iva,
      total:               order.quote.total,
      xmlUrl,
      pdfUrl,
      status:              'valid',
      issuedAt:            new Date(),
    },
  })

  // Send CFDI to customer by email
  await sendCfdiToCustomer({
    email:       order.customer.emailFacturacion || order.customer.email || '',
    companyName: order.customer.companyName,
    orderCode:   order.orderCode,
    xmlUrl,
    pdfUrl,
  })

  return NextResponse.json({ cfdi }, { status: 201 })
}

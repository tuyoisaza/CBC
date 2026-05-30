import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'

// RFC validation — Mexican RFC format
const rfcRegex = /^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$/

const leadSchema = z.object({
  // Company
  companyName:       z.string().min(2).max(100),
  contactName:       z.string().min(2).max(100),
  email:             z.string().email(),
  whatsapp:          z.string().min(8).max(20),
  // Order details
  boxType:           z.enum(['prensa', 'moka', 'mix']),
  quantity:          z.enum(['10-14', '15-30', '31-50', '50+']),
  occasion:          z.enum(['fin-de-ano', 'dia-del-amor', 'dia-del-trabajo', 'onboarding', 'cliente', 'otro']),
  message:           z.string().max(500).optional(),
  logoUrl:           z.string().url().optional(),
  // SAT fiscal data
  rfc:               z.string().regex(rfcRegex, 'RFC inválido').optional(),
  razonSocial:       z.string().max(200).optional(),
  codigoPostalFiscal: z.string().length(5).optional(),
  regimenFiscal:     z.string().optional(),
  usoCfdi:           z.string().optional(),
  emailFacturacion:  z.string().email().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = leadSchema.parse(body)

    // Upsert customer (by WhatsApp number)
    const customer = await db.customer.upsert({
      where: { whatsapp: data.whatsapp } as any,
      update: {
        companyName: data.companyName,
        contactName: data.contactName,
        email: data.email,
        // Update fiscal data if provided
        ...(data.rfc && { rfc: data.rfc }),
        ...(data.razonSocial && { razonSocial: data.razonSocial }),
        ...(data.codigoPostalFiscal && { codigoPostalFiscal: data.codigoPostalFiscal }),
        ...(data.regimenFiscal && { regimenFiscal: data.regimenFiscal }),
        ...(data.usoCfdi && { usoCfdi: data.usoCfdi }),
        ...(data.emailFacturacion && { emailFacturacion: data.emailFacturacion }),
      },
      create: {
        companyName:        data.companyName,
        contactName:        data.contactName,
        email:              data.email,
        whatsapp:           data.whatsapp,
        rfc:                data.rfc,
        razonSocial:        data.razonSocial,
        codigoPostalFiscal: data.codigoPostalFiscal,
        regimenFiscal:      data.regimenFiscal ?? '601',
        usoCfdi:            data.usoCfdi ?? 'G03',
        emailFacturacion:   data.emailFacturacion ?? data.email,
      },
    })

    // Create lead
    const quantityNum = data.quantity === '10-14' ? 12 :
                        data.quantity === '15-30' ? 20 :
                        data.quantity === '31-50' ? 40 : 60

    const lead = await db.lead.create({
      data: {
        customerId: customer.id,
        source:     'quote-form',
        message:    data.message,
        boxType:    data.boxType,
        quantity:   quantityNum,
        occasion:   data.occasion,
        status:     'new',
      },
    })

    // TODO: send WhatsApp notification to Lorena
    // TODO: send confirmation email to client

    return NextResponse.json({ success: true, leadId: lead.id }, { status: 201 })

  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.errors }, { status: 400 })
    }
    console.error('Lead creation error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

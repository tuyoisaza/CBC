import { NextRequest, NextResponse } from 'next/server'
import { db, withDbRetry } from '@/lib/db'
import { z } from 'zod'
import { createLogger } from '@/lib/logger'
import { calculateQuoteForSave, quoteSelectionSchema, QuoteValidationError } from '@/lib/quote-server-calculation'

const log = createLogger('api/quote/calculate')
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const input = quoteSelectionSchema.parse(await req.json())
    const result = await withDbRetry(() => calculateQuoteForSave(db, input))
    const { subtotal, discount, discountPct, extrasTotal, shippingFee, rushFee, iva, total, advancePct, advanceAmount } = result
    return NextResponse.json({ subtotal, discount, discountPct, extrasTotal, shippingFee, rushFee, iva, total, advancePct, advanceAmount })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Datos de cotización inválidos', details: error.errors }, { status: 400 })
    if (error instanceof QuoteValidationError) return NextResponse.json({ error: error.message }, { status: 400 })
    log.error({ path: '/api/quote/calculate', method: 'POST', error }, 'Failed to calculate quote')
    return NextResponse.json({ error: 'No se pudo calcular la cotización.' }, { status: 500 })
  }
}

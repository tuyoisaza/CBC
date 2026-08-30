import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkStripeStatus, checkMercadoPagoStatus } from '@/lib/payment-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [stripe, mercadopago] = await Promise.all([checkStripeStatus(), checkMercadoPagoStatus()])
  return NextResponse.json({ checkedAt: new Date().toISOString(), stripe, mercadopago })
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@cbc/db'
import { createLogger } from '@/lib/logger'
const log = createLogger('api/tracking')

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const order = await prisma.order.findUnique({
      where: { orderCode: params.code.toUpperCase() },
      include: { customer: true, cfdis: true, quote: true },
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } }
      )
    }

    return NextResponse.json(order, {
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    log.error({ path: '/api/tracking/[code]', method: 'GET', code: params.code, error }, 'Failed to fetch tracking')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
  })
}

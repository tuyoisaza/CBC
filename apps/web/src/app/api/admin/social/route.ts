import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getConnectionStatus, disconnect } from '@/lib/social'
import { z } from 'zod'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await getConnectionStatus())
}

const deleteSchema = z.object({ network: z.enum(['meta', 'linkedin']) })

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { network } = deleteSchema.parse(await req.json())
  await disconnect(network)
  return NextResponse.json({ ok: true })
}

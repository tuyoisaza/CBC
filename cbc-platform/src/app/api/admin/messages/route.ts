import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import axios from 'axios'

// Send outbound WhatsApp message
const sendSchema = z.object({
  to:          z.string(),
  body:        z.string().min(1),
  leadId:      z.string().optional(),
  inReplyToId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const data = sendSchema.parse(await req.json())

  // Send via WhatsApp Cloud API
  await axios.post(
    `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: 'whatsapp',
      to:   data.to.replace(/\D/g, ''),
      type: 'text',
      text: { body: data.body },
    },
    { headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` } }
  )

  // Save outbound message
  const message = await db.message.create({
    data: {
      from:      `+${process.env.WHATSAPP_PHONE_NUMBER_ID}`,
      to:        data.to,
      body:      data.body,
      direction: 'outbound',
      platform:  'whatsapp',
      status:    'read',
      leadId:    data.leadId,
    },
  })

  return NextResponse.json(message, { status: 201 })
}

// Mark message as read/replied
const patchSchema = z.object({
  status: z.enum(['read', 'replied']),
})

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const id  = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { status } = patchSchema.parse(await req.json())
  const message = await db.message.update({ where: { id }, data: { status } })

  return NextResponse.json(message)
}

// Get messages (for inbox)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url    = new URL(req.url)
  const leadId = url.searchParams.get('leadId')
  const from   = url.searchParams.get('from')

  const messages = await db.message.findMany({
    where: {
      ...(leadId ? { leadId } : {}),
      ...(from   ? { from }   : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return NextResponse.json(messages)
}

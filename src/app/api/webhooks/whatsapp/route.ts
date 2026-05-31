import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { db } from '@/lib/db'
import { updateEngineCoffee } from '@/lib/engine'
import { notifyLorenaNewLead } from '@/lib/notifications'
import axios from 'axios'
import crypto from 'crypto'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// Verify webhook with Meta
export async function GET(req: NextRequest) {
  const url       = new URL(req.url)
  const mode      = url.searchParams.get('hub.mode')
  const token     = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

export async function POST(req: NextRequest) {
  // Verify Meta signature
  const rawBody  = await req.text()
  const signature = req.headers.get('x-hub-signature-256') || ''
  const expected  = 'sha256=' + crypto
    .createHmac('sha256', process.env.META_APP_SECRET!)
    .update(rawBody)
    .digest('hex')

  if (signature !== expected) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Always ack immediately (Meta requires < 20s response)
  const body = JSON.parse(rawBody)
  handleMessage(body).catch(console.error)
  return NextResponse.json({ received: true })
}

async function handleMessage(body: any) {
  const entry   = body.entry?.[0]
  const changes = entry?.changes?.[0]
  const message = changes?.value?.messages?.[0]
  if (!message || message.type !== 'text') return

  const from = message.from
  const text = (message.text.body as string).trim()

  // ─── Lorena's coffee update ───────────────────────────────────
  const isCoffeeUpdate = /café nuevo|cafe nuevo|nuevo café|nuevo cafe|new coffee/i.test(text)

  if (from === process.env.LORENA_PHONE?.replace(/\D/g, '') && isCoffeeUpdate) {
    await handleCoffeeUpdate(text, from)
    return
  }

  // ─── Customer / prospect message ─────────────────────────────
  await handleCustomerMessage(text, from)
}

async function handleCoffeeUpdate(text: string, from: string) {
  try {
    // Use Claude to parse the free-form coffee description
    const response = await anthropic.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 600,
      system: `Extrae información de un mensaje de WhatsApp donde Lorena describe un nuevo café de especialidad.
Devuelve SOLO un objeto JSON válido con esta estructura:
{
  "name": "nombre del café",
  "originCountry": "país",
  "originRegion": "región",
  "originFarm": "nombre de la finca o null",
  "variety": "variedad o null",
  "process": "proceso (lavado/natural/honey) o null",
  "roast": "tueste o null",
  "tastingNotes": ["nota1", "nota2"],
  "story": "una frase que capture la esencia de este café"
}
Si un campo no está, usa null. Devuelve solo el JSON, sin markdown.`,
      messages: [{ role: 'user', content: text }],
    })

    const parsed = JSON.parse((response.content[0] as any).text)

    // Deactivate current coffees and create new one
    await db.coffee.updateMany({ data: { active: false } })
    const coffee = await db.coffee.create({
      data: {
        ...parsed,
        tastingNotes: parsed.tastingNotes || [],
        active:       true,
      },
    })

    // Sync to engine
    await updateEngineCoffee(coffee as any)

    // Confirm back to Lorena
    await sendWhatsApp(from,
      `✅ *Café actualizado*\n\n` +
      `*${coffee.name}*\n` +
      `${coffee.originRegion}, ${coffee.originCountry}` +
      (coffee.originFarm ? ` · ${coffee.originFarm}` : '') + `\n` +
      (coffee.variety ? `Variedad: ${coffee.variety}\n` : '') +
      (coffee.process ? `Proceso: ${coffee.process}\n` : '') +
      `Notas: ${coffee.tastingNotes.join(', ')}\n\n` +
      `El motor de contenido usará este café en el próximo post. 🎉`
    )
  } catch (err) {
    console.error('Coffee update failed:', err)
    await sendWhatsApp(from,
      '❌ No pude procesar el café. Intenta con más detalle: nombre, origen, variedad, proceso y notas de cata.'
    )
  }
}

async function handleCustomerMessage(text: string, from: string) {
  // Save message to DB for the customer service inbox
  const phone = `+${from}`

  // Try to find existing customer/lead by phone
  const customer = await db.customer.findFirst({
    where: { whatsapp: { contains: from.slice(-10) } },
    include: { leads: { orderBy: { createdAt: 'desc' }, take: 1 } },
  })

  await db.message.create({
    data: {
      from:      phone,
      body:      text,
      direction: 'inbound',
      platform:  'whatsapp',
      status:    'unread',
      leadId:    customer?.leads?.[0]?.id,
    },
  })

  // Generate an AI draft reply using Claude (saved, not auto-sent)
  try {
    const draft = await anthropic.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 300,
      system: `Eres el asistente de ventas de Coffee Bunn Café. Genera un borrador de respuesta breve y cálida en español mexicano para este mensaje de WhatsApp. La respuesta debe ser de Lorena Luna, experta en café de especialidad. Tono: amable, directo, profesional. Máximo 3 líneas. Solo el texto de la respuesta, sin comillas.`,
      messages: [{ role: 'user', content: `Mensaje del cliente: "${text}"` }],
    })

    const draftText = (draft.content[0] as any).text

    // Update message with AI draft
    await db.message.updateMany({
      where: { from: phone, status: 'unread', direction: 'inbound' },
      data:  { aiDraft: draftText },
    })
  } catch {
    // Draft generation failure is non-fatal
  }
}

async function sendWhatsApp(to: string, message: string) {
  await axios.post(
    `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    { messaging_product: 'whatsapp', to, type: 'text', text: { body: message } },
    { headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` } }
  )
}

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateText, stripJsonFences } from '@/lib/llm'
import axios from 'axios'
import crypto from 'crypto'
import { createLogger } from '@/lib/logger'
import { getIntegrationValue, getIntegrationValues } from '@/lib/integration-secrets'
const log = createLogger('webhooks/whatsapp')

// Verify webhook with Meta
export async function GET(req: NextRequest) {
  const url       = new URL(req.url)
  const mode      = url.searchParams.get('hub.mode')
  const token     = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')

  let verifyToken: string | undefined
  try { verifyToken = await getIntegrationValue('WHATSAPP_VERIFY_TOKEN') }
  catch { return NextResponse.json({ error: 'Webhook unavailable' }, { status: 503 }) }
  if (verifyToken && mode === 'subscribe' && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

export async function POST(req: NextRequest) {
  // Verify Meta signature
  const rawBody  = await req.text()
  const signature = req.headers.get('x-hub-signature-256') || ''
  let appSecret: string | undefined
  try { appSecret = await getIntegrationValue('META_APP_SECRET') }
  catch { return NextResponse.json({ error: 'Webhook unavailable' }, { status: 503 }) }
  if (!appSecret) return NextResponse.json({ error: 'Webhook unavailable' }, { status: 503 })
  const expected  = 'sha256=' + crypto
    .createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex')

  if (!/^sha256=[a-f0-9]{64}$/.test(signature) || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Always ack immediately (Meta requires < 20s response)
  const body = JSON.parse(rawBody)
  handleMessage(body).catch(() => log.error({}, 'WhatsApp message handler failed'))
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
  const isLorena = from === (await getIntegrationValue('LORENA_PHONE'))?.replace(/\D/g, '')

  if (isLorena && isCoffeeUpdate) {
    await handleCoffeeUpdate(text, from)
    return
  }

  // ─── Customer / prospect message ─────────────────────────────
  await handleCustomerMessage(text, from)
}

async function handleCoffeeUpdate(text: string, from: string) {
  try {
    // Parse the free-form coffee description into structured data
    const raw = await generateText({
      maxTokens: 600,
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
      prompt: text,
    })

    const parsed = JSON.parse(stripJsonFences(raw))

    // Deactivate current coffees and create new one
    await db.coffee.updateMany({ data: { active: false } })
    const coffee = await db.coffee.create({
      data: {
        ...parsed,
        tastingNotes: parsed.tastingNotes || [],
        active:       true,
      },
    })

    // Confirm back to Lorena
    await sendWhatsApp(from,
      `✅ *Café actualizado*\n\n` +
      `*${coffee.name}*\n` +
      `${coffee.originRegion}, ${coffee.originCountry}` +
      (coffee.originFarm ? ` · ${coffee.originFarm}` : '') + `\n` +
      (coffee.variety ? `Variedad: ${coffee.variety}\n` : '') +
      (coffee.process ? `Proceso: ${coffee.process}\n` : '') +
      `Notas: ${coffee.tastingNotes.join(', ')}`
    )
  } catch (err) {
    log.error({}, 'Coffee update failed')
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

  // Generate an AI draft reply (saved, not auto-sent)
  try {
    const draftText = await generateText({
      maxTokens: 300,
      system: `Eres el asistente de ventas de Coffee Bunn Café. Genera un borrador de respuesta breve y cálida en español mexicano para este mensaje de WhatsApp. La respuesta debe ser de Lorena Luna, experta en café de especialidad. Tono: amable, directo, profesional. Máximo 3 líneas. Solo el texto de la respuesta, sin comillas.`,
      prompt: `Mensaje del cliente: "${text}"`,
    })

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
  const config = await getIntegrationValues(['WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_TOKEN'])
  if (!config.WHATSAPP_PHONE_NUMBER_ID || !config.WHATSAPP_TOKEN) throw new Error('WhatsApp is not configured')
  try {
  await axios.post(
    `https://graph.facebook.com/v21.0/${config.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    { messaging_product: 'whatsapp', to, type: 'text', text: { body: message } },
    { headers: { Authorization: `Bearer ${config.WHATSAPP_TOKEN}` } }
  )
  } catch { throw new Error('WhatsApp delivery failed') }
}

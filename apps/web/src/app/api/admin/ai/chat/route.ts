import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { generateText } from '@/lib/llm'
import { createLogger } from '@/lib/logger'
import { recordAudit } from '@/lib/audit'

const log = createLogger('admin/ai')

export const dynamic = 'force-dynamic'

const SYSTEM_PROMPT = `Eres el asistente de administración de Coffee Bunn Café (CBC), una cafetería de café de especialidad mexicano que vende regalos corporativos B2B y paquetes de café.

Asistes al equipo de administración. Responde en español de forma concisa, práctica y accionable. Ayudas con: redacción de respuestas a clientes, textos de productos/catálogo, ideas de regalos corporativos, análisis de ventas, estrategia, y cualquier tarea de administración del negocio.

Cuando no sepas algo con certeza, dilo con honestidad en vez de inventar datos. No alucines precios ni métricas.`

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(8000),
      }),
    )
    .min(1)
    .max(40),
})

function requireAdmin(session: { user: { role?: string } } | null) {
  if (!session) return { error: 'Unauthorized' as const, status: 401 as const }
  if (session.user.role?.toLowerCase() !== 'admin') return { error: 'Forbidden' as const, status: 403 as const }
  return null
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const guard = requireAdmin(session)
  if (guard) return NextResponse.json({ error: guard.error }, { status: guard.status })

  try {
    const body = await req.json()
    const { messages } = bodySchema.parse(body)

    const conversation = messages
      .map((m) => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.content}`)
      .join('\n\n')

    const reply = await generateText({
      system: SYSTEM_PROMPT,
      prompt: conversation,
      maxTokens: 1024,
    })

    await recordAudit(
      { actorId: session!.user.id, actorEmail: session!.user.email },
      {
        action: 'create',
        entity: 'ai-chat',
        metadata: { prompt: messages[messages.length - 1].content },
      },
    )

    return NextResponse.json({ reply })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Solicitud inválida', details: error.errors }, { status: 400 })
    }
    const message = error instanceof Error ? error.message : 'Error desconocido'
    log.error({ path: '/api/admin/ai/chat', method: 'POST', error }, 'Failed to run AI chat')
    return NextResponse.json({ error: `No se pudo generar la respuesta: ${message}`, code: 'AI_ERROR' }, { status: 500 })
  }
}

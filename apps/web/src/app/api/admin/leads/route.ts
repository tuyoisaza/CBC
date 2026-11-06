import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { requireAdminAccess } from '@/lib/superadmin'
import { db } from '@/lib/db'

const schema = z.object({
  companyName: z.string().trim().min(2).max(100),
  contactName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(120),
  whatsapp: z.string().trim().regex(/^\+?[0-9]{8,15}$/, 'Usa de 8 a 15 dígitos, con código de país y sin espacios.'),
  boxType: z.enum(['prensa', 'moka', 'mix']),
  quantity: z.number().int().min(1).max(100000),
  occasion: z.enum(['fin-de-ano', 'dia-del-amor', 'dia-del-trabajo', 'onboarding', 'cliente', 'otro']),
  message: z.string().trim().max(1000).optional(),
})

export async function POST(req: NextRequest) {
  const denied = await requireAdminAccess(await getServerSession(authOptions))
  if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status })
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Revisa los datos del formulario.', details: parsed.error.flatten() }, { status: 400 })
  const { companyName, contactName, email, whatsapp, ...details } = parsed.data
  try {
    // One atomic creation; an existing customer keeps their saved contact/fiscal data.
    const lead = await db.lead.create({
      data: {
        ...details,
        source: 'direct',
        status: 'new',
        customer: {
          connectOrCreate: {
            where: { whatsapp },
            create: { companyName, contactName, email, whatsapp, tags: [] },
          },
        },
      },
      select: { id: true },
    })
    return NextResponse.json(lead, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'No se pudo guardar el lead. Intenta de nuevo.' }, { status: 500 })
  }
}

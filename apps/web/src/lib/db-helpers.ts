import { db } from '@/lib/db'
import { Prisma } from '@cbc/db'

function isUniqueViolation(e: unknown): e is Prisma.PrismaClientKnownRequestError {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002'
}

/**
 * Find an existing Customer by whatsapp (unique) or email, otherwise create one.
 *
 * The storefront lets the same person buy more than once, so a blind
 * `db.customer.create()` blows up on the `whatsapp @unique` index. This does a
 * search-before-create and also handles the race where two concurrent requests
 * for the same whatsapp both miss the lookup.
 */
export async function getOrCreateCustomer(input: {
  companyName: string
  contactName: string
  email?: string | null
  whatsapp?: string | null
}) {
  const whatsapp = input.whatsapp || null
  const email = input.email || null

  const existing =
    (whatsapp && (await db.customer.findUnique({ where: { whatsapp } }))) ||
    (email && (await db.customer.findFirst({ where: { email } }))) ||
    null

  if (existing) {
    // Backfill blank contact fields without clobbering existing data.
    const patch: Prisma.CustomerUpdateInput = {}
    if (!existing.email && email) patch.email = email
    if (!existing.whatsapp && whatsapp) patch.whatsapp = whatsapp
    if (!existing.contactName && input.contactName) patch.contactName = input.contactName
    if (Object.keys(patch).length === 0) return existing
    return db.customer.update({ where: { id: existing.id }, data: patch })
  }

  try {
    return await db.customer.create({
      data: {
        companyName: input.companyName,
        contactName: input.contactName,
        email,
        whatsapp,
      },
    })
  } catch (e) {
    // Lost a race: another request created this customer between our lookup and
    // our insert. Re-fetch by whatsapp and return that row.
    if (isUniqueViolation(e) && whatsapp) {
      const raced = await db.customer.findUnique({ where: { whatsapp } })
      if (raced) return raced
    }
    throw e
  }
}

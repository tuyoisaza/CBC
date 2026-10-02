/* Additive, idempotent upgrade for deployments using prisma db push.
 * Prisma conservatively warns about a new UNIQUE column even when every
 * legacy value is NULL. Apply just this explicit migration transactionally;
 * never use --accept-data-loss or overwrite existing catalog data.
 */
const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()

async function main() {
  const [table] = await db.$queryRaw`SELECT to_regclass('"Extra"')::text AS name`
  if (!table?.name) {
    console.log('Extra catalog: fresh database; prisma db push will create the schema.')
    return
  }
  await db.$transaction(async tx => {
    await tx.$executeRawUnsafe(`ALTER TABLE "Extra"
      ADD COLUMN IF NOT EXISTS "slug" TEXT,
      ADD COLUMN IF NOT EXISTS "shortDescription" TEXT,
      ADD COLUMN IF NOT EXISTS "images" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      ADD COLUMN IF NOT EXISTS "catalogVisible" BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS "sellableStandalone" BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS "unitLabel" TEXT NOT NULL DEFAULT 'pieza',
      ADD COLUMN IF NOT EXISTS "unitsPerPack" INTEGER NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS "minQty" INTEGER NOT NULL DEFAULT 1`)
    await tx.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "Extra_slug_key" ON "Extra"("slug")')
  })
  console.log('Extra catalog: additive schema ready; existing records preserved.')
}
main().catch(error => {
  console.error('Extra catalog upgrade failed; deployment stopped without ignoring data-loss warnings.', error)
  process.exitCode = 1
}).finally(() => db.$disconnect())

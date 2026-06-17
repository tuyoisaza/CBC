import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

interface VideoSeed {
  url: string
  title?: string
}

interface ProductSeed {
  slug: string
  name: string
  subtitle: string
  description: string
  price: number
  features: string[]
  images: string[]
  videos: VideoSeed[]
  active: boolean
  sortOrder: number
  methodId?: string
}

async function main() {
  // Seed Methods
  const methodData = [
    { name: 'Prensa Francesa', unitPrice: 799, sortOrder: 0 },
    { name: 'Moka Italiana', unitPrice: 849, sortOrder: 1 },
  ]
  const methods: Record<string, string> = {}
  for (const m of methodData) {
    const existing = await prisma.method.findFirst({ where: { name: m.name } })
    if (existing) {
      await prisma.method.update({ where: { id: existing.id }, data: m })
      methods[m.name] = existing.id
    } else {
      const created = await prisma.method.create({ data: m })
      methods[m.name] = created.id
    }
  }

  // Seed Extras
  const extraData = [
    { name: 'Tapografía', unitPrice: 50, sortOrder: 0 },
    { name: 'Personalización de caja', unitPrice: 120, sortOrder: 1 },
    { name: 'Tarjeta de mensaje', unitPrice: 35, sortOrder: 2 },
    { name: 'QR + curso personalizado', unitPrice: 200, sortOrder: 3 },
  ]
  for (const e of extraData) {
    const existing = await prisma.extra.findFirst({ where: { name: e.name } })
    if (existing) {
      await prisma.extra.update({ where: { id: existing.id }, data: e })
    } else {
      await prisma.extra.create({ data: e })
    }
  }

  // Seed Shipping Zones
  const zoneData = [
    { name: 'CDMX / Área Metropolitana', baseFee: 0, feePerUnit: 15, sortOrder: 0 },
    { name: 'Interior del país', baseFee: 150, feePerUnit: 25, sortOrder: 1 },
    { name: 'Recolección (sin envío)', baseFee: 0, feePerUnit: 0, sortOrder: 2 },
  ]
  for (const z of zoneData) {
    const existing = await prisma.shippingZone.findFirst({ where: { name: z.name } })
    if (existing) {
      await prisma.shippingZone.update({ where: { id: existing.id }, data: z })
    } else {
      await prisma.shippingZone.create({ data: z })
    }
  }

  // Seed Volume Discounts
  const discountData = [
    { minQty: 10, maxQty: 20, discountPct: 5 },
    { minQty: 21, maxQty: 50, discountPct: 10 },
    { minQty: 51, maxQty: null, discountPct: 15 },
  ]
  for (const d of discountData) {
    const existing = await prisma.volumeDiscount.findFirst({
      where: { minQty: d.minQty, maxQty: d.maxQty ?? null, discountPct: d.discountPct },
    })
    if (!existing) {
      await prisma.volumeDiscount.create({ data: d as any })
    }
  }

  // Seed Settings
  const settingsData: { key: string; value: string }[] = [
    { key: 'MIN_PRODUCTION_DAYS', value: '15' },
    { key: 'RUSH_DAYS_THRESHOLD', value: '8' },
    { key: 'RUSH_FEE_PCT', value: '40' },
    { key: 'ADVANCE_PCT', value: '50' },
    { key: 'MIN_QTY_PER_METHOD', value: '10' },
    { key: 'IVA_PCT', value: '16' },
  ]
  for (const s of settingsData) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    })
  }

  // Seed Products (cajas predefinidas)
  const products: ProductSeed[] = [
    {
      slug: 'box-prensa-francesa',
      name: 'Box Prensa Francesa',
      subtitle: 'French press 350cc',
      description: 'Caja de regalo que incluye una prensa francesa de 350cc y 250g de cafe de especialidad mexicano seleccionado por Lorena Luna.',
      price: 799,
      features: ['250g cafe de especialidad (micro-lote)', 'Prensa francesa 350cc', 'Tarjeta de curacion con historia y guia de preparacion', 'Branding de tu empresa en la caja'],
      images: ['https://placehold.co/800x450/1e1e1e/cbc9a0?text=Box+Prensa+Francesa'],
      videos: [],
      active: true,
      sortOrder: 0,
      methodId: methods['Prensa Francesa'],
    },
    {
      slug: 'box-moka',
      name: 'Box Moka',
      subtitle: 'Mini moka italiana',
      description: 'Caja de regalo que incluye una mini moka italiana y 250g de cafe de especialidad mexicano seleccionado por Lorena Luna.',
      price: 799,
      features: ['250g cafe de especialidad (micro-lote)', 'Mini moka italiana', 'Tarjeta de curacion con historia y guia de preparacion', 'Branding de tu empresa en la caja'],
      images: ['https://placehold.co/800x450/1e1e1e/cbc9a0?text=Box+Moka'],
      videos: [],
      active: true,
      sortOrder: 1,
      methodId: methods['Moka Italiana'],
    },
  ]

  for (const p of products) {
    const existing = await prisma.product.findUnique({ where: { slug: p.slug } })
    if (!existing) {
      await prisma.product.create({ data: p as unknown as Prisma.ProductCreateInput })
    }
  }

  console.log('✓ Seed complete')
}

async function run() {
  try {
    await main()
  } catch (e) {
    console.error('Seed failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  }
  await prisma.$disconnect()
  process.exit(0)
}

run()

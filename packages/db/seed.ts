import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface ProductSeed {
  slug: string
  name: string
  subtitle: string
  description: string
  price: number
  features: string[]
  images: string[]
  videos: any[]
  active: boolean
  sortOrder: number
}

const products: ProductSeed[] = [
  {
    slug: 'box-prensa-francesa',
    name: 'Box Prensa Francesa',
    subtitle: 'French press 350cc',
    description:
      'Caja de regalo que incluye una prensa francesa de 350cc y 250g de café de especialidad mexicano seleccionado por Lorena Luna. Ideal para oficinas, home office y amantes del cuerpo completo.',
    price: 799,
    features: [
      '250g café de especialidad (micro-lote)',
      'Prensa francesa 350cc',
      'Tarjeta de curación con historia y guía de preparación',
      'Branding de tu empresa en la caja',
    ],
    images: [
      'https://placehold.co/800x450/1e1e1e/cbc9a0?text=Box+Prensa+Francesa',
      'https://placehold.co/800x450/1e1e1e/cbc9a0?text=Prensa+Francesa+2',
      'https://placehold.co/800x450/1e1e1e/cbc9a0?text=Prensa+Francesa+3',
    ],
    videos: [],
    active: true,
    sortOrder: 0,
  },
  {
    slug: 'box-moka',
    name: 'Box Moka',
    subtitle: 'Mini moka italiana',
    description:
      'Caja de regalo que incluye una mini moka italiana y 250g de café de especialidad mexicano seleccionado por Lorena Luna. Perfecta para amantes del espresso, cocina y hogar.',
    price: 799,
    features: [
      '250g café de especialidad (micro-lote)',
      'Mini moka italiana',
      'Tarjeta de curación con historia y guía de preparación',
      'Branding de tu empresa en la caja',
    ],
    images: [
      'https://placehold.co/800x450/1e1e1e/cbc9a0?text=Box+Moka',
      'https://placehold.co/800x450/1e1e1e/cbc9a0?text=Moka+Italiana+2',
      'https://placehold.co/800x450/1e1e1e/cbc9a0?text=Moka+Italiana+3',
    ],
    videos: [],
    active: true,
    sortOrder: 1,
  },
]

async function main() {
  for (const p of products) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: p,
      create: p,
    })
  }

  const count = await prisma.product.count()
  console.log(`✓ ${count} products synced`)
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

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const count = await prisma.product.count()
  if (count > 0) {
    console.log(`Products table already has ${count} products. Skipping seed.`)
    return
  }

  await prisma.product.createMany({
    data: [
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
        active: true,
        sortOrder: 1,
      },
    ],
  })

  console.log('✓ Products seeded successfully')
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

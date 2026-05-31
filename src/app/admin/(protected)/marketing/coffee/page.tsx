import { db } from '@/lib/db'
import { CoffeeManager } from '@/components/admin/marketing/CoffeeManager'

export const metadata = { title: 'Café actual' }

export default async function CoffeePage() {
  const coffees = await db.coffee.findMany({
    orderBy: [{ active: 'desc' }, { createdAt: 'desc' }],
  })

  const active = coffees.find((c) => c.active)

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Café actual</h1>
        <p className="text-sm text-muted-foreground mt-1">
          El café que va en las cajas. Actualízalo cuando cambies el micro-lote.
          También puedes actualizar enviando un WhatsApp al número de CBC.
        </p>
      </div>

      <CoffeeManager coffees={coffees as any} activeCoffeeId={active?.id} />
    </div>
  )
}

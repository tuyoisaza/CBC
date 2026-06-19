import { EntityList, Field } from '@/components/admin/sales/EntityList'

export const metadata = { title: 'Descuentos por volumen — CBC Admin' }

const fields: Field[] = [
  { key: 'minQty', label: 'Cant. mínima', type: 'number', required: true },
  { key: 'maxQty', label: 'Cant. máxima', type: 'number', format: (v) => v ?? '∞' },
  { key: 'discountPct', label: 'Descuento %', type: 'number', format: (v) => `${v}%` },
]

export default function VolumeDiscountsPage() {
  return (
    <EntityList
      title="Descuentos por volumen"
      description="Descuentos aplicados automáticamente según la cantidad de cajas"
      apiPath="/api/admin/volume-discounts"
      emptyMessage="No hay descuentos por volumen aún"
      fields={fields}
    />
  )
}

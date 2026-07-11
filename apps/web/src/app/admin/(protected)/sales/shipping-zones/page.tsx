import { EntityList } from '@/components/admin/sales/EntityList'

export const metadata = { title: 'Zonas de envío — CBC Admin' }

export default function ShippingZonesPage() {
  return (
    <EntityList
      title="Zonas de envío"
      description="Zonas con tarifas de envío base y por unidad"
      apiPath="/api/admin/shipping-zones"
      emptyMessage="No hay zonas de envío aún"
      fields={[
        { key: 'name', label: 'Nombre', type: 'text', required: true },
        { key: 'baseFee', label: 'Tarifa base', type: 'number', format: 'currency' },
        { key: 'feePerUnit', label: 'Por unidad', type: 'number', format: 'currency' },
        { key: 'active', label: 'Activo', type: 'boolean' },
        { key: 'sortOrder', label: 'Orden', type: 'number' },
      ]}
    />
  )
}

import { EntityList } from '@/components/admin/sales/EntityList'

export const metadata = { title: 'Extras — CBC Admin' }

export default function ExtrasPage() {
  return (
    <EntityList
      title="Extras"
      description="Productos adicionales que se pueden agregar a una caja"
      apiPath="/api/admin/extras"
      emptyMessage="No hay extras aún"
      fields={[
        { key: 'name', label: 'Nombre', type: 'text', required: true },
        { key: 'description', label: 'Descripción', type: 'text' },
        { key: 'unitPrice', label: 'Precio unitario', type: 'number', format: 'currency' },
        { key: 'active', label: 'Activo', type: 'boolean' },
        { key: 'sortOrder', label: 'Orden', type: 'number' },
      ]}
    />
  )
}

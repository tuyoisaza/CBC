import { EntityList } from '@/components/admin/sales/EntityList'

export const metadata = { title: 'Métodos — CBC Admin' }

export default function MethodsPage() {
  return (
    <EntityList
      title="Métodos"
      description="Métodos de producción disponibles (prensa francesa, moka, etc.)"
      apiPath="/api/admin/methods"
      emptyMessage="No hay métodos de producción aún"
      fields={[
        { key: 'name', label: 'Nombre', type: 'text', required: true },
        { key: 'description', label: 'Descripción', type: 'text' },
        { key: 'unitPrice', label: 'Precio unitario', type: 'number', format: (v) => `$${v.toLocaleString('es-MX')}` },
        { key: 'active', label: 'Activo', type: 'boolean' },
        { key: 'sortOrder', label: 'Orden', type: 'number' },
      ]}
    />
  )
}

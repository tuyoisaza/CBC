import { EntityList } from '@/components/admin/sales/EntityList'

export const metadata = { title: 'Extras — CBC Admin' }

export default function ExtrasPage() {
  return (
    <EntityList
      title="Extras"
      description="Ingresa el costo de cada extra. El cotizador agrega el margen de mayoreo de Sitio y precios y después el IVA."
      apiPath="/api/admin/extras"
      uploadFolder="extras"
      emptyMessage="No hay extras aún"
      fields={[
        { key: 'name', label: 'Nombre', type: 'text', required: true },
        { key: 'description', label: 'Descripción', type: 'text' },
        { key: 'imageUrl', label: 'Imagen', type: 'image' },
        { key: 'unitPrice', label: 'Costo unitario (sin IVA)', type: 'number', format: 'currency', allowFree: true },
        { key: 'active', label: 'Activo', type: 'boolean' },
        { key: 'sortOrder', label: 'Orden', type: 'number' },
      ]}
    />
  )
}

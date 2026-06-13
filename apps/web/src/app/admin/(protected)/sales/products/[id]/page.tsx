import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import { ProductForm } from '@/components/admin/sales/ProductForm'

export const metadata = { title: 'Editar producto — CBC Admin' }

export default async function EditProductPage({
  params,
}: {
  params: { id: string }
}) {
  const product = await db.product.findUnique({ where: { id: params.id } })
  if (!product) notFound()

  return <ProductForm product={product} />
}

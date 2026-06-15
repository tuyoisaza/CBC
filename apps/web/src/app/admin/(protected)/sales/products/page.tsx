import { db } from '@/lib/db'
import Link from 'next/link'
import { Plus, Pencil, EyeOff } from 'lucide-react'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { DeleteProductForm } from '@/components/admin/sales/DeleteProductForm'

export const metadata = { title: 'Productos — CBC Admin' }

async function getProducts() {
  return db.product.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  })
}

async function deleteProduct(formData: FormData) {
  'use server'
  const id = formData.get('id') as string
  if (!id) return
  await db.product.delete({ where: { id } })
  revalidatePath('/admin/sales/products')
  redirect('/admin/sales/products')
}

export default async function ProductsPage() {
  const products = await getProducts()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Productos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {products.length} producto{products.length !== 1 ? 's' : ''} en catálogo
          </p>
        </div>
        <Link
          href="/admin/sales/products/new"
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> Nuevo producto
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-5 py-3 font-semibold text-foreground">Producto</th>
              <th className="text-left px-5 py-3 font-semibold text-foreground hidden sm:table-cell">Precio</th>
              <th className="text-left px-5 py-3 font-semibold text-foreground hidden md:table-cell">Slug</th>
              <th className="text-left px-5 py-3 font-semibold text-foreground hidden lg:table-cell">Características</th>
              <th className="text-right px-5 py-3 font-semibold text-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    {product.images[0] ? (
                      <img src={product.images[0]} alt={product.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-muted shrink-0 flex items-center justify-center text-muted-foreground text-xs">
                        ?
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{product.name}</span>
                        {!product.active && (
                          <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                            <EyeOff className="h-3 w-3" /> oculto
                          </span>
                        )}
                      </div>
                      {product.subtitle && (
                        <p className="text-xs text-muted-foreground mt-0.5">{product.subtitle}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 hidden sm:table-cell">
                  <span className="font-medium text-foreground">${product.price.toLocaleString('es-MX')}</span>
                </td>
                <td className="px-5 py-4 hidden md:table-cell">
                  <code className="text-xs text-muted-foreground">{product.slug}</code>
                </td>
                <td className="px-5 py-4 hidden lg:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {(product.features as string[]).slice(0, 2).map((f, i) => (
                      <span key={i} className="rounded-full bg-muted text-muted-foreground text-xs px-2 py-0.5">
                        {f.length > 25 ? f.slice(0, 25) + '…' : f}
                      </span>
                    ))}
                    {(product.features as string[]).length > 2 && (
                      <span className="text-xs text-muted-foreground">+{product.features.length - 2}</span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/admin/sales/products/${product.id}`}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                    >
                      <Pencil className="h-3 w-3" /> Editar
                    </Link>
                    <DeleteProductForm productId={product.id} action={deleteProduct} />
                  </div>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">
                  <p className="text-sm">No hay productos aún</p>
                  <Link href="/admin/sales/products/new" className="text-primary hover:underline text-sm mt-1 inline-block">
                    Crear primer producto
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

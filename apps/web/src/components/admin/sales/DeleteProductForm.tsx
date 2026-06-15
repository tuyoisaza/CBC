'use client'

import { Trash2 } from 'lucide-react'

export function DeleteProductForm({
  productId,
  action,
}: {
  productId: string
  action: (formData: FormData) => Promise<void>
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm('¿Eliminar este producto?')) e.preventDefault()
      }}
    >
      <input type="hidden" name="id" value={productId} />
      <button
        type="submit"
        className="inline-flex items-center gap-1 rounded-md border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </form>
  )
}

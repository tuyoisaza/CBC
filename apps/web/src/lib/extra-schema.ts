import { z } from 'zod'

const image = z.string().max(2048).refine(value => {
  if (value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')) return true
  try { return new URL(value).protocol === 'https:' } catch { return false }
}, 'Usa una imagen subida al sitio o una URL HTTPS.')

export const extraWriteSchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: z.string().trim().max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Usa letras minúsculas, números y guiones.').nullable().optional(),
  shortDescription: z.string().trim().max(320).nullable().optional(),
  description: z.string().max(20000).nullable().optional(),
  images: z.array(image).max(12).optional(),
  imageUrl: image.nullable().optional(),
  unitPrice: z.number().finite().nonnegative(),
  catalogVisible: z.boolean().optional(),
  sellableStandalone: z.boolean().optional(),
  allowedForRush: z.boolean().optional(),
  unitLabel: z.string().trim().min(1).max(80).optional(),
  unitsPerPack: z.number().int().min(1).max(100000).optional(),
  minQty: z.number().int().min(1).max(100000).optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

/** Keep the legacy cover used by quote emails in sync. No destructive image migration. */
export function extraWriteData<T extends { images?: string[]; imageUrl?: string | null }>(data: T): T {
  if (data.images === undefined) return data
  const images = [...new Set(data.images)]
  return { ...data, images, imageUrl: images[0] ?? null }
}

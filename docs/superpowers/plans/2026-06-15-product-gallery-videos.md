# Product Gallery & Videos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-image gallery and YouTube video embedding to products

**Architecture:** Replace single `imageUrl` field on `Product` with `images: String[]` and `videos: Json` arrays. Update admin form for multi-upload + video links. Create public product detail page with unified media gallery. Data migration copies existing `imageUrl` into `images[0]`.

**Tech Stack:** Prisma (Postgres), Next.js 14 Server Components, Cloudflare R2, YouTube embeds

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `packages/db/schema.prisma` | Modify | Replace `imageUrl` with `images` + `videos` |
| `packages/db/migrations/20250615000001_product_gallery_videos/migration.sql` | Create | Migration SQL with data copy |
| `packages/db/seed.ts` | Modify | Use `images` + `videos` instead of `imageUrl` |
| `apps/web/src/app/api/upload/route.ts` | Modify | Add `folder=product` param → `productImageKey` |
| `apps/web/src/app/api/admin/products/route.ts` | Modify | Update Zod schema for `images` + `videos` |
| `apps/web/src/components/admin/sales/ProductForm.tsx` | Modify | Multi-image upload + video link inputs |
| `apps/web/src/app/page.tsx` | Modify | Show `images[0]`, "Ver detalle" link |
| `apps/web/src/app/productos/[slug]/page.tsx` | Create | New product detail page with gallery |

---

### Task 1: Schema + Migration

**Files:**
- Modify: `packages/db/schema.prisma`
- Create: `packages/db/migrations/20250615000001_product_gallery_videos/migration.sql`

- [ ] **Step 1: Modify Product model in schema.prisma**

Replace the `imageUrl` field with `images` + `videos`:

```
imageUrl    String?         →  images  String[]  @default([])
                                  videos  Json     @default("[]")
```

The `Product` model in `packages/db/schema.prisma` (lines 249-262) changes from:
```prisma
model Product {
  id          String   @id @default(cuid())
  slug        String   @unique
  name        String
  subtitle    String?
  description String
  price       Float
  imageUrl    String?
  features    String[]
  active      Boolean  @default(true)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

To:
```prisma
model Product {
  id          String   @id @default(cuid())
  slug        String   @unique
  name        String
  subtitle    String?
  description String
  price       Float
  images      String[] @default([])
  videos      Json     @default("[]")
  features    String[]
  active      Boolean  @default(true)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

- [ ] **Step 2: Create migration SQL**

Create folder `packages/db/migrations/20250615000001_product_gallery_videos/` with `migration.sql`:

```sql
-- Add new columns
ALTER TABLE "Product" ADD COLUMN "images" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "Product" ADD COLUMN "videos" JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Migrate existing data: copy imageUrl → images[0] for all products with an image
UPDATE "Product" SET "images" = ARRAY["imageUrl"] WHERE "imageUrl" IS NOT NULL;

-- Drop old column
ALTER TABLE "Product" DROP COLUMN "imageUrl";
```

- [ ] **Step 3: Commit**

```bash
git add packages/db/schema.prisma packages/db/migrations/20250615000001_product_gallery_videos/migration.sql
git commit -m "v1.2.0 feat: add images and videos fields to Product schema"
```

---

### Task 2: Seed Update

**Files:**
- Modify: `packages/db/seed.ts`

- [ ] **Step 1: Update seed to use new fields**

In `packages/db/seed.ts`, replace all `imageUrl` references with `images: []` and remove `imageUrl` from the create/upsert data:

```typescript
// Before:
imageUrl: 'https://placehold.co/800x450/1e1e1e/cbc9a0?text=Box+Prensa+Francesa',

// After:
images: [
  'https://placehold.co/800x450/1e1e1e/cbc9a0?text=Box+Prensa+Francesa',
  'https://placehold.co/800x450/1e1e1e/cbc9a0?text=French+Press+350cc',
  'https://placehold.co/800x450/1e1e1e/cbc9a0?text=250g+Cafe',
],
videos: [],
```

Add 2-3 placeholder images per product for visual testing. Keep the existing product names, slugs, prices, etc.

- [ ] **Step 2: Commit**

```bash
git add packages/db/seed.ts
git commit -m "v1.2.0 seed: update seed to use images array and videos"
```

---

### Task 3: Upload + Products API

**Files:**
- Modify: `apps/web/src/app/api/upload/route.ts`
- Modify: `apps/web/src/app/api/admin/products/route.ts`

- [ ] **Step 1: Add `folder` param to upload endpoint**

In `apps/web/src/app/api/upload/route.ts`, add a `folder` search param:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getUploadUrl, logoKey, productImageKey } from '@/lib/r2'
import { z } from 'zod'
import crypto from 'crypto'

const ALLOWED_TYPES = ['image/png', 'image/svg+xml', 'image/jpeg', 'image/jpg']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export async function GET(req: NextRequest) {
  const url      = new URL(req.url)
  const filename = url.searchParams.get('filename') || 'logo.png'
  const type     = url.searchParams.get('type') || 'image/png'
  const folder   = url.searchParams.get('folder') || 'logo'

  if (!ALLOWED_TYPES.includes(type)) {
    return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })
  }

  const id  = crypto.randomUUID()
  const key = folder === 'product' ? productImageKey(id, filename) : logoKey(id, filename)
  const { uploadUrl, publicUrl } = await getUploadUrl(key, type)

  return NextResponse.json({ uploadUrl, publicUrl })
}
```

- [ ] **Step 2: Update Products API Zod schema**

In `apps/web/src/app/api/admin/products/route.ts`, update the `productSchema`:

```typescript
const productSchema = z.object({
  slug: z.string().min(2),
  name: z.string().min(1),
  subtitle: z.string().optional(),
  description: z.string().min(1),
  price: z.number().positive(),
  images: z.array(z.string()).optional().default([]),
  videos: z.array(z.object({
    url: z.string(),
    title: z.string().optional(),
  })).optional().default([]),
  features: z.array(z.string()),
  active: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
})
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/api/upload/route.ts apps/web/src/app/api/admin/products/route.ts
git commit -m "v1.2.0 feat: add folder param to upload, update products API schema"
```

---

### Task 4: Admin ProductForm — Multi-Image + Videos

**Files:**
- Modify: `apps/web/src/components/admin/sales/ProductForm.tsx`

- [ ] **Step 1: Rewrite the image section for multi-upload**

Replace the single `imageUrl` state with `images: string[]` and `videos: { url: string; title?: string }[]`. Update the `ProductFormProps` interface:

```typescript
interface ProductFormProps {
  product?: {
    id: string
    slug: string
    name: string
    subtitle: string | null
    description: string
    price: number
    images: string[]
    videos: { url: string; title?: string }[]
    features: string[]
    active: boolean
    sortOrder: number
  }
}
```

State changes:
- Remove `imageUrl`, `uploading`
- Add `images: string[]` (default from product or `[]`)
- Add `videos: { url: string; title?: string }[]` (default from product or `[]`)
- Add `uploadingImages: boolean` (for batch upload progress)

- [ ] **Step 2: Add multi-image upload handler**

Replace `handleImageUpload` with:

```typescript
async function handleImagesUpload(e: React.ChangeEvent<HTMLInputElement>) {
  const files = e.target.files
  if (!files || files.length === 0) return

  setUploadingImages(true)
  try {
    const results = await Promise.all(
      Array.from(files).map(async (file) => {
        const params = new URLSearchParams({
          filename: file.name,
          type: file.type,
          folder: 'product',
        })
        const res = await fetch(`/api/upload?${params}`)
        const { uploadUrl, publicUrl } = await res.json()

        await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type },
        })

        return publicUrl
      })
    )
    setImages((prev) => [...prev, ...results])
  } catch {
    setError('Error al subir imágenes')
  } finally {
    setUploadingImages(false)
  }
}
```

- [ ] **Step 3: Add video management UI**

Add state and handlers for videos:

```typescript
const [newVideoUrl, setNewVideoUrl] = useState('')
const [newVideoTitle, setNewVideoTitle] = useState('')

function addVideo() {
  if (!newVideoUrl.trim()) return
  setVideos([...videos, { url: newVideoUrl.trim(), title: newVideoTitle.trim() || undefined }])
  setNewVideoUrl('')
  setNewVideoTitle('')
}

function removeVideo(i: number) {
  setVideos(videos.filter((_, idx) => idx !== i))
}
```

- [ ] **Step 4: Update the JSX — images section**

In the import line at the top, add `X`, `Upload`, and `Plus` are already imported. No change needed for the images section (uses existing imports).

Replace the single image input with a multi-image gallery section:

```tsx
<div>
  <label className="block text-sm font-medium text-foreground mb-1.5">Imágenes</label>
  {images.length > 0 && (
    <div className="mb-3 flex flex-wrap gap-3">
      {images.map((url, i) => (
        <div key={i} className="relative rounded-lg overflow-hidden border border-border w-32 h-24 group">
          <img src={url} alt="" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => setImages(images.filter((_, idx) => idx !== i))}
            className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  )}
  <label className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
    <Upload className="h-4 w-4" />
    {uploadingImages ? 'Subiendo...' : 'Subir imágenes'}
    <input
      type="file"
      accept="image/png,image/jpeg,image/jpg,image/svg+xml"
      multiple
      onChange={handleImagesUpload}
      className="hidden"
      disabled={uploadingImages}
    />
  </label>
</div>
```

- [ ] **Step 5: Update the JSX — videos section**

Add video management section after the images section:

```tsx
<div>
  <label className="block text-sm font-medium text-foreground mb-1.5">Videos (YouTube)</label>
  {videos.length > 0 && (
    <div className="mb-3 space-y-2">
      {videos.map((v, i) => (
        <div key={i} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
          <span className="flex-1 truncate text-foreground">{v.url}</span>
          {v.title && <span className="text-muted-foreground text-xs">— {v.title}</span>}
          <button type="button" onClick={() => removeVideo(i)}
            className="text-muted-foreground hover:text-destructive shrink-0">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  )}
  <div className="flex gap-2">
    <input value={newVideoUrl} onChange={(e) => setNewVideoUrl(e.target.value)}
      className="input-field flex-1" placeholder="https://youtube.com/watch?v=..." />
    <input value={newVideoTitle} onChange={(e) => setNewVideoTitle(e.target.value)}
      className="input-field w-40" placeholder="Título (opcional)" />
    <button type="button" onClick={addVideo}
      className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors">
      <Plus className="h-3.5 w-3.5" /> Agregar
    </button>
  </div>
</div>
```

- [ ] **Step 6: Update handleSubmit**

In `handleSubmit`, send `images` and `videos` instead of `imageUrl`:

```typescript
const body = {
  slug,
  name,
  subtitle: subtitle || undefined,
  description,
  price,
  images,
  videos: videos.length > 0 ? videos : undefined,
  features: features.filter((f) => f.trim()),
  active,
  sortOrder,
}
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/admin/sales/ProductForm.tsx
git commit -m "v1.2.0 feat: add multi-image upload and video links to ProductForm"
```

---

### Task 5: Home Page Update

**Files:**
- Modify: `apps/web/src/app/page.tsx`

- [ ] **Step 1: Show `images[0]` with count indicator and "Ver detalle" link**

In the product card section of `apps/web/src/app/page.tsx`, change the image block:

```tsx
{product.images.length > 0 ? (
  <div className="aspect-[16/9] overflow-hidden relative">
    <img
      src={product.images[0]}
      alt={product.name}
      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
    />
    {(product.images.length > 1 || (product.videos as any[]).length > 0) && (
      <span className="absolute top-2 right-2 rounded-full bg-black/60 text-white text-xs px-2 py-0.5">
        +{(product.images.length - 1) + (product.videos as any[]).length}
      </span>
    )}
  </div>
) : (
  <div className="aspect-[16/9] bg-muted flex items-center justify-center text-muted-foreground text-sm">
    Sin imagen
  </div>
)}
```

- [ ] **Step 2: Add "Ver detalle" link in the card**

After the price and CTA section, or integrate it. Add a link below the features list:

```tsx
<div className="mt-4">
  <Link
    href={`/productos/${product.slug}`}
    className="text-sm text-cbc-yellow hover:underline"
  >
    Ver detalle completo →
  </Link>
</div>
```

Add `import Link from 'next/link'` at the top if not already imported (it's already imported in the current file).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/page.tsx
git commit -m "v1.2.0 feat: update home page to show images[0] with detail link"
```

---

### Task 6: ProductGallery Client Component

**Files:**
- Create: `apps/web/src/components/productos/ProductGallery.tsx`

- [ ] **Step 1: Create the client component**

`apps/web/src/components/productos/ProductGallery.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { X, Play } from 'lucide-react'

interface MediaItem {
  type: 'image' | 'video'
  url: string
  thumbnail: string
  title: string
  videoId?: string | null
}

export function ProductGallery({ media }: { media: MediaItem[] }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [showVideo, setShowVideo] = useState(false)
  const active = media[activeIndex]

  if (media.length === 0) {
    return (
      <div className="aspect-[16/10] rounded-2xl bg-[#1e1e1e] flex items-center justify-center text-gray-500">
        Sin imágenes
      </div>
    )
  }

  return (
    <>
      <div
        className="aspect-[16/10] rounded-2xl overflow-hidden bg-[#1e1e1e] cursor-pointer relative group"
        onClick={() => {
          if (active.type === 'video' && active.videoId) setShowVideo(true)
        }}
      >
        <img
          src={active.thumbnail}
          alt={active.title}
          className="w-full h-full object-cover"
        />
        {active.type === 'video' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
            <div className="h-16 w-16 rounded-full bg-cbc-yellow flex items-center justify-center">
              <Play className="h-7 w-7 text-black ml-1" />
            </div>
          </div>
        )}
      </div>

      {/* Thumbnails */}
      <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
        {media.map((item, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className={`relative w-20 h-16 shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${
              i === activeIndex ? 'border-cbc-yellow' : 'border-transparent hover:border-cbc-yellow/50'
            }`}
          >
            <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
            {item.type === 'video' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Play className="h-5 w-5 text-white" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Video overlay */}
      {showVideo && active.type === 'video' && active.videoId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowVideo(false)}
        >
          <div className="relative w-full max-w-4xl aspect-video">
            <button
              onClick={() => setShowVideo(false)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
            >
              <X className="h-6 w-6" />
            </button>
            <iframe
              src={`https://www.youtube.com/embed/${active.videoId}?autoplay=1`}
              className="w-full h-full rounded-xl"
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/productos/ProductGallery.tsx
git commit -m "v1.2.0 feat: create ProductGallery client component"
```

---

### Task 7: Product Detail Page

**Files:**
- Create: `apps/web/src/app/productos/[slug]/page.tsx`

- [ ] **Step 1: Create the page**

Create the folder `apps/web/src/app/productos/[slug]/` and the page file:

```tsx
import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ProductGallery } from '@/components/productos/ProductGallery'

export const dynamic = 'force-dynamic'

const WA_URL = 'https://wa.me/5215572293512?text=Hola%2C%20quiero%20cotizar%20cajas%20de%20regalo%20CBC'

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return match?.[1] || null
}

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  const product = await db.product.findUnique({
    where: { slug: params.slug },
  })
  if (!product) notFound()

  const images = product.images as string[]
  const videos = (product.videos as { url: string; title?: string }[]) || []

  const allMedia = [
    ...images.map((url) => ({ type: 'image' as const, url, thumbnail: url, title: product.name })),
    ...videos.map((v) => {
      const id = getYouTubeId(v.url)
      return {
        type: 'video' as const,
        url: v.url,
        thumbnail: id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : '',
        title: v.title || product.name,
        videoId: id,
      }
    }),
  ]

  return (
    <main className="min-h-screen bg-cbc-black">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <ProductGallery media={allMedia} />
          </div>

          <div>
            <h1 className="text-3xl font-bold text-white">{product.name}</h1>
            {product.subtitle && (
              <p className="mt-1 text-cbc-yellow">{product.subtitle}</p>
            )}
            <p className="mt-6 text-gray-400 leading-relaxed">{product.description}</p>

            {(product.features as string[]).length > 0 && (
              <ul className="mt-6 space-y-3">
                {(product.features as string[]).map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-gray-400">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-cbc-yellow shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-8 pt-8 border-t border-gray-800">
              <p className="text-4xl font-bold text-white">
                ${product.price.toLocaleString('es-MX')}
                <span className="text-base font-normal text-gray-500 ml-2">MXN</span>
              </p>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <a
                href={WA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-cbc-yellow px-8 py-4 text-base font-semibold text-black hover:bg-cbc-yellow/90 transition-all"
              >
                Cotizar por WhatsApp
              </a>
              <Link
                href="/cotizar"
                className="inline-flex items-center justify-center rounded-md border border-cbc-yellow/40 px-8 py-4 text-base font-semibold text-cbc-yellow hover:bg-cbc-yellow/10 transition-colors"
              >
                Ver Catálogo B2B
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/productos/[slug]/page.tsx
git commit -m "v1.2.0 feat: create product detail page at /productos/[slug]"
```

---

### Task 8: Verify Build

- [ ] **Step 1: Run build**

```bash
pnpm --filter @cbc/web build
```

Expected: Compiled successfully, no TypeScript errors.

- [ ] **Step 2: Run Prisma validate**

```bash
pnpm --filter @cbc/db build
```

Expected: Prisma generates client with new `images` and `videos` fields.

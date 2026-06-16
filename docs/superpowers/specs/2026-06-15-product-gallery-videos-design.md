# Product Gallery & Videos

## Summary

Add multi-image gallery and YouTube video embedding to products. Currently each product has a single `imageUrl` field. Replace with an images array and videos JSON array, update the admin form, create a product detail page, and update the home page display.

## Schema

**Before** (current `Product` model):
```
imageUrl    String?
```

**After:**
```
images      String[]    @default([])
videos      Json        @default("[]")
```

`images` is an array of R2 public URLs (uploaded via the existing upload endpoint).
`videos` is a JSON array of `{ url: string; title?: string }` where `url` is a YouTube link.

The `imageUrl` column is removed (requires a Prisma migration).

## Upload

The existing `GET /api/upload` endpoint currently uses `logoKey(...)` for all uploads. Add a `folder` query parameter:
- `folder=product` → use `productImageKey(id, filename)` (id generated via crypto.randomUUID as already done)
- default (no folder) → use `logoKey(...)` for backward compatibility

Allowed types remain `image/png, image/svg+xml, image/jpeg, image/jpg`. Max size 5MB.

## Admin Form (ProductForm)

Replace the single-image upload section with:

- **Images**: File input with `multiple` attribute. On selection, each file is uploaded to `/api/upload?folder=product` and the returned `publicUrl` is added to the local `images` state array. Each uploaded image shows a thumbnail preview with a remove ("X") button.
- **Videos**: Text input for YouTube URL + optional title input. "Add video" button pushes to a local `videos` state array. Each entry shows the URL and a remove button.

On submit (`handleSubmit`), the body sent to `POST/PATCH /api/admin/products` includes `images: string[]` and `videos: { url: string; title?: string }[]`.

## API Route (`/api/admin/products`)

The `productSchema` Zod validation is updated:
- `imageUrl: z.string().optional()` → removed
- `images: z.array(z.string()).optional().default([])` added
- `videos: z.array(z.object({ url: z.string(), title: z.string().optional() })).optional().default([])` added

## Home Page (`/`)

The product card currently shows `product.imageUrl`. Change to show `product.images[0]`. If the product has more than 1 image or has videos, show a visual indicator (e.g., "+N" badge). The card gets a "Ver detalle" link pointing to `/productos/[slug]`.

Fallback: if `images` is empty, show the current placeholder div (the "?" fallback that already exists).

## Product Detail Page (`/productos/[slug]`)

New Server Component page:

- **Hero / Gallery**: The first image from `images` is shown large. Below it, thumbnails of all media (images + videos mixed). Videos show a play icon overlay on their thumbnail. Clicking an image thumbnail sets it as the main display. Clicking a video thumbnail opens an overlay/lightbox with an embedded YouTube iframe.
- **Product info**: name, subtitle, description, price, features list
- **CTA**: "Cotizar por WhatsApp" button (reusing the existing WA link pattern)

## Seed & Data Migration

Existing products have `imageUrl` set. Before removing the column, migrate existing data so no images are lost:
- In the migration SQL / Prisma migration: copy `imageUrl` to `images[0]` for all rows where `imageUrl IS NOT NULL`
- After migration, the column `imageUrl` can be dropped

Then update the seed to use `images: []` (empty array) and remove `imageUrl`. The fallback placeholder will handle display for products without images.

## Video Thumbnails

For YouTube videos, extract the video ID from the URL and use `https://img.youtube.com/vi/{id}/hqdefault.jpg` as the thumbnail in the gallery. This avoids needing a custom upload for video thumbnails.

## Files changed

- `packages/db/schema.prisma` — replace `imageUrl` with `images` + `videos`
- `packages/db/seed.ts` — update to new fields
- `apps/web/src/lib/r2.ts` — `productImageKey` already exists, no change needed
- `apps/web/src/app/api/upload/route.ts` — add `folder` param support
- `apps/web/src/app/api/admin/products/route.ts` — update Zod schema
- `apps/web/src/components/admin/sales/ProductForm.tsx` — multi-image upload + video inputs
- `apps/web/src/app/page.tsx` — show `images[0]`, add "Ver detalle" link
- `apps/web/src/app/productos/[slug]/page.tsx` — new product detail page

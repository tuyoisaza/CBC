-- Add new columns
ALTER TABLE "Product" ADD COLUMN "images" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "Product" ADD COLUMN "videos" JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Migrate existing data: copy imageUrl → images[0] for all products with a non-empty image
-- (guards against both NULL and empty-string values)
UPDATE "Product" SET "images" = ARRAY["imageUrl"] WHERE "imageUrl" IS NOT NULL AND "imageUrl" != '';

-- Drop old column
ALTER TABLE "Product" DROP COLUMN "imageUrl";

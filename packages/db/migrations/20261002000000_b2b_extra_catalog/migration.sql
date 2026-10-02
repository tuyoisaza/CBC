-- Additive catalog fields. Keep imageUrl and all existing IDs, prices and quote history.
ALTER TABLE "Extra"
  ADD COLUMN "slug" TEXT,
  ADD COLUMN "shortDescription" TEXT,
  ADD COLUMN "images" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "catalogVisible" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "sellableStandalone" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "unitLabel" TEXT NOT NULL DEFAULT 'pieza',
  ADD COLUMN "unitsPerPack" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "minQty" INTEGER NOT NULL DEFAULT 1;
CREATE UNIQUE INDEX "Extra_slug_key" ON "Extra"("slug");

CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "imageUrl" TEXT,
    "features" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

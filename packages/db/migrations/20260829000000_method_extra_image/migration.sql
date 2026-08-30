-- Add optional image URL to Method and Extra so they can be represented
-- visually in the quote (cotizador) and the customer quote email.
ALTER TABLE "Method" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "Extra" ADD COLUMN "imageUrl" TEXT;

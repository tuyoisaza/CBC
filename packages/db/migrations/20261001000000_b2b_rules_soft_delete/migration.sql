ALTER TABLE "Message" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Extra" ADD COLUMN "allowedForRush" BOOLEAN NOT NULL DEFAULT true;
UPDATE "Extra" SET "allowedForRush" = false WHERE lower("name") IN ('tapografía', 'tampografía');
UPDATE "Extra" SET "name" = 'Tampografía' WHERE lower("name") = 'tapografía';
UPDATE "ShippingZone" SET "active" = false WHERE "name" = 'Interior del país';

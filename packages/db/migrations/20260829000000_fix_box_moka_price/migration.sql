-- Fix Box Moka product price from 799 to 849 to match Moka Italiana method unit price
UPDATE "Product"
SET "price" = 849
WHERE "slug" = 'box-moka' AND "price" = 799;

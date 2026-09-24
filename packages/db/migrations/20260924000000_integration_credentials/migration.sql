ALTER TABLE "User" ADD COLUMN "isSuperadmin" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "IntegrationCredential" (
  "key" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "encryptedValue" TEXT,
  "disabled" BOOLEAN NOT NULL DEFAULT false,
  "updatedBy" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IntegrationCredential_pkey" PRIMARY KEY ("key")
);

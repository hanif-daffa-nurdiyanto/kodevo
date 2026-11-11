CREATE TABLE "CreditPackage" (
  "id" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "credits" INTEGER NOT NULL,
  "priceIdr" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "order" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CreditPackage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CreditPackage_isActive_order_idx" ON "CreditPackage"("isActive", "order");

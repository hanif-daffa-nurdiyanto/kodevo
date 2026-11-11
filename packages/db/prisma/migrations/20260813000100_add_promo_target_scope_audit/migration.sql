CREATE TYPE "PromoTarget" AS ENUM ('ALL', 'CREDIT', 'BUNDLE');

ALTER TABLE "PromoCode"
ADD COLUMN "target" "PromoTarget" NOT NULL DEFAULT 'ALL',
ADD COLUMN "minAmountIdr" INTEGER,
ADD COLUMN "maxDiscountIdr" INTEGER,
ADD COLUMN "creditPackageId" TEXT,
ADD COLUMN "trackId" TEXT;

ALTER TABLE "PromoRedemption"
ADD COLUMN "target" "PromoTarget" NOT NULL DEFAULT 'ALL',
ADD COLUMN "refId" TEXT,
ADD COLUMN "discountAmountIdr" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "originalAmountIdr" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "finalAmountIdr" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "mayarTransactionId" TEXT;

CREATE INDEX "PromoCode_target_isActive_idx" ON "PromoCode"("target", "isActive");
CREATE INDEX "PromoCode_creditPackageId_idx" ON "PromoCode"("creditPackageId");
CREATE INDEX "PromoCode_trackId_idx" ON "PromoCode"("trackId");

CREATE UNIQUE INDEX "PromoRedemption_mayarTransactionId_key" ON "PromoRedemption"("mayarTransactionId");
CREATE INDEX "PromoRedemption_target_refId_idx" ON "PromoRedemption"("target", "refId");

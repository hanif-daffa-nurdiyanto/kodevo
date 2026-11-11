CREATE UNIQUE INDEX "CreditTransaction_type_refId_key" ON "CreditTransaction"("type", "refId");

CREATE UNIQUE INDEX "BundlePurchase_mayarTransactionId_key" ON "BundlePurchase"("mayarTransactionId");

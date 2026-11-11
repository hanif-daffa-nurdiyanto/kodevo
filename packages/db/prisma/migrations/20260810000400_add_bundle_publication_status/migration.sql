ALTER TABLE "Track" ADD COLUMN "publishedAt" TIMESTAMP(3);

UPDATE "Track"
SET "publishedAt" = NOW()
WHERE "type" = 'BUNDLE';

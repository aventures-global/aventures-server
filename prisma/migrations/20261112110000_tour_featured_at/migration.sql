-- Track when a destination was featured so a fourth star can drop the oldest.
ALTER TABLE "Tour" ADD COLUMN "featuredAt" TIMESTAMP(3);

UPDATE "Tour"
SET "featuredAt" = "createdAt"
WHERE "featured" = true AND "featuredAt" IS NULL;

CREATE INDEX "Tour_featured_featuredAt_idx" ON "Tour"("featured", "featuredAt");

-- Snapshot contact so quotations can be issued before the customer has an account.
ALTER TABLE "Quotation" ADD COLUMN "customerName" TEXT;
ALTER TABLE "Quotation" ADD COLUMN "customerEmail" TEXT;

UPDATE "Quotation" q
SET
  "customerName" = COALESCE(
    NULLIF(TRIM(CONCAT(COALESCE(u."firstName", ''), ' ', COALESCE(u."lastName", ''))), ''),
    u."email",
    'Customer'
  ),
  "customerEmail" = LOWER(COALESCE(u."email", ''))
FROM "User" u
WHERE u."id" = q."customerUserId";

-- Any row still missing email after the join is unusable; keep a sentinel so NOT NULL can land.
UPDATE "Quotation"
SET
  "customerName" = COALESCE(NULLIF(TRIM("customerName"), ''), 'Customer'),
  "customerEmail" = COALESCE(NULLIF(TRIM("customerEmail"), ''), 'unknown@invalid.local')
WHERE "customerName" IS NULL OR "customerEmail" IS NULL OR TRIM("customerEmail") = '';

ALTER TABLE "Quotation" ALTER COLUMN "customerName" SET NOT NULL;
ALTER TABLE "Quotation" ALTER COLUMN "customerEmail" SET NOT NULL;

ALTER TABLE "Quotation" ALTER COLUMN "customerUserId" DROP NOT NULL;

CREATE INDEX "Quotation_customerEmail_idx" ON "Quotation"("customerEmail");

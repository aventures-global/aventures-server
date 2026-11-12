-- Optional short label for home showcase cards (falls back to full title when blank).
ALTER TABLE "Tour" ADD COLUMN "shortTitle" TEXT NOT NULL DEFAULT '';

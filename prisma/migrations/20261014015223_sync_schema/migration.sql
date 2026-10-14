/*
  Warnings:

  - You are about to drop the column `category` on the `MerchProduct` table. All the data in the column will be lost.
  - You are about to drop the column `duration` on the `Tour` table. All the data in the column will be lost.
  - You are about to drop the column `exclusions` on the `Tour` table. All the data in the column will be lost.
  - You are about to drop the column `gallery` on the `Tour` table. All the data in the column will be lost.
  - You are about to drop the column `highlights` on the `Tour` table. All the data in the column will be lost.
  - You are about to drop the column `inclusions` on the `Tour` table. All the data in the column will be lost.
  - You are about to drop the column `itinerary` on the `Tour` table. All the data in the column will be lost.
  - You are about to drop the column `startingPrice` on the `Tour` table. All the data in the column will be lost.
  - Added the required column `categoryId` to the `MerchProduct` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MerchProduct" DROP COLUMN "category",
ADD COLUMN     "categoryId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Partner" ADD COLUMN     "description" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "url" TEXT NOT NULL DEFAULT '',
ALTER COLUMN "logoSrc" SET DEFAULT '';

-- AlterTable
ALTER TABLE "Tour" DROP COLUMN "duration",
DROP COLUMN "exclusions",
DROP COLUMN "gallery",
DROP COLUMN "highlights",
DROP COLUMN "inclusions",
DROP COLUMN "itinerary",
DROP COLUMN "startingPrice",
ADD COLUMN     "experiences" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "lat" DOUBLE PRECISION,
ADD COLUMN     "lng" DOUBLE PRECISION,
ADD COLUMN     "region" TEXT NOT NULL DEFAULT 'other',
ADD COLUMN     "searchText" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "sortOrder" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "storyTitles" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "travelTips" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "GeocodeCache" (
    "query" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "label" TEXT,
    "country" TEXT,
    "placeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeocodeCache_pkey" PRIMARY KEY ("query")
);

-- CreateTable
CREATE TABLE "MerchCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaqCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FaqCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Faq" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Faq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaqCategoryOnFaq" (
    "faqId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "FaqCategoryOnFaq_pkey" PRIMARY KEY ("faqId","categoryId")
);

-- CreateTable
CREATE TABLE "FaqTopEntry" (
    "faqId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FaqTopEntry_pkey" PRIMARY KEY ("faqId")
);

-- CreateTable
CREATE TABLE "VisaCatalog" (
    "id" TEXT NOT NULL,
    "pages" JSONB NOT NULL,
    "services" JSONB NOT NULL,
    "finder" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisaCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SitePage" (
    "id" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SitePage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MerchCategory_name_key" ON "MerchCategory"("name");

-- CreateIndex
CREATE INDEX "MerchCategory_sortOrder_idx" ON "MerchCategory"("sortOrder");

-- CreateIndex
CREATE INDEX "FaqCategory_sortOrder_idx" ON "FaqCategory"("sortOrder");

-- CreateIndex
CREATE INDEX "FaqCategoryOnFaq_categoryId_idx" ON "FaqCategoryOnFaq"("categoryId");

-- CreateIndex
CREATE INDEX "FaqTopEntry_position_idx" ON "FaqTopEntry"("position");

-- CreateIndex
CREATE INDEX "MerchProduct_categoryId_idx" ON "MerchProduct"("categoryId");

-- CreateIndex
CREATE INDEX "Tour_sortOrder_idx" ON "Tour"("sortOrder");

-- AddForeignKey
ALTER TABLE "MerchProduct" ADD CONSTRAINT "MerchProduct_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MerchCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaqCategoryOnFaq" ADD CONSTRAINT "FaqCategoryOnFaq_faqId_fkey" FOREIGN KEY ("faqId") REFERENCES "Faq"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaqCategoryOnFaq" ADD CONSTRAINT "FaqCategoryOnFaq_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FaqCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaqTopEntry" ADD CONSTRAINT "FaqTopEntry_faqId_fkey" FOREIGN KEY ("faqId") REFERENCES "Faq"("id") ON DELETE CASCADE ON UPDATE CASCADE;

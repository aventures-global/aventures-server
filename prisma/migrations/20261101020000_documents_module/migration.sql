-- CreateEnum
CREATE TYPE "FileSpace" AS ENUM ('CUSTOMER', 'INTERNAL');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('PASSPORT', 'ID', 'VISA', 'SUPPORTING', 'OTHER');

-- CreateTable
CREATE TABLE "FileFolder" (
    "id" TEXT NOT NULL,
    "space" "FileSpace" NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "ownerUserId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FileFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagedFile" (
    "id" TEXT NOT NULL,
    "space" "FileSpace" NOT NULL,
    "folderId" TEXT,
    "ownerUserId" TEXT,
    "uploadedById" TEXT,
    "displayName" TEXT NOT NULL,
    "category" "DocumentCategory" NOT NULL DEFAULT 'OTHER',
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "storageKey" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "notes" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManagedFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentShare" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdById" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "maxDownloads" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FileFolder_space_ownerUserId_parentId_idx" ON "FileFolder"("space", "ownerUserId", "parentId");

-- CreateIndex
CREATE INDEX "FileFolder_parentId_idx" ON "FileFolder"("parentId");

-- CreateIndex
CREATE INDEX "ManagedFile_space_ownerUserId_deletedAt_idx" ON "ManagedFile"("space", "ownerUserId", "deletedAt");

-- CreateIndex
CREATE INDEX "ManagedFile_folderId_deletedAt_idx" ON "ManagedFile"("folderId", "deletedAt");

-- CreateIndex
CREATE INDEX "ManagedFile_status_idx" ON "ManagedFile"("status");

-- CreateIndex
CREATE INDEX "ManagedFile_category_idx" ON "ManagedFile"("category");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentShare_tokenHash_key" ON "DocumentShare"("tokenHash");

-- CreateIndex
CREATE INDEX "DocumentShare_fileId_createdAt_idx" ON "DocumentShare"("fileId", "createdAt");

-- CreateIndex
CREATE INDEX "DocumentShare_expiresAt_idx" ON "DocumentShare"("expiresAt");

-- AddForeignKey
ALTER TABLE "FileFolder" ADD CONSTRAINT "FileFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "FileFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileFolder" ADD CONSTRAINT "FileFolder_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileFolder" ADD CONSTRAINT "FileFolder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagedFile" ADD CONSTRAINT "ManagedFile_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "FileFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagedFile" ADD CONSTRAINT "ManagedFile_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagedFile" ADD CONSTRAINT "ManagedFile_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentShare" ADD CONSTRAINT "DocumentShare_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "ManagedFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentShare" ADD CONSTRAINT "DocumentShare_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

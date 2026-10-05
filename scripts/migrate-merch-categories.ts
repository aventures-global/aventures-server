import 'dotenv/config'

import { prisma } from '../src/lib/prisma.js'

/** Moves MerchProduct.category strings into the MerchCategory table. Safe to re-run. */
async function main() {
    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "MerchCategory" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "name" TEXT NOT NULL,
            "sortOrder" INTEGER NOT NULL DEFAULT 0,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `)
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "MerchCategory_name_key" ON "MerchCategory"("name")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "MerchCategory_sortOrder_idx" ON "MerchCategory"("sortOrder")`)
    await prisma.$executeRawUnsafe(`ALTER TABLE "MerchProduct" ADD COLUMN IF NOT EXISTS "categoryId" TEXT`)

    const [{ exists: hasLegacyColumn }] = await prisma.$queryRawUnsafe<{ exists: boolean }[]>(`
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'MerchProduct' AND column_name = 'category'
        ) AS "exists"
    `)

    if (hasLegacyColumn) {
        await prisma.$executeRawUnsafe(`
            INSERT INTO "MerchCategory" ("id", "name", "sortOrder")
            SELECT
                trim(both '-' from regexp_replace(lower("category"), '[^a-z0-9]+', '-', 'g')),
                "category",
                (row_number() OVER (ORDER BY "category")) - 1
            FROM (SELECT DISTINCT "category" FROM "MerchProduct") AS names
            ON CONFLICT DO NOTHING
        `)
        await prisma.$executeRawUnsafe(`
            UPDATE "MerchProduct" AS p
            SET "categoryId" = c."id"
            FROM "MerchCategory" AS c
            WHERE c."name" = p."category" AND p."categoryId" IS NULL
        `)
    }

    await prisma.$executeRawUnsafe(`ALTER TABLE "MerchProduct" ALTER COLUMN "categoryId" SET NOT NULL`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "MerchProduct_categoryId_idx" ON "MerchProduct"("categoryId")`)
    await prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MerchProduct_categoryId_fkey') THEN
                ALTER TABLE "MerchProduct"
                    ADD CONSTRAINT "MerchProduct_categoryId_fkey"
                    FOREIGN KEY ("categoryId") REFERENCES "MerchCategory"("id")
                    ON DELETE RESTRICT ON UPDATE CASCADE;
            END IF;
        END $$
    `)
    await prisma.$executeRawUnsafe(`ALTER TABLE "MerchProduct" DROP COLUMN IF EXISTS "category"`)

    const categories = await prisma.$queryRawUnsafe<{ id: string; name: string }[]>(
        `SELECT "id", "name" FROM "MerchCategory" ORDER BY "sortOrder"`,
    )
    console.log(`Merch categories ready: ${categories.map((c) => `${c.name} (${c.id})`).join(', ')}`)
}

main()
    .catch((err) => {
        console.error(err)
        process.exitCode = 1
    })
    .finally(() => prisma.$disconnect())

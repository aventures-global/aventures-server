-- CreateEnum
CREATE TYPE "BookingPaymentStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID', 'OVERPAID');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'GCASH', 'MAYA', 'CARD', 'OTHER');

-- CreateEnum
CREATE TYPE "FinanceEntryType" AS ENUM ('INCOME', 'EXPENSE');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "paymentStatus" "BookingPaymentStatus" NOT NULL DEFAULT 'UNPAID';
ALTER TABLE "Booking" ADD COLUMN "paidCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Booking" ADD COLUMN "dueAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "customerUserId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PHP',
    "method" "PaymentMethod" NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "reference" TEXT,
    "createdById" TEXT,
    "voidedAt" TIMESTAMP(3),
    "voidedById" TEXT,
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FinanceEntryType" NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceEntry" (
    "id" TEXT NOT NULL,
    "type" "FinanceEntryType" NOT NULL,
    "categoryId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PHP',
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "notes" TEXT,
    "paymentId" TEXT,
    "createdById" TEXT,
    "voidedAt" TIMESTAMP(3),
    "voidedById" TEXT,
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Booking_paymentStatus_createdAt_idx" ON "Booking"("paymentStatus", "createdAt");

-- CreateIndex
CREATE INDEX "Booking_dueAt_idx" ON "Booking"("dueAt");

-- CreateIndex
CREATE INDEX "Payment_bookingId_paidAt_idx" ON "Payment"("bookingId", "paidAt");

-- CreateIndex
CREATE INDEX "Payment_customerUserId_paidAt_idx" ON "Payment"("customerUserId", "paidAt");

-- CreateIndex
CREATE INDEX "Payment_voidedAt_idx" ON "Payment"("voidedAt");

-- CreateIndex
CREATE INDEX "Payment_paidAt_idx" ON "Payment"("paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceCategory_type_name_key" ON "FinanceCategory"("type", "name");

-- CreateIndex
CREATE INDEX "FinanceCategory_type_sortOrder_idx" ON "FinanceCategory"("type", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceEntry_paymentId_key" ON "FinanceEntry"("paymentId");

-- CreateIndex
CREATE INDEX "FinanceEntry_type_occurredAt_idx" ON "FinanceEntry"("type", "occurredAt");

-- CreateIndex
CREATE INDEX "FinanceEntry_categoryId_occurredAt_idx" ON "FinanceEntry"("categoryId", "occurredAt");

-- CreateIndex
CREATE INDEX "FinanceEntry_occurredAt_idx" ON "FinanceEntry"("occurredAt");

-- CreateIndex
CREATE INDEX "FinanceEntry_voidedAt_idx" ON "FinanceEntry"("voidedAt");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_customerUserId_fkey" FOREIGN KEY ("customerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceEntry" ADD CONSTRAINT "FinanceEntry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FinanceCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceEntry" ADD CONSTRAINT "FinanceEntry_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceEntry" ADD CONSTRAINT "FinanceEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceEntry" ADD CONSTRAINT "FinanceEntry_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed finance categories
INSERT INTO "FinanceCategory" ("id", "name", "type", "isSystem", "sortOrder", "createdAt", "updatedAt") VALUES
    ('fcat_customer_payments', 'Customer payments', 'INCOME', true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('fcat_other_income', 'Other income', 'INCOME', false, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('fcat_supplier_hotels', 'Supplier / hotels', 'EXPENSE', false, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('fcat_gov_visa', 'Government / visa fees', 'EXPENSE', false, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('fcat_marketing', 'Marketing', 'EXPENSE', false, 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('fcat_operations', 'Operations', 'EXPENSE', false, 30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('fcat_other_expense', 'Other expense', 'EXPENSE', false, 40, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

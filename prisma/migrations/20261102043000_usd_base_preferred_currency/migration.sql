-- AlterTable: ledger defaults PHP → USD (existing rows unchanged)
ALTER TABLE "Quotation" ALTER COLUMN "currency" SET DEFAULT 'USD';
ALTER TABLE "Booking" ALTER COLUMN "currency" SET DEFAULT 'USD';
ALTER TABLE "Payment" ALTER COLUMN "currency" SET DEFAULT 'USD';
ALTER TABLE "FinanceEntry" ALTER COLUMN "currency" SET DEFAULT 'USD';

-- AlterTable: customer checkout presentment preference
ALTER TABLE "User" ADD COLUMN "preferredCurrency" TEXT NOT NULL DEFAULT 'USD';

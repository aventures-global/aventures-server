-- Allow bookings (and their payments) without a customer account yet.
ALTER TABLE "Booking" ALTER COLUMN "customerUserId" DROP NOT NULL;
ALTER TABLE "Payment" ALTER COLUMN "customerUserId" DROP NOT NULL;

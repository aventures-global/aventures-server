-- AlterTable
ALTER TABLE "UserPreference" ADD COLUMN     "accent" TEXT NOT NULL DEFAULT 'royal',
ADD COLUMN     "density" TEXT NOT NULL DEFAULT 'comfortable',
ADD COLUMN     "font" TEXT NOT NULL DEFAULT 'poppins',
ADD COLUMN     "motion" TEXT NOT NULL DEFAULT 'system',
ADD COLUMN     "textSize" TEXT NOT NULL DEFAULT 'default';

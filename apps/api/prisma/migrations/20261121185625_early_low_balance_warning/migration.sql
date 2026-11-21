-- AlterTable
ALTER TABLE "alerts" ADD COLUMN     "seconds_left" INTEGER;

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "early_warning_alerted" BOOLEAN NOT NULL DEFAULT false;

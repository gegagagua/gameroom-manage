-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "paused_at" TIMESTAMP(3),
ADD COLUMN     "web_managed" BOOLEAN NOT NULL DEFAULT false;

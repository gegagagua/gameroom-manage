-- AlterTable
ALTER TABLE "users" ADD COLUMN     "username" TEXT,
ALTER COLUMN "phone" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");


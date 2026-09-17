-- CreateEnum
CREATE TYPE "GameLaunchType" AS ENUM ('STEAM', 'EXE', 'URL');

-- CreateTable
CREATE TABLE "games" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "launch_type" "GameLaunchType" NOT NULL,
    "steam_app_id" INTEGER,
    "exe_path" TEXT,
    "args" TEXT,
    "url" TEXT,
    "process_names" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "image_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "games_is_active_sort_order_idx" ON "games"("is_active", "sort_order");

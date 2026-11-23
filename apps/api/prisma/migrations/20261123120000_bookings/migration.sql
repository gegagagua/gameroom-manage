-- CreateTable
CREATE TABLE "bookings" (
    "id" SERIAL NOT NULL,
    "business_date" DATE NOT NULL,
    "start_minute" INTEGER NOT NULL,
    "end_minute" INTEGER NOT NULL,
    "customer_name" TEXT NOT NULL,
    "phone" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_devices" (
    "booking_id" INTEGER NOT NULL,
    "device" TEXT NOT NULL,

    CONSTRAINT "booking_devices_pkey" PRIMARY KEY ("booking_id","device")
);

-- CreateIndex
CREATE INDEX "bookings_business_date_idx" ON "bookings"("business_date");

-- CreateIndex
CREATE INDEX "booking_devices_device_idx" ON "booking_devices"("device");

-- AddForeignKey
ALTER TABLE "booking_devices" ADD CONSTRAINT "booking_devices_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;


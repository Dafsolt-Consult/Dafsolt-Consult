-- CreateEnum
CREATE TYPE "HostelType" AS ENUM ('BOYS', 'GIRLS', 'MIXED');

-- CreateTable
CREATE TABLE "hostels" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "HostelType" NOT NULL DEFAULT 'MIXED',
    "wardenId" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hostels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "hostelId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 4,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_allocations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "feeAmount" INTEGER NOT NULL DEFAULT 0,
    "amountPaid" INTEGER NOT NULL DEFAULT 0,
    "checkInDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkOutDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "room_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hostel_payments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "allocationId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "recordedById" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hostel_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hostels_tenantId_idx" ON "hostels"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "hostels_tenantId_name_key" ON "hostels"("tenantId", "name");

-- CreateIndex
CREATE INDEX "rooms_tenantId_hostelId_idx" ON "rooms"("tenantId", "hostelId");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_tenantId_hostelId_number_key" ON "rooms"("tenantId", "hostelId", "number");

-- CreateIndex
CREATE INDEX "room_allocations_tenantId_roomId_idx" ON "room_allocations"("tenantId", "roomId");

-- CreateIndex
CREATE UNIQUE INDEX "room_allocations_tenantId_studentId_sessionId_key" ON "room_allocations"("tenantId", "studentId", "sessionId");

-- CreateIndex
CREATE INDEX "hostel_payments_tenantId_allocationId_idx" ON "hostel_payments"("tenantId", "allocationId");

-- AddForeignKey
ALTER TABLE "hostels" ADD CONSTRAINT "hostels_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hostels" ADD CONSTRAINT "hostels_wardenId_fkey" FOREIGN KEY ("wardenId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "hostels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_allocations" ADD CONSTRAINT "room_allocations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_allocations" ADD CONSTRAINT "room_allocations_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_allocations" ADD CONSTRAINT "room_allocations_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_allocations" ADD CONSTRAINT "room_allocations_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "academic_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hostel_payments" ADD CONSTRAINT "hostel_payments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hostel_payments" ADD CONSTRAINT "hostel_payments_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "room_allocations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hostel_payments" ADD CONSTRAINT "hostel_payments_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- CreateEnum
CREATE TYPE "DisciplinaryCategory" AS ENUM ('MINOR', 'MAJOR', 'SEVERE');

-- CreateEnum
CREATE TYPE "DisciplinaryStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateTable
CREATE TABLE "disciplinary_records" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "category" "DisciplinaryCategory" NOT NULL,
    "incidentDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "actionTaken" TEXT,
    "status" "DisciplinaryStatus" NOT NULL DEFAULT 'OPEN',
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disciplinary_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "disciplinary_records_tenantId_studentId_idx" ON "disciplinary_records"("tenantId", "studentId");

-- AddForeignKey
ALTER TABLE "disciplinary_records" ADD CONSTRAINT "disciplinary_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disciplinary_records" ADD CONSTRAINT "disciplinary_records_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disciplinary_records" ADD CONSTRAINT "disciplinary_records_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


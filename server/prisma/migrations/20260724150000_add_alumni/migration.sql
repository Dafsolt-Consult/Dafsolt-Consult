-- CreateTable
CREATE TABLE "alumni" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "studentId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "graduationYear" INTEGER NOT NULL,
    "lastClassLevelId" TEXT,
    "higherInstitution" TEXT,
    "occupation" TEXT,
    "employer" TEXT,
    "bio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alumni_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "alumni_studentId_key" ON "alumni"("studentId");

-- CreateIndex
CREATE INDEX "alumni_tenantId_graduationYear_idx" ON "alumni"("tenantId", "graduationYear");

-- AddForeignKey
ALTER TABLE "alumni" ADD CONSTRAINT "alumni_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alumni" ADD CONSTRAINT "alumni_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alumni" ADD CONSTRAINT "alumni_lastClassLevelId_fkey" FOREIGN KEY ("lastClassLevelId") REFERENCES "class_levels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

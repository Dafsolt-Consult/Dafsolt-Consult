-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "groupId" TEXT;

-- CreateTable
CREATE TABLE "school_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_groups_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "school_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

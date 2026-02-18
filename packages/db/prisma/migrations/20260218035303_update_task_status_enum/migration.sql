-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TaskStatus" ADD VALUE 'BACKLOG';
ALTER TYPE "TaskStatus" ADD VALUE 'UP_NEXT';
ALTER TYPE "TaskStatus" ADD VALUE 'BLOCKED';
ALTER TYPE "TaskStatus" ADD VALUE 'IN_REVIEW';

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "customStatusId" TEXT;

-- CreateTable
CREATE TABLE "CustomStatus" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "icon" TEXT,
    "position" INTEGER NOT NULL,
    "baseStatus" "TaskStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomStatus_workspaceId_name_key" ON "CustomStatus"("workspaceId", "name");

-- AddForeignKey
ALTER TABLE "CustomStatus" ADD CONSTRAINT "CustomStatus_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_customStatusId_fkey" FOREIGN KEY ("customStatusId") REFERENCES "CustomStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

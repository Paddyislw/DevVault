/*
  Warnings:

  - Added the required column `salt` to the `credentials` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "credentials" ADD COLUMN     "salt" TEXT NOT NULL,
ALTER COLUMN "service" DROP NOT NULL;

-- AlterTable
ALTER TABLE "api_endpoints" ADD COLUMN     "authValue" TEXT,
ADD COLUMN     "lastPingAt" TIMESTAMP(3);

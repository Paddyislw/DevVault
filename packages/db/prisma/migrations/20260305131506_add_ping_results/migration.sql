-- CreateTable
CREATE TABLE "ping_results" (
    "id" TEXT NOT NULL,
    "endpointId" TEXT NOT NULL,
    "status" INTEGER,
    "responseTime" INTEGER NOT NULL,
    "body" TEXT,
    "headers" JSONB NOT NULL DEFAULT '{}',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ping_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ping_results_endpointId_idx" ON "ping_results"("endpointId");

-- CreateIndex
CREATE INDEX "ping_results_createdAt_idx" ON "ping_results"("createdAt");

-- AddForeignKey
ALTER TABLE "ping_results" ADD CONSTRAINT "ping_results_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "api_endpoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

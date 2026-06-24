-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('SUBMITTED', 'ROUTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "RoutingSource" AS ENUM ('CLAUDE', 'MANUAL');

-- CreateTable
CREATE TABLE "cases" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "residentName" TEXT NOT NULL,
    "residentEmail" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "ownerOrTenant" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sanitizedDescription" TEXT NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routings" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "decisionSource" "RoutingSource" NOT NULL,
    "confidence" DECIMAL(5,4),
    "reasoningSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "routings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "status_history" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "fromStatus" "CaseStatus",
    "toStatus" "CaseStatus" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cases_publicId_key" ON "cases"("publicId");

-- CreateIndex
CREATE INDEX "cases_status_idx" ON "cases"("status");

-- CreateIndex
CREATE INDEX "cases_createdAt_idx" ON "cases"("createdAt");

-- CreateIndex
CREATE INDEX "routings_caseId_idx" ON "routings"("caseId");

-- CreateIndex
CREATE INDEX "routings_decisionSource_idx" ON "routings"("decisionSource");

-- CreateIndex
CREATE INDEX "routings_createdAt_idx" ON "routings"("createdAt");

-- CreateIndex
CREATE INDEX "status_history_caseId_idx" ON "status_history"("caseId");

-- CreateIndex
CREATE INDEX "status_history_toStatus_idx" ON "status_history"("toStatus");

-- CreateIndex
CREATE INDEX "status_history_createdAt_idx" ON "status_history"("createdAt");

-- AddForeignKey
ALTER TABLE "routings" ADD CONSTRAINT "routings_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_history" ADD CONSTRAINT "status_history_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "ppe_violations" (
    "id" TEXT NOT NULL,
    "personName" TEXT NOT NULL,
    "personnelId" TEXT,
    "confidenceScore" DOUBLE PRECISION,
    "siteId" TEXT NOT NULL,
    "cameraId" TEXT,
    "cameraName" TEXT NOT NULL,
    "location" TEXT,
    "previousState" TEXT NOT NULL,
    "currentState" TEXT NOT NULL,
    "ppeWearing" JSONB NOT NULL,
    "ppeMissing" JSONB NOT NULL,
    "ppeRequired" JSONB NOT NULL,
    "violationReason" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'active',
    "detectionTimestamp" TIMESTAMP(3) NOT NULL,
    "gracePeriodStart" TIMESTAMP(3),
    "gracePeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "snapshotUrl" TEXT,
    "snapshotMetadata" JSONB,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolutionNotes" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedBy" TEXT,

    CONSTRAINT "ppe_violations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ppe_violations_siteId_status_detectionTimestamp_idx" ON "ppe_violations"("siteId", "status", "detectionTimestamp");

-- CreateIndex
CREATE INDEX "ppe_violations_personName_detectionTimestamp_idx" ON "ppe_violations"("personName", "detectionTimestamp");

-- CreateIndex
CREATE INDEX "ppe_violations_personnelId_detectionTimestamp_idx" ON "ppe_violations"("personnelId", "detectionTimestamp");

-- CreateIndex
CREATE INDEX "ppe_violations_cameraId_detectionTimestamp_idx" ON "ppe_violations"("cameraId", "detectionTimestamp");

-- CreateIndex
CREATE INDEX "ppe_violations_currentState_status_idx" ON "ppe_violations"("currentState", "status");

-- AddForeignKey
ALTER TABLE "ppe_violations" ADD CONSTRAINT "ppe_violations_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ppe_violations" ADD CONSTRAINT "ppe_violations_cameraId_fkey" FOREIGN KEY ("cameraId") REFERENCES "cameras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ppe_violations" ADD CONSTRAINT "ppe_violations_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "personnel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

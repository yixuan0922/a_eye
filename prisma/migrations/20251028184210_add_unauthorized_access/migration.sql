-- CreateTable
CREATE TABLE "unauthorized_access" (
    "id" TEXT NOT NULL,
    "trackId" INTEGER NOT NULL,
    "siteId" TEXT NOT NULL,
    "cameraId" TEXT,
    "cameraName" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "detectionTimestamp" TIMESTAMP(3) NOT NULL,
    "durationSeconds" DOUBLE PRECISION NOT NULL,
    "totalFramesTracked" INTEGER NOT NULL,
    "faceDetectionAttempts" INTEGER NOT NULL,
    "snapshotUrl" TEXT,
    "bbox" JSONB,
    "status" TEXT NOT NULL DEFAULT 'active',
    "severity" TEXT NOT NULL DEFAULT 'high',
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolutionNotes" TEXT,
    "identifiedPersonName" TEXT,
    "identifiedPersonnelId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unauthorized_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "unauthorized_access_siteId_idx" ON "unauthorized_access"("siteId");

-- CreateIndex
CREATE INDEX "unauthorized_access_cameraId_idx" ON "unauthorized_access"("cameraId");

-- CreateIndex
CREATE INDEX "unauthorized_access_trackId_idx" ON "unauthorized_access"("trackId");

-- CreateIndex
CREATE INDEX "unauthorized_access_status_idx" ON "unauthorized_access"("status");

-- CreateIndex
CREATE INDEX "unauthorized_access_detectionTimestamp_idx" ON "unauthorized_access"("detectionTimestamp");

-- AddForeignKey
ALTER TABLE "unauthorized_access" ADD CONSTRAINT "unauthorized_access_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unauthorized_access" ADD CONSTRAINT "unauthorized_access_cameraId_fkey" FOREIGN KEY ("cameraId") REFERENCES "cameras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unauthorized_access" ADD CONSTRAINT "unauthorized_access_identifiedPersonnelId_fkey" FOREIGN KEY ("identifiedPersonnelId") REFERENCES "personnel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

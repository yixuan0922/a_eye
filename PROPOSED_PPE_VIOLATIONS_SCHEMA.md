# Proposed PPE Violations Table Schema Redesign

## Problem with Current Schema

The existing `violations` table is too generic for detailed PPE compliance tracking:
- No structured PPE item tracking (which items are worn vs. missing)
- No temporal tracking (violation duration, grace periods)
- Single `imageUrl` field (can't store multiple snapshots)
- No metadata about detection confidence or camera specifics
- Description field stores unstructured text instead of structured data

## Proposed New Schema

### Option 1: Enhanced Violations Table (Backward Compatible)

Add new columns to existing `violations` table:

```prisma
model Violation {
  // Existing fields
  id          String     @id @default(cuid())
  type        String                          // Keep for compatibility
  description String                          // Keep for compatibility
  severity    String     @default("medium")
  status      String     @default("active")
  location    String?
  siteId      String
  cameraId    String?
  personnelId String?
  imageUrl    String?                        // Keep for backward compatibility
  resolvedAt  DateTime?
  resolvedBy  String?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  // NEW PPE-specific fields
  violationType      String?                 // "PPE_VIOLATION", "UNAUTHORIZED_ACCESS", etc.
  personName         String?                 // Name of person (may not be in personnel table yet)
  cameraName         String?                 // Camera friendly name
  previousState      String?                 // Previous PPE state (e.g., "compliant", "missing_hardhat")
  currentState       String?                 // Current PPE state
  ppeWearing         Json?                   // Array of PPE items being worn: ["Vest", "Gloves"]
  ppeMissing         Json?                   // Array of missing required PPE: ["Hard_hat"]
  ppeRequired        Json?                   // Array of required PPE for this site: ["Hard_hat", "Vest"]
  snapshotUrl        String?                 // S3 URL for violation snapshot with annotations
  snapshotMetadata   Json?                   // Metadata: {has_bboxes: true, person_bbox: [...], ppe_bboxes: {...}}
  violationReason    String?                 // "first_violation", "state_changed", "grace_period_expired"
  detectionTimestamp DateTime?               // Exact time of detection (may differ from createdAt)
  gracePeriodStart   DateTime?               // When grace period started (if applicable)
  gracePeriodEnd     DateTime?               // When grace period ended
  confidenceScore    Float?                  // Face recognition confidence (0.0-1.0)

  // Relationships (existing)
  camera      Camera?    @relation(fields: [cameraId], references: [id])
  personnel   Personnel? @relation(fields: [personnelId], references: [id])
  site        Site       @relation(fields: [siteId], references: [id])

  @@map("violations")
  @@index([siteId, status, createdAt])
  @@index([personnelId, createdAt])
  @@index([cameraId, createdAt])
  @@index([violationType, status])
}
```

#### Migration Strategy
```sql
-- Add new columns (all nullable for backward compatibility)
ALTER TABLE "violations" ADD COLUMN "violationType" TEXT;
ALTER TABLE "violations" ADD COLUMN "personName" TEXT;
ALTER TABLE "violations" ADD COLUMN "cameraName" TEXT;
ALTER TABLE "violations" ADD COLUMN "previousState" TEXT;
ALTER TABLE "violations" ADD COLUMN "currentState" TEXT;
ALTER TABLE "violations" ADD COLUMN "ppeWearing" JSONB;
ALTER TABLE "violations" ADD COLUMN "ppeMissing" JSONB;
ALTER TABLE "violations" ADD COLUMN "ppeRequired" JSONB;
ALTER TABLE "violations" ADD COLUMN "snapshotUrl" TEXT;
ALTER TABLE "violations" ADD COLUMN "snapshotMetadata" JSONB;
ALTER TABLE "violations" ADD COLUMN "violationReason" TEXT;
ALTER TABLE "violations" ADD COLUMN "detectionTimestamp" TIMESTAMP(3);
ALTER TABLE "violations" ADD COLUMN "gracePeriodStart" TIMESTAMP(3);
ALTER TABLE "violations" ADD COLUMN "gracePeriodEnd" TIMESTAMP(3);
ALTER TABLE "violations" ADD COLUMN "confidenceScore" DOUBLE PRECISION;

-- Create indices for performance
CREATE INDEX "violations_siteId_status_createdAt_idx" ON "violations"("siteId", "status", "createdAt");
CREATE INDEX "violations_personnelId_createdAt_idx" ON "violations"("personnelId", "createdAt");
CREATE INDEX "violations_cameraId_createdAt_idx" ON "violations"("cameraId", "createdAt");
CREATE INDEX "violations_violationType_status_idx" ON "violations"("violationType", "status");
```

---

### Option 2: Dedicated PPE Violations Table (Recommended)

Create a separate `ppe_violations` table for detailed PPE tracking:

```prisma
model PPEViolation {
  id                 String    @id @default(cuid())

  // Person Information
  personName         String                          // Name from face recognition
  personnelId        String?                         // Link to personnel if registered
  confidenceScore    Float?                          // Face recognition confidence

  // Location & Camera
  siteId             String                          // Required site reference
  cameraId           String?                         // Camera that detected violation
  cameraName         String                          // Camera friendly name
  location           String?                         // Physical location description

  // PPE State Information
  previousState      String                          // e.g., "compliant", "missing_hardhat"
  currentState       String                          // e.g., "missing_hardhat", "missing_vest"
  ppeWearing         Json                            // ["Vest", "Gloves"]
  ppeMissing         Json                            // ["Hard_hat"]
  ppeRequired        Json                            // ["Hard_hat", "Vest"]

  // Violation Metadata
  violationReason    String                          // "first_violation", "state_changed", "grace_period_expired"
  severity           String     @default("medium")   // "low", "medium", "high"
  status             String     @default("active")   // "active", "resolved", "acknowledged"

  // Timestamps
  detectionTimestamp DateTime                        // Exact detection time
  gracePeriodStart   DateTime?                       // When grace period started
  gracePeriodEnd     DateTime?                       // When grace period expired
  createdAt          DateTime   @default(now())
  updatedAt          DateTime   @updatedAt

  // Evidence & Snapshots
  snapshotUrl        String?                         // S3 URL with annotated snapshot
  snapshotMetadata   Json?                           // {person_bbox: [...], ppe_bboxes: {...}}

  // Resolution Tracking
  resolvedAt         DateTime?
  resolvedBy         String?
  resolutionNotes    String?
  acknowledgedAt     DateTime?
  acknowledgedBy     String?

  // Relationships
  site               Site       @relation(fields: [siteId], references: [id])
  camera             Camera?    @relation(fields: [cameraId], references: [id])
  personnel          Personnel? @relation(fields: [personnelId], references: [id])

  @@map("ppe_violations")
  @@index([siteId, status, detectionTimestamp])
  @@index([personName, detectionTimestamp])
  @@index([personnelId, detectionTimestamp])
  @@index([cameraId, detectionTimestamp])
  @@index([currentState, status])
}
```

#### Benefits of Separate Table
- ✅ No impact on existing violations table
- ✅ Optimized specifically for PPE compliance
- ✅ Better query performance (dedicated indices)
- ✅ Cleaner data model (no nullable PPE fields in generic violations)
- ✅ Can coexist with legacy violations
- ✅ Easier to add PPE-specific features later

---

## Field Descriptions

### Person Information
- **personName**: Name from face recognition (may not match personnel DB)
- **personnelId**: Foreign key if person is registered in personnel table
- **confidenceScore**: Face recognition confidence (0.0-1.0)

### PPE State
- **previousState**: State before this violation (e.g., "compliant", "missing_hardhat")
- **currentState**: Current violation state (e.g., "missing_hardhat", "missing_vest")
- **ppeWearing**: JSON array of PPE items currently worn
- **ppeMissing**: JSON array of required PPE items missing
- **ppeRequired**: JSON array of all required PPE for this site/location

### Violation Metadata
- **violationReason**: Why this violation was logged
  - `"first_violation"`: First time person violated
  - `"state_changed"`: PPE state changed (e.g., removed hard hat)
  - `"grace_period_expired"`: Was in violation for too long
  - `"compliance_restored"`: Person became compliant again

### Evidence
- **snapshotUrl**: S3 URL to annotated violation snapshot
- **snapshotMetadata**: JSON with bounding box data
  ```json
  {
    "person_bbox": [x1, y1, x2, y2],
    "ppe_bboxes": {
      "Vest": [[x1, y1, x2, y2, confidence]],
      "Hard_hat": [[x1, y1, x2, y2, confidence]]
    }
  }
  ```

---

## Example Data Mapping

From your current `app_face_ppe_flask.py` violation logging:

```python
# Current violation object
violation = ViolationEvent(
    person_name="Yi Xuan",
    camera_name="Building A - Main Entrance",
    timestamp=datetime.now(),
    previous_state=PPEState.COMPLIANT,
    current_state=PPEState.MISSING_HARDHAT,
    wearing=['Vest'],
    missing=['Hard_hat'],
    snapshot_path="s3://aeyecctv/ppe_violations/20251028_032254_..."
)
```

Maps to:

```json
{
  "personName": "Yi Xuan",
  "cameraName": "Building A - Main Entrance",
  "detectionTimestamp": "2025-10-28T03:22:54Z",
  "previousState": "compliant",
  "currentState": "missing_hardhat",
  "ppeWearing": ["Vest"],
  "ppeMissing": ["Hard_hat"],
  "ppeRequired": ["Hard_hat", "Vest"],
  "violationReason": "state_changed",
  "severity": "high",
  "status": "active",
  "snapshotUrl": "s3://aeyecctv/ppe_violations/20251028_032254_...",
  "siteId": "site_123",
  "cameraId": "cam_456"
}
```

---

## Recommended Approach

**I recommend Option 2 (Dedicated PPE Violations Table)** because:

1. **Clean separation**: PPE violations are domain-specific
2. **Better performance**: Optimized indices and no null fields
3. **Future-proof**: Easy to add PPE-specific features
4. **No breaking changes**: Existing violations table untouched
5. **Better analytics**: PPE-specific queries are cleaner

---

## Next Steps

1. **Create Prisma migration** for new `ppe_violations` table
2. **Add tRPC endpoint** for creating PPE violations
3. **Create REST API endpoint** for Jetson to POST violations
4. **Update relationships** in Site, Camera, Personnel models
5. **Update frontend** to display PPE violations separately

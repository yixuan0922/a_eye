-- Drop FK constraint if exists then drop column
ALTER TABLE "attendance" DROP CONSTRAINT IF EXISTS "attendance_cameraId_fkey";
ALTER TABLE "attendance" DROP COLUMN IF EXISTS "cameraId";


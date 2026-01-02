-- Ensure changi-site-01 exists (idempotent - won't fail if it already exists)
INSERT INTO "sites" ("id", "name", "location", "code", "description", "isActive", "createdAt", "updatedAt", "qrCode")
VALUES (
  'changi_site_01_id',
  'Changi Construction Site 01',
  'Changi East Road, Singapore',
  'changi-site-01',
  'Main construction site for the Changi project',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  ''
)
ON CONFLICT (code) DO NOTHING;

-- Get the actual ID of changi-site-01 (in case it was created before with different ID)
DO $$
DECLARE
  changi_site_id TEXT;
BEGIN
  SELECT id INTO changi_site_id FROM "sites" WHERE code = 'changi-site-01';

  -- Update all cameras to belong to changi-site-01 if they don't have a valid siteId
  -- or if their siteId doesn't exist in sites table
  UPDATE "cameras"
  SET "siteId" = changi_site_id
  WHERE "siteId" NOT IN (SELECT id FROM "sites")
     OR "siteId" IS NULL;

  -- Update all personnel to belong to changi-site-01
  UPDATE "personnel"
  SET "siteId" = changi_site_id
  WHERE "siteId" NOT IN (SELECT id FROM "sites")
     OR "siteId" IS NULL;

  -- Update all violations to belong to changi-site-01
  UPDATE "violations"
  SET "siteId" = changi_site_id
  WHERE "siteId" NOT IN (SELECT id FROM "sites")
     OR "siteId" IS NULL;

  -- Update all PPE violations to belong to changi-site-01
  UPDATE "ppe_violations"
  SET "siteId" = changi_site_id
  WHERE "siteId" NOT IN (SELECT id FROM "sites")
     OR "siteId" IS NULL;

  -- Update all unauthorized access records to belong to changi-site-01
  UPDATE "unauthorized_access"
  SET "siteId" = changi_site_id
  WHERE "siteId" NOT IN (SELECT id FROM "sites")
     OR "siteId" IS NULL;

  -- Update all attendance records to belong to changi-site-01
  UPDATE "attendance"
  SET "siteId" = changi_site_id
  WHERE "siteId" NOT IN (SELECT id FROM "sites")
     OR "siteId" IS NULL;

  -- Update all activities to belong to changi-site-01
  UPDATE "activities"
  SET "siteId" = changi_site_id
  WHERE "siteId" NOT IN (SELECT id FROM "sites")
     OR "siteId" IS NULL;
END $$;

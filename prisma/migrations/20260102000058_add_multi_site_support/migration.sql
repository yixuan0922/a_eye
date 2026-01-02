-- CreateTable
CREATE TABLE "user_sites" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_sites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_sites_userId_idx" ON "user_sites"("userId");

-- CreateIndex
CREATE INDEX "user_sites_siteId_idx" ON "user_sites"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "user_sites_userId_siteId_key" ON "user_sites"("userId", "siteId");

-- Migrate existing data: Create UserSite entries for existing User-Site relationships
INSERT INTO "user_sites" ("id", "userId", "siteId", "role", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    u."id",
    u."siteId",
    u."role",
    u."createdAt",
    u."updatedAt"
FROM "users" u
WHERE u."siteId" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "user_sites" ADD CONSTRAINT "user_sites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sites" ADD CONSTRAINT "user_sites_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Add password field to users
ALTER TABLE "users" ADD COLUMN "password" TEXT NOT NULL DEFAULT '$2a$10$YourHashedPasswordHere';

-- AlterTable: Drop the old siteId and site relation from users
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_siteId_fkey";
ALTER TABLE "users" DROP COLUMN "siteId";
ALTER TABLE "users" DROP COLUMN "role";

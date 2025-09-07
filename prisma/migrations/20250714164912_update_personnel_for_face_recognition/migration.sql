/*
  Warnings:

  - You are about to drop the column `knownFaceId` on the `attendance` table. All the data in the column will be lost.
  - You are about to drop the `known_faces` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `personnelId` to the `attendance` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "attendance" DROP CONSTRAINT "attendance_knownFaceId_fkey";

-- DropForeignKey
ALTER TABLE "known_faces" DROP CONSTRAINT "known_faces_siteId_fkey";

-- AlterTable
ALTER TABLE "attendance" DROP COLUMN "knownFaceId",
ADD COLUMN     "personnelId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "personnel" ADD COLUMN     "currentZone" TEXT,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "faceDescriptor" JSONB,
ADD COLUMN     "isAuthorized" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "photo" TEXT,
ADD COLUMN     "requestDate" TIMESTAMP(3),
ADD COLUMN     "role" TEXT;

-- DropTable
DROP TABLE "known_faces";

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "personnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

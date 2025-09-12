/*
  Warnings:

  - You are about to drop the column `photo` on the `personnel` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "personnel" DROP COLUMN "photo",
ADD COLUMN     "photos" JSONB;

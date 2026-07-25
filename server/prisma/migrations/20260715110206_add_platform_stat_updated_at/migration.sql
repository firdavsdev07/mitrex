/*
  Warnings:

  - Added the required column `updatedAt` to the `platform_stats` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
-- Mavjud qatorlar uchun updatedAt'ni createdAt bilan bir xil qilib
-- to'ldiramiz (eng yaqin ma'lum sinxronizatsiya vaqti).
ALTER TABLE "platform_stats" ADD COLUMN     "updatedAt" TIMESTAMP(3);
UPDATE "platform_stats" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;
ALTER TABLE "platform_stats" ALTER COLUMN "updatedAt" SET NOT NULL;

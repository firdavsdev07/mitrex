/*
  Warnings:

  - You are about to drop the column `lemonVariantId` on the `plans` table. All the data in the column will be lost.
  - You are about to drop the column `lemonCustomerId` on the `user_subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `lemonSubscriptionId` on the `user_subscriptions` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "plans_lemonVariantId_key";

-- DropIndex
DROP INDEX "user_subscriptions_lemonSubscriptionId_key";

-- AlterTable
ALTER TABLE "plans" DROP COLUMN "lemonVariantId";

-- AlterTable
ALTER TABLE "user_subscriptions" DROP COLUMN "lemonCustomerId",
DROP COLUMN "lemonSubscriptionId";

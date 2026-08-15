-- AlterTable
ALTER TABLE "plans" DROP COLUMN "stripePriceId",
ADD COLUMN     "lemonVariantId" TEXT;

-- AlterTable
ALTER TABLE "user_subscriptions" DROP COLUMN "stripeCustomerId",
DROP COLUMN "stripeSubscriptionId",
ADD COLUMN     "lemonCustomerId" TEXT,
ADD COLUMN     "lemonSubscriptionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "plans_lemonVariantId_key" ON "plans"("lemonVariantId");

-- CreateIndex
CREATE UNIQUE INDEX "user_subscriptions_lemonSubscriptionId_key" ON "user_subscriptions"("lemonSubscriptionId");

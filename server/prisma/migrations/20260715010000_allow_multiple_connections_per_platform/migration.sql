-- DropIndex
DROP INDEX "connections_userId_platform_key";

-- CreateIndex
CREATE INDEX "connections_userId_platform_idx" ON "connections"("userId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "connections_userId_platform_platformUserId_key" ON "connections"("userId", "platform", "platformUserId");

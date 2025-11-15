-- CreateTable
CREATE TABLE "telegram_links" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "telegramUserId" TEXT NOT NULL,
    "telegramChatId" TEXT NOT NULL,
    "telegramUsername" TEXT,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "telegram_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "telegram_links_userId_key" ON "telegram_links"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "telegram_links_telegramUserId_key" ON "telegram_links"("telegramUserId");

-- CreateIndex
CREATE INDEX "telegram_links_userId_idx" ON "telegram_links"("userId");

-- CreateIndex
CREATE INDEX "telegram_links_telegramUserId_idx" ON "telegram_links"("telegramUserId");

-- AddForeignKey
ALTER TABLE "telegram_links" ADD CONSTRAINT "telegram_links_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

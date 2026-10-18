CREATE TABLE "StatementCategoryRule" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "counterpartyKey" TEXT NOT NULL,
  "counterpartyName" TEXT NOT NULL,
  "direction" TEXT NOT NULL,
  "currency" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StatementCategoryRule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StatementCategoryRule_direction_check" CHECK ("direction" IN ('IN', 'OUT')),
  CONSTRAINT "StatementCategoryRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "StatementCategoryRule_match_key" ON "StatementCategoryRule"("userId", "counterpartyKey", "direction", "currency");
CREATE INDEX "StatementCategoryRule_userId_idx" ON "StatementCategoryRule"("userId");

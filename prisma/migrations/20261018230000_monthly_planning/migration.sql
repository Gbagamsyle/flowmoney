-- CreateTable
CREATE TABLE "MonthlyPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "bufferMinor" DECIMAL(16,0) NOT NULL DEFAULT 0,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanCategory" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "allocatedMinor" DECIMAL(16,0) NOT NULL DEFAULT 0,
    "targetMinor" DECIMAL(16,0) NOT NULL DEFAULT 0,
    "savedMinor" DECIMAL(16,0) NOT NULL DEFAULT 0,
    "targetDate" DATE,
    "matches" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "PlanCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanTransactionLink" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "categoryId" TEXT,
    "obligationId" TEXT,
    "ignored" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PlanTransactionLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanningAction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanningAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyPlan_userId_month_key" ON "MonthlyPlan"("userId", "month");

-- CreateIndex
CREATE INDEX "PlanCategory_planId_idx" ON "PlanCategory"("planId");

-- CreateIndex
CREATE INDEX "PlanTransactionLink_transactionId_idx" ON "PlanTransactionLink"("transactionId");

-- CreateIndex
CREATE INDEX "PlanTransactionLink_categoryId_idx" ON "PlanTransactionLink"("categoryId");

-- CreateIndex
CREATE INDEX "PlanTransactionLink_obligationId_idx" ON "PlanTransactionLink"("obligationId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanTransactionLink_planId_transactionId_key" ON "PlanTransactionLink"("planId", "transactionId");

-- CreateIndex
CREATE INDEX "PlanningAction_userId_idx" ON "PlanningAction"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanningAction_transactionId_kind_key" ON "PlanningAction"("transactionId", "kind");

-- AddForeignKey
ALTER TABLE "MonthlyPlan" ADD CONSTRAINT "MonthlyPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanCategory" ADD CONSTRAINT "PlanCategory_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MonthlyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanTransactionLink" ADD CONSTRAINT "PlanTransactionLink_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MonthlyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanTransactionLink" ADD CONSTRAINT "PlanTransactionLink_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "StatementTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanTransactionLink" ADD CONSTRAINT "PlanTransactionLink_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PlanCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanTransactionLink" ADD CONSTRAINT "PlanTransactionLink_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "Obligation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningAction" ADD CONSTRAINT "PlanningAction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningAction" ADD CONSTRAINT "PlanningAction_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "StatementTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Financial and destination invariants are enforced as well as validated by the API.
ALTER TABLE "MonthlyPlan" ADD CONSTRAINT "MonthlyPlan_valid" CHECK ("bufferMinor" >= 0 AND "revision" >= 0 AND "month" ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$' AND "currency" ~ '^[A-Z]{3}$');
ALTER TABLE "PlanCategory" ADD CONSTRAINT "PlanCategory_valid" CHECK ("allocatedMinor" >= 0 AND "savedMinor" >= 0 AND "targetMinor" >= 0 AND "kind" IN ('EXPENSE', 'SAVINGS') AND "group" IN ('Essentials', 'Everyday spending', 'Goals', 'Other') AND jsonb_typeof("matches") = 'array');
ALTER TABLE "PlanTransactionLink" ADD CONSTRAINT "PlanTransactionLink_destination" CHECK ((CASE WHEN "categoryId" IS NOT NULL THEN 1 ELSE 0 END) + (CASE WHEN "obligationId" IS NOT NULL THEN 1 ELSE 0 END) + (CASE WHEN "ignored" THEN 1 ELSE 0 END) = 1);
ALTER TABLE "PlanningAction" ADD CONSTRAINT "PlanningAction_kind" CHECK ("kind" IN ('INCOME', 'OBLIGATION'));

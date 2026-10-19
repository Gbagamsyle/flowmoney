ALTER TABLE "MonthlyPlan" ADD COLUMN "mode" TEXT NOT NULL DEFAULT 'LINKED', ADD COLUMN "startingFundsMinor" DECIMAL(16,0) NOT NULL DEFAULT 0;
DROP INDEX "MonthlyPlan_userId_month_key";
CREATE UNIQUE INDEX "MonthlyPlan_userId_month_mode_key" ON "MonthlyPlan"("userId", "month", "mode");
ALTER TABLE "MonthlyPlan" ADD CONSTRAINT "MonthlyPlan_source_valid" CHECK ("mode" IN ('LINKED', 'STANDALONE') AND "startingFundsMinor" >= 0 AND ("mode" = 'STANDALONE' OR "startingFundsMinor" = 0));

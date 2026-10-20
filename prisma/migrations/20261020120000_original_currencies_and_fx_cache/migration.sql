-- Legacy income/obligation currencies are deliberately unknown until the owner confirms them.
ALTER TABLE "ExpectedIncome" ADD COLUMN "currency" TEXT;
ALTER TABLE "Obligation" ADD COLUMN "currency" TEXT;
CREATE TABLE "ExchangeRateSnapshot" (
  "base" TEXT NOT NULL,
  "rates" JSONB NOT NULL,
  "asOf" TIMESTAMP(3) NOT NULL,
  "nextUpdate" TIMESTAMP(3) NOT NULL,
  "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExchangeRateSnapshot_pkey" PRIMARY KEY ("base")
);

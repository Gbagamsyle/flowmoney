ALTER TABLE "User"
ADD COLUMN "preferredCurrency" TEXT NOT NULL DEFAULT 'NGN',
ADD COLUMN "currencyConfirmedAt" TIMESTAMP(3);

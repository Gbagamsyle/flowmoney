CREATE TABLE "StatementImport" (
 "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "digest" TEXT NOT NULL,
 "format" TEXT NOT NULL, "currency" TEXT NOT NULL, "parserVersion" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'REVIEW', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "importedAt" TIMESTAMP(3), CONSTRAINT "StatementImport_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "StatementImport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "StatementImport_status_check" CHECK ("status" IN ('REVIEW', 'IMPORTED'))
);
CREATE UNIQUE INDEX "StatementImport_userId_digest_key" ON "StatementImport"("userId", "digest");
CREATE INDEX "StatementImport_userId_createdAt_idx" ON "StatementImport"("userId", "createdAt");
CREATE TABLE "StatementTransaction" (
 "id" TEXT NOT NULL, "importId" TEXT NOT NULL, "sourceRow" INTEGER NOT NULL,
 "date" DATE NOT NULL, "description" TEXT NOT NULL, "amountMinor" DECIMAL(16,0) NOT NULL,
 "direction" TEXT NOT NULL, "category" TEXT NOT NULL, "parsedCategory" TEXT NOT NULL,
 "confidence" DOUBLE PRECISION NOT NULL, "reason" TEXT NOT NULL,
 "approved" BOOLEAN NOT NULL DEFAULT false, "reviewedAt" TIMESTAMP(3),
 CONSTRAINT "StatementTransaction_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "StatementTransaction_importId_fkey" FOREIGN KEY ("importId") REFERENCES "StatementImport"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "StatementTransaction_amount_check" CHECK ("amountMinor" > 0 AND "amountMinor" <= 1000000000000),
 CONSTRAINT "StatementTransaction_direction_check" CHECK ("direction" IN ('IN', 'OUT')),
 CONSTRAINT "StatementTransaction_confidence_check" CHECK ("confidence" >= 0 AND "confidence" <= 1)
);
CREATE UNIQUE INDEX "StatementTransaction_importId_sourceRow_key" ON "StatementTransaction"("importId", "sourceRow");
CREATE INDEX "StatementTransaction_importId_approved_idx" ON "StatementTransaction"("importId", "approved");

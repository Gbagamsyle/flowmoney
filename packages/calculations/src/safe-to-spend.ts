export type FinancialPositionInput = {
  currentFunds: number;
  protectedObligations: number;
  minimumBuffer: number;
};

export function calculateSafeToSpend({
  currentFunds,
  protectedObligations,
  minimumBuffer,
}: FinancialPositionInput) {
  return Math.max(0, currentFunds - protectedObligations - minimumBuffer);
}

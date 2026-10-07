export function calculateCurrentFunds(balance: number, pendingIncome: number) {
  return Math.max(0, balance + pendingIncome);
}

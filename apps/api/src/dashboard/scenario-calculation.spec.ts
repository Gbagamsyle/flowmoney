import { describe, expect, it } from 'vitest';
import { calculateScenarioPosition } from '@flowmoney/calculations';

describe('calculateScenarioPosition', () => {
  it('keeps expected income out of safe-to-spend and includes it in projected position', () => {
    const result = calculateScenarioPosition({
      currentFunds: 500_000,
      protectedObligations: 280_000,
      minimumBuffer: 50_000,
      pendingIncome: 300_000,
      fundsChange: 0,
      additionalObligations: 0,
      expectedIncomeChange: 0,
    });

    expect(result).toMatchObject({
      currentFunds: 500_000,
      protectedObligations: 280_000,
      minimumBuffer: 50_000,
      safeToSpend: 170_000,
      projectedPosition: 470_000,
      shortfall: 0,
    });
  });

  it('recalculates buffer and shortfall for additional spending and obligations', () => {
    const result = calculateScenarioPosition({
      currentFunds: 500_000,
      protectedObligations: 280_000,
      minimumBuffer: 50_000,
      pendingIncome: 300_000,
      fundsChange: -100_000,
      additionalObligations: 150_000,
      expectedIncomeChange: 0,
    });

    expect(result).toMatchObject({
      currentFunds: 400_000,
      protectedObligations: 430_000,
      minimumBuffer: 40_000,
      safeToSpend: 0,
      projectedPosition: 230_000,
      shortfall: 70_000,
    });
  });

  it('keeps a projected income decrease out of safe-to-spend', () => {
    const result = calculateScenarioPosition({
      currentFunds: 500_000,
      protectedObligations: 280_000,
      minimumBuffer: 50_000,
      pendingIncome: 300_000,
      fundsChange: 0,
      additionalObligations: 0,
      expectedIncomeChange: -100_000,
    });

    expect(result.safeToSpend).toBe(170_000);
    expect(result.projectedPosition).toBe(370_000);
  });
});

import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ScenariosService } from './scenarios.service.js';

describe('ScenariosService', () => {
  const baseline = {
    preferredCurrency: 'NGN',
    currentFunds: 500_000,
    protectedObligations: 280_000,
    minimumBuffer: 50_000,
    pendingIncome: 300_000,
    safeToSpend: 170_000,
    projectedPosition: 470_000,
    expectedIncome: [
      { amount: 300_000, expectedDate: new Date(Date.now() + 7 * 86_400_000), status: 'EXPECTED' },
    ],
  };

  function createService() {
    const dashboardService = { getDashboard: vi.fn().mockResolvedValue(baseline) };
    const service = new ScenariosService(dashboardService as never);
    return { service, dashboardService };
  }

  it('compares the baseline to a purchase scenario without mutating stored data', async () => {
    const { service, dashboardService } = createService();

    const result = await service.evaluate('clerk-user-id', { addedExpense: 250_000 });

    expect(result).toMatchObject({
      preferredCurrency: 'NGN',
      baseline: { safeToSpend: 170_000, projectedPosition: 470_000 },
      scenario: {
        safeToSpend: 0,
        projectedPosition: 220_000,
        shortfall: 80_000,
        shortfallRisk: 'MEDIUM',
        upcomingObligationsAtRisk: 80_000,
      },
      warnings: ['Upcoming obligations and the selected safety buffer may not be fully covered.'],
    });
    expect(dashboardService.getDashboard).toHaveBeenCalledWith('clerk-user-id');
    expect(Object.keys(dashboardService)).toEqual(['getDashboard']);
  });

  it('excludes income delayed into the selected window from projected income only', async () => {
    const { service } = createService();

    const result = await service.evaluate('clerk-user-id', { expectedIncomeDelayDays: 14 });

    expect(result.scenario.delayedIncome).toBe(300_000);
    expect(result.scenario.pendingIncome).toBe(0);
    expect(result.scenario.safeToSpend).toBe(170_000);
    expect(result.scenario.projectedPosition).toBe(170_000);
  });

  it('reduces projected income without changing safe-to-spend', async () => {
    const { service } = createService();

    const result = await service.evaluate('clerk-user-id', { expectedIncomeReduction: 100_000 });

    expect(result.scenario.incomeReduction).toBe(100_000);
    expect(result.scenario.pendingIncome).toBe(200_000);
    expect(result.scenario.safeToSpend).toBe(170_000);
    expect(result.scenario.projectedPosition).toBe(370_000);
  });

  it('uses a hypothetical safety buffer override', async () => {
    const { service } = createService();

    const result = await service.evaluate('clerk-user-id', { bufferOverride: 100_000 });

    expect(result.scenario.safetyBuffer).toBe(100_000);
    expect(result.scenario.safeToSpend).toBe(120_000);
    expect(result.baseline.safetyBuffer).toBe(50_000);
    expect(result.baseline.safeToSpend).toBe(170_000);
  });

  it('rejects invalid delay and negative changes', async () => {
    const { service } = createService();

    await expect(service.evaluate('clerk-user-id', { expectedIncomeDelayDays: 366 }))
      .rejects.toBeInstanceOf(BadRequestException);
    await expect(service.evaluate('clerk-user-id', { addedExpense: -1 }))
      .rejects.toBeInstanceOf(BadRequestException);
    await expect(service.evaluate('clerk-user-id', { bufferOverride: -1 }))
      .rejects.toBeInstanceOf(BadRequestException);
  });
});

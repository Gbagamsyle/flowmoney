import { describe, expect, it, vi } from 'vitest';

import {
  convertAmount,
  originalCurrency,
} from '../currencies/currency.logic.js';
const fx = {
  quote: async (sources: any[], target: string) => {
    sources.forEach(originalCurrency);
    return {
      target,
      estimated: sources.some((c) => c !== target),
      asOf: null,
      stale: false,
      convert: (n: string, from: string) =>
        convertAmount(n, from, target, { USD: 1, NGN: 2 }),
    };
  },
};
import { DashboardService } from './dashboard.service.js';

describe('DashboardService', () => {
  it('rounds a decimal buffer correctly and avoids phantom tiny shortfalls', async () => {
    const prisma = {
      financialAccount: {
        findMany: vi
          .fn()
          .mockResolvedValue([{ balance: '0.35', currency: 'NGN' }]),
      },
      expectedIncome: { findMany: vi.fn().mockResolvedValue([]) },
      obligation: {
        findMany: vi
          .fn()
          .mockResolvedValue([
            {
              id: 'bill',
              title: 'Small bill',
              currency: 'NGN',
              amount: '0.31',
              status: 'PENDING',
              dueDate: new Date(Date.now() + 86400000),
            },
          ]),
      },
    };
    const users = {
      findByClerkId: vi
        .fn()
        .mockResolvedValue({ id: 'owner', preferredCurrency: 'NGN' }),
    };
    const result = await new DashboardService(
      prisma as never,
      users as never,
      fx as never,
    ).getDashboard('clerk');
    expect(result).toMatchObject({
      currentFunds: 0.35,
      minimumBuffer: 0.04,
      protectedObligations: 0.31,
      safeToSpend: 0,
      warnings: [],
    });
  });
  it('does not report a zero balance when the database is unavailable', async () => {
    const users = {
      findByClerkId: vi
        .fn()
        .mockRejectedValue(
          Object.assign(new Error('unavailable'), { code: 'P1001' }),
        ),
    };
    const service = new DashboardService(
      {} as never,
      users as never,
      fx as never,
    );
    await expect(service.getDashboard('clerk')).rejects.toThrow('unavailable');
    expect(users.findByClerkId).toHaveBeenCalledWith('clerk', true);
  });
  it('keeps expected income separate from current funds and excludes received or cancelled income', async () => {
    const user = { id: 'local-user-id', preferredCurrency: 'NGN' };
    const prisma = {
      financialAccount: {
        findMany: vi.fn().mockResolvedValue([
          { balance: '300000', currency: 'NGN' },
          { balance: '120000', currency: 'NGN' },
        ]),
      },
      expectedIncome: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'income-1',
            title: 'Client work',
            currency: 'NGN',
            amount: '250000',
            status: 'EXPECTED',
            confidence: 'CONFIRMED',
            expectedDate: new Date(Date.now() + 7 * 86_400_000),
          },
          {
            id: 'income-2',
            title: 'Contract',
            currency: 'NGN',
            amount: '50000',
            status: 'PARTIAL',
            confidence: 'LIKELY',
            expectedDate: new Date(Date.now() + 10 * 86_400_000),
          },
          {
            id: 'income-3',
            title: 'Received',
            currency: 'NGN',
            amount: '10000',
            status: 'RECEIVED',
            confidence: 'CONFIRMED',
            expectedDate: new Date(),
          },
          {
            id: 'income-4',
            title: 'Cancelled',
            currency: 'NGN',
            amount: '20000',
            status: 'CANCELLED',
            confidence: 'UNCERTAIN',
            expectedDate: new Date(),
          },
        ]),
      },
      obligation: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'rent',
            title: 'Rent',
            currency: 'NGN',
            amount: '120000',
            status: 'PENDING',
            dueDate: new Date(Date.now() + 3 * 86_400_000),
          },
          {
            id: 'paid',
            title: 'Paid bill',
            currency: 'NGN',
            amount: '25000',
            status: 'PAID',
            dueDate: new Date(),
          },
          {
            id: 'skipped',
            title: 'Skipped bill',
            currency: 'NGN',
            amount: '5000',
            status: 'SKIPPED',
            dueDate: new Date(),
          },
        ]),
      },
    };
    const usersService = { findByClerkId: vi.fn().mockResolvedValue(user) };
    const service = new DashboardService(
      prisma as never,
      usersService as never,
      fx as never,
    );

    const result = await service.getDashboard('clerk-user-id');

    expect(result).toMatchObject({
      currentFunds: 420000,
      pendingIncome: 300000,
      projectedIncome: 300000,
      expectedIncomeByConfidence: {
        CONFIRMED: 250000,
        LIKELY: 50000,
        UNCERTAIN: 0,
      },
      protectedObligations: 120000,
      minimumBuffer: 42000,
      safeToSpend: 258000,
      projectedPosition: 558000,
      preferredCurrency: 'NGN',
      riskLevel: 'LOW',
      warnings: [],
    });
  });

  it('converts mixed-currency funds before coverage calculations without changing originals', async () => {
    const prisma = {
      financialAccount: {
        findMany: vi
          .fn()
          .mockResolvedValue([{ balance: '100', currency: 'USD' }]),
      },
      expectedIncome: { findMany: vi.fn().mockResolvedValue([]) },
      obligation: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'rent',
            title: 'Rent',
            currency: 'NGN',
            amount: '150',
            status: 'PENDING',
            dueDate: new Date(Date.now() + 86_400_000),
          },
        ]),
      },
    };
    const usersService = {
      findByClerkId: vi
        .fn()
        .mockResolvedValue({ id: 'local-user-id', preferredCurrency: 'NGN' }),
    };
    const service = new DashboardService(
      prisma as never,
      usersService as never,
      fx as never,
    );

    const result = await service.getDashboard('clerk-user-id');

    expect(result).toMatchObject({
      currentFunds: 200,
      projectedIncome: 0,
      protectedObligations: 150,
      minimumBuffer: 20,
      safeToSpend: 30,
      projectedPosition: 30,
      riskLevel: 'LOW',
      warnings: [],
    });
  });

  it('excludes overdue and explicitly delayed income from projected funds and reports days late', async () => {
    const dueDate = new Date();
    dueDate.setHours(0, 0, 0, 0);
    dueDate.setDate(dueDate.getDate() - 5);
    const prisma = {
      financialAccount: {
        findMany: vi
          .fn()
          .mockResolvedValue([{ balance: '100000', currency: 'NGN' }]),
      },
      expectedIncome: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'late',
            title: 'Client Website',
            currency: 'NGN',
            amount: '80000',
            status: 'EXPECTED',
            confidence: 'LIKELY',
            expectedDate: dueDate,
          },
          {
            id: 'marked-late',
            title: 'Invoice',
            currency: 'NGN',
            amount: '20000',
            status: 'DELAYED',
            confidence: 'CONFIRMED',
            expectedDate: dueDate,
          },
        ]),
      },
      obligation: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const usersService = {
      findByClerkId: vi
        .fn()
        .mockResolvedValue({ id: 'local-user-id', preferredCurrency: 'NGN' }),
    };
    const service = new DashboardService(
      prisma as never,
      usersService as never,
      fx as never,
    );

    const result = await service.getDashboard('clerk-user-id');

    expect(result).toMatchObject({
      pendingIncome: 100000,
      projectedIncome: 0,
      projectedPosition: 90000,
      riskLevel: 'MEDIUM',
    });
    expect(
      result.warnings.filter(
        (warning) => warning.code === 'expected_income_delayed',
      ),
    ).toEqual([
      expect.objectContaining({
        title: 'Client Website',
        daysLate: 5,
        amount: 80000,
        severity: 'MEDIUM',
      }),
      expect.objectContaining({
        title: 'Invoice',
        daysLate: 5,
        amount: 20000,
        severity: 'MEDIUM',
      }),
    ]);
  });
});

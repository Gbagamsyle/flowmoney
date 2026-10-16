import { describe, expect, it, vi } from 'vitest';

import { DashboardService } from './dashboard.service.js';

describe('DashboardService', () => {
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
          { id: 'income-1', title: 'Client work', amount: '250000', status: 'EXPECTED', confidence: 'CONFIRMED', expectedDate: new Date(Date.now() + 7 * 86_400_000) },
          { id: 'income-2', title: 'Contract', amount: '50000', status: 'PARTIAL', confidence: 'LIKELY', expectedDate: new Date(Date.now() + 10 * 86_400_000) },
          { id: 'income-3', title: 'Received', amount: '10000', status: 'RECEIVED', confidence: 'CONFIRMED', expectedDate: new Date() },
          { id: 'income-4', title: 'Cancelled', amount: '20000', status: 'CANCELLED', confidence: 'UNCERTAIN', expectedDate: new Date() },
        ]),
      },
      obligation: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'rent', title: 'Rent', amount: '120000', status: 'PENDING', dueDate: new Date(Date.now() + 3 * 86_400_000) },
          { id: 'paid', title: 'Paid bill', amount: '25000', status: 'PAID', dueDate: new Date() },
          { id: 'skipped', title: 'Skipped bill', amount: '5000', status: 'SKIPPED', dueDate: new Date() },
        ]),
      },
    };
    const usersService = { findByClerkId: vi.fn().mockResolvedValue(user) };
    const service = new DashboardService(prisma as never, usersService as never);

    const result = await service.getDashboard('clerk-user-id');

    expect(result).toMatchObject({
      currentFunds: 420000,
      pendingIncome: 300000,
      projectedIncome: 300000,
      expectedIncomeByConfidence: { CONFIRMED: 250000, LIKELY: 50000, UNCERTAIN: 0 },
      protectedObligations: 120000,
      minimumBuffer: 42000,
      safeToSpend: 258000,
      projectedPosition: 558000,
      preferredCurrency: 'NGN',
      riskLevel: 'LOW',
      warnings: [],
    });
  });

  it('reports a protected-obligation shortfall and warns when stored funds have another currency', async () => {
    const prisma = {
      financialAccount: {
        findMany: vi.fn().mockResolvedValue([{ balance: '100', currency: 'USD' }]),
      },
      expectedIncome: { findMany: vi.fn().mockResolvedValue([]) },
      obligation: {
        findMany: vi.fn().mockResolvedValue([{ id: 'rent', title: 'Rent', amount: '150', status: 'PENDING', dueDate: new Date(Date.now() + 86_400_000) }]),
      },
    };
    const usersService = { findByClerkId: vi.fn().mockResolvedValue({ id: 'local-user-id', preferredCurrency: 'NGN' }) };
    const service = new DashboardService(prisma as never, usersService as never);

    const result = await service.getDashboard('clerk-user-id');

    expect(result).toMatchObject({
      currentFunds: 100,
      projectedIncome: 0,
      protectedObligations: 150,
      minimumBuffer: 10,
      safeToSpend: 0,
      projectedPosition: -60,
      riskLevel: 'HIGH',
      warnings: [
        {
          code: 'protected_obligations_shortfall',
          severity: 'HIGH',
          amount: 60,
        },
        { code: 'obligation_at_risk', title: 'Rent', amount: 60, severity: 'HIGH' },
        { code: 'currency_mismatch', severity: 'LOW' },
      ],
    });
  });

  it('excludes overdue and explicitly delayed income from projected funds and reports days late', async () => {
    const dueDate = new Date();
    dueDate.setHours(0, 0, 0, 0);
    dueDate.setDate(dueDate.getDate() - 5);
    const prisma = {
      financialAccount: { findMany: vi.fn().mockResolvedValue([{ balance: '100000', currency: 'NGN' }]) },
      expectedIncome: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'late', title: 'Client Website', amount: '80000', status: 'EXPECTED', confidence: 'LIKELY', expectedDate: dueDate },
          { id: 'marked-late', title: 'Invoice', amount: '20000', status: 'DELAYED', confidence: 'CONFIRMED', expectedDate: dueDate },
        ]),
      },
      obligation: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const usersService = { findByClerkId: vi.fn().mockResolvedValue({ id: 'local-user-id', preferredCurrency: 'NGN' }) };
    const service = new DashboardService(prisma as never, usersService as never);

    const result = await service.getDashboard('clerk-user-id');

    expect(result).toMatchObject({ pendingIncome: 100000, projectedIncome: 0, projectedPosition: 90000, riskLevel: 'MEDIUM' });
    expect(result.warnings.filter((warning) => warning.code === 'expected_income_delayed')).toEqual([
      expect.objectContaining({ title: 'Client Website', daysLate: 5, amount: 80000, severity: 'MEDIUM' }),
      expect.objectContaining({ title: 'Invoice', daysLate: 5, amount: 20000, severity: 'MEDIUM' }),
    ]);
  });
});
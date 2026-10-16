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
          { amount: '120000', status: 'PENDING' },
          { amount: '25000', status: 'PAID' },
          { amount: '5000', status: 'SKIPPED' },
        ]),
      },
    };
    const usersService = { findByClerkId: vi.fn().mockResolvedValue(user) };
    const service = new DashboardService(prisma as never, usersService as never);

    const result = await service.getDashboard('clerk-user-id');

    expect(result).toMatchObject({
      currentFunds: 300000,
      pendingIncome: 300000,
      protectedObligations: 120000,
      minimumBuffer: 30000,
      safeToSpend: 150000,
    });
  });
});
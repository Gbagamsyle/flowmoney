import { describe, expect, it, vi } from 'vitest';

import { DashboardService } from './dashboard.service.js';

describe('DashboardService', () => {
  it('keeps expected income separate from current funds and excludes received or cancelled income', async () => {
    const user = { id: 'local-user-id' };
    const prisma = {
      financialAccount: {
        findMany: vi.fn().mockResolvedValue([{ balance: '300000' }]),
      },
      expectedIncome: {
        findMany: vi.fn().mockResolvedValue([
          { amount: '250000', status: 'EXPECTED' },
          { amount: '50000', status: 'PARTIAL' },
          { amount: '10000', status: 'RECEIVED' },
          { amount: '20000', status: 'CANCELLED' },
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
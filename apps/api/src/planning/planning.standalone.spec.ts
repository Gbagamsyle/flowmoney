import { describe, expect, it, vi } from 'vitest';
import { PlanningService } from './planning.service.js';
import { mode } from './planning.validation.js';
const user = { id: 'owner', preferredCurrency: 'NGN', deletedAt: null };
describe('standalone plan isolation', () => {
  it('rejects unknown modes and defaults existing clients to linked plans', () => {
    expect(mode(undefined)).toBe('LINKED');
    expect(mode('STANDALONE')).toBe('STANDALONE');
    expect(() => mode('untrusted')).toThrow();
  });
  it('loads only standalone funds and never queries linked financial data', async () => {
    const tx = {
      monthlyPlan: {
        findUnique: vi
          .fn()
          .mockResolvedValue({
            id: 'standalone',
            revision: 0,
            currency: 'NGN',
            mode: 'STANDALONE',
            startingFundsMinor: 500000,
            bufferMinor: 50000,
            categories: [],
            links: [],
          }),
      },
      financialAccount: { findMany: vi.fn() },
      obligation: { findMany: vi.fn() },
      expectedIncome: { findMany: vi.fn() },
      statementTransaction: { findMany: vi.fn() },
      planningAction: { findMany: vi.fn() },
    };
    const prisma = { $transaction: vi.fn(async (action: any) => action(tx)) };
    const service = new PlanningService(
      prisma as any,
      { getOrCreateForClerk: vi.fn().mockResolvedValue(user) } as any,
    );
    const result = await service.get('clerk', '2026-10', 'STANDALONE');
    expect(result).toMatchObject({
      mode: 'STANDALONE',
      fundsMinor: 500000,
      unallocatedMinor: 450000,
      accountCount: 0,
      expectedMinor: 0,
      protectedMinor: 0,
      transactions: [],
      obligations: [],
      timeline: [],
      actions: [],
    });
    expect(tx.monthlyPlan.findUnique.mock.calls[0][0].where).toEqual({
      userId_month_mode: {
        userId: 'owner',
        month: '2026-10',
        mode: 'STANDALONE',
      },
    });
    for (const model of [
      tx.financialAccount,
      tx.obligation,
      tx.expectedIncome,
      tx.statementTransaction,
      tx.planningAction,
    ])
      expect(model.findMany).not.toHaveBeenCalled();
  });
  it('requires an explicit standalone amount and creates categories without statement matching', async () => {
    const prisma = {
      monthlyPlan: { create: vi.fn() },
      financialAccount: { findMany: vi.fn() },
    };
    const service = new PlanningService(
      prisma as any,
      { getOrCreateForClerk: vi.fn().mockResolvedValue(user) } as any,
    );
    vi.spyOn(service, 'get').mockResolvedValue({ mode: 'STANDALONE' } as any);
    await expect(
      service.create('clerk', { month: '2026-10', mode: 'STANDALONE' }),
    ).rejects.toThrow();
    await service.create('clerk', {
      month: '2026-10',
      mode: 'STANDALONE',
      startingFundsMinor: 125005,
    });
    const data = prisma.monthlyPlan.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      mode: 'STANDALONE',
      startingFundsMinor: 125005,
      bufferMinor: 12501,
    });
    expect(
      data.categories.create.every((c: any) => c.matches.length === 0),
    ).toBe(true);
    expect(prisma.financialAccount.findMany).not.toHaveBeenCalled();
    expect(service.get).toHaveBeenCalledWith('clerk', '2026-10', 'STANDALONE');
  });
  it('blocks statement linking and future-record creation from standalone plans', async () => {
    const tx = {
      monthlyPlan: {
        findFirst: vi
          .fn()
          .mockResolvedValue({
            id: 'standalone',
            month: '2026-10',
            userId: 'owner',
            currency: 'NGN',
            mode: 'STANDALONE',
          }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      statementTransaction: { findFirst: vi.fn() },
    };
    const service = new PlanningService(
      { $transaction: vi.fn(async (action: any) => action(tx)) } as any,
      { getOrCreateForClerk: vi.fn().mockResolvedValue(user) } as any,
    );
    await expect(
      service.assign('clerk', 'standalone', {
        revision: 0,
        transactionId: 'row',
        destination: 'ignore',
      }),
    ).rejects.toThrow('Standalone plans');
    await expect(
      service.fromStatement('clerk', 'standalone', {
        revision: 0,
        transactionId: 'row',
        kind: 'INCOME',
        title: 'Future',
        amountMinor: 100,
        date: '2099-01-01',
      }),
    ).rejects.toThrow('Standalone plans');
    expect(tx.statementTransaction.findFirst).not.toHaveBeenCalled();
  });
  it('updates standalone funds inside the revision-guarded save and reopens the same mode', async () => {
    const tx = {
      monthlyPlan: {
        findFirst: vi
          .fn()
          .mockResolvedValue({
            id: 'standalone',
            month: '2026-10',
            userId: 'owner',
            currency: 'NGN',
            mode: 'STANDALONE',
          }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        update: vi.fn(),
      },
      planCategory: {
        findMany: vi.fn().mockResolvedValue([]),
        deleteMany: vi.fn(),
      },
    };
    const service = new PlanningService(
      { $transaction: vi.fn(async (action: any) => action(tx)) } as any,
      { getOrCreateForClerk: vi.fn().mockResolvedValue(user) } as any,
    );
    vi.spyOn(service, 'get').mockResolvedValue({} as any);
    await service.save('clerk', 'standalone', {
      revision: 0,
      startingFundsMinor: 12345,
      bufferMinor: 1000,
      categories: [],
    });
    expect(tx.monthlyPlan.update).toHaveBeenCalledWith({
      where: { id: 'standalone' },
      data: { bufferMinor: 1000, startingFundsMinor: 12345 },
    });
    expect(service.get).toHaveBeenCalledWith('clerk', '2026-10', 'STANDALONE');
  });
});

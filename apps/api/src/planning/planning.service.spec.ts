import { describe, expect, it, vi } from 'vitest';
import { PlanningService } from './planning.service.js';
function fixture() {
  const tx = {
    monthlyPlan: {
      findFirst: vi.fn().mockResolvedValue({
        id: 'plan',
        userId: 'owner',
        month: '2026-10',
        currency: 'NGN',
        mode: 'LINKED',
      }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      update: vi.fn(),
    },
    planCategory: {
      findMany: vi.fn().mockResolvedValue([{ id: 'owned' }]),
      findFirst: vi.fn(),
      deleteMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    statementTransaction: { findFirst: vi.fn() },
    planTransactionLink: { upsert: vi.fn(), deleteMany: vi.fn() },
    obligation: { findFirst: vi.fn(), create: vi.fn() },
    expectedIncome: { create: vi.fn() },
    planningAction: { create: vi.fn() },
    user: {
      findUniqueOrThrow: vi
        .fn()
        .mockResolvedValue({ preferredCurrency: 'NGN' }),
    },
  };
  const users = {
    getOrCreateForClerk: vi.fn().mockResolvedValue({
      id: 'owner',
      preferredCurrency: 'NGN',
      deletedAt: null,
    }),
  };
  const prisma = { $transaction: vi.fn(async (action: any) => action(tx)) };
  const service = new PlanningService(prisma as any, users as any);
  vi.spyOn(service, 'get').mockResolvedValue({ month: '2026-10' } as any);
  return { tx, service, users };
}
describe('planning ownership and confirmation', () => {
  it('rejects a foreign plan before mutation', async () => {
    const { tx, service } = fixture();
    tx.monthlyPlan.findFirst.mockResolvedValue(null);
    await expect(
      service.assign('clerk', 'foreign', {
        revision: 0,
        transactionId: 'x',
        destination: 'ignore',
      }),
    ).rejects.toThrow('Plan not found');
    expect(tx.monthlyPlan.findFirst).toHaveBeenCalledWith({
      where: { id: 'foreign', userId: 'owner' },
    });
    expect(tx.monthlyPlan.updateMany).not.toHaveBeenCalled();
  });
  it('rejects a stale revision before changing categories or transaction links', async () => {
    const { tx, service } = fixture();
    tx.monthlyPlan.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.assign('clerk', 'plan', {
        revision: 0,
        transactionId: 'x',
        destination: 'ignore',
      }),
    ).rejects.toThrow('another window');
    expect(tx.planTransactionLink.upsert).not.toHaveBeenCalled();
  });
  it('requires an approved, owned, same-month, same-currency transaction', async () => {
    const { tx, service } = fixture();
    tx.statementTransaction.findFirst.mockResolvedValue(null);
    await expect(
      service.assign('clerk', 'plan', {
        revision: 0,
        transactionId: 'foreign',
        destination: 'ignore',
      }),
    ).rejects.toThrow('Approved transaction');
    expect(
      tx.statementTransaction.findFirst.mock.calls[0][0].where,
    ).toMatchObject({
      approved: true,
      statement: { userId: 'owner', status: 'IMPORTED', currency: 'NGN' },
    });
    expect(tx.planTransactionLink.upsert).not.toHaveBeenCalled();
  });
  it('rejects foreign categories and credits as spending', async () => {
    const { tx, service } = fixture();
    tx.statementTransaction.findFirst.mockResolvedValue({
      id: 'tx',
      direction: 'OUT',
    });
    tx.planCategory.findFirst.mockResolvedValue(null);
    await expect(
      service.assign('clerk', 'plan', {
        revision: 0,
        transactionId: 'tx',
        destination: 'foreign',
        kind: 'CATEGORY',
      }),
    ).rejects.toThrow('category not found');
    tx.statementTransaction.findFirst.mockResolvedValue({
      id: 'tx',
      direction: 'IN',
    });
    await expect(
      service.assign('clerk', 'plan', {
        revision: 0,
        transactionId: 'tx',
        destination: 'ignore',
      }),
    ).rejects.toThrow('Only outgoing');
  });
  it('does not accept arbitrary category ids on a whole-plan save', async () => {
    const { tx, service } = fixture();
    await expect(
      service.save('clerk', 'plan', {
        revision: 0,
        bufferMinor: 0,
        categories: [
          {
            id: 'foreign',
            name: 'Food',
            group: 'Other',
            kind: 'EXPENSE',
            allocatedMinor: 1,
            targetMinor: 0,
            savedMinor: 0,
            targetDate: null,
            matches: [],
          },
        ],
      }),
    ).rejects.toThrow('Category not found');
    expect(tx.planCategory.update).not.toHaveBeenCalled();
  });
  it('creates a future income only after explicit confirmation and starts it uncertain', async () => {
    const { tx, service } = fixture();
    tx.statementTransaction.findFirst.mockResolvedValue({
      id: 'tx',
      direction: 'IN',
    });
    tx.expectedIncome.create.mockResolvedValue({ id: 'income' });
    await service.fromStatement('clerk', 'plan', {
      revision: 0,
      transactionId: 'tx',
      kind: 'INCOME',
      title: 'Next payment',
      amountMinor: 10000,
      date: '2099-01-01',
    });
    expect(tx.expectedIncome.create.mock.calls[0][0].data).toMatchObject({
      userId: 'owner',
      confidence: 'UNCERTAIN',
      status: 'EXPECTED',
    });
    expect(tx.planningAction.create).toHaveBeenCalledWith({
      data: {
        userId: 'owner',
        transactionId: 'tx',
        kind: 'INCOME',
        recordId: 'income',
      },
    });
    expect(tx.obligation.create).not.toHaveBeenCalled();
  });
});

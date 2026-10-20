import { describe, expect, it, vi } from 'vitest';
import { CurrenciesService } from './currencies.service.js';
const owner = { id: 'owner', preferredCurrency: 'USD', deletedAt: null };
describe('original-currency confirmation boundaries', () => {
  it('only assigns a currency to the owned, unchanged, unconfirmed record and never writes its amount', async () => {
    const model = { updateMany: vi.fn().mockResolvedValue({ count: 1 }) };
    const prisma = {
      user: { findUnique: vi.fn().mockResolvedValue(owner) },
      expectedIncome: model,
    };
    const service = new CurrenciesService(prisma as any, {} as any);
    await service.confirm('clerk', {
      kind: 'INCOME',
      id: 'row',
      amount: '150000.00',
      currency: 'NGN',
    });
    const args = model.updateMany.mock.calls[0][0];
    expect(args.where).toMatchObject({
      id: 'row',
      userId: 'owner',
      currency: null,
    });
    expect(args.where.amount.toString()).toBe('150000');
    expect(args.data).toEqual({ currency: 'NGN' });
  });
  it('rejects other owners, stale amounts, confirmed records and malformed choices', async () => {
    const model = { updateMany: vi.fn().mockResolvedValue({ count: 0 }) };
    const service = new CurrenciesService(
      {
        user: { findUnique: vi.fn().mockResolvedValue(owner) },
        obligation: model,
      } as any,
      {} as any,
    );
    await expect(
      service.confirm('clerk', {
        kind: 'OBLIGATION',
        id: 'other-owner',
        amount: '100',
        currency: 'NGN',
      }),
    ).rejects.toThrow(/changed/);
    await expect(
      service.confirm('clerk', {
        kind: 'OBLIGATION',
        id: 'row',
        amount: '100',
        currency: 'FAKE',
      }),
    ).rejects.toThrow(/supported/);
    await expect(
      service.confirm('clerk', {
        kind: 'INCOME',
        id: 'row',
        amount: '1e10000',
        currency: 'NGN',
      }),
    ).rejects.toThrow();
  });
  it('returns only owned estimates and never exposes the raw provider table', async () => {
    const prisma = {
      user: { findUnique: vi.fn().mockResolvedValue(owner) },
      financialAccount: {
        findMany: vi
          .fn()
          .mockResolvedValue([{ id: 'a', balance: '150000', currency: 'NGN' }]),
      },
      expectedIncome: {
        findMany: vi
          .fn()
          .mockResolvedValue([{ id: 'old', amount: '50', currency: null }]),
      },
      obligation: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const fx = {
      quote: vi
        .fn()
        .mockResolvedValue({
          target: 'USD',
          estimated: true,
          asOf: '2026-10-20',
          stale: false,
          convert: () => 100,
        }),
    };
    const result = await new CurrenciesService(
      prisma as any,
      fx as any,
    ).display('clerk');
    expect(result).toMatchObject({
      currency: 'USD',
      currentFunds: 100,
      unverifiedCount: 1,
      amounts: [{ id: 'a', amount: '150000', converted: 100, currency: 'NGN' }],
    });
    expect(result).not.toHaveProperty('rates');
    expect(prisma.financialAccount.findMany).toHaveBeenCalledWith({
      where: { userId: 'owner' },
    });
  });
});

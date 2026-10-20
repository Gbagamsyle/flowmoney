import { describe, expect, it, vi } from 'vitest';
import { AccountsService } from '../accounts/accounts.service.js';
import { ExpectedIncomeService } from '../expected-income/expected-income.service.js';
import { ObligationsService } from '../obligations/obligations.service.js';
const users = () => ({
  getOrCreateForClerk: vi
    .fn()
    .mockResolvedValue({ id: 'owner', preferredCurrency: 'USD' }),
  findByClerkId: vi
    .fn()
    .mockResolvedValue({ id: 'owner', preferredCurrency: 'USD' }),
});
describe('source currency write boundaries', () => {
  it('stores explicitly entered source currencies even when the display preference differs', async () => {
    const account = { create: vi.fn().mockResolvedValue({}) },
      income = { create: vi.fn().mockResolvedValue({}) },
      obligation = { create: vi.fn().mockResolvedValue({}) };
    const prisma = {
      financialAccount: account,
      expectedIncome: income,
      obligation,
    };
    await new AccountsService(prisma as any, users() as any).createAccount(
      'clerk',
      { name: 'Naira account', balance: 150000, currency: 'NGN' },
    );
    await new ExpectedIncomeService(prisma as any, users() as any).create(
      'clerk',
      {
        title: 'Naira income',
        amount: 10000,
        currency: 'NGN',
        expectedDate: '2099-01-01',
        confidence: 'CONFIRMED',
      },
    );
    await new ObligationsService(prisma as any, users() as any).create(
      'clerk',
      {
        title: 'Naira bill',
        amount: 5000,
        currency: 'NGN',
        dueDate: '2099-01-01',
        priority: 'ESSENTIAL',
      },
    );
    expect(account.create.mock.calls[0][0].data).toMatchObject({
      balance: 150000,
      currency: 'NGN',
    });
    expect(income.create.mock.calls[0][0].data).toMatchObject({
      amount: 10000,
      currency: 'NGN',
    });
    expect(obligation.create.mock.calls[0][0].data).toMatchObject({
      amount: 5000,
      currency: 'NGN',
    });
  });
  it('never changes original currency through an account or obligation edit', async () => {
    const account = {
      findFirst: vi.fn().mockResolvedValue({ currency: 'NGN' }),
      update: vi.fn(),
    };
    const obligation = {
      findFirst: vi.fn().mockResolvedValue({ currency: 'NGN' }),
      update: vi.fn(),
    };
    await expect(
      new AccountsService(
        { financialAccount: account } as any,
        users() as any,
      ).updateAccount('clerk', 'a', { currency: 'USD' }),
    ).rejects.toThrow(/original account currency/);
    await expect(
      new ObligationsService({ obligation } as any, users() as any).update(
        'clerk',
        'o',
        { currency: 'USD' },
      ),
    ).rejects.toThrow(/original currency/);
    expect(account.update).not.toHaveBeenCalled();
    expect(obligation.update).not.toHaveBeenCalled();
  });
  it('requires legacy confirmation before changing an unknown-source amount', async () => {
    const obligation = {
      findFirst: vi.fn().mockResolvedValue({ currency: null }),
      update: vi.fn(),
    };
    await expect(
      new ObligationsService({ obligation } as any, users() as any).update(
        'clerk',
        'o',
        { amount: 100 },
      ),
    ).rejects.toThrow(/Confirm the original currency/);
    expect(obligation.update).not.toHaveBeenCalled();
  });
});

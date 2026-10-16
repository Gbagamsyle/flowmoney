import { describe, expect, it, vi } from 'vitest';

import { UsersService } from './users.service.js';

describe('UsersService', () => {
  it('creates or updates the local user from the Clerk identity', async () => {
    const prisma = {
      user: {
        upsert: vi.fn().mockResolvedValue({
          id: 'local-user-id',
          clerkId: 'clerk-user-123',
          email: 'user@example.com',
        }),
      },
    } as any;

    const service = new UsersService(prisma);

    const result = await service.getOrCreateForClerk({
      clerkId: 'clerk-user-123',
      email: 'user@example.com',
      emailVerified: true,
    });

    expect(result).toMatchObject({
      id: 'local-user-id',
      clerkId: 'clerk-user-123',
      email: 'user@example.com',
    });
    expect(prisma.user.upsert).toHaveBeenCalledWith({
      where: { clerkId: 'clerk-user-123' },
      update: { email: 'user@example.com' },
      create: {
        clerkId: 'clerk-user-123',
        email: 'user@example.com',
      },
    });
  });

  it('links an existing email-matched user to the current Clerk identity', async () => {
    const existingUser = {
      id: 'local-user-id',
      clerkId: 'previous-clerk-user',
      email: 'user@example.com',
      onboardingCompletedAt: new Date('2026-10-10T09:00:00.000Z'),
    };
    const linkedUser = { ...existingUser, clerkId: 'clerk-user-123' };
    const prisma = {
      user: {
        upsert: vi.fn().mockRejectedValue({ code: 'P2002', meta: { target: ['email'] } }),
        findFirst: vi.fn().mockResolvedValue(existingUser),
        update: vi.fn().mockResolvedValue(linkedUser),
      },
    } as any;

    const service = new UsersService(prisma);
    const result = await service.getOrCreateForClerk({
      clerkId: 'clerk-user-123',
      email: 'user@example.com',
      emailVerified: true,
    });

    expect(result).toEqual(linkedUser);
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { email: 'user@example.com', deletedAt: null },
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'local-user-id' },
      data: { clerkId: 'clerk-user-123' },
    });
  });

  it('does not recover an email collision unless the email is verified', async () => {
    const prisma = {
      user: {
        upsert: vi.fn().mockRejectedValue({ code: 'P2002', meta: { target: ['email'] } }),
        findFirst: vi.fn(),
      },
    } as any;

    const service = new UsersService(prisma);

    await expect(service.getOrCreateForClerk({
      clerkId: 'new-clerk-user',
      email: 'user@example.com',
      emailVerified: false,
    })).rejects.toMatchObject({ status: 409 });
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });

  it('does not relink a deleted profile after the email has been anonymized', async () => {
    const uniqueConflict = { code: 'P2002', meta: { target: ['email'] } };
    const prisma = {
      user: {
        upsert: vi.fn().mockRejectedValue(uniqueConflict),
        findFirst: vi.fn().mockResolvedValue(null),
      },
    } as any;

    const service = new UsersService(prisma);

    await expect(service.getOrCreateForClerk({
      clerkId: 'replacement-clerk-user',
      email: 'user@example.com',
      emailVerified: true,
    })).rejects.toBe(uniqueConflict);
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { email: 'user@example.com', deletedAt: null },
    });
  });

  it('records onboarding completion for the authenticated Clerk user', async () => {
    const completedAt = new Date('2026-10-10T09:00:00.000Z');
    const prisma = {
      user: {
        upsert: vi.fn().mockResolvedValue({ id: 'local-user-id', clerkId: 'clerk-user-123' }),
        update: vi.fn().mockResolvedValue({
          clerkId: 'clerk-user-123',
          onboardingCompletedAt: completedAt,
        }),
      },
    } as any;

    const service = new UsersService(prisma);
    const result = await service.markOnboardingComplete('clerk-user-123');

    expect(result).toMatchObject({ clerkId: 'clerk-user-123', onboardingCompletedAt: completedAt });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { clerkId: 'clerk-user-123' },
      data: { onboardingCompletedAt: expect.any(Date) },
    });
    expect(prisma.user.upsert).toHaveBeenCalledWith({
      where: { clerkId: 'clerk-user-123' },
      update: {},
      create: { clerkId: 'clerk-user-123', email: 'clerk-user-123@flowmoney.local' },
    });
  });

  it('updates a supported primary currency and marks it confirmed', async () => {
    const prisma = {
      user: {
        upsert: vi.fn().mockResolvedValue({ id: 'local-user-id' }),
        update: vi.fn().mockResolvedValue({ preferredCurrency: 'GBP', currencyConfirmedAt: new Date() }),
      },
    } as any;

    const service = new UsersService(prisma);
    const result = await service.updatePreferredCurrency('clerk-user-123', 'GBP');

    expect(result).toMatchObject({ preferredCurrency: 'GBP' });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { clerkId: 'clerk-user-123' },
      data: { preferredCurrency: 'GBP', currencyConfirmedAt: expect.any(Date) },
      select: { preferredCurrency: true, currencyConfirmedAt: true },
    });
  });

  it('rejects unsupported primary currencies', async () => {
    const prisma = { user: { upsert: vi.fn(), update: vi.fn() } } as any;
    const service = new UsersService(prisma);

    await expect(service.updatePreferredCurrency('clerk-user-123', 'FAKE')).rejects.toMatchObject({ status: 409 });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('falls back to a transient in-memory user when the database is unavailable', async () => {
    const prisma = {
      user: {
        upsert: vi.fn().mockRejectedValue({ code: 'P1001', message: "Can't reach database server" }),
        update: vi.fn().mockRejectedValue({ code: 'P1001', message: "Can't reach database server" }),
      },
    } as any;

    const service = new UsersService(prisma);

    const user = await service.getOrCreateForClerk({
      clerkId: 'clerk-user-123',
      email: 'user@example.com',
    });

    const completed = await service.markOnboardingComplete('clerk-user-123');

    expect(user).toMatchObject({
      id: 'clerk-user-123',
      clerkId: 'clerk-user-123',
      email: 'user@example.com',
      onboardingCompletedAt: null,
    });
    expect(completed).toMatchObject({
      clerkId: 'clerk-user-123',
      onboardingCompletedAt: expect.any(Date),
    });
  });

  it('removes financial records and anonymizes the user on account deletion', async () => {
    const transaction = {
      expectedIncome: { deleteMany: vi.fn().mockResolvedValue({ count: 2 }) },
      obligation: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
      financialAccount: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
      incomeSource: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
      user: { update: vi.fn().mockResolvedValue({}) },
    };
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({ id: 'local-user-id', deletedAt: null }),
      },
      $transaction: vi.fn(async (callback: (tx: typeof transaction) => Promise<void>) => callback(transaction)),
    } as any;

    const service = new UsersService(prisma);
    await service.deleteAccount('clerk-user-123');

    expect(transaction.expectedIncome.deleteMany).toHaveBeenCalledWith({ where: { userId: 'local-user-id' } });
    expect(transaction.obligation.deleteMany).toHaveBeenCalledWith({ where: { userId: 'local-user-id' } });
    expect(transaction.financialAccount.deleteMany).toHaveBeenCalledWith({ where: { userId: 'local-user-id' } });
    expect(transaction.incomeSource.deleteMany).toHaveBeenCalledWith({ where: { userId: 'local-user-id' } });
    expect(transaction.user.update).toHaveBeenCalledWith({
      where: { id: 'local-user-id' },
      data: {
        clerkId: 'deleted:local-user-id',
        email: 'deleted+local-user-id@deleted.flowmoney.invalid',
        onboardingCompletedAt: null,
        deletedAt: expect.any(Date),
      },
    });
  });

  it('makes repeated account deletion a no-op', async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({ id: 'local-user-id', deletedAt: new Date() }),
      },
      $transaction: vi.fn(),
    } as any;

    const service = new UsersService(prisma);
    await service.deleteAccount('clerk-user-123');

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

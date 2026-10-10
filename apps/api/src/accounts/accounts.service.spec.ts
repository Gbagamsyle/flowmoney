import { describe, expect, it, vi } from 'vitest';

import { AccountsService } from './accounts.service.js';

describe('AccountsService', () => {
  it('creates, updates, and deletes a fund for the authenticated user', async () => {
    const prisma = {
      financialAccount: {
        create: vi.fn().mockResolvedValue({ id: 'acct_1', name: 'Main Account', balance: 450000 }),
        findMany: vi.fn().mockResolvedValue([{ id: 'acct_1', name: 'Main Account', balance: 450000 }]),
        findFirst: vi.fn().mockResolvedValue({ id: 'acct_1', userId: 'user_1', name: 'Main Account', balance: 450000 }),
        update: vi.fn().mockResolvedValue({ id: 'acct_1', name: 'Main Account', balance: 500000 }),
        delete: vi.fn().mockResolvedValue({ id: 'acct_1' }),
      },
    } as any;

    const usersService = {
      getOrCreateForClerk: vi.fn().mockResolvedValue({ id: 'user_1', clerkId: 'clerk_123' }),
      findByClerkId: vi.fn().mockResolvedValue({ id: 'user_1', clerkId: 'clerk_123' }),
    } as any;

    const service = new AccountsService(prisma, usersService);

    const created = await service.createAccount('clerk_123', { name: 'Main Account', balance: 450000 });
    const updated = await service.updateAccount('clerk_123', 'acct_1', {
      name: 'Main Account',
      balance: 500000,
    });
    const removed = await service.deleteAccount('clerk_123', 'acct_1');

    expect(created).toMatchObject({ name: 'Main Account', balance: 450000 });
    expect(updated).toMatchObject({ name: 'Main Account', balance: 500000 });
    expect(removed).toMatchObject({ id: 'acct_1' });
    expect(prisma.financialAccount.update).toHaveBeenCalledWith({
      where: { id: 'acct_1' },
      data: { name: 'Main Account', balance: 500000 },
    });
  });
});

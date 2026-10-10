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
});

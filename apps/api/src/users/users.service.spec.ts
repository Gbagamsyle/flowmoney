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
      update: { email: 'clerk-user-123@flowmoney.local' },
      create: { clerkId: 'clerk-user-123', email: 'clerk-user-123@flowmoney.local' },
    });
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
});

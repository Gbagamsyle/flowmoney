import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ObligationsService } from './obligations.service.js';

describe('ObligationsService', () => {
  const user = { id: 'local-user-id', clerkId: 'clerk-user-id' };

  it('creates an obligation with a due date and priority', async () => {
    const prisma = {
      obligation: { create: vi.fn().mockResolvedValue({ id: 'obligation-1', status: 'PENDING' }) },
    } as any;
    const users = { getOrCreateForClerk: vi.fn().mockResolvedValue(user) } as any;
    const service = new ObligationsService(prisma, users);

    const result = await service.create('clerk-user-id', {
      title: 'Rent', amount: 120000, dueDate: '2026-10-15', priority: 'ESSENTIAL',
    });

    expect(result).toMatchObject({ id: 'obligation-1', status: 'PENDING' });
    expect(prisma.obligation.create).toHaveBeenCalledWith({
      data: {
        userId: 'local-user-id',
        title: 'Rent',
        amount: 120000,
        dueDate: new Date('2026-10-15'),
        priority: 'ESSENTIAL',
        status: 'PENDING',
      },
    });
  });

  it('updates an owned obligation including its lifecycle status', async () => {
    const prisma = {
      obligation: {
        findFirst: vi.fn().mockResolvedValue({ id: 'obligation-1', userId: user.id }),
        update: vi.fn().mockResolvedValue({ id: 'obligation-1', status: 'FUNDED', amount: 125000 }),
      },
    } as any;
    const users = { findByClerkId: vi.fn().mockResolvedValue(user) } as any;
    const service = new ObligationsService(prisma, users);

    const result = await service.update('clerk-user-id', 'obligation-1', {
      amount: 125000,
      status: 'FUNDED',
    });

    expect(result).toMatchObject({ status: 'FUNDED', amount: 125000 });
    expect(prisma.obligation.findFirst).toHaveBeenCalledWith({
      where: { id: 'obligation-1', userId: user.id },
    });
    expect(prisma.obligation.update).toHaveBeenCalledWith({
      where: { id: 'obligation-1' },
      data: { amount: 125000, status: 'FUNDED' },
    });
  });

  it('rejects updates for obligations owned by another user', async () => {
    const prisma = { obligation: { findFirst: vi.fn().mockResolvedValue(null), update: vi.fn() } } as any;
    const users = { findByClerkId: vi.fn().mockResolvedValue(user) } as any;
    const service = new ObligationsService(prisma, users);

    await expect(service.update('clerk-user-id', 'other-obligation', { status: 'PAID' }))
      .rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.obligation.update).not.toHaveBeenCalled();
  });

  it('rejects unsupported lifecycle statuses', async () => {
    const prisma = { obligation: { findFirst: vi.fn(), update: vi.fn() } } as any;
    const users = { findByClerkId: vi.fn().mockResolvedValue(user) } as any;
    const service = new ObligationsService(prisma, users);

    await expect(service.update('clerk-user-id', 'obligation-1', { status: 'RECURRING' }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.obligation.findFirst).not.toHaveBeenCalled();
  });

  it('deletes only an obligation belonging to the authenticated user', async () => {
    const prisma = {
      obligation: {
        findFirst: vi.fn().mockResolvedValue({ id: 'obligation-1', userId: user.id }),
        delete: vi.fn().mockResolvedValue({ id: 'obligation-1' }),
      },
    } as any;
    const users = { findByClerkId: vi.fn().mockResolvedValue(user) } as any;
    const service = new ObligationsService(prisma, users);

    await service.delete('clerk-user-id', 'obligation-1');

    expect(prisma.obligation.delete).toHaveBeenCalledWith({ where: { id: 'obligation-1' } });
  });
});

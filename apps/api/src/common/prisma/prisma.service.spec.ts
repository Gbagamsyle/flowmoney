import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from './prisma.service.js';

describe('PrismaService startup connection', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('retries transient connection failures and starts when the database recovers', async () => {
    vi.useFakeTimers();
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const prisma = new PrismaService();
    const connect = vi
      .spyOn(prisma, '$connect')
      .mockRejectedValueOnce({ errorCode: 'P1001' })
      .mockRejectedValueOnce({ code: 'P1002' })
      .mockResolvedValue(undefined);

    const initialization = prisma.onModuleInit();
    await vi.runAllTimersAsync();
    await initialization;

    expect(connect).toHaveBeenCalledTimes(3);
  });

  it('does not retry permanent authentication/configuration failures', async () => {
    const prisma = new PrismaService();
    const connect = vi
      .spyOn(prisma, '$connect')
      .mockRejectedValue({ errorCode: 'P1000' });

    await expect(prisma.onModuleInit()).rejects.toMatchObject({ errorCode: 'P1000' });
    expect(connect).toHaveBeenCalledTimes(1);
  });
});

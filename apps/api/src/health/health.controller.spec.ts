import { describe, it, expect, vi } from 'vitest';
import { HealthController } from './health.controller.js';
import type { PrismaService } from '../common/prisma/prisma.service.js';
describe('readiness', () => {
  it('returns only readiness after database probe', async () => {
    const query = vi.fn().mockResolvedValue([{ secret: 'not returned' }]);
    const controller = new HealthController({
      $queryRaw: query,
    } as unknown as PrismaService);
    expect(await controller.ready()).toEqual({ status: 'ok' });
    expect(query).toHaveBeenCalledOnce();
  });
  it('does not disclose database errors', async () => {
    const controller = new HealthController({
      $queryRaw: vi
        .fn()
        .mockRejectedValue(new Error('private connection details')),
    } as unknown as PrismaService);
    await expect(controller.ready()).rejects.toThrow('Service not ready.');
  });
});

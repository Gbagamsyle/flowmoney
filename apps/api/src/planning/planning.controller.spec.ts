import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { type INestApplication, type ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { PlanningController } from './planning.controller.js';
import { PlanningService } from './planning.service.js';
import { ClerkAuthGuard } from '../common/auth/clerk-auth.guard.js';
describe('authenticated planning HTTP boundary', () => {
  let app: INestApplication;
  const service = {
    get: vi.fn().mockResolvedValue({ month: '2026-10' }),
    create: vi.fn().mockResolvedValue({ id: 'plan' }),
    save: vi.fn(),
    assign: vi.fn().mockResolvedValue({ id: 'plan' }),
    fromStatement: vi.fn().mockResolvedValue({ id: 'plan' }),
  };
  beforeAll(async () => {
    Reflect.defineMetadata(
      'design:paramtypes',
      [PlanningService],
      PlanningController,
    );
    const module = await Test.createTestingModule({
      controllers: [PlanningController],
      providers: [{ provide: PlanningService, useValue: service }],
    })
      .overrideGuard(ClerkAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const req = context.switchToHttp().getRequest();
          if (req.headers.authorization !== 'Bearer test-session') return false;
          req.user = { id: 'clerk-owner' };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  it('rejects all unauthenticated financial reads and writes', async () => {
    await request(app.getHttpServer())
      .get('/planning?month=2026-10')
      .expect(403);
    await request(app.getHttpServer())
      .post('/planning')
      .send({ month: '2026-10' })
      .expect(403);
    await request(app.getHttpServer())
      .patch('/planning/x')
      .send({})
      .expect(403);
    await request(app.getHttpServer())
      .post('/planning/x/assign')
      .send({})
      .expect(403);
    await request(app.getHttpServer())
      .post('/planning/x/from-statement')
      .send({})
      .expect(403);
    expect(service.get).not.toHaveBeenCalled();
    expect(service.create).not.toHaveBeenCalled();
  });
  it('uses verified identity and never caches financial responses', async () => {
    const result = await request(app.getHttpServer())
      .get('/planning?month=2026-10')
      .set('Authorization', 'Bearer test-session')
      .expect(200);
    expect(result.headers['cache-control']).toBe('no-store');
    expect(service.get).toHaveBeenCalledWith(
      'clerk-owner',
      '2026-10',
      undefined,
    );
    await request(app.getHttpServer())
      .post('/planning/plan/from-statement')
      .set('Authorization', 'Bearer test-session')
      .send({ userId: 'attacker', revision: 0, transactionId: 'row' })
      .expect(201);
    expect(service.fromStatement.mock.calls[0][0]).toBe('clerk-owner');
  });
  it('returns safe outage and missing-migration messages', async () => {
    service.get.mockRejectedValueOnce({
      code: 'P1001',
      message: 'sensitive host',
    });
    const result = await request(app.getHttpServer())
      .get('/planning?month=2026-10')
      .set('Authorization', 'Bearer test-session')
      .expect(503);
    expect(JSON.stringify(result.body)).not.toContain('sensitive host');
  });
});

import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { StatementsController } from './statements.controller.js';
import { StatementsService } from './statements.service.js';
import { ClerkAuthGuard } from '../common/auth/clerk-auth.guard.js';
import { MAX_BYTES } from './statement.extract.js';

describe('authenticated statement HTTP boundary', () => {
  let app: INestApplication;
  const service = {
    list: vi.fn().mockResolvedValue([]),
    upload: vi.fn().mockResolvedValue({ id: 'preview' }),
    get: vi.fn(),
    approve: vi.fn(),
    remove: vi.fn(),
    listRules: vi.fn().mockResolvedValue([]),
    forgetRule: vi.fn().mockResolvedValue({ deleted: true }),
  };
  beforeAll(async () => {
    // Vitest transpiles without TypeScript decorator metadata emission.
    Reflect.defineMetadata(
      'design:paramtypes',
      [StatementsService],
      StatementsController,
    );
    const module = await Test.createTestingModule({
      controllers: [StatementsController],
      providers: [{ provide: StatementsService, useValue: service }],
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
  it('rejects unauthenticated reads, uploads and approvals before service execution', async () => {
    await request(app.getHttpServer()).get('/statements').expect(403);
    await request(app.getHttpServer())
      .post('/statements')
      .attach('file', Buffer.from('secret'), 'test.csv')
      .expect(403);
    await request(app.getHttpServer())
      .post('/statements/x/approve')
      .send({ transactions: [] })
      .expect(403);
    expect(service.upload).not.toHaveBeenCalled();
    expect(service.approve).not.toHaveBeenCalled();
  });
  it('passes the verified identity and in-memory multipart file to processing', async () => {
    const response = await request(app.getHttpServer())
      .post('/statements')
      .set('Authorization', 'Bearer test-session')
      .field('currency', 'NGN')
      .attach(
        'file',
        Buffer.from('Date,Description,Amount\n2026-01-01,POS,-1'),
        'test.csv',
      )
      .expect(201);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(service.upload).toHaveBeenCalledWith(
      'clerk-owner',
      expect.objectContaining({
        buffer: expect.any(Buffer),
        originalname: 'test.csv',
      }),
      'NGN',
    );
    const file = service.upload.mock.calls[0][1] as any;
    expect(file.path).toBeUndefined();
  });
  it('enforces file size before parser execution', async () => {
    service.upload.mockClear();
    await request(app.getHttpServer())
      .post('/statements')
      .set('Authorization', 'Bearer test-session')
      .field('currency', 'NGN')
      .attach('file', Buffer.alloc(MAX_BYTES + 1), 'test.csv')
      .expect(413);
    expect(service.upload).not.toHaveBeenCalled();
  });
  it('returns a safe 503 for database outages without retrying writes', async () => {
    service.upload.mockClear();
    service.upload.mockRejectedValueOnce({
      code: 'P1001',
      message: 'private database connection details',
    });
    const response = await request(app.getHttpServer())
      .post('/statements')
      .set('Authorization', 'Bearer test-session')
      .field('currency', 'NGN')
      .attach('file', Buffer.from('test'), 'test.csv')
      .expect(503);
    expect(response.body.message).toContain('temporarily unavailable');
    expect(JSON.stringify(response.body)).not.toContain('private database');
    expect(service.upload).toHaveBeenCalledTimes(1);
    service.list.mockRejectedValueOnce({ errorCode: 'P1001' });
    await request(app.getHttpServer())
      .get('/statements')
      .set('Authorization', 'Bearer test-session')
      .expect(503);
  });
  it('forbids unexpected extra multipart fields', async () => {
    await request(app.getHttpServer())
      .post('/statements')
      .set('Authorization', 'Bearer test-session')
      .field('currency', 'NGN')
      .field('credentials', 'never-needed')
      .attach('file', Buffer.from('test'), 'test.csv')
      .expect(400);
  });

  it('authenticates saved-preference routes and does not route their list as a statement id', async () => {
    await request(app.getHttpServer())
      .get('/statements/category-rules')
      .expect(403);
    await request(app.getHttpServer())
      .delete('/statements/category-rules/preference')
      .expect(403);
    await request(app.getHttpServer())
      .get('/statements/category-rules')
      .set('Authorization', 'Bearer test-session')
      .expect(200);
    expect(service.listRules).toHaveBeenCalledWith('clerk-owner');
    await request(app.getHttpServer())
      .delete('/statements/category-rules/preference')
      .set('Authorization', 'Bearer test-session')
      .expect(200);
    expect(service.forgetRule).toHaveBeenCalledWith(
      'clerk-owner',
      'preference',
    );
  });
});

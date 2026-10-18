import { describe, expect, it, vi } from 'vitest';
import { CLASSIFIER_VERSION } from './statement-categorization.js';
import { StatementsService } from './statements.service.js';

function setup() {
  const record = {
    currency: 'NGN',
    id: 'import',
    userId: 'owner',
    status: 'REVIEW',
    transactions: [
      {
        id: 'row',
        sourceRow: 2,
        date: new Date('2026-01-01'),
        description: 'POS',
        amountMinor: 100,
        direction: 'OUT',
        category: 'Purchase',
        parsedCategory: 'Purchase',
        confidence: 0.85,
        approved: false,
      },
    ],
  };
  const tx = {
    statementCategoryRule: { upsert: vi.fn() },
    statementImport: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    statementTransaction: { updateMany: vi.fn() },
  };
  const prisma = {
    statementCategoryRule: {
      findMany: vi.fn().mockResolvedValue([]),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    statementImport: {
      findFirst: vi.fn().mockResolvedValue(record),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(record),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(async (fn: (x: typeof tx) => unknown) => fn(tx)),
  };
  const users = {
    findByClerkId: vi.fn().mockResolvedValue({ id: 'owner' }),
    getOrCreateForClerk: vi.fn().mockResolvedValue({ id: 'owner' }),
  };
  return {
    service: new StatementsService(prisma as any, users as any),
    prisma,
    users,
    tx,
    record,
  };
}
describe('StatementsService', () => {
  it('scopes reads and deletes to the local owner', async () => {
    const { service, prisma } = setup();
    await service.remove('clerk', 'import');
    expect(prisma.statementImport.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'import', userId: 'owner' } }),
    );
    expect(prisma.statementImport.deleteMany).toHaveBeenCalledWith({
      where: { id: 'import', userId: 'owner' },
    });
  });
  it('does not reveal statements belonging to another user', async () => {
    const { service, prisma } = setup();
    prisma.statementImport.findFirst.mockResolvedValue(null as any);
    await expect(service.get('other', 'import')).rejects.toMatchObject({
      status: 404,
    });
  });
  it('requires explicit valid review, rejects duplicate/foreign IDs', async () => {
    const { service, prisma } = setup();
    for (const transactions of [
      [{ id: 'row', category: 'Purchase' }],
      [{ id: 'foreign', category: 'Purchase', reviewed: true }],
      [{ id: 'row', category: 'Fake', reviewed: true }],
      [
        { id: 'row', category: 'Purchase', reviewed: true },
        { id: 'row', category: 'Purchase', reviewed: true },
      ],
    ])
      await expect(
        service.approve('clerk', 'import', { transactions }),
      ).rejects.toMatchObject({ status: 400 });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('imports only explicitly approved rows atomically and preserves parsed provenance', async () => {
    const { service, tx } = setup();
    await service.approve('clerk', 'import', {
      transactions: [
        { id: 'row', category: 'Own-account Transfer', reviewed: true },
      ],
    });
    expect(tx.statementImport.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'import', userId: 'owner', status: 'REVIEW' },
      }),
    );
    expect(tx.statementTransaction.updateMany).toHaveBeenCalledExactlyOnceWith({
      where: { importId: 'import', id: { in: ['row'] } },
      data: {
        category: 'Own-account Transfer',
        approved: true,
        reviewedAt: expect.any(Date),
      },
    });
  });
  it('prevents concurrent or repeated approval', async () => {
    const { service, tx } = setup();
    tx.statementImport.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.approve('clerk', 'import', {
        transactions: [{ id: 'row', category: 'Purchase', reviewed: true }],
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(tx.statementTransaction.updateMany).not.toHaveBeenCalled();
  });
  it('clears raw upload buffers after success and failure without writing files', async () => {
    const { service, prisma } = setup();
    const buffer = Buffer.from('Date,Description,Amount\n2026-01-01,POS,-1');
    await service.upload(
      'clerk',
      { buffer, originalname: 'statement.csv' },
      'NGN',
    );
    expect(buffer.every((b) => b === 0)).toBe(true);
    expect(prisma.statementImport.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          parserVersion: CLASSIFIER_VERSION,
          transactions: {
            create: [expect.objectContaining({ parsedCategory: 'Purchase' })],
          },
        }),
      }),
    );
    const invalid = Buffer.from('secret');
    await expect(
      service.upload(
        'clerk',
        { buffer: invalid, originalname: 'fake.pdf' },
        'NGN',
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(invalid.every((b) => b === 0)).toBe(true);
  });
  it('returns existing import for identical bytes instead of creating duplicates', async () => {
    const { service, prisma, record } = setup();
    prisma.statementImport.findUnique.mockResolvedValue(record as any);
    await service.upload(
      'clerk',
      { buffer: Buffer.from('Date,Description,Amount'), originalname: 'a.csv' },
      'NGN',
    );
    expect(prisma.statementImport.create).not.toHaveBeenCalled();
  });
  it('approves 5,000 rows with a single category update rather than 5,000 writes', async () => {
    const { service, tx, record } = setup();
    const template = record.transactions[0];
    record.transactions = Array.from({ length: 5000 }, (_, i) => ({
      ...template,
      id: `row-${i}`,
      sourceRow: i + 2,
    }));
    await service.approve('clerk', 'import', {
      transactions: record.transactions.map((r) => ({
        id: r.id,
        category: 'Purchase',
        reviewed: true,
      })),
    });
    expect(tx.statementTransaction.updateMany).toHaveBeenCalledTimes(1);
    expect(
      tx.statementTransaction.updateMany.mock.calls[0][0].where.id.in,
    ).toHaveLength(5000);
  });
  it('excludes unapproved rows from imported summary metrics', async () => {
    const { service, record } = setup();
    record.status = 'IMPORTED';
    record.transactions.push({
      ...record.transactions[0],
      id: 'excluded',
      amountMinor: 50000,
    });
    record.transactions[0].approved = true;
    const data = await service.get('clerk', 'import');
    expect(data.summary.totalOutflow).toBe(1);
  });

  it('refreshes draft suggestions without overwriting original provenance or imported history', async () => {
    const { service, record, prisma } = setup();
    record.transactions[0].description = 'Transfer from Ada';
    record.transactions[0].direction = 'IN';
    record.transactions[0].category = 'Unknown';
    record.transactions[0].parsedCategory = 'Unknown';
    const draft = await service.get('clerk', 'import');
    expect(draft.transactions[0]).toMatchObject({
      category: 'External Transfer',
      parsedCategory: 'Unknown',
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.statementCategoryRule.findMany).toHaveBeenCalledWith({
      where: { userId: 'owner', currency: 'NGN' },
    });
    record.status = 'IMPORTED';
    expect(
      (await service.get('clerk', 'import')).transactions[0].category,
    ).toBe('Unknown');
  });
  it('allows explicit import while a transaction purpose remains unspecified', async () => {
    const { service, tx } = setup();
    await service.approve('clerk', 'import', {
      transactions: [{ id: 'row', category: 'Unknown', reviewed: true }],
    });
    expect(tx.statementTransaction.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ category: 'Unknown', approved: true }),
      }),
    );
    expect(tx.statementCategoryRule.upsert).not.toHaveBeenCalled();
  });
  it('remembers only explicitly requested counterparties within the approval transaction', async () => {
    const { service, record, tx } = setup();
    record.transactions[0].description = 'Transfer from Ada Ref 123';
    record.transactions[0].direction = 'IN';
    await service.approve('clerk', 'import', {
      transactions: [
        { id: 'row', category: 'Contribution', reviewed: true, remember: true },
      ],
    });
    expect(tx.statementCategoryRule.upsert).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        where: {
          userId_counterpartyKey_direction_currency: {
            userId: 'owner',
            counterpartyKey: 'transfer:ada',
            direction: 'IN',
            currency: 'NGN',
          },
        },
        create: expect.objectContaining({
          category: 'Contribution',
          userId: 'owner',
        }),
      }),
    );
  });
  it('rejects contradictory remembered purposes and directionally impossible categories', async () => {
    const { service, record, prisma } = setup();
    record.transactions[0].description = 'Transfer from Ada';
    record.transactions[0].direction = 'IN';
    record.transactions.push({ ...record.transactions[0], id: 'row2' });
    await expect(
      service.approve('clerk', 'import', {
        transactions: [
          {
            id: 'row',
            category: 'Contribution',
            reviewed: true,
            remember: true,
          },
          { id: 'row2', category: 'Gift', reviewed: true },
        ],
      }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      service.approve('clerk', 'import', {
        transactions: [{ id: 'row', category: 'Betting', reviewed: true }],
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('forgets preferences only for their owner', async () => {
    const { service, prisma } = setup();
    await service.forgetRule('clerk', 'preference');
    expect(prisma.statementCategoryRule.deleteMany).toHaveBeenCalledWith({
      where: { id: 'preference', userId: 'owner' },
    });
    prisma.statementCategoryRule.deleteMany.mockResolvedValue({ count: 0 });
    await expect(
      service.forgetRule('clerk', 'someone-elses-preference'),
    ).rejects.toMatchObject({ status: 404 });
  });
});

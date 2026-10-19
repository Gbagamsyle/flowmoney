import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import {
  DEFAULT_CATEGORIES,
  monthRange,
  summarizePlan,
  type PlanCategory,
} from './planning.logic.js';
import * as validate from './planning.validation.js';

function cents(value: Prisma.Decimal | number) {
  const amount = Number(new Prisma.Decimal(value).mul(100).toString());
  if (!Number.isSafeInteger(amount))
    throw new BadRequestException(
      'An amount exceeds the supported planning range.',
    );
  return amount;
}
function integer(value: Prisma.Decimal | number) {
  const amount = Number(value);
  if (!Number.isSafeInteger(amount))
    throw new BadRequestException(
      'An amount exceeds the supported planning range.',
    );
  return amount;
}
const day = (value: Date) => value.toISOString().slice(0, 10);
@Injectable()
export class PlanningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}
  private async user(clerkId: string) {
    const user = await this.users.getOrCreateForClerk({
      clerkId,
      requireDatabase: true,
    });
    if (
      !('preferredCurrency' in user) ||
      !('deletedAt' in user) ||
      user.deletedAt
    )
      throw new NotFoundException('Account not found.');
    return user;
  }
  async get(clerkId: string, value: unknown, source?: unknown) {
    const month = validate.month(value);
    const mode = validate.mode(source);
    const standalone = mode === 'STANDALONE';
    const user = await this.user(clerkId);
    return this.prisma.$transaction(
      async (tx) => {
        const plan = await tx.monthlyPlan.findUnique({
          where: { userId_month_mode: { userId: user.id, month, mode } },
          include: {
            categories: { orderBy: { position: 'asc' } },
            links: true,
          },
        });
        const currency = plan?.currency ?? user.preferredCurrency;
        const sameCurrency = currency === user.preferredCurrency;
        const { start, end } = monthRange(month);
        const [accounts, obligations, income, rows, actions] =
          await Promise.all([
            standalone
              ? Promise.resolve([])
              : tx.financialAccount.findMany({ where: { userId: user.id } }),
            standalone
              ? Promise.resolve([])
              : tx.obligation.findMany({
                  where: { userId: user.id },
                  orderBy: { dueDate: 'asc' },
                }),
            standalone
              ? Promise.resolve([])
              : tx.expectedIncome.findMany({
                  where: {
                    userId: user.id,
                    expectedDate: { lt: end },
                    status: { in: ['EXPECTED', 'DELAYED', 'PARTIAL'] },
                  },
                  orderBy: { expectedDate: 'asc' },
                }),
            standalone
              ? Promise.resolve([])
              : tx.statementTransaction.findMany({
                  where: {
                    approved: true,
                    date: { gte: start, lt: end },
                    statement: {
                      userId: user.id,
                      status: 'IMPORTED',
                      currency,
                    },
                  },
                  orderBy: [{ date: 'desc' }, { id: 'asc' }],
                  take: 10001,
                }),
            standalone
              ? Promise.resolve([])
              : tx.planningAction.findMany({
                  where: { userId: user.id },
                  select: { transactionId: true, kind: true },
                }),
          ]);
        if (rows.length > 10000)
          throw new BadRequestException(
            'This month contains more than 10,000 imported rows. Review duplicate statements before planning.',
          );
        const categoryRows: PlanCategory[] = (plan?.categories ?? []).map(
          (c) => ({
            ...c,
            allocatedMinor: integer(c.allocatedMinor),
            targetMinor: integer(c.targetMinor),
            savedMinor: integer(c.savedMinor),
            targetDate: c.targetDate ? day(c.targetDate) : null,
            matches: c.matches as string[],
          }),
        );
        const context = summarizePlan({
          month,
          today: day(new Date()),
          fundsMinor: standalone
            ? plan
              ? integer(plan.startingFundsMinor)
              : 0
            : accounts
                .filter((a) => a.currency === currency)
                .reduce((sum, a) => sum + cents(a.balance), 0),
          bufferMinor: plan ? integer(plan.bufferMinor) : 0,
          categories: categoryRows,
          transactions: rows.map((r) => ({
            id: r.id,
            date: day(r.date),
            description: r.description,
            amountMinor: integer(r.amountMinor),
            direction: r.direction,
            category: r.category,
            importId: r.importId,
          })),
          links: plan?.links ?? [],
          obligations: sameCurrency
            ? obligations.map((o) => ({
                id: o.id,
                title: o.title,
                amountMinor: cents(o.amount),
                date: day(o.dueDate),
                status: o.status,
              }))
            : [],
          income: sameCurrency
            ? income.map((i) => ({
                id: i.id,
                title: i.title,
                amountMinor: cents(i.amount),
                date: day(i.expectedDate),
                status: i.status,
                confidence: i.confidence,
              }))
            : [],
        });
        const ranges = new Map<string, { start: string; end: string }>();
        for (const row of rows) {
          const date = day(row.date);
          const range = ranges.get(row.importId);
          if (!range) ranges.set(row.importId, { start: date, end: date });
          else {
            if (date < range.start) range.start = date;
            if (date > range.end) range.end = date;
          }
        }
        const periods = [...ranges.values()].sort((a, b) =>
          a.start.localeCompare(b.start),
        );
        let overlap = false;
        let lastEnd = '';
        for (const period of periods) {
          if (period.start <= lastEnd) overlap = true;
          if (period.end > lastEnd) lastEnd = period.end;
        }
        return {
          id: plan?.id ?? null,
          mode,
          startingFundsMinor: plan ? integer(plan.startingFundsMinor) : 0,
          revision: plan?.revision ?? 0,
          month,
          currency,
          today: day(new Date()),
          ...context,
          actions,
          currencyMismatch: !standalone && !sameCurrency,
          excludedCurrencies: [
            ...new Set(
              accounts
                .filter((a) => a.currency !== currency)
                .map((a) => a.currency),
            ),
          ],
          overlapWarning: overlap,
          accountCount: accounts.filter((a) => a.currency === currency).length,
          defaults: DEFAULT_CATEGORIES,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
        timeout: 15000,
      },
    );
  }
  async create(clerkId: string, raw: unknown) {
    const body = validate.object(raw);
    const month = validate.month(body.month);
    const user = await this.user(clerkId);
    const mode = validate.mode(body.mode);
    const standalone = mode === 'STANDALONE';
    const startingFundsMinor = standalone
      ? validate.minor(body.startingFundsMinor)
      : 0;
    if (!standalone && body.startingFundsMinor !== undefined)
      throw new BadRequestException(
        'Existing-funds plans use your recorded accounts.',
      );
    const accounts = standalone
      ? []
      : await this.prisma.financialAccount.findMany({
          where: { userId: user.id, currency: user.preferredCurrency },
        });
    const bufferMinor = Math.max(
      0,
      Math.floor(
        (standalone
          ? startingFundsMinor
          : accounts.reduce((sum, a) => sum + cents(a.balance), 0)) / 10,
      ),
    );
    try {
      await this.prisma.monthlyPlan.create({
        data: {
          userId: user.id,
          month,
          mode,
          startingFundsMinor,
          currency: user.preferredCurrency,
          bufferMinor,
          categories: {
            create: DEFAULT_CATEGORIES.map((category, position) => ({
              ...category,
              matches: standalone ? [] : [...category.matches],
              position,
            })),
          },
        },
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002')
        throw new ConflictException(
          'This month already has a plan of this type. Refresh to open it.',
        );
      throw error;
    }
    return this.get(clerkId, month, mode);
  }
  private async mutate(
    clerkId: string,
    id: string,
    revision: unknown,
    action: (
      tx: Prisma.TransactionClient,
      plan: {
        id: string;
        month: string;
        currency: string;
        userId: string;
        mode: string;
      },
    ) => Promise<void>,
  ) {
    const version = validate.revision(revision);
    const user = await this.user(clerkId);
    let month = '';
    let mode = 'LINKED';
    try {
      await this.prisma.$transaction(
        async (tx) => {
          const plan = await tx.monthlyPlan.findFirst({
            where: { id, userId: user.id },
          });
          if (!plan) throw new NotFoundException('Plan not found.');
          month = plan.month;
          mode = plan.mode;
          const updated = await tx.monthlyPlan.updateMany({
            where: { id, userId: user.id, revision: version },
            data: { revision: { increment: 1 } },
          });
          if (!updated.count)
            throw new ConflictException(
              'This plan changed in another window. Refresh before saving.',
            );
          await action(tx, plan);
        },
        { timeout: 15000 },
      );
    } catch (error) {
      if (['P2002', 'P2034'].includes((error as { code?: string }).code ?? ''))
        throw new ConflictException(
          'This item was already saved or changed. Refresh before retrying.',
        );
      throw error;
    }
    return this.get(clerkId, month, mode);
  }
  async save(clerkId: string, id: string, raw: unknown) {
    const body = validate.object(raw);
    const categories = validate.categories(body.categories);
    const buffer = validate.minor(body.bufferMinor);
    return this.mutate(clerkId, id, body.revision, async (tx, plan) => {
      if (
        plan.mode === 'STANDALONE' &&
        categories.some((c) => c.matches.length)
      )
        throw new BadRequestException(
          'Standalone categories cannot match statement history.',
        );
      if (plan.mode !== 'STANDALONE' && body.startingFundsMinor !== undefined)
        throw new BadRequestException(
          'Existing-funds plans use your recorded accounts.',
        );
      const startingFundsMinor =
        body.startingFundsMinor === undefined
          ? undefined
          : validate.minor(body.startingFundsMinor);
      const existing = await tx.planCategory.findMany({
        where: { planId: id },
        select: { id: true },
      });
      const owned = new Set(existing.map((c) => c.id));
      if (categories.some((c) => c.id && !owned.has(c.id)))
        throw new NotFoundException('Category not found.');
      await tx.monthlyPlan.update({
        where: { id },
        data: {
          bufferMinor: buffer,
          ...(startingFundsMinor !== undefined ? { startingFundsMinor } : {}),
        },
      });
      const retained = categories.filter((c) => c.id).map((c) => c.id);
      await tx.planCategory.deleteMany({
        where: { planId: plan.id, id: { notIn: retained } },
      });
      for (const [position, category] of categories.entries()) {
        const { id: categoryId, targetDate, ...data } = category;
        const values = {
          ...data,
          position,
          targetDate: targetDate ? new Date(targetDate + 'T00:00:00Z') : null,
        };
        if (categoryId)
          await tx.planCategory.update({
            where: { id: categoryId },
            data: values,
          });
        else await tx.planCategory.create({ data: { ...values, planId: id } });
      }
    });
  }
  private async transaction(
    tx: Prisma.TransactionClient,
    plan: { month: string; currency: string; userId: string; mode: string },
    transactionId: unknown,
  ) {
    if (plan.mode === 'STANDALONE')
      throw new BadRequestException(
        'Standalone plans do not use account or statement records.',
      );
    if (typeof transactionId !== 'string')
      throw new BadRequestException('Choose a transaction.');
    const { start, end } = monthRange(plan.month);
    const row = await tx.statementTransaction.findFirst({
      where: {
        id: transactionId,
        approved: true,
        date: { gte: start, lt: end },
        statement: {
          userId: plan.userId,
          status: 'IMPORTED',
          currency: plan.currency,
        },
      },
    });
    if (!row)
      throw new NotFoundException(
        'Approved transaction not found in this plan month and currency.',
      );
    return row;
  }
  async assign(clerkId: string, id: string, raw: unknown) {
    const body = validate.object(raw);
    return this.mutate(clerkId, id, body.revision, async (tx, plan) => {
      const row = await this.transaction(tx, plan, body.transactionId);
      if (row.direction !== 'OUT')
        throw new BadRequestException(
          'Only outgoing transactions can be assigned as spending or commitment payments.',
        );
      if (body.destination === 'auto') {
        await tx.planTransactionLink.deleteMany({
          where: { planId: id, transactionId: row.id },
        });
        return;
      }
      let categoryId: string | null = null;
      let obligationId: string | null = null;
      if (body.kind === 'CATEGORY' && typeof body.destination === 'string') {
        const category = await tx.planCategory.findFirst({
          where: { id: body.destination, planId: id, kind: 'EXPENSE' },
        });
        if (!category)
          throw new NotFoundException('Spending category not found.');
        categoryId = category.id;
      } else if (
        body.kind === 'OBLIGATION' &&
        typeof body.destination === 'string'
      ) {
        const user = await tx.user.findUniqueOrThrow({
          where: { id: plan.userId },
        });
        if (user.preferredCurrency !== plan.currency)
          throw new BadRequestException(
            'Commitment currency does not match this plan.',
          );
        const obligation = await tx.obligation.findFirst({
          where: { id: body.destination, userId: plan.userId },
        });
        if (!obligation) throw new NotFoundException('Commitment not found.');
        obligationId = obligation.id;
      } else if (body.destination !== 'ignore')
        throw new BadRequestException(
          'Choose a spending category, commitment or leave this movement separate.',
        );
      await tx.planTransactionLink.upsert({
        where: { planId_transactionId: { planId: id, transactionId: row.id } },
        create: {
          planId: id,
          transactionId: row.id,
          categoryId,
          obligationId,
          ignored: body.destination === 'ignore',
        },
        update: {
          categoryId,
          obligationId,
          ignored: body.destination === 'ignore',
        },
      });
    });
  }
  async fromStatement(clerkId: string, id: string, raw: unknown) {
    const body = validate.object(raw);
    const title = validate.title(body.title);
    const date = validate.date(body.date);
    const amount = validate.minor(body.amountMinor);
    if (!amount || date < day(new Date()))
      throw new BadRequestException(
        'Choose a positive amount and a future or current date.',
      );
    if (!['OBLIGATION', 'INCOME'].includes(String(body.kind)))
      throw new BadRequestException('Choose an obligation or expected income.');
    return this.mutate(clerkId, id, body.revision, async (tx, plan) => {
      const row = await this.transaction(tx, plan, body.transactionId);
      if (
        (body.kind === 'INCOME' && row.direction !== 'IN') ||
        (body.kind === 'OBLIGATION' && row.direction !== 'OUT')
      )
        throw new BadRequestException(
          'Choose a transaction with the correct direction.',
        );
      const user = await tx.user.findUniqueOrThrow({
        where: { id: plan.userId },
      });
      if (plan.currency !== user.preferredCurrency)
        throw new BadRequestException(
          'Change your preference or choose a plan in the same currency before creating this record.',
        );
      const record =
        body.kind === 'OBLIGATION'
          ? await tx.obligation.create({
              data: {
                userId: plan.userId,
                title,
                amount: new Prisma.Decimal(amount).div(100),
                dueDate: new Date(date + 'T00:00:00Z'),
                priority: 'IMPORTANT',
                status: 'PENDING',
              },
            })
          : await tx.expectedIncome.create({
              data: {
                userId: plan.userId,
                title,
                amount: new Prisma.Decimal(amount).div(100),
                expectedDate: new Date(date + 'T00:00:00Z'),
                confidence: 'UNCERTAIN',
                status: 'EXPECTED',
              },
            });
      await tx.planningAction.create({
        data: {
          userId: plan.userId,
          transactionId: row.id,
          kind: String(body.kind),
          recordId: record.id,
        },
      });
    });
  }
}

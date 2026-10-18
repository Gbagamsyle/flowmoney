import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  HttpException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import {
  CATEGORIES,
  parseTable,
  summarize,
  classify,
  type Category,
} from './statement.logic.js';
import {
  applySavedCategory,
  categoryAllowed,
  counterpartyFor,
  groupCounterparties,
  CLASSIFIER_VERSION,
} from './statement-categorization.js';
import { extract, MAX_BYTES } from './statement.extract.js';

const CURRENCIES = new Set([
  'USD',
  'GBP',
  'EUR',
  'NGN',
  'CAD',
  'AUD',
  'GHS',
  'KES',
  'ZAR',
  'TZS',
  'UGX',
  'RWF',
  'XOF',
  'XAF',
  'INR',
  'JPY',
  'CNY',
  'SGD',
  'NZD',
  'CHF',
  'SEK',
  'NOK',
  'DKK',
  'PLN',
  'BRL',
  'MXN',
  'AED',
  'SAR',
  'TRY',
  'EGP',
]);
@Injectable()
export class StatementsService {
  private readonly processing = new Set<string>();
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  async upload(
    clerkId: string,
    file: { buffer: Buffer; originalname: string } | undefined,
    currency: unknown,
  ) {
    if (!file)
      throw new BadRequestException('Choose a PDF, CSV or XLSX statement.');
    const bytes = file.buffer;
    let locked = false;
    try {
      if (this.processing.has(clerkId) || this.processing.size >= 2)
        throw new HttpException(
          'Statement processing is busy. Please retry shortly.',
          429,
        );
      this.processing.add(clerkId);
      locked = true;
      if (typeof currency !== 'string' || !CURRENCIES.has(currency))
        throw new BadRequestException('Choose the statement currency.');
      if (!bytes.length || bytes.length > MAX_BYTES)
        throw new BadRequestException('Maximum file size is 5 MB.');
      const format = /\.pdf$/i.test(file.originalname)
        ? 'PDF'
        : /\.xlsx$/i.test(file.originalname)
          ? 'XLSX'
          : /\.csv$/i.test(file.originalname)
            ? 'CSV'
            : '';
      if (
        !format ||
        (format === 'PDF' && bytes.subarray(0, 5).toString() !== '%PDF-') ||
        (format === 'XLSX' && bytes.subarray(0, 2).toString() !== 'PK') ||
        (format === 'CSV' &&
          (bytes.subarray(0, 2).toString() === 'PK' ||
            bytes.subarray(0, 5).toString() === '%PDF-'))
      )
        throw new BadRequestException(
          'File content does not match a supported extension.',
        );
      const digest = createHash('sha256').update(bytes).digest('hex');
      const user = await this.users.getOrCreateForClerk({
        clerkId,
        requireDatabase: true,
      });
      const existing = await this.prisma.statementImport.findUnique({
        where: { userId_digest: { userId: user.id, digest } },
      });
      if (existing) {
        if (existing.currency !== currency)
          throw new ConflictException(
            'This statement already exists with another currency. Delete it before changing currency.',
          );
        return this.get(clerkId, existing.id);
      }
      const preferences = await this.prisma.statementCategoryRule.findMany({
        where: { userId: user.id, currency },
      });
      let rows;
      try {
        rows = parseTable(await extract(bytes, format), currency).map((row) => {
          const {
            counterparty: _party,
            categorySource: _source,
            ...classified
          } = applySavedCategory(row, currency, preferences);
          return classified;
        });
      } catch (error) {
        throw new BadRequestException((error as Error).message);
      }
      try {
        const item = await this.prisma.statementImport.create({
          data: {
            userId: user.id,
            digest,
            format,
            currency,
            parserVersion: CLASSIFIER_VERSION,
            transactions: {
              create: rows.map((r) => ({
                ...r,
                parsedCategory: r.category,
                date: new Date(`${r.date}T00:00:00Z`),
              })),
            },
          },
        });
        return this.get(clerkId, item.id);
      } catch (error) {
        if ((error as { code?: string }).code === 'P2002')
          throw new ConflictException(
            'This statement was already uploaded. Refresh your history.',
          );
        throw error;
      }
    } finally {
      bytes.fill(0);
      if (locked) this.processing.delete(clerkId);
    }
  }

  async list(clerkId: string) {
    const user = await this.users.findByClerkId(clerkId, true);
    return user
      ? this.prisma.statementImport.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: {
            id: true,
            format: true,
            currency: true,
            status: true,
            createdAt: true,
          },
        })
      : [];
  }
  async get(clerkId: string, id: string) {
    const user = await this.users.findByClerkId(clerkId, true);
    const item =
      user &&
      (await this.prisma.statementImport.findFirst({
        where: { id, userId: user.id },
        include: { transactions: { orderBy: { sourceRow: 'asc' } } },
      }));
    if (!item) throw new NotFoundException('Statement not found.');
    const preferences =
      item.status === 'REVIEW'
        ? await this.prisma.statementCategoryRule.findMany({
            where: { userId: item.userId, currency: item.currency },
          })
        : [];
    const transactions = item.transactions.map((r) => {
      const direction = r.direction as 'IN' | 'OUT';
      const suggested = applySavedCategory(
        {
          description: r.description,
          direction,
          ...classify(r.description, direction),
        },
        item.currency,
        preferences,
      );
      const draft = item.status === 'REVIEW' && !r.reviewedAt && !r.approved;
      return {
        ...r,
        amountMinor: Number(r.amountMinor),
        direction,
        date: r.date.toISOString().slice(0, 10),
        originalConfidence: r.confidence,
        originalReason: r.reason,
        category: (draft ? suggested.category : r.category) as Category,
        confidence: draft ? suggested.confidence : r.confidence,
        reason: draft ? suggested.reason : r.reason,
        suggestedCategory: draft ? suggested.category : r.parsedCategory,
        counterparty: counterpartyFor(r.description, direction),
        categorySource: draft ? suggested.categorySource : 'reviewed',
      };
    });
    const included =
      item.status === 'IMPORTED'
        ? transactions.filter((r) => r.approved)
        : transactions;
    return {
      ...item,
      transactions,
      summary: summarize(included),
      categories: CATEGORIES,
      allowedCategories: {
        IN: CATEGORIES.filter((category) => categoryAllowed(category, 'IN')),
        OUT: CATEGORIES.filter((category) => categoryAllowed(category, 'OUT')),
      },
      groups: item.status === 'REVIEW' ? groupCounterparties(transactions) : [],
    };
  }
  async approve(clerkId: string, id: string, body: unknown) {
    const item = await this.get(clerkId, id);
    if (item.status === 'IMPORTED')
      throw new ConflictException('Statement already imported.');
    const choices = (body as { transactions?: unknown } | null)?.transactions;
    if (!Array.isArray(choices) || !choices.length || choices.length > 5000)
      throw new BadRequestException('Select 1–5,000 transactions.');
    const ids = new Set<string>();
    const available = new Map(item.transactions.map((row) => [row.id, row]));
    const reviewed: { id: string; category: Category }[] = [];
    const preferences = new Map<
      string,
      {
        counterpartyKey: string;
        counterpartyName: string;
        direction: string;
        category: Category;
      }
    >();
    for (const choice of choices) {
      if (
        !choice ||
        typeof choice.id !== 'string' ||
        ids.has(choice.id) ||
        !available.has(choice.id) ||
        !CATEGORIES.includes(choice.category) ||
        !categoryAllowed(
          choice.category,
          available.get(choice.id)!.direction,
        ) ||
        (choice.remember !== undefined &&
          typeof choice.remember !== 'boolean') ||
        choice.reviewed !== true
      )
        throw new BadRequestException(
          'Every selected row needs an explicit review and valid category.',
        );
      ids.add(choice.id);
      reviewed.push({ id: choice.id, category: choice.category });
      if (choice.remember) {
        const transaction = available.get(choice.id)!;
        const party = counterpartyFor(
          transaction.description,
          transaction.direction,
        );
        if (!party)
          throw new BadRequestException(
            'This description does not identify a counterparty precisely enough to remember a preference.',
          );
        const key = `${transaction.direction}:${party.key}`;
        if (
          preferences.has(key) &&
          preferences.get(key)!.category !== choice.category
        )
          throw new BadRequestException(
            'Choose one category for each counterparty and direction before remembering it.',
          );
        preferences.set(key, {
          counterpartyKey: party.key,
          counterpartyName: party.name,
          direction: transaction.direction,
          category: choice.category,
        });
      }
    }
    if (preferences.size > 50)
      throw new BadRequestException(
        'Remember at most 50 counterparties in one import.',
      );
    for (const preference of preferences.values()) {
      const conflicting = reviewed.some((row) => {
        const transaction = available.get(row.id)!;
        const party = counterpartyFor(
          transaction.description,
          transaction.direction,
        );
        return (
          party?.key === preference.counterpartyKey &&
          transaction.direction === preference.direction &&
          row.category !== preference.category
        );
      });
      if (conflicting)
        throw new BadRequestException(
          'Transactions with the same counterparty and direction have different purposes. Leave remembering off for this group.',
        );
    }
    await this.prisma.$transaction(
      async (tx) => {
        const claimed = await tx.statementImport.updateMany({
          where: { id, userId: item.userId, status: 'REVIEW' },
          data: { status: 'IMPORTED', importedAt: new Date() },
        });
        if (claimed.count !== 1)
          throw new ConflictException('Statement already imported.');
        // At most one update per category, even for a 5,000-row statement.
        for (const category of CATEGORIES) {
          const rowIds = reviewed
            .filter((row) => row.category === category)
            .map((row) => row.id);
          if (!rowIds.length) continue;
          await tx.statementTransaction.updateMany({
            where: { importId: id, id: { in: rowIds } },
            data: {
              approved: true,
              category,
              reviewedAt: new Date(),
            },
          });
        }
        for (const preference of preferences.values()) {
          const data = {
            ...preference,
            currency: item.currency,
            userId: item.userId,
          };
          await tx.statementCategoryRule.upsert({
            where: {
              userId_counterpartyKey_direction_currency: {
                userId: item.userId,
                counterpartyKey: preference.counterpartyKey,
                direction: preference.direction,
                currency: item.currency,
              },
            },
            create: data,
            update: {
              category: preference.category,
              counterpartyName: preference.counterpartyName,
            },
          });
        }
      },
      { timeout: 30000 },
    );
    return this.get(clerkId, id);
  }
  async remove(clerkId: string, id: string) {
    const item = await this.get(clerkId, id);
    await this.prisma.statementImport.deleteMany({
      where: { id, userId: item.userId },
    });
    return { deleted: true };
  }
  async listRules(clerkId: string) {
    const user = await this.users.findByClerkId(clerkId, true);
    return user
      ? this.prisma.statementCategoryRule.findMany({
          where: { userId: user.id },
          orderBy: { updatedAt: 'desc' },
        })
      : [];
  }
  async forgetRule(clerkId: string, id: string) {
    const user = await this.users.findByClerkId(clerkId, true);
    if (!user) throw new NotFoundException('Preference not found.');
    const removed = await this.prisma.statementCategoryRule.deleteMany({
      where: { id, userId: user.id },
    });
    if (!removed.count) throw new NotFoundException('Preference not found.');
    return { deleted: true };
  }
}
